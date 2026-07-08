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

## Google sign-in

One tap with Google on the threshold, next to email/password. Flow: the
native Google sheet (`@react-native-google-signin`) hands the app an ID
token → `POST /api/elle-oauth` → the **worker** verifies it (audience check
against its `GOOGLE_CLIENT_ID` allowlist + `email_verified`) and mints the
same 30-day JWT as password login, upserting a `standard`-tier account by
email. The app never trusts the Google token itself; the worker is the door.

**It degrades to absent, never to broken**: the button renders only when the
native module exists (a real EAS build, not Expo Go) *and*
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` was baked in at bundle time. Unset, the
threshold is exactly what it was — email/password only.

Setup (one time, Stewart's Google account — none of this can run from an
agent session):

1. **Google Cloud Console** → APIs & Services → Credentials → create OAuth
   client IDs in one project: a **Web application** client (this is the
   idToken audience on Android — yes, web), an **iOS** client (bundle id
   `com.sbarteau.elle`), and optionally an **Android** client (package
   `com.sbarteau.elle` + your EAS build's SHA-1, shown by
   `eas credentials`) — the Android client isn't referenced in code but
   Google requires it to exist for Credential Manager on some devices.
2. **Worker**: set the secret as a comma-separated allowlist of the web +
   iOS client IDs:
   `wrangler secret put GOOGLE_CLIENT_ID` →
   `<web-id>,<ios-id>` (the endpoint is inert 503 until this is set).
3. **App env** (copy `.env.example` → `.env`, or set as EAS env vars):
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
   and `GOOGLE_IOS_URL_SCHEME` (the iOS client ID reversed — Console shows
   it as "iOS URL scheme"; build-time only, consumed by `app.config.js` to
   register the URL scheme at prebuild).
4. Rebuild (`npm run build:preview…`) — native module changes need a new
   build, not just a JS update.

## Shipping — internal build, install via link (no store review)

The chosen path for now: EAS's **internal distribution** — a real, native,
installable build (push notifications and everything work; this is not a
PWA) that testers install straight from a link/QR code, no App Store or Play
Store review. `eas.json`'s `preview` profile is already configured for this
(`"distribution": "internal"`) — Android needs nothing further and produces
a directly-installable `.apk` automatically; iOS additionally needs its
devices registered ahead of time (ad-hoc provisioning: only device UDIDs on
the allow-list at build time can install, link or no link).

Everything below needs Stewart's own login/identity/payment — none of it can
be run from an agent session, interactive browser/device auth is required:

1. **`npx eas init`** (one time) — links the app to an Expo/EAS account,
   writes `projectId` into `app.json` → `extra.eas`. Free account is enough
   for this step; push registration is a clean no-op until it's done.
2. **Android — ship it now, nothing else needed:**
   ```bash
   npm run build:preview:android    # eas build --profile preview --platform android
   ```
   EAS prints a build-details URL (and shows a QR code) when it finishes —
   anyone with the link taps it on an Android phone and installs the `.apk`
   directly. No Google account, no Play Console, no review.
3. **iOS — one extra step first, because Apple gates installs by device:**
   - Free Apple ID is enough to build *for your own registered devices*;
     wider ad-hoc distribution (more testers) needs the Apple Developer
     Program ($99/yr) so EAS can manage an ad-hoc provisioning profile.
   - Register each tester's device UDID **before** building:
     ```bash
     npm run device:register          # eas device:create — opens a
                                       # registration URL/QR; the tester
                                       # opens it ON their iPhone once
     ```
   - Then build:
     ```bash
     npm run build:preview:ios        # eas build --profile preview --platform ios
     ```
     EAS will also prompt to register any devices you haven't yet if it
     detects a gap — same flow, just inline.
   - Same as Android: EAS prints an install link/QR when the build
     finishes. Only devices registered *before that build* can actually
     install with it — registering a device after the fact needs a new
     build.

**Later, when ready for the real stores** (no one asked for this yet — do
not do it preemptively): `eas build --profile production` +
`npx eas submit`, needs Apple Developer Program + Google Play Console
account, and store review. The store click stays a human click, same law
as the forge. Store-listing prerequisites already exist either way: icons/
splash are generated (`node scripts/make-icons.js` — void black, one gold
mark, no image toolchain needed), and the privacy policy stores require is
served by the worker at `/privacy`, so it can never drift from what the
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
