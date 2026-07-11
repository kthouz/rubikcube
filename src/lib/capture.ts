/**
 * Frame capture and sticker-region sampling.
 *
 * Given a live <video> element, we crop the centered square that the on-screen
 * alignment grid overlays, sample the nine sticker regions (averaging a small
 * patch at each cell's center to suppress noise), and emit a thumbnail. The
 * on-screen grid and this sampling use the same centered-square geometry, so
 * what the user aligns is exactly what gets sampled.
 */

import type { FaceCapture, StickerSample } from '../state/scan';

/**
 * Fraction of each 1/3 cell (per axis) sampled at its center. A patch rather
 * than a single pixel averages out camera noise, JPEG artifacts, and glare.
 */
const PATCH_FRACTION = 0.5;

/** Max thumbnail edge in pixels; keeps stored data URLs small. */
const THUMB_SIZE = 180;

/**
 * Edge length of the alignment grid as a fraction of the frame's shorter side.
 * The on-screen overlay uses this exact fraction (see CameraView) so the region
 * the user aligns to is precisely the region sampled here.
 */
export const GRID_FRACTION = 0.82;

/** The centered square of the frame, expressed as source-crop coordinates. */
export interface CropRect {
  sx: number;
  sy: number;
  size: number;
}

/**
 * The centered square the alignment grid covers: `GRID_FRACTION` of the frame's
 * shorter side, centered within the frame.
 */
export function gridSquare(width: number, height: number): CropRect {
  const size = Math.min(width, height) * GRID_FRACTION;
  return { sx: (width - size) / 2, sy: (height - size) / 2, size };
}

/** Average RGB over a rectangular patch of an ImageData buffer. */
function averagePatch(
  data: Uint8ClampedArray,
  imgWidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number
): StickerSample {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const xEnd = Math.floor(x0 + w);
  const yEnd = Math.floor(y0 + h);
  for (let y = Math.floor(y0); y < yEnd; y++) {
    for (let x = Math.floor(x0); x < xEnd; x++) {
      const i = (y * imgWidth + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

/**
 * Sample the nine sticker regions from a square ImageData of the aligned face.
 * Returns colors row-major (left-to-right, top-to-bottom).
 */
export function sampleStickers(square: ImageData): StickerSample[] {
  const cell = square.width / 3;
  const patch = cell * PATCH_FRACTION;
  const margin = (cell - patch) / 2;
  const samples: StickerSample[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = col * cell + margin;
      const y0 = row * cell + margin;
      samples.push(averagePatch(square.data, square.width, x0, y0, patch, patch));
    }
  }
  return samples;
}

/**
 * Capture the current video frame: crop the aligned square, sample the nine
 * stickers, and render a thumbnail. Throws if the video has no frame yet.
 */
export function captureFace(video: HTMLVideoElement): FaceCapture {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame not ready yet.');
  }

  const crop = gridSquare(width, height);
  const drawSize = Math.round(crop.size);

  // Draw the cropped square at native resolution to sample accurate colors.
  const full = document.createElement('canvas');
  full.width = drawSize;
  full.height = drawSize;
  const fullCtx = full.getContext('2d', { willReadFrequently: true });
  if (!fullCtx) throw new Error('Could not get a 2D canvas context.');
  fullCtx.drawImage(
    video,
    crop.sx,
    crop.sy,
    crop.size,
    crop.size,
    0,
    0,
    drawSize,
    drawSize
  );

  const square = fullCtx.getImageData(0, 0, drawSize, drawSize);
  const samples = sampleStickers(square);

  // Downscale to a thumbnail for the preview strip.
  const thumb = document.createElement('canvas');
  thumb.width = THUMB_SIZE;
  thumb.height = THUMB_SIZE;
  const thumbCtx = thumb.getContext('2d');
  if (!thumbCtx) throw new Error('Could not get a 2D canvas context.');
  thumbCtx.drawImage(full, 0, 0, THUMB_SIZE, THUMB_SIZE);
  const imageDataUrl = thumb.toDataURL('image/jpeg', 0.8);

  return {
    imageDataUrl,
    samples,
    regionSize: drawSize,
    capturedAt: Date.now(),
  };
}
