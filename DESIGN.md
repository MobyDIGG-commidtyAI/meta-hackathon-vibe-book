---
name: VibeBook
description: A capsule-toy machine for your feed. Turn any post into something you can play, use, and share.
colors:
  machine-red: "#d7322a"
  red-hot: "#e43a31"
  red-deep: "#b5261f"
  red-ink: "#a8201a"
  chute: "#6e1510"
  paper: "#ffffff"
  ink: "#141414"
  ink-2: "#474747"
  ink-3: "#6b6b6b"
  lemon: "#ffc93c"
  lemon-cream: "#fff3cf"
  lemon-faded: "#ffe9ad"
  mint: "#2fc4a2"
  sky: "#3d9bff"
typography:
  display:
    fontFamily: "Dela Gothic One, M PLUS Rounded 1c, sans-serif"
    fontSize: "clamp(46px, 7.4vw, 96px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Dela Gothic One, M PLUS Rounded 1c, sans-serif"
    fontSize: "clamp(32px, 4.4vw, 54px)"
    fontWeight: 400
    lineHeight: 1.02
  title:
    fontFamily: "Dela Gothic One, M PLUS Rounded 1c, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  body-strong:
    fontFamily: "M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.25
  label:
    fontFamily: "M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 800
    letterSpacing: "0.08em"
  receipt:
    fontFamily: "DotGothic16, ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0.02em"
    fontFeature: "tnum"
rounded:
  field: "12px"
  label: "14px"
  notice: "16px"
  form: "20px"
  sheet: "22px"
  shell: "30px"
  machine: "34px"
  pill: "999px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  base: "16px"
  lg: "18px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.machine-red}"
    textColor: "{colors.paper}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.red-hot}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
  button-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
  button-light-hover:
    backgroundColor: "{colors.lemon-cream}"
  button-big:
    rounded: "{rounded.pill}"
    padding: "15px 26px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
  display-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "22px 18px 14px"
  form-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.form}"
    padding: "18px 16px"
  toy-row-chosen:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.label}"
    padding: "13px 8px"
  kind-tag-game:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  kind-tag-app:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  stamp-new:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  stamp-prev:
    backgroundColor: "{colors.lemon-faded}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  stamp-old:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  share-ticket-head:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    padding: "14px 16px 12px"
  receipt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.receipt}"
    padding: "16px 16px 14px"
  knob:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "34px"
---

# Design System: VibeBook

## Overview

**Creative North Star: "The Capsule Machine"**

VibeBook is a gashapon machine for your feed. Every surface is the machine's glossy red enamel body; content sits on things the machine holds or prints: the post inside a clear acrylic dome, three toys lettered A, B and C on a white printed display card, a crank and chute where the capsule drops, a two-tone capsule that opens into the player, and a receipt slip that prints each build step. The world is tactile, toy-like and confident, lit from the upper left with soft plastic sheen, and it never reads as a dark AI tool.

Density is a single handheld column (560px max) in the create flow and share page; the landing widens to a two-column machine-and-copy layout. Colour carries meaning, not decoration: the capsule base colour names what you get (lemon for a game, mint for an app, sky for anything shared or remixed). Motion belongs to the machine's mechanics and only fires when state changes.

**Key Characteristics:**
- Machine-red enamel owns every background, header band and primary button.
- White printed paper (display card, forms, receipt, labels) with ink rules carries all reading content.
- Two-tone capsules: clear top, ink seam, coloured base; base colour = kind.
- Heavy Japanese display gothic for titles and letters, rounded gothic for UI, dot-matrix only on the receipt.
- Soft, warm-tinted drop shadows and inset plastic highlights; no flat-black glows.
- Motion only at state changes: crank turn, capsule drop, halves parting, receipt lines printing.

## Colors

A saturated red machine with white paper, near-black ink, and three capsule colours that each mean one thing.

### Primary
- **Machine Red** (machine-red): the body of everything: page background, primary buttons, the extension chip, theme colour. Deliberately deeper than the brief's #E63A2E so white body text clears 4.5:1 (4.8:1 measured).
- **Hot Red** (red-hot): hover state of red buttons and the chip only.
- **Top-Cap Red** (red-deep): shaded plastic: the sticky header band, the landing's demo machine and closing band, the crank hub.
- **Printed Red** (red-ink): red text on white (light buttons, failed receipt lines). Never use machine-red for text on paper.
- **Chute Maroon** (chute): the recessed chute where the crank sits and the capsule lands.

### Secondary
- **Game Lemon** (lemon): GAME capsule bases and tags, the newest change stamp, the landing sticker, the ✦ brand mark, focus rings and text selection.
- **Lemon Cream** (lemon-cream): hover wash on toy rows and light buttons.
- **Faded Lemon** (lemon-faded): the previous-change stamp, one step back from new.

### Tertiary
- **App Mint** (mint): APP capsule bases, tags and labels.
- **Share Sky** (sky): share and remix only: the share ticket head and remix surfaces.

### Neutral
- **Paper** (paper): display card, form sheets, receipt slip, knob, credit labels; also all text on red.
- **Ink** (ink): text on paper, the 1.5-2px rules and capsule outlines, the chosen toy row, ink buttons, the player bezel.
- **Ink Grey** (ink-2): secondary copy on paper (pitches, notes, receipt trace).
- **Ink Light** (ink-3): placeholders and the oldest change stamps.

### Named Rules
**The Kind Colour Rule.** Lemon means GAME, mint means APP, sky means share or remix. A capsule colour is never used for decoration; lemon additionally carries focus and selection because it is the machine's highlight.

**The Paper Holds the Reading Rule.** Long or dense text sits on paper in ink. On red, only white text, and anything smaller than body (down to 13px captions) is set at 700 weight or above.

## Typography

**Display Font:** Dela Gothic One (with M PLUS Rounded 1c, sans-serif)
**Body Font:** M PLUS Rounded 1c, weights 500/700/800 (with system-ui)
**Label/Mono Font:** DotGothic16, receipt slip only (with ui-monospace)

**Character:** A heavy, stamped Japanese display gothic for the things printed on the machine (titles, toy letters, wordmark), a soft rounded gothic for everything you read and tap, and a dot-matrix face that only ever appears on paper the machine prints.

### Hierarchy
- **Display** (400, clamp(46px, 7.4vw, 96px), 0.98): the landing headline only.
- **Headline** (400, clamp(32px, 4.4vw, 54px), 1.02): landing section heads; page titles use clamp(30px, 8vw, 40px), share titles clamp(28px, 7vw, 38px).
- **Title** (400, 22px, 1.1): display-card title; form-sheet heads drop to 18px; toy labels 16px.
- **Body** (500, 15px, 1.5): default UI text. Ledes and scene lines on red step up to 700 at 14.5-16px, capped at 38-44ch.
- **Body Strong** (800, 16px, 1.25): toy titles, button labels (15px), form labels (13.5px).
- **Label** (800, 10.5px, 0.08em, uppercase): GAME / APP kind tags.
- **Receipt** (400, 13.5px, 1.55, 0.02em, uppercase, tabular numbers): receipt lines and timings.

### Named Rules
**The Dot-Matrix Stays on the Slip Rule.** DotGothic16 appears only on receipt paper. Never on buttons, headings, or the red body.

**The Display Is Printed Rule.** Dela Gothic One is used at weight 400 only, for titles, circled toy letters and the wordmark. Never for running text.

## Layout

The create flow, upload and share pages are a single centred column, max 560px, padded 20px 16px 36px, stacking its parts with an 18px gap: dome, display card, chute, toy window, forms. A sticky top-cap header (12px 16px) holds the wordmark and a round close knob. The extension opens this column as a right-hand overlay, min(440px, 100vw) wide.

The landing uses two-column grids (hero 1.05fr / 0.95fr up to 1180px; how-it-works 0.9fr / 1.1fr up to 1080px) with clamp() gaps of 28-72px and generous viewport-scaled vertical padding, collapsing to one column at 820px. Internal rhythm sits on 6 / 10 / 12 / 16 / 18 / 22px steps; 16px is the default edge padding.

## Elevation & Depth

Depth is physical plastic and paper under one warm, upper-left light. Shadows cast onto the machine are soft and tinted with the red's own darkness (rgba(86, 4, 0, ...)); neutral black appears only inside the dark chute and on the extension's chip and overlay, which sit on Facebook's page rather than the machine. Pressed parts carry inset top highlights and bottom shading. Recesses (the chute, the empty slot) are inset shadows. Every curved plastic surface (dome, capsule, crank grip) has a white specular highlight at its upper left.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 18px 40px rgba(86, 4, 0, 0.36), 0 3px 8px rgba(86, 4, 0, 0.22)`): paper resting on the machine: display card, form sheets, notices.
- **Press** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.18), 0 4px 10px rgba(110,10,4,0.32)`): moulded buttons and the chip; drops to 1px travel on :active.
- **Recess** (`box-shadow: inset 0 6px 14px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.18)`): the chute.
- **Dome ring** (`box-shadow: 0 0 0 6px rgba(255,255,255,0.2), 0 0 0 7.5px rgba(60,4,0,0.55), 0 16px 30px rgba(86,4,0,0.45)`): the clear acrylic rim around the post.

### Named Rules
**The Warm Shadow Rule.** Every shadow that falls on the red body or on paper is tinted with the machine's own dark red. Grey glows on the machine read as a dark AI tool and break the world.

## Shapes

Round is the native geometry: circles for the dome, capsules, crank, knob, toy letters and the error bang; pills for buttons, tags, stamps and the chip. Paper gets generous soft corners (12px fields, 14px labels and rows, 20-22px sheets, 34px machine body). Rules are ink at 1.5-2px; the display card has an inset 1.5px ink frame 8px in. Dashed lines mean "not chosen" or "tear here": dashed separators between toys, dashed circles on unchosen letters, dashed receipt rules, a dashed ring on the empty upload dome. The receipt has zig-zag torn edges. Stickers and credit labels sit slightly rotated (-2 to 1.5deg) like things stuck on by hand.

**The Capsule Shell Rule.** Until the toy is out, the player shell is the capsule itself (50% / 24% radius); when it opens it eases to a 30px rounded screen.

## Components

### Buttons
Moulded pills that press in.
- **Shape:** full pill (999px).
- **Primary:** machine-red with white 800 15px text, padding 11px 18px, Press shadow.
- **Hover / Focus:** hot-red on hover; :active drops 1px with a shallower shadow; focus is a 3px lemon outline at 2px offset.
- **Ink:** near-black for secondary actions on paper (Share, Retry). **Light:** white with printed-red text, lemon-cream on hover, the main CTA on red. **Outline:** transparent with a 2px currentColor ring. **Big:** 15px 26px, 17px text.
- **Text button:** white 800 text, underline on hover, for back/secondary links on red.

### Chips
- **Kind tags:** 10.5px uppercase pills with a 1.5px ink border; lemon for GAME, mint for APP; white inside a coloured toy label.
- **Change stamps:** pills that step down by age. New is lemon with a solid ink ring; prev is faded lemon with ink-grey text and a 45% ring; old is unfilled ink-light text with a 28% ring.
- **Vibe chip (extension):** a machine-red press pill with the lemon ✦ mark, 800 13px, pinned to a feed post.

### Cards / Containers
- **Display card:** paper, 22px corners, Lift shadow, inset ink frame; rows A/B/C separated by dashed rules.
- **Form sheet:** paper, 20px corners, Lift, 10px internal gap; the share variant has a sky ticket head.
- **Notice:** paper, 16px corners, a red circular bang with a display-face "!".
- **Credit labels:** paper pills stacked like capsule labels; earlier makers peek out beneath in lemon, offset and rotated.

### Inputs / Fields
- **Style:** white, 2px ink stroke, 12px corners, 600 weight, red caret, ink-light placeholder.
- **Focus:** global 3px lemon outline. **Disabled:** #f1f1f1 fill.

### Navigation
- **Top cap:** sticky red-deep band with the wordmark (display face 19px, lemon ✦ SVG) and a white round close knob that rotates 90deg on hover. The landing cap is static.

### Toy Row (signature)
A three-column row: circled display letter, 48px two-tone capsule with the toy's emoji, then title + kind tag + pitch. Hover washes lemon-cream. Once a toy is picked, the chosen row prints solid (ink fill, white text) and the others fade to 42% with dashed letter circles.

### Crank and Chute (signature)
A recessed maroon chute holding a white crank dial with a red arm and grip, status text, and a slot. Picking a toy turns the crank once (1.1s) and drops the capsule into the slot (0.7s, 0.35s delay, rotating in from above).

### Capsule Player (signature)
The player sits inside a 3px ink bezel. While building, two capsule halves cover it: a frosted clear top with a sheen and a ridged seam rim, and a kind-coloured base. When the toy reports ready the halves part (top up and left, base down and right, 0.75s) and the sealed shell eases to its 30px radius. A kind-coloured toy label sits above.

### Receipt Slip (signature)
Paper with zig-zag torn ends, DotGothic16 uppercase, dashed rules, a mark / step / timing grid. In the live flow each line prints in (0.32s clip reveal) and the busy line shows a blinking block cursor; failed lines print in red-ink. Receipts on the landing are already printed and do not animate.

### Motion (applies to the signature components above)
One easing, cubic-bezier(0.16, 1, 0.3, 1). Motion happens only at state changes: crank turn, capsule drop, halves parting, shell radius easing, receipt lines printing, the overlay sliding in. The blinking cursor runs only while a step is busy. There is no idle looping animation. prefers-reduced-motion collapses all animation and transition to near-zero.

## Do's and Don'ts

### Do:
- **Do** keep machine-red (#d7322a) as the body and white as the only text colour on it.
- **Do** put reading content on paper with ink, using Lift to set it on the machine.
- **Do** colour every capsule, tag and label by kind: lemon GAME, mint APP, sky share/remix.
- **Do** tint shadows with the machine's dark red and give curved plastic an upper-left highlight.
- **Do** show progress as receipt lines that print, and show choice as solid versus dashed.
- **Do** age change stamps from new (lemon, solid ring) to prev (faded) to old (outline only).
- **Do** use 2px round-stroke SVG icons on a 24px grid in currentColor, and the ✦ mark as the brand's own shape.

### Don't:
- **Don't** use spinners or idle looping animation; animate only when state changes.
- **Don't** use DotGothic16 anywhere but receipt paper.
- **Don't** set red text on paper in machine-red; use printed red (#a8201a).
- **Don't** use a capsule colour as decoration where it doesn't mean its kind.
- **Don't** drift toward a dark panel with a neon purple accent and a column of identical rounded cards.
- **Don't** use neutral grey glows for elevation on the machine body or on paper.
