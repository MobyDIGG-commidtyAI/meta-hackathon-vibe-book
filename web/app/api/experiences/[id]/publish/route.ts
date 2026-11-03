// Share: make the draft public at /p/:id.
import { appUrl, canEdit, fail, handle } from "@/lib/http";
import { getExperience, saveExperience } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const exp = await getExperience(id);
    if (!exp) return fail(404, "Not found");
    if (!canEdit(exp, req)) return fail(403, "Only the creator can share this.");

    const body = await req.json().catch(() => ({}));
    if (typeof body.creatorName === "string" && body.creatorName.trim()) {
      exp.creatorName = body.creatorName.trim().slice(0, 40);
    }
    exp.published = true;
    await saveExperience(exp);
    return Response.json({ url: `${appUrl(req)}/p/${exp.id}` });
  });
}
