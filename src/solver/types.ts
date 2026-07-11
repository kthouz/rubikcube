/**
 * Public types for the solver module.
 *
 * The solver consumes a validated {@link CubeState} (from the cube-state model)
 * and produces a {@link Move}[] — a typed, render-ready description of the
 * turns that solve the cube. The tutorial UI animates directly off this
 * structure without ever parsing notation strings itself.
 */

/**
 * The six turnable faces, in Kociemba/URFDLB order. Identical to the cube
 * model's `Face`, but named `MoveFace` here to make clear it denotes *which
 * layer turns*, not which face a sticker belongs to.
 */
export type MoveFace = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

/** The six move faces, in URFDLB order. */
export const MOVE_FACES: readonly MoveFace[] = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

/**
 * Rotation sense of a quarter turn, as seen looking directly *at* that face:
 * `'cw'` = clockwise (e.g. `R`), `'ccw'` = counter-clockwise (e.g. `R'`).
 *
 * For a half turn ({@link Move.double} = `true`) the two senses are physically
 * identical; such moves are normalized to `'cw'`.
 */
export type TurnDirection = 'cw' | 'ccw';

/**
 * One face turn in a solution, in a shape the UI can render and animate without
 * re-parsing notation.
 *
 * The three primary fields — `face`, `direction`, `double` — fully determine
 * the turn. `notation` and `quarterTurns` are derived conveniences.
 */
export interface Move {
  /** Which face's layer turns. */
  readonly face: MoveFace;
  /**
   * Direction of the turn viewed with `face` toward you. Normalized to `'cw'`
   * when `double` is `true` (a 180° turn has no meaningful handedness).
   */
  readonly direction: TurnDirection;
  /** `true` for a 180° half turn (e.g. `R2`); `false` for a 90° quarter turn. */
  readonly double: boolean;
  /** Standard Singmaster notation for this move, e.g. `"R"`, `"U'"`, `"F2"`. */
  readonly notation: string;
  /**
   * Signed clockwise quarter-turn count, handy for animation:
   * `+1` for a CW quarter, `-1` for a CCW quarter, `+2` for a half turn.
   */
  readonly quarterTurns: 1 | -1 | 2;
}

/** A full solution: the ordered moves that take the scanned cube to solved. */
export type Solution = Move[];

/** Thrown when solving or move parsing fails. */
export class SolverError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SolverError';
  }
}
