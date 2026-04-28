import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Caret } from './primitives';

const QUESTION = {
  qNum: 2, qTotal: 3, type: 'Necessary Assumption',
  stimulus: 'Chen: All licensed architects in the city have passed the municipal ethics board. Arun is a licensed architect in the city. Therefore, Arun has passed the municipal ethics board.',
  question: 'Which assumption is necessary for Chen\'s argument?',
  choices: [
    { k: 'A', text: 'All architects in the city are licensed.' },
    { k: 'B', text: 'The municipal ethics board is the only such board.', correct: true },
    { k: 'C', text: 'Arun applied for licensure within the city limits.' },
    { k: 'D', text: 'No unlicensed architect has passed any ethics board.' },
  ],
  scaffolding: 'Negate each choice. Does the argument survive? B negated: "There are other ethics boards." The conclusion that Arun passed this board no longer follows. B is necessary.',
};

export function TutorView() {
  const t = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const correct = selected && QUESTION.choices.find(c => c.k === selected)?.correct;

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <Glass padding={28} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Sparkle size={14} />
          <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tutor · active session</span>
          <Chip tone="neutral" style={{ marginLeft: 'auto' }}>Q {QUESTION.qNum} / {QUESTION.qTotal}</Chip>
          <Chip tone="accent">{QUESTION.type}</Chip>
        </div>

        <div style={{ fontFamily: t.fonts.serif, fontSize: 19, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2, marginBottom: 18,
          padding: 16, borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}` }}>
          {QUESTION.stimulus}
        </div>

        <div style={{ fontSize: 14, color: t.ink, fontWeight: 500, marginBottom: 12 }}>{QUESTION.question}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {QUESTION.choices.map(o => {
            const isSel = selected === o.k;
            const showResult = revealed && isSel;
            const bg = showResult ? (o.correct ? t.success + '1a' : t.danger + '1a') : isSel ? t.accentSoft : t.bgElev;
            const border = showResult ? (o.correct ? t.success : t.danger) : isSel ? t.accent : t.border;
            return (
              <div key={o.k} onClick={() => !revealed && setSelected(o.k)}
                style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${border}`, background: bg, cursor: revealed ? 'default' : 'pointer',
                  transition: 'all .12s' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: isSel ? (revealed ? (o.correct ? t.success : t.danger) : t.accent) : t.surfaceSoft,
                  color: isSel ? '#fff' : t.ink2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: t.fonts.mono, fontSize: 11 }}>{o.k}</div>
                <div style={{ fontSize: 14, color: t.ink, letterSpacing: -0.1, lineHeight: 1.4 }}>{o.text}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {!revealed ? (
            <Btn variant="primary" onClick={() => selected && setRevealed(true)}
              style={{ opacity: selected ? 1 : 0.5 }}>
              Submit
            </Btn>
          ) : (
            <>
              <Chip tone={correct ? 'success' : 'danger'} style={{ fontSize: 13 }}>
                {correct ? '✓ Correct' : '✗ Incorrect'}
              </Chip>
              <Btn variant="ghost" size="sm">Next question →</Btn>
            </>
          )}
        </div>
      </Glass>

      <Glass padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Sparkle size={12} />
          <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · scaffolding</span>
        </div>
        <div className="elle2-stream" style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2 }}>
          <div>Negate each choice. Does the argument survive?</div>
          <div style={{ marginTop: 6, color: t.ink3, fontSize: 14 }}>
            B negated: "There are other ethics boards." The conclusion that Arun passed <span style={{ color: t.accent }}>this</span> board no longer follows. B is necessary.<Caret />
          </div>
        </div>
      </Glass>
    </div>
  );
}
