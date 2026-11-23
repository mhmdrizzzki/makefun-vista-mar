// Vista Mar: Low Tide — CoastalRenderer: cached handmade architecture, painter-sorted actors, and atmospheric lighting.
(() => {
  class CoastalRenderer {
    constructor(game) { this.game = game; this.night = 0; this.entityDecorators = []; }
    getNight() { return VM.util.clamp((Math.cos(this.game.dayPhase * Math.PI * 2) + .04) * 1.1, 0, .92); }
    entities() {
      const game = this.game;
      return [...(game.vehicles?.list || []), ...(game.pedestrians?.list || []),
        ...(game.police?.officers || []), ...(game.combat?.hostiles || []), game.player]
        .filter(entity => entity && !entity.removed && game.city.visible(entity, game.camera, 110))
        .sort((a, b) => a.y - b.y);
    }
    draw(ctx) {
      const game = this.game, camera = game.camera, city = game.city;
      this.night = this.getNight();
      ctx.fillStyle = '#327786'; ctx.fillRect(0, 0, game.width, game.height);
      ctx.save(); camera.apply(ctx);
      ctx.drawImage(city.ground, 0, 0); city.drawWater(ctx, camera, game.visualTime);
      game.particles?.drawGround(ctx);
      ctx.drawImage(city.architecture, 0, 0);
      for (const draw of game.worldDraw) draw(ctx);
      for (const entity of this.entities()) entity.draw?.(ctx);
      city.drawTrees(ctx, camera); city.drawSignals(ctx, camera);
      game.particles?.drawAbove(ctx); game.combat?.draw(ctx);
      for (const draw of this.entityDecorators) draw(ctx);
      ctx.restore();
      if (this.night > 0) { ctx.fillStyle = `rgba(10,20,42,${this.night * .53})`; ctx.fillRect(0, 0, game.width, game.height); }
      const warm = VM.util.clamp(1 - Math.min(Math.abs(game.dayPhase - .24), Math.abs(game.dayPhase - .76)) / .16, 0, 1);
      if (warm > 0) {
        const sunset = ctx.createLinearGradient(0, game.height, game.width, 0);
        sunset.addColorStop(0, `rgba(233,139,107,${warm * .13})`); sunset.addColorStop(1, `rgba(255,209,131,${warm * .06})`);
        ctx.fillStyle = sunset; ctx.fillRect(0, 0, game.width, game.height);
      }
      ctx.save(); camera.apply(ctx);
      city.drawLights(ctx, camera, this.night);
      game.vehicles?.drawLights(ctx, this.night);
      game.particles?.drawLights(ctx);
      for (const draw of game.lightDraw) draw(ctx, this.night);
      ctx.restore();
      const vignette = ctx.createRadialGradient(game.width / 2, game.height * .48, game.height * .22,
        game.width / 2, game.height * .48, game.width * .72);
      vignette.addColorStop(0, '#06192700'); vignette.addColorStop(1, '#06192766');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, game.width, game.height);
      if (!game.hud) this.drawEarlyInterface(ctx);
    }
    drawEarlyInterface(ctx) {
      const game = this.game;
      if (game.mode === 'title') {
        const fade = ctx.createLinearGradient(0, 0, game.width * .75, 0); fade.addColorStop(0, '#102a30ef'); fade.addColorStop(1, '#102a3000');
        ctx.fillStyle = fade; ctx.fillRect(0, 0, game.width, game.height);
        VM.util.label(ctx, 'VISTA MAR', 55, 205, 94, '#f6f0de', 900);
        VM.util.trackedText(ctx, 'LOW TIDE', 60, 252, 9, 20, '#ff9d80');
        VM.util.label(ctx, 'The city is yours. The debt isn’t.', 60, 320, 20, '#e4e8d9', 400);
        VM.util.panel(ctx, 60, 380, 218, 54, '#89eac6');
        VM.util.label(ctx, 'ENTER / NEW GAME', 84, 414, 15, '#163137', 800);
      } else {
        VM.util.panel(ctx, 24, 24, 280, 64);
        VM.util.label(ctx, 'SOL VEGA', 40, 50, 12, '#8cf0cd', 800);
        VM.util.label(ctx, `${Math.round(game.player.health)} HP  ·  $${game.cash}`, 40, 73, 14);
        VM.util.label(ctx, 'WASD move · Shift sprint · Mouse aim · Enter starts', 28, game.height - 26, 12);
      }
    }
  }
  VM.CoastalRenderer = CoastalRenderer;
  VM.installers.push(game => { game.renderer = new CoastalRenderer(game); });
})();
