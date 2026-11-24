import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Menu } from "@tauri-apps/api/menu";
import { currentMonitor, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { ANIMS, Anim, Cat, SKINS, sheetUrl } from "./data/cats";
import "./App.css";

const SIZE = 128; // 32px sprite x4: integer device pixels at 100/125/150/175/200% scaling
const win = getCurrentWindow();
const id = win.label.replace(/^cat-/, "");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
// weighted by repetition
const MOODS: Anim[] = ["idle", "idle", "sitting", "sitting", "sleeping", "walking", "walking"];

function useFrame(anim: Anim, onEnd: () => void) {
  const [frame, setFrame] = useState(0);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    const { frames, ms, loop } = ANIMS[anim];
    let i = 0;
    setFrame(0);
    const t = setInterval(() => {
      if (document.hidden) return;
      if (++i >= frames) {
        if (!loop) return clearInterval(t), end.current();
        i = 0;
      }
      setFrame(i);
    }, ms);
    return () => clearInterval(t);
  }, [anim]);
  return frame;
}

export default function App() {
  const [cat, setCat] = useState<Cat | null>(null);
  const [anim, setAnim] = useState<Anim>("idle");
  const [flip, setFlip] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const press = useRef<{ x: number; y: number } | null>(null);
  const frame = useFrame(anim, () => setAnim("idle"));

  useEffect(() => {
    invoke<Cat | null>("get_cat", { id }).then(setCat);
  }, []);

  // avoid a blank flash when the sheet changes by warming the cache for the skin
  useEffect(() => {
    if (cat) (Object.keys(ANIMS) as Anim[]).forEach((a) => (new Image().src = sheetUrl(cat.skin, a)));
  }, [cat?.skin]);

  // pick a new mood every few seconds unless busy being petted or walking
  useEffect(() => {
    let t: number;
    const next = () => {
      t = window.setTimeout(() => {
        setAnim((a) => (a === "petting" || a === "walking" ? a : MOODS[Math.floor(Math.random() * MOODS.length)]));
        next();
      }, 5000 + Math.random() * 7000);
    };
    next();
    return () => clearTimeout(t);
  }, []);

  // walking = slide the native window; stops at monitor edges and when the mood changes
  useEffect(() => {
    if (anim !== "walking") return;
    let dir = Math.random() < 0.5 ? -1 : 1;
    let timer: number | undefined;
    let stopped = false;
    (async () => {
      const [p, s, m] = await Promise.all([win.outerPosition(), win.outerSize(), currentMonitor()]);
      if (stopped) return;
      const min = m ? m.position.x : -1e5;
      const max = m ? m.position.x + m.size.width - s.width : 1e5;
      const step = Math.round(2 * devicePixelRatio);
      const end = Date.now() + 2500;
      let x = p.x;
      setFlip(dir < 0);
      timer = window.setInterval(() => {
        if (Date.now() > end) return clearInterval(timer), setAnim("idle");
        x += dir * step;
        if (x <= min || x >= max) {
          dir = -dir;
          x = Math.min(max, Math.max(min, x));
          setFlip(dir < 0);
        }
        win.setPosition(new PhysicalPosition(x, p.y));
      }, 33);
    })();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [anim]);

  if (!cat) return null;

  const pet = () => setAnim("petting");
  const changeSkin = (skin: string) => {
    invoke("set_skin", { id, skin });
    setCat({ ...cat, skin });
  };
  const commitName = (raw: string) => {
    setRenaming(false);
    const name = raw.trim();
    if (name && name !== cat.name) {
      invoke("rename_cat", { id, name });
      setCat({ ...cat, name: name.slice(0, 20) });
    }
  };

  // Click vs drag: only start the native drag after the pointer moves a few px, so a plain click can pet.
  // startDragging swallows the mouse-up on Windows, so a drag never reaches onPointerUp.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) press.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) < 4) return;
    press.current = null;
    setAnim((a) => (a === "walking" ? "idle" : a));
    win.startDragging();
  };
  const onPointerUp = () => {
    if (press.current) {
      press.current = null;
      pet();
    }
  };
  const onContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    const menu = await Menu.new({
      items: [
        { text: "Pet", action: pet },
        { text: "Rename", action: () => setRenaming(true) },
        {
          text: "Change appearance",
          items: SKINS.map((s) => ({ text: (s === cat.skin ? "• " : "") + cap(s), action: () => changeSkin(s) })),
        },
        { text: "Add another cat", action: () => invoke("add_cat") },
        { text: "Remove cat", action: () => invoke("remove_cat", { id }) },
      ],
    });
    await menu.popup();
  };

  const { frames } = ANIMS[anim];
  return (
    <div className="cat" onContextMenu={onContextMenu}>
      {renaming ? (
        <input
          className="name"
          autoFocus
          defaultValue={cat.name}
          maxLength={20}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => commitName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRenaming(false);
          }}
        />
      ) : (
        <div className="name">{cat.name}</div>
      )}
      <div
        className="sprite"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          backgroundImage: `url(${sheetUrl(cat.skin, anim)})`,
          backgroundSize: `${frames * SIZE}px ${SIZE}px`,
          backgroundPosition: `-${frame * SIZE}px 0`,
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
    </div>
  );
}
