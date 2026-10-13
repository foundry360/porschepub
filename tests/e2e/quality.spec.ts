import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { EDITOR_AUTH, loadState } from "./state";

const state = loadState();

const publicPages = [
  "/",
  "/stories",
  "/search?q=porsche",
  "/contributors",
  `/categories/${state.categorySlug}`,
  "/tell-your-story",
  "/about",
  "/privacy",
  "/submission-terms",
];

test.describe("accessibility (axe, WCAG 2.2 A/AA rules)", () => {
  // Entrance animations fade text in; measuring mid-fade reports false contrast failures.
  test.use({ reducedMotion: "reduce" });

  for (const path of publicPages) {
    test(`public ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }

  test("admin login", async ({ page }) => {
    await page.goto("/admin/login");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test.describe("signed in", () => {
    test.use({ storageState: EDITOR_AUTH });
    for (const path of ["/admin", "/admin/stories", "/admin/stories/new", "/admin/media", "/admin/submissions"]) {
      test(`admin ${path}`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  });
});

test.describe("responsive layout: no horizontal scrolling", () => {
  for (const width of [320, 390, 768, 1280]) {
    test(`${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/stories", "/tell-your-story", "/about"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("keyboard: skip link is the first focusable element and works", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content, main").first()).toBeVisible();
  });
});

test.describe("security headers and indexing", () => {
  test("public pages send the security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("admin and login are noindex; robots disallows admin", async ({ page, request }) => {
    await page.goto("/admin/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const robots = await (await request.get("/robots.txt")).text();
    // Indexing is off unless ALLOW_INDEXING=true (then /admin is disallowed explicitly).
    expect(robots).toMatch(/Disallow: \/(admin)?\s/);
  });
});

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark", reducedMotion: "reduce" });

  for (const path of ["/", "/stories", "/tell-your-story", "/admin/login"]) {
    test(`follows the OS setting and stays accessible: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }

  test("the toggle overrides the OS setting and persists across reloads", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Colour theme/ });
    await expect(toggle).toHaveAttribute("aria-label", /Auto/);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAttribute("aria-label", /Light/);
    await toggle.click();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("aria-label", /Auto/);
  });
});
