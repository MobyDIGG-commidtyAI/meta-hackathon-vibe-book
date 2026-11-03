// VibeBook catch game: a catcher at the bottom collects the spec's falling good items and dodges the bad
// ones.
//
// Built on the shared frame in game/shell.ts: the shell owns the photo, the timeOfDay tint, the HUD chips,
// the progress bar and the start / end cards. This module owns one 2D canvas inside `shell.stage`, the
// loop and the input. No Phaser: a dozen cached emoji sprites don't need a game engine.
//
// Positions are stored normalized (x as a fraction of the play field's width, y as a fraction of its
// height) so a resize or a phone rotation mid-run never teleports anything. Spec strings only reach the
// page through the shell (textContent) or canvas fillText.
import type { CatchSpec } from "@/lib/spec";
import { createShell, EMOJI_FONT, reducedMotion } from "@/game/shell";

type Speed = CatchSpec["speed"];
type GoalType = CatchSpec["goal"]["type"];

export interface MountGameOptions {
  spec: CatchSpec;
  backgroundUrl: string | null;
  /** Called exactly once, after the first frame is on screen. */
  onReady: () => void;
  /** Called at most once if the game fails to start or crashes at runtime. */
  onError?: (e: unknown) => void;
}

// ---------------------------------------------------------------------------------------------
// Tuning tables. Every enum in the spec has an entry; Record<> makes tsc fail on a missing one.
// ---------------------------------------------------------------------------------------------

/** fall: field heights per second at the start of a run. spawn: seconds between items at the start. */
const SPEEDS: Record<Speed, { fall: number; spawn: number }> = {
  chill: { fall: 0.24, spawn: 1.0 },
  normal: { fall: 0.3, spawn: 0.82 },
  fast: { fall: 0.38, spawn: 0.68 },
  insane: { fall: 0.48, spawn: 0.55 },
};

/**
 * The model may pick any target in 10..300. Clamp to something winnable in a demo session; the clamped
 * value is what the HUD and cards show. bad: chance that a spawn is a bad item, at the start and at the
 * end of the ramp (survive runs are about dodging, so they get more).
 */
const GOALS: Record<GoalType, { min: number; max: number; bad: [number, number] }> = {
  score: { min: 10, max: 80, bad: [0.28, 0.36] },
  survive: { min: 15, max: 120, bad: [0.36, 0.46] },
};

const RAMP_SECONDS = 75; // the difficulty ramp reaches full strength after this much play
const RAMP_FALL = 0.45; // fall speed grows by up to +45%
const RAMP_SPAWN = 0.3; // the gap between spawns shrinks by up to -30%
const GRACE = 1.5; // seconds at the start of a run with no bad items
const FIRST_SPAWN = 0.45; // seconds before the first item

const LIVES = 3;
const BASE_W = 440; // sizes below are tuned for a 440 x 590 panel and scale from there
const BASE_H = 590;
const FIELD_MAX_ASPECT = 0.9; // on wide screens the play field is a centred column no wider than this * height
const ITEM_MIN = 46; // item glyph size (px on the base panel)
const ITEM_MAX = 56;
const CATCHER_SIZE = 66;
const CATCHER_Y = 0.86; // catcher centre as a fraction of height: about 14% up from the bottom
const KEY_SPEED = 1.15; // field widths per second
const FOLLOW_RATE = 28; // how sharply the catcher follows the pointer (1/s)

const END_DELAY = 0.6; // seconds between the last catch / hit and the end card
const POP_TIME = 0.7;
const POP_RISE = 28; // px on the base panel
const SHAKE_TIME = 0.32;
const SHAKE_PX = 7;
const BOUNCE_TIME = 0.22;

const MAX_DT = 0.05;
const MAX_CANVAS_PIXELS = 2_600_000;
const SPRITE_PAD = 1.3; // sprite canvas side / glyph size, so no emoji clips at its edges
const HIT_EMOJI = "💔";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fmtClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The shell's motion curve, cubic-bezier(.2,.8,.2,1), for motion drawn on the canvas. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p; // Newton's method on x(t) = p
    for (let i = 0; i < 6; i++) {
      const err = ((ax * t + bx) * t + cx) * t - p;
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(err) < 1e-4 || slope === 0) break;
      t = clamp(t - err / slope, 0, 1);
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const ease = cubicBezier(0.2, 0.8, 0.2, 1);

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

let scratch: CanvasRenderingContext2D | null = null;

/**
 * Font metrics describe the em box, not the drawn pixels (some emoji sit low or off-centre in it), so
 * measure the ink once and return the nudge that centres it. [0, 0] if readback is blocked.
 */
function inkOffset(emoji: string, font: string, side: number, x: number, y: number, baseline: CanvasTextBaseline) {
  try {
    if (!scratch) scratch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const g = scratch;
    if (!g) return [0, 0];
    if (g.canvas.width < side || g.canvas.height < side) {
      g.canvas.width = side;
      g.canvas.height = side;
    }
    g.clearRect(0, 0, side, side);
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = baseline;
    g.fillText(emoji, x, y);
    const data = g.getImageData(0, 0, side, side).data;
    let x0 = side;
    let y0 = side;
    let x1 = -1;
    let y1 = -1;
    for (let py = 0; py < side; py++) {
      for (let px = 0; px < side; px++) {
        if (data[(py * side + px) * 4 + 3] > 40) {
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        }
      }
    }
    if (x1 < 0) return [0, 0];
    const dx = side / 2 - (x0 + x1 + 1) / 2;
    const dy = side / 2 - (y0 + y1 + 1) / 2;
    // A noisy readback (anti-fingerprinting) can report nonsense bounds; never trust a big nudge.
    return Math.abs(dx) > side * 0.2 || Math.abs(dy) > side * 0.2 ? [0, 0] : [dx, dy];
  } catch {
    return [0, 0];
  }
}

interface Falling {
  emoji: string;
  bad: boolean;
  x: number; // centre, fraction of field width
  y: number; // centre, fraction of height
  size: number; // glyph size in px on the base panel
  speed: number; // field heights per second
  tilt: number; // radians, fixed per item
}

interface Pop {
  x: number; // fraction of field width
  y: number; // fraction of height
  at: number; // fx clock when it appeared
  text: string | null; // "+1", or null for an emoji pop
  emoji: string | null;
}

type Phase = "ready" | "playing" | "over";

export function mountGame(parent: HTMLElement, opts: MountGameOptions): () => void {
  const { spec } = opts;
  const goalType: GoalType = spec.goal.type === "survive" ? "survive" : "score";
  const goal = GOALS[goalType];
  const target = clamp(Math.round(spec.goal.target), goal.min, goal.max);
  const speed = SPEEDS[spec.speed] ?? SPEEDS.normal;
  const good: readonly string[] = spec.good;
  const bad: readonly string[] = spec.bad;
  const label = spec.scoreLabel;

  let destroyed = false;
  let readyFired = false;
  let errorFired = false;
  let raf = 0;
  let readyRaf = 0;
  let last = 0;
  const cleanups: (() => void)[] = [];

  const shell = createShell(parent, { backgroundUrl: opts.backgroundUrl, tint: spec.timeOfDay });
  const stage = shell.stage;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  stage.appendChild(canvas);

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  function fail(e: unknown) {
    if (destroyed || errorFired) return;
    errorFired = true;
    console.error("[vibebook] catch game error", e);
    stopLoop();
    opts.onError?.(e);
  }

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    stopLoop();
    if (readyRaf) cancelAnimationFrame(readyRaf);
    readyRaf = 0;
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    shell.destroy();
  };

  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    fail(new Error("Canvas 2D is not available"));
    return destroy;
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;

  /** Runs fn, routing any throw to fail(); a no-op once destroyed or failed. */
  const guard =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A): void => {
      if (destroyed || errorFired) return;
      try {
        fn(...args);
      } catch (e) {
        fail(e);
      }
    };

  // ---- state ----------------------------------------------------------------------------------
  let phase: Phase = "ready";
  let items: Falling[] = [];
  let pops: Pop[] = [];
  let caught = 0;
  let lives = LIVES;
  let elapsed = 0; // seconds of play in this run (frozen once it ends)
  let clock = 0; // seconds of animation; keeps ticking so end-of-run effects finish
  let spawnIn = FIRST_SPAWN;
  let catcherX = 0.5; // fraction of field width
  let pointerTarget: number | null = null;
  let activePointer: number | null = null;
  let keyLeft = false;
  let keyRight = false;
  let shakeAt = -1;
  let bounceAt = -1;
  let overIn = 0; // countdown to the end card
  let won = false;
  let lastBad: string | null = null;
  let motion = !reducedMotion();

  // ---- layout ---------------------------------------------------------------------------------
  let W = 0;
  let H = 0;
  let dpr = 1;
  let fieldX = 0;
  let fieldW = 1;
  let u = 1; // px per base-panel px
  const sprites = new Map<string, HTMLCanvasElement>();
  const uiFont = getComputedStyle(shell.root).fontFamily || "system-ui,sans-serif";

  /** Measures the stage and sizes the canvas backing store. False while the stage has no size. */
  function layout(): boolean {
    const rect = stage.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return false; // hidden; keep the last size
    const device = typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const r = Math.max(1, Math.min(device, 2, Math.sqrt(MAX_CANVAS_PIXELS / (w * h))));
    const bw = Math.round(w * r);
    const bh = Math.round(h * r);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    const fw = Math.min(w, h * FIELD_MAX_ASPECT);
    const nextU = clamp(Math.min(fw / BASE_W, h / BASE_H), 0.8, 1.4);
    if (r !== dpr || nextU !== u) sprites.clear();
    W = w;
    H = h;
    dpr = r;
    fieldW = fw;
    fieldX = (w - fw) / 2;
    u = nextU;
    return true;
  }

  const fx = (frac: number) => fieldX + frac * fieldW;

  /** An emoji drawn once into its own canvas, glyph `size` CSS px, at device resolution. */
  function sprite(emoji: string, size: number): HTMLCanvasElement {
    const px = Math.max(8, Math.round(size * dpr));
    const key = `${emoji}|${px}`;
    const cached = sprites.get(key);
    if (cached) return cached;
    const side = Math.ceil(px * SPRITE_PAD);
    const c = document.createElement("canvas");
    c.width = side;
    c.height = side;
    const g = c.getContext("2d");
    if (!g) throw new Error("Canvas 2D is not available");
    const font = `${px}px ${EMOJI_FONT}`;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    const m = g.measureText(emoji);
    let x = side / 2;
    let y = side / 2;
    if (Number.isFinite(m.actualBoundingBoxAscent) && m.actualBoundingBoxAscent + m.actualBoundingBoxDescent > 0) {
      y = side / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    } else {
      g.textBaseline = "middle";
    }
    if (Number.isFinite(m.actualBoundingBoxLeft) && m.actualBoundingBoxLeft + m.actualBoundingBoxRight > 0) {
      x = side / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    }
    const [dx, dy] = inkOffset(emoji, font, side, x, y, g.textBaseline);
    g.fillText(emoji, x + dx, y + dy);
    sprites.set(key, c);
    return c;
  }

  /** Draws a cached emoji centred on (cx, cy) at glyph size `size`, from a sprite baked at `bake`. */
  function drawEmoji(emoji: string, bake: number, size: number, cx: number, cy: number, tilt = 0) {
    const c = sprite(emoji, bake);
    const side = (c.width / dpr) * (size / bake);
    if (tilt) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.drawImage(c, -side / 2, -side / 2, side, side);
      ctx.restore();
    } else {
      ctx.drawImage(c, cx - side / 2, cy - side / 2, side, side);
    }
  }

  // ---- drawing --------------------------------------------------------------------------------
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (W < 2 || H < 2) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (motion && shakeAt >= 0 && clock - shakeAt < SHAKE_TIME) {
      const p = (clock - shakeAt) / SHAKE_TIME;
      ctx.translate(SHAKE_PX * u * (1 - ease(p)) * Math.sin(p * Math.PI * 6), 0);
    }

    const itemBake = ITEM_MAX * u;
    for (const it of items) drawEmoji(it.emoji, itemBake, it.size * u, fx(it.x), it.y * H, it.tilt);

    const cs = CATCHER_SIZE * u;
    let scale = 1;
    if (motion && bounceAt >= 0 && clock - bounceAt < BOUNCE_TIME) {
      scale = 1 + 0.12 * (1 - ease((clock - bounceAt) / BOUNCE_TIME));
    }
    drawEmoji(spec.catcher, cs, cs * scale, fx(catcherX), CATCHER_Y * H);

    for (const p of pops) {
      const t = (clock - p.at) / POP_TIME;
      const rise = motion ? POP_RISE * u * ease(t) : 0;
      const grow = motion ? 0.6 + 0.4 * ease(Math.min(1, t / 0.35)) : 1;
      const x = fx(p.x);
      const y = p.y * H - rise;
      ctx.globalAlpha = t < 0.45 ? 1 : clamp(1 - (t - 0.45) / 0.55, 0, 1);
      if (p.text) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(grow, grow);
        ctx.font = `800 ${Math.round(24 * u)}px ${uiFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 4 * u;
        ctx.strokeStyle = "#141414";
        ctx.fillStyle = "#ffc93c";
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      } else if (p.emoji) {
        const s = 30 * u;
        drawEmoji(p.emoji, s, s * grow, x, y);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- HUD ------------------------------------------------------------------------------------
  let hudLeft = "";
  let hudRight = "";
  let hudProgress = -1;

  function updateHud() {
    const left = goalType === "score" ? `${caught} / ${target} ${label}` : `${caught} ${label}`;
    const alive = clamp(lives, 0, LIVES);
    const hearts = "❤️".repeat(alive) + "🤍".repeat(LIVES - alive);
    const right = goalType === "survive" ? `${hearts} · ${fmtClock(Math.ceil(target - elapsed))}` : hearts;
    const raw = goalType === "score" ? caught / target : elapsed / target;
    const progress = Math.round(clamp(raw, 0, 1) * 200) / 200; // the bar eases; don't retarget it every frame
    if (left !== hudLeft) shell.hud.left((hudLeft = left));
    if (right !== hudRight) shell.hud.right((hudRight = right));
    if (progress !== hudProgress) shell.hud.progress((hudProgress = progress));
  }

  // ---- game -----------------------------------------------------------------------------------
  const ramp = () => Math.min(1, elapsed / RAMP_SECONDS);

  function spawn() {
    const badChance = goal.bad[0] + (goal.bad[1] - goal.bad[0]) * ramp();
    const isBad = bad.length > 0 && elapsed > GRACE && Math.random() < badChance;
    const size = rand(ITEM_MIN, ITEM_MAX);
    const s = size * u;
    const half = Math.min(0.5, s / 2 / fieldW);
    // Don't drop a new item onto one that is still entering the field.
    const crowded = (x: number) => items.some((o) => o.y * H < s * 1.6 && Math.abs(o.x - x) * fieldW < s * 1.1);
    let x = rand(half, 1 - half);
    for (let i = 0; i < 6 && crowded(x); i++) x = rand(half, 1 - half);
    items.push({
      emoji: pick(isBad ? bad : good),
      bad: isBad,
      x,
      y: -(s * 0.6) / H,
      size,
      speed: speed.fall * (1 + RAMP_FALL * ramp()) * rand(0.92, 1.08),
      tilt: rand(-0.2, 0.2),
    });
  }

  function moveCatcher(dt: number) {
    const dir = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
    if (dir !== 0) catcherX += dir * KEY_SPEED * dt;
    else if (pointerTarget !== null) catcherX += (pointerTarget - catcherX) * (1 - Math.exp(-FOLLOW_RATE * dt));
    const m = Math.min(0.5, (CATCHER_SIZE * u) / 2 / fieldW);
    catcherX = clamp(catcherX, m, 1 - m);
  }

  function updateItems(dt: number) {
    const cs = CATCHER_SIZE * u;
    const cx = fx(catcherX);
    const cy = CATCHER_Y * H;
    const rimTop = cy - cs * 0.45;
    const rimBottom = cy + cs * 0.1;
    const kept: Falling[] = [];
    for (const it of items) {
      if (phase !== "playing") {
        kept.push(it); // the run ended earlier in this frame: freeze the rest where they are
        continue;
      }
      const prevY = it.y * H;
      it.y += it.speed * dt;
      const y = it.y * H;
      const s = it.size * u;
      // Swept test, so a fast item can't skip over the rim between two frames. Bad items need a
      // closer hit than good ones: a graze shouldn't cost a life.
      const reach = cs * 0.5 + s * (it.bad ? 0.1 : 0.3);
      if (prevY <= rimBottom && y >= rimTop && Math.abs(fx(it.x) - cx) <= reach) {
        const pop: Pop = { x: it.x, y: (cy - cs * 0.6) / H, at: clock, text: null, emoji: null };
        if (it.bad) {
          lives -= 1;
          lastBad = it.emoji;
          shakeAt = clock;
          pops.push({ ...pop, emoji: HIT_EMOJI });
          if (lives <= 0) finish(false);
        } else {
          caught += 1;
          bounceAt = clock;
          pops.push({ ...pop, text: "+1" });
          if (goalType === "score" && caught >= target) finish(true);
        }
        continue;
      }
      if (y - s < H) kept.push(it);
    }
    items = kept;
  }

  function step(dt: number) {
    clock += dt;
    if (phase === "playing") {
      elapsed += dt;
      if (goalType === "survive" && elapsed >= target) {
        elapsed = target;
        finish(true);
      } else {
        moveCatcher(dt);
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawn();
          spawnIn = Math.max(0.05, spawnIn + speed.spawn * (1 - RAMP_SPAWN * ramp()) * rand(0.8, 1.2));
        }
        updateItems(dt);
      }
      updateHud();
    } else if (phase === "over" && overIn > 0) {
      overIn -= dt;
      if (overIn <= 0) showEndCard();
    }
    if (pops.length) pops = pops.filter((p) => clock - p.at < POP_TIME);
  }

  function releaseInput() {
    keyLeft = false;
    keyRight = false;
    activePointer = null;
  }

  function finish(win: boolean) {
    phase = "over";
    won = win;
    overIn = END_DELAY;
    releaseInput();
  }

  function start() {
    items = [];
    pops = [];
    caught = 0;
    lives = LIVES;
    elapsed = 0;
    spawnIn = FIRST_SPAWN;
    catcherX = 0.5;
    pointerTarget = null;
    releaseInput();
    shakeAt = -1;
    bounceAt = -1;
    overIn = 0;
    won = false;
    lastBad = null;
    motion = !reducedMotion();
    phase = "playing";
    updateHud();
    shell.hud.show(true);
    try {
      shell.root.focus({ preventScroll: true }); // so the arrow keys work right after clicking Start
    } catch {
      /* ignore */
    }
    ensureLoop();
  }

  function showStartCard() {
    const goalLine = goalType === "score" ? `Catch ${target} ${label}` : `Survive ${target} seconds`;
    shell.card(
      {
        emoji: spec.catcher,
        headline: spec.title,
        sub: spec.tagline,
        goal: bad.length ? `${goalLine}, dodge ${bad.join(" ")}` : goalLine,
        button: "Start",
        hint: "Drag or use ← → to move",
      },
      guard(start),
    );
  }

  function showEndCard() {
    overIn = 0;
    const time = fmtClock(elapsed);
    let headline: string;
    let sub: string;
    if (goalType === "score") {
      headline = won ? "Goal reached" : "Out of lives";
      sub = won ? `${caught} ${label} in ${time}` : `${caught} of ${target} ${label} in ${time}`;
    } else {
      headline = won ? "You made it" : "Out of lives";
      sub = won ? `${fmtClock(target)} survived · ${caught} ${label}` : `Lasted ${time} of ${fmtClock(target)} · ${caught} ${label}`;
    }
    shell.card({ emoji: won ? spec.catcher : (lastBad ?? spec.catcher), headline, sub, button: "Play again" }, guard(start));
  }

  // ---- loop -----------------------------------------------------------------------------------
  // Runs only while something moves: a run, the beat before the end card, or a finishing pop / shake.
  function needsLoop() {
    if (phase === "playing" || overIn > 0 || pops.length > 0) return true;
    return (shakeAt >= 0 && clock - shakeAt < SHAKE_TIME) || (bounceAt >= 0 && clock - bounceAt < BOUNCE_TIME);
  }

  function frame(now: number) {
    raf = 0;
    if (destroyed || errorFired) return;
    try {
      const dt = last > 0 ? clamp((now - last) / 1000, 0, MAX_DT) : 0;
      last = now;
      step(dt);
      draw();
      if (needsLoop()) raf = requestAnimationFrame(frame);
      else last = 0;
    } catch (e) {
      fail(e);
    }
  }

  function ensureLoop() {
    if (raf || destroyed || errorFired) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // ---- input ----------------------------------------------------------------------------------
  const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  const toField = (clientX: number) => (clientX - stage.getBoundingClientRect().left - fieldX) / fieldW;

  // Pointer input lives on the stage, under the card overlay, so a card's button never feeds the
  // game (and never gets its click retargeted by pointer capture).
  listen<PointerEvent>(
    stage,
    "pointerdown",
    guard((e) => {
      if (phase !== "playing") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (activePointer !== null && activePointer !== e.pointerId) return; // ignore extra fingers
      activePointer = e.pointerId;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      pointerTarget = toField(e.clientX);
      if (e.cancelable) e.preventDefault();
    }),
  );
  // A mouse or pen steers by hovering; a finger only while it is the one that went down.
  listen<PointerEvent>(
    stage,
    "pointermove",
    guard((e) => {
      if (phase !== "playing") return;
      if (e.pointerType === "touch" && e.pointerId !== activePointer) return;
      pointerTarget = toField(e.clientX);
    }),
  );
  const pointerUp = (e: PointerEvent) => {
    if (e.pointerId === activePointer) activePointer = null;
  };
  listen(stage, "pointerup", pointerUp);
  listen(stage, "pointercancel", pointerUp);
  listen(stage, "lostpointercapture", pointerUp);

  // Block page scroll, pinch / double-tap zoom and long-press menus on the board.
  const block = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  listen(stage, "touchstart", block, { passive: false });
  listen(stage, "touchmove", block, { passive: false });
  listen(stage, "touchend", block, { passive: false });
  listen(stage, "contextmenu", block);
  listen(stage, "dblclick", block);
  listen(stage, "gesturestart", block, { passive: false }); // iOS Safari pinch

  // Only react to keys aimed at the game (focus inside it) or at nothing in particular (body), so
  // inputs and buttons elsewhere on the host page keep their keyboard behaviour.
  const ownsKeyEvent = (t: EventTarget | null) =>
    !t || t === window || t === document || t === document.body || t === document.documentElement ||
    (t instanceof Node && shell.root.contains(t));
  const keyDir = (e: KeyboardEvent) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return k === "ArrowLeft" || k === "a" ? -1 : k === "ArrowRight" || k === "d" ? 1 : 0;
  };
  listen<KeyboardEvent>(
    window,
    "keydown",
    guard((e) => {
      if (typeof e.key !== "string") return; // e.g. synthetic keydowns fired by autofill
      if (phase !== "playing" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || !ownsKeyEvent(e.target)) return;
      const dir = keyDir(e);
      if (dir < 0) keyLeft = true;
      if (dir > 0) keyRight = true;
      if (dir !== 0) pointerTarget = null;
      if (dir !== 0 || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " ") e.preventDefault();
    }),
  );
  listen<KeyboardEvent>(
    window,
    "keyup",
    guard((e) => {
      if (typeof e.key !== "string") return;
      const dir = keyDir(e);
      if (dir < 0) keyLeft = false;
      if (dir > 0) keyRight = false;
    }),
  );
  listen(window, "blur", releaseInput);

  // Pause while the tab is hidden; the next frame starts with dt = 0, so nothing jumps.
  listen(
    document,
    "visibilitychange",
    guard(() => {
      if (document.visibilityState === "hidden") {
        stopLoop();
        releaseInput();
      } else if (needsLoop()) {
        ensureLoop();
      }
    }),
  );

  // Draw straight after a resize, even mid-run: resizing the backing store clears it, and this
  // callback runs after this frame's rAF.
  const onResize = guard(() => {
    if (layout()) draw();
  });
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    cleanups.push(() => ro.disconnect());
  } else {
    listen(window, "resize", onResize);
  }

  // Dev-only inspection hook: open the page with ?vbdebug to get window.__vbCatch() (a state snapshot).
  if (/[?&]vbdebug\b/.test(window.location.search)) {
    const w = window as unknown as Record<string, unknown>;
    const snapshot = () => ({
      phase,
      caught,
      lives,
      elapsed,
      target,
      catcherX,
      fieldX,
      fieldW,
      W,
      H,
      u,
      items: items.map((it) => ({ emoji: it.emoji, bad: it.bad, x: it.x, y: it.y })),
    });
    w.__vbCatch = snapshot;
    cleanups.push(() => {
      if (w.__vbCatch === snapshot) delete w.__vbCatch;
    });
  }

  // ---- boot -----------------------------------------------------------------------------------
  guard(() => {
    layout();
    draw();
    showStartCard();
  })();

  shell.photoReady.then(() => {
    if (destroyed || errorFired) return;
    readyRaf = requestAnimationFrame(
      guard(() => {
        readyRaf = 0;
        if (layout()) draw();
        if (readyFired) return;
        readyFired = true;
        opts.onReady();
      }),
    );
  });

  return destroy;
}
