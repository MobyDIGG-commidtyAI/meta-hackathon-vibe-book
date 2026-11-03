"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { ExperienceSpec } from "@/lib/spec";

export interface GameCanvasProps {
  spec: ExperienceSpec;
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
 * Mounts the Phaser runner into a div that fills its parent. The game is rebuilt when the spec's
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
    const currentSpec = JSON.parse(specKey) as ExperienceSpec;

    import("@/game/runner")
      .then(({ mountGame }) => {
        if (cancelled) return;
        destroy = mountGame(host, {
          spec: currentSpec,
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
