// Serves the post photo stored with an experience (game background, app hero, OG card).
import { getImage } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const image = await getImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.b64, "base64"), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
