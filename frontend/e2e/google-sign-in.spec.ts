import type { APIRequestContext } from "@playwright/test";
import { expect, signIn, test } from "./fixtures";
import { localSupabase } from "./localSupabase";
import { PARENT_A } from "./testData";

// "Continue with Google" (V2 auth pages). Google itself can't run here: the
// local Supabase has the Google provider off, which is exactly the state the
// buttons must explain. The return page (/auth/callback?via=google) is driven
// with an email sign-in instead, as Google would leave it: signed in.

const admin = () => {
  const sb = localSupabase();
  return { url: sb.url, headers: { apikey: sb.serviceRoleKey, Authorization: `Bearer ${sb.serviceRoleKey}` } };
};

async function parentA(request: APIRequestContext) {
  const { url, headers } = admin();
  const res = await request.get(`${url}/auth/v1/admin/users?per_page=200`, { headers });
  const users = (await res.json()).users as { id: string; email: string; user_metadata: Record<string, unknown> }[];
  return users.find((u) => u.email === PARENT_A.email)!;
}

async function setTermsAgreement(request: APIRequestContext, value: string | null) {
  const { url, headers } = admin();
  const user = await parentA(request);
  await request.put(`${url}/auth/v1/admin/users/${user.id}`, { headers, data: { user_metadata: { accepted_terms_at: value } } });
}

test.describe("Continue with Google", () => {
  test("is on both pages and explains when Google sign-in is switched off", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByRole("alert")).toContainText("Google sign-in isn't switched on yet");
    await expect(page).toHaveURL(/\/login$/);

    // Sign up asks for the Terms agreement before going to Google.
    await page.goto("/signup");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.locator("#signup-terms-error")).toHaveText("Agree to continue.");
    await expect(page.locator("#signup-terms")).toBeFocused();
    await page.locator("#signup-terms").check();
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByRole("alert")).toContainText("Google sign-in isn't switched on yet");
  });

  test("a Google account with no Terms agreement agrees before going on", async ({ page, request }) => {
    await setTermsAgreement(request, null);
    await signIn(page, PARENT_A);
    await page.goto("/auth/callback?via=google&next=%2Fbegin-journey");
    await expect(page.getByRole("heading", { name: "One more step" })).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#google-terms-error")).toHaveText("Agree to continue.");
    await page.locator("#google-terms").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/begin-journey$/);
    expect(String((await parentA(request)).user_metadata.accepted_terms_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await setTermsAgreement(request, null);
  });

  test("the agreement ticked on Sign up is saved without asking again", async ({ page, request }) => {
    await setTermsAgreement(request, null);
    await signIn(page, PARENT_A);
    const ticked = new Date().toISOString();
    await page.goto(`/auth/callback?via=google&terms=${encodeURIComponent(ticked)}`);
    await expect(page).toHaveURL((u) => u.pathname === "/");
    expect((await parentA(request)).user_metadata.accepted_terms_at).toBe(ticked);
    await setTermsAgreement(request, null);
  });

  test("a cancelled Google sign-in says so, not 'email link'", async ({ page }) => {
    await page.goto("/auth/callback?via=google&error=access_denied&error_description=The+user+denied+access");
    await expect(page.getByRole("heading", { name: "Google sign-in didn't finish" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Google sign-in was cancelled");
  });
});
