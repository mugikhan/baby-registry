# 08 — Make production safe to change

**What to build:** Before production exists, the schema enforces its own rules, and every later change ships without deleting a resource. The PRD says "uniqueness and quantity are enforced in SQL", but `items.type`, `items.status` and `items.qty` are only checked in TypeScript. SQLite can't add a CHECK to an existing table, so it needs one table rebuild. That rebuild also proves on a seeded preview that D1 can rebuild a table other tables point at. Spec: `docs/specs/04-deploy-pipeline.md`.

**Blocked by:** 07 — Keep cold requests under 10 ms.

**Status:** ready-for-agent

- [ ] Migration 0005 rebuilds `items` with CHECKs: `type IN ('gift','fund')`, `status IN ('draft','published','archived')`, `qty >= 1`, and `type = 'gift' OR qty = 1`. It keeps every row and id. `claims` and `cash_gifts` still reference it.
- [ ] The rebuild uses `PRAGMA defer_foreign_keys = on`, never `PRAGMA foreign_keys = OFF`, which D1 ignores. It never sets `defer_foreign_keys = off`, because that discards violations.
- [ ] The same migration rebuilds `settings` with `CHECK (id = 1)`, and adds a UNIQUE index on `guests.device_token_hash` for slice 6.
- [ ] `src/db/schema.ts` declares the same CHECKs and index, so `drizzle-kit generate` reports no drift.
- [ ] Vitest on real D1 checks that each CHECK rejects a bad row and that the unique device-token index rejects a duplicate.
- [ ] The PR preview applies 0005 on top of seeded data. Afterwards the item count, the claims and cash gifts, and the list page are unchanged.
- [ ] CI fails when a pull request edits or deletes a migration file that already exists on main.
- [ ] CI fails when a migration file contains `PRAGMA foreign_keys`.
- [ ] `alchemy.run.ts` sets `adopt: true` on the Worker, D1 and R2, so a lost Alchemy state takes over the existing resources and doesn't fail. A one-line comment says never to rename a resource, because a new name creates an empty one.
- [ ] `docs/runbooks/production-changes.md` covers:
  - forward-only migrations;
  - expand then contract, because Alchemy applies migrations before it uploads the new Worker;
  - the D1 table-rebuild pattern;
  - D1 Time Travel restore (7 days on the free plan) after a failed migration;
  - which Alchemy props replace a resource (names) or refuse to change (D1 location);
  - anonymising guests in slice 15 in place of deleting them, because claims point at them.
