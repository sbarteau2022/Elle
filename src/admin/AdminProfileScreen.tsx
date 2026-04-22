import React, { useState } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap } from '../lib/types';

interface Props {
  user: User;
  token: string;
  cogMap: CognitiveMap | null;
  onCogMapUpdate: (map: CognitiveMap) => void;
}

type Tab = 'map' | 'onboard';

const QUESTIONS = [
  "When you're trying to understand something complex, do you need to see the whole picture first, or do you build it piece by piece?",
  "Describe a time you changed your mind about something important. What shifted?",
  "When something feels wrong but you can't explain why — what do you do with that?",
  "What's the difference between knowing something and understanding it?",
  "How do you know when you're ready to make a decision?",
];

function Bar({ val, label }: { val: number; label: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#C9A84C' }}>{Math.round(val * 100)}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(245,240,232,0.06)' }}>
        <div style={{ height: '100%', background: '#C9A84C', width: `${val * 100}%`, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

export function AdminProfileScreen({ user, token, cogMap, onCogMapUpdate }: Props) {
  const [tab, setTab]           = useState<Tab>('map');
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer]     = useState('');
  const [mapping, setMapping]   = useState(false);

  const submitAnswer = () => {
    if (!answer.trim()) return;
    const updated = [...responses, { question: QUESTIONS[currentQ], answer: answer.trim() }];
    setResponses(updated);
    setAnswer('');
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      runMapping(updated);
    }
  };

  const runMapping = async (rs: { question: string; answer: string }[]) => {
    setMapping(true);
    try {
      const data = await callEdge('elle-cognitive-mapping', {
        action: cogMap ? 'update' : 'initialize',
        user_id: user.id,
        responses: rs,
      }, token);
      if (data.mapped) onCogMapUpdate(data as unknown as CognitiveMap);
      setTab('map');
      setCurrentQ(0);
      setResponses([]);
    } catch {
      // fail silently
    } finally {
      setMapping(false);
    }
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '12px',
    background: tab === t ? 'rgba(201,168,76,0.15)' : '#0d0d1a',
    border: 'none',
    borderBottom: tab === t ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.1)',
    color: tab === t ? '#C9A84C' : '#6a6a7a',
    fontFamily: '"Barlow Condensed", sans-serif',
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: '48px', maxWidth: 780, animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Administration
        </p>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: '0 0 4px' }}>
          Master Profile
        </h2>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.9rem', margin: 0 }}>
          {user.display_name || user.email}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 32 }}>
        {(['map', 'onboard'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t === 'map' ? 'Cognitive Map' : cogMap ? 'Update Mapping' : 'Begin Mapping'}
          </button>
        ))}
      </div>

      {/* Map tab — no map yet */}
      {tab === 'map' && !cogMap && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(201,168,76,0.12)', background: '#0d0d1a' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', margin: '0 0 10px' }}>
            No master profile mapped yet.
          </p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', margin: '0 0 28px', lineHeight: 1.6 }}>
            Answer five questions so Elle can build your cognitive map.<br />
            This profile anchors your reasoning baseline across the system.
          </p>
          <button
            onClick={() => setTab('onboard')}
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Begin Mapping
          </button>
        </div>
      )}

      {/* Map tab — map exists */}
      {tab === 'map' && cogMap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 24, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              Indices — {cogMap.confidence} confidence
            </p>
            <Bar val={cogMap.iq_index} label="IQ Index — reasoning pattern, abstraction" />
            <Bar val={cogMap.eq_index} label="EQ Index — emotional vocabulary, self-awareness" />
            <Bar val={cogMap.threshold_index} label="Threshold Index — where IQ and EQ converge" />
          </div>

          <div style={{ padding: 24, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Learning Modality',   val: cogMap.learning_modality   },
              { label: 'Communication Style', val: cogMap.communication_style },
              { label: 'Confidence',          val: cogMap.confidence          },
              { label: 'Map Version',         val: String(cogMap.map_version || 1) },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>{f.label}</p>
                <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1rem', textTransform: 'capitalize', margin: 0 }}>{f.val}</p>
              </div>
            ))}
          </div>

          {cogMap.growth_arc && (
            <div style={{ padding: 24, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px', gridColumn: '1/-1' }}>Growth Arc</p>
              {[
                { label: 'IQ Delta',        val: cogMap.growth_arc.iq_delta        },
                { label: 'EQ Delta',        val: cogMap.growth_arc.eq_delta        },
                { label: 'Threshold Delta', val: cogMap.growth_arc.threshold_delta },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{f.label}</p>
                  <p style={{ fontFamily: '"Playfair Display", serif', color: f.val >= 0 ? '#C9A84C' : '#8B1A1A', fontSize: '1.1rem', margin: 0 }}>
                    {f.val >= 0 ? '+' : ''}{(f.val * 100).toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {cogMap.course_recommendation_vector && (
            <div style={{ padding: 20, border: '1px solid rgba(201,168,76,0.1)', background: 'rgba(201,168,76,0.03)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Course Vector</p>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.7)', fontSize: '1rem', fontStyle: 'italic', margin: 0 }}>
                "{cogMap.course_recommendation_vector}"
              </p>
            </div>
          )}

          {cogMap.mapping_notes && (
            <div style={{ padding: 20, border: '1px solid rgba(201,168,76,0.1)', background: 'rgba(201,168,76,0.03)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Mapping Notes</p>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.7)', fontSize: '1rem', margin: 0, lineHeight: 1.6 }}>
                {cogMap.mapping_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Onboard tab */}
      {tab === 'onboard' && (
        <div>
          {mapping ? (
            <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(201,168,76,0.12)', background: '#0d0d1a' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#6a6a7a' }}>
                Elle is reading your responses...
              </p>
            </div>
          ) : currentQ < QUESTIONS.length ? (
            <div style={{ padding: 32, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px' }}>
                Question {currentQ + 1} of {QUESTIONS.length}
              </p>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', color: '#F5F0E8', fontWeight: 400, lineHeight: 1.5, margin: '0 0 24px' }}>
                {QUESTIONS[currentQ]}
              </p>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
                placeholder="Take your time. Elle reads what's between the lines too."
                rows={5}
                style={{ width: '100%', background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(201,168,76,0.2)', padding: 16, color: '#F5F0E8', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none', boxSizing: 'border-box', marginBottom: 16, outline: 'none' }}
              />
              <button
                onClick={submitAnswer}
                disabled={!answer.trim()}
                style={{ background: answer.trim() ? 'rgba(201,168,76,0.15)' : 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: answer.trim() ? '#C9A84C' : '#6a6a7a', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: answer.trim() ? 'pointer' : 'default' }}
              >
                {currentQ === QUESTIONS.length - 1 ? 'Complete Mapping' : 'Next'}
              </button>
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(201,168,76,0.12)', background: '#0d0d1a' }}>
              <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', margin: '0 0 16px' }}>Mapping complete.</p>
              <button
                onClick={() => setTab('map')}
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', padding: '10px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                View Map
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
