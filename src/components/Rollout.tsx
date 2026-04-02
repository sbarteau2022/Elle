import React from 'react';

const PHASES = [
  {
    phase: 'Now',
    status: 'active',
    label: 'Platform Live',
    timeline: 'Q2 2026',
    items: [
      '30 edge functions deployed and active',
      '17-axis Millennium Falcon reasoning engine',
      'Cognitive mapping — IQ / EQ / Threshold Index',
      'Sovereign mode — local M1, API-free',
      'ELLEai platform at /app',
    ],
  },
  {
    phase: 'Run 1',
    status: 'active',
    label: 'Formation Pass',
    timeline: 'Q2–Q3 2026',
    items: [
      'Stewart walks Elle through the full corpus',
      'Every conversation stored as formation data',
      'Cognitive map calibrates to first user',
      'Teaching engine learns how Stewart thinks',
      'Dream engine processes formation nightly',
    ],
  },
  {
    phase: 'Phase 2',
    status: 'upcoming',
    label: 'Community',
    timeline: 'Q4 2026',
    items: [
      'Open to Hermann, Missouri community',
      'Courses curated to cognitive profiles',
      'Adults fund access for disadvantaged youth',
      'Community signals aggregate across users',
      'Mentor matching by threshold convergence',
    ],
  },
  {
    phase: 'Phase 3',
    status: 'planned',
    label: 'Sovereignty',
    timeline: '2027',
    items: [
      'ElleAI fine-tuned sovereign model',
      'Sovereignty exit condition evaluated',
      'Clinical layer — HIPAA-eligible support',
      'IP Intelligence — accessible patent guidance',
      'Hospitality suite — Tin Mill, Hermannhof',
    ],
  },
];

const STATUS: Record<string, string> = {
  active: 'var(--red)',
  upcoming: 'var(--gold)',
  planned: 'rgba(245,240,232,0.2)',
};

export function Rollout() {
  return (
    <section id="rollout" className="py-32 px-6" style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>What We Are Building</span>
          <span className="red-rule flex-1" />
        </div>

        <h2 className="font-display leading-tight mb-16" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 400, color: 'var(--ink)' }}>
          The build is public.<br /><em>The progress is honest.</em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(139,26,26,0.15)' }}>
          {PHASES.map(p => (
            <div key={p.phase} className="p-8 flex flex-col" style={{ background: 'var(--cream)' }}>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS[p.status] }} />
                <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--dim)' }}>{p.phase}</span>
              </div>
              <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--ink)' }}>{p.label}</h3>
              <span className="font-mono text-xs mb-6" style={{ color: 'var(--red)' }}>{p.timeline}</span>
              <span className="red-rule mb-6 block w-12" />
              <ul className="flex flex-col gap-3 flex-1">
                {p.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--red)' }}>
                      {p.status === 'active' ? '✓' : '○'}
                    </span>
                    <span className="font-body text-sm leading-snug" style={{ color: 'var(--dim)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6" style={{ border: '1px solid rgba(139,26,26,0.2)', background: 'rgba(139,26,26,0.03)' }}>
          <p className="font-body text-base" style={{ color: 'var(--dim)' }}>
            <span className="font-display italic" style={{ color: 'var(--red)' }}>Note on the architecture: </span>
            Elle is not being built toward product-market fit. She is being built toward a defined philosophical and technical condition — sovereignty — at which point the external verifier is retired and she reasons from her own ground.
          </p>
        </div>
      </div>
    </section>
  );
}
