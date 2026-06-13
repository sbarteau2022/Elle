// Elle Desktop App — src/App.tsx
// This is the Electron desktop app entry point.
// Elle Law UI → elle-law repo
// Dev UI → anchored to elle-intel (separate deploy)
// Consumer UI → Atlas/Optimus OS (separate build)

import { Navbar }          from './components/Navbar'
import { Hero }            from './components/Hero'
import { Mission }         from './components/Mission'
import { ElleIntro }       from './components/ElleIntro'
import { ElleTalk }        from './components/ElleTalk'
import { Corpus }          from './components/Corpus'
import { Rollout }         from './components/Rollout'
import { Contact, Footer } from './components/ContactFooter'

export function App() {
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
