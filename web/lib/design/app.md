# VibeBook design guide for generated apps

Every app you write is opened by someone who just saw a post in their feed. It must look like it was designed for that post by a good designer, not assembled from the usual AI template. Follow this guide exactly.

## 1. Start from a world, not a template

Before writing any CSS, pick the real-world artifact, place or ritual this post's subject lives in, and build the whole app in that object's visual grammar. Write it as the first line inside `<style>`:

`/* world: <artifact> · palette: <names> · type: <display stack> / <body stack> */`

Examples of worlds:
- campsite or hike → park permit, trail map with legend, ranger's clipboard
- road trip or flower field drive → road atlas page, mileage log, highway sign
- mountain or expedition → expedition logbook, altimeter dial, summit register
- café, restaurant or food → menu board, order ticket, recipe card
- car, bike or gadget → spec sheet, dashboard gauge, service record
- concert, sports or event → ticket stub, scoreboard, setlist
- wedding, party or invite → printed invitation, RSVP card, place card
- beach, boat or travel → boarding pass, tide table, postcard
- fitness or training → coach's whiteboard, training log, stopwatch
- shop, product or deal → price tag, receipt, catalogue page

The world gives you typography, colour, layout and small details (perforations, ruled lines, stamps, map legends, ticket notches). Controls stay standard and easy to use; only their look comes from the world.

## 2. Make it genuinely useful

Looks come second. Someone should be able to use this app for real after seeing the post.

- **One job, finished:** answer one real question the post raises (Can I make it? When should I go? What do I bring? What will it cost?) and end with a concrete answer, not a vague score.
- **Useful from the first second:** start from sensible defaults so the result already shows something. Keep all state in one object and redraw every output from one `render()` function, so no line on the page can disagree with another. Any sentence that mentions a choice (the car, the date, the route) reads it from that state; never hard-code advice for the default choice.
- **Something to take away:** end with a **Copy** button that copies a plain-text version of the result: the plan, the checklist, or a message ready to send, formatted for pasting into Messenger or LINE. Call `navigator.clipboard.writeText`, fall back to selecting a visible `<textarea>` and `document.execCommand("copy")`, and confirm with "Copied". Offer `navigator.share` as well when it exists.
- **Honest about the real world:** for a real place, shop or event, never invent prices, phone numbers, opening hours, availability or booking. Use only what the post says. Let the user type what's missing, and label every estimate "est.".
- **No pretend actions:** buttons never pretend to book, pay, reserve or send. For a real-world action, produce the message or details the user sends themselves ("Copy message to the campsite").
- **Safety where it matters:** if the subject carries risk (mountains, driving, water, money, health), include the one or two facts that keep people safe, in plain words.

## 3. Never ship the AI look

These are banned unless the world literally is that thing:
- Near-black or navy background with one neon, gold or lime accent. Dark is allowed only for worlds that are dark in real life (night sky, cinema, observatory, nightclub).
- The other two defaults: plain white with a blue SaaS button, and an off-white or beige "cream" page with an italic serif and a terracotta accent. If the world is paper, make it a specific paper with real colour (kraft brown, manila, graph-paper green, newsprint grey, carbon-copy pink), never off-white or beige.
- Glow of any kind: coloured zero-offset shadows, glowing text, neon borders.
- A pill or small all-caps label above the title ("✦ SUMMIT DAY · BRIGHT"). The title stands on its own.
- Numbered section headers like "1 • Pick nights" when order doesn't matter.
- A column of identical rounded cards with thin translucent borders and big soft shadows. Never put cards inside cards.
- Gradient text, gradient buttons, glass or blur panels as decoration.
- Opening with the photo fading into a dark gradient and the title on top of it.
- Emoji used as icons in buttons, labels or headings. Emoji may appear only as content the user chooses or reads, a few at most.
- A thick coloured stripe on one side of a card or row.
- Decorative diagonal stripe gradients. Draw perforations and rules with dashed borders or a dotted radial-gradient row.
- Pulsing dots, bounce easing, infinite animations, animating width, height or position.
- Text under 13px, letter-spacing above 0.08em, buttons shorter than 44px.
- Made-up ratings, review counts, prices or availability presented as fact ("4.9 ★", "only 3 left").
- A two-colour headline with one highlighted word as the only design idea.

## 4. Colour

- Define 3–5 colours as CSS custom properties in `:root`, named for their role: `--ground`, `--ink`, `--primary` (actions), `--second`, `--highlight`.
- Take them from the photo and from the world's real materials: kraft paper, forest-green enamel, sky-blue tile, concrete, sand, signal orange, brass, chalkboard green.
- Commit: let one colour own a large area (a header band, a full field, the ground). Don't sprinkle accents over a neutral page.
- Every piece of text, including placeholders, secondary text and hover states, needs at least 4.5:1 contrast. Placeholders are a darker tint of `--ink`, not a light grey.
- Pick `--primary` dark enough for white text at 4.5:1, or put `--ink` text on it. Bright oranges, yellows and light greens take dark text.
- On a coloured ground, tint secondary text from that hue instead of using grey.

## 5. Type (system fonts only; web fonts cannot load)

Choose one display stack that fits the world and one body stack. Pick from these:
- Geometric (modern travel, design objects): `"Futura", "Avenir Next", "Century Gothic", "Trebuchet MS", sans-serif`
- Humanist (outdoors, guides, calm tools): `"Seravek", "Gill Sans", "Gill Sans MT", "Optima", "Candara", "Segoe UI", sans-serif`
- Signage and industrial (transit, sport, cars, gauges): `"DIN Alternate", "DIN Condensed", "Bahnschrift", "Roboto Condensed", "Arial Narrow", sans-serif-condensed, sans-serif`
- Book serif (heritage, wine, slow travel): `"Iowan Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", "Hoefler Text", Georgia, serif`
- High-contrast serif (fashion, weddings, luxury): `"Didot", "Bodoni 72", "Bodoni MT", "Baskerville", "Constantia", Georgia, serif`
- Slab (gear, ranches, workshops): `"Rockwell", "Roboto Slab", "American Typewriter", serif`
- Rounded (kids, snacks, pets): `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif`
- Typewriter (logs, tickets, receipts): `"American Typewriter", "Courier New", ui-monospace, monospace`
- Data only: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`

Rules:
- Use a clear size scale, for example 44 / 28 / 20 / 16 / 14 px. Display line-height 1.0–1.1 with letter-spacing between -0.01em and -0.03em.
- Body text is 16px with line-height 1.5, and lines no wider than 65 characters.
- Use `font-variant-numeric: tabular-nums` for numbers that change.
- Uppercase only for labels of three words or fewer (under 20 characters), at 12px or larger, with tracking of 0.06em or less. Never uppercase sentences, help text or buttons.

## 6. Layout

- The first screen (440×700) shows the photo, the title and the main interaction. The user can do something within 10 seconds without scrolling.
- Compose the screen as the world's artifact (a ticket, a map with its legend, a logbook page, a menu board, a spec sheet), not as a stack of boxes.
- Group related controls tightly. Separate groups with space or a rule in the world's style (dashed perforation, ruled line, map border), not with a card per section.
- Any box with a background or border gets at least 12px of inner padding; text never touches its edge.
- Frame the photo the way the world would: a polaroid with a handwritten caption, a postage stamp, a map inset, a window in a ticket. Use `object-fit: cover` and choose `object-position`. Never use it as a blurred or darkened background wash.
- Show the result live as the world's finished artifact (a filled-in permit, a printed boarding pass, a scorecard, a receipt). That result is the hero of the app.
- Keep one root `<main>`, width 100%, max-width about 520px, centred. It must work at 360px wide.

## 7. Components

- One primary button (solid, in `--primary`) per screen region, with secondary actions as outline or text. Every button needs hover, active, disabled and `:focus-visible` states.
- Inputs: visible labels above them, borders or underlines drawn from the palette, placeholders still readable.
- Choices: segmented buttons, tabs, stamps or tickets in the world's style. The selected state must be unmistakable: filled colour plus a check or mark, not only a border change.
- Icons: draw small inline SVGs (24px grid, 2px stroke, `currentColor`), or use none.
- Theme the browser parts too: `::selection`, `accent-color` for native controls, `caret-color`, and a focus outline in your palette.

## 8. Motion

One authored moment tied to the main action, for example the result card stamping in or a gauge needle swinging. Use 150–400ms with `cubic-bezier(.2,.8,.2,1)`, animate only transform and opacity, never loop, and disable it under `prefers-reduced-motion`. Progress bars and meters change with `transform: scaleX()`, never by transitioning `width`.

## 9. Words

- Use the post's real specifics: places, dates and names from the caption.
- Label estimates as estimates ("about", "est."). Never invent facts about a real business.
- Keep copy short and concrete, in the world's voice. Buttons name the action ("Book 2 nights", "Check my gear"), never "Submit".
- Write in plain sentences. Use periods and commas, and at most one em dash on the whole page.
- English only. Never mix in words or characters from another language.
- Handle empty and invalid input with one helpful line.

## 10. Check before you return the HTML

- The world comment is the first line of `<style>`.
- Nothing from section 3 is in the page.
- Colours come from `:root` variables, and one of them owns a large area.
- No text under 13px, every tap target is at least 44px, and every text colour (placeholders and hover states included) passes 4.5:1.
- The photo, the title and the main action are visible on the first screen.
- The result updates live, every line agrees with the controls, and it looks like the world's artifact.
- A Copy button gives the user the result as plain text, and no button pretends to book, pay or send.
- No invented prices, contacts, hours or availability for a real place.
