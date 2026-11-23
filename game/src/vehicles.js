// ArcadeVehicle and VehicleFleet: six original chassis, carjacking, inertia, damage, and night lighting.
(() => {
  const VEHICLE_COLORS = ['#d58069', '#85b6a6', '#dfcc8d', '#92a6ba', '#b7bec0', '#a18b9e', '#536b70', '#e7d5b3'];
  let nextVehicleId = 1;
  class ArcadeVehicle {
    constructor(game, type, x, y, angle = 0, color = null) {
      this.game = game; this.type = type; this.spec = VM.CONFIG.vehicles[type];
      this.id = nextVehicleId++; this.x = x; this.y = y; this.angle = angle;
      this.color = color || (type === 'taxi' ? '#e7be66' : type === 'police' ? '#e1e5d8' : game.rng.pick(VEHICLE_COLORS));
      this.vx = 0; this.vy = 0; this.speed = 0; this.hp = this.spec.hp;
      this.ai = false; this.driver = null; this.desiredSpeed = 0; this.desiredAngle = angle;
      this.cruiseSpeed = game.rng.range(87, 142); this.braking = false;
      this.panic = 0; this.collisionCooldown = 0; this.exhaustTimer = 0; this.skidTimer = 0;
      this.wrecked = false; this.fireTimer = 0; this.missionTag = null;
      this.plate = `VM ${String(110 + this.id * 17).slice(-3)}`;
    }
    get controlled() { return this.game.player?.vehicle === this; }
    update(dt) {
      this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
      this.panic = Math.max(0, this.panic - dt);
      if (this.wrecked) {
        if (this.fireTimer > 0) {
          this.fireTimer -= dt;
          if (this.game.rng.chance(dt * 13)) this.game.particles?.smoke(this.x + 12, this.y, '#596565', 18);
        }
        return;
      }
      const input = this.game.input; let handbrake = false;
      if (this.controlled && this.game.mode === 'play' && !this.game.story?.blocking) {
        const throttle = input.held('KeyW', 'ArrowUp'), brake = input.held('KeyS', 'ArrowDown');
        this.braking = brake && this.speed > 25; handbrake = input.held('Space');
        if (throttle) this.speed += this.spec.accel * dt;
        if (brake) this.speed -= (this.speed > 14 ? 280 : this.spec.accel * .62) * dt;
        if (!throttle && !brake) this.speed *= Math.exp(-dt * .42);
        if (handbrake) this.speed *= Math.exp(-dt * 1.55);
        this.speed = VM.util.clamp(this.speed, -this.spec.maxSpeed * .4, this.spec.maxSpeed);
        const steer = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
        this.angle += steer * this.spec.steer * dt * VM.util.clamp(Math.abs(this.speed) / 80, 0, 1)
          * Math.sign(this.speed || 1) * (handbrake ? 1.16 : .74);
        if (input.take('KeyH')) { this.game.audio?.play('horn'); this.game.emit('noise', { x: this.x, y: this.y, radius: 90 }); }
      } else if (this.ai) {
        this.angle += VM.util.angleDelta(this.angle, this.desiredAngle) * Math.min(1, dt * (this.type === 'police' ? 4.9 : 4));
        this.braking = this.desiredSpeed < this.speed - 18;
        this.speed = VM.util.lerp(this.speed, this.desiredSpeed, 1 - Math.exp(-dt * (this.braking ? 6 : 2.2)));
      } else { this.speed *= Math.exp(-dt * 1.6); this.braking = false; }
      const grip = handbrake ? 2.2 : this.type === 'sports' ? 7.5 : 9;
      this.vx = VM.util.lerp(this.vx, Math.cos(this.angle) * this.speed, 1 - Math.exp(-grip * dt));
      this.vy = VM.util.lerp(this.vy, Math.sin(this.angle) * this.speed, 1 - Math.exp(-grip * dt));
      const before = { x: this.x, y: this.y }, impactSpeed = Math.hypot(this.vx, this.vy);
      const hitWall = this.game.world.moveCircle(this, this.vx * dt, this.vy * dt, this.spec.width * .6);
      if (hitWall && impactSpeed > 30 && this.collisionCooldown <= 0) {
        this.speed *= -.2; this.vx *= -.15; this.vy *= -.15; this.collisionCooldown = .55;
        this.damage(Math.max(3, impactSpeed * .11)); this.game.audio?.play('crash');
        this.game.particles?.burst(this.x + Math.cos(this.angle) * 24, this.y + Math.sin(this.angle) * 24, '#f6cf82', 13, 95);
        if (this.controlled) { this.game.camera.shake(impactSpeed / 30); if (impactSpeed > 165) this.game.player.damage(impactSpeed * .05, 'crash'); }
        if (this.ai) this.game.traffic?.recover(this);
      }
      if (this.controlled) {
        this.game.player.x = this.x; this.game.player.y = this.y;
        this.game.player.vx = this.vx; this.game.player.vy = this.vy;
        this.game.stats.distance += VM.util.distance(before, this);
        this.game.audio?.setEngine(Math.abs(this.speed) / this.spec.maxSpeed, throttleActive(input));
      }
      this.exhaustTimer -= dt; this.skidTimer -= dt;
      if (Math.abs(this.speed) > 30 && this.exhaustTimer <= 0) {
        this.exhaustTimer = .16;
        this.game.particles?.exhaust(this.x - Math.cos(this.angle) * this.spec.length / 2, this.y - Math.sin(this.angle) * this.spec.length / 2);
      }
      const slip = Math.abs(this.vx * Math.sin(this.angle) - this.vy * Math.cos(this.angle));
      if (this.skidTimer <= 0 && Math.abs(this.speed) > 88 && (handbrake || slip > 47)) {
        this.skidTimer = .035; this.game.vehicles.addSkid(this, before);
        if (this.controlled) this.game.audio?.tires(Math.min(1, slip / 130));
        this.game.particles?.smoke(this.x, this.y, '#c7c5b8', 7);
      }
      if (this.hp < this.spec.hp * .3 && this.game.rng.chance(dt * 6)) this.game.particles?.smoke(this.x + Math.cos(this.angle) * 15, this.y + Math.sin(this.angle) * 15, '#546069', 12);
    }
    damage(amount, attacker = null) {
      if (this.wrecked) return;
      this.hp -= amount; this.panic = 8;
      if (attacker === 'sol' && this.driver === 'police') this.game.emit('crime', { x: this.x, y: this.y, severity: 36, kind: 'patrol hit' });
      if (this.hp <= 0) this.destroy(attacker);
    }
    destroy(attacker = null) {
      if (this.wrecked) return;
      const wasControlled = this.controlled;
      this.wrecked = true; this.hp = 0; this.speed = 0; this.vx = 0; this.vy = 0; this.ai = false; this.fireTimer = 35;
      this.game.particles?.explosion(this.x, this.y); this.game.audio?.play('explosion');
      this.game.camera.shake(VM.util.distance(this, this.game.player) < 500 ? 12 : 3);
      if (wasControlled) { this.game.vehicles.exit(true); this.game.player.damage(65, 'burning vehicle'); }
      this.game.stats.wrecks++; this.game.emit('vehicle-destroyed', { vehicle: this, attacker });
      this.game.combat?.blast(this.x, this.y, 100, this);
    }
    draw(ctx) {
      const length = this.spec.length, width = this.spec.width;
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
      ctx.fillStyle = '#06182355'; VM.util.roundedRect(ctx, -length / 2 + 4, -width / 2 + 5, length + 3, width + 2, 7); ctx.fill();
      ctx.fillStyle = '#1b2b31';
      for (const xx of [-length * .3, length * .28]) {
        ctx.fillRect(xx - 5, -width / 2 - 2, 10, 5); ctx.fillRect(xx - 5, width / 2 - 3, 10, 5);
      }
      const bodyColor = this.wrecked ? '#485355' : this.color;
      ctx.fillStyle = bodyColor; VM.util.roundedRect(ctx, -length / 2, -width / 2, length, width, this.type === 'sports' ? 7 : 5); ctx.fill();
      ctx.strokeStyle = '#162b39'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = '#fff4d32e'; VM.util.roundedRect(ctx, -length / 2 + 3, -width / 2 + 2, length - 7, 3, 1); ctx.fill();
      ctx.fillStyle = '#12232d35'; ctx.fillRect(-length / 2 + 4, width / 2 - 4, length - 8, 3);
      if (this.wrecked) {
        ctx.fillStyle = '#25373b'; ctx.fillRect(-12, -7, 27, 14);
        ctx.strokeStyle = '#111f2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(8, 9); ctx.moveTo(16, -9); ctx.lineTo(-4, 7); ctx.stroke();
      } else {
        if (this.type === 'police') { ctx.fillStyle = '#2e4b60'; ctx.fillRect(-length / 2 + 2, -width / 2 + 1, 15, width - 2); ctx.fillRect(length / 2 - 16, -width / 2 + 1, 14, width - 2); }
        if (this.type === 'truck') { ctx.fillStyle = '#596b69'; ctx.fillRect(-length / 2 + 4, -width / 2 + 3, length * .49, width - 6); ctx.strokeStyle = '#a4b0a1'; for (let n = 0; n < 5; n++) { ctx.beginPath(); ctx.moveTo(-length / 2 + 7 + n * 7, -width / 2 + 4); ctx.lineTo(-length / 2 + 7 + n * 7, width / 2 - 4); ctx.stroke(); } }
        ctx.fillStyle = '#284b5a';
        ctx.beginPath(); ctx.moveTo(6, -width / 2 + 3); ctx.lineTo(length * .29, -width / 2 + 5);
        ctx.lineTo(length * .29, width / 2 - 5); ctx.lineTo(6, width / 2 - 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8fb9bd'; ctx.beginPath(); ctx.moveTo(8, -width / 2 + 4); ctx.lineTo(length * .26, -width / 2 + 6);
        ctx.lineTo(length * .26, -1); ctx.lineTo(8, -2); ctx.fill();
        ctx.fillStyle = '#31525b'; ctx.fillRect(-length * .29, -width / 2 + 4, length * .13, width - 8);
        ctx.fillStyle = '#90aeb19c'; ctx.fillRect(-length * .28, -width / 2 + 5, length * .1, width / 2 - 4);
        ctx.fillStyle = bodyColor; VM.util.roundedRect(ctx, -length * .16, -width / 2 + 2, length * .28, width - 4, 3); ctx.fill();
        ctx.strokeStyle = '#f1e8c63d'; ctx.lineWidth = .8; ctx.stroke();
        if (this.type === 'van') {
          ctx.fillStyle = '#fff0c818'; ctx.fillRect(-length * .35, -width / 2 + 5, length * .37, width - 10);
          ctx.strokeStyle = '#4e71676b'; ctx.beginPath(); ctx.moveTo(-length * .3, -width / 2 + 4); ctx.lineTo(-length * .3, width / 2 - 4); ctx.stroke();
        }
        if (this.type === 'sports') {
          ctx.fillStyle = '#f3e7caae'; ctx.fillRect(-length / 2 + 3, -4, 10, 3); ctx.fillRect(length * .29, -4, length * .18, 3);
          ctx.fillRect(-length / 2 + 3, 1, 10, 3); ctx.fillRect(length * .29, 1, length * .18, 3);
          ctx.fillStyle = '#2d4249'; ctx.fillRect(-length / 2 + 3, -width / 2 - 1, 4, width + 2);
        }
        if (this.type === 'taxi') { ctx.fillStyle = '#f6d783'; ctx.fillRect(-6, -4, 12, 8); VM.util.label(ctx, 'T', 0, 3, 7, '#2b4944', 900, 'center'); }
        if (this.type === 'police') {
          ctx.fillStyle = '#253b52'; ctx.fillRect(-4, -width / 2 + 3, 8, width - 6);
          const blink = Math.sin(this.game.visualTime * 14 + this.id) > 0;
          ctx.fillStyle = blink ? '#ff6478' : '#913f55'; ctx.fillRect(-3, -width / 2 + 4, 6, 8);
          ctx.fillStyle = blink ? '#386790' : '#7cbeff'; ctx.fillRect(-3, 1, 6, 8);
          VM.util.label(ctx, '04', -12, 3, 6, '#e4e6cc', 900, 'center');
        }
        if (this.driver) { ctx.fillStyle = this.controlled ? '#e9b98c' : '#caa47f'; ctx.beginPath(); ctx.arc(10, -5, 2.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#edecbb'; ctx.fillRect(length / 2 - 4, -width / 2 + 3, 3, 5); ctx.fillRect(length / 2 - 4, width / 2 - 8, 3, 5);
        ctx.fillStyle = this.braking ? '#ff785f' : '#b56356'; ctx.fillRect(-length / 2 + 1, -width / 2 + 3, 2, 5); ctx.fillRect(-length / 2 + 1, width / 2 - 8, 2, 5);
        ctx.fillStyle = '#dddbb5'; ctx.fillRect(-length / 2, -4, 1, 8);
        ctx.strokeStyle = '#35505a80'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -width / 2 + 1); ctx.lineTo(4, -width / 2 + 4); ctx.moveTo(4, width / 2 - 4); ctx.lineTo(4, width / 2 - 1); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function throttleActive(input) { return input.held('KeyW', 'ArrowUp') ? 1 : 0; }
  class VehicleFleet {
    constructor(game) {
      this.game = game; this.list = []; this.skids = [];
      for (let n = 0; n < game.city.parkingSpaces.length; n += 5) {
        const spot = game.city.parkingSpaces[n];
        if (game.world.isBlocked(spot.x, spot.y, 18)) continue;
        const type = spot.police ? 'police' : game.rng.pick(['sedan', 'sedan', 'sports', 'van', 'taxi']);
        this.add(type, spot.x, spot.y, spot.angle);
      }
      this.add('sedan', 582, 2410, 0, '#9cbfaa');
      this.add('sports', 2467, 1678, -Math.PI / 2, '#df8b74').missionTag = 'garage-display';
      this.add('sports', 1805, 813, 0, '#e2ad67').missionTag = 'golden-caiman';
    }
    add(type, x, y, angle = 0, color = null) { const vehicle = new ArcadeVehicle(this.game, type, x, y, angle, color); this.list.push(vehicle); return vehicle; }
    nearest(position = this.game.player, range = 77) {
      let found = null, closest = range;
      for (const car of this.list) { const d = VM.util.distance(car, position); if (!car.wrecked && d < closest) { found = car; closest = d; } }
      return found;
    }
    interact() {
      const player = this.game.player;
      if (player.vehicle) { this.exit(); return; }
      const car = this.nearest();
      if (!car) { this.game.notify('Move closer to a vehicle.'); return; }
      const previousDriver = car.driver;
      if (previousDriver) {
        const point = this.game.world.nearestOpen(car.x - Math.sin(car.angle) * 36, car.y + Math.cos(car.angle) * 36, 8);
        if (previousDriver === 'police') this.game.police?.spawnOfficer(point.x, point.y);
        else this.game.pedestrians?.spawnFleeing(point.x, point.y, car.angle + Math.PI / 2);
        this.game.emit('crime', { x: car.x, y: car.y, severity: previousDriver === 'police' ? 55 : 27, kind: 'carjacking' });
        this.game.emit('panic', { x: car.x, y: car.y, radius: 250 });
      }
      car.driver = 'sol'; car.ai = false; car.speed *= .12; car.vx *= .12; car.vy *= .12;
      player.vehicle = car; player.x = car.x; player.y = car.y; player.invulnerable = .6;
      this.game.stats.stolen++; this.game.audio?.play('steal');
      this.game.notify(`${car.spec.name} — keys acquired.`);
      this.game.emit('vehicle-entered', { vehicle: car, previousDriver });
    }
    exit(emergency = false) {
      const player = this.game.player, car = player.vehicle; if (!car) return;
      const point = this.game.world.nearestOpen(car.x - Math.sin(car.angle) * 37, car.y + Math.cos(car.angle) * 37, player.radius);
      player.vehicle = null; player.x = point.x; player.y = point.y; player.vx = 0; player.vy = 0;
      car.driver = null; car.ai = false; player.invulnerable = emergency ? .2 : .55;
      this.game.audio?.setEngine(0, 0); this.game.audio?.play('door');
      if (Math.abs(car.speed) > 155 && !emergency) player.damage(10, 'jumping out');
      this.game.emit('vehicle-exited', car);
    }
    addSkid(car, before) {
      for (const side of [-1, 1]) {
        const offset = car.spec.width * .37 * side;
        this.skids.push({ x: car.x - Math.sin(car.angle) * offset, y: car.y + Math.cos(car.angle) * offset,
          px: before.x - Math.sin(car.angle) * offset, py: before.y + Math.cos(car.angle) * offset, life: 72 });
      }
      if (this.skids.length > 700) this.skids.splice(0, this.skids.length - 700);
    }
    drawSkids(ctx) {
      ctx.save(); ctx.strokeStyle = '#12202a80'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const skid of this.skids) { ctx.globalAlpha = Math.min(1, skid.life / 15); ctx.beginPath(); ctx.moveTo(skid.px, skid.py); ctx.lineTo(skid.x, skid.y); ctx.stroke(); }
      ctx.restore();
    }
    update(dt) {
      for (const car of this.list) car.update(dt);
      for (const skid of this.skids) skid.life -= dt;
      this.skids = this.skids.filter(skid => skid.life > 0);
      this.collisions();
      if (!this.game.player.vehicle) this.game.audio?.setEngine(0, 0);
    }
    collisions() {
      for (let a = 0; a < this.list.length; a++) {
        const car = this.list[a]; if (car.wrecked) continue;
        for (let b = a + 1; b < this.list.length; b++) {
          const other = this.list[b]; if (other.wrecked) continue;
          const distance = VM.util.distance(car, other), separation = (car.spec.width + other.spec.width) * .69;
          if (distance > separation || distance < .1) continue;
          const nx = (car.x - other.x) / distance, ny = (car.y - other.y) / distance, overlap = separation - distance;
          this.game.world.moveCircle(car, nx * overlap * .5, ny * overlap * .5, car.spec.width * .5);
          this.game.world.moveCircle(other, -nx * overlap * .5, -ny * overlap * .5, other.spec.width * .5);
          if (car.collisionCooldown > 0 || other.collisionCooldown > 0) continue;
          const impact = Math.hypot(car.vx - other.vx, car.vy - other.vy);
          if (impact < 26) continue;
          car.speed *= .45; other.speed *= .5; car.collisionCooldown = .7; other.collisionCooldown = .7;
          car.damage(impact * .09); other.damage(impact * .09);
          car.panic = 5; other.panic = 5;
          if (VM.util.distance(car, this.game.player) < 480) { this.game.audio?.play('horn'); this.game.audio?.play('crash'); }
          this.game.particles?.burst((car.x + other.x) / 2, (car.y + other.y) / 2, '#f3cb8e', 9, 100);
          if (car.controlled || other.controlled) {
            this.game.camera.shake(impact / 30); this.game.emit('crime', { x: car.x, y: car.y, severity: 8, kind: 'reckless driving' });
          }
        }
        if (this.game.mode !== 'play') continue;
        const people = [...(this.game.pedestrians?.list || []), ...(this.game.police?.officers || []), ...(this.game.combat?.hostiles || [])];
        if (!this.game.player.vehicle) people.push(this.game.player);
        for (const person of people) {
          if (person.dead || person.health <= 0 || Math.abs(car.speed) < 58) continue;
          if (VM.util.distance(car, person) > car.spec.width * .65 + 6) continue;
          person.damage?.(Math.abs(car.speed) * .35, car.controlled ? 'sol' : 'traffic');
          this.game.world.moveCircle(person, Math.cos(car.angle) * 19, Math.sin(car.angle) * 19, 8);
          car.speed *= .67; this.game.particles?.burst(person.x, person.y, '#b35e57', 8, 60);
          if (car.controlled) this.game.emit('crime', { x: car.x, y: car.y, severity: person.isOfficer ? 55 : 28, kind: 'hit and run' });
        }
      }
    }
    drawLights(ctx, night) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (const car of this.list) {
        if (car.wrecked || !this.game.city.visible(car, this.game.camera, 240)) continue;
        if (night > .08) {
          ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
          const gradient = ctx.createLinearGradient(20, 0, 205, 0);
          gradient.addColorStop(0, `rgba(255,235,180,${night * .43})`); gradient.addColorStop(1, 'rgba(215,230,172,0)');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(24, -9); ctx.lineTo(202, -60); ctx.lineTo(205, 60); ctx.lineTo(24, 9); ctx.fill();
          ctx.fillStyle = '#ffe8b5'; ctx.shadowBlur = 7; ctx.shadowColor = '#ffe9b2';
          ctx.fillRect(car.spec.length / 2 - 3, -car.spec.width / 2 + 3, 2, 5); ctx.fillRect(car.spec.length / 2 - 3, car.spec.width / 2 - 8, 2, 5);
          ctx.shadowBlur = 0; ctx.restore();
        }
        if (car.type === 'police' && car.driver) {
          const blink = Math.sin(this.game.visualTime * 14 + car.id) > 0;
          for (const side of [-1, 1]) {
            const x = car.x - Math.sin(car.angle) * side * 8, y = car.y + Math.cos(car.angle) * side * 8;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 76);
            gradient.addColorStop(0, side < 0 ? `rgba(255,75,112,${blink ? .55 : .19})` : `rgba(77,165,255,${blink ? .2 : .6})`);
            gradient.addColorStop(1, 'rgba(60,70,110,0)'); ctx.fillStyle = gradient;
            ctx.beginPath(); ctx.arc(x, y, 76, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    }
  }
  VM.ArcadeVehicle = ArcadeVehicle; VM.VehicleFleet = VehicleFleet;
  VM.installers.push(game => {
    game.vehicles = new VehicleFleet(game); game.addSystem('arcade vehicle fleet', game.vehicles, 30);
    game.worldDraw.unshift(ctx => game.vehicles.drawSkids(ctx));
  });
})();
