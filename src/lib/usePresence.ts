// ============================================================
// usePresence — she can tell where your head is.
//
// Consumes the AirPods head-pose stream (window.elleNative.onHeadMotion,
// { pitch, roll, yaw } radians from CMHeadphoneMotionManager). From the raw
// pose it derives the things the UI actually wants:
//   facing  — are you roughly looking at the screen (small yaw)
//   away    — turned away past a threshold (she can pause when you leave)
//   nod     — a recent downward pitch flick (an embodied "yes")
//   shake   — a left-right-left yaw flick (an embodied "no")
//   pose    — smoothed pitch/roll/yaw for subtle parallax / an orb that tracks
//
// nod and shake are 250ms pulses, not levels — consumers treat them as
// events (VoiceContext turns them into gesture.nod / gesture.shake on the
// command bus when listen mode is on).
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
  shake: boolean
  pose: { pitch: number; roll: number; yaw: number }
}

const AWAY_YAW = 0.9          // ~50° turn = you've looked away
const FACING_YAW = 0.45       // within ~26° = facing the screen
const NOD_PITCH_DELTA = 0.22  // a quick pitch dip that springs back = a nod
const SHAKE_YAW_DELTA = 0.12  // each swing of a head-shake must travel this far

export function usePresence(): Presence {
  const [state, setState] = useState<Presence>({
    available: false, facing: true, away: false, nod: false, shake: false,
    pose: { pitch: 0, roll: 0, yaw: 0 },
  })
  const smooth = useRef({ pitch: 0, roll: 0, yaw: 0 })
  const pitchHist = useRef<number[]>([])
  const yawHist = useRef<number[]>([])
  const nodCooldown = useRef(0)
  const shakeCooldown = useRef(0)

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

      const now = Date.now()

      // Nod detection: track recent pitch, look for a dip-and-return.
      const hist = pitchHist.current
      hist.push(m.pitch); if (hist.length > 12) hist.shift()
      let nod = false
      if (hist.length >= 6 && now > nodCooldown.current) {
        const min = Math.min(...hist), max = Math.max(...hist)
        const last = hist[hist.length - 1]
        // dipped down by the threshold and came most of the way back up
        if (max - min > NOD_PITCH_DELTA && last > min + (max - min) * 0.6) {
          nod = true; nodCooldown.current = now + 1200
        }
      }

      // Shake detection: count yaw direction reversals where each swing
      // travels far enough to be deliberate. Two reversals = left-right-left
      // (or the mirror) — a slow single glance to the side never has two.
      const yh = yawHist.current
      yh.push(m.yaw); if (yh.length > 14) yh.shift()
      let shake = false
      if (yh.length >= 8 && now > shakeCooldown.current) {
        let reversals = 0, lastDir = 0, extreme = yh[0]
        for (let k = 1; k < yh.length; k++) {
          const d = yh[k] - yh[k - 1]
          const dir = d > 0.005 ? 1 : d < -0.005 ? -1 : 0
          if (dir !== 0) {
            if (lastDir !== 0 && dir !== lastDir && Math.abs(yh[k - 1] - extreme) > SHAKE_YAW_DELTA) {
              reversals++; extreme = yh[k - 1]
            }
            lastDir = dir
          }
        }
        if (reversals >= 2) {
          shake = true; shakeCooldown.current = now + 1500; yawHist.current = []
        }
      }

      const yawMag = Math.abs(s.yaw)
      setState({
        available: true,
        facing: yawMag < FACING_YAW,
        away: yawMag > AWAY_YAW,
        nod,
        shake,
        pose: { pitch: s.pitch, roll: s.roll, yaw: s.yaw },
      })
      if (nod || shake) setTimeout(() => mounted && setState(st => ({ ...st, nod: false, shake: false })), 250)
    })

    return () => { mounted = false; native.offHeadMotion?.() }
  }, [])

  return state
}
