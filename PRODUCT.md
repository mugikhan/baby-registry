# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Guests.** Family and friends invited to the baby shower. Many are 55 or older. They open the site on a phone from a WhatsApp link and enter the family PIN. Their job is to find a gift that is still needed, reserve it, and change their mind later if they must. Some choose to give cash instead.

**Organisers.** The two parents. They use a separate CMS on phone and desktop. Their job is to curate items, approve suggestions, see who is bringing what, and release reservations.

## Product Purpose

A private gift registry for one baby shower on Jan 30, 2027, at registry.mugikhan.com. It stops guests doubling up on gifts and shows the parents who is bringing what. Success means every guest, including older relatives on their own phones, reserves a gift in under 60 seconds with no account and no help.

## Positioning

A registry the family owns. It is not tied to a store and has no checkout or prices. Guests reserve gifts, choose a cash fund, or suggest items. The site records who is giving, and never an amount.

## Operating Context

- Organisers send the invite themselves on WhatsApp. The message carries the link and the 4-digit PIN.
- Guests mostly arrive on mid-range Android phones and older iPhones, often on 4G, sometimes years out of date.
- Guests buy gifts in shops or online on their own. Example links on items are only suggestions.
- Cash goes in a card or by EFT, outside the site.
- The site is in English for a South African family (en-ZA).

## Capabilities and Constraints

- Two item types: gift (quantity 1–50, one slot per guest) and cash fund (any number of guests, no amount).
- Taken gifts show "Taken by <names>". Fund cards show only a count of givers.
- Guests suggest items. Organisers approve each one, and the site blocks duplicates.
- No guest accounts. A device cookie remembers the guest. An emailed link restores access on a new device.
- Stack: TanStack Start on Cloudflare Workers, D1, R2, Tailwind v4 and shadcn/ui. Runs on the free tier.
- Performance budget: LCP under 2.5 s on a mid-range Android over 4G, guest JS under 170 KB gzipped. The list renders on the server and reads before JavaScript loads.
- Undecided: the parents' names as shown to guests. Mugi is one parent. The second name is not yet recorded. Until then, the heading stays editable in the CMS.

## Brand Commitments

- Name on the site: the parents' names (exact wording to be set).
- Voice: warm, in the first person from the parents. "Thank you for helping us get ready." Plain words, no baby talk, no jargon. Write "I can't bring this anymore", not "Unclaim".
- Palette brief from the PRD: baby blue, sand and ocean. No earlier prototype exists, so the visual world is new.

## Evidence on Hand

- The PRD (`Baby Registry — PRD.md`) holds the requirements and copy examples.
- No photos, logos, item lists or guest messages exist yet. Do not invent baby names, photos, testimonials or item data beyond clearly labelled seed data.

## Product Principles

1. The oldest guest sets the bar. If a 70-year-old can't finish on their phone unaided, the design has failed.
2. One clear action per card. A taken gift gets out of the way.
3. Privacy by default. The PIN keeps strangers out, guests see names only, and cash amounts are never recorded.
4. Personal, not commercial. It should feel like a note from the parents, not a shop.

## Accessibility & Inclusion

- Base text 18 px. Tap targets of at least 48 px.
- WCAG AA contrast (4.5:1) or better. Never carry meaning by colour alone.
- Supported devices: iOS Safari 15+, Android Chrome from the last 4 years, and Samsung Internet. Tested at 360×640 and 390×844.
- Numeric keypad for the PIN. Readable with JavaScript off.
