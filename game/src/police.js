// WantedResponse: five heat tiers, street-graph pursuits, armed officers, searches, and arrest pressure.
(() => {
  const WANTED_THRESHOLDS = [0, 1, 55, 105, 170, 250];
  class PatrolOfficer {
    constructor(game, x, y) {
      this.game = game; this.x = x; this.y = y; this.angle = 0; this.health = 85; this.dead = false;
      this.radius = 9; this.cooldown = game.rng.range(.7, 1.4); this.walk = 0; this.isOfficer = true;
    }
    damage(amount, owner) {
      if (this.dead) return;
      this.health -= amount;
      if (owner === 'sol') this.game.police.raise(42, this.x, this.y, 'officer attacked');
      if (this.health <= 0) { this.dead = true; this.game.particles.blood(this.x, this.y); this.game.world.addPickup(this.x + 12, this.y, 'armor', 25); }
    }
    update(dt) {
      if (this.dead || this.game.mode !== 'play' || !this.game.police.stars) return;
      const player = this.game.player, distance = VM.util.distance(this, player);
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
      if (distance > (this.game.police.stars >= 3 ? 125 : 17)) {
        const blocked = this.game.world.moveCircle(this, Math.cos(this.angle) * dt * 106, Math.sin(this.angle) * dt * 106, this.radius);
        if (blocked) this.game.world.moveCircle(this, Math.cos(this.angle + Math.PI / 2) * dt * 75, Math.sin(this.angle + Math.PI / 2) * dt * 75, this.radius);
        this.walk += dt * 11;
      }
      this.cooldown -= dt;
      if (this.game.police.stars >= 3 && distance < 470 && this.cooldown <= 0
        && this.game.world.lineOfSight(this.x, this.y, player.x, player.y)) {
        this.cooldown = this.game.rng.range(.8, 1.4);
        this.game.combat.shoot(this.x, this.y, this.angle + this.game.rng.range(-.06, .06), 'police');
      }
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.dead ? this.angle + .8 : this.angle);
      ctx.fillStyle = '#1024315e'; ctx.beginPath(); ctx.ellipse(2, 5, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (this.dead) { ctx.fillStyle = '#496279'; VM.util.roundedRect(ctx, -12, -5, 25, 10, 3); ctx.fill(); ctx.restore(); return; }
      ctx.fillStyle = '#283a4a'; ctx.fillRect(-4 + Math.sin(this.walk) * 3, -7, 8, 4); ctx.fillRect(-4 - Math.sin(this.walk) * 3, 3, 8, 4);
      ctx.fillStyle = '#55718d'; VM.util.roundedRect(ctx, -7, -8, 15, 16, 4); ctx.fill();
      ctx.fillStyle = '#334e67'; ctx.fillRect(-5, -6, 7, 12); ctx.fillStyle = '#edcf82'; ctx.fillRect(2, -5, 3, 3);
      ctx.strokeStyle = '#c49b7d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1, 7); ctx.lineTo(12, 5); ctx.stroke();
      ctx.fillStyle = '#23313c'; ctx.fillRect(10, 3, 14, 4);
      ctx.fillStyle = '#c4a07b'; ctx.beginPath(); ctx.arc(-1, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e455e'; ctx.beginPath(); ctx.arc(-2, -.6, 5.3, Math.PI / 2, Math.PI * 1.65); ctx.fill();
      ctx.fillStyle = '#bad0d3'; ctx.fillRect(0, -4, 5, 2); ctx.restore();
    }
  }
  class WantedResponse {
    constructor(game) {
      this.game = game; this.heat = 0; this.stars = 0; this.units = []; this.officers = [];
      this.lastCrime = -100; this.lastSeen = -100; this.lastKnown = { x: 0, y: 0 };
      this.hiddenTime = 0; this.seen = false; this.arrest = 0; this.spawnClock = 0;
      game.on('crime', event => { if (game.mode === 'play') this.raise(event.severity, event.x, event.y, event.kind); });
    }
    heatLevel() { let level = 0; for (let i = 1; i < WANTED_THRESHOLDS.length; i++) if (this.heat >= WANTED_THRESHOLDS[i]) level = i; return level; }
    setStars(stars) { this.stars = VM.util.clamp(stars, 0, 5); this.heat = this.stars ? WANTED_THRESHOLDS[this.stars] + 8 : 0; this.lastCrime = this.game.time; this.hiddenTime = 0; }
    raise(severity, x, y, kind = 'crime') {
      const previous = this.stars;
      this.heat = VM.util.clamp(this.heat + severity, 0, 320); this.stars = this.heatLevel();
      this.lastCrime = this.game.time; this.lastKnown = { x, y }; this.hiddenTime = 0;
      if (previous < this.stars) {
        this.game.notify(`${this.stars === 1 ? 'Patrol alerted' : 'Response escalated'} — ${kind}.`, '#efaa85');
        this.game.emit('wanted-changed', this.stars);
      }
      if (!this.units.length && this.stars) this.spawnUnit();
    }
    nearestNode(position) {
      const roads = this.game.city.roads;
      return { ix: roads.reduce((best, r, i) => Math.abs(r - position.x) < Math.abs(roads[best] - position.x) ? i : best, 0),
        iy: roads.reduce((best, r, i) => Math.abs(r - position.y) < Math.abs(roads[best] - position.y) ? i : best, 0) };
    }
    buildRoute(fromPosition, toPosition) {
      const from = this.nearestNode(fromPosition), to = this.nearestNode(toPosition);
      const path = [{ ...from }]; let node = { ...from };
      for (let n = 0; n < 10 && (node.ix !== to.ix || node.iy !== to.iy); n++) {
        const dx = to.ix - node.ix, dy = to.iy - node.iy;
        if (Math.abs(dx) >= Math.abs(dy) && dx) node.ix += Math.sign(dx); else if (dy) node.iy += Math.sign(dy);
        path.push({ ...node });
      }
      const roads = this.game.city.roads;
      return path.map((point, i) => {
        const previous = path[Math.max(0, i - 1)], dx = Math.sign(point.ix - previous.ix), dy = Math.sign(point.iy - previous.iy);
        return { x: roads[point.ix] - dy * 28, y: roads[point.iy] + dx * 28 };
      });
    }
    spawnUnit(x = null, y = null, angle = null) {
      const player = this.game.player, roads = this.game.city.roads;
      if (x === null) {
        const road = roads.reduce((best, r) => Math.abs(r - player.y) < Math.abs(best - player.y) ? r : best, roads[0]);
        x = VM.util.clamp(player.x + (this.units.length % 2 ? 610 : -610), 190, 2750); y = road + 30;
        angle = x < player.x ? 0 : Math.PI;
      }
      const open = this.game.world.nearestOpen(x, y, 18), car = this.game.vehicles.add('police', open.x, open.y, angle || 0);
      car.driver = 'police'; car.ai = true; car.speed = 75; car.desiredSpeed = 150;
      car.chasePath = []; car.repath = 0; car.disembarked = false; this.units.push(car); return car;
    }
    spawnOfficer(x, y) { const point = this.game.world.nearestOpen(x, y, 9); const officer = new PatrolOfficer(this.game, point.x, point.y); this.officers.push(officer); return officer; }
    clear() {
      for (const unit of this.units) { if (!unit.controlled) { unit.ai = false; unit.driver = null; unit.desiredSpeed = 0; } }
      for (const officer of this.officers) officer.removed = true;
      this.units = []; this.officers = []; this.heat = 0; this.stars = 0; this.arrest = 0; this.hiddenTime = 0; this.seen = false;
    }
    update(dt) {
      if (this.game.mode !== 'play' || this.game.player.dead) return;
      const player = this.game.player; this.spawnClock += dt; this.seen = false;
      this.units = this.units.filter(unit => !unit.wrecked && !unit.controlled);
      if (!this.stars) { this.arrest = Math.max(0, this.arrest - dt * 25); return; }
      const desiredCount = [0, 1, 2, 3, 4, 6][this.stars];
      if (this.units.length < desiredCount && this.spawnClock > 2.3) { this.spawnClock = 0; this.spawnUnit(); }
      for (const unit of this.units) {
        const distance = VM.util.distance(unit, player);
        const visible = distance < 590 && this.game.world.lineOfSight(unit.x, unit.y, player.x, player.y);
        if (visible) this.seen = true;
        unit.repath -= dt;
        if (unit.repath <= 0) { unit.repath = 2; unit.chasePath = this.buildRoute(unit, this.seen ? player : this.lastKnown); }
        while (unit.chasePath.length && VM.util.distance(unit, unit.chasePath[0]) < 83) unit.chasePath.shift();
        const target = visible && distance < 300 ? player : unit.chasePath[0] || this.lastKnown;
        unit.desiredAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
        const turn = Math.abs(VM.util.angleDelta(unit.angle, unit.desiredAngle));
        unit.desiredSpeed = (this.stars >= 3 ? 268 : 218) * VM.util.clamp(1 - turn * .34, .35, 1);
        if (distance < 40 && !player.vehicle) { unit.desiredSpeed = 0; this.arrest += dt * 45; }
        if (this.stars >= 3 && distance < 235 && !unit.disembarked && Math.abs(unit.speed) < 180) {
          unit.disembarked = true;
          this.spawnOfficer(unit.x - Math.sin(unit.angle) * 37, unit.y + Math.cos(unit.angle) * 37);
          if (this.stars >= 4) this.spawnOfficer(unit.x + Math.sin(unit.angle) * 37, unit.y - Math.cos(unit.angle) * 37);
        }
      }
      for (const officer of this.officers) {
        officer.update(dt);
        if (!officer.dead && VM.util.distance(officer, player) < 420 && this.game.world.lineOfSight(officer.x, officer.y, player.x, player.y)) this.seen = true;
        if (!officer.dead && !player.vehicle && VM.util.distance(officer, player) < 25) this.arrest += dt * 70;
      }
      if (this.seen) { this.lastSeen = this.game.time; this.lastKnown = { x: player.x, y: player.y }; this.hiddenTime = 0; }
      else if (this.game.time - this.lastCrime > 7) this.hiddenTime += dt;
      this.arrest = Math.max(0, this.arrest - dt * 13);
      if (this.hiddenTime > 8) {
        this.heat = Math.max(0, this.heat - dt * 3.6); const previous = this.stars; this.stars = this.heatLevel();
        if (previous !== this.stars) this.game.emit('wanted-changed', this.stars);
        if (!this.stars) {
          this.clear(); this.game.stats.escapes++; this.game.notify('You lost the patrol. Keep it quiet.');
          this.game.audio.play('pickup'); this.game.emit('police-escaped');
        }
      }
      if (this.arrest >= 100) { this.game.player.dead = true; this.game.emit('player-down', 'BUSTED'); }
    }
  }
  VM.PatrolOfficer = PatrolOfficer; VM.WantedResponse = WantedResponse;
  VM.installers.push(game => { game.police = new WantedResponse(game); game.addSystem('wanted and police response', game.police, 25); });
})();
