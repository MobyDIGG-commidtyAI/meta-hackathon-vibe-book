"use client";
// No-install entry point: choose a photo and/or add its caption, then use the same flow as the extension.
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
    <div className="machine upload-page">
      <header className="cap">
        <a className="wordmark" href="/">
          <span className="brand-mark"><Spark size={15} /></span> VibeBook
        </a>
      </header>
      <form
        className="body upload-body"
        onSubmit={(e) => {
          e.preventDefault();
          setPost({ image, caption: caption.trim(), postUrl: "", platform: "web" });
        }}
      >
        <div className="upload-intro">
          <span className="eyebrow">START WITH A MOMENT</span>
          <h1 className="page-title">Create from a photo</h1>
          <p className="lede">Add a photo and caption. VibeBook will suggest a few interactive ideas based on what you share.</p>
        </div>
        <div className="upload-card">
          <label className={`photo-drop${image ? " has-image" : ""}`}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Your photo" />
            ) : (
              <span className="drop-label">
                <Photo size={30} />
                <strong>Choose a photo</strong>
                <small>JPG or PNG · optional if you add a caption</small>
              </span>
            )}
            <input type="file" accept="image/*" onChange={pick} className="sr-only" />
            {image && <span className="replace-photo">Change photo</span>}
          </label>
        </div>
        <div className="form-sheet">
          <label htmlFor="vb-caption">Caption <span className="optional-label">OPTIONAL</span></label>
          <textarea
            id="vb-caption"
            className="field"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add the story or context behind this photo…"
            maxLength={1500}
          />
        </div>
        {error && (
          <div className="notice" role="alert">
            <span className="notice-mark">!</span>
            <span>{error}</span>
          </div>
        )}
        <button className="btn big wide" disabled={!image && !caption.trim()}>
          <Spark /> Find ideas
        </button>
        <p className="upload-footnote">Set a grade or study level before ideas are generated.</p>
      </form>
    </div>
  );
}
