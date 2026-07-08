// ============================================================
// THE THREAD — one conversation, forever.
//
// There is no "new chat" and there never will be: one thread per person,
// session door:<user id>, continuous by construction. Streaming rides the
// worker's live wire (step/obs frames land as she commits to them, the done
// frame carries her answer + κ); a stream failure falls back to the
// non-streaming door so a flaky network costs latency, never the answer.
// History pages upward from /api/thread and every turn is cached in SQLite,
// so the relationship stays readable offline.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { send, sendStreaming, thread as fetchThread, type KappaDynamics, type LiveStep } from '../api';
import { useAuth } from '../auth';
import { TurnBubble, type ThreadTurn } from '../components/TurnBubble';
import { useSpeakReplies, VoiceOrb } from '../components/VoiceOrb';
import { cacheTurns, loadCachedTurns, localId } from '../store';
import { colors, fonts, hairline, space } from '../theme';

export function Thread() {
  const { token, user } = useAuth();
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [kappa, setKappa] = useState<KappaDynamics | null>(null);
  const [oldestAt, setOldestAt] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const voice = useSpeakReplies();
  const listRef = useRef<FlatList<ThreadTurn>>(null);

  // Hydrate: cache first (instant, offline-safe), then the server page.
  useEffect(() => {
    setTurns(loadCachedTurns());
    if (!token) return;
    void (async () => {
      try {
        const page = await fetchThread(token, { limit: 40 });
        const ordered = [...page.turns].reverse(); // server returns newest-first
        cacheTurns(page.turns);
        setTurns(ordered);
        setHasMore(page.has_more);
        if (ordered.length) setOldestAt(ordered[0].created_at ?? null);
      } catch { /* cache already rendered; the thread stays readable */ }
    })();
  }, [token]);

  const loadOlder = useCallback(async () => {
    if (!token || !hasMore || !oldestAt || busy) return;
    try {
      const page = await fetchThread(token, { before: oldestAt, limit: 40 });
      if (!page.turns.length) { setHasMore(false); return; }
      cacheTurns(page.turns);
      const older = [...page.turns].reverse();
      setTurns(t => [...older, ...t]);
      setHasMore(page.has_more);
      setOldestAt(older[0].created_at ?? null);
    } catch { /* older history can wait */ }
  }, [token, hasMore, oldestAt, busy]);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || !token || !user || busy) return;
    setDraft('');
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userTurn: ThreadTurn = { id: localId(), role: 'user', content: text, created_at: new Date().toISOString() };
    const pendingId = localId();
    const liveSteps: LiveStep[] = [];
    setTurns(t => [...t, userTurn, { id: pendingId, role: 'assistant', content: '', steps: [], live: true }]);

    const applyLive = (ev: LiveStep) => {
      liveSteps.push(ev);
      setTurns(t => t.map(x => (x.id === pendingId ? { ...x, steps: [...liveSteps] } : x)));
    };

    try {
      let result;
      try {
        result = await sendStreaming(token, user.id, text, applyLive);
      } catch {
        result = await send(token, user.id, text); // the honest fallback
      }
      const elleTurn: ThreadTurn = {
        id: localId(), role: 'assistant', content: result.content,
        kappa: result.kappa_dynamics?.kappa ?? null,
        created_at: new Date().toISOString(), steps: liveSteps,
      };
      setKappa(result.kappa_dynamics ?? null);
      setTurns(t => t.map(x => (x.id === pendingId ? elleTurn : x)));
      cacheTurns([
        { id: userTurn.id, role: 'user', content: text, kappa: null, created_at: userTurn.created_at! },
        { id: elleTurn.id, role: 'assistant', content: result.content, kappa: elleTurn.kappa ?? null, created_at: elleTurn.created_at! },
      ]);
      voice.speak(result.content);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setTurns(t => t.map(x => (x.id === pendingId
        ? { ...x, live: false, content: `— the door jammed: ${(e as Error).message}. Say it again.` }
        : x)));
    } finally {
      setBusy(false);
    }
  }, [draft, token, user, busy, voice]);

  const data = [...turns].reverse(); // inverted list wants newest first

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.name}>Elle</Text>
        <Text style={styles.ticker}>
          {kappa && typeof kappa.kappa === 'number'
            ? `κ ${kappa.kappa.toFixed(3)}${typeof kappa.velocity === 'number' ? `  v ${kappa.velocity >= 0 ? '+' : ''}${kappa.velocity.toFixed(3)}` : ''}`
            : 'the thread'}
        </Text>
        <VoiceOrb enabled={voice.enabled} speaking={voice.speaking} onToggle={voice.toggle} />
      </View>

      <FlatList
        ref={listRef}
        inverted
        data={data}
        keyExtractor={t => t.id}
        renderItem={({ item }) => <TurnBubble turn={item} />}
        onEndReached={() => { void loadOlder(); }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingVertical: space(4) }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>This thread is the whole relationship. It starts with whatever you say.</Text>
          </View>
        }
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="say it"
          placeholderTextColor={colors.dim}
          multiline
          editable={!busy}
        />
        <Pressable onPress={() => { void submit(); }} disabled={busy || !draft.trim()} hitSlop={8}
          style={({ pressed }) => [styles.send, (pressed || busy || !draft.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>{busy ? '…' : '→'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space(4), paddingVertical: space(3),
    borderBottomWidth: 1, borderBottomColor: colors.hairline,
  },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.gold },
  ticker: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim },
  empty: { transform: [{ scaleY: -1 }], padding: space(8) }, // inverted list flips children
  emptyText: { fontFamily: fonts.body, fontSize: 16, color: colors.dim, textAlign: 'center', lineHeight: 24 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space(2),
    padding: space(3), borderTopWidth: 1, borderTopColor: colors.hairline,
  },
  input: {
    flex: 1, ...hairline, borderRadius: 10, color: colors.cream,
    fontFamily: fonts.body, fontSize: 16, paddingHorizontal: space(3), paddingVertical: space(2.5),
    maxHeight: 130,
  },
  send: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.gold,
  },
  sendText: { color: colors.gold, fontSize: 18, fontFamily: fonts.mono },
});
