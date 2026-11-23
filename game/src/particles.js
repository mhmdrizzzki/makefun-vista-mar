// Vista Mar: Low Tide — StreetParticles: bounded sparks, muzzle flashes, smoke, blast rings, and impact decals.
(() => {
  class StreetParticles {
    constructor(game) { this.game = game; this.list = []; this.decals = []; this.flashes = []; }
    add(particle) {
      if (this.list.length >= VM.CONFIG.maxParticles) this.list.shift();
      this.list.push({ vx: 0, vy: 0, life: .7, maxLife: .7, size: 2, growth: 0, drag: 2, color: '#f7d88b', kind: 'spark', ...particle });
    }
    burst(x, y, color = '#f4c779', count = 14, speed = 100) {
      for (let n = 0; n < count; n++) {
        const angle = this.game.rng.range(0, Math.PI * 2), velocity = this.game.rng.range(speed * .25, speed);
        const life = this.game.rng.range(.22, .75);
        this.add({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
          life, maxLife: life, size: this.game.rng.range(1, 3), color });
      }
    }
    smoke(x, y, color = '#b1b5ac', size = 10) {
      const life = this.game.rng.range(.8, 1.7);
      this.add({ x, y, vx: this.game.rng.range(-12, 12), vy: this.game.rng.range(-24, -10),
        life, maxLife: life, size, growth: 13, color, kind: 'smoke', drag: .2 });
    }
    exhaust(x, y) { this.add({ x, y, vx: -4, vy: -9, life: .6, maxLife: .6, size: 3, growth: 10, color: '#bec7b9', kind: 'smoke', drag: .3 }); }
    muzzle(x, y, angle) {
      this.add({ x, y, angle, life: .075, maxLife: .075, size: 14, color: '#ffdda0', kind: 'muzzle' });
      this.flashes.push({ x, y, life: .09, maxLife: .09, radius: 65, color: [255, 202, 105] });
      this.burst(x, y, '#ead79f', 3, 75);
    }
    blood(x, y) {
      this.burst(x, y, '#ad625c', 10, 65);
      for (let n = 0; n < 5; n++) this.decals.push({ x: x + this.game.rng.range(-13, 13), y: y + this.game.rng.range(-9, 9), size: this.game.rng.range(3, 9), color: '#8a464946', life: 55 });
      if (this.decals.length > 200) this.decals.splice(0, this.decals.length - 200);
    }
    explosion(x, y) {
      this.burst(x, y, '#f3b55d', 42, 270); this.burst(x, y, '#e5e4bc', 17, 170);
      this.add({ x, y, size: 8, growth: 300, life: .45, maxLife: .45, color: '#ffbc6b', kind: 'ring' });
      this.flashes.push({ x, y, radius: 200, life: .65, maxLife: .65, color: [255, 145, 68] });
      for (let n = 0; n < 13; n++) this.smoke(x + this.game.rng.range(-25, 25), y + this.game.rng.range(-20, 20), '#68706b', this.game.rng.range(10, 24));
      this.decals.push({ x, y, size: 35, color: '#28394165', life: 100 });
      this.game.emit('panic', { x, y, radius: 460 });
    }
    update(dt) {
      for (const particle of this.list) {
        particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt;
        particle.vx *= Math.exp(-dt * particle.drag); particle.vy *= Math.exp(-dt * particle.drag);
        particle.size += particle.growth * dt;
      }
      this.list = this.list.filter(particle => particle.life > 0);
      for (const decal of this.decals) decal.life -= dt;
      this.decals = this.decals.filter(decal => decal.life > 0);
      for (const flash of this.flashes) flash.life -= dt;
      this.flashes = this.flashes.filter(flash => flash.life > 0);
    }
    drawGround(ctx) {
      ctx.save();
      for (const decal of this.decals) {
        ctx.globalAlpha = Math.min(1, decal.life / 10); ctx.fillStyle = decal.color;
        ctx.beginPath(); ctx.ellipse(decal.x, decal.y, decal.size, decal.size * .61, .3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    drawAbove(ctx) {
      ctx.save();
      for (const p of this.list) {
        if (!this.game.city.visible(p, this.game.camera, 120)) continue;
        const alpha = VM.util.clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = p.kind === 'smoke' ? alpha * .25 : alpha; ctx.fillStyle = p.color;
        if (p.kind === 'muzzle') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
          ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(8, -8); ctx.lineTo(4, -2); ctx.lineTo(18, 0); ctx.lineTo(5, 3); ctx.lineTo(9, 7); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); ctx.restore();
        } else if (p.kind === 'ring') {
          ctx.strokeStyle = p.color; ctx.lineWidth = 4 * alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === 'smoke') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      }
      ctx.restore();
    }
    drawLights(ctx) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (const flash of this.flashes) {
        const a = flash.life / flash.maxLife, [r, g, b] = flash.color;
        const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${a * .7})`); gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  VM.StreetParticles = StreetParticles;
  VM.installers.push(game => { game.particles = new StreetParticles(game); game.addSystem('particles and impact decals', game.particles, 80); });
})();
