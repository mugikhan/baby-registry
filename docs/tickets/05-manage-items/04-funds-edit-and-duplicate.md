# 04 — Funds, edit and duplicate

**What to build:** Organisers create cash funds with their own form. They edit any item, and duplicate an item to add similar ones in seconds. Editing never loses a reservation. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** ready-for-agent

- [ ] The fund input is a strict Zod schema: title, categoryId, note and optional emoji, with qty fixed at 1. The create form switches fields by type.
- [ ] Editing works for both types and shows the live preview. An item's type can't change after creation.
- [ ] An update refuses a qty below the item's current claim count, with a plain message.
- [ ] Duplicate makes a draft titled "<title> (copy)".
- [ ] Each action writes one audit row.
- [ ] Vitest covers the fund schema, the qty floor, the fixed type and duplicate.
- [ ] e2e covers creating and publishing a fund, editing a gift, and duplicating an item.
