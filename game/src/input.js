// Vista Mar: Low Tide — DesktopInput: keyboard edges and canvas-space mouse aiming without pointer lock.
(() => {
  class DesktopInput {
    constructor(canvas) {
      this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
      this.mouse = { x: 640, y: 360, down: false, clicked: false, right: false };
      this.enabled = true;
      const controls = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
      addEventListener('keydown', event => {
        if (controls.includes(event.code)) event.preventDefault();
        if (!this.keys.has(event.code)) this.pressed.add(event.code);
        this.keys.add(event.code);
        window.VM.game?.audio?.unlock();
      });
      addEventListener('keyup', event => this.keys.delete(event.code));
      addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
      canvas.addEventListener('pointermove', event => {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left; this.mouse.y = event.clientY - rect.top;
      });
      canvas.addEventListener('pointerdown', event => {
        if (event.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
        if (event.button === 2) this.mouse.right = true;
        window.VM.game?.audio?.unlock(); canvas.focus();
      });
      addEventListener('pointerup', event => {
        if (event.button === 0) this.mouse.down = false;
        if (event.button === 2) this.mouse.right = false;
      });
      canvas.addEventListener('contextmenu', event => event.preventDefault());
    }
    held(...codes) { return codes.some(code => this.keys.has(code)); }
    take(code) { const had = this.pressed.has(code); this.pressed.delete(code); return had; }
    axis(negative, positive) { return Number(this.held(...positive)) - Number(this.held(...negative)); }
    endFrame() { this.pressed.clear(); this.mouse.clicked = false; }
  }
  window.VM.DesktopInput = DesktopInput;
})();
