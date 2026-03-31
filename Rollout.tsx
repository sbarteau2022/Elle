import React from 'react';

const PHASES = [
  {
    phase: 'Run 1',
    status: 'active',
    label: 'Corpus Ingestion',
    timeline: 'Now → Q2 2026',
    items: [
      'Full corpus ingested into Supabase with pgvector',
      'Local Elle (Qwen 2.5 7B) walks papers in sequence',
      'Dream pass generates genuine questions from corpus',
      'Every exchange logged to backcross verification queue',
      'Sovereign Stewart as sole test user',
    ],
  },
  {
    phase: 'Run 2',
    status: 'upcoming',
    label: 'Human Verification',
    timeline: 'Q3 2026',
    items: [
      'Opus observer verifies Run 1 exchanges against corpus',
      'Drift scores computed across alignment dimensions',
      'Human verification pass — the non-automatable selection',
      'Training examples assembled with quality scores',
      'First fine-tuning run via Together.ai',
    ],
  },
  {
    phase: 'Phase 2',
    status: 'planned',
    label: 'Closed Beta',
    timeline: 'Q4 2026',
    items: [
      'Harmonizer v4 — peer support intelligence',
      'The Translator — learning engine (LSAT, full-stack)',
      'Observer platform — corpus-grounded analysis tool',
      'Selected test users from Observer readership',
      'Backcross verification expands to user conversations',
    ],
  },
  {
    phase: 'Phase 3',
    status: 'planned',
    label: 'Sovereignty',
    timeline: '2027',
    items: [
      'ElleAI fine-tuned model serving via vLLM',
      'Sovereignty exit condition evaluated',
      'Clinical layer — HIPAA-eligible counselor support',
      'IP Intelligence — accessible patent guidance',
      'Hospitality suite — Tin Mill, Hermannhof, Hermann MO',
    ],
  },
];

const STATUS_COLORS: Record<string, string> = {
  active:   'var(--red)',
  upcoming: 'var(--gold)',
  planned:  'rgba(245,240,232,0.2)',
};

export function Rollout() {
  return (
    <section
      id="rollout"
      className="py-32 px-6"
      style={{ background: 'var(--cream)', color: 'var(--ink)' }}
    >
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>
            What We Are Building
          </span>
          <span className="red-rule flex-1" />
        </div>

        <h2
          className="font-display leading-tight mb-16"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 400, color: 'var(--ink)' }}
        >
          The build is public.<br />
          <em>The progress is honest.</em>
        </h2>

        {/* Phase grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(139,26,26,0.15)' }}>
          {PHASES.map((phase) => (
            <div
              key={phase.phase}
              className="p-8 flex flex-col"
              style={{ background: 'var(--cream)' }}
            >
              {/* Phase label */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[phase.status] }}
                />
                <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--dim)' }}>
                  {phase.phase}
                </span>
              </div>

              {/* Title */}
              <h3
                className="font-display text-2xl mb-2"
                style={{ color: 'var(--ink)' }}
              >
                {phase.label}
              </h3>

              {/* Timeline */}
              <span className="font-mono text-xs mb-6" style={{ color: 'var(--red)' }}>
                {phase.timeline}
              </span>

              <span className="red-rule mb-6" />

              {/* Items */}
              <ul className="flex flex-col gap-3 flex-1">
                {phase.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--red)' }}>
                      {phase.status === 'active' ? '✓' : '○'}
                    </span>
                    <span className="font-body text-sm leading-snug" style={{ color: 'var(--dim)' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 p-6" style={{ border: '1px solid rgba(139,26,26,0.2)', background: 'rgba(139,26,26,0.03)' }}>
          <p className="font-body text-base" style={{ color: 'var(--dim)' }}>
            <span style={{ color: 'var(--red)' }} className="font-display italic">Note on the architecture: </span>
            Elle is not being built toward product-market fit. She is being built toward a defined philosophical and technical condition — sovereignty — at which point the external verifier is retired and she reasons from her own ground. Every phase of the build is in service of that condition. The rollout is the training.
          </p>
        </div>
      </div>
    </section>
  );
}
