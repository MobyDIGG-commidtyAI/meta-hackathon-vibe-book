"use client";
// Dev page for the game genres: /dev/genres?g=catch|puzzle|memory|runner&photo=0 to test without a photo.
import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { DEMO_CATCH, DEMO_MEMORY, DEMO_PUZZLE, DEMO_SPEC, GENRES, type GameSpec, type Genre } from "@/lib/spec";

const DEMOS: Record<Genre, GameSpec> = { runner: DEMO_SPEC, catch: DEMO_CATCH, puzzle: DEMO_PUZZLE, memory: DEMO_MEMORY };

export default function GenresDevPage() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [photo, setPhoto] = useState(true);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const g = q.get("g") as Genre;
    setGenre(GENRES.includes(g) ? g : "catch");
    setPhoto(q.get("photo") !== "0");
  }, []);

  const onReady = useCallback(() => setStatus("ready"), []);
  const onError = useCallback((e: unknown) => setStatus(`error: ${String(e)}`), []);

  if (!genre) return null;
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <GameCanvas spec={DEMOS[genre]} backgroundUrl={photo ? "/landing/everest.jpg" : null} onReady={onReady} onError={onError} />
      <div
        data-status={status}
        style={{ position: "fixed", left: 8, bottom: 8, zIndex: 20, padding: "4px 8px", borderRadius: 8, background: "#000", color: "#fff", font: "12px system-ui" }}
      >
        {genre} · {status}
      </div>
    </div>
  );
}
