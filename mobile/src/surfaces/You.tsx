// ============================================================
// YOU — the relationship, in glass.
//
// The corpus ethics as UI: what she remembers from your sessions, visible
// and deletable; her contact contract (weekly knock budget + quiet hours),
// yours to set; the auditable ledger of every knock; export everything;
// erase everything. Consent-first is not a policy page here — it is the
// controls themselves.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { me, type Memory, type ReachOut, type ReachPrefs } from '../api';
import { useAuth } from '../auth';
import { Body, Button, Card, Label, Mono } from '../components/ui';
import { clearCache } from '../store';
import { colors, fonts, space } from '../theme';

function Stepper({ label, value, onChange, min, max, format }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; format?: (v: number) => string;
}) {
  return (
    <View style={styles.stepper}>
      <Body style={{ flex: 1 }}>{label}</Body>
      <Text style={styles.stepBtn} onPress={() => value > min && onChange(value - 1)}>−</Text>
      <Mono style={styles.stepVal}>{format ? format(value) : String(value)}</Mono>
      <Text style={styles.stepBtn} onPress={() => value < max && onChange(value + 1)}>+</Text>
    </View>
  );
}

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function You() {
  const { token, user, signOut } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [prefs, setPrefs] = useState<ReachPrefs | null>(null);
  const [ledger, setLedger] = useState<ReachOut[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [m, p, l] = await Promise.all([
      me.memories(token).catch(() => ({ memories: [] as Memory[] })),
      me.prefs(token).catch(() => null),
      me.reachOuts(token).catch(() => ({ reach_outs: [] as ReachOut[] })),
    ]);
    setMemories(m.memories);
    setPrefs(p);
    setLedger(l.reach_outs);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const savePrefs = useCallback(async (next: Partial<ReachPrefs>) => {
    if (!token || !prefs) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged); // optimistic — the stepper should feel instant
    try { setPrefs(await me.putPrefs(token, merged)); } catch { /* next load reconciles */ }
  }, [token, prefs]);

  const forget = useCallback((mem: Memory) => {
    Alert.alert('Forget this?', mem.summary || mem.content.slice(0, 120), [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Forget', style: 'destructive',
        onPress: async () => {
          if (!token) return;
          await me.deleteMemory(token, mem.id).catch(() => {});
          setMemories(ms => ms.filter(m => m.id !== mem.id));
        },
      },
    ]);
  }, [token]);

  const exportAll = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const data = await me.exportAll(token);
      await Share.share({ message: JSON.stringify(data, null, 2), title: 'Everything Elle holds of yours' });
    } catch (e) { Alert.alert('Export failed', (e as Error).message); }
    finally { setBusy(false); }
  }, [token]);

  const erase = useCallback(() => {
    Alert.alert(
      'Erase everything?',
      'Your thread, her memories from you, your profile, your devices — gone from her, permanently. This is not sign-out.',
      [
        { text: 'Keep me', style: 'cancel' },
        {
          text: 'Erase everything', style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setBusy(true);
            try {
              await me.erase(token);
              clearCache();
              await signOut();
            } catch (e) { Alert.alert('Erasure failed', (e as Error).message); }
            finally { setBusy(false); }
          },
        },
      ],
    );
  }, [token, signOut]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
      <View>
        <Text style={styles.title}>You</Text>
        <Mono>{user?.email}  ·  {user?.tier}</Mono>
      </View>

      <Card>
        <Label>What she remembers from you</Label>
        {memories.length ? memories.map(m => (
          <View key={m.id} style={styles.memory}>
            <Body>{m.summary || m.content.slice(0, 160)}</Body>
            <Text style={styles.forget} onPress={() => forget(m)}>forget</Text>
          </View>
        )) : (
          <Body style={{ color: colors.dim, marginTop: space(2) }}>
            Nothing deliberately remembered yet. When she chooses to keep something from your conversations, it appears here — and stays yours to delete.
          </Body>
        )}
      </Card>

      <Card>
        <Label>When she may knock</Label>
        {prefs ? (
          <View style={{ marginTop: space(2), gap: space(2) }}>
            <Stepper label="Knocks per week (0 = never)" value={prefs.reach_budget_per_week} min={0} max={14}
              onChange={v => { void savePrefs({ reach_budget_per_week: v }); }} />
            <Stepper label="Quiet from" value={prefs.quiet_start} min={0} max={23} format={hour}
              onChange={v => { void savePrefs({ quiet_start: v }); }} />
            <Stepper label="Quiet until" value={prefs.quiet_end} min={0} max={23} format={hour}
              onChange={v => { void savePrefs({ quiet_end: v }); }} />
            <Mono style={{ marginTop: space(1) }}>timezone {prefs.tz}</Mono>
          </View>
        ) : <Body style={{ color: colors.dim, marginTop: space(2) }}>Loading her contract with you…</Body>}
      </Card>

      <Card>
        <Label>Every knock, on the record</Label>
        {ledger.length ? ledger.map(r => (
          <View key={r.id} style={styles.knock}>
            <Body>{r.body}</Body>
            <Mono>{r.reason_kind} · {new Date(r.sent_at).toLocaleString()}</Mono>
          </View>
        )) : <Body style={{ color: colors.dim, marginTop: space(2) }}>She hasn't knocked. When she does, the reason lives here.</Body>}
      </Card>

      <Card style={{ gap: space(3) }}>
        <Label>Your data</Label>
        <Button title="Export everything" onPress={() => { void exportAll(); }} disabled={busy} />
        <Button title="Erase me from her" onPress={erase} danger disabled={busy} />
        <Button title="Sign out" onPress={() => { void signOut(); }} disabled={busy} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.gold, marginBottom: 2 },
  memory: { marginTop: space(3), paddingTop: space(3), borderTopWidth: 1, borderTopColor: colors.hairline },
  forget: { fontFamily: fonts.mono, fontSize: 11, color: colors.red, marginTop: space(1) },
  knock: { marginTop: space(3), paddingTop: space(3), borderTopWidth: 1, borderTopColor: colors.hairline, gap: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  stepBtn: { fontFamily: fonts.mono, fontSize: 20, color: colors.gold, paddingHorizontal: space(2) },
  stepVal: { minWidth: 52, textAlign: 'center', color: colors.cream, fontSize: 14 },
});
