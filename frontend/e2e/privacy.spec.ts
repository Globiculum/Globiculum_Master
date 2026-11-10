import { browserStorage, expect, signIn, signOut, test } from "./fixtures";
import { CHILD, PARENT_A, PARENT_B, REPORT_TITLE } from "./testData";

const AUTH_TOKEN_KEY = /^sb-.*-auth-token/;

test("sign-out removes the child's answers and the login from the browser", async ({ page }) => {
  await signIn(page, PARENT_A);

  await page.goto("/begin-journey");
  await page.locator("[aria-pressed]").filter({ has: page.getByText("Parent", { exact: true }) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#parent-child-first-name").fill(CHILD.first);
  await page.locator("#parent-child-last-name").fill(CHILD.last);

  // The answers are kept for this tab only (sessionStorage), never in localStorage.
  await expect.poll(async () => JSON.stringify((await browserStorage(page)).session)).toContain(CHILD.first);
  const before = await browserStorage(page);
  expect(JSON.stringify(before.local)).not.toContain(CHILD.first);
  expect(Object.keys(before.local).some((k) => AUTH_TOKEN_KEY.test(k))).toBe(true);

  // Sign Out warns that the form answers will be cleared.
  await signOut(page, PARENT_A, { withFormAnswers: true });

  const after = await browserStorage(page);
  const all = JSON.stringify(after);
  expect(all).not.toContain(CHILD.first);
  expect(all).not.toContain(CHILD.last);
  expect(Object.keys(after.local).filter((k) => AUTH_TOKEN_KEY.test(k))).toEqual([]);

  // Signed out, the form asks for a sign-in again; once back in, nothing of
  // the previous answers comes back.
  await page.goto("/begin-journey");
  await expect(page).toHaveURL(/\/auth\?next=%2Fbegin-journey/);
  await signIn(page, PARENT_A);
  await page.goto("/begin-journey");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(page.locator("#parent-child-first-name")).toHaveCount(0);
});

test("the next account in the same tab sees none of the previous account's reports", async ({ page }) => {
  await signIn(page, PARENT_A);
  await page.goto("/reports");
  await expect(page.getByText(REPORT_TITLE)).toHaveCount(1); // the deleted one is not listed

  await signOut(page, PARENT_A);
  await signIn(page, PARENT_B);
  await page.goto("/reports");
  await expect(page.getByText("No Reports Yet")).toBeVisible();
  await expect(page.getByText(REPORT_TITLE)).toHaveCount(0);
});

test("My Reports needs a sign-in", async ({ page }) => {
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/auth/);
});
