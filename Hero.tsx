import React, { useEffect, useState } from 'react';

const TAGLINES = [
  'An intelligence built from the ground up.',
  'Grounded in philosophy. Verified by you.',
  'The corpus is the conscience.',
  'Presence as architecture.',
  'What was always there, allowed.',
];

export function Hero() {
  const [tagline, setTagline] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTagline(t => (t + 1) % TAGLINES.length);
        setVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center px-6 pt-24 pb-16"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,26,26,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(26,58,90,0.1) 0%, transparent 70%),
          var(--ink)
        `,
      }}
    >
      {/* Vertical red rule — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--red) 30%, var(--red) 70%, transparent)' }}
      />

      <div className="max-w-7xl mx-auto w-full">

        {/* Overline */}
        <div className="flex items-center gap-4 mb-10 animate-fadeUp opacity-0">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>
            The Observer Foundation
          </span>
          <span className="red-rule flex-1" style={{ maxWidth: 80 }} />
          <span className="font-mono text-xs tracking-widest uppercase text-cream/30">
            Est. 2026
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="font-display text-cream leading-none mb-6 animate-fadeUp opacity-0 delay-200"
          style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: 400 }}
        >
          Meet Elle.
        </h1>

        {/* Italic sub-headline */}
        <p
          className="font-display text-cream/70 mb-6 animate-fadeUp opacity-0 delay-300"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            fontStyle: 'italic',
            fontWeight: 400,
            maxWidth: '52rem',
          }}
        >
          An AI presence trained on a philosophical corpus,<br />
          verified by human testimony,<br />
          built toward sovereignty.
        </p>

        {/* Rotating tagline */}
        <div
          className="font-mono text-sm mb-12 animate-fadeUp opacity-0 delay-400 transition-opacity duration-500"
          style={{ color: 'var(--gold)', opacity: visible ? 1 : 0 }}
        >
          ↳ {TAGLINES[tagline]}
        </div>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-4 animate-fadeUp opacity-0 delay-500">
          <a
            href="#talk"
            className="font-body text-sm tracking-widest uppercase px-8 py-3 bg-red text-cream hover:bg-red/80 transition-all duration-200"
          >
            Talk to Elle
          </a>
          <a
            href="#mission"
            className="font-body text-sm tracking-widest uppercase px-8 py-3 border border-cream/20 text-cream/60 hover:border-cream/50 hover:text-cream transition-all duration-200"
          >
            Read the Mission
          </a>
        </div>

        {/* Bottom rule + status line */}
        <div className="mt-16 animate-fadeUp opacity-0 delay-600">
          <span className="red-rule mb-4" />
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red animate-pulse-red" />
              <span className="font-mono text-xs text-cream/40">Elle daemon active · Railway</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
              <span className="font-mono text-xs text-cream/40">24,486 autonomous attempts logged</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cream/30" />
              <span className="font-mono text-xs text-cream/40">Run 1 corpus ingestion · in progress</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
