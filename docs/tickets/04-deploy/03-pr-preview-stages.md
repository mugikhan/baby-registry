# 03 — PR preview stages

**What to build:** Each pull request gets its own preview stage, with its own D1 database and R2 bucket, filled with the demo data. One comment on the pull request gives the preview URL and updates on each push. Closing the pull request destroys the stage. Production can never be destroyed by this path. Spec: `docs/specs/04-deploy-pipeline.md`.

**Blocked by:** 02 — Production deploy on merge to main.

**Status:** ready-for-agent

- [ ] The CI workflow's `pull_request` trigger adds the `closed` type. The `ci` job skips closed events.
- [ ] A `deploy-preview` job runs after `ci` on pull request events other than `closed`. It skips pull requests from forks and deploys stage `pr-<number>`.
- [ ] Previews bind `PREVIEW_FAMILY_PIN`, `PREVIEW_SESSION_SECRET` and Cloudflare's always-pass Turnstile test keys.
- [ ] After the deploy, the job seeds the stage's D1 with the existing seed file through `wrangler d1 execute --remote`. Production is never seeded.
- [ ] The job posts one preview comment with the Worker URL and edits it on later pushes. Only this job has `pull-requests: write`.
- [ ] A `destroy-preview` job runs on `closed`. It refuses to run when the stage is `prod`, then destroys stage `pr-<number>`.
- [ ] Each stage has its own deploy concurrency group without cancel-in-progress.
- [ ] Checked by use: this ticket's pull request gets a working, seeded preview behind the preview PIN, and closing a throwaway pull request removes its Worker, D1 and R2 bucket.
