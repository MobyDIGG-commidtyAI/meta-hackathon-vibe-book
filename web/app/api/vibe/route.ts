// Step 1: read the post (photo + caption) and suggest three things to create from it.
import { nanoid } from "nanoid";
import { chatJSON } from "@/lib/ai";
import { fail, handle, parseDataUrl, rateLimited } from "@/lib/http";
import { postBlock, vibeJsonSchema, VibeSchema, vibeSystem } from "@/lib/prompts";
import { saveImage } from "@/lib/store";
import { learningGuidance, normalizeLearningLevel } from "@/lib/learning";

export const maxDuration = 60;

const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB of JPEG; the panel sends ~150 KB

export async function POST(req: Request) {
  return handle(async () => {
    const limited = await rateLimited(req, "vibe");
    if (limited) return limited;

    const body = await req.json();
    const caption = typeof body.caption === "string" ? body.caption.slice(0, 1500) : "";
    const learningLevel = normalizeLearningLevel(body.learningLevel);
    const postUrl = typeof body.postUrl === "string" ? body.postUrl.slice(0, 500) : "";
    const imageDataUrl = typeof body.image === "string" && body.image.length < MAX_IMAGE_CHARS ? body.image : null;
    const image = imageDataUrl ? parseDataUrl(imageDataUrl) : null;
    if (!image && !caption) return fail(400, "Send a photo or a caption.");

    const { data, trace } = await chatJSON(
      "suggest",
      { system: vibeSystem(!!image, learningGuidance(learningLevel)), text: postBlock(caption, postUrl), imageDataUrl: image ? imageDataUrl : null },
      { name: "vibe_suggestions", json: vibeJsonSchema, zod: VibeSchema },
    );

    let imageId: string | null = null;
    if (image) {
      imageId = nanoid(10);
      await saveImage(imageId, image, 60 * 60);
    }
    return Response.json({ imageId, scene: data.scene, suggestions: data.suggestions, trace: [trace] });
  });
}
