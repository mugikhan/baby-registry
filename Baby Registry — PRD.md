# Baby Registry — PRD

Nov 25, 2026 · @Mugi Khan

A mobile-first baby registry at registry.mugikhan.com where family reserve gifts, choose to give cash and suggest items, built with TanStack Start on Cloudflare's free tier and shipped in fourteen testable vertical slices.

**Decided 25 Nov 2026:** the event is on Jan 30, 2027; the family PIN is 4 digits; cash gifts record no amounts, only who is giving; fund cards show only a count of givers; v1 has two item types (gift, cash fund); organisers manage them through a mobile-friendly CMS. DNS stays on Route 53 with the Pages proxy. The launch slices and the after-launch slices are fixed (see the delivery plan). The site sends only guest-requested emails.

## Overview

**Problem.** Without a shared list, guests double up on the same gifts and we can't see who is bringing what. Generic registry sites are store-bound, cluttered, and hard for older relatives to use on a phone.

**Goals**

- Guests reserve a gift in under 60 seconds on a phone, with no account.
- No gift is given twice: once its quantity is taken, it shows as taken, and by whom.
- Several guests can choose to give cash to the same fund, without any amounts being recorded or shown.
- Guests can suggest items; organisers approve them, and duplicates are blocked.
- Only people with the family PIN can see the list or act on it.
- Running cost: R0 (Cloudflare free tier, plus the free tier of an email API).

**Non-goals (v1)**

- Taking payments or recording amounts. Guests only say they're giving cash; the money is given outside the site, in a card or by EFT.
- Guest accounts or passwords.
- Buying through stores or tracking prices. Links are just examples.
- More than one registry. This is a single event for one family.

**Success measures**

- No double-booked single-quantity gifts (enforced by the database).
- 90% of guests who open the list and tap "I'll bring this" finish the reservation.
- At least one older relative (65+) reserves a gift on their own phone, unassisted, during the slice 6 hallway test.
- First load under 2.5 s (LCP) on a mid-range Android over 4G.

## Users and mobile-first UX

We design for a 360 px-wide phone first, used by someone in their 60s or 70s who opened a WhatsApp link. Desktop gets the same layout with more columns.

| User | Arrives via | Needs |
| --- | --- | --- |
| Guest (family and friends, many 55+) | WhatsApp link plus the family PIN | Find something still needed, reserve it, change their mind later |
| Organiser (Mugi and his wife) | Separate admin link behind Cloudflare Access | Curate items, approve suggestions, see who's bringing what, release a reservation |

**UX principles**

1. One main action per card: "I'll bring this" or "Give cash". Taken items turn grey, show who took them, and sink below the gifts still needed.
2. Base text 18 px, tap targets at least 48 px, contrast of at least WCAG AA (4.5:1), and no meaning carried by colour alone.
3. Each form asks only for what it needs: name (required), email (optional, to say thank you), and a message (optional). No sign-up.
4. Reserving is a bottom sheet: one screen, then a clear confirmation ("It's reserved for you").
5. The list renders on the server, so it's readable before JavaScript loads. That matters on older phones and slow connections.
6. Plain words, not jargon: "I can't bring this anymore", not "Unclaim".
7. Supported devices: iOS Safari 15+, Android Chrome from the last 4 years, and Samsung Internet. Tested at 360×640 and 390×844.
8. Theme: baby blue, sand and ocean, carried over from the prototype.

## Functional requirements

IDs (FR-x) are referenced by the slices below.

**Access**

- FR-1 Guests enter a shared 4-digit family PIN once per device, on a numeric keypad. The session lasts 90 days.
- FR-2 Organisers reach /admin only through Cloudflare Access (Google or email one-time code). The guest domain never serves admin routes.

**Browse**

- FR-3 Items are grouped by category, with filter chips, a search box and a "Still needed only" toggle.
- FR-4 Each card shows its picture, title, note, an optional "See an example" link, and its status. The picture is chosen in this order: the item's photo, then the item's emoji, then its category's emoji, then 🎁. If a photo fails to load, the card falls back to the emoji, so a card never shows a broken image.
- FR-5 The list refreshes when the tab regains focus and every 30 s while it's open, so items reserved by others appear without a reload.

**Reserve gifts**

- FR-6 A gift has a quantity (default 1). Each guest can take at most 1 slot per gift.
- FR-7 When all slots are taken, the card shows "Taken by \<names>" and the button is disabled.
- FR-8 Two guests reserving the last slot at the same moment: exactly one succeeds. The other sees "Someone just took this".
- FR-9 A guest can cancel their own reservation from "Your gifts".

**Cash funds**

- FR-10 On a fund, guests tap "Give cash" and enter only their name (required), email (optional) and an optional message. No amount is asked for or stored.
- FR-11 Fund cards show only a count ("3 people are giving"), never names, amounts or progress. Organisers see names, emails and messages.
- FR-12 After choosing a fund, the guest sees the organiser's "how to give cash" text. A guest can withdraw their choice from "Your gifts".

**Suggestions**

- FR-13 Guests suggest an item: title (required), plus optional link, category and note.
- FR-14 Duplicate check against existing items and pending suggestions (normalised title and link match), live as they type and again on the server.
- FR-15 Suggestions wait in an approval queue. On approval, the organiser can edit before publishing; on rejection the suggestion is removed. Limit: 5 pending per guest.

**Returning guests**

- FR-16 The same device remembers the guest (HttpOnly cookie, 1 year).
- FR-17 On a new device, guests request a "manage my gifts" link by email. It expires after 7 days and can be used repeatedly until then.

**Organiser CMS**

- FR-18 A CMS at /admin to create, edit, duplicate, archive and delete items of every type, with search, filters (type, category, status) and drag-to-reorder. It works on a 390 px phone as well as desktop.
- FR-18a Each item type defines its own form fields and how guests take it (see the item types table below). Types are defined in code as one Zod schema each, so adding a type later is a small change.
- FR-18b Every item has a status: Draft (organisers only), Published (guests see it) or Archived (hidden, history kept). "Preview as guest" shows a draft as guests would see it.
- FR-18c Categories are managed in the CMS: create, rename, reorder, set an emoji.
- FR-18d Every item can have a photo and an emoji; both are optional. A photo is added by uploading from the camera roll. It is cropped to 4:3, resized to at most 1200 px, and stored in R2, so guest pages never load images from other sites. Removing the photo brings back the emoji. The CMS shows a live preview of the card.
- FR-18e An activity log records which organiser created, changed or deleted what, and when.
- FR-19 Edit the page text: heading, welcome message, cash instructions.
- FR-20 Guest list (who, email, what they're bringing or which fund, messages), CSV export, and releasing any reservation or cash choice. A "Copy manage link" action per guest lets organisers send a guest their "manage my gifts" link on WhatsApp by hand.
- FR-21 Change or rotate the family PIN. Rotating signs out all guest sessions.

| Item type | How guests take it | Fields |
| --- | --- | --- |
| Gift | One guest per slot; quantity 1–50 (1 = a single item) | Title, category, note, example link, photo, emoji, quantity |
| Cash fund | Any number of guests; name and email only, no amount | Title, note, photo, emoji |

**Notifications and sharing**

- FR-22 Later, not in v1: organisers get no automatic emails. They use the guest list (FR-20).
- FR-23 Guests who give an email can tick "Send me a confirmation". It is off by default. The confirmation includes their manage link.
- FR-24 A "Share on WhatsApp" button opens a pre-filled message with the link. This button is in the CMS only: organisers send the invite themselves, and the message includes both the link and the PIN. Guests get no share button, so the PIN only goes where organisers send it.

## Architecture

One TanStack Start app runs as a Cloudflare Worker. Guests reach it through a small Cloudflare Pages project that holds the registry.mugikhan.com CNAME, so mugikhan.com and the personal site stay untouched. DNS stays on Route 53 (decided 25 Nov 2026) because the personal site and its DNS stay on AWS.

**Why the Pages proxy.** A Worker custom domain needs the domain's DNS managed by Cloudflare ([Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)). Pages can serve a subdomain from a plain CNAME at an outside DNS provider ([Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)). The Pages project is a one-file Function that forwards each request to the Worker over a service binding (no extra network hop), and returns 404 for /admin and /api/admin.

**Organiser path.** Organisers use the Worker's own workers.dev address, protected by Cloudflare Access. The Worker also checks the Access JWT on every admin route (defence in depth).

&#91;embedded content: request paths · guests via Route 53 and the Pages proxy, organisers via Access\]

Both paths end at the same Worker, which is the only thing that reads or writes D1, R2 and the outside services.

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | TanStack Start (React) + TanStack Router | SSR on Workers; file routes; loaders for reads |
| Server logic | TanStack Start server functions and server routes | Bindings via `cloudflare:workers` env; no separate API service |
| Validation | Zod | Same schemas validate forms (client) and server-function input |
| Database | Cloudflare D1 + Drizzle ORM | Migrations via drizzle-kit, applied `by Alchemy's D1Database resource (migrationsDir)` |
| Images | Cloudflare R2 | Resized in the browser (max 1200 px, \~200 KB), served by the Worker at /img/:key |
| Styling | Tailwind CSS v4 + `shadcn/ui` | Components are copied into the repo and themed with the blue/sand/ocean tokens. Guests: Button, Card, Drawer (bottom sheet), Input, Badge, ToggleGroup (filter chips), Sonner (toasts). CMS: Form, Dialog, Select, Tabs, Table + TanStack Table. CMS routes are code-split so guest pages stay within the JS budget |
| Bot / abuse | Cloudflare Turnstile | On PIN entry, suggestions and the email-link request |
| Email | Resend (free tier) | Sends from a verified subdomain such as mail.mugikhan.com (DNS records go in Route 53) |
| Admin auth | Cloudflare Access (Zero Trust free plan) | Allows 2 organiser emails |
| Freshness | Refetch on focus + 30 s polling | No Durable Objects or websockets needed |
| Testing | Vitest + @cloudflare/vitest-pool-workers; Playwright mobile projects | Real D1 in tests; Pixel 5 and iPhone SE emulation |
| CI/CD | GitHub Actions + Alchemy | One alchemy.run.ts declares the Worker (TanStackStart), D1, R2 and secrets. Each PR gets its own stage (e.g. pr-123) with its own D1 and R2, destroyed when the PR closes; production deploys on merge to main; state is kept in Cloudflare. Access, Turnstile and DNS are managed by Alchemy where it has a resource for them; otherwise they're set up once in the dashboard and documented |

## Data model

Ten D1 tables. Uniqueness and quantity are enforced in SQL, not in the UI.

| Table | Key columns | Rules |
| --- | --- | --- |
| settings | id=1, title, welcome, cash\_note, pin\_hmac, pin\_version | Single row; bumping pin\_version signs out all guests |
| categories | id, name, emoji, sort | Managed in the CMS |
| items | id, type (gift \| fund), status (draft \| published \| archived), category\_id, title, note, link, emoji, image\_key, qty, sort, updated\_by | Guests only ever see published items; `type` picks the Zod schema used to validate the item |
| guests | id, name, email (nullable), device\_token\_hash, created\_at | One row per guest; email is never shown on the public list |
| claims | id, item\_id, guest\_id, note, created\_at | Gifts only. UNIQUE(item\_id, guest\_id); insert only if count < qty (see below) |
| cash\_gifts | id, item\_id, guest\_id, note, created\_at | Funds only. UNIQUE(item\_id, guest\_id); no amount column, by design |
| suggestions | id, guest\_id, title, title\_norm, link\_norm, category\_id, note, status (pending \| approved \| rejected) | Index on title\_norm for the duplicate check |
| magic\_links | token\_hash, guest\_id, expires\_at | For the "manage my gifts" email |
| rate\_limits | key (scope + action), window\_start, count | PIN attempts (per IP and global), suggestions, email-link requests |
| audit\_log | id, actor\_email, action, entity, entity\_id, diff\_json, at | Written by every CMS change; shown in the activity log |

Race-safe reservation, as one statement:

```sql
INSERT INTO claims (item_id, guest_id, note, created_at)
SELECT ?1, ?2, ?3, ?4
WHERE (SELECT COUNT(*) FROM claims WHERE item_id = ?1)
    < (SELECT qty FROM items WHERE id = ?1 AND type = 'gift' AND status = 'published');
-- 0 rows changed means it's taken: show "Someone just took this"
```

## Security and abuse protection

The PIN keeps out strangers. Rate limits and Turnstile keep out bots. Every write is checked on the server against the guest's own cookie.

| Threat | Control |
| --- | --- |
| Stranger finds the link | Every page and API call except /pin needs a valid session cookie (HMAC-signed, HttpOnly, Secure, SameSite=Lax, 90 days). Pages send `noindex` |
| PIN guessing | A 4-digit PIN has only 10,000 combinations, so the limits do the work: Turnstile on the PIN form; 5 tries per IP per 15 min; a global cap of 30 failed tries per hour pauses the PIN form for 1 hour and shows a blocked message on the page. No email is sent. PIN stored as an HMAC with a server secret |
| Guest cancels someone else's gift | Cancel and edit only work for the guest whose device cookie or emailed link matches. Organisers can release anything |
| Spam suggestions | Turnstile, max 5 pending per guest, 20 per IP per day, length limits, server-side duplicate check |
| Leaked emails | Emails are returned only by admin routes. Guest views show names only |
| Admin takeover | Admin is never served on the public domain. Access allows 2 emails. The Worker verifies the `Cf-Access-Jwt-Assertion` signature and audience |
| XSS and bad links | React escaping, links limited to http(s) with `rel=noopener noreferrer`, a strict CSP header, images only from our own /img route |
| Bad uploads | Admin-only, image MIME types only, under 2 MB after resize, random R2 keys |
| Personal data (POPIA) | One-line privacy note on forms. Guest emails and names deleted 90 days after the event, around 30 Apr 2027 (admin button; slice 14) |

## Delivery plan: vertical slices

Each slice becomes one spec in `docs/specs/<nn>-<slug>.md`, made with `/to-spec`. One slice is one spec. It ships as 1–3 PRs. It is demoable in production behind the PIN, except slices 1 and 2, which have no PIN yet. It is done only when its Playwright acceptance test passes on the 360 px mobile project in CI and a manual check passes on a real phone. Split anything bigger. Invites go out around 5 Jan 2027, so slices 1–10 make the launch set.

| # | Slice | User can… | Covers | Acceptance tests |
| --- | --- | --- | --- | --- |
| 1 | Deploy pipeline | Organisers (the developer) merge to main and see the change live | Infra; security headers, strict CSP and `noindex` on every page. `alchemy.run.ts` declares the Worker (TanStackStart), D1, R2 and secrets. GitHub Actions runs `pnpm check` and the e2e suite. Each PR gets its own stage (e.g. pr-123) with its own D1 and R2, destroyed when the PR closes. Main deploys production on workers.dev. Alchemy applies D1 migrations | A PR gets a preview URL; closing the PR destroys its stage; production responds over HTTPS with a CSP header and `X-Robots-Tag` or meta `noindex`; a D1 migration runs |
| 2 | Public domain | Open registry.mugikhan.com and see the placeholder page over HTTPS | Infra. The Pages project (one-file Function) forwards to the Worker over a service binding. A `registry` CNAME in Route 53 points to the Pages project | The page loads over HTTPS on registry.mugikhan.com; /admin and /api/admin return 404 on the public domain; a proxy smoke test passes in CI |
| 3 | Family PIN | Enter the 4-digit PIN once on a number pad, then browse for 90 days | FR-1. PIN set from a deploy secret and stored as an HMAC (`pin_hmac`, `pin_version`); 90-day session cookie; Turnstile on the PIN form; `rate_limits` table (reused later); 5 tries per IP per 15 min; 30 failures per hour pause the form for 1 hour and show a blocked message on the page | No cookie redirects to /pin; the PIN field has inputmode=numeric; 5 wrong PINs give a 15-min lockout; 30 failures in an hour show the blocked message; a Turnstile token is required |
| 4 | Browse the list | Scroll items by category, filter, search, show still-needed only | FR-3, 4, 5. `items` and `categories` tables. Emoji fallback; photos come in slice 8. Seed data exists only locally and in PR previews. Production shows an empty state ("Our list is coming soon") until organisers add items. D1 reads replace the synthetic sample file | The list renders with JS disabled; chips filter; search matches title and note; the still-needed toggle hides taken gifts; production with no items shows the empty state; Lighthouse mobile LCP < 2.5 s and guest JS < 170 KB gz, enforced in CI from this slice on |
| 5 | Manage items | Sign in through Access; create, edit, duplicate, publish, archive and reorder gifts and cash funds; manage categories; preview as a guest | FR-2, 18, 18a, 18b, 18c. First task: spike Cloudflare Access on workers.dev (fallback: admin password plus TOTP). One Zod schema per item type; draft, publish and archive; drag-to-reorder; categories with emoji. Every CMS write records an `audit_log` row (the viewer comes in slice 11) | No Access JWT gives 403; a forged JWT gives 403; a draft item is invisible to guests; each type's form rejects fields outside its schema; every change writes an audit\_log row; the CMS works at 390 px |
| 6 | Reserve a gift | Tap "I'll bring this", give a name, see it taken; cancel from "Your gifts" | FR-6, 7, 8, 9, 16. Device-cookie guest identity (`guests` table, 1-year HttpOnly cookie); race-safe claim (the single INSERT…SELECT above); "Your gifts" page with "I can't bring this anymore"; the header "Your gifts" pill links to it | Card shows "Taken by Gran"; two parallel requests for the last slot = exactly one 200, one 409; qty 3 allows 3 different guests; a second claim by the same guest is refused; cancel frees the slot; the 60-second reserve target and the 65+ hallway test pass on a real phone |
| 7 | Cash funds | Choose "Give cash" on a fund with a name, an optional email and an optional message; withdraw later | FR-10, 11, 12. `cash_gifts` table; giver count only. A migration seeds the cash note; only a redeploy edits it until slice 11. Withdraw from "Your gifts" | No amount field anywhere in UI, API or DB; the card shows the giver count only, with no names in the HTML or API response; a second choice on the same fund by the same guest is refused; withdraw works |
| 8 | Photos | Add an item photo from the phone camera roll; items without one keep showing their emoji | FR-18d (upload only). Browser crop to 4:3 and resize to 1200 px or less; random R2 keys; served at /img with cache headers; admin-only, image MIME types only, under 2 MB | Image resized to 1200 px or less before upload; non-images rejected; fallback order photo → item emoji → category emoji → 🎁 verified, including a forced 404 on /img; deleting an item or its photo removes the R2 object |
| 9 | Guest list | See who is bringing what, export it, release a reservation, and copy a guest's manage link | FR-20 (without the email part). Who, what or which fund, emails and messages (admin only); CSV export; release any reservation or cash choice; "Copy manage link" per guest (`magic_links` table, 7-day expiry, reusable) | An archived item keeps its reservations in the list; CSV contents are correct; release frees the slot; a copied link logs the guest in on a fresh browser; an expired link shows a friendly error |
| 10 | Share and launch | Share via WhatsApp from the CMS; run the launch checklist | FR-24. A wa.me link with the site link and the PIN; launch checklist | wa.me link pre-filled; axe-core shows 0 serious issues; 2 older relatives complete a reservation unaided; backup export taken |
| 11 | Settings | Edit page text; change or rotate the PIN; read the activity log | FR-19, 21, 18e (viewer). Heading, welcome and cash note editor; rotating the PIN signs out all guests | Edited text shows to guests; rotating the PIN signs everyone out; the log lists who changed what |
| 12 | Suggestions | Suggest an item; organiser approves or rejects | FR-13, 14, 15 | Typing "towel" warns about "Hooded towels"; server rejects duplicates and a 6th pending suggestion; 20 per IP per day; approval creates an item from the suggestion |
| 13 | Guest-requested emails | Get a "manage my gifts" link by email; tick "Send me a confirmation" | FR-17, 23, sent through Resend | Requesting the link sends one email; the link logs the guest in on a fresh browser; the confirmation is sent only when ticked; no email address means no email |
| 14 | POPIA deletion | Organisers delete guest names and emails 90 days after the event (around 30 Apr 2027) with an admin button | Personal data row of the Security table | After deletion no guest name or email remains in D1; the item history of reservations stays |

**Later (not in v1)**

- Organiser emails (FR-22)
- Daily digest
- PIN-lockout alert email
- Photo URL paste

Slice 1 comes before all others. Slice 2 comes before slice 3. Slice 5 comes before slices 8, 9, 10, 11 and 12. Slice 6 comes before slices 7 and 9.

## Free-tier budget, risks and resolved questions

Expected load is about 100 guests and under 10,000 requests in total, far inside every free limit. The tight constraint is the Workers free plan's 10 ms of CPU per request, not volume.

| Service | Free allowance (approximate; confirm in slice 1) | Our expected peak |
| --- | --- | --- |
| Workers + Pages Functions | 100,000 requests/day, 10 ms CPU per request | Under 2,000/day in launch week (each request counts twice: proxy + Worker) |
| D1 | 5 GB storage; 5M rows read and 100k rows written per day | Under 1 MB; a few thousand reads/day |
| R2 | 10 GB storage; 1M writes and 10M reads per month | About 40 photos, about 8 MB |
| Access, Turnstile | Free (Access up to 50 users) | 2 organisers |
| Resend | About 3,000 emails/month, 100/day | Under 300 total |

**Risks**

| Risk | Mitigation |
| --- | --- |
| Cloudflare Access on the workers.dev hostname doesn't behave as expected | Spike as the first task of the "Manage items" slice. Fallback: an admin password plus TOTP checked in the Worker |
| React SSR goes over 10 ms CPU on the full list | Measure in slice 4 with `wrangler tail`. Fallback: cache the rendered list for 30 s, or render the list on the client |
| Pages proxy breaks or adds latency | It's a single-file Function covered by a smoke test. Fallback: move the DNS to Cloudflare |
| Emails land in spam | SPF, DKIM and DMARC records for mail.mugikhan.com in Route 53; plain-text-friendly templates |
| Older phones struggle | Server-rendered list, JS budget in CI, a test on a real older Android before launch |

**Resolved questions**

- [x] Move DNS hosting to Cloudflare? No (decided 25 Nov 2026). DNS stays on Route 53, because the personal site and its DNS stay on AWS.
- [x] Keep the Pages proxy? Yes (decided 25 Nov 2026), for the same reason.
