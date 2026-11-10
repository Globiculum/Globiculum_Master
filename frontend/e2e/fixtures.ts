import { test as base, expect, type Page } from "@playwright/test";
import { CHILD, PARENT_A, PARENT_B, PASSWORD } from "./testData";

const SENSITIVE = [CHILD.first, CHILD.last, PARENT_A.email, PARENT_B.email, PASSWORD];
const JWT = /eyJ[\w-]{10,}\.[\w-]{10,}\./;

/**
 * Every test also checks the browser console: nothing the page logs (text or
 * logged objects) may contain the child's name, an account's email or
 * password, or a login token. And the page may only talk to the local
 * Supabase: any request to a hosted project (the live one) is blocked and
 * fails the test.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const hosted: string[] = [];
      await page.route(/^https:\/\/[^/]*\.supabase\.(co|in)\//, (route) => {
        hosted.push(route.request().url());
        return route.abort();
      });
      const pending: Promise<string>[] = [];
      page.on("console", (msg) => {
        pending.push(
          Promise.all(msg.args().map((a) => a.jsonValue().then((v) => JSON.stringify(v)).catch(() => "")))
            .then((args) => `${msg.type()}: ${msg.text()} ${args.join(" ")}`)
            .catch(() => `${msg.type()}: ${msg.text()}`)
        );
      });
      page.on("pageerror", (err) => pending.push(Promise.resolve(`pageerror: ${err.message} ${err.stack ?? ""}`)));

      await use();

      expect(hosted, "requests to a hosted Supabase project (tests must only use the local one)").toEqual([]);
      const lines = await Promise.all(pending);
      const leaks = lines.filter((l) => SENSITIVE.some((s) => l.includes(s)) || JWT.test(l));
      expect(leaks, "child or account data written to the browser console").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function signIn(page: Page, user: { email: string; name: string }) {
  await page.goto("/auth");
  await page.locator("#signin-email").fill(user.email);
  await page.locator("#signin-password").fill(PASSWORD);
  await page.locator("#signin-password").press("Enter");
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("button", { name: new RegExp(user.name) })).toBeVisible();
}

export async function signOut(page: Page, user: { name: string }) {
  await page.getByRole("button", { name: new RegExp(user.name) }).click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();
  // Lands on the home page, or on /auth when signing out on a page that needs a sign-in.
  await expect(page.getByRole("button", { name: new RegExp(user.name) })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => /^sb-.*-auth-token/.test(k))))
    .toEqual([]);
}

/** Everything this tab keeps in sessionStorage and localStorage. */
export function browserStorage(page: Page) {
  return page.evaluate(() => {
    const dump = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)!).map((k) => [k, s.getItem(k)]));
    return { session: dump(sessionStorage), local: dump(localStorage) };
  });
}
