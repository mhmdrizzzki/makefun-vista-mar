// Vista Mar: Low Tide — local visual preview: real canvas captures stored outside the submission screenshots.
import { resolve } from 'node:path';
import { launchBrowser, watchPage, assertCanvas, GAME_URL, ARTIFACT_DIRECTORY } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const report = watchPage(page);
  const query = process.argv.slice(2).find(arg => arg.startsWith('?')) || '?seed=16';
  await page.goto(GAME_URL + query, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__VISTA_MAR__?.frameCount > 10);
  if (process.argv.includes('--walk')) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  if (process.argv.includes('--downtown')) {
    await page.evaluate(() => { const game = window.__VISTA_MAR__; game.camera.snap(2320, 1480, .88); game.camera.locked = true; });
  }
  await page.waitForTimeout(200);
  const pixels = await assertCanvas(page);
  const path = resolve(ARTIFACT_DIRECTORY, 'preview.jpg');
  await page.screenshot({ path, type: 'jpeg', quality: 90 });
  console.log(JSON.stringify({ path, pixels, errors: report.errors, external: report.external,
    state: await page.evaluate(() => window.__VISTA_MAR__.snapshot()) }, null, 2));
  if (report.errors.length) throw new Error(report.errors.join('\n'));
} finally { await browser.close(); }
