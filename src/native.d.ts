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
      onHeadMotion: (cb: (data: HeadMotion) => void) => void;
      offHeadMotion: () => void;
      headMotionAvailable: () => Promise<boolean>;
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
