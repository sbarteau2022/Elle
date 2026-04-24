import React, { useState, useEffect, useCallback } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap, Screen } from '../lib/types';

import { AuthScreen }      from './AuthScreen';
import { ThemeProvider }   from './v2/ThemeProvider';
import { TopBar }          from './v2/TopBar';
import { CommandPalette }  from './v2/CommandPalette';
import { TweaksDrawer }    from './v2/TweaksDrawer';
import { HomeScreenV2 }    from './v2/HomeScreenV2';
import { WarRoomView }     from './v2/WarRoomView';
import { ProfileViewV2 }   from './v2/ProfileViewV2';
import { DoctrineView }    from './v2/DoctrineView';
import { TutorView }       from './v2/TutorView';
import { ReplaysView }     from './v2/ReplaysView';
import { CohortView }      from './v2/CohortView';

// Legacy screens still available via Screen type
import { AskScreen }       from './AskScreen';
import { LearnScreen }     from './LearnScreen';
import { ProfileScreen }   from './ProfileScreen';
import { SignalsScreen }   from './SignalsScreen';
import { ThreadsScreen }   from './ThreadsScreen';

const SESSION_KEY = 'elle_session_v1';

function loadSession(): { user: User; token: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(user: User, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}

function PlatformShell({ user, token, cogMap, setCogMap }: {
  user: User; token: string; cogMap: CognitiveMap | null;
  setCogMap: (m: CognitiveMap) => void;
}) {
  const [screen, setScreen]       = useState<Screen>('home');
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
      />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'home'     && <HomeScreenV2  user={user} cogMap={cogMap} setScreen={setScreen} />}
        {screen === 'warroom'  && <WarRoomView />}
        {screen === 'profile'  && <ProfileViewV2 user={user} cogMap={cogMap} setScreen={setScreen} />}
        {screen === 'doctrine' && <DoctrineView />}
        {screen === 'tutor'    && <TutorView />}
        {screen === 'replays'  && <ReplaysView />}
        {screen === 'cohort'   && <CohortView />}
        {screen === 'ask'      && <AskScreen     user={user} token={token} />}
        {screen === 'learn'    && <LearnScreen   user={user} token={token} cogMap={cogMap} />}
        {screen === 'signals'  && <SignalsScreen  user={user} token={token} />}
        {screen === 'threads'  && <ThreadsScreen  user={user} token={token} />}
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

  if (!ready) return null;
  if (!user)  return <AuthScreen onAuth={handleAuth} />;

  return (
    <ThemeProvider>
      <PlatformShell user={user} token={token} cogMap={cogMap} setCogMap={setCogMap} />
    </ThemeProvider>
  );
}
