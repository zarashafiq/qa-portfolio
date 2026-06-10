import { test, expect } from "@playwright/test";
import { TodoPage } from "../pages/todo.page.js";

/**
 * Functional and edge-case coverage for the TodoMVC demo.
 *
 * The point of this file is not "todos work" — it's to demonstrate test
 * *design*: happy path, boundary conditions, state persistence, and the kind
 * of edge cases that actually break real apps (whitespace, unicode, rapid
 * input). Each test asserts on user-visible state, never internal markup.
 */

test.describe("todo core flows", () => {
  test("adds and lists items in order", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    await todo.add("write evals", "review PR", "ship");
    await todo.expectCount(3);
    await todo.expectVisibleTexts(["write evals", "review PR", "ship"]);
  });

  test("completing an item updates the active counter", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    await todo.add("a", "b");
    await todo.completeAt(0);
    await expect(page.getByTestId("todo-count")).toHaveText(/1 item left/);
  });

  test("state survives a reload (localStorage persistence)", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    await todo.add("persist me");
    await page.reload();
    await todo.expectCount(1);
    await todo.expectVisibleTexts(["persist me"]);
  });
});

test.describe("todo edge cases", () => {
  // Whitespace-only input: TodoMVC trims and should NOT create an item.
  test("trims whitespace and rejects empty input", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    await todo.newTodoInput.fill("   ");
    await todo.newTodoInput.press("Enter");
    await todo.expectCount(0);
  });

  // Unicode / emoji: a frequent source of rendering and storage bugs.
  test("handles unicode and emoji without corruption", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    const tricky = "日本語 🚀 café";
    await todo.add(tricky);
    await todo.expectVisibleTexts([tricky]);
  });

  // Rapid sequential entry: catches race conditions in input handling.
  test("survives rapid sequential entry", async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
    const many = Array.from({ length: 20 }, (_, i) => `item ${i}`);
    await todo.add(...many);
    await todo.expectCount(20);
  });
});
