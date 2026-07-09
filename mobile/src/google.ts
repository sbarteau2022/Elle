// ============================================================
// GOOGLE AT THE DOOR — src/google.ts
//
// The one file that touches @react-native-google-signin. Everything about it
// is conditional, on purpose:
//
//   - The library is NATIVE code, so it exists only in a real build (EAS
//     dev/preview/production). In Expo Go the require() throws — we catch
//     that and report "not available", and Login simply doesn't render the
//     Google button. Email/password keeps working everywhere.
//   - It also needs a web client ID baked in at bundle time
//     (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID). Unset ⇒ same graceful absence.
//
// The flow when it IS available: native sign-in sheet → Google ID token →
// POST /api/elle-oauth (the worker verifies audience + email server-side and
// mints the same JWT as password login). See mobile/README.md → "Google
// sign-in" for the Google Cloud Console setup.
// ============================================================

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

type GoogleSigninModule = {
  GoogleSignin: {
    configure(opts: { webClientId: string; iosClientId?: string }): void;
    hasPlayServices(): Promise<boolean>;
    signIn(): Promise<{ type?: string; data?: { idToken?: string | null } | null }>;
    signOut(): Promise<null>;
  };
};

let mod: GoogleSigninModule | null | undefined; // undefined = not probed yet
let configured = false;

function load(): GoogleSigninModule | null {
  if (mod !== undefined) return mod;
  if (!GOOGLE_WEB_CLIENT_ID) { mod = null; return mod; } // no client ID baked in
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    mod = null; // Expo Go / a build without the native module
  }
  return mod;
}

export function googleAvailable(): boolean {
  return load() !== null;
}

// Runs the native sheet and returns the ID token, or null if the user
// dismissed it. Throws on real failures (no Play Services, network).
export async function googleIdToken(): Promise<string | null> {
  const m = load();
  if (!m) throw new Error('Google sign-in is not available in this build.');
  const { GoogleSignin } = m;
  if (!configured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    });
    configured = true;
  }
  await GoogleSignin.hasPlayServices(); // no-op on iOS; throws a clear error on Android without them
  const res = await GoogleSignin.signIn();
  if (res.type === 'cancelled') return null;
  const idToken = res.data?.idToken;
  if (!idToken) throw new Error('Google did not return an ID token — check the web client ID configuration.');
  return idToken;
}

// Drop the native session so the next tap shows the account picker again.
// Best-effort: our own JWT is what actually signs the user out of Elle.
export async function googleSignOut(): Promise<void> {
  const m = load();
  if (!m) return;
  try { await m.GoogleSignin.signOut(); } catch { /* nothing to drop */ }
}
