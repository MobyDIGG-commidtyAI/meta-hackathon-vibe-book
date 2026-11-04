// End-to-end against a running deployment with the real model: photo → ideas → game → change → share →
// shared link (player, photo, preview card) → remix, and an app. Off unless VIBEBOOK_LIVE=1, because it spends
// AI credits (about six model calls) and takes a few minutes:
//   VIBEBOOK_LIVE=1 VIBEBOOK_BASE_URL=https://vibebook.example.com npx playwright test live
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

test.skip(!process.env.VIBEBOOK_LIVE, "set VIBEBOOK_LIVE=1 to run against the real model");
test.describe.configure({ mode: "serial" });

const PHOTO = path.resolve(__dirname, "../public/landing/everest.jpg");
const ideas = (page: Page) => page.getByRole("region", { name: "Things you can make" }).getByRole("button");

async function readPhoto(page: Page) {
  await page.goto("/app");
  await page.locator('input[type="file"]').setInputFiles(PHOTO);
  await page.locator("#vb-caption").fill("Sunrise above the clouds on the trail to Everest Base Camp. Still can't believe we made it.");
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(ideas(page)).toHaveCount(3, { timeout: 90_000 });
}

let shared = "";

test("photo → ideas → game → change → share", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await readPhoto(page);
  const game = ideas(page).filter({ has: page.locator(".tag.game") }).first();
  await (await game.count() ? game : ideas(page).first()).click();
  await expect(page.getByText(/(Game|App) loaded/).first()).toBeVisible({ timeout: 180_000 });

  await page.locator("#vb-change").fill("make it night and faster");
  await page.locator("#vb-change").press("Enter");
  await expect(page.getByLabel("Changes so far")).toBeVisible({ timeout: 120_000 });

  await page.locator("#vb-name").fill("Live test");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your link is ready" })).toBeVisible({ timeout: 30_000 });
  shared = (await page.locator('a[href*="/p/"]').first().getAttribute("href"))!;
  expect(shared).toMatch(/\/p\/[\w-]+$/);
});

test("the shared link plays, shows its photo and preview card, and remixes", async ({ page, request }) => {
  test.setTimeout(4 * 60_000);
  test.skip(!shared, "needs the shared link from the previous test");
  const id = shared.split("/p/")[1];
  // APP_URL decides the host in the link; it has to be this deployment.
  expect(new URL(shared).origin).toBe(new URL(test.info().project.use.baseURL!).origin);

  await page.goto(`/p/${id}`);
  await expect(page.getByText("Made by Live test")).toBeVisible();
  await expect(page.frameLocator("iframe").locator("canvas, iframe").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/could not load|got stuck/i)).toBeHidden();

  const og = await request.get(`/api/og/${id}`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
  const { experience } = await (await request.get(`/api/experiences/${id}`)).json();
  expect(experience.imageId).toBeTruthy();
  const photo = await request.get(`/api/img/${experience.imageId}`);
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toMatch(/^image\//);

  await page.getByRole("button", { name: /remix/i }).click();
  await page.locator("#vb-remix").fill("add falling snow");
  await page.locator("#vb-remix-name").fill("Live friend");
  await page.locator("#vb-remix").press("Enter");
  await expect(page).not.toHaveURL(new RegExp(`/p/${id}$`), { timeout: 120_000 });
  await expect(page.getByText(/Remixed from .* by Live test/)).toBeVisible();
});

test("an app idea builds and loads", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await readPhoto(page);
  const app = ideas(page).filter({ has: page.locator(".tag.app") }).first();
  test.skip(!(await app.count()), "the model suggested no app for this photo");
  await app.click();
  await expect(page.getByText("App loaded")).toBeVisible({ timeout: 240_000 });
});
