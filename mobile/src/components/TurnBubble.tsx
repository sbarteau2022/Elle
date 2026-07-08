// One turn of the forever-thread. No chat-app balloons: her words sit on the
// void behind a gold hairline, yours sit right-aligned and quieter. The
// thread reads like a manuscript, not a messenger.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LiveStep } from '../api';
import { colors, fonts, space } from '../theme';
import { ToolFold } from './ToolFold';

export interface ThreadTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kappa?: number | null;
  created_at?: string;
  steps?: LiveStep[];
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
      <Text style={styles.elleText}>{turn.content || (turn.live ? '…' : '')}</Text>
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
