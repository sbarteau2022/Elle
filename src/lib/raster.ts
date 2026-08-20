// ============================================================
// raster.ts — HER EYES, on this machine.
//
// vfar rip is a deterministic visual instrument, and its contract has always
// been that pixels arrive as downsampled ARRAYS: the worker carries no image
// codec on purpose, so whatever looks at a picture has to rasterize it here
// and send numbers. Nothing did. rip was documented, implemented, tested —
// and unreachable, because no client ever produced a luma array.
//
// This is that missing half. An image File becomes a small grid of luma (and
// interleaved rgb, which turns on the palette ripper) under the worker's
// MAX_PIXELS ceiling, and rides the turn as `image_pixels`. The bytes
// themselves never need to leave for this: measurement happens on-device and
// only numbers go up, which is the same discipline the mic follows when it
// sends pitch and energy instead of audio.
//
// The geometry is split from the canvas work so it can be tested without a
// DOM — fitWithin is pure arithmetic, and it is the part that can silently be
// wrong (an off-by-one that blows MAX_PIXELS makes the worker reject the rip
// with no visible cause).
// ============================================================

/** elle-worker/src/vfar.ts MAX_PIXELS — 128×128. The rip refuses more. */
export const MAX_PIXELS = 16384

export interface Pixels {
  luma: number[]
  rgb: number[]
  width: number
  height: number
}

/**
 * Largest box with the source's aspect ratio whose area fits `budget`.
 * Never upscales — a 40×30 thumbnail stays 40×30 rather than being blown up
 * into invented detail the instruments would then measure as real.
 */
export function fitWithin(srcW: number, srcH: number, budget = MAX_PIXELS): { width: number; height: number } {
  const w = Math.max(1, Math.floor(srcW))
  const h = Math.max(1, Math.floor(srcH))
  if (w * h <= budget) return { width: w, height: h }
  const scale = Math.sqrt(budget / (w * h))
  // Floor, not round: rounding up on both axes can push the area back over
  // the ceiling, which is the exact failure this function exists to prevent.
  let width = Math.max(2, Math.floor(w * scale))
  let height = Math.max(2, Math.floor(h * scale))
  // Floor twice can still overshoot at the 2-px clamp on a wild aspect ratio;
  // trim the long side until the area genuinely fits.
  while (width * height > budget && (width > 2 || height > 2)) {
    if (width >= height && width > 2) width--
    else if (height > 2) height--
    else break
  }
  return { width, height }
}

/**
 * ITU-R BT.601 luma, the same weighting the eye's own sensitivity implies and
 * the convention vfar's synthetic test images assume.
 */
export function lumaOf(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** RGBA bytes from a canvas → the arrays vfar rip wants. Pure; DOM-free. */
export function pixelsFromRgba(data: Uint8ClampedArray, width: number, height: number): Pixels {
  const n = width * height
  const luma = new Array<number>(n)
  const rgb = new Array<number>(n * 3)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b
    // Rounded to whole 0..255 values: vfar accepts either scale, and integers
    // keep the JSON that carries them roughly a third the size of decimals.
    luma[i] = Math.round(lumaOf(r, g, b))
  }
  return { luma, rgb, width, height }
}

/**
 * Decode an image file and measure it, on this machine.
 *
 * Returns null rather than throwing when the file is not a decodable image —
 * a picture she cannot see is a turn that proceeds without the rip, never a
 * failed send. createImageBitmap is preferred (it decodes off the main
 * thread); the <img> path is the fallback for older webviews.
 */
export async function rasterize(file: Blob, budget = MAX_PIXELS): Promise<Pixels | null> {
  let src: ImageBitmap | HTMLImageElement | null = null
  let objectUrl: string | null = null
  try {
    if (typeof createImageBitmap === 'function') {
      src = await createImageBitmap(file)
    } else {
      objectUrl = URL.createObjectURL(file)
      src = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('decode failed'))
        img.src = objectUrl as string
      })
    }
    const sw = 'width' in src ? Number(src.width) : 0
    const sh = 'height' in src ? Number(src.height) : 0
    if (!sw || !sh) return null

    const { width, height } = fitWithin(sw, sh, budget)
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    // The browser's own downsampler, asked for its best filtering — this is
    // the resample the measurements are taken over, so quality matters.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src as CanvasImageSource, 0, 0, width, height)
    return pixelsFromRgba(ctx.getImageData(0, 0, width, height).data, width, height)
  } catch {
    return null
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    if (src && typeof (src as ImageBitmap).close === 'function') (src as ImageBitmap).close()
  }
}
