# 02 — Production deploy on merge to main

**What to build:** After a merge to main and green CI checks, production deploys to `baby-registry-prod.mugikhan.workers.dev` with no manual steps. Strangers see the PIN page. A guest with the PIN sees "Our list is coming soon", because production is never seeded. One file declares the whole deployment, and its state lives in Cloudflare. Spec: `docs/specs/04-deploy-pipeline.md`.

**Blocked by:** 01 — Security headers and CSP.

**Status:** ready-for-agent

- [ ] `alchemy` is a dev dependency on the 0.93 line. `alchemy.run.ts` declares app `baby-registry`, reads its stage from `STAGE`, and fails when `STAGE` is missing.
- [ ] State uses `CloudflareStateStore` with `scriptName` set to `baby-registry-state` and its own `ALCHEMY_STATE_TOKEN`. It never touches finslamic's `alchemy-state-service`.
- [ ] The app declares a D1 database with `migrationsDir` set to the Drizzle folder, and an R2 bucket for images. Preview buckets empty themselves on delete. The production bucket does not.
- [ ] `TanStackStart` wraps the existing Vite build. It binds `DB`, `IMAGES`, `FAMILY_PIN`, `SESSION_SECRET`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, keeps `nodejs_compat` and the compatibility date, and turns observability on.
- [ ] Production secrets come from env vars wrapped in `alchemy.secret()`. A missing value fails the deploy.
- [ ] The Worker's name is `baby-registry-<stage>`, so production serves on `baby-registry-prod.mugikhan.workers.dev`.
- [ ] Production binds the existing "Baby Registry" Turnstile widget through the `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` GitHub secrets. The README records that the widget lives outside Alchemy.
- [ ] The app prints the Worker URL and the D1 database name.
- [ ] `deploy` and `destroy` package scripts run against `STAGE`.
- [ ] `wrangler.jsonc` stays for local dev and Vitest. Local dev and CI checks still need no Cloudflare credentials.
- [ ] A `deploy-production` job in the CI workflow runs on push to main after `ci`. It has its own concurrency group without cancel-in-progress.
- [ ] After the merge, production answers over HTTPS. It redirects to `/pin`, sends the CSP and `X-Robots-Tag`, and shows that migrations 0000 to 0004 ran.
- [ ] The README lists the deploy commands and every GitHub secret.
