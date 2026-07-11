/**
 * Color-space conversions used by sticker-color detection.
 *
 * The camera samples give us averaged sRGB, but RGB is a poor space for
 * comparing colors under uneven lighting: brightness and hue are entangled
 * across all three channels. We convert to two perceptually friendlier spaces:
 *
 *  - HSV separates hue (which cube color) from saturation/value (how washed-out
 *    or dark), which is what lets us tell an achromatic white from the five
 *    chromatic colors and order red → orange → yellow around the hue wheel.
 *  - CIELAB is approximately perceptually uniform, so a plain Euclidean distance
 *    (ΔE) between two Lab points tracks how different two colors *look*. That is
 *    the metric the classifier uses to match stickers to reference colors.
 *
 * Everything here is pure and side-effect free.
 */

export interface Rgb {
  r: number; // 0–255
  g: number;
  b: number;
}

export interface Hsv {
  h: number; // 0–360 (0 for achromatic)
  s: number; // 0–1
  v: number; // 0–1
}

export interface Lab {
  L: number; // 0–100
  a: number; // roughly -128–127
  b: number; // roughly -128–127
}

/** sRGB (0–255) → HSV with hue in degrees. */
export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 1e-6) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max <= 1e-6 ? 0 : delta / max;
  return { h, s, v: max };
}

/** Undo sRGB companding to get a linear-light channel in [0,1]. */
function srgbToLinear(c: number): number {
  const cn = c / 255;
  return cn <= 0.04045 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
}

// Reference white (D65) for the XYZ → Lab step.
const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

function pivotXyz(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** sRGB (0–255) → CIELAB (D65). */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  // Linear sRGB → XYZ (D65), scaled to 0–100.
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) * 100;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) * 100;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) * 100;

  const fx = pivotXyz(x / REF_X);
  const fy = pivotXyz(y / REF_Y);
  const fz = pivotXyz(z / REF_Z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** CIE76 color difference: Euclidean distance in Lab. */
export function deltaE(a: Lab, b: Lab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Chroma of a Lab color — distance from the neutral (gray) axis. Near-zero for
 * whites/grays, large for vivid colors. Used to separate achromatic from
 * chromatic stickers independently of lightness.
 */
export function labChroma({ a, b }: Lab): number {
  return Math.hypot(a, b);
}

/** Smallest angular distance between two hues, in degrees (0–180). */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}
