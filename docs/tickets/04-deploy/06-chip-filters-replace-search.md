# 06 — Chip filters replace search

**What to build:** Guests don't know what to search for, so the search box goes. Easier chips replace it. Each category chip shows its emoji and how many of its items are still needed. A "Cash funds" chip shows the funds. "Still needed only" stays. The chips filter in the browser over the list already loaded, so a tap answers at once and costs no request. The address still keeps the filters for back, refresh and a shared link. Spec: `docs/specs/03-browse-the-list.md`, as changed on 26 Nov 2026.

**Blocked by:** 05 — List renders on the client from one JSON call.

**Status:** ready-for-agent

- [ ] The search box and the `q` param are gone. An old link with `q` still opens the list.
- [ ] One single-select chip row: "All", one chip per category that has published items, then "Cash funds" when a fund exists. Each category chip shows its emoji and "<n> needed". Chips keep the 48 px targets and the existing look.
- [ ] The URL keeps `category` or `funds`, plus `needed`. Picking a chip clears the other chip param.
- [ ] One pure filter function applies the chip and the still-needed flag to the loaded list. Vitest covers it.
- [ ] The guest list module returns every published item and takes no filters. Its Vitest tests drop the search and filter cases.
- [ ] With no match, the page shows "Nothing here right now" and a "Show everything" link. The copy no longer mentions words.
- [ ] e2e covers each chip, the counts, the "Cash funds" chip, still-needed, a filtered URL loaded directly, and back and forward.
- [ ] Checked at 360 px in a real browser.
