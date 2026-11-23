// Vista Mar: Low Tide — WitnessScenes: fixed-seed judge scenes using the actual game world, actors, and renderer.
(() => {
  class WitnessScenes {
    constructor(game) { this.game = game; game.on('ready', () => this.bootRequestedScene()); }
    car(type, x, y, angle, color, driver = 'civilian', speed = 0) {
      const car = this.game.vehicles.add(type, x, y, angle, color);
      car.driver = driver; car.speed = speed; car.vx = Math.cos(angle) * speed; car.vy = Math.sin(angle) * speed;
      return car;
    }
    pedestrians(points) {
      points.forEach(([x, y], index) => {
        const person = this.game.pedestrians.add(x, y);
        person.angle = index % 2 ? .35 : -1.1; person.walk = index * 1.7;
      });
    }
    clearArea(x, y, radius) {
      this.game.vehicles.list = this.game.vehicles.list.filter(car => Math.hypot(car.x - x, car.y - y) > radius);
      this.game.traffic.cars = this.game.traffic.cars.filter(car => this.game.vehicles.list.includes(car));
      this.game.pedestrians.list = this.game.pedestrians.list.filter(person => Math.hypot(person.x - x, person.y - y) > radius);
    }
    drive(car) { this.game.player.vehicle = car; car.driver = 'sol'; this.game.player.x = car.x; this.game.player.y = car.y; }
    skid(points) {
      for (let n = 1; n < points.length; n++) {
        for (const side of [-1, 1]) this.game.vehicles.skids.push({ px: points[n - 1][0], py: points[n - 1][1] + side * 9,
          x: points[n][0], y: points[n][1] + side * 9, life: 70 });
      }
    }
    bootRequestedScene() {
      const shot = this.game.params.get('shot');
      if (!['start', 'play', 'chase', 'night', 'walk'].includes(shot)) return;
      const game = this.game;
      game.staged = true; game.mode = shot === 'start' ? 'title' : 'play'; game.paused = false;
      game.camera.locked = true; game.visualTime = 2.7; game.time = 61.7;
      game.ui.menu = null; game.ui.map = false; game.story.blocking = false; game.story.radioLine = null;
      game.police.clear(); game.missions.reset();
      if (shot === 'start') this.startScene();
      if (shot === 'play') this.playScene();
      if (shot === 'chase') this.chaseScene();
      if (shot === 'night') this.nightScene();
      if (shot === 'walk') this.walkScene();
      game.story.radioLine = null; game.toasts = []; game.camera.trauma = 0;
      window.__SHOT_SCENE__ = shot;
    }
    startScene() {
      const game = this.game;
      game.dayPhase = .245; game.camera.snap(2110, 1410, .61);
      const cruise = this.car('sedan', 2470, 1330, -Math.PI / 2, '#9babbd', 'civilian', 110);
      cruise.ai = true; cruise.desiredSpeed = 110;
      const taxi = this.car('taxi', 2620, 1180, Math.PI / 2, '#e2bc6a', 'civilian', 92);
      taxi.ai = true; taxi.desiredSpeed = 92;
      this.car('sports', 2350, 1510, -.07, '#dfa16c', 'civilian', 175);
      this.car('taxi', 2540, 1450, Math.PI, '#e2bc6a', 'civilian', 92);
      this.car('van', 2630, 1250, Math.PI / 2, '#a9b8a8', 'civilian', 82);
      const cruiser = this.car('police', 2590, 1470, -Math.PI / 2, '#e1e5d8', 'civilian', 0);
      cruiser.ai = true; cruiser.desiredSpeed = 30;
      this.pedestrians([[2775, 1407], [2774, 1571], [2741, 1740], [2455, 1310], [2209, 1420], [2128, 1573], [2245, 1790], [2387, 1179], [2560, 1290], [2700, 1120], [2020, 1340]]);
    }
    playScene() {
      const game = this.game;
      this.clearArea(2320, 1480, 440); game.dayPhase = .435; game.missions.start(1);
      const car = this.car('sports', 2278, 1510, -.11, '#e7af76', 'sol', 256);
      car.missionTag = 'golden-caiman'; game.missions.targetCar = car; game.missions.stage = 'deliver'; this.drive(car);
      game.cash = 2480; game.player.health = 94; game.player.armor = 66;
      game.reputation = 18; game.stats.missions = 1; game.stats.stolen = 4; game.stats.distance = 6800;
      this.car('taxi', 2492, 1510, 0, '#e6c36d', 'civilian', 104);
      this.car('van', 2420, 1450, Math.PI, '#95b4ad', 'civilian', 82);
      this.car('sedan', 1935, 1510, 0, '#84b3ac', 'civilian', 110);
      this.car('sedan', 2040, 1285, Math.PI / 2, '#c8969b', 'civilian', 87);
      this.car('sports', 2690, 1262, -Math.PI / 2, '#9babbd', 'civilian', 121);
      this.car('truck', 2630, 1760, Math.PI / 2, '#adc5b6', 'civilian', 84);
      this.car('sedan', 2060, 1830, -Math.PI / 2, '#d9c4a3');
      this.car('van', 2480, 1715, -Math.PI / 2, '#c2b99b', null);
      this.pedestrians([[2162, 1402], [2325, 1402], [2570, 1396], [2135, 1559], [2370, 1560], [2549, 1560], [2742, 1576],
        [2771, 1390], [2790, 1750], [2371, 1230], [2490, 1304], [2460, 1163], [2523, 1050], [2420, 1850], [2157, 1680]]);
      this.skid([[2120, 1540], [2160, 1525], [2215, 1515], [2243, 1513]]);
      game.particles.exhaust(2246, 1517); game.particles.smoke(2240, 1521, '#d5d4c0', 6);
      game.camera.snap(2340, 1490, .93); game.input.mouse = { x: 760, y: 363, down: false, clicked: false };
    }
    chaseScene() {
      const game = this.game;
      this.clearArea(2350, 1480, 440); game.dayPhase = .922; game.missions.start(2); game.missions.stage = 'escape';
      const hero = this.car('sports', 2420, 1510, -.19, '#91d6bc', 'sol', 292); this.drive(hero);
      hero.hp = 86; game.cash = 4230; game.player.health = 83; game.player.armor = 47;
      game.stats.missions = 2; game.stats.stolen = 5; game.stats.escapes = 1; game.reputation = 32;
      game.police.setStars(3); game.police.seen = true; game.police.lastKnown = { x: hero.x, y: hero.y };
      const a = game.police.spawnUnit(2225, 1537, -.1), b = game.police.spawnUnit(2090, 1500, .16), c = game.police.spawnUnit(2690, 1390, Math.PI / 2);
      a.speed = 250; b.speed = 236; c.speed = 198;
      this.car('taxi', 2630, 1725, Math.PI / 2, '#dfbc72', 'civilian', 89);
      this.car('van', 2540, 1450, Math.PI, '#a9bdb2', 'civilian', 59);
      this.car('sedan', 2040, 1265, Math.PI / 2, '#c48983', 'civilian', 70);
      this.car('van', 2445, 1724, -Math.PI / 2, '#cbb89b', null);
      const wreck = this.car('sedan', 2680, 1548, .63, '#a8b4bd', null); wreck.damage(999, 'sol');
      this.pedestrians([[2385, 1561], [2528, 1566], [2736, 1630], [2775, 1780], [2410, 1660], [2177, 1384], [2518, 1790], [2420, 1864]]);
      game.pedestrians.list.filter(p => Math.abs(p.x - 2450) < 300 && Math.abs(p.y - 1480) < 220).forEach(p => { p.panic = 7; p.angle = -.8; });
      this.skid([[2248, 1560], [2290, 1543], [2336, 1527], [2384, 1517]]);
      game.particles.smoke(2368, 1538, '#bfc5bb', 11); game.particles.smoke(2392, 1526, '#bbc9c0', 8);
      game.missions.shotMarker = { ...VM.CONFIG.garage, label: 'BREAK LINE OF SIGHT', action: 'GET HIDDEN' };
      game.camera.snap(2395, 1500, .9); game.input.mouse = { x: 783, y: 368, down: false, clicked: false };
    }
    nightScene() {
      const game = this.game;
      this.clearArea(2420, 2450, 370); game.dayPhase = .936; game.missions.start(3); game.missions.stage = 'fight';
      game.missions.spawnWarehouseGuards();
      game.player.vehicle = null; game.player.x = 2414; game.player.y = 2460; game.player.angle = -.23;
      game.player.health = 82; game.player.armor = 35; game.player.ammo = 9; game.player.reserve = 84; game.cash = 5890;
      game.stats.missions = 3; game.stats.stolen = 6; game.stats.shots = 23; game.stats.escapes = 2; game.reputation = 45;
      game.missions.guards[0].damage(100, 'sol');
      game.missions.guards[2].health = 33; game.missions.guards[2].angle = Math.PI;
      game.missions.guards[1].angle = -.3; game.missions.guards[3].angle = 2.6; game.missions.guards[4].angle = -1.8;
      game.police.setStars(2); game.police.seen = true; game.police.spawnUnit(2630, 2520, -Math.PI / 2);
      this.car('van', 2563, 2610, -.35, '#a9bfae', null);
      this.car('truck', 2630, 2365, Math.PI / 2, '#baad92', 'civilian', 67);
      this.car('sedan', 2340, 2690, 0, '#c0b38e', 'civilian', 70);
      this.car('taxi', 2690, 2430, -Math.PI / 2, '#e0be7d', 'civilian', 85);
      const wreck = this.car('sedan', 2572, 2468, -.7, '#a87c76', null); wreck.damage(999, 'sol');
      game.combat.shoot(2414, 2460, -.23, 'sol'); game.particles.muzzle(2543, 2453, Math.PI);
      game.combat.bullets.push({ x: 2514, y: 2455, px: 2530, py: 2455, vx: -650, vy: 0, owner: 'hostile', life: .4 });
      this.pedestrians([[2778, 2330], [2790, 2530], [2795, 2712], [2865, 2680], [2737, 2189], [2310, 2737], [2450, 2737], [2510, 2584]]);
      game.camera.snap(2445, 2465, .91); game.input.mouse = { x: 749, y: 343, down: false, clicked: false };
    }
    walkScene() {
      const game = this.game;
      this.clearArea(2320, 1480, 440); game.dayPhase = .435; game.missions.start(3); game.missions.stage = 'fight';
      game.player.vehicle = null; game.player.x = 2300; game.player.y = 1470;
      game.player.health = 82; game.player.armor = 35; game.player.ammo = 9; game.player.reserve = 84; game.player.stamina = 100;
      game.player.dead = false; game.player.invulnerable = 0; game.player.reloadTimer = 0; game.player.vx = 0; game.player.vy = 0;
      game.combat.bullets = []; game.combat.hostiles = []; game.missions.guards = [];
      const gunman = game.combat.addHostile(2440, 1560, 'Vela Security');
      game.missions.guards = [gunman]; gunman.alert = true;
      game.missions.shotMarker = { x: gunman.x, y: gunman.y, label: 'HARBOR SECURITY', action: 'CLEAR THE YARD', hostile: true };
      game.cash = 5890; game.reputation = 45;
      game.stats.missions = 3; game.stats.stolen = 6; game.stats.shots = 23; game.stats.escapes = 2;
      this.car('taxi', 2240, 1400, 0, '#e6c36d', 'civilian', 0);
      this.car('sedan', 2560, 1330, -Math.PI / 2, '#9babbd', 'civilian', 0);
      this.car('van', 2180, 1360, Math.PI / 2, '#a9b8a8', 'civilian', 0);
      this.pedestrians([[2150, 1420], [2430, 1340], [2540, 1290], [2590, 1450], [2120, 1680]]);
      game.player.angle = Math.atan2(gunman.y - game.player.y, gunman.x - game.player.x);
      game.camera.snap(2300, 1470, 1.2); game.input.mouse = { x: 640, y: 330, down: false, clicked: false };
    }
  }
  VM.WitnessScenes = WitnessScenes;
  VM.installers.push(game => { game.shots = new WitnessScenes(game); });
})();
