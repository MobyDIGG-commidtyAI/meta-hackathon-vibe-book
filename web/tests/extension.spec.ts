// The content script on a Facebook-shaped page. The chip and panel live in closed shadow roots, so the tests
// find them the way a user does: by what is drawn at a point. "@new" marks behaviour the old capsule build
// didn't have (text-post and video chips); run the rest against main to compare.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const EXT_DIR = process.env.VIBEBOOK_EXTENSION_DIR ?? path.resolve(__dirname, "../../extension");
const EXT_ORIGIN = "https://vibebook-extension.test";
const FEED = "https://www.facebook.com/";
const PHOTO = path.join(EXT_DIR, "dev/sample.jpg");

type Box = { left: number; top: number; right: number; bottom: number };
type Payload = { imageUrl: string | null; caption: string; postUrl: string; platform: string };

async function openFeed(page: Page) {
  await page.addInitScript((origin) => {
    // What chrome.* looks like to a content script: the panel's URL and the toolbar button's message.
    Object.assign(window, {
      chrome: {
        runtime: {
          getURL: (p: string) => `${origin}/${p}`,
          onMessage: { addListener: (fn: (msg: unknown) => void) => Object.assign(window, { __toolbar: fn }) },
        },
      },
    });
  }, EXT_ORIGIN);
  await page.route(`${FEED}**`, async (route) =>
    route.fulfill({ contentType: "text/html", body: await readFile(path.join(__dirname, "fixtures/fb-feed.html")) }),
  );
  await page.route("https://scontent.xx.fbcdn.net/**", (route) => route.fulfill({ path: PHOTO }));
  await page.route("https://shop.example/**", (route) => route.fulfill({ path: PHOTO }));
  await page.route(`${EXT_ORIGIN}/**`, (route) => route.fulfill({ path: path.join(EXT_DIR, new URL(route.request().url()).pathname) }));
  await page.route("http://localhost:3000/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>VibeBook app</p>" }));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(FEED);
}

const box = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });

// A point inside the area where something of ours (a <vibebook-*> host) is the topmost thing drawn, or null.
function chipIn(page: Page, area: Box) {
  return page.evaluate((a) => {
    for (let y = Math.max(a.top, 0) + 4; y < Math.min(a.bottom, innerHeight); y += 4) {
      for (let x = a.right - 4; x > a.left; x -= 6) {
        if (document.elementFromPoint(x, y)?.tagName.startsWith("VIBEBOOK-")) return { x, y };
      }
    }
    return null;
  }, area);
}

// The top-right corner of an element, where the chip sits.
async function corner(page: Page, selector: string): Promise<Box> {
  const r = await box(page, selector);
  return { left: r.right - 180, top: r.top, right: r.right, bottom: Math.min(r.top + 70, r.bottom) };
}

async function chipAt(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await expect.poll(async () => chipIn(page, await corner(page, selector)), { message: `chip on ${selector}` }).not.toBeNull();
  return (await chipIn(page, await corner(page, selector)))!;
}

function panelFrame(page: Page) {
  return page.frames().find((f) => f.url().startsWith(`${EXT_ORIGIN}/panel.html`)) ?? null;
}

async function vibe(page: Page, selector: string): Promise<Payload> {
  const { x, y } = await chipAt(page, selector);
  await page.mouse.click(x, y);
  await expect.poll(() => panelFrame(page)?.url() ?? null).not.toBeNull();
  return JSON.parse(decodeURIComponent(new URL(panelFrame(page)!.url()).hash.slice(1)));
}

test.describe("Vibe chip", () => {
  test.beforeEach(async ({ page }) => openFeed(page));

  test("sits on a feed photo and opens the panel with that post", async ({ page }) => {
    const post = await vibe(page, "#p1-photo");
    expect(post).toEqual({
      imageUrl: "https://scontent.xx.fbcdn.net/v/everest.jpg",
      caption: expect.stringContaining("Sunrise on Everest"),
      postUrl: "https://www.facebook.com/team/posts/12345",
      platform: "facebook",
    });
  });

  test("every photo in a multi-photo post has its own chip", async ({ page }) => {
    expect((await vibe(page, "#p3-a")).imageUrl).toBe("https://scontent.xx.fbcdn.net/v/camp.jpg");
    await page.keyboard.press("Escape");
    const second = await vibe(page, "#p3-b");
    expect(second.imageUrl).toBe("https://scontent.xx.fbcdn.net/v/market.jpg");
    expect(second.caption).toContain("Two views from the trip");
  });

  test("skips avatars and photos that aren't on fbcdn", async ({ page }) => {
    await chipAt(page, "#p1-photo"); // the script has run
    for (const avatar of await page.locator(".head img").all()) {
      const r = await avatar.evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(await chipIn(page, { left: r.left, top: r.top, right: r.right, bottom: r.bottom })).toBeNull();
    }
    expect(await chipIn(page, await corner(page, "#p4-photo"))).toBeNull();
  });

  test("is hidden while a dialog covers the photo", async ({ page }) => {
    await chipAt(page, "#p1-photo");
    await page.locator("#cover").evaluate((el) => el.removeAttribute("hidden")); // FB toggles dialogs without our attributes
    await expect.poll(async () => chipIn(page, await corner(page, "#p1-photo"))).toBeNull();
    await page.locator("#cover").evaluate((el) => el.setAttribute("hidden", ""));
    await chipAt(page, "#p1-photo");
  });

  test("never draws over FB's top bar", async ({ page }) => {
    await chipAt(page, "#p1-photo");
    const before = await box(page, "#p1-photo");
    await page.evaluate((dy) => scrollBy(0, dy), before.top - 30); // the photo's top edge slides under the 56px bar
    const photo = await box(page, "#p1-photo");
    expect(photo.top).toBeCloseTo(30, 0);
    const bar = { left: photo.right - 180, top: 0, right: photo.right, bottom: 56 };
    await expect.poll(async () => chipIn(page, bar)).toBeNull();
    await page.waitForTimeout(1200); // and it stays hidden
    expect(await chipIn(page, bar)).toBeNull();
  });

  test("sits on the visible part of a cropped tall photo", async ({ page }) => {
    expect((await vibe(page, "#p6-crop")).imageUrl).toBe("https://scontent.xx.fbcdn.net/v/portrait.jpg");
  });

  test("follows its photo when the page scrolls", async ({ page }) => {
    await chipAt(page, "#p3-b");
    await page.mouse.wheel(0, 200);
    await chipAt(page, "#p3-b");
  });

  test("sits on a post opened in a dialog", async ({ page }) => {
    await page.locator("#post-dialog").evaluate((el) => el.removeAttribute("hidden"));
    const post = await vibe(page, "#pd-photo");
    expect(post.imageUrl).toBe("https://scontent.xx.fbcdn.net/v/camp-dialog.jpg");
    expect(post.caption).toContain("Camp night");
    expect(post.postUrl).toBe("https://www.facebook.com/team/posts/999");
  });

  test("sits on a photo in the photo viewer", async ({ page }) => {
    await page.locator("#viewer").evaluate((el) => el.removeAttribute("hidden"));
    expect((await vibe(page, "#viewer-photo")).imageUrl).toBe("https://scontent.xx.fbcdn.net/v/viewer.jpg");
  });

  test("comes back after FB re-renders the post", async ({ page }) => {
    await chipAt(page, "#p1-photo");
    await page.locator("#p1-photo").evaluate((el) => el.replaceWith(el.cloneNode(true)));
    expect((await vibe(page, "#p1-photo")).imageUrl).toBe("https://scontent.xx.fbcdn.net/v/everest.jpg");
  });

  test("appears on posts added by infinite scroll", async ({ page }) => {
    await chipAt(page, "#p1-photo");
    await page.locator("#p1").evaluate((p) => {
      const copy = p.cloneNode(true) as HTMLElement;
      copy.id = "p9";
      copy.querySelector(".photo")!.id = "p9-photo";
      copy.querySelector(".photo img")!.setAttribute("src", "https://scontent.xx.fbcdn.net/v/new.jpg");
      p.parentElement!.prepend(copy);
    });
    expect((await vibe(page, "#p9-photo")).imageUrl).toBe("https://scontent.xx.fbcdn.net/v/new.jpg");
  });

  test("a click reaches neither the photo link nor FB's handlers", async ({ page }) => {
    await page.locator("#p1").evaluate((p) => {
      const seen: string[] = [];
      Object.assign(window, { __seen: seen });
      for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) p.addEventListener(type, () => seen.push(type));
    });
    await vibe(page, "#p1-photo");
    expect(page.url()).toBe(FEED);
    expect(await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual([]);
  });

  test("text-only posts get a chip @new", async ({ page }) => {
    const post = await vibe(page, "#p2");
    expect(post.imageUrl).toBeNull();
    expect(post.caption).toContain("log in every single time");
    expect(post.postUrl).toBe("https://www.facebook.com/ohm/posts/67890");
  });

  test("video posts get a chip that sends the poster @new", async ({ page }) => {
    let played = false;
    await page.exposeFunction("__played", () => (played = true));
    await page.locator("#p5-controls").evaluate((el) => el.addEventListener("click", () => (window as unknown as { __played: () => void }).__played()));
    const post = await vibe(page, "#p5-video"); // the chip has to win over FB's transparent click layer
    expect(played).toBe(false);
    expect(post.imageUrl).toBe("https://scontent.xx.fbcdn.net/v/market-poster.jpg");
    expect(post.postUrl).toBe("https://www.facebook.com/reel/777");
  });
});

test.describe("Panel", () => {
  test.beforeEach(async ({ page }) => openFeed(page));

  test("closes on Escape", async ({ page }) => {
    await vibe(page, "#p1-photo");
    await page.keyboard.press("Escape");
    await expect.poll(() => panelFrame(page)).toBeNull();
  });

  test("closes when the panel asks to", async ({ page }) => {
    await vibe(page, "#p1-photo");
    await panelFrame(page)!.locator("#close").click();
    await expect.poll(() => panelFrame(page)).toBeNull();
  });

  test("the toolbar button opens the post in the middle of the screen", async ({ page }) => {
    await chipAt(page, "#p1-photo");
    await page.locator("#p3").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.evaluate(() => (window as unknown as { __toolbar: (m: unknown) => void }).__toolbar({ type: "vibebook:open-center" }));
    await expect.poll(() => panelFrame(page)?.url() ?? null).not.toBeNull();
    const post: Payload = JSON.parse(decodeURIComponent(new URL(panelFrame(page)!.url()).hash.slice(1)));
    expect(post.caption).toContain("Two views from the trip");
    expect(post.postUrl).toBe("https://www.facebook.com/bird/posts/24680");
  });
});
