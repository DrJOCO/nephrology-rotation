# Pre-Cohort Smoke Test

A manual test script to run before each new student cohort. It covers the flows unit tests cannot reach: email verification, PIN creation, rotation join, first sync, offline queueing, and admin rotation setup. Budget about 20–30 minutes.

Run it against the deployed app (the same URL students will use), not the local dev server, unless you are specifically testing a pre-deploy build.

## What You Need

- The admin account credentials (or the master admin account, `joncheng5@gmail.com`).
- A test student email you control and can open the verification link from — ideally on the same device/browser you use for the student steps.
- The rotation code for the upcoming cohort.
- A phone or a desktop browser with DevTools (for the offline scenario).
- Optional: access to the Firebase console for the project, for the "if this fails" checks.

Use a private/incognito window (or a second browser) for the student steps so admin and student sessions don't share localStorage.

---

## Scenario 1 — Admin sign-in, PIN gate, and rotation setup

**Steps**

1. Open the app and switch to the admin panel.
2. Sign in with the admin email/password (or Google sign-in).
3. Pass the local admin PIN gate. If no PIN is set on this device, the PIN setup screen should appear — set one.
4. Connect to the target rotation for the upcoming cohort. If no rotation is connected, a "No rotation connected" banner with a rotation picker appears on entry — choose the rotation and press Connect. (Connecting from the Rotation tab also works.) If the rotation doesn't exist yet, create it on the Rotation tab with the correct code.
5. Review the rotation settings: start date, duration, location, attending info.
6. Skim the content: from the Settings tab, open the "Curriculum & Content" section and confirm curriculum weeks, articles, announcements, and clinic guides look right for this cohort.
7. If you changed anything, publish the changes to students.

**Expected result**

- Sign-in succeeds and the PIN gate accepts the local PIN.
- The rotation connects and shows the expected code, dates, and content.
- Publish completes without an error toast.

**If this fails, look at**

- Sign-in errors: `src/utils/firebase.ts` (admin auth helpers) and the Firebase console → Authentication. Admin access also requires an `/admins/{uid}` document in Firestore; invites live in `/adminInvites/{email}`.
- PIN gate: the admin PIN is a local second lock stored in rotation settings on this device (`src/components/admin/AdminPinGate.tsx`, `src/components/AdminPanel.tsx`). It is intentionally stripped from settings shared with students.
- Rotation connect/create: the shared `connectRotation` path in `src/components/AdminPanel.tsx` (used by both the on-entry picker banner and the Rotation tab), the create form in `src/components/admin/SettingsTab.tsx`, `store.createRotation` in `src/utils/store.ts`, and Firestore `/rotations/{code}` and `/rotationCodes/{code}`.
- Publish failures: usually connectivity or Firestore rules (`firestore.rules`) — confirm the signed-in admin owns or administers the rotation.

---

## Scenario 2 — Student happy path (first-time join)

Use the test student account, in a private window.

**Steps**

1. Open the app as a student. Choose the first-time path (not "Already have a PIN?").
2. Enter the test student name and email, and send the email verification link.
3. Open the verification link from the email **on the same device/browser**. You should land back in the app with the email verified.
4. Create the 4-digit PIN (entered twice).
5. Enter the rotation code and join.
6. Complete one module item (open the current week's module and mark/read one item to completion).
7. Answer one quiz question (start the module quiz and answer at least one vignette).
8. Switch to the admin panel (your other window), open the Students tab, and confirm the test student appears with nonzero progress. Students appear in real time while the rotation is connected; a refresh should not be necessary, but is acceptable.

**Expected result**

- Verification link arrives and completes without an "expired/invalid link" error.
- PIN creation succeeds and the rotation join lands on the student home screen with the rotation code visible in the profile.
- The test student shows up in the admin student list with the completed item/quiz activity reflected.

**If this fails, look at**

- No verification email: Firebase console → Authentication (email link sign-in must be enabled; check the authorized domains list). Error text mapping lives in `src/hooks/useStudentAuth.ts`.
- "This verification link is not available from this site": the link was opened on a different domain than the app is authorized for — Firebase Auth authorized domains.
- Link opened on a different device/browser: the app will ask you to re-enter the same email; that is expected behavior, not a bug.
- PIN/join logic: `handleJoinRotation` in `src/hooks/useStudentAuth.ts` and `src/components/student/LoginScreen.tsx`. PIN length and credential handling: `src/utils/firebase.ts`.
- Student not appearing in admin list: Firestore `/rotations/{code}/students/{studentId}` and `/studentAssignments/{studentId}`; the admin real-time listener is in `src/components/AdminPanel.tsx`; write path is `store.setStudentData` in `src/utils/store.ts`.

---

## Scenario 3 — Returning student sign-in

**Steps**

1. In the student window, end the session / sign out (profile sheet → end session).
2. Sign back in on the returning path with the test student's email and the 4-digit PIN from Scenario 2.

**Expected result**

- Sign-in succeeds without needing a new verification email or rotation code.
- Prior progress (the completed item and quiz answer) is restored, not reset.

**If this fails, look at**

- "That email and PIN did not match": PIN-backed credential in `src/utils/firebase.ts`; a PIN reset ("send a reset link") re-runs verification and sets a new PIN.
- "We couldn't find a student account for that email": the first-time flow never completed — redo Scenario 2.
- Progress missing after sign-in: rotation lookup via `/studentAssignments/{studentId}` and the student doc hydration in `src/hooks/useStudentSync.ts` / `src/utils/store.ts`.

---

## Scenario 4 — Offline queue and re-sync

Stay signed in as the test student.

**Steps**

1. Go offline: airplane mode on a phone, or DevTools → Network → Offline in a desktop browser.
2. Complete another module item (or answer another quiz question).
3. Confirm the offline banner appears under the header and mentions queued updates that will sync when reconnected.
4. Go back online.
5. Confirm the banner switches to a "waiting to sync — retrying automatically" state and then clears entirely once the queue drains.
6. In the admin Students tab, confirm the offline-completed activity now shows for the test student.

**Expected result**

- Work done offline is not lost; the banner is honest about the queued count; the queue drains on reconnect and the banner disappears.

**If this fails, look at**

- Banner logic: the offline/pending banner is rendered in `src/components/StudentApp.tsx`, driven by the `online` / `pendingSyncCount` state from `src/hooks/useStudentSync.ts`.
- Queue behavior: `flushPendingSyncQueue` and the `neph_pendingSyncQueue` localStorage key in `src/utils/store.ts`. `src/hooks/useStudentSync.ts` re-flushes the queue on reconnect and retries every 30 seconds while anything is queued; items that still fail stay queued (check the browser console for "Queued sync flush failed").
- Data that synced but doesn't appear in admin: same Firestore paths as Scenario 2.

---

## Scenario 5 — Wrong and edge inputs

**Steps**

1. In a fresh student session (or after ending the session), try the first-time flow with a **bad rotation code** (e.g., a typo of the real code).
2. Try the returning flow with the correct email but a **wrong PIN**.
3. Enter the wrong PIN a few more times.

**Expected result**

- Bad rotation code: a clear "rotation not found — check the code with your attending" style error. It should not count against PIN attempts or partially join anything.
- Wrong PIN: a clear mismatch error offering to verify email again / reset the PIN.
- Repeated wrong PINs: a temporary lockout message (roughly 30 seconds) rather than unlimited retries.

**If this fails, look at**

- Error copy and rate limiting: `handleJoinRotation` and the auth error mapping in `src/hooks/useStudentAuth.ts` (five wrong PINs trigger the 30-second lockout; a bad rotation code deliberately does not count against it).
- If a bad code somehow "joins": `store.validateRotationCode` in `src/utils/store.ts` and Firestore `/rotations/{code}`.

---

## Scenario 6 — Cleanup

Don't let the test student pollute cohort analytics or reports.

**Steps**

1. In the admin panel, open the Students tab, find the test student, and use Remove (confirm the prompt).
2. Confirm the test student no longer appears in the student list, analytics, or cohort reports.
3. In the student window, end the session so the device's local state is cleared for the real user.
4. Optional (Firebase console): removal deletes the student and team docs under `/rotations/{code}`; if you plan to reuse the same test email next cohort, also check `/studentAssignments/{studentId}` and the Authentication user so the account behaves like a fresh or returning student as you intend.

**Expected result**

- The rotation's student list and analytics contain only real students before the cohort starts.

**If this fails, look at**

- Removal path: `deleteStudentRecord` in `src/components/AdminPanel.tsx` → `store.deleteStudentData` in `src/utils/store.ts` (deletes `/rotations/{code}/students/{studentId}` and `/rotations/{code}/team/{studentId}`).

---

## After the Run

- Any scenario failed → fix before students join; re-run at least that scenario plus Scenario 2.
- All passed → finish the remaining items on the [Rotation Handoff Checklist](../README.md#rotation-handoff-checklist) (pre-deploy checks, link review, cohort visibility expectations) and deploy.
