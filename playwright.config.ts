import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config.
 *
 * Notable choices (all things an interviewer might ask about):
 *  - `forbidOnly` in CI: a stray `test.only` fails the build instead of
 *    silently skipping the rest of the suite.
 *  - `retries` only in CI: local runs surface flakes immediately; CI retries
 *    once to absorb genuine network noise without hiding real failures.
 *  - HTML + list reporters: machine-browsable report artifact + readable logs.
 *  - Cross-browser project matrix: same specs on Chromium, Firefox, WebKit.
 *
 * testDir is the whole tests/ tree, so the Saucedemo suite, the TodoMVC suite,
 * the CDP network tests, and the API contract tests all run together.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
