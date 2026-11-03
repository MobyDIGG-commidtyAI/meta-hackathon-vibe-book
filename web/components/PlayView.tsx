"use client";
// Full-screen game or app for /play/:id. Reports ready/error to whoever embeds the page.
import { useCallback } from "react";
import AppFrame from "./AppFrame";
import GameCanvas from "./GameCanvas";
import type { GameSpec } from "@/lib/spec";

function notify(message: { type: string; message?: string }) {
  if (window.parent !== window) window.parent.postMessage(message, "*");
}

export default function PlayView(props: {
  kind: "game" | "app";
  spec: GameSpec | null;
  html: string | null;
  photoPath: string | null;
}) {
  const onReady = useCallback(() => notify({ type: "vibebook:ready" }), []);
  const onError = useCallback((e: unknown) => notify({ type: "vibebook:error", message: String(e) }), []);

  return (
    <div className="play-full">
      {props.kind === "game" && props.spec ? (
        <GameCanvas spec={props.spec} backgroundUrl={props.photoPath} onReady={onReady} onError={onError} />
      ) : (
        <AppFrame html={props.html ?? ""} photoPath={props.photoPath} onReady={onReady} onError={onError} />
      )}
    </div>
  );
}
