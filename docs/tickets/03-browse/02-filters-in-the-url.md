# 02 — Filters in the URL

**What to build:** A guest can filter the list by category, search by words in a title or note, and hide taken gifts. The filters work before JavaScript loads, and back, refresh and shared links keep them. Spec: `docs/specs/03-browse-the-list.md`.

**Blocked by:** 01 — Real list from D1.

**Status:** done

- [x] The route validates `q`, `category` and `needed` search params with Zod. Invalid values fall back to no filter.
- [x] The loader passes the filters to the guest list module, which filters on the server. Search is case-insensitive over the title and note. Still-needed hides fully taken gifts and keeps funds.
- [x] Category chips, "All" and the "Still needed only" toggle are links. Search is a GET form. With JS, search updates the URL with a short debounce, and navigation stays client-side.
- [x] "Nothing matches that" shows for no results, and its "Show everything" is a link that clears the filters.
- [x] Vitest covers the category, search and still-needed filters in the module.
- [x] E2E covers each filter, the filters combined, a directly loaded filtered URL, the no-match link, and a chip plus the toggle filtering with JavaScript disabled.
