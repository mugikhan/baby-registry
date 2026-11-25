---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: []
---

# Guest list home

Scope: `/`, the guest registry list. Mode: Operate. Build path: code-led.

Audience and job: family guests, many 55+, on a 360 px phone from a WhatsApp link. Find a gift still needed, reserve it, or choose a cash fund.

Constraints: 18 px base text, 48 px tap targets, WCAG AA, no meaning by colour alone, server-rendered and readable without JS, guest JS under 170 KB gz.

Current stage: project setup. The list renders sample items from a local file until slice 1 wires D1. Sample data is synthetic.

Memorable moment: a taken gift carries a postmark with the giver's name.

## Direction contract

THESIS: Each gift is a letter on its way home. Refuses the pastel white-card store registry.

OWN-WORLD: Pale aerogramme-blue ground (#cfe3f2), deep ocean ink (#0f4c6e) for text, buttons and focus, sand envelope stock (#ecdcbf) for cards, airmail red (#c8402f) reserved for the guest's own gifts only. A diagonal airmail chevron strip edges the page top. Atkinson Hyperlegible Next, self-hosted; 18 px does almost all the work, hierarchy by weight and ink. Raises: whole-card reflow and full grayscale for taken cards (character catalog); one reserved ink for "yours" (orienteering); one size does the work (acetate manual); every state readable in words and shape (exposure record).

STORY: The guest sees the parents' names and date, knows this is the family list, scans what is still needed, and taps one clear button.

FIRST VIEWPORT: Chevron strip at top. Parents' names large in ocean ink, "Baby shower · 30 Jan 2027" below, "Your gifts" pill in airmail red at top right. Full-width search, then a scrolling row of category chips and a "Still needed only" toggle. Sand cards follow: picture slot (photo or emoji) left, title and status right, one full-width button below. Taken cards sink to the end, print in grayscale, and carry a rotated circular ocean-ink postmark ("Taken · Gran · 25 Nov") with wavy cancellation lines, plus the plain line "Taken by Gran".

FORM: Aerogramme, candidate 6 of 7 on the grounded list; seed key d8ec9b93.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
