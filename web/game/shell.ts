// Shared frame for the catch, puzzle and memory games: the post photo behind everything, a slim HUD,
// and the start / end cards. Each genre module only builds its board inside `stage`.
//
//   .vs-bg       post photo (object-fit: cover) or a plain ground when there is none
//   .vs-tint     timeOfDay wash so items stay readable on any photo
//   .vs-stage    the genre's own board
//   .vs-hud      two paper chips (left / right) and an optional progress bar
//   .vs-overlay  start and end cards
//
// Model output (titles, taglines) is only ever set with textContent.

export type Tint = "day" | "sunset" | "night" | "neon" | "dim" | "none";

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const TINTS: Record<Tint, string> = {
  day: "linear-gradient(180deg,rgba(255,255,255,0) 40%,rgba(0,0,0,0.18) 100%)",
  sunset: "linear-gradient(180deg,rgba(255,110,40,0.32) 0%,rgba(150,40,110,0.3) 100%)",
  night: "linear-gradient(180deg,rgba(3,7,32,0.62) 0%,rgba(10,24,72,0.48) 100%)",
  neon: "linear-gradient(160deg,rgba(255,0,180,0.3) 0%,rgba(30,0,70,0.32) 50%,rgba(0,230,255,0.3) 100%)",
  dim: "rgba(10,10,10,0.55)",
  none: "none",
};

const CSS = `
.vs-root{position:relative;width:100%;height:100%;overflow:hidden;background:#2a2a2a;color:#141414;
  font-family:var(--font-ui),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.3;
  touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;outline:none}
.vs-root *{box-sizing:border-box}
.vs-layer{position:absolute;inset:0}
.vs-bg img{width:100%;height:100%;object-fit:cover;display:block}
.vs-tint{pointer-events:none}
.vs-stage{z-index:1}
.vs-hud{z-index:2;inset:0 0 auto 0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
  padding:max(10px,env(safe-area-inset-top)) 10px 0;pointer-events:none;opacity:0;transition:opacity .2s ease}
.vs-hud.vs-on{opacity:1}
.vs-chip{max-width:62%;padding:7px 12px;border-radius:999px;background:#fff;color:#141414;font-weight:800;
  font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;
  box-shadow:0 4px 12px rgba(0,0,0,.28)}
.vs-chip:empty{display:none}
.vs-bar{position:absolute;z-index:2;left:10px;right:10px;top:calc(max(10px,env(safe-area-inset-top)) + 40px);height:8px;
  border-radius:999px;background:rgba(255,255,255,.45);overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.vs-bar[hidden]{display:none}
.vs-fill{height:100%;width:100%;background:#ffc93c;transform-origin:0 50%;transform:scaleX(0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.vs-overlay{z-index:3;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(10,10,10,.42);
  opacity:0;visibility:hidden;transition:opacity .2s ease,visibility 0s linear .2s}
.vs-overlay.vs-on{opacity:1;visibility:visible;transition:opacity .2s ease}
.vs-card{width:100%;max-width:340px;padding:22px 20px 18px;border-radius:22px;background:#fff;color:#141414;
  text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.4);transform:translateY(8px);
  transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.vs-overlay.vs-on .vs-card{transform:none}
.vs-emoji{font-family:${EMOJI_FONT};font-size:44px;line-height:1.1}
.vs-h1{margin:8px 0 0;font-family:var(--font-display),var(--font-ui),system-ui,sans-serif;font-weight:400;
  font-size:26px;line-height:1.08;overflow-wrap:anywhere}
.vs-sub{margin:8px 0 0;font-size:15px;color:#474747;overflow-wrap:anywhere}
.vs-goal{display:inline-block;margin-top:12px;padding:5px 12px;border-radius:999px;background:#ffc93c;
  box-shadow:inset 0 0 0 1.5px #141414;font-weight:800;font-size:14px}
.vs-btn{display:block;width:100%;min-height:48px;margin-top:16px;border:0;border-radius:999px;background:#d7322a;
  color:#fff;font:inherit;font-weight:800;font-size:17px;cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.18),0 4px 10px rgba(110,10,4,.3)}
.vs-btn:hover{background:#e43a31}
.vs-btn:focus-visible{outline:3px solid #ffc93c;outline-offset:2px}
.vs-hint{margin:10px 0 0;font-size:13px;color:#474747}
@media (prefers-reduced-motion: reduce){.vs-root *{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;

export interface CardContent {
  emoji?: string;
  headline: string;
  sub?: string;
  goal?: string;
  button: string;
  hint?: string;
}

export interface Shell {
  root: HTMLDivElement;
  /** The genre draws its board here. Fills the frame; the HUD and cards sit above it. */
  stage: HTMLDivElement;
  hud: {
    show(on: boolean): void;
    left(text: string): void;
    right(text: string): void;
    /** 0..1 fills the bar; null hides it. */
    progress(value: number | null): void;
  };
  /** Shows a centred card; the button (or Enter / Space) calls onPress once and hides the card. */
  card(content: CardContent, onPress: () => void): void;
  hideCard(): void;
  /** Resolves once the photo has loaded or failed, so onReady can wait for a real first frame. */
  photoReady: Promise<void>;
  destroy(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: HTMLElement) {
  const node = document.createElement(tag);
  node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

let cssInjected = false;

export function createShell(
  parent: HTMLElement,
  opts: { backgroundUrl: string | null; tint: Tint; ground?: string },
): Shell {
  if (!cssInjected) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    cssInjected = true;
  }

  const root = el("div", "vs-root", parent);
  root.tabIndex = -1;
  const bg = el("div", "vs-layer vs-bg", root);
  bg.style.background = opts.ground ?? "linear-gradient(180deg,#3b4a5c,#1d2530)";
  let photoReady: Promise<void> = Promise.resolve();
  if (opts.backgroundUrl) {
    const img = el("img", "", bg);
    img.alt = "";
    img.draggable = false;
    photoReady = new Promise((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => {
        img.remove();
        resolve();
      };
    });
    img.src = opts.backgroundUrl;
  }
  const tint = el("div", "vs-layer vs-tint", root);
  tint.style.background = TINTS[opts.tint];
  const stage = el("div", "vs-layer vs-stage", root);

  const hudEl = el("div", "vs-layer vs-hud", root);
  const leftChip = el("div", "vs-chip", hudEl);
  const rightChip = el("div", "vs-chip", hudEl);
  const bar = el("div", "vs-bar", root);
  bar.hidden = true;
  const fill = el("div", "vs-fill", bar);

  const overlay = el("div", "vs-layer vs-overlay", root);
  let pending: (() => void) | null = null;

  function press() {
    const fn = pending;
    if (!fn) return;
    pending = null;
    overlay.classList.remove("vs-on");
    fn();
  }

  function onKey(e: KeyboardEvent) {
    if (!pending) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      press();
    }
  }
  root.addEventListener("keydown", onKey);

  return {
    root,
    stage,
    hud: {
      show: (on) => hudEl.classList.toggle("vs-on", on),
      left: (text) => {
        leftChip.textContent = text;
      },
      right: (text) => {
        rightChip.textContent = text;
      },
      progress: (value) => {
        bar.hidden = value === null;
        if (value !== null) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
      },
    },
    card(content, onPress) {
      overlay.textContent = "";
      const card = el("div", "vs-card", overlay);
      if (content.emoji) el("div", "vs-emoji", card).textContent = content.emoji;
      el("h2", "vs-h1", card).textContent = content.headline;
      if (content.sub) el("p", "vs-sub", card).textContent = content.sub;
      if (content.goal) el("div", "vs-goal", card).textContent = content.goal;
      const btn = el("button", "vs-btn", card);
      btn.type = "button";
      btn.textContent = content.button;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        press();
      });
      if (content.hint) el("p", "vs-hint", card).textContent = content.hint;
      pending = onPress;
      overlay.classList.add("vs-on");
      root.focus({ preventScroll: true });
    },
    hideCard() {
      pending = null;
      overlay.classList.remove("vs-on");
    },
    photoReady,
    destroy() {
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
