// The create flow (VibeFlow) on /app and inside the extension's /panel, with every model route mocked:
// read the post → three ideas → build → load → change → share, plus the error and retry paths.
import { expect, test, type Page, type Request } from "@playwright/test";
import path from "node:path";

const PHOTO = path.resolve(__dirname, "../../extension/dev/sample.jpg");

const suggestions = [
  { kind: "game", genre: "runner", emoji: "🏔️", title: "Summit Dash", pitch: "Run up Everest and grab the oxygen." },
  { kind: "game", genre: "puzzle", emoji: "🧩", title: "Peak Puzzle", pitch: "Put your sunrise back together." },
  { kind: "app", genre: "none", emoji: "🧭", title: "Altitude Lab", pitch: "See how air thins as you climb." },
];

function experience(version: number) {
  return {
    id: "exp_pw",
    parentId: null,
    kind: "game",
    version,
    spec: null,
    html: null,
    title: "Summit Dash",
    tagline: "Run up Everest",
    imageId: "img_pw",
    source: { platform: "web", postUrl: "", captionExcerpt: "Sunrise" },
    suggestion: suggestions[0],
    learningLevel: "general",
    creatorName: "",
    published: false,
    createdAt: 0,
    versions: [],
    trace: [{ step: version === 1 ? "build" : "edit", model: "mock", ms: 1500, ok: true }],
  };
}

type Calls = Record<string, Request[]>;

// Mocks the API and the /play iframe. `vibeFails` makes the first N /api/vibe calls fail.
async function mockApi(page: Page, { vibeFails = 0 } = {}) {
  const calls: Calls = { vibe: [], build: [], edit: [], publish: [] };
  await page.route("**/api/vibe", async (route) => {
    calls.vibe.push(route.request());
    if (calls.vibe.length <= vibeFails) return route.fulfill({ status: 500, json: { error: "The model is busy" } });
    const level = route.request().postDataJSON().learningLevel ?? "general";
    await route.fulfill({
      json: {
        imageId: "img_pw",
        scene: { description: "Snowy peaks above the clouds", mood: "calm" },
        suggestions: suggestions.map((s) => ({ ...s, title: level === "general" ? s.title : `${s.title} Jr` })),
        trace: [{ step: "suggest", model: "mock", ms: 1200, ok: true }],
      },
    });
  });
  await page.route("**/api/experiences", async (route) => {
    calls.build.push(route.request());
    await route.fulfill({ json: { editToken: "tok_pw", experience: experience(1) } });
  });
  await page.route("**/api/experiences/exp_pw/edit", async (route) => {
    calls.edit.push(route.request());
    await route.fulfill({ json: { experience: experience(2), changeSummary: ["night sky"], unsupported: "" } });
  });
  await page.route("**/api/experiences/exp_pw/publish", async (route) => {
    calls.publish.push(route.request());
    await route.fulfill({ json: { url: "http://localhost:3210/p/exp_pw" } });
  });
  await page.route("**/play/exp_pw**", (route) =>
    route.fulfill({ contentType: "text/html", body: `<p>game</p><script>parent.postMessage({ type: "vibebook:ready" }, "*")</script>` }),
  );
  return calls;
}

const ideas = (page: Page) => page.getByRole("region", { name: "Things you can make" }).getByRole("button");
const notice = (page: Page) => page.getByRole("alert").filter({ has: page.getByRole("button", { name: /try again/i }) });

async function startOnApp(page: Page) {
  await page.goto("/app");
  await page.locator('input[type="file"]').setInputFiles(PHOTO);
  await page.locator("#vb-caption").fill("Sunrise on Everest. Still can't believe we made it up here");
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
}

test("photo + caption → three ideas → game → change → share", async ({ page }) => {
  const calls = await mockApi(page);
  await startOnApp(page);

  await expect(ideas(page)).toHaveCount(3);
  await expect(ideas(page).first()).toContainText("Summit Dash");
  const read = calls.vibe[0].postDataJSON();
  expect(read.caption).toContain("Sunrise on Everest");
  expect(read.image).toMatch(/^data:image\/jpeg;base64,/);

  await ideas(page).first().click();
  await expect(page.getByText("Game loaded")).toBeVisible();
  const build = calls.build[0].postDataJSON();
  expect(build).toMatchObject({ imageId: "img_pw", suggestion: { title: "Summit Dash" }, source: { platform: "web" } });

  await page.locator("#vb-change").fill("make it night");
  await page.locator("#vb-change").press("Enter");
  await expect(page.getByLabel("Changes so far")).toContainText("night sky");
  expect(calls.edit[0].headers()["x-edit-token"]).toBe("tok_pw");
  expect(calls.edit[0].postDataJSON()).toEqual({ instruction: "make it night" });

  await page.locator("#vb-name").fill("Tester");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your link is ready" })).toBeVisible();
  await expect(page.getByRole("link", { name: "http://localhost:3210/p/exp_pw" })).toBeVisible();
  expect(calls.publish[0].postDataJSON()).toEqual({ creatorName: "Tester" });
  expect(calls.publish[0].headers()["x-edit-token"]).toBe("tok_pw");

  await page.getByRole("button", { name: /other ideas/i }).click();
  await expect(ideas(page)).toHaveCount(3);
});

test("a failed read shows the error and Try again recovers", async ({ page }) => {
  await mockApi(page, { vibeFails: 1 });
  await startOnApp(page);
  await expect(notice(page)).toContainText("The model is busy");
  await notice(page).getByRole("button", { name: /try again/i }).click();
  await expect(ideas(page)).toHaveCount(3);
});

test("a game that never loads offers the other ideas again", async ({ page }) => {
  await mockApi(page);
  await page.route("**/play/exp_pw**", (route) =>
    route.fulfill({ contentType: "text/html", body: `<script>parent.postMessage({ type: "vibebook:error", message: "boom" }, "*")</script>` }),
  );
  await startOnApp(page);
  await ideas(page).first().click();
  await expect(notice(page)).toBeVisible();
  await notice(page).getByRole("button", { name: /try again/i }).click();
  await expect(ideas(page)).toHaveCount(3);
});

test("the extension panel hands over the post and closes on request", async ({ page }) => {
  const calls = await mockApi(page);
  // The extension's panel.html: frames /panel, waits for its ready ping, sends the post, forwards close.
  await page.route("**/__pw/host", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<iframe src="/panel" style="width:440px;height:760px;border:0"></iframe><script>
        addEventListener("message", (e) => {
          if (e.data?.type === "vibebook:panel-ready")
            e.source.postMessage({ type: "vibebook:post", post: { image: null, caption: "Camp night under the stars", postUrl: "https://www.facebook.com/team/posts/999", platform: "facebook" } }, "*");
          if (e.data?.type === "vibebook:close") document.title = "closed";
        });
      </script>`,
    }),
  );
  await page.goto("/__pw/host");
  const panel = page.frameLocator("iframe");
  await expect(panel.getByRole("region", { name: "Things you can make" }).getByRole("button")).toHaveCount(3);
  expect(calls.vibe[0].postDataJSON()).toMatchObject({ caption: "Camp night under the stars", postUrl: "https://www.facebook.com/team/posts/999" });
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveTitle("closed");
});

test.describe("learning level @new", () => {
  test("re-reads the post for the chosen level and builds at that level", async ({ page }) => {
    const calls = await mockApi(page);
    await startOnApp(page);
    await expect(ideas(page)).toHaveCount(3);
    expect(calls.vibe[0].postDataJSON().learningLevel).toBe("general");

    await page.locator("#vb-learning-level").selectOption("grades-1-3");
    await expect(ideas(page).first()).toContainText("Summit Dash Jr");
    expect(calls.vibe[1].postDataJSON().learningLevel).toBe("grades-1-3");

    await ideas(page).first().click();
    await expect(page.getByText("Game loaded")).toBeVisible();
    expect(calls.build[0].postDataJSON().learningLevel).toBe("grades-1-3");
  });

  test("can't change level while ideas are loading", async ({ page }) => {
    await mockApi(page);
    await page.route("**/api/vibe", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fallback();
    });
    await startOnApp(page);
    await expect(page.locator("#vb-learning-level")).toBeDisabled();
    await expect(ideas(page)).toHaveCount(3);
    await expect(page.locator("#vb-learning-level")).toBeEnabled();
  });
});
