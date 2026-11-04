// VibeBook content script: adds a creation shortcut to post photos and opens the panel over the page.
// Each chip lives in its post or media frame so scrolling follows the page's own layout.
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

  const panelHost = document.createElement("vibebook-root");
  const panelRoot = panelHost.attachShadow({ mode: "closed" });
  panelRoot.innerHTML = `<style>
    :host { all: initial; }
    .overlay {
      position: fixed; top: 0; right: 0; z-index: 2147483647;
      width: min(440px, 100vw); height: 100vh;
      box-shadow: -6px 0 24px rgba(23, 30, 48, 0.2); animation: slide-in 0.22s ease-out;
    }
    .overlay iframe { display: block; width: 100%; height: 100%; border: 0; background: #f5f7fc; }
    @keyframes slide-in { from { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { .overlay { animation: none; } }
  </style>`;
  document.documentElement.append(panelHost);

  const chips = new Map(); // post -> its in-frame shadow host and positioning cleanup
  const positionedContainers = new WeakMap();
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

  // Anchor a media button to the smallest matching frame, not the viewport.
  function mediaContainer(media) {
    const mediaRect = media.getBoundingClientRect();
    let candidate = null;
    let fallback = null;
    const first = media.matches("img, video") ? media.parentElement : media;
    for (let el = first, depth = 0; el && el !== document.body && depth < 6; el = el.parentElement, depth++) {
      if (el.matches(POST)) break;
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_W || rect.height < MIN_H) continue;

      const style = getComputedStyle(el);
      const photoLike = el.tagName === "A" || style.overflowX !== "visible" || style.overflowY !== "visible";
      if (photoLike && !fallback) fallback = el;
      const closeWidth = rect.width >= mediaRect.width * 0.65 && rect.width <= mediaRect.width * 1.5 + 40;
      const closeHeight = rect.height >= mediaRect.height * 0.55 && rect.height <= mediaRect.height * 1.5 + 40;
      if (!closeWidth || !closeHeight) continue;

      if (photoLike) return el;
      candidate ||= el;
    }
    return candidate || fallback;
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

  function positionContainer(container) {
    let state = positionedContainers.get(container);
    if (!state) {
      state = {
        count: 0,
        changed: getComputedStyle(container).position === "static",
        value: container.style.getPropertyValue("position"),
        priority: container.style.getPropertyPriority("position"),
      };
      if (state.changed) container.style.setProperty("position", "relative");
      positionedContainers.set(container, state);
    }
    state.count++;

    return () => {
      if (--state.count > 0) return;
      if (state.changed && container.style.getPropertyValue("position") === "relative") {
        if (state.value) container.style.setProperty("position", state.value, state.priority);
        else container.style.removeProperty("position");
      }
      positionedContainers.delete(container);
    };
  }

  function makeChip(post, container, media) {
    const chipHost = document.createElement("vibebook-chip");
    chipHost.className = media ? "media" : "text";
    const chipRoot = chipHost.attachShadow({ mode: "closed" });
    chipRoot.innerHTML = `<style>
      :host { all: initial; position: absolute; top: 0; right: 0; z-index: 2; display: block; width: 0; height: 0; pointer-events: none; }
      .chip {
        all: unset; box-sizing: border-box; position: absolute; top: 10px; right: 10px;
        display: inline-flex; align-items: center; gap: 6px; pointer-events: auto;
        font: 550 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #fff;
        background: #6752e8; border: 1px solid #5945d4; border-radius: 8px; padding: 10px 12px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(26, 34, 57, 0.2);
      }
      .chip svg { width: 15px; height: 15px; fill: currentColor; stroke: none; }
      .chip:hover { border-color: #4938c1; background: #5742d5; }
      .chip:active { transform: translateY(1px); }
      .chip:focus-visible { outline: 3px solid #bcb4ff; outline-offset: 2px; }
      :host(.text) .chip { right: 52px; }
      @media (prefers-reduced-motion: reduce) { .chip:active { transform: none; } }
    </style><button class="chip" type="button" aria-label="Vibe this post with VibeBook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z"/></svg>Vibe</button>`;
    const chip = chipRoot.querySelector("button");
    const record = { host: chipHost, container, media, releasePosition: positionContainer(container) };
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      open(readPost(post, record.media));
    });
    container.append(chipHost);
    return record;
  }

  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(scan, 100);
  }

  function removeChip(post) {
    const chip = chips.get(post);
    if (!chip) return;
    chip.host.remove();
    chip.releasePosition();
    chips.delete(post);
  }

  function scan() {
    scanTimer = 0;
    const posts = discoverPosts();
    for (const post of posts) {
      const media = primaryMedia(post);
      const container = media ? mediaContainer(media) || post : post;
      const rect = container.getBoundingClientRect();
      const largeEnough = rect.width >= MIN_W && rect.height >= (media ? MIN_H : 40);
      const existing = chips.get(post);
      if (!largeEnough) {
        removeChip(post);
        continue;
      }
      if (existing && (!existing.host.isConnected || existing.container !== container)) removeChip(post);
      const chip = chips.get(post);
      if (!chip) chips.set(post, makeChip(post, container, media));
      else {
        chip.media = media;
        chip.host.className = media ? "media" : "text";
      }
    }

    for (const post of chips.keys()) {
      if (!post.isConnected || !posts.has(post)) removeChip(post);
    }
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
    panelRoot.append(overlay);
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

  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "data-video-id"],
  });
  addEventListener("load", onMediaLoad, true);
  addEventListener("loadedmetadata", onMediaLoad, true);
  addEventListener("resize", scheduleScan, { passive: true });
  scan();
})();
