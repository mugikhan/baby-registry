# Spec 02: Family PIN

Slice 2 of the [PRD](../../Baby%20Registry%20—%20PRD.md) delivery plan. Covers FR-1 and the "Stranger finds the link" and "PIN guessing" rows of the Security table. Status: ready for agent.

## Problem Statement

The registry shows the family's gift list and, from slice 6 on, guests' names. Anyone who finds the link can see it today. Only people the parents invite, who have the family PIN, should see the list or act on it. A 4-digit PIN has only 10,000 combinations, so the site must also stop people and bots guessing it.

## Solution

A guest with no session lands on a PIN page. They type the 4-digit family PIN on a number pad, once per device. The right PIN gives them a 90-day session, and they go to the list. A wrong PIN shows a plain error. After 5 wrong tries from one connection, that connection waits 15 minutes. After 30 wrong tries in an hour from anywhere, the PIN form pauses for an hour and shows a blocked message. A Cloudflare Turnstile check on the form keeps bots out.

## User Stories

1. As a guest opening the WhatsApp link for the first time, I want to land on a page that asks for the family PIN, so that I know what to do next.
2. As a guest, I want the PIN page to explain in one plain line where the PIN comes from, so that I know to look in the invite message.
3. As a guest on a phone, I want the number pad to open for the PIN field, so that I don't hunt for digits on a full keyboard.
4. As an older guest, I want large text and a large Continue button on the PIN page, so that I can read it and tap it easily.
5. As a guest, I want my phone to offer the PIN from the message if it can, so that I type less.
6. As a guest, I want to enter exactly 4 digits, so that I can't submit a half-typed PIN.
7. As a guest who types the right PIN, I want to go straight to the list, so that I can start looking for a gift.
8. As a guest who opened a deep link before entering the PIN, I want to return to that page afterwards, so that I don't lose my place.
9. As a guest who types the wrong PIN, I want a clear message ("That PIN didn't work. Check the invite message and try again."), so that I know to retry.
10. As a guest who mistypes, I want the field cleared and focused after an error, so that I can try again quickly.
11. As a guest, I want to enter the PIN only once on this phone for 90 days, so that I don't have to find the message every visit.
12. As a guest who comes back within 90 days, I want to skip the PIN page, so that the list opens straight away.
13. As a guest whose session has expired, I want to see the PIN page again, so that I can get back in.
14. As a guest who tries 5 wrong PINs, I want a message saying to wait 15 minutes, so that I know when I can try again.
15. As a guest, I want the 15-minute wait to apply only to my connection, so that other relatives can still get in.
16. As a guest arriving while the form is paused, I want a calm blocked message saying to try again later, so that I'm not confused by a broken form.
17. As an organiser, I want the form to pause for an hour after 30 failed tries in an hour from anywhere, so that a distributed guessing attempt can't run through all 10,000 PINs.
18. As an organiser, I want a Turnstile check on the PIN form, so that bots can't submit PINs at scale.
19. As a guest, I want Turnstile to stay invisible or one-tap where possible, so that it doesn't slow me down.
20. As a guest whose Turnstile check fails, I want a message asking me to try again, so that I'm not stuck.
21. As a guest without JavaScript, I want the PIN page to show a plain message that the check needs JavaScript, so that I know why the form won't submit.
22. As an organiser, I want every page and server call except the PIN page and its submit to need a valid session, so that nothing leaks to someone without the PIN.
23. As an organiser, I want the session cookie signed, HttpOnly, Secure and SameSite=Lax, so that scripts and other sites can't read or forge it.
24. As an organiser, I want the session tied to the current PIN version, so that a later PIN rotation (slice 12) signs everyone out.
25. As an organiser, I want the PIN kept out of source code and git, so that the repo being public doesn't reveal it.
26. As an organiser, I want the server to compare PINs in constant time, so that response timing doesn't leak digits.
27. As an organiser, I want the PIN page to send `noindex`, so that search engines never list it.
28. As the developer, I want test Turnstile keys and a test PIN locally and in CI, so that the slice runs with no Cloudflare account and costs nothing.
29. As the developer, I want an example env file in the repo, so that a fresh clone knows which local secrets to set.

## Implementation Decisions

**Secrets and config**

- Server secrets: `FAMILY_PIN` (4 digits), `SESSION_SECRET` (random, at least 32 bytes) and `TURNSTILE_SECRET_KEY`. The public `TURNSTILE_SITE_KEY` is config, not a secret.
- Locally they come from the gitignored Wrangler dev vars file. A committed example file lists each name with safe test values. Slice 4 moves real values into Alchemy secrets.
- Locally and in CI, Turnstile uses Cloudflare's published test keys: the always-pass pair by default, and the always-fail secret for the failure test.
- CI sets the test PIN, a test session secret and the Turnstile test keys as plain workflow env. They are test values, so they need no GitHub secrets.

**PIN check**

- The server computes an HMAC-SHA-256 of the submitted PIN and of `FAMILY_PIN` with `SESSION_SECRET`, then compares the two in constant time.
- `settings.pin_hmac` stays unused in this slice. Slice 12 moves the PIN into D1 and adds rotation.
- One deep module owns a PIN attempt. It takes the submitted PIN, the Turnstile token, the client key and the current time. It returns one of `ok`, `wrong`, `locked` (per-client wait, with the time it ends), `paused` (global pause, with the time it ends) or `turnstile_failed`. Its order is:
  1. global pause check;
  2. per-client lockout check;
  3. Turnstile verification;
  4. PIN comparison;
  5. failure counting.

  Checking limits before Turnstile means a locked client never costs a Turnstile call.

- The client key comes from the `CF-Connecting-IP` header. Locally, with no header, it falls back to a fixed local key.

**Rate limits**

- Add the PRD's `rate_limits` table through a Drizzle migration: `key` (scope plus action plus subject), `window_start` and `count`. Later slices reuse it for suggestions and email links.
- Per client: 5 failed PINs within a 15-minute window locks that client until the window ends.
- Global: 30 failed PINs within a 1-hour window, counted across all clients, pauses the PIN form until the window ends.
- A correct PIN does not reset the global count. Turnstile failures do not count as PIN failures.
- Each check increments with a single upsert, so two parallel attempts can't both slip under a limit.

**Session**

- On `ok`, the server sets a session cookie: HMAC-signed with `SESSION_SECRET`, HttpOnly, Secure, SameSite=Lax, Path `/`, Max-Age 90 days.
- The cookie value holds the issue time and `settings.pin_version`. A cookie is valid when its signature checks, it is under 90 days old, and its version matches the current `pin_version`.
- Locally over plain HTTP, the Secure flag must not block the dev and preview servers. Use whatever the runtime treats as a secure context locally, or drop Secure only when not in production.

**The gate**

- One request-level guard runs before every route and server function, except `/pin`, its submit, static assets and the build's own client files.
- With no valid session, page requests redirect to `/pin`, carrying the original path as a `next` parameter. Server calls and API requests get 401.
- `next` accepts only same-site relative paths, so it can't become an open redirect.

**The PIN page**

- It uses the Aerogramme world from DESIGN.md: the same ground, ink, type scale and airmail edge as the list.
- It shows one heading, one line explaining that the PIN is in the invite message, one PIN field and one Continue button.
- The field uses `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="[0-9]{4}"`, `maxlength="4"`, a visible label, and an 18 px or larger font.
- The form posts to the server and works as a plain HTML form, so the PIN check itself needs no client JavaScript. Turnstile's widget needs JavaScript. Without it the page shows the no-JS message.
- Error, locked and paused states render on the server in the page, in the voice of PRODUCT.md, and are announced to screen readers.
- Copy: wrong PIN ("That PIN didn't work. Check the invite message and try again."), locked ("Too many tries. Please wait 15 minutes and try again."), paused ("The registry is resting for a little while. Please try again in an hour."), and a Turnstile failure ("We couldn't check you're human. Please try again.").

**Tests and existing suites**

- The existing Playwright smoke test now signs in through the PIN page first, using a shared helper, then checks the list as before.

## Testing Decisions

- Good tests check behaviour a guest or the server boundary can see: redirects, status codes, cookie flags, page messages, and the PIN-attempt module's return values. They never check table rows or private helpers directly.
- **Seam 1, Playwright e2e (existing suite, all three projects):**
  - with no cookie, `/` redirects to `/pin`;
  - the PIN field has `inputmode="numeric"`;
  - a wrong PIN shows the wrong-PIN message and stays on `/pin`;
  - the right PIN reaches the list, and a reload stays on the list;
  - a deep link returns to its path after the PIN;
  - the session cookie is HttpOnly and SameSite=Lax, with an expiry about 90 days out;
  - a server-function request with no cookie gets 401;
  - with the always-fail Turnstile secret, the Turnstile message shows.
- **Seam 2, Vitest on real local D1 (existing Cloudflare Vitest setup):** the PIN-attempt module, with an injected clock:
  - the right PIN returns `ok`;
  - a wrong PIN returns `wrong`;
  - the 6th wrong try from one client within 15 minutes returns `locked`, and another client still gets `wrong`;
  - after the 15-minute window, that client can try again;
  - 30 wrong tries in an hour across many clients returns `paused` for everyone, including with the right PIN;
  - after the hour, the form works again;
  - a correct PIN does not clear the global count;
  - a failed Turnstile check returns `turnstile_failed` and doesn't count as a PIN failure;
  - a session with an old `pin_version` is rejected.
- **Prior art:** the Playwright smoke test and the Vitest settings test that reads D1.

## Out of Scope

- Changing or rotating the PIN in a CMS. Slice 12 adds this.
- Storing the PIN in D1 (`settings.pin_hmac`). Slice 12 adds this.
- Any email or alert when the form pauses. The PRD moved it to "Later".
- Real Turnstile site keys and production secrets. Slice 4 adds these.
- Guest identity (name, device token). Slice 6 adds this. The PIN session only says "this device knows the PIN".

## Further Notes

- Every later slice's e2e tests need the shared sign-in helper from this slice.
- Turnstile's test keys are free and need no Cloudflare account, so this slice keeps CI free.
- The PIN page is the first screen every guest sees. Its copy and layout need the same 65+ readability bar as the list.
