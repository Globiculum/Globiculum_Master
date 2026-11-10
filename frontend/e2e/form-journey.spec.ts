import type { Page } from "@playwright/test";
import { expect, signIn, test } from "./fixtures";
import { PARENT_A, PASSWORD } from "./testData";

// The parent form's journey: an account first, progress counted from the
// answers, Previous Learning asked last, a refresh reopening the same card,
// and the Academic step one section at a time.

const progress = (page: Page) => page.getByRole("progressbar", { name: "Answers given" });
const nextButton = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
const cardTitle = (page: Page, title: string | RegExp) => page.locator("#main-content h4", { hasText: title });

async function openParentForm(page: Page) {
  await signIn(page, PARENT_A);
  await page.goto("/begin-journey");
  await page.locator("[aria-pressed]").filter({ has: page.getByText("Parent", { exact: true }) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#parent-child-first-name")).toBeVisible();
}

async function answerNameAndStage(page: Page) {
  await page.locator("#parent-child-first-name").fill("Asha");
  await page.locator("#parent-child-last-name").fill("Rao");
  await nextButton(page).click();
  await page.getByRole("radio", { name: /^Elementary/ }).click();
  await expect(cardTitle(page, "What grade is your child in?")).toBeVisible();
}

/** Grade 4 in California on the regular US curriculum, moving to CBSE in the same grade. */
async function answerSchoolUpToPreviousLearning(page: Page) {
  await answerNameAndStage(page);
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await page.getByRole("radio", { name: /^United States/ }).click();
  await page.locator("#parent-us-state").click();
  await page.getByRole("option", { name: "California (CA)" }).click();
  await page.getByRole("radio", { name: /^California State Curriculum/ }).click();
  await page.getByRole("radio", { name: /^CBSE/ }).click();
  await page.getByRole("radio", { name: /^Same Grade/ }).click();
  await page.getByRole("radio", { name: /^3.6 months/ }).click();
  await expect(cardTitle(page, "Did your child attend an Indian school before?")).toBeVisible();
}

/** Answers every subject card (Strong), skipping "Any other subjects?", until the summary shows. */
async function answerAllSubjects(page: Page, summaryTitle: string) {
  const strong = page.getByRole("radio", { name: /^Strong/ });
  const summary = page.getByRole("heading", { name: summaryTitle });
  const skipOther = page.getByRole("button", { name: "Skip, none to add" });
  for (let i = 0; i < 40; i++) {
    await expect(strong.or(summary).or(skipOther).first()).toBeVisible();
    if (await summary.isVisible()) return;
    if (await skipOther.isVisible()) {
      await skipOther.click();
      await expect(skipOther).toHaveCount(0); // gone once the card has moved on
      continue;
    }
    const subject = (await page.locator("#main-content h4").first().innerText()).trim();
    await strong.click();
    await expect(page.locator("#main-content h4").filter({ hasText: new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })).toHaveCount(0);
  }
  throw new Error(`${summaryTitle} never showed`);
}

test("Get Free Report while signed out asks for an account first, then opens the form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get Free Report" }).first().click();
  await expect(page).toHaveURL(/\/auth\?next=%2Fbegin-journey$/);
  // Most people arriving this way are new: the page opens on Sign Up.
  await expect(page.getByRole("tab", { name: "Sign Up" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Sign In" }).click();
  await page.locator("#signin-email").fill(PARENT_A.email);
  await page.locator("#signin-password").fill(PASSWORD);
  await page.locator("#signin-password").press("Enter");
  await expect(page).toHaveURL(/\/begin-journey$/);
  await expect(page.getByText("Choose Your")).toBeVisible();
});

test("the School step starts at 0%, grows with answers, and asks Previous Learning last", async ({ page }) => {
  await openParentForm(page);
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
  // Not shown under the first card any more.
  await expect(page.getByText("Did your child attend an Indian school before?")).toHaveCount(0);

  await answerSchoolUpToPreviousLearning(page);
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "33"); // School done, two steps to go

  // Yes shows the first school's row at once, with only the grades before Grade 4.
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.locator("#edu-history-from-0").click();
  await expect(page.getByRole("option")).toHaveText(["KG", "Grade 1", "Grade 2", "Grade 3"]);
  await page.getByRole("option", { name: "Grade 1" }).click();
  await page.locator("#edu-history-to-0").click();
  await expect(page.getByRole("option")).toHaveText(["Grade 1", "Grade 2", "Grade 3"]);
  await page.getByRole("option", { name: "Grade 3" }).click();
  // Next waits for the row to be complete.
  await expect(nextButton(page)).toBeDisabled();
  await page.locator("#edu-history-curriculum-0").click();
  await page.getByRole("option", { name: "CBSE" }).click();
  await nextButton(page).click();

  await expect(page.getByRole("heading", { name: "School profile is ready." })).toBeVisible();
  await expect(page.getByText("Yes · CBSE Grade 1–Grade 3")).toBeVisible();
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "33");
});

test("a refresh warns first, then reopens the form on the card the parent was on", async ({ page }) => {
  await openParentForm(page);
  await answerNameAndStage(page);

  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.accept();
  });
  await page.reload();

  expect(dialogs).toEqual(["beforeunload"]);
  await expect(page.getByText("Welcome back.")).toBeVisible();
  await expect(cardTitle(page, "What grade is your child in?")).toBeVisible();
  await expect(page.locator("#parent-child-first-name")).toHaveCount(0);
});

test("the Academic step opens one section at a time, with Back and Next in each card", async ({ page }) => {
  test.setTimeout(90_000); // answers a whole step, card by card
  await openParentForm(page);
  await answerSchoolUpToPreviousLearning(page);
  await page.getByRole("radio", { name: "No", exact: true }).click();
  await expect(page.getByRole("heading", { name: "School profile is ready." })).toBeVisible();
  await nextButton(page).click(); // the summary's Next moves on to the Academic step

  const sections = page.getByRole("list", { name: "Academic Path sections" });
  await expect(sections.getByRole("button", { name: /Core subjects/ })).toHaveAttribute("aria-current", "step");
  // A later section stays closed until the core subjects are answered.
  await expect(sections.getByRole("button", { name: /Languages/ })).toBeDisabled();

  await answerAllSubjects(page, "Core subjects are ready.");
  await nextButton(page).click();
  if (await sections.getByRole("button", { name: /Electives/ }).getAttribute("aria-current")) {
    await answerAllSubjects(page, "Electives are ready.");
    await nextButton(page).click();
  }

  await expect(sections.getByRole("button", { name: /Languages/ })).toHaveAttribute("aria-current", "step");
  await expect(cardTitle(page, "Which Indian languages does your child know?")).toBeVisible();
  // Back on a section's first card returns to the section before it.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(sections.getByRole("button", { name: /Languages/ })).not.toHaveAttribute("aria-current", "step");
  await nextButton(page).click();

  await page.getByRole("button", { name: "Skip, knows none" }).click();
  await page.getByRole("button", { name: "Skip, not studying one" }).click();
  await expect(page.getByRole("heading", { name: "Language Exposure is ready" })).toBeVisible();
  await nextButton(page).click();

  await expect(sections.getByRole("button", { name: /Performance/ })).toHaveAttribute("aria-current", "step");
  await expect(nextButton(page)).toBeDisabled();
  await page.getByRole("radio", { name: "On Track" }).click();
  await nextButton(page).click(); // last section for an elementary child: on to Learning Profile

  await expect(cardTitle(page, "How does your child learn best?")).toBeVisible();
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "66");
});
