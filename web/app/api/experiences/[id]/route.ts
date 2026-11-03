import { fail, handle } from "@/lib/http";
import { getExperience, toPublic } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const exp = await getExperience(id);
    if (!exp) return fail(404, "Not found");
    return Response.json({ experience: toPublic(exp) });
  });
}
