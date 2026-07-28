// Ambient types for the Electron preload bridge (window.elleNative) and the
// Web Speech APIs the voice pipeline uses. Kept loose on purpose — these are
// host capabilities that may be absent (non-Electron, non-macOS, no speech).

export interface HeadMotion { pitch: number; roll: number; yaw: number }

// The capability map main.cjs computes and preload.cjs exposes. `platform`
// is always present; every other key is a native feature that may or may
// not be available on this machine — today just headMotion (macOS +
// AirPods), but this is the map future native features (gesture input, a
// vision provider, …) register into without a new preload API each time.
export interface Capabilities {
  platform: string
  headMotion: boolean
  [key: string]: boolean | string
}

// Device permissions the user can grant through the workbench's
// PermissionGate. The main process default-denies all Chromium permission
// requests; setPermission relays an explicit user decision.
export type PermissionName = 'microphone' | 'camera'
export type PermissionGrants = Record<PermissionName, boolean>

declare global {
  interface Window {
    elleNative?: {
      isElectron: boolean;
      getCapabilities: () => Promise<Capabilities>;
      setPermission: (name: PermissionName, allow: boolean) => Promise<PermissionGrants>;
      getPermissions: () => Promise<PermissionGrants>;
      // Auto-launch at login. supported is false on platforms Electron can't
      // do this on (Linux) — the workbench toggle hides itself in that case.
      loginItem?: {
        get: () => Promise<{ supported: boolean; openAtLogin: boolean }>;
        set: (enable: boolean) => Promise<{ supported: boolean; openAtLogin: boolean }>;
      };
      // Integrated terminal. `pty: false` on a created session means node-pty
      // is unavailable on this machine and the shell is piped — line-oriented
      // commands work, full-screen TUIs do not. onData/onExit return their own
      // unsubscribe function; call it on unmount.
      terminal?: {
        create: (opts?: { cwd?: string; cols?: number; rows?: number }) =>
          Promise<{ id: string; shell: string; cwd: string; pty: boolean }>;
        write: (id: string, data: string) => Promise<void>;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        kill: (id: string) => Promise<void>;
        list: () => Promise<{ id: string; shell: string; cwd: string; pty: boolean }[]>;
        onData: (id: string, cb: (data: string) => void) => () => void;
        onExit: (id: string, cb: (code: number) => void) => () => void;
      };
      onHeadMotion: (cb: (data: HeadMotion) => void) => void;
      offHeadMotion: () => void;
      headMotionAvailable: () => Promise<boolean>;
      // Local embedding on the worker's own weights (bge-large-en-v1.5 via
      // Ollama). ok:false carries a precise diagnosis, never a bare failure.
      embedLocal?: (text: string) => Promise<
        { ok: true; vector: number[]; model: string } | { ok: false; error: string }
      >;
      // Sovereign dynamic KV cache — live only in the local/sovereign build.
      // In the hosted build every call resolves to a no-op/empty result.
      sovereignKv?: {
        budget: (query: string) => Promise<number>;
        get: (sessionId: string, query: string) => Promise<string | null>;
        put: (sessionId: string, query: string, text: string) => Promise<void>;
        invalidate: (sessionId: string) => Promise<void>;
        stats: (sessionId: string) => Promise<{ sovereign: boolean; entries: number; baseDir?: string }>;
      };
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};
