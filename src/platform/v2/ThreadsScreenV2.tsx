import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User } from '../../lib/types';

interface Thread {
  id: string;
  title: string;
  summary: string;
  status: 'open' | 'resolved' | 'archived';
  last_elle_note?: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  user: User;
  token: string;
}

export function ThreadsScreenV2({ user, token }: Props) {
  const t = useTheme();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [selected, setSelected] = useState<Thread | null>(null);
  const [updateText, setUpdateText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await callEdge('elle-threads', { action: 'list', user_id: user.id }, token);
      setThreads((data.threads as Thread[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const createThread = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await callEdge('elle-threads', {
        action: 'create',
        user_id: user.id,
        title: newTitle.trim(),
        summary: newSummary.trim(),
      }, token);
      setNewTitle('');
      setNewSummary('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  const updateThread = async () => {
    if (!selected || !updateText.trim()) return;
    try {
      const data = await callEdge('elle-threads', {
        action: 'update',
        user_id: user.id,
        thread_id: selected.id,
        context: updateText.trim(),
      }, token);
      setSelected({
        ...selected,
        summary: (data.summary as string) || selected.summary,
        last_elle_note: (data.note as string) || selected.last_elle_note,
      });
      setUpdateText('');
      await load();
    } catch {
      // ignore
    }
  };

  const closeThread = async (status: 'resolved' | 'archived') => {
    if (!selected) return;
    await callEdge('elle-threads', {
      action: 'close',
      user_id: user.id,
      thread_id: selected.id,
      status,
    }, token);
    setSelected(null);
    await load();
  };

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1200, margin: '0 auto', fontFamily: t.fonts.sans,
      display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>

      {/* Left: list + create */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <H level={2} style={{ marginBottom: 6 }}>Threads</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>
            Ongoing situations Elle is tracking across sessions.
          </div>
        </div>

        {/* Create */}
        <Glass padding={16}>
          <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            New thread
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Title (e.g. ‘Wash U pitch follow-up’)"
            style={{
              width: '100%', boxSizing: 'border-box', marginBottom: 8,
              padding: '8px 12px', borderRadius: 8,
              background: t.bgElev, border: `1px solid ${t.border}`,
              fontFamily: t.fonts.sans, fontSize: 13, color: t.ink, outline: 'none',
            }}
          />
          <textarea
            value={newSummary}
            onChange={e => setNewSummary(e.target.value)}
            placeholder="Initial context (optional)"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px', borderRadius: 8,
              background: t.bgElev, border: `1px solid ${t.border}`,
              fontFamily: t.fonts.sans, fontSize: 13, color: t.ink, outline: 'none', resize: 'none',
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Btn variant="primary" size="sm" onClick={createThread} icon={<Sparkle size={10} color="#fff" />} style={{ opacity: newTitle.trim() && !creating ? 1 : 0.5 }}>
              {creating ? 'Creating…' : 'Create thread'}
            </Btn>
          </div>
        </Glass>

        {/* List */}
        {loading && (
          <Glass padding={20} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: t.ink3, fontStyle: 'italic' }}>Loading…</div>
          </Glass>
        )}
        {!loading && threads.length === 0 && (
          <Glass padding={32} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: t.ink3 }}>No threads yet. Start one above.</div>
          </Glass>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {threads.map(thr => {
            const isSel = selected?.id === thr.id;
            return (
              <Glass key={thr.id} padding={14} style={{
                cursor: 'pointer',
                borderColor: isSel ? t.accent : t.border,
                background: isSel ? t.accentSoft : t.bgElev,
              }}>
                <div onClick={() => setSelected(thr)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: t.ink, fontWeight: 500 }}>{thr.title}</span>
                    <Chip tone={thr.status === 'open' ? 'accent' : thr.status === 'resolved' ? 'success' : 'neutral'}>
                      {thr.status}
                    </Chip>
                  </div>
                  {thr.summary && (
                    <div style={{ fontSize: 12, color: t.ink3, lineHeight: 1.5 }}>
                      {thr.summary.length > 80 ? thr.summary.slice(0, 77) + '…' : thr.summary}
                    </div>
                  )}
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.ink3, marginTop: 6 }}>
                    Updated {new Date(thr.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </Glass>
            );
          })}
        </div>
      </div>

      {/* Right: detail */}
      {!selected ? (
        <Glass padding={32} style={{ alignSelf: 'start', textAlign: 'center' }}>
          <H level={3} style={{ marginBottom: 8 }}>Select a thread</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>
            Pick a thread from the left to view detail and add updates.
          </div>
        </Glass>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Glass padding={22}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <H level={2} style={{ marginBottom: 4 }}>{selected.title}</H>
              <Chip tone={selected.status === 'open' ? 'accent' : selected.status === 'resolved' ? 'success' : 'neutral'}>
                {selected.status}
              </Chip>
            </div>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fonts.mono, marginBottom: 14 }}>
              Created {new Date(selected.created_at).toLocaleDateString()} · Updated {new Date(selected.updated_at).toLocaleDateString()}
            </div>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.6, letterSpacing: -0.2 }}>
              {selected.summary || 'No summary yet. Add an update below to seed Elle’s synthesis.'}
            </div>
          </Glass>

          {selected.last_elle_note && (
            <Glass padding={16} style={{ border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkle size={12} />
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Elle · last note
                </span>
              </div>
              <div style={{ fontFamily: t.fonts.serif, fontSize: 15, color: t.ink2, lineHeight: 1.55 }}>
                {selected.last_elle_note}
              </div>
            </Glass>
          )}

          <Glass padding={14} style={{ border: `1px solid ${t.accent}40` }}>
            <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Add context
            </div>
            <textarea
              value={updateText}
              onChange={e => setUpdateText(e.target.value)}
              placeholder="What's new on this thread?"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: t.fonts.sans, fontSize: 14, color: t.ink, lineHeight: 1.5, resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip tone="ai" icon={<Sparkle size={10} />}>Elle re-synthesizes summary</Chip>
              <div style={{ flex: 1 }} />
              <Btn variant="ghost" size="sm" onClick={() => closeThread('resolved')}>Resolve</Btn>
              <Btn variant="ghost" size="sm" onClick={() => closeThread('archived')}>Archive</Btn>
              <Btn variant="primary" size="sm" icon={<span>↵</span>} onClick={updateThread} style={{ opacity: updateText.trim() ? 1 : 0.5 }}>
                Update
              </Btn>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
