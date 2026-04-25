# Changed Files

All paths relative to repo root. Snapshots of each are in `src/` next to this file.

| File | What changed |
| --- | --- |
| `src/components/StudentApp.tsx` | "Show tutorial" wired into ProfileSheet; minor shell cleanup |
| `src/components/student/LoginScreen.tsx` | Mobile form-first layout, removed shield badge, app name unified, button label fixed for first-time, spam-fallback hint, friendlier "Add after we verify your email" copy |
| `src/components/student/HomeTab.tsx` | Removed Reflection / Competency Preview / Assessment / Quick Links sections; Start checklist 6→4; eyebrow labels stripped; install prompt gradient flattened; 240 lines of dead code removed |
| `src/components/student/GuideTab.tsx` | Inpatient Consult Guides promoted to hero; Friday Clinic demoted + renamed "Clinic Guides"; FAQ + Trial Library demoted to plain cards; "More Guides" → "Rotation Playbook"; subtitle ellipsis fixed |
| `src/components/student/PatientTab.tsx` | Max 2 learning tags enforced (visual cap on chips); D/C → Discharge; topic colors redesigned to reduce collisions; auto-dismiss removed from suggestions; EduDisclaimer footer added |
| `src/components/student/TeamTab.tsx` | Page title "Leaderboard" → "Cohort"; removed redundant "Friendly competition" card and "Cohort leaderboard" h3 |
| `src/components/student/ProgressTab.tsx` | Dropped 4-card metric strip; achievements card hidden when 0; streak chip duplications removed; new pre/post-quiz CTAs in Consistency section; eyebrow labels stripped |
| `src/components/student/TopicBrowseView.tsx` | Topics with no content hidden ("Coming soon" gone); grouped by clinical domain (AKI / CKD / Lytes / Glomerular / Dialysis / Transplant / HTN); "Week" → "Module"; eyebrows stripped |
| `src/components/student/QuizEngine.tsx` | Progress bar formula fixed (was inflating); new Exit-with-save-prompt button; restart now confirms |
| `src/components/student/AssessmentResultsView.tsx` | Eyebrow above title removed; Score label de-styled |
| `src/components/student/CasesView.tsx` | "Week" → "Module" in titles; "Clinical Scenario" eyebrow flattened; EduDisclaimer footer added |
| `src/components/student/StudySheetsView.tsx` | "Week" → "Module"; eyebrows flattened; EduDisclaimer footer added |
| `src/components/student/RotationGuideView.tsx` | EduDisclaimer footer added |
| `src/components/student/ArticlesView.tsx` | "Week" → "Module" in title |
| `src/components/student/LandmarkTrialsView.tsx` | "Week" → "Module" in title |
| `src/components/student/ResourcesView.tsx` | "Showing Week N decks" → "Showing Module N decks"; eyebrow flattened |
| `src/components/student/ClinicGuideHistoryView.tsx` | Removed "Friday" framing from subtitle |
| `src/components/student/ClinicGuideView.tsx` | "Guideline Basis" eyebrow flattened |
| `src/components/student/BookmarksView.tsx` | Section header eyebrow flattened |
| `src/components/student/GlobalSearchOverlay.tsx` | Cmd+K hint hidden on mobile; section header eyebrows flattened |
| `src/components/student/RefsTab.tsx` | "Calculator →" / "Reference →" / "Optional reference →" type labels de-styled (no longer uppercase letterspaced) |
| `src/components/student/TrialCard.tsx` | "Full Title" / "Study Details" / "How It Changed Practice" sub-labels flattened |
| `src/components/student/shared.tsx` | New `EduDisclaimer` component (educational-use-only footer) |
| `src/utils/validation.ts` | New `LIMITS.PATIENT_TOPICS_MAX = 2` constant |
| `src/utils/helpers.ts` | **PR 1 palette**: 8 new semantic CSS variables added in both `:root` (light) and `[data-theme="dark"]` blocks. Zero visual change — nothing imports them yet. |
| `src/data/constants.ts` | **PR 1 palette**: 8 new entries on the `T` object (`brand`, `brandBg`, `success`, `successBg`, `warning`, `warningBg`, `danger`, `dangerBg`) proxying via `var(--c-*)`. |
