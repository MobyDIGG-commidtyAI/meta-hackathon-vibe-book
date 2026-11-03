// Full-screen game/app. Embedded by the flow and by /p/:id; reports ready/error via postMessage.
import { notFound } from "next/navigation";
import PlayView from "@/components/PlayView";
import { getExperience } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exp = await getExperience(id);
  if (!exp) notFound();
  return (
    <PlayView
      kind={exp.kind}
      spec={exp.spec}
      html={exp.html}
      photoPath={exp.imageId ? `/api/img/${exp.imageId}` : null}
    />
  );
}
