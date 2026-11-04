import { ArrowRight, BookOpen, Compass, Gamepad, Puzzle, Spark } from "@/components/Icons";

const IDEAS = [
  { kind: "Game", title: "Summit Oxygen Run", pitch: "Collect oxygen as you climb above the clouds.", icon: <Gamepad size={17} /> },
  { kind: "Puzzle", title: "Everest in Pieces", pitch: "Rebuild the sunrise, one tile at a time.", icon: <Puzzle size={17} /> },
  { kind: "Learning app", title: "Mountain Field Guide", pitch: "Explore the landscape with a guided mini lesson.", icon: <Compass size={17} /> },
];

const STEPS = [
  ["Choose a moment", "Bring in a photo and caption from your feed, or upload one."],
  ["Set a learning level", "Shape vocabulary and challenge for a school grade or study level."],
  ["Make it yours", "Choose an idea, refine the result, then share a link people can play."],
];

export default function Home() {
  return (
    <div className="land">
      <header className="cap land-cap">
        <a className="wordmark" href="/">
          <span className="brand-mark"><Spark size={17} /></span> VibeBook
        </a>
        <nav className="land-nav" aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a className="btn" href="/app">Try VibeBook <ArrowRight size={16} /></a>
        </nav>
      </header>

      <main>
        <section className="land-hero">
          <div className="land-copy">
            <span className="eyebrow">A learning studio for the things you share</span>
            <h1>Turn a post into <span>something to play.</span></h1>
            <p className="lede">Turn a photo and its story into a small game or useful app people can play, learn from, and share.</p>
            <div className="land-actions">
              <a className="btn big" href="/app">Make it playable <ArrowRight size={18} /></a>
              <a className="land-secondary" href="#how">See how it works</a>
            </div>
            <p className="land-aside"><BookOpen size={16} /> Learning levels from elementary through university</p>
          </div>

          <article className="product-preview" aria-label="Example ideas created from an Everest sunrise post">
            <div className="preview-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/everest.jpg" alt="Sunrise over Himalayan peaks" />
              <span className="preview-photo-index">Field note 01 <span>·</span> Everest Base Camp</span>
            </div>
            <div className="preview-content">
              <div className="preview-source">
                <span className="eyebrow">From this photo</span>
                <strong>Sunrise above the clouds</strong>
                <small>A view from the trail to Everest Base Camp.</small>
              </div>
              <div className="preview-level">
                <span>Learning level</span>
                <strong>Grades 7–9 <span>Middle school</span></strong>
              </div>
              <div className="preview-ideas-head">
                <div><span className="eyebrow">Made for this story</span><h2>Choose an idea</h2></div>
                <span>3 options</span>
              </div>
              <div className="preview-ideas">
                {IDEAS.map((idea, index) => (
                  <article key={idea.title} className={`preview-idea${index === 0 ? " selected" : ""}`}>
                    <span className="preview-idea-icon">{idea.icon}</span>
                    <span className="preview-idea-copy"><small>{idea.kind}</small><strong>{idea.title}</strong><span>{idea.pitch}</span></span>
                    <span className="preview-index">0{index + 1}</span>
                  </article>
                ))}
              </div>
              <div className="preview-note">
                <BookOpen size={17} />
                <span><small>Example experience</small><strong>Mountain Field Guide</strong><span>Interactive lesson · 4 min</span></span>
                <ArrowRight size={16} />
              </div>
            </div>
          </article>
        </section>

        <section className="land-how" id="how">
          <div className="how-intro">
            <span className="eyebrow">A simple creation flow</span>
            <h2>From a post to something people can explore.</h2>
            <p className="lede">Start with something you already care about. VibeBook makes the first draft, and you shape what comes next.</p>
          </div>
          <div className="steps-list">
            {STEPS.map(([title, body], index) => (
              <article className="step-card" key={title}>
                <span className="step-number">0{index + 1}</span>
                <div><h3>{title}</h3><p>{body}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="land-close">
          <span className="brand-mark large"><Spark size={20} /></span>
          <h2>Make the next thing worth sharing.</h2>
          <a className="btn big" href="/app">Start with a photo <ArrowRight size={18} /></a>
          <p className="land-foot">VibeBook · Create, play, and learn together</p>
        </section>
      </main>
    </div>
  );
}
