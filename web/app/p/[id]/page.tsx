// The shared link: OG card for Facebook, the experience itself, credit, and Remix.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Spark } from "@/components/Icons";
import Player from "@/components/Player";
import RemixBox from "@/components/RemixBox";
import { genreOf, kindLabel } from "@/lib/spec";
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

  const remixed = parent?.published ? parent : null;

  return (
    <div className="machine">
      <header className="cap">
        <a className="wordmark" href="/">
          <Spark /> VibeBook
        </a>
        <a className="btn light" href="/app">
          Make your own
        </a>
      </header>
      <main className="body">
        <div className="toy-window">
          <div className={`toy-label ${exp.kind}`}>
            <strong>{exp.kind === "game" ? "Tap the game to play" : "Try it right here"}</strong>
            <span className={`tag ${exp.kind}`}>{kindLabel(exp.kind, exp.spec ? genreOf(exp.spec) : "none")}</span>
          </div>
          <Player id={exp.id} version={exp.version} kind={exp.kind} />
        </div>
        <div>
          <h1 className="share-title">{exp.title}</h1>
          <p className="share-tagline">{exp.tagline}</p>
        </div>
        <div className={`labels${remixed ? " stacked" : ""}`}>
          <span className="clabel over">
            Made by {by} from a {exp.source.platform} post
          </span>
          {remixed && (
            <span className="clabel under">
              Remixed from <a href={`/p/${remixed.id}`}>{remixed.title}</a> by {remixed.creatorName || "someone"}
            </span>
          )}
        </div>
        <RemixBox id={exp.id} kind={exp.kind} genre={exp.spec ? genreOf(exp.spec) : undefined} />
        <a className="btn outline" href="/app">
          Make your own from any photo
        </a>
      </main>
    </div>
  );
}
