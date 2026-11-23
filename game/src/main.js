// Vista Mar: Low Tide — simulation host, sequential module boot, system installation, and frame readiness.
const ORIGINAL_FEATURE_MODULES = [
  'config', 'utils', 'input', 'city', 'world', 'camera', 'player', 'render',
  'vehicles', 'traffic', 'pedestrians', 'particles', 'audio', 'combat', 'police',
  'story', 'missions', 'minimap', 'hud', 'save', 'ui', 'shots', 'activities', 'polish',
];
window.VM = { installers: [], modules: [], CONFIG: null, util: null, game: null };

async function loadOriginalModule(name) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `./src/${name}.js`;
    script.onload = () => { window.VM.modules.push(name); resolve(); };
    script.onerror = () => reject(new Error(`Feature ${name} is not installed yet.`));
    document.head.appendChild(script);
  });
}

class VistaMarGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.input = new VM.DesktopInput(canvas);
    this.params = new URLSearchParams(location.search);
    this.seed = Number(this.params.get('seed')) || VM.CONFIG.seed;
    this.rng = new VM.util.SeededRandom(this.seed);
    this.systems = []; this.events = new Map(); this.toasts = [];
    this.worldDraw = []; this.screenDraw = []; this.lightDraw = [];
    this.mode = 'title'; this.staged = false; this.paused = false;
    this.time = 0; this.visualTime = 0; this.dayPhase = .28; this.frameCount = 0;
    this.cash = 350; this.reputation = 0;
    this.stats = { distance: 0, stolen: 0, shots: 0, escapes: 0, missions: 0, wrecks: 0 };
    this.width = 1280; this.height = 720; this.pixelRatio = 1; this.lastTime = 0;
    this.resize(); addEventListener('resize', () => this.resize());
    for (const install of VM.installers) install(this);
    this.emit('ready');
    document.getElementById('loading').classList.add('hidden');
    this.canvas.focus();
  }
  resize() {
    this.width = innerWidth; this.height = innerHeight;
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.emit?.('resize');
  }
  addSystem(name, system, priority = 50) {
    this.systems.push({ name, system, priority }); this.systems.sort((a, b) => a.priority - b.priority);
  }
  on(name, callback) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(callback);
  }
  emit(name, data) { for (const callback of this.events.get(name) || []) callback(data); }
  notify(text, color = VM.CONFIG.colors.aqua, duration = 4) {
    this.toasts.push({ text, color, life: duration });
    if (this.toasts.length > 4) this.toasts.shift();
  }
  update(dt) {
    this.visualTime += this.staged ? 0 : dt;
    if (!this.paused && !this.staged) {
      this.time += dt;
      if (this.mode === 'play') this.dayPhase = (this.dayPhase + dt / VM.CONFIG.dayLength) % 1;
      for (const { system } of this.systems) system.update?.(dt);
      for (const toast of this.toasts) toast.life -= dt;
      this.toasts = this.toasts.filter(toast => toast.life > 0);
    }
    for (const { system } of this.systems) system.interface?.(dt);
  }
  draw() {
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    if (this.renderer) this.renderer.draw(this.ctx);
    else {
      this.ctx.fillStyle = '#10282c'; this.ctx.fillRect(0, 0, this.width, this.height);
      VM.util.label(this.ctx, 'VISTA MAR', 60, 150, 88, '#a0f1d6', 900);
      VM.util.trackedText(this.ctx, 'LOW TIDE / THE COAST IS TAKING SHAPE', 64, 198, 3, 13);
      VM.util.label(this.ctx, `${VM.modules.length} original systems installed`, 64, 260, 17);
    }
    for (const draw of this.screenDraw) draw(this.ctx);
    this.frameCount++;
    if (this.params.has('shot') && this.frameCount >= 8) window.__SHOT_READY__ = true;
  }
  snapshot() {
    return { mode: this.mode, cash: this.cash, wanted: this.police?.stars || 0,
      mission: this.missions?.index || 0, objective: this.missions?.objective || '',
      health: this.player?.health, position: this.player && { x: this.player.x, y: this.player.y },
      vehicle: this.player?.vehicle?.type || null, traffic: this.vehicles?.list.length || 0,
      pedestrians: this.pedestrians?.list.length || 0, cops: this.police?.units.length || 0,
      frames: this.frameCount, seed: this.seed, modules: VM.modules.length };
  }
  loop(timestamp) {
    const dt = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, .04) : 1 / 60;
    this.lastTime = timestamp; this.update(dt); this.draw(); this.input.endFrame();
    requestAnimationFrame(next => this.loop(next));
  }
}

async function bootVistaMar() {
  for (const name of ORIGINAL_FEATURE_MODULES) {
    try { await loadOriginalModule(name); }
    catch (error) { console.info(error.message); }
  }
  const game = new VistaMarGame(document.getElementById('game'));
  VM.game = game; window.__VISTA_MAR__ = game;
  requestAnimationFrame(timestamp => game.loop(timestamp));
}
bootVistaMar().catch(error => {
  document.getElementById('loading').textContent = `Vista Mar could not start: ${error.message}`;
  console.error(error);
});
