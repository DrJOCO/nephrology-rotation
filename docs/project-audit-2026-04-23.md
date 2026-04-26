# Project Audit Report

Date: 2026-04-23

Auditor lens: Senior project manager / product + engineering delivery

Scope reviewed:
- Product surface and user workflows
- Repo structure and documentation
- Security, privacy, and access control posture
- Engineering maintainability and release readiness
- Test/build signals

Out of scope:
- Full clinical accuracy review
- Production Firebase console configuration
- Real user analytics, adoption, or support data
- Cost modeling

## Executive Summary

This is a real product with clear user value, not a toy prototype. The student experience, admin tooling, offline behavior, content depth, and educational structure are all stronger than average for a small-team codebase.

The main problem is not missing features. The main problem is that the product has grown past the point where informal decisions are still safe. The biggest risks now are:

1. Security and privacy controls are too loose for the kind of data and workflows in the app.
2. The codebase is becoming expensive to change because key screens are monoliths and there is a duplicated UI tree.
3. Documentation and repo hygiene are behind the product, which will slow onboarding, QA, release management, and compliance work.
4. The product is carrying operational debt: stale docs, incomplete content checks, no visible CI, and weak release boundaries.

If I were running this as a program, I would not prioritize new features first. I would spend the next sprint or two on hardening, simplification, and release discipline.

## Scorecard

| Area | Status | Notes |
| --- | --- | --- |
| Product value | Strong | Clear student/admin value, thoughtful feature set |
| UX maturity | Good | App feels purpose-built, not generic |
| Security/privacy | Needs immediate work | Default PIN, raw guest PIN persistence, broad read rules |
| Maintainability | At risk | Very large components, duplicated UI source tree |
| Documentation | Weak | README is stale, app-store doc is out of date |
| QA baseline | Fair | Typecheck/lint/tests/build pass, but coverage is mostly unit/data level |
| Release readiness | Medium-low | No visible CI, stale docs, heavy dirty worktree, repo boundaries unclear |

## What Is Working Well

- The product has genuine depth: quizzes, cases, study sheets, teaching decks, quick refs, progress tracking, cohort views, and admin analytics all point to a coherent educational model.
- The app already has a credible offline-first mindset. There is queueing, local cache behavior, and PWA plumbing instead of a purely optimistic "always online" assumption.
- Current code health is not broken in the basic sense. At audit time:
  - `npm run typecheck` passed
  - `npm test` passed (119 tests)
  - `npm run lint` passed
  - `npm run build` passed
- Team snapshot publishing intentionally strips `adminPin` before shared settings are written, which shows the right instinct even though the broader auth model still needs work.

## Highest Priority Changes

### P0. Remove the fallback admin PIN immediately

Why this matters:
- This creates an avoidable access-control failure.
- If `adminPin` is missing or blank, the app silently uses `1234`.
- That is not a safe default for any admin surface.

Evidence:
- `src/components/AdminPanel.tsx:1226` sets `const activePin = (settings?.adminPin || "1234").trim();`

Recommended change:
- Remove the fallback entirely.
- Require explicit admin PIN setup before PIN-gated admin actions are available.
- Treat unset PIN as a configuration error, not as permission to use a universal default.
- Add a migration path for existing rotations that do not yet have an admin PIN.

### P0. Stop storing raw guest login PINs in student records

Why this matters:
- Guest recovery/auth secrets should not be stored in raw form in student documents.
- This expands breach impact and creates unnecessary handling risk.
- It also weakens the trust model around "educational only" data.

Evidence:
- `src/components/StudentApp.tsx:194-197` stores `loginPin` in `studentSyncIdentity`
- `src/components/StudentApp.tsx:733-737` writes `{ authType: "guest", loginPin: studentPin }`
- `src/components/AdminPanel.tsx:1180-1199` preserves `loginPin` during record recovery

Recommended change:
- Do not persist raw guest PINs in Firestore.
- If recovery is required, store a salted hash or move to a proper auth/recovery flow.
- Decide whether guest PIN is truly needed as a long-lived server-side concept or only as a client bootstrap.

### P0. Tighten Firestore rules for student documents

Why this matters:
- Current rules validate very little and allow extra arbitrary fields.
- That makes data shape drift, oversized documents, accidental sensitive fields, and future security mistakes much more likely.

Evidence:
- `firestore.rules:66-74` only requires a valid `name` and does not constrain extra keys or field types for student docs.

Recommended change:
- Define an explicit allowed-key schema for student documents.
- Add type/size validation for sensitive or large fields.
- Block writes of fields that should never be client-controlled.
- Separate operational metadata from student content where possible.

## Major Product and Privacy Risks

### P1. Cohort visibility is a product decision, but right now it is implemented as a default technical behavior

Why this matters:
- The app shares names, rankings, patient counts, and topic mix across a rotation.
- That may be acceptable, but it should be an explicit product/privacy choice, not an implicit side effect of the current architecture.

Evidence:
- `src/utils/teamSnapshots.ts:36-46` publishes `name`, `points`, `patientCount`, `activePatientCount`, `dischargedPatientCount`, and `topicCounts`
- `src/components/student/TeamTab.tsx:20-26` subscribes all joined users to team snapshots
- `src/components/student/TeamTab.tsx:84-175` displays names, ranks, counts, and topics
- `src/components/student/GlobalSearchOverlay.tsx:26-33` includes a "Cohort" search scope
- `src/components/student/GlobalSearchOverlay.tsx:122-157` loads cohort snapshots into search

Recommended change:
- Decide whether this is intended for all rotations.
- Make cohort exposure admin-configurable if there is any doubt.
- Update privacy and onboarding language so users understand what is shared.
- Review whether topic exposure should be aggregate-only instead of per student.

### P1. Rotation data access is broader than I would want, especially given predictable codes

Why this matters:
- Any signed-in user can read a rotation document if they know its document ID.
- Rotation codes are intentionally human-readable and partially predictable.
- If the rotation code acts as an access boundary, it needs stronger entropy and stronger authorization rules.

Evidence:
- `firestore.rules:50-52` allows `get` on `/rotations/{rotationCode}` for any signed-in user
- `src/utils/helpers.ts:252-297` generates codes like `CMC-MAR26` from location and date

Recommended change:
- Treat rotation membership, not mere sign-in, as the authorization boundary.
- Increase rotation-code entropy or separate user-facing join codes from document IDs.
- Review all collection reads for "signed-in user" vs "member of this rotation" semantics.

## Engineering and Maintainability Findings

### P1. The main product surfaces are too large to scale comfortably

Why this matters:
- Very large files slow review, testing, onboarding, and safe iteration.
- They also make it hard to assign ownership or confidently refactor one area without affecting another.

Evidence:
- `src/components/AdminPanel.tsx`: 5,285 lines
- `src/components/StudentApp.tsx`: 1,791 lines

Recommended change:
- Split by feature boundary and state ownership.
- Pull data orchestration into hooks/services.
- Treat admin auth, rotation management, student roster, analytics, and settings as distinct modules.
- Do the same for student onboarding, session/auth, search, patients, progress, and content views.

### P1. There is a near-mirror duplicate UI tree under `ui-for-design/`

Why this matters:
- Duplicated trees multiply change cost and create review confusion.
- This is especially risky when the duplicate files have the same names and similar content as production files.

Evidence:
- `ui-for-design/components/AdminPanel.tsx`: 5,285 lines
- `ui-for-design/components/StudentApp.tsx`: 1,799 lines
- `src/components/` contains 32 files
- `ui-for-design/` contains 35 files including mirrored student views

Recommended change:
- Decide what `ui-for-design/` is:
  - a real package,
  - a design sandbox,
  - or obsolete duplicate source.
- If it is a sandbox, reduce it to mock/stub surfaces rather than mirrored production files.
- If it is real, formalize ownership and shared modules.
- If it is dead, remove it.

### P1. Offline/sync architecture is thoughtful, but it needs operational hardening before scale

Why this matters:
- The local-first queue/cache design is valuable, but it depends heavily on `localStorage`, optimistic merging, and best-effort flush behavior.
- That is workable now, but brittle over time without schema/versioning, conflict handling, and telemetry.

Evidence:
- `src/utils/store.ts:30-35` defines local cache keys for rotation, student, and team docs
- `src/utils/store.ts:72-120` manages a local pending sync queue
- `src/utils/store.ts:153-186` flushes queued sync operations best-effort
- `src/utils/store.ts:123-151` merges cached payloads without explicit schema versioning

Recommended change:
- Add schema versioning and migration paths for cached/local data.
- Add conflict resolution rules or at least conflict logging.
- Add visibility into sync failures, stale cache age, and queue depth.
- Revisit whether some payloads belong in IndexedDB instead of `localStorage`.

### P2. Build output is heavy for a mobile-first educational app

Why this matters:
- Large initial bundles hurt first-load performance, especially on hospital Wi-Fi and older mobile devices.
- The product target suggests constrained environments, so performance is not optional polish.

Evidence from `dist/assets`:
- `index-*.js`: about 421 KB
- `data-*.js`: about 413 KB
- `AdminPanel-*.js`: about 193 KB

Recommended change:
- Defer admin-only code more aggressively.
- Revisit what is bundled into the shared `data` chunk.
- Consider route/view-level lazy loading for large educational content and admin analytics.
- Add bundle budgets to the release process.

## Documentation, Process, and Repo Hygiene

### P1. The README is not a real project README yet

Why this matters:
- New contributors, reviewers, and future operators do not get a reliable understanding of the product, stack, setup, or workflows.
- The current README still reads like scaffolding plus local notes.

Evidence:
- `README.md:1-16` still contains the default "React + Vite" template text
- `README.md:22-29` points to an absolute local machine path outside this repo
- `README.md:55-59` repeats machine-specific defaults

Recommended change:
- Replace the template README with actual project documentation:
  - product overview
  - architecture
  - local setup
  - auth/config expectations
  - data model overview
  - testing/release commands

### P1. There are workstation-specific paths in committed scripts and docs

Why this matters:
- This breaks portability for every collaborator and every CI environment.
- It also makes the repo feel less trustworthy because commands are not self-contained.

Evidence:
- `package.json:15` hardcodes `node "/Users/joncheng/Documents/Premier Nephrology/Codex_Claude_Testing/agent-loop.mjs"`
- `README.md:24-28` and `README.md:57-59` reference the same external path family

Recommended change:
- Remove absolute machine paths from committed scripts/docs.
- Use relative paths, npm scripts, or documented environment variables.

### P1. At least one planning document is stale enough to mislead the team

Why this matters:
- Stale strategy docs create real delivery mistakes because they cause teams to plan against old assumptions.

Evidence:
- `docs/app-store-readiness.md:22-29` says the repo does not have a web manifest, service worker, or app icons
- But the repo does contain:
  - `public/manifest.webmanifest:1-24`
  - `src/utils/pwa.ts:1-24`
  - `vite.config.js:4-125` which emits `sw.js`
- `docs/app-store-readiness.md:86-92` still lists manifest/service worker as future optional work

Recommended change:
- Refresh or archive stale planning docs.
- Add an owner and "last reviewed" date to strategy docs.

### P1. Repo boundaries and generated artifact policy are unclear

Why this matters:
- The repo currently mixes app source, generated build output, deck assets, temp files, and review artifacts.
- That raises the odds of accidental commits and slows code review.

Evidence:
- Current working tree includes untracked items like `.Rhistory`, `REVIEW-instructional-text.md`, `decks/`, `public/decks/`, `scripts/decks/`, and `tmp/`
- `.gitignore:1-44` does not currently ignore several of those artifact types
- Repo size at audit time was about `715M`

Recommended change:
- Define what belongs in this repo.
- Ignore generated/transient artifacts consistently.
- If decks are a first-class product asset, document their source-of-truth and generation path.
- If they are generated, move them behind a build/export workflow.

### P2. There is no visible CI/workflow layer in the repo

Why this matters:
- Passing tests locally is good, but it is not a release process.
- Without CI, regressions depend on memory and discipline.

Evidence:
- No `.github/workflows/` directory was present during the audit.

Recommended change:
- Add CI for:
  - install
  - typecheck
  - lint
  - tests
  - build
  - optional link/content checks

## Content Operations and QA

### P2. Link validation exists, but coverage is partial and some external resources are already failing

Why this matters:
- This is a content-heavy educational product. Link rot is product quality debt, not just editorial debt.

Evidence:
- `scripts/check-links.mjs:5-9` only scans:
  - `src/data/constants.ts`
  - `src/data/trials.ts`
  - `src/data/guides.ts`
- `src/data/contentIntegrity.test.ts:13-29` only checks `https://` format, not live reachability
- Link-check run result during audit: `128/132 URLs passed`
- Failing URLs observed:
  - `https://ajkdblog.org/atlas-of-renal-pathology-ii/`
  - `https://thecurbsiders.com/curbsiders-podcast/192-dialysis`
  - `https://www.renalfellow.org`
  - `https://www.renalfellow.org/category/urine-sediment-of-the-month/`

Recommended change:
- Expand the link checker to all content-bearing data files.
- Add a policy for flaky domains (retry, allowlist, manual review).
- Create a periodic content hygiene review rather than treating links as static forever.

### P2. Test coverage is useful, but it is not yet protecting the most important product risks

Why this matters:
- Unit and data integrity tests help, but this app's major failure modes are auth, sync, privacy, and multi-step workflows.

Evidence:
- Current package scripts show typecheck/lint/unit-test/build coverage.
- No visible end-to-end harness or CI pipeline was present in the repo.

Recommended change:
- Add a small set of high-value integration/E2E tests:
  - student join flow
  - admin sign-in flow
  - rotation creation/join
  - offline edit then resync
  - cohort visibility permissions

## Additional Observations

### P2. Current release boundary is blurry

Why this matters:
- The worktree is actively changing across both `src/` and `ui-for-design/`.
- That is normal during development, but it means the project needs stronger branching/release discipline before more people touch it.

Evidence:
- `git status --short` showed a large number of modified files in both trees plus several untracked artifacts.
- Local branch was ahead of origin at audit time.

Recommended change:
- Use feature branches and a defined release branch or release checklist.
- Avoid carrying mirrored source trees with parallel edits unless there is an explicit reason.

### P2. Product positioning and compliance language should catch up to the product

Why this matters:
- The app has patient logging, team views, and educational progress tracking. That means the language around de-identified use, cohort sharing, and admin/student expectations needs to be explicit.

Recommended change:
- Add a clear privacy statement and in-app educational-use language.
- Document what data is stored locally, what is synced, and who can see what.
- Treat this as part of the product, not just legal cleanup.

## Recommended 30/60/90 Day Plan

### Next 30 days

- Remove default admin PIN
- Stop storing raw guest PINs
- Tighten Firestore rules and document allowed student/team schemas
- Decide and document cohort visibility policy
- Replace README and remove machine-specific paths
- Clean `.gitignore` and define repo artifact policy
- Add CI for typecheck/lint/test/build

### 30 to 60 days

- Split `AdminPanel.tsx` and `StudentApp.tsx` into feature modules
- Decide the fate of `ui-for-design/`
- Add sync telemetry, schema versioning, and conflict reporting
- Expand link checking and content QA coverage
- Add a small E2E suite for key student/admin workflows

### 60 to 90 days

- Reduce bundle weight and add performance budgets
- Formalize release process and ownership
- Refresh planning docs and add owners/review dates
- Add privacy/compliance documentation and submission-ready product language

## Bottom Line

This project has strong product bones. The team has already built something meaningfully useful and richer than most early internal tools.

But the next phase should not be "more features by default." The next phase should be "make the current product safe, durable, and easier to operate." If that happens, this can become a much more credible long-term product without needing a rewrite.

## Verification Appendix

Commands run during audit:
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run check:links`

Observed results:
- Typecheck passed
- Tests passed: 119 tests
- Lint passed
- Build passed
- Link check passed 128/132 URLs and surfaced 4 failing external links

