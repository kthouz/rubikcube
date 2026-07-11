/**
 * Public surface of the cube-state model. Downstream code (solver, UI) should
 * import from here.
 *
 * @example
 * ```ts
 * import { CubeState } from './cube';
 *
 * const state = CubeState.fromStickerColors(stickers); // throws if unsolvable
 * solver.solve(state.faceletString);
 * ```
 */
export {
  CubeState,
  CubeStateError,
  validateStickerColors,
} from './CubeState';

export {
  FACES,
  STANDARD_COLORS,
  STICKER_COUNT,
  CENTER_INDICES,
  SOLVED_FACELETS,
  type Face,
  type Color,
  type StickerColors,
  type FaceletString,
  type CubeErrorCode,
  type CubeValidationError,
  type CubeValidationResult,
} from './types';
