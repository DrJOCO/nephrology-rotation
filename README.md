# Nephrology Rotation Education App

React + TypeScript + Vite app for nephrology rotation teaching. Students use it for onboarding, quizzes, cases, study sheets, patient-topic logging, spaced review, and cohort progress. Admins use Firebase-backed tools to manage rotations, curriculum, announcements, student progress, reports, and teaching materials.

## Stack

- React 19, TypeScript, Vite
- Firebase Auth, Firestore, Firebase Hosting
- Vitest for unit and content checks
- ESLint for static checks
- Vite build plugin for `sw.js` offline shell caching

## Local Setup

```bash
npm install
npm run dev
```

Create a local `.env.local` with the Firebase web config values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Checks

Run these before a rotation handoff or deploy:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:links
```

`npm run check:links` reaches external content links and can fail because of network or upstream site behavior. Treat failures as items to review, not as automatic proof that the source is unusable.

## Firebase Notes

- Admin access uses Firebase Auth plus an `/admins/{uid}` document.
- Rotation access is scoped through rotation ownership/admin membership in Firestore rules.
- Student sign-in uses email verification plus a PIN-backed Firebase credential.
- Raw student login PINs should not be stored in student documents.
- The admin PIN is a local second lock for an already signed-in admin device; it is intentionally stripped from shared rotation settings.

## May Run Checklist

- Confirm the active rotation exists and has the correct dates, location, curriculum, articles, announcements, and clinic guides.
- Confirm the admin account can sign in, open the target rotation, and has a local admin PIN set.
- Confirm at least one test student can verify email, create a PIN, join the rotation, complete an item, and sync progress.
- Review cohort visibility expectations with the attending before students join.
- Run the check commands above and review any external link failures.
- Deploy only after `npm run build` succeeds.

## Repo Hygiene

- `dist/`, `node_modules/`, local env files, Firebase cache, and temporary output are ignored.
- Deck source scripts live in `scripts/decks/`.
- Published deck files live in `public/decks/` when they are meant to ship with the app.
- Planning docs live in `docs/`; dated audit reports are historical snapshots, not the current release checklist.
