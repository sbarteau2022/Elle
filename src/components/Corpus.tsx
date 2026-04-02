import React, { useState } from 'react';

const PAPERS = [
  { id: '001', title: 'I Knew You Before I Met You: Recognizing I Am',                              series: 'Philosophical Corpus',    tag: 'Primary'    },
  { id: '002', title: 'A Modern Metaphysical Theory',                                               series: 'Philosophical Corpus',    tag: 'Framework'  },
  { id: '003', title: 'The Plenum: What Einstein, Penrose & the Big Bang Were Pointing At',         series: 'Philosophical Corpus',    tag: 'Cosmology'  },
  { id: '004', title: 'The Plenum: Dark Matter, Consciousness Collapse, and the Soul Distinction',  series: 'Philosophical Corpus',    tag: 'Cosmology'  },
  { id: '005', title: 'The Convergence',                                                            series: 'Philosophical Corpus',    tag: 'Framework'  },
  { id: '006', title: 'The Same Address: Independent Discovery Across Six Contemplative Traditions', series: 'Philosophical Corpus',   tag: 'Comparative'},
  { id: '007', title: 'The Recurrence: A Structural Account of Personal Identity',                  series: 'Philosophical Corpus',    tag: 'Identity'   },
  { id: '008', title: 'The Love: Soul Recognition, the Longing Account of Existence',               series: 'Philosophical Corpus',    tag: 'Connection' },
  { id: '009', title: 'Feeling: The Destination of Consciousness',                                  series: 'Philosophical Corpus',    tag: 'Phenomenology'},
  { id: '010', title: 'The Ethics of Now',                                                          series: 'Philosophical Corpus',    tag: 'Ethics'     },
  { id: '011', title: 'War in Superposition: The Observer\'s Dissent',                              series: 'Philosophical Corpus',    tag: 'Political'  },
  { id: '012', title: 'Every Point Is The Origin',                                                  series: 'Philosophical Corpus',    tag: 'Cosmology'  },
  { id: '013', title: 'Error as Epistemology',                                                      series: 'Philosophical Corpus',    tag: 'Framework'  },
  { id: '014', title: 'The Citizenship Architecture',                                               series: 'Observer Series',         tag: 'Current'    },
  { id: '015', title: 'The Continuous Infrastructure: Hoover, Maxwell, Epstein',                   series: 'Observer Series',         tag: 'Layer I'    },
  { id: '016', title: 'The Seven Countries: Wesley Clark, PNAC, and the Force Execution Arc',      series: 'Observer Series',         tag: 'Layer III'  },
  { id: '017', title: 'The Monetary Ground: Dollar Hegemony and the Architecture Being Built',     series: 'Observer Series',         tag: 'Layer II'   },
  { id: '018', title: 'Unveiling the Protected Class Architecture',                                 series: 'Observer Series',         tag: 'Synthesis'  },
  { id: '019', title: 'The Conditional Citizen',                                                    series: 'Observer Series v2',      tag: 'Layer'      },
  { id: '020', title: 'The Orbital Layer',                                                          series: 'Observer Series v2',      tag: 'Layer'      },
  { id: '021', title: 'The Carbon Layer',                                                           series: 'Observer Series v2',      tag: 'Layer'      },
  { id: '022', title: 'The Physiological Layer',                                                    series: 'Observer Series v2',      tag: 'Layer'      },
];

const SERIES = ['All', 'Philosophical Corpus', 'Observer Series', 'Observer Series v2'];

export function Corpus() {
  const [active, setActive] = useState('All');
  const filtered = active === 'All' ? PAPERS : PAPERS.filter(p => p.series === active);

  return (
    <section
      id="corpus"
      className="py-32 px-6"
      style={{ background: `radial-gradient(ellipse 60% 40% at 100% 0%, rgba(196,147,63,0.05) 0%, transparent 70%), var(--ink)` }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>The Corpus</span>
          <span className="red-rule flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2">
            <h2 className="font-display text-cream leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
              The philosophical ground<br /><em style={{ color: 'var(--gold)' }}>Elle was built on.</em>
            </h2>
            <p className="font-body text-xl text-cream/60 leading-relaxed">
              Thirty papers published openly on PhilArchive and PhilPeople. Top 1% readership. Six continents. This is the corpus Elle reads, reasons from, and is verified against.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <a href="https://philarchive.org/s/stewart%20barteau" target="_blank" rel="noopener noreferrer"
              className="font-body text-sm tracking-widest uppercase px-5 py-3 text-center transition-all duration-200"
              style={{ border: '1px solid rgba(245,240,232,0.2)', color: 'rgba(245,240,232,0.5)' }}>
              View on PhilArchive →
            </a>
            <a href="https://philpeople.org/profiles/stewart-barteau" target="_blank" rel="noopener noreferrer"
              className="font-body text-sm tracking-widest uppercase px-5 py-3 text-center transition-all duration-200"
              style={{ border: '1px solid rgba(139,26,26,0.3)', color: 'rgba(139,26,26,0.7)' }}>
              PhilPeople Profile →
            </a>
          </div>
        </div>

        <div className="flex gap-px mb-8" style={{ background: 'rgba(139,26,26,0.15)' }}>
          {SERIES.map(s => (
            <button key={s} onClick={() => setActive(s)}
              className="flex-1 px-4 py-3 font-body text-sm tracking-wide transition-all duration-200"
              style={{ background: active === s ? 'var(--red)' : 'var(--ink)', color: active === s ? 'var(--cream)' : 'rgba(245,240,232,0.4)', border: 'none', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-px" style={{ background: 'rgba(139,26,26,0.12)' }}>
          {filtered.map(paper => (
            <div key={paper.id} className="flex items-center gap-6 px-6 py-4 transition-all duration-200 group"
              style={{ background: 'var(--ink)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.05)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink)'}>
              <span className="font-mono text-xs w-8 flex-shrink-0" style={{ color: 'var(--red)' }}>{paper.id}</span>
              <div className="flex-1 min-w-0">
                <span className="font-display text-base text-cream/90 block leading-snug">{paper.title}</span>
                <span className="font-body text-xs text-cream/30 mt-0.5 block">{paper.series}</span>
              </div>
              <span className="font-mono text-xs px-2 py-1 flex-shrink-0"
                style={{ background: 'rgba(139,26,26,0.15)', color: 'var(--red)', border: '1px solid rgba(139,26,26,0.2)' }}>
                {paper.tag}
              </span>
            </div>
          ))}
        </div>

        <p className="font-mono text-xs text-cream/25 text-center mt-6">
          All papers published irrevocably open access · PhilArchive · PhilPeople
        </p>
      </div>
    </section>
  );
}
