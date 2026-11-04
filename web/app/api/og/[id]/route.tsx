// Link-preview card for /p/:id with the same clean blue-violet style as the app.
import { ImageResponse } from "next/og";
import { imageDataUrl } from "@/lib/build";
import { getExperience } from "@/lib/store";
import { learningShortLabel } from "@/lib/learning";

// Satori needs TTF/OTF data, so pull Inter and subset it to the card's text.
// Falls back to the default face if the font host can't be reached.
async function googleFont(family: string, weight: number, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`no font file for ${family}`);
  return (await fetch(url)).arrayBuffer();
}

async function ogFonts(text: string) {
  try {
    const inter = await googleFont("Inter", 600, text);
    return [{ name: "Inter", data: inter, weight: 600 as const, style: "normal" as const }];
  } catch {
    return undefined;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const exp = await getExperience(id);
  if (!exp || !exp.published) return new Response("Not found", { status: 404 });
  const photo = await imageDataUrl(exp.imageId);
  const action = exp.kind === "game" ? "Play" : "Open";
  const learningLevel = learningShortLabel(exp.learningLevel ?? "general");
  const fonts = await ogFonts(`VibeBook${exp.title}${exp.tagline}${learningLevel}${action}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 72px",
          background: "linear-gradient(135deg, #f3f7ff 0%, #f6f3ff 100%)",
          color: "#1b2440",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            width: 400,
            height: 470,
            borderRadius: 24,
            overflow: "hidden",
            background: "#e9edfa",
            border: "1px solid #e1e6f2",
            boxShadow: "0 20px 48px rgba(46,58,103,0.14)",
          }}
        >
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={400} height={470} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 800, marginBottom: 22 }}>
            <div style={{ display: "flex", width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #3675ee 0%, #7452e8 100%)", boxShadow: "0 5px 14px rgba(83,88,206,0.2)" }}>
              <svg width="19" height="19" viewBox="0 0 24 24">
                <path fill="#fff" d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z" />
              </svg>
            </div>
            VibeBook
          </div>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>{exp.title}</div>
          <div style={{ display: "flex", color: "#65708a", fontSize: 27, fontWeight: 500, marginTop: 16, lineHeight: 1.35 }}>{exp.tagline}</div>
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 20, padding: "7px 12px", border: "1px solid #dfdefb", borderRadius: 999, color: "#6257b9", background: "#f7f6ff", fontSize: 17, fontWeight: 600 }}>{learningLevel}</div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              alignSelf: "flex-start",
              padding: "15px 25px",
              borderRadius: 13,
              background: "linear-gradient(135deg, #3675ee 0%, #7452e8 100%)",
              color: "#fff",
              fontSize: 26,
              fontWeight: 700,
              boxShadow: "0 9px 22px rgba(83,88,206,0.22)",
              alignItems: "center",
              gap: 12,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path fill="#fff" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
            </svg>
            {action}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
