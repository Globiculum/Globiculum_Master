import { expect, test } from "./fixtures";

// T27 (waiting on the lead's decision D6): today both forms are public and no
// consent is asked, so these are marked "fixme" and reported as skipped. Turn
// them on (test instead of test.fixme) when T27 is built.
test.describe("consent before collecting child data (T27)", () => {
  test.fixme("the parent form asks for sign-in before any child data is entered", async ({ page }) => {
    await page.goto("/begin-journey");
    await expect(page).toHaveURL(/\/auth/);
  });

  test.fixme("the student form asks for sign-in before any data is entered", async ({ page }) => {
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
