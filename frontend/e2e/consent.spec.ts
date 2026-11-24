import type { APIRequestContext } from "@playwright/test";
import { expect, signIn, test, tickConsentBox } from "./fixtures";
import { localSupabase } from "./localSupabase";
import { PARENT_B, PASSWORD } from "./testData";

// T27. Sign-in before the form (11 Nov): both forms send a signed-out visitor to
// sign up first. The parent form then asks for the parent's permission on the
// "Before we begin" card (24 Nov), saved by the record-consent function. The
// student form's permission waits on the lead, and the real policy pages on D6
// / T67, so the policy test is still "fixme" (reported as skipped).

const admin = () => {
  const sb = localSupabase();
  return { url: sb.url, headers: { apikey: sb.serviceRoleKey, Authorization: `Bearer ${sb.serviceRoleKey}` } };
};

async function parentBId(request: APIRequestContext) {
  const { url, headers } = admin();
  const res = await request.get(`${url}/auth/v1/admin/users?per_page=200`, { headers });
  const users = (await res.json()).users as { id: string; email: string }[];
  return users.find((u) => u.email === PARENT_B.email)!.id;
}

async function consentRows(request: APIRequestContext, userId: string) {
  const { url, headers } = admin();
  const res = await request.get(`${url}/rest/v1/user_consents?user_id=eq.${userId}&select=consent_type,version,granted,metadata`, { headers });
  return res.json();
}

test.describe("consent before collecting child data (T27)", () => {
  test("the parent form asks for sign-in before any child data is entered", async ({ page }) => {
    await page.goto("/begin-journey");
    await expect(page).toHaveURL(/\/signup\?next=%2Fbegin-journey$/);
    await expect(page.locator("#parent-child-first-name")).toHaveCount(0);
  });

  test("the student form asks for sign-in before any data is entered", async ({ page }) => {
    await page.goto("/student-assessment");
    await expect(page).toHaveURL(/\/signup\?next=%2Fstudent-assessment$/);
  });

  test("the parent form waits for the parent's permission, saves it once, and doesn't ask again", async ({ page, request }) => {
    const userId = await parentBId(request);
    const { url, headers } = admin();
    await request.delete(`${url}/rest/v1/user_consents?user_id=eq.${userId}`, { headers });

    await signIn(page, PARENT_B);
    await page.goto("/begin-journey");
    await page.locator("[aria-pressed]").filter({ has: page.getByText("Parent", { exact: true }) }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // The card comes before the first question.
    await expect(page.getByRole("heading", { name: "Before we begin" })).toBeVisible();
    await expect(page.getByText("It isn't sent your child's name or your email.")).toBeVisible();
    await expect(page.locator("#parent-child-first-name")).toHaveCount(0);

    // Both boxes are needed. Until then the button is dimmed (aria-disabled),
    // but a click still explains what's missing, hence `force`.
    const agree = page.getByRole("button", { name: "Agree and start" });
    const tickBoth = page.getByText("Please tick both boxes to start.");
    await expect(agree).toHaveAttribute("aria-disabled", "true");
    await agree.click({ force: true });
    await expect(tickBoth).toBeVisible();
    await expect(page.getByLabel(/^I'm 18 or over/)).toBeFocused();
    await tickConsentBox(page, /^I'm 18 or over/);
    await agree.click({ force: true });
    await expect(tickBoth).toBeVisible();
    await expect(page.locator("#parent-child-first-name")).toHaveCount(0);
    expect(await consentRows(request, userId)).toEqual([]);

    await tickConsentBox(page, /^I agree to Globiculum/);
    await agree.click();
    await expect(page.locator("#parent-child-first-name")).toBeVisible();

    // One record on the server: what was agreed to, and in which wording.
    expect(await consentRows(request, userId)).toEqual([
      {
        consent_type: "child_data",
        version: "parent-2026-11-24",
        granted: true,
        metadata: { form: "parent", statements: ["parent_or_guardian", "child_data_use"] },
      },
    ]);

    // Next time the form opens at its first question.
    await page.goto("/");
    await page.goto("/begin-journey");
    await expect(page.locator("#parent-child-first-name")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before we begin" })).toHaveCount(0);
  });

  test("a signed-in parent can't read or write the consent records directly", async ({ request }) => {
    // Only the record-consent function (service key) touches user_consents, so
    // a record can't be made up, back-dated or removed from the browser.
    const sb = localSupabase();
    const login = await request.post(`${sb.url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: sb.anonKey },
      data: { email: PARENT_B.email, password: PASSWORD },
    });
    const { access_token } = await login.json();
    const headers = { apikey: sb.anonKey, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
    const read = await request.get(`${sb.url}/rest/v1/user_consents?select=*`, { headers });
    expect(await read.json()).toEqual([]);
    const write = await request.post(`${sb.url}/rest/v1/user_consents`, {
      headers,
      data: { user_id: await parentBId(request), consent_type: "child_data", granted: true, granted_at: "2020-01-01T00:00:00Z" },
    });
    expect(write.status()).toBe(403);
  });

  test.fixme("the Privacy Policy and Terms links open real pages", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Privacy Policy", "Terms"]) {
      const href = await page.getByRole("link", { name }).first().getAttribute("href");
      expect(href).not.toBe("#");
    }
  });
});
