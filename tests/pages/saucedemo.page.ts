import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the Saucedemo storefront (saucedemo.com), a standard public
 * automation practice target. Covers login plus the cart actions the specs use.
 */
export class SaucedemoPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly error: Locator;
  readonly cartBadge: Locator;
  readonly inventoryItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByPlaceholder("Username");
    this.password = page.getByPlaceholder("Password");
    this.loginButton = page.getByRole("button", { name: "Login" });
    this.error = page.locator('[data-test="error"]');
    this.cartBadge = page.locator(".shopping_cart_badge");
    this.inventoryItems = page.locator(".inventory_item");
  }

  async goto() {
    await this.page.goto("https://www.saucedemo.com/");
  }

  async login(user: string, pass: string) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.loginButton.click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/inventory/);
  }

  async addFirstItemToCart() {
    await this.inventoryItems.first().getByRole("button", { name: /add to cart/i }).click();
  }

  async expectCartCount(n: number) {
    if (n === 0) {
      await expect(this.cartBadge).toHaveCount(0);
    } else {
      await expect(this.cartBadge).toHaveText(String(n));
    }
  }
}
