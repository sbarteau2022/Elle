import { describe, it, expect } from 'vitest'
import { ARTIFACT_SOURCE, isArtifactPath, isVideoArtifact, imageLine, artifactUrl } from './artifacts';

const IMG = '/vfar/0123456789abcdef0123456789abcdef.jpg'
const PNG = '/vfar/ffffffffffffffffffffffffffffffff.png'
const MP4 = '/flock/asset/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp4'

describe('the artifact grammar', () => {
  // THE SYNC PIN — identical to the assertion in Elle/src/lib/artifacts.test.ts
  // and elle-worker's artifacts.test.ts. This grammar is duplicated across three
  // separately-deployed
  // bundles (see artifacts.ts). Editing one without the others silently
  // produces broken or missing images, so each copy pins its source verbatim:
  // a change here fails loudly and the failure names the other copies.
  it('matches the canonical source shared with the worker and the phone', () => {
    expect(ARTIFACT_SOURCE).toBe(
      '(?:\\/vfar\\/[0-9a-f]{32}\\.(?:png|jpg)|\\/flock\\/asset\\/[0-9a-f]{32}\\.(?:png|jpg|jpeg|mp4))'
    )
  })

  it('separates video from stills', () => {
    expect(isVideoArtifact(MP4)).toBe(true)
    expect(isVideoArtifact(IMG)).toBe(false)
  })

  it('resolves against the worker origin', () => {
    expect(artifactUrl(IMG).endsWith(IMG)).toBe(true)
    expect(artifactUrl(IMG).startsWith('http')).toBe(true)
  })
})

describe('imageLine', () => {
  it('reads a bare path, the way she is told to write one', () => {
    expect(imageLine(IMG)).toEqual({ path: IMG, alt: '' })
    expect(imageLine(`   ${IMG}   `)).toEqual({ path: IMG, alt: '' })
  })

  it('reads markdown image syntax and keeps the alt text', () => {
    expect(imageLine(`![a heron](${IMG})`)).toEqual({ path: IMG, alt: 'a heron' })
    expect(imageLine(`![](${IMG})`)).toEqual({ path: IMG, alt: '' })
  })

  it('is not a line when the path is not servable, or the line holds more', () => {
    expect(imageLine(`![x](https://evil.example/px.gif)`)).toBeNull()
    expect(imageLine(`here it is: ${IMG}`)).toBeNull()
    expect(imageLine('just prose')).toBeNull()
  })
})

// ── CROSS-BUNDLE CONFORMANCE ────────────────────────────────
// Duplicated verbatim into elle-worker/src/artifacts.test.ts and the other
// client copy. The three bundles cannot share code (they deploy separately,
// and Metro is rooted at mobile/), and cannot even be byte-identical — the
// worker needs capturing groups to tell an image from a video. So the
// contract is pinned by BEHAVIOR: change a route in one bundle and the ones
// left behind fail here, instead of silently rendering a broken image or
// silently declining to render a real one.
const CONFORMANCE: Array<[string, boolean]> = [
  ['/vfar/0123456789abcdef0123456789abcdef.jpg', true],
  ['/vfar/ffffffffffffffffffffffffffffffff.png', true],
  ['/flock/asset/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp4', true],
  ['/flock/asset/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpeg', true],
  ['/vfar/tooshort.jpg', false],
  ['/vfar/0123456789ABCDEF0123456789ABCDEF.jpg', false],   // route is lowercase
  ['/vfar/0123456789abcdef0123456789abcdef.gif', false],
  ['/vfar/0123456789abcdef0123456789abcdef.pngx', false],
  ['/hyper/0123456789abcdef0123456789abcdef.json', false],
  ['/flock/0123456789abcdef0123456789abcdef.png', false],  // missing /asset/
  ['/vfar/0123456789abcdef0123456789abcdef.jpg?x=1', false],
  [' /vfar/0123456789abcdef0123456789abcdef.jpg', false],
  ['https://evil.example/vfar/0123456789abcdef0123456789abcdef.jpg', false],
  ['/etc/passwd', false],
  ['', false],
]

describe('cross-bundle conformance', () => {
  it.each(CONFORMANCE)('isArtifactPath(%j) === %s in every bundle', (path, expected) => {
    expect(isArtifactPath(path)).toBe(expected)
  })
})
