"use client";
// Embeds /play/:id and turns its postMessages into a status: the smoke test the flow relies on.
import { useEffect, useRef, useState } from "react";

export type PlayerStatus = { state: "loading" } | { state: "ready" } | { state: "failed"; message: string };

const LOAD_TIMEOUT_MS = 12_000;

export default function Player(props: {
  id: string;
  version: number;
  kind: "game" | "app";
  className?: string;
  onStatus?: (status: PlayerStatus) => void;
}) {
  const { id, version, kind, className, onStatus } = props;
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<PlayerStatus>({ state: "loading" });
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    let settled = false;
    const settle = (next: PlayerStatus) => {
      if (settled) return;
      settled = true;
      setStatus(next);
      onStatusRef.current?.(next);
    };
    setStatus({ state: "loading" });
    function onMessage(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === "vibebook:ready") settle({ state: "ready" });
      if (e.data?.type === "vibebook:error") settle({ state: "failed", message: String(e.data.message ?? "error") });
    }
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => settle({ state: "failed", message: "did not finish loading in time" }), LOAD_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [id, version]);

  return (
    <div className={`player ${kind} ${className ?? ""}`}>
      <iframe
        ref={ref}
        key={`${id}-${version}`}
        src={`/play/${id}?embed=1&v=${version}`}
        title="VibeBook experience"
        allow="autoplay; fullscreen; clipboard-write; web-share"
      />
      <div className={`player-overlay${status.state === "ready" ? " hidden" : ""}`} aria-live="polite" role={status.state === "failed" ? "alert" : undefined}>
        {status.state === "loading" ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <span className="notice-mark">!</span>
        )}
        <strong>{status.state === "failed" ? "This experience could not load" : `Preparing your ${kind === "game" ? "game" : "app"}`}</strong>
        {status.state === "failed" && <p>{status.message}</p>}
        {status.state === "loading" && <p>Your experience will appear here in a moment.</p>}
        </div>
    </div>
  );
}
