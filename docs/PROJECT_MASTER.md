# Project Master

This is the owner-facing map for the Nephrology Rotation Education App. Use this file when you need to understand where things live, how the app is wired, what to check before handoff, and which files are the source of truth.

## Project Identity

**Name:** Nephrology Rotation Education App  
**Purpose:** A rotation teaching app for nephrology students and attendings.  
**Primary users:** Medical students on nephrology rotation, attendings/educators managing the rotation, and project maintainers.  
**Core product promise:** Put the rotation curriculum, clinical teaching references, patient-topic tracking, quizzes, feedback signals, and student progress in one mobile-friendly app.

## Source-Of-Truth Files

| Area | Source |
| --- | --- |
| App entry | `src/main.tsx`, `src/App.tsx` |
| Student shell | `src/components/StudentApp.tsx` |
| Student screens | `src/components/student/` |
| Admin shell | `src/components/AdminPanel.tsx`, `src/components/admin/AdminShell.tsx` |
| Admin screens | `src/components/admin/tabs/`, `src/components/admin/views/`, `src/components/admin/editors/` |
| Shared types | `src/types.ts` |
| Styling tokens | `src/data/constants.ts`, `src/utils/helpers.ts` |
| Core content | `src/data/` |
| Persistence/sync | `src/utils/store.ts`, `src/utils/firebase.ts` |
| Security rules | `firestore.rules` |
| Hosting config | `firebase.json` |
| Build config | `vite.config.js`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js` |
| Public app assets | `public/` |
| Shipped deck PDFs | `public/decks/` |
| Editable generated decks | `decks/` |
| Deck builders | `scripts/decks/` |
| Project docs | `README.md`, `docs/` |

## App Architecture

The app has two main experiences:

- `StudentApp`: the default student interface. It owns student auth state, rotation join state, local progress state, sync behavior, and student view routing.
- `AdminPanel`: the admin interface. It owns admin auth, local admin PIN gating, rotation creation/switching, shared rotation content, student records, analytics, reports, and admin invites.

`src/App.tsx` switches between the student app and the lazily-loaded admin panel. The admin panel is intentionally not part of the initial student bundle.

The app uses a data-heavy frontend architecture. Most curriculum and clinical content is static TypeScript data in `src/data/`, while rotation-specific settings and student progress are synced through Firestore when a rotation code is active.

## Student Experience

Major student flows live in `src/components/student/` and are coordinated from `src/components/StudentApp.tsx`.

Important student features:

- Email verification and PIN-based returning sign-in.
- Rotation join code flow.
- Onboarding and install prompt behavior.
- Today/home dashboard.
- Weekly curriculum modules.
- Pre/post assessments and weekly quizzes.
- Spaced repetition review for missed or reinforced questions.
- Study sheets, articles, landmark trials, cases, resources, quick references, inpatient guides, outpatient clinic guides, and rotation guides.
- Patient/consult topic logging with no-PHI guardrails.
- Bookmarks, reflections, progress, team snapshot, and global search.
- Offline-aware local cache and pending sync queue.

## Admin Experience

Major admin flows live in `src/components/AdminPanel.tsx` and `src/components/admin/`.

Important admin features:

- Firebase admin authentication.
- Bootstrap/master admin path for `joncheng5@gmail.com`.
- Admin invite creation and claim flow.
- Local admin PIN gate after sign-in.
- Rotation creation, switching, archival, and ownership management.
- Student list, student detail pages, status changes, record recovery/merge behavior, and deletion.
- Curriculum editor, article editor, announcements editor, and clinic guide editor.
- Dashboard teaching signals, analytics, cohort reports, individual reports, and printable views.

## Content Model

Most teaching content is static source-controlled data:

| File | Content |
| --- | --- |
| `src/data/constants.ts` | Theme tokens, topic lists, weekly curriculum, articles, resources, abbreviations, study sheets, feedback tags, and topic-resource mappings. |
| `src/data/quizzes.ts` | Pre/post quizzes, weekly quizzes, topic reinforcement bank, and question lookup helpers. |
| `src/data/cases.ts` | Weekly case content. |
| `src/data/trials.ts` | Landmark trial library. |
| `src/data/guides.ts` | Quick reference guide sections. |
| `src/data/inpatientGuides.ts` | Inpatient teaching guides. |
| `src/data/clinicGuides.ts` | Outpatient clinic guide templates. |
| `src/data/rotationGuides.ts` | Rotation workflow and orientation guides. |
| `src/data/images.ts` | Image metadata for study sheets and cases. |
| `src/data/topicIcons.ts` | Topic-to-icon helper. |

When adding content, prefer editing `src/data/` first, then update tests if the new content affects integrity checks.

## Data And Sync

Core persistence is in `src/utils/store.ts`.

The app uses:

- `localStorage` for private local state, cache, and offline fallback.
- Firestore for shared rotation state, student progress, team snapshots, rotation metadata, and admin access.
- A pending sync queue for offline writes that should retry when connectivity returns.

Main Firestore collections:

| Collection | Purpose |
| --- | --- |
| `/admins/{uid}` | Authorized admin accounts. |
| `/adminInvites/{email}` | Invited admin emails and claim status. |
| `/rotationCodes/{code}` | Join-code ownership metadata. |
| `/rotations/{code}` | Rotation settings, shared content, ownership, and metadata. |
| `/rotations/{code}/students/{studentId}` | Student progress and rotation-specific record. |
| `/rotations/{code}/team/{studentId}` | Lightweight team snapshot data. |
| `/studentAssignments/{studentId}` | Student-to-active-rotation lookup. |

Important rule of thumb: shared settings sent to students should not include the admin PIN.

## Security And Privacy Notes

- Firestore rules live in `firestore.rules` and are part of the product, not an afterthought.
- Admin authorization requires Firebase Auth plus an admin document.
- Student flows should avoid storing raw PINs in student documents.
- Patient logging is for de-identified education only. Continue to preserve no-PHI copy, validation, and review language when changing patient fields.
- Treat localStorage as convenient state, not a secure store for sensitive clinical information.

## Testing And Verification

Use this order for normal project health checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:links
```

Useful test locations:

- `src/data/contentIntegrity.test.ts`
- `src/data/quizzes.test.ts`
- `src/utils/*.test.ts`

`npm run check:links` checks external content links and may fail because of network conditions or upstream website changes. Review failures manually.

## Build, Offline, And Hosting

`vite.config.js` includes a custom build plugin that emits `sw.js`. The service worker precaches the shell and build assets, then uses runtime caching for same-origin assets and Google Fonts.

`firebase.json` serves `dist/`, disables cache for the app shell/service worker/manifest, and rewrites all routes to `index.html`.

Production deploy shape:

```bash
npm run build
firebase deploy
```

## Decks

Published deck PDFs live in `public/decks/` so the app can link to them.

Deck source/build scripts live in `scripts/decks/`. Regeneration writes editable `.pptx` files to the root-level `decks/` folder; convert the shipped copy to PDF in `public/decks/`.

Treat `public/decks/` as the app-shipped asset location and `decks/` as the editable generated deck source location.

## Documentation Index

| File | Purpose |
| --- | --- |
| `README.md` | Project front door, quick start, scripts, and handoff basics. |
| `docs/PROJECT_MASTER.md` | This owner-facing map. |
| `docs/app-store-readiness.md` | iOS/App Store wrapper planning notes. |
| `docs/adpkd-study-sheet.md` | ADPKD content draft/reference. |
| `docs/project-audit-2026-04-23.md` | Historical project audit snapshot. |
| `REVIEW-instructional-text.md` | Large instructional text review artifact. |
| `review/ui-2026-04-24/` | Historical UI review output and diff. |

## Common Change Recipes

### Add Or Edit A Study Sheet

1. Edit `STUDY_SHEETS` in `src/data/constants.ts`.
2. Add related topic mappings in `TOPIC_RESOURCE_MAP` if needed.
3. Add image metadata in `src/data/images.ts` if the sheet needs visuals.
4. Run content and build checks.

### Add Or Edit Quiz Content

1. Edit `src/data/quizzes.ts`.
2. Keep question keys and topic reinforcement mappings stable where possible.
3. Run `npm test`, especially `src/data/quizzes.test.ts`.

### Add A New Clinical Guide

1. Add the content template in the relevant `src/data/*Guides.ts` file.
2. Add or update the student view if the guide requires a new route.
3. Update any admin editor only if admins should manage that guide.

### Change Student Progress Logic

1. Start in `src/components/StudentApp.tsx` for orchestration.
2. Check related utilities in `src/utils/moduleProgression.ts`, `src/utils/spacedRepetition.ts`, `src/utils/gamification.ts`, and `src/utils/competency.ts`.
3. Update or add focused tests in `src/utils/`.

### Change Admin Analytics

1. Start in `src/components/admin/tabs/AnalyticsTab.tsx`.
2. Check helpers in `src/components/admin/lib/`.
3. Verify student normalization in `src/utils/adminStudents.ts` if data shape changes.

### Change Firebase Data Shape

1. Update `src/types.ts`.
2. Update `src/utils/store.ts`.
3. Update Firestore rules if access patterns change.
4. Check student and admin sync paths.
5. Run the full pre-deploy checks.

## Rotation Handoff Checklist

- Active rotation exists with correct dates, duration, location, attending profile, curriculum, articles, announcements, and clinic guides.
- Admin sign-in works for the right account.
- Local admin PIN is set on the attending device.
- A test student can verify email, create a PIN, join the rotation, complete an item, and sync progress.
- Student progress appears in the admin panel.
- Patient logging still shows no-PHI expectations.
- Print/cohort reports render acceptably.
- External link check has been reviewed.
- `npm run build` succeeds before deploy.

## Maintenance Rules

- Keep README short enough to orient a new person quickly.
- Keep this master file current when project structure, Firebase schema, or major workflows change.
- Prefer source-controlled data in `src/data/` for educational content.
- Keep unrelated audits and review snapshots dated so they do not look like live release instructions.
- Do not commit real `.env` values, patient-identifying data, or private Firebase credentials.
