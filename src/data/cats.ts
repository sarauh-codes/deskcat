// Frame counts / timings must match scripts/gen-sprites.mjs.
export const SKINS = ["orange", "black", "white", "calico", "gray", "cream", "tortoiseshell"] as const;

export type Anim = "idle" | "sitting" | "sleeping" | "walking" | "petting" | "playing" | "fighting";

// Sprite size on screen; names and px must match win_size() in src-tauri/src/lib.rs.
export const SIZES = {
  kitten: { label: "Kitten", px: 64 },
  teen: { label: "Adolescent", px: 96 },
  adult: { label: "Adult", px: 128 },
} as const;

export type Size = keyof typeof SIZES;

export const ANIMS: Record<Anim, { frames: number; ms: number; loop: boolean }> = {
  idle: { frames: 4, ms: 450, loop: true },
  sitting: { frames: 2, ms: 700, loop: true },
  sleeping: { frames: 2, ms: 700, loop: true },
  walking: { frames: 4, ms: 140, loop: true },
  petting: { frames: 4, ms: 300, loop: false },
  playing: { frames: 4, ms: 180, loop: true },
  fighting: { frames: 4, ms: 120, loop: true },
};

export interface Cat {
  id: string;
  name: string;
  skin: string;
  size: Size;
}

export const sheetUrl = (skin: string, anim: Anim) => `/assets/cats/${skin}/${anim}.png`;
