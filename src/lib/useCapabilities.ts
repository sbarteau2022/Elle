// ============================================================
// useCapabilities — what this machine can actually do.
//
// Reads the capability map main.cjs computes (electron/native), so a panel
// never guesses from navigator.platform or assumes macOS. Outside Electron
// (plain browser) it reads as { platform: 'web' } with every native feature
// false — mic/camera/speech themselves are Web APIs and don't need this,
// this is specifically for OS-native features that need the main process.
// ============================================================
import { useEffect, useState } from 'react'
import type { Capabilities } from '../native'

const FALLBACK: Capabilities = { platform: 'web', headMotion: false }

export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(FALLBACK)

  useEffect(() => {
    let mounted = true
    window.elleNative?.getCapabilities?.()
      .then((c) => { if (mounted) setCaps(c) })
      .catch(() => { /* stay on FALLBACK */ })
    return () => { mounted = false }
  }, [])

  return caps
}
