# DeskCat --- Project Overview

> **Project type:** Lightweight Windows desktop companion\
> **Target build time:** 1--3 days for the first MVP\
> **Status:** Planning / not yet implemented\
> **Working name:** DeskCat

## 1. Project vision

DeskCat is a small, playful desktop pet application. It places one or
more animated pixel-art cats on the user's Windows desktop. Users can
move cats around, interact with them, choose different appearances, and
give them custom names.

The goal is to create a charming, lightweight companion that can sit on
the desktop while the user works, studies, browses, or plays games.

DeskCat is **not** intended to be a full pet simulator or productivity
application. The first version should focus on a few polished
interactions and good-looking animations rather than a large feature
set.

### Product principles

-   Small, lightweight, and pleasant to use.
-   Pixel-art visual style.
-   Multiple cat appearances, with room for further customisation.
-   Cats can be dragged to different places on the desktop.
-   Local-first: no account, backend, or internet connection required
    for core features.
-   Keep the MVP achievable in a 1--3 day development sprint.

## 2. Confirmed product decisions

  Area                  Decision
  --------------------- ------------------------------------------
  Visual style          Pixel art
  Cats                  Multiple cats / customisable appearances
  Desktop behaviour     Desktop pet that users can drag anywhere
  Platform              Windows desktop
  Framework direction   Tauri
  Accounts              No accounts
  Backend               No backend or hosted service
  Persistence           Local storage
  Initial scope         Small weekend MVP

The desktop pet should be draggable around the desktop. It does not need
to be permanently pinned above every application unless that is later
selected as an optional setting.

## 3. MVP features

### 3.1 Cat appearance selection

Provide a small initial collection of cat skins, for example:

-   Orange tabby
-   Black cat
-   White cat
-   Calico cat

Each skin should have the same basic animation states so that the
application can use a shared rendering and behaviour system.

For the MVP, use predefined skins rather than building a fully layered
character creator. More detailed customisation can be added later.

### 3.2 Multiple cats

Users should be able to add more than one cat to the desktop.

Each cat should have its own: - Unique ID - Display name - Skin /
appearance ID - Desktop position - Current animation state

Users should be able to select a skin and rename a cat. Avoid
implementing complex breeding, inventory, progression, or pet-needs
systems.

### 3.3 Dragging and positioning

Users should be able to click and drag a cat to reposition it on the
desktop.

Expected behaviour: 1. User presses and holds the cat. 2. The cat
follows the pointer while being dragged. 3. The application updates the
cat's desktop position. 4. On release, the final position is saved
locally. 5. On the next launch, the cat is restored to its saved
position.

The implementation must account for the difference between a cat's
sprite coordinates and its native window coordinates.

For the initial version, support the primary display reliably. Test
multiple-monitor behaviour if time permits.

### 3.4 Animations

Use pixel-art sprite sheets rather than GIFs for the main character
animations.

Initial animation states:

  -----------------------------------------------------------------------
  State                   Description             MVP priority
  ----------------------- ----------------------- -----------------------
  Idle                    Cat stays in place;     Essential
                          subtle blinking or tail 
                          movement                

  Sitting                 Cat sits and looks      Essential
                          around                  

  Sleeping                Cat curls up or closes  Essential
                          its eyes                

  Walking                 Used while the cat is   Essential
                          moving, where practical 

  Petting                 Cat reacts to a click   Essential
                          or pet interaction      

  Stretching              Occasional idle         Optional
                          variation               

  Playing                 A playful reaction or   Optional
                          short animation         
  -----------------------------------------------------------------------

Animation playback should be controlled by a reusable component or hook.
Avoid creating separate animation logic for every skin.

### 3.5 Basic interactions

-   Click or tap a cat to trigger a petting reaction.
-   Right-click a cat to open a small context menu.
-   Context menu actions should include options such as **Pet**,
    **Rename**, **Change appearance**, and **Remove cat**.
-   Provide a simple way to add another cat.
-   Optional: play a short meow or interaction sound, with a setting to
    mute sounds.

Keep menus compact and visually consistent with the pixel-art style.

### 3.6 Local persistence

Save the user's cats and preferences locally.

Persist at least: - Cat IDs - Cat names - Skin IDs - X/Y positions -
Sound enabled/disabled preference - Other simple user settings

Load saved data when DeskCat starts. If no saved data exists, create one
default cat with a sensible starting position.

## 4. Features explicitly out of scope for the MVP

Do not spend the initial 1--3 days implementing these:

-   Hunger, thirst, health, happiness, or energy simulation
-   Currency, shops, levelling, achievements, or unlock progression
-   Online accounts, cloud sync, multiplayer, or social features
-   Complex AI or pathfinding
-   Cat-to-cat interactions
-   A full character editor with arbitrary colours and layered body
    parts
-   Extensive accessory and outfit systems
-   Launch-on-startup configuration
-   A large settings dashboard

These can be considered after the basic desktop pet experience works
reliably.

## 5. Recommended technology stack

### Tauri 2

Use Tauri 2 as the desktop application framework.

Responsibilities: - Create and manage native desktop windows. -
Configure frameless and transparent windows. - Handle window positioning
and movement where native behaviour is needed. - Package the application
for Windows.

### React + TypeScript

Use React and TypeScript for the frontend.

Responsibilities: - Render cat sprites. - Manage cat data and UI
state. - Handle user interactions and context menus. - Control animation
states. - Implement the cat selector and lightweight settings UI.

TypeScript interfaces should define the cat data model and animation
states.

### CSS

Use CSS for: - Pixel-art rendering. - Sprite-sheet animation. - Context
menus and small UI elements. - Hover and interaction effects.

For pixel-art sprites, use `image-rendering: pixelated` (and test
browser-specific rendering behaviour) to avoid blurry scaling.

### Rust

Use Rust only for functionality that requires Tauri's native desktop
integration.

Keep application behaviour and UI logic in the frontend unless there is
a clear reason to move it into Rust.

### Tauri Store plugin

Use the official Tauri Store plugin, or another simple Tauri-supported
local persistence approach, to save settings and cat data.

A separate database is unnecessary for the MVP. Do not introduce SQLite
unless the data model becomes substantially more complex.

## 6. Proposed architecture

Keep the architecture small and modular.

### Frontend responsibilities

-   **Cat rendering:** Display the correct sprite and animation frame
    for each cat.
-   **Animation controller:** Play the animation associated with the
    cat's current state.
-   **Behaviour controller:** Choose simple idle variations or
    reactions.
-   **Cat state:** Track the cat's identity, name, skin, position, and
    animation.
-   **Controls:** Provide add, rename, change-skin, pet, and remove
    actions.
-   **Persistence layer:** Load and save the cat collection and
    settings.

### Native desktop responsibilities

-   Create the pet window or windows.
-   Configure transparency and window decorations.
-   Support window movement and positioning.
-   Provide any native window operations that cannot be handled reliably
    in the frontend.

### Important window architecture decision

There are two possible approaches:

**Approach A --- One native window per cat** - Each cat is an
independent transparent native window. - Each cat can be positioned and
moved independently. - This maps naturally to the multiple-cat
concept. - It adds complexity around window creation, cleanup, event
handling, and persistence.

**Approach B --- One transparent desktop window containing all cats** -
One native window renders all cats. - Cats are separate frontend
elements inside that window. - Easier to manage multiple cats and their
state. - Requires the window to cover an appropriate desktop area and
handle pointer interactions carefully.

**Recommended starting point:** Prototype Approach B first, provided it
can deliver reliable dragging and a suitable desktop experience. It is
likely to be simpler for a short MVP. If the window-area or interaction
limitations become problematic, evaluate Approach A.

Do not commit to a multi-window-per-cat implementation before testing
the simplest viable approach.

## 7. Data model

A possible TypeScript model:

``` typescript
export type CatAnimation =
  | "idle"
  | "sitting"
  | "sleeping"
  | "walking"
  | "petting"
  | "stretching";

export interface Cat {
  id: string;
  name: string;
  skinId: string;
  position: {
    x: number;
    y: number;
  };
  currentAnimation: CatAnimation;
}

export interface DeskCatSettings {
  soundEnabled: boolean;
  alwaysOnTop: boolean;
}

export interface DeskCatSaveData {
  cats: Cat[];
  settings: DeskCatSettings;
}
```

The `alwaysOnTop` setting is optional. The default desktop-pet
experience should prioritise being available on the desktop without
forcing the window to cover every other application.

Example local save data:

``` json
{
  "cats": [
    {
      "id": "cat-001",
      "name": "Mochi",
      "skinId": "orange",
      "position": {
        "x": 450,
        "y": 300
      },
      "currentAnimation": "idle"
    }
  ],
  "settings": {
    "soundEnabled": true,
    "alwaysOnTop": false
  }
}
```

Treat saved animation state as transient if needed: it is acceptable to
restore every cat in the idle state after restarting the application.

## 8. Suggested project structure

The structure below is a starting point, not a requirement to create
every file immediately.

``` text
deskcat/
├── public/
│   └── assets/
│       └── cats/
│           ├── orange/
│           │   ├── idle.png
│           │   ├── sitting.png
│           │   ├── sleeping.png
│           │   ├── walking.png
│           │   └── petting.png
│           ├── black/
│           ├── white/
│           └── calico/
│
├── src/
│   ├── components/
│   │   ├── CatPet.tsx
│   │   ├── CatAnimation.tsx
│   │   ├── CatContextMenu.tsx
│   │   ├── CatSelector.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/
│   │   ├── useCatAnimation.ts
│   │   ├── useCatBehaviour.ts
│   │   └── useCatPosition.ts
│   ├── data/
│   │   └── cats.ts
│   ├── types/
│   │   └── cat.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── cat.css
│   ├── App.tsx
│   └── main.tsx
│
├── src-tauri/
│   ├── src/
│   │   └── lib.rs
│   ├── capabilities/
│   └── tauri.conf.json
│
└── package.json
```

## 9. Animation implementation approach

Each skin should provide sprite assets using a consistent format.

For example: - All skins use the same frame dimensions for a given
animation. - Frames are arranged consistently in a horizontal or
otherwise documented sprite sheet. - Animation metadata defines frame
count, frame duration, and looping behaviour. - The rendering component
receives a skin ID and animation state, then displays the matching
asset.

A small animation configuration could look like:

``` typescript
interface AnimationConfig {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDurationMs: number;
  loop: boolean;
}
```

Use CSS sprite-sheet animation where it is convenient. A small
React-driven frame controller is also acceptable if different animations
need different timing or one-shot playback.

Avoid running unnecessary animation loops when the application is hidden
or inactive.

## 10. Three-day development plan

### Day 1 --- Desktop foundation and cat rendering

1.  Create the Tauri + React + TypeScript project.
2.  Configure a transparent, frameless window.
3.  Test desktop positioning and pointer interaction.
4.  Render one pixel-art cat.
5.  Implement idle and sitting animations.
6.  Verify that the window behaves correctly on Windows.

**Day 1 outcome:** A cat visibly lives on the desktop and can be
interacted with or moved.

### Day 2 --- Multiple cats and interactions

1.  Implement the reusable cat data model.
2.  Add multiple cat instances.
3.  Implement dragging and position updates.
4.  Add the context menu.
5.  Implement petting and sleeping interactions.
6.  Add cat naming and skin selection.

**Day 2 outcome:** Users can keep multiple differently styled cats on
the desktop and interact with them.

### Day 3 --- Persistence and polish

1.  Integrate local storage.
2.  Restore cats and positions on startup.
3.  Add sound toggle and optional sound effects.
4.  Test window behaviour and screen boundaries.
5.  Fix animation and interaction issues.
6.  Build and test the Windows application package.

**Day 3 outcome:** A usable, persistent DeskCat MVP.

## 11. Technical risks and considerations

### Transparent window and pointer handling

Transparent native windows can have tricky pointer behaviour. Test
clicking and dragging early. Make sure the visible cat can be grabbed
without the transparent parts of the window causing confusing
interactions.

### Multiple cats

If using one window for all cats, ensure each cat has independent state
and pointer handling. If using separate native windows, test window
creation and cleanup before implementing the full feature set.

### Screen coordinates

Account for the window's dimensions, sprite dimensions, display scaling,
and screen boundaries. Avoid saving a position that leaves a cat
permanently inaccessible.

### Sprite consistency

All skins should use matching sprite dimensions and animation timing
wherever possible. Inconsistent assets will make the shared animation
system harder to maintain.

### Performance

Keep the application lightweight. Avoid unnecessary polling, excessive
React re-renders, and multiple animation loops doing redundant work.

## 12. MVP acceptance criteria

The first version is complete when:

-   [ ] DeskCat launches as a transparent, frameless desktop
    application.
-   [ ] At least four cat appearances are available, assuming suitable
    assets are ready.
-   [ ] Users can display more than one cat.
-   [ ] Each cat can be dragged to a new desktop position.
-   [ ] Cats have working idle, sitting, sleeping, walking, and petting
    animations.
-   [ ] Users can rename cats.
-   [ ] Users can change a cat's appearance.
-   [ ] Users can pet a cat through a simple interaction.
-   [ ] Users can add and remove cats.
-   [ ] Cat data and positions persist after restarting.
-   [ ] The Windows build launches and behaves reliably.

## 13. Guidance for implementation

Prioritise a working desktop prototype over elaborate architecture.

Recommended implementation order:

1.  Prove that a transparent Tauri window works correctly on Windows.
2.  Render one cat sprite.
3.  Make the cat draggable.
4.  Implement the animation controller.
5.  Add multiple cats.
6.  Add simple interactions and menus.
7.  Add persistence.
8.  Polish and package.

If a feature threatens the 1--3 day scope, defer it rather than
compromising the core experience.

Do not add a backend, login system, cloud service, or database without a
concrete requirement.

## 14. Future ideas (not MVP requirements)

Possible later improvements: - Cat personalities and different idle
behaviours. - Cats interacting with each other. - Cats chasing or
following the cursor. - Accessories such as hats, bows, and collars. -
User-imported cat sprites. - More breeds and colour variations. -
Optional always-on-top mode. - Optional launch-on-startup setting. -
Better multi-monitor support.

These ideas should only be considered after the MVP is stable.

------------------------------------------------------------------------

## Project summary

DeskCat is a lightweight, local-first Windows desktop pet built with
Tauri, React, TypeScript, CSS, and a small amount of Rust for native
desktop integration.

Its core experience is simple: users place customisable pixel-art cats
on their desktop, drag them around, interact with them, and return to
find them where they left them.

**The priority is charm, smooth interactions, reliable desktop
behaviour, and a deliberately small feature set.**
