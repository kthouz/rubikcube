/**
 * Minimal ambient declaration for `cubejs`, which ships without TypeScript types.
 * Expand this as the solver integration is built out.
 */
declare module 'cubejs' {
  export default class Cube {
    constructor(state?: unknown);
    static fromString(facelets: string): Cube;
    static initSolver(): void;
    solve(maxDepth?: number): string;
    asString(): string;
    move(moves: string): this;
  }
}
