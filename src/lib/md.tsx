// ============================================================
// md.tsx — Elle's markdown, rendered safe.
// Tiny by design: headings, bold/italic, inline code, fenced code,
// lists, blockquotes, hr, links, images. Builds React elements — no
// dangerouslySetInnerHTML anywhere, so her expressiveness can't
// become an injection surface. mdToHtml mirrors the same grammar
// for the print/PDF window (all text escaped first).
// ============================================================
import React from 'react'
import { WORKER } from './elle'

// ── artifacts: the pictures she makes ────────────────────────
// vfar generate/resynth and Flock media store bytes in R2 and hand back a
// worker-absolute path. The worker returns those paths on RouterResult.
// artifacts, and she is also told (mind.ts SURFACE_MARKDOWN) to put one on a
// line of its own when it belongs in the prose — this is the half that turns
// such a line into the picture.
//
// DELIBERATELY NARROW: only paths this worker actually serves become <img>.
// Her answer is model output that can carry web-search results and other
// people's text, so an <img src> taken from it is an outbound request someone
// else could aim — the classic tracking pixel. Restricting the grammar to
// /vfar/ and /flock/asset/ means the only thing that can render is something
// her own tools stored. An external image URL degrades to a plain link, which
// the reader can follow deliberately.
//
// Mirrors elle-worker/src/artifacts.ts and each route's 404 guard in its
// index.ts. The two repos deploy separately, so the grammar is duplicated on
// purpose — keep them in step.
const ARTIFACT_RE = /^(?:\/vfar\/[0-9a-f]{32}\.(?:png|jpg)|\/flock\/asset\/[0-9a-f]{32}\.(?:png|jpg|jpeg|mp4))$/
export function isArtifactPath(path: string): boolean { return ARTIFACT_RE.test(path) }
export function artifactUrl(path: string): string { return WORKER + path }
export function isVideoArtifact(path: string): boolean { return path.endsWith('.mp4') }

// A whole line that is exactly one artifact — either bare, as she is told to
// write it, or in markdown image syntax. Returns the path plus any alt text.
function imageLine(line: string): { path: string; alt: string } | null {
  const s = line.trim()
  if (isArtifactPath(s)) return { path: s, alt: '' }
  const m = s.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/)
  if (m && isArtifactPath(m[2])) return { path: m[2], alt: m[1] }
  return null
}

// ── inline: ![alt](img) **bold** *italic* `code` [text](url) ──
// The image alternative comes FIRST so "![a](u)" is never chewed by the link
// rule into a stray "!" plus a link.
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(!\[([^\]]*)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[3] != null) {
      // An image mid-sentence. Only her own stored artifacts actually load;
      // anything else keeps its alt text (as a link when it's a real URL) so
      // the sentence still reads and nothing is fetched on her say-so.
      const [alt, src] = [m[2], m[3]]
      if (isArtifactPath(src)) out.push(<Artifact key={`${keyBase}m${k++}`} path={src} alt={alt} />)
      else if (/^https?:\/\//.test(src)) out.push(<a key={`${keyBase}m${k++}`} href={src} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecorationColor: 'rgba(255,255,255,.35)' }}>{alt || src}</a>)
      else out.push(alt)
    }
    else if (m[4] != null) out.push(<strong key={`${keyBase}b${k++}`}>{m[4]}</strong>)
    else if (m[5] != null) out.push(<em key={`${keyBase}i${k++}`}>{m[5]}</em>)
    else if (m[6] != null) out.push(<code key={`${keyBase}c${k++}`} style={{ background: 'rgba(255,255,255,.07)', padding: '1px 5px', borderRadius: 0, fontSize: '0.92em', fontFamily: 'var(--mono, monospace)' }}>{m[6]}</code>)
    else if (m[7] != null) out.push(<a key={`${keyBase}a${k++}`} href={m[8]} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecorationColor: 'rgba(255,255,255,.35)' }}>{m[7]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// ── one rendered artifact — the picture, on the page ─────────
// Plate-on-a-page treatment to match the editorial column: the image sits on
// its own, the alt text becomes a caption when there is one, and a failed load
// falls back to the path rather than an empty box, so a broken artifact is
// legible instead of invisible. mp4 artifacts get a player.
export function Artifact({ path, alt = '', caption }: { path: string; alt?: string; caption?: string }): React.ReactElement {
  const [failed, setFailed] = React.useState(false)
  const url = artifactUrl(path)
  const label = caption || alt
  if (failed) {
    return (
      <span style={{ display: 'block', margin: '10px 0', padding: '10px 12px', border: '0.5px solid rgba(255,255,255,.14)', color: 'var(--t3, #8a8f98)', fontFamily: 'var(--mono, monospace)', fontSize: '0.85em' }}>
        artifact unavailable · {path}
      </span>
    )
  }
  return (
    <span style={{ display: 'block', margin: '12px 0' }}>
      {isVideoArtifact(path)
        ? <video src={url} controls style={{ maxWidth: '100%', display: 'block', border: '0.5px solid rgba(255,255,255,.12)' }} onError={() => setFailed(true)} />
        : <a href={url} target="_blank" rel="noreferrer" title="open full size">
            <img src={url} alt={alt || 'artifact'} loading="lazy" onError={() => setFailed(true)}
              style={{ maxWidth: '100%', display: 'block', border: '0.5px solid rgba(255,255,255,.12)' }} />
          </a>}
      {label && (
        <span style={{ display: 'block', marginTop: 5, fontFamily: 'var(--mono, monospace)', fontSize: '0.78em', color: 'var(--t3, #8a8f98)', letterSpacing: '.03em' }}>{label}</span>
      )}
    </span>
  )
}

// ── tables — GFM pipe syntax ──────────────────────────────────
// header row | separator row (---|---) | body rows. Shared by both
// renderers below so a table looks the same on screen and in the PDF.
function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map(c => c.trim())
}
function isTableRow(line: string): boolean { return line.includes('|') && line.trim().length > 0 }
function isTableSep(line: string): boolean {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) && line.includes('-')
}
// paragraphs stop consuming lines at anything that opens a new block —
// including a table row, so a table right after prose (no blank line
// between them) still gets detected instead of swallowed as text.
const BLOCK_START = /^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|\s*---+\s*$)/
// An artifact on its own line opens a block too — otherwise a picture written
// directly under a sentence gets swallowed into that paragraph as a bare path.
function stopsParagraph(line: string): boolean { return BLOCK_START.test(line) || isTableRow(line) || imageLine(line) != null }

// A handful of tools (tax_*, mcp_tools, sandbox_status, atlas…) hand back a
// raw JSON payload as their observation, and the router sometimes answers
// with one verbatim rather than prose. Un-fenced, that used to fall into the
// paragraph branch below and get run through the **bold**/*italic*/`code`
// inliner — which doesn't know JSON syntax, so a stray `_id` or a `"key"`
// with underscores/asterisks in it came out with random spans bolded or
// dropped mid-object: "broken JSON in the chat." Detected here before any
// other parsing so it renders as what it is — a formatted, monospace block —
// instead of being run through prose rules it was never written for.
export function asPrettyJson(text: string): string | null {
  const t = text.trim()
  if (!((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']')))) return null
  try { return JSON.stringify(JSON.parse(t), null, 2) } catch { return null }
}

// ── block-level renderer ─────────────────────────────────────
export function Md({ text }: { text: string }): React.ReactElement {
  const pretty = asPrettyJson(String(text || ''))
  if (pretty != null) {
    return <pre style={{ background: 'rgba(0,0,0,.35)', border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 0, padding: '10px 12px', overflow: 'auto', fontSize: '0.92em', fontFamily: 'var(--mono, monospace)', lineHeight: 1.55, margin: '8px 0' }}>{pretty}</pre>
  }
  const lines = String(text || '').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0, key = 0
  while (i < lines.length) {
    const line = lines[i]
    // fenced code
    if (/^```/.test(line)) {
      const buf: string[] = []; i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      blocks.push(<pre key={key++} style={{ background: 'rgba(0,0,0,.35)', border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 0, padding: '10px 12px', overflow: 'auto', fontSize: '0.92em', fontFamily: 'var(--mono, monospace)', lineHeight: 1.55, margin: '8px 0' }}>{buf.join('\n')}</pre>)
      continue
    }
    // headings — her volume knob
    const h = line.match(/^(#{1,3})\s+(.*)/)
    if (h) {
      const level = h[1].length
      const size = level === 1 ? '1.45em' : level === 2 ? '1.2em' : '1.05em'
      blocks.push(<div key={key++} style={{ fontSize: size, fontWeight: 650, margin: level === 1 ? '14px 0 6px' : '10px 0 4px', letterSpacing: level === 1 ? '-0.01em' : undefined }}>{inline(h[2], `h${key}`)}</div>)
      i++; continue
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { blocks.push(<hr key={key++} style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,.14)', margin: '12px 0' }} />); i++; continue }
    // an artifact alone on its line — the picture itself, where she put it
    const img = imageLine(line)
    if (img) { blocks.push(<Artifact key={key++} path={img.path} alt={img.alt} />); i++; continue }
    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(<blockquote key={key++} style={{ borderLeft: '2px solid rgba(255,255,255,.25)', margin: '8px 0', padding: '2px 0 2px 12px', opacity: 0.9, fontStyle: 'italic' }}>{buf.map((b, j) => <div key={j}>{inline(b, `q${key}${j}`)}</div>)}</blockquote>)
      continue
    }
    // lists
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      const ordered = /^\s*\d+\.\s+/.test(line)
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={key++} style={{ margin: '6px 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 3 }}>{items.map((it, j) => <li key={j}>{inline(it, `l${key}${j}`)}</li>)}</Tag>)
      continue
    }
    // table — GFM pipe syntax: a row, then a |---|---| separator
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line)
      i += 2
      const bodyRows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) bodyRows.push(splitRow(lines[i++]))
      blocks.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.93em' }}>
            <thead>
              <tr>{header.map((c, j) => <th key={j} style={{ textAlign: 'left', padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,.2)', fontWeight: 650 }}>{inline(c, `th${key}${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>{inline(c, `td${key}${ri}${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    if (!line.trim()) { i++; continue }
    // paragraph — consume consecutive non-special lines, preserve single breaks
    const buf: string[] = [line]; i++
    while (i < lines.length && lines[i].trim() && !stopsParagraph(lines[i])) buf.push(lines[i++])
    blocks.push(<p key={key++} style={{ margin: '6px 0', lineHeight: 1.7 }}>{buf.map((b, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(b, `p${key}${j}`)}</React.Fragment>)}</p>)
  }
  return <div>{blocks}</div>
}

// ── same grammar → escaped HTML, for the print window ────────
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function inlineHtml(text: string): string {
  return esc(text)
    // Images first, same as the React inliner — and same restriction: only her
    // own stored artifacts resolve to a real <img>, everything else keeps its
    // alt text. esc() ran first, so the path here is already inert.
    .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (whole, alt: string, src: string) => {
      if (!isArtifactPath(src)) return alt || whole
      return isVideoArtifact(src)
        ? `<a href="${artifactUrl(src)}">${alt || 'video artifact'}</a>`
        : `<img src="${artifactUrl(src)}" alt="${alt}"/>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
}
export function mdToHtml(text: string): string {
  const pretty = asPrettyJson(String(text || ''))
  if (pretty != null) return `<pre>${esc(pretty)}</pre>`
  const lines = String(text || '').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) { const buf: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre>${esc(buf.join('\n'))}</pre>`); continue }
    const h = line.match(/^(#{1,3})\s+(.*)/)
    if (h) { out.push(`<h${h[1].length}>${inlineHtml(h[2])}</h${h[1].length}>`); i++; continue }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { out.push('<hr/>'); i++; continue }
    const img = imageLine(line)
    if (img) {
      // On paper a video is not a picture — link it instead of emitting an
      // <img> that would render as a broken image in the print window.
      const body = isVideoArtifact(img.path)
        ? `<a href="${artifactUrl(img.path)}">${esc(img.alt) || 'video artifact'}</a>`
        : `<img src="${artifactUrl(img.path)}" alt="${esc(img.alt) || 'artifact'}"/>`
      out.push(`<figure>${body}${img.alt ? `<figcaption>${esc(img.alt)}</figcaption>` : ''}</figure>`)
      i++; continue
    }
    if (/^>\s?/.test(line)) { const buf: string[] = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(inlineHtml(lines[i++].replace(/^>\s?/, ''))); out.push(`<blockquote>${buf.join('<br/>')}</blockquote>`); continue }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line); const items: string[] = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) items.push(`<li>${inlineHtml(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`)
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line); i += 2
      const bodyRows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) bodyRows.push(splitRow(lines[i++]))
      const thead = `<tr>${header.map(c => `<th>${inlineHtml(c)}</th>`).join('')}</tr>`
      const tbody = bodyRows.map(r => `<tr>${r.map(c => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`).join('')
      out.push(`<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`); continue
    }
    if (!line.trim()) { i++; continue }
    const buf: string[] = [inlineHtml(line)]; i++
    while (i < lines.length && lines[i].trim() && !stopsParagraph(lines[i])) buf.push(inlineHtml(lines[i++]))
    out.push(`<p>${buf.join('<br/>')}</p>`)
  }
  return out.join('\n')
}

// ── export actions: print/PDF + email ────────────────────────
export function printAnswer(title: string, mdText: string): void {
  const w = window.open('', '_blank', 'width=840,height=980')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body{font:14px/1.7 Georgia,'Times New Roman',serif;color:#16181d;max-width:720px;margin:48px auto;padding:0 28px}
  h1{font-size:24px;margin:0 0 4px;letter-spacing:-.01em} h2{font-size:18px;margin:22px 0 6px} h3{font-size:15px;margin:16px 0 4px}
  .meta{font:11px/1.5 ui-monospace,monospace;color:#8a8f98;border-bottom:1px solid #e3e5e8;padding-bottom:12px;margin-bottom:20px}
  pre{background:#f4f5f7;border:1px solid #e3e5e8;border-radius:6px;padding:12px;font:12px/1.5 ui-monospace,monospace;overflow:auto;white-space:pre-wrap}
  code{background:#f4f5f7;padding:1px 4px;border-radius:3px;font:.92em ui-monospace,monospace}
  blockquote{border-left:3px solid #c9cdd3;margin:10px 0;padding:2px 0 2px 14px;color:#4a4f57;font-style:italic}
  hr{border:none;border-top:1px solid #e3e5e8;margin:18px 0}
  table{border-collapse:collapse;width:100%;margin:14px 0;font-size:12.5px}
  th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #e3e5e8}
  thead th{border-bottom:2px solid #16181d}
  figure{margin:16px 0} img{max-width:100%;height:auto;display:block;border:1px solid #e3e5e8}
  figcaption{font:11px/1.5 ui-monospace,monospace;color:#8a8f98;margin-top:6px}
  a{color:#16181d} @media print{body{margin:12mm auto} table{page-break-inside:auto} tr{page-break-inside:avoid} figure{page-break-inside:avoid}}
</style></head><body>
<div class="meta">Elle · ${esc(new Date().toLocaleString())} · use your browser's Print dialog → "Save as PDF" to keep a copy</div>
${mdToHtml(mdText)}
</body></html>`)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch { /* user closes */ } }, 350)
}

export function emailAnswer(subject: string, mdText: string): void {
  const bodyText = mdText.length > 1700
    ? mdText.slice(0, 1700) + '\n\n…(truncated for email — use Print → Save as PDF for the full document)'
    : mdText
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`
}
