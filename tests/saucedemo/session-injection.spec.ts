import { test, expect } from "@playwright/test";
import { SaucedemoPage } from "../pages/saucedemo.page.js";

/**
 * Session injection.
 *
 * Instead of driving the login form in every test (slow, and re-tests login
 * over and over), you authenticate once, capture the session state, and inject
 * it directly into fresh contexts. Tests then start already-logged-in.
 *
 * Why it matters: it's the standard way to keep a suite fast and to isolate
 * what each test actually covers — a cart test shouldn't fail because login
 * broke. Saucedemo stores its session client-side, so here we set the same
 * cookie the app uses and land straight on the inventory page.
 */
test.describe("session injection", () => {
  test("injects an authenticated session and skips the login UI", async ({ browser }) => {
    // Authenticate once through the UI to obtain a valid session.
    const seed = await browser.newContext();
    const seedPage = await seed.newPage();
    const login = new SaucedemoPage(seedPage);
    await login.goto();
    await login.login("standard_user", "secret_sauce");
    await login.expectLoggedIn();

    // Capture the storage state (cookies + origin storage).
    const state = await seed.storageState();
    await seed.close();

    // New context seeded with that state — no login form touched.
    const injected = await browser.newContext({ storageState: state });
    const page = await injected.newPage();
    await page.goto("https://www.saucedemo.com/inventory.html");

    // Saucedemo gates inventory behind a session cookie; landing here proves
    // the injected session was accepted.
    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator(".inventory_item").first()).toBeVisible();

    await injected.close();
  });
});
