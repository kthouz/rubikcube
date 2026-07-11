/**
 * State shape for the camera scanning flow.
 *
 * The scanner captures each of the six cube faces as a still frame plus nine
 * sampled sticker-color regions. This raw, pre-classification data is what the
 * downstream color-detection step consumes to produce a {@link CubeState}.
 */

import { FACES, type Face } from './cube';

/** Average linear RGB (0–255) of one sampled sticker region. */
export interface StickerSample {
  r: number;
  g: number;
  b: number;
}

/**
 * A single captured face: the still frame (as a data URL, for thumbnails and
 * re-analysis) plus the nine sampled sticker regions in row-major order
 * (left-to-right, top-to-bottom), matching {@link FaceStickers}.
 */
export interface FaceCapture {
  /** JPEG data URL of the cropped, square face region — used for previews. */
  imageDataUrl: string;
  /** Nine sampled sticker colors, row-major. Feeds color detection. */
  samples: StickerSample[];
  /** Pixel size of the square region the samples were taken from. */
  regionSize: number;
  /** Epoch ms of capture, for ordering and cache-busting. */
  capturedAt: number;
}

/** Per-face captures, keyed by face. `null` until that face is captured. */
export type ScanState = Record<Face, FaceCapture | null>;

/** A fresh scan with nothing captured yet. */
export function createEmptyScanState(): ScanState {
  return { U: null, R: null, F: null, D: null, L: null, B: null };
}

/** How many of the six faces have been captured. */
export function capturedCount(scan: ScanState): number {
  return FACES.reduce((n, face) => (scan[face] ? n + 1 : n), 0);
}

/** True once all six faces have a capture. */
export function isScanComplete(scan: ScanState): boolean {
  return FACES.every((face) => scan[face] !== null);
}

/**
 * One step of the guided capture sequence.
 *
 * The sequence walks the user through presenting all six faces to the camera
 * in a physically consistent orientation. Instructions are absolute (they name
 * the standard Western color scheme — white/yellow, green/blue, red/orange —
 * rather than cumulative rotations) so the user never has to track prior moves.
 * Keeping WHITE up for the four side faces fixes their rotation; the top and
 * bottom faces are captured with GREEN up. The actual color of each face is
 * resolved later from the center sticker by the color-detection step.
 */
export interface ScanStep {
  /** Which cube face this step captures. */
  face: Face;
  /** Short label for the step (e.g. "Front · Green"). */
  label: string;
  /** Standard-scheme color name of the face pointing at the camera. */
  color: string;
  /** Full holding instruction shown to the user. */
  instruction: string;
}

/**
 * Guided capture order. Sides first (white up), then top and bottom (green up).
 * The face keys follow the canonical URFDLB model; the color names assume the
 * common scheme white-up / green-front / red-right and are guidance only.
 */
export const SCAN_SEQUENCE: readonly ScanStep[] = [
  {
    face: 'F',
    label: 'Front · Green',
    color: 'Green',
    instruction: 'Hold WHITE on top with GREEN facing the camera.',
  },
  {
    face: 'R',
    label: 'Right · Red',
    color: 'Red',
    instruction: 'Keep WHITE on top and turn the cube so RED faces the camera.',
  },
  {
    face: 'B',
    label: 'Back · Blue',
    color: 'Blue',
    instruction: 'Keep WHITE on top and turn the cube so BLUE faces the camera.',
  },
  {
    face: 'L',
    label: 'Left · Orange',
    color: 'Orange',
    instruction: 'Keep WHITE on top and turn the cube so ORANGE faces the camera.',
  },
  {
    face: 'U',
    label: 'Up · White',
    color: 'White',
    instruction: 'Tilt the cube so GREEN is on top and WHITE faces the camera.',
  },
  {
    face: 'D',
    label: 'Down · Yellow',
    color: 'Yellow',
    instruction: 'Tilt the cube so GREEN is on top and YELLOW faces the camera.',
  },
] as const;
