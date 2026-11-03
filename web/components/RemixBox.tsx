"use client";
// Remix on a shared page: refill the machine with one sentence, get a new link that credits the original.
import { useState } from "react";
import { Spark } from "./Icons";

export default function RemixBox({ id, kind }: { id: string; kind: "game" | "app" }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remix(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/experiences/${id}/remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, creatorName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remix failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn light big" onClick={() => setOpen(true)}>
        <Spark /> Remix it
      </button>
    );
  }

  return (
    <form className="form-sheet" onSubmit={remix}>
      <h2>Put your spin on it</h2>
      <label htmlFor="vb-remix">What should change?</label>
      <input
        id="vb-remix"
        className="field"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={kind === "game" ? "neon night run, insane speed" : "say what to change"}
        disabled={busy}
        autoFocus
      />
      <label htmlFor="vb-remix-name">Your name on the capsule</label>
      <input
        id="vb-remix-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Bird"
        maxLength={40}
        disabled={busy}
      />
      <button className="btn wide" disabled={busy || !instruction.trim()}>
        {busy ? "Making your remix…" : "Make my remix"}
      </button>
      {error && (
        <p className="note" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
