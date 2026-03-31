import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Mission } from './components/Mission';
import { ElleIntro } from './components/ElleIntro';
import { ElleTalk } from './components/ElleTalk';
import { Corpus } from './components/Corpus';
import { Rollout } from './components/Rollout';
import { Contact, Footer } from './components/ContactFooter';

export function App() {
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
