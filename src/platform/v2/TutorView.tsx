import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { useFace } from './FaceContext';
import { Glass, Chip, H, Sparkle, Btn, Caret } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User } from '../../lib/types';

interface Choice { k: string; text: string; correct?: boolean }
interface Question {
  question_id: string;
  session_id: string;
  question_type: string;
  axis: string;
  difficulty: number;
  stimulus: string;
  question: string;
  choices: Choice[];
  scaffolding: string;
}
interface Evaluation {
  correct: boolean;
  correct_key: string;
  explanation: string;
  scaffolding: string;
  axis_delta: number;
}

interface Props {
  user: User;
  token: string;
}

export function TutorView({ user, token }: Props) {
  const t = useTheme();
  const face = useFace();

  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(1);
  const [sessionStats, setSessionStats] = useState({ answered: 0, correct: 0 });

  const fetchNext = useCallback(async (sessionId?: string) => {
    setLoading(true);
    setSelected(null);
    setEvaluation(null);
    setError(null);
    try {
      const data = await callEdge('elle-tutor', {
        action: 'next_question',
        user_id: user.id,
        axis: face.questionAxis ?? undefined,
        session_id: sessionId,
      }, token);
      if (data.error) {
        setError(String(data.error));
      } else {
        setQuestion(data as unknown as Question);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [user.id, token, face.questionAxis]);

  useEffect(() => { fetchNext(); }, [fetchNext]);

  const submit = async () => {
    if (!question || !selected || evaluation) return;
    setLoading(true);
    try {
      const data = await callEdge('elle-tutor', {
        action: 'evaluate_answer',
        user_id: user.id,
        question_id: question.question_id,
        selected_key: selected,
        session_id: question.session_id,
      }, token);
      const ev = data as unknown as Evaluation;
      setEvaluation(ev);
      setSessionStats(s => ({ answered: s.answered + 1, correct: s.correct + (ev.correct ? 1 : 0) }));
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setQIndex(i => i + 1);
    fetchNext(question?.session_id);
  };

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <Glass padding={28} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Sparkle size={14} />
          <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tutor · active session</span>
          <Chip tone="neutral" style={{ marginLeft: 'auto' }}>Q {qIndex}</Chip>
          <Chip>{sessionStats.correct}/{sessionStats.answered} correct</Chip>
          {question && <Chip tone="accent">{question.question_type}</Chip>}
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 10, background: t.danger + '15', border: `1px solid ${t.danger}40`, color: t.danger, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {loading && !question && (
          <div style={{ padding: 28, textAlign: 'center', color: t.ink3, fontSize: 13, fontStyle: 'italic' }}>
            Loading next question…
          </div>
        )}

        {question && (
          <>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 19, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2, marginBottom: 18,
              padding: 16, borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}` }}>
              {question.stimulus}
            </div>

            <div style={{ fontSize: 14, color: t.ink, fontWeight: 500, marginBottom: 12 }}>{question.question}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {question.choices.map(o => {
                const isSel = selected === o.k;
                const showResult = !!evaluation && (isSel || o.k === evaluation.correct_key);
                const isCorrect = evaluation && o.k === evaluation.correct_key;
                const isWrong = evaluation && isSel && !evaluation.correct;
                const bg = showResult
                  ? (isCorrect ? t.success + '1a' : isWrong ? t.danger + '1a' : t.bgElev)
                  : isSel ? t.accentSoft : t.bgElev;
                const border = showResult
                  ? (isCorrect ? t.success : isWrong ? t.danger : t.border)
                  : isSel ? t.accent : t.border;
                return (
                  <div key={o.k} onClick={() => !evaluation && setSelected(o.k)}
                    style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${border}`, background: bg, cursor: evaluation ? 'default' : 'pointer',
                      transition: 'all .12s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: isCorrect ? t.success : isWrong ? t.danger : isSel ? t.accent : t.surfaceSoft,
                      color: (isCorrect || isWrong || isSel) ? '#fff' : t.ink2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: t.fonts.mono, fontSize: 11 }}>{o.k}</div>
                    <div style={{ fontSize: 14, color: t.ink, letterSpacing: -0.1, lineHeight: 1.4 }}>{o.text}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {!evaluation ? (
                <Btn variant="primary" onClick={submit}
                  style={{ opacity: selected && !loading ? 1 : 0.5 }}>
                  {loading ? 'Evaluating…' : 'Submit'}
                </Btn>
              ) : (
                <>
                  <Chip tone={evaluation.correct ? 'success' : 'danger'} style={{ fontSize: 13 }}>
                    {evaluation.correct ? '✓ Correct' : '✗ Incorrect'}
                  </Chip>
                  <Chip tone={evaluation.axis_delta >= 0 ? 'success' : 'danger'}>
                    Axis Δ {evaluation.axis_delta >= 0 ? '+' : ''}{evaluation.axis_delta}
                  </Chip>
                  <div style={{ flex: 1 }} />
                  <Btn variant="ghost" size="sm" onClick={next}>Next question →</Btn>
                </>
              )}
            </div>
          </>
        )}
      </Glass>

      {(evaluation || (question?.scaffolding)) && (
        <Glass padding={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Sparkle size={12} />
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · scaffolding</span>
          </div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2 }}>
            {evaluation?.explanation || question?.scaffolding}
            {evaluation && <Caret />}
          </div>
        </Glass>
      )}
    </div>
  );
}
