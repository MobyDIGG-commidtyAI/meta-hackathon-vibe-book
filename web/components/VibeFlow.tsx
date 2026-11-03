"use client";
// The whole create flow, shared by the extension panel (/panel) and the no-install page (/app):
// read post → 3 cards → build → smoke test (+1 auto-repair for apps) → change → share.
// Drawn as a capsule machine: the post sits in the dome, the cards are toys A/B/C, building turns the crank,
// and progress prints on a receipt slip.
import { useCallback, useEffect, useRef, useState } from "react";
import Player, { type PlayerStatus } from "./Player";
import { Back, Check, Close, Copy, External, Retry, Spark } from "./Icons";
import type { TraceStep } from "@/lib/ai";
import type { PublicExperience, Suggestion } from "@/lib/store";

export type Post = { image: string | null; caption: string; postUrl: string; platform: string };

type Step = { text: string; status: "busy" | "done" | "fail"; time?: string };
type Vibe = { imageId: string | null; scene: { description: string; mood: string }; suggestions: Suggestion[] };

const LETTERS = "ABC";

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
  const repaired = useRef(false);
  const started = useRef(false);

  const push = (text: string) => setSteps((s) => [...s, { text, status: "busy" }]);
  const settle = (status: Step["status"], text?: string, time?: string) =>
    setSteps((s) => s.map((step, i) => (i === s.length - 1 ? { text: text ?? step.text, status, time } : step)));

  const read = useCallback(async () => {
    setError(null);
    setSteps([{ text: post.image ? "Reading the photo and caption…" : "Reading the post…", status: "busy" }]);
    try {
      const data = await api<Vibe & { trace: TraceStep[] }>("/api/vibe", {
        image: post.image,
        caption: post.caption,
        postUrl: post.postUrl,
        platform: post.platform,
      });
      setVibe(data);
      setTrace((t) => [...t, ...data.trace]);
      settle("done", "Read the post", secs(data.trace[0]?.ms ?? 0));
    } catch (e) {
      settle("fail", `Couldn't read the post: ${errorText(e)}`);
      setError({ message: errorText(e), retry: read });
    }
  }, [post]);

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
          setError({ message: "Try another toy.", retry: backToCards });
        }
        return;
      }
      settle("fail", `Didn't load: ${status.message}`);
      setError({ message: "Try another toy.", retry: backToCards });
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

  const chosen = vibe && chosenIndex !== null ? vibe.suggestions[chosenIndex] : null;
  const letter = chosenIndex !== null ? LETTERS[chosenIndex] : null;

  return (
    <div className="machine">
      <header className="cap">
        <span className="wordmark">
          <Spark /> VibeBook
        </span>
        {onClose && (
          <button type="button" className="knob" onClick={onClose} aria-label="Close">
            <Close size={18} />
          </button>
        )}
      </header>

      <div className="body">
        {!exp && (
          <div className="dome-wrap">
            <div className="dome">
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image} alt="The post photo" />
              ) : (
                <Spark size={56} />
              )}
            </div>
            {vibe && <p className="scene-line">{vibe.scene.description}</p>}
          </div>
        )}

        {error && (
          <div className="notice" role="alert">
            <span className="bang">!</span>
            <span>{error.message}</span>
            <button type="button" className="btn ink" onClick={error.retry}>
              <Retry size={16} /> Try again
            </button>
          </div>
        )}

        {vibe && !exp && (
          <section className="sheet" aria-label="Things you can make">
            <h2 className="sheet-title">Pick one to make</h2>
            <div className={`toys${chosen ? " chosen" : ""}`}>
              {vibe.suggestions.map((card, i) => (
                <button
                  key={i}
                  type="button"
                  className={`toy${i === chosenIndex ? " is-chosen" : ""}`}
                  onClick={() => choose(i)}
                  disabled={building}
                >
                  <span className="toy-letter">{LETTERS[i]}</span>
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
                </button>
              ))}
            </div>
          </section>
        )}

        {vibe && !exp && (
          <div className="chute" aria-live="polite">
            <span className={`crank${building ? " turning" : ""}`} aria-hidden="true" />
            {building && chosen ? (
              <>
                <span className="chute-text">
                  <strong>
                    Making {letter}: {chosen.title}
                  </strong>
                  <span>{chosen.kind === "game" ? "Games take about 15 seconds" : "Apps take about a minute"}</span>
                </span>
                <span className={`capsule ${chosen.kind}`} aria-hidden="true">
                  <span>{chosen.emoji}</span>
                </span>
              </>
            ) : (
              <>
                <span className="chute-text">
                  <strong>Tap A, B or C to turn the crank</strong>
                </span>
                <span className="slot" aria-hidden="true" />
              </>
            )}
          </div>
        )}

        {exp && (
          <>
            <div className="toy-window">
              <div className={`toy-label ${exp.kind}`}>
                {letter && <span className="toy-letter">{letter}</span>}
                <strong>{exp.title}</strong>
                <span className={`tag ${exp.kind}`}>{exp.kind}</span>
              </div>
              <Player id={exp.id} version={exp.version} kind={exp.kind} className="flow-player" onStatus={onStatus} />
            </div>
            <p className="scene-line">{exp.tagline}</p>

            {loaded && (
              <form className="form-sheet" onSubmit={change}>
                <label htmlFor="vb-change">Change it in one line</label>
                <div className="row">
                  <input
                    id="vb-change"
                    className="field"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={exp.kind === "game" ? "add a rocket boost and make it night" : "say what to change"}
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
                <label htmlFor="vb-name">Your name on the capsule</label>
                <div className="row">
                  <input
                    id="vb-name"
                    className="field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ohm"
                    maxLength={40}
                  />
                  <button type="button" className="btn ink" onClick={share} disabled={busy}>
                    Share
                  </button>
                </div>
              </div>
            )}

            {shareUrl && (
              <section className="form-sheet" aria-live="polite">
                <div className="ticket-head">
                  <h2>Your link is ready</h2>
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
          <div className="receipt" aria-live="polite">
            <div className="receipt-title">
              <span>VibeBook slip</span>
              <span>{exp ? `No. ${exp.id.slice(0, 6)}` : "No. ——"}</span>
            </div>
            {steps.map((s, i) => (
              <div key={i} className={`rline ${s.status}`}>
                <span className="mark">{s.status === "done" ? "✓" : s.status === "fail" ? "✕" : ""}</span>
                <span>{s.text}</span>
                <span>{s.time}</span>
              </div>
            ))}
            {trace.length > 0 && (
              <div className="receipt-trace" aria-label="Behind the scenes">
                {trace.map((t, i) => (
                  <div key={i} className="rline">
                    <span className="mark">{t.ok ? "✓" : "✕"}</span>
                    <span>
                      {t.step} · {t.model}
                    </span>
                    <span>{secs(t.ms)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
