// WorldGeometry: solid footprints, visibility, restorative pickups, and a welcoming safehouse.
(() => {
  class WorldGeometry {
    constructor(game) {
      this.game = game; this.city = game.city; this.pickups = []; this.safeTimer = 0;
      const positions = [
        [800, 2372, 'health'], [2376, 1525, 'armor'], [1542, 1852, 'cash'],
        [972, 1294, 'cash'], [2753, 1215, 'health'], [2166, 2480, 'armor'],
        [1825, 815, 'cash'], [467, 1560, 'health'], [1321, 2747, 'cash'],
      ];
      for (const [x, y, type] of positions) this.pickups.push({ x, y, type, active: true, respawn: 0 });
    }
    isBlocked(x, y, radius = 10) {
      if (x < radius + 12 || y < radius + 12 || y > 3155 - radius) return true;
      if (x > 2814 - radius && !(y > 2635 && y < 2727 && x < 3030)) return true;
      return this.city.buildings.some(building => VM.util.circleRect(x, y, radius, building));
    }
    moveCircle(actor, dx, dy, radius = 10) {
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(5, radius)));
      let hit = false;
      for (let n = 0; n < steps; n++) {
        if (!this.isBlocked(actor.x + dx / steps, actor.y, radius)) actor.x += dx / steps; else hit = true;
        if (!this.isBlocked(actor.x, actor.y + dy / steps, radius)) actor.y += dy / steps; else hit = true;
      }
      return hit;
    }
    lineOfSight(ax, ay, bx, by) {
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 20);
      for (let n = 1; n < steps; n++) if (this.isBlocked(VM.util.lerp(ax, bx, n / steps), VM.util.lerp(ay, by, n / steps), 1)) return false;
      return true;
    }
    nearestOpen(x, y, radius = 11) {
      if (!this.isBlocked(x, y, radius)) return { x, y };
      for (let ring = 1; ring < 25; ring++) {
        for (let n = 0; n < 16; n++) {
          const a = n * Math.PI / 8, px = x + Math.cos(a) * ring * 14, py = y + Math.sin(a) * ring * 14;
          if (!this.isBlocked(px, py, radius)) return { x: px, y: py };
        }
      }
      return { x: VM.CONFIG.safehouse.x, y: VM.CONFIG.safehouse.y };
    }
    addPickup(x, y, type = 'cash', amount = 60) { this.pickups.push({ x, y, type, amount, active: true, respawn: -1 }); }
    update(dt) {
      const player = this.game.player;
      if (this.game.mode !== 'play' || !player) return;
      for (const pickup of this.pickups) {
        if (!pickup.active) {
          if (pickup.respawn > 0) { pickup.respawn -= dt; if (pickup.respawn <= 0) pickup.active = true; }
          continue;
        }
        if (VM.util.distance(player, pickup) > (player.vehicle ? 29 : 22)) continue;
        if (pickup.type === 'health') player.health = Math.min(100, player.health + 45);
        if (pickup.type === 'armor') player.armor = Math.min(100, player.armor + 40);
        if (pickup.type === 'cash') this.game.cash += pickup.amount || 75;
        pickup.active = false; pickup.respawn = pickup.respawn === -1 ? -1 : 90;
        this.game.audio?.play('pickup'); this.game.particles?.burst(pickup.x, pickup.y, '#9ef1c9', 12, 60);
        this.game.notify(pickup.type === 'cash' ? `Found $${pickup.amount || 75}` : `${pickup.type.toUpperCase()} restored`);
      }
      const nearHome = VM.util.distance(player, VM.CONFIG.safehouse) < 66;
      if (nearHome && !this.game.police?.stars) {
        player.health = Math.min(100, player.health + dt * 15);
        if (player.health < 100) this.safeTimer += dt;
      } else this.safeTimer = 0;
    }
    draw(ctx) {
      const time = this.game.visualTime;
      for (const pickup of this.pickups) {
        if (!pickup.active || !this.city.visible(pickup, this.game.camera)) continue;
        const color = pickup.type === 'health' ? '#e9a38c' : pickup.type === 'armor' ? '#89bfde' : '#efd78a';
        ctx.save(); ctx.translate(pickup.x, pickup.y);
        ctx.fillStyle = '#102c3455'; ctx.beginPath(); ctx.ellipse(0, 4, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(0, Math.sin(time * 3 + pickup.x) * 2 - 3);
        ctx.fillStyle = color; ctx.strokeStyle = '#e9f5d8'; ctx.lineWidth = 1.3;
        VM.util.roundedRect(ctx, -8, -8, 16, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#244044';
        if (pickup.type === 'health') { ctx.fillRect(-5, -2, 10, 4); ctx.fillRect(-2, -5, 4, 10); }
        else if (pickup.type === 'armor') { ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(4, 3); ctx.lineTo(0, 6); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill(); }
        else VM.util.label(ctx, '$', 0, 5, 13, '#244044', 900, 'center');
        ctx.restore();
      }
      const home = VM.CONFIG.safehouse;
      ctx.strokeStyle = '#96d9b16b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(home.x, home.y, 28, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#97d4aa'; ctx.beginPath(); ctx.moveTo(home.x - 8, home.y - 3); ctx.lineTo(home.x, home.y - 10); ctx.lineTo(home.x + 8, home.y - 3);
      ctx.lineTo(home.x + 6, home.y + 8); ctx.lineTo(home.x - 6, home.y + 8); ctx.fill();
    }
  }
  VM.WorldGeometry = WorldGeometry;
  VM.installers.push(game => {
    game.world = new WorldGeometry(game); game.addSystem('world geometry and pickups', game.world, 70);
    game.worldDraw.push(ctx => game.world.draw(ctx));
  });
})();
