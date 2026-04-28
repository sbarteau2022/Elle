import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User } from '../../lib/types';

interface Law {
  law_n: string;
  law_name: string;
  ctx?: string;
  source: '48laws' | 'aow';
  mastery: number;
  deployment_count: number;
  times_recognized: number;
}

interface Synthesis {
  synthesis?: string;
  duel_context?: string;
}

interface Props {
  user: User;
  token: string;
}

export function DoctrineView({ user, token }: Props) {
  const t = useTheme();
  const [tab, setTab] = useState<'48laws' | 'aow'>('48laws');
  const [laws, setLaws] = useState<Law[]>([]);
  const [sel, setSel] = useState<Law | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);

  const loadLaws = useCallback(async (source: '48laws' | 'aow') => {
    setLoading(true);
    try {
      const data = await callEdge('elle-doctrine', { action: 'list', user_id: user.id, source }, token);
      const list = (data.laws as Law[]) || [];
      setLaws(list);
      if (list.length > 0) setSel(list[0]);
    } finally {
      setLoading(false);
    }
  }, [user.id, token]);

  useEffect(() => { loadLaws(tab); }, [tab, loadLaws]);

  useEffect(() => {
    if (!sel) { setSynthesis(null); return; }
    setSynthesis(null);
    setSynthLoading(true);
    callEdge('elle-doctrine', { action: 'get', user_id: user.id, source: sel.source, law_n: sel.law_n }, token)
      .then(d => setSynthesis({ synthesis: d.synthesis as string, duel_context: d.duel_context as string }))
      .catch(() => setSynthesis(null))
      .finally(() => setSynthLoading(false));
  }, [sel, user.id, token]);

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1200, margin: '0 auto', fontFamily: t.fonts.sans,
      display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14 }}>

      {/* List */}
      <div>
        <H level={2} style={{ marginBottom: 8 }}>Doctrine</H>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['48laws', 'aow'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '6px 12px', borderRadius: 8,
              background: tab === k ? t.accentSoft : t.surfaceSoft,
              color: tab === k ? t.accent : t.ink2,
              border: `1px solid ${tab === k ? t.accent : t.border}`,
              fontFamily: t.fonts.sans, fontSize: 12, cursor: 'pointer',
            }}>{k === '48laws' ? '48 Laws' : 'Art of War'}</button>
          ))}
        </div>

        {loading && <Glass padding={20} style={{ textAlign: 'center', color: t.ink3, fontStyle: 'italic', fontSize: 13 }}>Loading…</Glass>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {laws.map(l => {
            const isSel = sel?.law_n === l.law_n;
            return (
              <Glass key={l.law_n} padding={12} style={{
                cursor: 'pointer',
                borderColor: isSel ? t.accent : t.border,
                background: isSel ? t.accentSoft : t.bgElev,
              }}>
                <div onClick={() => setSel(l)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Chip tone="ai">{l.source === '48laws' ? `§${l.law_n}` : l.law_n}</Chip>
                    <Chip>{Math.round(l.mastery * 100)}%</Chip>
                  </div>
                  <div style={{ fontSize: 13, color: t.ink, marginBottom: 4, letterSpacing: -0.1 }}>{l.law_name}</div>
                  {l.ctx && <div style={{ fontSize: 11, color: t.ink3 }}>{l.ctx}</div>}
                </div>
              </Glass>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!sel && (
          <Glass padding={32} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: t.ink3 }}>Pick a law to view its mastery and tactical synthesis.</div>
          </Glass>
        )}

        {sel && (
          <>
            <Glass padding={28}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <Chip tone="ai">{sel.source === '48laws' ? `§${sel.law_n}` : sel.law_n}</Chip>
                <H level={2} style={{ marginBottom: 0 }}>{sel.law_name}</H>
              </div>
              {sel.ctx && <div style={{ fontSize: 13, color: t.ink3, marginBottom: 14 }}>{sel.ctx}</div>}

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mastery</span>
                  <span style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink2 }}>{Math.round(sel.mastery * 100)}%</span>
                </div>
                <Meter value={sel.mastery * 100} max={100} h={6} />
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: t.ink3 }}>
                <div>Deployments: <span style={{ color: t.ink, fontWeight: 500 }}>{sel.deployment_count}</span></div>
                <div>Recognized: <span style={{ color: t.ink, fontWeight: 500 }}>{sel.times_recognized}×</span></div>
              </div>
            </Glass>

            <Glass padding={20} style={{ border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkle size={12} />
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · synthesis</span>
              </div>
              {synthLoading && <div style={{ fontSize: 13, color: t.ink3, fontStyle: 'italic' }}>Synthesizing…</div>}
              {synthesis?.synthesis && (
                <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2, marginBottom: 12 }}>
                  {synthesis.synthesis}
                </div>
              )}
              {synthesis?.duel_context && (
                <>
                  <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 }}>In a duel</div>
                  <div style={{ fontSize: 13, color: t.ink2, lineHeight: 1.55 }}>{synthesis.duel_context}</div>
                </>
              )}
            </Glass>
          </>
        )}
      </div>
    </div>
  );
}
