"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import {
  DEMO_SPEC,
  DENSITIES,
  GOAL_TYPES,
  PLAYERS,
  POWERUPS,
  SPEEDS,
  TIMES_OF_DAY,
  type ExperienceSpec,
} from "@/lib/spec";

type GoalType = ExperienceSpec["goal"]["type"];

const DEFAULT_TARGETS: Record<GoalType, number> = { distance: 2000, score: 40, survive: 60 };
const QUICK_TARGETS: Record<GoalType, number> = { distance: 200, score: 10, survive: 10 };

const BACKGROUNDS = {
  photo: "/dev/sample.jpg",
  none: null,
  broken: "/dev/does-not-exist.jpg",
} as const;
type BackgroundChoice = keyof typeof BACKGROUNDS;

const POWERUP_SETS = {
  spec: DEMO_SPEC.powerups,
  all: [...POWERUPS],
  none: [],
  boost: ["boost"],
  shield: ["shield"],
  magnet: ["magnet"],
} as const satisfies Record<string, ExperienceSpec["powerups"]>;
type PowerupChoice = keyof typeof POWERUP_SETS;

const panel: CSSProperties = {
  position: "fixed",
  left: 8,
  bottom: 8,
  zIndex: 10,
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  maxWidth: "calc(100vw - 16px)",
  padding: 8,
  borderRadius: 10,
  background: "rgba(0,0,0,0.72)",
  color: "#fff",
  font: "12px/1.2 system-ui, sans-serif",
};

function Select<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ opacity: 0.7 }}>{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        style={{ font: "inherit", padding: "2px 4px" }}
      >
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DevGamePage() {
  const [timeOfDay, setTimeOfDay] = useState<ExperienceSpec["timeOfDay"]>(DEMO_SPEC.timeOfDay);
  const [speed, setSpeed] = useState<ExperienceSpec["speed"]>(DEMO_SPEC.speed);
  const [density, setDensity] = useState<ExperienceSpec["density"]>(DEMO_SPEC.density);
  const [player, setPlayer] = useState<ExperienceSpec["player"]>(DEMO_SPEC.player);
  const [goalType, setGoalType] = useState<GoalType>(DEMO_SPEC.goal.type);
  const [quick, setQuick] = useState<"normal" | "quick">("normal");
  const [powerups, setPowerups] = useState<PowerupChoice>("spec");
  const [bg, setBg] = useState<BackgroundChoice>("photo");
  const [hidden, setHidden] = useState(false);

  const spec = useMemo<ExperienceSpec>(() => {
    const target = quick === "quick" ? QUICK_TARGETS[goalType] : DEFAULT_TARGETS[goalType];
    const scoreLabel = goalType === "distance" ? "meters" : goalType === "score" ? "stars" : "seconds";
    return {
      ...DEMO_SPEC,
      timeOfDay,
      speed,
      density,
      player,
      powerups: [...POWERUP_SETS[powerups]],
      goal: { type: goalType, target },
      scoreLabel,
    };
  }, [timeOfDay, speed, density, player, goalType, quick, powerups]);

  const onReady = useCallback(() => console.log("vibebook:ready"), []);
  const onError = useCallback((e: unknown) => console.error("vibebook:error", e), []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <GameCanvas spec={spec} backgroundUrl={BACKGROUNDS[bg]} onReady={onReady} onError={onError} />
      {hidden ? (
        <button
          type="button"
          onClick={() => setHidden(false)}
          style={{ ...panel, padding: "4px 8px", cursor: "pointer" }}
        >
          options
        </button>
      ) : (
        <div style={panel}>
          <Select label="time" value={timeOfDay} options={TIMES_OF_DAY} onChange={setTimeOfDay} />
          <Select label="speed" value={speed} options={SPEEDS} onChange={setSpeed} />
          <Select label="density" value={density} options={DENSITIES} onChange={setDensity} />
          <Select label="player" value={player} options={PLAYERS} onChange={setPlayer} />
          <Select label="goal" value={goalType} options={GOAL_TYPES} onChange={setGoalType} />
          <Select label="target" value={quick} options={["normal", "quick"] as const} onChange={setQuick} />
          <Select
            label="powerups"
            value={powerups}
            options={Object.keys(POWERUP_SETS) as PowerupChoice[]}
            onChange={setPowerups}
          />
          <Select
            label="background"
            value={bg}
            options={Object.keys(BACKGROUNDS) as BackgroundChoice[]}
            onChange={setBg}
          />
          <button type="button" onClick={() => setHidden(true)} style={{ alignSelf: "flex-end", cursor: "pointer" }}>
            hide
          </button>
        </div>
      )}
    </div>
  );
}
