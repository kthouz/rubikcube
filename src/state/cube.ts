/**
 * Domain types and shared state shape for a 3×3 cube.
 *
 * This is intentionally minimal scaffolding — the scanner will populate a
 * CubeState and the solver will consume it. Replace/extend as the real
 * features land.
 */

export type FaceColor = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

/** The six faces of the cube, in the canonical URFDLB order. */
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = (typeof FACES)[number];

/** A single face is a flat array of 9 sticker colors, read left-to-right, top-to-bottom. */
export type FaceStickers = [
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
  FaceColor,
];

export interface CubeState {
  /** Per-face sticker colors, keyed by face. `null` until that face is scanned. */
  faces: Record<Face, FaceStickers | null>;
}

/** A fresh, fully-unscanned cube state. */
export function createEmptyCubeState(): CubeState {
  return {
    faces: { U: null, R: null, F: null, D: null, L: null, B: null },
  };
}

/** True once every face has been scanned. */
export function isFullyScanned(state: CubeState): boolean {
  return FACES.every((face) => state.faces[face] !== null);
}
