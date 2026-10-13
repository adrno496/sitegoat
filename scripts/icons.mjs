import { chromium } from "playwright";
import fs from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage();
const source = fs.readFileSync("public/favicon.svg", "utf8");
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>body{margin:0}svg{width:100vw;height:100vh}</style>${source}`,
  );
  await page.screenshot({
    path: `public/icon-${size}.png`,
    omitBackground: true,
  });
}
await browser.close();
