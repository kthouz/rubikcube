/**
 * CubeState — the canonical, validated data model for a scanned 3x3 cube.
 *
 * Pipeline: color detection emits {@link StickerColors} (54 colors in URFDLB
 * order) → this module maps them to a canonical {@link FaceletString} and
 * verifies the cube is physically solvable → downstream solver code consumes
 * the facelet string.
 */
import {
  CENTER_INDICES,
  FACES,
  SOLVED_FACELETS,
  STICKER_COUNT,
  type Color,
  type CubeErrorCode,
  type CubeValidationError,
  type CubeValidationResult,
  type Face,
  type FaceletString,
  type StickerColors,
} from './types';
import {
  CORNER_COLORS,
  CORNER_FACELETS,
  EDGE_COLORS,
  EDGE_FACELETS,
} from './cubie-tables';

/** Thrown by {@link CubeState.fromStickerColors} / fromFaceletString on invalid input. */
export class CubeStateError extends Error {
  readonly errors: CubeValidationError[];
  constructor(errors: CubeValidationError[]) {
    super(errors.map((e) => e.message).join(' '));
    this.name = 'CubeStateError';
    this.errors = errors;
  }
}

function err(
  code: CubeErrorCode,
  message: string,
  details?: Record<string, unknown>,
): CubeValidationError {
  return details === undefined ? { code, message } : { code, message, details };
}

/**
 * Build a color→face lookup from the six center stickers.
 * Returns `null` if the centers are not six distinct colors.
 */
function centerColorToFace(colors: StickerColors): Map<Color, Face> | null {
  const map = new Map<Color, Face>();
  for (let k = 0; k < FACES.length; k++) {
    const centerColor = colors[CENTER_INDICES[k]!];
    const face = FACES[k]!;
    if (centerColor === undefined || map.has(centerColor)) return null;
    map.set(centerColor, face);
  }
  return map.size === 6 ? map : null;
}

/**
 * Convert a validated array of per-sticker faces into a cubie-level model:
 * corner/edge permutation (`cp`/`ep`) and orientation (`co`/`eo`).
 *
 * A cubie whose sticker colors don't correspond to any real piece is left as
 * the sentinel `-1`, which the verifier reports as a permutation error.
 */
function facesToCubie(faces: readonly Face[]): {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
} {
  const cp = new Array<number>(8).fill(-1);
  const co = new Array<number>(8).fill(0);
  const ep = new Array<number>(12).fill(-1);
  const eo = new Array<number>(12).fill(0);

  for (let i = 0; i < 8; i++) {
    const fac = CORNER_FACELETS[i]!;
    // The corner's orientation is defined by where its U/D facelet sits.
    let ori = 0;
    for (; ori < 3; ori++) {
      const f = faces[fac[ori]!];
      if (f === 'U' || f === 'D') break;
    }
    if (ori === 3) continue; // no U/D facelet -> impossible corner, leave as -1
    const col1 = faces[fac[(ori + 1) % 3]!];
    const col2 = faces[fac[(ori + 2) % 3]!];
    for (let j = 0; j < 8; j++) {
      const cc = CORNER_COLORS[j]!;
      if (col1 === cc[1] && col2 === cc[2]) {
        cp[i] = j;
        co[i] = ori;
        break;
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const fac = EDGE_FACELETS[i]!;
    const a = faces[fac[0]!];
    const b = faces[fac[1]!];
    for (let j = 0; j < 12; j++) {
      const ec = EDGE_COLORS[j]!;
      if (a === ec[0] && b === ec[1]) {
        ep[i] = j;
        eo[i] = 0;
        break;
      }
      if (a === ec[1] && b === ec[0]) {
        ep[i] = j;
        eo[i] = 1;
        break;
      }
    }
  }

  return { cp, co, ep, eo };
}

/** Parity (0 = even, 1 = odd) of a permutation given as an array of indices. */
function permutationParity(perm: readonly number[]): number {
  let inversions = 0;
  for (let i = perm.length - 1; i > 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      if (perm[j]! > perm[i]!) inversions++;
    }
  }
  return inversions & 1;
}

/**
 * Verify a cubie model represents a physically solvable cube. Returns the first
 * failing check (the most specific, actionable one) or `null` if solvable.
 *
 * Checks, in order: every edge present exactly once, edge-flip parity, every
 * corner present exactly once, corner-twist parity, and permutation parity
 * agreement between corners and edges.
 */
function verifyCubie(cubie: {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}): CubeValidationError | null {
  const { cp, co, ep, eo } = cubie;

  const edgeCount = new Array<number>(12).fill(0);
  for (const e of ep) if (e >= 0) edgeCount[e]!++;
  if (edgeCount.some((c) => c !== 1)) {
    return err(
      'EDGE_PERMUTATION',
      'An edge piece is missing or duplicated — usually two edges are swapped or an edge sticker was misread. Rescan.',
    );
  }

  const edgeFlip = eo.reduce((s, o) => s + o, 0);
  if (edgeFlip % 2 !== 0) {
    return err(
      'EDGE_FLIP',
      'One edge is flipped in place — that orientation is impossible on a real cube. Recheck that edge and rescan.',
    );
  }

  const cornerCount = new Array<number>(8).fill(0);
  for (const c of cp) if (c >= 0) cornerCount[c]!++;
  if (cornerCount.some((c) => c !== 1)) {
    return err(
      'CORNER_PERMUTATION',
      'A corner piece is missing or duplicated — usually two corners are swapped or a corner sticker was misread. Rescan.',
    );
  }

  const cornerTwist = co.reduce((s, o) => s + o, 0);
  if (cornerTwist % 3 !== 0) {
    return err(
      'CORNER_TWIST',
      'One corner is twisted in place — that orientation is impossible on a real cube. Recheck that corner and rescan.',
    );
  }

  if (permutationParity(cp) !== permutationParity(ep)) {
    return err(
      'PARITY',
      'Two edges (or two corners) are swapped — this cube cannot be solved as scanned. Recheck those pieces and rescan.',
    );
  }

  return null;
}

/**
 * Validate a raw sticker-color array without constructing a CubeState.
 *
 * Runs structural checks (sticker count, distinct centers, known colors, nine
 * of each color) and then physical-solvability checks (piece validity,
 * permutation parity, orientation parity). Structural failures are reported
 * together; if the input is structurally sound, the single most specific
 * solvability error (if any) is reported.
 */
export function validateStickerColors(colors: StickerColors): CubeValidationResult {
  const errors: CubeValidationError[] = [];

  if (colors.length !== STICKER_COUNT) {
    return {
      ok: false,
      errors: [
        err(
          'BAD_STICKER_COUNT',
          `Expected ${STICKER_COUNT} stickers but got ${colors.length}. Rescan all six faces.`,
          { expected: STICKER_COUNT, got: colors.length },
        ),
      ],
    };
  }

  const colorToFace = centerColorToFace(colors);
  if (colorToFace === null) {
    const centers = CENTER_INDICES.map((i) => colors[i]);
    return {
      ok: false,
      errors: [
        err(
          'BAD_CENTERS',
          'The six center stickers must be six different colors, but they are not. Make sure each face was scanned in the right orientation — rescan.',
          { centers },
        ),
      ],
    };
  }

  // Every sticker must be one of the six center colors.
  const unknownIndices: number[] = [];
  for (let i = 0; i < colors.length; i++) {
    if (!colorToFace.has(colors[i]!)) unknownIndices.push(i);
  }
  if (unknownIndices.length > 0) {
    errors.push(
      err(
        'UNKNOWN_COLOR',
        `${unknownIndices.length} sticker(s) have a color that matches no face center (positions ${unknownIndices.join(', ')}). Rescan.`,
        { indices: unknownIndices },
      ),
    );
  }

  // Each color must appear exactly nine times.
  const counts = new Map<Color, number>();
  for (const c of colors) counts.set(c, (counts.get(c) ?? 0) + 1);
  const offCount: { color: Color; count: number }[] = [];
  for (const [color] of colorToFace) {
    const count = counts.get(color) ?? 0;
    if (count !== 9) offCount.push({ color, count });
  }
  if (offCount.length > 0) {
    const detail = offCount.map((o) => `"${o.color}" appears ${o.count}×`).join(', ');
    errors.push(
      err(
        'BAD_COLOR_COUNT',
        `Every color must appear exactly 9 times, but ${detail}. Rescan.`,
        { offCount },
      ),
    );
  }

  // If the sticker set itself is wrong, cubie-level analysis is not meaningful.
  if (errors.length > 0) return { ok: false, errors };

  const faces: Face[] = colors.map((c) => colorToFace.get(c)!);
  const cubieError = verifyCubie(facesToCubie(faces));
  if (cubieError) return { ok: false, errors: [cubieError] };

  return { ok: true };
}

/**
 * An immutable, validated cube configuration.
 *
 * Construct via {@link CubeState.fromStickerColors} (from color detection) or
 * {@link CubeState.fromFaceletString}. A constructed instance is guaranteed to
 * represent a physically solvable cube, so downstream code (e.g. the solver)
 * can consume {@link CubeState.faceletString} without re-checking.
 */
export class CubeState {
  /** Canonical 54-char facelet string in URFDLB order. */
  readonly faceletString: FaceletString;
  /** The color→face mapping derived from the centers (empty for facelet-only construction). */
  readonly colorToFace: ReadonlyMap<Color, Face>;

  private constructor(faceletString: FaceletString, colorToFace: ReadonlyMap<Color, Face>) {
    this.faceletString = faceletString;
    this.colorToFace = colorToFace;
    Object.freeze(this);
  }

  /**
   * Build and validate a CubeState from detected sticker colors.
   * @throws {CubeStateError} if the scan does not describe a solvable cube.
   */
  static fromStickerColors(colors: StickerColors): CubeState {
    const result = CubeState.tryFromStickerColors(colors);
    if (!result.ok) throw new CubeStateError(result.errors);
    return result.state;
  }

  /** Non-throwing variant of {@link CubeState.fromStickerColors}. */
  static tryFromStickerColors(
    colors: StickerColors,
  ): { ok: true; state: CubeState } | { ok: false; errors: CubeValidationError[] } {
    const validation = validateStickerColors(colors);
    if (!validation.ok) return { ok: false, errors: validation.errors };

    const colorToFace = centerColorToFace(colors)!;
    const facelets = colors.map((c) => colorToFace.get(c)!).join('');
    return { ok: true, state: new CubeState(facelets, colorToFace) };
  }

  /**
   * Build and validate a CubeState directly from a facelet string. Useful for
   * tests, persistence, and interop with solvers.
   * @throws {CubeStateError} if the string is malformed or not solvable.
   */
  static fromFaceletString(facelets: FaceletString): CubeState {
    const errors: CubeValidationError[] = [];
    if (facelets.length !== STICKER_COUNT) {
      throw new CubeStateError([
        err(
          'BAD_STICKER_COUNT',
          `Facelet string must be ${STICKER_COUNT} characters but was ${facelets.length}.`,
          { expected: STICKER_COUNT, got: facelets.length },
        ),
      ]);
    }
    // A facelet string is just sticker colors drawn from the alphabet {U,R,F,D,L,B}.
    const chars = facelets.split('') as Face[];
    // Centers must each be their own face letter for a well-formed facelet string.
    for (let k = 0; k < FACES.length; k++) {
      if (chars[CENTER_INDICES[k]!] !== FACES[k]) {
        errors.push(
          err(
            'BAD_CENTERS',
            `Facelet string center ${k} must be "${FACES[k]}" for a canonical URFDLB string.`,
            { position: CENTER_INDICES[k], expected: FACES[k] },
          ),
        );
      }
    }
    if (errors.length > 0) throw new CubeStateError(errors);

    const result = validateStickerColors(chars);
    if (!result.ok) throw new CubeStateError(result.errors);
    return new CubeState(facelets, new Map());
  }

  /** True if this cube is already solved. */
  get isSolved(): boolean {
    return this.faceletString === SOLVED_FACELETS;
  }

  toString(): string {
    return this.faceletString;
  }
}
