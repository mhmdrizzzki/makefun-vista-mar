// Vista Mar: Low Tide — SeededRandom, collision geometry, and immediate-mode drawing primitives shared by all systems.
(() => {
  class SeededRandom {
    constructor(seed = 16) { this.state = seed >>> 0; }
    next() {
      this.state += 0x6D2B79F5;
      let n = this.state;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    }
    range(min, max) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.range(min, max + 1)); }
    pick(list) { return list[Math.floor(this.next() * list.length)]; }
    chance(p) { return this.next() < p; }
  }
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const circleRect = (x, y, r, b) => {
    const px = clamp(x, b.x, b.x + b.w), py = clamp(y, b.y, b.y + b.h);
    return (x - px) ** 2 + (y - py) ** 2 < r * r;
  };
  function roundedRect(ctx, x, y, w, h, r = 8) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  }
  function panel(ctx, x, y, w, h, fill = '#10262bea', stroke = '#8cf0cd25', radius = 10) {
    roundedRect(ctx, x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function label(ctx, text, x, y, size = 12, color = '#f6f0de', weight = 600, align = 'left') {
    ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }
  function trackedText(ctx, text, x, y, spacing = 3, size = 11, color = '#a9bcb6') {
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = 'left';
    for (const letter of text) { ctx.fillText(letter, x, y); x += ctx.measureText(letter).width + spacing; }
  }
  function wrapText(ctx, text, width) {
    const lines = []; let line = '';
    for (const word of text.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > width && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }
  function starPath(ctx, x, y, outer = 10, inner = 4.5) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? inner : outer;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  function segmentCircle(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(ax + dx * t - cx, ay + dy * t - cy) < r;
  }
  function hashNoise(x, y, seed = 0) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  }
  window.VM.util = { SeededRandom, clamp, lerp, distance, angleDelta, circleRect,
    roundedRect, panel, label, trackedText, wrapText, starPath, segmentCircle, hashNoise };
})();
