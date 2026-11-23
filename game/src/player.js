// Vista Mar: Low Tide — SolVega: courier protagonist with responsive walking, sprinting, pistol aiming, and armor.
(() => {
  class SolVega {
    constructor(game) {
      this.game = game; this.x = VM.CONFIG.safehouse.x; this.y = VM.CONFIG.safehouse.y;
      this.vx = 0; this.vy = 0; this.angle = -.8; this.health = 100; this.armor = 40;
      this.radius = 11; this.vehicle = null; this.stamina = 100; this.invulnerable = 0;
      this.walkPhase = 0; this.punchTimer = 0; this.recoil = 0; this.dead = false;
      this.ammo = 12; this.reserve = 96; this.reloadTimer = 0;
    }
    update(dt) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.punchTimer = Math.max(0, this.punchTimer - dt); this.recoil = Math.max(0, this.recoil - dt * 12);
      if (this.game.mode !== 'play' || this.dead || this.game.story?.blocking) return;
      const input = this.game.input;
      if (input.take('KeyF')) this.game.vehicles?.interact();
      if (this.vehicle) { this.x = this.vehicle.x; this.y = this.vehicle.y; this.vx = this.vehicle.vx; this.vy = this.vehicle.vy; return; }
      let ax = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      let ay = input.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
      const magnitude = Math.hypot(ax, ay);
      if (magnitude) { ax /= magnitude; ay /= magnitude; }
      const sprint = input.held('ShiftLeft', 'ShiftRight') && this.stamina > 1 && magnitude > 0;
      const speed = sprint ? 238 : 148;
      this.stamina = VM.util.clamp(this.stamina + dt * (sprint ? -22 : 20), 0, 100);
      this.vx = VM.util.lerp(this.vx, ax * speed, 1 - Math.exp(-dt * 18));
      this.vy = VM.util.lerp(this.vy, ay * speed, 1 - Math.exp(-dt * 18));
      const before = { x: this.x, y: this.y };
      this.game.world.moveCircle(this, this.vx * dt, this.vy * dt, this.radius);
      this.game.stats.distance += VM.util.distance(before, this);
      this.walkPhase += Math.hypot(this.vx, this.vy) * dt * .073;
      const aim = this.game.camera.screenToWorld(input.mouse.x, input.mouse.y);
      this.angle = Math.atan2(aim.y - this.y, aim.x - this.x);
    }
    interface() {
      if (!this.game.ui && this.game.mode === 'title' && (this.game.input.take('Enter') || this.game.input.take('Space'))) {
        this.game.mode = 'play'; this.game.camera.snap(this.x, this.y, 1.1);
      }
    }
    damage(amount, source = 'impact') {
      if (this.invulnerable > 0 || this.dead || this.game.mode !== 'play') return;
      const absorb = Math.min(this.armor, amount * .65);
      this.armor -= absorb; this.health -= amount - absorb; this.invulnerable = .28;
      this.game.camera.shake(Math.min(6, amount / 7));
      this.game.audio?.play('hurt'); this.game.emit('player-damaged', { amount, source });
      if (this.health <= 0) { this.health = 0; this.dead = true; this.game.emit('player-down', 'WASTED'); }
    }
    respawn() {
      if (this.vehicle) { this.vehicle.driver = null; this.vehicle.ai = false; this.vehicle = null; }
      this.x = VM.CONFIG.safehouse.x; this.y = VM.CONFIG.safehouse.y;
      this.vx = 0; this.vy = 0; this.health = 100; this.armor = 20;
      this.invulnerable = 3; this.dead = false; this.ammo = 12; this.reserve = Math.max(48, this.reserve);
      this.game.camera.snap(this.x, this.y, 1.1);
    }
    draw(ctx) {
      if (this.vehicle) return;
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.fillStyle = '#0a1b275c'; ctx.beginPath(); ctx.ellipse(3, 5, 12, 8, .2, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(this.angle);
      if (this.invulnerable > 0 && Math.sin(this.game.visualTime * 35) > .7) ctx.globalAlpha = .55;
      const walking = Math.hypot(this.vx, this.vy) > 10;
      const step = walking ? Math.sin(this.walkPhase) * 4 : 0;
      ctx.fillStyle = '#21313c'; VM.util.roundedRect(ctx, -5 + step, -8, 9, 5, 2); ctx.fill();
      VM.util.roundedRect(ctx, -5 - step, 3, 9, 5, 2); ctx.fill();
      ctx.fillStyle = '#67b9a8'; VM.util.roundedRect(ctx, -7, -8, 14, 16, 5); ctx.fill();
      ctx.fillStyle = '#95e0c9'; ctx.fillRect(-4, -6, 6, 12);
      ctx.fillStyle = '#ee987e'; ctx.fillRect(0, -5, 4, 10);
      ctx.strokeStyle = '#c99d77'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(10, -4); ctx.moveTo(1, 7); ctx.lineTo(this.punchTimer > 0 ? 20 : 12 - this.recoil, 6); ctx.stroke();
      if (this.punchTimer <= 0) { ctx.fillStyle = '#26313a'; ctx.fillRect(11 - this.recoil, 3, 12, 4); ctx.fillStyle = '#aab8ab'; ctx.fillRect(14 - this.recoil, 3, 8, 1); }
      ctx.fillStyle = '#d2a47c'; ctx.beginPath(); ctx.arc(-1, 0, 6.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#243437'; ctx.beginPath(); ctx.arc(-3, -.5, 5.8, Math.PI / 2, Math.PI * 1.65); ctx.fill();
      ctx.fillStyle = '#eedbb5'; ctx.beginPath(); ctx.arc(1, 4.8, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  VM.SolVega = SolVega;
  VM.installers.push(game => { game.player = new SolVega(game); game.addSystem('Sol Vega on foot', game.player, 20); });
})();
