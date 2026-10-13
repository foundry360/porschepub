import { expect, test, type Browser, type Page } from "@playwright/test";
import { submissionPolicy } from "../../src/config/site";
import { ADMIN_AUTH, EDITOR_AUTH, LEAD_IMAGE, loadState } from "./state";

/**
 * The ten journeys required for launch, run against the PRODUCTION build and a
 * local Supabase. They are ordered so each can rely on the ones before it
 * (create -> publish -> browse -> submit -> review -> unpublish).
 *
 * All content is fictional and tagged with a per-run id; global teardown removes it.
 */
test.describe.configure({ mode: "serial" });

const state = loadState();
const headline = `${state.run} The Quiet Garage`;
const summary = "A fictional story created by the automated test suite to prove the publishing pipeline.";
const uniqueWord = `zephyrine${state.run.replace(/\W/g, "")}`;

let storyId = "";
let slug = "";
let submissionTitle = "";

async function editorPage(browser: Browser, storageState = EDITOR_AUTH) {
  const context = await browser.newContext({ storageState });
  return { page: await context.newPage(), context };
}

async function anonymous(browser: Browser) {
  const context = await browser.newContext();
  return { page: await context.newPage(), context };
}

const CRAWLER = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * "Not public" means two things:
 *  - crawlers get a real HTTP 404 (Next.js resolves the route before streaming for bots), and
 *  - people get the not-found page marked noindex, with none of the story's content.
 * (Browsers receive the prerendered shell first, so the framework can only stream a
 * 200 + noindex + not-found UI to them. That is documented in docs/ARCHITECTURE.md.)
 */
async function expectNotPublic(page: Page, path: string, leakedText: string) {
  const crawler = await page.context().request.get(path, { headers: { "user-agent": CRAWLER }, failOnStatusCode: false, maxRedirects: 0 });
  expect(crawler.status(), `${path} should be a real 404 for crawlers`).toBe(404);
  expect(await crawler.text()).not.toContain(leakedText);

  await page.goto(path);
  await expect(page).toHaveTitle(/Page not found/);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.getByText(leakedText)).toHaveCount(0);
}

test("6. an editor creates a draft (uploading a lead image) and previews it", async ({ browser }) => {
  const { page, context } = await editorPage(browser);
  await page.goto("/admin/stories/new");
  await page.getByLabel("Headline").fill(headline);
  await page.getByLabel("Summary").fill(summary);
  await page.getByRole("button", { name: "+ Paragraph" }).click();
  await page.getByLabel("Paragraph 1").fill(`It started with ${uniqueWord} and a **cold** garage. [A fictional link](https://example.com).`);
  await page.getByLabel("Contributor").selectOption({ label: state.contributorName });
  await page.getByLabel("Category").selectOption({ label: state.categoryName });

  // Publishing is refused until a lead image exists.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Not ready to publish")).toBeVisible();

  // Upload through the real pipeline (browser -> Storage -> server validation).
  await page.getByRole("button", { name: "Choose image" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Upload new" }).click();
  await dialog.getByLabel("Image file").setInputFiles(LEAD_IMAGE);
  await dialog.getByLabel("Alt text").fill(`${state.run} A red garage door with a pale panel`);
  await dialog.getByLabel("Credit").fill("Automated test suite");
  await dialog.getByRole("button", { name: "Upload and use image" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL(/\/admin\/stories\/[0-9a-f-]{36}\?created=1$/);
  await expect(page.getByText("Saved as a draft")).toBeVisible();
  storyId = page.url().split("/").pop()!.split("?")[0];
  slug = await page.getByLabel("URL slug").inputValue();
  expect(slug).toContain("quiet-garage");

  // Preview works for the editor and says plainly that it is not public.
  const preview = await page.goto(`/admin/stories/${storyId}/preview`);
  expect(preview?.status()).toBe(200);
  await expect(page.getByText("is not public")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await context.close();
});

test("9. an unauthorized visitor cannot reach a draft, a submission, or admin actions", async ({ browser, request }) => {
  const { page, context } = await anonymous(browser);

  // The draft is invisible to the public...
  await expectNotPublic(page, `/stories/${slug}`, headline);
  // ...its preview and every admin screen send visitors to sign in...
  for (const path of [`/admin/stories/${storyId}/preview`, "/admin", "/admin/stories/new", "/admin/submissions", "/admin/team"]) {
    await page.goto(path);
    await expect(page, `${path} must require sign-in`).toHaveURL(/\/admin\/login/);
  }
  // ...and a forged server-action POST does nothing.
  const forged = await request.post("/admin/stories/new", {
    headers: { "Next-Action": "00".repeat(20), "Content-Type": "text/plain;charset=UTF-8" },
    data: "[]",
    maxRedirects: 0,
  });
  expect(forged.status()).not.toBe(200);

  // The draft never appears in the sitemap, feed, or search.
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
  expect(await (await request.get("/feed.xml")).text()).not.toContain(slug);
  await page.goto(`/search?q=${uniqueWord}`);
  await expect(page.getByText(/No stories matched/)).toBeVisible();

  // A signed-in account with no editorial role gets nothing, with a generic message.
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(state.stranger.email);
  await page.getByLabel("Password").fill(state.stranger.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText(/couldn.t sign you in|incorrect|not authorized|check/i);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  // An editor (not an admin) is turned away from admin-only screens.
  const editor = await editorPage(browser);
  await editor.page.goto("/admin/team");
  await expect(editor.page).toHaveURL(/\/admin\?denied=1/);
  await editor.context.close();
  await context.close();
});

test("7. an editor publishes the story and it becomes publicly accessible", async ({ browser }) => {
  const { page, context } = await editorPage(browser);
  await page.goto(`/admin/stories/${storyId}`);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  const anon = await anonymous(browser);
  const response = await anon.page.goto(`/stories/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(anon.page.getByRole("heading", { level: 1, name: headline })).toBeVisible();
  await expect(anon.page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/stories/${slug}$`));
  await expect(anon.page.getByRole("link", { name: state.contributorName }).first()).toBeVisible();
  // Emphasis renders as markup, not raw asterisks.
  await expect(anon.page.locator("article strong", { hasText: "cold" })).toBeVisible();
  expect(await (await anon.context.request.get("/sitemap.xml")).text()).toContain(slug);
  await anon.context.close();
  await context.close();
});

test("1. a visitor browses the homepage and opens a published story", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("link", { name: new RegExp(headline) }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/stories/${slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();
  await expect(page.getByText(uniqueWord)).toBeVisible();
});

test("2. a visitor navigates categories and searches for a story", async ({ page }) => {
  await page.goto("/stories");
  await expect(page.getByRole("link", { name: new RegExp(headline) }).first()).toBeVisible();

  await page.goto(`/categories/${state.categorySlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(state.categoryName);
  await expect(page.getByRole("link", { name: new RegExp(headline) }).first()).toBeVisible();

  await page.goto("/search");
  await page.getByRole("searchbox", { name: "Search stories" }).fill(uniqueWord);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("link", { name: new RegExp(headline) }).first()).toBeVisible();

  // A nonsense query is handled gracefully.
  await page.goto("/search?q=zzzzqqqqxxxx");
  await expect(page.getByText(/No stories matched/)).toBeVisible();
});

test("3. a visitor opens a contributor profile and reads their articles", async ({ page }) => {
  await page.goto(`/contributors/${state.contributorSlug}`);
  await expect(page.getByRole("heading", { level: 1, name: state.contributorName })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(headline) }).first().click();
  await expect(page).toHaveURL(new RegExp(`/stories/${slug}$`));
});

test("4. a visitor submits a story proposal", async ({ page }) => {
  submissionTitle = `${state.run} A pitch about a 944 in the rain`;
  await page.goto("/tell-your-story");
  // The anti-bot timer needs a human-ish interval before submitting.
  await page.waitForTimeout(submissionPolicy.minFillSeconds * 1000 + 500);
  await page.getByLabel(/Your name/).fill("Test Submitter");
  await page.getByLabel(/Email address/).fill(`${state.run}-submitter@example.test`);
  await page.getByLabel(/Working title/).fill(submissionTitle);
  await page.getByLabel(/Porsche model or subject/).fill("A fictional 944");
  await page.getByLabel(/Category/).selectOption({ label: state.categoryName });
  await page.getByLabel(/Your pitch/).fill("This is a fictional pitch written by the automated test suite. ".repeat(6));
  await page.getByLabel(/I have read and accept/).check();
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByRole("heading", { name: "Pitch received" })).toBeVisible();
});

test("10. invalid and abusive submissions are rejected safely", async ({ page, request }) => {
  // Client + server validation: empty form shows specific errors and stores nothing.
  await page.goto("/tell-your-story");
  await page.waitForTimeout(submissionPolicy.minFillSeconds * 1000 + 500);
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /name/i }).first()).toBeVisible();

  // Hostile text is accepted as inert text only when otherwise valid; never executed.
  await page.getByLabel(/Your name/).fill("<script>window.__pwned=1</script>");
  await page.getByLabel(/Email address/).fill("not-an-email");
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();

  // A bot that fills the honeypot is told "thanks" but nothing is stored.
  await page.reload();
  await page.waitForTimeout(submissionPolicy.minFillSeconds * 1000 + 500);
  await page.locator("#field-website").evaluate((el: HTMLInputElement) => {
    el.value = "http://spam.example";
  });
  await page.getByLabel(/Your name/).fill("Bot Person");
  await page.getByLabel(/Email address/).fill(`${state.run}-bot@example.test`);
  await page.getByLabel(/Working title/).fill(`${state.run} BOT SPAM`);
  await page.getByLabel(/Porsche model or subject/).fill("spam");
  await page.getByLabel(/Category/).selectOption({ label: state.categoryName });
  await page.getByLabel(/Your pitch/).fill("spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam");
  await page.getByLabel(/I have read and accept/).check();
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByText(/Thank you/)).toBeVisible();

  // Wrong methods and oversized/garbled bodies are refused rather than crashing.
  const res = await request.post("/tell-your-story", {
    headers: { "Content-Type": "application/json" },
    data: "x".repeat(2_000_000),
    failOnStatusCode: false,
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);

  // And the editor can verify the bot row was never stored.
  const { page: ep, context } = await editorPage(page.context().browser()!);
  await ep.goto("/admin/submissions");
  await expect(ep.getByText(submissionTitle)).toBeVisible();
  await expect(ep.getByText(`${state.run} BOT SPAM`)).toHaveCount(0);
  await context.close();
});

test("5. an editor authenticates and reviews the proposal", async ({ browser }) => {
  // Real sign-in through the form (the other tests reuse the saved session).
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(state.editor.email);
  await page.getByLabel("Password").fill(state.editor.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/admin/submissions");
  await page.getByRole("link", { name: submissionTitle }).click();
  await expect(page.getByRole("heading", { level: 1, name: submissionTitle })).toBeVisible();

  // Move to review.
  await page.getByLabel("Status").selectOption({ label: "In review" });
  await page.getByRole("button", { name: "Update submission" }).click();
  await expect(page.getByText("Submission updated.")).toBeVisible();

  // Declining demands a recorded reason.
  await page.getByLabel("Status").selectOption({ label: "Declined" });
  await page.getByRole("button", { name: "Update submission" }).click();
  await expect(page.getByText(/note|reason/i).first()).toBeVisible();
  await page.getByLabel(/Decision note/).fill("Fictional test pitch; declined by the automated suite.");
  await page.getByRole("button", { name: "Update submission" }).click();
  await expect(page.getByText("Submission updated.")).toBeVisible();
  await context.close();
});

test("8. an editor unpublishes the story and it is no longer publicly accessible", async ({ browser }) => {
  const { page, context } = await editorPage(browser);
  await page.goto(`/admin/stories/${storyId}`);
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished.")).toBeVisible();

  const anon = await anonymous(browser);
  await expectNotPublic(anon.page, `/stories/${slug}`, headline);
  expect(await (await anon.context.request.get("/sitemap.xml")).text()).not.toContain(slug);
  expect(await (await anon.context.request.get("/feed.xml")).text()).not.toContain(slug);
  await anon.page.goto(`/search?q=${uniqueWord}`);
  await expect(anon.page.getByText(/No stories matched/)).toBeVisible();
  await anon.page.goto("/stories");
  await expect(anon.page.getByRole("link", { name: new RegExp(headline) })).toHaveCount(0);
  await anon.page.goto("/");
  await expect(anon.page.getByRole("link", { name: new RegExp(headline) })).toHaveCount(0);
  await anon.context.close();

  // The editor can still preview it (it is a draft again), and an admin can still see the audit trail.
  const preview = await page.goto(`/admin/stories/${storyId}/preview`);
  expect(preview?.status()).toBe(200);
  await context.close();

  const admin = await editorPage(browser, ADMIN_AUTH);
  await admin.page.goto("/admin/audit");
  await expect(admin.page.getByText(/story/i).first()).toBeVisible();
  await admin.context.close();
});
