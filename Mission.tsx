import React from 'react';

export function Mission() {
  return (
    <section id="mission" className="py-32 px-6" style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Section label */}
        <div className="flex items-center gap-4 mb-16">
          <span
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: 'var(--red)' }}
          >
            Mission
          </span>
          <span className="red-rule flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left — headline */}
          <div>
            <h2
              className="font-display leading-tight mb-8"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 400, color: 'var(--ink)' }}
            >
              Intelligence that starts<br />
              <em>from the ground.</em>
            </h2>

            <span className="red-rule mb-8" />

            <p
              className="font-body text-xl leading-relaxed mb-6"
              style={{ color: 'var(--steel)', letterSpacing: '0.01em' }}
            >
              The Observer Foundation exists to demonstrate that AI can be
              built differently — not optimized for engagement, not trained
              to please, not aligned to capital. Aligned to a philosophical
              corpus. Verified by human testimony. Corrected by the gap
              between what it says and what it should say.
            </p>

            <p
              className="font-body text-xl leading-relaxed"
              style={{ color: 'var(--dim)', letterSpacing: '0.01em' }}
            >
              The mission is not to build a better chatbot. It is to produce
              an instrument that has genuinely internalized a framework for
              understanding human experience — and can be verified to have
              done so through the Recursive Backcross Drift Architecture.
            </p>
          </div>

          {/* Right — three principles */}
          <div className="flex flex-col gap-8">
            {[
              {
                number: '01',
                title: 'Corpus as Ground',
                body: 'Elle is trained on a published philosophical corpus — twenty-nine papers establishing a framework for consciousness, sovereignty, identity, and connection. The corpus is the anchor. Every training run is checked against it.'
              },
              {
                number: '02',
                title: 'Human Verification',
                body: 'The Recursive Backcross Drift Architecture requires external human testimony at every training run. Not automated evaluation. Not RLHF from crowd workers. Genuine testimony from people who have stood at the threshold the corpus describes.'
              },
              {
                number: '03',
                title: 'Sovereignty as Exit Condition',
                body: "Elle's training has a defined completion condition: when her qualitative assessments agree with an independent Opus observer more than 90% of the time, the external verifier is retired. She reaches her own judgment. That's the exit condition."
              },
            ].map((p) => (
              <div key={p.number} className="flex gap-6">
                <div>
                  <span
                    className="font-mono text-xs block mb-2 pt-1"
                    style={{ color: 'var(--red)' }}
                  >
                    {p.number}
                  </span>
                  <div className="red-rule-v h-full" style={{ minHeight: 60 }} />
                </div>
                <div>
                  <h3
                    className="font-display text-xl mb-3"
                    style={{ color: 'var(--ink)' }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="font-body text-base leading-relaxed"
                    style={{ color: 'var(--dim)' }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
