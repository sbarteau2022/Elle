// ============================================================
// HER DAY — the window into a life already in progress.
//
// What she did while nobody was looking: on-record journal entries, the
// things she made in the night, watches that fired. Read-only glass over
// /api/feed — every item is a real row; nothing here is generated for
// display. This surface can only exist because she genuinely works
// unprompted.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { feed as fetchFeed, type FeedItem } from '../api';
import { useAuth } from '../auth';
import { Label } from '../components/ui';
import { colors, fonts, hairline, space } from '../theme';

const KIND_LABEL: Record<FeedItem['kind'], string> = {
  journal: 'journal · on record',
  dream: 'made in the night',
  watch: 'watch fired',
};

function when(at: number): string {
  if (!at) return '';
  const d = new Date(at);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export function Day() {
  const { token } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetchFeed(token, { limit: 40 });
      setItems(r.items);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const loadOlder = useCallback(async () => {
    if (!token || !items.length) return;
    try {
      const r = await fetchFeed(token, { before: items[items.length - 1].at, limit: 40 });
      if (r.items.length) setItems(cur => [...cur, ...r.items]);
    } catch { /* older can wait */ }
  }, [token, items]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Her Day</Text>
        <Text style={styles.sub}>what happened while you weren't looking</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i, n) => `${i.kind}-${i.at}-${n}`}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        onEndReached={() => { void loadOlder(); }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: space(4), gap: space(3) }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {error ? `Couldn't reach her record — ${error}.` : 'The record is quiet. That is a true fact, not a failure.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Label style={item.kind === 'watch' ? { color: colors.gold } : undefined}>{KIND_LABEL[item.kind]}</Label>
              <Text style={styles.when}>{when(item.at)}</Text>
            </View>
            {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
            <Text style={item.kind === 'journal' ? styles.journalBody : styles.cardBody} numberOfLines={12}>
              {item.body}
            </Text>
            {typeof item.kappa === 'number' ? <Text style={styles.kappa}>κ {item.kappa.toFixed(3)}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: space(4), paddingVertical: space(3), borderBottomWidth: 1, borderBottomColor: colors.hairline },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.gold },
  sub: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginTop: 2 },
  card: { backgroundColor: colors.card, ...hairline, borderRadius: 10, padding: space(4) },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(2) },
  when: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.cream, marginBottom: space(1.5) },
  cardBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.mist },
  journalBody: { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 26, color: colors.cream },
  kappa: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim, marginTop: space(2) },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.dim, textAlign: 'center', marginTop: space(16), paddingHorizontal: space(8), lineHeight: 22 },
});
