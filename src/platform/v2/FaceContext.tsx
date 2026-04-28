import React, { createContext, useContext, useMemo } from 'react';

// ============================================================
// ELLE FACES
// Each face is a domain-specific configuration of the platform.
// All faces share: same UI shell, same auth, same Supabase backend.
// Each face customizes: visible tabs, default screen, accent color,
// scenario domain, question bank filter, archetype labels.
// ============================================================

export type FaceKey = 'core' | 'edu' | 'law' | 'med' | 'fin';

export interface FaceConfig {
  key: FaceKey;
  name: string;
  tagline: string;
  accent: string;
  defaultScreen: string;
  // Tabs visible in TopBar — subset of Screen union
  tabs: string[];
  // Question bank axis filter for TutorView (null = no filter)
  questionAxis: string | null;
  // Default scenario tag for WarRoomView
  scenarioTag: string | null;
  // Archetype label shown on ProfileViewV2
  archetypeLabel: string;
}

const FACES: Record<FaceKey, FaceConfig> = {
  core: {
    key: 'core',
    name: 'Elle',
    tagline: 'Ethical Intelligence',
    accent: '#ff6a42',
    defaultScreen: 'home',
    tabs: ['home', 'warroom', 'profile', 'doctrine', 'tutor', 'replays', 'cohort'],
    questionAxis: null,
    scenarioTag: null,
    archetypeLabel: 'The Architect',
  },
  edu: {
    key: 'edu',
    name: 'Elle EDU',
    tagline: 'Cognitive formation',
    accent: '#7c5cff',
    defaultScreen: 'tutor',
    tabs: ['home', 'tutor', 'profile', 'replays', 'cohort'],
    questionAxis: null,
    scenarioTag: null,
    archetypeLabel: 'The Student',
  },
  law: {
    key: 'law',
    name: 'Elle Law',
    tagline: 'LSAT · structural advocacy',
    accent: '#ff5a36',
    defaultScreen: 'warroom',
    tabs: ['home', 'warroom', 'tutor', 'doctrine', 'replays', 'cohort', 'profile'],
    questionAxis: null,
    scenarioTag: 'lsat',
    archetypeLabel: 'The Architect',
  },
  med: {
    key: 'med',
    name: 'Elle Med',
    tagline: 'Clinical reasoning',
    accent: '#00d4a8',
    defaultScreen: 'tutor',
    tabs: ['home', 'tutor', 'profile', 'replays'],
    questionAxis: 'Clinical Reasoning',
    scenarioTag: 'med',
    archetypeLabel: 'The Diagnostician',
  },
  fin: {
    key: 'fin',
    name: 'Elle Fin',
    tagline: 'Markets · structural reading',
    accent: '#3b82f6',
    defaultScreen: 'home',
    tabs: ['home', 'profile', 'replays', 'cohort'],
    questionAxis: 'Market Structure',
    scenarioTag: 'fin',
    archetypeLabel: 'The Reader',
  },
};

// Parse the face from URL pathname. /app → core. /app/edu → edu. etc.
export function parseFaceFromPath(): FaceKey {
  if (typeof window === 'undefined') return 'core';
  const segs = window.location.pathname.split('/').filter(Boolean);
  // segs[0] === 'app', segs[1] is the face key (optional)
  if (segs[0] !== 'app') return 'core';
  const key = segs[1];
  if (key && key in FACES) return key as FaceKey;
  return 'core';
}

export const FaceCtx = createContext<FaceConfig>(FACES.core);

export function useFace(): FaceConfig {
  return useContext(FaceCtx);
}

export function FaceProvider({ children, face }: { children: React.ReactNode; face?: FaceKey }) {
  const cfg = useMemo(() => FACES[face ?? parseFaceFromPath()], [face]);
  return <FaceCtx.Provider value={cfg}>{children}</FaceCtx.Provider>;
}

export { FACES };
