/**
 * Core domain types for the cube state model.
 *
 * The boundary this module consumes is a flat array of 54 detected sticker
 * colors (produced by the color-detection layer). See {@link StickerColors}
 * for the exact ordering contract.
 */

/**
 * The six cube faces in the canonical Kociemba order: **U, R, F, D, L, B**
 * (Up, Right, Front, Down, Left, Back). Re-exported from the shared cube
 * scaffolding (`src/state/cube`) so the whole app uses one `Face`/`FACES`.
 *
 * A facelet string is expressed purely in terms of these face letters — each
 * character says "this sticker belongs to the face whose center has this
 * color", independent of what the physical colors happen to be.
 */
export { FACES } from '../state/cube';
export type { Face } from '../state/cube';

/**
 * A detected sticker color, as emitted by the color-detection layer.
 *
 * The cube-state model treats colors *abstractly*: it never hardcodes "white"
 * or "red". All it requires is that two stickers of the same physical color
 * compare equal with `===`, and that there are exactly six distinct values
 * across the 54 stickers. Any stable label works — a color name, a hex string,
 * or a numeric cluster id.
 *
 * {@link STANDARD_COLORS} offers a conventional Western-scheme set for
 * convenience, but consumers are free to use their own tokens.
 */
export type Color = string;

/** A conventional Western color scheme. Provided for convenience only. */
export const STANDARD_COLORS = {
  WHITE: 'white',
  YELLOW: 'yellow',
  RED: 'red',
  ORANGE: 'orange',
  GREEN: 'green',
  BLUE: 'blue',
} as const satisfies Record<string, Color>;

/**
 * Exactly 54 detected sticker colors in **facelet index order** (URFDLB).
 *
 * The array is laid out face-by-face in URFDLB order; within each face the
 * nine stickers are in **row-major reading order** (top-left → bottom-right),
 * as the face is seen when held in the standard scanning orientation:
 *
 * ```
 *              ┌──────────┐
 *              │ U0 U1 U2 │
 *              │ U3 U4 U5 │
 *              │ U6 U7 U8 │
 *   ┌──────────┼──────────┼──────────┬──────────┐
 *   │ L0 L1 L2 │ F0 F1 F2 │ R0 R1 R2 │ B0 B1 B2 │
 *   │ L3 L4 L5 │ F3 F4 F5 │ R3 R4 R5 │ B3 B4 B5 │
 *   │ L6 L7 L8 │ F6 F7 F8 │ R6 R7 R8 │ B6 B7 B8 │
 *   └──────────┴──────────┴──────────┴──────────┘
 *              ┌──────────┐
 *              │ D0 D1 D2 │
 *              │ D3 D4 D5 │
 *              │ D6 D7 D8 │
 *              └──────────┘
 * ```
 *
 * Flat index = faceIndex * 9 + stickerIndex, where faceIndex follows URFDLB.
 * So indices 0-8 are U, 9-17 R, 18-26 F, 27-35 D, 36-44 L, 45-53 B.
 *
 * The center sticker of each face (indices 4, 13, 22, 31, 40, 49) fixes the
 * color→face mapping and is never moved by a legal scramble.
 */
export type StickerColors = readonly Color[];

/** Number of stickers on a 3x3 cube. */
export const STICKER_COUNT = 54;

/** Flat facelet index of each face's center sticker, in URFDLB face order. */
export const CENTER_INDICES: readonly number[] = [4, 13, 22, 31, 40, 49];

/**
 * A canonical facelet string: 54 characters over the alphabet {U,R,F,D,L,B},
 * in URFDLB order. This is the exact input format expected by Kociemba-style
 * two-phase solvers.
 *
 * A solved cube is `"UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"`.
 */
export type FaceletString = string;

/** The facelet string of a solved cube. */
export const SOLVED_FACELETS: FaceletString =
  'UUUUUUUUU' + 'RRRRRRRRR' + 'FFFFFFFFF' + 'DDDDDDDDD' + 'LLLLLLLLL' + 'BBBBBBBBB';

/**
 * Machine-readable reason a scanned cube failed validation. Each maps to a
 * human-facing message via {@link VALIDATION_MESSAGES}.
 */
export type CubeErrorCode =
  /** Input array was not exactly 54 stickers. */
  | 'BAD_STICKER_COUNT'
  /** The six center stickers are not six distinct colors. */
  | 'BAD_CENTERS'
  /** A sticker's color is not one of the six center colors. */
  | 'UNKNOWN_COLOR'
  /** Some color does not appear exactly nine times. */
  | 'BAD_COLOR_COUNT'
  /** An edge cubie is missing or duplicated (e.g. two edges swapped). */
  | 'EDGE_PERMUTATION'
  /** Edge orientation (flip) parity is odd — one edge is flipped. */
  | 'EDGE_FLIP'
  /** A corner cubie is missing or duplicated. */
  | 'CORNER_PERMUTATION'
  /** Corner orientation (twist) parity is nonzero — one corner is twisted. */
  | 'CORNER_TWIST'
  /** Corner and edge permutation parities disagree — two pieces swapped. */
  | 'PARITY';

/** A single validation failure with a code, a clear message, and details. */
export interface CubeValidationError {
  code: CubeErrorCode;
  /** Human-facing message safe to show directly in the UI. */
  message: string;
  /** Optional structured detail for programmatic handling / diagnostics. */
  details?: Record<string, unknown>;
}

/** Result of validating scanned stickers. Discriminated on `ok`. */
export type CubeValidationResult =
  | { ok: true }
  | { ok: false; errors: CubeValidationError[] };
