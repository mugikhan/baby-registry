# 05 — Profile and cut SSR CPU on the list page

**What to build:** A guest's full load of the list page stays under the Workers free plan's 10 ms CPU limit, so no request fails with error 1102 on launch day. Ticket 04 measured 21–23 ms for the server-rendered list. Refreshes and filters already fit (median 6 ms). Spec: `docs/specs/04-deploy-pipeline.md`, Further Notes.

**Blocked by:** 04 — Measure CPU and performance on a preview.

**Status:** ready-for-agent

- [ ] Profile the list page's SSR on a seeded preview with the Workers CPU profiler, and name the top costs.
- [ ] Cut the cost without breaking the list's no-JavaScript rendering from slice 3.
- [ ] Measure again with `wrangler tail`: ten full loads, cold and warm, all under 10 ms CPU.
- [ ] If SSR can't get under 10 ms, write up the remaining options (cached HTML, client render, Workers Paid) with their trade-offs for the developer to choose.
