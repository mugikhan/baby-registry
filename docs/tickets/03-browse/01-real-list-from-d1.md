# 01 — Real list from D1

**What to build:** The guest list shows real items from D1 in place of the hard-coded sample data. A guest sees published gifts and funds with their real status: "Taken by …" with the postmark, "2 of 3 still needed", or a fund's giver count. Open items come first and taken gifts sink to the end. Locally, one seed command fills the database with demo data that covers every state. Spec: `docs/specs/03-browse-the-list.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One migration adds `categories`, `items`, `guests`, `claims` and `cash_gifts`, with the PRD's columns and UNIQUE(item_id, guest_id) on claims and cash gifts. Cash gifts have no amount column.
- [ ] An idempotent `db:seed:local` script seeds categories, about 9 items covering every state (needed, partly taken, taken by one and by two guests, fund, draft, archived), guests, claims and cash gifts.
- [ ] One guest list module returns categories and visible items, with each item a discriminated union on `kind` (gift: qty, taken, takenBy; fund: givers).
- [ ] The module returns published items only and orders them open first, then taken, then by category sort, item sort and id. It never returns emails, guest ids or fund giver names.
- [ ] The module joins counts and names in SQL, with no query per item.
- [ ] The home page renders from the module through its loader. The sample-items file and its types are deleted, and the cards use the module's types.
- [ ] Vitest on real D1 covers published-only, taken and takenBy from claims, fund givers without names, ordering, and no email or guest id in the result.
- [ ] The existing e2e smoke test passes on seeded data. CI seeds local D1 before running e2e.
