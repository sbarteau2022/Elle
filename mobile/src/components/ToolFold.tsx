// The glass on a turn: her reasoning steps, folded. Collapsed, one mono line
// says how she got there; open, every step shows its thought, the tool it
// reached for, and what came back. Ported interaction from the workbench's
// EllePanel timeline — watching is the point, so nothing is hidden, only
// folded.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LiveStep } from '../api';
import { colors, fonts, space } from '../theme';

export function ToolFold({ steps, live }: { steps: LiveStep[]; live?: boolean }) {
  const [open, setOpen] = useState(false);
  const toolSteps = steps.filter(s => s.kind === 'step' || s.kind === 'obs');
  if (!toolSteps.length) return null;

  const tools = [...new Set(toolSteps.map(s => s.tool).filter(Boolean))] as string[];
  const summary = `${tools.length ? tools.join(' · ') : 'thinking'}${live ? ' …' : ''}`;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen(o => !o)} hitSlop={8}>
        <Text style={styles.summary}>{open ? '▾' : '▸'} {summary}</Text>
      </Pressable>
      {open && toolSteps.map((s, i) => (
        <View key={i} style={styles.step}>
          {s.thought ? <Text style={styles.thought}>{s.thought}</Text> : null}
          {s.tool ? (
            <Text style={styles.tool}>
              {s.tool}({s.args ? JSON.stringify(s.args).slice(1, 121) : ''})
            </Text>
          ) : null}
          {s.result ? <Text style={styles.result}>{s.result.slice(0, 300)}</Text> : null}
          {typeof s.duration_ms === 'number' ? <Text style={styles.ms}>{s.duration_ms}ms</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space(1.5) },
  summary: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, letterSpacing: 0.5 },
  step: { marginTop: space(2), paddingLeft: space(3), borderLeftWidth: 1, borderLeftColor: colors.hairline },
  thought: { fontFamily: fonts.body, fontSize: 14, color: colors.mist, fontStyle: 'italic' },
  tool: { fontFamily: fonts.mono, fontSize: 11, color: colors.gold, marginTop: 2 },
  result: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginTop: 2 },
  ms: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim, marginTop: 2, opacity: 0.7 },
});
