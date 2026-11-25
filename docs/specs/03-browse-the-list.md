# Spec 03: Browse the list

Slice 3 of the [PRD](../../Baby%20Registry%20—%20PRD.md) delivery plan. Covers FR-3, FR-4 (emoji fallback; photos come in slice 8) and FR-5. Status: ready for agent.

## Problem Statement

The guest list shows hard-coded sample items. Nothing comes from the database, so organisers can't add a real item, and the list can't reflect what other guests have reserved. On an older phone with JavaScript slow to load, the filters don't work at all.

## Solution

The list reads published items, categories and their status from D1. Guests see what's still needed first, filter by category, search, and hide taken gifts. The filters work as plain links and forms, so they work before JavaScript loads. The list refreshes on its own every 30 seconds and when the tab comes back into focus. Locally and in PR previews, a seed script fills the database with realistic demo items. With no items, the list shows a friendly empty state.

## User Stories

1. As a guest, I want to see the family's real gift list, so that I can choose something they need.
2. As a guest, I want items grouped by category and in the organisers' order, so that the list reads the way the family planned it.
3. As a guest, I want gifts still needed shown before taken ones, so that I find something to bring quickly.
4. As a guest, I want taken gifts to sink to the end, turn grey and carry the postmark, so that they get out of my way.
5. As a guest, I want each taken gift to say "Taken by <names>", so that I know who is bringing it.
6. As a guest, I want a gift with several slots to say how many are still needed ("2 of 3 still needed"), so that I know it's still open.
7. As a guest, I want a cash fund to show only how many people are giving, so that nobody's choice or amount is exposed.
8. As a guest, I want to tap a category chip to see only that category, so that I can focus on one kind of gift.
9. As a guest, I want an "All" chip, so that I can return to the whole list.
10. As a guest, I want to search by words in an item's title or note, so that I can find something specific.
11. As a guest, I want a "Still needed only" toggle, so that I can hide gifts that are already taken.
12. As a guest, I want the filters to combine (category, search and still-needed together), so that I can narrow the list.
13. As a guest on an old phone, I want the list and every filter to work before JavaScript loads, so that the site is usable on a slow connection.
14. As a guest, I want the current filters kept in the address, so that back, refresh and a shared link keep what I was looking at.
15. As a guest, I want a clear message when nothing matches, with a way to show everything again, so that I'm never stuck on an empty screen.
16. As a guest, I want items others reserve to appear without reloading, so that I don't pick something just taken.
17. As a guest, I want the list to refresh when I come back to the tab, so that it's up to date after I switch apps.
18. As a guest, I want a refresh never to reset my filters or scroll, so that I don't lose my place.
19. As a guest, I want each card to show its picture: the item's emoji, then its category's emoji, then 🎁, so that every card has a picture even without one set.
20. As a guest, I want an optional "See an example" link that opens safely in a new tab, so that I can see what the parents mean.
21. As a guest, I want the list to show only published items, so that drafts and archived items stay hidden.
22. As a guest arriving before organisers add items, I want a friendly "Our list is coming soon" message, so that I know to come back.
23. As an organiser, I want guests' emails never sent to the list page, so that guest privacy holds even in the page source.
24. As the developer, I want a seed command that fills local D1 with realistic demo items, categories, guests, claims and cash gifts, so that every state is visible while building.
25. As the developer, I want seed data never to reach production, so that guests never see fake items.
26. As the developer, I want the sample-items file removed, so that the list has one source of truth.

## Implementation Decisions

**Schema (one Drizzle migration)**

- Add the PRD's tables:
  - `categories`: id, name, emoji, sort.
  - `items`: id, type (`gift` or `fund`), status (`draft`, `published` or `archived`), category_id, title, note, link, emoji, image_key, qty (default 1), sort, updated_by.
  - `guests`: id, name, email (nullable), device_token_hash, created_at.
  - `claims`: id, item_id, guest_id, note, created_at, with UNIQUE(item_id, guest_id).
  - `cash_gifts`: id, item_id, guest_id, note, created_at, with UNIQUE(item_id, guest_id). It has no amount column.
- This slice only reads `guests`, `claims` and `cash_gifts`. Slices 6 and 7 add the writes. `image_key` stays unused until slice 8.

**Guest list module**

- One deep server module answers "the list as a guest sees it". It takes the filters (category, search text, still-needed flag) and returns the categories plus the visible items.
- Each item is modelled as a discriminated union on `kind`:
  - a gift with `qty`, `taken` (the count) and `takenBy` (guest names in claim order);
  - a fund with `givers` (a count only).
- The result never includes guest emails, guest ids, or the names of fund givers.
- It returns only `published` items.
- Search matches the title and note, case-insensitive, and trims whitespace.
- Still-needed hides gifts with `taken >= qty`. Funds always stay.
- Ordering: open gifts and funds first, then fully taken gifts. Within each group, the order is category `sort`, then item `sort`, then id.
- The query runs on D1 with counts and names joined in SQL, not one query per item. It must stay cheap, because slice 4 measures the 10 ms CPU limit on it.
- The card's existing state rules (needed, partly taken, taken, fund) derive from this union. The "yours" state stays in the card but has no data source until slice 6.

**Filters in the URL**

- The route validates its search params with Zod: `q` (string), `category` (category id), and `needed` (boolean flag). Invalid values fall back to no filter.
- The loader reads the params and calls the guest list module on the server.
- Category chips and the "Still needed only" toggle are links to the same page with the param changed. The search box is a GET form. All of them work with JavaScript off.
- With JavaScript, these links navigate client-side without a full reload. The search updates the URL as the guest types, with a short debounce.
- The existing ListControls keep their look and 48 px targets. Only their wiring changes from local state to links and a form.

**Freshness (FR-5)**

- With JavaScript, the page invalidates its loader every 30 seconds while the tab is visible, and again when the window regains focus. It pauses while the tab is hidden.
- A refresh keeps the URL filters and scroll position, and never shows a loading flash for data already on screen.

**Seed data**

- A seed script fills local D1 with categories, about 9 items covering every state, a few guests, and claims and cash gifts. A `db:seed:local` package script runs it.
- The seed is idempotent: running it twice gives the same data.
- It runs only against local D1 here. Slice 4 reuses it for PR previews. Production is never seeded.
- The sample-items file and its types go away. The cards read the guest list module's types.

**Empty state**

- With no published items at all, the page shows "Our list is coming soon" in the Aerogramme style, with no filters.
- With items but no matches, the page shows the existing "Nothing matches that" message. Its "Show everything" button becomes a link that clears the filters.

**Performance**

- The PRD budget (LCP < 2.5 s, guest JS < 170 KB gzipped) is not enforced in CI in this slice. The developer checks it by hand with Lighthouse mobile on the built preview and notes the result in the PR. Slice 4 measures it against the real deployment.

## Testing Decisions

- Good tests check what a guest sees, or what the guest list module returns. They never check SQL text or component internals.
- **Seam 1, Playwright e2e on seeded local D1 (existing suite, all three projects, signed in through the PIN helper):**
  - with JavaScript disabled, the list renders, and a category chip and the still-needed toggle still filter it;
  - a category chip shows only that category, and "All" restores the list;
  - a search for a word in a note finds the item;
  - the still-needed toggle hides fully taken gifts and keeps funds;
  - taken gifts appear after open ones and show "Taken by …";
  - a fund card shows a giver count, and no giver name appears in the page HTML;
  - a filtered URL loaded directly shows the filtered list;
  - "Nothing matches that" appears for a nonsense search, and its link restores the list;
  - with no items seeded, the page shows "Our list is coming soon".
- **Seam 2, Vitest on real local D1:** the guest list module:
  - draft and archived items are excluded;
  - `taken` and `takenBy` reflect the claims;
  - a fund returns `givers` and no names;
  - the still-needed filter, the search and the category filter work;
  - the ordering holds;
  - no email or guest id appears anywhere in the result.
- **Prior art:** the Playwright PIN and smoke tests with their sign-in helper, and the Vitest PIN-attempt tests on real D1 with migrations applied.

## Out of Scope

- Reserving, cancelling and "Your gifts". Slice 6 adds these.
- Giving cash and the cash note. Slice 7 adds these.
- Photos and the /img route. Slice 8 adds these. Cards show the emoji fallback only.
- The "yours" state's data. Slice 6 adds this.
- Creating or editing items. Slice 5 adds this.
- CI enforcement of LCP and the JS budget.

## Further Notes

- Follow CLAUDE.md: load `/typescript-best-practices` before writing TypeScript, and parse search params with Zod.
- The cards, chips and empty states already exist from the setup slice. This slice rewires them to real data, and it should not redesign them.
