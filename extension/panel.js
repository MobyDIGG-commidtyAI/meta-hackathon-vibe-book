// VibeBook panel: runs as an extension page inside the overlay iframe, so it can fetch
// fbcdn photos (host_permissions) that the web app can't. It reads the photo, then hands the
// post to the web app's /panel, which runs the whole create flow.
const MAX_SIDE = 1280;
const APP_URL = globalThis.VIBEBOOK_APP_URL;
const APP_ORIGIN = new URL(APP_URL).origin;

const post = JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}");
const status = document.getElementById("status");

document.getElementById("close").addEventListener("click", close);
addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
});

function close() {
  parent.postMessage({ type: "vibebook:close" }, "*");
}

// Downscale to MAX_SIDE JPEG so the request to /api/vibe stays small.
async function readPhoto(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo request failed (${res.status})`);
  const bitmap = await createImageBitmap(await res.blob());
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function start() {
  status.textContent = "Reading the photo…";
  let image = null;
  try {
    if (post.imageUrl) image = await readPhoto(post.imageUrl);
  } catch (err) {
    console.warn("VibeBook: photo read failed, using the text only", err);
  }

  const frame = document.createElement("iframe");
  frame.src = `${APP_URL}/panel`;
  frame.allow = "clipboard-write";
  frame.title = "VibeBook";
  // A dead server doesn't fire the iframe's error event, so time out instead of hanging.
  const timeout = setTimeout(() => {
    status.textContent = `Can't reach VibeBook at ${APP_URL}. Is the web server running?`;
  }, 10000);
  addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow || e.origin !== APP_ORIGIN) return;
    if (e.data?.type === "vibebook:panel-ready") {
      clearTimeout(timeout);
      document.body.classList.add("ready");
      frame.contentWindow.postMessage(
        {
          type: "vibebook:post",
          post: { image, caption: post.caption ?? "", postUrl: post.postUrl ?? "", platform: post.platform ?? "facebook" },
        },
        APP_ORIGIN,
      );
    }
    if (e.data?.type === "vibebook:close") close();
  });
  status.textContent = "Opening VibeBook…";
  document.body.append(frame);
}

start();
