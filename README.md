# Baby Registry

A mobile-first baby registry at registry.mugikhan.com for one family event on Jan 30, 2027.

Family and friends open the list from a WhatsApp link and enter a 4-digit family PIN. They don't need an account. Guests can:

- Reserve a gift. Once all of a gift's slots are taken, the gift shows as taken, and by whom.
- Choose to give cash to a fund. The site records only who is giving, never an amount.
- Suggest an item. Organisers approve each suggestion, and the site blocks duplicates.

Organisers manage items, categories and the guest list in a mobile-friendly CMS behind Cloudflare Access.

The app uses TanStack Start on Cloudflare Workers, with D1 and R2. It runs on Cloudflare's free tier.

See the [PRD](./Baby%20Registry%20—%20PRD.md) for requirements, architecture and the delivery plan.

## Run locally

You need Node 24 and pnpm.

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Copy `.dev.vars.example` to `.dev.vars` before `pnpm dev`. The example holds test values: PIN `2027` and Cloudflare's Turnstile test keys.

The app runs at http://localhost:3000.

Run `pnpm check` for lint, format check, typecheck and unit tests. Run `pnpm test:e2e` for the Playwright smoke test.

## CI

CI runs `pnpm check` and the Playwright suite on every pull request and every push to main.
It is free while the repo is public.

## Deploy

Alchemy deploys the app to Cloudflare. `alchemy.run.ts` declares the Worker, the D1 database, the R2 bucket and the secrets. `wrangler.jsonc` stays for local dev, Vitest and `wrangler types`.

### Stages

Each stage has its own Worker, D1 database and R2 bucket.

| Stage         | Worker                                           | Used for                 |
| ------------- | ------------------------------------------------ | ------------------------ |
| `prod`        | `baby-registry-prod.mugikhan.workers.dev`        | Production               |
| `pr-<number>` | `baby-registry-pr-<number>.mugikhan.workers.dev` | One pull request preview |

`STAGE` is required. The deploy fails when `STAGE` is missing or has another format.

### What CI does

- A push to main runs `ci`, then deploys `prod`. It never seeds production.
- A pull request from this repo runs `ci`, then deploys `pr-<number>`. The job seeds the preview D1 with `db/seed.sql` and posts one preview comment. Each push updates that comment.
- A fork pull request skips the deploy.
- Closing a pull request destroys its stage. The job refuses to run for `prod`.
- Each deploy applies the pending Drizzle migrations from `drizzle/`.
- Deploy jobs never cancel each other. Each stage has its own concurrency group.

### GitHub secrets

| Secret                                          | Used by                           |
| ----------------------------------------------- | --------------------------------- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Every deploy and destroy job      |
| `ALCHEMY_PASSWORD`                              | Encrypts secrets in deploy state  |
| `ALCHEMY_STATE_TOKEN`                           | Authenticates to the state Worker |
| `FAMILY_PIN`, `SESSION_SECRET`                  | Production                        |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`    | Production                        |
| `PREVIEW_FAMILY_PIN`, `PREVIEW_SESSION_SECRET`  | Previews                          |

Previews use Cloudflare's always-pass Turnstile test keys, the same keys as `.dev.vars.example`.

### Turnstile and state

The production Turnstile widget "Baby Registry" lives outside Alchemy. It was created once through the Cloudflare API. Its keys are the `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` secrets.

Deploy state lives in the `baby-registry-state` Worker on the Cloudflare account. Never set `forceUpdate` on the state store. It overwrites the Worker's token.

### Deploy or destroy from a laptop

Create a `.env` file with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALCHEMY_PASSWORD`, `ALCHEMY_STATE_TOKEN`, `FAMILY_PIN`, `SESSION_SECRET`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Use the same `ALCHEMY_*` values as CI. A preview stage also needs `PULL_REQUEST` and `COMMIT_SHA`, plus `GITHUB_TOKEN` to post the comment.

```sh
STAGE=prod pnpm run deploy
STAGE=pr-12 pnpm run destroy
```

Use `pnpm run deploy`. Plain `pnpm deploy` is a different pnpm command.
