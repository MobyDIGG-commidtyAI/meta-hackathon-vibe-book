---
version: 1
slug: "web-components-vibeflow-tsx"
primary_target: "web/components/VibeFlow.tsx"
related_targets: ["web/app/page.tsx","web/app/p/[id]/page.tsx","web/app/app/page.tsx","extension/content.js"]
---

## Scope
VibeBook web surfaces in one world: the create flow (`/panel` inside the extension, `/app` upload), the share page `/p/:id`, the landing `/`, and the extension chip + panel shell on facebook.com.
Modes: panel and /app are Operate; `/p/:id` is Experience (the toy leads); `/` is Persuade.

## Audience and job
FB scrollers making something from a post in under a minute; friends opening a share link on phone; hackathon judges watching a 3-minute video. Must not read as a generic AI tool (black + neon purple glow).

## Direction contract
THESIS: VibeBook is a capsule-toy machine for your feed. The post is loaded into the clear dome, a printed display card lists three toys A/B/C, you turn the crank, a capsule drops and opens into something playable. It refuses the dark AI-tool panel with a neon accent and a column of rounded cards.

OWN-WORLD: glossy machine-red enamel (#E63A2E) owns the frame, header and crank; white printed display card with black ink rules and big lettered variants; two-tone capsules (clear top, colored base) where lemon = GAME, mint = APP, sky = share/remix; a clear acrylic dome with a real sheen around the post photo; heavy Japanese display gothic for titles and letters, rounded gothic for UI, a dot-matrix face only on the receipt slip that carries timings.

STORY: the visitor sees their own post inside the machine, understands they can make one of three named things, turns the crank, watches the receipt print each step, gets a capsule that opens into a working game or app, changes it in one line, and leaves with a labelled capsule link that friends can play and refill with their own idea.

FIRST VIEWPORT: panel = red machine body. Top: red header band with the ✦ VibeBook wordmark and a round close knob. Upper third: the post photo in a circular clear dome with a sheen, scene line under it. Below: the white display card, three rows A/B/C (circled letter, capsule with emoji, title, GAME/APP capsule tag, one-line pitch). Primary action: tapping a row turns the crank at the card's foot; the chosen row prints solid, the others drop to dashed outlines.

FORM: Capsule Machine (gashapon), position 5 on the grounded list; seed key 9d1c0e1a. Raises kept: A/B/C lettering with solid-vs-dashed choice (sewing pattern); progress prints as a receipt slip instead of spinners (phosphor terminal); newest change is the most saturated, older ones fade (suminagashi); remix credits stack as layered capsule labels (décollage). Signature interaction: crank turn → capsule drop → capsule halves part to reveal the player. Motion only at state changes, reduced-motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- No production extension listing yet: landing CTA must not claim a Chrome Web Store install.
