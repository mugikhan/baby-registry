# 04 — Measure CPU and performance on a preview

**What to build:** The developer knows whether the server-rendered list fits the Workers free plan's 10 ms CPU limit and the PRD's performance budget on real Cloudflare infrastructure. If it doesn't, a fallback is chosen before launch. Spec: `docs/specs/04-deploy-pipeline.md`.

**Blocked by:** 03 — PR preview stages.

**Status:** ready-for-agent

- [ ] Run `wrangler tail` against a seeded preview stage while the list loads ten times: cold, warm, filtered and searched.
- [ ] Record the CPU time per request in the spec's Further Notes and in the PR.
- [ ] Run Lighthouse mobile against the seeded preview and record LCP and guest JS size (gzipped) in the PR.
- [ ] If a list request goes over 10 ms, pick a fallback from the PRD risks table and open a follow-up ticket. Otherwise, note that no fallback is needed.
