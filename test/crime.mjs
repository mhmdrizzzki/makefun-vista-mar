// Exercise real mouse combat, reloads, escalation, police gunfire, explosions, and hidden-star decay.
import assert from 'node:assert/strict';
import { launchBrowser, watchPage, GAME_URL } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const report = watchPage(page);
  await page.goto(GAME_URL + '?seed=16');
  await page.waitForFunction(() => window.__VISTA_MAR__?.frameCount > 5);
  await page.evaluate(() => {
    const game = window.__VISTA_MAR__; game.mode = 'play';
    game.player.x = 2450; game.player.y = 1820; game.player.invulnerable = 0;
    game.camera.snap(2450, 1820, 1.1); game.camera.locked = true;
    game.combat.addHostile(2530, 1820, 'Test harbor guard');
  });
  await page.mouse.move(728, 360); await page.mouse.down();
  await page.waitForFunction(() => window.__VISTA_MAR__.combat.hostiles[0].dead, { timeout: 10000 });
  await page.mouse.up();
  const shooting = await page.evaluate(() => ({ shots: window.__VISTA_MAR__.stats.shots,
    ammo: window.__VISTA_MAR__.player.ammo, stars: window.__VISTA_MAR__.police.stars }));
  assert.ok(shooting.shots >= 3 && shooting.ammo < 12 && shooting.stars >= 1, 'Gunfire must hit, spend ammunition, and alert police.');
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => window.__VISTA_MAR__.player.ammo === 12, { timeout: 10000 });
  await page.evaluate(() => {
    const game = window.__VISTA_MAR__; game.emit('crime', { x: game.player.x, y: game.player.y, severity: 112, kind: 'test escalation' });
    const officer = game.police.spawnOfficer(2580, 1820); officer.cooldown = 0;
    game.player.health = 100; game.player.armor = 0; game.player.invulnerable = 0;
  });
  await page.waitForFunction(() => window.__VISTA_MAR__.player.health < 100, { timeout: 10000 });
  const response = await page.evaluate(() => ({ stars: window.__VISTA_MAR__.police.stars,
    units: window.__VISTA_MAR__.police.units.length, health: window.__VISTA_MAR__.player.health }));
  assert.ok(response.stars >= 3 && response.units >= 1 && response.health < 100, 'Three-star officers must respond and damage Sol with gunfire.');
  const blast = await page.evaluate(() => {
    const game = window.__VISTA_MAR__, car = game.vehicles.add('van', 2495, 1956);
    car.damage(999, 'sol');
    return { wrecked: car.wrecked, particles: game.particles.list.length, flashes: game.particles.flashes.length };
  });
  assert.ok(blast.wrecked && blast.particles > 40 && blast.flashes > 0, 'Destroyed vehicles must produce a real explosion.');
  const escape = await page.evaluate(() => {
    const game = window.__VISTA_MAR__; game.police.clear(); game.police.setStars(1);
    game.police.lastCrime = -100; game.police.hiddenTime = 20; game.police.spawnClock = -999;
    game.time = 1000; game.police.update(8);
    return { stars: game.police.stars, escapes: game.stats.escapes };
  });
  assert.equal(escape.stars, 0); assert.ok(escape.escapes >= 1, 'Staying unseen must clear heat and count an escape.');
  assert.deepEqual(report.errors, []);
  console.log(`Crime OK: ${shooting.shots} real shots; reload; ${response.stars}-star response (${response.units} patrol); officer hit; explosion; hidden escape.`);
} finally { await browser.close(); }
