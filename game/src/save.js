// Vista Mar: Low Tide — BrowserSaveSlot: versioned local snapshots of position, campaign, heat, vehicle, and side jobs.
(() => {
  const SAVE_SLOT_KEY = 'vista-mar.low-tide.save.v1';
  class BrowserSaveSlot {
    constructor(game) { this.game = game; }
    has() { try { return Boolean(localStorage.getItem(SAVE_SLOT_KEY)); } catch { return false; } }
    save() {
      const game = this.game, player = game.player;
      const snapshot = {
        version: 1, seed: game.seed, cash: game.cash, reputation: game.reputation, stats: { ...game.stats },
        dayPhase: game.dayPhase, time: game.time,
        player: { x: player.x, y: player.y, health: player.health, armor: player.armor, ammo: player.ammo, reserve: player.reserve },
        vehicle: player.vehicle && { type: player.vehicle.type, x: player.vehicle.x, y: player.vehicle.y,
          color: player.vehicle.color, angle: player.vehicle.angle, hp: player.vehicle.hp, missionTag: player.vehicle.missionTag },
        campaign: game.missions.serialize(), wanted: { stars: game.police.stars, heat: game.police.heat },
        activities: game.activities?.serialize() || {},
      };
      try { localStorage.setItem(SAVE_SLOT_KEY, JSON.stringify(snapshot)); game.notify('Saved in this browser.'); game.audio.play('menu'); return true; }
      catch (error) { game.notify(`Save unavailable: ${error.message}`, '#eaa28b'); return false; }
    }
    load() {
      try {
        const raw = localStorage.getItem(SAVE_SLOT_KEY); if (!raw) { this.game.notify('No save in this browser yet.'); return false; }
        const data = JSON.parse(raw);
        if (data.version !== 1 || !Number.isFinite(data.player?.x) || !Number.isFinite(data.player?.y) || !Number.isFinite(data.cash)) throw new Error('The save slot is not a Vista Mar v1 snapshot.');
        const game = this.game;
        game.staged = false; game.mode = 'play'; game.paused = false; game.camera.locked = false;
        game.story.blocking = false; game.story.lines = []; game.police.clear(); game.player.respawn();
        game.cash = Math.max(0, data.cash); game.reputation = Math.max(0, data.reputation || 0);
        game.stats = { ...game.stats, ...data.stats }; game.time = Math.max(0, data.time || 0);
        game.dayPhase = VM.util.clamp(data.dayPhase || .4, 0, 1);
        const point = game.world.nearestOpen(VM.util.clamp(data.player.x, 30, 3010), VM.util.clamp(data.player.y, 30, 3140));
        game.player.x = point.x; game.player.y = point.y;
        game.player.health = VM.util.clamp(data.player.health || 100, 1, 100); game.player.armor = VM.util.clamp(data.player.armor || 0, 0, 100);
        game.player.ammo = VM.util.clamp(data.player.ammo ?? 12, 0, 12); game.player.reserve = VM.util.clamp(data.player.reserve || 48, 0, 999);
        game.missions.restore(data.campaign);
        if (data.vehicle && VM.CONFIG.vehicles[data.vehicle.type]) {
          const v = data.vehicle;
          let car = v.missionTag && game.vehicles.list.find(item => item.missionTag === v.missionTag && !item.wrecked);
          if (!car) car = game.vehicles.add(v.type, v.x, v.y, v.angle, v.color);
          car.x = point.x; car.y = point.y; car.angle = v.angle || 0; car.color = v.color;
          car.hp = VM.util.clamp(v.hp || car.spec.hp, 1, 280); car.driver = 'sol'; car.ai = false; car.speed = 0; car.vx = 0; car.vy = 0;
          car.missionTag = v.missionTag; game.player.vehicle = car;
          if (v.missionTag === 'golden-caiman' || v.missionTag === 'archive-van') game.missions.targetCar = car;
        }
        game.police.setStars(data.wanted?.stars || 0); game.police.heat = VM.util.clamp(data.wanted?.heat || 0, 0, 320);
        game.police.lastKnown = { x: game.player.x, y: game.player.y }; game.player.invulnerable = 2;
        game.activities?.restore(data.activities); game.camera.snap(game.player.x, game.player.y, game.player.vehicle ? 1 : 1.1);
        game.notify('Welcome back to the coast.'); return true;
      } catch (error) { this.game.notify(`Could not load: ${error.message}`, '#eaa28b'); return false; }
    }
  }
  VM.BrowserSaveSlot = BrowserSaveSlot;
  VM.installers.push(game => { game.save = new BrowserSaveSlot(game); });
})();
