# Spec 04: Deploy pipeline

Slice 4 of the [PRD](../../Baby%20Registry%20—%20PRD.md) delivery plan. Covers the CI/CD row of the architecture table and the security headers from the Security table. Status: ready for agent.

## Problem Statement

The registry runs only on the developer's laptop. Nobody else can open it, so the developer can't try it on a real phone over 4G or show it to the family. A pull request has no live preview, so a reviewer must check out the branch to see a change. Nothing sends security headers yet. The PRD's 10 ms CPU limit on the Workers free plan is still a guess, because the list has never run on Cloudflare.

## Solution

Every merge to main deploys production to `workers.dev`, behind the family PIN. Every pull request gets its own preview stage, with its own D1 database and R2 bucket, filled with seed data. A comment on the pull request gives the preview URL. Closing the pull request destroys the stage. Each deploy applies the D1 migrations. Every response carries a strict CSP, `noindex` and the other security headers. The developer measures CPU per request on a seeded preview and records the result.

## User Stories

1. As the developer, I want a merge to main to deploy production, so that a change goes live without manual steps.
2. As the developer, I want production to deploy only after the CI checks pass, so that a broken build never goes live.
3. As the developer, I want each pull request to get its own preview stage, so that I can open the change on my phone before I merge it.
4. As the developer, I want the preview URL posted on the pull request, so that I don't have to look it up.
5. As the developer, I want the preview comment updated on each push, so that the pull request shows one current link.
6. As the developer, I want each preview stage to have its own D1 database and R2 bucket, so that a preview can never touch production data.
7. As the developer, I want each preview seeded with the demo data, so that every card state shows on the preview.
8. As the developer, I want production never seeded, so that guests never see fake items.
9. As the developer, I want closing a pull request to destroy its stage, so that old previews don't pile up on the account.
10. As the developer, I want the cleanup job to refuse to destroy production, so that a mistake in the workflow can't delete the real list.
11. As the developer, I want each deploy to apply pending D1 migrations, so that the schema always matches the code.
12. As the developer, I want one file to declare the Worker, D1, R2 and secrets, so that I can read the whole deployment in one place.
13. As the developer, I want deploy state kept in Cloudflare, so that my laptop and a CI runner see the same resources.
14. As the developer, I want two deploys of one stage never to run at the same time, so that deploy state never corrupts.
15. As the developer, I want a pull request from a fork to skip the deploy, so that no secret reaches untrusted code.
16. As the developer, I want production secrets kept in GitHub secrets and encrypted in deploy state, so that no secret sits in the repo.
17. As the developer, I want previews to use their own PIN and session secret, so that a leaked preview secret can't open production.
18. As the developer, I want previews to use Turnstile's test keys, so that I can sign in to any preview without a widget for each stage.
19. As the developer, I want production to use a real Turnstile widget for its hostname, so that bots can't guess the PIN.
20. As a guest, I want production served over HTTPS, so that my session cookie stays private.
21. As a guest, I want production behind the family PIN from the first deploy, so that strangers who find the link see nothing.
22. As an organiser, I want every page to send `noindex`, so that search engines never list the registry.
23. As an organiser, I want static files to send `noindex` too, so that no part of the site shows up in search.
24. As an organiser, I want a strict CSP on every page, so that an injected script can't run in a guest's browser.
25. As an organiser, I want the site to refuse to load in a frame, so that nobody can wrap it in a fake page.
26. As a guest, I want the Turnstile check to keep working under the CSP, so that I can still enter the PIN.
27. As the developer, I want the security headers on redirects and 401 responses too, so that no response goes out without them.
28. As the developer, I want to know the CPU time of a list request on Cloudflare, so that I know whether SSR fits the 10 ms limit.
29. As the developer, I want a fallback chosen if the list goes over 10 ms, so that guests don't get errors on launch day.
30. As the developer, I want Worker logs turned on, so that I can read errors from production.
31. As the developer, I want the README to show the stages and the deploy commands, without naming the secrets, so that the public repo gives attackers nothing to go on.
32. As the developer, I want local dev and the tests to keep working without Cloudflare credentials, so that CI checks still need no secrets.

## Implementation Decisions

**Alchemy app**

- Add `alchemy` as a dev dependency, pinned to the 0.93 line. The developer's finslamic repo uses the same version and is the prior art for the API: `alchemy()`, `D1Database`, `R2Bucket`, `TanStackStart`, `alchemy.secret()` and `CloudflareStateStore`.
- One `alchemy.run.ts` declares the app `baby-registry`.
- Its stage comes from a `STAGE` env var. Stage `prod` is production. Stage `pr-<number>` is a preview. A missing `STAGE` is an error. Alchemy otherwise falls back to the OS user name.
- State lives in its own `baby-registry-state` Worker, through `CloudflareStateStore` with `scriptName` set. The first deploy creates that Worker. It has its own `ALCHEMY_STATE_TOKEN`, separate from finslamic's `alchemy-state-service`. A leaked registry token then can't reach finslamic's state, and either token can rotate alone.
- `ALCHEMY_PASSWORD` encrypts secrets in state.
- Resources:
  - `D1Database` with its `migrationsDir` set to the Drizzle folder. Alchemy applies pending migrations on each deploy.
  - D1 takes the `weur` location hint, the closest region to guests in South Africa. The hint is fixed once a database exists.
  - The Worker uses Smart Placement, so it runs next to D1. A guest then pays one round trip to Europe, not one per query. Smart Placement is free on every plan.
  - `R2Bucket` for images. Preview buckets empty themselves on delete, so a destroy succeeds after slice 8 adds photos. The production bucket does not.
  - `TanStackStart` wraps the existing Vite build. Its bindings are `DB`, `IMAGES`, `FAMILY_PIN`, `SESSION_SECRET`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, the names the server config already parses. It keeps the `nodejs_compat` flag and the compatibility date from `wrangler.jsonc`. Observability is on.
- The Worker's name is set to `baby-registry-<stage>`, so the hostnames are fixed: `baby-registry-prod.mugikhan.workers.dev` for production and `baby-registry-pr-<number>.mugikhan.workers.dev` for previews. The custom domain waits for slice 10.
- The app prints the Worker URL and the D1 database name. CI reads them for the preview comment and the seed step.
- Package scripts: `deploy` and `destroy`, both run against `STAGE`.

**Local dev stays on wrangler**

- `wrangler.jsonc` stays. Local dev, `wrangler types`, the local D1 scripts and the Vitest pool keep reading it. `alchemy.run.ts` owns the deployed stages only.
- The binding names in both files must match. The server config's Zod parse fails fast on a missing binding, so a mismatch breaks the first request on a preview.
- Local dev and CI checks need no Cloudflare credentials.

**Secrets per stage**

- Production reads `FAMILY_PIN`, `SESSION_SECRET`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` from GitHub secrets. Each is wrapped in `alchemy.secret()`. A missing value fails the deploy.
- Turnstile for production: a real widget named "Baby Registry" for `baby-registry-prod.mugikhan.workers.dev`. Alchemy 0.93 has no Turnstile resource, so the widget was created once through the Cloudflare API on 26 Nov 2026. Its keys live in GitHub secrets.
- Previews read `PREVIEW_FAMILY_PIN` and `PREVIEW_SESSION_SECRET` from GitHub secrets. They use Cloudflare's always-pass Turnstile test keys, the same keys as `.dev.vars.example`.

**Workflow**

- The deploy jobs go into the existing CI workflow. The `pull_request` trigger adds the `closed` type. The existing `ci` job skips closed events.
- `deploy-preview` runs on pull request events other than `closed`. It needs `ci`, and it skips pull requests from forks. Steps: install, deploy stage `pr-<number>`, seed the stage's D1 with the existing seed file through `wrangler d1 execute --remote`, and post or update the preview comment.
- `deploy-production` runs on push to main. It needs `ci` and deploys stage `prod`. It never seeds.
- `destroy-preview` runs on `closed`. It refuses to run when the stage is `prod`, then destroys stage `pr-<number>`.
- Each deploy job has its own concurrency group per stage, without cancel-in-progress. Cancelling a deploy halfway can leave state out of step with the account. The existing `ci` job keeps its cancel rule.
- The preview comment uses Alchemy's GitHub comment resource with a fixed ID, so each push edits one comment. If the pinned version lacks it, the workflow edits one marked comment through `gh`.
- Workflow permissions: `contents: read`, plus `pull-requests: write` on the preview job only.
- Deploy jobs get `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALCHEMY_PASSWORD`, `ALCHEMY_STATE_TOKEN` and the stage's app secrets as env vars.

**Security headers**

- One request middleware sets the headers on every response the Worker sends. That includes pages, server functions, redirects and 401s. It runs before the session gate, so the gate's redirects carry the headers too.
- Headers:
  - `Content-Security-Policy` (below).
  - `X-Robots-Tag: noindex, nofollow`. The existing robots meta tag stays.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` that turns off camera, microphone, geolocation and payment.
  - `Strict-Transport-Security` with a one-year max-age.
- CSP:
  - `script-src` takes a fresh nonce per request and `'strict-dynamic'`, plus `https://challenges.cloudflare.com` for Turnstile. No `'unsafe-inline'` or `'unsafe-eval'` for scripts.
  - The nonce reaches TanStack Start's inline hydration scripts and the Turnstile script tag through the router's SSR nonce option.
  - `frame-src https://challenges.cloudflare.com`.
  - `style-src 'self'`. Add `'unsafe-inline'` for styles only if a test shows that Turnstile or React needs it, and say so in the PR.
  - `default-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`.
- Static assets skip the Worker. A static headers file gives every asset `X-Robots-Tag: noindex, nofollow` and `X-Content-Type-Options: nosniff`.

**CPU measurement**

- The developer runs `wrangler tail` against a seeded preview stage and loads the list ten times: cold, warm, filtered and searched.
- The developer records the CPU time per request in the Further Notes section of this spec and in the PR.
- If a list request goes over 10 ms, the developer picks a fallback from the PRD risks table (cache the rendered list for 30 s, or render the list on the client) and opens a follow-up ticket.

**Performance budget**

- The PRD budget (LCP < 2.5 s, guest JS < 170 KB gzipped) is still not gated in CI. The developer runs Lighthouse mobile against the seeded preview by hand and records the result in the PR.

## Testing Decisions

- Good tests check what the browser receives: the response headers and the page behaviour. They never check the middleware's code or the CSP string's order.
- **Seam: the existing Playwright suite against the local build (all three projects).** New tests:
  - the home page, `/pin`, a redirect to `/pin` and a 401 from a server function each carry the CSP, `X-Robots-Tag`, `nosniff`, `Referrer-Policy` and `frame-ancestors 'none'`;
  - the CSP has a nonce, and it changes between two requests;
  - the page reports no CSP violations in the console, before and after sign-in;
  - the Turnstile widget still loads on `/pin`, and sign-in through the PIN helper still works;
  - the list still hydrates. A category chip navigates on the client without a full reload.
- No automated tests run against deployed stages. The developer checks each preview by hand: the PIN redirect, the headers, the seeded list after sign-in, and that a migration ran.
- The workflow itself is checked by use: the pull request for this slice must get a preview, and closing a throwaway pull request must destroy its stage.
- **Prior art:** the Playwright PIN and smoke tests with their sign-in helper, and the CSP-free root document they render today.

## Out of Scope

- The custom domain, the Pages proxy and Route 53. Slice 10 adds these. Nothing changes on AWS in this slice.
- Cloudflare Access for the admin. Slice 5 starts with that spike.
- Automated smoke tests or Lighthouse against deployed stages.
- CI gating of LCP and the JS budget.
- Backups of the production D1.
- A staging stage between previews and production.

## Further Notes

- Follow CLAUDE.md: load `/typescript-best-practices` before writing TypeScript. Use the personal GitHub account for every git and `gh` action.
- The account already has the `mugikhan` workers.dev subdomain and R2 turned on. Leave finslamic's `alchemy-state-service` Worker alone. Never set `forceUpdate` on the state store, because it overwrites the state Worker's token.
- The first production deploy applies migrations 0000 to 0004 to an empty D1. These create the settings row and the parent names. Production then shows "Our list is coming soon" until slice 5 lets organisers add items.
- CPU measurement (26 Nov 2026, preview `pr-7`, seeded, from a phone in South Africa):

  | Request                                    | CPU                  | Wall       |
  | ------------------------------------------ | -------------------- | ---------- |
  | `/pin` page                                | 5–6 ms               | 6–10 ms    |
  | PIN submit                                 | 8 ms                 | 791 ms     |
  | Full list page (SSR)                       | 21–23 ms             | 544–779 ms |
  | List refresh and filters (server function) | 4–13 ms, median 6 ms | 515–980 ms |

  Full-page SSR goes over the 10 ms free-plan limit. The developer chose to profile SSR before picking a fallback (ticket 05). The 500 ms wall time came from a D1 in ENAM. Production uses `weur` and Smart Placement instead.
