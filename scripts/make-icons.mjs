// Renders public/icon.svg to the PNG sizes iOS/Android need.
// Usage: node scripts/make-icons.mjs  (needs Playwright; set NODE_PATH if installed globally)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// createRequire so a globally installed Playwright (via NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };
const browser = await chromium.launch();
for (const [file, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
  await page.close();
}
await browser.close();
console.log('icons written');
