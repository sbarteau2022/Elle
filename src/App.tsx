import React, { useState, useEffect, lazy, Suspense } from 'react'

// Public site
import { Navbar }          from './components/Navbar'
import { Hero }            from './components/Hero'
import { Mission }         from './components/Mission'
import { ElleIntro }       from './components/ElleIntro'
import { ElleTalk }        from './components/ElleTalk'
import { Corpus }          from './components/Corpus'
import { Rollout }         from './components/Rollout'
import { Contact, Footer } from './components/ContactFooter'

// Platform
import { ELLEPlatform } from './platform/ELLEPlatform'

// Dev UI — lazy loaded
const ElleAtlasDev = lazy(() => import('./dev/ElleAtlasDev'))

// ── Route logic ───────────────────────────────────────────────
// /          → Observer Foundation public site
// /app       → ELLEai platform (all faces)
// /dev       → Elle dev UI (Atlas OS, live worker)
// ─────────────────────────────────────────────────────────────

function getRoute(): 'public' | 'app' | 'dev' {
  const p = window.location.pathname
  if (p.startsWith('/dev')) return 'dev'
  if (p.startsWith('/app')) return 'app'
  return 'public'
}

export function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // Dev UI — full screen, no wrapper
  if (route === 'dev') {
    return (
      <Suspense fallback={
        <div style={{ height: '100vh', background: '#07080C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#5FD6E8', fontFamily: 'monospace', fontSize: 13 }}>loading elle…</div>
        </div>
      }>
        <ElleAtlasDev />
      </Suspense>
    )
  }

  // Platform
  if (route === 'app') {
    return <ELLEPlatform />
  }

  // Public site
  return (
    <>
      <Navbar />
      <Hero />
      <Mission />
      <ElleIntro />
      <ElleTalk />
      <Corpus />
      <Rollout />
      <Contact />
      <Footer />
    </>
  )
}