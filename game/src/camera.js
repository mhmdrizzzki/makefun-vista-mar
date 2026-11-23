// Vista Mar: Low Tide — FollowCamera: smooth tracking, speed-sensitive framing, aiming lead, and impact shake.
(() => {
  class FollowCamera {
    constructor(game) { this.game = game; this.x = 2250; this.y = 1350; this.zoom = .66; this.trauma = 0; this.locked = false; }
    snap(x, y, zoom = 1) { this.x = x; this.y = y; this.zoom = zoom; this.trauma = 0; }
    shake(amount = 4) { this.trauma = Math.min(18, this.trauma + amount); }
    update(dt) {
      this.trauma = Math.max(0, this.trauma - dt * 20);
      if (this.locked) return;
      const game = this.game, player = game.player;
      let tx, ty, targetZoom;
      if (game.mode === 'title') {
        tx = 2250 + Math.sin(game.time * .05) * 35; ty = 1320 + Math.cos(game.time * .04) * 32; targetZoom = .66;
      } else if (player) {
        const car = player.vehicle;
        tx = player.x + (car ? car.vx * .65 : 0); ty = player.y + (car ? car.vy * .65 : 0);
        if (!car) {
          const aim = this.screenToWorld(game.input.mouse.x, game.input.mouse.y);
          tx += VM.util.clamp(aim.x - player.x, -130, 130) * .13;
          ty += VM.util.clamp(aim.y - player.y, -90, 90) * .13;
        }
        targetZoom = car ? 1 - Math.min(Math.abs(car.speed) / 1400, .19) : 1.1;
      } else return;
      const halfW = game.width / targetZoom / 2, halfH = game.height / targetZoom / 2;
      tx = VM.util.clamp(tx, halfW - 20, 3200 - halfW + 40); ty = VM.util.clamp(ty, halfH - 20, 3200 - halfH + 20);
      this.x = VM.util.lerp(this.x, tx, 1 - Math.exp(-dt * 4.7));
      this.y = VM.util.lerp(this.y, ty, 1 - Math.exp(-dt * 4.7));
      this.zoom = VM.util.lerp(this.zoom, targetZoom, 1 - Math.exp(-dt * 2.4));
    }
    apply(ctx) {
      const time = this.game.visualTime;
      ctx.translate(this.game.width / 2 + Math.sin(time * 79) * this.trauma,
        this.game.height / 2 + Math.cos(time * 91) * this.trauma * .6);
      ctx.scale(this.zoom, this.zoom); ctx.translate(-this.x, -this.y);
    }
    worldToScreen(x, y) { return { x: (x - this.x) * this.zoom + this.game.width / 2, y: (y - this.y) * this.zoom + this.game.height / 2 }; }
    screenToWorld(x, y) { return { x: (x - this.game.width / 2) / this.zoom + this.x, y: (y - this.game.height / 2) / this.zoom + this.y }; }
  }
  VM.FollowCamera = FollowCamera;
  VM.installers.push(game => { game.camera = new FollowCamera(game); game.addSystem('smooth follow camera', game.camera, 90); });
})();
