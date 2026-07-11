import { describe, it, expect } from 'vitest';
import {
  CubeState,
  CubeStateError,
  validateStickerColors,
} from './CubeState.js';
import { SOLVED_FACELETS, FACES, type Color, type Face } from './types.js';

/**
 * A documented, physically solvable scramble (the canonical Kociemba README
 * example). Centers are already in URFDLB order.
 */
const VALID_SCRAMBLE =
  'DRLUUBFBRBLURRLRUBLRDDFDLFUFUFFDBRDUBRUFLLFDDBFLUBLRBD';

/** Conventional Western color scheme used to build sticker arrays from faces. */
const FACE_TO_COLOR: Record<Face, Color> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

/** Render a facelet string into a sticker-color array, as color detection would emit. */
function faceletsToColors(facelets: string): Color[] {
  return facelets.split('').map((f) => FACE_TO_COLOR[f as Face]);
}

/** Swap two characters in a string (returns a new string). */
function swap(s: string, i: number, j: number): string {
  const a = s.split('');
  [a[i], a[j]] = [a[j]!, a[i]!];
  return a.join('');
}

describe('valid cubes', () => {
  it('accepts the solved cube', () => {
    const colors = faceletsToColors(SOLVED_FACELETS);
    const state = CubeState.fromStickerColors(colors);
    expect(state.faceletString).toBe(SOLVED_FACELETS);
    expect(state.isSolved).toBe(true);
  });

  it('accepts a valid scramble from sticker colors and round-trips to facelets', () => {
    const colors = faceletsToColors(VALID_SCRAMBLE);
    const state = CubeState.fromStickerColors(colors);
    expect(state.faceletString).toBe(VALID_SCRAMBLE);
    expect(state.isSolved).toBe(false);
  });

  it('accepts a valid scramble via fromFaceletString', () => {
    const state = CubeState.fromFaceletString(VALID_SCRAMBLE);
    expect(state.toString()).toBe(VALID_SCRAMBLE);
  });

  it('works with arbitrary color tokens, not just standard names', () => {
    const tokens: Record<Face, Color> = {
      U: '#fff', R: '0xAA0000', F: 'g', D: '99', L: 'ORANGE_CLUSTER_3', B: 'b',
    };
    const colors = SOLVED_FACELETS.split('').map((f) => tokens[f as Face]);
    expect(CubeState.fromStickerColors(colors).isSolved).toBe(true);
  });
});

describe('structural errors', () => {
  it('rejects the wrong number of stickers', () => {
    const result = validateStickerColors(['white', 'red']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('BAD_STICKER_COUNT');
  });

  it('rejects centers that are not six distinct colors', () => {
    const colors = faceletsToColors(SOLVED_FACELETS);
    colors[13] = colors[4]!; // R center := U center color
    const result = validateStickerColors(colors);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('BAD_CENTERS');
  });

  it('rejects a sticker whose color matches no center', () => {
    const colors = faceletsToColors(SOLVED_FACELETS);
    colors[0] = 'purple';
    const result = validateStickerColors(colors);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain('UNKNOWN_COLOR');
    }
  });

  it('rejects when a color does not appear exactly nine times', () => {
    const colors = faceletsToColors(SOLVED_FACELETS);
    colors[0] = 'yellow'; // white now 8, yellow now 10
    const result = validateStickerColors(colors);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === 'BAD_COLOR_COUNT')).toBe(true);
    }
  });
});

describe('physical-solvability errors', () => {
  it('detects a single flipped edge', () => {
    // Solved cube with edge UF flipped in place (swap its two facelets 7 & 19).
    const bad = swap(SOLVED_FACELETS, 7, 19);
    const result = validateStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('EDGE_FLIP');
  });

  it('detects a single twisted corner', () => {
    // Cycle the three facelets of corner URF (8,9,20) to twist it in place.
    const bad = swap(swap(SOLVED_FACELETS, 8, 9), 9, 20);
    const result = validateStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('CORNER_TWIST');
  });

  it('detects two swapped edges (parity error)', () => {
    // Swap the R and F stickers of the UR and UF edges, exchanging the pieces
    // while keeping every color count at 9.
    const bad = swap(SOLVED_FACELETS, 10, 19);
    const result = validateStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('PARITY');
  });

  it('detects an impossible edge (missing/duplicated) with valid color counts', () => {
    // Swap idx5 (edge UR / U) with idx21 (edge FL / F): counts stay 9 each but
    // two edges become duplicates of others.
    const bad = swap(SOLVED_FACELETS, 5, 21);
    const result = validateStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('EDGE_PERMUTATION');
  });

  it('detects an impossible corner (missing/duplicated) with valid color counts', () => {
    // Swap idx20 (corner URF / F) with idx36 (corner ULB / L).
    const bad = swap(SOLVED_FACELETS, 20, 36);
    const result = validateStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('CORNER_PERMUTATION');
  });
});

describe('CubeState construction API', () => {
  it('fromStickerColors throws CubeStateError with details on invalid input', () => {
    const colors = faceletsToColors(SOLVED_FACELETS);
    colors[0] = 'yellow';
    expect(() => CubeState.fromStickerColors(colors)).toThrow(CubeStateError);
    try {
      CubeState.fromStickerColors(colors);
    } catch (e) {
      expect(e).toBeInstanceOf(CubeStateError);
      expect((e as CubeStateError).errors.length).toBeGreaterThan(0);
      expect((e as CubeStateError).message).toContain('9 times');
    }
  });

  it('tryFromStickerColors returns errors instead of throwing', () => {
    const bad = swap(SOLVED_FACELETS, 7, 19);
    const result = CubeState.tryFromStickerColors(faceletsToColors(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.code).toBe('EDGE_FLIP');
  });

  it('fromFaceletString rejects non-canonical centers', () => {
    const badCenters = swap(SOLVED_FACELETS, 4, 13); // U and R centers swapped
    expect(() => CubeState.fromFaceletString(badCenters)).toThrow(CubeStateError);
  });

  it('produced state is immutable', () => {
    const state = CubeState.fromFaceletString(SOLVED_FACELETS);
    expect(Object.isFrozen(state)).toBe(true);
  });

  it('exposes the derived color→face mapping from a scan', () => {
    const state = CubeState.fromStickerColors(faceletsToColors(VALID_SCRAMBLE));
    for (const face of FACES) {
      expect(state.colorToFace.get(FACE_TO_COLOR[face])).toBe(face);
    }
  });
});
