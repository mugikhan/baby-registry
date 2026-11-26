# 01 — Access spike on workers.dev

**What to build:** A tested answer to how Cloudflare Access protects the organiser path on production's `workers.dev` hostname, and that protection switched on. Opening `/admin` on production asks for an Access sign-in. Guest paths behave as the chosen outcome says. Spec: `docs/specs/05-manage-items.md`.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The developer confirms before the Zero Trust free plan is turned on for the account. Not needed: Zero Trust was already on.
- [x] Test whether an Access application can cover only `/admin*` and `/api/admin*` on `baby-registry-prod.mugikhan.workers.dev` (outcome A), or only the whole hostname (outcome B). If neither works, that is outcome C.
- [x] The spec's Implementation Decisions record the outcome, with the evidence: what was tried and what each request returned.
- [x] For outcome A or B, one Access app and one policy exist. The policy allows exactly the two organiser emails, through Google or an email one-time code. The app and the policy exist, with email one-time codes. The policy lists both organisers. The developer signed in with an email code on 26 Nov 2026 and reached the Worker.
- [x] Production's team domain and AUD tag are noted for ticket 02. The organiser emails stay out of the repo.
- [x] `docs/runbooks/production-changes.md` says the Access app lives outside Alchemy, and how to change its policy.
- [x] For outcome C, the spec is updated to the password-plus-TOTP fallback before ticket 02 starts. Not needed: outcome A.
