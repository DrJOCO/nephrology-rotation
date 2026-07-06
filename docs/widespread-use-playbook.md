# Widespread-Use Execution Playbook

_Companion to [widespread-use-plan.md](widespread-use-plan.md) (the WHAT — 15
workstream specs). This document is the HOW: when to run each wave, what to
decide first, what to type into Claude Code, and how each wave is verified,
deployed, and rolled back. Drafted 2026-07-05, right after the July round
shipped (PR #14) using exactly the process this playbook generalizes._

---

## 1. The operating rhythm (proven July 5)

Every wave runs the same way the July 5 round did. That round is the
calibration point: **4 parallel worktree agents, ~1,650 lines changed, 79 new
tests, reviewed + integrated + deployed in one day**, with 3 cross-branch bugs
caught at the review/integration step — which is why the review step is not
optional.

**The cycle:**

1. **Preflight** (5 min): `git status` clean on main → `git pull` → `npm ci`
   → `npm run typecheck && npm run lint && npm test` green → confirm whether a
   cohort is live (check the rotation dates in the admin panel). Risky items
   (migrations, auth flips, rules rewrites) wait for a rotation gap; additive
   items can ship mid-cohort.
2. **Launch**: open Claude Code in the repo and paste the wave prompt from
   §4 below. The lead session spawns one worktree agent per workstream (opus
   for rules/auth/sync/migrations, sonnet for UI/scripts — the plan doc tags
   each), each with the workstream spec verbatim plus the standing
   constraints (§1a).
3. **Review gate** (the step that caught 3 real bugs in July): the lead
   session must independently re-run each agent's toolchain claims and read
   the diffs of every rules/auth/sync/migration file — not just the reports.
   Then merge all branches onto `integration/<name>`, resolve conflicts, fix
   cross-branch interactions, and run the full toolchain + production build.
4. **PR + CI**: push the integration branch, open a PR against main, let the
   `verify` job run. Human skim of the PR summary.
5. **Deploy** (explicit go required — the permission system enforces this):
   §5 protocol.
6. **Record**: update the checklist in §6 and the session memory so the next
   session starts oriented.

### 1a. Standing constraints — include in EVERY agent prompt

> A live cohort may be using the deployed app. Every change must be backward
> compatible with existing Firestore data AND old clients still running the
> previous deploy, or be gated behind a feature flag. Quality bar:
> `npm run typecheck`, `npm run lint`, `npm test` all green; add focused tests
> for everything new; match the repo's comment discipline (comments only for
> non-obvious constraints); no drive-by reformatting. Run `npm ci` first
> (worktrees have no node_modules). Commit per logical unit with clear
> messages; do not push. Your final message is a report for the reviewing
> agent: design decisions and deviations, files changed, exact toolchain
> output, compat notes, known limitations, branch + SHAs.

---

## 2. Decide first (Phase 0 worksheets)

Answer these before Wave 2. Record each answer by editing the plan doc's
Phase 0 section AND telling Claude to save it to memory.

### D1 — Compliance posture (blocks WS-9, WS-11, WS-14; shapes Wave 2 design)
Ask yourself: (1) Will programs I don't personally supervise use this within
a year? (2) Am I willing to give up free-text patient descriptions?
- **BAA route** if 1=yes and 2=no: accept Google Cloud BAA (project setting +
  service restrictions), keep consult free text, add audit logging. Ongoing
  discipline: every new service (e.g. Sentry) needs its own BAA or hard
  scrubbing. Cost: config + vigilance, not dollars.
- **De-identification route** if 2=yes (recommended for open distribution):
  consults become structured pickers (topic/acuity/service/day), existing
  records get scrubbed by migration. Cost: one redesign of PatientTab + a
  lossy migration you must sign off on.
- Gut default if undecided: **de-identify**. It removes the whole question.

### D2 — Tenancy (blocks WS-5)
Default: **single Firebase project, org-scoped docs** (the plan is written
for this). Only revisit if an institution demands data custody — that turns
WS-5/6/7 into a template-repo product, a different business.

### D3 — Billing (blocks WS-4, i.e. all of Waves 3+)
Upgrade the project to **Blaze** and set budget alerts ($10 and $50/mo).
Expected cost at current scale: ~$0–5/mo (Functions invocations + Firestore
reads well inside free quotas). Do this whenever — it's 10 minutes in the
console and nothing else in Wave 1 depends on it except WS-4's deploy.

### D4 — Distribution surface (defer)
Stay PWA-only through Wave 2. Revisit `app-store-readiness.md` only when a
partner program asks for a store listing.

---

## 3. Calendar roadmap (anchor: rotation gaps)

Rotations run ~2 weeks with gaps between cohorts. Rule: **migrations, auth
flips, and rules rewrites deploy in gaps; additive/flag-gated work can ship
mid-cohort.** GS-26 is live now (started 2026-07-02).

| When | What | Why this slot |
|---|---|---|
| **Mid-GS-26 (now)** | Decide D1–D4. Do Blaze upgrade (D3). | No code risk. |
| **Any time (mid-cohort OK)** | **Wave 1** — WS-1 rules tests, WS-2 Sentry, WS-3 flags, WS-4 functions. All additive; WS-4's aggregate simplification is fallback-guarded. | Nothing touches student write paths. |
| **First gap after GS-26 (~late July)** | **Wave 2** — WS-5 orgs (5a → 5b/5c), WS-6 auth, WS-7 onboarding. Run the org migration script and flip `authPinRetired` IN THE GAP; the code can merge earlier flag-off. | Rules rewrite + migration want zero live writers. |
| **Following gap (~1–2 cohorts later)** | **Wave 3** — WS-8 content packs, WS-10 aggregates; WS-9 (server stamps + doc split) gets its design round mid-cohort and implementation in the gap. WS-9a additionally wants one full cohort running flag-off before the flag flips. | Riskiest data-model work; needs its own dry run on a preview channel + emulator data. |
| **Rolling, low risk** | **Wave 4** — WS-11 (per D1), WS-12 legal, WS-13 a11y, WS-14 export, WS-15 releases. Slot individually into any quiet week. | Mostly additive; WS-11b's scrub migration is the one gap-only item. |

Realistic pace at one-wave-per-gap: **Wave 1 in July, Wave 2 late July/August,
Wave 3 September-ish, Wave 4 sprinkled through fall.** After Wave 2 you can
onboard a second attending; after Waves 3–4, a second institution.

---

## 4. Copy-paste wave prompts

Adjust bracketed bits, paste into a fresh Claude Code session in the repo.

### Wave 1
> Read docs/widespread-use-plan.md and docs/widespread-use-playbook.md.
> Execute Wave 1: WS-1, WS-2, WS-3 [and WS-4 — Blaze is done / skip WS-4,
> Blaze pending]. Use parallel worktree agents like the July 5 round (see the
> playbook §1, including the standing constraints in every prompt), review
> each agent's diff yourself with independent toolchain verification,
> integrate on a branch, open a PR. Do not deploy without my explicit go.
> [For WS-2: Sentry DSN is ____ / create instructions for me to mint one.]

### Wave 2 (in a rotation gap; decisions D1/D2 answered)
> Read docs/widespread-use-plan.md and docs/widespread-use-playbook.md.
> Execute Wave 2. Decisions: D1=[BAA|de-identify], D2=single-project.
> WS-5a first (rules+model+migration, opus, design review with me before
> implementation), then WS-5b/5c and WS-6/WS-7 in parallel. WS-6: magic-link
> only behind the authPinRetired flag, default OFF; verify passkey support
> before designing any passkey work. No cohort is live between [date] and
> [date] — the org migration script and rules deploy must happen in that
> window. Review, integrate, PR; deploy only on my go; rules before hosting.

### Wave 3 (design first, then gap implementation)
> Read the plan + playbook. This session: design review only for WS-8 and
> WS-9 — have opus agents produce design docs per the specs, challenge them
> adversarially (a skeptic agent per design), and give me a decision summary.
> Implementation happens next session after I approve.

### Wave 4 (pick items individually)
> Read the plan + playbook. Execute WS-[13/14/15] as a single worktree agent
> with the standing constraints; review and PR as usual.

### Any wave, after my review gate passes
> Merge and deploy. [= PR merge → rules first if changed → build → hosting →
> live-verify per playbook §5.]

---

## 5. Deploy & rollback protocol

**Order** (when rules changed): `npx firebase deploy --only firestore:rules`
→ optional `npm run deploy:preview` staging spot-check → `npx firebase deploy
--only hosting`. Functions (post-WS-4): deploy functions BEFORE rules that
assume them, otherwise with hosting.

**Live-verify checklist** (July 5 versions of these all passed):
```
curl -s  https://nephrology-rotation.web.app/index.html | grep -oE 'assets/index-[^"]+\.js'   # matches dist/index.html
curl -sI https://nephrology-rotation.web.app/index.html | grep -i cache-control                # no-cache
curl -sI https://nephrology-rotation.web.app/sw.js      | grep -i cache-control                # no-cache
curl -s  https://nephrology-rotation.web.app/sw.js      | grep -c SKIP_WAITING                 # 1
```
Then on a real device: update toast appears → tap → reloads onto new build.

**Rollback:**
- Hosting: Firebase console → Hosting → release history → rollback (instant),
  or redeploy the previous git tag.
- Rules: `git checkout <prev-sha> -- firestore.rules && npx firebase deploy
  --only firestore:rules`. Rules are rules-only state — always safe to
  redeploy an older version, but remember new-client features that depend on
  new rules will queue/fail closed until re-rolled forward.
- Migrations (WS-5c, WS-11b): every migration script must print a dry-run
  diff first and write a backup export before mutating. No exceptions —
  reject any agent-written migration without both.
- Flags (post-WS-3): the first rollback lever. Flip the flag off before
  touching deploys.

---

## 6. Tracking checklist

Update the Status column as things land (agent sessions should do this in
their final commit).

| Item | Status | Landed / notes |
|---|---|---|
| D1 compliance decision | ✅ decided 2026-07-05 | De-identification route (WS-11b): no free-text patient data |
| D2 tenancy decision | ☐ pending (default: single project) | |
| D3 Blaze + budget alerts | ☐ in progress | Needs Dr. Cheng in the console (billing link is account-interactive); steps in §2 |
| D4 distribution | ☐ deferred by default | |
| WS-1 rules test harness | ☐ | |
| WS-2 observability | ☐ | |
| WS-3 feature flags | ☐ | |
| WS-4 functions foundation | ☐ | |
| WS-5 orgs (a/b/c) | ☐ | gap-deploy only |
| WS-6 auth upgrade | ☐ | flag flip in gap |
| WS-7 onboarding wizard | ☐ | |
| WS-8 content packs | ☐ | design review first |
| WS-9 server stamps + doc split | ☐ | design review first; cohort soak |
| WS-10 aggregates | ☐ | |
| WS-11 PHI posture | ☐ | per D1 |
| WS-12 legal/retention | ☐ | |
| WS-13 a11y | ☐ | |
| WS-14 export | ☐ | |
| WS-15 release discipline | ☐ | |

---

## 7. Ground rules that made July 5 work (keep them)

1. **One agent owns coupled files.** Everything touching
   store.ts/useStudentSync.ts/firestore.rules sync logic goes to ONE agent,
   sequentially — parallel agents there produce unresolvable merges.
2. **The reviewer re-verifies, never trusts.** Re-run tests in each worktree;
   read every rules/auth/sync diff line by line. July's three integration
   bugs (effect-ordering race, preview bypass, first-install reload) were
   invisible to the agents that wrote them.
3. **Agents never push or deploy.** Integration, PR, and deploy stay with the
   lead session; production actions wait for an explicit "merge and deploy".
4. **Backward compatibility is proven, not asserted.** Tests must include
   "old client / pre-migration doc behaves exactly as today" cases (the
   fieldStamps work is the template: stamps missing → byte-identical old
   behavior).
5. **Migrations are idempotent and preserve unknowns** (article-key migration
   is the template: same-reference no-op, never drops data, leaves unmatched
   keys for a later pass).
6. **After every deploy, live-verify** (§5) and update memory + this
   checklist before ending the session.
