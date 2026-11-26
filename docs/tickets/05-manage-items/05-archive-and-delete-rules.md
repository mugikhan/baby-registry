# 05 — Archive and delete rules

**What to build:** Organisers archive an item to hide it from guests while its reservations stay on record, and unarchive it to bring it back. They delete an item for good only when nobody has reserved it. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** ready-for-agent

- [ ] Archive and unarchive set the status and write audit rows. An archived item disappears from `/api/list`.
- [ ] Delete removes an item that has no claims or cash gifts, and writes an audit row.
- [ ] Delete refuses an item that has claims or cash gifts. The UI then offers archive.
- [ ] Vitest covers both delete paths and archive visibility.
- [ ] e2e covers archiving a published item, unarchiving it, deleting a fresh draft, and the refusal on a seeded reserved gift.
