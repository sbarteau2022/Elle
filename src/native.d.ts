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

declare global {
  interface Window {
    elleNative?: {
      isElectron: boolean;
      getCapabilities: () => Promise<Capabilities>;
      onHeadMotion: (cb: (data: HeadMotion) => void) => void;
      offHeadMotion: () => void;
      headMotionAvailable: () => Promise<boolean>;
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};
