/**
 * Solver adapter (placeholder).
 *
 * The `cubejs` dependency is declared in package.json but not yet wired up.
 * The intended shape: take a facelet string from the scanned CubeState and
 * return a sequence of moves in standard notation.
 *
 * Implementation tracked separately — do not call this yet.
 */

export type Move = string; // e.g. "R", "U'", "F2"

export interface Solution {
  moves: Move[];
}

export async function solve(_facelets: string): Promise<Solution> {
  throw new Error('solve() is not implemented yet — see src/lib/solver.ts');
}
