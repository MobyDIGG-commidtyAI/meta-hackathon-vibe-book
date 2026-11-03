// Shared bits for route handlers: errors, edit tokens, rate limits.
import { createHash, randomBytes } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { AiError } from "./ai";
import { redisClient, type Experience } from "./store";

export function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

// Turns thrown errors into JSON so the UI can show what went wrong.
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    if (err instanceof AiError) return fail(502, err.message);
    const message = err instanceof Error ? err.message : String(err);
    return fail(500, message);
  }
}

export function newEditToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canEdit(exp: Experience, req: Request) {
  const token = req.headers.get("x-edit-token");
  return !!token && hashToken(token) === exp.editTokenHash;
}

// Per-IP limit on the routes that call the model. No limit in local dev (no Redis).
const ratelimit = redisClient
  ? new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(30, "10 m"), prefix: "rl" })
  : null;

export async function rateLimited(req: Request, bucket: string) {
  if (!ratelimit) return null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = await ratelimit.limit(`${bucket}:${ip}`);
  return success ? null : fail(429, "Too many requests — try again in a few minutes.");
}

export function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], b64: match[2] };
}

export function appUrl(req: Request) {
  return process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}
