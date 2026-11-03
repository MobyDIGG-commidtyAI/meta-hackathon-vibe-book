// Personalize: natural-language change → new version (owner only).
import { applyChange } from "@/lib/build";
import { canEdit, fail, handle, rateLimited } from "@/lib/http";
import { getExperience, saveExperience, toPublic } from "@/lib/store";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const limited = await rateLimited(req, "edit");
    if (limited) return limited;
    const { id } = await ctx.params;
    const exp = await getExperience(id);
    if (!exp) return fail(404, "Not found");
    if (!canEdit(exp, req)) return fail(403, "Only the creator can edit this. Remix it instead.");

    const { instruction } = await req.json();
    if (typeof instruction !== "string" || !instruction.trim()) return fail(400, "Say what to change.");

    const change = await applyChange(exp, instruction.trim());
    exp.spec = change.spec;
    exp.html = change.html;
    exp.title = change.title;
    exp.tagline = change.tagline;
    exp.version += 1;
    exp.versions.push({ version: exp.version, note: change.changeSummary.join(" · ") || instruction.slice(0, 80), at: Date.now() });
    exp.trace.push(change.trace);
    await saveExperience(exp);
    return Response.json({
      experience: toPublic(exp),
      changeSummary: change.changeSummary,
      unsupported: change.unsupported,
    });
  });
}
