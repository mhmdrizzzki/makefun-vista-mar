// Traverse every contract through its public gameplay actions; verify menus, save/load, the atlas, and arrest recovery.
import assert from 'node:assert/strict';
import { launchBrowser, watchPage, GAME_URL } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const report = watchPage(page);
  await page.goto(GAME_URL + '?seed=16');
  await page.waitForFunction(() => window.__VISTA_MAR__?.frameCount > 5);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__VISTA_MAR__.story.blocking);
  async function finishDialogue() {
    for (let i = 0; i < 12 && await page.evaluate(() => window.__VISTA_MAR__.story.blocking); i++) {
      await page.keyboard.press('Space'); await page.waitForTimeout(100);
    }
    assert.equal(await page.evaluate(() => window.__VISTA_MAR__.story.blocking), false);
  }
  async function warpFoot(point = null) {
    await page.evaluate(point => {
      const game = window.__VISTA_MAR__;
      if (game.player.vehicle) { const car = game.player.vehicle; car.driver = null; car.ai = false; car.speed = 0; car.vx = 0; car.vy = 0; game.player.vehicle = null; }
      const target = point || game.missions.marker;
      const open = game.world.nearestOpen(target.x, target.y, 11);
      game.player.x = open.x; game.player.y = open.y; game.player.vx = 0; game.player.vy = 0;
      game.player.health = 100; game.player.armor = 100; game.player.invulnerable = 99;
      game.camera.snap(open.x, open.y, 1.1);
    }, point);
    await page.waitForTimeout(100);
  }
  async function waitMission(index) {
    await page.waitForFunction(index => window.__VISTA_MAR__.missions.index === index, index, { timeout: 20000 });
    console.log(`Campaign advanced: ${index}/6 contracts finished.`);
  }
  async function escapeFixture() {
    await page.evaluate(() => {
      const game = window.__VISTA_MAR__;
      for (const unit of game.police.units) { unit.x = 300; unit.y = 300; }
      for (const officer of game.police.officers) { officer.x = 300; officer.y = 300; }
      game.time += 100; game.police.heat = 2; game.police.lastCrime = -100; game.police.hiddenTime = 20; game.police.spawnClock = -999;
      game.police.update(1);
    });
    assert.equal(await page.evaluate(() => window.__VISTA_MAR__.police.stars), 0);
  }
  await finishDialogue();
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.missions.active), true);
  await warpFoot(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await finishDialogue(); await waitMission(1);
  await page.evaluate(() => window.__VISTA_MAR__.police.clear());
  const caiman = await page.evaluate(() => ({ x: window.__VISTA_MAR__.missions.targetCar.x + 36, y: window.__VISTA_MAR__.missions.targetCar.y }));
  await warpFoot(caiman); await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'deliver');
  await page.evaluate(() => {
    const game = window.__VISTA_MAR__, car = game.player.vehicle; car.x = 2384; car.y = 1664; car.speed = 0; car.vx = 0; car.vy = 0;
    game.player.x = car.x; game.player.y = car.y;
  });
  await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await finishDialogue(); await waitMission(2);
  await page.evaluate(() => window.__VISTA_MAR__.police.clear());
  await warpFoot(); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'escape');
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.police.stars), 3);
  await escapeFixture(); await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'drop');
  await warpFoot(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await finishDialogue(); await waitMission(3);
  await page.evaluate(() => window.__VISTA_MAR__.police.clear());
  await warpFoot(); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'fight');
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.missions.guards.length), 5);
  await page.evaluate(() => { const game = window.__VISTA_MAR__; game.police.clear(); game.missions.guards.forEach(guard => guard.damage(999, 'sol')); });
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'collect');
  await warpFoot(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await finishDialogue(); await waitMission(4);
  const van = await page.evaluate(() => ({ x: window.__VISTA_MAR__.missions.targetCar.x - 34, y: window.__VISTA_MAR__.missions.targetCar.y }));
  await warpFoot(van); await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'extract');
  await escapeFixture();
  await page.evaluate(() => {
    const game = window.__VISTA_MAR__, car = game.player.vehicle; car.x = 449; car.y = 2380; car.speed = 0; car.vx = 0; car.vy = 0;
    game.player.x = car.x; game.player.y = car.y;
  });
  await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await finishDialogue(); await waitMission(5);
  await page.evaluate(() => {
    const game = window.__VISTA_MAR__, car = game.player.vehicle; car.x = 2630; car.y = 2730; car.speed = 0;
    game.player.x = car.x; game.player.y = car.y; game.police.clear();
  });
  await page.waitForFunction(() => window.__VISTA_MAR__.missions.stage === 'chase');
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.missions.boss.ai), true);
  await page.evaluate(() => window.__VISTA_MAR__.missions.boss.damage(999, 'sol'));
  await page.waitForTimeout(150); await finishDialogue(); await waitMission(6);
  const ending = await page.evaluate(() => ({ missions: window.__VISTA_MAR__.stats.missions, cash: window.__VISTA_MAR__.cash, menu: window.__VISTA_MAR__.ui.menu }));
  assert.equal(ending.missions, 6); assert.ok(ending.cash >= 11050); assert.equal(ending.menu, 'victory');
  await page.waitForTimeout(150); await page.mouse.click(640, 464);
  await page.waitForFunction(() => !window.__VISTA_MAR__.ui.menu);
  await warpFoot({ x: 2450, y: 1820 });
  await page.evaluate(() => { window.__VISTA_MAR__.cash = 4321; window.__VISTA_MAR__.player.health = 73; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(120); await page.mouse.click(640, 308);
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.save.has()), true);
  await page.evaluate(() => { const g = window.__VISTA_MAR__; g.cash = 9; g.player.x = 500; g.player.y = 2380; });
  await page.mouse.click(640, 371); await page.waitForTimeout(150);
  const restored = await page.evaluate(() => window.__VISTA_MAR__.snapshot());
  assert.equal(restored.cash, 4321); assert.equal(restored.mission, 6); assert.ok(Math.abs(restored.position.x - 2450) < 2);
  await page.keyboard.press('Tab'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.ui.map), true);
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => Boolean(window.__VISTA_MAR__.customWaypoint));
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => Boolean(window.__VISTA_MAR__.customWaypoint)), true);
  await page.evaluate(() => {
    const g = window.__VISTA_MAR__; g.police.setStars(1); const officer = g.police.spawnOfficer(g.player.x + 12, g.player.y);
    g.police.arrest = 99; g.police.update(.1);
  });
  await page.waitForFunction(() => window.__VISTA_MAR__.mode === 'downed');
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  const respawn = await page.evaluate(() => window.__VISTA_MAR__.snapshot());
  assert.equal(respawn.mode, 'play'); assert.equal(respawn.health, 100); assert.equal(respawn.wanted, 0);
  assert.ok(Math.abs(respawn.position.x - 449) < 2);
  assert.deepEqual(report.errors, []); assert.deepEqual(report.external, []);
  console.log(`Campaign OK: six rewarded contracts, epilogue, free roam, canvas save/load, full map waypoint, and busted respawn. Ending cash: $${ending.cash}.`);
} finally { await browser.close(); }
