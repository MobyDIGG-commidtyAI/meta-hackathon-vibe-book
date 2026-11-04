---
name: VibeBook
description: A learning studio for the things you share. Turn any post into something you can play, use, and share.
colors:
  accent: "#6752e8"
  accent-strong: "#5541d2"
  accent-pressed: "#4937c0"
  accent-soft: "#f0f2ff"
  focus-ring: "#8f80f2"
  accent-blue: "#3675ee"
  blue-wash: "#eef3ff"
  accent-purple: "#7452e8"
  level-ink: "#365fc2"
  level-wash: "#f0f4ff"
  level-line: "#dbe2ff"
  success: "#3d786f"
  danger: "#a85463"
  danger-wash: "#fcf7f8"
  danger-ink: "#70444e"
  canvas: "#f5f7fc"
  surface: "#ffffff"
  surface-muted: "#f0f1f5"
  ink: "#1b2440"
  slate: "#4b5268"
  muted: "#68728b"
  subtle: "#929bb0"
  border: "#e4e8f1"
  field-border: "#d8dce5"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(50px, 5.3vw, 66px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 6vw, 44px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.22
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 550
    lineHeight: 1.35
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    fontFeature: "tnum"
rounded:
  badge: "5px"
  pill-tag: "6px"
  control: "7px"
  button: "8px"
  card: "9px"
  sheet: "10px"
  frame: "11px"
  preview: "12px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
  base: "12px"
  lg: "14px"
  xl: "16px"
  2xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-primary-active:
    backgroundColor: "{colors.accent-pressed}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.slate}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
    height: "40px"
  button-big:
    rounded: "{rounded.button}"
    padding: "11px 17px"
    height: "46px"
  button-text:
    textColor: "{colors.accent-strong}"
    padding: "6px 2px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    size: "36px"
  brand-mark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    size: "29px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
    height: "40px"
  source-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.frame}"
    padding: "12px"
  form-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "15px"
  idea-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  idea-card-chosen:
    backgroundColor: "#f4f1ff"
  idea-icon:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.accent-blue}"
    rounded: "{rounded.control}"
    size: "38px"
  idea-icon-chosen:
    backgroundColor: "{colors.accent-purple}"
    textColor: "{colors.surface}"
  level-pill:
    backgroundColor: "{colors.level-wash}"
    textColor: "{colors.level-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill-tag}"
    padding: "4px 8px"
  stamp-new:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.caption}"
    rounded: "{rounded.badge}"
    padding: "3px 7px"
  activity-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 13px"
  notice:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "11px 12px"
  player:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.frame}"
  product-preview:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.preview}"
  vibe-chip:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "10px 12px"
---

# Design System: VibeBook

## Overview

**Creative North Star: "The Learning Studio"**

VibeBook is a calm, light study desk for turning a post into something to play or learn from. Every surface is a white card with a hairline border resting on a cool blue-white canvas; one violet accent marks the thing to do next, and two kind colours (blue for games, purple for apps) tell you what an idea will become. The look is clean, quiet and legible rather than playful, so the photo, the ideas and the finished experience carry the colour.

Density is a single reading column (660px, 610px on upload) for the create flow, upload and share page, under a 60px white top bar with the wordmark. The landing widens to a two-column copy-and-preview hero and a two-column how-it-works list, then collapses to one column. Motion is small and functional: 140ms colour and 1px lift transitions on hover, a spinner while something is genuinely loading, and a short slide when the extension overlay opens. The direction is adapted from unslop by Damir Sokolovsky (CC BY 4.0), as credited in the global stylesheet.

**Key Characteristics:**
- One face, Inter, at 400 / 500 / 550 / 600; headings at 500 with tight tracking.
- White cards with a 1px cool-grey border on a light blue-white canvas; light mode only.
- A single violet accent fills primary buttons, the brand mark, the feed chip and the chosen state.
- Blue means game, purple means app, on the idea tile and its tag.
- Small, consistent corners (5-12px); circles only for status dots and spinners.
- Shadow only on things that press or float: buttons, the landing preview, the chip, the overlay.

## Colors

A cool, near-monochrome slate-on-white palette with one violet accent and two kind colours that each mean one thing.

### Primary
- **Studio Violet** (accent): the only filled colour: primary buttons, the brand mark, the extension's Vibe chip, the text-selection highlight, spinner heads, the field caret and focus border, and the newest change stamp's text. White on it measures 5.3:1.
- **Deep Violet** (accent-strong): primary-button hover, text links, the text button and icon-button hover.
- **Pressed Violet** (accent-pressed): primary button while pressed.
- **Violet Mist** (accent-soft): the newest change stamp's fill.
- **Focus Violet** (focus-ring): the 3px focus outline at 3px offset across the web app, and the upload drop zone's focus.

### Secondary
- **Game Blue** (accent-blue): GAME ideas: the idea tile's icon, the game tag, and the upload drop zone's icon and hover border. Sits on Blue Wash (blue-wash) inside icon tiles and the source placeholder.
- **App Purple** (accent-purple): APP ideas and the chosen state: the app tag, a chosen idea's border and filled icon tile, the landing preview's selected row, and the landing hero's highlighted phrase.

### Tertiary
- **Level Blue** (level-ink on level-wash, ruled by level-line): the learning-level pill in the flow, share page, landing preview and link-preview card.
- **Done Green** (success): completed build steps.
- **Error Rose** (danger, with danger-wash fill and danger-ink text): notices, the error mark and failed build steps. Muted, not alarm red.

### Neutral
- **Studio Canvas** (canvas): page background for every app surface, the extension panel and the link-preview card; also the theme colour.
- **Surface** (surface): every card, sheet, field, top bar and the player.
- **Surface Muted** (surface-muted): image placeholders.
- **Ink** (ink): headings and primary text; 14.3:1 on canvas.
- **Slate** (slate): secondary and outline button text.
- **Muted** (muted): ledes, hints, pitches and captions; 4.8:1 on white, 4.5:1 on canvas.
- **Subtle** (subtle): the faintest tier, shipped on index numbers, optional labels and timestamps. It measures 2.8:1 on white and is not a text colour for new work.
- **Border** (border): the 1px line around every card and between list rows. Fields use the slightly darker field-border.

### Named Rules
**The One Violet Rule.** Violet is the only filled colour in the interface. It marks the primary action and the chosen thing; everything else is white with a 1px border.

**The Kind Colour Rule.** Blue means GAME and purple means APP. The kind colour sits on the idea's icon tile, and is not used for decoration.

## Typography

**Display Font:** Inter (loaded through next/font as --font-inter; falls back to -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif)
**Body Font:** Inter, same stack
**Label/Mono Font:** none; numbers use Inter's tabular figures

**Character:** A single neutral grotesk carries everything. Hierarchy comes from size, a tight -0.02em to -0.04em tracking on headings, and the 550 weight on titles, not from a second face.

### Hierarchy
- **Display** (600, clamp(50px, 5.3vw, 66px), 1.02, -0.04em): the landing headline only; one phrase in it turns App Purple. Drops to clamp(48px, 13vw, 62px) on phones.
- **Headline** (500, clamp(34px, 6vw, 44px), 1.06, -0.02em): page titles. Share titles use clamp(31px, 7vw, 42px); landing section heads clamp(35px, 4.2vw, 50px) and clamp(32px, 4.5vw, 48px).
- **Title** (500, 22px, 1.22, -0.02em): form-sheet heads. The ideas heading is 25px (23px on phones); the share ticket head 20px; the landing preview head 21px.
- **Body** (400, 14px, 1.55): default text. Ledes are Muted at 15-16px, 1.65, capped at 42-52ch.
- **Body Strong** (550, 14px, 1.35): idea titles, the result label, buttons (13px; 14px on big buttons). The wordmark is 600 15px.
- **Label** (500, 12px, 1.4): form labels, hints, notices, activity heading.
- **Caption** (500, 11px, 1.3, tabular numbers): kind tags, stamps, the level pill, index numbers, activity rows and times.

### Named Rules
**The One Face Rule.** Inter is the only typeface on web, panel and link-preview card. Weight 600 is reserved for the landing display, the wordmark and the link-preview card; headings elsewhere sit at 500.

## Layout

The create flow and share page are one centred column, max 660px, padded 22px 20px 40px with a 16px gap between parts (source card, level field, ideas, player, forms, build activity). Upload narrows to 610px with 34px top padding. A sticky 60px white top bar (10px 20px padding, 1px bottom border) holds the wordmark and, in the flow, a 36px close button. The extension opens the same column as a right-hand overlay, min(440px, 100vw) wide.

The landing hero is a two-column grid (0.82fr / 1.18fr, the preview at least 460px) inside 1160px, with clamp(42px, 6vw, 82px) gaps and clamp() vertical padding; how-it-works is 0.85fr / 1.15fr inside 1080px. Both stack at 900px. At 520px the column tightens to 14px 13px padding with a 13px gap, idea cards and the source thumbnail shrink, and landing actions go full width; short phones (520px wide and under 860px tall) tighten gaps again so the flow fits one screen. Internal rhythm sits on 6 / 8 / 10 / 12 / 14 / 16 / 20px steps.

## Elevation & Depth

Depth is border-first. Cards, sheets, fields, the top bar and the player are flat white separated from the canvas and from each other by a 1px border; list rows divide with a top or bottom hairline. Shadow appears only on things that press or float, always cool and slate-tinted, never coloured.

### Shadow Vocabulary
- **Button rest** (`box-shadow: 0 2px 4px rgba(27, 36, 64, 0.12)`): primary and secondary buttons.
- **Button hover** (`box-shadow: 0 4px 8px rgba(27, 36, 64, 0.16)`): with a 1px upward lift; pressing drops 1px with `0 1px 2px rgba(27, 36, 64, 0.12)`.
- **Soft float** (`box-shadow: 0 8px 24px rgba(27, 36, 64, 0.1)`): the landing product preview only.
- **Field focus** (`box-shadow: 0 0 0 3px rgba(77, 84, 140, 0.12)`): with a violet border on focused fields.
- **Chip** (`box-shadow: 0 2px 8px rgba(26, 34, 57, 0.2)`): the Vibe chip on a Facebook post.
- **Overlay** (`box-shadow: -6px 0 24px rgba(23, 30, 48, 0.2)`): the extension panel's left edge.

### Named Rules
**The Border Defines Rule.** Containers are separated by a 1px border, not a shadow. A shadow means the element presses or floats above the page.

## Shapes

Corners are small and tiered by size: 5px on stamps and step numbers, 6px on the level pill, 7px on fields, icon tiles and the close button, 8px on buttons, the brand mark, notices and the chip, 9px on idea, loading and activity cards, 10px on sheets, 11px on the source card and player, 12px on the landing preview and link-preview photo. Circles appear only on spinners, build-status dots and the notice mark. There are no pill shapes. Every container carries a 1px solid border; the only dashed line is the upload drop zone.

**The Tight Radius Rule.** Corners stay between 5px and 12px and grow with the element. Nothing is fully rounded except status dots and spinners.

## Components

### Buttons
Quiet, compact and rectangular.
- **Shape:** gently rounded (8px), min height 40px.
- **Primary:** Studio Violet with white 550 13px text, padding 9px 14px, Button rest shadow.
- **Hover / Focus:** Deep Violet, 1px lift and Button hover shadow over 140ms; pressing drops 1px to Pressed Violet; focus is the 3px Focus Violet outline at 3px offset. Disabled is 50% opacity.
- **Secondary:** white with Slate text and a 1px border; border darkens on hover. Used for Retry and the share page's header CTA.
- **Outline:** transparent with a 1px border and Slate text, for Open and the share page's closing link.
- **Big:** 46px tall, 11px 17px padding, 14px text, for landing and upload CTAs. **Wide** stretches to full width.
- **Text button:** Deep Violet 500 13px text with an icon, underlined on hover, for "Other ideas".
- **Icon button:** 36px square, white, 1px border, Muted icon; turns violet-tinted on hover. The close control.

### Chips
- **Kind tags:** 11px 500 text with no fill or border, coloured by kind.
- **Change stamps:** small 5px-cornered badges with a 1px border that step back by age: the newest is Violet Mist with violet text, the previous one grey, older ones white.
- **Level pill:** Level Blue text on Level Wash with a Level Line border, 6px corners.
- **Vibe chip (extension):** a Studio Violet button pinned to the top-right of each feed photo, with the white Spark mark and "Vibe" at 550 12px, the Chip shadow and a 1px press.

### Cards / Containers
- **Corner Style:** 9-11px by size (see Shapes).
- **Background:** Surface on Studio Canvas.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px Border.
- **Internal Padding:** 12-15px; sheets stack contents with a 10px gap.
- **Source card:** 112px photo thumbnail beside a two-line caption and scene line.
- **Form sheet:** heading, label, field row with its button; the share result adds a grey ticket head with a check icon.
- **Notice:** Error Rose wash with a circular error mark and an inline secondary Retry button.

### Inputs / Fields
- **Style:** white, 1px field-border, 7px corners, 40px tall, 13px text, violet caret, a muted placeholder. Textareas start at 100px and resize vertically. The learning-level control is a native select in the same field style.
- **Focus:** violet border plus the Field focus ring, over 140ms.
- **Disabled:** a light grey fill.

### Navigation
- **Top bar:** sticky, white, 60px, 1px bottom border; the wordmark is the violet Spark brand mark (29px, 8px corners) beside "VibeBook" at 600 15px. The landing bar is static and adds a muted "How it works" link (hidden under 520px) and a primary CTA. The extension panel's loading header repeats the same bar.

### Idea Card (signature)
A full-width button row: a 38px icon tile in the kind colour, then the kind tag and index number over the title and pitch, then an arrow. Hover lifts 1px and tints the border violet. The chosen card gets an App Purple border, a faint violet fill and a filled purple icon tile; the others dim to 68% while it builds.

### Player
The finished experience in a 3:4 iframe frame (max 72vh, 58vh in the flow) with a 1px border and 11px corners. While loading, a near-white overlay shows a spinner and a status line; on failure it shows the error mark and the message. It fades out over 200ms when ready.

### Build Activity
A small card listing each step on a 17px / text / time grid: a green check in a circle when done, a rose error mark when failed, a mini spinner while busy. A collapsible "View model details" disclosure lists each model call with its time.

### Link-preview card
The 1200 x 630 share image: canvas background, a 400 x 470 photo with 12px corners, the brand mark and wordmark, the title at 600 60px, the tagline in Muted, the level pill and a violet Play / Open button.

## Do's and Don'ts

### Do:
- **Do** keep every app surface light: Studio Canvas behind, white cards with a 1px Border in front.
- **Do** reserve Studio Violet for the primary action, the brand mark, the chip and the chosen state.
- **Do** colour ideas by kind: Game Blue for games, App Purple for apps.
- **Do** set everything in Inter, with headings at 500 and tight negative tracking.
- **Do** use 2px round-stroke SVG icons on a 24px grid in currentColor, and the four-point Spark as the brand's own mark.
- **Do** keep hover motion to 140ms colour, border and 1px lift changes, and honour prefers-reduced-motion.

### Don't:
- **Don't** add a second typeface or a display face.
- **Don't** use pill or fully rounded shapes for buttons, cards or tags.
- **Don't** use shadows to separate cards; use the border.
- **Don't** fill large areas with violet or use a kind colour where it doesn't mean its kind.
- **Don't** set new text in Subtle; it is below 4.5:1 on white.
- **Don't** introduce a dark theme; the system is light-only.
