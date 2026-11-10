import { expect, test } from "./fixtures";

// T27. Sign-in before the form is built (10 Nov): both forms send a signed-out
// visitor to sign up first. The consent step and the policy pages wait on the
// lead's decision D6, so those two are still "fixme" (reported as skipped).
// Turn them on (test instead of test.fixme) when they are built.
test.describe("consent before collecting child data (T27)", () => {
  test("the parent form asks for sign-in before any child data is entered", async ({ page }) => {
    await page.goto("/begin-journey");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator("#parent-child-first-name")).toHaveCount(0);
  });

  test("the student form asks for sign-in before any data is entered", async ({ page }) => {
    await page.goto("/student-assessment");
    await expect(page).toHaveURL(/\/auth/);
  });

  test.fixme("the form cannot start until consent is given", async ({ page }) => {
    // Sign in, open the form, check it waits for the consent step and that
    // user_consents gets a row. Fill in once the consent step exists.
    await page.goto("/begin-journey");
  });

  test.fixme("the Privacy Policy and Terms links open real pages", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Privacy Policy", "Terms"]) {
      const href = await page.getByRole("link", { name }).first().getAttribute("href");
      expect(href).not.toBe("#");
    }
  });
});
