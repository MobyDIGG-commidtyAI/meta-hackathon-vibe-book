"use client";
// No-install entry point: upload a photo and/or paste a post, then the same flow as the extension.
import { useState } from "react";
import VibeFlow, { type Post } from "@/components/VibeFlow";

const MAX_SIDE = 1280;

async function resize(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function AppPage() {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setImage(await resize(file));
    } catch {
      setError("Couldn't read that image — try a JPEG or PNG.");
    }
  }

  if (post) return <VibeFlow post={post} onClose={() => setPost(null)} />;

  return (
    <div className="flow">
      <header className="flow-head">
        <a className="brand" href="/" style={{ color: "inherit", textDecoration: "none" }}>
          ✦ VibeBook
        </a>
      </header>
      <form
        className="flow-body upload"
        onSubmit={(e) => {
          e.preventDefault();
          setPost({ image, caption: caption.trim(), postUrl: "", platform: "web" });
        }}
      >
        <h2 style={{ margin: "8px 0 0" }}>Vibe any post</h2>
        <p className="muted" style={{ margin: 0 }}>
          Drop in a photo you love, or paste what a post said. VibeBook suggests what you can make from it.
        </p>
        <label className="drop">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>🖼️</span>
              <span>Choose a photo</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={pick} hidden />
        </label>
        <textarea
          className="field"
          rows={3}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption or post text (optional with a photo)"
          maxLength={1500}
        />
        {error && <div className="notice bad">{error}</div>}
        <button className="btn" disabled={!image && !caption.trim()}>
          ✦ Vibe it
        </button>
      </form>
    </div>
  );
}
