// CanvasMenus: original title art, keyboard/mouse menus, controls, city atlas, respawn, and campaign epilogue.
(() => {
  const CONTROL_REFERENCE = [
    ['WASD / ARROWS', 'Move / accelerate, reverse, steer'], ['MOUSE / LMB', 'Aim / fire the Nova 9 pistol'],
    ['SHIFT', 'Sprint on foot'], ['F', 'Steal, enter, or exit any vehicle'], ['E', 'Interact / punch'],
    ['SPACE', 'Handbrake / advance dialogue'], ['R', 'Reload pistol'], ['H', 'Honk the vehicle horn'],
    ['TAB', 'Full map / click to set waypoint'], ['ESC', 'Pause / resume'], ['M', 'Toggle synthesized audio'],
  ];
  class CanvasMenus {
    constructor(game) {
      this.game = game; this.menu = null; this.map = false; this.buttons = []; this.selection = 0;
      this.returnMenu = null; this.downReason = null; this.downTimer = 0;
      game.on('player-down', reason => { this.downReason = reason; this.downTimer = 3.5; game.mode = 'downed'; game.paused = true; game.audio.play('fail'); });
      game.on('campaign-finished', () => { this.menu = 'victory'; this.selection = 0; game.paused = true; game.save.save(); });
    }
    newGame() {
      const game = this.game;
      this.menu = null; this.map = false; this.selection = 0; this.downReason = null;
      game.staged = false; game.camera.locked = false; game.mode = 'play'; game.paused = false;
      game.player.respawn(); game.police.clear(); game.combat.bullets = []; game.combat.hostiles = [];
      game.cash = 350; game.reputation = 0; game.time = 0; game.dayPhase = .4;
      game.stats = { distance: 0, stolen: 0, shots: 0, escapes: 0, missions: 0, wrecks: 0, postcards: 0, couriers: 0 };
      game.activities.restore({}); game.missions.reset(); game.toasts = []; game.customWaypoint = null;
      for (const pickup of game.world.pickups) { pickup.active = true; pickup.respawn = 0; }
      game.story.intro(() => game.missions.start(0)); game.audio.play('menu');
    }
    resume() { this.menu = null; this.selection = 0; this.game.paused = this.game.story.blocking; }
    respawn() {
      const game = this.game; game.cash = Math.max(0, game.cash - Math.min(250, game.cash));
      game.player.respawn(); game.police.clear(); game.combat.bullets = []; game.missions.retryAfterDeath();
      this.downReason = null; this.downTimer = 0; this.menu = null; this.map = false;
      game.mode = 'play'; game.paused = false; game.notify('Back at Casa Vega. Every coast has a second chance.');
    }
    openControls(from = this.menu || 'title') { this.returnMenu = from; this.menu = 'controls'; this.selection = 0; if (this.game.mode !== 'title') this.game.paused = true; }
    closeControls() { this.menu = this.returnMenu === 'title' ? null : this.returnMenu; this.selection = 0; this.game.paused = Boolean(this.menu) || this.game.story.blocking; }
    interface(dt) {
      const game = this.game, input = game.input;
      if (input.take('KeyM')) { const muted = game.audio.toggle(); game.notify(muted ? 'Audio muted.' : 'Audio on.'); }
      if (game.mode === 'downed') {
        this.downTimer -= dt;
        if (this.downTimer <= 0 || input.take('Enter') || input.take('Space')) this.respawn();
      }
      if (input.take('Tab') && game.mode === 'play' && !this.menu && !game.story.blocking) {
        this.map = !this.map; game.paused = this.map; game.audio.play('menu');
      }
      if (input.take('Escape')) {
        if (this.map) { this.map = false; game.paused = game.story.blocking; }
        else if (this.menu === 'controls') this.closeControls();
        else if (this.menu === 'pause') this.resume();
        else if (game.mode === 'play' && !this.menu) { this.menu = 'pause'; this.selection = 0; game.paused = true; }
        game.audio.play('menu');
      }
      if (this.map) {
        if (input.mouse.clicked) game.minimap.setWaypoint(input.mouse.x, input.mouse.y);
        if (input.take('Backspace')) game.customWaypoint = null;
        return;
      }
      if (game.mode === 'title' && !this.menu) {
        if (input.take('Enter') || input.take('Space')) { this.newGame(); return; }
        if (input.take('KeyC')) this.openControls('title');
      }
      if (this.menu) {
        if (input.take('ArrowDown') || input.take('KeyS')) this.selection = (this.selection + 1) % Math.max(1, this.buttons.length);
        if (input.take('ArrowUp') || input.take('KeyW')) this.selection = (this.selection - 1 + this.buttons.length) % Math.max(1, this.buttons.length);
        if (input.take('Enter') && this.buttons[this.selection]) { this.buttons[this.selection].action(); game.audio.play('menu'); return; }
      }
      if (input.mouse.clicked) {
        const button = this.buttons.find(b => input.mouse.x >= b.x && input.mouse.x <= b.x + b.w && input.mouse.y >= b.y && input.mouse.y <= b.y + b.h);
        if (button) { button.action(); game.audio.play('menu'); }
      }
    }
    button(ctx, text, x, y, w, h, action, primary = false, note = '') {
      const mouse = this.game.input.mouse, index = this.buttons.length;
      const hover = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h;
      const selected = Boolean(this.menu) && this.selection === index;
      VM.util.panel(ctx, x, y, w, h, primary || selected || hover ? '#a1eac6' : '#1b3a3bdd', primary || selected ? '#c7f5d7' : '#bad4bf55', 6);
      VM.util.label(ctx, text, x + 21, y + h / 2 + 5, 12, primary || selected || hover ? '#143035' : '#e3e8d1', 800);
      VM.util.label(ctx, '→', x + w - 21, y + h / 2 + 6, 19, primary || selected || hover ? '#143035' : '#bddcbd', 600, 'right');
      if (note) VM.util.label(ctx, note, x + w - 44, y + h / 2 + 4, 9, primary || selected || hover ? '#315347' : '#94b2a3', 600, 'right');
      this.buttons.push({ x, y, w, h, action });
    }
    emblem(ctx, x, y) {
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#aae5c6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, -7); ctx.lineTo(11, 0); ctx.lineTo(0, 10); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(0, -1); ctx.lineTo(6, 3); ctx.stroke(); ctx.restore();
    }
    titlePalm(ctx, x, y, height) {
      ctx.save(); ctx.globalAlpha = .16; ctx.strokeStyle = '#75a990'; ctx.fillStyle = '#75a990'; ctx.lineCap = 'round';
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - height * .6, x + 22, y - height); ctx.stroke();
      for (let n = 0; n < 7; n++) {
        const angle = -Math.PI + n * .48, length = 64 + n % 2 * 22, tx = x + 22, ty = y - height;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(angle) * 35, ty + Math.sin(angle) * 24 - 15, tx + Math.cos(angle) * length, ty + Math.sin(angle) * length * .5 + 12);
        ctx.quadraticCurveTo(tx + Math.cos(angle) * 31, ty + Math.sin(angle) * 10 + 15, tx, ty); ctx.fill();
      }
      ctx.restore();
    }
    drawTitle(ctx) {
      const game = this.game, h = game.height, scale = Math.min(1, h / 720);
      const gradient = ctx.createLinearGradient(0, 0, game.width * .77, 0);
      gradient.addColorStop(0, '#0c2932fa'); gradient.addColorStop(.42, '#102d31eb'); gradient.addColorStop(.76, '#102d316d'); gradient.addColorStop(1, '#102d3100');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, game.width, h);
      this.titlePalm(ctx, 3, h + 30, 230); this.titlePalm(ctx, 400, h + 73, 270);
      ctx.save(); ctx.scale(scale, scale);
      this.emblem(ctx, 75, 50); VM.util.trackedText(ctx, 'AN ORIGINAL OPEN-WORLD CRIME GAME', 98, 55, 2.2, 9, '#a1c8b4');
      ctx.font = 'italic 900 117px Arial, Helvetica, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = '#f6eed5'; ctx.fillText('VISTA', 54, 213);
      ctx.fillStyle = '#f4a187'; ctx.fillText('MAR', 54, 323);
      ctx.strokeStyle = '#b9dfb947'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(64, 350); ctx.lineTo(471, 350); ctx.stroke();
      VM.util.trackedText(ctx, 'LOW', 383, 279, 7.2, 18, '#b4e6c5'); VM.util.trackedText(ctx, 'TIDE', 383, 312, 7.2, 18, '#b4e6c5');
      VM.util.label(ctx, 'The city is yours.', 64, 404, 25, '#f0ead5', 600);
      VM.util.label(ctx, 'The debt isn’t.', 64, 437, 25, '#b2e8c6', 600);
      VM.util.label(ctx, 'Six jobs. One coast. No clean exits.', 66, 474, 13, '#9ab9a7', 400);
      ctx.restore();
      this.button(ctx, 'NEW GAME', 64 * scale, 515 * scale, 263 * scale, 56 * scale, () => this.newGame(), true);
      if (game.save.has()) this.button(ctx, 'CONTINUE', 343 * scale, 515 * scale, 153 * scale, 56 * scale, () => { if (game.save.load()) this.resume(); });
      else this.button(ctx, 'CONTROLS', 343 * scale, 515 * scale, 145 * scale, 56 * scale, () => this.openControls('title'));
      VM.util.trackedText(ctx, 'WASD MOVE   /   F STEAL   /   MOUSE AIM', 65 * scale, h - 57, 1.4, 9, '#abc7b0');
      VM.util.label(ctx, 'VISTA MAR : LOW TIDE  /  ALL ART & AUDIO GENERATED IN-GAME', 65 * scale, h - 28, 8, '#73988a', 600);
      const x = game.width - 305;
      VM.util.panel(ctx, x, 34, 270, 70, '#142f34dc', '#d8deba47', 7);
      this.emblem(ctx, x + 28, 61); VM.util.trackedText(ctx, 'COBRE / VISTA MAR', x + 48, 61, 1.5, 10, '#d1dfbf');
      VM.util.label(ctx, 'THE COAST, AT GOLDEN HOUR', x + 48, 84, 9, '#9ab9a8', 600);
      const bx = game.width - 342, by = h - 179;
      VM.util.panel(ctx, bx, by, 307, 121, '#122e34e8', '#b9d0b944', 7); ctx.fillStyle = '#e99f80'; ctx.fillRect(bx, by + 15, 3, 89);
      VM.util.trackedText(ctx, '01—06 / STORY CONTRACTS', bx + 21, by + 27, 1.8, 9, '#dfb18b');
      VM.util.label(ctx, 'STEAL. DRIVE. DISAPPEAR.', bx + 21, by + 58, 17, '#f2ecd4', 800);
      VM.util.label(ctx, '16 BLOCKS   /   6 VEHICLE TYPES', bx + 21, by + 84, 9, '#b3cbb2', 700);
      VM.util.label(ctx, 'A LIVING CITY   /   FIVE LEVELS OF HEAT', bx + 21, by + 103, 9, '#95b29f', 600);
    }
    backdrop(ctx) { ctx.fillStyle = '#081f2bd9'; ctx.fillRect(0, 0, this.game.width, this.game.height); }
    drawPause(ctx) {
      const game = this.game, x = game.width / 2 - 211, y = game.height / 2 - 236;
      this.backdrop(ctx); VM.util.panel(ctx, x, y, 422, 472, '#143338f5', '#aed5bd56', 11);
      VM.util.trackedText(ctx, 'VISTA MAR / PAUSED', x + 28, y + 37, 2.4, 12, '#b5e8c7');
      VM.util.label(ctx, 'Even this city needs a breath.', x + 28, y + 67, 15, '#a3bdac', 400);
      this.button(ctx, 'RESUME', x + 27, y + 94, 368, 51, () => this.resume());
      this.button(ctx, 'SAVE GAME', x + 27, y + 157, 368, 51, () => game.save.save(), false, 'LOCAL SLOT');
      this.button(ctx, 'LOAD GAME', x + 27, y + 220, 368, 51, () => { if (game.save.load()) this.resume(); });
      this.button(ctx, 'CONTROLS', x + 27, y + 283, 368, 51, () => this.openControls('pause'));
      this.button(ctx, 'RETURN TO TITLE', x + 27, y + 346, 368, 51, () => { this.menu = null; game.mode = 'title'; game.paused = false; game.story.blocking = false; });
      VM.util.label(ctx, 'ARROWS + ENTER / MOUSE     ESC / RESUME', x + 28, y + 442, 9, '#91b3a1', 700);
    }
    drawControls(ctx) {
      const game = this.game, x = game.width / 2 - 311, y = game.height / 2 - 294;
      this.backdrop(ctx); VM.util.panel(ctx, x, y, 622, 590, '#143238f5', '#b5d8be56', 11);
      VM.util.trackedText(ctx, 'KNOW YOUR WAY AROUND', x + 30, y + 39, 2.6, 13, '#b6e6c3');
      CONTROL_REFERENCE.forEach(([key, action], i) => {
        const py = y + 78 + i * 36; VM.util.panel(ctx, x + 30, py - 14, 151, 26, '#214b44', '#b5d7b63b', 4);
        VM.util.label(ctx, key, x + 41, py + 3, 10, '#c3e8c7', 800); VM.util.label(ctx, action, x + 201, py + 3, 12, '#d4dbc4', 400);
      });
      VM.util.label(ctx, 'Hide behind buildings to lose heat. Rojas Motor repairs and resprays.', x + 30, y + 502, 11, '#9cbaa6', 400);
      this.button(ctx, 'BACK TO THE COAST', x + 30, y + 527, 562, 39, () => this.closeControls(), true);
    }
    drawDown(ctx) {
      const game = this.game; ctx.fillStyle = this.downReason === 'BUSTED' ? '#162738d9' : '#38282bd4'; ctx.fillRect(0, 0, game.width, game.height);
      VM.util.trackedText(ctx, 'EVERY COAST HAS A SECOND CHANCE', game.width / 2 - 186, game.height / 2 - 78, 2.3, 10, '#d2c1a0');
      VM.util.label(ctx, this.downReason || 'WASTED', game.width / 2, game.height / 2 - 5, 74, '#f0b08d', 900, 'center');
      VM.util.label(ctx, `Back at Casa Vega in ${Math.max(1, Math.ceil(this.downTimer))}s  /  recovery costs up to $250`, game.width / 2, game.height / 2 + 37, 13, '#d3ccae', 400, 'center');
      this.button(ctx, 'GET BACK UP', game.width / 2 - 128, game.height / 2 + 71, 256, 48, () => this.respawn(), true);
    }
    drawVictory(ctx) {
      const game = this.game, x = game.width / 2 - 310, y = game.height / 2 - 233;
      this.backdrop(ctx); VM.util.panel(ctx, x, y, 620, 468, '#17382df5', '#b1e8bd80', 12);
      VM.util.trackedText(ctx, 'SIX CONTRACTS / ONE COAST', x + 35, y + 41, 3, 12, '#b8e9bd');
      VM.util.label(ctx, 'THE COAST IS OURS.', x + 35, y + 98, 37, '#f4edcd', 900);
      VM.util.label(ctx, 'Sol Vega and Inés Rojas kept the harbor off the auction block.', x + 35, y + 132, 13, '#b1c6a6', 400);
      game.story.portrait(ctx, x + 35, y + 157, 75, 'Sol Vega'); game.story.portrait(ctx, x + 121, y + 157, 75, 'Inés Rojas');
      VM.util.label(ctx, `$${game.cash.toLocaleString('en-US')}`, x + 230, y + 184, 30, '#bbe8be', 800);
      VM.util.label(ctx, `${game.stats.stolen} CARS BORROWED  /  ${game.stats.escapes} PATROLS LOST`, x + 231, y + 212, 10, '#b2c9a4', 700);
      VM.util.label(ctx, `${(game.stats.distance / 1000).toFixed(1)} KM TRAVELED  /  ${game.stats.postcards}/8 POSTCARDS`, x + 231, y + 233, 10, '#b2c9a4', 700);
      VM.util.label(ctx, 'The story is over. The city is still yours to explore.', x + 35, y + 280, 14, '#dde1bf', 400);
      this.button(ctx, 'KEEP THE COAST / FREE ROAM', x + 35, y + 308, 550, 54, () => { this.resume(); game.police.clear(); game.notify('Free roam unlocked. Take your time.'); }, true);
      this.button(ctx, 'START A NEW STORY', x + 35, y + 377, 550, 48, () => this.newGame());
    }
    draw(ctx) {
      this.buttons = [];
      if (this.map) { this.game.minimap.drawFull(ctx); return; }
      if (this.menu === 'controls') this.drawControls(ctx);
      else if (this.menu === 'pause') this.drawPause(ctx);
      else if (this.menu === 'victory') this.drawVictory(ctx);
      else if (this.game.mode === 'downed') this.drawDown(ctx);
      else if (this.game.mode === 'title') this.drawTitle(ctx);
    }
  }
  VM.CONTROL_REFERENCE = CONTROL_REFERENCE; VM.CanvasMenus = CanvasMenus;
  VM.installers.push(game => { game.ui = new CanvasMenus(game); game.addSystem('canvas menus and respawn', game.ui, 100); game.screenDraw.push(ctx => game.ui.draw(ctx)); });
})();
