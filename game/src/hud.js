// StreetHUD: clean contract typography, vitals, five wanted stars, navigation, speed, and contextual controls.
(() => {
  class StreetHUD {
    constructor(game) { this.game = game; }
    objective(ctx) {
      const game = this.game, mission = game.missions, contract = mission.contract;
      const title = contract?.name || 'THE COAST IS OURS';
      VM.util.panel(ctx, 26, 26, 392, 106, '#102b32ed', '#b4d8bf30', 8);
      ctx.fillStyle = contract?.color || '#a6e7c1'; ctx.fillRect(26, 40, 3, 73);
      VM.util.trackedText(ctx, contract ? `${String(mission.index + 1).padStart(2, '0')} / STORY CONTRACT` : 'FREE ROAM / VISTA MAR', 44, 49, 1.8, 9, contract?.color || '#a6e7c1');
      VM.util.label(ctx, title, 44, 77, 19, '#f3f1df', 800);
      ctx.font = '400 12px Arial';
      VM.util.wrapText(ctx, mission.objective, 351).slice(0, 2).forEach((line, index) => VM.util.label(ctx, line, 44, 99 + index * 17, 12, '#b6cdc2', 400));
      if (game.activities.objective) {
        VM.util.panel(ctx, 26, 141, 392, 35, '#172d39ed', '#bca8e839', 6);
        VM.util.label(ctx, game.activities.objective, 43, 163, 11, '#d2beeb', 600);
      }
    }
    vitals(ctx) {
      const game = this.game, player = game.player, x = game.width - 285, y = 26;
      VM.util.panel(ctx, x, y, 259, 134, '#102b32ef', '#c1dac635', 8);
      VM.util.trackedText(ctx, 'SOL VEGA / CASH', x + 17, y + 21, 1.6, 9, '#9cbbb0');
      VM.util.label(ctx, `$${Math.floor(game.cash).toLocaleString('en-US')}`, x + 17, y + 55, 28, '#adebc8', 800);
      for (let n = 0; n < 5; n++) {
        VM.util.starPath(ctx, x + 26 + n * 25, y + 79, 9, 4);
        ctx.fillStyle = n < game.police.stars ? '#f5cf8c' : '#6281772b'; ctx.strokeStyle = n < game.police.stars ? '#ffe5b3' : '#7e9b8b66'; ctx.lineWidth = 1;
        if (n < game.police.stars) { ctx.shadowColor = '#f4bf7680'; ctx.shadowBlur = 6; } ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      }
      const status = game.police.stars ? game.police.seen ? 'IN PURSUIT' : 'SEARCHING' : 'OFF RADAR';
      VM.util.label(ctx, status, x + 239, y + 83, 9, game.police.stars ? '#f2bb91' : '#8eb5a4', 800, 'right');
      this.bar(ctx, x + 17, y + 99, 100, player.health / 100, '#ee9a83');
      this.bar(ctx, x + 140, y + 99, 100, player.armor / 100, '#9bbcd8');
      VM.util.label(ctx, `HEALTH ${Math.ceil(player.health)}`, x + 17, y + 121, 8, '#d3bdad', 700);
      VM.util.label(ctx, `ARMOR ${Math.ceil(player.armor)}`, x + 140, y + 121, 8, '#a6bdcc', 700);
    }
    bar(ctx, x, y, width, value, color) { ctx.fillStyle = '#64867937'; ctx.fillRect(x, y, width, 5); ctx.fillStyle = color; ctx.fillRect(x, y, width * VM.util.clamp(value, 0, 1), 5); }
    location(ctx) {
      const game = this.game, center = game.width / 2;
      const hours = Math.floor(game.dayPhase * 24), minutes = Math.floor(game.dayPhase * 24 * 60) % 60;
      VM.util.panel(ctx, center - 126, 26, 252, 30, '#132e35d9', '#bcd4c025', 6);
      VM.util.label(ctx, `${game.city.districtAt(game.player.x, game.player.y).toUpperCase()}  /  ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, center, 45, 10, '#c4d6c4', 700, 'center');
      if (game.police.stars) {
        VM.util.panel(ctx, center - 140, 66, 280, 33, '#253139ed', '#ec9f9635', 6);
        ctx.fillStyle = '#ed8892'; ctx.fillRect(center - 124, 77, 3, 10); ctx.fillStyle = '#91b5e2'; ctx.fillRect(center - 118, 77, 3, 10);
        VM.util.label(ctx, game.police.seen ? 'BREAK LINE OF SIGHT' : `STAY HIDDEN  /  ${Math.floor(game.police.hiddenTime)}s`, center + 4, 87, 10, '#edc3a3', 800, 'center');
      }
    }
    vehicle(ctx) {
      const game = this.game, car = game.player.vehicle, x = game.width - 254, y = game.height - 183;
      VM.util.panel(ctx, x, y, 228, 145, '#0f2932ed', '#b1d4bf30', 9);
      VM.util.trackedText(ctx, car.spec.name.toUpperCase(), x + 16, y + 22, 1.4, 10, '#b5d7c2');
      const cx = x + 76, cy = y + 90;
      ctx.lineWidth = 4; ctx.strokeStyle = '#a5c9b02c'; ctx.beginPath(); ctx.arc(cx, cy, 41, Math.PI * .7, Math.PI * 2.3); ctx.stroke();
      ctx.strokeStyle = '#9fe4c4'; ctx.beginPath(); ctx.arc(cx, cy, 41, Math.PI * .7, Math.PI * .7 + Math.PI * 1.6 * Math.min(1, Math.abs(car.speed) / car.spec.maxSpeed)); ctx.stroke();
      VM.util.label(ctx, String(Math.round(Math.abs(car.speed) * .45)).padStart(2, '0'), cx, cy + 8, 34, '#f4f2df', 800, 'center');
      VM.util.label(ctx, 'KM/H', cx, cy + 25, 8, '#9ebbad', 700, 'center');
      VM.util.label(ctx, car.speed < -3 ? 'R' : Math.abs(car.speed) < 3 ? 'N' : `D${Math.min(5, 1 + Math.floor(Math.abs(car.speed) / 75))}`, x + 162, y + 64, 24, '#f2d69b', 800, 'center');
      VM.util.label(ctx, 'ENGINE', x + 137, y + 91, 8, '#94b5a7', 700); this.bar(ctx, x + 137, y + 99, 72, car.hp / car.spec.hp, '#a6d9b7');
      VM.util.label(ctx, 'F / EXIT', x + 137, y + 122, 9, '#bacabe', 700);
      VM.util.label(ctx, 'RADIO COBRE  /  93.4 FM', x + 12, game.height - 20, 9, '#a4c6b2', 700);
    }
    weapon(ctx) {
      const game = this.game, player = game.player, x = game.width - 209, y = game.height - 127;
      VM.util.panel(ctx, x, y, 183, 89, '#112b33ed', '#b6d3bd30', 9);
      ctx.fillStyle = '#cad8c5'; ctx.fillRect(x + 17, y + 25, 30, 7); ctx.fillRect(x + 19, y + 30, 7, 17); ctx.fillRect(x + 14, y + 24, 6, 11);
      VM.util.label(ctx, player.reloadTimer > 0 ? '…' : String(player.ammo).padStart(2, '0'), x + 67, y + 44, 31, '#f3efd9', 800);
      VM.util.label(ctx, `/ ${String(player.reserve).padStart(3, '0')}`, x + 116, y + 41, 13, '#a1bfb0', 700);
      VM.util.trackedText(ctx, player.reloadTimer > 0 ? 'RELOADING' : 'NOVA 9 / PISTOL', x + 17, y + 69, 1.3, 8, '#c4d4ba');
      if (player.stamina < 98) this.bar(ctx, x + 17, y + 79, 150, player.stamina / 100, '#99dcb9');
    }
    prompt(ctx) {
      const game = this.game; let point = null, action = '';
      if (game.missions.canInteract()) { point = game.missions.marker; action = `E  ${point.action}`; }
      else if (game.activities.nearestService()) { point = game.activities.nearestService(); action = `E  ${point.action}`; }
      else if (!game.player.vehicle) { const car = game.vehicles.nearest(game.player, 66); if (car) { point = car; action = `F  ${car.driver ? 'STEAL' : 'ENTER'} ${car.spec.name.toUpperCase()}`; } }
      if (!point || game.story.blocking) return;
      const screen = game.camera.worldToScreen(point.x, point.y);
      ctx.font = '700 10px Arial'; const width = ctx.measureText(action).width + 28;
      const x = VM.util.clamp(screen.x - width / 2, 20, game.width - width - 20), y = VM.util.clamp(screen.y + 39, 140, game.height - 220);
      VM.util.panel(ctx, x, y, width, 28, '#102b33f1', '#9bdabc70', 5); VM.util.label(ctx, action, x + 14, y + 18, 10, '#ceefd3', 700);
    }
    notices(ctx) {
      const game = this.game;
      if (game.missions.completion) {
        const completed = game.missions.completion, x = game.width / 2 - 224;
        VM.util.panel(ctx, x, 180, 448, 102, '#13342cef', '#b0edbd80', 8);
        VM.util.trackedText(ctx, 'CONTRACT COMPLETE', x + 24, 205, 3.1, 11, '#acedd0');
        VM.util.label(ctx, completed.name, x + 24, 234, 21, '#f1edd1', 800);
        VM.util.label(ctx, `+$${completed.reward.toLocaleString('en-US')}   /   REPUTATION +12`, x + 24, 261, 11, '#bbd5b4', 700);
      }
      if (!game.story.blocking && !game.story.radioLine) {
        game.toasts.slice(-2).forEach((toast, index) => {
          ctx.font = '600 11px Arial'; const width = Math.min(600, ctx.measureText(toast.text).width + 36), x = (game.width - width) / 2, y = game.height - 83 - index * 32;
          VM.util.panel(ctx, x, y, width, 26, '#102c34e8', '#8eb5a630', 5); VM.util.label(ctx, toast.text, game.width / 2, y + 17, 11, toast.color, 600, 'center');
        });
      }
    }
    crosshair(ctx) {
      const game = this.game;
      if (game.story.blocking || game.paused || game.player.dead) return;
      const { x, y } = game.input.mouse;
      ctx.strokeStyle = '#e8efd4cf'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x + dx * 10, y + dy * 10); } ctx.stroke();
      ctx.fillStyle = '#a0e8c5'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    draw(ctx) {
      const game = this.game;
      if (game.mode === 'title' || game.ui?.map) return;
      this.objective(ctx); this.vitals(ctx); this.location(ctx); game.minimap.draw(ctx);
      if (game.player.vehicle) this.vehicle(ctx); else this.weapon(ctx);
      this.prompt(ctx); this.notices(ctx); this.crosshair(ctx);
      VM.util.label(ctx, game.player.vehicle ? 'WASD DRIVE    SPACE HANDBRAKE    H HORN    F EXIT    TAB MAP    ESC PAUSE'
        : 'WASD MOVE    SHIFT SPRINT    LMB FIRE    E INTERACT / PUNCH    R RELOAD    F STEAL    TAB MAP', game.width / 2, game.height - 17, 9, '#d0ddc2ae', 600, 'center');
    }
  }
  VM.StreetHUD = StreetHUD;
  VM.installers.push(game => { game.hud = new StreetHUD(game); game.screenDraw.push(ctx => game.hud.draw(ctx)); });
})();
