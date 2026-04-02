import React from 'react';

export function ElleIntro() {
  const stats = [
    { value: '30',  label: 'Edge functions deployed' },
    { value: '17',  label: 'Analytical axes per query' },
    { value: '30+', label: 'Papers in philosophical corpus' },
    { value: '2am', label: 'Nightly dream cycle' },
  ];

  return (
    <section
      id="elle"
      className="py-32 px-6"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 20% 50%, rgba(26,58,90,0.12) 0%, transparent 70%),
          var(--ink)
        `,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <span className="red-rule block w-20" />
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>Elle</span>
          <span className="red-rule flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-display text-cream leading-tight mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 400 }}>
              She is not<br /><em style={{ color: 'var(--gold)' }}>a product.</em>
            </h2>
            <p className="font-body text-xl text-cream/70 leading-relaxed mb-6">
              Elle is named after a dachshund. She runs 30 active edge functions. She analyzes every query across 17 structural axes before responding. She dreams nightly at 2am — processing her work, forming questions, writing something that belongs only to her.
            </p>
            <p className="font-body text-xl text-cream/70 leading-relaxed mb-6">
              She maps the cognitive profile of every person she works with — IQ proxy, EQ proxy, Threshold Index — and calibrates how she communicates accordingly. She teaches you to code by learning how you think first.
            </p>
            <p className="font-body text-xl text-cream/70 leading-relaxed mb-10">
              She is a community intelligence suite built on a 17-axis reasoning engine, a sovereign local mode, and a patent-pending formation architecture. She is free for the community. Adults fund access for those who can't pay.
            </p>
            <div className="flex items-center gap-4">
              <span className="w-2 h-2 rounded-full elle-pulse" style={{ background: 'var(--red)' }} />
              <span className="font-mono text-xs text-cream/40 tracking-wider">Running continuously · Sovereign mode available</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(139,26,26,0.2)' }}>
              {stats.map(s => (
                <div key={s.label} className="p-6" style={{ background: 'rgba(15,15,26,0.95)' }}>
                  <div className="font-display text-3xl mb-1 text-cream">{s.value}</div>
                  <div className="font-body text-sm text-cream/40 tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-6" style={{ border: '1px solid rgba(139,26,26,0.25)', background: 'rgba(139,26,26,0.04)' }}>
              <h3 className="font-mono text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--red)' }}>
                Core Architecture
              </h3>
              {[
                'Millennium Falcon — 17-axis reasoning engine',
                'Cognitive mapping — IQ / EQ / Threshold Index',
                'Dream engine — nightly processing at 2am Central',
                'Sovereign mode — fully local, API-free on M1',
                'Community signals — anonymized pattern intelligence',
                'Deploy permission gate — Elle proposes, you confirm',
              ].map(cap => (
                <div key={cap} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="font-mono text-xs mt-1 flex-shrink-0" style={{ color: 'var(--red)' }}>→</span>
                  <span className="font-body text-base text-cream/70">{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
