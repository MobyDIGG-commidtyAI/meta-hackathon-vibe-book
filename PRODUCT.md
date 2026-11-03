# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences weighted equally:
- **People scrolling Facebook** on desktop Chrome. They see a post they like, and today can only like or share it. They are not prompt writers and mostly don't know what generative AI can make; they need a simple first click.
- **Hackathon judges** (Meta Global AI Developer Hackathon, global, English UI) who meet the product through a 3-minute demo video, submitted Wed 4 Nov 2026.

Friends who receive a share link are a third, downstream audience: they open `/p/:id` on phone or desktop, often inside the FB in-app browser, play, and remix.

## Product Purpose
Turn a social post into something you can play, use, and share. Tap ✦ Vibe on a post, AI (Meta Muse Spark) reads the photo and caption and offers three concrete things to make from it, the user picks one, gets a working game or app in under a minute, can change it with one sentence, and shares a link friends can play and remix.
Success: a first-time user goes from post to a shared, playable link without typing a prompt; a judge understands the mechanism within the first seconds of the video.

## Positioning
Creation starts from inspiration already in your feed, not from an empty prompt box. VibeBook lives beside the post (Chrome extension panel over facebook.com), suggests what the post could become, and every result is a real, runnable experience with a shareable, remixable link and credit chain ("remixed from … by …").

## Operating Context
- Entry 1: Chrome extension. A ✦ Vibe chip sits on post photos; clicking opens a 440px panel on the right edge of facebook.com (dark FB UI behind it). Toolbar icon is the fallback.
- Entry 2: `/app` web page: upload a photo and caption, same flow, no install.
- Flow: read post (~10–15s) → 3 cards (kind GAME or APP) → build (game ~15–20s, app ~60s) → loaded player → change by one sentence → share with your name → `/p/:id` link.
- `/p/:id`: public player page with credit line, remix box, "make your own"; it has an OG card for FB link previews.
- `/`: landing page, also used in the demo video.
- Games are a 2D endless runner re-themed per post (post photo as background, emoji player/obstacles). Apps are AI-written single-file HTML in a sandboxed iframe.
- Waiting is part of the experience: every step shows progress, and a "Behind the scenes" trace shows model and timing.

## Capabilities and Constraints
- Next.js 16 App Router in `web/`, plain CSS in `web/app/globals.css`, React components in `web/components/`. Extension is plain JS MV3 in `extension/` (thin shell; the real UI is the web `/panel` route in an iframe).
- UI copy is English.
- AI model: `meta/muse-spark-1.3` via OpenRouter (Meta direct API possible later).
- Kinds offered today: game and app only. Image/video kinds are not built; never show them as options.
- The panel must not imitate Facebook or Meta branding; it sits on top of FB and must read as a separate product.

## Brand Commitments
- Name **VibeBook** and the **✦** mark (the chip label is "✦ Vibe"). Both stay.
- Lines already in use: "Don't just like it. Vibe it." · "From Inspiration to Experience." · "The next social action isn't Like. It's Create."
- Everything else in the current look (dark purple, system fonts) is replaceable.
- Must not read as generic AI-tool styling (black ground + neon purple + glow).

## Evidence on Hand
- Real flow works end to end with the live model (cards, game, app, change, share, remix).
- Demo hero story: a Mount Everest photo becomes a snowboard game. Mock FB feed in `extension/dev/` with sample posts.
- No user numbers, testimonials, or press. Never invent them.

## Product Principles
1. The post is the prompt: start from what the user already loves, never from a blank box.
2. Three concrete, specific choices beat open-ended freedom for the first click.
3. Every result is real and runnable; show the work happening rather than claiming it.
4. Sharing and remixing is the point: every artifact carries its credit chain.
5. Stay out of the feed's way: VibeBook appears when asked and leaves cleanly.
