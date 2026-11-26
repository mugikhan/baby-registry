# 05 — List renders on the client from one JSON call

**What to build:** A guest's first visit stays inside the Workers free plan's 10 ms CPU limit. Ticket 04 measured 21–23 ms for the server-rendered list. Now the Worker renders only a light shell with a skeleton. The browser fetches the whole published list as plain JSON in one gated call, then renders it. Most guests visit once or twice, and every first visit passes through `/pin`. So `/pin` downloads the list page's code while the guest types the PIN, and after a correct PIN the only wait is one small fetch. Spec: `docs/specs/04-deploy-pipeline.md`, Further Notes.

**Blocked by:** 04 — Measure CPU and performance on a preview.

**Status:** done

- [x] The list route turns off SSR for its loader and component (TanStack Start selective SSR). The session gate, its redirect to `/pin` and the security headers still run on the server.
- [x] The server renders a skeleton for the list: header placeholder and card shapes in the Aerogramme style. Its animation stops under `prefers-reduced-motion`.
- [x] One gated JSON endpoint returns the title, categories and every published item, with no filters. It never returns emails, guest ids or fund giver names. It sends `Cache-Control: no-store`. Without a session it returns 401, and the client then goes to `/pin`.
- [x] The client parses the JSON with Zod before it uses it.
- [x] `/pin` loads the list route's code chunk on mount, without running its loader.
- [x] The 30-second and on-focus refresh still work, with no skeleton flash on a refresh.
- [x] The "works with JavaScript off" e2e test is removed. The PIN form still works without JavaScript.
- [x] e2e checks that the skeleton is in the server HTML, that the list renders after sign-in, that the JSON endpoint returns 401 without a session, and that `/pin` requests the list chunk before submit.
- [x] Measured on the PR preview with `wrangler tail`: the list shell and the JSON call each stay under 10 ms CPU.
