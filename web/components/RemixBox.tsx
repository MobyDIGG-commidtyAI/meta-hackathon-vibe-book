"use client";
// ✦ Remix on a shared page: fork it with one sentence, get a new link that credits the original.
import { useState } from "react";

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
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        ✦ Remix
      </button>
    );
  }

  return (
    <form className="share-box" onSubmit={remix}>
      <strong>Remix it your way</strong>
      <input
        className="field"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={kind === "game" ? "neon night run, insane speed" : "say what to change"}
        disabled={busy}
        autoFocus
      />
      <input
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name for the credit"
        maxLength={40}
        disabled={busy}
      />
      <button className="btn" disabled={busy || !instruction.trim()}>
        {busy ? "Remixing…" : "Create my remix"}
      </button>
      {error && <span className="notice bad">{error}</span>}
    </form>
  );
}
