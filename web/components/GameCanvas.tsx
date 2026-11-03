"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { genreOf, type GameSpec, type Genre } from "@/lib/spec";

// Every genre module exports the same mountGame(parent, { spec, backgroundUrl, onReady, onError }) → destroy.
type Mount = (
  parent: HTMLElement,
  opts: { spec: never; backgroundUrl: string | null; onReady: () => void; onError?: (e: unknown) => void },
) => () => void;

const GENRES: Record<Genre, () => Promise<{ mountGame: Mount }>> = {
  runner: () => import("@/game/runner") as Promise<{ mountGame: Mount }>,
  catch: () => import("@/game/catch") as Promise<{ mountGame: Mount }>,
  puzzle: () => import("@/game/puzzle") as Promise<{ mountGame: Mount }>,
  memory: () => import("@/game/memory") as Promise<{ mountGame: Mount }>,
};

export interface GameCanvasProps {
  spec: GameSpec;
  backgroundUrl: string | null;
  /** Fires once per mounted game, after its first frame has rendered. */
  onReady?: () => void;
  /** Fires at most once per mounted game if it fails to load or boot. */
  onError?: (e: unknown) => void;
  className?: string;
  style?: CSSProperties;
}

const fill: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  touchAction: "none",
};

/**
 * Mounts the spec's genre (the Phaser runner by default) into a div that fills its parent. The game is rebuilt when the spec's
 * contents or the background URL change (not when the parent passes a new-but-equal object).
 */
export function GameCanvas({ spec, backgroundUrl, onReady, onError, className, style }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  const specKey = JSON.stringify(spec);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    const currentSpec = JSON.parse(specKey) as GameSpec;

    GENRES[genreOf(currentSpec)]()
      .then(({ mountGame }) => {
        if (cancelled) return;
        destroy = mountGame(host, {
          spec: currentSpec as never,
          backgroundUrl,
          onReady: () => {
            if (!cancelled) onReadyRef.current?.();
          },
          onError: (e) => {
            if (!cancelled) onErrorRef.current?.(e);
          },
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) onErrorRef.current?.(e);
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [specKey, backgroundUrl]);

  return <div ref={hostRef} className={className} style={style ? { ...fill, ...style } : fill} />;
}

export default GameCanvas;
