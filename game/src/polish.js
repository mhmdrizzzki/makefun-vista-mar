// Vista Mar: Low Tide — FinalCoastalPolish: fixed-step physics, drive-by combat, rooftop detail, neon, and soft lighting.
(() => {
  class FinalCoastalPolish {
    constructor(game) {
      this.game = game; this.cleanupClock = 0; this.neonFixtures = [];
      this.installFixedStep(); this.reserveMissionParking(); this.correctExplosionDamage();
      this.enrichArchitecture(); this.enrichStreets(); this.installSoftVehicleLights();
      game.renderer.entityDecorators.push(ctx => this.drawLivingDetails(ctx));
      game.lightDraw.push((ctx, night) => this.drawCoastalGlow(ctx, night));
      game.screenDraw.splice(1, 0, ctx => this.footerBackdrop(ctx));
      game.screenDraw.push(ctx => this.drawDrivingCombat(ctx));
      game.on('ready', () => this.refineWitnessFraming());
      game.on('campaign-finished', () => { game.story.radioLine = null; });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.mode === 'play' && !game.staged && !game.ui.menu && !game.story.blocking) {
          game.ui.menu = 'pause'; game.ui.selection = 0; game.paused = true;
        }
      });
    }
    installFixedStep() {
      const game = this.game, step = 1 / 60;
      game.simulationAccumulator = 0;
      // The first headless driving pass exposed slow-motion from clamping every render to 40 ms.
      // Rendering now has its own cadence; physics catches up in bounded 60 Hz steps.
      game.loop = function(timestamp) {
        const elapsed = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, .12) : step;
        this.lastTime = timestamp; this.simulationAccumulator += elapsed;
        let updates = 0;
        while (this.simulationAccumulator >= step && updates < 8) {
          this.update(step); this.input.endFrame(); this.simulationAccumulator -= step; updates++;
        }
        this.draw(); requestAnimationFrame(next => this.loop(next));
      };
    }
    reserveMissionParking() {
      const reserved = this.game.vehicles.list.filter(car => ['golden-caiman', 'garage-display'].includes(car.missionTag));
      this.game.vehicles.list = this.game.vehicles.list.filter(car => reserved.includes(car)
        || car.driver || !reserved.some(target => VM.util.distance(car, target) < 58));
      const originalNearest = this.game.vehicles.nearest.bind(this.game.vehicles);
      this.game.vehicles.nearest = (position = this.game.player, range = 77) => {
        const mission = this.game.missions, target = mission.targetCar;
        if (mission.active && ['steal', 'van'].includes(mission.stage) && target && !target.wrecked && VM.util.distance(target, position) < Math.min(range, 59)) return target;
        return originalNearest(position, range);
      };
    }
    correctExplosionDamage() {
      const destroy = VM.ArcadeVehicle.prototype.destroy;
      VM.ArcadeVehicle.prototype.destroy = function(attacker) {
        const occupant = this.controlled && !this.wrecked ? this.game.player : null;
        destroy.call(this, attacker);
        // Emergency exit's grace period must not swallow the explosion's occupant damage.
        if (occupant && !occupant.dead) {
          occupant.invulnerable = 0; occupant.damage(65, 'vehicle explosion'); occupant.invulnerable = .8;
        }
      };
    }
    enrichArchitecture() {
      const city = this.game.city, ctx = city.architecture.getContext('2d');
      for (const b of city.buildings) {
        const rng = new VM.util.SeededRandom(b.seed + 448), ry = b.y - b.lift;
        ctx.save(); ctx.beginPath(); ctx.rect(b.x + 6, ry + 6, b.w - 12, b.h - 43); ctx.clip();
        const light = ctx.createLinearGradient(b.x, ry, b.x + b.w, ry + b.h);
        light.addColorStop(0, '#fff7cd17'); light.addColorStop(.5, '#f0edc300'); light.addColorStop(1, '#152c393a');
        ctx.fillStyle = light; ctx.fillRect(b.x, ry, b.w, b.h);
        for (let n = 0; n < b.w * b.h / 210; n++) {
          ctx.fillStyle = rng.chance(.5) ? '#fcf1d00d' : '#142c3214'; ctx.fillRect(b.x + rng.range(8, b.w - 8), ry + rng.range(9, b.h - 39), rng.range(1, 3), 1);
        }
        if (b.kind === 'tile') {
          for (let n = 0; n < 3; n++) this.pot(ctx, b.x + 24 + n * 19, ry + 18, .7);
        } else if (b.kind === 'warehouse') {
          VM.util.label(ctx, b.id === 'warehouse' ? '08' : 'VM', b.x + 39, ry + b.h * .62, 48, '#e3e5bf32', 900);
          this.vent(ctx, b.x + b.w - 74, ry + 109, 39, 24); this.vent(ctx, b.x + b.w - 120, ry + 109, 31, 24);
          ctx.strokeStyle = '#d4d7b748'; ctx.lineWidth = 1;
          for (let px = b.x + 15; px < b.x + b.w - 12; px += 13) for (let py = ry + 15; py < ry + b.h - 37; py += 21) { ctx.beginPath(); ctx.arc(px, py, 1, 0, Math.PI * 2); ctx.stroke(); }
        } else if (b.id === 'garage') {
          this.gearLogo(ctx, b.x + 74, ry + 95, 31, '#244e4f', '#a8d4b3');
          this.vent(ctx, b.x + b.w - 63, ry + 108, 35, 27);
          VM.util.label(ctx, 'INÉS / EST. 1987', b.x + 29, ry + 27, 7, '#e3e2be99', 700);
        } else {
          const choice = rng.next();
          if (b.w > 148 && b.h > 120 && choice < .28) this.rooftopPool(ctx, b.x + b.w - 70, ry + 23, 46, 65);
          else if (choice < .68 && b.w > 148) this.solarPanels(ctx, b.x + 22, ry + 23, 64, 42);
          else if (b.w > 120) this.pergola(ctx, b.x + b.w - 85, ry + 22, 58, 46);
          this.waterTank(ctx, b.x + b.w - 31, ry + b.h - 61, 10);
          this.pot(ctx, b.x + 23, ry + b.h - 51, .8); this.pot(ctx, b.x + 42, ry + b.h - 51, .65);
        }
        ctx.restore();
        if (b.name === 'LA MAREA') this.neonFixtures.push({ x: b.x + b.w / 2, y: ry + 25, text: 'COBRE SOCIAL CLUB', color: '#eda3cd', size: 7 });
        if (b.id === 'warehouse') this.neonFixtures.push({ x: b.x + b.w + 9, y: b.y + b.h - 53, text: '08', color: '#95dbda', size: 19, vertical: true });
      }
    }
    pot(ctx, x, y, scale = 1) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = '#233c3b38'; ctx.beginPath(); ctx.ellipse(3, 4, 8, 5, .4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c2946f'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      for (let n = 0; n < 5; n++) { ctx.fillStyle = n % 2 ? '#4f805d' : '#87a370'; ctx.beginPath(); ctx.ellipse(Math.cos(n * 1.26) * 4, Math.sin(n * 1.26) * 4, 5, 2, n * 1.26, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    }
    vent(ctx, x, y, w, h) {
      ctx.fillStyle = '#243d4440'; ctx.fillRect(x + 5, y + 6, w, h); ctx.fillStyle = '#c0c8b5'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#6e8980'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      for (let py = y + 5; py < y + h - 3; py += 4) { ctx.beginPath(); ctx.moveTo(x + 4, py); ctx.lineTo(x + w - 4, py); ctx.stroke(); }
    }
    rooftopPool(ctx, x, y, w, h) {
      ctx.fillStyle = '#263c3c40'; VM.util.roundedRect(ctx, x + 5, y + 5, w + 8, h + 8, 8); ctx.fill();
      ctx.fillStyle = '#d4cfad'; VM.util.roundedRect(ctx, x - 4, y - 4, w + 8, h + 8, 7); ctx.fill();
      const water = ctx.createLinearGradient(x, y, x + w, y + h); water.addColorStop(0, '#75c0b6'); water.addColorStop(1, '#4f999d');
      ctx.fillStyle = water; VM.util.roundedRect(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = '#c4e9d582'; ctx.lineWidth = 1;
      for (let py = y + 9; py < y + h - 6; py += 13) { ctx.beginPath(); ctx.moveTo(x + 5, py); ctx.quadraticCurveTo(x + w / 2, py - 5, x + w - 5, py + 1); ctx.stroke(); }
      ctx.fillStyle = '#e5d3a4'; ctx.fillRect(x - 18, y + 8, 8, 21); ctx.fillRect(x - 18, y + 36, 8, 21);
    }
    solarPanels(ctx, x, y, w, h) {
      ctx.fillStyle = '#24405140'; ctx.fillRect(x + 5, y + 6, w + 3, h + 2); ctx.fillStyle = '#345d74'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#94bfb775'; ctx.lineWidth = 1;
      for (let px = x; px <= x + w; px += w / 6) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke(); }
      for (let py = y; py <= y + h; py += h / 3) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke(); }
      ctx.fillStyle = '#bde1d323'; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 26, y); ctx.lineTo(x + w - 4, y + h); ctx.lineTo(x + w - 25, y + h); ctx.fill();
    }
    pergola(ctx, x, y, w, h) {
      ctx.fillStyle = '#3b4d414d'; ctx.fillRect(x + 5, y + 5, w, h); ctx.fillStyle = '#879779'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#d3b583'; for (let px = x; px < x + w; px += 7) ctx.fillRect(px, y, 3, h);
      ctx.strokeStyle = '#6c7657'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); this.pot(ctx, x + 8, y + 11); this.pot(ctx, x + w - 7, y + h - 9);
    }
    waterTank(ctx, x, y, r) {
      ctx.fillStyle = '#1937443d'; ctx.beginPath(); ctx.ellipse(x + 4, y + 8, r + 2, r - 2, .2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#739c9b'; ctx.fillRect(x - r, y - 2, r * 2, 9); ctx.fillStyle = '#b5c5b2'; ctx.beginPath(); ctx.ellipse(x, y - 3, r, r * .7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a9392'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 3, r - 3, (r - 3) * .7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    gearLogo(ctx, x, y, r, background, foreground) {
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = background; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = foreground; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, Math.PI * 2); ctx.stroke();
      for (let n = 0; n < 10; n++) { const a = n * Math.PI / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8)); ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2)); ctx.stroke(); }
      ctx.rotate(-.7); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-14, 0, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(14, 0, 8, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    }
    enrichStreets() {
      const city = this.game.city, ctx = city.ground.getContext('2d'), art = city.architecture.getContext('2d');
      for (const road of city.roads) {
        const gradient = ctx.createLinearGradient(0, road - 62, 0, road + 62);
        gradient.addColorStop(0, '#071e303e'); gradient.addColorStop(.23, '#071e3000'); gradient.addColorStop(.77, '#071e3000'); gradient.addColorStop(1, '#071e3037');
        ctx.fillStyle = gradient; ctx.fillRect(0, road - 62, 2820, 124);
        const vertical = ctx.createLinearGradient(road - 62, 0, road + 62, 0);
        vertical.addColorStop(0, '#0b213337'); vertical.addColorStop(.3, '#0b213300'); vertical.addColorStop(.8, '#0b213300'); vertical.addColorStop(1, '#0b213337');
        ctx.fillStyle = vertical; ctx.fillRect(road - 62, 0, 124, 3200);
      }
      const garage = city.landmarks.get('garage');
      this.gearLogo(ctx, 2474, 1844, 21, '#7b918265', '#d5d1aa9c');
      VM.util.label(ctx, 'ROJAS / CUSTOM & REPAIR', garage.x + garage.w + 34, garage.y + 257, 8, '#eef0c983', 800);
      art.save(); art.translate(2754, 1190);
      art.fillStyle = '#1f3e4a40'; art.fillRect(-12, -20, 31, 39); art.fillStyle = '#4d8d87'; art.fillRect(-15, -27, 24, 37);
      art.fillStyle = '#abcac081'; art.fillRect(-11, -22, 16, 24); art.fillStyle = '#173e4b'; art.fillRect(-8, -16, 9, 16);
      art.fillStyle = '#eddab0'; art.fillRect(-15, -29, 24, 4); VM.util.label(art, 'TEL', -3, -18, 5, '#f0ddac', 800, 'center'); art.restore();
      const warehouse = city.landmarks.get('warehouse');
      ctx.save(); ctx.strokeStyle = '#dcce904c'; ctx.lineWidth = 2;
      for (let x = warehouse.x + 4; x < warehouse.x + warehouse.w - 4; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, warehouse.y + warehouse.h + 15); ctx.lineTo(x + 18, warehouse.y + warehouse.h + 33); ctx.stroke();
      }
      VM.util.label(ctx, 'CARGA / KEEP CLEAR', 2390, 2589, 15, '#e1d4a055', 800, 'center');
      for (const [x, y] of [[2211, 2518], [2255, 2536], [2526, 2524], [2548, 2560]]) this.crates(art, x, y);
      ctx.restore();
      art.fillStyle = '#173b44'; art.fillRect(2721, 2784, 138, 38); art.strokeStyle = '#80cfc3'; art.lineWidth = 1; art.strokeRect(2724, 2787, 132, 32);
      VM.util.label(art, 'PUERTO VIEJO', 2790, 2802, 11, '#9bcfc1', 800, 'center'); VM.util.label(art, 'MUELLE / 08', 2790, 2815, 7, '#dccb9a', 700, 'center');
      this.neonFixtures.push({ x: 2790, y: 2802, text: 'PUERTO VIEJO', color: '#9fe8ce', size: 11 });
      for (const [x, y] of [[2180, 2450], [2586, 2433], [2790, 2780]]) this.game.city.lights.push({ x, y, radius: 130 });
      this.neonFixtures.push({ x: 2754, y: 1161, text: 'COURIER', color: '#bcaceb', size: 7 });
    }
    crates(ctx, x, y) {
      ctx.fillStyle = '#18364332'; ctx.fillRect(x - 10, y - 8, 31, 25); ctx.fillStyle = '#ae946a'; ctx.fillRect(x - 15, y - 13, 27, 24);
      ctx.strokeStyle = '#705f48'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 13, 27, 24); ctx.beginPath(); ctx.moveTo(x - 13, y - 11); ctx.lineTo(x + 10, y + 9); ctx.moveTo(x + 10, y - 11); ctx.lineTo(x - 13, y + 9); ctx.stroke();
    }
    installSoftVehicleLights() {
      const game = this.game;
      game.vehicles.drawLights = (ctx, night) => {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (const car of game.vehicles.list) {
          if (car.wrecked || car.removed || !game.city.visible(car, game.camera, 200)) continue;
          if (night > .08) {
            ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
            for (const side of [-1, 1]) {
              const gradient = ctx.createRadialGradient(36, side * 8, 0, 91, side * 8, 137);
              gradient.addColorStop(0, `rgba(248,232,181,${night * .22})`); gradient.addColorStop(.5, `rgba(220,224,177,${night * .12})`); gradient.addColorStop(1, 'rgba(207,220,178,0)');
              ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(24, side * 8); ctx.lineTo(177, side * 8 - 48);
              ctx.quadraticCurveTo(221, side * 8, 177, side * 8 + 48); ctx.closePath(); ctx.fill();
              ctx.fillStyle = '#ffebbd'; ctx.shadowColor = '#ffdf9d'; ctx.shadowBlur = 9; ctx.fillRect(car.spec.length / 2 - 3, side * 8 - 2, 3, 4); ctx.shadowBlur = 0;
            }
            ctx.restore();
          }
          if (car.type === 'police' && car.driver) {
            for (const side of [-1, 1]) {
              const x = car.x - Math.sin(car.angle) * side * 8, y = car.y + Math.cos(car.angle) * side * 8;
              const flicker = .55 + Math.sin(game.visualTime * 15 + car.id + side * Math.PI / 2) * .3;
              const color = side < 0 ? [255, 88, 123] : [88, 169, 255];
              const [r, g, b] = color, gradient = ctx.createRadialGradient(x, y, 0, x, y, 99);
              gradient.addColorStop(0, `rgba(${r},${g},${b},${flicker * .62})`); gradient.addColorStop(.23, `rgba(${r},${g},${b},${flicker * .2})`); gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
              ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, 99, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 13;
              ctx.beginPath(); ctx.arc(x, y, 3.3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
              ctx.globalAlpha = flicker * .09; ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.beginPath(); ctx.ellipse(x + 18, y + 15, 59, 13, .16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            }
          }
        }
        ctx.restore();
      };
    }
    drawLivingDetails(ctx) {
      const game = this.game, camera = game.camera, time = game.visualTime;
      for (const car of game.vehicles.list) {
        if (!car.wrecked || car.fireTimer <= 0 || !game.city.visible(car, camera)) continue;
        ctx.save(); ctx.translate(car.x, car.y);
        for (let n = 0; n < 4; n++) {
          const x = -12 + n * 8, height = 14 + Math.sin(time * 9 + n * 1.9) * 4;
          ctx.fillStyle = n % 2 ? '#f0b66b' : '#da825c'; ctx.beginPath(); ctx.moveTo(x - 7, 7); ctx.quadraticCurveTo(x - 10, -5, x + 2, -height); ctx.quadraticCurveTo(x + 1, -4, x + 8, 7); ctx.fill();
          ctx.fillStyle = '#f5df96'; ctx.beginPath(); ctx.moveTo(x - 3, 6); ctx.quadraticCurveTo(x - 3, -1, x + 1, -height * .48); ctx.lineTo(x + 4, 6); ctx.fill();
        }
        ctx.restore();
      }
      if (camera.x + game.width / camera.zoom / 2 > 2820) {
        ctx.strokeStyle = '#e7e8ca68'; ctx.lineWidth = 1.8;
        for (let n = 0; n < 4; n++) {
          const x = 2927 + (n % 2) * 117, y = 950 + n * 493 + Math.sin(time * .21 + n) * 12;
          ctx.beginPath(); ctx.moveTo(x - 7, y + 2); ctx.quadraticCurveTo(x - 3, y - 6, x, y); ctx.quadraticCurveTo(x + 4, y - 6, x + 8, y + 1); ctx.stroke();
        }
      }
      const f = game.city.fountain;
      if (game.city.visible(f, camera)) {
        ctx.strokeStyle = '#d3efdc88'; ctx.lineWidth = 1.3;
        for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.arc(f.x - 2, f.y - 3, 13 + n * 8 + Math.sin(time * 2) * 2, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (!game.player.vehicle && game.mode === 'play') {
        ctx.strokeStyle = '#b5ecd283'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 15, .3, 2.7); ctx.stroke();
      }
    }
    drawCoastalGlow(ctx, night) {
      if (night < .08) return;
      const game = this.game; ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (const neon of this.neonFixtures) {
        if (!game.city.visible(neon, game.camera)) continue;
        ctx.shadowBlur = 15; ctx.shadowColor = neon.color; ctx.globalAlpha = night;
        VM.util.label(ctx, neon.text, neon.x, neon.y, neon.size, neon.color, 800, 'center'); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      for (let y = 735; y < 2930; y += 113) {
        const point = { x: 2827, y }; if (!game.city.visible(point, game.camera, 180)) continue;
        for (let n = 0; n < 7; n++) {
          ctx.fillStyle = n % 2 ? '#a6dac026' : '#e7c79627'; const drift = Math.sin(game.visualTime * 1.5 + n + y) * 6;
          ctx.fillRect(2880 + n * 13 + drift, y + n % 3 * 4, 12 + n * 2, 1.5);
        }
      }
      for (const car of game.vehicles.list) {
        if (!car.wrecked || car.fireTimer <= 0 || !game.city.visible(car, game.camera)) continue;
        const gradient = ctx.createRadialGradient(car.x, car.y, 0, car.x, car.y, 92);
        gradient.addColorStop(0, '#f0af6280'); gradient.addColorStop(1, '#f0af6200'); ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(car.x, car.y, 92, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    footerBackdrop(ctx) {
      const game = this.game;
      if (game.mode === 'title' || game.ui.map || game.ui.menu) return;
      VM.util.panel(ctx, game.width / 2 - 387, game.height - 32, 774, 24, '#102b32c8', null, 5);
    }
    drawDrivingCombat(ctx) {
      const game = this.game;
      if (game.mode !== 'play' || game.ui.menu || game.ui.map || game.story.blocking) return;
      if (game.player.vehicle) {
        const x = game.width - 254, y = game.height - 226;
        VM.util.panel(ctx, x, y, 228, 33, '#142d34ec', '#bed5bd2f', 6);
        VM.util.label(ctx, 'LMB / DRIVE-BY', x + 13, y + 21, 9, '#bdd8bd', 800);
        VM.util.label(ctx, game.player.reloadTimer > 0 ? 'RELOADING' : `${String(game.player.ammo).padStart(2, '0')} / ${game.player.reserve}`, x + 214, y + 21, 10, '#e6ddba', 800, 'right');
      }
      if (game.police.arrest > 10) {
        VM.util.panel(ctx, game.width / 2 - 136, 107, 272, 36, '#4b343ddc', '#f4b49c55', 5);
        VM.util.label(ctx, 'ARRESTING / KEEP MOVING', game.width / 2, 125, 9, '#efc7a2', 800, 'center');
        game.hud.bar(ctx, game.width / 2 - 110, 133, 220, game.police.arrest / 100, '#efb296');
      }
    }
    refineWitnessFraming() {
      if (!this.game.staged) return;
      if (this.game.params.get('shot') === 'night') this.game.camera.snap(2475, 2530, .98);
      for (const flash of this.game.particles.flashes) flash.life *= .72;
    }
    update(dt) {
      const game = this.game;
      if (game.mode === 'play' && game.player.vehicle && !game.story.blocking && !game.player.dead) {
        if (game.input.take('KeyR')) game.combat.reload();
        if (game.input.mouse.down && game.combat.cooldown <= 0 && game.player.reloadTimer <= 0) {
          if (game.player.ammo > 0) {
            const aim = game.camera.screenToWorld(game.input.mouse.x, game.input.mouse.y);
            const angle = Math.atan2(aim.y - game.player.y, aim.x - game.player.x); game.player.angle = angle;
            game.player.ammo--; game.combat.cooldown = .25;
            game.combat.shoot(game.player.x + Math.cos(angle) * 11, game.player.y + Math.sin(angle) * 11, angle, 'sol');
          } else game.combat.reload();
        }
      }
      this.cleanupClock += dt;
      if (this.cleanupClock > 30) {
        this.cleanupClock = 0;
        if (game.vehicles.list.length > 118) game.vehicles.list = game.vehicles.list.filter(car => car.controlled || car.missionTag || car.driver || !car.wrecked || VM.util.distance(car, game.player) < 850);
      }
    }
    interface() {
      const audio = this.game.audio;
      if (audio.context && this.game.paused) {
        audio.engineGain.gain.setTargetAtTime(0, audio.context.currentTime, .1);
        audio.sirenGain.gain.setTargetAtTime(0, audio.context.currentTime, .1);
      }
    }
  }
  VM.FinalCoastalPolish = FinalCoastalPolish;
  VM.installers.push(game => { game.polish = new FinalCoastalPolish(game); game.addSystem('fixed-step, drive-by and coastal polish', game.polish, 46); });
})();
