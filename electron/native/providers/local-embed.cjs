'use strict';
// ============================================================
// LOCAL EMBED — the same embedder as the cloud, on this machine.
//
// The worker's entire vector space (elle-corpus-vectors) is built on
// @cf/baai/bge-large-en-v1.5 — 1024 dims. This provider runs the SAME
// weights via Ollama, so a vector computed on the laptop is directly
// comparable to every vector already in the index. That identity is the
// whole point: a *different* local embedder (nomic, e5, …) would produce
// plausible numbers in an incomparable space and corrupt nearest-neighbor
// recall silently — the exact failure class the memory-kernel spec exists
// to prevent. If the model tag here ever changes, it changes to another
// build of bge-large-en-v1.5 or it doesn't change.
//
// Consistency note: the worker embeds raw text (no BGE query prefix), for
// documents and queries alike. This lane matches that — raw text in, no
// prefixing — because comparability with the existing corpus beats BGE's
// query-prefix best practice.
//
// The multimodal intake lane rides through here: capture → local encode
// (Qwen-VL description, prosody tracks → text) → THIS (local bge-large) →
// POST /api/elle-intake with the finished vector. Fully offline until the
// final thin upsert; if Ollama is down, embedText says so precisely and the
// caller falls back to sending content without a vector (the worker then
// embeds on Workers AI — same weights there too).
//
// Config (env):
//   ELLE_OLLAMA_URL   local model host (default http://127.0.0.1:11434)
//   ELLE_EMBED_MODEL  the EXACT `ollama list` tag (default bge-large —
//                     the official Ollama library build of bge-large-en-v1.5;
//                     `ollama pull bge-large`)
// ============================================================

const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_EMBED_MODEL = 'bge-large';
const BGE_LARGE_DIMS = 1024;
const MAX_CHARS = 2000; // matches the worker's embed() clip, so both lanes see the same text

function config() {
  return {
    ollama: (process.env.ELLE_OLLAMA_URL || DEFAULT_OLLAMA).replace(/\/+$/, ''),
    model: process.env.ELLE_EMBED_MODEL || DEFAULT_EMBED_MODEL,
  };
}

// ── pure: response body (either Ollama embed API shape) → vector | null ──
// Newer Ollama: POST /api/embed {model, input} → { embeddings: [[…]] }.
// Older Ollama: POST /api/embeddings {model, prompt} → { embedding: […] }.
function parseEmbedResponse(data) {
  if (data && Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])) return data.embeddings[0];
  if (data && Array.isArray(data.embedding)) return data.embedding;
  return null;
}

// ── pure: is this a usable bge-large vector? → '' | precise reason ──────
// The same three checks the worker's intake door applies (mem-intake.ts):
// dims, finiteness, degeneracy. Catching them HERE means a wrong model tag
// fails loudly on the machine where it can be fixed, before a byte leaves.
function vectorProblem(vec) {
  if (!Array.isArray(vec)) return 'no embedding in response';
  if (vec.length !== BGE_LARGE_DIMS) return `got ${vec.length} dims, need ${BGE_LARGE_DIMS} — is ELLE_EMBED_MODEL really a bge-large build?`;
  let allZero = true;
  for (let i = 0; i < vec.length; i++) {
    const x = vec[i];
    if (typeof x !== 'number' || !Number.isFinite(x)) return `vector[${i}] is not a finite number`;
    if (x !== 0) allZero = false;
  }
  if (allZero) return 'embedder returned an all-zero vector';
  return '';
}

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  return r.json();
}

// text → { ok, vector, model } | { ok:false, error }. Never throws: the
// caller decides whether to fall back to the server-side embed, and the
// error string is the diagnosis, not a shrug.
async function embedText(text) {
  const cfg = config();
  const input = String(text || '').slice(0, MAX_CHARS);
  if (!input.trim()) return { ok: false, error: 'empty text' };
  let data;
  try {
    data = await post(`${cfg.ollama}/api/embed`, { model: cfg.model, input: [input] });
  } catch {
    // Older Ollama has no /api/embed — one fallback to the legacy shape.
    try {
      data = await post(`${cfg.ollama}/api/embeddings`, { model: cfg.model, prompt: input });
    } catch (e) {
      return { ok: false, error: `ollama unreachable or model "${cfg.model}" not pulled (${e && e.message ? e.message : e}) — ollama pull bge-large` };
    }
  }
  const vec = parseEmbedResponse(data);
  const problem = vectorProblem(vec);
  if (problem) return { ok: false, error: problem };
  return { ok: true, vector: vec, model: cfg.model };
}

module.exports = {
  id: 'localEmbed',
  platforms: ['darwin', 'win32', 'linux'],
  available: true,

  embedText,

  // pure / testable
  parseEmbedResponse,
  vectorProblem,
  BGE_LARGE_DIMS,
  DEFAULT_EMBED_MODEL,
};
