// Vista Mar: Low Tide — judge-sheet capture: real 1280×720 browser renders within the competition JPEG byte budget.
import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, watchPage, assertCanvas, GAME_URL, ARTIFACT_DIRECTORY } from './browser.mjs';

const SHOT_MANIFEST = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));
const MINIMUM_BYTES = 30000, MAXIMUM_BYTES = 262144;
const RECAPTURED = new Set(['1-heat.jpg']);
const browser = await launchBrowser();
const results = [];
try {
  for (const shot of SHOT_MANIFEST) {
    if (!RECAPTURED.has(shot.name)) continue;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const report = watchPage(page);
    await page.goto(GAME_URL + shot.query, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__SHOT_READY__ === true);
    await assertCanvas(page);
    let image = null, quality = 92;
    for (const candidate of [92, 89, 86, 83, 80, 77, 74, 70, 66, 62]) {
      const bytes = await page.screenshot({ type: 'jpeg', quality: candidate });
      if (bytes.length <= MAXIMUM_BYTES) { image = bytes; quality = candidate; break; }
    }
    if (!image) throw new Error(`${shot.name} could not fit the 256 KiB screenshot budget.`);
    if (image.length < MINIMUM_BYTES) throw new Error(`${shot.name} is suspiciously small: ${image.length} bytes.`);
    assert.deepEqual(report.errors, [], `${shot.name}: browser errors`);
    assert.deepEqual(report.external, [], `${shot.name}: external network dependencies`);
    const path = resolve('screenshots', shot.name); writeFileSync(path, image);
    const size = statSync(path).size;
    if (size > MAXIMUM_BYTES || size < MINIMUM_BYTES) throw new Error(`CAPTURE FAILED: ${path} is ${size} bytes.`);
    results.push({ name: shot.name, query: shot.query, bytes: size, quality,
      state: await page.evaluate(() => window.__VISTA_MAR__.snapshot()) });
    console.log(`Captured ${shot.name}: ${size} bytes (${(size / 1024).toFixed(1)} KiB), JPEG quality ${quality}.`);
    await page.close();
  }
  writeFileSync(resolve(ARTIFACT_DIRECTORY, 'capture-report.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
