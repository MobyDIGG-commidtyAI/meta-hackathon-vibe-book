// Upstash Redis when KV_* env is set (Vercel), otherwise JSON files under .data/ for local dev.
import { Redis } from "@upstash/redis";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameSpec, Genre } from "./spec";
import type { TraceStep } from "./ai";
import type { LearningLevel } from "./learning";

export type Kind = "game" | "app";

// genre: which game template a game card uses ("none" for apps; missing on older records means runner).
export type Suggestion = { kind: Kind; genre?: Genre | "none"; emoji: string; title: string; pitch: string };

export type Experience = {
  id: string;
  parentId: string | null;
  kind: Kind;
  version: number;
  spec: GameSpec | null;
  html: string | null;
  title: string;
  tagline: string;
  imageId: string | null;
  source: { platform: string; postUrl: string; captionExcerpt: string };
  suggestion: Suggestion;
  learningLevel?: LearningLevel;
  creatorName: string;
  editTokenHash: string;
  published: boolean;
  createdAt: number;
  versions: { version: number; note: string; at: number }[];
  trace: TraceStep[];
};

export type PublicExperience = Omit<Experience, "editTokenHash">;

export type StoredImage = { mime: string; b64: string };

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const DATA_DIR = path.join(process.cwd(), ".data");

async function get<T>(key: string): Promise<T | null> {
  if (redis) return redis.get<T>(key);
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, `${key.replace(":", "_")}.json`), "utf8"));
  } catch {
    return null;
  }
}

async function set(key: string, value: unknown, ttlSeconds?: number) {
  if (!redis && process.env.VERCEL) {
    throw new Error("No database: connect Upstash Redis in Vercel → Storage so KV_REST_API_URL/TOKEN are set.");
  }
  if (redis) {
    if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, `${key.replace(":", "_")}.json`), JSON.stringify(value));
}

export const getExperience = (id: string) => get<Experience>(`exp:${id}`);
export const saveExperience = (exp: Experience) => set(`exp:${exp.id}`, exp);

export function toPublic({ editTokenHash: _, ...rest }: Experience): PublicExperience {
  return rest;
}

export const getImage = (id: string) => get<StoredImage>(`img:${id}`);

// Photos from /api/vibe expire after an hour unless the user goes on to create something.
export const saveImage = (id: string, image: StoredImage, ttlSeconds?: number) => set(`img:${id}`, image, ttlSeconds);

export async function keepImage(id: string) {
  if (redis) await redis.persist(`img:${id}`);
}

export const redisClient = redis;
