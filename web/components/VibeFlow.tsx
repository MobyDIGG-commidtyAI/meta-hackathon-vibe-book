"use client";
// The whole create flow, shared by the extension panel (/panel) and the no-install page (/app):
// read post → 3 cards → build → smoke test (+1 auto-repair for apps) → change → share.
import { useCallback, useEffect, useRef, useState } from "react";
import Player, { type PlayerStatus } from "./Player";
import type { TraceStep } from "@/lib/ai";
import type { PublicExperience, Suggestion } from "@/lib/store";

export type Post = { image: string | null; caption: string; postUrl: string; platform: string };

type Step = { text: string; status: "busy" | "done" | "fail" };
type Vibe = { imageId: string | null; scene: { description: string; mood: string }; suggestions: Suggestion[] };

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
  const [building, setBuilding] = useState<Suggestion | null>(null);
  const [exp, setExp] = useState<PublicExperience | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [unsupported, setUnsupported] = useState("");
  const [instruction, setInstruction] = useState("");
  const [name, setName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const repaired = useRef(false);
  const started = useRef(false);

  const push = (text: string) => setSteps((s) => [...s, { text, status: "busy" }]);
  const settle = (status: Step["status"], text?: string) =>
    setSteps((s) => s.map((step, i) => (i === s.length - 1 ? { text: text ?? step.text, status } : step)));

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
      settle("done", `Read the post · ${secs(data.trace[0]?.ms ?? 0)}`);
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

  async function choose(card: Suggestion) {
    if (!vibe) return;
    setError(null);
    setBuilding(card);
    setExp(null);
    setLoaded(false);
    setShareUrl(null);
    setChanges([]);
    setUnsupported("");
    repaired.current = false;
    push(card.kind === "game" ? `Designing ${card.title}…` : `Writing ${card.title}… (can take a minute)`);
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
      settle("done", `${card.kind === "game" ? "Spec valid" : "App written"} · ${secs(built?.ms ?? 0)}`);
      push(card.kind === "game" ? "Loading the game…" : "Loading the app…");
    } catch (e) {
      settle("fail", `Couldn't build it: ${errorText(e)}`);
      setError({ message: errorText(e), retry: () => choose(card) });
    } finally {
      setBuilding(null);
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
          setError({ message: "Try another card.", retry: backToCards });
        }
        return;
      }
      settle("fail", `Didn't load: ${status.message}`);
      setError({ message: "Try another card.", retry: backToCards });
    },
    [exp, token],
  );

  function backToCards() {
    setExp(null);
    setError(null);
    setShareUrl(null);
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
      settle("done", `Changed · ${secs(data.experience.trace.at(-1)?.ms ?? 0)}`);
      push(exp.kind === "game" ? "Reloading the game…" : "Reloading the app…");
      setLoaded(false);
      repaired.current = false;
      setExp(data.experience);
      setTrace((t) => [...t, ...data.experience.trace.slice(-1)]);
      setChanges(data.changeSummary);
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
    <div className="flow">
      <header className="flow-head">
        <span className="brand">✦ VibeBook</span>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </header>

      <div className="flow-body">
        <ul className="steps">
          {steps.map((s, i) => (
            <li key={i} className={s.status}>
              {s.text}
            </li>
          ))}
        </ul>

        {error && (
          <div className="notice bad row">
            <span style={{ flex: 1 }}>{error.message}</span>
            <button type="button" className="btn ghost" onClick={error.retry}>
              Try again
            </button>
          </div>
        )}

        {vibe && !exp && !building && (
          <>
            <p className="scene">{vibe.scene.description} What do you want to make?</p>
            <div className="cards">
              {vibe.suggestions.map((card, i) => (
                <button key={i} type="button" className="card" onClick={() => choose(card)}>
                  <span className="card-emoji">{card.emoji}</span>
                  <span>
                    <span className="card-title">{card.title}</span>
                    <span className="kind">{card.kind}</span>
                    <div className="card-pitch">{card.pitch}</div>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {exp && (
          <>
            <Player id={exp.id} version={exp.version} onStatus={onStatus} />
            <div>
              <strong>{exp.title}</strong>
              <div className="muted small">{exp.tagline}</div>
            </div>
            {changes.length > 0 && (
              <div className="chips">
                {changes.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {unsupported && <div className="notice">{unsupported}</div>}

            {loaded && (
              <form className="row" onSubmit={change}>
                <input
                  className="field"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={exp.kind === "game" ? "add a rocket boost and make it night" : "say what to change"}
                  disabled={busy}
                />
                <button className="btn" disabled={busy || !instruction.trim()}>
                  Change
                </button>
              </form>
            )}

            {loaded && !shareUrl && (
              <div className="row">
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name for the credit"
                  maxLength={40}
                />
                <button type="button" className="btn" onClick={share} disabled={busy}>
                  Share
                </button>
              </div>
            )}

            {shareUrl && (
              <div className="share-box">
                <strong>Your link is ready</strong>
                <a className="link" href={shareUrl} target="_blank" rel="noopener">
                  {shareUrl}
                </a>
                <div className="row">
                  <button type="button" className="btn" onClick={copy}>
                    {copied ? "Copied ✓" : "Copy link"}
                  </button>
                  <a className="btn ghost" href={shareUrl} target="_blank" rel="noopener">
                    Open
                  </a>
                </div>
                <span className="muted small">Paste it in a Facebook post — friends can play it and remix it.</span>
              </div>
            )}

            <button type="button" className="btn ghost" onClick={backToCards} disabled={busy}>
              ← Other ideas
            </button>
          </>
        )}

        {trace.length > 0 && (
          <details className="trace" open>
            <summary>Behind the scenes</summary>
            <ul>
              {trace.map((t, i) => (
                <li key={i}>
                  {t.ok ? "✓" : "✕"} {t.step} · {t.model} · {secs(t.ms)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
