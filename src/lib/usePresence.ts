// ============================================================
// usePresence — she can tell where your head is.
//
// Consumes the AirPods head-pose stream (window.elleNative.onHeadMotion,
// { pitch, roll, yaw } radians from CMHeadphoneMotionManager). From the raw
// pose it derives the things the UI actually wants:
//   facing  — are you roughly looking at the screen (small yaw)
//   away    — turned away past a threshold (she can pause when you leave)
//   nod     — a recent downward pitch flick (an embodied "yes")
//   pose    — smoothed pitch/roll/yaw for subtle parallax / an orb that tracks
//
// It is entirely optional: without the native addon (non-macOS, not built, or
// AirPods disconnected) `available` is false and everything reads neutral, so
// no feature that leans on it ever breaks.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import type { HeadMotion } from '../native'

export interface Presence {
  available: boolean
  facing: boolean
  away: boolean
  nod: boolean
  pose: { pitch: number; roll: number; yaw: number }
}

const AWAY_YAW = 0.9          // ~50° turn = you've looked away
const FACING_YAW = 0.45       // within ~26° = facing the screen
const NOD_PITCH_DELTA = 0.22  // a quick pitch dip that springs back = a nod

export function usePresence(): Presence {
  const [state, setState] = useState<Presence>({
    available: false, facing: true, away: false, nod: false,
    pose: { pitch: 0, roll: 0, yaw: 0 },
  })
  const smooth = useRef({ pitch: 0, roll: 0, yaw: 0 })
  const pitchHist = useRef<number[]>([])
  const nodCooldown = useRef(0)

  useEffect(() => {
    const native = window.elleNative
    if (!native?.onHeadMotion) return
    let mounted = true
    native.headMotionAvailable?.().then((ok) => { if (mounted && ok) setState(s => ({ ...s, available: true })) }).catch(() => {})

    native.onHeadMotion((m: HeadMotion) => {
      if (!mounted) return
      // Exponential smoothing for the parallax pose.
      const s = smooth.current
      const a = 0.25
      s.pitch += a * (m.pitch - s.pitch)
      s.roll += a * (m.roll - s.roll)
      s.yaw += a * (m.yaw - s.yaw)

      // Nod detection: track recent pitch, look for a dip-and-return.
      const hist = pitchHist.current
      hist.push(m.pitch); if (hist.length > 12) hist.shift()
      let nod = false
      const now = Date.now()
      if (hist.length >= 6 && now > nodCooldown.current) {
        const min = Math.min(...hist), max = Math.max(...hist)
        const last = hist[hist.length - 1]
        // dipped down by the threshold and came most of the way back up
        if (max - min > NOD_PITCH_DELTA && last > min + (max - min) * 0.6) {
          nod = true; nodCooldown.current = now + 1200
        }
      }

      const yawMag = Math.abs(s.yaw)
      setState({
        available: true,
        facing: yawMag < FACING_YAW,
        away: yawMag > AWAY_YAW,
        nod,
        pose: { pitch: s.pitch, roll: s.roll, yaw: s.yaw },
      })
      if (nod) setTimeout(() => mounted && setState(st => ({ ...st, nod: false })), 250)
    })

    return () => { mounted = false; native.offHeadMotion?.() }
  }, [])

  return state
}
