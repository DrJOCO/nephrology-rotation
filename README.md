# Nephrology Rotation Education App

A React + TypeScript + Vite app for nephrology rotation teaching. Students use it for onboarding, weekly curriculum, quizzes, cases, study sheets, patient-topic logging, spaced review, team progress, and clinical reference material. Admins use Firebase-backed tools to manage rotations, curriculum, announcements, clinic guides, student progress, reports, and teaching materials.

For the full project map, architecture notes, data locations, Firebase model, and handoff checklist, see [docs/PROJECT_MASTER.md](docs/PROJECT_MASTER.md).

## What This Project Contains

- Student-facing rotation app with mobile-first navigation, onboarding, quizzes, cases, study sheets, references, patient logs, bookmarks, reflections, and progress tracking.
- Clinical reasoning tools (AKI Differential Tool) that turn structured inputs (Cr trend, UOP, exposures, UA, imaging, FENa/FEUrea) into a ranked, KDIGO-staged differential.
- Admin panel for rotation setup, student tracking, curriculum/content editing, announcements, analytics, print reports, and admin invites.
- Firebase Auth and Firestore integration with localStorage fallback and offline pending-sync behavior.
- PWA/offline shell support generated during the Vite build.
- Teaching deck PDFs in `public/decks/`, editable PPTX files in `decks/`, and source deck-generation scripts in `scripts/decks/`.
- Unit/content checks with Vitest, TypeScript, ESLint, and external link checking.

## Stack

- React 19, TypeScript, Vite
- Firebase Auth, Firestore, Firebase Hosting
- Vitest for unit and content checks
- ESLint for static checks
- Custom Vite build plugin that emits `sw.js` for offline shell caching

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local `.env.local` from `.env.example`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Start the local app:

```bash
npm run dev
```

> **Dev safety:** plain `npm run dev` talks to the **production** Firebase
> project — live cohort data. For development, prefer the local emulators:
> run `npm run emulators` in one terminal and `npm run dev:safe` in another
> (auth :9099, Firestore :8080, emulator UI at :4000). Nothing you do there
> touches production. `npm run dev` prints a console warning as a reminder.

To stage a deploy on a temporary preview URL before releasing to students:

```bash
npm run deploy:preview
```

Build production assets:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

## Project Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Run TypeScript checks and build `dist/`. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run lint` | Run ESLint across the repo. |
| `npm test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run check:links` | Check external content/resource links. |
| `npm run preview` | Serve the built app locally. |
| `npm run test:rules` | Run the Firestore rules test suite against the emulator (see below). |

`npm run check:links` reaches external websites and can fail because of network or upstream site behavior. Treat failures as items to review, not automatic proof that a source is unusable.

## Recommended Pre-Deploy Checks

Run these before a rotation handoff or deploy:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:links
```

## Key Paths

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Top-level app shell and student/admin mode switch. |
| `src/components/StudentApp.tsx` | Main student experience, state orchestration, auth flow, sync hooks, and view routing. |
| `src/components/student/` | Student-facing tabs and subviews. |
| `src/components/AdminPanel.tsx` | Main admin experience, auth flow, rotation state, and admin routing. |
| `src/components/admin/` | Admin tabs, editors, reports, shared UI, and admin helpers. |
| `src/data/` | Curriculum, articles, quizzes, cases, trials, guides, images, constants, and content tests. |
| `src/utils/` | Firebase access, local/remote store, validation, search, analytics, gamification, spaced repetition, and rotation logic. |
| `public/decks/` | PDF teaching decks shipped with the app. |
| `decks/` | Editable PPTX deck files generated from the deck scripts. |
| `scripts/` | Link checker and deck-generation scripts. |
| `docs/` | Project documentation, audits, app-store notes, and the project master file. |
| `firebase.json` | Firebase Hosting and Firestore configuration. |
| `firestore.rules` | Firestore security rules. |
| `rules-tests/` | Firestore rules test suite (emulator-based, see "Firestore Rules Tests" below). |

## Firebase Notes

- Admin access uses Firebase Auth plus an `/admins/{uid}` document.
- Admin invites are stored in `/adminInvites/{email}`.
- Rotation access is scoped through rotation ownership/admin membership in Firestore rules.
- Rotation data lives under `/rotations/{rotationCode}` with student and team subcollections.
- Student assignment lookup lives under `/studentAssignments/{studentId}`.
- Student sign-in uses email verification plus a PIN-backed Firebase credential.
- Raw student login PINs should not be stored in student documents.
- The admin PIN is a local second lock for an already signed-in admin device and is intentionally stripped from shared rotation settings.

## Firestore Rules Tests

`firestore.rules` is covered by an automated test suite in `rules-tests/`,
separate from the unit-test suite (`vitest.rules.config.ts` vs.
`vitest.config.ts`) so the Firestore-emulator-dependent tests never slow down
`npm test`.

Run locally:

```bash
npm run test:rules
```

This boots the Firestore emulator (`firebase emulators:exec --only firestore`)
and runs `rules-tests/**/*.test.ts` against it with
`@firebase/rules-unit-testing`.

**Requires a JDK at version 21 or newer** (the Firestore emulator will refuse
to start on anything older, including Java 8/11). If `java -version` reports
something below 21, install a current JDK (e.g. via
[Adoptium Temurin](https://adoptium.net/)) before running this script; it is
not required for any other local dev workflow. CI runs this suite in its own
`rules` job with `actions/setup-java` (temurin 21), independent of the main
`verify` job.

## Deployment

Firebase Hosting serves `dist/` and rewrites all routes to `index.html`.

Typical deployment sequence:

```bash
npm run build
firebase deploy
```

The repo currently includes Firebase configuration files, but deployment requires the Firebase CLI to be authenticated to the correct project.

## Rotation Handoff Checklist

For the step-by-step version, run through [docs/SMOKE_TEST.md](docs/SMOKE_TEST.md).

- Confirm the active rotation exists and has the correct dates, location, duration, curriculum, articles, announcements, and clinic guides.
- Confirm the admin account can sign in, open the target rotation, and has a local admin PIN set.
- Confirm at least one test student can verify email, create a PIN, join the rotation, complete an item, and sync progress.
- Review cohort visibility expectations with the attending before students join.
- Run the pre-deploy checks above and review any external link failures.
- Deploy only after `npm run build` succeeds.

## Repo Hygiene

- `dist/`, `node_modules/`, local env files, Firebase cache, and temporary output are ignored.
- Deck source scripts live in `scripts/decks/`; editable generated PPTX files live in `decks/`.
- Published deck PDFs live in `public/decks/` when they are meant to ship with the app.
- Planning docs live in `docs/`; dated audit reports are historical snapshots, not the current release checklist.
