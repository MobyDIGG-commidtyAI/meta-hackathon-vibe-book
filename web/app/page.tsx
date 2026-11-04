import { ArrowRight, Compass, Gamepad, Puzzle, Spark } from "@/components/Icons";

const IDEAS = [
  { kind: "GAME", title: "Summit Oxygen Run", pitch: "Collect oxygen as you climb above the clouds.", icon: <Gamepad size={18} /> },
  { kind: "PUZZLE", title: "Everest in Pieces", pitch: "Rebuild the sunrise, one tile at a time.", icon: <Puzzle size={18} /> },
  { kind: "LEARNING APP", title: "Mountain Field Guide", pitch: "Explore the landscape with a guided mini lesson.", icon: <Compass size={18} /> },
];

const STEPS = [
  ["Choose a post", "Use a photo and caption from a feed, or upload one."],
  ["Set a learning level", "Adapt vocabulary and challenge for a school grade."],
  ["Build and share", "Choose an idea, refine it, then share a playable link."],
];

export default function Home() {
  return (
    <div className="land">
      <header className="cap land-cap">
        <a className="wordmark" href="/">
          <span className="brand-mark"><Spark size={15} /></span> VibeBook
        </a>
        <nav className="land-nav" aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a className="btn" href="/app">Try VibeBook <ArrowRight size={16} /></a>
        </nav>
      </header>

      <main>
        <section className="land-hero">
          <div className="land-copy">
            <span className="eyebrow"><Spark size={14} /> MAKE MORE FROM THE MOMENTS YOU SHARE</span>
            <h1>Turn a post into something <span>interactive.</span></h1>
            <p className="lede">VibeBook turns a photo and its story into a small game or useful app you can play, learn from, and share.</p>
            <div className="land-actions">
              <a className="btn big" href="/app">Create from a photo <ArrowRight size={18} /></a>
              <a className="land-secondary" href="#how">See how it works</a>
            </div>
            <p className="land-aside"><span className="status-dot" /> Includes grade-aware learning levels from elementary through university.</p>
          </div>

          <div className="product-preview" aria-label="Example ideas created from an Everest sunrise post">
            <div className="preview-topbar"><span className="preview-dots"><i /><i /><i /></span><span>VibeBook workspace</span><span className="preview-live">READY</span></div>
            <div className="preview-source">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/everest.jpg" alt="Sunrise over Himalayan peaks" />
              <div><span className="eyebrow">SOURCE POST</span><strong>Sunrise above the clouds</strong><small>A view from the trail to Everest Base Camp.</small></div>
            </div>
            <div className="preview-level"><span>LEARNING LEVEL</span><strong>Grades 7–9 <span>Middle school</span></strong></div>
            <div className="preview-ideas-head"><div><span className="eyebrow">BUILT AROUND THE POST</span><h2>Choose an idea</h2></div><span>03 options</span></div>
            <div className="preview-ideas">
              {IDEAS.map((idea, index) => (
                <article key={idea.title} className={"preview-idea" + (index === 0 ? " selected" : "")}>
                  <span className="preview-idea-icon">{idea.icon}</span>
                  <span><small>{idea.kind}</small><strong>{idea.title}</strong><span>{idea.pitch}</span></span>
                  <span className="preview-index">0{index + 1}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="land-how" id="how">
          <div className="how-intro">
            <span className="eyebrow">A SIMPLE CREATION FLOW</span>
            <h2>From a post to a polished little experience.</h2>
            <p className="lede">Start with something you already care about. VibeBook handles the first draft, and you shape the result.</p>
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
          <span className="brand-mark large"><Spark size={19} /></span>
          <h2>Make the next thing worth sharing.</h2>
          <a className="btn big" href="/app">Start with a photo <ArrowRight size={18} /></a>
          <p className="land-foot">VibeBook · Create, play, and learn together</p>
        </section>
      </main>
    </div>
  );
}
