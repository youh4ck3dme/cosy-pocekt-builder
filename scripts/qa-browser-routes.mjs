import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:8080";
const screenshotDir = resolve(process.cwd(), "screenshots");
mkdirSync(screenshotDir, { recursive: true });

const routes = [
  { path: "/", name: "dashboard" },
  { path: "/login", name: "login" },
  { path: "/register", name: "register" },
  { path: "/settings", name: "settings" },
  { path: "/wordpress", name: "wordpress" },
  { path: "/studio", name: "studio" },
  { path: "/blueprints", name: "blueprints" },
];

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

async function run() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const results = [];

  for (const vp of viewports) {
    for (const r of routes) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const pageErrors = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        pageErrors.push(err.message);
      });

      const targetUrl = new URL(r.path, baseUrl).href;
      let status = null;
      try {
        const res = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 15000 });
        status = res ? res.status() : 200;
      } catch (err) {
        status = "error: " + err.message;
      }

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const title = await page.title();
      const pngName = `qa-${r.name}-${vp.name}.png`;
      const pngPath = resolve(screenshotDir, pngName);
      await page.screenshot({ path: pngPath, fullPage: false });

      results.push({
        route: r.path,
        name: r.name,
        viewport: vp.name,
        status,
        title,
        hasHorizontalOverflow,
        consoleErrorsCount: consoleErrors.length,
        pageErrorsCount: pageErrors.length,
        screenshot: pngName,
      });

      await page.close();
    }
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error("QA script failed:", err);
  process.exit(1);
});
