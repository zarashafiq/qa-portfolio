import { test, expect } from "@playwright/test";
import { SaucedemoPage } from "../pages/saucedemo.page.js";

/**
 * Boundary-value and equivalence-partition testing on the login form.
 *
 * Rather than one happy-path login, this walks the partitions a tester reasons
 * about: valid, locked-out, wrong password, empty fields. Each expects a
 * specific outcome. Data-driven via a table so adding a case is one line —
 * the structure an interviewer wants to see, not twenty copy-pasted tests.
 */

interface LoginCase {
  name: string;
  user: string;
  pass: string;
  expectError?: RegExp;
}

const cases: LoginCase[] = [
  { name: "valid credentials log in", user: "standard_user", pass: "secret_sauce" },
  {
    name: "locked-out user is rejected with a clear message",
    user: "locked_out_user",
    pass: "secret_sauce",
    expectError: /locked out/i,
  },
  {
    name: "wrong password is rejected",
    user: "standard_user",
    pass: "wrong_password",
    expectError: /username and password do not match/i,
  },
  {
    name: "empty username is rejected",
    user: "",
    pass: "secret_sauce",
    expectError: /username is required/i,
  },
  {
    name: "empty password is rejected",
    user: "standard_user",
    pass: "",
    expectError: /password is required/i,
  },
];

test.describe("login boundary values", () => {
  for (const c of cases) {
    test(c.name, async ({ page }) => {
      const sauce = new SaucedemoPage(page);
      await sauce.goto();
      await sauce.login(c.user, c.pass);

      if (c.expectError) {
        await expect(sauce.error).toBeVisible();
        await expect(sauce.error).toHaveText(c.expectError);
      } else {
        await sauce.expectLoggedIn();
      }
    });
  }
});
