// VibeBook content script: puts a ✦ Vibe chip on post photos and opens the panel over the page.
// Our UI lives in a closed shadow root outside FB's React tree, so FB's CSS and re-renders can't touch it.
(() => {
  if (globalThis.__vibebook) return; // the toolbar fallback may inject this file a second time
  globalThis.__vibebook = true;

  // The mock feed in extension/dev is served from localhost; the real script only runs on facebook.com.
  const DEV = location.hostname === "localhost";
  const MIN_W = 220;
  const MIN_H = 160;
  const CAPTION_MAX = 500;
  // FB's 2026 feed has no role=article on posts; the post wrapper is the nearest div[aria-labelledby].
  const POST = '[role="article"], [aria-posinset], [role="dialog"], [data-pagelet^="FeedUnit"], div[aria-labelledby]';
  const MESSAGE = '[data-ad-preview="message"], [data-ad-comet-preview="message"]';
  const PERMALINK = 'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="/photo"], a[href*="fbid="]';

  const host = document.createElement("vibebook-root");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>
    :host { all: initial; }
    .chip {
      position: fixed; left: 0; top: 0; z-index: 2147483646;
      display: inline-flex; align-items: center; gap: 6px;
      font: 650 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #fff;
      background: linear-gradient(135deg, #3675ee 0%, #7452e8 100%); border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 10px; padding: 9px 12px; cursor: pointer;
      box-shadow: 0 4px 14px rgba(30, 43, 91, 0.24);
    }
    .chip svg { width: 13px; height: 13px; fill: #fff; }
    .chip:hover { filter: brightness(1.06); }
    .chip:focus-visible { outline: 3px solid #b6c9ff; outline-offset: 2px; }
    .chip[hidden] { display: none; }
    .overlay {
      position: fixed; top: 0; right: 0; z-index: 2147483647;
      width: min(440px, 100vw); height: 100vh;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.45); animation: slide-in 0.25s ease-out;
    }
    .overlay iframe { display: block; width: 100%; height: 100%; border: 0; background: #f5f7fc; }
    @keyframes slide-in { from { transform: translateX(100%); } }
  </style>`;
  document.documentElement.append(host);

  const tracked = new Set(); // every photo-sized candidate seen on the page
  const chips = new Map(); // img -> chip, created the first time the img qualifies
  let overlay = null;

  function isPhotoUrl(src) {
    try {
      return DEV || /(^|\.)fbcdn\.net$/.test(new URL(src, location.href).hostname);
    } catch {
      return false;
    }
  }

  // The part of the img the user can actually see: FB crops grid photos with overflow:hidden wrappers.
  function visibleRect(img) {
    let { left, top, right, bottom } = img.getBoundingClientRect();
    for (let el = img.parentElement, i = 0; el && i < 4; el = el.parentElement, i++) {
      const style = getComputedStyle(el);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const r = el.getBoundingClientRect();
      left = Math.max(left, r.left);
      top = Math.max(top, r.top);
      right = Math.min(right, r.right);
      bottom = Math.min(bottom, r.bottom);
    }
    return {
      left: Math.max(left, 0),
      top: Math.max(top, 0),
      right: Math.min(right, innerWidth),
      bottom: Math.min(bottom, innerHeight),
    };
  }

  // False when something outside the img's post (a dialog, a menu) is drawn over that point.
  function isOnTop(img, x, y) {
    const post = img.closest(POST) || img.closest('[role="main"]') || document.body;
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === host) continue;
      return el === img || post.contains(el) || el.contains(img);
    }
    return false;
  }

  function makeChip(img) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z"/></svg>Vibe`;
    chip.setAttribute("aria-label", "Vibe this post with VibeBook");
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      open(readPost(img));
    });
    root.append(chip);
    return chip;
  }

  let raf = 0;
  function schedule() {
    raf ||= requestAnimationFrame(layout);
  }

  function layout() {
    raf = 0;
    for (const img of tracked) {
      if (!img.isConnected) {
        chips.get(img)?.remove();
        chips.delete(img);
        tracked.delete(img);
        continue;
      }
      const r = visibleRect(img);
      const show =
        r.right - r.left >= MIN_W && r.bottom - r.top >= MIN_H && isOnTop(img, r.right - 40, r.top + 16);
      let chip = chips.get(img);
      if (!show) {
        if (chip) chip.hidden = true;
        continue;
      }
      if (!chip) chips.set(img, (chip = makeChip(img)));
      chip.hidden = false;
      chip.style.transform = `translate(${r.right - 10}px, ${r.top + 10}px) translateX(-100%)`;
    }
  }

  let scanTimer = 0;
  function scan() {
    scanTimer = 0;
    for (const img of document.images) {
      if (isPhotoUrl(img.currentSrc || img.src)) tracked.add(img);
    }
    schedule();
  }

  function cleanUrl(href) {
    const url = new URL(href, location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("__")) url.searchParams.delete(key); // FB tracking params (__cft__, __tn__)
    }
    return url.href;
  }

  function readPost(img, post = img?.closest(POST)) {
    const scope = post || document.querySelector('[role="main"]') || document.body;
    const message = scope.querySelector(MESSAGE);
    const caption = (message || scope).innerText.replace(/\n{3,}/g, "\n\n").trim().slice(0, CAPTION_MAX);
    const link = scope.querySelector(PERMALINK);
    return {
      imageUrl: img ? img.currentSrc || img.src : null,
      caption,
      postUrl: cleanUrl(link ? link.href : location.href),
      platform: "facebook",
    };
  }

  // Toolbar fallback: the photo with the most on-screen area, or the post under the middle of the screen.
  function readCenterPost() {
    let best = null;
    let bestArea = 0;
    for (const img of document.images) {
      const r = visibleRect(img);
      const area = Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
      if (r.right - r.left >= 200 && area > bestArea) {
        best = img;
        bestArea = area;
      }
    }
    if (best) return readPost(best);
    return readPost(null, document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest(POST));
  }

  function panelUrl() {
    return globalThis.chrome?.runtime?.getURL
      ? chrome.runtime.getURL("panel.html")
      : new URL("../panel.html", location.href).href; // dev mock feed
  }

  function open(payload) {
    close();
    overlay = document.createElement("div");
    overlay.className = "overlay";
    const frame = document.createElement("iframe");
    frame.src = `${panelUrl()}#${encodeURIComponent(JSON.stringify(payload))}`;
    frame.allow = "clipboard-write";
    overlay.append(frame);
    root.append(overlay);
  }

  function close() {
    overlay?.remove();
    overlay = null;
  }

  addEventListener("message", (e) => {
    if (!overlay || e.source !== overlay.firstChild.contentWindow) return;
    if (e.data?.type === "vibebook:close") close();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay) close();
  });
  globalThis.chrome?.runtime?.onMessage?.addListener((msg) => {
    if (msg?.type === "vibebook:open-center") open(readCenterPost());
  });

  new MutationObserver(() => {
    scanTimer ||= setTimeout(scan, 500);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  addEventListener("scroll", schedule, { capture: true, passive: true });
  addEventListener("resize", schedule, { passive: true });
  setInterval(schedule, 1000); // FB shows/hides dialogs with class changes the observer doesn't watch
  scan();
})();
