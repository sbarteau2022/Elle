import React, { useState, useEffect, useCallback } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap, Screen } from '../lib/types';

import { AuthScreen }      from './AuthScreen';
import { ThemeProvider }   from './v2/ThemeProvider';
import { TopBar }          from './v2/TopBar';
import { CommandPalette }  from './v2/CommandPalette';
import { TweaksDrawer }    from './v2/TweaksDrawer';
import { FaceProvider, useFace } from './v2/FaceContext';

import { HomeScreenV2 }    from './v2/HomeScreenV2';
import { WarRoomView }     from './v2/WarRoomView';
import { ProfileViewV2 }   from './v2/ProfileViewV2';
import { DoctrineView }    from './v2/DoctrineView';
import { TutorView }       from './v2/TutorView';
import { ReplaysView }     from './v2/ReplaysView';
import { CohortView }      from './v2/CohortView';
import { AskScreenV2 }     from './v2/AskScreenV2';
import { LearnScreenV2 }   from './v2/LearnScreenV2';
import { SignalsScreenV2 } from './v2/SignalsScreenV2';
import { ThreadsScreenV2 } from './v2/ThreadsScreenV2';

// ============================================================
// Elle Platform — single shell, multi-face
//
// /app          → core face (ethical intelligence)
// /app/edu      → Elle EDU
// /app/law      → Elle Law (LSAT)
// /app/med      → Elle Med
// /app/fin      → Elle Fin
//
// Auth: Supabase JWT via elle-auth edge function
// Session: localStorage (survives refresh)
// ============================================================

const SESSION_KEY = 'elle_session_v1';

function loadSession(): { user: User; token: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate shape — reject malformed sessions written by old code or tampered storage
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.user || typeof parsed.user !== 'object') return null;
    if (typeof parsed.user.email !== 'string' || !parsed.user.email) return null;
    if (typeof parsed.token !== 'string' || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(user: User, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function PlatformShell({ user, token, cogMap, onLogout }: {
  user: User; token: string; cogMap: CognitiveMap | null; onLogout: () => void;
}) {
  const face = useFace();
  const [screen, setScreen]       = useState<Screen>(face.defaultScreen as Screen);
  const [paletteOpen, setPalette] = useState(false);
  const [tweaksOpen, setTweaks]   = useState(false);

  // ⌘K global shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPalette(p => !p);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        screen={screen}
        setScreen={setScreen}
        onOpenPalette={() => setPalette(true)}
        onOpenTweaks={() => setTweaks(true)}
        user={user}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'home'     && <HomeScreenV2    user={user} cogMap={cogMap} setScreen={setScreen} />}
        {screen === 'warroom'  && <WarRoomView    user={user} token={token} />}
        {screen === 'profile'  && <ProfileViewV2   user={user} cogMap={cogMap} setScreen={setScreen} />}
        {screen === 'doctrine' && <DoctrineView   user={user} token={token} />}
        {screen === 'tutor'    && <TutorView      user={user} token={token} />}
        {screen === 'replays'  && <ReplaysView    user={user} token={token} />}
        {screen === 'cohort'   && <CohortView     user={user} token={token} />}
        {screen === 'ask'      && <AskScreenV2     user={user} token={token} />}
        {screen === 'learn'    && <LearnScreenV2   user={user} token={token} cogMap={cogMap} />}
        {screen === 'signals'  && <SignalsScreenV2 user={user} token={token} />}
        {screen === 'threads'  && <ThreadsScreenV2 user={user} token={token} />}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPalette(false)} setScreen={setScreen} />
      <TweaksDrawer   open={tweaksOpen}  onClose={() => setTweaks(false)} />
    </div>
  );
}

export function ELLEPlatform() {
  const [user, setUser]     = useState<User | null>(null);
  const [token, setToken]   = useState('');
  const [cogMap, setCogMap] = useState<CognitiveMap | null>(null);
  const [ready, setReady]   = useState(false);

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
      // no map yet
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
  };

  if (!ready) return null;
  if (!user)  return <AuthScreen onAuth={handleAuth} />;

  return (
    <FaceProvider>
      <ThemedShell user={user} token={token} cogMap={cogMap} onLogout={handleLogout} />
    </FaceProvider>
  );
}

function ThemedShell({ user, token, cogMap, onLogout }: {
  user: User; token: string; cogMap: CognitiveMap | null; onLogout: () => void;
}) {
  const face = useFace();
  return (
    <ThemeProvider initialAccent={face.accent}>
      <PlatformShell user={user} token={token} cogMap={cogMap} onLogout={onLogout} />
    </ThemeProvider>
  );
}
