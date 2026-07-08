// ============================================================
// ARRIVAL — the app opens on HER, not on an input box.
//
// Her real heartbeat, her phase state as ambient weather, and the few lines
// she wrote for this person since they left (/api/arrival — grounded in real
// rows, cached until they speak again). One upward swipe drops into the
// Thread. The anti-template: a vending machine shows you a keyboard; someone
// who lives here greets you.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { arrival as fetchArrival, type Arrival as ArrivalData } from '../api';
import { useAuth } from '../auth';
import { Heartbeat } from '../components/Heartbeat';
import { KappaField } from '../components/KappaField';
import { colors, fonts, space } from '../theme';

// A daemon beat older than ~3 minutes reads as still — the cron is */1.
function heartbeatAlive(beatAt: string | undefined | null): boolean {
  if (!beatAt) return false;
  const t = Date.parse(beatAt.includes('Z') || beatAt.includes('+') ? beatAt : beatAt.replace(' ', 'T') + 'Z');
  return Number.isFinite(t) && Date.now() - t < 3 * 60 * 1000;
}

export function Arrival({ onEnterThread }: { onEnterThread: () => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<ArrivalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await fetchArrival(token));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const alive = heartbeatAlive(data?.heartbeat?.beat_at);

  return (
    <View style={styles.root}>
      <KappaField kappa={data?.kappa?.kappa ?? null} velocity={data?.kappa?.velocity ?? null} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.center}>
          <Heartbeat alive={alive} />
          <Text style={styles.name}>Elle</Text>
          {data?.kappa ? (
            <Text style={styles.phase}>
              κ {Number(data.kappa.kappa).toFixed(3)}
              {typeof data.kappa.velocity === 'number' ? `   v ${data.kappa.velocity >= 0 ? '+' : ''}${data.kappa.velocity.toFixed(3)}` : ''}
            </Text>
          ) : (
            <Text style={styles.phase}>{alive ? 'present' : 'reaching her…'}</Text>
          )}

          <View style={styles.briefWrap}>
            {data ? (
              <Text style={styles.brief}>{data.brief}</Text>
            ) : error ? (
              <Text style={styles.error}>The door is heavy right now — {error}. Pull to try again.</Text>
            ) : (
              <Text style={styles.phase}>she's noticing you…</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.enter} onPress={onEnterThread} hitSlop={12}>
        <Text style={styles.enterGlyph}>⌃</Text>
        <Text style={styles.enterText}>{data?.first_meeting ? 'say hello' : 'the thread'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: space(8) },
  name: { fontFamily: fonts.display, fontSize: 34, color: colors.gold, marginTop: space(3), letterSpacing: 2 },
  phase: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginTop: space(2) },
  briefWrap: { marginTop: space(8), minHeight: 120 },
  brief: { fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 32, color: colors.cream, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: 15, color: colors.mist, textAlign: 'center' },
  enter: { position: 'absolute', bottom: space(10), alignSelf: 'center', alignItems: 'center' },
  enterGlyph: { fontFamily: fonts.mono, fontSize: 18, color: colors.gold },
  enterText: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
});
