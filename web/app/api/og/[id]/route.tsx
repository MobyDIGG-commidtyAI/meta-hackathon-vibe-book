// Link-preview card for /p/:id: the post photo, the title and a play button.
import { ImageResponse } from "next/og";
import { imageDataUrl } from "@/lib/build";
import { getExperience } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const exp = await getExperience(id);
  if (!exp || !exp.published) return new Response("Not found", { status: 404 });
  const photo = await imageDataUrl(exp.imageId);
  const action = exp.kind === "game" ? "▶ Play" : "▶ Open";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #1b1030, #0d0b14)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 64,
            background: "linear-gradient(180deg, rgba(13,11,20,0) 30%, rgba(13,11,20,0.92) 100%)",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85, marginBottom: 12, letterSpacing: 2 }}>VIBEBOOK</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{exp.title}</div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.85, marginTop: 12, maxWidth: 1000 }}>{exp.tagline}</div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              alignSelf: "flex-start",
              padding: "14px 32px",
              borderRadius: 999,
              background: "#8b5cff",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {action} {exp.title}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
