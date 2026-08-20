import { describe, it, expect } from 'vitest'
import { fitWithin, lumaOf, pixelsFromRgba, MAX_PIXELS } from './raster'

describe('fitWithin — staying under the rip ceiling', () => {
  // The failure this guards: vfar rip refuses width*height > MAX_PIXELS, and
  // it refuses silently from the client's point of view — the turn just has no
  // vision in it, with nothing to point at.
  it('never exceeds the budget, across a wide spread of real image shapes', () => {
    const shapes: Array<[number, number]> = [
      [4032, 3024],   // phone photo
      [1920, 1080],   // screenshot
      [3840, 2160],
      [1000, 1000],
      [8000, 200],    // panorama
      [200, 8000],    // tall
      [16385, 1],     // pathological: one pixel tall, over budget
      [129, 128],     // just over
      [128, 128],     // exactly at
      [127, 128],     // just under
    ]
    for (const [w, h] of shapes) {
      const out = fitWithin(w, h)
      expect(out.width * out.height, `${w}x${h} -> ${out.width}x${out.height}`).toBeLessThanOrEqual(MAX_PIXELS)
      expect(out.width).toBeGreaterThanOrEqual(2)
      expect(out.height).toBeGreaterThanOrEqual(2)
    }
  })

  it('leaves a small image exactly alone rather than inventing detail', () => {
    expect(fitWithin(40, 30)).toEqual({ width: 40, height: 30 })
    expect(fitWithin(128, 128)).toEqual({ width: 128, height: 128 })
  })

  it('keeps the aspect ratio close on a normal downscale', () => {
    const { width, height } = fitWithin(1920, 1080)
    expect(Math.abs(width / height - 1920 / 1080)).toBeLessThan(0.05)
  })

  it('satisfies vfar rip\'s own guard: integers, both sides >= 2', () => {
    for (const [w, h] of [[4032, 3024], [8000, 200], [3, 9000]] as Array<[number, number]>) {
      const out = fitWithin(w, h)
      expect(Number.isInteger(out.width)).toBe(true)
      expect(Number.isInteger(out.height)).toBe(true)
      expect(out.width >= 2 && out.height >= 2).toBe(true)
    }
  })

  it('handles degenerate input without producing NaN', () => {
    for (const [w, h] of [[0, 0], [-5, 10], [1, 1], [1.7, 2.3]] as Array<[number, number]>) {
      const out = fitWithin(w, h)
      expect(Number.isFinite(out.width) && Number.isFinite(out.height)).toBe(true)
      expect(out.width).toBeGreaterThanOrEqual(1)
    }
  })

  it('respects a smaller explicit budget', () => {
    const out = fitWithin(1000, 1000, 64)
    expect(out.width * out.height).toBeLessThanOrEqual(64)
  })
})

describe('lumaOf — BT.601', () => {
  it('maps the achromatic axis to itself', () => {
    expect(lumaOf(0, 0, 0)).toBeCloseTo(0)
    expect(lumaOf(255, 255, 255)).toBeCloseTo(255)
    expect(lumaOf(128, 128, 128)).toBeCloseTo(128)
  })

  it('weights green over red over blue, as the eye does', () => {
    expect(lumaOf(0, 255, 0)).toBeGreaterThan(lumaOf(255, 0, 0))
    expect(lumaOf(255, 0, 0)).toBeGreaterThan(lumaOf(0, 0, 255))
  })
})

describe('pixelsFromRgba', () => {
  const rgba = (px: Array<[number, number, number]>) => {
    const d = new Uint8ClampedArray(px.length * 4)
    px.forEach(([r, g, b], i) => { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255 })
    return d
  }

  it('produces exactly the array shapes vfar rip expects', () => {
    const out = pixelsFromRgba(rgba([[0, 0, 0], [255, 255, 255], [10, 20, 30], [40, 50, 60]]), 2, 2)
    expect(out.luma).toHaveLength(4)          // width*height
    expect(out.rgb).toHaveLength(12)          // interleaved r,g,b
    expect(out).toMatchObject({ width: 2, height: 2 })
  })

  it('drops alpha and keeps rgb interleaved in source order', () => {
    const out = pixelsFromRgba(rgba([[1, 2, 3], [4, 5, 6]]), 2, 1)
    expect(out.rgb).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('emits integer luma in 0..255 — the scale vfar reads and the compact one to send', () => {
    const out = pixelsFromRgba(rgba([[0, 0, 0], [255, 255, 255], [10, 200, 30]]), 3, 1)
    for (const v of out.luma) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    }
    expect(out.luma[0]).toBe(0)
    expect(out.luma[1]).toBe(255)
  })

  it('carries real structure through: stripes stay stripes', () => {
    const px: Array<[number, number, number]> = []
    for (let x = 0; x < 8; x++) px.push(x % 2 ? [255, 255, 255] : [0, 0, 0])
    const out = pixelsFromRgba(rgba(px), 8, 1)
    expect(out.luma).toEqual([0, 255, 0, 255, 0, 255, 0, 255])
  })
})
