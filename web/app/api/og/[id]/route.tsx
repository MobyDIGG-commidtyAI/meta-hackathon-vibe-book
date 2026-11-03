// Link-preview card for /p/:id: the post photo in the machine's dome, the title and a play button.
import { ImageResponse } from "next/og";
import { imageDataUrl } from "@/lib/build";
import { getExperience } from "@/lib/store";

// Satori needs TTF/OTF data, so pull the two faces from Google Fonts, subset to the card's text.
// Falls back to the default face if the font host can't be reached.
async function googleFont(family: string, weight: number, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`no font file for ${family}`);
  return (await fetch(url)).arrayBuffer();
}

async function ogFonts(displayText: string, roundedText: string) {
  try {
    const [display, rounded] = await Promise.all([
      googleFont("Dela Gothic One", 400, displayText),
      googleFont("M PLUS Rounded 1c", 800, roundedText),
    ]);
    return [
      { name: "Display", data: display, weight: 400 as const, style: "normal" as const },
      { name: "Rounded", data: rounded, weight: 800 as const, style: "normal" as const },
    ];
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
  const fonts = await ogFonts(exp.title, `VibeBook${exp.tagline}${action}`);

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
          background: "#d7322a",
          color: "#fff",
          fontFamily: "Rounded",
        }}
      >
        {/* The post photo in the machine's clear dome */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            width: 420,
            height: 420,
            borderRadius: 999,
            overflow: "hidden",
            background: "#b5261f",
            border: "8px solid rgba(255,255,255,0.22)",
            boxShadow: "0 0 0 3px rgba(60,4,0,0.55), 0 24px 48px rgba(86,4,0,0.45)",
          }}
        >
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={420} height={420} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 800, marginBottom: 22 }}>
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path fill="#ffc93c" d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z" />
            </svg>
            VibeBook
          </div>
          <div style={{ display: "flex", fontFamily: "Display", fontSize: 66, lineHeight: 1.08 }}>{exp.title}</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, marginTop: 16, lineHeight: 1.3 }}>{exp.tagline}</div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              alignSelf: "flex-start",
              padding: "16px 36px",
              borderRadius: 999,
              background: "#fff",
              color: "#a8201a",
              fontSize: 34,
              fontWeight: 800,
              boxShadow: "0 10px 24px rgba(86,4,0,0.35)",
              alignItems: "center",
              gap: 14,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path fill="#a8201a" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
            </svg>
            {action}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
