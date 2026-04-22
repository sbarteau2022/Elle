import React, { useState, useEffect } from 'react';

// Public site
import { Navbar }           from './components/Navbar';
import { Hero }             from './components/Hero';
import { Mission }          from './components/Mission';
import { ElleIntro }        from './components/ElleIntro';
import { ElleTalk }         from './components/ElleTalk';
import { Corpus }           from './components/Corpus';
import { Rollout }          from './components/Rollout';
import { Contact, Footer }  from './components/ContactFooter';

// Platform
import { ELLEPlatform } from './platform/ELLEPlatform';

// Admin
import { AdminApp } from './admin/AdminApp';

// ============================================================
// ROUTE LOGIC
//
// /       → Observer Foundation public site
// /app    → ELLEai authenticated platform
// /admin  → Administration panel (requires admin access_tier)
//
// No router library needed — pathname check is sufficient.
// vercel.json rewrites all paths to index.html.
// ============================================================

type Route = 'landing' | 'app' | 'admin';

function getRoute(): Route {
  const p = window.location.pathname;
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/app'))   return 'app';
  return 'landing';
}

export function App() {
  const [route, setRoute] = useState<Route>(getRoute());

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (route === 'admin') return <AdminApp />;
  if (route === 'app')   return <ELLEPlatform />;

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
  );
}
