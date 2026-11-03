// App track self-repair: the browser reports the load error, the model fixes it once.
import { repairApp } from "@/lib/build";
import { canEdit, fail, handle } from "@/lib/http";
import { getExperience, saveExperience, toPublic } from "@/lib/store";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const exp = await getExperience(id);
    if (!exp) return fail(404, "Not found");
    if (!canEdit(exp, req)) return fail(403, "Only the creator can repair this.");
    if (exp.kind !== "app") return fail(400, "Only apps are repaired.");

    const { error } = await req.json();
    const { html, trace } = await repairApp(exp, String(error ?? "did not finish loading"));
    exp.html = html;
    exp.version += 1;
    exp.versions.push({ version: exp.version, note: "auto-repair", at: Date.now() });
    exp.trace.push(trace);
    await saveExperience(exp);
    return Response.json({ experience: toPublic(exp) });
  });
}
