# 06 — Search and filters in the CMS list

**What to build:** On a long list, an organiser finds an item by its title and narrows the list by type, category and status, on a phone. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 03 — Create and publish a gift.

**Status:** done

- [x] Title search, case-insensitive.
- [x] Filter chips for type, category and status, which combine. They are 48 px targets at 390 px, in the guest chips' style.
- [x] The filters live in the URL, so back and refresh keep them.
- [x] e2e covers search, each filter, and a combination with no match.
