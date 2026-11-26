# Spec 05: Manage items

Slice 5 of the [PRD](../../Baby%20Registry%20—%20PRD.md) delivery plan. Covers FR-2, FR-18, FR-18a, FR-18b and FR-18c, and writes the FR-18e activity log (the viewer comes in slice 12). Photos are slice 8. Status: ready for agent.

## Problem Statement

Production is live, but its list is empty. Guests see "Our list is coming soon", and only a developer with database access can add an item. The organisers, Mugi and his wife, need to add, change and order gifts and cash funds themselves, from their phones, without touching SQL. Nobody else may reach those controls. The admin path must stay closed even though the guest list sits on the same Worker.

## Solution

Organisers open the admin link and sign in through Cloudflare Access with their Google account or an email code. They see every item, including drafts. They can search, filter by type, category and status, and create a gift or a cash fund from a form made for that type. They can edit, duplicate, publish, archive, delete an item that has no reservations, and reorder items within a category. They manage categories with an emoji each. A live card preview shows each item exactly as guests will see it. Every change records who made it. The Worker checks the Access token on every admin request, so a missing or forged token gets a 403.

## User Stories

1. As an organiser, I want to sign in with my Google account or an email code, so that I don't need another password.
2. As an organiser, I want my sign-in to last for weeks on my phone, so that I don't sign in every time I add a gift.
3. As an organiser, I want everyone except the two of us refused at the admin link, so that guests can't change the list.
4. As an organiser, I want to see every item, drafts and archived ones included, so that I know the full state of the list.
5. As an organiser, I want to search items by title, so that I find one quickly on a long list.
6. As an organiser, I want to filter by type, category and status, so that I can focus on one part of the list.
7. As an organiser, I want to create a gift with a title, category, note, example link, emoji and quantity, so that guests know what to bring.
8. As an organiser, I want to create a cash fund with a title, category, note and emoji, so that guests can choose to give money.
9. As an organiser, I want each form to show only the fields that type uses, so that I'm not confused by fields that do nothing.
10. As an organiser, I want clear messages when a field is wrong, so that I can fix it on my phone.
11. As an organiser, I want a new item to start as a draft, so that guests don't see it before it's ready.
12. As an organiser, I want to publish a draft with one tap, so that it appears on the guest list.
13. As an organiser, I want a live preview of the card while I edit, so that I see what guests will see.
14. As an organiser, I want to edit a published item, so that I can fix a note or a quantity.
15. As an organiser, I want the quantity never to drop below the slots already taken, so that no reservation is lost by mistake.
16. As an organiser, I want to duplicate an item, so that similar gifts take seconds to add.
17. As an organiser, I want to archive an item, so that guests stop seeing it while its reservations stay on record.
18. As an organiser, I want to unarchive an item, so that I can bring it back.
19. As an organiser, I want to delete an item that nobody has reserved, so that mistakes disappear for good.
20. As an organiser, I want deleting a reserved item refused, with archive offered in its place, so that no guest loses a reservation silently.
21. As an organiser, I want to reorder items within a category, so that the most wanted gifts come first.
22. As an organiser on a phone, I want "move up" and "move down" buttons as well as dragging, so that reordering works with a thumb.
23. As an organiser, I want to create, rename and reorder categories and set their emoji, so that the chips read the way we want.
24. As an organiser, I want deleting a category that still has items refused, so that no item is left without a category.
25. As an organiser, I want every change recorded with my email and the time, so that we can see later who changed what.
26. As an organiser, I want the CMS to work on a 390 px phone, so that I can manage the list from the couch.
27. As a guest, I want drafts and archived items never to reach the list or its JSON, so that I see only what's ready.
28. As a guest, I want the CMS code never to load on my phone, so that the list stays fast.
29. As the developer, I want the Worker to verify the Access token's signature, issuer, audience and expiry on every admin request, so that a mistake in the Access setup can't open the admin.
30. As the developer, I want e2e tests to use real signed tokens, so that the 403 paths are tested, not bypassed.

## Implementation Decisions

**First task: the Access spike on `workers.dev`**

- Before any CMS code, test how Cloudflare Access can protect the admin path on `baby-registry-prod.mugikhan.workers.dev`. Record the result in this spec.
- **Outcome A:** an Access application can cover only `/admin*` and `/api/admin*` on the `workers.dev` hostname. Use it. Guests keep the rest of the host.
- **Outcome B:** Access can protect only the whole `workers.dev` hostname. Turn it on for production's `workers.dev` only. Guests then reach production only through the custom domain from slice 10, which is on the launch path anyway. Previews stay open to everyone, because they hold seed data only.
- **Outcome C:** neither works. Fall back to the PRD's admin password plus TOTP checked in the Worker, and update this spec before building.
- Access needs the Zero Trust free plan, which allows up to 50 users. The policy allows exactly the two organiser emails. Alchemy 0.93 has no Access resource, so the app and policy are created once through the Cloudflare API and listed in the production runbook. The runbook names no emails.

**Admin auth module**

- One module verifies `Cf-Access-Jwt-Assertion` with WebCrypto:
  - an RS256 signature against the team's JWKS;
  - the issuer is the team domain;
  - the audience is the app's AUD tag;
  - the token hasn't expired;
  - the email is on the allowed list.
- It returns the organiser's email, or it refuses.
- It fetches the JWKS once per isolate and caches it. It refetches once on an unknown key id.
- Config comes from bindings, parsed with Zod: team domain, AUD and allowed emails. In `.dev.vars` and in tests, an inline JWKS takes the place of the fetch. Tests sign with a matching test key. No bypass flag exists anywhere.
- The PIN gate skips `/admin*` and `/api/admin*`, and the admin check runs on those paths instead. A missing or invalid token gives 403 on both pages and API.
- Admin routes answer only on the admin hostname set in config, and return 404 on any other host. This holds before slice 10's proxy, and again behind it.

**Data model**

- One migration adds `audit_log`:
  - `id`, `actor_email`, `action`, `entity`, `entity_id`, `diff_json`, `at` in epoch milliseconds;
  - an index on `at`.
- It is additive. Slice 12 adds the viewer.
- Funds keep a category. The PRD's item types table gives funds none, but `items.category_id` is NOT NULL and the chips group by category. The PRD table gets updated to match.
- `items.type` is fixed once an item exists. Changing a reserved gift into a fund would break its claims.
- `items.updated_by` holds the last organiser's email.

**Admin items module**

- One deep server module owns the organiser's view of items and categories:
  - list with search and filters;
  - get one item;
  - create, update and duplicate (the copy starts as a draft titled "<title> (copy)");
  - set status;
  - delete;
  - reorder within a category;
  - category create, rename, set emoji, reorder and delete.
- Item input is a Zod discriminated union on `type`, one strict schema per type, so unknown fields are rejected:
  - Gift: title 1–80, categoryId, note up to 280, optional https link, optional emoji, qty 1–50.
  - Fund: title, categoryId, note and optional emoji, with qty fixed at 1 to match the database CHECK.
- Update refuses a qty below the item's current claim count.
- Delete refuses an item that has claims or cash gifts, and the UI offers archive in its place. Category delete refuses a category that still has items.
- Every write and its `audit_log` row go in one D1 batch, so a change never lands without its record. `diff_json` holds only the changed fields, before and after.
- Two organisers editing the same item: the last write wins. The audit log shows both.

**HTTP and UI**

- JSON endpoints live under `/api/admin/`, Zod-parsed and returning plain JSON, following `/api/list`. They must stay under the 10 ms CPU limit on a warm isolate.
- Admin pages render on the client (`ssr: false`) behind the admin check, like the guest list. They are code-split, so no admin code enters the guest bundle. The PR compares the guest JS size before and after, because CI doesn't gate the budget yet.
- Pages:
  - the item list, with search, filter chips for type, category and status, and drag-to-reorder plus up and down buttons;
  - the item editor, with its type-specific form and a live preview built from the guest `ItemCard`;
  - the categories page.
- The PRD's shadcn components for the CMS (Form, Dialog, Select, Tabs, Table) arrive here, themed with the existing tokens. They stay large and plain at 390 px.
- "Preview as guest" is the live card preview in the editor. It renders the draft with the same component guests see.

## Testing Decisions

- Good tests check what an organiser or guest sees, and what the API returns. They never check SQL text or component internals.
- **Seam 1, Playwright e2e (existing suite) with signed test tokens:**
  - `/admin` and `/api/admin/items` with no token give 403;
  - a token signed by the wrong key gives 403, and so do the wrong audience, an expired token and an email off the list;
  - a valid token can create a gift and a fund, see the live preview and publish;
  - the item then appears on the guest list, and a draft never does;
  - archive hides an item, and duplicate makes a draft copy;
  - reorder changes the guest order;
  - create, rename and emoji changes on a category show on the guest chips;
  - the main flows pass on the 390 px project.
- **Seam 2, Vitest on real D1 (the admin items module):**
  - each type's schema refuses unknown fields and bad values;
  - qty can't drop below the claims;
  - delete refuses a reserved item, and category delete refuses a category with items;
  - every write produces exactly one `audit_log` row with the right actor and diff;
  - duplicate starts as a draft;
  - reorder writes a clean `sort` sequence.
- Unit tests for the token verifier: valid, bad signature, wrong issuer, wrong audience, expired, unknown key id, email off the list.
- **Prior art:** `test/guest-list.test.ts` and `test/schema-constraints.test.ts` on real D1, and the e2e PIN helper and `security-headers.spec.ts`.

## Out of Scope

- Photos and R2 uploads (slice 8). The editor shows the emoji fallback only.
- The guest list, CSV export and releasing reservations (slice 9).
- The activity log viewer, page text, cash note and PIN changes (slice 12).
- Suggestions (slice 13) and the WhatsApp share button (slice 11).
- The custom domain and the Pages proxy (slice 10).
- Conflict detection between two organisers editing at once.

## Further Notes

- Follow CLAUDE.md: load `/typescript-best-practices` before writing TypeScript, and parse every request body, binding and token claim with Zod.
- Update the PRD with this spec:
  - funds keep a category in the item types table;
  - slice 5 records the spike outcome.
- Production changes follow `docs/runbooks/production-changes.md`. The `audit_log` migration is additive.
- The repo is public. The Access team domain and AUD are not secrets, but the organiser emails are personal data. Pass them as a GitHub secret, never in the repo.
