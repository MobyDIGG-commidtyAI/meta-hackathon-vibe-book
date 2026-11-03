// VibeBook puzzle: the post photo cut into a 3×3 or 4×4 grid to put back together, either by swapping two
// tiles (tap one, then another) or by sliding tiles into the one empty slot. Built on the shared shell
// (game/shell.ts): the board lives in `stage`, the HUD shows moves, time and tiles in place, and the start /
// end cards are the shell's.
//
//   .vp-area     padded to clear the HUD chips and progress bar; layout() only measures it
//   .vp-board    the square board, placed and sized in whole pixels by layout()
//   .vp-tile     one per piece, moved with transform: translate(col × 100%, row × 100%)
//   .vp-face     the piece's crop of the photo, inset by --vp-g (the gap, which closes on win)
//   .vp-peek     the whole photo over the board while Peek is held, and once the puzzle is solved
//   .vp-slot     one transparent <button> per board position, in reading order, so taps and Tab follow the
//                grid while the tiles under them move (tiles are never reordered: that cancels transitions)
//   .vp-peekbtn  hold to peek
//
// Spec strings are only ever set with textContent.
import type { PuzzleSpec } from "@/lib/spec";
import { createShell, reducedMotion } from "./shell";

export interface MountGameOptions {
  spec: PuzzleSpec;
  backgroundUrl: string | null;
  /** Called exactly once, after the board's first frame is on screen. */
  onReady: () => void;
  /** Called at most once if the game throws. */
  onError?: (e: unknown) => void;
}

const MOVE_MS = 190; // a tile sliding to its new slot
const CLOSE_MS = 240; // the gaps closing on win
const HOLD_MS = 600; // the finished photo, seamless, before the end card
const SHUFFLE_MOVES = 150; // slide mode: random legal moves away from the solved board
const MAX_IN_PLACE = 2; // tiles allowed in their home slot after a shuffle
const PEEK_GAP = 12; // between the board and the Peek button
const FONT_WAIT_MS = 500; // how long the generated picture waits for the display font
const PICTURE_PX = 960; // the generated picture, which cuts evenly into 3 or 4 tiles

/** Ground and ink of the generated picture, picked by the title so a post always gets the same pair. */
const PALETTES: [string, string][] = [
  ["#d7322a", "#ffc93c"],
  ["#141414", "#ffc93c"],
  ["#1d4ed8", "#fff4e0"],
  ["#0f6b55", "#ffd6c4"],
];

/** The key names the way the tile moves, so the tile comes from the gap's other side: [row, col] from the gap. */
const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [1, 0],
  ArrowDown: [-1, 0],
  ArrowLeft: [0, 1],
  ArrowRight: [0, -1],
};

// Board sizes come from layout() as custom properties on .vp-board (--vp-cell) and inline background sizes.
const CSS = `
.vp-area{position:absolute;inset:0;visibility:hidden;pointer-events:none;
  padding:calc(max(10px,env(safe-area-inset-top)) + 58px) max(12px,env(safe-area-inset-right))
    max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
.vp-board{position:absolute;left:0;top:0;visibility:hidden;--vp-g:1px;border-radius:5px;background:rgba(0,0,0,.4);
  box-shadow:0 14px 34px rgba(0,0,0,.45)}
.vp-board.vp-won{--vp-g:0px}
.vp-tile{position:absolute;left:0;top:0;z-index:1;width:var(--vp-cell);height:var(--vp-cell);pointer-events:none;
  transition:transform ${MOVE_MS}ms cubic-bezier(.2,.8,.2,1)}
.vp-tile.vp-top{z-index:2}
.vp-tile.vp-sel{z-index:3}
.vp-face{position:absolute;inset:var(--vp-g);border-radius:3px;background-color:#3a3a3a;background-image:var(--vp-img);
  background-repeat:no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);
  transition:transform .16s cubic-bezier(.2,.8,.2,1),inset ${CLOSE_MS}ms ease,background-position ${CLOSE_MS}ms ease,
    border-radius ${CLOSE_MS}ms ease,box-shadow ${CLOSE_MS}ms ease,opacity ${CLOSE_MS}ms ease}
.vp-sel .vp-face{transform:translateY(-3px) scale(1.04);outline:3px solid #fff;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.2),0 10px 18px rgba(0,0,0,.4)}
.vp-hole .vp-face{opacity:0}
.vp-won .vp-face{border-radius:0;box-shadow:none}
.vp-peek{position:absolute;inset:0;z-index:4;border-radius:5px;background-color:#3a3a3a;background-image:var(--vp-img);
  background-repeat:no-repeat;opacity:0;pointer-events:none;transition:opacity .12s ease}
.vp-peeking .vp-peek{opacity:1}
.vp-whole .vp-peek{opacity:1;border-radius:0}
.vp-slot{position:absolute;left:0;top:0;z-index:5;width:var(--vp-cell);height:var(--vp-cell);margin:0;padding:0;border:0;
  border-radius:3px;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}
.vp-slot:focus{outline:none}
.vp-slot:focus-visible{outline:3px solid #ffc93c;outline-offset:-2px}
.vp-board[inert] .vp-slot{cursor:default}
.vp-still .vp-tile,.vp-still .vp-face{transition:none}
.vp-peekbtn{position:absolute;left:0;top:0;visibility:hidden;min-width:44px;min-height:44px;margin:0;padding:0 20px;border:0;
  border-radius:999px;background:#fff;color:#141414;font:inherit;font-weight:800;font-size:15px;cursor:pointer;
  box-shadow:0 4px 12px rgba(0,0,0,.28);-webkit-appearance:none;appearance:none;-webkit-touch-callout:none}
.vp-peekbtn[aria-pressed="true"]{background:#141414;color:#fff}
.vp-peekbtn:focus{outline:none}
.vp-peekbtn:focus-visible{outline:3px solid #ffc93c;outline-offset:2px}
.vp-board.vp-shown,.vp-peekbtn.vp-shown{visibility:visible}
`;

type Phase = "intro" | "play" | "won";

interface Picture {
  src: string;
  width: number;
  height: number;
}

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

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A CSS url() value; JSON string escaping is also valid CSS string escaping for quotes and backslashes. */
function cssUrl(url: string) {
  return `url(${JSON.stringify(url)})`;
}

// ---- model --------------------------------------------------------------------------------------------
// slots[pos] is the id of the tile at board position pos, and a tile's id is its home position. In slide
// mode the bottom-right tile (id count - 1) is the missing one, so wherever it sits is the empty slot.

function solvedSlots(count: number) {
  return Array.from({ length: count }, (_, i) => i);
}

/** Tiles at their home position, not counting slide mode's missing tile. */
function countInPlace(slots: number[], missing: number | null) {
  let n = 0;
  for (let pos = 0; pos < slots.length; pos++) if (slots[pos] === pos && slots[pos] !== missing) n++;
  return n;
}

function neighbours(pos: number, n: number) {
  const row = Math.floor(pos / n);
  const col = pos % n;
  const out: number[] = [];
  if (row > 0) out.push(pos - n);
  if (row < n - 1) out.push(pos + n);
  if (col > 0) out.push(pos - 1);
  if (col < n - 1) out.push(pos + 1);
  return out;
}

/** Swap mode: a random permutation with at most MAX_IN_PLACE tiles at home. About 9 draws in 10 pass. */
function shuffleSwap(count: number) {
  for (;;) {
    const slots = solvedSlots(count);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    if (countInPlace(slots, null) <= MAX_IN_PLACE) return slots;
  }
}

/**
 * Slide mode: random legal moves from the solved board, so the result is always solvable. It never steps
 * straight back, and keeps going past SHUFFLE_MOVES until at most MAX_IN_PLACE tiles are home.
 */
function shuffleSlide(n: number) {
  const count = n * n;
  const missing = count - 1;
  const slots = solvedSlots(count);
  let gap = missing;
  let previous = -1;
  for (let moves = 0; moves < SHUFFLE_MOVES || countInPlace(slots, missing) > MAX_IN_PLACE; moves++) {
    const options = neighbours(gap, n).filter((pos) => pos !== previous);
    const from = options[Math.floor(Math.random() * options.length)];
    slots[gap] = slots[from];
    slots[from] = missing;
    previous = gap;
    gap = from;
  }
  return slots;
}

// ---- picture ------------------------------------------------------------------------------------------

/** Resolves with the photo's natural size once it loads, or null when there is none or it fails. */
function probePhoto(url: string | null, cleanups: (() => void)[]): Promise<Picture | null> {
  if (!url) return Promise.resolve(null);
  const img = new Image();
  cleanups.push(() => {
    img.onload = null;
    img.onerror = null;
  });
  return new Promise((resolve) => {
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      resolve(width > 0 && height > 0 ? { src: url, width, height } : null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The stand-in picture when there is no usable photo: bold concentric bands in two colours, so every tile has
 * its own curve to match, with the title across them in large type, inverted wherever it crosses a band.
 */
function paintPicture(title: string, family: string): Picture {
  const size = PICTURE_PX;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");

  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  const [ground, ink] = PALETTES[hash % PALETTES.length];

  // Even-odd rings; `outside` adds the frame, which flips them into their complement for the inverted title.
  const bands = new Path2D();
  const outside = new Path2D();
  outside.rect(0, 0, size, size);
  const cx = size * 0.64;
  const cy = size * 0.36;
  const step = size * 0.12;
  const reach = Math.hypot(cx, size - cy); // to the farthest corner
  for (let r = step; r < reach; r += step) {
    for (const path of [bands, outside]) {
      path.moveTo(cx + r, cy);
      path.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ink;
  ctx.fill(bands, "evenodd");

  // Dela Gothic One only has a 400 face; the system fallback needs a heavy weight to read as bold.
  const font = (px: number) =>
    family ? `400 ${px}px ${family}, system-ui, sans-serif` : `800 ${px}px system-ui, sans-serif`;
  const maxWidth = size * 0.86;
  const words = title.trim().split(/\s+/);
  let px = 200;
  let lines: string[] = [];
  for (; ; px -= 8) {
    ctx.font = font(px);
    lines = wrapWords(ctx, words, maxWidth);
    if (px <= 64 || (lines.length <= 3 && lines.every((line) => ctx.measureText(line).width <= maxWidth))) break;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = px * 1.1;
  const top = size / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (const [color, clip] of [
    [ground, bands],
    [ink, outside],
  ] as const) {
    ctx.save();
    ctx.clip(clip, "evenodd");
    ctx.fillStyle = color;
    // maxWidth squeezes a line that is still too wide at the smallest size, such as a long unspaced title.
    lines.forEach((line, i) => ctx.fillText(line, size / 2, top + i * lineHeight, maxWidth));
    ctx.restore();
  }
  return { src: canvas.toDataURL("image/png"), width: size, height: size };
}

// ---- game ---------------------------------------------------------------------------------------------

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
    console.error("[vibebook] puzzle game error", e);
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

  function listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ) {
    const handler = guard(fn) as EventListener;
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  }

  function fireReady() {
    if (destroyed || readyFired || errorFired) return;
    readyFired = true;
    opts.onReady();
  }

  /** The display font's family list (canvas can't read a CSS variable), once it has loaded or FONT_WAIT_MS passed. */
  async function displayFamily(root: HTMLElement, title: string) {
    const family = getComputedStyle(root).getPropertyValue("--font-display").trim();
    if (family && document.fonts) {
      await Promise.race([
        document.fonts.load(`400 100px ${family}`, title).catch(() => undefined),
        new Promise<void>((resolve) => later(FONT_WAIT_MS, resolve)),
      ]);
    }
    return family;
  }

  function build() {
    const { spec, backgroundUrl } = opts;
    injectCss();
    const shell = createShell(parent, { backgroundUrl, tint: "dim" });
    cleanups.push(() => shell.destroy());
    const { hud, stage } = shell;

    const n = spec.grid;
    const count = n * n;
    const slide = spec.mode === "slide";
    const missing = slide ? count - 1 : null; // slide mode's removed tile; its home is the bottom-right slot
    const pieces = slide ? count - 1 : count;

    const area = el("div", "vp-area", stage);
    const board = el("div", "vp-board", stage);
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", "Puzzle");
    board.inert = true;
    const tiles: HTMLDivElement[] = [];
    const faces: HTMLDivElement[] = [];
    for (let id = 0; id < count; id++) {
      const tile = el("div", "vp-tile", board);
      faces.push(el("div", "vp-face", tile));
      tiles.push(tile);
    }
    const peekLayer = el("div", "vp-peek", board);
    const slotEls: HTMLButtonElement[] = [];
    for (let pos = 0; pos < count; pos++) {
      const slot = el("button", "vp-slot", board);
      slot.type = "button";
      slot.style.transform = `translate(${(pos % n) * 100}%, ${Math.floor(pos / n) * 100}%)`;
      // Buttons turn Enter / Space into click, so this one listener covers taps, clicks and the keyboard.
      listen(slot, "click", () => tap(pos));
      slotEls.push(slot);
    }
    const peekBtn = el("button", "vp-peekbtn", stage);
    peekBtn.type = "button";
    peekBtn.textContent = "Peek";
    peekBtn.setAttribute("aria-pressed", "false");
    peekBtn.inert = true;

    let picture: Picture | null = null;
    let slots = solvedSlots(count);
    let phase: Phase = "intro";
    let selected: number | null = null; // swap mode: board position of the picked-up tile
    let raised: number[] = []; // tiles drawn above the rest while they move
    let moves = 0;
    let startedAt = 0;
    let shownSeconds = 0;
    let peeking = false;

    function layout() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w < 2 || h < 2) return; // hidden; keep the last size
      const pad = getComputedStyle(area);
      const top = parseFloat(pad.paddingTop) || 0;
      const right = parseFloat(pad.paddingRight) || 0;
      const bottom = parseFloat(pad.paddingBottom) || 0;
      const left = parseFloat(pad.paddingLeft) || 0;
      const availW = Math.min(w * 0.92, w - left - right);
      const availH = h - top - bottom;
      const peekW = peekBtn.offsetWidth;
      const peekH = peekBtn.offsetHeight;
      // Peek goes under the board, or beside it (a wide, short frame such as a landscape phone) when that
      // leaves a bigger board. Beside keeps the board centred, so the width is reserved on both sides.
      const below = Math.min(availW, availH - peekH - PEEK_GAP);
      const beside = Math.min(availH, availW - 2 * (peekW + PEEK_GAP));
      const side = beside > below;
      // Whole-pixel cells, so the tiles meet without seams once the gaps close.
      const cell = Math.max(1, Math.floor((side ? beside : below) / n));
      const size = cell * n;
      const x = Math.round(left + (w - left - right - size) / 2);
      let y: number;
      if (side) {
        y = Math.round(top + (availH - size) / 2);
        peekBtn.style.left = `${x + size + PEEK_GAP}px`;
        peekBtn.style.top = `${y + size - peekH}px`;
      } else {
        y = Math.round(top + Math.max(0, availH - size - PEEK_GAP - peekH) / 2);
        peekBtn.style.left = `${Math.round(x + (size - peekW) / 2)}px`;
        peekBtn.style.top = `${y + size + PEEK_GAP}px`;
      }

      board.classList.add("vp-still"); // a resize should not animate the tiles' backgrounds
      const s = board.style;
      s.left = `${x}px`;
      s.top = `${y}px`;
      s.width = `${size}px`;
      s.height = `${size}px`;
      s.setProperty("--vp-cell", `${cell}px`);
      if (picture) {
        // Cover-crop the picture into the board, in whole pixels; tiles and Peek share these numbers so the
        // finished board lines up exactly with the peek view.
        const scale = size / Math.min(picture.width, picture.height);
        const bgW = Math.round(picture.width * scale);
        const bgH = Math.round(picture.height * scale);
        const offX = Math.round((bgW - size) / 2);
        const offY = Math.round((bgH - size) / 2);
        const bgSize = `${bgW}px ${bgH}px`;
        for (let id = 0; id < count; id++) {
          const fs = faces[id].style;
          const bx = -(offX + (id % n) * cell);
          const by = -(offY + Math.floor(id / n) * cell);
          fs.backgroundSize = bgSize;
          // The face is inset by the gap, so its crop shifts by the gap too and stays put as the gap closes.
          fs.backgroundPosition = `calc(${bx}px - var(--vp-g)) calc(${by}px - var(--vp-g))`;
        }
        peekLayer.style.backgroundSize = bgSize;
        peekLayer.style.backgroundPosition = `${-offX}px ${-offY}px`;
      }
      void board.offsetWidth; // apply the new sizes without transitions before turning them back on
      board.classList.remove("vp-still");
    }

    function hideMissing(hidden: boolean) {
      if (missing !== null) tiles[missing].classList.toggle("vp-hole", hidden);
    }

    function render() {
      for (let pos = 0; pos < count; pos++) {
        const id = slots[pos];
        tiles[id].style.transform = `translate(${(pos % n) * 100}%, ${Math.floor(pos / n) * 100}%)`;
        tiles[id].classList.toggle("vp-sel", pos === selected);
        const slot = slotEls[pos];
        const empty = id === missing && phase === "play";
        slot.tabIndex = empty ? -1 : 0;
        slot.setAttribute("aria-label", empty ? "Empty slot" : `Piece ${id + 1}${id === pos ? ", in place" : ""}`);
        if (!slide) slot.setAttribute("aria-pressed", String(pos === selected));
      }
      hud.left(`Moves ${moves}`);
      hud.progress(countInPlace(slots, missing) / pieces);
    }

    /** Draws the tiles that just moved above the others, so a long slide passes over its neighbours. */
    function raise(ids: number[]) {
      for (const id of raised) tiles[id].classList.remove("vp-top");
      for (const id of ids) tiles[id].classList.add("vp-top");
      raised = ids;
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

    function setPeek(on: boolean) {
      if (peeking === on) return;
      peeking = on;
      board.classList.toggle("vp-peeking", on);
      peekBtn.setAttribute("aria-pressed", String(on));
    }

    /** Shuffles the board and starts the moves and the clock. Used by Start and Play again. */
    function begin() {
      slots = slide ? shuffleSlide(n) : shuffleSwap(count);
      phase = "play";
      selected = null;
      moves = 0;
      raise([]);
      board.classList.remove("vp-won", "vp-whole");
      hideMissing(true);
      board.inert = false;
      peekBtn.inert = false;
      render();
      hud.show(true);
      startClock();
      // The card's button is hidden now; keep the focus in the game so the arrow keys and Tab still work.
      shell.root.focus({ preventScroll: true });
    }

    function win() {
      phase = "won";
      board.inert = true;
      peekBtn.inert = true;
      setPeek(false);
      const seconds = elapsedSeconds();
      stopClock();
      hud.right(formatTime(seconds));
      const still = reducedMotion();
      // Let the last tile land, close the gaps (the missing tile returns), then hold the whole photo. Once the
      // gaps are shut the peek layer covers the tiles: crops drawn edge to edge can still show hairline seams
      // where the browser filters an upscaled photo, and the peek layer is one seamless image in the same place.
      later(still ? 0 : MOVE_MS, () => {
        board.classList.add("vp-won");
        hideMissing(false);
        later(still ? 0 : CLOSE_MS, () => {
          board.classList.add("vp-whole");
          later(HOLD_MS, () => {
            shell.card(
              {
                headline: spec.winLine,
                sub: `${moves} ${moves === 1 ? "move" : "moves"} · ${formatTime(seconds)}`,
                button: "Play again",
              },
              guard(begin),
            );
          });
        });
      });
    }

    function move(a: number, b: number) {
      [slots[a], slots[b]] = [slots[b], slots[a]];
      raise([slots[a], slots[b]]);
      moves += 1;
      render();
      if (countInPlace(slots, missing) === pieces) win();
    }

    function tap(pos: number) {
      if (phase !== "play") return;
      if (slide) {
        const gap = slots.indexOf(count - 1);
        if (neighbours(gap, n).includes(pos)) move(pos, gap);
        return;
      }
      if (selected === null || selected === pos) {
        selected = selected === null ? pos : null; // pick up, or put the same tile back down
        render();
        return;
      }
      const from = selected;
      selected = null;
      move(from, pos);
    }

    listen(shell.root, "keydown", (e) => {
      if (!slide || phase !== "play" || e.altKey || e.ctrlKey || e.metaKey) return;
      const step = ARROWS[e.key];
      if (!step) return;
      e.preventDefault();
      const gap = slots.indexOf(count - 1);
      const row = Math.floor(gap / n) + step[0];
      const col = (gap % n) + step[1];
      if (row >= 0 && row < n && col >= 0 && col < n) move(row * n + col, gap);
    });

    // Peek shows the whole photo for as long as the button is held, by pointer or by keyboard.
    listen(peekBtn, "pointerdown", (e) => {
      if (phase !== "play" || (e.pointerType === "mouse" && e.button !== 0)) return;
      try {
        peekBtn.setPointerCapture(e.pointerId);
      } catch {
        /* the release events still end the peek */
      }
      setPeek(true);
    });
    const release = () => setPeek(false);
    listen(peekBtn, "pointerup", release);
    listen(peekBtn, "pointercancel", release);
    listen(peekBtn, "lostpointercapture", release);
    listen(peekBtn, "blur", release);
    listen(peekBtn, "keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (phase === "play") setPeek(true);
    });
    listen(peekBtn, "keyup", (e) => {
      if (e.key === " " || e.key === "Enter") setPeek(false);
    });
    listen(peekBtn, "contextmenu", (e) => e.preventDefault()); // a long press would open the menu on touch

    const ro = new ResizeObserver(guard(layout));
    ro.observe(stage);
    cleanups.push(() => ro.disconnect());

    render();
    hud.show(false);
    hud.progress(null);
    layout();

    // Show the board and the start card together once the picture is ready, so the tiles never appear
    // empty; onReady waits for that frame to be painted.
    Promise.all([probePhoto(backgroundUrl, cleanups), shell.photoReady])
      .then(async ([photo]) => {
        if (photo) return photo;
        const family = await displayFamily(shell.root, spec.title);
        return paintPicture(spec.title, family);
      })
      .then(
        guard((next: Picture) => {
          picture = next;
          board.style.setProperty("--vp-img", cssUrl(next.src));
          layout();
          board.classList.add("vp-shown");
          peekBtn.classList.add("vp-shown");
          shell.card(
            {
              emoji: "🧩",
              headline: spec.title,
              sub: spec.tagline,
              goal: slide ? "Slide tiles to rebuild the photo" : "Swap tiles to rebuild the photo",
              button: "Start",
              hint: "Hold Peek to see the full photo",
            },
            guard(begin),
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
