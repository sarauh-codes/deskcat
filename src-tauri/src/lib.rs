use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, RunEvent, State, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};

const SKINS: [&str; 7] = ["orange", "black", "white", "calico", "gray", "cream", "tortoiseshell"];
const NAMES: [&str; 6] = ["Mochi", "Miso", "Tofu", "Boba", "Kiki", "Nori"];
const WIN: f64 = 160.0; // logical px; must match the CSS layout in src/App.css

#[derive(Clone, Serialize, Deserialize)]
struct Cat {
    id: String,
    name: String,
    skin: String,
    x: i32, // physical px
    y: i32,
}

#[derive(Serialize, Deserialize)]
struct Save {
    cats: Vec<Cat>,
    #[serde(default = "yes")]
    always_on_top: bool,
}
fn yes() -> bool {
    true
}

// Single owner of all state: windows ask Rust, so there is exactly one writer of the save file.
struct Store {
    save: Mutex<Save>,
    path: PathBuf,
    seq: AtomicU64,
}
impl Store {
    fn flush(&self) {
        if let Ok(j) = serde_json::to_string_pretty(&*self.save.lock().unwrap()) {
            let _ = fs::write(&self.path, j);
        }
    }
    fn edit(&self, id: &str, f: impl FnOnce(&mut Cat)) {
        if let Some(c) = self.save.lock().unwrap().cats.iter_mut().find(|c| c.id == id) {
            f(c);
        }
        self.flush();
    }
}

fn default_pos(app: &AppHandle, n: usize) -> (i32, i32) {
    match app.primary_monitor().ok().flatten() {
        Some(m) => {
            let (p, s) = (m.position(), m.size());
            let w = (WIN * m.scale_factor()) as i32;
            (
                p.x + s.width as i32 - w * 3 / 2 - (n % 5) as i32 * w * 3 / 4,
                p.y + s.height as i32 - w * 2,
            )
        }
        None => (200, 200),
    }
}

// A saved spot only counts if the cat's centre is still on some connected monitor.
fn on_screen(app: &AppHandle, x: i32, y: i32) -> bool {
    app.available_monitors().unwrap_or_default().iter().any(|m| {
        let (p, s) = (m.position(), m.size());
        let (cx, cy) = (x + (WIN * m.scale_factor() / 2.0) as i32, y + (WIN * m.scale_factor() / 2.0) as i32);
        cx >= p.x && cx < p.x + s.width as i32 && cy >= p.y && cy < p.y + s.height as i32
    })
}

fn spawn(app: &AppHandle, cat: &Cat) -> tauri::Result<()> {
    let top = app.state::<Store>().save.lock().unwrap().always_on_top;
    let w = WebviewWindowBuilder::new(app, format!("cat-{}", cat.id), WebviewUrl::App("index.html".into()))
        .title(&cat.name)
        .inner_size(WIN, WIN)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .maximizable(false)
        .skip_taskbar(true)
        .always_on_top(top)
        .visible(false)
        .build()?;
    w.set_position(PhysicalPosition::new(cat.x, cat.y))?;
    w.show()
}

fn new_cat(app: &AppHandle) -> tauri::Result<()> {
    let st = app.state::<Store>();
    let cat = {
        let mut s = st.save.lock().unwrap();
        let n = s.cats.len();
        let (x, y) = default_pos(app, n);
        let id = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
        let cat = Cat { id, name: NAMES[n % NAMES.len()].into(), skin: SKINS[n % SKINS.len()].into(), x, y };
        s.cats.push(cat.clone());
        cat
    };
    st.flush();
    spawn(app, &cat)
}

#[tauri::command]
fn get_cat(id: String, st: State<Store>) -> Option<Cat> {
    st.save.lock().unwrap().cats.iter().find(|c| c.id == id).cloned()
}

#[tauri::command]
fn rename_cat(id: String, name: String, st: State<Store>) {
    let name: String = name.trim().chars().take(20).collect();
    if !name.is_empty() {
        st.edit(&id, |c| c.name = name);
    }
}

#[tauri::command]
fn set_skin(id: String, skin: String, st: State<Store>) {
    if SKINS.contains(&skin.as_str()) {
        st.edit(&id, |c| c.skin = skin);
    }
}

// async: creating/closing windows from a sync command deadlocks on Windows.
#[tauri::command]
async fn add_cat(app: AppHandle) -> Result<(), String> {
    new_cat(&app).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_cat(app: AppHandle, id: String) -> Result<(), String> {
    let st = app.state::<Store>();
    st.save.lock().unwrap().cats.retain(|c| c.id != id);
    st.flush();
    if let Some(w) = app.get_webview_window(&format!("cat-{id}")) {
        w.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // a second launch would duplicate every cat; just ignore it
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .on_window_event(|window, event| {
            // Moved fires continuously while dragging; keep memory current, write to disk once it settles.
            let (WindowEvent::Moved(p), Some(id)) = (event, window.label().strip_prefix("cat-")) else { return };
            if p.x < -30000 {
                return; // Windows reports (-32000,-32000) for minimised windows
            }
            let app = window.app_handle().clone();
            let st = app.state::<Store>();
            // cats whose windows are about this close say hello (the frontend rate-limits it)
            let near = WIN * window.scale_factor().unwrap_or(1.0) * 1.25;
            let neighbours: Vec<(String, i32)> = {
                let mut s = st.save.lock().unwrap();
                if let Some(c) = s.cats.iter_mut().find(|c| c.id == id) {
                    (c.x, c.y) = (p.x, p.y);
                }
                s.cats
                    .iter()
                    .filter(|c| c.id != id && f64::from(c.x - p.x).hypot(f64::from(c.y - p.y)) < near)
                    .map(|c| (c.id.clone(), c.x))
                    .collect()
            };
            for (other, x) in neighbours {
                // payload: "the other cat is on your left"
                let _ = app.emit_to(format!("cat-{id}"), "greet", x < p.x);
                let _ = app.emit_to(format!("cat-{other}"), "greet", p.x < x);
            }
            let g = st.seq.fetch_add(1, Ordering::SeqCst) + 1;
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(500));
                let st = app.state::<Store>();
                if st.seq.load(Ordering::SeqCst) == g {
                    st.flush();
                }
            });
        })
        .invoke_handler(tauri::generate_handler![get_cat, rename_cat, set_skin, add_cat, remove_cat])
        .setup(|app| {
            let h = app.handle().clone();
            let dir = app.path().app_data_dir()?;
            fs::create_dir_all(&dir)?;
            let path = dir.join("deskcat.json");
            let loaded = fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str::<Save>(&s).ok());
            let first_run = loaded.is_none();
            let mut save = loaded.unwrap_or(Save { cats: vec![], always_on_top: true });
            for (i, c) in save.cats.iter_mut().enumerate() {
                if !on_screen(&h, c.x, c.y) {
                    (c.x, c.y) = default_pos(&h, i);
                }
            }
            let (cats, on_top) = (save.cats.clone(), save.always_on_top);
            app.manage(Store { save: Mutex::new(save), path, seq: AtomicU64::new(0) });
            for c in &cats {
                spawn(&h, c)?;
            }
            if first_run {
                new_cat(&h)?;
            }

            // No taskbar button and no title bar: the tray is the only way to add cats or quit.
            let add = MenuItem::with_id(app, "add", "Add cat", true, None::<&str>)?;
            let top = CheckMenuItem::with_id(app, "top", "Always on top", true, on_top, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit DeskCat", true, None::<&str>)?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("DeskCat")
                .menu(&Menu::with_items(app, &[&add, &top, &quit])?)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "add" => {
                        // menu events run on the main thread; building a window there would deadlock
                        let a = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = new_cat(&a);
                        });
                    }
                    "top" => {
                        let st = app.state::<Store>();
                        let v = {
                            let mut s = st.save.lock().unwrap();
                            s.always_on_top = !s.always_on_top;
                            s.always_on_top
                        };
                        st.flush();
                        for (label, w) in app.webview_windows() {
                            if label.starts_with("cat-") {
                                let _ = w.set_always_on_top(v);
                            }
                        }
                    }
                    "quit" => {
                        app.state::<Store>().flush();
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building DeskCat")
        .run(|_, e| {
            // removing the last cat closes the last window; keep running for the tray (explicit exit has a code)
            if let RunEvent::ExitRequested { api, code, .. } = e {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
