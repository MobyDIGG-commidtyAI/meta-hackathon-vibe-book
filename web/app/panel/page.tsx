"use client";
// Loaded inside the extension's overlay. The extension reads the FB post (it can fetch fbcdn photos)
// and hands it over with postMessage; everything after that runs here.
import { useEffect, useState } from "react";
import VibeFlow, { type Post } from "@/components/VibeFlow";

export default function PanelPage() {
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent || e.data?.type !== "vibebook:post") return;
      const p = e.data.post ?? {};
      setPost({
        image: typeof p.image === "string" ? p.image : null,
        caption: String(p.caption ?? ""),
        postUrl: String(p.postUrl ?? ""),
        platform: String(p.platform ?? "facebook"),
      });
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "vibebook:panel-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!post) return <div className="hero muted">Opening VibeBook…</div>;
  return <VibeFlow post={post} onClose={() => window.parent.postMessage({ type: "vibebook:close" }, "*")} />;
}
