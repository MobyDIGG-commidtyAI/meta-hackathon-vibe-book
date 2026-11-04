# VibeBook

**Don't just like it. Vibe it.** Tap ✦ Vibe on a Facebook post and Meta Muse Spark turns it into something you can play, use, and share: a game or a small app built from the post's photo and caption, with a link friends can play and remix.

Built for the Meta Global AI Developer Hackathon (Nov 2026).

## Repository layout

| Path | What it is |
|---|---|
| `web/` | Next.js app: the create flow (`/panel`, `/app`), share page (`/p/:id`), player (`/play/:id`), and the API that talks to the model |
| `extension/` | Chrome MV3 extension: puts the ✦ Vibe chip on post photos and opens the panel over facebook.com |
| `docs/` | Design doc and MVP context |
| `context/` | Source material from the team (handoff PDF, slides, meeting notes) |
| `PRODUCT.md` | Product brief used for design work |

## Run locally

```bash
cd web
cp .env.example .env.local   # then fill in OPENROUTER_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

Without Upstash env vars, experiences are stored as JSON files in `web/.data/`.

Then load the extension: `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`. See [extension/README.md](extension/README.md) for the full test checklist and the mock feed.

## Deploy with Docker

```bash
cp .env.example .env                           # add OPENROUTER_API_KEY (and DOMAIN + APP_URL for a server)
docker compose up -d --build                   # http://localhost:3000
docker compose --profile https up -d --build   # https://$DOMAIN, certificate by Caddy + Let's Encrypt
extension/package.sh https://your-domain       # the extension pointed at your server, in dist/
```

The stack is the web app, a bundled Redis that keeps experiences, photos and rate limits, and an optional Caddy
for HTTPS. The step-by-step guide, in Thai, is [docs/DEPLOY.md](docs/DEPLOY.md). It covers settings, backups,
troubleshooting and a live check of every feature.

## How it works

1. **Read the post:** the extension reads the photo (fbcdn) and caption, and hands them to the web panel.
2. **Suggest:** `POST /api/vibe` asks the model for three concrete things to make from the post.
3. **Build:** a game becomes an `ExperienceSpec` rendered by a Phaser runner template; an app is a single HTML file the model writes, run in a sandboxed iframe.
4. **Change, share, remix:** one-sentence edits, a public `/p/:id` link with an OG card, and remixes that keep the credit chain.
