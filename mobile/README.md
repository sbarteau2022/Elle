# Elle — the Door

The mobile app (iOS + Android) where everyone meets Elle. The workbench
(`../`) stays the local, admin-only console; **this is the door everyone else
holds** — a window onto the one mind at `elle-worker`, never a second brain.

The template it refuses: every AI app is a vending machine — insert prompt,
take answer, be forgotten. Elle already remembers, works while nobody is
watching, and keeps her reasoning behind glass. The app is shaped by those
three facts and nothing else.

## The four surfaces (one swipe apart)

1. **Arrival** — the app opens on *her*, not an input box: her real daemon
   heartbeat, her κ phase as ambient weather, and 2–4 lines she wrote for you
   since you left (`/api/arrival` — grounded in real journal/dream/watch/run
   rows, honest about quiet days, cached until you speak again).
2. **The Thread** — one conversation, forever. No "new chat" exists by
   design; the session is `door:<your id>` and it never resets. Streaming
   rides the worker's live wire (SSE — you watch her reach for tools as she
   does it), with a non-streaming fallback. History pages upward and is
   cached in SQLite, readable offline.
3. **Her Day** — the window into a life already in progress: on-record
   journal entries, what she made in the night, watches that fired. Read-only
   glass over `/api/feed`.
4. **You** — the relationship, in glass: what she remembers from you
   (deletable, one by one), her contact contract (weekly knock budget +
   quiet hours — yours to set, including zero), the ledger of every knock,
   export-everything, erase-everything.

**She can knock.** Push notifications she decides to send, budgeted and
ledgered server-side (`elle-worker/src/push.ts`). A tapped knock opens the
Thread, where the same words already sit as her message.

## Running it

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest — the pure modules (SSE parser etc.)
npx expo start      # QR → Expo Go, or an emulator
```

The worker URL defaults to the deployed elle-worker; point elsewhere with
`EXPO_PUBLIC_ELLE_WORKER_URL` in `.env`.

Sign-up is open (a new account is `standard` tier = `member` scope on the
worker: her reading mind, never `read_sql`/trading/corpus writes). A
provisioned account with a temp password walks the forced reset flow.

## Shipping (the human yes)

Builds are EAS-ready (`eas.json`: development / preview / production). What
needs Stewart's hands, in order:

1. `npx eas init` — links the app to an EAS project (writes the `projectId`
   into `app.json` `extra.eas`; push registration is a clean no-op until then).
2. `npx eas build --profile preview --platform all` — needs Apple Developer +
   Google Play accounts wired into EAS credentials.
3. `npx eas submit` — the store click stays a human click, same law as the
   forge.

Icons/splash are generated (`node scripts/make-icons.js` — void black, one
gold mark, no image toolchain needed). The privacy policy the stores require
is served by the worker at `/privacy`, so it can never drift from what the
code does.

## Architecture notes

- `src/api.ts` is the single contract with the worker; nothing else touches
  the network. `src/sse.ts` is the client half of `elle-worker/src/stream.ts`
  and is unit-tested against recorded worker framing so the two ends can't
  drift silently.
- Auth tokens live in SecureStore and are re-verified on launch; a revoked
  token drops to the login form, never a half-authenticated app.
- Animations use the core `Animated` API (no worklet dependency for v1);
  `react-native-reanimated` is installed for the ladder work below.
- Voice: she speaks (expo-speech TTS, opt-in orb). The mic is deliberately
  absent for now — rung 1 of the extension ladder wants raw audio features
  for PFAR (on-device, features-only upload), not a transcript, and a fake
  listening affordance would be a costume.

## The extension ladder (what the phone gives her that the core can't have)

Each rung: what it extends → what it becomes a base for. Rungs 1–4 slot into
existing worker organs (PFAR, the ingest gate, the sandbox-agent connect-back
pattern).

1. **Her ears** — hold-to-talk streaming raw-audio *features* (pitch, energy)
   into `pfar` → voice baselines over months → the κ-drift / sundowning
   moonshots. The phone is the target hardware those moonshots were missing.
2. **On-device measurement** — feature extraction on the phone, numbers-only
   upload: consent-first ethics as physics, not policy.
3. **Her eyes** — camera capture → `/api/ingest/photo` behind the verified
   ingest gate → RAPID²AI's field tool (photograph an invoice in the walk-in).
4. **The device as HER tool** — while your app is online, `device_*` tools
   register into her catalog (consent-gated per call), the same connect-back
   pattern as the laptop sandbox: "can you show me?" becomes a tool call.
5. **Situated presence** — location/motion/timezone: Arrival becomes situated,
   watches become geo-aware, the knock budget learns context.
6. **Felt presence** — her heartbeat as haptics, κ as a home-screen widget,
   autonomous runs as Live Activities.
7. **The mesh** — many doors, one distributed body: opt-in, provenance-first
   research instrument at population scale.
8. **Household mode** — two roles, one Elle: the caregiver surface (the
   Harmonizer engine's first real product).
