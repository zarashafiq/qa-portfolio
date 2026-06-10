import { test, expect, chromium } from "@playwright/test";
import { SaucedemoPage } from "../pages/saucedemo.page.js";

/**
 * Multi-user / concurrent-session testing.
 *
 * The pattern: spin up two fully isolated browser contexts (separate cookies,
 * storage, sessions) and drive them in parallel, as if two different people
 * were using the app at once. This is how you catch state-bleed bugs — where
 * one user's actions leak into another's session — which single-context tests
 * structurally cannot find.
 *
 * Mirrors the kind of isolation testing real multi-tenant / collaborative
 * products need (e.g. per-user data that must NOT be shared).
 */
test.describe("multi-user isolation", () => {
  test("two users keep independent carts", async () => {
    const browser = await chromium.launch();

    // Two isolated contexts = two independent users.
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const userA = new SaucedemoPage(pageA);
    const userB = new SaucedemoPage(pageB);

    await userA.goto();
    await userB.goto();
    await userA.login("standard_user", "secret_sauce");
    await userB.login("standard_user", "secret_sauce");
    await userA.expectLoggedIn();
    await userB.expectLoggedIn();

    // User A adds an item; User B does nothing.
    await userA.addFirstItemToCart();
    await userA.expectCartCount(1);

    // The critical assertion: B's cart must remain empty. If the app leaked
    // state across sessions, B would show 1 here.
    await userB.expectCartCount(0);

    await contextA.close();
    await contextB.close();
    await browser.close();
  });
});
