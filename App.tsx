import React, { useState, useEffect } from 'react';

// ============================================================
// APP ROUTER
//
// / (root)         → Observer Foundation public site
// /app             → ELLEai platform (authenticated)
// /app?sovereign   → Local sovereign mode (Ollama, API-free)
//
// No router dependency — path check on load is sufficient.
// ============================================================

// Public site components (existing)
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Mission } from './components/Mission';
import { ElleIntro } from './components/ElleIntro';
import { ElleTalk } from './components/ElleTalk';
import { Corpus } from './components/Corpus';
import { Rollout } from './components/Rollout';
import { Contact, Footer } from './components/ContactFooter';

// Platform
import { ELLEApp } from './platform/ELLEApp';

function isAppRoute() {
  return window.location.pathname.startsWith('/app');
}

export default function App() {
  const [route, setRoute] = useState(isAppRoute());

  useEffect(() => {
    const handler = () => setRoute(isAppRoute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Platform route
  if (route) {
    return <ELLEApp />;
  }

  // Public Observer Foundation site
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

export { App };
