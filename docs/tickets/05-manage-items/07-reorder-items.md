# 07 — Reorder items

**What to build:** Organisers put the most wanted gifts first within a category, by dragging or with up and down buttons. The guest list follows the new order. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** done

- [x] The reorder endpoint takes the ordered item ids for one category and writes a clean `sort` sequence in one batch with one audit row.
- [x] Dragging works on desktop. Up and down buttons work at 390 px and with a keyboard.
- [x] Vitest covers the `sort` sequence and refuses ids from another category.
- [x] e2e covers moving an item up, and the guest list order changing to match.
