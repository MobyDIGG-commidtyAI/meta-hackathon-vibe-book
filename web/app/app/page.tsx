"use client";
// No-install entry point: put a photo in the dome and/or paste a post, then the same flow as the extension.
import { useState } from "react";
import { Photo, Spark } from "@/components/Icons";
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
      setError("Couldn't read that image. Try a JPEG or PNG.");
    }
  }

  if (post) return <VibeFlow post={post} onClose={() => setPost(null)} />;

  return (
    <div className="machine">
      <header className="cap">
        <a className="wordmark" href="/">
          <Spark /> VibeBook
        </a>
      </header>
      <form
        className="body"
        onSubmit={(e) => {
          e.preventDefault();
          setPost({ image, caption: caption.trim(), postUrl: "", platform: "web" });
        }}
      >
        <div>
          <h1 className="page-title">Vibe any photo</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Put a photo you love in the dome, add what the post said, and pick what to make from it.
          </p>
        </div>
        <div className="dome-wrap">
          <label className={`dome drop${image ? "" : " empty"}`}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Your photo" />
            ) : (
              <span className="drop-label">
                <Photo size={30} />
                Choose a photo
              </span>
            )}
            <input type="file" accept="image/*" onChange={pick} className="sr-only" />
          </label>
          {image && (
            <span className="scene-line" style={{ fontSize: 13 }}>
              Tap the dome to swap the photo
            </span>
          )}
        </div>
        <div className="form-sheet">
          <label htmlFor="vb-caption">What did the post say?</label>
          <textarea
            id="vb-caption"
            className="field"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional with a photo. e.g. Sunrise on Everest. Still can't believe we made it up here"
            maxLength={1500}
          />
        </div>
        {error && (
          <div className="notice" role="alert">
            <span className="bang">!</span>
            <span>{error}</span>
          </div>
        )}
        <button className="btn light big wide" disabled={!image && !caption.trim()}>
          <Spark /> Vibe it
        </button>
      </form>
    </div>
  );
}
