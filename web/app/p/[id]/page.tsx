// The shared link: OG card for Facebook, the experience itself, credit, and Remix.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Player from "@/components/Player";
import RemixBox from "@/components/RemixBox";
import { getExperience } from "@/lib/store";

export const dynamic = "force-dynamic";

function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const exp = await getExperience(id);
  if (!exp || !exp.published) return { title: "VibeBook" };
  const title = `${exp.kind === "game" ? "▶ Play" : "▶ Open"} ${exp.title}`;
  const image = `${appUrl()}/api/og/${exp.id}?v=${exp.version}`;
  return {
    title: `${title} · VibeBook`,
    description: exp.tagline,
    openGraph: {
      title,
      description: exp.tagline,
      url: `${appUrl()}/p/${exp.id}`,
      siteName: "VibeBook",
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: exp.tagline, images: [image] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exp = await getExperience(id);
  if (!exp || !exp.published) notFound();
  const parent = exp.parentId ? await getExperience(exp.parentId) : null;
  const by = exp.creatorName || "someone";

  return (
    <main className="page">
      <span className="brand">✦ VibeBook</span>
      <Player id={exp.id} version={exp.version} />
      <div>
        <h1>{exp.title}</h1>
        <div className="muted">{exp.tagline}</div>
      </div>
      <div className="muted small">
        Made by {by} from a {exp.source.platform} post
        {parent?.published && (
          <>
            {" "}
            · remixed from <a href={`/p/${parent.id}`}>{parent.title}</a> by {parent.creatorName || "someone"}
          </>
        )}
      </div>
      <RemixBox id={exp.id} kind={exp.kind} />
      <a className="btn ghost" href="/app">
        Make your own from any photo
      </a>
    </main>
  );
}
