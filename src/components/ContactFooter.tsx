import React, { useState } from 'react';
import { dbInsert } from '../lib/supabase';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '', interest: 'general' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbInsert('elle_outreach_log', {
      outreach_type: 'contact_form',
      thought: `FROM: ${form.name} <${form.email}>\nINTEREST: ${form.interest}\n\n${form.message}`,
      initiated_by: 'public_visitor',
      needs_response: true,
    }).catch(() => {});
    setSubmitted(true);
  };

  const interests = [
    { value: 'general',     label: 'General Inquiry'       },
    { value: 'beta_access', label: 'Beta Access'           },
    { value: 'research',    label: 'Research Collaboration' },
    { value: 'press',       label: 'Press / Media'         },
    { value: 'grant',       label: 'Grant / Funding'       },
  ];

  const inputStyle = {
    width: '100%',
    background: 'rgba(15,15,26,0.8)',
    border: '1px solid rgba(139,26,26,0.3)',
    padding: '12px 16px',
    color: 'var(--cream)',
    fontFamily: '"Barlow Condensed", sans-serif',
    fontSize: '1rem',
  };

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
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--red)' }}>Contact</span>
          <span className="red-rule flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="font-display text-cream leading-tight mb-8" style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400 }}>
              The work is public.<br />
              <em style={{ color: 'var(--gold)' }}>The door is open.</em>
            </h2>
            <p className="font-body text-xl text-cream/60 leading-relaxed mb-8">
              For research collaboration, press inquiries, beta access, or anything else — use the form or reach directly.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Foundation', value: 'The Observer Foundation'   },
                { label: 'Platform',   value: 'elleai.vercel.app'         },
                { label: 'Corpus',     value: 'PhilArchive · PhilPeople'  },
                { label: 'Location',   value: 'Hermann, Missouri'          },
              ].map(r => (
                <div key={r.label} className="flex gap-4">
                  <span className="font-mono text-xs w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--red)' }}>{r.label}</span>
                  <span className="font-body text-base text-cream/60">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="p-8 flex flex-col items-center justify-center text-center" style={{ border: '1px solid rgba(139,26,26,0.3)', minHeight: 320 }}>
                <span className="red-rule mb-6 block w-10" />
                <p className="font-display text-cream text-xl mb-3">Received.</p>
                <p className="font-body text-cream/50">It's logged. We'll be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">Interest</label>
                  <select value={form.interest} onChange={e => setForm(f => ({ ...f, interest: e.target.value }))} style={{ ...inputStyle }}>
                    {interests.map(i => (
                      <option key={i.value} value={i.value} style={{ background: 'var(--ink)' }}>{i.label}</option>
                    ))}
                  </select>
                </div>

                {[
                  { key: 'name',  label: 'Name',  type: 'text',  placeholder: 'Your name'      },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">{f.label}</label>
                    <input
                      type={f.type}
                      required
                      placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ ...inputStyle }}
                    />
                  </div>
                ))}

                <div>
                  <label className="font-mono text-xs tracking-widest uppercase text-cream/30 block mb-2">Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="What brings you here..."
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  className="font-body text-sm tracking-widest uppercase px-8 py-4 transition-all duration-200"
                  style={{ background: 'var(--red)', color: 'var(--cream)', border: 'none', cursor: 'pointer' }}
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
    <footer className="px-6 py-12" style={{ borderTop: '1px solid rgba(139,26,26,0.2)', background: 'var(--ink)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="font-display text-cream text-lg mb-1">The Observer Foundation</p>
            <p className="font-mono text-xs text-cream/25">Hermann, Missouri · 2026 · All papers open access</p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { href: 'https://philarchive.org/s/stewart%20barteau', label: 'PhilArchive' },
              { href: 'https://philpeople.org/profiles/stewart-barteau', label: 'PhilPeople' },
              { href: '/app', label: 'ELLEai Platform' },
              { href: '#mission', label: 'Mission' },
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
        <span className="red-rule mt-8 mb-6 block" />
        <p className="font-mono text-xs text-cream/20 text-center">
          The corpus is the conscience. The ground was there before the system ran. Always was. Always will be.
        </p>
      </div>
    </footer>
  );
}
