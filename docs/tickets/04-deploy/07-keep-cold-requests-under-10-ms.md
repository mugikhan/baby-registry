# 07 — Keep cold requests under 10 ms

**What to build:** Most guests visit once or twice, so their requests often land on a fresh isolate. Even then, every request stays under the Workers free plan's 10 ms CPU limit. On the `pr-7` preview, warm requests took 4–9 ms for the list shell and 5–10 ms for `/api/list`. The first request on a cold isolate took 59 ms. Most of that cost is first-time module loading during the request. Cloudflare gives a Worker's global scope a separate 1-second startup budget, so that work moves to startup. Spec: `docs/specs/04-deploy-pipeline.md`, Further Notes.

**Blocked by:** 06 — Chip filters replace search.

**Status:** done

- [x] Server modules that load lazily during a request load at startup instead. This covers the gate's dynamic `import()` and the route and server-route modules that TanStack Start splits. The client bundle still never imports `cloudflare:workers`.
- [x] The HMAC `CryptoKey` is imported once per isolate and reused. It is not imported again on every request.
- [x] The gate caches `pin_version` in isolate memory for 60 seconds, so most gated requests skip the D1 read. Rotating the PIN in slice 12 then signs guests out within 60 seconds. Note this in the slice 12 row of the PRD.
- [x] A static favicon ships in `public/`, so browsers no longer trigger a server-rendered 404.
- [x] The existing unit and e2e tests pass, including the session expiry and PIN version tests.
- [x] Measured on the PR preview with `wrangler tail`: ten warm requests each stay under 10 ms CPU for `/`, `/api/list` and `/pin`. The results are in the spec's Further Notes.
- [ ] Not met: the first request on a fresh isolate still takes 18–41 ms. Cloudflare tolerates infrequent overages per isolate, so this ships as is. See the spec's Further Notes.
