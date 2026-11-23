// Vista Mar: Low Tide — driving regression: occupied-car theft, acceleration, safe exit, and red-light traffic stops.
import assert from 'node:assert/strict';
import { launchBrowser, watchPage, GAME_URL } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const report = watchPage(page);
  await page.goto(GAME_URL + '?seed=16');
  await page.waitForFunction(() => window.__VISTA_MAR__?.frameCount > 5);
  const setup = await page.evaluate(() => {
    const game = window.__VISTA_MAR__; game.mode = 'play';
    const car = game.vehicles.list.find(v => Math.abs(v.x - 582) < 3 && Math.abs(v.y - 2410) < 3);
    car.driver = 'civilian'; car.ai = false; car.angle = 0;
    game.player.x = car.x - 37; game.player.y = car.y;
    game.camera.snap(car.x, car.y, 1);
    return { carId: car.id, startX: car.x, pedestrians: game.pedestrians.list.length };
  });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(120);
  const theft = await page.evaluate(() => ({ car: window.__VISTA_MAR__.player.vehicle?.id,
    stolen: window.__VISTA_MAR__.stats.stolen, pedestrians: window.__VISTA_MAR__.pedestrians.list.length }));
  assert.equal(theft.car, setup.carId, 'F must enter the nearby occupied sedan.');
  assert.ok(theft.stolen >= 1 && theft.pedestrians > setup.pedestrians, 'The driver must be ejected and flee.');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
  const driving = await page.evaluate(() => ({ x: window.__VISTA_MAR__.player.x, speed: window.__VISTA_MAR__.player.vehicle.speed }));
  assert.ok(driving.x - setup.startX > 20 && driving.speed > 45, 'The stolen vehicle must accelerate and move.');
  await page.keyboard.press('KeyF'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__VISTA_MAR__.player.vehicle), null, 'F must exit the car.');
  const redLight = await page.evaluate(() => {
    const game = window.__VISTA_MAR__, car = game.traffic.cars.find(c => c.ai && !c.wrecked);
    game.time = 10; car.nav = { from: { ix: 2, iy: 1 }, to: { ix: 2, iy: 2 }, target: { x: 1450, y: 1480 } };
    car.x = 1450; car.y = 1368; car.angle = Math.PI / 2; car.speed = 80;
    game.traffic.update(1 / 60);
    return { light: game.city.signal(game.city.intersections.find(i => i.ix === 2 && i.iy === 2), true), desired: car.desiredSpeed };
  });
  assert.equal(redLight.light, 'red'); assert.equal(redLight.desired, 0, 'AI must stop before a red intersection.');
  assert.deepEqual(report.errors, []);
  console.log(`Driving OK: occupied car stolen; moved ${(driving.x - setup.startX).toFixed(1)} units at ${driving.speed.toFixed(1)}; exited; red-light AI stopped.`);
} finally { await browser.close(); }
