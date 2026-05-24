/**
 * Image-quality primitives shared by document and selfie capture.
 *
 * All functions operate on RGBA pixel data from a 2D canvas getImageData call.
 * Coordinates are in canvas-pixel space (top-left origin, +y down).
 */

export interface Region {
  x: number
  y: number
  w: number
  h: number
}

/** RGBA → Float32 grayscale buffer using the standard luma weights. */
export function toGrayscale(pixels: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = pixels[i * 4] * 0.299 + pixels[i * 4 + 1] * 0.587 + pixels[i * 4 + 2] * 0.114
  }
  return gray
}

/**
 * Variance of the 5-tap Laplacian inside `region`. High variance ⇒ sharp focus,
 * low variance ⇒ blurry or featureless content. Returns 0 if the region is too
 * small to evaluate.
 */
export function laplacianVariance(
  gray: Float32Array,
  w: number,
  h: number,
  region: Region,
): number {
  const x1 = Math.max(1, region.x)
  const y1 = Math.max(1, region.y)
  const x2 = Math.min(w - 1, region.x + region.w)
  const y2 = Math.min(h - 1, region.y + region.h)
  let sum = 0, sumSq = 0, count = 0
  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) {
      const lap =
        -gray[(py - 1) * w + px] +
        -gray[py * w + (px - 1)] +
        4 * gray[py * w + px] +
        -gray[py * w + (px + 1)] +
        -gray[(py + 1) * w + px]
      sum += lap
      sumSq += lap * lap
      count++
    }
  }
  if (count === 0) return 0
  const mean = sum / count
  return sumSq / count - mean * mean
}

/** Mean grayscale luminance inside `region`, on the 0–255 scale. */
export function meanBrightness(
  gray: Float32Array,
  w: number,
  h: number,
  region: Region,
): number {
  const x1 = Math.max(0, region.x)
  const y1 = Math.max(0, region.y)
  const x2 = Math.min(w, region.x + region.w)
  const y2 = Math.min(h, region.y + region.h)
  let sum = 0, count = 0
  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) {
      sum += gray[py * w + px]
      count++
    }
  }
  return count > 0 ? sum / count : 0
}
