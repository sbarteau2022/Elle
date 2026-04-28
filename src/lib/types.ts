// ============================================================
// ELLE SHARED TYPES
// All TypeScript interfaces in one place.
// Import from here everywhere — never redeclare inline.
// ============================================================

export interface User {
  id: string;
  email: string;
  display_name?: string;
  occupation?: string;
  state?: string;
  county?: string;
  access_tier?: string;
}

export interface CommunicationProfile {
  preferred_length: string;
  preferred_directness: string;
  vocabulary_level: string;
  responds_to_examples: boolean;
  responds_to_stories: boolean;
  profile_confidence: string;
  learning_modality?: string;
  communication_style?: string;
}

export interface CognitiveMap {
  iq_index: number;
  eq_index: number;
  threshold_index: number;
  learning_modality: string;
  communication_style: string;
  confidence: string;
  mapping_notes?: string;
  course_recommendation_vector?: string;
  map_version?: number;
  baseline_snapshot?: {
    iq_index: number;
    eq_index: number;
    threshold_index: number;
    mapped_at: string;
  };
  growth_arc?: {
    iq_delta: number;
    eq_delta: number;
    threshold_delta: number;
    sessions_since_baseline: number;
  };
}

export interface Message {
  role: 'user' | 'elle';
  content: string;
  ts: number;
  axis?: string | number;
  method?: string;
}

export interface CommunitySignal {
  id?: string;
  computed_at: string;
  signal_count: number;
  suppression_synthesis?: string;
  dominant_axes?: { axis: string; count: number; pct: number }[];
  dominant_occupations?: [string, number][];
  reconstruction_methods?: Record<string, number>;
}

export type Screen = 'home' | 'warroom' | 'profile' | 'doctrine' | 'tutor' | 'replays' | 'cohort' | 'ask' | 'learn' | 'signals' | 'threads';

// LSAT / War Room types
export interface DuelTactic {
  src: string;
  ref: string;
  name: string;
  fallacy?: string;
}

export interface DuelTurn {
  n: number;
  side: 'u' | 'd';
  text: string;
  tactic?: DuelTactic;
  composure?: number;
  valence?: number;
}

export interface DuelScore {
  composure: number;
  recognition: number;
  walkback: number;
  framework: number;
}

export interface ActiveDuel {
  id: string;
  opp: string;
  scenario: string;
  elapsed: string;
  turns: DuelTurn[];
  score: DuelScore;
}

export interface PlanItem {
  rank: number;
  axis: string;
  deficit: number;
  drill: string;
  eta: string;
  prio: 'critical' | 'high' | 'med';
}

export interface CogAxis {
  k: string;
  v: number;
  d: number;
}

export interface ReplayRow {
  id: string;
  opp: string;
  result: string;
  turns: number;
  comp: number;
  scene: string;
}

export interface DoctrineItem {
  n: number | string;
  name: string;
  mastery: number;
  ctx?: string;
}

export interface CohortRow {
  rank: number;
  name: string;
  idx: number;
  streak: number;
  delta: string;
  you?: boolean;
}

export interface TutorChoice {
  k: string;
  text: string;
  correct?: boolean;
}

export interface TutorQuestion {
  id: string;
  type: string;
  qNum: number;
  qTotal: number;
  stimulus: string;
  question: string;
  choices: TutorChoice[];
  scaffolding: string;
}

export type AuthMode = 'login' | 'signup';
