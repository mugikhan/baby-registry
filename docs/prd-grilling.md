# PRD grilling decisions

Date: 25 Nov 2026

## Purpose

This note records the decisions from the 25 Nov 2026 grilling session on the PRD, with one reason for each.

## Decisions

1. Specs live in `docs/specs/<nn>-<slug>.md`. Each slice gets one spec, made with `/to-spec`. One spec per slice keeps each unit of work small and reviewable.
2. DNS stays on Route 53 and the Pages proxy stays. The personal site and its DNS stay on AWS.
3. The PIN slice comes before Browse. Nothing with real content goes live without the gate.
4. The old CMS slice splits into Manage items (launch), Guest list (launch) and Settings (after launch). Manage items moves to right after Browse, so real items exist before invites go out.
5. One slice is one spec, ships as 1–3 PRs, is demoable behind the PIN, and has its own 360 px Playwright acceptance test. A slice that is bigger gets split.
6. Cross-cutting work has a fixed home. Headers, CSP and `noindex` go in slice 1 (Deploy pipeline). Rate limits and Turnstile go in the PIN slice. Device-cookie identity goes in Reserve. Audit-log writes start in Manage items. POPIA deletion is its own slice. Each concern then has one owner.
7. Slices 1–10 are the launch set. Invites go out around 5 Jan 2027, which leaves time for the real-phone checks.
8. Infra splits into slice 1, Deploy pipeline, and slice 2, Public domain. The pipeline can ship and be tested before the domain exists.
9. The Cloudflare Access spike is the first task of Manage items. Access protects the CMS, so the spike belongs where the CMS starts. The fallback is unchanged.
10. Seed data exists only locally and in PR previews. Production shows an empty state, so guests never see fake items.
11. At launch the PIN comes from a deploy secret and the cash note comes from a migration. Both settings screens wait for the Settings slice.
12. Organisers copy a guest's manage link from the guest list at launch. This replaces the email flow until slice 13.
13. The PIN global pause shows a blocked message on the page. The site sends no alert email, because it sends no organiser emails.
14. The site sends only guest-requested emails: the manage link, and an opt-in confirmation. It sends no automatic organiser emails and no digest. This keeps email volume and spam risk low.
15. Photos are upload-only. URL paste is deferred, which removes server-side image fetching.
16. Success measures attach to slices. The LCP and JS budget attach to Browse. No double booking and the hallway test attach to Reserve. axe-core and the 2 older relatives attach to Share and launch. The "one weekend" estimate is removed.

## Resulting slice order

Launch set:

1. Deploy pipeline
2. Public domain
3. Family PIN
4. Browse the list
5. Manage items
6. Reserve a gift
7. Cash funds
8. Photos
9. Guest list
10. Share and launch

After launch:

11. Settings
12. Suggestions
13. Guest-requested emails
14. POPIA deletion

Dependencies: 1 before all others; 2 before 3; 5 before 8, 9, 10, 11 and 12; 6 before 7 and 9.
