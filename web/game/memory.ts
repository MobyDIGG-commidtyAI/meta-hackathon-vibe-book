// VibeBook memory: flip cards to find pairs. The backs show the post photo, the faces the post's world
// (spec.pairs). Built on the shared shell (game/shell.ts): the board lives in `stage`, the HUD shows
// moves, time and pairs found, and the start / end cards are the shell's.
//
//   .vm-board   the area below the HUD; a ResizeObserver sizes the cards to fit it
//   .vm-grid    3 columns for 12 cards, 4 for 14 or 16
//   .vm-card    a <button>; .vm-inner turns 180deg to swap .vm-back (photo) for .vm-face (emoji)
//
// Spec strings and emoji are only ever set with textContent (and aria-label, which is never parsed).
import { ITEMS, type MemorySpec } from "@/lib/spec";
import { createShell, EMOJI_FONT, reducedMotion } from "./shell";

export interface MountGameOptions {
  spec: MemorySpec;
  backgroundUrl: string | null;
  /** Called exactly once, after the board's first frame is on screen. */
  onReady: () => void;
  /** Called at most once if the game throws. */
  onError?: (e: unknown) => void;
}

const MIN_PAIRS = 6;
const MAX_PAIRS = 8;
const FLIP_MS = 280;
const MISMATCH_MS = 750; // a wrong pair stays up this long before flipping back
const PREVIEW_MS = 1200; // every face is shown this long after Start
const WIN_DELAY_MS = 800; // lets the last check badge land before the end card
const MAX_CARD_W = 150;

const SVG_NS = "http://www.w3.org/2000/svg";
const SPARKLE_PATH = "M12 1C12.8 7.4 16.6 11.2 23 12C16.6 12.8 12.8 16.6 12 23C11.2 16.6 7.4 12.8 1 12C7.4 11.2 11.2 7.4 12 1Z";
const CHECK_PATH = "M5 12.5l4.5 4.5L19 7.5";

// Sizes come from layout() as custom properties on .vm-board; the defaults only cover the frame before it runs.
const CSS = `
.vm-board{position:absolute;top:calc(max(10px,env(safe-area-inset-top)) + 64px);right:max(12px,env(safe-area-inset-right));
  bottom:max(12px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));display:flex;align-items:center;
  justify-content:center;visibility:hidden;--vm-w:80px;--vm-h:106px;--vm-gap:8px;--vm-r:7px;--vm-mark:12px;--vm-badge:19px}
.vm-board.vm-shown{visibility:visible}
.vm-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--vm-gap)}
.vm-card{position:relative;flex:none;width:var(--vm-w);height:var(--vm-h);margin:0;padding:0;border:0;border-radius:var(--vm-r);
  background:none;color:inherit;font:inherit;cursor:pointer;perspective:800px;-webkit-appearance:none;appearance:none}
.vm-card:focus{outline:none}
.vm-card:focus-visible{outline:3px solid #ffc93c;outline-offset:3px}
.vm-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform ${FLIP_MS}ms cubic-bezier(.2,.8,.2,1)}
.vm-up .vm-inner{transform:rotateY(180deg)}
.vm-side{position:absolute;inset:0;border-radius:var(--vm-r);-webkit-backface-visibility:hidden;backface-visibility:hidden;
  box-shadow:0 4px 10px rgba(0,0,0,.34)}
.vm-back{transform:rotateY(0deg);border:3px solid #fff;background-color:#d7322a;
  background-image:radial-gradient(rgba(255,255,255,.2) 1.2px,transparent 1.8px);background-size:9px 9px}
.vm-photo .vm-back{background-image:var(--vm-photo);background-size:cover;background-position:center;background-repeat:no-repeat}
.vm-mark{position:absolute;right:6%;bottom:5%;width:var(--vm-mark);height:var(--vm-mark);fill:#fff;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
.vm-face{display:flex;align-items:center;justify-content:center;background:#fff;transform:rotateY(180deg);
  transition:opacity .3s ease .7s}
.vm-emoji{font-family:${EMOJI_FONT};font-size:calc(var(--vm-w) * .5);line-height:1}
.vm-check{position:absolute;top:6%;right:6%;display:flex;align-items:center;justify-content:center;width:var(--vm-badge);
  height:var(--vm-badge);border-radius:999px;background:#ffc93c;box-shadow:0 2px 5px rgba(0,0,0,.28);transform:scale(0);
  transition:transform .2s cubic-bezier(.2,.8,.2,1) ${FLIP_MS}ms}
.vm-check svg{width:62%;height:62%;fill:none;stroke:#141414;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.vm-matched .vm-check{transform:none}
.vm-matched .vm-face{opacity:.78}
@media (prefers-reduced-motion: reduce){.vm-inner{transition:none}}
`;

interface Card {
  emoji: string;
  el: HTMLButtonElement;
  up: boolean;
  matched: boolean;
}

type Phase = "intro" | "preview" | "play" | "won";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: HTMLElement) {
  const node = document.createElement(tag);
  node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

function svgIcon(d: string, className: string) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (className) svg.setAttribute("class", className);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  return svg;
}

/** Distinct emoji, at most MAX_PAIRS, topped up from ITEMS so the deck always has MIN_PAIRS..MAX_PAIRS pairs. */
function pickPairs(pairs: readonly string[]): string[] {
  const picked = [...new Set(pairs)].slice(0, MAX_PAIRS);
  for (const item of ITEMS) {
    if (picked.length >= MIN_PAIRS) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}

/** Fisher–Yates, in place. */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A CSS url() value; JSON string escaping is also valid CSS string escaping for quotes and backslashes. */
function cssUrl(url: string) {
  return `url(${JSON.stringify(url)})`;
}

/** Resolves true once the photo loads, false when there is none or it fails (the backs then use the red pattern). */
function probePhoto(url: string | null, cleanups: (() => void)[]): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  const img = new Image();
  cleanups.push(() => {
    img.onload = null;
    img.onerror = null;
  });
  return new Promise((resolve) => {
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function buildCard(emoji: string) {
  const btn = el("button", "vm-card");
  btn.type = "button";
  const inner = el("span", "vm-inner", btn);
  const back = el("span", "vm-side vm-back", inner);
  back.appendChild(svgIcon(SPARKLE_PATH, "vm-mark"));
  const face = el("span", "vm-side vm-face", inner);
  el("span", "vm-emoji", face).textContent = emoji;
  el("span", "vm-check", face).appendChild(svgIcon(CHECK_PATH, ""));
  return btn;
}

function render(card: Card) {
  card.el.classList.toggle("vm-up", card.up || card.matched);
  card.el.classList.toggle("vm-matched", card.matched);
  card.el.setAttribute(
    "aria-label",
    card.matched ? `${card.emoji}, matched` : card.up ? `${card.emoji}, face up` : "Card, face down",
  );
}

export function mountGame(parent: HTMLElement, opts: MountGameOptions): () => void {
  let destroyed = false;
  let readyFired = false;
  let errorFired = false;
  const cleanups: (() => void)[] = [];
  const timers = new Set<number>();
  let clock = 0;

  function clearTimers() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  function stopClock() {
    if (clock) window.clearInterval(clock);
    clock = 0;
  }

  function fail(e: unknown) {
    if (destroyed || errorFired) return;
    errorFired = true;
    clearTimers();
    stopClock();
    console.error("[vibebook] memory game error", e);
    opts.onError?.(e);
  }

  /** Runs fn only while the game is alive, and reports a throw through onError instead of letting it escape. */
  function guard<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
    return (...args) => {
      if (destroyed || errorFired) return;
      try {
        fn(...args);
      } catch (e) {
        fail(e);
      }
    };
  }

  function later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      guard(fn)();
    }, ms);
    timers.add(id);
  }

  function fireReady() {
    if (destroyed || readyFired || errorFired) return;
    readyFired = true;
    opts.onReady();
  }

  function build() {
    const { spec, backgroundUrl } = opts;
    injectCss();
    const shell = createShell(parent, { backgroundUrl, tint: "dim" });
    cleanups.push(() => shell.destroy());
    const { hud } = shell;

    const board = el("div", "vm-board", shell.stage);
    const grid = el("div", "vm-grid", board);
    grid.inert = true;

    const pairs = pickPairs(spec.pairs);
    const total = pairs.length;
    let cards: Card[] = [];
    let phase: Phase = "intro";
    let open: Card | null = null; // first card of the pair being flipped
    let locked = false; // a wrong pair is showing
    let moves = 0;
    let found = 0;
    let startedAt = 0;
    let shownSeconds = 0;

    function layout() {
      const w = board.clientWidth;
      const h = board.clientHeight;
      if (w < 2 || h < 2) return; // hidden; keep the last size
      const cols = cards.length <= 12 ? 3 : 4;
      const rows = Math.ceil(cards.length / cols);
      const gap = Math.round(Math.min(12, Math.max(6, Math.min(w, h) * 0.022)));
      const cardW = Math.max(
        1,
        Math.floor(Math.min(MAX_CARD_W, (w - gap * (cols - 1)) / cols, ((h - gap * (rows - 1)) / rows) * 0.75)),
      );
      const s = board.style;
      s.setProperty("--vm-w", `${cardW}px`);
      s.setProperty("--vm-h", `${Math.floor((cardW * 4) / 3)}px`);
      s.setProperty("--vm-gap", `${gap}px`);
      s.setProperty("--vm-r", `${Math.max(6, Math.round(cardW * 0.09))}px`);
      s.setProperty("--vm-mark", `${Math.max(10, Math.round(cardW * 0.15))}px`);
      s.setProperty("--vm-badge", `${Math.max(18, Math.round(cardW * 0.24))}px`);
      grid.style.width = `${cols * cardW + (cols - 1) * gap}px`;
    }

    /** Shuffles a fresh deck onto the board, every card face down. */
    function deal() {
      clearTimers();
      cards = shuffle([...pairs, ...pairs]).map((emoji) => ({ emoji, el: buildCard(emoji), up: false, matched: false }));
      grid.textContent = "";
      for (const card of cards) {
        render(card);
        grid.appendChild(card.el);
      }
      open = null;
      locked = false;
      moves = 0;
      found = 0;
      layout();
    }

    function elapsedSeconds() {
      return Math.floor((performance.now() - startedAt) / 1000);
    }

    function startClock() {
      stopClock();
      startedAt = performance.now();
      shownSeconds = 0;
      hud.right(formatTime(0));
      clock = window.setInterval(
        guard(() => {
          const seconds = elapsedSeconds();
          if (seconds === shownSeconds) return;
          shownSeconds = seconds;
          hud.right(formatTime(seconds));
        }),
        250,
      );
    }

    function setAllUp(up: boolean) {
      for (const card of cards) {
        card.up = up;
        render(card);
      }
    }

    function startPlay() {
      phase = "play";
      grid.inert = false;
      startClock();
    }

    function begin(withPreview: boolean) {
      hud.show(true);
      hud.left(`Moves ${moves}`);
      hud.right(formatTime(0));
      hud.progress(0);
      if (!withPreview || reducedMotion()) {
        startPlay();
        return;
      }
      phase = "preview";
      setAllUp(true);
      later(FLIP_MS + PREVIEW_MS, () => {
        setAllUp(false);
        later(FLIP_MS, startPlay);
      });
    }

    function win() {
      phase = "won";
      grid.inert = true;
      const seconds = elapsedSeconds();
      stopClock();
      hud.right(formatTime(seconds));
      later(WIN_DELAY_MS, () => {
        shell.card(
          { headline: spec.winLine, sub: `${moves} moves · ${formatTime(seconds)}`, button: "Play again" },
          guard(() => {
            deal();
            begin(false);
          }),
        );
      });
    }

    function tap(card: Card) {
      if (phase !== "play" || locked || card.up || card.matched) return;
      card.up = true;
      render(card);
      if (!open) {
        open = card;
        return;
      }
      const first = open;
      open = null;
      moves += 1;
      hud.left(`Moves ${moves}`);
      if (first.emoji === card.emoji) {
        first.matched = true;
        card.matched = true;
        render(first);
        render(card);
        found += 1;
        hud.progress(found / total);
        if (found === total) win();
        return;
      }
      locked = true;
      later(MISMATCH_MS, () => {
        first.up = false;
        card.up = false;
        render(first);
        render(card);
        locked = false;
      });
    }

    // Buttons turn Enter / Space into click, so this one listener covers taps, clicks and the keyboard.
    const onClick = guard((e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest(".vm-card") : null;
      const card = target ? cards.find((c) => c.el === target) : undefined;
      if (card) tap(card);
    });
    grid.addEventListener("click", onClick);
    cleanups.push(() => grid.removeEventListener("click", onClick));

    const onResize = guard(layout);
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(onResize);
      ro.observe(board);
      cleanups.push(() => ro.disconnect());
    } else {
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));
    }

    deal();

    // Show the board and the start card together once the photo has settled, so the backs never
    // flash red before the photo arrives; onReady waits for that frame to be painted.
    Promise.all([shell.photoReady, probePhoto(backgroundUrl, cleanups)])
      .then(
        guard(([, photoOk]: [void, boolean]) => {
          if (photoOk && backgroundUrl) {
            board.style.setProperty("--vm-photo", cssUrl(backgroundUrl));
            board.classList.add("vm-photo");
          }
          board.classList.add("vm-shown");
          shell.card(
            {
              emoji: pairs[0],
              headline: spec.title,
              sub: spec.tagline,
              goal: `Find all ${total} pairs`,
              button: "Start",
              hint: "Tap two cards to flip them",
            },
            guard(() => begin(true)),
          );
          let raf = requestAnimationFrame(() => {
            raf = requestAnimationFrame(guard(fireReady));
          });
          cleanups.push(() => cancelAnimationFrame(raf));
        }),
      )
      .catch(fail);
  }

  try {
    build();
  } catch (e) {
    fail(e);
  }

  return () => {
    if (destroyed) return;
    destroyed = true;
    clearTimers();
    stopClock();
    for (const fn of cleanups.splice(0).reverse()) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  };
}
