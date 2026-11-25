# Baby Registry

A mobile-first baby registry at registry.mugikhan.com for one family event on Jan 30, 2027.

Family and friends open the list from a WhatsApp link and enter a 4-digit family PIN. They don't need an account. Guests can:

- Reserve a gift. Once all of a gift's slots are taken, the gift shows as taken, and by whom.
- Choose to give cash to a fund. The site records only who is giving, never an amount.
- Suggest an item. Organisers approve each suggestion, and the site blocks duplicates.

Organisers manage items, categories and the guest list in a mobile-friendly CMS behind Cloudflare Access.

The app uses TanStack Start on Cloudflare Workers, with D1 and R2. It runs on Cloudflare's free tier.

See the [PRD](./Baby%20Registry%20—%20PRD.md) for requirements, architecture and the delivery plan.
