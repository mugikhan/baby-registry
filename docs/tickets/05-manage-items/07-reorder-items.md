# 07 — Reorder items

**What to build:** Organisers put the most wanted gifts first within a category, by dragging or with up and down buttons. The guest list follows the new order. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** ready-for-agent

- [ ] The reorder endpoint takes the ordered item ids for one category and writes a clean `sort` sequence in one batch with one audit row.
- [ ] Dragging works on desktop. Up and down buttons work at 390 px and with a keyboard.
- [ ] Vitest covers the `sort` sequence and refuses ids from another category.
- [ ] e2e covers moving an item up, and the guest list order changing to match.
