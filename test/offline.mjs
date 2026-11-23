// Verify the desktop Chrome local-file path without any HTTP request or build step.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, assertCanvas } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(resolve('game/index.html')).href + '?shot=play&seed=16');
  await page.waitForFunction(() => window.__SHOT_READY__ === true);
  await assertCanvas(page);
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.player.vehicle.type), 'sports');
  console.log('Offline OK: file:///game/index.html renders the game with zero HTTP/network requests.');
} finally { await browser.close(); }
