// Exercise real keyboard walking and solid building collisions in the browser.
import assert from 'node:assert/strict';
import { launchBrowser, watchPage, GAME_URL } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const report = watchPage(page);
  await page.goto(GAME_URL + '?seed=16');
  await page.waitForFunction(() => window.__VISTA_MAR__?.frameCount > 5);
  const start = await page.evaluate(() => {
    const game = window.__VISTA_MAR__; game.mode = 'play';
    game.camera.snap(game.player.x, game.player.y, 1.1);
    return { x: game.player.x, y: game.player.y, blocked: game.world.isBlocked(game.player.x, game.player.y) };
  });
  assert.equal(start.blocked, false, 'The safehouse spawn must be on walkable ground.');
  await page.keyboard.down('KeyD'); await page.waitForTimeout(550); await page.keyboard.up('KeyD');
  const end = await page.evaluate(() => window.__VISTA_MAR__.snapshot());
  assert.ok(end.position.x - start.x > 35, 'Keyboard input must actually move Sol.');
  const collision = await page.evaluate(() => {
    const game = window.__VISTA_MAR__, b = game.city.buildings[0];
    const body = { x: b.x - 25, y: b.y + 40 };
    game.world.moveCircle(body, 70, 0, 10);
    return { stopped: body.x <= b.x - 10, x: body.x, wall: b.x };
  });
  assert.ok(collision.stopped, 'Building footprints must stop movement.');
  assert.deepEqual(report.errors, []);
  console.log(`On-foot OK: moved ${(end.position.x - start.x).toFixed(1)} units; building collision stops at ${collision.x.toFixed(1)}.`);
} finally { await browser.close(); }
