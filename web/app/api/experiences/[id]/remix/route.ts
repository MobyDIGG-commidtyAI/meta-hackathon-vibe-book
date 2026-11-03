// Remix: anyone with the link forks a published experience into a new one that credits the original.
import { nanoid } from "nanoid";
import { applyChange } from "@/lib/build";
import { appUrl, fail, handle, newEditToken, rateLimited } from "@/lib/http";
import { getExperience, saveExperience, type Experience } from "@/lib/store";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const limited = await rateLimited(req, "remix");
    if (limited) return limited;
    const { id } = await ctx.params;
    const parent = await getExperience(id);
    if (!parent || !parent.published) return fail(404, "Not found");

    const body = await req.json();
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    if (!instruction) return fail(400, "Say how to remix it.");

    const change = await applyChange(parent, instruction);
    const { token, hash } = newEditToken();
    const now = Date.now();
    const child: Experience = {
      ...parent,
      id: nanoid(10),
      parentId: parent.id,
      version: 1,
      spec: change.spec,
      html: change.html,
      title: change.title,
      tagline: change.tagline,
      creatorName: String(body.creatorName ?? "").trim().slice(0, 40),
      editTokenHash: hash,
      published: true,
      createdAt: now,
      versions: [{ version: 1, note: `remix: ${change.changeSummary.join(" · ") || instruction.slice(0, 60)}`, at: now }],
      trace: [change.trace],
    };
    await saveExperience(child);
    return Response.json({
      id: child.id,
      url: `${appUrl(req)}/p/${child.id}`,
      editToken: token,
      changeSummary: change.changeSummary,
      unsupported: change.unsupported,
    });
  });
}
