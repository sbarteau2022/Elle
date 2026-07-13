// ============================================================
// CameraContext — one door to the camera, same discipline as the mic.
//
//   · Nothing requests the camera at startup, ever. The PermissionGate modal
//     (kind="camera") appears only when you press a capture button, and the
//     camera is engaged only after you click allow. "Not now" is remembered.
//   · In Electron, consent is enforced below the renderer too: main.cjs
//     default-denies Chromium permission requests, and only flips to allow
//     after your click arrives over IPC (setPermission('camera', …)).
//   · The stream is never held open: captureFrame() opens getUserMedia,
//     grabs exactly one frame onto a canvas, and stops every track before
//     returning — there is no live feed, no continuous watching. A single
//     photo per press, mirroring the "she only hears you while listening is
//     lit" mic discipline with the camera's own equivalent: no frame exists
//     until you asked for one, and none persists after.
// ============================================================
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import PermissionGate from '../components/PermissionGate'

export type CameraConsent = 'granted' | 'denied' | null
const CAMERA_CONSENT_KEY = 'elle_camera_consent'

export type CaptureResult =
  | { ok: true; file: File; dataUrl: string }
  | { ok: false; error: string }

export interface WorkbenchCamera {
  cameraConsent: CameraConsent
  /** Ask for the camera. Opens the consent gate unless already granted; resolves with the decision. */
  requestCamera: () => Promise<boolean>
  /** Drop camera consent everywhere. */
  revokeCamera: () => void
  /** Open the camera, grab one frame, close it. Requests consent first if needed. */
  captureFrame: () => Promise<CaptureResult>
}

const Ctx = createContext<WorkbenchCamera | null>(null)

export function useWorkbenchCamera(): WorkbenchCamera {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkbenchCamera must be used inside <CameraProvider>')
  return v
}

export function CameraProvider({ accent, children }: { accent: string; children: ReactNode }) {
  const [cameraConsent, setCameraConsent] = useState<CameraConsent>(() => {
    const v = localStorage.getItem(CAMERA_CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  })
  const [gateOpen, setGateOpen] = useState(false)
  const gateResolve = useRef<((ok: boolean) => void) | null>(null)

  const decide = useCallback((ok: boolean) => {
    setGateOpen(false)
    const next: CameraConsent = ok ? 'granted' : 'denied'
    localStorage.setItem(CAMERA_CONSENT_KEY, next)
    setCameraConsent(next)
    window.elleNative?.setPermission?.('camera', ok)
    gateResolve.current?.(ok)
    gateResolve.current = null
  }, [])

  const requestCamera = useCallback((): Promise<boolean> => {
    if (cameraConsent === 'granted') return Promise.resolve(true)
    setGateOpen(true)
    return new Promise(res => {
      gateResolve.current?.(false) // a second ask supersedes a dangling one
      gateResolve.current = res
    })
  }, [cameraConsent])

  const revokeCamera = useCallback(() => {
    localStorage.setItem(CAMERA_CONSENT_KEY, 'denied')
    setCameraConsent('denied')
    window.elleNative?.setPermission?.('camera', false)
  }, [])

  const captureFrame = useCallback(async (): Promise<CaptureResult> => {
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, error: 'camera not available in this environment' }
    const ok = await requestCamera()
    if (!ok) return { ok: false, error: 'camera permission denied' }

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      // One frame needs the video's first decoded dimensions — wait for it,
      // bounded, so a stalled camera can't hang the capture forever.
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('camera did not produce a frame in time')), 5000)
        if (video.readyState >= 2) { clearTimeout(t); resolve(); return }
        video.onloadeddata = () => { clearTimeout(t); resolve() }
      })
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return { ok: false, error: 'canvas 2d context unavailable' }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9))
      if (!blob) return { ok: false, error: 'frame capture produced no image data' }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      return { ok: true, file, dataUrl }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    } finally {
      // Never held open: every track stops before this returns, capture or not.
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [requestCamera])

  return (
    <Ctx.Provider value={{ cameraConsent, requestCamera, revokeCamera, captureFrame }}>
      {children}
      {gateOpen && <PermissionGate accent={accent} kind="camera" onAllow={() => decide(true)} onDeny={() => decide(false)} />}
    </Ctx.Provider>
  )
}
