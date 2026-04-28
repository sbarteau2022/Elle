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

// ============================================================
// ROUTE LOGIC
//
// /             → Observer Foundation public site
// /app          → ELLEai platform (core face)
// /app/edu      → Elle EDU
// /app/law      → Elle Law
// /app/med      → Elle Med
// /app/fin      → Elle Fin
//
// Face is parsed inside ELLEPlatform via FaceProvider.
// vercel.json rewrites all paths to index.html.
// ============================================================

function isApp() {
  return window.location.pathname.startsWith('/app');
}

export function App() {
  const [onApp, setOnApp] = useState(isApp());

  useEffect(() => {
    const handler = () => setOnApp(isApp());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (onApp) return <ELLEPlatform />;

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
