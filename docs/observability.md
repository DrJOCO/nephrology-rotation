# Observability (Sentry + web-vitals)

Error and performance reporting for the deployed app, built in WS-2 of
[widespread-use-plan.md](widespread-use-plan.md). **Ships dormant** — as of
this writing no Sentry DSN is configured, so nothing is reported and no
network calls to Sentry happen. This doc covers how to turn it on and what
you're agreeing to when you do.

## What this is

`src/utils/telemetry.ts` is the single integration point. Everything else in
the app (`App.tsx`'s error boundary, `store.ts`'s sync-queue warnings,
`pwa.ts`'s service-worker registration, `feedback.ts`'s send failures, and
web-vitals) reports through its four functions — `initTelemetry`,
`captureError`, `captureEvent`, `addBreadcrumb`. None of those callers import
`@sentry/react` directly.

When `VITE_SENTRY_DSN` is unset (the default), every one of those functions
is a no-op: no network call, no console noise, and the Sentry SDK is never
even downloaded (it's loaded via a dynamic `import()`, so it isn't in the
app's boot bundle either way). Reporting only turns on when the app is a
**production build** (`import.meta.env.PROD`) **and** `VITE_SENTRY_DSN` is
set — a local `npm run dev` session never reports, DSN or not.

## Minting a free Sentry DSN

1. Go to [sentry.io](https://sentry.io) and create a free account (the free
   tier covers this app's expected volume many times over).
2. Create an organization if you don't have one, then create a new **project**:
   - Platform: **React**.
   - Name it something like `nephrology-rotation`.
3. Sentry shows you a DSN on project creation — a URL like
   `https://abc123@o123456.ingest.us.sentry.io/7890123`. You can also find it
   later under **Project Settings → Client Keys (DSN)**.
4. Copy that value.

## Where it goes

Add it to `.env.production` (NOT `.env.example`, which stays empty as a
template, and NOT `.env`, which is for local dev):

```
VITE_SENTRY_DSN=https://abc123@o123456.ingest.us.sentry.io/7890123
```

`.env.production` is read at build time by `npm run build` (Vite bakes the
value into the production bundle). Redeploy after adding it
(`npx firebase deploy --only hosting`) — existing open tabs won't pick it up
until they take the update-toast reload, same as any other deploy.

To verify it's live: after deploying, throw a deliberate test error (e.g. from
the browser console on the live site, `throw new Error("sentry test")`
inside a try/catch that calls `captureError`, or just trigger the
ErrorBoundary) and check the Sentry project's Issues stream a minute later.
The issue's **release** tag should match the deployed commit's short SHA
(visible in the admin panel sidebar footer as `build <sha>`, and injected via
Vite's `define` in `vite.config.js` from `git rev-parse --short HEAD`).

## What gets reported

- **Uncaught render errors** — `App.tsx`'s `ErrorBoundary.componentDidCatch`
  calls `captureError`. Sentry's own `window.onerror` /
  `onunhandledrejection` hooks (wired automatically by `Sentry.init`) catch
  everything else.
- **Chunk-reload breadcrumb** — when a stale tab's lazy import fails after a
  deploy and the app auto-reloads once (`reloadOncePerSession` in
  `App.tsx`), a breadcrumb records that this happened, so a report of "the
  app reloaded on me" has context if a real error follows.
- **Curated sync/store signals**, as `captureEvent` calls (searchable
  messages in Sentry, not exceptions) — each one carries only a status
  string, a count, or a fixed enum value, never payload contents:
  - `sync.flush-failed` — a queued offline write failed to flush. Data:
    `{ kind }` (the queue-item kind, e.g. `"setStudentData"`).
  - `sync.clobber-guard-merge` — the offline-write guard found the remote
    doc newer and ran the field-level merge instead of overwriting it. Data:
    `{ fieldCount }` (how many fields were in the queued payload).
  - `sync.tombstone-hit` — a queued write targeted a student an admin had
    already deleted; the write was dropped instead of resurrecting the doc.
    Data: `{ kind }`.
  - `feedback.send-failed` — a student feedback submission failed and was
    queued for retry. Data: `{ tag }` (one of the fixed feedback tags:
    `"Confusing" | "Broken" | "Idea" | "Love it"`).
  - `sw.register-failed` — service worker registration threw. Data:
    `{ message }` (the error's `message` string — a browser/API error
    description, never app data).
  - `web-vitals.CLS` / `web-vitals.LCP` / `web-vitals.INP` — Core Web Vitals
    measurements, each with `{ value, rating }`.
- **Release tag** — every event is tagged with the git short SHA of the
  build that produced it, so an issue maps to a specific deploy.

## The no-PHI policy (hard constraint)

**Nothing patient-shaped is ever attached to a telemetry event.** This is a
hard rule, not a guideline:

- Every `captureEvent`/`captureError` call site in this codebase passes only
  field **names**, **counts**, or fixed **status strings** — never the
  contents of a patient record, a note, a name, or any free-text field.
- `telemetry.ts` additionally runs a `beforeSend` scrub on every outgoing
  Sentry event that strips any key matching a patient-shaped name (`name`,
  `patient`, `patients`, `initials`, `room`, `mrn`, `dob`, `note`, `notes`,
  `diagnosis`, `hpi`, `assessment`, `plan`) from the event's `extra` and
  `contexts` data, recursively. This is a defensive second line — it exists
  in case a future call site or a third-party breadcrumb source picks up
  something patient-shaped by accident. It is not a substitute for care at
  the call site.
- If you add a new `captureEvent`/`captureError` call anywhere in the app:
  only pass primitives (strings/numbers/booleans), and only ones that are
  clearly non-PHI (an enum tag, a count, a boolean, a short fixed message).
  When in doubt, leave it out.
- Per the [D1 decision](widespread-use-plan.md#phase-0--decisions-human-not-agent-work)
  (structural de-identification), the app's data model itself has no
  free-text patient fields going forward — but telemetry's own scrub exists
  independently of that, since Sentry is a third-party service with its own
  data-handling terms (it does not have a BAA with this project).

## Turning it off

Blank out (or remove) `VITE_SENTRY_DSN` in `.env.production` and redeploy.
Every reporting function reverts to a no-op immediately — there is no other
flag or toggle.
