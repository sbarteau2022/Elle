import React, { useState } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap } from '../lib/types';

interface Props {
  user: User;
  token: string;
  cogMap: CognitiveMap | null;
  onCogMapUpdate: (map: CognitiveMap) => void;
}

type Tab = 'map' | 'onboard' | 'voice';

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
        <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: '#C9A84C' }}>{Math.round(val * 100)}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(245,240,232,0.06)' }}>
        <div style={{ height: '100%', background: '#8B1A1A', width: `${val * 100}%`, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

export function ProfileScreen({ user, token, cogMap, onCogMapUpdate }: Props) {
  const [tab, setTab] = useState<Tab>('map');
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [mapping, setMapping] = useState(false);

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
    } catch {
      // fail silently — user sees no change
    } finally {
      setMapping(false);
    }
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '12px',
    background: tab === t ? '#8B1A1A' : '#13131f',
    border: 'none',
    color: tab === t ? '#F5F0E8' : '#6a6a7a',
    fontFamily: '"Barlow Condensed", sans-serif',
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: '48px', maxWidth: 780, animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>
          My Profile
        </p>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: 0 }}>
          {user.display_name || user.email}
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 32, background: 'rgba(139,26,26,0.15)' }}>
        {(['map', 'onboard', 'voice'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t === 'map' ? 'Cognitive Map' : t === 'onboard' ? 'Update Mapping' : 'Voice Settings'}
          </button>
        ))}
      </div>

      {/* Map tab */}
      {tab === 'map' && !cogMap && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(139,26,26,0.2)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', marginBottom: 8 }}>No map yet.</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', marginBottom: 24 }}>
            Answer five questions so Elle can build your cognitive profile.
          </p>
          <button onClick={() => setTab('onboard')} style={{ background: '#8B1A1A', border: 'none', color: '#F5F0E8', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Begin Mapping
          </button>
        </div>
      )}

      {tab === 'map' && cogMap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 24, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              Indices — {cogMap.confidence} confidence
            </p>
            <Bar val={cogMap.iq_index} label="IQ Index — reasoning pattern, abstraction" />
            <Bar val={cogMap.eq_index} label="EQ Index — emotional vocabulary, self-awareness" />
            <Bar val={cogMap.threshold_index} label="Threshold Index — where IQ and EQ converge" />
          </div>

          <div style={{ padding: 24, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Learning Modality',    val: cogMap.learning_modality    },
              { label: 'Communication Style',  val: cogMap.communication_style  },
              { label: 'Confidence',           val: cogMap.confidence           },
              { label: 'Map Version',          val: String(cogMap.map_version || 1) },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, margin: '0 0 6px' }}>{f.label}</p>
                <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1rem', textTransform: 'capitalize', margin: 0 }}>{f.val}</p>
              </div>
            ))}
          </div>

          {cogMap.course_recommendation_vector && (
            <div style={{ padding: 20, border: '1px solid rgba(139,26,26,0.15)', background: 'rgba(139,26,26,0.04)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, margin: '0 0 8px' }}>Course Vector</p>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.7)', fontSize: '1rem', fontStyle: 'italic', margin: 0 }}>
                "{cogMap.course_recommendation_vector}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Onboard tab */}
      {tab === 'onboard' && (
        <div>
          {mapping ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: '#6a6a7a' }}>Elle is reading your responses...</p>
            </div>
          ) : currentQ < QUESTIONS.length ? (
            <div style={{ padding: 32, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16, margin: '0 0 16px' }}>
                Question {currentQ + 1} of {QUESTIONS.length}
              </p>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.25rem', color: '#F5F0E8', fontWeight: 400, lineHeight: 1.5, marginBottom: 24, margin: '0 0 24px' }}>
                {QUESTIONS[currentQ]}
              </p>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }}}
                placeholder="Take your time. Elle reads what's between the lines too."
                rows={5}
                style={{ width: '100%', background: 'rgba(15,15,26,0.8)', border: '1px solid rgba(139,26,26,0.25)', padding: 16, color: '#F5F0E8', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <button
                onClick={submitAnswer}
                disabled={!answer.trim()}
                style={{ background: answer.trim() ? '#8B1A1A' : 'transparent', border: '1px solid rgba(139,26,26,0.3)', color: answer.trim() ? '#F5F0E8' : '#6a6a7a', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: answer.trim() ? 'pointer' : 'default' }}
              >
                {currentQ === QUESTIONS.length - 1 ? 'Complete Mapping' : 'Next'}
              </button>
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', marginBottom: 12 }}>Mapping complete.</p>
              <button onClick={() => setTab('map')} style={{ background: '#8B1A1A', border: 'none', color: '#F5F0E8', padding: '10px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                View Map
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voice tab */}
      {tab === 'voice' && (
        <div style={{ padding: 32, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', marginBottom: 8, margin: '0 0 8px' }}>Voice Settings</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', marginBottom: 24, lineHeight: 1.6, margin: '0 0 24px' }}>
            Elle uses your device's native speech synthesis and recognition. Pair your Bluetooth headset at the OS level — the browser automatically uses whichever audio device is active. No additional configuration needed.
          </p>
          <div style={{ padding: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,26,26,0.15)', marginBottom: 20 }}>
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a', margin: 0 }}>
              Web Speech API · Browser native · Bluetooth: pair at OS level
            </p>
          </div>
          <button
            onClick={() => {
              if (!window.speechSynthesis) return;
              const utt = new SpeechSynthesisUtterance("I'm Elle. Voice is active. Pair your Bluetooth device at the OS level and it will work automatically.");
              window.speechSynthesis.speak(utt);
            }}
            style={{ background: '#8B1A1A', border: 'none', color: '#F5F0E8', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Test Voice
          </button>
        </div>
      )}
    </div>
  );
}
