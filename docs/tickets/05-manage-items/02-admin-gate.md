# 02 — Admin gate

**What to build:** An organiser signed in through Access opens `/admin` and sees "Signed in as <email>". Everyone else gets a 403. The Worker checks the Access token itself on every admin request, so a gap in the Access setup can't open the admin. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** 01 — Access spike on workers.dev.

**Status:** ready-for-agent

- [x] One admin auth module verifies `Cf-Access-Jwt-Assertion`: the RS256 signature against the JWKS, the issuer, the audience and the expiry, and that the email is on the allowed list. It caches the JWKS per isolate and refetches once on an unknown key id.
- [x] Its config is parsed with Zod: team domain, AUD and allowed emails. Local dev and tests use an inline test JWKS. No bypass flag exists.
- [x] The PIN gate skips `/admin*` and `/api/admin*`, and those paths run the admin check instead. A missing or invalid token gives 403 on pages and API.
- [x] Admin paths return 404 on any host other than the configured admin host.
- [x] Production binds the Access config through Alchemy, with the organiser emails from a GitHub secret. Previews have no admin config, so admin stays closed there.
- [x] A minimal `/admin` page renders on the client and shows the signed-in email from `/api/admin/me`. It is code-split, so no admin code enters the guest bundle.
- [x] Unit tests cover the verifier: valid, bad signature, wrong issuer, wrong audience, expired, unknown key id, and an email off the list.
- [x] e2e signs real test tokens. It covers 403 with no token, a forged token, the wrong audience, an expired token and an unknown email. A valid token sees the email.
- [ ] Checked on production after merge: an Access sign-in reaches `/admin`, and a request without the Access cookie gets refused.
