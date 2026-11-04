// Browser tests for the web app and the extension's content script. No model calls: the AI routes are mocked.
// Runs on the installed Google Chrome (this is a Chrome extension project). Starts `next dev` on :3210 unless
// VIBEBOOK_BASE_URL points at a server that's already running.
import { defineConfig } from "@playwright/test";

const port = 3210;
const external = process.env.VIBEBOOK_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: external ?? `http://localhost:${port}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: external
    ? undefined
    : { command: `npx next dev -p ${port}`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 120_000 },
});
