import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the Playwright TodoMVC demo (demo.playwright.dev/todomvc).
 *
 * The Page Object pattern keeps *locators* and *page actions* in one place,
 * separate from the *assertions* that live in the specs. Why it matters: when
 * the UI changes, you fix the selector here once instead of in twenty tests.
 * Interviewers look for this — it's the line between scripted clicks and a
 * maintainable suite.
 */
export class TodoPage {
  readonly page: Page;
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly toggleAll: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodoInput = page.getByPlaceholder("What needs to be done?");
    this.todoItems = page.getByTestId("todo-item");
    this.toggleAll = page.getByLabel("Mark all as complete");
  }

  async goto() {
    await this.page.goto("https://demo.playwright.dev/todomvc");
  }

  async add(...items: string[]) {
    for (const item of items) {
      await this.newTodoInput.fill(item);
      await this.newTodoInput.press("Enter");
    }
  }

  async completeAt(index: number) {
    await this.todoItems.nth(index).getByRole("checkbox").check();
  }

  async expectCount(n: number) {
    await expect(this.todoItems).toHaveCount(n);
  }

  async expectVisibleTexts(texts: string[]) {
    await expect(this.todoItems).toHaveText(texts);
  }
}
