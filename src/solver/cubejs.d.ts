/**
 * Minimal ambient types for `cubejs` (a two-phase Kociemba solver that ships no
 * type declarations). Only the surface this module uses is declared.
 *
 * @see https://github.com/ldez/cubejs
 */
declare module 'cubejs' {
  /** A cube configuration and the two-phase solver bound to it. */
  export default class Cube {
    constructor(other?: Cube);

    /**
     * Build the two-phase move and pruning tables. Expensive (hundreds of ms +
     * a few MB) and must run once before {@link Cube.solve}. Idempotent.
     */
    static initSolver(): void;

    /**
     * Parse a 54-character facelet string in URFDLB order (alphabet
     * `{U,R,F,D,L,B}`) into a cube. The input is assumed valid.
     */
    static fromString(facelets: string): Cube;

    /** Apply a whitespace-separated algorithm to this cube (mutates, chainable). */
    move(algorithm: string): this;

    /**
     * Return a near-optimal solving algorithm (~20 moves) as a Singmaster
     * notation string, e.g. `"R U2 F' ..."`. Requires {@link Cube.initSolver}.
     */
    solve(maxDepth?: number): string;

    /** True if this cube is in the solved state. */
    isSolved(): boolean;

    /** Serialize back to a 54-character URFDLB facelet string. */
    asString(): string;
  }
}
