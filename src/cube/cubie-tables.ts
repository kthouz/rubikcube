/**
 * Static tables mapping facelet positions to cube pieces (cubies).
 *
 * These follow the standard Kociemba definitions. Facelet indices are the flat
 * URFDLB indices documented on {@link StickerColors}. Corner/edge orderings are
 * the canonical solver orderings; they must stay consistent between the facelet
 * tables and the color tables below, but their absolute order is otherwise an
 * internal implementation detail.
 */
import type { Face } from './types';

/** The eight corner cubies, in canonical order. */
export const CORNERS = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'] as const;
export type Corner = (typeof CORNERS)[number];

/** The twelve edge cubies, in canonical order. */
export const EDGES = [
  'UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR',
] as const;
export type Edge = (typeof EDGES)[number];

/**
 * For each corner cubie, the three flat facelet indices it occupies.
 * The order within each triple is significant: it is the same order used by
 * {@link CORNER_COLORS}, so facelet[k] carries color CORNER_COLORS[k].
 */
export const CORNER_FACELETS: readonly (readonly [number, number, number])[] = [
  [8, 9, 20], //  URF : U9 R1 F3
  [6, 18, 38], // UFL : U7 F1 L3
  [0, 36, 47], // ULB : U1 L1 B3
  [2, 45, 11], // UBR : U3 B1 R3
  [29, 26, 15], // DFR: D3 F9 R7
  [27, 44, 24], // DLF: D1 L9 F7
  [33, 53, 42], // DBL: D7 B9 L7
  [35, 17, 51], // DRB: D9 R9 B7
];

/**
 * For each edge cubie, the two flat facelet indices it occupies. Order matches
 * {@link EDGE_COLORS}.
 */
export const EDGE_FACELETS: readonly (readonly [number, number])[] = [
  [5, 10], //  UR : U6 R2
  [7, 19], //  UF : U8 F2
  [3, 37], //  UL : U4 L2
  [1, 46], //  UB : U2 B2
  [32, 16], // DR : D6 R8
  [28, 25], // DF : D2 F8
  [30, 43], // DL : D4 L8
  [34, 52], // DB : D8 B8
  [23, 12], // FR : F6 R4
  [21, 41], // FL : F4 L6
  [50, 39], // BL : B6 L4
  [48, 14], // BR : B4 R6
];

/**
 * The "official" face color of each corner facelet, aligned with
 * {@link CORNER_FACELETS}. Expressed as face letters because after the
 * color→face remap every sticker is identified by the face its color belongs
 * to. The first entry of each triple is always the U/D facelet.
 */
export const CORNER_COLORS: readonly (readonly [Face, Face, Face])[] = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

/** The official face colors of each edge facelet, aligned with {@link EDGE_FACELETS}. */
export const EDGE_COLORS: readonly (readonly [Face, Face])[] = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
];
