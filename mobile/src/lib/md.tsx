// ============================================================
// md.tsx — Elle's markdown, rendered safe, for the phone.
//
// TurnBubble used to hand her answer to a plain <Text> — no bold, no lists,
// no tables, literal asterisks and pipes on screen. This mirrors the
// workbench's grammar (Elle/src/lib/md.tsx: headings, bold/italic/inline
// code, fenced code, lists, blockquotes, hr, links, GFM tables) rebuilt on
// View/Text since React Native has no <table>/<pre>/<p> — a turn should
// read the same on the phone as it does on the desk. No raw HTML anywhere,
// so this can't become an injection surface either.
// ============================================================
import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { colors, fonts, space } from '../theme';
import { artifactUrl, imageLine, isArtifactPath, isVideoArtifact } from './artifacts';

// ── inline: **bold** *italic* `code` [text](url) ─────────────
function inline(text: string, keyBase: string, baseStyle?: TextStyle): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(!\[([^\]]*)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Text key={`${keyBase}t${k++}`} style={baseStyle}>{text.slice(last, m.index)}</Text>);
    if (m[3] != null) {
      // An image mid-sentence. Only her own stored artifacts load; anything
      // else keeps its alt text (tappable when it is a real URL) so the
      // sentence still reads and nothing is fetched on her say-so.
      const alt = m[2], src = m[3];
      if (isArtifactPath(src)) out.push(<Artifact key={`${keyBase}m${k++}`} path={src} alt={alt} />);
      else if (/^https?:\/\//.test(src)) out.push(<Text key={`${keyBase}m${k++}`} style={styles.link} onPress={() => { void Linking.openURL(src); }}>{alt || src}</Text>);
      else out.push(<Text key={`${keyBase}m${k++}`} style={baseStyle}>{alt}</Text>);
    }
    else if (m[4] != null) out.push(<Text key={`${keyBase}b${k++}`} style={[baseStyle, styles.bold]}>{m[4]}</Text>);
    else if (m[5] != null) out.push(<Text key={`${keyBase}i${k++}`} style={[baseStyle, styles.italic]}>{m[5]}</Text>);
    else if (m[6] != null) out.push(<Text key={`${keyBase}c${k++}`} style={styles.code}>{m[6]}</Text>);
    else if (m[7] != null) {
      const url = m[8];
      out.push(<Text key={`${keyBase}a${k++}`} style={styles.link} onPress={() => { void Linking.openURL(url); }}>{m[7]}</Text>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Text key={`${keyBase}tail`} style={baseStyle}>{text.slice(last)}</Text>);
  return out;
}

// ── tables — GFM pipe syntax, mirrors the workbench parser exactly ───
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}
function isTableRow(line: string): boolean { return line.includes('|') && line.trim().length > 0; }
function isTableSep(line: string): boolean {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');
}
const BLOCK_START = /^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|\s*---+\s*$)/;
// An artifact on its own line opens a block too — otherwise a picture written
// directly under a sentence is swallowed into that paragraph as a bare path.
function stopsParagraph(line: string): boolean { return BLOCK_START.test(line) || isTableRow(line) || imageLine(line) != null; }

// ── one rendered artifact — the picture, on the phone ────────
// React Native has no intrinsic image sizing: an <Image> with no height is
// zero pixels tall, so the real work here is measuring. Image.getSize gives
// the natural aspect ratio, which we hold while the width flexes to the
// column — the picture keeps its shape on any screen without a layout jump.
// Until it resolves nothing is reserved, so prose never jumps around it.
//
// Video is NOT played inline: expo-av/expo-video is not a dependency of this
// app, and adding a player is a bigger decision than this change. An mp4
// artifact is offered as a link out instead, which is honest about what the
// phone will do with it.
export function Artifact({ path, alt, caption }: { path: string; alt?: string; caption?: string }): React.ReactElement {
  const url = artifactUrl(path);
  const [ratio, setRatio] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);
  const label = caption || alt || '';

  React.useEffect(() => {
    let alive = true;
    if (isVideoArtifact(path)) return;
    Image.getSize(url, (w, h) => { if (alive && h > 0) setRatio(w / h); }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [url, path]);

  if (failed) {
    return (
      <View style={styles.artifactFallback}>
        <Text style={styles.artifactFallbackText}>artifact unavailable · {path}</Text>
      </View>
    );
  }
  if (isVideoArtifact(path)) {
    return (
      <View style={styles.artifactBlock}>
        <Text style={styles.link} onPress={() => { void Linking.openURL(url); }}>
          {label || 'video artifact'} — open
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.artifactBlock}>
      {ratio != null && (
        <Image
          source={{ uri: url }}
          style={[styles.artifactImage, { aspectRatio: ratio }]}
          resizeMode="contain"
          accessibilityLabel={alt || 'artifact'}
          onError={() => setFailed(true)}
        />
      )}
      {label !== '' && <Text style={styles.artifactCaption}>{label}</Text>}
    </View>
  );
}

// ── block-level renderer ──────────────────────────────────────
export function Md({ text }: { text: string }): React.ReactElement {
  const lines = String(text || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    // fenced code
    if (/^```/.test(line)) {
      const buf: string[] = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push(
        <View key={key++} style={styles.pre}>
          <Text style={styles.preText}>{buf.join('\n')}</Text>
        </View>
      );
      continue;
    }
    // headings
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      const headingStyle = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      blocks.push(<Text key={key++} style={headingStyle}>{inline(h[2], `h${key}`, headingStyle)}</Text>);
      i++; continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { blocks.push(<View key={key++} style={styles.hr} />); i++; continue; }
    // an artifact alone on its line — the picture itself, where she put it
    const img = imageLine(line);
    if (img) { blocks.push(<Artifact key={key++} path={img.path} alt={img.alt} />); i++; continue; }
    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(
        <View key={key++} style={styles.blockquote}>
          {buf.map((b, j) => <Text key={j} style={styles.blockquoteText}>{inline(b, `q${key}${j}`, styles.blockquoteText)}</Text>)}
        </View>
      );
      continue;
    }
    // lists
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i])))
        items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      blocks.push(
        <View key={key++} style={styles.list}>
          {items.map((it, j) => (
            <View key={j} style={styles.listItem}>
              <Text style={styles.bullet}>{ordered ? `${j + 1}.` : '•'}</Text>
              <Text style={styles.bodyText}>{inline(it, `l${key}${j}`, styles.bodyText)}</Text>
            </View>
          ))}
        </View>
      );
      continue;
    }
    // table — GFM pipe syntax: a row, then a |---|---| separator
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) bodyRows.push(splitRow(lines[i++]));
      blocks.push(
        <ScrollView key={key++} horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              {header.map((c, j) => (
                <View key={j} style={styles.cell}><Text style={styles.thText}>{inline(c, `th${key}${j}`, styles.thText)}</Text></View>
              ))}
            </View>
            {bodyRows.map((r, ri) => (
              <View key={ri} style={styles.tr}>
                {r.map((c, ci) => (
                  <View key={ci} style={styles.cell}><Text style={styles.tdText}>{inline(c, `td${key}${ri}${ci}`, styles.tdText)}</Text></View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
      continue;
    }
    if (!line.trim()) { i++; continue; }
    // paragraph — consume consecutive non-special lines, preserve single breaks
    const buf: string[] = [line]; i++;
    while (i < lines.length && lines[i].trim() && !stopsParagraph(lines[i])) buf.push(lines[i++]);
    blocks.push(
      <Text key={key++} style={styles.paragraph}>
        {buf.map((b, j) => <React.Fragment key={j}>{j > 0 && '\n'}{inline(b, `p${key}${j}`, styles.bodyText)}</React.Fragment>)}
      </Text>
    );
  }
  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  bodyText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.cream },
  paragraph: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.cream, marginVertical: space(1) },
  bold: { fontFamily: fonts.bodyMedium },
  italic: { fontStyle: 'italic' },
  code: {
    fontFamily: fonts.mono, fontSize: 14, color: colors.gold,
    backgroundColor: 'rgba(245,240,232,0.08)', paddingHorizontal: 4, borderRadius: 3,
  },
  link: { color: colors.gold, textDecorationLine: 'underline' },
  artifactBlock: { marginVertical: space(2) },
  artifactImage: { width: '100%', borderRadius: 6, borderWidth: 1, borderColor: colors.hairline },
  artifactCaption: { fontFamily: fonts.mono, fontSize: 11, color: colors.mist, marginTop: space(1.5) },
  artifactFallback: {
    marginVertical: space(2), padding: space(2.5),
    borderWidth: 1, borderColor: colors.hairline, borderRadius: 6,
  },
  artifactFallbackText: { fontFamily: fonts.mono, fontSize: 11, color: colors.mist },
  h1: { fontFamily: fonts.display, fontSize: 22, color: colors.cream, marginTop: space(3), marginBottom: space(1) },
  h2: { fontFamily: fonts.display, fontSize: 19, color: colors.cream, marginTop: space(3), marginBottom: space(1) },
  h3: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.cream, marginTop: space(2), marginBottom: space(1) },
  hr: { height: 1, backgroundColor: colors.hairline, marginVertical: space(3) },
  blockquote: { borderLeftWidth: 2, borderLeftColor: colors.dim, paddingLeft: space(3), marginVertical: space(2) },
  blockquoteText: { fontFamily: fonts.body, fontSize: 16, fontStyle: 'italic', color: colors.mist, lineHeight: 23 },
  list: { marginVertical: space(1) },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: space(2), marginVertical: space(0.5) },
  bullet: { fontFamily: fonts.mono, fontSize: 15, color: colors.gold, minWidth: 16 },
  pre: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 8,
    padding: space(3), marginVertical: space(2),
  },
  preText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: colors.mist },
  tableScroll: { marginVertical: space(2) },
  table: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 6, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.hairline },
  thRow: { backgroundColor: 'rgba(245,240,232,0.06)' },
  cell: { minWidth: 110, paddingVertical: space(2), paddingHorizontal: space(2.5) },
  thText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cream },
  tdText: { fontFamily: fonts.body, fontSize: 14, color: colors.cream },
});
