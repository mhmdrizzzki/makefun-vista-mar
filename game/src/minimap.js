// Vista Mar: Low Tide — CoastalMinimap: local navigation, street-graph GPS, entity blips, and full-city atlas.
(() => {
  class CoastalMinimap {
    constructor(game) { this.game = game; this.radius = 89; this.fullBounds = null; }
    marker() { return this.game.activities?.marker || this.game.missions.marker || this.game.customWaypoint; }
    paintMap(ctx) {
      ctx.fillStyle = '#17373c'; ctx.fillRect(0, 0, 3200, 3200);
      ctx.fillStyle = '#286575'; ctx.fillRect(2830, 0, 370, 3200);
      ctx.fillStyle = '#344f49'; ctx.fillRect(2720, 2500, 300, 340);
      for (const block of this.game.city.blocks) {
        ctx.fillStyle = block.kind === 'park' ? '#4c6e54' : '#27454a'; ctx.fillRect(block.x, block.y, block.w, block.h);
      }
      for (const road of this.game.city.roads) {
        ctx.fillStyle = '#698885'; ctx.fillRect(road - 55, 0, 110, 3200); ctx.fillRect(0, road - 55, 2820, 110);
        ctx.fillStyle = '#91a398'; ctx.fillRect(road - 3, 0, 6, 3200); ctx.fillRect(0, road - 3, 2820, 6);
      }
      ctx.fillStyle = '#162e36';
      for (const b of this.game.city.buildings) ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    drawRoute(ctx, marker, width = 8) {
      if (!marker) return;
      const player = this.game.player, route = this.game.police.buildRoute(player, marker);
      ctx.save(); ctx.strokeStyle = marker.hostile ? '#f0a08f' : '#9be6c8'; ctx.lineWidth = width;
      ctx.setLineDash([19, 13]); ctx.beginPath(); ctx.moveTo(player.x, player.y);
      for (const node of route) ctx.lineTo(node.x, node.y);
      ctx.lineTo(marker.x, marker.y); ctx.stroke(); ctx.restore();
    }
    draw(ctx) {
      const game = this.game, cx = 130, cy = game.height - 125, radius = this.radius, scale = .164;
      ctx.save(); ctx.shadowColor = '#07192466'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#102b34f2'; ctx.beginPath(); ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-game.player.x, -game.player.y);
      this.paintMap(ctx); this.drawRoute(ctx, this.marker(), 12); ctx.restore();
      const blip = (point, color, size, edge = false, shape = 'circle') => {
        let x = (point.x - game.player.x) * scale, y = (point.y - game.player.y) * scale;
        const d = Math.hypot(x, y);
        if (d > radius - 8) { if (!edge) return; x *= (radius - 10) / d; y *= (radius - 10) / d; }
        ctx.fillStyle = color; ctx.strokeStyle = '#102c33'; ctx.lineWidth = 1.3;
        if (shape === 'diamond') { ctx.beginPath(); ctx.moveTo(cx + x, cy + y - size); ctx.lineTo(cx + x + size, cy + y); ctx.lineTo(cx + x, cy + y + size); ctx.lineTo(cx + x - size, cy + y); ctx.closePath(); }
        else { ctx.beginPath(); ctx.arc(cx + x, cy + y, size, 0, Math.PI * 2); }
        ctx.fill(); ctx.stroke();
      };
      for (const car of game.vehicles.list) if (!car.wrecked && !car.removed && car !== game.player.vehicle) blip(car, car.driver === 'police' ? '#f38f92' : '#d8dac5', 2.3);
      for (const officer of game.police.officers) if (!officer.dead) blip(officer, '#f39b98', 2.6);
      for (const guard of game.combat.hostiles) if (!guard.dead) blip(guard, '#ffba8d', 2.8);
      blip(VM.CONFIG.safehouse, '#a0e4c4', 4, false, 'diamond');
      blip(VM.CONFIG.garage, '#9de1c8', 3.3, false, 'diamond');
      for (const card of game.activities?.postcards || []) if (!card.collected) blip(card, '#eacb89', 2);
      const marker = this.marker(); if (marker) blip(marker, marker.hostile ? '#ff9c89' : '#9cf1c9', 6, true, 'diamond');
      ctx.translate(cx, cy); ctx.rotate((game.player.vehicle?.angle || game.player.angle) + Math.PI / 2);
      ctx.fillStyle = '#faf5dc'; ctx.strokeStyle = '#1c4e53'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#abcfbd5c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#afd6c06b'; ctx.beginPath(); ctx.arc(cx, cy, radius + 5, -.4, .1); ctx.stroke();
      VM.util.label(ctx, 'N', cx, cy - radius - 13, 10, '#c5e5d2', 800, 'center');
      VM.util.trackedText(ctx, game.city.districtAt(game.player.x, game.player.y).toUpperCase(), 43, game.height - 19, 1.8, 10, '#b8d4c5');
      const distance = marker ? Math.round(VM.util.distance(marker, game.player)) : 0;
      if (marker) VM.util.label(ctx, `${distance} M`, 217, game.height - 21, 10, '#a3dec4', 700, 'right');
    }
    drawFull(ctx) {
      const game = this.game;
      ctx.fillStyle = '#0b242ceF'; ctx.fillRect(0, 0, game.width, game.height);
      VM.util.trackedText(ctx, 'VISTA MAR / CITY ATLAS', 42, 44, 3, 15, '#a8e6ca');
      VM.util.label(ctx, 'TAB / ESC  CLOSE   ·   CLICK THE MAP TO SET A WAYPOINT', game.width - 40, 43, 10, '#acc8bd', 600, 'right');
      const size = Math.min(game.height - 130, game.width - 590), x = (game.width - size) / 2, y = 79;
      this.fullBounds = { x, y, size };
      VM.util.panel(ctx, x - 8, y - 8, size + 16, size + 16, '#183a42', '#a1dbc65a', 4);
      ctx.save(); ctx.translate(x, y); ctx.scale(size / 3200, size / 3200);
      this.paintMap(ctx); this.drawRoute(ctx, this.marker(), 18);
      const points = [{ ...VM.CONFIG.safehouse, color: '#a4edc6' }, { ...VM.CONFIG.garage, color: '#a4edc6' },
        game.activities.courierPoint, game.activities.racePoint, ...game.activities.postcards.filter(card => !card.collected).map(card => ({ ...card, color: '#e7cf8f' }))];
      const marker = this.marker(); if (marker) points.push({ ...marker, color: marker.hostile ? '#f6a195' : '#a4edc6' });
      for (const point of points) { ctx.fillStyle = point.color || '#bca6e8'; ctx.beginPath(); ctx.arc(point.x, point.y, 23, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f5f4d8'; ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 27, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      VM.util.label(ctx, 'STORY CONTRACTS', 42, 106, 12, '#92cbb7', 800);
      VM.STORY_CONTRACTS.forEach((contract, index) => {
        const done = index < game.missions.index, current = index === game.missions.index;
        VM.util.label(ctx, `${done ? '✓' : String(index + 1).padStart(2, '0')}  ${contract.name}`, 42, 143 + index * 37, 11, done ? '#98dabd' : current ? '#f1d295' : '#6f928e', 700);
      });
      VM.util.label(ctx, `${game.stats.missions} / 6 COMPLETE`, 42, 397, 11, '#b1caba', 700);
      VM.util.label(ctx, `POSTCARDS  ${game.stats.postcards} / 8`, 42, 425, 11, '#cbb889', 700);
      VM.util.label(ctx, `COURIER RUNS  ${game.activities.totalJobs}`, 42, 453, 11, '#bdaedd', 700);
      const rx = x + size + 34;
      VM.util.label(ctx, 'KNOW THE COAST', rx, 106, 12, '#92cbb7', 800);
      [['#a5ebc7', 'Story / safehouse / garage'], ['#c0afe9', 'Courier / street circuit'], ['#eacf91', 'Coastal postcards'], ['#ee9b98', 'Patrol / hostile'], ['#faf4d8', 'Sol Vega']].forEach(([color, name], index) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(rx + 5, 139 + index * 38, 4, 0, Math.PI * 2); ctx.fill();
        VM.util.label(ctx, name, rx + 20, 143 + index * 38, 10, '#c1d4c9', 600);
      });
      VM.util.label(ctx, 'FOUR NEIGHBORHOODS', rx, 390, 11, '#89b5a9', 800);
      ['Alto Sol', 'Jardín', 'Cobre', 'Puerto Viejo'].forEach((name, i) => VM.util.label(ctx, name, rx, 418 + i * 27, 13, '#d6ddc9', 400));
    }
    setWaypoint(screenX, screenY) {
      const b = this.fullBounds; if (!b || screenX < b.x || screenX > b.x + b.size || screenY < b.y || screenY > b.y + b.size) return;
      this.game.customWaypoint = { x: (screenX - b.x) / b.size * 3200, y: (screenY - b.y) / b.size * 3200, label: 'YOUR WAYPOINT' };
      this.game.audio.play('menu');
    }
  }
  VM.CoastalMinimap = CoastalMinimap;
  VM.installers.push(game => { game.minimap = new CoastalMinimap(game); });
})();
