"use client";
// AI-powered post-to-creation flow shared by the extension panel and the no-install page.
import { useCallback, useEffect, useRef, useState } from "react";
import Player, { type PlayerStatus } from "./Player";
import { ArrowRight, Back, BookOpen, Check, CircleCheck, Close, Compass, Copy, External, Gamepad, Puzzle, Retry, Spark } from "./Icons";
import type { TraceStep } from "@/lib/ai";
import { CHANGE_EXAMPLES, genreOf, kindLabel } from "@/lib/spec";
import type { PublicExperience, Suggestion } from "@/lib/store";
import { LEARNING_LEVELS, type LearningLevel } from "@/lib/learning";

export type Post = { image: string | null; caption: string; postUrl: string; platform: string };

type Step = { text: string; status: "busy" | "done" | "fail"; time?: string };
type Vibe = { imageId: string | null; scene: { description: string; mood: string }; suggestions: Suggestion[] };

// Newest change prints in full colour; each older one steps back.
const stampAge = (age: number) => (age === 0 ? "new" : age === 1 ? "prev" : "old");

async function api<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Edit-Token": token } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function loadName() {
  try {
    return localStorage.getItem("vibebook:name") ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem("vibebook:name", name);
  } catch {
    // storage blocked (third-party iframe); the name is only a convenience
  }
}

export default function VibeFlow({ post, onClose }: { post: Post; onClose?: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const [exp, setExp] = useState<PublicExperience | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [changeLog, setChangeLog] = useState<string[][]>([]);
  const [unsupported, setUnsupported] = useState("");
  const [instruction, setInstruction] = useState("");
  const [name, setName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("general");
  const repaired = useRef(false);
  const started = useRef(false);

  const push = (text: string) => setSteps((s) => [...s, { text, status: "busy" }]);
  const settle = (status: Step["status"], text?: string, time?: string) =>
    setSteps((s) => s.map((step, i) => (i === s.length - 1 ? { text: text ?? step.text, status, time } : step)));

  const read = useCallback(async (level: LearningLevel = learningLevel) => {
    setError(null);
    setVibe(null);
    setChosenIndex(null);
    setSteps([{ text: post.image ? "Reading the photo and caption…" : "Reading the post…", status: "busy" }]);
    try {
      const data = await api<Vibe & { trace: TraceStep[] }>("/api/vibe", {
        image: post.image,
        caption: post.caption,
        postUrl: post.postUrl,
        platform: post.platform,
        learningLevel: level,
      });
      setVibe(data);
      setTrace((t) => [...t, ...data.trace]);
      settle("done", "Read the post", secs(data.trace[0]?.ms ?? 0));
    } catch (e) {
      settle("fail", `Couldn't read the post: ${errorText(e)}`);
      setError({ message: errorText(e), retry: read });
    }
  }, [post, learningLevel]);

  useEffect(() => {
    setName(loadName());
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;
    read();
  }, [read]);

  async function choose(index: number) {
    if (!vibe) return;
    const card = vibe.suggestions[index];
    setError(null);
    setChosenIndex(index);
    setBuilding(true);
    setExp(null);
    setLoaded(false);
    setShareUrl(null);
    setChangeLog([]);
    setUnsupported("");
    repaired.current = false;
    push(card.kind === "game" ? `Designing ${card.title}…` : `Writing ${card.title}…`);
    try {
      const data = await api<{ editToken: string; experience: PublicExperience }>("/api/experiences", {
        imageId: vibe.imageId,
        scene: vibe.scene,
        suggestion: card,
        learningLevel,
        source: { caption: post.caption, postUrl: post.postUrl, platform: post.platform },
      });
      const built = data.experience.trace.at(-1);
      setToken(data.editToken);
      setExp(data.experience);
      setTrace((t) => [...t, ...data.experience.trace]);
      settle("done", card.kind === "game" ? "Game designed" : "App written", secs(built?.ms ?? 0));
      push(card.kind === "game" ? "Loading the game…" : "Loading the app…");
    } catch (e) {
      settle("fail", `Couldn't build it: ${errorText(e)}`);
      setError({ message: errorText(e), retry: () => choose(index) });
    } finally {
      setBuilding(false);
    }
  }

  const onStatus = useCallback(
    async (status: PlayerStatus) => {
      if (!exp) return;
      if (status.state === "ready") {
        setLoaded(true);
        settle("done", exp.kind === "game" ? "Game loaded" : "App loaded");
        return;
      }
      if (status.state !== "failed") return;
      if (exp.kind === "app" && !repaired.current && token) {
        repaired.current = true;
        settle("fail", `App didn't load: ${status.message}`);
        push("Sending the error back to the model to fix…");
        try {
          const data = await api<{ experience: PublicExperience }>(
            `/api/experiences/${exp.id}/repair`,
            { error: status.message },
            token,
          );
          setExp(data.experience);
          setTrace((t) => [...t, ...data.experience.trace.slice(-1)]);
          settle("done", "Fixed");
          push("Loading the app…");
        } catch (e) {
          settle("fail", `Couldn't fix it: ${errorText(e)}`);
          setError({ message: "Choose another idea and try again.", retry: backToCards });
        }
        return;
      }
      settle("fail", `Didn't load: ${status.message}`);
      setError({ message: "Choose another idea and try again.", retry: backToCards });
    },
    [exp, token],
  );

  function backToCards() {
    setExp(null);
    setError(null);
    setShareUrl(null);
    setChosenIndex(null);
    setChangeLog([]);
  }

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (!exp || !instruction.trim()) return;
    const text = instruction.trim();
    setBusy(true);
    setUnsupported("");
    push(`Changing: “${text}”…`);
    try {
      const data = await api<{ experience: PublicExperience; changeSummary: string[]; unsupported: string }>(
        `/api/experiences/${exp.id}/edit`,
        { instruction: text },
        token,
      );
      settle("done", "Changed", secs(data.experience.trace.at(-1)?.ms ?? 0));
      push(exp.kind === "game" ? "Reloading the game…" : "Reloading the app…");
      setLoaded(false);
      repaired.current = false;
      setExp(data.experience);
      setTrace((t) => [...t, ...data.experience.trace.slice(-1)]);
      if (data.changeSummary.length) setChangeLog((log) => [...log, data.changeSummary]);
      setUnsupported(data.unsupported);
      setInstruction("");
    } catch (err) {
      settle("fail", `Couldn't change it: ${errorText(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!exp) return;
    setBusy(true);
    saveName(name.trim());
    try {
      const data = await api<{ url: string }>(`/api/experiences/${exp.id}/publish`, { creatorName: name.trim() }, token);
      setShareUrl(data.url);
    } catch (err) {
      setError({ message: `Couldn't share: ${errorText(err)}`, retry: share });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", shareUrl);
    }
  }

  return (
    <div className="machine">
      <header className="cap">
        <span className="wordmark">
          <span className="brand-mark"><Spark size={17} /></span> VibeBook
        </span>
        {onClose && (
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <Close size={18} />
          </button>
        )}
      </header>

      <div className="body">
        {!exp && (
          <section className="source-card" aria-label="Source post">
            {post.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="source-image" src={post.image} alt="The post photo" />
            ) : (
              <span className="source-image source-placeholder"><BookOpen size={24} /></span>
            )}
            <div className="source-copy">
              <span className="eyebrow">From {post.platform === "web" ? "your photo" : `your ${post.platform} post`}</span>
              <p>{post.caption || "Photo shared without a caption"}</p>
              {vibe && <span className="source-scene">{vibe.scene.description}</span>}
            </div>
          </section>
        )}

        {error && (
          <div className="notice" role="alert">
            <span className="notice-mark">!</span>
            <span>{error.message}</span>
            <button type="button" className="btn secondary" onClick={error.retry}>
              <Retry size={16} /> Try again
            </button>
          </div>
        )}

        {!exp && (
          <label className="level-field" htmlFor="vb-learning-level">
            <span>
              <span className="eyebrow">Learning level</span>
              <span className="level-hint">Tailor ideas to a grade or study level</span>
            </span>
            <select
              id="vb-learning-level"
              className="field level-select"
              value={learningLevel}
              disabled={building || steps.some((step) => step.status === "busy")}
              onChange={(e) => {
                const next = e.target.value as LearningLevel;
                setLearningLevel(next);
                void read(next);
              }}
            >
              {LEARNING_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
            </select>
          </label>
        )}

        {vibe && !exp && (
          <section className="ideas-section" aria-label="Things you can make">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Ideas for this post</span>
                <h2>Choose an idea</h2>
              </div>
              <span className="level-pill">{LEARNING_LEVELS.find((level) => level.value === learningLevel)?.shortLabel}</span>
            </div>
            <div className="idea-list">
              {vibe.suggestions.map((card, i) => (
                <button
                  key={i}
                  type="button"
                  className={"idea-card" + (i === chosenIndex ? " is-chosen" : "")}
                  onClick={() => choose(i)}
                  disabled={building}
                >
                  <span className="idea-icon" aria-hidden="true">
                    {card.kind === "game" ? (card.genre === "puzzle" || card.genre === "memory" ? <Puzzle size={20} /> : <Gamepad size={20} />) : <Compass size={20} />}
                  </span>
                  <span className="idea-copy">
                    <span className="idea-meta">
                      <span className={"tag " + card.kind}>{kindLabel(card.kind, card.genre)}</span>
                      <span className="idea-number">0{i + 1}</span>
                    </span>
                    <span className="idea-title">{card.title}</span>
                    <span className="idea-pitch">{card.pitch}</span>
                  </span>
                  <ArrowRight className="idea-arrow" size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {!vibe && !error && !exp && (
          <section className="loading-card" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span><strong>Finding ideas from your post</strong><small>Usually takes a few seconds</small></span>
          </section>
        )}

        {exp && (
          <>
            <div className="toy-window">
              <div className={`toy-label ${exp.kind}`}>
                <span className="result-icon">{exp.kind === "game" ? <Gamepad size={19} /> : <Compass size={19} />}</span>
                <strong>{exp.title}</strong>
                <span className={`tag ${exp.kind}`}>{kindLabel(exp.kind, exp.spec ? genreOf(exp.spec) : "none")}</span>
              </div>
              <Player id={exp.id} version={exp.version} kind={exp.kind} className="flow-player" onStatus={onStatus} />
            </div>
            <p className="result-tagline">{exp.tagline}</p>

            {loaded && (
              <form className="form-sheet" onSubmit={change}>
                <div className="form-heading"><h2>Refine your creation</h2><p>Describe one change and we’ll update it.</p></div>
                <label htmlFor="vb-change">What would you like to change?</label>
                <div className="row">
                  <input
                    id="vb-change"
                    className="field"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={exp.kind === "game" && exp.spec ? CHANGE_EXAMPLES[genreOf(exp.spec)] : "say what to change"}
                    disabled={busy}
                  />
                  <button className="btn" disabled={busy || !instruction.trim()}>
                    Change
                  </button>
                </div>
                {changeLog.length > 0 && (
                  <div className="stamps" aria-label="Changes so far">
                    {changeLog.map((set, i) =>
                      set.map((c) => (
                        <span key={`${i}-${c}`} className={`stamp ${stampAge(changeLog.length - 1 - i)}`}>
                          {c}
                        </span>
                      )),
                    )}
                  </div>
                )}
                {unsupported && <p className="note">{unsupported}</p>}
              </form>
            )}

            {loaded && !shareUrl && (
              <div className="form-sheet">
                <div className="form-heading"><h2>Share your creation</h2><p>Add a creator name to the shared page.</p></div>
                <label htmlFor="vb-name">Creator name</label>
                <div className="row">
                  <input
                    id="vb-name"
                    className="field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ohm"
                    maxLength={40}
                  />
                  <button type="button" className="btn" onClick={share} disabled={busy}>
                    Share
                  </button>
                </div>
              </div>
            )}

            {shareUrl && (
              <section className="form-sheet" aria-live="polite">
                <div className="ticket-head">
                  <CircleCheck size={20} /><h2>Your link is ready</h2>
                </div>
                <a className="link" href={shareUrl} target="_blank" rel="noopener">
                  {shareUrl}
                </a>
                <div className="row">
                  <button type="button" className="btn" onClick={copy}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <a className="btn outline" href={shareUrl} target="_blank" rel="noopener">
                    <External size={18} /> Open
                  </a>
                </div>
                <p className="note">Paste it in a Facebook post. Friends can play it and remix it.</p>
              </section>
            )}

            <button type="button" className="text-btn" onClick={backToCards} disabled={busy}>
              <Back size={18} /> Other ideas
            </button>
          </>
        )}

        {steps.length > 0 && (
          <section className="activity-card" aria-live="polite">
            <div className="activity-heading"><CircleCheck size={17} /><span>Build activity</span>{exp && <span className="activity-id">{exp.id.slice(0, 6)}</span>}</div>
            <div className="activity-list">
              {steps.map((s, i) => (
                <div key={i} className={"activity-row " + s.status}>
                  <span className="activity-status">{s.status === "done" ? <Check size={13} /> : s.status === "fail" ? "!" : <span className="mini-spinner" />}</span>
                  <span>{s.text}</span><time>{s.time}</time>
                </div>
              ))}
            </div>
            {trace.length > 0 && (
              <details className="trace-details">
                <summary>View model details</summary>
                {trace.map((t, i) => <p key={i}>{t.step} · {t.model} <span>{secs(t.ms)}</span></p>)}
              </details>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
