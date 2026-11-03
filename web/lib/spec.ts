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

// ── More genres ─────────────────────────────────────────────────────────────
// Each genre has its own small spec and renderer in web/game/. The runner above stays the default:
// a stored spec with no `genre` is a runner spec.

export const GENRES = ["runner", "catch", "puzzle", "memory"] as const;
export type Genre = (typeof GENRES)[number];

// Things that fall (catch) or sit on cards (memory). Single code points only, so they render everywhere.
export const ITEMS = [
  "🌸", "🌻", "🌼", "🍁", "🍂", "🌿", "🍀", "🌵", "🌴", "🌲", "🍄", "🌙", "⭐", "❄️", "💧", "🌊", "🔥", "🌈",
  "🍎", "🍊", "🍋", "🍓", "🍑", "🍒", "🥭", "🍍", "🥥", "🍉", "🍔", "🍕", "🍣", "🍜", "🍩", "🍪", "🧁", "🍦",
  "☕", "🥐", "🍤", "🎈", "🎁", "💎", "🪙", "👑", "🎵", "📷", "🧭", "⛺", "🚗", "🚲", "⛵", "✈️", "🎟️", "🏆",
  "⚽", "🏀", "🎾", "🎸", "💡", "🔑", "🧸", "🐟", "🐠", "🦋", "🐝", "🐞", "🐦", "🐱", "🐶", "🪨", "🧊", "💣",
] as const;
export const CATCHERS = ["🧺", "🪣", "🥅", "🧤", "🛒", "☂️", "🎒", "🍽️", "🛶"] as const;
export const CATCH_GOALS = ["score", "survive"] as const;
export const PUZZLE_GRIDS = [3, 4] as const;
export const PUZZLE_MODES = ["swap", "slide"] as const;

const titleTagline = {
  title: z.string().min(1).max(40),
  tagline: z.string().min(1).max(90),
};

/** Catch: a catcher at the bottom collects falling good items and dodges the bad ones. */
export const CatchSpecSchema = z.object({
  genre: z.literal("catch"),
  ...titleTagline,
  catcher: z.enum(CATCHERS),
  good: z.array(z.enum(ITEMS)).min(1).max(3),
  bad: z.array(z.enum(ITEMS)).max(2),
  timeOfDay: z.enum(TIMES_OF_DAY),
  speed: z.enum(SPEEDS),
  goal: z.object({ type: z.enum(CATCH_GOALS), target: z.number().int().min(10).max(300) }),
  scoreLabel: z.string().min(1).max(16),
}).refine((s) => s.goal.type !== "survive" || s.bad.length > 0, {
  message: "a survive goal needs at least one bad item to dodge",
  path: ["bad"],
});

/** Puzzle: the post photo cut into a grid; put it back together by swapping or sliding tiles. */
export const PuzzleSpecSchema = z.object({
  genre: z.literal("puzzle"),
  ...titleTagline,
  grid: z.union([z.literal(3), z.literal(4)]),
  mode: z.enum(PUZZLE_MODES),
  winLine: z.string().min(1).max(90),
});

/** Memory: flip cards to find pairs; card backs show the post photo, faces show the post's world. */
export const MemorySpecSchema = z.object({
  genre: z.literal("memory"),
  ...titleTagline,
  pairs: z
    .array(z.enum(ITEMS))
    .min(6)
    .max(8)
    .refine((p) => new Set(p).size === p.length, "pairs must be different emoji"),
  winLine: z.string().min(1).max(90),
});

export type CatchSpec = z.infer<typeof CatchSpecSchema>;
export type PuzzleSpec = z.infer<typeof PuzzleSpecSchema>;
export type MemorySpec = z.infer<typeof MemorySpecSchema>;
export type RunnerSpec = ExperienceSpec & { genre?: "runner" };
export type GameSpec = RunnerSpec | CatchSpec | PuzzleSpec | MemorySpec;

/** Card and label text for a game's genre; apps are just "app". */
export function kindLabel(kind: "game" | "app", genre?: Genre | "none") {
  if (kind === "app") return "app";
  return `game · ${genre && genre !== "none" ? (genre === "runner" ? "run" : genre) : "run"}`;
}

/** What a one-line change could ask for, per genre. */
export const CHANGE_EXAMPLES: Record<Genre, string> = {
  runner: "add a rocket boost and make it night",
  catch: "faster, with something to dodge",
  puzzle: "make it a 4×4 sliding puzzle",
  memory: "use 8 pairs and street food",
};

export function genreOf(spec: GameSpec): Genre {
  return "genre" in spec && spec.genre ? spec.genre : "runner";
}

const jsonTitleTagline = {
  title: { type: "string", description: "2-4 words, max 40 characters" },
  tagline: { type: "string", description: "one line, max 90 characters" },
} as const;

export const catchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["genre", "title", "tagline", "catcher", "good", "bad", "timeOfDay", "speed", "goal", "scoreLabel"],
  properties: {
    genre: { type: "string", enum: ["catch"] },
    ...jsonTitleTagline,
    catcher: { type: "string", enum: [...CATCHERS] },
    good: { type: "array", items: { type: "string", enum: [...ITEMS] }, description: "1 to 3 items worth catching" },
    bad: { type: "array", items: { type: "string", enum: [...ITEMS] }, description: "0 to 2 items to dodge" },
    timeOfDay: { type: "string", enum: [...TIMES_OF_DAY] },
    speed: { type: "string", enum: [...SPEEDS] },
    goal: {
      type: "object",
      additionalProperties: false,
      required: ["type", "target"],
      properties: {
        type: { type: "string", enum: [...CATCH_GOALS] },
        target: { type: "integer", description: "points for score (15-60), seconds for survive (30-90)" },
      },
    },
    scoreLabel: { type: "string", description: "what the caught items are called, max 16 characters" },
  },
} as const;

export const puzzleJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["genre", "title", "tagline", "grid", "mode", "winLine"],
  properties: {
    genre: { type: "string", enum: ["puzzle"] },
    ...jsonTitleTagline,
    grid: { type: "integer", enum: [...PUZZLE_GRIDS], description: "3 = quick, 4 = harder" },
    mode: { type: "string", enum: [...PUZZLE_MODES], description: "swap = tap two tiles to swap; slide = classic sliding puzzle" },
    winLine: { type: "string", description: "shown when the photo is complete, max 90 characters" },
  },
} as const;

export const memoryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["genre", "title", "tagline", "pairs", "winLine"],
  properties: {
    genre: { type: "string", enum: ["memory"] },
    ...jsonTitleTagline,
    pairs: { type: "array", items: { type: "string", enum: [...ITEMS] }, description: "6 to 8 different emoji" },
    winLine: { type: "string", description: "shown when every pair is found, max 90 characters" },
  },
} as const;

export const DEMO_CATCH: CatchSpec = {
  genre: "catch",
  title: "Bua Tong Bloom Catch",
  tagline: "Catch falling sunflowers along the ridge road and dodge the stones",
  catcher: "🧺",
  good: ["🌻", "🌼"],
  bad: ["🪨"],
  timeOfDay: "sunset",
  speed: "normal",
  goal: { type: "score", target: 25 },
  scoreLabel: "blooms",
};

export const DEMO_PUZZLE: PuzzleSpec = {
  genre: "puzzle",
  title: "Summit Sunrise Puzzle",
  tagline: "Put the Everest sunrise back together, tile by tile",
  grid: 3,
  mode: "swap",
  winLine: "The summit is whole again",
};

export const DEMO_MEMORY: MemorySpec = {
  genre: "memory",
  title: "Campsite Pairs",
  tagline: "Flip the cards and match everything you'd pack for a riverside night",
  pairs: ["⛺", "🔥", "🎸", "☕", "🧭", "🌙"],
  winLine: "Camp is packed, every pair found",
};
