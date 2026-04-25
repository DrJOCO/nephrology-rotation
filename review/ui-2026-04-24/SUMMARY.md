# Student-Facing UI Review — 2026-04-24 (refreshed 2026-04-25)

This folder bundles the student-app UI work for review before the May rotation kickoff.

**Two distinct change sets in this snapshot:**
1. **UI cleanup pass** (Apr 24) — login, HomeTab cuts, library reorder, patient cap, quiz fixes, eyebrow sweep, etc. The bulk of the diff.
2. **Palette PR 1** (Apr 25) — adds 8 semantic tokens (`brand` / `success` / `warning` / `danger` × ink + bg) to both light and dark themes in `helpers.ts` + `constants.ts`. **Zero visual change** since nothing imports them yet. Path A: brand keeps the existing deep-red identity; danger pushed toward classic alert-red (`#c0392b` light / `#ef6c5e` dark) to widen the brand-vs-danger gap. PR 2 (component sweep) and PR 3 (alias removal) are pending.

## Files in this folder

- `SUMMARY.md` — this file (what changed and why)
- `CHANGED_FILES.md` — per-file change list with rationale
- `changes.diff` — full unified diff of all UI changes vs `main` HEAD
- `src/` — copies of every modified UI file at this revision (so reviewers can read them in isolation, no git checkout needed)

## What changed at a glance

The goal of this pass was **"easy to use."** Across every student-facing screen we trimmed visual noise, cut redundant sections, fixed friction points flagged in the [project audit](../../docs/project-audit-2026-04-23.md), and eliminated a handful of real bugs.

### Login (`LoginScreen.tsx`)
- Mobile drops the navy marketing card and leads straight with the form
- Removed "STUDENT ACCESS" shield badge (felt enterprise SSO-y)
- App name is now consistently "Nephrology Rotation" (was "Nephrology Rotation Helper" on login, "Nephrology Rotation" elsewhere)
- "Locked until email is verified" → "Add after we verify your email"
- "Sign In" → "Continue" while in first-time mode (before there's a PIN)
- New helper text after sending verification: "Don't see it within 2 minutes? Check spam, or try a personal email — hospital networks sometimes block these."

### Today / Home (`HomeTab.tsx`) — biggest cuts
- Removed the End-of-Day Reflection section entirely (two free-text fields students wouldn't fill)
- Removed the Competency Preview section (duplicated the Me tab)
- Removed the Assessment section (moved CTA to Me tab)
- Removed the Quick Links section (everything's in nav)
- Start checklist trimmed from 6 → 4 items: study sheet, deck, case, quiz (dropped baseline + reflection items)
- Patient suggestions section: "Let the service pick the first topic" → "Suggested from your inpatients"
- Inpatient empty state consolidated to one message
- Streak chip de-duplicated (was rendering 3 times across header + Today + Me; now header only)
- Eyebrow labels stripped: "Next up", "Assessment", "Assessment insight", "From your inpatients", "Start here", "Spaced repetition", `learningPlan.label`, "Install"
- Install prompt's blue gradient background flattened to plain card
- 240 lines of dead code removed (orphaned `ProgressRing` + `AssessmentSection` after the section cuts)
- File: 1436 → 922 lines

### Library (`GuideTab.tsx`)
- **Inpatient Consult Guides promoted to hero** (the green-bordered gradient block) — was Friday Clinic
- Friday Clinic Guides demoted to plain section, renamed "Clinic Guides" (dropped Friday framing — the rotation isn't Friday-only)
- FAQ button: lost yellow card, now plain
- Trial Library button: lost gold gradient + bold treatment, now plain
- "More Guides" → "Rotation Playbook" with descriptive subtitle
- Subtitle ellipsis truncation removed (now wraps on small phones — was clipping mid-word on iPhone SE)

### Inpatients (`PatientTab.tsx`)
- **Enforces max 2 learning tags** (was unlimited despite hint saying "main one or two") — chips disable visually when at cap, with helper text
- Same cap applied to edit form
- Topic colors redesigned to reduce collisions (AKI/Glomerulonephritis/Kidney Biopsy were all red shades; now distinct)
- "D/C" button (which paired with a Check icon, looking like "complete") → "Discharge"
- Removed 12-second auto-dismiss on the topic suggestions panel (was jarring mid-read)
- `EduDisclaimer` footer added

### Cohort (`TeamTab.tsx`)
- Page title "Leaderboard" → "Cohort" (matches the bottom-nav label)
- Removed the redundant "Friendly competition" card (rank info was already on per-student cards)
- Removed the "Cohort leaderboard" h3 (page title is already "Cohort")

### Me / Progress (`ProgressTab.tsx`)
- Dropped the 4-card metric strip (Proficient/Developing/Active patients/Quizzes logged) — duplicated info from the competency map
- Achievements card now hidden when count is 0 (was discouraging "0" badge for new students)
- Streak chip removed from both Momentum and Consistency sections (it's already in the header)
- All eyebrow labels (~13 of them) stripped from metric cards
- New CTAs: "Take baseline quiz" appears in Consistency when no preScore; "Take post-rotation quiz" when preScore but no postScore — replaces the cut HomeTab Assessment section

### Topic Browse (`TopicBrowseView.tsx`)
- Topics with no content are now hidden (was showing "Coming soon" — read as "this app isn't done")
- Topics grouped by clinical domain: AKI & Volume / CKD / Lytes & Acid-Base / Glomerular & Urinalysis / Dialysis / Transplant / Hypertension & Other
- Eyebrow labels stripped from sub-section headers

### Quiz (`QuizEngine.tsx`) — bug fixes
- **Progress bar bug fixed**: was inflating to 50% after answering Q1 of 2 (added showResult to the count). Now shows `answers.length / quizLen` — true completion ratio.
- **New "Exit" button** with save-and-continue confirmation. Previously students who got pulled into rounds mid-quiz were stuck — back arrow only worked before the first answer.
- "Restart" button now confirms before wiping progress

### Search (`GlobalSearchOverlay.tsx`)
- "Cmd/Ctrl+K opens search from anywhere" hint now hidden on mobile (was useless there) — replaced with "Tap a chip to narrow your search"
- Eyebrow labels stripped

### Cross-cutting copy fixes
- **Module vs Week**: swept all user-facing "Week N" → "Module N" across CasesView, LandmarkTrialsView, ArticlesView, ResourcesView, StudySheetsView, TopicBrowseView, PatientTab. The `currentWeek` variable in code is unchanged; only the label sweep.
- **Patient vs Inpatient**: HomeTab patient suggestion copy now says "inpatients"
- **Friday Clinic** terminology removed from Today hero card and ClinicGuideHistoryView
- `EduDisclaimer` component added to `shared.tsx` and dropped into StudySheetsView, CasesView, PatientTab, RotationGuideView. ClinicGuideView and InpatientGuideView already had their own footers.
- New "Show tutorial" button in Profile sheet (re-triggers the OnboardingOverlay)

## Behavior the reviewer should test on a real iPhone

1. Sign in fresh as a new student via real magic link
2. From Profile → "Show tutorial" — does the overlay reopen mid-session?
3. Inpatients tab → add a patient; try to select a 3rd learning tag → should be visually disabled with a helper line
4. Take a quiz, hit "Exit" mid-quiz → confirm save prompt; reopen quiz → confirm progress restored
5. Topic Browse → confirm domain groupings render with no "Coming soon" cards
6. Library on iPhone SE width → confirm Inpatient Consult Guides is the visible hero
7. Cohort tab → should show only one section (no "Friendly competition" mini-card)
8. Me tab → "Take baseline quiz" CTA appears for fresh student, disappears after taking it

## Verification status

- `npm run typecheck` — clean
- `npm test` — 125/125 passing
- `npm run lint` — clean
- `npm run build` — succeeds
- `npm run check:links` — 130/130 URLs OK

## Out of scope for this pass

These are still rough but were deferred for risk/scope:

- **Card density audit** — most cards still have icon + eyebrow + title + body + CTA + arrow. Could strip 2 elements per card.
- **Color palette audit** — yellow/gold/ice/blue/red/green/purple/warm all carry semantic weight somewhere. Picking 4 (red=error, gold=warn, green=done, blue=primary) and ripping the rest from decorative backgrounds is a separate session.
- **Hero card tones in HomeTab** — still uses 4 different tinted gradients (rounds/didactic/clinic/wrap). Could collapse to one.
- **Library 5 → 3 sections** — currently Inpatient hero / Clinic / Rotation Workflow / Rotation Playbook / FAQ + Trial Library. Could merge Workflow into Playbook for 4 sections, or further compress.
- **Subtitle ellipsis** — fixed in Library; other views (Bookmarks, RefDetail) may still truncate.
- **Eyebrow sweep on `RefDetailView`** — left alone because the labels are short data tags ("Full Title", "Study Details") that benefit from differentiation.
