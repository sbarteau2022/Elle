import { useEffect, useState } from 'react';

export interface HeadMotion {
  pitch: number;
  roll: number;
  yaw: number;
}

interface ElleNative {
  isElectron: boolean;
  onHeadMotion: (cb: (data: HeadMotion) => void) => void;
  offHeadMotion: () => void;
}

function getNative(): ElleNative | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { elleNative?: ElleNative };
  return w.elleNative?.isElectron ? w.elleNative : null;
}

const MOTION_HZ = 30;
const MOTION_INTERVAL_MS = 1000 / MOTION_HZ;

export function useHeadMotion() {
  const [motion, setMotion] = useState<HeadMotion | null>(null);
  const native = getNative();
  const available = native !== null;

  useEffect(() => {
    if (!native) return;
    let lastTs = 0;
    native.onHeadMotion((data: HeadMotion) => {
      const now = Date.now();
      if (now - lastTs < MOTION_INTERVAL_MS) return;
      lastTs = now;
      setMotion(data);
    });
    return () => native.offHeadMotion();
  }, [native]);

  return { motion, available };
}
