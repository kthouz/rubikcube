/**
 * Sticker-color detection.
 *
 * The camera step gives us, per face, nine averaged sRGB samples (one per
 * sticker). This module turns those raw samples into one of the six cube colors
 * per sticker, plus a confidence, and finally a flat 54-sticker color array.
 *
 * Why not fixed RGB thresholds? Webcams auto-white-balance and every room lights
 * a cube differently, so "orange is RGB > X" breaks the moment the exposure
 * shifts. Instead we lean on two facts about a real cube and classify relative
 * to the capture itself:
 *
 *   1. The six center stickers are, by construction, exactly the six colors —
 *      one of each. That gives us six clean, in-session reference swatches taken
 *      under the very lighting we're classifying against.
 *   2. We only need to *label* those six centers (which one is red, which is
 *      orange, …). Labeling six well-separated colors is far more reliable than
 *      labeling all 54 stickers individually, and we do it as a global
 *      bijective assignment — every color used exactly once — so it depends on
 *      the relative ordering of the colors (red before orange before yellow
 *      around the hue wheel), not on absolute hue values a white-balance shift
 *      would move.
 *
 * With the six references labeled, each sticker is classified by nearest
 * reference in CIELAB (perceptual ΔE). Confidence comes from how much closer the
 * winning reference is than the runner-up, so genuinely ambiguous stickers
 * (classically red vs. orange) surface as low-confidence for the user to review.
 */

import { FACES, type Face } from '../state/cube';
import type { StickerSample } from '../state/scan';
import { deltaE, hueDistance, rgbToHsv, rgbToLab, type Hsv, type Lab } from './color';

/** The six colors on a standard cube. */
export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'green' | 'blue';

/** Canonical ordering used for palette iteration and count checks. */
export const CUBE_COLORS: readonly CubeColor[] = [
  'white',
  'yellow',
  'red',
  'orange',
  'green',
  'blue',
] as const;

/** Display metadata: a human label and a swatch color for the UI. */
export const CUBE_COLOR_META: Record<CubeColor, { label: string; swatch: string }> = {
  white: { label: 'White', swatch: '#f4f5f7' },
  yellow: { label: 'Yellow', swatch: '#f5d13b' },
  red: { label: 'Red', swatch: '#e0403f' },
  orange: { label: 'Orange', swatch: '#f08a24' },
  green: { label: 'Green', swatch: '#3bbf6b' },
  blue: { label: 'Blue', swatch: '#3d74e6' },
};

/** One classified sticker. */
export interface StickerDetection {
  /** The auto-detected color. */
  color: CubeColor;
  /** 0–1; low means the top two candidates were close (review this one). */
  confidence: number;
}

/** Result of classifying the whole cube. */
export interface CubeDetection {
  /** Per-face detections in row-major order, or null for uncaptured faces. */
  faces: Record<Face, StickerDetection[] | null>;
  /** Color assigned to each face's center sticker, or null if uncaptured. */
  centerColors: Record<Face, CubeColor | null>;
}

/** The center sticker index within a row-major 3×3 face. */
export const CENTER_INDEX = 4;

/**
 * Canonical color hints, used only to *label* the six centers (never as hard
 * classification cutoffs). Chromatic colors carry a nominal hue; white is
 * defined by the absence of chroma. The fallback sRGB seeds are used only for
 * colors that lack a captured center (partial scans).
 */
const CANON: Record<
  CubeColor,
  { achromatic?: boolean; hue?: number; seed: { r: number; g: number; b: number } }
> = {
  white: { achromatic: true, seed: { r: 232, g: 233, b: 235 } },
  yellow: { hue: 55, seed: { r: 240, g: 214, b: 45 } },
  orange: { hue: 28, seed: { r: 240, g: 122, b: 26 } },
  red: { hue: 0, seed: { r: 200, g: 46, b: 46 } },
  green: { hue: 130, seed: { r: 44, g: 168, b: 92 } },
  blue: { hue: 220, seed: { r: 44, g: 96, b: 216 } },
};

/** Precomputed Lab of each canonical seed (fallback references). */
const CANON_LAB: Record<CubeColor, Lab> = CUBE_COLORS.reduce(
  (acc, c) => {
    acc[c] = rgbToLab(CANON[c].seed);
    return acc;
  },
  {} as Record<CubeColor, Lab>
);

/**
 * Cost of labeling a center (given by its HSV) as a particular cube color.
 * Lower is better. This is a *relative* score fed into a global assignment, not
 * an absolute threshold: what matters is that, across the six centers, the true
 * labeling has the lowest total cost.
 */
function labelCost(hsv: Hsv, color: CubeColor): number {
  const canon = CANON[color];
  if (canon.achromatic) {
    // White wants low saturation and high value; a vivid center scores poorly.
    return hsv.s * 2.4 + (1 - hsv.v) * 0.8;
  }
  const hueTerm = hueDistance(hsv.h, canon.hue ?? 0) / 180; // 0–1
  // A near-gray sample has no meaningful hue, so it shouldn't claim a color.
  const desatPenalty = Math.max(0, 0.32 - hsv.s) * 3;
  return hueTerm + desatPenalty;
}

/**
 * Assign each captured center a distinct cube color (bijective) by minimizing
 * total labeling cost. Exhaustive over permutations — at most 6 centers, so ≤720
 * candidates, trivially cheap and always optimal.
 */
function labelCenters(centers: { face: Face; hsv: Hsv }[]): Map<Face, CubeColor> {
  const result = new Map<Face, CubeColor>();
  if (centers.length === 0) return result;

  let bestCost = Infinity;
  let bestAssign: CubeColor[] = [];

  const used = new Array(CUBE_COLORS.length).fill(false);
  const current: CubeColor[] = [];

  const recurse = (idx: number, cost: number) => {
    if (cost >= bestCost) return; // prune
    if (idx === centers.length) {
      bestCost = cost;
      bestAssign = current.slice();
      return;
    }
    for (let c = 0; c < CUBE_COLORS.length; c++) {
      if (used[c]) continue;
      used[c] = true;
      current.push(CUBE_COLORS[c]);
      recurse(idx + 1, cost + labelCost(centers[idx].hsv, CUBE_COLORS[c]));
      current.pop();
      used[c] = false;
    }
  };
  recurse(0, 0);

  centers.forEach((center, i) => result.set(center.face, bestAssign[i]));
  return result;
}

// Confidence tuning. POOR_FIT is the ΔE beyond which even the best match is a
// weak fit; SEP_WEIGHT favors separation (ambiguity) over absolute fit because
// the dominant failure mode is two colors being close, not a bad overall match.
const POOR_FIT = 45;
const SEP_WEIGHT = 0.65;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Classify every captured sticker against the labeled reference palette.
 * Returns detections plus the resolved center colors.
 */
export function classifyCube(samples: Record<Face, StickerSample[] | null>): CubeDetection {
  // Cache Lab/HSV for every captured sticker.
  const labs: Record<Face, Lab[] | null> = emptyFaceRecord();
  const centers: { face: Face; hsv: Hsv }[] = [];

  for (const face of FACES) {
    const faceSamples = samples[face];
    if (!faceSamples) continue;
    labs[face] = faceSamples.map((s) => rgbToLab(s));
    const c = faceSamples[CENTER_INDEX];
    if (c) centers.push({ face, hsv: rgbToHsv(c) });
  }

  const centerLabels = labelCenters(centers);

  // Build the reference palette: prefer an in-session center swatch for each
  // color (adaptive to the actual cube + lighting); fall back to the canonical
  // Lab only for colors whose center wasn't captured (partial scans).
  const references: Record<CubeColor, Lab> = { ...CANON_LAB };
  for (const { face } of centers) {
    const color = centerLabels.get(face);
    const faceLabs = labs[face];
    if (color && faceLabs) references[color] = faceLabs[CENTER_INDEX];
  }

  const faces: Record<Face, StickerDetection[] | null> = emptyFaceRecord();
  const centerColors: Record<Face, CubeColor | null> = emptyFaceRecord();

  for (const face of FACES) {
    const faceLabs = labs[face];
    if (!faceLabs) continue;
    centerColors[face] = centerLabels.get(face) ?? null;
    faces[face] = faceLabs.map((lab) => classifyOne(lab, references));
  }

  return { faces, centerColors };
}

/** Nearest-reference classification of a single Lab point, with confidence. */
function classifyOne(lab: Lab, references: Record<CubeColor, Lab>): StickerDetection {
  let best: CubeColor = 'white';
  let bestD = Infinity;
  let secondD = Infinity;
  for (const color of CUBE_COLORS) {
    const d = deltaE(lab, references[color]);
    if (d < bestD) {
      secondD = bestD;
      bestD = d;
      best = color;
    } else if (d < secondD) {
      secondD = d;
    }
  }

  // Separation: how much closer the winner is than the runner-up (0–1).
  const sep = secondD <= 1e-6 ? 1 : clamp01((secondD - bestD) / secondD);
  // Fit: how good the winning match is in absolute terms (0–1).
  const fit = clamp01(1 - bestD / POOR_FIT);
  const confidence = clamp01(SEP_WEIGHT * sep + (1 - SEP_WEIGHT) * fit);

  return { color: best, confidence };
}

function emptyFaceRecord<T>(): Record<Face, T | null> {
  return { U: null, R: null, F: null, D: null, L: null, B: null };
}

/** Mean and minimum confidence across a face's captured stickers. */
export function faceConfidence(detections: StickerDetection[] | null): {
  mean: number;
  min: number;
} {
  if (!detections || detections.length === 0) return { mean: 0, min: 0 };
  let sum = 0;
  let min = 1;
  for (const d of detections) {
    sum += d.confidence;
    if (d.confidence < min) min = d.confidence;
  }
  return { mean: sum / detections.length, min };
}

/** Below this, a sticker is flagged as needing a look. */
export const LOW_CONFIDENCE = 0.4;

/**
 * Per-sticker manual overrides. Keyed by face; each face holds nine slots,
 * `null` meaning "trust the auto-detection".
 */
export type ColorOverrides = Record<Face, (CubeColor | null)[]>;

export function createEmptyOverrides(): ColorOverrides {
  return {
    U: emptyNine(),
    R: emptyNine(),
    F: emptyNine(),
    D: emptyNine(),
    L: emptyNine(),
    B: emptyNine(),
  };
}

function emptyNine(): (CubeColor | null)[] {
  return [null, null, null, null, null, null, null, null, null];
}

/** Effective color of a sticker: a manual override wins over detection. */
export function effectiveColor(
  detection: StickerDetection | undefined,
  override: CubeColor | null | undefined
): CubeColor | null {
  if (override) return override;
  return detection ? detection.color : null;
}

/**
 * Flatten detections + overrides into the canonical 54-sticker color array,
 * ordered face-major in URFDLB order and row-major within each face. Uncaptured
 * stickers are `null`. This is the deliverable the downstream facelet/solver
 * step consumes.
 */
export function stickerColorArray(
  detection: CubeDetection,
  overrides: ColorOverrides
): (CubeColor | null)[] {
  const out: (CubeColor | null)[] = [];
  for (const face of FACES) {
    const faceDet = detection.faces[face];
    const faceOverrides = overrides[face];
    for (let i = 0; i < 9; i++) {
      out.push(effectiveColor(faceDet?.[i], faceOverrides?.[i]));
    }
  }
  return out;
}

/** Tally how many stickers carry each color (nulls ignored). */
export function colorCounts(colors: (CubeColor | null)[]): Record<CubeColor, number> {
  const counts = CUBE_COLORS.reduce(
    (acc, c) => {
      acc[c] = 0;
      return acc;
    },
    {} as Record<CubeColor, number>
  );
  for (const c of colors) if (c) counts[c] += 1;
  return counts;
}

/**
 * Sanity-check a 54-color array for a physically valid cube: fully filled and
 * exactly nine of each color. Returns human-readable issues for the UI. This is
 * guidance, not a hard gate — the user can still proceed and fix upstream.
 */
export function validateCube(colors: (CubeColor | null)[]): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const missing = colors.filter((c) => c === null).length;
  if (missing > 0) {
    issues.push(`${missing} sticker${missing === 1 ? '' : 's'} not yet classified.`);
  }
  const counts = colorCounts(colors);
  for (const color of CUBE_COLORS) {
    if (counts[color] !== 9) {
      issues.push(`${CUBE_COLOR_META[color].label}: ${counts[color]} of 9 expected.`);
    }
  }
  return { ok: issues.length === 0, issues };
}
