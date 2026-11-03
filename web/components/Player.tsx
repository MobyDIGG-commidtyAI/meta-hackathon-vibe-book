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

  // The capsule stays shut over the iframe until it reports ready, then its halves part.
  return (
    <div className={`player ${kind}${status.state === "ready" ? "" : " sealed"} ${className ?? ""}`}>
      <iframe
        ref={ref}
        key={`${id}-${version}`}
        src={`/play/${id}?embed=1&v=${version}`}
        title="VibeBook experience"
        allow="autoplay; fullscreen"
      />
      <div className={`halves${status.state === "ready" ? " open" : ""}`} aria-hidden={status.state === "ready"}>
        <div className="half top">
          <span className="msg">{status.state === "failed" ? "This capsule got stuck" : "Opening the capsule…"}</span>
        </div>
        <div className="half bottom">
          <span className="sub">{kind === "game" ? "Game" : "App"}</span>
        </div>
      </div>
    </div>
  );
}
