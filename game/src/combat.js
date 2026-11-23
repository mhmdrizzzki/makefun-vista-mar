// PistolCombat: swept bullets, reloads, melee, shootable vehicles, and original harbor security gunmen.
(() => {
  class HarborGunman {
    constructor(game, x, y, name = 'Vela Security') {
      this.game = game; this.x = x; this.y = y; this.home = { x, y }; this.name = name;
      this.angle = 0; this.health = 65; this.maxHealth = 65; this.dead = false; this.radius = 9;
      this.cooldown = game.rng.range(.6, 1.6); this.walk = 0; this.isHostile = true; this.alert = false;
    }
    damage(amount, attacker) {
      if (this.dead) return; this.health -= amount; this.alert = true;
      if (this.health <= 0) { this.dead = true; this.game.particles.blood(this.x, this.y); this.game.emit('enemy-defeated', this); this.game.world.addPickup(this.x + 12, this.y + 6, 'cash', 85); }
    }
    update(dt) {
      if (this.dead || this.game.mode !== 'play' || this.game.story?.blocking) return;
      const player = this.game.player, distance = VM.util.distance(this, player);
      if (distance < 420) this.alert = true;
      if (!this.alert) return;
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
      const visible = this.game.world.lineOfSight(this.x, this.y, player.x, player.y);
      if (distance > 140 && VM.util.distance(this, this.home) < 240) {
        this.game.world.moveCircle(this, Math.cos(this.angle) * dt * 62, Math.sin(this.angle) * dt * 62, this.radius); this.walk += dt * 8;
      }
      this.cooldown -= dt;
      if (visible && distance < 440 && this.cooldown <= 0) {
        this.cooldown = this.game.rng.range(1.1, 1.7); this.game.combat.shoot(this.x, this.y, this.angle + this.game.rng.range(-.09, .09), 'hostile');
      }
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.dead ? this.angle + .5 : this.angle);
      ctx.fillStyle = '#13293950'; ctx.beginPath(); ctx.ellipse(3, 5, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (this.dead) { ctx.fillStyle = '#b89469'; VM.util.roundedRect(ctx, -12, -5, 25, 10, 4); ctx.fill(); ctx.fillStyle = '#b98f6f'; ctx.beginPath(); ctx.arc(11, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
      ctx.fillStyle = '#3b4646'; ctx.fillRect(-5 + Math.sin(this.walk) * 3, -7, 8, 4); ctx.fillRect(-5 - Math.sin(this.walk) * 3, 3, 8, 4);
      ctx.fillStyle = '#b29a72'; VM.util.roundedRect(ctx, -7, -8, 15, 16, 4); ctx.fill();
      ctx.fillStyle = '#625b4c'; ctx.fillRect(-5, -6, 9, 12); ctx.fillStyle = '#da8b75'; ctx.fillRect(-2, -8, 6, 2);
      ctx.strokeStyle = '#b99677'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1, 7); ctx.lineTo(12, 5); ctx.stroke();
      ctx.fillStyle = '#26343e'; ctx.fillRect(10, 3, 15, 4);
      ctx.fillStyle = '#b99470'; ctx.beginPath(); ctx.arc(-1, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5b5649'; ctx.beginPath(); ctx.arc(-2, 0, 5, Math.PI / 2, Math.PI * 1.6); ctx.fill(); ctx.restore();
      if (this.health < this.maxHealth) { ctx.fillStyle = '#233745'; ctx.fillRect(this.x - 14, this.y - 24, 28, 3); ctx.fillStyle = '#ec9c80'; ctx.fillRect(this.x - 14, this.y - 24, 28 * this.health / this.maxHealth, 3); }
      ctx.fillStyle = '#ef9a7d'; ctx.beginPath(); ctx.moveTo(this.x - 4, this.y - 30); ctx.lineTo(this.x + 4, this.y - 30); ctx.lineTo(this.x, this.y - 25); ctx.fill();
    }
  }
  class PistolCombat {
    constructor(game) { this.game = game; this.bullets = []; this.hostiles = []; this.cooldown = 0; this.reloadDuration = 1.2; }
    addHostile(x, y, name) { const gunman = new HarborGunman(this.game, x, y, name); this.hostiles.push(gunman); return gunman; }
    reload() {
      const player = this.game.player;
      if (player.reloadTimer > 0 || player.ammo === 12 || player.reserve <= 0) return;
      player.reloadTimer = this.reloadDuration; this.game.audio.play('reload');
    }
    shoot(x, y, angle, owner = 'sol') {
      const speed = owner === 'sol' ? 1060 : 650, muzzleX = x + Math.cos(angle) * 23, muzzleY = y + Math.sin(angle) * 23;
      this.bullets.push({ x: muzzleX, y: muzzleY, px: muzzleX, py: muzzleY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner, life: .75 });
      this.game.particles.muzzle(muzzleX, muzzleY, angle);
      if (owner === 'sol' || VM.util.distance({ x, y }, this.game.player) < 550) this.game.audio.play('shot');
      if (owner === 'sol') {
        this.game.stats.shots++; this.game.player.recoil = 3;
        this.game.emit('crime', { x, y, severity: 4, kind: 'gunfire' }); this.game.emit('noise', { x, y, radius: 360 });
      }
    }
    punch() {
      const player = this.game.player; if (player.punchTimer > 0) return;
      player.punchTimer = .24; this.game.audio.play('punch');
      const targets = [...this.game.pedestrians.list, ...this.game.police.officers, ...this.hostiles];
      for (const target of targets) {
        const angle = Math.atan2(target.y - player.y, target.x - player.x);
        if (!target.dead && VM.util.distance(target, player) < 45 && Math.abs(VM.util.angleDelta(player.angle, angle)) < 1.1) {
          target.damage(22, 'sol'); this.game.world.moveCircle(target, Math.cos(player.angle) * 9, Math.sin(player.angle) * 9, 8);
          this.game.particles.burst(target.x, target.y, '#e7b997', 6, 45);
        }
      }
    }
    update(dt) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      const player = this.game.player;
      if (player.reloadTimer > 0) {
        player.reloadTimer -= dt;
        if (player.reloadTimer <= 0) { const amount = Math.min(12 - player.ammo, player.reserve); player.ammo += amount; player.reserve -= amount; }
      }
      if (this.game.mode === 'play' && !player.dead && !this.game.story?.blocking) {
        if (!player.vehicle) {
          if (this.game.input.take('KeyR')) this.reload();
          const interact = this.game.missions?.canInteract() || this.game.activities?.canInteract();
          if (!interact && this.game.input.take('KeyE')) this.punch();
          if (this.game.input.mouse.down && this.cooldown <= 0 && player.reloadTimer <= 0) {
            if (player.ammo > 0) { player.ammo--; this.cooldown = .22; this.shoot(player.x, player.y, player.angle + this.game.rng.range(-.01, .01)); }
            else this.reload();
          }
        }
        for (const hostile of this.hostiles) hostile.update(dt);
      }
      for (const bullet of this.bullets) {
        bullet.life -= dt; bullet.px = bullet.x; bullet.py = bullet.y;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
        if (!this.game.world.lineOfSight(bullet.px, bullet.py, bullet.x, bullet.y) || this.game.world.isBlocked(bullet.x, bullet.y, 1)) {
          bullet.life = 0; this.game.particles.burst(bullet.x, bullet.y, '#c4c7aa', 4, 50); continue;
        }
        const targets = bullet.owner === 'sol'
          ? [...this.game.pedestrians.list, ...this.game.police?.officers || [], ...this.hostiles, ...this.game.vehicles.list]
          : [player.vehicle || player];
        for (const target of targets) {
          if (target.dead || target.wrecked || target.removed) continue;
          const radius = target.spec ? target.spec.length * .38 : target.radius || 9;
          if (!VM.util.segmentCircle(bullet.px, bullet.py, bullet.x, bullet.y, target.x, target.y, radius)) continue;
          const damage = target.spec ? (bullet.owner === 'sol' ? 18 : 7) : bullet.owner === 'sol' ? 32 : 11;
          target.damage(damage, bullet.owner);
          this.game.particles.burst(bullet.x, bullet.y, target.spec ? '#edc082' : '#bc7568', 6, 75);
          bullet.life = 0; this.game.emit('bullet-hit', { target, owner: bullet.owner }); break;
        }
      }
      this.bullets = this.bullets.filter(bullet => bullet.life > 0);
    }
    blast(x, y, radius, source) {
      const targets = [...this.game.pedestrians.list, ...this.hostiles, ...this.game.police?.officers || [], ...this.game.vehicles.list, this.game.player];
      for (const target of targets) {
        if (target === source || target.wrecked || target.dead) continue;
        const distance = VM.util.distance(target, { x, y });
        if (distance < radius && this.game.world.lineOfSight(x, y, target.x, target.y)) target.damage((1 - distance / radius) * 100, 'explosion');
      }
    }
    draw(ctx) {
      ctx.save(); ctx.lineCap = 'round';
      for (const bullet of this.bullets) {
        ctx.strokeStyle = bullet.owner === 'sol' ? '#fff0b6' : '#efb399'; ctx.lineWidth = bullet.owner === 'sol' ? 2 : 1.6;
        ctx.beginPath(); ctx.moveTo(bullet.x - bullet.vx * .019, bullet.y - bullet.vy * .019); ctx.lineTo(bullet.x, bullet.y); ctx.stroke();
      }
      ctx.restore();
    }
  }
  VM.HarborGunman = HarborGunman; VM.PistolCombat = PistolCombat;
  VM.installers.push(game => { game.combat = new PistolCombat(game); game.addSystem('pistol and melee combat', game.combat, 45); });
})();
