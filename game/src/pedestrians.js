// SidewalkCrowd: original civilian silhouettes, sidewalk routes, crossings, and panic propagation.
(() => {
  const CIVILIAN_CLOTHES = ['#d6a56c', '#cf8c80', '#9ebda6', '#91a3b4', '#d8c9a2', '#8fb9b6', '#bb91a5'];
  class CivilianWalker {
    constructor(game, x, y, options = {}) {
      this.game = game; this.x = x; this.y = y; this.angle = game.rng.range(0, Math.PI * 2);
      this.color = options.color || game.rng.pick(CIVILIAN_CLOTHES);
      this.skin = game.rng.pick(['#d4a278', '#c5936c', '#a67c59', '#e1b38a']);
      this.radius = 7; this.health = 45; this.dead = false; this.panic = 0; this.invulnerable = 0;
      this.speed = game.rng.range(31, 52); this.walk = game.rng.range(0, 20); this.respawnTimer = 0;
      this.axis = options.axis || (game.rng.chance(.5) ? 'h' : 'v'); this.target = null;
      this.crossing = false; this.roadIndex = options.roadIndex ?? 2;
      this.side = options.side || (game.rng.chance(.5) ? -1 : 1); this.bag = game.rng.chance(.27);
      this.retarget();
    }
    retarget() {
      const roads = this.game.city.roads;
      if (this.axis === 'h') {
        const destination = this.game.rng.pick(roads);
        this.target = { x: destination + this.side * 77, y: roads[this.roadIndex] + this.side * 77 };
      } else {
        const destination = this.game.rng.pick(roads);
        this.target = { x: roads[this.roadIndex] + this.side * 77, y: destination + this.side * 77 };
      }
      this.target = this.game.world.nearestOpen(this.target.x, this.target.y, 7);
    }
    flee(source, duration = 7) {
      if (this.dead) return;
      const angle = Math.atan2(this.y - source.y, this.x - source.x) + this.game.rng.range(-.3, .3);
      this.panic = duration; this.target = this.game.world.nearestOpen(this.x + Math.cos(angle) * 320, this.y + Math.sin(angle) * 320, 7);
    }
    damage(amount, attacker = null) {
      if (this.dead || this.invulnerable > 0) return;
      this.health -= amount; this.invulnerable = .6; this.panic = 9;
      if (attacker === 'sol') this.game.emit('crime', { x: this.x, y: this.y, severity: 29, kind: 'civilian attacked' });
      if (this.health <= 0) {
        this.dead = true; this.respawnTimer = 38;
        this.game.particles?.blood(this.x, this.y); this.game.world.addPickup(this.x + 10, this.y, 'cash', this.game.rng.int(20, 65));
      } else this.flee(this.game.player, 9);
    }
    update(dt) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      if (this.dead) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0 && VM.util.distance(this, this.game.player) > 450) { this.dead = false; this.health = 45; this.retarget(); }
        return;
      }
      this.panic = Math.max(0, this.panic - dt);
      if (!this.target) this.retarget();
      const distance = VM.util.distance(this, this.target);
      if (distance < 13) {
        if (this.panic > 0) { this.panic = 0; this.retarget(); }
        else if (this.game.rng.chance(.3)) {
          this.side *= -1; this.crossing = true; this.retarget();
        } else {
          this.crossing = false;
          if (this.game.rng.chance(.38)) {
            this.axis = this.axis === 'h' ? 'v' : 'h';
            this.roadIndex = this.game.city.roads.reduce((best, road, index) => Math.abs(road - (this.axis === 'h' ? this.y : this.x)) < Math.abs(this.game.city.roads[best] - (this.axis === 'h' ? this.y : this.x)) ? index : best, 0);
          }
          this.retarget();
        }
      }
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let speed = this.panic > 0 ? 122 : this.speed;
      if (!this.panic && this.crossing) {
        const intersection = this.game.city.intersections.reduce((best, cross) => VM.util.distance(cross, this) < VM.util.distance(best, this) ? cross : best);
        if (VM.util.distance(intersection, this) < 142 && this.game.city.signal(intersection, this.axis !== 'h') !== 'red') speed = 0;
      }
      const stuck = this.game.world.moveCircle(this, Math.cos(this.angle) * speed * dt, Math.sin(this.angle) * speed * dt, 7);
      if (stuck && this.game.rng.chance(dt * 2)) this.retarget();
      this.walk += speed * dt * .12;
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.fillStyle = '#11243240'; ctx.beginPath(); ctx.ellipse(2, 4, 9, 5, .2, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(this.dead ? this.angle + .7 : this.angle);
      if (this.dead) {
        ctx.fillStyle = '#8b5c5650'; ctx.beginPath(); ctx.ellipse(1, 1, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.color; VM.util.roundedRect(ctx, -10, -4, 20, 8, 3); ctx.fill(); ctx.fillStyle = this.skin; ctx.beginPath(); ctx.arc(9, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return;
      }
      const step = Math.sin(this.walk) * 2.8;
      ctx.fillStyle = '#344247'; ctx.fillRect(-4 + step, -6, 6, 4); ctx.fillRect(-4 - step, 2, 6, 4);
      ctx.strokeStyle = this.skin; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(this.panic ? 6 : 2 + step, -9); ctx.moveTo(-1, 5); ctx.lineTo(this.panic ? 6 : 2 - step, 9); ctx.stroke();
      ctx.fillStyle = this.color; VM.util.roundedRect(ctx, -5, -6, 11, 12, 4); ctx.fill();
      ctx.fillStyle = this.skin; ctx.beginPath(); ctx.arc(0, 0, 4.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d3e34'; ctx.beginPath(); ctx.arc(-1.4, -.4, 3.8, Math.PI / 2, Math.PI * 1.6); ctx.fill();
      if (this.bag) { ctx.fillStyle = '#c4b18d'; ctx.fillRect(-3, 7, 6, 5); }
      ctx.restore();
      if (this.panic > 4) VM.util.label(ctx, '!', this.x, this.y - 20, 11, '#f7cc87', 900, 'center');
    }
  }
  class SidewalkCrowd {
    constructor(game) {
      this.game = game; this.list = [];
      for (let n = 0; n < VM.CONFIG.pedestrianCount; n++) {
        const axis = game.rng.chance(.5) ? 'h' : 'v', roadIndex = game.rng.int(0, 4), side = game.rng.chance(.5) ? -1 : 1;
        const p = game.rng.range(120, 2770), road = game.city.roads[roadIndex];
        const x = axis === 'h' ? p : road + side * 77, y = axis === 'h' ? road + side * 77 : p;
        if (!game.world.isBlocked(x, y, 7)) this.add(x, y, { axis, roadIndex, side });
      }
      game.on('panic', event => this.panic(event)); game.on('crime', event => this.panic({ ...event, radius: 230 }));
      game.on('noise', event => this.panic(event));
    }
    add(x, y, options = {}) { const civilian = new CivilianWalker(this.game, x, y, options); this.list.push(civilian); return civilian; }
    spawnFleeing(x, y, angle) { const person = this.add(x, y); person.flee({ x: x - Math.cos(angle) * 30, y: y - Math.sin(angle) * 30 }, 9); return person; }
    panic(event) { for (const person of this.list) if (VM.util.distance(person, event) < (event.radius || 260)) person.flee(event); }
    update(dt) { for (const person of this.list) person.update(dt); }
  }
  VM.CivilianWalker = CivilianWalker; VM.SidewalkCrowd = SidewalkCrowd;
  VM.installers.push(game => { game.pedestrians = new SidewalkCrowd(game); game.addSystem('sidewalk pedestrians', game.pedestrians, 40); });
})();
