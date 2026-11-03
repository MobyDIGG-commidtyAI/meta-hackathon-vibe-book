import { Spark } from "@/components/Icons";

// Suggestions the live model returned for an Everest sunrise post; the dome photo is a crop of the team's concept slide.
const EXAMPLE = [
  { kind: "game", emoji: "🏃", title: "Summit Oxygen Run", pitch: "Dodge crevasses and grab oxygen on your Everest sunrise climb" },
  { kind: "app", emoji: "🧗", title: "Everest Summit Test", pitch: "See if you could summit Everest with this training quiz" },
  { kind: "app", emoji: "🎒", title: "Summit Gear Planner", pitch: "Pack your Everest bag perfectly with this smart checklist" },
] as const;

const STEPS = [
  ["Tap Vibe on a post", "1 tap"],
  ["Pick one of three toys", "A/B/C"],
  ["Turn the crank", "~15s"],
  ["Change it in one line", "~15s"],
  ["Share the capsule", "1 link"],
  ["Friends play and remix", "∞"],
];

export default function Home() {
  return (
    <div className="land">
      <header className="cap land-cap">
        <a className="wordmark" href="/">
          <Spark /> VibeBook
        </a>
        <a className="btn light" href="/app">
          Try it
        </a>
      </header>

      <section className="land-hero">
        <div className="land-copy">
          <h1>
            Don&apos;t just like it.
            <br />
            <span className="sticker">Vibe it.</span>
          </h1>
          <p className="lede">
            Tap <Spark size={14} className="inline-mark" /> Vibe on any Facebook post and it becomes something you can play, use and share. A sunrise on Everest
            turns into a snowboard run your friends can remix.
          </p>
          <div className="land-actions">
            <a className="btn light big" href="/app">
              <Spark /> Vibe a photo
            </a>
            <a className="text-btn" href="#how">
              How it works
            </a>
          </div>
          <p className="land-aside">Or add the Chrome extension and vibe posts right in your feed.</p>
        </div>

        <div className="demo-machine" aria-label="Example: what VibeBook suggests for an Everest post">
          <div className="dome-wrap">
            <div className="dome">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/everest.jpg" alt="A sunrise over Himalayan peaks" />
            </div>
          </div>
          <div className="sheet">
            <h2 className="sheet-title">Pick one to make</h2>
            <div className="toys chosen">
              {EXAMPLE.map((card, i) => (
                <div key={card.title} className={`toy${i === 0 ? " is-chosen" : ""}`}>
                  <span className="toy-letter">{"ABC"[i]}</span>
                  <span className={`capsule ${card.kind}`}>
                    <span>{card.emoji}</span>
                  </span>
                  <span>
                    <span className="toy-title">
                      {card.title}
                      <span className={`tag ${card.kind}`}>{card.kind}</span>
                    </span>
                    <span className="toy-pitch">{card.pitch}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="chute" aria-hidden="true">
            <span className="crank" />
            <span className="chute-text">
              <strong>A is ready: Summit Oxygen Run</strong>
              <span>A game, ready to play</span>
            </span>
            <span className="capsule">
              <span>🏃</span>
            </span>
          </div>
          <p className="demo-caption">Real suggestions from Meta Muse Spark for an Everest sunrise post</p>
        </div>
      </section>

      <section className="land-how" id="how">
        <div>
          <h2>From post to playable in about a minute</h2>
          <p className="lede">
            No prompt to write. VibeBook reads the photo and caption, offers three things worth making, and builds the
            one you pick while you watch.
          </p>
        </div>
        <div className="receipt" aria-label="How it works">
          <div className="receipt-title">
            <span>VibeBook slip</span>
            <span>No. 000001</span>
          </div>
          {STEPS.map(([step, time]) => (
            <div key={step} className="rline done">
              <span className="mark">✓</span>
              <span>{step}</span>
              <span>{time}</span>
            </div>
          ))}
          <div className="receipt-trace">
            <div className="rline">
              <span className="mark" />
              <span>Built with Meta Muse Spark</span>
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="land-close">
        <h2>The next social action isn&apos;t Like. It&apos;s Create.</h2>
        <a className="btn light big" href="/app">
          <Spark /> Vibe a photo
        </a>
        <p className="land-foot">Made for the Meta Global AI Developer Hackathon, November 2026.</p>
      </section>
    </div>
  );
}
