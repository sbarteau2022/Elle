// ============================================================
// md.tsx — Elle's markdown, rendered safe.
// Tiny by design: headings, bold/italic, inline code, fenced code,
// lists, blockquotes, hr, links. Builds React elements — no
// dangerouslySetInnerHTML anywhere, so her expressiveness can't
// become an injection surface. mdToHtml mirrors the same grammar
// for the print/PDF window (all text escaped first).
// ============================================================
import React from 'react'

// ── inline: **bold** *italic* `code` [text](url) ─────────────
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2] != null) out.push(<strong key={`${keyBase}b${k++}`}>{m[2]}</strong>)
    else if (m[3] != null) out.push(<em key={`${keyBase}i${k++}`}>{m[3]}</em>)
    else if (m[4] != null) out.push(<code key={`${keyBase}c${k++}`} style={{ background: 'rgba(255,255,255,.07)', padding: '1px 5px', borderRadius: 4, fontSize: '0.92em', fontFamily: 'var(--mono, monospace)' }}>{m[4]}</code>)
    else if (m[5] != null) out.push(<a key={`${keyBase}a${k++}`} href={m[6]} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecorationColor: 'rgba(255,255,255,.35)' }}>{m[5]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// ── block-level renderer ─────────────────────────────────────
export function Md({ text }: { text: string }): React.ReactElement {
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
      blocks.push(<pre key={key++} style={{ background: 'rgba(0,0,0,.35)', border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '10px 12px', overflow: 'auto', fontSize: '0.92em', fontFamily: 'var(--mono, monospace)', lineHeight: 1.55, margin: '8px 0' }}>{buf.join('\n')}</pre>)
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
    if (!line.trim()) { i++; continue }
    // paragraph — consume consecutive non-special lines, preserve single breaks
    const buf: string[] = [line]; i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|\s*---+\s*$)/.test(lines[i])) buf.push(lines[i++])
    blocks.push(<p key={key++} style={{ margin: '6px 0', lineHeight: 1.7 }}>{buf.map((b, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(b, `p${key}${j}`)}</React.Fragment>)}</p>)
  }
  return <div>{blocks}</div>
}

// ── same grammar → escaped HTML, for the print window ────────
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function inlineHtml(text: string): string {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
}
export function mdToHtml(text: string): string {
  const lines = String(text || '').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) { const buf: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre>${esc(buf.join('\n'))}</pre>`); continue }
    const h = line.match(/^(#{1,3})\s+(.*)/)
    if (h) { out.push(`<h${h[1].length}>${inlineHtml(h[2])}</h${h[1].length}>`); i++; continue }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { out.push('<hr/>'); i++; continue }
    if (/^>\s?/.test(line)) { const buf: string[] = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(inlineHtml(lines[i++].replace(/^>\s?/, ''))); out.push(`<blockquote>${buf.join('<br/>')}</blockquote>`); continue }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line); const items: string[] = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) items.push(`<li>${inlineHtml(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`)
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue
    }
    if (!line.trim()) { i++; continue }
    const buf: string[] = [inlineHtml(line)]; i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|\s*---+\s*$)/.test(lines[i])) buf.push(inlineHtml(lines[i++]))
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
  a{color:#16181d} @media print{body{margin:12mm auto}}
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
