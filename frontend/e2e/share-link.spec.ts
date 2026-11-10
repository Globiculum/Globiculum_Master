import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures";
import { localSupabase } from "./localSupabase";
import { CHILD, PARENT_A, PARENT_B, PASSWORD, REPORT_ID, TOKENS } from "./testData";

test.describe("opening a share link", () => {
  test("a valid link opens the report without signing in, with the child's first name only", async ({ page }) => {
    await page.goto(`/report/${TOKENS.valid}`);
    await expect(page.getByText(CHILD.first).first()).toBeVisible();
    await expect(page.getByText(CHILD.last)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/report/${TOKENS.valid}$`));
  });

  test("a language skill gap links the chapters that practise it", async ({ page }) => {
    await page.goto(`/report/${TOKENS.valid}`);
    await page.getByRole("button", { name: /Expand all/ }).click();

    const grammar = page.getByRole("listitem").filter({ has: page.getByText("Grammar", { exact: true }) });
    await expect(grammar.getByText("Practise in Poorvi:")).toBeVisible();
    // In chapter order, each opening the chapter PDF.
    const links = grammar.getByRole("link").filter({ hasText: /^Unit / });
    await expect(links).toHaveText([/^Unit 1: Fables and Folk Tales \(present continuous, adverbs\)/, /^Unit 2: Friendship \(past tenses\)/]);
    await expect(links.nth(1)).toHaveAttribute("href", "https://ncert.nic.in/textbook/pdf/fepr102.pdf");
    await expect(grammar.getByRole("link", { name: "YouTube videos" })).toBeVisible();

    const reading = page.getByRole("listitem").filter({ has: page.getByText("Reading comprehension", { exact: true }) });
    await expect(reading.getByText("Every chapter of Poorvi practises this. Start with:")).toBeVisible();
    await expect(reading.getByRole("link", { name: /^Unit 1: Fables and Folk Tales/ })).toBeVisible();
  });

  test("an unknown link opens nothing", async ({ page }) => {
    await page.goto(`/report/${TOKENS.unknown}`);
    await expect(page.getByText("Report not found or link is invalid")).toBeVisible();
    await expect(page.getByText(CHILD.first)).toHaveCount(0);
  });

  test("an expired link opens nothing", async ({ page }) => {
    await page.goto(`/report/${TOKENS.expired}`);
    await expect(page.getByText("This shared link has expired")).toBeVisible();
    await expect(page.getByText(CHILD.first)).toHaveCount(0);
  });

  test("a link to a deleted report opens nothing", async ({ page }) => {
    await page.goto(`/report/${TOKENS.deletedReport}`);
    await expect(page.getByText("Report no longer exists")).toBeVisible();
    await expect(page.getByText(CHILD.first)).toHaveCount(0);
  });
});

// The same rules checked on the database directly, the way anyone holding the
// site's public key could try.
test.describe("who can read reports and share links", () => {
  const sb = localSupabase();
  const headers = (token = sb.anonKey) => ({ apikey: sb.anonKey, Authorization: `Bearer ${token}` });

  async function accessToken(request: APIRequestContext, email: string) {
    const res = await request.post(`${sb.url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: sb.anonKey },
      data: { email, password: PASSWORD },
    });
    expect(res.ok()).toBe(true);
    return (await res.json()).access_token as string;
  }

  async function rows(request: APIRequestContext, path: string, token?: string) {
    const res = await request.get(`${sb.url}/rest/v1/${path}`, { headers: headers(token) });
    expect(res.status()).toBe(200);
    return (await res.json()) as unknown[];
  }

  test("the public key lists no share links and no reports", async ({ request }) => {
    expect(await rows(request, "shared_reports?select=token")).toEqual([]);
    expect(await rows(request, "saved_reports?select=id")).toEqual([]);
  });

  test("another account cannot read the report or its share links", async ({ request }) => {
    const owner = await accessToken(request, PARENT_A.email);
    // The owner sees them, so an empty answer below means "not allowed", not "broken query".
    expect(await rows(request, `saved_reports?select=id&id=eq.${REPORT_ID}`, owner)).toHaveLength(1);
    expect((await rows(request, `shared_reports?select=token&report_id=eq.${REPORT_ID}`, owner)).length).toBeGreaterThan(0);

    const other = await accessToken(request, PARENT_B.email);
    expect(await rows(request, `saved_reports?select=id&id=eq.${REPORT_ID}`, other)).toEqual([]);
    expect(await rows(request, `shared_reports?select=token&report_id=eq.${REPORT_ID}`, other)).toEqual([]);
  });
});
