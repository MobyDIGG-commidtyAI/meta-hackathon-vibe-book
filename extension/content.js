// VibeBook content script: puts a Vibe chip on post photos, videos and text posts, and opens the panel over the page.
// Our UI lives in a closed shadow root outside FB's React tree, drawn above the page, so FB's CSS, stacking and
// click handlers can't touch it. Each chip follows its post and hides when something else covers it.
(() => {
  if (globalThis.__vibebook) return; // the toolbar fallback may inject this file a second time
  globalThis.__vibebook = true;

  // The mock feed in extension/dev is served from localhost; the real script only runs on facebook.com.
  const DEV = location.hostname === "localhost";
  const MIN_W = 220;
  const MIN_H = 160;
  const CAPTION_MAX = 500;
  // FB's 2026 feed has no role=article on some posts; the wrapper is often the nearest div[aria-labelledby].
  const POST = '[role="article"], [aria-posinset], [data-pagelet^="FeedUnit"], div[aria-labelledby]';
  const POST_BLOCKER = '[role="dialog"], [aria-modal="true"], [role="feed"]';
  const MESSAGE = '[data-ad-preview="message"], [data-ad-comet-preview="message"]';
  const PERMALINK = 'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="/photo"], a[href*="fbid="], a[href*="/reel/"], a[href*="/watch/"], a[href*="video_id="]';
  const VIDEO = 'video, [data-video-id], [role="video"]';

  const host = document.createElement("vibebook-root");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>
    :host { all: initial; }
    .chip {
      position: fixed; left: 0; top: 0; z-index: 2147483646;
      display: inline-flex; align-items: center; gap: 6px;
      font: 550 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #fff;
      background: #6752e8; border: 1px solid #5945d4; border-radius: 8px; padding: 10px 12px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(26, 34, 57, 0.2);
    }
    .chip svg { width: 15px; height: 15px; fill: currentColor; }
    .chip:hover { border-color: #4938c1; background: #5742d5; }
    .chip:active { translate: 0 1px; }
    .chip:focus-visible { outline: 3px solid #bcb4ff; outline-offset: 2px; }
    .chip[hidden] { display: none; }
    .overlay {
      position: fixed; top: 0; right: 0; z-index: 2147483647;
      width: min(440px, 100vw); height: 100vh;
      box-shadow: -6px 0 24px rgba(23, 30, 48, 0.2); animation: slide-in 0.22s ease-out;
    }
    .overlay iframe { display: block; width: 100%; height: 100%; border: 0; background: #f5f7fc; }
    @keyframes slide-in { from { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { .overlay { animation: none; } .chip:active { translate: none; } }
  </style>`;
  document.documentElement.append(host);

  const chips = new Map(); // media, or the post of a text-only post -> { chip, scope, media }
  let overlay = null;

  function isPhotoUrl(src) {
    try {
      return DEV || /(^|\.)fbcdn\.net$/.test(new URL(src, location.href).hostname);
    } catch {
      return false;
    }
  }

  function largeMedia(el) {
    if (el.tagName === "IMG" && !isPhotoUrl(el.currentSrc || el.src)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= MIN_W && rect.height >= MIN_H;
  }

  function findPost(node, mediaSource = false) {
    for (let el = node; el && el !== document.body; el = el.parentElement) {
      if (el.matches(POST_BLOCKER)) return null;
      if (!el.matches(POST)) continue;

      const hasMessage = el.matches(MESSAGE) || el.querySelector(MESSAGE);
      const hasPermalink = el.querySelector(PERMALINK);
      const isFeedUnit = el.matches('[role="article"], [aria-posinset], [data-pagelet^="FeedUnit"]');
      if (hasMessage || hasPermalink || (mediaSource && isFeedUnit)) return el;
    }
    return null;
  }

  function primaryMedia(post) {
    let bestVideo = null;
    let videoArea = 0;
    const videos = [...post.querySelectorAll(VIDEO)];
    if (post.matches(VIDEO)) videos.unshift(post);
    for (const video of videos) {
      if (!largeMedia(video)) continue;
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > videoArea) {
        bestVideo = video;
        videoArea = area;
      }
    }
    if (bestVideo) return bestVideo;

    let bestImage = null;
    let imageArea = 0;
    const images = [...post.querySelectorAll("img")];
    if (post.tagName === "IMG") images.unshift(post);
    for (const img of images) {
      if (!largeMedia(img)) continue;
      const rect = img.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > imageArea) {
        bestImage = img;
        imageArea = area;
      }
    }
    if (bestImage) return bestImage;

    const videoFrame = [...post.querySelectorAll('[data-video-id], [role="video"]')].find(largeMedia);
    return videoFrame || null;
  }

  function discoverPosts() {
    const posts = new Set();
    for (const message of document.querySelectorAll(MESSAGE)) {
      const post = findPost(message);
      if (post) posts.add(post);
    }
    for (const media of document.querySelectorAll(`img, ${VIDEO}`)) {
      if (!largeMedia(media)) continue;
      const post = findPost(media, true);
      if (post) posts.add(post);
    }
    return posts;
  }

  // Every chip to show: one per photo or video (a grid gets one per photo), and one per text-only post.
  // Media outside a feed post (the photo viewer, a post opened in a dialog) reads its dialog or the page.
  function chipTargets() {
    const found = new Map();
    const taken = []; // a video's poster image sits on the video: one chip for both
    for (const media of [...document.querySelectorAll(VIDEO), ...document.querySelectorAll("img")]) {
      if (!largeMedia(media)) continue;
      const scope = findPost(media, true) || media.closest('[role="dialog"], [aria-modal="true"], [role="main"]');
      if (!scope) continue;
      const r = media.getBoundingClientRect();
      const x = (r.left + r.right) / 2;
      const y = (r.top + r.bottom) / 2;
      if (taken.some((t) => t.scope === scope && x >= t.r.left && x <= t.r.right && y >= t.r.top && y <= t.r.bottom)) continue;
      taken.push({ scope, r });
      found.set(media, { scope, media });
    }
    const withMedia = [...found.values()];
    for (const message of document.querySelectorAll(MESSAGE)) {
      const post = findPost(message);
      if (post && !withMedia.some((t) => post.contains(t.media))) found.set(post, { scope: post, media: null });
    }
    return found;
  }

  // The part of the media (or text post) the user can see: FB crops grid and tall photos with overflow:hidden
  // wrappers anywhere up to the post, and the viewport crops the rest.
  function visibleRect({ scope, media }) {
    let { left, top, right, bottom } = (media || scope).getBoundingClientRect();
    for (let el = media?.parentElement; media && el; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const r = el.getBoundingClientRect();
        left = Math.max(left, r.left);
        top = Math.max(top, r.top);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
      }
      if (el === scope) break;
    }
    return {
      left: Math.max(left, 0),
      top: Math.max(top, 0),
      right: Math.min(right, innerWidth),
      bottom: Math.min(bottom, innerHeight),
    };
  }

  // False when something outside the chip's post (a dialog, a menu, FB's top bar) is drawn over that point.
  function isOnTop({ scope, media }, x, y) {
    const under = document.elementsFromPoint(x, y).find((el) => el !== host);
    return !under || under === media || scope.contains(under) || under.contains(media || scope);
  }

  function makeChip({ scope, media }) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.hidden = true;
    chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z"/></svg>Vibe`;
    chip.setAttribute("aria-label", "Vibe this post with VibeBook");
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      open(readPost(scope, media));
    });
    root.append(chip);
    return { chip, scope, media, w: 74, h: 37 };
  }

  let raf = 0;
  function schedule() {
    raf ||= requestAnimationFrame(layout);
  }

  function layout() {
    raf = 0;
    for (const entry of chips.values()) {
      const r = visibleRect(entry);
      // Media chips sit in the photo's corner; text chips stay clear of the post's ⋯ menu.
      const right = r.right - (entry.media ? 10 : 52);
      const top = r.top + 10;
      const corners = [[right - entry.w + 3, top + 3], [right - 3, top + 3], [right - entry.w + 3, top + entry.h - 3], [right - 3, top + entry.h - 3]];
      const show =
        r.right - r.left >= MIN_W &&
        r.bottom - r.top >= (entry.media ? MIN_H : entry.h + 20) &&
        corners.every(([x, y]) => y >= innerHeight || isOnTop(entry, x, y));
      entry.chip.hidden = !show;
      if (!show) continue;
      entry.chip.style.transform = `translate(${right}px, ${top}px) translateX(-100%)`;
      entry.w = entry.chip.offsetWidth || entry.w;
      entry.h = entry.chip.offsetHeight || entry.h;
    }
  }

  let scanTimer = 0;
  function scheduleScan() {
    scanTimer ||= setTimeout(scan, 100);
  }

  function scan() {
    scanTimer = 0;
    const found = chipTargets();
    for (const [key, entry] of chips) {
      if (found.get(key)?.scope === entry.scope) continue;
      entry.chip.remove();
      chips.delete(key);
    }
    for (const [key, target] of found) {
      if (!chips.has(key)) chips.set(key, makeChip(target));
    }
    layout();
  }

  function onMediaLoad(e) {
    if (e.target instanceof HTMLImageElement || e.target instanceof HTMLVideoElement) scheduleScan();
  }

  function cleanUrl(href) {
    const url = new URL(href, location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("__")) url.searchParams.delete(key); // FB tracking params (__cft__, __tn__)
    }
    return url.href;
  }

  function readPost(post, media = null) {
    const scope = post || document.querySelector('[role="main"]') || document.body;
    const message = scope.matches(MESSAGE) ? scope : scope.querySelector(MESSAGE);
    const caption = (message || scope).innerText.replace(/\n{3,}/g, "\n\n").trim().slice(0, CAPTION_MAX);
    const link = scope.querySelector(PERMALINK);
    const video = media?.matches("video") ? media : media?.querySelector("video");
    const image = media?.matches("img") ? media : media?.querySelector("img");
    const poster = video?.poster;
    const imageUrl = poster && isPhotoUrl(poster)
      ? poster
      : image && isPhotoUrl(image.currentSrc || image.src)
        ? image.currentSrc || image.src
        : null;
    return {
      imageUrl,
      caption,
      postUrl: cleanUrl(link ? link.href : location.href),
      platform: "facebook",
    };
  }

  // Toolbar fallback: use the post under the middle of the screen, whatever its media type.
  function readCenterPost() {
    const center = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const centerPost = center && findPost(center, true);
    if (centerPost) return readPost(centerPost, primaryMedia(centerPost));

    let best = null;
    let bestArea = 0;
    for (const post of discoverPosts()) {
      const r = post.getBoundingClientRect();
      const width = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const height = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const area = width * height;
      if (width >= MIN_W && area > bestArea) {
        best = post;
        bestArea = area;
      }
    }
    return readPost(best, best && primaryMedia(best));
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

  // FB inserts and resizes posts as you scroll: move the chips we have now, and look for new ones shortly.
  new MutationObserver(() => {
    schedule();
    scheduleScan();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "data-video-id"],
  });
  addEventListener("load", onMediaLoad, true);
  addEventListener("loadedmetadata", onMediaLoad, true);
  addEventListener("scroll", schedule, { capture: true, passive: true });
  addEventListener("resize", schedule, { passive: true });
  setInterval(scheduleScan, 1000); // FB shows and hides dialogs with class changes the observer doesn't watch
  scan();
})();
