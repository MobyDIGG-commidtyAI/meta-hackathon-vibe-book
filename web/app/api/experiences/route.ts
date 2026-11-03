// Step 2: build the card the user picked (game spec or app HTML) and save it as a private draft.
import { nanoid } from "nanoid";
import { buildFromCard, imageDataUrl } from "@/lib/build";
import { fail, handle, newEditToken, rateLimited } from "@/lib/http";
import { ENABLED_KINDS } from "@/lib/prompts";
import { keepImage, saveExperience, toPublic, type Experience, type Suggestion } from "@/lib/store";

export const maxDuration = 300; // writing an app can take a while

export async function POST(req: Request) {
  return handle(async () => {
    const limited = await rateLimited(req, "create");
    if (limited) return limited;

    const body = await req.json();
    const s = body.suggestion as Suggestion | undefined;
    if (!s || !ENABLED_KINDS.includes(s.kind) || typeof s.title !== "string" || typeof s.pitch !== "string") {
      return fail(400, "Pick one of the suggested cards.");
    }
    const suggestion: Suggestion = {
      kind: s.kind,
      emoji: String(s.emoji ?? "✦").slice(0, 16),
      title: s.title.slice(0, 40),
      pitch: s.pitch.slice(0, 140),
    };
    const scene = {
      description: String(body.scene?.description ?? "").slice(0, 300),
      mood: String(body.scene?.mood ?? "").slice(0, 40),
    };
    const caption = String(body.source?.caption ?? "").slice(0, 1500);
    const postUrl = String(body.source?.postUrl ?? "").slice(0, 500);
    const platform = String(body.source?.platform ?? "web").slice(0, 20);
    const imageId = typeof body.imageId === "string" ? body.imageId : null;
    const photo = await imageDataUrl(imageId);

    const built = await buildFromCard({ suggestion, scene, caption, postUrl, imageDataUrl: photo });

    const { token, hash } = newEditToken();
    const now = Date.now();
    const exp: Experience = {
      id: nanoid(10),
      parentId: null,
      kind: suggestion.kind,
      version: 1,
      spec: built.spec,
      html: built.html,
      title: built.title,
      tagline: built.tagline,
      imageId: photo ? imageId : null,
      source: { platform, postUrl, captionExcerpt: caption.slice(0, 280) },
      suggestion,
      creatorName: String(body.creatorName ?? "").slice(0, 40),
      editTokenHash: hash,
      published: false,
      createdAt: now,
      versions: [{ version: 1, note: "created", at: now }],
      trace: [built.trace],
    };
    if (exp.imageId) await keepImage(exp.imageId);
    await saveExperience(exp);
    return Response.json({ editToken: token, experience: toPublic(exp) });
  });
}
