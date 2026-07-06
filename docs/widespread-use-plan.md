# Widespread-Use Plan — from single-attending app to multi-site platform

_Drafted 2026-07-05. Assumes the July 2026 sync-hardening work is merged: per-field
timestamps (`fieldStamps`), patient `removedPatients`, deletion tombstones, article
ids, student feedback collection, admin "View as student" preview, per-view code
splitting, Workbox SW with update toast._

This document is written for agent execution: each workstream (WS) is a
self-contained spec an implementation agent (opus/sonnet) can be handed, with
current-state file references, target design, migration strategy, verification,
and a definition of done. **A live cohort may be running at any time — every
workstream must keep old clients and existing Firestore data working, or be
gated behind a feature flag until a rotation gap.**

---

## How to execute this plan

- **Waves**: run workstreams within a wave as parallel worktree agents; waves are
  sequential. Wave 1 (WS-1..4) has no dependencies. Wave 2 (WS-5..7) is the core
  and depends on Wave 1. Wave 3 (WS-8..10) depends on WS-4. Wave 4 (WS-11..15)
  is mostly independent polish that should land after Wave 2.
- **Model guidance**: `opus` for anything touching security rules, auth, sync
  merging, or migrations; `sonnet` for UI surfaces, scripts, and mechanical
  sweeps. Anything marked **(L)** should get a design-review round trip (agent
  proposes design → human/lead approves → agent implements).
- **Every agent prompt must include**: the live-cohort compatibility constraint;
  the repo quality bar (`npm run typecheck && npm run lint && npm test` green,
  focused new tests, repo comment discipline, no drive-by reformatting); the
  instruction to commit per logical unit and report design decisions.
- **Decision gates (Phase 0) must be answered by Dr. Cheng before Wave 2+ items
  that reference them.**

---

## Phase 0 — Decisions (human, not agent work)

- **D1 — Compliance posture. ✅ DECIDED 2026-07-05: route (b), structural
  de-identification** — Dr. Cheng confirmed free-text patient descriptions can
  be given up. WS-11b is the binding spec; WS-9 and WS-14 should assume no
  patient free text in the data model. Original options for the record:
  - (a) **BAA route**: sign the Google Cloud BAA, restrict the project to
    HIPAA-eligible services, add audit logging → WS-11a.
  - (b) **Structural de-identification**: redesign the consult log so PHI cannot
    be entered (structured topic + acuity + service pickers, no free text, no
    initials/room) → WS-11b. Cheaper, safer for open distribution; loses some
    logbook utility.
  - D1 shapes WS-9 (what the student doc may contain) and WS-14 (what exports
    may contain). **Decide first.**
- **D2 — Tenancy/distribution model.** Recommended: **single Firebase project,
  org-scoped documents** (see WS-5) operated as one service. Alternative
  (project-per-institution, distributed as a template repo) changes WS-5/6/7
  substantially — only choose it if institutions demand data custody.
- **D3 — Billing ownership.** Firestore/Functions costs at scale need an owner
  (Blaze plan + budget alerts). Prerequisite for WS-4 (Functions require Blaze).
- **D4 — Distribution surface.** PWA-only (status quo, recommended initially)
  vs app-store wrapper (revisit `docs/app-store-readiness.md` after Wave 2).

---

## Phase 1 — Foundations (Wave 1: no dependencies, start anytime)

### WS-1 — Firestore rules test harness _(sonnet, S)_

**Why.** `firestore.rules` (270+ lines) is the entire server-side security
model and is currently verified by eyeball only. Every later workstream edits
it; blind rules edits at multi-tenant scale are how cross-tenant leaks happen.

**Current state.** `firebase.json` configures auth+firestore emulators
(`npm run emulators`); no `@firebase/rules-unit-testing` setup; CI
(`.github/workflows/ci.yml`, job `verify`) runs typecheck/lint/test/build only.

**Design.**
- Add `@firebase/rules-unit-testing` as devDependency; new test dir
  `rules-tests/` (plain vitest, separate config so the emulator-needing suite
  doesn't slow the unit suite: `npm run test:rules` boots the firestore
  emulator via `firebase emulators:exec`).
- Cover the invariants that exist TODAY before anything new lands: student can
  only write own doc; tombstoned student create/update denied (students and
  team); feedback create shape + student-cannot-read; admin scoping via
  ownerUid/adminUids/ownerEmail; adminInvites claim flow; deny-all fallthrough.
- CI: add a `rules` job (needs Java — use `actions/setup-java`) running
  `npm run test:rules`.

**DoD.** Rules suite red/green demonstrably (mutation-test one rule by hand),
CI green, README section on running rules tests.

### WS-2 — Observability: error + performance reporting _(sonnet, S)_

**Why.** Today the only failure signal is a student telling Dr. Cheng. The new
feedback button helps; it does not catch crashes, SW update failures, or sync
errors that `console.warn` currently swallows (store.ts has ~30 warn sites).

**Design.**
- Add Sentry (`@sentry/react`) initialized in `src/main.tsx`, gated on PROD +
  a `VITE_SENTRY_DSN` env (absent → no-op, so forks/emulator dev don't report).
- Wire the existing `ErrorBoundary` (`src/App.tsx`) to `Sentry.captureException`;
  breadcrumb the chunk-reload path (`reloadOncePerSession`).
- Route a curated subset of store warnings to Sentry as events with context
  (queue flush failure, clobber-guard merges, tombstone hits) — no PHI: never
  attach payload contents, only field names/counts. This constraint is hard.
- Release tagging: inject the Workbox build id / git SHA via Vite define so
  errors map to deploys. Add `web-vitals` reporting as Sentry metrics.
- Scrub rule: `beforeSend` strips anything matching patient-shaped keys.

**DoD.** Deliberate test error appears in Sentry with release tag; no network
calls when DSN unset; bundle size delta reported (<30 kB gz or lazy-loaded).

### WS-3 — Feature flags / remote config _(sonnet, S)_

**Why.** Staged rollouts and kill switches are prerequisites for shipping risky
scale changes mid-cohort (WS-6 auth changes, WS-8 content pipeline).

**Design.**
- New top-level doc `appConfig/flags` readable by any signed-in user
  (rules: read-only for all authed; write bootstrap-admin only for now, org
  owner later per WS-5).
- `src/utils/flags.ts`: local hardcoded defaults → overridden by a one-shot
  fetch at boot (cached in localStorage, stale-while-revalidate; listener
  optional later). API: `getFlag("newAuth") : boolean`, plus a React hook.
- Admin: minimal flags panel in SettingsTab, visible to bootstrap admin only.
- First real flags: `feedbackEnabled`, `previewEnabled`, `workboxToastForced`
  (see WS-15 forced-upgrade), all defaulting to current behavior.

**DoD.** Flag flips propagate to a fresh client load without deploy; offline
boot uses cached/default values; unit tests for precedence (default < cached <
fetched).

### WS-4 — Cloud Functions foundation _(opus, M; requires D3/Blaze)_

**Why.** Everything currently trusts client code + rules. Scale needs a server
seat for: cascading deletes, aggregates, invite email delivery, rate limiting,
and (WS-9) server-authoritative timestamps.

**Current state.** No `functions/` workspace; deletes are client-side loops
(`store.deleteRotation`, store.ts — students, team, tombstones, rotation,
rotationCodes sequentially); `listRotations` does one `getDocs` per rotation
for student counts (store.ts `listRotations`); feedback has no abuse throttle.

**Design.**
- `functions/` TypeScript workspace (Node 20, firebase-functions v2), its own
  package.json, wired into `firebase.json` + emulators + CI (build + unit
  tests with `firebase-functions-test`).
- First four functions:
  1. `onRotationDeleted` — firestore trigger cleaning subcollections
     (students/team/tombstones/feedback) so client-side loops become
     best-effort, not load-bearing.
  2. `onStudentWrite` — maintains `rotations/{code}.studentCount` and
     `lastStudentActivityAt` aggregate fields; then simplify
     `store.listRotations` to read the aggregate (removes the N+1).
  3. `onFeedbackCreate` — per-student rate limit (e.g. >20/day → flag doc,
     optionally delete) and length re-validation.
  4. `sendAdminInviteEmail` — callable/trigger on `adminInvites` create (uses
     the "Trigger Email" extension or a mail API; keeps WS-7 unblocked).
- Deploy script + docs; functions deploy stays manual like hosting.

**DoD.** Emulator tests for all four; `deleteRotation` client loop demoted to
best-effort with the trigger as source of truth; listRotations reads
aggregates with fallback to the old path when fields are missing.

---

## Phase 2 — Multi-tenancy and auth (Wave 2: the core)

### WS-5 — Organizations: data model + rules + migration _(opus, L — design review required; depends WS-1)_

**Why.** The security model is single-tenant by construction:
`firestore.rules` hardcodes `signedInEmailLower() == 'joncheng5@gmail.com'`
(`isBootstrapAdminEmail`) and a legacy owner uid (`isBootstrapLegacyOwnerUid`);
`isAdmin()` means "has a doc in the global `admins` collection", i.e. every
admin is an admin of the whole service; `adminInvites` are minted by the
bootstrap admin only.

**Target design (D2 = single project, recommended).**
- New `orgs/{orgId}`: `{ name, createdAt, ownerUid, plan }` +
  `orgs/{orgId}/members/{uid}`: `{ role: "owner"|"attending"|"coordinator",
  email, addedAt }`. Roles: owner = org settings + member roster; attending =
  create/manage own rotations + content; coordinator = read-only dashboards +
  exports.
- **Keep `rotations/{code}` top-level** (codes are already globally unique via
  `rotationCodes/{code}`); add `orgId` to the rotation doc. This avoids moving
  subcollections (students/team/tombstones/feedback) and keeps every existing
  client path and cache key (`neph_rotation_*`) working — the decisive reason
  not to nest rotations under orgs.
- Rules rewrite: `rotationAllowsAdmin(data)` gains an org-membership clause
  (`isOrgMember(data.orgId, ['owner','attending'])` via `get()`); the
  bootstrap-email clause becomes `isServiceAdmin()` backed by a
  `serviceAdmins/{uid}` collection (seeded with Dr. Cheng) instead of a
  hardcoded literal; the legacy-uid clause is deleted (it was migration
  shimming, verify via WS-1 tests that GS-era rotations still pass through
  ownerUid/adminUids). Watch the rules access-call budget: org membership adds
  one `get()`; current worst case is 4 — recount every match block, cap 10.
- `admins` collection remains as "may use the admin panel at all" gate;
  org-scoping is the new authorization layer on top. Invites move to
  `orgs/{orgId}/invites/{emailKey}` claimable by the invitee (same claim
  pattern as today's `adminInvites`, rules ported + rules-tested).
- **Migration** (script in `scripts/`, run once by service admin): create
  `orgs/pnmg` owned by Dr. Cheng; stamp `orgId: "pnmg"` on all existing
  rotations; copy current admins into members. Old clients ignore `orgId`;
  rules keep the ownerUid/adminUids clauses so pre-migration rotations work.

**Split for agents.** 5a rules+model+migration script (opus), 5b admin-panel
org UI: org switcher, member roster, role management in SettingsTab (sonnet,
after 5a), 5c rules-test expansion covering cross-tenant denial matrix (sonnet).

**DoD.** Rules tests prove: attending in org A cannot read/write org B's
rotations, students, feedback; GS-26-shaped legacy rotation (no orgId) still
fully works; bootstrap literal gone from rules text.

### WS-6 — Auth upgrade: magic-link only + admin SSO _(opus, M/L; depends WS-3 flags)_

**Why.** The 4-digit PIN (`src/hooks/useStudentAuth.ts`, ~830 lines;
`src/components/admin/pinValidation.ts`) was an accepted risk explicitly scoped
to a 2–4 student cohort; the acceptance expires with scale.

**Design.**
- Students: email magic-link becomes the only join/sign-in path (flow already
  exists and is primary). Retire the PIN: flag-gated (`authPinRetired`) —
  when on, PIN setup UI disappears and PIN sign-in shows "we've upgraded
  sign-in" + sends a magic link. Never delete stored PIN data server-side until
  a full cohort gap. `hasNoLegacyStudentLoginPin` rule stays forever.
- Passkeys: **investigate, don't assume** — the implementing agent must verify
  current Firebase Auth/Identity Platform passkey support before designing;
  if unsupported without Identity Platform migration, ship magic-link-only and
  file passkeys as a follow-up. (This uncertainty is why the workstream is
  opus + design-reviewed.)
- Admins: add Google sign-in (likely already the mechanism — agent verifies
  `AdminAuthScreen`/`firebase.ts`) and Microsoft (Azure AD) as an OIDC
  provider for hospital accounts; org invite claim flow (WS-5) works with
  either provider. Session hardening: admin panel PIN gate
  (`AdminPinGate.tsx`) stays as the local relock mechanism.
- Deliverability: magic links on hospital networks were flaky (spam-folder
  helper copy exists in LoginScreen). Add a custom auth email domain/action
  URL and document SPF/DKIM setup; keep the "try a personal email" guidance.

**DoD.** Flag off = today's behavior byte-for-byte; flag on = no PIN surfaces;
rules tests unchanged-green; e2e manual script for join → sign-out → re-join
on a second device.

### WS-7 — Educator onboarding: wizard + rotation templates _(sonnet UI / opus clone logic, M; depends WS-5)_

**Why.** Setting up a rotation currently assumes deep app knowledge (Dr. Cheng
is the only operator). "Zero-discovery" applies to educators too.

**Design.**
- First-run wizard for a fresh org attending: create rotation (code
  auto-suggested, uniqueness via `rotationCodes`), pick a **template**, invite
  students (mailto/QR/copy-link — student invite emails can come later).
- Templates: `rotationTemplates/{id}` = a rotation content snapshot
  (curriculum, articles, studySheets, clinicGuideTemplates, settings) + a
  "Save current rotation as template" action (org-scoped; service admin can
  mark templates global). Cloning = copy content fields onto the new rotation
  doc — reuse the publish machinery (`src/components/admin/lib/publish.ts`)
  rather than new write paths. After WS-8 lands, a template becomes a content-
  pack reference instead of a copy; build it as a snapshot now, keep the
  interface narrow so WS-8 can swap internals.
- Include the "clone GS-26 → GS-27" same-org fast path (next cohort setup in
  <1 minute).

**DoD.** New attending in a fresh org reaches "students can join" in under 5
minutes without docs; template round-trip (save → clone) preserves content
byte-identically (test on fixtures).

---

## Phase 3 — Data-model scale-out (Wave 3)

### WS-8 — Shared content library (kills the 1 MiB ceiling) _(opus, L — design review required)_

**Why.** Every rotation doc embeds its full content: `KEY_TO_FIELD` in
`src/utils/store.ts` maps curriculum/articles/studySheets/announcements/
settings/clinicGuides/clinicGuideTemplates onto ONE Firestore document, which
caps at 1 MiB. Content growth (guides.ts alone is 1300+ lines) plus per-
rotation duplication makes this the first hard wall at scale.

**Design.**
- `contentPacks/{packId}`: `{ name, orgId|global, latestVersion }` with
  `versions/{n}` docs holding the content payload **split per field** (one doc
  per content type per version — each stays far under 1 MiB; if any single
  type outgrows a doc, chunk by module, but don't pre-build chunking).
- Rotation doc gains `{ contentPackId, contentVersion, contentOverrides }`
  (overrides = per-rotation announcement/settings deltas, which stay embedded —
  they're small and rotation-specific).
- Client: `store.getShared` learns to resolve pack-referenced content
  (fetch version docs, cache under the existing `neph_shared_*` keys so ALL
  downstream code — useStudentSync hydration, listeners, search — is
  untouched). The rotation listener watches the rotation doc; a version bump
  triggers refetch. **Old embedded-content rotations keep working forever**
  (embedded fields win when present — that IS the migration story; no data
  migration required, new rotations just start pack-based).
- Publishing (`publish.ts` + editors) writes a new version to the pack +
  bumps the rotation pointer transactionally; "unpublished draft" semantics
  stay in the existing admin storage layer.
- Versioning gives rollback ("repoint to v7") for free — expose it in admin.

**DoD.** A pack-based rotation and an embedded legacy rotation both pass the
full student flow (manual smoke per `docs/SMOKE_TEST.md`); content read costs
measured (should DROP: version docs cached, no giant doc re-reads on every
rotation-doc change); publish → student sees update within one listener cycle.

### WS-9 — Student-doc scale-out + server timestamps _(opus, L — design review required; depends WS-4)_

**Why.** (1) The student doc is one document holding all progress; activityLog
(capped 50) and srQueue are the growth risks. (2) `fieldStamps` and
`removedPatients` trust device clocks; at fleet scale, clock skew re-opens the
lost-update class the stamps were built to close.

**Design (two independent sub-items).**
- 9a **Server-authoritative stamping**: route student-doc writes through a
  callable function `syncStudentDoc(payload, baseStamps)` that (in a
  transaction) runs the SAME merge the client runs today
  (`mergeStudentFlushPayload` — extract it to a shared package or duplicate
  with a golden-test lock), assigns server-time fieldStamps, and returns the
  merged doc + stamps. Client keeps its optimistic local state + offline queue;
  the flush target becomes the callable. Rules then deny direct student-doc
  writes from NEW clients (flag-gated; old clients keep direct-write rules
  until the flag is universal — dual-path window documented). Offline behavior
  unchanged (queue flushes to the callable when online).
  **This is the single riskiest change in the plan — golden tests: replay the
  entire storeQueue.test.ts merge matrix against the function.**
- 9b **Subcollection split**: move `activityLog` to
  `students/{id}/activity/{month}` docs and srQueue to a single side doc.
  Listener + admin views read them lazily (admin StudentDetailView is the only
  heavy reader). Keep patients/scores/completions in the main doc (they're
  what sync conflict-resolution needs atomically).

**DoD.** 9a: merge parity proven by golden tests; skewed-clock integration
test (client clock ±6h) shows correct winners. 9b: student doc size bounded
(measure before/after on a seeded heavy student); no admin view regressions.

### WS-10 — Aggregates & dashboards _(sonnet, S/M; depends WS-4)_

Extend WS-4's `onStudentWrite` aggregates into org-level rollups
(`orgs/{orgId}/stats`): active rotations, students, weekly quiz volume,
feedback counts by tag. Admin dashboard (DashboardTab) reads aggregates
instead of N student docs for the org overview; per-rotation detail views keep
live reads. **DoD:** dashboard render cost independent of student count
(verify read counts in emulator profiler).

---

## Phase 4 — Compliance, polish, operations (Wave 4)

### WS-11 — PHI posture (per D1) _(opus, M/L)_

- **11a BAA route**: enable/verify BAA-eligible service set only (Firestore,
  Auth, Hosting, Functions qualify; check each new addition — Sentry needs its
  own BAA or must be scrubbed to non-PHI events per WS-2's rule), enable
  Firestore audit logs, document the shared-responsibility matrix, add a
  data-retention policy (auto-purge rotations N days post-end via scheduled
  function — surfaces in WS-12 too).
- **11b De-identification route**: consult entry becomes structured pickers
  (topic, acuity, service, day-of-stay) — no initials, no room, no free text.
  Migration scrubs existing patient records to the structured shape (lossy,
  needs Dr. Cheng sign-off + export first). Update `EduDisclaimer` copy,
  PatientTab UI, team snapshots (already PHI-free by design — verify), and the
  moonlighter/signout adjacent tooling expectations.

### WS-12 — Legal, retention, offboarding _(human + sonnet drafting, S)_

Privacy policy + ToS pages (static, linked from login + manifest), FERPA note
for score data, org offboarding = export-then-purge (scheduled function +
callable, depends WS-4/WS-14), documented data-retention defaults.

### WS-13 — Accessibility pass _(sonnet, M)_

Axe/lighthouse audit across student + admin surfaces; fix focus order and
traps (sheets/overlays already use `useFocusTrap` — verify coverage), color
contrast on `T` tokens in both themes (`src/utils/helpers.ts` theme blocks),
`prefers-reduced-motion` on transitions, form labels/aria on quiz + calculators
(`akiTool`, `hyponatremiaTool`, `gnTool`). Institutional adoption reviews will
ask for a VPAT-ish statement — produce a gap list + fixes, not a certificate.

### WS-14 — Data export _(sonnet, S)_

Per-rotation CSV export (students × scores/competency/completion/activity
summary + feedback log) from StudentsTab; client-side generation is fine at
rotation scale (reuse `RotationSummaryReport` data assembly); org-level bulk
export via callable (depends WS-4). Respect D1: exports carry no patient
fields unless BAA route chosen. **DoD:** opens clean in Excel; columns
documented; PHI review of every column.

### WS-15 — Release discipline _(sonnet, S; depends WS-3)_

- Versioned releases: git tag per deploy, changelog file, release name injected
  (shared with WS-2 Sentry tagging).
- Staged rollout: `deploy:preview` (exists) → percentage/org-cohort rollout via
  flag-gated features rather than hosting-level splits.
- Forced-upgrade path: `appConfig/flags.minBuild` — clients below it show a
  blocking "please refresh" (rides the Workbox toast plumbing) for
  rules-breaking deploys (needed before WS-9a's dual-path window closes).
- Runbook: docs/RUNBOOK.md — deploy, rollback (hosting rollback + content-pack
  repoint + functions rollback), incident checklist.

---

## Explicitly deferred (do not build yet)

- Native app-store wrappers (revisit post-Wave 2 per D4).
- i18n/localization — no demand signal.
- Real-time collaborative editing of content — publish/version flow is enough.
- Per-question item banks / psychometrics — content pipeline first.
- Payments/subscription tooling — D3 decides if/when.

## Sequencing summary

```
Wave 1 (parallel): WS-1 rules-tests · WS-2 observability · WS-3 flags · WS-4 functions
Wave 2 (parallel): WS-5 orgs (5a→5b/5c) · WS-6 auth · WS-7 onboarding (after 5a)
Wave 3 (parallel): WS-8 content packs · WS-9 student-doc/server-stamps · WS-10 aggregates
Wave 4 (parallel): WS-11 PHI (per D1) · WS-12 legal · WS-13 a11y · WS-14 export · WS-15 releases
```

Rough total: ~6 design-reviewed L items (WS-5, 6, 8, 9, 11), ~9 S/M items.
Wave 2 is the watershed — after it, the app is safe to hand to a second
attending; Waves 3–4 make it safe to hand to a second *institution*.
