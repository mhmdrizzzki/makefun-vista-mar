// HarborCampaign: six sequential, multi-stage contracts with vehicle, escape, combat, and pursuit objectives.
(() => {
  const STORY_CONTRACTS = [
    { name: 'A LINE IN THE SAND', reward: 150, color: '#92e6c5' },
    { name: 'BORROWED HORSE', reward: 750, color: '#f0ce87' },
    { name: 'SALT IN THE WOUND', reward: 1000, color: '#95d9d2' },
    { name: 'THE LONG RECEIPT', reward: 1600, color: '#f09c85' },
    { name: 'LAST EXIT', reward: 2200, color: '#b9a7e1' },
    { name: 'LOW TIDE', reward: 5000, color: '#9ee6bf' },
  ];
  class HarborCampaign {
    constructor(game) {
      this.game = game; this.index = 0; this.stage = 'meet'; this.active = false;
      this.targetCar = null; this.guards = []; this.tail = null; this.boss = null;
      this.transition = 0; this.completion = null; this.failure = null; this.shotMarker = null; this.bossLost = 0;
      this.flags = {}; this.bossWaypoint = 0;
    }
    get contract() { return STORY_CONTRACTS[this.index]; }
    get objective() {
      if (this.index >= STORY_CONTRACTS.length) return 'The coast is yours. Explore, collect, and take side jobs.';
      if (this.failure) return this.failure.text;
      switch (this.index) {
        case 0: return 'Reach Rojas Motor. Step out and meet Inés.';
        case 1: return this.stage === 'steal' ? 'Steal Vela’s golden Caimán near Luna Azul.' : 'Deliver the golden Caimán to Rojas Motor.';
        case 2: return this.stage === 'ledger' ? 'Collect the ledger at Mercado Cobre.' : this.stage === 'escape' ? 'Shake the patrol. Break line of sight and stay hidden.' : 'Deliver the ledger to the old harbor pier.';
        case 3: return this.stage === 'approach' ? 'Meet Vela’s security at Almacén 08. Bring a pistol.' : this.stage === 'fight' ? `Clear harbor security: ${this.guards.filter(guard => guard.dead).length} / ${this.guards.length}.` : 'Take the harbor manifest from the loading bay.';
        case 4: return this.stage === 'van' ? 'Steal the archive van behind Almacén 08.' : 'Bring the archive van to Casa Vega. Lose the heat first.';
        case 5: return this.stage === 'intercept' ? 'Find Dario Vela’s Caimán on the Malecón.' : 'Stop Dario Vela. Ram him, shoot his car, or take the wheel.';
        default: return '';
      }
    }
    get marker() {
      if (this.shotMarker) return this.shotMarker;
      if (!this.active || this.completion || this.index >= 6) return null;
      if (this.index === 0) return { ...VM.CONFIG.garage, label: 'ROJAS MOTOR', action: 'MEET INÉS' };
      if (this.index === 1) return this.stage === 'steal' ? { x: this.targetCar?.x || 1805, y: this.targetCar?.y || 813, label: 'GOLDEN CAIMÁN', action: 'STEAL THE CAR' } : { ...VM.CONFIG.garage, label: 'ROJAS MOTOR', action: 'DELIVER CAIMÁN' };
      if (this.index === 2) return this.stage === 'ledger' ? { x: 2463, y: 1174, label: 'MERCADO COBRE', action: 'TAKE THE LEDGER' } : this.stage === 'drop' ? { x: 2914, y: 2686, label: 'OLD HARBOR PIER', action: 'DELIVER LEDGER' } : null;
      if (this.index === 3) return { x: 2393, y: this.stage === 'collect' ? 2433 : 2452, label: 'ALMACÉN 08', action: this.stage === 'approach' ? 'ENTER THE LOADING BAY' : this.stage === 'collect' ? 'TAKE THE MANIFEST' : 'CLEAR THE YARD' };
      if (this.index === 4) return this.stage === 'van' ? { x: this.targetCar?.x || 2582, y: this.targetCar?.y || 2496, label: 'ARCHIVE VAN', action: 'STEAL THE VAN' } : { ...VM.CONFIG.safehouse, label: 'CASA VEGA', action: 'SECURE THE ARCHIVE' };
      return this.boss ? { x: this.boss.x, y: this.boss.y, label: 'DARIO VELA', action: 'STOP THE CAIMÁN', hostile: true } : null;
    }
    reset() {
      this.index = 0; this.active = false; this.stage = 'meet'; this.transition = 0; this.completion = null;
      this.failure = null; this.targetCar = null; this.guards = []; this.tail = null; this.boss = null; this.flags = {}; this.shotMarker = null;
    }
    start(index = 0, restoreStage = null) {
      this.index = index; this.active = index < 6; this.transition = 0; this.completion = null; this.failure = null; this.shotMarker = null;
      this.guards = []; this.game.combat.hostiles = []; this.targetCar = null; this.bossLost = 0;
      if (index >= 6) { this.stage = 'free-roam'; return; }
      this.stage = ['meet', 'steal', 'ledger', 'approach', 'van', 'intercept'][index];
      this.game.notify(`CONTRACT ${String(index + 1).padStart(2, '0')} — ${this.contract.name}`, this.contract.color, 5);
      if (index === 1) {
        this.targetCar = this.game.vehicles.list.find(car => car.missionTag === 'golden-caiman' && !car.wrecked)
          || this.game.vehicles.add('sports', 1805, 813, 0, '#e2ad67');
        this.targetCar.missionTag = 'golden-caiman'; this.targetCar.driver = 'vela'; this.targetCar.ai = false;
        this.game.story.radio('Inés Rojas', 'Gold paint. Parked behind Luna Azul. Vela won’t miss it until you’re gone.');
      }
      if (index === 2) this.game.story.radio('Inés Rojas', 'A fruit seller at Mercado Cobre has Vela’s real accounts. Go quietly.');
      if (index === 3) { this.game.player.reserve = Math.max(84, this.game.player.reserve); this.game.story.radio('Sol Vega', 'The ledger points to Almacén 08. Time to ask the night shift.'); }
      if (index === 4) {
        this.targetCar = this.game.vehicles.add('van', 2582, 2496, -Math.PI / 2, '#79b9ac');
        this.targetCar.missionTag = 'archive-van'; this.targetCar.driver = 'vela'; this.targetCar.hp = 260;
        this.game.story.radio('Inés Rojas', 'Every eviction, every bribe. It’s in that van. Bring it home.');
      }
      if (index === 5) {
        this.boss = this.game.vehicles.add('sports', 2690, 2590, -Math.PI / 2, '#a87b88');
        this.boss.driver = 'vela-boss'; this.boss.missionTag = 'dario-vela'; this.boss.hp = 235;
        this.bossWaypoint = 0; this.boss.ai = false;
        this.game.story.radio('Inés Rojas', 'Vela’s running north on the Malecón. One last debt, Sol.');
      }
      if (restoreStage) {
        this.stage = restoreStage;
        if (index === 3 && restoreStage === 'fight') this.spawnWarehouseGuards();
        if (index === 5 && restoreStage === 'chase') this.boss.ai = true;
      }
    }
    spawnWarehouseGuards() {
      this.guards = [[2227, 2452], [2315, 2507], [2543, 2453], [2582, 2379], [2466, 2571]]
        .map(([x, y]) => this.game.combat.addHostile(x, y, 'Vela Harbor Security'));
      this.game.world.addPickup(2406, 2540, 'health'); this.game.world.addPickup(2259, 2441, 'armor');
    }
    canInteract() {
      if (!this.active || this.completion || this.failure || this.game.story.blocking) return false;
      const marker = this.marker, player = this.game.player;
      if (!marker || VM.util.distance(marker, player) > 68) return false;
      if (this.index === 0 || this.index === 2 && this.stage !== 'escape' || this.index === 3 && this.stage !== 'fight') return !player.vehicle;
      if (this.index === 1 && this.stage === 'deliver') return player.vehicle === this.targetCar && Math.abs(this.targetCar.speed) < 52;
      if (this.index === 4 && this.stage === 'extract') return player.vehicle === this.targetCar && !this.game.police.stars && Math.abs(this.targetCar.speed) < 52;
      return false;
    }
    interact() {
      if (this.index === 0) this.finish([
        { who: 'Inés Rojas', text: 'Half this city owes Vela. I’d rather owe you.' },
        { who: 'Sol Vega', text: 'A garage and a debt. Feels like home.' },
      ]);
      else if (this.index === 1 && this.stage === 'deliver') {
        this.targetCar.hp = this.targetCar.spec.hp; this.targetCar.speed = 0;
        this.finish([{ who: 'Inés Rojas', text: 'Nice work. Vela’s paint job looks better on our side of town.' }]);
      } else if (this.index === 2 && this.stage === 'ledger') {
        this.stage = 'escape'; this.game.police.setStars(3); this.game.police.lastKnown = { x: this.game.player.x, y: this.game.player.y };
        this.game.police.spawnUnit(2040, 1175, Math.PI / 2); this.game.police.spawnUnit(2690, 1470, -Math.PI / 2);
        this.game.story.radio('Inés Rojas', 'They were waiting for you. Lose those lights before you touch the pier.');
      } else if (this.index === 2 && this.stage === 'drop') this.finish([{ who: 'Sol Vega', text: 'One ledger, dry as promised. Now let’s see what he’s hiding at the warehouse.' }]);
      else if (this.index === 3 && this.stage === 'approach') {
        this.stage = 'fight'; this.spawnWarehouseGuards(); this.game.police.raise(52, this.game.player.x, this.game.player.y, 'harbor disturbance');
        this.game.story.radio('Inés Rojas', 'Use the corners for cover. The manifest is in the loading bay.');
      } else if (this.index === 3 && this.stage === 'collect') this.finish([
        { who: 'Dario Vela', text: 'You think a stack of paper changes who owns this city?' },
        { who: 'Sol Vega', text: 'No. But the people reading it might.' },
      ]);
      else if (this.index === 4 && this.stage === 'extract') this.finish([{ who: 'Inés Rojas', text: 'It’s all here. The harbor belongs to its people again. Vela knows it, too.' }]);
    }
    finish(lines = []) {
      if (this.completion) return;
      const contract = this.contract; this.game.cash += contract.reward; this.game.reputation += 12;
      this.game.stats.missions++; this.completion = { name: contract.name, reward: contract.reward, life: 5.4 };
      this.active = false; this.game.audio.play('complete');
      this.game.particles.burst(this.game.player.x, this.game.player.y, '#a8edca', 24, 100);
      this.game.emit('mission-complete', { index: this.index, reward: contract.reward });
      if (lines.length) this.game.story.say(lines, () => { this.transition = 2.5; }); else this.transition = 3.2;
    }
    fail(text) {
      if (this.failure || this.completion) return;
      this.failure = { text, timer: 5 }; this.game.audio.play('fail'); this.game.notify(text, '#e9a187', 5);
    }
    retryAfterDeath() {
      if (this.completion || this.index >= 6) return;
      this.start(this.index);
    }
    updateBoss(dt) {
      if (!this.boss || this.boss.wrecked) return;
      const route = [[2690, 2070], [2690, 1480], [2690, 890], [2660, 860], [2070, 860], [1480, 860],
        [1450, 890], [1450, 1480], [1480, 1510], [2070, 1510], [2630, 1510], [2630, 2070], [2630, 2660], [2690, 2690]];
      const target = { x: route[this.bossWaypoint][0], y: route[this.bossWaypoint][1] };
      if (VM.util.distance(this.boss, target) < 54) this.bossWaypoint = (this.bossWaypoint + 1) % route.length;
      this.boss.desiredAngle = Math.atan2(target.y - this.boss.y, target.x - this.boss.x);
      this.boss.desiredSpeed = (this.boss.hp < 90 ? 145 : 213) * VM.util.clamp(1 - Math.abs(VM.util.angleDelta(this.boss.angle, this.boss.desiredAngle)) * .5, .3, 1);
      if (VM.util.distance(this.boss, this.game.player) > 900) this.bossLost += dt; else this.bossLost = 0;
      if (this.bossLost > 9) this.fail('Vela slipped away. Regroup at the harbor.');
    }
    update(dt) {
      if (this.game.mode !== 'play' || this.game.story.blocking) return;
      if (this.completion) {
        this.completion.life -= dt; this.transition -= dt;
        if (this.transition <= 0) {
          const next = this.index + 1; this.start(next);
          if (next >= 6) this.game.emit('campaign-finished');
        }
        return;
      }
      if (this.failure) {
        this.failure.timer -= dt;
        if (this.failure.timer <= 0) { this.game.police.clear(); this.start(this.index); }
        return;
      }
      if (!this.active) return;
      if (this.canInteract() && this.game.input.take('KeyE')) this.interact();
      if (this.index === 1) {
        if (this.targetCar.wrecked) this.fail('The Caimán is gone. Find another way back to Luna Azul.');
        if (this.stage === 'steal' && this.game.player.vehicle === this.targetCar) { this.stage = 'deliver'; this.game.story.radio('Sol Vega', 'Borrowed horse. Long way home.'); }
      }
      if (this.index === 2 && this.stage === 'escape' && this.game.police.stars === 0) {
        this.stage = 'drop'; this.game.story.radio('Inés Rojas', 'No sirens. Good. Leave the ledger at the old harbor pier.');
      }
      if (this.index === 3 && this.stage === 'fight' && this.guards.length && this.guards.every(guard => guard.dead)) {
        this.stage = 'collect'; this.game.story.radio('Sol Vega', 'Night shift’s over. Let’s grab the manifest.');
      }
      if (this.index === 4) {
        if (this.targetCar.wrecked) this.fail('The archive van burned. Return to the warehouse.');
        if (this.stage === 'van' && this.game.player.vehicle === this.targetCar) {
          this.stage = 'extract'; this.game.police.raise(65, this.game.player.x, this.game.player.y, 'archive van stolen');
          this.game.story.radio('Inés Rojas', 'Keep that engine running. Get hidden, then bring the archive home.');
        }
      }
      if (this.index === 5) {
        if (this.stage === 'intercept' && VM.util.distance(this.boss, this.game.player) < 365) {
          this.stage = 'chase'; this.boss.ai = true; this.game.police.raise(55, this.game.player.x, this.game.player.y, 'Malecón pursuit');
          this.game.story.radio('Dario Vela', 'You should have stayed off my roads.');
        }
        if (this.stage === 'chase') {
          this.updateBoss(dt);
          if (this.boss.wrecked || this.game.player.vehicle === this.boss) this.finish([
            { who: 'Sol Vega', text: 'The tide turned, Vela. The harbor isn’t for sale anymore.' },
            { who: 'Inés Rojas', text: 'Bring yourself home, Sol. We have a city to fix.' },
          ]);
        }
      }
    }
    draw(ctx) {
      const marker = this.marker; if (!marker || !this.game.city.visible(marker, this.game.camera, 120)) return;
      const color = marker.hostile ? '#f29a82' : this.contract?.color || '#94e5c8';
      const pulse = Math.sin(this.game.visualTime * 3) * 3;
      ctx.save(); ctx.translate(marker.x, marker.y);
      ctx.fillStyle = `${color}20`; ctx.strokeStyle = `${color}a0`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 32 + pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `${color}45`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 43 + pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -33); ctx.lineTo(8, -44); ctx.lineTo(0, -55); ctx.lineTo(-8, -44); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#173238'; ctx.beginPath(); ctx.arc(0, -44, 3, 0, Math.PI * 2); ctx.fill();
      VM.util.label(ctx, marker.label, 0, -67, 10 / this.game.camera.zoom, color, 800, 'center');
      ctx.restore();
    }
    serialize() { return { index: this.index, stage: this.stage, active: this.active }; }
    restore(data) { this.start(VM.util.clamp(data?.index || 0, 0, 6), data?.stage); this.active = data?.active !== false && this.index < 6; }
  }
  VM.STORY_CONTRACTS = STORY_CONTRACTS; VM.HarborCampaign = HarborCampaign;
  VM.installers.push(game => { game.missions = new HarborCampaign(game); game.addSystem('six-contract harbor campaign', game.missions, 60); game.worldDraw.push(ctx => game.missions.draw(ctx)); });
})();
