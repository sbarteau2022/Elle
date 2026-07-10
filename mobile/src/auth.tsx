// ============================================================
// WHO HOLDS THE DOOR — src/auth.tsx
//
// Token + user in SecureStore, exposed through one context. The gate has
// three states: restoring (checking the keychain), out (login/signup), and
// in (the door is open). A stored token is re-verified against the worker on
// launch — a revoked or expired token drops cleanly back to the login form,
// never into a half-authenticated app.
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { auth as authApi, type User } from './api';
import { googleIdToken, googleSignOut } from './google';
import { unregisterForKnocks } from './push';
import { clearCache } from './store';

const KEY_TOKEN = 'elle.token';
const KEY_USER = 'elle.user';

export interface AuthState {
  restoring: boolean;
  token: string | null;
  user: User | null;
  signIn(email: string, password: string): Promise<{ mustReset: boolean }>;
  signUp(email: string, password: string): Promise<void>;
  completeReset(email: string, tempPassword: string, newPassword: string): Promise<void>;
  /** Native Google sheet → /api/elle-oauth → same JWT as password login.
   *  Resolves false if the user dismissed the sheet (not an error). */
  signInWithGoogle(): Promise<boolean>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const persist = useCallback(async (t: string, u: User) => {
    await SecureStore.setItemAsync(KEY_TOKEN, t);
    await SecureStore.setItemAsync(KEY_USER, JSON.stringify(u));
    setToken(t); setUser(u);
  }, []);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY_TOKEN);
    await SecureStore.deleteItemAsync(KEY_USER);
    // The offline thread cache is session state, not device state: the next
    // account on this device must never hydrate the previous account's
    // conversation. Wiping it on every teardown (sign-out, failed restore,
    // erase) trades a re-fetch for that guarantee.
    try { clearCache(); } catch { /* cache is best-effort either way */ }
    setToken(null); setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync(KEY_TOKEN);
        const uRaw = await SecureStore.getItemAsync(KEY_USER);
        if (t && uRaw) {
          // Re-verify: a revoked token must not open the door.
          const v = await authApi.verify(t).catch(() => null);
          if (v?.valid) { setToken(t); setUser(v.user); }
          else await clear();
        }
      } finally { setRestoring(false); }
    })();
  }, [clear]);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    if (r.must_reset) return { mustReset: true }; // token withheld until they set their own password
    await persist(r.access_token, r.user);
    return { mustReset: false };
  }, [persist]);

  const signUp = useCallback(async (email: string, password: string) => {
    const r = await authApi.signup(email, password);
    await persist(r.access_token, r.user);
  }, [persist]);

  const completeReset = useCallback(async (email: string, tempPassword: string, newPassword: string) => {
    const r = await authApi.setPassword(email, tempPassword, newPassword);
    await persist(r.access_token, r.user);
  }, [persist]);

  const signInWithGoogle = useCallback(async () => {
    const idToken = await googleIdToken();
    if (!idToken) return false; // sheet dismissed — not an error
    const r = await authApi.oauth(idToken);
    await persist(r.access_token, r.user);
    return true;
  }, [persist]);

  const signOut = useCallback(async () => {
    // Release this device's push registration while the token still works —
    // a signed-out phone must stop receiving the old account's knocks.
    if (token) await unregisterForKnocks(token);
    await googleSignOut(); // drop the native session so the picker shows next time
    await clear();
  }, [clear, token]);

  const value = useMemo<AuthState>(() => ({
    restoring, token, user, signIn, signUp, completeReset, signInWithGoogle, signOut,
  }), [restoring, token, user, signIn, signUp, completeReset, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
