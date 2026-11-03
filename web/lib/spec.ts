// ExperienceSpec v0.2: everything the game template reads. Every field is an enum the template
// actually supports, so the model can't ask for something the game can't do.
import { z } from "zod";

export const PLAYERS = ["🏂", "⛷️", "🛷", "🏄", "🛹", "🚵", "🚤", "🏃"] as const;
export const OBSTACLES = [
  "🪨", "🌲", "🚩", "⛄", "🧊", "🐧", "🌵", "🪵", "🚧", "🐻",
  "🦀", "🌊", "⛵", "🛢️", "🐄", "🏠", "🚗", "🦈", "🔥", "🌪️",
] as const;
export const COLLECTIBLES = ["⭐", "💎", "🪙", "❄️", "🍀"] as const;
export const TIMES_OF_DAY = ["day", "sunset", "night", "neon"] as const;
export const SPEEDS = ["chill", "normal", "fast", "insane"] as const;
export const DENSITIES = ["low", "medium", "high"] as const;
export const POWERUPS = ["boost", "shield", "magnet"] as const;
export const GOAL_TYPES = ["distance", "score", "survive"] as const;

export const SpecSchema = z.object({
  title: z.string().min(1).max(40),
  tagline: z.string().min(1).max(90),
  player: z.enum(PLAYERS),
  obstacles: z.array(z.enum(OBSTACLES)).min(1).max(3),
  collectible: z.enum(COLLECTIBLES),
  timeOfDay: z.enum(TIMES_OF_DAY),
  speed: z.enum(SPEEDS),
  density: z.enum(DENSITIES),
  powerups: z.array(z.enum(POWERUPS)).max(3),
  goal: z.object({
    type: z.enum(GOAL_TYPES),
    target: z.number().int().min(10).max(100000),
  }),
  scoreLabel: z.string().min(1).max(16),
});

export type ExperienceSpec = z.infer<typeof SpecSchema>;

// Strict JSON Schema for response_format. Meta's strict mode rejects oneOf and min/max keywords,
// so ranges live in the zod schema above and are checked after the call.
export const specJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title", "tagline", "player", "obstacles", "collectible", "timeOfDay",
    "speed", "density", "powerups", "goal", "scoreLabel",
  ],
  properties: {
    title: { type: "string", description: "2-4 words, max 40 characters" },
    tagline: { type: "string", description: "one line, max 90 characters" },
    player: { type: "string", enum: [...PLAYERS] },
    obstacles: { type: "array", items: { type: "string", enum: [...OBSTACLES] }, description: "1 to 3 items" },
    collectible: { type: "string", enum: [...COLLECTIBLES] },
    timeOfDay: { type: "string", enum: [...TIMES_OF_DAY] },
    speed: { type: "string", enum: [...SPEEDS] },
    density: { type: "string", enum: [...DENSITIES] },
    powerups: { type: "array", items: { type: "string", enum: [...POWERUPS] }, description: "0 to 3 items" },
    goal: {
      type: "object",
      additionalProperties: false,
      required: ["type", "target"],
      properties: {
        type: { type: "string", enum: [...GOAL_TYPES] },
        target: { type: "integer", description: "meters for distance, points for score, seconds for survive" },
      },
    },
    scoreLabel: { type: "string", description: "unit shown next to the score, max 16 characters" },
  },
} as const;

export const DEMO_SPEC: ExperienceSpec = {
  title: "Everest Rush",
  tagline: "Outrun the sunrise down the roof of the world",
  player: "🏂",
  obstacles: ["🪨", "🌲", "🚩"],
  collectible: "⭐",
  timeOfDay: "sunset",
  speed: "fast",
  density: "medium",
  powerups: ["boost"],
  goal: { type: "distance", target: 2000 },
  scoreLabel: "meters",
};
