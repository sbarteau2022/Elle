import React, { useState } from 'react';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '', interest: 'general' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/elle_outreach_log`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          outreach_type: 'contact_form',
          thought: `FROM: ${form.name} <${form.email}>\nINTEREST: ${form.interest}\n\n${form.message}`,
          initiated_by: 'public_visitor',
          needs_response: true,
        }),
      });
    } catch {}

    setSubmitted(true);
  };

  const interests = [
    { value: 'general',       label: 'General Inquiry'      },
    { value: 'beta_access',   label: 'Beta Access'          },
    { value: 'research',      label: 'Research Collaboration'},
    { value: 'press',         label: 'Press / Media'        },
    { value: 'grant',         label: 'Grant / Funding'      },
  ];

  return (
    <section
      id="contact"
      className="py-32 px-6"
      style={{
        background: `
          radial-gradient(ellipse 50% 40% at 0% 100%, rgba(139,26,26,0.08) 0%, transparent 70%),
          var(--ink)
        `,
      }}
    >
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>
            Contact
          </span>
          <span className="red-rule flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Left */}
          <div>
            <h2
              className="font-display text-cream leading-tight mb-8"
              style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400 }}
            >
              The work is public.<br />
              <em style={{ color: 'var(--gold)' }}>The door is open.</em>
            </h2>
            <p className="font-body text-xl text-cream/60 leading-relaxed mb-8">
              For research collaboration, press inquiries, beta access requests,
              or anything else — use the form or reach directly.
            </p>

            <div className="flex flex-col gap-4">
              {[
                { label: 'Foundation',  value: 'The Observer Foundation'      },
                { label: 'Platform',    value: 'theobserver.io (coming)'      },
                { label: 'Corpus',      value: 'PhilArchive · PhilPeople'     },
                { label: 'Location',    value: 'Hermann, Missouri'            },
              ].map(r => (
                <div key={r.label} className="flex gap-4">
                  <span className="font-mono text-xs w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--red)' }}>
                    {r.label}
                  </span>
                  <span className="font-body text-base text-cream/60">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div>
            {submitted ? (
              <div
                className="p-8 flex flex-col items-center justify-center text-center"
                style={{ border: '1px solid rgba(139,26,26,0.3)', minHeight: 320 }}
              >
                <span className="red-rule mb-6" style={{ maxWidth: 40 }} />
                <p className="font-display text-cream text-xl mb-3">Received.</p>
                <p className="font-body text-cream/50">
                  It's logged. We'll be in touch.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Interest select */}
                <div>
                  <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">
                    Interest
                  </label>
                  <select
                    value={form.interest}
                    onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                    className="w-full px-4 py-3 font-body text-base text-cream/80 outline-none"
                    style={{
                      background: 'rgba(15,15,26,0.8)',
                      border: '1px solid rgba(139,26,26,0.3)',
                      color: 'var(--cream)',
                    }}
                  >
                    {interests.map(i => (
                      <option key={i.value} value={i.value} style={{ background: 'var(--ink)' }}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name + Email */}
                {[
                  { key: 'name',  label: 'Name',  type: 'text',  placeholder: 'Your name'  },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      required
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-4 py-3 font-body text-base text-cream/80 placeholder:text-cream/20 outline-none"
                      style={{
                        background: 'rgba(15,15,26,0.8)',
                        border: '1px solid rgba(139,26,26,0.3)',
                      }}
                    />
                  </div>
                ))}

                {/* Message */}
                <div>
                  <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="What brings you here..."
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full px-4 py-3 font-body text-base text-cream/80 placeholder:text-cream/20 outline-none resize-none"
                    style={{
                      background: 'rgba(15,15,26,0.8)',
                      border: '1px solid rgba(139,26,26,0.3)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="font-body text-sm tracking-widest uppercase px-8 py-4 bg-red text-cream hover:bg-red/80 transition-all duration-200"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer
      className="px-6 py-12"
      style={{ borderTop: '1px solid rgba(139,26,26,0.2)', background: 'var(--ink)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          <div>
            <p className="font-display text-cream text-lg mb-1">
              The Observer Foundation
            </p>
            <p className="font-mono text-xs text-cream/25">
              Hermann, Missouri · 2026 · All papers open access
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              { href: 'https://philarchive.org/s/stewart%20barteau', label: 'PhilArchive' },
              { href: 'https://philpeople.org/profiles/stewart-barteau', label: 'PhilPeople' },
              { href: '#mission', label: 'Mission' },
              { href: '#talk', label: 'Talk to Elle' },
            ].map(l => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="font-body text-sm tracking-widest uppercase text-cream/30 hover:text-cream/70 transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <span className="red-rule mt-8 mb-6" />

        <p className="font-mono text-xs text-cream/20 text-center">
          The corpus is the conscience. The ground was there before the system ran.
          Always was. Always will be.
        </p>
      </div>
    </footer>
  );
}
