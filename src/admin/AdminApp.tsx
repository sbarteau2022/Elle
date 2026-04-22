import React, { useState, useEffect, useCallback } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CognitiveMap, AdminScreen, AdminSession } from '../lib/types';

import { AdminLoginScreen }  from './AdminLoginScreen';
import { AdminSidebar }      from './AdminSidebar';
import { AdminDashboard }    from './AdminDashboard';
import { AdminProfileScreen } from './AdminProfileScreen';
import { AdminConfigScreen } from './AdminConfigScreen';

// ============================================================
// Admin Panel — Protected route orchestrator
//
// Entry: /admin
// Auth: Supabase JWT via elle-auth + elle-admin verify_access
// Session: localStorage (survives refresh)
// ============================================================

const ADMIN_SESSION_KEY = 'elle_admin_session_v1';

function loadAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAdminSession(user: User, token: string) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ user, token }));
}

export function AdminApp() {
  const [user, setUser]     = useState<User | null>(null);
  const [token, setToken]   = useState('');
  const [screen, setScreen] = useState<AdminScreen>('dashboard');
  const [cogMap, setCogMap] = useState<CognitiveMap | null>(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    const session = loadAdminSession();
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
    saveAdminSession(u, t);
    fetchCogMap(u.id, t);
  };

  const handleSignOut = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setUser(null);
    setToken('');
    setCogMap(null);
    setScreen('dashboard');
  };

  if (!ready) return null;

  if (!user) return <AdminLoginScreen onAuth={handleAuth} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a14', color: '#F5F0E8' }}>
      <AdminSidebar screen={screen} setScreen={setScreen} user={user} onSignOut={handleSignOut} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'dashboard' && <AdminDashboard user={user} token={token} cogMap={cogMap} />}
        {screen === 'profile'   && <AdminProfileScreen user={user} token={token} cogMap={cogMap} onCogMapUpdate={setCogMap} />}
        {screen === 'config'    && <AdminConfigScreen />}
      </main>
    </div>
  );
}
