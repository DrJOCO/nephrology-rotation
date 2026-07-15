# Cloud Functions (WS-4)

Server-side foundation for the nephrology-rotation app. Node 20,
`firebase-functions` v2 API, its own npm workspace (not wired into the root
`package.json`'s workspaces — the root stays a plain Vite app).

## What's here

| Function | Trigger | Purpose |
|---|---|---|
| `onRotationDeleted` | `rotations/{code}` delete | Best-effort cleanup backstop: batched delete of `students`, `team`, `studentTombstones`, `feedback`, `feedbackAbuse` subcollections. Deleting a doc does NOT cascade in Firestore, and the client loop in `store.deleteRotation` never touched `feedback` — this closes that gap. |
| `onStudentWrite` | `rotations/{code}/students/{id}` write | Maintains `studentCount` and `lastStudentActivityAt` aggregate fields on the rotation doc (transaction, clamped at 0). The client reads `studentCount` to avoid an N+1 fan-out. |
| `onFeedbackCreate` | `rotations/{code}/feedback/{id}` create | Re-validates shape/length server-side; enforces a per-student daily rate limit (>20/day → deletes the excess entry, writes a `feedbackAbuse/{studentId}` marker). |
| `onAdminInviteCreated` | `adminInvites/{emailKey}` create | Writes a `mail/{autoId}` doc in the **Firebase "Trigger Email" extension** contract (`{ to, message: { subject, html } }`) to send the invite email. |

## Layout

```
functions/
  package.json        own deps (firebase-admin, firebase-functions) + scripts
  tsconfig.json       NodeNext ESM → lib/
  eslint.config.js    local minimal flat config (root config is React-only)
  vitest.config.ts    node env, test/**/*.test.ts
  src/
    index.ts          entrypoint: setGlobalOptions + re-exports
    admin.ts          single Admin SDK app + Firestore handle
    lib/deleteCollection.ts   batched collection delete
    on*.ts            the four triggers (pure core + thin wrapper each)
  test/
    fakeFirestore.ts  in-memory Firestore double
    *.test.ts         unit tests against the fake
```

## Build / test locally

```sh
cd functions
npm ci
npm run typecheck
npm run lint
npm run build     # tsc → lib/src/index.js
npm test          # vitest, 34 tests, no emulator needed
```

Root convenience passthroughs: `npm run functions:build`, `npm run functions:test`.

### Why the tests don't use the emulator

Each function is split into a **pure core** (`applyStudentAggregate`,
`processFeedbackCreate`, `buildMailDoc`, `deleteCollection`, …) and a thin
trigger wrapper. The cores are tested against an in-memory Firestore double
(`test/fakeFirestore.ts`), so the suite runs with no Java and no emulator.

This is deliberate: the Firestore emulator needs **Java 11+**, and the current
build machine has **Java 1.8** (too old — `firebase emulators:exec` fails to
boot Firestore there). CI (`.github/workflows/ci.yml`, `functions` job) runs
build + these unit tests on Node 20. If you later want true end-to-end emulator
integration tests, run them on a machine/CI runner with Java 11+ via
`firebase emulators:exec --only firestore,functions "npm test"` and gate them
behind that toolchain — the pure-core design keeps that additive.

## Deploy runbook

> **Do NOT deploy as part of WS-4.** Functions land later, on Dr. Cheng's go.
> This section is the runbook for that day.

The project is on the **Blaze** plan (done 2026-07-06), so functions are
deployable.

### Ordering

Deploy functions **before** anything that assumes them. Right now **nothing**
assumes them — the client is written to work both before and after deploy:

- `store.listRotations` uses `studentCount` **only when present**, else falls
  back to counting `students` docs. Legacy rotations keep working forever.
- `store.deleteRotation` still runs its own client-side cleanup loops; the
  trigger is a backstop, not a prerequisite.
- The `mail` rules block already denies all client access; the
  `onAdminInviteCreated` writes accumulate harmlessly until the Trigger Email
  extension is installed (see below).

So functions can be deployed **standalone**, in any order relative to rules and
hosting. If a future workstream makes the client depend on a function, that
workstream must deploy the function first.

### Command

```sh
# from the repo root, with the functions build fresh (predeploy runs it too)
npx firebase deploy --only functions
```

### First-deploy prompts / IAM

On the very first functions deploy for this project, expect Firebase/GCP to:

- Enable required APIs (`cloudfunctions`, `cloudbuild`, `artifactregistry`,
  `eventarc`, `run`, `pubsub`) — accept the prompt, one-time.
- Create/grant service accounts. v2 functions run on Cloud Run + Eventarc; the
  default compute service account needs `roles/eventarc.eventReceiver` and the
  Firestore trigger needs the Firestore→Eventarc path enabled. The CLI usually
  provisions these automatically; if a trigger deploy fails with a permissions
  error, re-run once (propagation lag) before investigating IAM by hand.
- Ask to clean up artifacts of failed builds — safe to accept.

Deploy one function at a time if a first full deploy is flaky:
`npx firebase deploy --only functions:onStudentWrite`.

### Cost expectations at cohort scale

Cohorts are ~2–5 students over ~2 weeks. Invocation volume:

- `onStudentWrite`: a few writes per student per day → low hundreds/cohort.
- `onFeedbackCreate`: a handful per student → low tens/cohort.
- `onRotationDeleted`: a few times per cohort turnover.
- `onAdminInviteCreated`: single digits, ever.

That is **well inside the Blaze free tier** (2M invocations, 400k GB-s, 200k
CPU-s free per month). Realistic cost at this scale: **$0/mo**, pennies if it
ever leaves free tier. Keep the $10 / $50 budget alerts (D3) as the safety net.
`maxInstances: 10` (set in `src/index.ts`) caps any runaway fan-out.

### Rollback

- Delete a single function: `npx firebase functions:delete <name>`
  (e.g. `onStudentWrite`). The client tolerates the aggregate not being
  maintained — `listRotations` falls back to counting — so deleting
  `onStudentWrite` is safe at any time.
- Roll back to a previous version: check out the prior commit/tag and
  `npx firebase deploy --only functions` to redeploy that code.
- `onRotationDeleted` and `onFeedbackCreate` are pure backstops; deleting them
  reverts to exactly the pre-WS-4 client behavior with no data risk.

## Trigger Email extension (NOT installed yet)

`onAdminInviteCreated` writes to the top-level `mail` collection using the
[Trigger Email](https://extensions.dev/extensions/firebase/firestore-send-email)
extension's document contract:

```json
{ "to": "invitee@example.org", "message": { "subject": "...", "html": "..." } }
```

The extension is **not installed**. Until it is, these `mail` docs simply
accumulate in Firestore and **nothing sends** — this is harmless (the `mail`
collection is denied to all clients by `firestore.rules`, and the docs are
small). When the extension is installed it will pick up new docs; the backlog
of already-written docs will also be processed unless cleared first.

### Install & configure later

```sh
npx firebase ext:install firebase/firestore-send-email
```

During configuration:

- **Collection**: `mail` (must match — that's what the function writes to).
- **SMTP connection URI**: an SMTP provider (SendGrid, Mailgun, AWS SES, or a
  Gmail app-password URI for low volume). Store credentials as a secret.
- **Default FROM**: a verified sender on the sending domain (e.g.
  `no-reply@<yourdomain>`). Configure SPF/DKIM for that domain or hospital
  mail servers will spam-folder the invites (this app has prior deliverability
  pain on hospital networks — see WS-6).
- Leave `to`/`message` field mapping at defaults — they match the contract.

After install, send a test invite from the admin panel and confirm a `delivery`
sub-field appears on the new `mail` doc with `state: SUCCESS`. To avoid sending
the pre-install backlog, delete stale `mail` docs before installing.
