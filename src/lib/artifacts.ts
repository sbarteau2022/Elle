// ============================================================
// artifacts.ts — the grammar of the pictures she makes.
//
// vfar generate/resynth and Flock media store bytes in R2 and hand back a
// worker-absolute path. The worker returns those paths on
// RouterResult.artifacts, and she is told (elle-worker mind.ts
// SURFACE_MARKDOWN) to put one on a line of its own when it belongs in the
// prose. This module decides which strings are really artifacts; the
// renderers (src/lib/md.tsx, mobile/src/lib/md.tsx) turn them into pictures.
//
// DELIBERATELY NARROW — this is a security boundary, not a convenience.
// Her answer is model output that can carry web-search results and other
// people's text, so an <img src> taken from it is an outbound request someone
// else could aim: the classic tracking pixel. Only paths THIS worker serves
// can render, so the only thing that loads is something her own tools stored.
// Anything else degrades to text or a link the reader follows deliberately.
//
// ── THE THREE COPIES ────────────────────────────────────────
// This grammar exists in three separately-deployed bundles and they must move
// together:
//     elle-worker/src/artifacts.ts      (collects them out of a run)
//     Elle/src/lib/artifacts.ts         (this file — the workbench)
//     Elle/mobile/src/lib/artifacts.ts  (the phone; Metro is rooted at
//                                        mobile/, so it cannot import this)
// Each mirrors the 404 guard on the matching route in elle-worker/src/index.ts
// — if a path would not be served, it is not an artifact. Each has a test
// pinning ARTIFACT_SOURCE verbatim, so changing one without the others fails
// loudly in that bundle instead of silently rendering a broken image.
// ============================================================
import { WORKER } from './elle'

// Kept as a source string (not a literal) so the sync test can compare it
// character-for-character against the other copies.
export const ARTIFACT_SOURCE =
  '(?:\\/vfar\\/[0-9a-f]{32}\\.(?:png|jpg)|\\/flock\\/asset\\/[0-9a-f]{32}\\.(?:png|jpg|jpeg|mp4))'

const ARTIFACT_RE = new RegExp(`^${ARTIFACT_SOURCE}$`)

/** True only for a whole string this worker will actually serve. */
export function isArtifactPath(path: string): boolean { return ARTIFACT_RE.test(path) }

/** Absolute URL for a path already known to be an artifact. */
export function artifactUrl(path: string): string { return WORKER + path }

export function isVideoArtifact(path: string): boolean { return path.endsWith('.mp4') }

/**
 * A whole line that is exactly one artifact — either bare, as she is told to
 * write it, or in markdown image syntax. Returns the path plus any alt text.
 */
export function imageLine(line: string): { path: string; alt: string } | null {
  const s = line.trim()
  if (isArtifactPath(s)) return { path: s, alt: '' }
  const m = s.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/)
  if (m && isArtifactPath(m[2])) return { path: m[2], alt: m[1] }
  return null
}
