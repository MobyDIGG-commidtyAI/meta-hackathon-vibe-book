"use client";
// Runs AI-written HTML in an opaque-origin sandbox. A harness we inject reports load/errors to the parent,
// and a CSP meta tag blocks every network request; the post photo is passed in as a data: URL.
import { useEffect, useRef, useState } from "react";

const PHOTO_TOKEN = "{{PHOTO_URL}}";

function harness() {
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:">
<script>
(function () {
  var failed = false;
  try { window.localStorage; } catch (e) {
    var mem = {};
    var shim = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
      clear: function () { mem = {}; },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
    try {
      Object.defineProperty(window, "localStorage", { value: shim });
      Object.defineProperty(window, "sessionStorage", { value: shim });
    } catch (_) {}
  }
  window.addEventListener("error", function (e) {
    failed = true;
    parent.postMessage({ type: "vibebook:error", message: String(e.message || e) }, "*");
  });
  window.addEventListener("load", function () {
    setTimeout(function () {
      if (!failed && document.body && document.body.children.length) parent.postMessage({ type: "vibebook:ready" }, "*");
      else if (!failed) parent.postMessage({ type: "vibebook:error", message: "page rendered nothing" }, "*");
    }, 400);
  });
})();
</script>`;
}

export function buildSrcdoc(html: string, photoUrl: string | null) {
  const withPhoto = html.split(PHOTO_TOKEN).join(photoUrl ?? "");
  const inject = harness();
  const head = /<head[^>]*>/i.exec(withPhoto);
  if (head) return withPhoto.slice(0, head.index + head[0].length) + inject + withPhoto.slice(head.index + head[0].length);
  return inject + withPhoto;
}

export default function AppFrame(props: {
  html: string;
  photoPath: string | null;
  onReady: () => void;
  onError: (message: string) => void;
}) {
  const { html, photoPath, onReady, onError } = props;
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let photo: string | null = null;
      if (photoPath) {
        try {
          const blob = await (await fetch(photoPath)).blob();
          photo = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        } catch {
          photo = null; // the app still runs, just without the photo
        }
      }
      if (!cancelled) setDoc(buildSrcdoc(html, photo));
    })();
    return () => {
      cancelled = true;
    };
  }, [html, photoPath]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === "vibebook:ready") onReady();
      if (e.data?.type === "vibebook:error") onError(String(e.data.message ?? "error"));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onReady, onError]);

  return doc ? <iframe ref={ref} srcDoc={doc} sandbox="allow-scripts" title="App" /> : null;
}
