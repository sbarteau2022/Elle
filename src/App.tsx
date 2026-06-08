import React, { useState, useEffect, lazy, Suspense } from 'react'

// Public site
import { Navbar }           from './components/Navbar'
import { Hero }             from './components/Hero'
import { Mission }          from './components/Mission'
import { ElleIntro }        from './components/ElleIntro'
import { ElleTalk }         from './components/ElleTalk'
import { Corpus }           from './components/Corpus'
import { Rollout }          from './components/Rollout'
import { Contact, Footer }  from './components/ContactFooter'

// Platform + Dev — lazy loaded
const ELLEPlatform = lazy(() => import('./platform/ELLEPlatform').then(m => ({ default: m.ELLEPlatform })))
const ElleAtlasDev = lazy(() => import('./dev/ElleAtlasDev'))

// ============================================================
// ROUTE LOGIC
//
// /          → public site
// /app       → ELLEai platform (all faces: /app/law, /app/edu, etc.)
// /dev       → Elle dev UI (Atlas OS, live worker — auth gated)
// ============================================================

function getRoute(): 'public' | 'app' | 'dev' {
  const p = window.location.pathname
  if (p.startsWith('/dev')) return 'dev'
  if (p.startsWith('/app')) return 'app'
  return 'public'
}

const Loader = () => (
  <div style={{ height: '100vh', background: '#07080C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ color: '#5FD6E8', fontFamily: 'monospace', fontSize: 13 }}>loading elle…</div>
  </div>
)

export function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (route === 'dev') {
    return <Suspense fallback={<Loader />}><ElleAtlasDev /></Suspense>
  }

  if (route === 'app') {
    return <Suspense fallback={<Loader />}><ELLEPlatform /></Suspense>
  }

  return (
    <div style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
      <Navbar />
      <main>
        <Hero />
        <Mission />
        <ElleIntro />
        <ElleTalk />
        <Corpus />
        <Rollout />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
