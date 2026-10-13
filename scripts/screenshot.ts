/**
 * Visual check helper: captures full-page screenshots at three breakpoints.
 *   npx tsx scripts/screenshot.ts /path [/path...]
 * Output goes to .artifacts/screens (gitignored).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const paths = process.argv.slice(2);
const sizes = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

async function main() {
  mkdirSync(".artifacts/screens", { recursive: true });
  const browser = await chromium.launch();
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await context.newPage();
    for (const path of paths) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      const name = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
      // Trigger scroll-linked reveals before capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `.artifacts/screens/${name}-${size.name}.png`, fullPage: process.env.FULL !== "0" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      console.log(`${size.name} ${path}: horizontal overflow ${overflow}px`);
    }
    await context.close();
  }
  await browser.close();
}

main();
