import { test, expect } from "@playwright/test";
import { TodoPage } from "../pages/todo.page.js";
import { attachCDP, goOffline, goOnline, throttle } from "../helpers/cdp.js";

/**
 * Network-condition tests via the Chrome DevTools Protocol (CDP).
 *
 * CDP lets you drive browser internals the high-level API doesn't cover — here,
 * emulating offline and slow networks to verify the app degrades gracefully.
 * Catches "works on my fast laptop, breaks on 3G" bugs. The CDP plumbing lives
 * in tests/helpers/cdp.ts so the specs read cleanly.
 *
 * Chromium-only by design: CDP is a Chrome protocol, so these skip elsewhere.
 */
test.describe("network conditions (CDP)", () => {
  test("queues work offline and keeps state", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP is Chromium-only");

    const todo = new TodoPage(page);
    await todo.goto();
    await todo.add("before offline");

    const client = await attachCDP(page);
    await goOffline(client);

    // TodoMVC is client-side + localStorage, so it should still function.
    await todo.add("during offline");
    await todo.expectCount(2);

    await goOnline(client);
    await page.reload();
    await todo.expectCount(2);
  });

  test("remains usable on a throttled slow connection", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP is Chromium-only");

    const client = await attachCDP(page);
    await throttle(client, 400, 400); // ~Regular 3G

    const todo = new TodoPage(page);
    await todo.goto();
    await todo.add("slow net");
    await expect(todo.todoItems).toHaveCount(1);
  });
});
