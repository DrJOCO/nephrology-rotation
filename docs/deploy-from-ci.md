# Deploying from GitHub Actions

The `Deploy` workflow (`.github/workflows/deploy.yml`) runs the playbook §5
deploy sequence from a GitHub Actions runner, so a deploy no longer requires a
machine with an authenticated Firebase CLI. It is **manual-only**
(`workflow_dispatch`) — the playbook rule that production actions need an
explicit go still holds; the "go" is clicking **Run workflow**.

## One-time setup: mint the deploy credential

1. Google Cloud console → project **nephrology-rotation** → *IAM & Admin* →
   *Service Accounts* → **Create service account** (suggested name:
   `github-deploy`).
2. Grant it two roles:
   - **Firebase Admin** (`roles/firebase.admin`) — rules, indexes, functions,
     hosting deploys.
   - **Service Account User** (`roles/iam.serviceAccountUser`) — required to
     deploy v2 Cloud Functions, which run as the default compute service
     account.
3. On the new service account: *Keys* → *Add key* → *Create new key* → JSON.
   A key file downloads.
4. GitHub repo → *Settings* → *Secrets and variables* → *Actions* →
   **New repository secret** → name `FIREBASE_SERVICE_ACCOUNT`, value = the
   **entire contents** of the JSON key file.
5. Delete the downloaded key file from your machine.

Treat the secret like a production password: it can deploy anything in the
project. If it ever leaks, delete the key on the service account (IAM →
Service Accounts → Keys) — that invalidates the secret instantly — then mint
and store a new one.

## Running a deploy

GitHub → *Actions* tab → **Deploy** → *Run workflow* → choose:

| Target | What runs |
|---|---|
| `all` | firestore (rules + indexes) → functions → hosting + live-verify |
| `firestore` | rules + indexes only |
| `functions` | functions only |
| `hosting` | build → hosting → live-verify |

The order of `all` matches playbook §5 (rules before hosting; functions before
anything that assumes them). The live-verify step runs the four §5 checks
automatically and fails the workflow on any mismatch; the update-toast check
on a real device is still manual.

## Caveats

- **First functions deploy**: Firebase/GCP must enable several APIs
  (Cloud Functions, Cloud Build, Artifact Registry, Eventarc, Cloud Run,
  Pub/Sub). The CLI usually enables them automatically, but the very first
  run can fail on propagation lag — re-run the workflow once before
  investigating (see `functions/README.md`, "First-deploy prompts / IAM").
- **Function deletions**: the workflow deploys without `--force`, so a
  release that removes a function fails instead of silently deleting it.
  That failure is a prompt for an explicit decision, not a bug.
- **Rollback**: playbook §5 protocol (hosting release history for hosting;
  redeploy a previous SHA's rules; `firebase functions:delete <name>` for a
  bad function — the client tolerates absent functions by design).
