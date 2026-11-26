# 03 — Create and publish a gift

**What to build:** An organiser creates a gift on their phone, sees a live preview of its card, saves it as a draft, then publishes it. The gift appears on the guest list. Each change records who made it. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 02 — Admin gate.

**Status:** ready-for-agent

- [ ] An additive migration adds `audit_log` (`id`, `actor_email`, `action`, `entity`, `entity_id`, `diff_json`, `at` in epoch ms) with an index on `at`.
- [ ] One admin items module exposes list, get, create and set status. A write and its `audit_log` row go in one D1 batch. `diff_json` holds only the changed fields.
- [ ] The gift input is a strict Zod schema: title 1–80, categoryId, note up to 280, optional https link, optional emoji, qty 1–50. Unknown fields are refused.
- [ ] A new item starts as a draft. Publishing makes it visible on `/api/list` and the guest list. Drafts never appear there.
- [ ] `items.updated_by` holds the organiser's email.
- [ ] The CMS has a basic item list, every status included, and a gift form with a live card preview built from the guest `ItemCard`. It works at 390 px.
- [ ] The admin JSON endpoints stay plain JSON, following `/api/list`.
- [ ] Vitest on real D1 covers the gift schema's refusals and one audit row per write, with the right actor and diff.
- [ ] e2e covers creating a gift with a valid token, publishing it, and seeing it on the guest list. A draft stays hidden.
- [ ] The PR states the guest JS size before and after.
