// One turn of the forever-thread. No chat-app balloons: her words sit on the
// void behind a gold hairline, yours sit right-aligned and quieter. The
// thread reads like a manuscript, not a messenger.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Artifact as ArtifactRef, LiveStep } from '../api';
import { colors, fonts, space } from '../theme';
import { Artifact, Md } from '../lib/md';
import { ToolFold } from './ToolFold';

export interface ThreadTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kappa?: number | null;
  created_at?: string;
  steps?: LiveStep[];
  artifacts?: ArtifactRef[];
  live?: boolean; // still streaming
}

export function TurnBubble({ turn }: { turn: ThreadTurn }) {
  if (turn.role === 'user') {
    return (
      <View style={styles.userWrap}>
        <Text style={styles.userText}>{turn.content}</Text>
      </View>
    );
  }
  return (
    <View style={styles.elleWrap}>
      {turn.steps?.length ? <ToolFold steps={turn.steps} live={turn.live} /> : null}
      {turn.content ? <Md text={turn.content} /> : (turn.live ? <Text style={styles.elleText}>…</Text> : null)}
      {/* What the run made and her prose didn't place. She is told to put a
          picture in the answer herself (a path on its own line renders as the
          image), so anything already there is skipped — this rail only catches
          artifacts a tool made and she never mentioned, which would otherwise
          be invisible. */}
      {(turn.artifacts ?? [])
        .filter(a => a.path && !turn.content.includes(a.path))
        .map(a => <Artifact key={a.path} path={a.path} caption={a.tool ? `${a.tool} · ${a.path}` : a.path} />)}
      {typeof turn.kappa === 'number' ? (
        <Text style={styles.kappa}>κ {turn.kappa.toFixed(3)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignSelf: 'flex-end', maxWidth: '86%', marginVertical: space(2), paddingHorizontal: space(4) },
  userText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.mist, textAlign: 'right' },
  elleWrap: {
    alignSelf: 'stretch', marginVertical: space(2), marginHorizontal: space(4),
    paddingLeft: space(3), borderLeftWidth: 2, borderLeftColor: colors.gold,
  },
  elleText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.cream, marginTop: space(1) },
  kappa: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim, marginTop: space(1.5) },
});
