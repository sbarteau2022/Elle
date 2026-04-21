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

export type Screen = 'home' | 'ask' | 'learn' | 'profile' | 'signals' | 'threads';

export type AuthMode = 'login' | 'signup';
