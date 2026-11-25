# PRD grilling decisions

Date: 25 Nov 2026

## Purpose

This note records the decisions from the 25 Nov 2026 grilling session on the PRD, with one reason for each.

## Decisions

1. Specs live in `docs/specs/<nn>-<slug>.md`. Each slice gets one spec, made with `/to-spec`. One spec per slice keeps each unit of work small and reviewable.
2. DNS stays on Route 53 and the Pages proxy stays. The personal site and its DNS stay on AWS.
3. The PIN slice comes before Browse. Nothing with real content goes live without the gate.
4. The old CMS slice splits into Manage items (launch), Guest list (launch) and Settings (after launch). Manage items moves to right after Browse, so real items exist before invites go out.
5. One slice is one spec, ships as 1–3 PRs, is demoable behind the PIN from slice 4 on, and has its own 360 px Playwright acceptance test. Slices 1–3 are done when they work locally and pass CI. A slice that is bigger gets split.
6. Cross-cutting work has a fixed home. Headers, CSP and `noindex` go in slice 4 (Deploy pipeline). Rate limits and Turnstile go in the PIN slice. Device-cookie identity goes in Reserve. Audit-log writes start in Manage items. POPIA deletion is its own slice. Each concern then has one owner.
7. Slices 1–11 are the launch set. Invites go out around 5 Jan 2027, which leaves time for the real-phone checks.
8. Infra splits into slice 1 CI, slice 4 Deploy pipeline and slice 10 Public domain. The pipeline can ship and be tested before the domain exists.
9. The Cloudflare Access spike is the first task of Manage items. Access protects the CMS, so the spike belongs where the CMS starts. The fallback is unchanged.
10. Seed data exists only locally and in PR previews. Production shows an empty state, so guests never see fake items.
11. At launch the PIN comes from a deploy secret and the cash note comes from a migration. Both settings screens wait for the Settings slice.
12. Organisers copy a guest's manage link from the guest list at launch. This replaces the email flow until slice 14.
13. The PIN global pause shows a blocked message on the page. The site sends no alert email, because it sends no organiser emails.
14. The site sends only guest-requested emails: the manage link, and an opt-in confirmation. It sends no automatic organiser emails and no digest. This keeps email volume and spam risk low.
15. Photos are upload-only. URL paste is deferred, which removes server-side image fetching.
16. Success measures attach to slices. The LCP and JS budget attach to Browse. No double booking and the hallway test attach to Reserve. axe-core and the 2 older relatives attach to Share and launch. The "one weekend" estimate is removed.
17. Build locally first. CI is slice 1, deployment moves to slice 4 (after the PIN and Browse), and the public domain moves to slice 10, just before launch. Local work is faster to start, but the Access spike and the 10 ms CPU check need real Cloudflare before Manage items.

## Resulting slice order

Launch set:

1. CI
2. Family PIN
3. Browse the list
4. Deploy pipeline
5. Manage items
6. Reserve a gift
7. Cash funds
8. Photos
9. Guest list
10. Public domain
11. Share and launch

After launch:

12. Settings
13. Suggestions
14. Guest-requested emails
15. POPIA deletion

Dependencies: Slice 1 comes before all others. Slice 2 comes before slice 4, so nothing deploys without the PIN. Slice 4 comes before slices 5 and 10. Slice 5 comes before slices 8, 9, 11, 12 and 13. Slice 6 comes before slices 7 and 9. Slice 10 comes before slice 11.
