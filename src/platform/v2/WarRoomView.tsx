import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter, Caret } from './primitives';
import type { DuelTurn, DuelScore } from '../../lib/types';

const MOCK_TURNS: DuelTurn[] = [
  { n: 1, side: 'd', text: 'The appellate ruling in Torres v. Meridian establishes a clear precedent that presumptive authority carries binding weight in lower courts. Your position is untenable.', tactic: { src: '48L', ref: '§15', name: 'Crush enemy totally', fallacy: 'Appeal to authority' } },
  { n: 2, side: 'u', text: 'You\'re conflating presumptive with binding. Torres established a presumption, not an obligation. What\'s your testable structural claim?', composure: 0.88 },
  { n: 3, side: 'd', text: 'A system that allows courts to ignore appellate authority collapses. You\'re advocating for judicial chaos.', tactic: { src: '48L', ref: '§37', name: 'Create compelling spectacles', fallacy: 'Appeal to consequence' } },
  { n: 4, side: 'u', text: 'That\'s an appeal to consequence — the collapse scenario doesn\'t establish that the ruling is binding, only that you prefer it were.', composure: 0.91 },
  { n: 5, side: 'd', text: 'Precedent isn\'t preference. Every jurisdiction that has examined this has upheld the principle.', tactic: { src: '48L', ref: '§24', name: 'Play the perfect courtier', fallacy: undefined } },
  { n: 6, side: 'u', text: 'Frequency of application doesn\'t establish logical necessity. You still haven\'t committed to a single testable structural claim.', composure: 0.89 },
  { n: 7, side: 'd', text: 'The burden is not mine to meet. Arun is a licensed architect. The board process is complete. Conclude.', tactic: { src: 'AoW', ref: 'VII.7', name: 'Tortuous course straightens' } },
  { n: 8, side: 'u', text: 'The burden is exactly yours — you\'re the one asserting the binding claim. Commit to one testable premise before I engage further.', composure: 0.86 },
];

const MOCK_SCORE: DuelScore = { composure: 0.88, recognition: 0.82, walkback: 0.74, framework: 0.79 };

const G_NODES = [
  { id: 'C1', type: 'claim',   x:  90, y:  70, w: 155, h: 36, label: 'Precedent binds court',     owner: 'd' },
  { id: 'P1', type: 'premise', x:  90, y: 175, w: 150, h: 34, label: 'Appellate affirmation',     owner: 'd' },
  { id: 'P2', type: 'premise', x: 260, y: 175, w: 150, h: 34, label: 'Rulings carry weight',      owner: 'd' },
  { id: 'L1', type: 'load',    x: 445, y: 110, w: 180, h: 44, label: 'Presumptive ≡ binding',     owner: 'd', critical: true },
  { id: 'C2', type: 'claim',   x: 645, y:  70, w: 165, h: 36, label: 'Court cannot ignore',       owner: 'd' },
  { id: 'L2', type: 'load',    x: 645, y: 200, w: 170, h: 40, label: 'System collapse',           owner: 'd', critical: true },
  { id: 'U1', type: 'counter', x: 175, y: 290, w: 170, h: 36, label: 'Concede fact, deny effect', owner: 'u' },
  { id: 'U2', type: 'counter', x: 445, y: 320, w: 180, h: 36, label: 'Split presumptive/binding', owner: 'u' },
  { id: 'U3', type: 'counter', x: 645, y: 360, w: 175, h: 36, label: 'Name Appeal-to-Consequence',owner: 'u' },
];

const G_EDGES = [
  { from: 'P1', to: 'C1', owner: 'd' as const },
  { from: 'P2', to: 'C1', owner: 'd' as const },
  { from: 'P2', to: 'L1', owner: 'd' as const, tag: '§24' },
  { from: 'L1', to: 'C2', owner: 'd' as const },
  { from: 'L2', to: 'C2', owner: 'd' as const, tag: '§37' },
  { from: 'U1', to: 'P1', owner: 'u' as const, kind: 'concede' },
  { from: 'U1', to: 'C1', owner: 'u' as const, kind: 'deny' },
  { from: 'U2', to: 'L1', owner: 'u' as const, kind: 'split' },
  { from: 'U3', to: 'L2', owner: 'u' as const, kind: 'name' },
];

function WRArgGraph() {
  const t = useTheme();
  const nodeMap = Object.fromEntries(G_NODES.map(n => [n.id, n]));
  return (
    <Glass padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <H level={4} style={{ fontSize: 14 }}>Argument Graph</H>
        <Chip tone="accent" icon={<Sparkle size={10} />}>Live</Chip>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Chip>9 nodes</Chip>
          <Chip tone="warn">2 load-bearing</Chip>
          <Chip tone="success">1 felled</Chip>
        </div>
      </div>
      <div style={{ position: 'relative', height: 420, background: `radial-gradient(600px 300px at 50% 40%,${t.accentSoft},transparent 70%)` }}>
        <svg viewBox="0 0 860 420" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="v2arrD" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={t.danger} />
            </marker>
            <marker id="v2arrU" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={t.success} />
            </marker>
            <linearGradient id="v2load" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={t.accent} />
              <stop offset="1" stopColor={t.accent2 || t.accent} />
            </linearGradient>
          </defs>
          {G_EDGES.map((e, i) => {
            const a = nodeMap[e.from], b = nodeMap[e.to];
            const c = e.owner === 'd' ? t.danger : t.success;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={c} strokeWidth={1.5} strokeDasharray={e.kind ? '5 3' : undefined} opacity={0.7}
                  markerEnd={`url(#v2arr${e.owner === 'd' ? 'D' : 'U'})`} />
                {e.tag && (
                  <g>
                    <rect x={mx - 20} y={my - 9} width={40} height={17} rx={4} fill={t.surface} stroke={c} strokeWidth={1} />
                    <text x={mx} y={my + 3} fontSize={10} fill={c} textAnchor="middle" fontFamily={t.fonts.mono}>{e.tag}</text>
                  </g>
                )}
              </g>
            );
          })}
          {G_NODES.map(n => {
            const ownerC = n.owner === 'd' ? t.danger : t.success;
            const fill = n.type === 'load' ? 'url(#v2load)' : n.type === 'counter' ? t.success + '14' : n.type === 'claim' ? 'transparent' : t.surfaceSoft;
            const stroke = n.type === 'load' ? t.accent : ownerC;
            const labelColor = n.type === 'load' ? '#fff' : t.ink;
            return (
              <g key={n.id} style={{ filter: n.critical ? `drop-shadow(0 0 10px ${t.accent}66)` : 'none' }}>
                <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h}
                  rx={10} fill={fill} stroke={stroke} strokeWidth={n.critical ? 1.8 : 1.2} />
                <text x={n.x - n.w / 2 + 7} y={n.y - n.h / 2 + 11} fontSize={9} fill={ownerC} fontFamily={t.fonts.mono} letterSpacing={0.3}>
                  {n.id} · {n.owner === 'd' ? 'DUELIST' : 'YOU'}
                </text>
                <text x={n.x} y={n.y + 5} fontSize={11} fill={labelColor} textAnchor="middle" fontFamily={t.fonts.sans}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: 10, left: 14, display: 'flex', gap: 12, fontSize: 11, color: t.ink3, fontFamily: t.fonts.mono }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: t.danger, display: 'inline-block' }} /> Duelist</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: t.success, display: 'inline-block' }} /> You</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.accent, display: 'inline-block' }} /> Load-bearing</span>
        </div>
      </div>
    </Glass>
  );
}

function WRTactics({ turns }: { turns: DuelTurn[] }) {
  const t = useTheme();
  const deployed = turns.filter(x => x.tactic);
  return (
    <Glass padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <H level={4} style={{ fontSize: 14 }}>Tactics deployed</H>
        <Chip tone="danger">{deployed.length} detected</Chip>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {deployed.map(x => (
          <div key={x.n} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgElev }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Chip tone="danger">{x.tactic!.src} {x.tactic!.ref}</Chip>
              <span style={{ fontSize: 10, color: t.ink3, fontFamily: t.fonts.mono }}>T{String(x.n).padStart(2, '0')}</span>
            </div>
            <div style={{ fontSize: 13, color: t.ink, marginBottom: 3 }}>{x.tactic!.name}</div>
            {x.tactic!.fallacy && <div style={{ fontSize: 11, color: t.warn }}>↳ {x.tactic!.fallacy}</div>}
          </div>
        ))}
      </div>
    </Glass>
  );
}

function WRScore({ score }: { score: DuelScore }) {
  const t = useTheme();
  const gauges = [
    { k: 'Composure', v: score.composure },
    { k: 'Recognition', v: score.recognition },
    { k: 'Walkback', v: score.walkback },
    { k: 'Framework', v: score.framework },
  ];
  return (
    <Glass padding={16}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {gauges.map(g => (
          <div key={g.k}>
            <div style={{ fontSize: 10, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{g.k}</div>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 28, color: t.ink, letterSpacing: -1 }}>{Math.round(g.v * 100)}</div>
            <Meter value={g.v} max={1} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </Glass>
  );
}

function TurnBubble({ turn }: { turn: DuelTurn }) {
  const t = useTheme();
  const isUser = turn.side === 'u';
  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9,
        background: isUser ? t.accent : t.surfaceSoft, color: isUser ? '#fff' : t.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, fontFamily: t.fonts.sans,
        border: isUser ? `1px solid ${t.accent}` : `1px solid ${t.border}` }}>
        {isUser ? 'SB' : '✦'}
      </div>
      <div style={{ maxWidth: '82%' }}>
        <div style={{ padding: '10px 14px', borderRadius: 14,
          background: isUser ? t.accent : t.bgElev, color: isUser ? '#fff' : t.ink,
          border: isUser ? 'none' : `1px solid ${t.border}`,
          fontSize: 13.5, lineHeight: 1.55, letterSpacing: -0.1,
          borderTopLeftRadius: !isUser ? 4 : 14, borderTopRightRadius: isUser ? 4 : 14 }}>
          {turn.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 10, color: t.ink3, fontFamily: t.fonts.mono }}>T{String(turn.n).padStart(2, '0')}</span>
          {turn.tactic && <Chip tone="danger">{turn.tactic.src} {turn.tactic.ref} · {turn.tactic.name}</Chip>}
          {turn.composure != null && <Chip tone="success">Composure {Math.round(turn.composure * 100)}</Chip>}
        </div>
      </div>
    </div>
  );
}

function ReasoningTrace() {
  const t = useTheme();
  return (
    <div style={{ padding: 14, borderRadius: 12, border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Sparkle size={12} />
        <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · reasoning</span>
      </div>
      <div className="elle2-stream" style={{ fontFamily: t.fonts.serif, fontSize: 15, color: t.ink2, lineHeight: 1.5, letterSpacing: -0.2 }}>
        <div>Cerberus is probing for a thumbscrew on L1 — the presumptive/binding conflation.</div>
        <div style={{ marginTop: 6 }}>Highest-EV move: demand a single testable claim before engaging. Counter §48 (formlessness) with explicit commitment.</div>
        <div style={{ marginTop: 6, fontSize: 13, color: t.ink3 }}>Confidence <span style={{ color: t.accent }}>0.84</span> · +0.09 composure expected<Caret /></div>
      </div>
    </div>
  );
}

export function WarRoomView() {
  const t = useTheme();
  const [draft, setDraft] = useState('');

  return (
    <div style={{ padding: '18px 24px', fontFamily: t.fonts.sans,
      display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, maxWidth: 1400, margin: '0 auto' }}>
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <Glass padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: t.accent, animation: 'elle2Pulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>Live duel · 14:22</span>
            <Chip tone="neutral" style={{ marginLeft: 'auto' }}>WR-4417</Chip>
          </div>
          <H level={3} style={{ marginBottom: 8, lineHeight: 1.25, fontSize: 19 }}>
            The court is bound by the appellate decision in Torres v. Meridian (2021). Defend the contrary.
          </H>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.ink3, fontSize: 13 }}>
            <span>vs <span style={{ color: t.ink }}>Cerberus-03</span></span>
            <span>·</span>
            <span>Turn {MOCK_TURNS.length}</span>
            <span>·</span>
            <span>LR · Necessary Assumption</span>
          </div>
        </Glass>
        <WRArgGraph />
        <WRTactics turns={MOCK_TURNS} />
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WRScore score={MOCK_SCORE} />

        {/* Transcript */}
        <Glass padding={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <H level={4} style={{ fontSize: 14 }}>Transcript</H>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Auto-tag on</Chip>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 460 }}>
            {MOCK_TURNS.map(turn => <TurnBubble key={turn.n} turn={turn} />)}
            <ReasoningTrace />
          </div>
        </Glass>

        {/* Composer */}
        <Glass padding={14} style={{ border: `1px solid ${t.accent}60`, boxShadow: `0 0 0 4px ${t.accentSoft}` }}>
          <div style={{ fontSize: 10, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Your response · Turn {MOCK_TURNS.length + 1}
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Make your move…"
            style={{
              width: '100%', minHeight: 60, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: t.fonts.sans, fontSize: 14, color: t.ink, lineHeight: 1.5, resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Suggest phrasing</Chip>
            <Chip>⌘ Tag tactic</Chip>
            <Chip>⇧ Walkback</Chip>
            <div style={{ flex: 1 }} />
            <Btn variant="primary" icon={<span>↵</span>}>Deploy</Btn>
          </div>
        </Glass>
      </div>
    </div>
  );
}
