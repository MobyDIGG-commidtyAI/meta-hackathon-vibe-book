// VibeBook downhill runner: turns an ExperienceSpec + a photo into an endless emoji runner.
//
// Layering inside the mount element (all absolutely positioned):
//   .vb-bg      the post photo as a plain <img> (object-fit: cover). A DOM image works for any
//               cross-origin URL; a WebGL texture would need CORS headers the CDN may not send.
//   .vb-tint    timeOfDay overlay (CSS gradient)
//   .vb-canvas  transparent Phaser canvas: emoji sprites, speed streaks, ski tracks
//   .vb-hud     DOM HUD (title, progress, power-up pills)
//   .vb-overlay DOM start / win / lose screens
//
// Phaser is only used for the loop and sprite rendering. Input is handled with DOM pointer and
// keyboard events so it behaves the same in iframes and in-app browsers, and so we never swallow
// keys the host page needs. Phaser itself is imported lazily inside mountGame, so importing this
// module has no side effects.
import type Phaser from "phaser";
import type { ExperienceSpec } from "@/lib/spec";

type PhaserModule = typeof Phaser;
type TimeOfDay = ExperienceSpec["timeOfDay"];
type Speed = ExperienceSpec["speed"];
type Density = ExperienceSpec["density"];
type PowerupKind = ExperienceSpec["powerups"][number];
type GoalType = ExperienceSpec["goal"]["type"];
type ObstacleEmoji = ExperienceSpec["obstacles"][number];

export interface MountGameOptions {
  spec: ExperienceSpec;
  backgroundUrl: string | null;
  /** Called exactly once, after the scene is created and its first frame has rendered. */
  onReady: () => void;
  /** Called at most once if Phaser fails to boot (or the game crashes at runtime). */
  onError?: (e: unknown) => void;
}

// ---------------------------------------------------------------------------------------------
// Tuning tables. Every enum in the spec has an entry; Record<> makes tsc fail on a missing one.
// ---------------------------------------------------------------------------------------------

/** scroll: screen heights per second. meters: distance-goal meters per second. */
const SPEEDS: Record<Speed, { scroll: number; meters: number }> = {
  chill: { scroll: 0.34, meters: 14 },
  normal: { scroll: 0.44, meters: 20 },
  fast: { scroll: 0.56, meters: 27 },
  insane: { scroll: 0.7, meters: 36 },
};

/** gap: screen heights of scrolling between obstacle rows. double: chance of a 2-obstacle row. */
const DENSITIES: Record<Density, { gap: number; double: number }> = {
  low: { gap: 0.5, double: 0 },
  medium: { gap: 0.36, double: 0.12 },
  high: { gap: 0.26, double: 0.3 },
};

const POWERUPS: Record<PowerupKind, { emoji: string; label: string; seconds: number; color: string }> = {
  boost: { emoji: "🚀", label: "Boost", seconds: 4, color: "#ff8a3d" },
  shield: { emoji: "🛡️", label: "Shield", seconds: 0, color: "#4fd1ff" }, // lasts until hit
  magnet: { emoji: "🧲", label: "Magnet", seconds: 7, color: "#ff4d7a" },
};

/**
 * The model may pick any target in 10..100000. Clamp to something winnable in a demo session.
 * The clamped value is what the HUD shows.
 */
const GOALS: Record<GoalType, { min: number; max: number; verb: string; win: string }> = {
  distance: { min: 200, max: 6000, verb: "Reach", win: "You made it!" },
  score: { min: 10, max: 150, verb: "Collect", win: "Goal reached!" },
  survive: { min: 10, max: 180, verb: "Survive", win: "You survived!" },
};

interface Theme {
  fallback: string; // CSS background when there is no photo (or it fails to load)
  imgFilter: string;
  tint: string; // CSS background for the overlay layer
  accent: string; // progress bar gradient
  streak: number[];
  streakAlpha: number;
  track: number;
  trackAlpha: number;
  sideShade: number;
  shadow: { color: string; blur: number; y: number }; // baked into emoji textures
  goodShadow: { color: string; blur: number; y: number }; // collectibles / power-ups
}

const THEMES: Record<TimeOfDay, Theme> = {
  day: {
    fallback: "linear-gradient(180deg,#7cc8ff 0%,#cfeeff 45%,#ffffff 100%)",
    imgFilter: "none",
    tint: "none",
    accent: "linear-gradient(90deg,#ffd166,#ff7a59)",
    streak: [0xffffff, 0x9fc3e8], // the blue ones stay visible on bright snow
    streakAlpha: 0.55,
    track: 0x1a2440,
    trackAlpha: 0.18,
    sideShade: 0x000000,
    shadow: { color: "rgba(0,0,0,0.38)", blur: 10, y: 6 },
    goodShadow: { color: "rgba(255,255,255,0.9)", blur: 14, y: 0 },
  },
  sunset: {
    fallback: "linear-gradient(180deg,#2b1055 0%,#d6456b 48%,#ffb36b 100%)",
    imgFilter: "saturate(1.2) contrast(1.05)",
    tint:
      "linear-gradient(180deg,rgba(255,110,40,0.42) 0%,rgba(255,165,70,0.2) 50%,rgba(150,40,110,0.34) 100%)",
    accent: "linear-gradient(90deg,#ffb347,#ff5e62)",
    streak: [0xfff0d6],
    streakAlpha: 0.5,
    track: 0x3a0f2a,
    trackAlpha: 0.2,
    sideShade: 0x1a0010,
    shadow: { color: "rgba(60,0,30,0.42)", blur: 10, y: 6 },
    goodShadow: { color: "rgba(255,230,160,0.95)", blur: 16, y: 0 },
  },
  night: {
    fallback: "linear-gradient(180deg,#020617 0%,#0b1d4d 55%,#1d2f6f 100%)",
    imgFilter: "brightness(0.6) saturate(0.75)",
    tint: "linear-gradient(180deg,rgba(3,7,32,0.66) 0%,rgba(10,24,72,0.5) 100%)",
    accent: "linear-gradient(90deg,#7bdcff,#6c7bff)",
    streak: [0xbcd4ff],
    streakAlpha: 0.4,
    track: 0xdfe8ff,
    trackAlpha: 0.22,
    sideShade: 0x000010,
    shadow: { color: "rgba(255,255,255,0.7)", blur: 16, y: 0 },
    goodShadow: { color: "rgba(255,240,150,0.95)", blur: 18, y: 0 },
  },
  neon: {
    fallback: "linear-gradient(180deg,#0d0221 0%,#3a0ca3 50%,#0d0221 100%)",
    imgFilter: "contrast(1.35) saturate(1.8) brightness(0.85)",
    tint:
      "linear-gradient(160deg,rgba(255,0,180,0.38) 0%,rgba(30,0,70,0.3) 50%,rgba(0,230,255,0.34) 100%)",
    accent: "linear-gradient(90deg,#ff2bd6,#00f0ff)",
    streak: [0xff2bd6, 0x00f0ff],
    streakAlpha: 0.7,
    track: 0x00f0ff,
    trackAlpha: 0.45,
    sideShade: 0x0a0018,
    shadow: { color: "#ff2bd6", blur: 20, y: 0 },
    goodShadow: { color: "#00f0ff", blur: 20, y: 0 },
  },
};

/** Obstacles that read as "big" get a larger sprite (and hitbox). */
const BIG_OBSTACLES: Partial<Record<ObstacleEmoji, number>> = {
  "🏠": 1.5,
  "🚗": 1.35,
  "⛵": 1.35,
  "🦈": 1.35,
  "🌪️": 1.4,
  "🐻": 1.3,
  "🐄": 1.3,
  "🌲": 1.3,
};

// Layout, in "u" = field width / 10.
const FIELD_UNITS = 10;
const FIELD_MAX_ASPECT = 0.72; // field width never exceeds this * height (landscape screens)
const PLAYER_Y = 0.3; // fraction of height
const PLAYER_SIZE = 1.3;
const OBSTACLE_SIZE = 1.2;
const COLLECT_SIZE = 0.9;
const POWERUP_SIZE = 1.15;
const SPAWN_NY = 1.12; // spawn just below the bottom edge
const MAX_STEER = 1.6; // field widths per second
const RAMP_MAX = 0.45; // speed grows by up to +45% ...
const RAMP_TIME = 90; // ... over this many seconds
const BOOST_MUL = 1.75;
const GRACE_AFTER_HIT = 1.1; // seconds of invulnerability after a shield or boost ends
const MAGNET_RADIUS = 4.5; // u
const TEX = 160; // emoji texture size (px)
const GLYPH = 112; // emoji font size inside the texture
const GLYPH_RATIO = GLYPH / TEX;
const EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';
const STREAK_COUNT = 26;
const TRACK_MAX = 90;

/** Offset that moves the drawn glyph's opaque pixels to the centre of a TEX x TEX canvas. */
function pixelCentreOffset(
  emoji: string,
  font: string,
  baseline: CanvasTextBaseline,
  x: number,
  y: number,
): [number, number] {
  try {
    const c = document.createElement("canvas");
    c.width = TEX;
    c.height = TEX;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return [0, 0];
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = baseline;
    g.fillText(emoji, x, y);
    const data = g.getImageData(0, 0, TEX, TEX).data;
    let x0 = TEX;
    let y0 = TEX;
    let x1 = -1;
    let y1 = -1;
    for (let py = 0; py < TEX; py++) {
      for (let px = 0; px < TEX; px++) {
        if (data[(py * TEX + px) * 4 + 3] > 40) {
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        }
      }
    }
    if (x1 < 0) return [0, 0];
    return [TEX / 2 - (x0 + x1 + 1) / 2, TEX / 2 - (y0 + y1 + 1) / 2];
  } catch {
    return [0, 0]; // e.g. canvas readback blocked by a privacy setting
  }
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n: number) => Math.floor(n).toLocaleString("en-US");

// ---------------------------------------------------------------------------------------------
// DOM shell
// ---------------------------------------------------------------------------------------------

const CSS = `
.vb-root{position:relative;width:100%;height:100%;overflow:hidden;touch-action:none;-ms-touch-action:none;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;
  overscroll-behavior:contain;outline:none;background:#0b1020;color:#fff;--vb-u:40px;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.2;cursor:default}
.vb-root *{box-sizing:border-box}
.vb-layer{position:absolute;left:0;top:0;width:100%;height:100%}
.vb-bg{z-index:0;overflow:hidden;background-size:cover}
.vb-bg img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0;
  transition:opacity .45s ease;will-change:transform;transform:scale(1.16);pointer-events:none;
  -webkit-user-drag:none;user-select:none}
.vb-bg img.vb-loaded{opacity:1}
.vb-tint{z-index:1;pointer-events:none}
.vb-canvas{z-index:2}
.vb-canvas canvas{position:absolute!important;left:0!important;top:0!important;width:100%!important;
  height:100%!important;margin:0!important;display:block}
.vb-hud{z-index:3;height:auto;pointer-events:none;
  padding:max(calc(var(--vb-u)*0.26),env(safe-area-inset-top)) calc(var(--vb-u)*0.3) calc(var(--vb-u)*0.7);
  background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.25) 60%,rgba(0,0,0,0));
  text-shadow:0 1px 3px rgba(0,0,0,.65);opacity:0;transition:opacity .25s ease}
.vb-hud.vb-show{opacity:1}
.vb-row{display:flex;align-items:center;gap:8px}
.vb-title{flex:1;min-width:0;font-weight:800;font-size:clamp(14px,calc(var(--vb-u)*0.42),22px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
.vb-count{flex:none;font-weight:800;font-size:clamp(14px,calc(var(--vb-u)*0.42),22px);
  font-variant-numeric:tabular-nums;white-space:nowrap}
.vb-bar{position:relative;margin-top:6px;height:clamp(18px,calc(var(--vb-u)*0.52),28px);border-radius:999px;
  background:rgba(255,255,255,.2);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.vb-fill{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:0 50%;transform:scaleX(0)}
.vb-bar-text{position:relative;padding:0 10px;font-weight:800;font-size:clamp(11px,calc(var(--vb-u)*0.3),15px);
  line-height:clamp(18px,calc(var(--vb-u)*0.52),28px);font-variant-numeric:tabular-nums;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.vb-powers{display:flex;gap:6px;justify-content:flex-end;margin-top:6px}
.vb-pill{position:relative;display:none;align-items:center;gap:4px;padding:3px 9px 4px 7px;border-radius:999px;
  background:rgba(0,0,0,.5);font-weight:800;font-size:clamp(11px,calc(var(--vb-u)*0.3),15px);overflow:hidden;
  box-shadow:0 0 0 1.5px currentColor inset}
.vb-pill.vb-on{display:flex}
.vb-pill span{color:#fff}
.vb-pill i{position:absolute;left:0;bottom:0;height:3px;width:100%;transform-origin:0 50%;background:currentColor}
.vb-overlay{z-index:4;display:flex;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(ellipse at center,rgba(5,8,20,.55),rgba(5,8,20,.75));opacity:0;visibility:hidden;
  transition:opacity .25s ease,visibility 0s linear .25s;pointer-events:none}
.vb-overlay.vb-show{opacity:1;visibility:visible;transition:opacity .25s ease;pointer-events:auto;cursor:pointer}
.vb-card{width:100%;max-width:420px;text-align:center;text-shadow:0 2px 6px rgba(0,0,0,.55)}
.vb-emoji{font-size:clamp(44px,calc(var(--vb-u)*1.6),84px);line-height:1.1;font-family:${EMOJI_FONT}}
.vb-h1{margin-top:8px;font-weight:900;font-size:clamp(24px,calc(var(--vb-u)*0.8),42px);line-height:1.08;
  overflow-wrap:anywhere}
.vb-sub{margin-top:8px;font-size:clamp(14px,calc(var(--vb-u)*0.38),19px);opacity:.92;overflow-wrap:anywhere}
.vb-goal{margin:14px auto 0;display:inline-block;padding:6px 12px;border-radius:12px;background:rgba(255,255,255,.14);
  font-weight:700;font-size:clamp(13px,calc(var(--vb-u)*0.34),17px);overflow-wrap:anywhere}
.vb-cta{margin-top:20px;font-weight:900;font-size:clamp(18px,calc(var(--vb-u)*0.55),28px);
  animation:vb-pulse 1.1s ease-in-out infinite}
.vb-hint{margin-top:10px;font-size:clamp(12px,calc(var(--vb-u)*0.3),15px);opacity:.75}
.vb-btn{margin:20px auto 0;display:table;padding:12px 28px;border-radius:999px;background:#fff;color:#111;
  font-weight:900;font-size:clamp(16px,calc(var(--vb-u)*0.45),22px);text-shadow:none;
  box-shadow:0 6px 20px rgba(0,0,0,.35)}
.vb-btn.vb-wait{opacity:.45}
.vb-err{z-index:5;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;
  background:rgba(5,8,20,.85);font-weight:700}
@keyframes vb-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.82}}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text; // never innerHTML: spec strings are model output
  if (parent) parent.appendChild(node);
  return node;
}

interface Dom {
  root: HTMLDivElement;
  bg: HTMLDivElement;
  img: HTMLImageElement | null;
  canvasHost: HTMLDivElement;
  hud: HTMLDivElement;
  count: HTMLDivElement;
  fill: HTMLDivElement;
  barText: HTMLDivElement;
  pills: Record<PowerupKind, { pill: HTMLDivElement; bar: HTMLElement }>;
  overlay: HTMLDivElement;
  card: HTMLDivElement;
}

function buildDom(parent: HTMLElement, spec: ExperienceSpec, backgroundUrl: string | null, theme: Theme): Dom {
  const root = el("div", "vb-root", parent);
  root.tabIndex = -1; // focusable so keyboard works inside iframes after a tap
  root.setAttribute("role", "application");
  root.setAttribute("aria-label", spec.title);
  el("style", "", root).textContent = CSS;

  const bg = el("div", "vb-layer vb-bg", root);
  bg.style.background = theme.fallback;
  let img: HTMLImageElement | null = null;
  if (backgroundUrl) {
    img = el("img", "", bg);
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer"; // some social CDNs block hotlinked images by referrer
    img.style.filter = theme.imgFilter;
    const shown = img;
    shown.addEventListener("load", () => shown.classList.add("vb-loaded"));
    shown.addEventListener("error", () => shown.remove()); // keep the gradient fallback
    shown.src = backgroundUrl;
  }

  const tint = el("div", "vb-layer vb-tint", root);
  tint.style.background = theme.tint;

  const canvasHost = el("div", "vb-layer vb-canvas", root);

  const hud = el("div", "vb-layer vb-hud", root);
  const row = el("div", "vb-row", hud);
  el("div", "vb-title", row, spec.title);
  const count = el("div", "vb-count", row);
  if (spec.goal.type === "score") count.style.display = "none"; // progress bar already shows it
  const bar = el("div", "vb-bar", hud);
  const fill = el("div", "vb-fill", bar);
  fill.style.background = theme.accent;
  const barText = el("div", "vb-bar-text", bar);
  const powers = el("div", "vb-powers", hud);
  const pills = {} as Dom["pills"];
  (Object.keys(POWERUPS) as PowerupKind[]).forEach((kind) => {
    const pill = el("div", "vb-pill", powers);
    pill.style.color = POWERUPS[kind].color;
    el("span", "", pill, `${POWERUPS[kind].emoji} ${POWERUPS[kind].label}`);
    const barEl = el("i", "", pill);
    pills[kind] = { pill, bar: barEl };
  });

  const overlay = el("div", "vb-layer vb-overlay", root);
  const card = el("div", "vb-card", overlay);

  return { root, bg, img, canvasHost, hud, count, fill, barText, pills, overlay, card };
}

// ---------------------------------------------------------------------------------------------
// Game controller (all gameplay; the Phaser scene is a thin shell around it)
// ---------------------------------------------------------------------------------------------

type EntityKind = "obstacle" | "collectible" | "powerup";

interface Entity {
  kind: EntityKind;
  img: Phaser.GameObjects.Image;
  nx: number; // 0..1 across the play field
  ny: number; // fraction of screen height
  size: number; // in u
  power: PowerupKind | null;
  fx: number; // < 0 alive; otherwise seconds into the pop / collect animation
}

interface Streak {
  x: number; // 0..1 across the whole canvas
  ny: number;
  len: number;
  color: number;
}

type Phase = "ready" | "playing" | "over";

class RunnerController {
  // wiring
  private scene!: Phaser.Scene;
  private gfxBack!: Phaser.GameObjects.Graphics; // side shading + streaks + tracks
  private gfxFront!: Phaser.GameObjects.Graphics; // shield ring / boost glow
  private player!: Phaser.GameObjects.Image;
  private boom!: Phaser.GameObjects.Image;
  private pool: Phaser.GameObjects.Image[] = [];
  private entities: Entity[] = [];
  private streaks: Streak[] = [];
  private track: { nx: number; ny: number }[] = [];
  attached = false;

  // spec-derived
  private readonly speed: { scroll: number; meters: number };
  private readonly density: { gap: number; double: number };
  private readonly goalType: GoalType;
  private readonly target: number;
  private readonly obstacleKeys: { key: string; size: number }[];
  private readonly powerKinds: PowerupKind[];

  // layout (game pixels)
  private W = 1;
  private H = 1;
  private fieldX = 0;
  private fieldW = 1;
  private u = 0.1;
  private playerY = 0.3;

  // run state
  phase: Phase = "ready";
  private result: "win" | "lose" | null = null;
  private now = 0;
  private overAt = 0;
  private overlayShown = false;
  private canRestartAt = Infinity;
  private elapsed = 0;
  private meters = 0;
  private collected = 0;
  private scroll = 0; // current screen heights / second
  private obstacleAcc = 0;
  private obstacleGap = 0;
  private trailAcc = 0;
  private trailGap = 0;
  private powerTimer = 0;
  private boostT = 0;
  private magnetT = 0;
  private shield = false;
  private graceT = 0;
  private px = 0.5; // player position in field fraction
  private pvx = 0; // field widths / second

  // input
  private pointerDown = false;
  private pointerGameX = 0;
  private holdUntil = 0;
  private keyLeft = false;
  private keyRight = false;

  // HUD cache (avoid touching the DOM when nothing changed)
  private hudText = "";
  private hudCount = "";
  private hudFill = -1;
  private hudPills: Record<PowerupKind, number> = { boost: -1, shield: -1, magnet: -1 };
  private bgTransform = "";

  constructor(
    private readonly spec: ExperienceSpec,
    private readonly theme: Theme,
    private readonly dom: Dom,
  ) {
    this.speed = SPEEDS[spec.speed] ?? SPEEDS.normal;
    this.density = DENSITIES[spec.density] ?? DENSITIES.medium;
    this.goalType = GOALS[spec.goal.type] ? spec.goal.type : "distance";
    const rule = GOALS[this.goalType];
    this.target = Math.round(clamp(Number(spec.goal.target) || rule.min, rule.min, rule.max));
    const obstacles = spec.obstacles.length > 0 ? spec.obstacles : (["🪨"] as ObstacleEmoji[]);
    this.obstacleKeys = obstacles.map((emoji, i) => ({
      key: `vb-ob-${i}`,
      size: OBSTACLE_SIZE * (BIG_OBSTACLES[emoji] ?? 1),
    }));
    this.powerKinds = Array.from(new Set(spec.powerups)).filter((p) => p in POWERUPS);
  }

  // ---- setup ---------------------------------------------------------------------------------

  attach(scene: Phaser.Scene) {
    this.scene = scene;
    const { spec, theme } = this;
    spec.obstacles.forEach((emoji, i) => this.makeTexture(`vb-ob-${i}`, emoji, theme.shadow));
    if (spec.obstacles.length === 0) this.makeTexture("vb-ob-0", "🪨", theme.shadow);
    this.makeTexture("vb-coin", spec.collectible, theme.goodShadow);
    this.makeTexture("vb-player", spec.player, theme.goodShadow);
    this.makeTexture("vb-boom", "💥", { color: "rgba(0,0,0,0)", blur: 0, y: 0 });
    (Object.keys(POWERUPS) as PowerupKind[]).forEach((kind) =>
      this.makeTexture(`vb-pw-${kind}`, POWERUPS[kind].emoji, theme.goodShadow, POWERUPS[kind].color),
    );

    this.gfxBack = scene.add.graphics().setDepth(1);
    this.gfxFront = scene.add.graphics().setDepth(49);
    this.player = scene.add.image(0, 0, "vb-player").setDepth(50);
    this.boom = scene.add.image(0, 0, "vb-boom").setDepth(60).setVisible(false);

    for (let i = 0; i < STREAK_COUNT; i++) {
      this.streaks.push({
        x: Math.random(),
        ny: Math.random() * 1.2,
        len: rand(0.03, 0.08),
        color: pick(theme.streak),
      });
    }
    this.attached = true;
    this.layout(scene.scale.width, scene.scale.height);
    this.showStart();
    this.render();
  }

  /** Bakes an emoji (optionally on a coloured disc) into a square canvas texture. */
  private makeTexture(
    key: string,
    emoji: string,
    shadow: { color: string; blur: number; y: number },
    disc?: string,
  ) {
    const textures = this.scene.textures;
    if (textures.exists(key)) textures.remove(key);
    const tex = textures.createCanvas(key, TEX, TEX);
    if (!tex) throw new Error(`Could not create texture ${key}`);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, TEX, TEX);
    let glyph = GLYPH;
    if (disc) {
      const r = TEX * 0.44;
      const grad = ctx.createRadialGradient(TEX / 2, TEX / 2, r * 0.15, TEX / 2, TEX / 2, r);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, disc);
      ctx.beginPath();
      ctx.arc(TEX / 2, TEX / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = disc;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.stroke();
      glyph = GLYPH * 0.62;
    }
    ctx.font = `${glyph}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetY = shadow.y;
    // Centre the visible glyph using its real bounding box where the browser reports it.
    const m = ctx.measureText(emoji);
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    const left = m.actualBoundingBoxLeft;
    const right = m.actualBoundingBoxRight;
    let x = TEX / 2;
    let y = TEX / 2;
    if (Number.isFinite(asc) && Number.isFinite(desc) && asc + desc > 0) {
      y = TEX / 2 + (asc - desc) / 2;
    } else {
      ctx.textBaseline = "middle";
    }
    if (Number.isFinite(left) && Number.isFinite(right) && left + right > 0) {
      x = TEX / 2 - (right - left) / 2;
    }
    // Font metrics describe the em box, not the drawn pixels (e.g. 🚤 sits low in its box), so
    // nudge by the measured pixel bounds to keep sprite centre == hitbox centre.
    const [dx, dy] = pixelCentreOffset(emoji, ctx.font, ctx.textBaseline, x, y);
    ctx.fillText(emoji, x + dx, y + dy);
    tex.refresh();
  }

  /** Recompute layout for a new canvas size (game pixels). Positions are stored normalized. */
  layout(w: number, h: number) {
    this.W = Math.max(1, w);
    this.H = Math.max(1, h);
    this.fieldW = Math.min(this.W, this.H * FIELD_MAX_ASPECT);
    this.fieldX = (this.W - this.fieldW) / 2;
    this.u = this.fieldW / FIELD_UNITS;
    this.playerY = clamp(this.H * PLAYER_Y, this.u * 2.2, this.H * 0.45);
  }

  // ---- input -----------------------------------------------------------------------------------

  pointerStart(gameX: number) {
    this.pointerDown = true;
    this.pointerGameX = gameX;
    // A quick tap still nudges the player for a moment.
    this.holdUntil = this.now + 0.16;
    if (this.phase === "ready") this.start();
    else if (this.phase === "over" && this.now >= this.canRestartAt) this.start();
  }

  pointerMove(gameX: number) {
    if (this.pointerDown) this.pointerGameX = gameX;
  }

  pointerEnd() {
    this.pointerDown = false;
  }

  /**
   * Any key starts / restarts; arrows and A/D steer. Returns true for keys the game owns, so the
   * caller can prevent their default (page scroll) without swallowing unrelated keys.
   */
  key(code: string, down: boolean): boolean {
    const isLeft = code === "ArrowLeft" || code === "KeyA";
    const isRight = code === "ArrowRight" || code === "KeyD";
    if (isLeft) this.keyLeft = down;
    if (isRight) this.keyRight = down;
    const owned =
      isLeft || isRight || code === "ArrowUp" || code === "ArrowDown" || code === "Space" || code === "Enter";
    if (!down) return owned;
    if (this.phase === "ready" || (this.phase === "over" && this.now >= this.canRestartAt)) this.start();
    return owned;
  }

  releaseAllInput() {
    this.pointerDown = false;
    this.keyLeft = false;
    this.keyRight = false;
  }

  // ---- phases ----------------------------------------------------------------------------------

  private start() {
    for (const e of this.entities) this.free(e.img);
    this.entities = [];
    this.track = [];
    this.phase = "playing";
    this.result = null;
    this.elapsed = 0;
    this.meters = 0;
    this.collected = 0;
    this.scroll = this.speed.scroll;
    this.obstacleAcc = -0.55; // a short calm stretch before the first obstacle
    this.obstacleGap = this.density.gap;
    this.trailAcc = -0.2;
    this.trailGap = 0.5;
    this.powerTimer = rand(4, 7);
    this.boostT = 0;
    this.magnetT = 0;
    this.shield = false;
    this.graceT = 0;
    this.px = 0.5;
    this.pvx = 0;
    this.overlayShown = false;
    this.canRestartAt = Infinity;
    this.player.setAlpha(1).setAngle(0).setVisible(true);
    this.boom.setVisible(false);
    this.dom.overlay.classList.remove("vb-show");
    this.dom.hud.classList.add("vb-show");
    this.hudText = "";
    this.hudCount = "";
    this.hudFill = -1;
  }

  private end(result: "win" | "lose") {
    if (this.phase !== "playing") return;
    this.phase = "over";
    this.result = result;
    this.overAt = this.now;
    this.boostT = 0;
    this.magnetT = 0;
  }

  private showStart() {
    const { spec } = this;
    const card = this.dom.card;
    card.textContent = "";
    el("div", "vb-emoji", card, spec.player);
    el("div", "vb-h1", card, spec.title);
    el("div", "vb-sub", card, spec.tagline);
    const goal = `${GOALS[this.goalType].verb} ${fmt(this.target)} ${spec.scoreLabel}`;
    const dodge = `Dodge ${spec.obstacles.join(" ")}`;
    const grab = `Grab ${spec.collectible}`;
    el("div", "vb-goal", card, `${goal}  ·  ${dodge}  ·  ${grab}`);
    el("div", "vb-cta", card, "Tap to start");
    el("div", "vb-hint", card, "Hold or drag to steer · ← → keys");
    this.dom.overlay.classList.add("vb-show");
    this.dom.hud.classList.remove("vb-show");
  }

  private showOver() {
    const { spec } = this;
    const card = this.dom.card;
    card.textContent = "";
    const win = this.result === "win";
    el("div", "vb-emoji", card, win ? "🏆" : "💥");
    el("div", "vb-h1", card, win ? GOALS[this.goalType].win : "Wipeout!");
    const progress = Math.min(this.progress(), this.target);
    el("div", "vb-sub", card, `${fmt(progress)} / ${fmt(this.target)} ${spec.scoreLabel}`);
    const extra =
      this.goalType === "score"
        ? `${fmt(this.elapsed)}s on the slope`
        : `${spec.collectible} × ${fmt(this.collected)}`;
    el("div", "vb-goal", card, extra);
    const btn = el("div", "vb-btn vb-wait", card, "Play again");
    btn.setAttribute("role", "button");
    this.dom.overlay.classList.add("vb-show");
    this.overlayShown = true;
    this.canRestartAt = this.now + 0.45;
    window.setTimeout(() => btn.classList.remove("vb-wait"), 450);
  }

  private progress(): number {
    switch (this.goalType) {
      case "distance":
        return this.meters;
      case "score":
        return this.collected;
      case "survive":
        return this.elapsed;
    }
  }

  // ---- per-frame -------------------------------------------------------------------------------

  update(deltaMs: number) {
    if (!this.attached) return;
    const dt = clamp(deltaMs / 1000, 0, 0.05);
    this.now += dt;

    let dy: number; // screen heights scrolled this frame
    if (this.phase === "ready") {
      dy = 0.12 * dt;
      this.px = 0.5 + Math.sin(this.now * 1.3) * 0.08;
      this.pvx = Math.cos(this.now * 1.3) * 0.1;
    } else if (this.phase === "playing") {
      this.elapsed += dt;
      const ramp = 1 + RAMP_MAX * Math.min(this.elapsed / RAMP_TIME, 1);
      const boost = this.boostT > 0 ? BOOST_MUL : 1;
      this.scroll = this.speed.scroll * ramp * boost;
      dy = this.scroll * dt;
      this.meters += this.speed.meters * ramp * boost * dt;
      this.steer(dt);
      this.tickPowerups(dt);
      this.spawn(dy, dt);
    } else {
      // Over: the world coasts to a stop after a crash, keeps cruising slowly after a win.
      const floor = this.result === "win" ? this.speed.scroll * 0.35 : 0;
      this.scroll = Math.max(floor, this.scroll - this.speed.scroll * 2.2 * dt);
      dy = this.scroll * dt;
      if (!this.overlayShown && this.now - this.overAt > (this.result === "win" ? 0.5 : 0.9)) {
        this.showOver();
      }
    }

    this.moveWorld(dy, dt);
    if (this.phase === "playing") {
      this.collide();
      const p = this.progress();
      if (p >= this.target) this.end("win");
    }
    this.render();
    if (this.phase !== "ready") this.renderHud();
  }

  private steer(dt: number) {
    const margin = (PLAYER_SIZE * 0.5) / FIELD_UNITS;
    let desired = 0;
    const keyDir = (this.keyRight ? 1 : 0) - (this.keyLeft ? 1 : 0);
    if (this.pointerDown || this.now < this.holdUntil) {
      // Move toward the finger / cursor x (covers "hold a side" and "drag").
      const target = clamp((this.pointerGameX - this.fieldX) / this.fieldW, margin, 1 - margin);
      desired = clamp((target - this.px) * 9, -MAX_STEER, MAX_STEER);
    } else if (keyDir !== 0) {
      desired = keyDir * MAX_STEER * 0.85;
    }
    this.pvx += (desired - this.pvx) * Math.min(1, dt * 14);
    this.px += this.pvx * dt;
    if (this.px < margin) {
      this.px = margin;
      this.pvx = Math.max(0, this.pvx);
    } else if (this.px > 1 - margin) {
      this.px = 1 - margin;
      this.pvx = Math.min(0, this.pvx);
    }
  }

  private tickPowerups(dt: number) {
    if (this.boostT > 0) {
      this.boostT -= dt;
      if (this.boostT <= 0) {
        this.boostT = 0;
        this.graceT = GRACE_AFTER_HIT; // don't die the instant boost runs out
      }
    }
    if (this.magnetT > 0) this.magnetT = Math.max(0, this.magnetT - dt);
    if (this.graceT > 0) this.graceT = Math.max(0, this.graceT - dt);
  }

  private spawn(dy: number, dt: number) {
    // Obstacles: spaced by scrolled distance so density means spacing, not rate.
    this.obstacleAcc += dy;
    while (this.obstacleAcc >= this.obstacleGap) {
      this.obstacleAcc -= this.obstacleGap;
      this.obstacleGap = this.density.gap * rand(0.8, 1.2);
      this.spawnObstacleRow(SPAWN_NY - this.obstacleAcc);
    }
    // Collectible trails.
    this.trailAcc += dy;
    if (this.trailAcc >= this.trailGap) {
      this.trailAcc = 0;
      this.trailGap = this.goalType === "score" ? rand(0.45, 0.75) : rand(0.65, 1.05);
      this.spawnTrail();
    }
    // Power-ups (only the kinds listed in the spec).
    if (this.powerKinds.length > 0) {
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) {
        this.powerTimer = rand(8, 13);
        const kind = pick(this.powerKinds);
        const nx = this.freeX(SPAWN_NY + 0.05, POWERUP_SIZE);
        if (nx !== null) this.add("powerup", `vb-pw-${kind}`, nx, SPAWN_NY + 0.05, POWERUP_SIZE, kind);
      }
    }
  }

  private spawnObstacleRow(ny: number) {
    const first = pick(this.obstacleKeys);
    // Every few rows aim at the player so standing still is never safe.
    const aim = Math.random() < 0.3;
    const half = (first.size * 0.5) / FIELD_UNITS;
    let nx = aim ? clamp(this.px + rand(-0.06, 0.06), half, 1 - half) : this.freeX(ny, first.size);
    if (nx === null || !this.isFree(nx, ny, first.size)) nx = this.freeX(ny, first.size);
    if (nx === null) return;
    this.add("obstacle", first.key, nx, ny, first.size, null);
    if (Math.random() < this.density.double) {
      const second = pick(this.obstacleKeys);
      const h2 = (second.size * 0.5) / FIELD_UNITS;
      for (let i = 0; i < 6; i++) {
        const x2 = rand(h2, 1 - h2);
        // keep a clear gap of at least ~3u between the pair
        if (Math.abs(x2 - nx) > 0.38 && this.isFree(x2, ny, second.size)) {
          this.add("obstacle", second.key, x2, ny, second.size, null);
          break;
        }
      }
    }
  }

  private spawnTrail() {
    const count = this.goalType === "score" ? 4 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);
    const half = (COLLECT_SIZE * 0.5) / FIELD_UNITS;
    let nx = rand(half, 1 - half);
    const slope = rand(-0.07, 0.07);
    const step = (this.u * 1.25) / this.H;
    for (let i = 0; i < count; i++) {
      const ny = SPAWN_NY + i * step;
      if (this.isFree(nx, ny, COLLECT_SIZE)) this.add("collectible", "vb-coin", nx, ny, COLLECT_SIZE, null);
      nx = clamp(nx + slope, half, 1 - half);
    }
  }

  /** True if nothing alive overlaps a circle of `size` u at (nx, ny). */
  private isFree(nx: number, ny: number, size: number): boolean {
    const x = nx * this.fieldW;
    const y = ny * this.H;
    for (const e of this.entities) {
      if (e.fx >= 0) continue;
      const dx = e.nx * this.fieldW - x;
      const dy = e.ny * this.H - y;
      const min = (size + e.size) * 0.55 * this.u;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  private freeX(ny: number, size: number): number | null {
    const half = (size * 0.5) / FIELD_UNITS;
    for (let i = 0; i < 8; i++) {
      const nx = rand(half, 1 - half);
      if (this.isFree(nx, ny, size)) return nx;
    }
    return null;
  }

  private add(kind: EntityKind, key: string, nx: number, ny: number, size: number, power: PowerupKind | null) {
    let img = this.pool.pop();
    if (img) img.setTexture(key).setVisible(true);
    else img = this.scene.add.image(0, 0, key);
    img.setAlpha(1).setAngle(0);
    this.entities.push({ kind, img, nx, ny, size, power, fx: -1 });
  }

  private free(img: Phaser.GameObjects.Image) {
    img.setVisible(false);
    this.pool.push(img);
  }

  private moveWorld(dy: number, dt: number) {
    const magnetOn = this.magnetT > 0 && this.phase === "playing";
    const ppx = this.fieldX + this.px * this.fieldW;
    const ppy = this.playerY;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.fx >= 0) {
        e.fx += dt;
        e.ny -= dy * 0.5;
        if (e.fx > 0.3) {
          this.free(e.img);
          this.entities.splice(i, 1);
        }
        continue;
      }
      e.ny -= dy;
      if (magnetOn && e.kind === "collectible") {
        const ex = this.fieldX + e.nx * this.fieldW;
        const ey = e.ny * this.H;
        const dx = ppx - ex;
        const dyp = ppy - ey;
        const dist = Math.hypot(dx, dyp);
        if (dist < MAGNET_RADIUS * this.u && dist > 1) {
          const pull = Math.min(dist, this.u * 16 * dt);
          e.nx += ((dx / dist) * pull) / this.fieldW;
          e.ny += ((dyp / dist) * pull) / this.H;
        }
      }
      if (e.ny < -0.15) {
        this.free(e.img);
        this.entities.splice(i, 1);
      }
    }
    for (const s of this.streaks) {
      s.ny -= dy * 1.15;
      if (s.ny < -0.15) {
        s.ny = 1.05 + Math.random() * 0.2;
        s.x = Math.random();
        s.len = rand(0.03, 0.08);
      }
    }
    // Ski tracks: points scroll up with the world.
    for (const p of this.track) p.ny -= dy;
    while (this.track.length > 0 && this.track[0].ny < -0.05) this.track.shift();
    if (this.phase === "playing") {
      const last = this.track[this.track.length - 1];
      const pny = this.playerY / this.H;
      if (!last || Math.abs(last.ny - pny) > 0.006) {
        this.track.push({ nx: this.px, ny: pny });
        if (this.track.length > TRACK_MAX) this.track.shift();
      }
    }
  }

  private collide() {
    const ppx = this.fieldX + this.px * this.fieldW;
    const ppy = this.playerY;
    const pr = PLAYER_SIZE * this.u * 0.3; // forgiving hitbox
    for (const e of this.entities) {
      if (e.fx >= 0) continue;
      const ex = this.fieldX + e.nx * this.fieldW;
      const ey = e.ny * this.H;
      const dx = ex - ppx;
      const dy = ey - ppy;
      const d2 = dx * dx + dy * dy;
      if (e.kind === "obstacle") {
        const r = pr + e.size * this.u * 0.34;
        if (d2 > r * r) continue;
        if (this.boostT > 0) {
          e.fx = 0; // smash through
        } else if (this.graceT > 0) {
          continue;
        } else if (this.shield) {
          this.shield = false;
          this.graceT = GRACE_AFTER_HIT;
          e.fx = 0;
        } else {
          this.boom.setPosition(ppx, ppy).setVisible(true).setAlpha(1);
          this.end("lose");
          return;
        }
      } else {
        const r = pr + e.size * this.u * 0.55; // generous pickup radius
        if (d2 > r * r) continue;
        e.fx = 0;
        if (e.kind === "collectible") this.collected += 1;
        else if (e.power) this.activate(e.power);
      }
    }
  }

  private activate(kind: PowerupKind) {
    switch (kind) {
      case "boost":
        this.boostT = POWERUPS.boost.seconds;
        break;
      case "shield":
        this.shield = true;
        break;
      case "magnet":
        this.magnetT = POWERUPS.magnet.seconds;
        break;
    }
  }

  // ---- drawing ---------------------------------------------------------------------------------

  private render() {
    const { u, H, theme } = this;
    const g = this.gfxBack;
    g.clear();

    // Shade the area outside the play field on wide screens.
    if (this.fieldX > 1) {
      g.fillStyle(theme.sideShade, 0.32);
      g.fillRect(0, 0, this.fieldX, H);
      g.fillRect(this.fieldX + this.fieldW, 0, this.W - this.fieldX - this.fieldW, H);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(this.fieldX - 1, 0, 2, H);
      g.fillRect(this.fieldX + this.fieldW - 1, 0, 2, H);
    }

    // Speed streaks: longer when going faster.
    const speedFactor = clamp(0.35 + this.scroll * 1.6, 0.35, 2.6);
    const lw = Math.max(1, u * 0.05);
    for (const s of this.streaks) {
      const x = s.x * this.W;
      const y = s.ny * H;
      g.lineStyle(lw, s.color, theme.streakAlpha * (this.boostT > 0 ? 1 : 0.8));
      g.lineBetween(x, y, x, y + s.len * H * speedFactor);
    }

    // Ski tracks behind the player.
    if (this.track.length > 1) {
      const off = u * 0.16;
      g.lineStyle(Math.max(1, u * 0.07), theme.track, theme.trackAlpha);
      for (const side of [-1, 1]) {
        g.beginPath();
        this.track.forEach((p, i) => {
          const x = this.fieldX + p.nx * this.fieldW + side * off;
          const y = p.ny * H;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.lineTo(this.fieldX + this.px * this.fieldW + side * off, this.playerY);
        g.strokePath();
      }
    }

    // Entities.
    for (const e of this.entities) {
      const base = (e.size * u) / GLYPH_RATIO;
      let scale = 1;
      let alpha = 1;
      if (e.fx >= 0) {
        const t = e.fx / 0.3;
        scale = 1 + t * 0.7;
        alpha = 1 - t;
      } else if (e.kind === "powerup") {
        scale = 1 + Math.sin(this.now * 6) * 0.06;
      } else if (e.kind === "collectible") {
        scale = 1 + Math.sin(this.now * 5 + e.ny * 20) * 0.05;
      }
      e.img
        .setPosition(this.fieldX + e.nx * this.fieldW, e.ny * H)
        .setDisplaySize(base * scale, base * scale)
        .setAlpha(alpha)
        .setDepth(e.kind === "obstacle" ? 10 + e.ny : 5 + e.ny);
    }

    // Player.
    const ppx = this.fieldX + this.px * this.fieldW;
    const pSize = (PLAYER_SIZE * u) / GLYPH_RATIO;
    const crashed = this.phase === "over" && this.result === "lose";
    if (crashed) {
      const t = this.now - this.overAt;
      this.player
        .setPosition(ppx, this.playerY)
        .setDisplaySize(pSize * (1 - Math.min(t, 0.6) * 0.5), pSize * (1 - Math.min(t, 0.6) * 0.5))
        .setAngle(t * 720)
        .setAlpha(Math.max(0.25, 1 - t));
      const b = Math.min(t / 0.35, 1);
      this.boom
        .setDisplaySize(pSize * (0.6 + b * 1.1), pSize * (0.6 + b * 1.1))
        .setAlpha(t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) * 2));
    } else {
      const bob = Math.sin(this.now * 10) * u * 0.03;
      const blink = this.graceT > 0 && Math.floor(this.now * 12) % 2 === 0 ? 0.35 : 1;
      this.player
        .setPosition(ppx, this.playerY + bob)
        .setDisplaySize(pSize, pSize)
        .setAngle(clamp(this.pvx / MAX_STEER, -1, 1) * 22)
        .setAlpha(blink)
        .setVisible(this.phase !== "ready"); // the start card shows a big player emoji instead
    }

    // Power-up visuals around the player.
    const f = this.gfxFront;
    f.clear();
    if (!crashed) {
      if (this.boostT > 0) {
        f.fillStyle(0xff8a3d, 0.22 + Math.sin(this.now * 20) * 0.08);
        f.fillCircle(ppx, this.playerY, PLAYER_SIZE * u * 0.85);
      }
      if (this.shield) {
        f.lineStyle(Math.max(2, u * 0.09), 0x4fd1ff, 0.6 + Math.sin(this.now * 6) * 0.2);
        f.strokeCircle(ppx, this.playerY, PLAYER_SIZE * u * 0.78);
      }
      if (this.magnetT > 0) {
        f.lineStyle(Math.max(1, u * 0.04), 0xff4d7a, 0.28);
        f.strokeCircle(ppx, this.playerY, MAGNET_RADIUS * u * (0.9 + ((this.now * 0.8) % 0.2)));
      }
    }

    this.renderBackground();
  }

  /** Photo parallax: pans down the photo as the run progresses, sways with the player. */
  private renderBackground() {
    const img = this.dom.img;
    if (!img) return;
    const frac = this.phase === "ready" ? 0 : clamp(this.progress() / this.target, 0, 1);
    const tx = (0.5 - this.px) * 4; // %
    const ty = 5 - frac * 10 + Math.sin(this.now * 0.4) * 0.6; // %
    const scale = 1.16 + (this.boostT > 0 ? 0.03 : 0);
    const t = `translate3d(${tx.toFixed(2)}%,${ty.toFixed(2)}%,0) scale(${scale})`;
    if (t !== this.bgTransform) {
      this.bgTransform = t;
      img.style.transform = t;
    }
  }

  private renderHud() {
    const { dom, spec } = this;
    const progress = this.progress();
    const text = `${fmt(Math.min(progress, this.target))} / ${fmt(this.target)} ${spec.scoreLabel}`;
    if (text !== this.hudText) {
      this.hudText = text;
      dom.barText.textContent = text;
    }
    const fill = Math.round(clamp(progress / this.target, 0, 1) * 500) / 500;
    if (fill !== this.hudFill) {
      this.hudFill = fill;
      dom.fill.style.transform = `scaleX(${fill})`;
    }
    const count = `${spec.collectible} ${fmt(this.collected)}`;
    if (count !== this.hudCount) {
      this.hudCount = count;
      dom.count.textContent = count;
    }
    const states: Record<PowerupKind, number> = {
      boost: this.boostT > 0 ? this.boostT / POWERUPS.boost.seconds : 0,
      shield: this.shield ? 1 : 0,
      magnet: this.magnetT > 0 ? this.magnetT / POWERUPS.magnet.seconds : 0,
    };
    (Object.keys(states) as PowerupKind[]).forEach((kind) => {
      const v = Math.round(states[kind] * 100) / 100;
      if (v === this.hudPills[kind]) return;
      const wasOn = this.hudPills[kind] > 0;
      this.hudPills[kind] = v;
      const { pill, bar } = dom.pills[kind];
      if (v > 0 !== wasOn) pill.classList.toggle("vb-on", v > 0);
      bar.style.transform = `scaleX(${v})`;
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------------------------

const BOOT_TIMEOUT_MS = 12000;
const MAX_CANVAS_PIXELS = 2_600_000;

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export function mountGame(parent: HTMLElement, opts: MountGameOptions): () => void {
  const { spec, backgroundUrl } = opts;
  const theme = THEMES[spec.timeOfDay] ?? THEMES.day;
  const dom = buildDom(parent, spec, backgroundUrl, theme);
  const ctl = new RunnerController(spec, theme, dom);
  const root = dom.root;
  // Dev-only inspection hook: open the page with ?vbdebug to get window.__vb (the controller).
  if (/[?&]vbdebug\b/.test(window.location.search)) {
    (window as unknown as Record<string, unknown>).__vb = ctl;
  }

  let destroyed = false;
  let readyFired = false;
  let errorFired = false;
  let game: Phaser.Game | null = null;
  const cleanups: (() => void)[] = [];

  const fail = (e: unknown) => {
    if (destroyed || errorFired) return;
    errorFired = true;
    console.error("[vibebook] game error", e);
    const box = el("div", "vb-layer vb-err", root, "Couldn't start the game on this device.");
    box.setAttribute("role", "alert");
    try {
      game?.pause();
    } catch {
      /* ignore */
    }
    opts.onError?.(e);
  };

  const fireReady = () => {
    if (destroyed || readyFired || errorFired) return;
    readyFired = true;
    opts.onReady();
  };

  // ---- sizing -------------------------------------------------------------------------------
  // Render at up to 2x device pixels (capped by total pixel count) for crisp emoji on phones.
  // Phaser runs in Scale.NONE with zoom = 1/r: the canvas backing store is css*r and its CSS
  // size is css (also forced to 100% by the stylesheet).
  const cssSize = () => {
    const rect = root.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  };
  const initial = cssSize();
  const iw = Math.max(1, initial.w || parent.clientWidth || 360);
  const ih = Math.max(1, initial.h || parent.clientHeight || 640);
  const renderScale = (w: number, h: number) => {
    const dpr = typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    return Math.max(1, Math.min(dpr, 2, Math.sqrt(MAX_CANVAS_PIXELS / (w * h))));
  };
  let r = renderScale(iw, ih);

  const setCssUnit = (w: number, h: number) => {
    const uCss = Math.min(w, h * FIELD_MAX_ASPECT) / FIELD_UNITS;
    root.style.setProperty("--vb-u", `${uCss.toFixed(2)}px`);
  };
  setCssUnit(iw, ih);

  const applySize = () => {
    if (destroyed || !game || !ctl.attached) return;
    const { w, h } = cssSize();
    if (w < 2 || h < 2) return; // hidden; keep the last size
    setCssUnit(w, h);
    const nextR = renderScale(w, h);
    if (Math.abs(nextR - r) > 0.01) {
      r = nextR;
      game.scale.setZoom(1 / r);
    }
    const gw = Math.round(w * r);
    const gh = Math.round(h * r);
    if (gw === game.scale.width && gh === game.scale.height) return;
    game.scale.resize(gw, gh);
    ctl.layout(gw, gh);
  };

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => applySize());
    ro.observe(root);
    cleanups.push(() => ro.disconnect());
  }
  const onWinResize = () => applySize();
  const onOrientation = () => window.setTimeout(applySize, 250); // iOS reports stale sizes at first
  window.addEventListener("resize", onWinResize);
  window.addEventListener("orientationchange", onOrientation);
  cleanups.push(() => {
    window.removeEventListener("resize", onWinResize);
    window.removeEventListener("orientationchange", onOrientation);
  });

  // ---- input --------------------------------------------------------------------------------
  const toGameX = (clientX: number) => {
    const rect = root.getBoundingClientRect();
    const scaleX = game ? game.scale.width / Math.max(1, rect.width) : r;
    return (clientX - rect.left) * scaleX;
  };
  const focusRoot = () => {
    try {
      root.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  };

  let activePointer: number | null = null;
  const listen = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  if (typeof window.PointerEvent === "function") {
    listen(root, "pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (activePointer !== null && activePointer !== e.pointerId) return; // ignore extra fingers
      activePointer = e.pointerId;
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      focusRoot();
      ctl.pointerStart(toGameX(e.clientX));
      e.preventDefault();
    });
    listen(root, "pointermove", (e) => {
      if (e.pointerId !== activePointer) return;
      ctl.pointerMove(toGameX(e.clientX));
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      ctl.pointerEnd();
    };
    listen(root, "pointerup", up);
    listen(root, "pointercancel", up);
    listen(root, "lostpointercapture", up);
  } else {
    // Very old WebViews without Pointer Events.
    listen(
      root,
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        if (t) ctl.pointerStart(toGameX(t.clientX));
      },
      { passive: false },
    );
    listen(
      root,
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (t) ctl.pointerMove(toGameX(t.clientX));
      },
      { passive: false },
    );
    listen(root, "touchend", (e) => {
      if (e.touches.length === 0) ctl.pointerEnd();
    });
    listen(root, "touchcancel", () => ctl.pointerEnd());
    let mouseDown = false;
    listen(root, "mousedown", (e) => {
      mouseDown = true;
      focusRoot();
      ctl.pointerStart(toGameX(e.clientX));
    });
    listen(window, "mousemove", (e) => {
      if (mouseDown) ctl.pointerMove(toGameX(e.clientX));
    });
    listen(window, "mouseup", () => {
      mouseDown = false;
      ctl.pointerEnd();
    });
  }
  // Block page scroll, pinch / double-tap zoom, long-press menus inside the game area.
  const block = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  listen(root, "touchstart", block, { passive: false });
  listen(root, "touchmove", block, { passive: false });
  listen(root, "touchend", block, { passive: false });
  listen(root, "contextmenu", block);
  listen(root, "dblclick", block);
  root.addEventListener("gesturestart", block, { passive: false }); // iOS Safari pinch
  cleanups.push(() => root.removeEventListener("gesturestart", block));

  // Only react to keys aimed at the game (focus inside it) or at nothing in particular (body),
  // so buttons, links and inputs elsewhere on the host page keep their keyboard behaviour.
  const ownsKeyEvent = (t: EventTarget | null) =>
    !t || t === window || t === document || t === document.body || t === document.documentElement ||
    (t instanceof Node && root.contains(t));
  const ignoredKeys = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "Escape"]);
  listen(window, "keydown", (e) => {
    if (typeof e.key !== "string") return; // e.g. synthetic keydowns fired by autofill
    if (e.ctrlKey || e.metaKey || e.altKey || ignoredKeys.has(e.key)) return;
    // "Any key" = printable keys, arrows, Enter; never F-keys, media keys etc.
    if (e.key.length !== 1 && !e.key.startsWith("Arrow") && e.key !== "Enter") return;
    if (isTypingTarget(e.target) || !ownsKeyEvent(e.target)) return;
    if (ctl.key(e.code, true)) e.preventDefault();
  });
  listen(window, "keyup", (e) => {
    if (ctl.key(e.code, false)) e.preventDefault();
  });
  listen(window, "blur", () => {
    activePointer = null;
    ctl.releaseAllInput();
  });

  // ---- boot Phaser --------------------------------------------------------------------------
  // Fails only if Phaser never got as far as creating the scene (scene creation happens on boot,
  // independent of requestAnimationFrame). Once created, the first frame can legitimately be
  // delayed by a hidden or throttled tab, so we just wait for it.
  const watchdog = () => {
    if (destroyed || readyFired || errorFired || ctl.attached) return;
    if (document.visibilityState === "hidden") {
      timer = window.setTimeout(watchdog, BOOT_TIMEOUT_MS);
      return;
    }
    fail(new Error("Game did not boot in time"));
  };
  let timer = 0;

  import("phaser")
    .then((mod) => {
      if (destroyed) return;
      const P = ((mod as unknown as { default?: PhaserModule }).default ?? mod) as PhaserModule;
      // Armed only once the (large) Phaser chunk has arrived, so a slow network isn't an error.
      timer = window.setTimeout(watchdog, BOOT_TIMEOUT_MS);

      class RunnerScene extends P.Scene {
        constructor() {
          super({ key: "vb-runner" });
        }
        create() {
          try {
            ctl.attach(this);
            applySize();
            this.game.events.once(P.Core.Events.POST_RENDER, fireReady);
          } catch (e) {
            fail(e);
          }
        }
        update(_time: number, delta: number) {
          if (errorFired) return;
          try {
            ctl.update(delta);
          } catch (e) {
            fail(e);
          }
        }
      }

      try {
        game = new P.Game({
          type: P.AUTO,
          parent: dom.canvasHost,
          transparent: true,
          banner: false,
          autoFocus: false,
          disableContextMenu: true,
          audio: { noAudio: true },
          input: { keyboard: false, mouse: false, touch: false, gamepad: false },
          scale: {
            mode: P.Scale.NONE,
            width: Math.round(iw * r),
            height: Math.round(ih * r),
            zoom: 1 / r,
            autoCenter: P.Scale.NO_CENTER,
            expandParent: false,
          },
          render: { antialias: true, transparent: true },
          scene: RunnerScene,
        });
      } catch (e) {
        fail(e);
      }
    })
    .catch(fail);

  return () => {
    if (destroyed) return;
    destroyed = true;
    window.clearTimeout(timer);
    cleanups.forEach((fn) => fn());
    const g = game;
    game = null;
    if (g) {
      // Read now: Phaser's destroy is deferred to the next step and nulls renderer.gl.
      const glCtx = (g.renderer as { gl?: WebGLRenderingContext | null } | null)?.gl ?? null;
      // Phaser doesn't release the WebGL context; do it ourselves so remounts never hit the
      // browser's live-context cap.
      g.events.once("destroy", () => {
        window.setTimeout(() => {
          try {
            glCtx?.getExtension("WEBGL_lose_context")?.loseContext();
          } catch {
            /* ignore */
          }
        }, 0);
      });
      try {
        g.destroy(true);
      } catch {
        /* ignore */
      }
    }
    root.remove();
  };
}
