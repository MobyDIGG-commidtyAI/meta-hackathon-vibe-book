// One OpenAI-compatible client for both providers. AI_PROVIDER picks base URL, key and models.
import OpenAI from "openai";
import type { z } from "zod";

type Provider = "openrouter" | "meta";

export const provider: Provider = process.env.AI_PROVIDER === "meta" ? "meta" : "openrouter";

const prefix = provider === "meta" ? "META" : "OPENROUTER";
const env = (key: string) => process.env[`${prefix}_${key}`]?.trim() || "";

export const models = {
  chat: env("CHAT_MODEL"),
  code: env("CODE_MODEL") || env("CHAT_MODEL"),
};

let client: OpenAI | null = null;
function getClient() {
  const apiKey = env("API_KEY");
  if (!apiKey) throw new AiError(`${prefix}_API_KEY is not set in web/.env.local`);
  client ??= new OpenAI({ baseURL: env("BASE_URL"), apiKey });
  return client;
}

export class AiError extends Error {}

export type TraceStep = { step: string; model: string; ms: number; ok: boolean };

type Input = {
  system: string;
  text: string;
  imageDataUrl?: string | null;
};

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function messagesFor({ system, text, imageDataUrl }: Input): Message[] {
  return [
    { role: "system", content: system },
    {
      role: "user",
      content: imageDataUrl
        ? [
            { type: "text", text },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ]
        : text,
    },
  ];
}

async function complete(model: string, messages: Message[], extra: Record<string, unknown>) {
  const body = {
    model,
    messages,
    ...extra,
    // Without this OpenRouter may route to a provider that silently drops response_format.
    ...(provider === "openrouter" ? { provider: { require_parameters: true } } : {}),
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
  const res = await getClient().chat.completions.create(body);
  const content = res.choices[0]?.message?.content;
  if (!content) throw new AiError(`${model} returned an empty response`);
  return content;
}

// Structured output: strict json_schema, validated by zod, one repair round on failure.
export async function chatJSON<T>(
  step: string,
  input: Input,
  schema: { name: string; json: object; zod: z.ZodType<T> },
): Promise<{ data: T; trace: TraceStep }> {
  const model = models.chat;
  const started = Date.now();
  const extra = {
    max_tokens: 4000,
    response_format: { type: "json_schema", json_schema: { name: schema.name, strict: true, schema: schema.json } },
    // Picking enums and writing one-line pitches doesn't need long thinking; this roughly halves latency.
    ...(provider === "openrouter" ? { reasoning: { effort: "low" } } : {}),
  };
  const messages = messagesFor(input);
  let content = await complete(model, messages, extra);
  let parsed = parseAgainst(content, schema.zod);
  if (!parsed.ok) {
    content = await complete(
      model,
      [
        ...messages,
        { role: "assistant", content },
        { role: "user", content: `That JSON failed validation: ${parsed.error}. Return the corrected JSON only.` },
      ],
      extra,
    );
    parsed = parseAgainst(content, schema.zod);
  }
  const trace = { step, model, ms: Date.now() - started, ok: parsed.ok };
  if (!parsed.ok) throw new AiError(`${step}: model output failed validation (${parsed.error})`);
  return { data: parsed.data, trace };
}

function parseAgainst<T>(content: string, zod: z.ZodType<T>): { ok: true; data: T } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  const result = zod.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: result.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; "),
  };
}

// Code generation for the app track: returns one complete HTML document.
export async function chatHTML(step: string, input: Input): Promise<{ html: string; trace: TraceStep }> {
  const model = models.code;
  const started = Date.now();
  const content = await complete(model, messagesFor(input), { max_tokens: 16000 });
  const html = extractHTML(content);
  const trace = { step, model, ms: Date.now() - started, ok: !!html };
  if (!html) throw new AiError(`${step}: model did not return an HTML document`);
  return { html, trace };
}

function extractHTML(content: string) {
  const fenced = content.match(/```html\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : content).trim();
  const start = body.search(/<!doctype html|<html/i);
  if (start < 0) return null;
  const end = body.toLowerCase().lastIndexOf("</html>");
  return end > start ? body.slice(start, end + "</html>".length) : body.slice(start);
}
