---
name: Baby Registry
description: A private family gift list where each gift is a letter on its way home.
colors:
  ground: "#cfe3f2"
  ground-deep: "#b6d3e8"
  ocean: "#0f4c6e"
  ocean-hover: "#0b3d59"
  ocean-pressed: "#082f45"
  ocean-muted: "#2c4a5c"
  ink: "#13202b"
  sand: "#ecdcbf"
  sand-deep: "#dfcaa0"
  sand-pale: "#f6ecd8"
  airmail: "#c8402f"
  stone: "#dedad2"
  stone-deep: "#c9c6be"
  paper-white: "#ffffff"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  button:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  card: "10px"
  picture: "0.75rem"
  control: "1rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "0.875rem"
  lg: "1rem"
  gutter: "1.25rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ocean}"
    textColor: "{colors.paper-white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "3rem"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.ocean-hover}"
  button-primary-active:
    backgroundColor: "{colors.ocean-pressed}"
  button-primary-disabled:
    backgroundColor: "{colors.stone-deep}"
    textColor: "{colors.ocean-muted}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ocean}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "3rem"
    width: "100%"
  button-outline-hover:
    backgroundColor: "{colors.sand-deep}"
  input-search:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "3rem"
    padding: "0 1rem 0 3rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ocean}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1rem"
  chip-hover:
    backgroundColor: "{colors.ground-deep}"
  chip-selected:
    backgroundColor: "{colors.ocean}"
    textColor: "{colors.paper-white}"
  pill-yours:
    backgroundColor: "{colors.airmail}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
  card-gift:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
  card-gift-taken:
    backgroundColor: "{colors.stone}"
  picture-slot:
    backgroundColor: "{colors.sand-pale}"
    rounded: "{rounded.picture}"
    size: "72px"
---

# Design System: Baby Registry

## Overview

**Creative North Star: "The Aerogramme"**

Each gift is a letter on its way home. The page is a sheet of pale-blue airmail paper. Gift cards sit on it as sand-coloured envelopes. Deep ocean ink carries the text, the buttons, the focus ring and the postmark. Airmail red marks the post itself and the guest's own gifts.

The system is built for the oldest guest on a small phone. One face at 18 px does almost all the work. Hierarchy comes from weight and ink, not from a wide size ramp. Every control is at least 48 px tall. Every state reads in words and shape as well as colour.

Density is calm. Cards carry one picture, one title, one short note, one status line and one full-width button. A taken gift turns grey, sinks to the end of the list and takes a postmark. Depth is almost flat: a hairline ink shadow lifts each envelope off the paper.

**Key Characteristics:**

- Pale aerogramme-blue ground, sand envelope cards, deep ocean ink.
- Airmail red for the chevron edge and for "yours" only.
- One typeface, Atkinson Hyperlegible Next, self-hosted, 18 px root.
- Rounded, soft forms: 10 px cards, 1rem controls, full pills for chips.
- A circular postmark with wavy cancellation lines marks taken gifts.
- Every state has an icon and a sentence beside its colour.

## Colors

A cool paper ground with warm envelope stock, one deep ink and one reserved red.

### Primary

- **Deep Ocean Ink** (`ocean`): text links, primary buttons, chip and input borders, the switch, the focus outline, text selection, the caret, the scrollbar and the postmark. It is the one working colour.
- **Ocean Hover** (`ocean-hover`) and **Ocean Pressed** (`ocean-pressed`): the hover and press steps of every ocean fill.
- **Ocean Muted** (`ocean-muted`): secondary text, notes, status lines, the date line and placeholders. It holds at least 5.4:1 on every surface it sits on.

### Secondary

- **Airmail Red** (`airmail`): the "Your gifts" pill, the "You're bringing this" pill, and the airmail chevron strip. White text on it reaches 4.96:1.

### Neutral

- **Aerogramme Blue** (`ground`): the page background.
- **Deep Aerogramme** (`ground-deep`): the hover fill for unselected chips.
- **Envelope Sand** (`sand`): the gift card surface and the empty-state panel.
- **Sand Fold** (`sand-deep`): the hover fill for the outline button on a sand card.
- **Pale Sand** (`sand-pale`): the picture slot behind a photo or emoji.
- **Franked Stone** (`stone`): the surface of a taken card.
- **Stone Deep** (`stone-deep`): the disabled button fill on a taken card.
- **Night Ink** (`ink`): titles and typed input text.
- **Paper White** (`paper-white`): text on ocean and red fills, and the field fill of the search input and switch track.

### Named Rules

**The Own Ink Rule.** Airmail red means "yours" in content. Use it as a fill only for the guest's own gifts and their count. The airmail chevron strip is the one decorative use.

**The One Ink Rule.** Ocean is the only interactive colour. Every button, chip, field, toggle, link and focus ring uses it.

## Typography

**Display Font:** Atkinson Hyperlegible Next Variable (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** the same face.

**Character:** One humanist sans built for low vision. It reads clearly at 18 px and gets its voice from heavy weights in ocean ink.

The root size is 18 px, so 1rem equals 18 px across the whole system.

### Hierarchy

- **Display** (800, 34px, 1.05, -0.01em, balanced wrap): the parents' names at the top of the page, in ocean.
- **Title** (700, 20px, 1.25): gift card titles and the empty-state heading, in ink.
- **Body** (400, 18px): input text and running copy. It is the default size.
- **Body Small** (400, 16px): card notes, the date line and supporting copy, in ocean muted.
- **Label** (600, 16px): status lines, chips and the example link. Pills use 700.
- **Button** (700, 18px): every full-width action and the switch label (600).
- **Postmark** (800, uppercase, inside the stamp only): "TAKEN", a short name and a date.

Counts use tabular figures.

### Named Rules

**The One Size Rule.** Body and controls stay at 18 px. Nothing a guest must read or tap goes below 16 px.

## Layout

The page is a single centred column, at most 1120px wide, with 1.25rem side gutters. The chevron strip runs full width above it.

The header puts the title block on the left and the "Your gifts" pill on the right. Below it the search field runs full width. Category chips scroll sideways in one row and bleed to the screen edge. The "Still needed only" switch sits under them.

The gift list is a grid with a 0.875rem gap. It shows one column below 720px, two from 720px and three from 1100px. Cards align to the top, and each card's button pins to its bottom edge.

Inside a card, the 72px picture slot sits left of the text with a 0.875rem gap. The button spans the full card width beneath. Card padding is 1rem.

Taken cards sort to the end of the list.

## Elevation & Depth

The system is nearly flat. Depth comes from tone: sand and stone cards on a blue ground. One hairline shadow in ocean ink lifts each card, like an envelope resting on paper.

### Shadow Vocabulary

- **Envelope rest** (`box-shadow: 0 1px 2px rgb(15 76 110 / 0.25)`): every gift card.

### Named Rules

**The Resting Envelope Rule.** Cards rest; they do not float. Use the one hairline shadow, never a large blur or a hover lift.

## Shapes

Corners are soft and generous. Cards use 10px. The picture slot uses 0.75rem. Buttons and the search field use 1rem. Chips, pills and the switch are full pills.

Borders are 2px solid ocean on every outlined control: the search field, chips, the switch and the outline button.

Two signature forms recur. The **airmail chevron** is a 135-degree repeating stripe of ocean, gap, red and gap. The **postmark** is a pair of concentric rings with wavy cancellation lines, rotated -12 degrees.

## Components

### Buttons

Full-width, heavy and calm. One clear action per card.

- **Shape:** soft rectangle (1rem radius), 3rem tall, full width of the card.
- **Primary:** ocean fill, white 18px bold text. Hover goes to ocean hover, press to ocean pressed.
- **Outline:** for undoing your own gift. A 2px ocean border, transparent fill and ocean text. Hover fills sand deep.
- **Disabled:** stone deep fill, ocean muted text, full opacity. The label changes to "Taken".
- **Focus:** an ocean border and a 3px ocean ring at 50% opacity, from the shared button primitive. Plain buttons get the global 3px ocean outline.

### Chips

- **Style:** full pill, 2px ocean border, ocean 16px semibold text, 3rem tall, 1rem side padding.
- **State:** unselected hovers to deep aerogramme. Selected fills ocean with white text. Press fills ocean pressed. One chip is always selected.

### Cards / Containers

- **Corner Style:** 10px.
- **Background:** envelope sand. A taken card uses franked stone and renders in full grayscale.
- **Shadow Strategy:** the envelope rest shadow (see Elevation & Depth).
- **Border:** none.
- **Internal Padding:** 1rem.
- **Your gift:** an 8px airmail chevron strip runs along the top edge, and the top padding grows to 1.5rem.

### Inputs / Fields

- **Style:** white fill, 2px ocean border, 1rem radius, 3rem tall, 18px ink text. An ocean search icon sits inside at the left.
- **Placeholder:** ocean muted at full opacity.
- **Focus:** the global 3px ocean outline.

### Switch

- **Style:** a 56 by 32px pill with a 2px ocean border and a white track. The thumb is an ocean dot. When on, the track fills ocean and the thumb turns white and slides right. The 18px semibold ocean label sits beside it.

### Status line

- **Style:** a 20px line icon and 16px semibold ocean muted text. Each state has its own icon and words: "Still needed", "2 of 3 still needed", "3 people are giving", "Taken by Gran".
- **Yours:** a red pill with a filled heart and "You're bringing this".

### Postmark (signature)

An 88px ocean-ink stamp in the top-right of a taken card, rotated -12 degrees. Two rings hold "TAKEN", a short giver name and the date. Three wavy cancellation lines run off its left side. It sits outside the grayscale filter, so it stays ocean. It is decorative and hidden from assistive tech; the plain "Taken by" line carries the meaning. The stamp-in motion is wired for a gift the guest has just reserved. It runs over 250ms with `cubic-bezier(0.16, 1, 0.3, 1)`, only when reduced motion is not requested.

### Airmail chevron (signature)

A 12px repeating diagonal stripe of ocean and airmail red. It edges the top of the page and the top of the guest's own cards. On a card, the gaps take the sand colour.

## Do's and Don'ts

### Do:

- **Do** keep body and control text at 18px and every tap target at least 3rem (54px at the 18px root).
- **Do** pair every state colour with an icon and a sentence.
- **Do** use ocean for every interactive element and the 3px ocean focus outline.
- **Do** put a taken gift on stone, in grayscale, at the end of the list, with a postmark and a "Taken by" line.
- **Do** mark the guest's own gifts with airmail red and the chevron edge.
- **Do** give each card one full-width button.

### Don't:

- **Don't** use airmail red for errors, warnings or general emphasis. It means "yours", apart from the chevron strip.
- **Don't** add a second typeface. Atkinson Hyperlegible Next carries display, body and labels.
- **Don't** use white cards on the blue ground. Cards are sand or stone.
- **Don't** add large or blurred shadows. Cards keep the one hairline envelope shadow.
- **Don't** set readable or tappable text below 16px.
