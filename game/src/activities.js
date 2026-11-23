// Vista Mar: Low Tide — CoastalActivities: courier jobs, timed street circuit, garage services, and eight postcards.
(() => {
  const COASTAL_POSTCARDS = [
    { x: 1220, y: 1260, name: 'The fountain at Jardín' }, { x: 1820, y: 789, name: 'Last show at Luna Azul' },
    { x: 2780, y: 2160, name: 'Malecón after midnight' }, { x: 530, y: 2450, name: 'A place to come home' },
    { x: 2370, y: 1210, name: 'Market day in Cobre' }, { x: 2858, y: 2690, name: 'The old harbor pier' },
    { x: 740, y: 810, name: 'Morning in Alto Sol' }, { x: 1710, y: 1965, name: 'The rooftops of Rojas' },
  ];
  const COURIER_DESTINATIONS = [{ x: 1360, y: 1560 }, { x: 751, y: 972 }, { x: 1860, y: 2740 }, { x: 680, y: 2395 }];
  const MALECON_CIRCUIT = [[2690, 890], [2690, 1480], [2630, 2070], [2070, 2100], [1450, 1480], [1510, 890], [2070, 860], [2630, 490]];
  class CoastalActivities {
    constructor(game) {
      this.game = game; this.postcards = COASTAL_POSTCARDS.map(card => ({ ...card, collected: false }));
      this.courierPoint = { x: 2754, y: 1190, name: 'COBRE COURIER', color: '#b8adeb' };
      this.racePoint = { x: 2690, y: 490, name: 'MALECÓN RUN', color: '#b8adeb' };
      this.job = null; this.race = null; this.totalJobs = 0; this.bestRace = null; this.serviceCooldown = 0;
      game.stats.postcards = 0; game.stats.couriers = 0;
    }
    get marker() {
      if (this.job) return { ...this.job.destination, label: 'COURIER DROP', color: '#c1b0ee' };
      if (this.race) { const point = MALECON_CIRCUIT[this.race.checkpoint]; return { x: point[0], y: point[1], label: `CHECKPOINT ${this.race.checkpoint + 1} / ${MALECON_CIRCUIT.length}`, color: '#c1b0ee' }; }
      return null;
    }
    get objective() { return this.job ? `Courier drop · ${Math.ceil(this.job.time)} seconds · $${this.job.reward}` : this.race ? `Malecón Run · checkpoint ${this.race.checkpoint + 1}/8 · ${Math.ceil(this.race.time)} seconds` : ''; }
    nearestService() {
      const player = this.game.player;
      if (VM.util.distance(player, VM.CONFIG.garage) < 72) return { type: 'garage', action: player.vehicle ? 'REPAIR & RESPRAY / $150' : 'ARMOR & AMMUNITION / $75', ...VM.CONFIG.garage };
      if (VM.util.distance(player, this.courierPoint) < 62 && !player.vehicle && !this.job) return { type: 'courier', action: 'COURIER JOB', ...this.courierPoint };
      if (VM.util.distance(player, this.racePoint) < 70 && player.vehicle && !this.race) return { type: 'race', action: 'START MALECÓN RUN', ...this.racePoint };
      if (VM.util.distance(player, VM.CONFIG.safehouse) < 52 && !player.vehicle) return { type: 'home', action: 'REST & SAVE', ...VM.CONFIG.safehouse };
      return null;
    }
    canInteract() { return Boolean(this.nearestService()); }
    interact(service) {
      const game = this.game, player = game.player;
      if (this.serviceCooldown > 0) return;
      this.serviceCooldown = 1;
      if (service.type === 'garage') {
        const cost = player.vehicle ? 150 : 75;
        if (game.cash < cost) { game.notify(`You need $${cost} for the service.`, '#eaa188'); return; }
        game.cash -= cost; player.health = 100; player.armor = Math.min(100, player.armor + 40); player.reserve += 36;
        if (player.vehicle) {
          player.vehicle.hp = player.vehicle.spec.hp; player.vehicle.color = game.rng.pick(['#91cbb4', '#db977f', '#b3a0c9', '#e7d2a0']);
          if (game.police.stars && !game.police.seen) { game.police.clear(); game.stats.escapes++; game.emit('police-escaped'); }
        }
        game.audio.play('complete'); game.notify(player.vehicle ? 'Fresh paint. Fresh engine. Thanks, Inés.' : 'Armor fitted. Pistol ammunition replenished.');
      } else if (service.type === 'courier') {
        const destination = game.rng.pick(COURIER_DESTINATIONS), reward = Math.round(VM.util.distance(player, destination) * .13 + 120);
        this.job = { destination, reward, time: 95 }; game.notify('Courier parcel acquired. Get it there intact.');
      } else if (service.type === 'race') { this.race = { time: 82, elapsed: 0, checkpoint: 0 }; game.notify('Malecón Run started. Eight checkpoints. No shortcuts.'); }
      else if (service.type === 'home') { player.health = 100; game.save.save(); game.notify('Casa Vega — home, for now.'); }
    }
    update(dt) {
      this.serviceCooldown = Math.max(0, this.serviceCooldown - dt);
      if (this.game.mode !== 'play' || this.game.story.blocking) return;
      const player = this.game.player, service = this.nearestService();
      if (service && this.game.input.take('KeyE')) this.interact(service);
      for (const card of this.postcards) {
        if (card.collected || player.vehicle || VM.util.distance(card, player) > 25) continue;
        card.collected = true; this.game.cash += 125; this.game.reputation += 3;
        this.game.stats.postcards = this.postcards.filter(item => item.collected).length;
        this.game.audio.play('pickup'); this.game.particles.burst(card.x, card.y, '#f4d896', 14, 80);
        this.game.notify(`Postcard ${this.game.stats.postcards} / 8 — ${card.name}`);
        if (this.game.stats.postcards === 8) { this.game.cash += 1000; this.game.notify('The whole coast, in your pocket. Collection bonus: $1,000.'); }
      }
      if (this.job) {
        this.job.time -= dt;
        if (VM.util.distance(player, this.job.destination) < 44) {
          this.game.cash += this.job.reward; this.totalJobs++; this.game.stats.couriers++;
          this.game.notify(`Courier delivery complete. +$${this.job.reward}`); this.game.audio.play('complete'); this.job = null;
        } else if (this.job.time <= 0) { this.game.notify('Courier job expired. Try another route.', '#e5a18a'); this.job = null; }
      }
      if (this.race) {
        this.race.time -= dt; this.race.elapsed += dt;
        const point = MALECON_CIRCUIT[this.race.checkpoint];
        if (player.vehicle && Math.hypot(player.x - point[0], player.y - point[1]) < 77) {
          this.race.checkpoint++; this.game.audio.play('pickup');
          if (this.race.checkpoint >= MALECON_CIRCUIT.length) {
            const reward = 750 + Math.round(this.race.time * 8); this.game.cash += reward;
            this.bestRace = this.bestRace === null ? this.race.elapsed : Math.min(this.bestRace, this.race.elapsed);
            this.game.notify(`Malecón Run complete: ${this.race.elapsed.toFixed(1)}s. +$${reward}`); this.game.audio.play('complete'); this.race = null;
          }
        } else if (this.race.time <= 0 || !player.vehicle) { this.game.notify('The run is over. Come back with four wheels.', '#e5a18a'); this.race = null; }
      }
    }
    drawRing(ctx, point, name, color) {
      ctx.strokeStyle = `${color}6b`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(point.x, point.y, 24, 0, Math.PI * 2); ctx.stroke();
      VM.util.label(ctx, name, point.x, point.y - 34, 9 / this.game.camera.zoom, color, 700, 'center');
    }
    draw(ctx) {
      for (const card of this.postcards) {
        if (card.collected || !this.game.city.visible(card, this.game.camera, 40)) continue;
        ctx.save(); ctx.translate(card.x, card.y + Math.sin(this.game.visualTime * 2 + card.x) * 2);
        ctx.fillStyle = '#233b4450'; ctx.fillRect(-8, -5, 21, 14); ctx.fillStyle = '#f0d18c'; ctx.fillRect(-10, -8, 20, 13);
        ctx.fillStyle = '#62968b'; ctx.fillRect(-7, -5, 10, 7); ctx.fillStyle = '#f8e8ba'; ctx.fillRect(5, -5, 2, 7); ctx.restore();
      }
      for (const point of [this.courierPoint, this.racePoint]) if (this.game.city.visible(point, this.game.camera)) this.drawRing(ctx, point, point.name, point.color);
      const marker = this.marker; if (marker && this.game.city.visible(marker, this.game.camera)) this.drawRing(ctx, marker, marker.label, marker.color);
      if (this.game.city.visible(VM.CONFIG.garage, this.game.camera) && VM.util.distance(this.game.missions.marker || { x: 0, y: 0 }, VM.CONFIG.garage) > 100) this.drawRing(ctx, VM.CONFIG.garage, 'REPAIR / RESPRAY', '#92d9be');
    }
    serialize() { return { postcards: this.postcards.map(card => card.collected), totalJobs: this.totalJobs, bestRace: this.bestRace }; }
    restore(data = {}) {
      this.postcards.forEach((card, index) => { card.collected = Boolean(data.postcards?.[index]); });
      this.totalJobs = data.totalJobs || 0; this.bestRace = data.bestRace ?? null;
      this.game.stats.postcards = this.postcards.filter(card => card.collected).length; this.job = null; this.race = null;
    }
  }
  VM.COASTAL_POSTCARDS = COASTAL_POSTCARDS; VM.CoastalActivities = CoastalActivities;
  VM.installers.push(game => { game.activities = new CoastalActivities(game); game.addSystem('courier, circuit, garage, postcards', game.activities, 65); game.worldDraw.push(ctx => game.activities.draw(ctx)); });
})();
