import React, { useState, useEffect, useCallback } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap, Screen } from '../lib/types';

import { AuthScreen }    from './AuthScreen';
import { Sidebar }       from './Sidebar';
import { HomeScreen }    from './HomeScreen';
import { AskScreen }     from './AskScreen';
import { LearnScreen }   from './LearnScreen';
import { ProfileScreen } from './ProfileScreen';
import { SignalsScreen } from './SignalsScreen';
import { ThreadsScreen } from './ThreadsScreen';

// ============================================================
// ELLEai Platform — Protected route orchestrator
//
// Entry: /app
// Auth: Supabase JWT (or sovereign mode — no auth required)
// Session: localStorage (survives refresh)
// ============================================================

const SESSION_KEY = 'elle_session_v1';

function loadSession(): { user: User; token: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(user: User, token: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function ELLEPlatform() {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState('');
  const [screen, setScreen]   = useState<Screen>('home');
  const [cogMap, setCogMap]   = useState<CognitiveMap | null>(null);
  const [ready, setReady]     = useState(false);

  // Load persisted session on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
      fetchCogMap(session.user.id, session.token);
    }
    setReady(true);
  }, []);

  const fetchCogMap = useCallback(async (userId: string, t: string) => {
    try {
      const data = await callEdge('elle-cognitive-mapping', { action: 'read', user_id: userId }, t);
      if (typeof data.iq_index === 'number') {
        setCogMap(data as unknown as CognitiveMap);
      }
    } catch {
      // no map yet — that's fine
    }
  }, []);

  const handleAuth = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    saveSession(u, t);
    fetchCogMap(u.id, t);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setToken('');
    setCogMap(null);
    setScreen('home');
  };

  // Don't flash auth screen on first render while checking sessionStorage
  if (!ready) return null;

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f1a', color: '#F5F0E8' }}>
      <Sidebar screen={screen} setScreen={setScreen} user={user} onLogout={handleLogout} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'home'    && <HomeScreen    user={user} cogMap={cogMap} setScreen={setScreen} />}
        {screen === 'ask'     && <AskScreen     user={user} token={token} />}
        {screen === 'learn'   && <LearnScreen   user={user} token={token} cogMap={cogMap} />}
        {screen === 'profile' && <ProfileScreen user={user} token={token} cogMap={cogMap} onCogMapUpdate={setCogMap} />}
        {screen === 'signals' && <SignalsScreen user={user} token={token} />}
        {screen === 'threads' && <ThreadsScreen user={user} token={token} />}
      </main>
    </div>
  );
}
