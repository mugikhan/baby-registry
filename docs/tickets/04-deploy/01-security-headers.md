# 01 — Security headers and CSP

**What to build:** Every response the registry sends carries a strict CSP and the other security headers, so nothing goes live without them. This covers pages, server functions, the gate's redirects to `/pin`, and 401s. Static assets send `noindex` and `nosniff` too. Guests notice nothing: Turnstile still loads on `/pin`, the PIN still signs them in, and the list still hydrates. Spec: `docs/specs/04-deploy-pipeline.md`.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] One request middleware runs before the session gate and sets `Content-Security-Policy`, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` and `Strict-Transport-Security` on every Worker response.
- [x] The CSP uses a fresh nonce per request with `'strict-dynamic'`, allows `https://challenges.cloudflare.com` for scripts and frames, and has no `'unsafe-inline'` or `'unsafe-eval'` for scripts. It also sets `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'` and `form-action 'self'`.
- [x] The nonce reaches TanStack Start's inline hydration scripts and the Turnstile script tag.
- [x] `style-src` is `'self'`. If Turnstile or React needs `'unsafe-inline'` for styles, the PR says why.
- [x] A static headers file gives every asset `X-Robots-Tag: noindex, nofollow` and `nosniff`.
- [x] Playwright checks the headers on the home page, `/pin`, a redirect to `/pin` and a server-function 401.
- [x] Playwright checks that the nonce changes between two requests.
- [x] Playwright checks that the console shows no CSP violations before and after sign-in.
- [x] Playwright checks that a category chip still navigates without a full reload.
- [x] `pnpm check` and the full e2e suite pass in CI.
