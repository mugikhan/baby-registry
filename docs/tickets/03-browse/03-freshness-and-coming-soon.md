# 03 — Freshness and the coming-soon state

**What to build:** The list keeps itself current. It refreshes every 30 seconds while the tab is visible and again when the guest returns to the tab, without losing filters or scroll position. Before organisers add any items, guests see a friendly "Our list is coming soon" message. Spec: `docs/specs/03-browse-the-list.md`.

**Blocked by:** 01 — Real list from D1.

**Status:** done

- [x] With JS, the page invalidates its loader every 30 s while visible and on window focus, and pauses while hidden.
- [x] A refresh keeps the URL filters and scroll position, and shows no loading flash for data already on screen.
- [x] With no published items, the page shows "Our list is coming soon" in the Aerogramme style, with no filters.
- [x] E2E: a claim inserted into local D1 while the page is open appears after a focus event, without a reload.
- [x] E2E: with no items, "Our list is coming soon" shows.
