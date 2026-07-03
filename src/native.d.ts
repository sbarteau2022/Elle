// Ambient types for the Electron preload bridge (window.elleNative) and the
// Web Speech APIs the voice pipeline uses. Kept loose on purpose — these are
// host capabilities that may be absent (non-Electron, non-macOS, no speech).

export interface HeadMotion { pitch: number; roll: number; yaw: number }

declare global {
  interface Window {
    elleNative?: {
      isElectron: boolean;
      onHeadMotion: (cb: (data: HeadMotion) => void) => void;
      offHeadMotion: () => void;
      headMotionAvailable: () => Promise<boolean>;
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};
