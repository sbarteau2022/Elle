import React, { useState, useEffect } from 'react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { label: 'Mission', href: '#mission' },
    { label: 'Elle',    href: '#elle'    },
    { label: 'Corpus',  href: '#corpus'  },
    { label: 'Rollout', href: '#rollout' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur border-b border-white/5' : 'bg-transparent'
      }`}
      style={scrolled ? { background: 'rgba(15,15,26,0.95)' } : {}}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <span className="red-rule w-6 inline-block" />
          <span className="font-display text-cream text-sm tracking-wide">
            The Observer Foundation
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="font-body text-sm tracking-widest uppercase text-cream/60 hover:text-cream transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/app"
            className="font-body text-sm tracking-widest uppercase px-4 py-2 transition-all"
            style={{ border: '1px solid rgba(139,26,26,0.6)', color: 'var(--red)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--red)';
              (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--red)';
            }}
          >
            Open ELLEai
          </a>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-cream/60 hover:text-cream">
          <div className="w-5 h-px bg-current mb-1.5 transition-all" style={open ? { transform: 'rotate(45deg) translate(4px,4px)' } : {}} />
          <div className="w-5 h-px bg-current mb-1.5 transition-all" style={open ? { opacity: 0 } : {}} />
          <div className="w-5 h-px bg-current transition-all" style={open ? { transform: 'rotate(-45deg) translate(4px,-4px)' } : {}} />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 px-6 py-6 flex flex-col gap-4" style={{ background: 'rgba(15,15,26,0.98)' }}>
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-body text-sm tracking-widest uppercase text-cream/70 hover:text-cream"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/app"
            onClick={() => setOpen(false)}
            className="font-body text-sm tracking-widest uppercase px-4 py-2 text-center mt-2"
            style={{ border: '1px solid rgba(139,26,26,0.6)', color: 'var(--red)' }}
          >
            Open ELLEai
          </a>
        </div>
      )}
    </nav>
  );
}
