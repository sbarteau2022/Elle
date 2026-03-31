import React, { useState, useEffect } from 'react'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const links = [
    { label: 'Mission',  href: '#mission' },
    { label: 'Elle',     href: '#elle' },
    { label: 'Corpus',   href: '#corpus' },
    { label: 'Rollout',  href: '#rollout' },
    { label: 'Contact',  href: '#contact' },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-ink/95 backdrop-blur border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <span className="red-rule-full w-6 inline-block" style={{width:24,height:2,background:'#8B1A1A',display:'inline-block'}} />
          <span className="font-serif text-cream text-sm tracking-wide">The Observer Foundation</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="font-condensed text-sm tracking-widest uppercase text-cream/60 hover:text-cream transition-colors">
              {l.label}
            </a>
          ))}
          <a href="#elle-talk"
            className="font-condensed text-sm tracking-widest uppercase px-4 py-2 border border-red/60 text-red hover:bg-red hover:text-cream transition-all">
            Talk to Elle
          </a>
        </div>

        {/* Mobile */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-cream/60 hover:text-cream">
          <div className="w-5 h-px bg-current mb-1.5 transition-all" style={open?{transform:'rotate(45deg) translate(4px,4px)'}:{}} />
          <div className="w-5 h-px bg-current mb-1.5 transition-all" style={open?{opacity:0}:{}} />
          <div className="w-5 h-px bg-current transition-all" style={open?{transform:'rotate(-45deg) translate(4px,-4px)'}:{}} />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-ink/98 border-t border-white/5 px-6 py-6 flex flex-col gap-4">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="font-condensed text-sm tracking-widest uppercase text-cream/70 hover:text-cream">
              {l.label}
            </a>
          ))}
          <a href="#elle-talk" onClick={() => setOpen(false)}
            className="font-condensed text-sm tracking-widest uppercase px-4 py-2 border border-red/60 text-red text-center mt-2">
            Talk to Elle
          </a>
        </div>
      )}
    </nav>
  )
}
