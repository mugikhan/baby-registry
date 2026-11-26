# 08 — Manage categories

**What to build:** Organisers create, rename, reorder and set the emoji of the categories that become the guest chips. A category that still has items can't be deleted. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** ready-for-agent

- [ ] A categories page offers create, rename, set emoji, reorder (up and down) and delete. Each action writes an audit row.
- [ ] Delete refuses a category with items, with a plain message.
- [ ] Inputs are Zod-parsed: name 1–40, an emoji required.
- [ ] Vitest covers the delete refusal and the reorder sequence.
- [ ] e2e covers creating a category, renaming it, and seeing the change on the guest chips.
