// Vista Mar: Low Tide — scene smoke checks: readiness, world population, browser errors, and stable canvas pixels.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { launchBrowser, watchPage, assertCanvas, GAME_URL } from './browser.mjs';

const SHOT_MANIFEST = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));
async function pixelFingerprint(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game'), image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let n = 0; n < image.length; n += 128) { hash = Math.imul(hash ^ image[n], 16777619); hash = Math.imul(hash ^ image[n + 1], 16777619); hash = Math.imul(hash ^ image[n + 2], 16777619); }
    return hash >>> 0;
  });
}
const browser = await launchBrowser();
try {
  for (const shot of SHOT_MANIFEST) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const report = watchPage(page);
    await page.goto(GAME_URL + shot.query, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__SHOT_READY__ === true);
    const scene = new URLSearchParams(shot.query).get('shot'), pixels = await assertCanvas(page);
    const state = await page.evaluate(() => ({ ...window.__VISTA_MAR__.snapshot(),
      scene: window.__SHOT_SCENE__, staged: window.__VISTA_MAR__.staged,
      blocks: window.__VISTA_MAR__.city.blocks.length, width: window.__VISTA_MAR__.city.width }));
    assert.equal(state.scene, scene); assert.equal(state.staged, true); assert.equal(state.modules, 24);
    assert.equal(state.blocks, 16); assert.equal(state.width, 3200);
    assert.equal(state.mode, scene === 'start' ? 'title' : 'play');
    if (scene === 'chase') assert.equal(state.wanted, 3);
    if (scene === 'play' || scene === 'chase') assert.equal(state.vehicle, 'sports');
    if (scene === 'walk') assert.equal(state.vehicle, null);
    const first = await pixelFingerprint(page); await page.waitForTimeout(240);
    assert.equal(await pixelFingerprint(page), first, 'A staged scene must remain visually stable.');
    assert.deepEqual(report.errors, [], `${shot.name}: page errors`);
    assert.deepEqual(report.external, [], `${shot.name}: external requests`);
    console.log(`Smoke OK: ${shot.name} · ${pixels.colors} sampled colors · ${state.traffic} vehicles · ${state.pedestrians} pedestrians · pixel hash ${first}`);
    await page.close();
  }
} finally { await browser.close(); }
