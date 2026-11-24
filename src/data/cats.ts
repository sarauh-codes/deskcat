// Frame counts / timings must match scripts/gen-sprites.mjs.
export const SKINS = ["orange", "black", "white", "calico"] as const;

export type Anim = "idle" | "sitting" | "sleeping" | "walking" | "petting";

export const ANIMS: Record<Anim, { frames: number; ms: number; loop: boolean }> = {
  idle: { frames: 4, ms: 450, loop: true },
  sitting: { frames: 2, ms: 700, loop: true },
  sleeping: { frames: 2, ms: 700, loop: true },
  walking: { frames: 4, ms: 140, loop: true },
  petting: { frames: 4, ms: 300, loop: false },
};

export interface Cat {
  id: string;
  name: string;
  skin: string;
}

export const sheetUrl = (skin: string, anim: Anim) => `/assets/cats/${skin}/${anim}.png`;
