// Landing, upload page, the shared link and its preview card, against the real dev server.
// The shared link reads two fixture experiences written to the local store (.data/), so no model is called.
import { expect, test, type Page } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

test.describe.configure({ mode: "default" }); // one worker, so the fixtures outlive every test that reads them

const DATA = path.join(process.env.VIBEBOOK_WEB_DIR ?? path.resolve(__dirname, ".."), ".data");

function fixture(id: string, over: Record<string, unknown>) {
  return {
    id,
    parentId: null,
    kind: "app",
    version: 1,
    spec: null,
    html: "<main><h1>Camp checklist</h1><button>Copy</button></main>",
    title: "Camp Checklist",
    tagline: "Pack for a night under the stars",
    imageId: null,
    source: { platform: "facebook", postUrl: "https://www.facebook.com/team/posts/999", captionExcerpt: "Camp night" },
    suggestion: { kind: "app", genre: "none", emoji: "🏕️", title: "Camp Checklist", pitch: "Pack fast." },
    creatorName: "Tester",
    editTokenHash: "x",
    published: true,
    createdAt: 0,
    versions: [],
    trace: [],
    ...over,
  };
}

test.beforeAll(async () => {
  await mkdir(DATA, { recursive: true });
  await writeFile(path.join(DATA, "exp_pw_parent.json"), JSON.stringify(fixture("pw_parent", { creatorName: "Ohm", title: "Camp Notes" })));
  await writeFile(
    path.join(DATA, "exp_pw_share.json"),
    JSON.stringify(fixture("pw_share", { parentId: "pw_parent", learningLevel: "grades-4-6" })),
  );
});

test.afterAll(async () => {
  await rm(path.join(DATA, "exp_pw_parent.json"), { force: true });
  await rm(path.join(DATA, "exp_pw_share.json"), { force: true });
});

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

const overflowsSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
  test(`landing and upload page fit ${viewport.width}px without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator('a[href="/app"]').first()).toBeVisible();
    expect(await overflowsSideways(page)).toBe(false);
    await page.goto("/app");
    await expect(page.locator("#vb-caption")).toBeVisible();
    expect(await overflowsSideways(page)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("upload page needs a photo or a caption", async ({ page }) => {
  await page.goto("/app");
  const submit = page.locator("form button:not([type=button])").last();
  await expect(submit).toBeDisabled();
  await page.locator("#vb-caption").fill("Camp night");
  await expect(submit).toBeEnabled();
});

test("shared link plays the app and credits both creators", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/p/pw_share");
  await expect(page.getByRole("heading", { name: "Camp Checklist" })).toBeVisible();
  await expect(page.getByText("Made by Tester from a facebook post")).toBeVisible();
  await expect(page.getByText("Remixed from Camp Notes by Ohm")).toBeVisible();
  // /play frames the app's HTML in its own sandboxed iframe
  await expect(page.frameLocator("iframe").frameLocator("iframe").getByRole("heading", { name: "Camp checklist" })).toBeVisible();
  await expect(page.getByText(/could not load|got stuck/i)).toBeHidden();
  expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/\/api\/og\/pw_share\?v=1$/);

  await page.getByRole("button", { name: /remix/i }).click();
  await expect(page.locator("#vb-remix")).toBeFocused();
  expect(errors).toEqual([]);
});

test("shared link shows its learning level @new", async ({ page }) => {
  await page.goto("/p/pw_share");
  await expect(page.getByText("Grades 4–6")).toBeVisible();
});

test("link preview card renders", async ({ request }) => {
  const res = await request.get("/api/og/pw_share");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("unknown link is a 404", async ({ request }) => {
  expect((await request.get("/p/does_not_exist")).status()).toBe(404);
});

test("/api/vibe rejects a post with no photo and no caption", async ({ request }) => {
  const res = await request.post("/api/vibe", { data: {} });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe("Send a photo or a caption.");
});
