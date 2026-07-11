/**
 * Parsing and serialization between Singmaster notation strings (as emitted by
 * the Kociemba engine, e.g. `"R U' F2"`) and the typed {@link Move} structure.
 *
 * Kept pure and engine-independent so it is trivially testable and reusable by
 * the UI (e.g. to render a hand-typed algorithm).
 */
import { SolverError, type Move, type MoveFace, type TurnDirection } from './types.js';

const MOVE_FACE_SET: ReadonlySet<string> = new Set(['U', 'R', 'F', 'D', 'L', 'B']);

/** Matches a single move token: a face letter, optional `'` (prime) or `2`. */
const MOVE_TOKEN = /^([URFDLB])(['2]?)$/;

/**
 * Build a {@link Move} from its face and modifier, filling derived fields.
 * Half turns are normalized to `direction: 'cw'`.
 */
function makeMove(face: MoveFace, double: boolean, direction: TurnDirection): Move {
  const notation = face + (double ? '2' : direction === 'ccw' ? "'" : '');
  const quarterTurns: Move['quarterTurns'] = double ? 2 : direction === 'cw' ? 1 : -1;
  return { face, direction: double ? 'cw' : direction, double, notation, quarterTurns };
}

/**
 * Parse a single move token (e.g. `"R"`, `"U'"`, `"F2"`) into a {@link Move}.
 * @throws {SolverError} if the token is not valid Singmaster face-move notation.
 */
export function parseMove(token: string): Move {
  const match = MOVE_TOKEN.exec(token);
  if (!match) {
    throw new SolverError(`Unrecognized move token: "${token}".`);
  }
  const face = match[1] as MoveFace;
  const modifier = match[2];
  if (modifier === '2') return makeMove(face, true, 'cw');
  return makeMove(face, false, modifier === "'" ? 'ccw' : 'cw');
}

/**
 * Parse a whitespace-separated algorithm string into a list of {@link Move}s.
 * Empty / whitespace-only input yields an empty list (a solved cube).
 * @throws {SolverError} if any token is invalid.
 */
export function parseAlgorithm(algorithm: string): Move[] {
  const tokens = algorithm.trim().split(/\s+/).filter((t) => t.length > 0);
  return tokens.map(parseMove);
}

/** Render a single {@link Move} back to Singmaster notation. */
export function moveToNotation(move: Move): string {
  return move.notation;
}

/** Render a list of {@link Move}s back to a space-separated algorithm string. */
export function algorithmToNotation(moves: readonly Move[]): string {
  return moves.map((m) => m.notation).join(' ');
}

/** True if the string is a single valid face-move token. */
export function isMoveToken(token: string): boolean {
  return MOVE_TOKEN.test(token);
}

export { MOVE_FACE_SET };
