// CoastalCity: sixteen authored blocks, a working harbor, and a seeded architectural language.
(() => {
  const DISTRICT_NAMES = ['Alto Sol', 'Jardín', 'Cobre', 'Puerto Viejo'];
  const ROOF_PALETTE = ['#b78e77', '#89a5a0', '#bcb681', '#9a9aa7', '#c79588', '#a4b191'];
  const STREET_NAMES = ['Calle Jacaranda', 'Avenida del Sol', 'Paseo Cobre', 'Avenida Rojas', 'Malecón'];
  class CoastalCity {
    constructor(game) {
      this.game = game; this.rng = new VM.util.SeededRandom(game.seed + 1803);
      this.width = VM.CONFIG.width; this.height = VM.CONFIG.height;
      this.roads = VM.CONFIG.roads; this.roadWidth = VM.CONFIG.roadWidth;
      this.buildings = []; this.blocks = []; this.trees = []; this.lights = [];
      this.props = []; this.intersections = []; this.parkingSpaces = [];
      this.signs = []; this.watercraft = []; this.landmarks = new Map();
      this.generateGrid(); this.generateWaterfront(); this.generateOutskirts();
      this.ground = document.createElement('canvas'); this.ground.width = this.width; this.ground.height = this.height;
      this.paintGround(this.ground.getContext('2d'));
      this.architecture = document.createElement('canvas');
      this.architecture.width = this.width; this.architecture.height = this.height;
      const roofContext = this.architecture.getContext('2d');
      for (const building of this.buildings.sort((a, b) => a.y - b.y)) this.paintBuilding(roofContext, building);
      for (const prop of this.props) this.paintProp(roofContext, prop);
    }
    addBuilding(x, y, w, h, options = {}) {
      const building = { x, y, w, h, lift: this.rng.int(12, 24), color: this.rng.pick(ROOF_PALETTE),
        kind: 'apartments', name: '', accent: '#f0d28b', seed: this.rng.int(0, 9999), ...options };
      this.buildings.push(building);
      if (building.name) this.signs.push(building);
      if (building.id) this.landmarks.set(building.id, building);
      return building;
    }
    tree(x, y, palm = true, scale = 1) {
      this.trees.push({ x, y, palm, scale, angle: this.rng.range(0, Math.PI * 2), shade: this.rng.next() });
    }
    generateGrid() {
      for (let iy = 0; iy < this.roads.length; iy++) {
        for (let ix = 0; ix < this.roads.length; ix++) {
          this.intersections.push({ x: this.roads[ix], y: this.roads[iy], ix, iy, phase: (ix + iy) * 1.7 });
        }
      }
      for (let iy = 0; iy < 4; iy++) {
        for (let ix = 0; ix < 4; ix++) {
          const x = this.roads[ix] + 76, y = this.roads[iy] + 76;
          const block = { x, y, w: 438, h: 438, ix, iy, kind: 'residential' };
          this.blocks.push(block);
          if (ix === 1 && iy === 1) this.makeGarden(block);
          else if (ix === 3 && iy === 1) this.makeMarket(block);
          else if (ix === 3 && iy === 2) this.makeGarage(block);
          else if (ix === 3 && iy === 3) this.makeWarehouse(block);
          else if (ix === 0 && iy === 3) this.makeSafehouse(block);
          else if (ix === 0 && iy === 0) this.makePoliceStation(block);
          else if (ix === 2 && iy === 0) this.makeCinema(block);
          else this.makeResidential(block);
          for (let edge = 0; edge < 4; edge++) {
            const px = x + (edge % 2 ? 414 : 25), py = y + (edge < 2 ? 26 : 412);
            this.tree(px, py, true, this.rng.range(.82, 1.08));
          }
          for (let n = 0; n < 3; n++) {
            this.parkingSpaces.push({ x: x + 64 + n * 88, y: y + 442, angle: 0 });
            this.parkingSpaces.push({ x: x - 9, y: y + 83 + n * 106, angle: Math.PI / 2 });
          }
          this.props.push({ kind: 'bin', x: x + 4, y: y + 302 });
          this.props.push({ kind: 'hydrant', x: x + 434, y: y + 43 });
          this.props.push({ kind: 'bench', x: x + 149, y: y - 4 });
        }
      }
      for (const road of this.roads) {
        for (let p = 168; p < 2960; p += 155) {
          if (this.roads.some(cross => Math.abs(cross - p) < 94)) continue;
          this.lights.push({ x: road - 77, y: p, radius: 105 });
          this.lights.push({ x: p, y: road + 77, radius: 105 });
        }
      }
    }
    makeResidential(b) {
      const names = ['CAFÉ NUBE', 'BOTICA LUZ', 'CASA MANGO', 'PAN & SOL', 'RADIO COBRE', 'HOTEL PALMA', 'FLOR DE SAL', 'BODEGA 24'];
      const large = (b.ix + b.iy) % 3 === 0;
      this.addBuilding(b.x + 22, b.y + 38, large ? 232 : 177, 168,
        { name: names[(b.ix * 3 + b.iy) % names.length], kind: 'shop', accent: b.iy % 2 ? '#80e0cb' : '#e7a088' });
      this.addBuilding(b.x + (large ? 281 : 232), b.y + 38, large ? 125 : 171, 168, { kind: 'apartments' });
      this.addBuilding(b.x + 22, b.y + 258, 176, 136, { kind: b.ix % 2 ? 'tile' : 'apartments' });
      this.addBuilding(b.x + 249, b.y + 253, 155, 141, { color: this.rng.pick(ROOF_PALETTE), kind: 'tile' });
      for (let n = 0; n < 3; n++) this.tree(b.x + 215, b.y + 238 + n * 56, false, .65);
      if ((b.ix + b.iy) % 2 === 0) {
        this.props.push({ kind: 'umbrella', x: b.x + 75, y: b.y + 229, color: '#f5cd7e' });
        this.props.push({ kind: 'umbrella', x: b.x + 126, y: b.y + 231, color: '#eb927e' });
      }
    }
    makeGarden(b) {
      b.kind = 'park';
      this.fountain = { x: b.x + 216, y: b.y + 212, radius: 46 };
      for (let n = 0; n < 21; n++) {
        const x = b.x + this.rng.range(35, 405), y = b.y + this.rng.range(38, 403);
        if (Math.abs(x - this.fountain.x) > 66 && Math.abs(y - this.fountain.y) > 44) this.tree(x, y, false, this.rng.range(.65, 1.1));
      }
      for (const [dx, dy] of [[150, 155], [280, 155], [150, 287], [280, 287]]) {
        this.props.push({ kind: 'bench', x: b.x + dx, y: b.y + dy });
      }
      this.addBuilding(b.x + 292, b.y + 32, 111, 64, { name: 'JARDÍN', kind: 'cafe', color: '#b3aa86', lift: 9 });
    }
    makeMarket(b) {
      b.kind = 'market';
      this.addBuilding(b.x + 25, b.y + 47, 238, 162,
        { id: 'market', name: 'MERCADO COBRE', kind: 'market', color: '#c49b77', accent: '#ffd08a', lift: 19 });
      this.addBuilding(b.x + 24, b.y + 283, 165, 111,
        { name: 'LA MAREA', kind: 'club', color: '#829ca6', accent: '#f798c2', lift: 16 });
      this.addBuilding(b.x + 304, b.y + 318, 100, 83, { kind: 'tile', color: '#ba9182' });
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          this.props.push({ kind: 'stall', x: b.x + 298 + col * 68, y: b.y + 74 + row * 76,
            color: ['#dc866f', '#ead087', '#74b7ab'][(row + col) % 3] });
        }
      }
      for (let n = 0; n < 4; n++) this.props.push({ kind: 'umbrella', x: b.x + 43 + n * 58, y: b.y + 250, color: n % 2 ? '#ecc87b' : '#db8674' });
      this.tree(b.x + 257, b.y + 325, true, 1.18);
    }
    makeGarage(b) {
      b.kind = 'garage';
      this.addBuilding(b.x + 28, b.y + 41, 195, 180,
        { id: 'garage', name: 'ROJAS MOTOR', kind: 'garage', color: '#839e9a', accent: '#80f0cd', lift: 21 });
      this.addBuilding(b.x + 29, b.y + 293, 196, 106,
        { name: 'TALLER INÉS', kind: 'tile', color: '#bd977a', lift: 12 });
      this.props.push({ kind: 'fuel', x: b.x + 350, y: b.y + 265 });
      this.props.push({ kind: 'tires', x: b.x + 240, y: b.y + 160 });
      this.props.push({ kind: 'tires', x: b.x + 240, y: b.y + 203 });
      for (let n = 0; n < 3; n++) this.parkingSpaces.push({ x: b.x + 294 + n * 45, y: b.y + 110, angle: -Math.PI / 2 });
      this.tree(b.x + 302, b.y + 376, true, 1.24);
    }
    makeWarehouse(b) {
      b.kind = 'industrial';
      this.addBuilding(b.x + 26, b.y + 69, 348, 197,
        { id: 'warehouse', name: 'ALMACÉN 08', kind: 'warehouse', color: '#819195', accent: '#e7b46e', lift: 27 });
      for (let n = 0; n < 5; n++) {
        this.props.push({ kind: 'container', x: b.x + 34 + n * 74, y: b.y + 330,
          color: ['#a86656', '#6f9391', '#b0a46e'][n % 3] });
      }
      this.parkingSpaces.push({ x: b.x + 379, y: b.y + 309, angle: Math.PI / 2 });
    }
    makeSafehouse(b) {
      b.kind = 'safehouse';
      this.addBuilding(b.x + 21, b.y + 76, 192, 136,
        { id: 'safehouse', name: 'CASA VEGA', kind: 'tile', color: '#c2a16e', accent: '#a7e4c3', lift: 14 });
      this.addBuilding(b.x + 265, b.y + 65, 138, 143, { name: 'EL COLIBRÍ', color: '#b58486', kind: 'shop' });
      this.addBuilding(b.x + 271, b.y + 294, 130, 104, { kind: 'tile', color: '#8faaa1' });
      for (let n = 0; n < 4; n++) this.tree(b.x + 240, b.y + 155 + n * 70, true, .92);
      this.props.push({ kind: 'umbrella', x: b.x + 94, y: b.y + 324, color: '#efc985' });
    }
    makePoliceStation(b) {
      this.addBuilding(b.x + 31, b.y + 62, 264, 187,
        { id: 'station', name: 'DISTRITO 4', color: '#90a4ae', kind: 'station', accent: '#a7c5df', lift: 25 });
      this.addBuilding(b.x + 40, b.y + 322, 146, 77, { kind: 'warehouse', color: '#9ca896', lift: 12 });
      for (let n = 0; n < 4; n++) this.parkingSpaces.push({ x: b.x + 326, y: b.y + 85 + n * 71, angle: 0, police: true });
    }
    makeCinema(b) {
      this.addBuilding(b.x + 32, b.y + 51, 238, 173,
        { id: 'cinema', name: 'LUNA AZUL', kind: 'cinema', color: '#a59eae', accent: '#95e6e0', lift: 26 });
      this.addBuilding(b.x + 319, b.y + 50, 83, 160, { kind: 'tile', color: '#c69b77' });
      this.addBuilding(b.x + 32, b.y + 292, 166, 105, { name: 'FOTO SOL', kind: 'shop', color: '#b5ad7c', lift: 14 });
      this.addBuilding(b.x + 245, b.y + 285, 153, 112, { kind: 'apartments', color: '#95aba2' });
      this.props.push({ kind: 'umbrella', x: b.x + 305, y: b.y + 249, color: '#e9b181' });
    }
    generateWaterfront() {
      for (let y = 177; y < 2440; y += 97) {
        this.tree(2803, y, true, this.rng.range(.95, 1.2));
        this.lights.push({ x: 2773, y: y + 42, radius: 124 });
        if (y % 3) this.props.push({ kind: 'bench', x: 2790, y: y + 48, angle: Math.PI / 2 });
      }
      for (let n = 0; n < 9; n++) {
        this.props.push({ kind: 'umbrella', x: 2877 + (n % 2) * 51, y: 720 + n * 133,
          color: n % 2 ? '#ede0ac' : '#c8907e', beach: true });
      }
      for (let n = 0; n < 5; n++) {
        this.watercraft.push({ x: 3003 + (n % 2) * 103, y: 370 + n * 494, angle: .18 + n * .38, kind: n === 4 ? 'yacht' : 'boat' });
      }
      for (let n = 0; n < 9; n++) this.props.push({ kind: 'container', x: 1920 + n * 94, y: 2890 + (n % 2) * 97,
        color: ['#799694', '#b08469', '#8f8d6a'][n % 3] });
      this.crane = { x: 2750, y: 2840 };
      this.lights.push({ x: 2886, y: 2690, radius: 138 }, { x: 2700, y: 2850, radius: 170 });
    }
    generateOutskirts() {
      for (let i = 0; i < 5; i++) {
        this.addBuilding(380 + i * 460, 57, 190 + this.rng.int(0, 80), 111,
          { kind: 'tile', color: this.rng.pick(ROOF_PALETTE), lift: 13 });
        this.addBuilding(46, 440 + i * 420, 140, 150, { kind: 'apartments', lift: 21 });
        this.tree(2490 - i * 470, 190, true, 1.1);
      }
      this.addBuilding(420, 2840, 298, 148, { name: 'COOPERATIVA VEGA', kind: 'warehouse', color: '#809fa0' });
      this.addBuilding(928, 2840, 293, 151, { name: 'MUELLE DOS', kind: 'warehouse', color: '#ad9d7d' });
      this.addBuilding(1513, 2840, 287, 152, { name: 'PUERTO VIEJO', kind: 'warehouse', color: '#889c9a' });
    }
    districtAt(x, y) {
      if (y > 2180) return DISTRICT_NAMES[3];
      if (x > 1950) return DISTRICT_NAMES[2];
      if (y > 940) return DISTRICT_NAMES[1];
      return DISTRICT_NAMES[0];
    }
    streetAt(x, y) {
      let nearest = 0, diff = Infinity;
      this.roads.forEach((road, i) => { const d = Math.min(Math.abs(x - road), Math.abs(y - road)); if (d < diff) { nearest = i; diff = d; } });
      return STREET_NAMES[nearest];
    }
    isRoad(x, y, padding = 0) { return this.roads.some(r => Math.abs(x - r) < 62 + padding || Math.abs(y - r) < 62 + padding); }
    signal(intersection, vertical, time = this.game.time) {
      const phase = (time + intersection.phase) % 19;
      return vertical ? (phase < 8.2 ? 'green' : phase < 9.4 ? 'amber' : 'red')
        : (phase > 10.2 && phase < 18.2 ? 'green' : phase >= 18.2 ? 'amber' : 'red');
    }
    visible(object, camera, margin = 120) {
      return Math.abs(object.x - camera.x) < this.game.width / camera.zoom / 2 + margin
        && Math.abs(object.y - camera.y) < this.game.height / camera.zoom / 2 + margin;
    }
    paintGround(ctx) {
      ctx.fillStyle = '#479c9d'; ctx.fillRect(0, 0, 3200, 3200);
      const ocean = ctx.createLinearGradient(2830, 0, 3200, 0);
      ocean.addColorStop(0, '#75bdb1'); ocean.addColorStop(.25, '#419f9e'); ocean.addColorStop(1, '#2c788c');
      ctx.fillStyle = ocean; ctx.fillRect(2820, 0, 380, 3200);
      ctx.fillStyle = '#b6b599'; ctx.fillRect(0, 0, 2830, 3200);
      ctx.fillStyle = '#d5c7a5'; ctx.fillRect(2830, 0, 74, 2510);
      ctx.fillStyle = '#c7bb9a'; ctx.fillRect(2800, 0, 28, 2490);
      ctx.fillStyle = '#85908a'; ctx.fillRect(2720, 2500, 307, 340);
      ctx.fillStyle = '#a6aa94'; ctx.fillRect(2800, 2627, 281, 114);
      ctx.fillStyle = '#746f5d';
      for (let y = 2631; y < 2740; y += 14) ctx.fillRect(2835, y, 248, 2);
      for (const road of this.roads) {
        ctx.fillStyle = '#6e776e'; ctx.fillRect(road - 84, 0, 168, 3200); ctx.fillRect(0, road - 84, 2830, 168);
        ctx.fillStyle = '#c9bfa2'; ctx.fillRect(road - 80, 0, 160, 3200); ctx.fillRect(0, road - 80, 2830, 160);
        ctx.fillStyle = '#39484e'; ctx.fillRect(road - 62, 0, 124, 3200); ctx.fillRect(0, road - 62, 2820, 124);
      }
      for (let n = 0; n < 18500; n++) {
        const x = this.rng.range(0, 2820), y = this.rng.range(0, 3200);
        if (!this.isRoad(x, y)) continue;
        ctx.fillStyle = this.rng.chance(.5) ? '#bcd2cf08' : '#09151b0b';
        ctx.fillRect(x, y, this.rng.range(1, 4), this.rng.range(1, 3));
      }
      for (const block of this.blocks) this.paintBlock(ctx, block);
      ctx.strokeStyle = '#d6c68c'; ctx.lineWidth = 2; ctx.setLineDash([20, 17]);
      for (const road of this.roads) {
        ctx.beginPath(); ctx.moveTo(road - 3, 0); ctx.lineTo(road - 3, 3200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(road + 3, 0); ctx.lineTo(road + 3, 3200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, road - 3); ctx.lineTo(2810, road - 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, road + 3); ctx.lineTo(2810, road + 3); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const intersection of this.intersections) this.paintIntersection(ctx, intersection);
      for (let i = 0; i < 5; i++) {
        const road = this.roads[i];
        for (let j = 0; j < 4; j++) {
          const midpoint = (this.roads[j] + this.roads[j + 1]) / 2;
          ctx.save(); ctx.translate(midpoint, road + 46);
          VM.util.trackedText(ctx, STREET_NAMES[i].toUpperCase(), -67, 0, 1.3, 8, '#d9dac254'); ctx.restore();
          this.paintArrow(ctx, midpoint - 72, road + 29, 0);
          this.paintArrow(ctx, road + 29, midpoint + 61, Math.PI / 2);
          ctx.fillStyle = '#293c4160'; ctx.beginPath(); ctx.arc(midpoint + 64, road - 26, 8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#8c9c9230'; ctx.stroke();
        }
      }
      for (const space of this.parkingSpaces) {
        ctx.save(); ctx.translate(space.x, space.y); ctx.rotate(space.angle);
        ctx.strokeStyle = '#f0ebc847'; ctx.lineWidth = 1.4; ctx.strokeRect(-33, -19, 66, 38); ctx.restore();
      }
      for (const tree of this.trees) {
        ctx.fillStyle = '#172a2d20'; ctx.beginPath();
        ctx.ellipse(tree.x + 17, tree.y + 17, 35 * tree.scale, 14 * tree.scale, .65, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#939275'; ctx.beginPath(); ctx.arc(tree.x, tree.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      for (const lamp of this.lights) {
        ctx.fillStyle = '#5d685e'; ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 11);
        ctx.fillStyle = '#243c40'; ctx.beginPath(); ctx.arc(lamp.x, lamp.y - 2, 4, 0, Math.PI * 2); ctx.fill();
      }
      this.paintCrane(ctx);
    }
    paintBlock(ctx, b) {
      ctx.fillStyle = b.kind === 'park' ? '#7e956d' : b.kind === 'industrial' ? '#a4a791' : '#bcb59a';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#e0d1af52'; ctx.lineWidth = 1;
      for (let x = b.x; x < b.x + b.w; x += 24) { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); }
      for (let y = b.y; y < b.y + b.h; y += 24) { ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
      if (b.kind === 'park') {
        ctx.fillStyle = '#7b9369'; ctx.fillRect(b.x + 9, b.y + 9, b.w - 18, b.h - 18);
        ctx.fillStyle = '#d0c19a'; ctx.fillRect(b.x, b.y + 199, b.w, 29); ctx.fillRect(b.x + 201, b.y, 29, b.h);
        ctx.strokeStyle = '#c1b38e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(b.x + 216, b.y + 212, 81, 0, Math.PI * 2); ctx.stroke();
        const f = this.fountain;
        ctx.fillStyle = '#5a726d'; ctx.beginPath(); ctx.arc(f.x, f.y, 49, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d3d3b4'; ctx.beginPath(); ctx.arc(f.x - 2, f.y - 3, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#68b8b2'; ctx.beginPath(); ctx.arc(f.x - 2, f.y - 3, 36, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c6c9aa'; ctx.beginPath(); ctx.arc(f.x - 2, f.y - 3, 10, 0, Math.PI * 2); ctx.fill();
        this.paintCourt(ctx, b.x + 31, b.y + 300, 130, 97);
      }
      if (b.kind === 'garage') {
        ctx.fillStyle = '#7d8b84'; ctx.fillRect(b.x + 240, b.y + 34, 180, 284);
        ctx.strokeStyle = '#e4d49360'; ctx.lineWidth = 2;
        for (let y = b.y + 60; y < b.y + 300; y += 60) { ctx.beginPath(); ctx.moveTo(b.x + 266, y); ctx.lineTo(b.x + 416, y); ctx.stroke(); }
        VM.util.label(ctx, 'SERVICE', b.x + 252, b.y + 276, 12, '#ece5bc99', 900);
      }
    }
    paintCourt(ctx, x, y, w, h) {
      ctx.fillStyle = '#9d745d'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#638c81'; ctx.fillRect(x + 9, y + 8, w - 18, h - 16);
      ctx.strokeStyle = '#eadab5'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 9, y + 8, w - 18, h - 16);
      ctx.beginPath(); ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h - 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(x + 9, y + h / 2 - 15, 24, 30); ctx.strokeRect(x + w - 33, y + h / 2 - 15, 24, 30);
    }
    paintIntersection(ctx, cross) {
      const { x, y } = cross;
      ctx.fillStyle = '#39484e'; ctx.fillRect(x - 64, y - 64, 128, 128);
      ctx.fillStyle = '#e2dec2b0';
      for (let n = -46; n < 48; n += 11) {
        ctx.fillRect(x + n, y - 84, 6, 18); ctx.fillRect(x + n, y + 66, 6, 18);
        ctx.fillRect(x - 84, y + n, 18, 6); ctx.fillRect(x + 66, y + n, 18, 6);
      }
      ctx.fillStyle = '#e6dfbd90';
      ctx.fillRect(x - 60, y - 93, 53, 3); ctx.fillRect(x + 7, y + 90, 53, 3);
      ctx.fillRect(x - 93, y + 7, 3, 53); ctx.fillRect(x + 90, y - 60, 3, 53);
      for (const [dx, dy] of [[-72, -73], [73, -72], [-73, 72], [72, 73]]) {
        ctx.fillStyle = '#24393b'; ctx.beginPath(); ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    paintArrow(ctx, x, y, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = '#dddcb78a';
      ctx.fillRect(-13, -2, 21, 4); ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(16, 0); ctx.lineTo(7, 7); ctx.fill(); ctx.restore();
    }
    paintBuilding(ctx, b) {
      const { x, y, w, h, lift } = b; const ry = y - lift;
      ctx.fillStyle = '#16262c30'; ctx.beginPath(); ctx.moveTo(x, y + h);
      ctx.lineTo(x + 29, y + h + 31); ctx.lineTo(x + w + 29, y + h + 31);
      ctx.lineTo(x + w + 29, y + 8); ctx.lineTo(x + w, ry); ctx.lineTo(x, ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#657971'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = b.color; ctx.fillRect(x, y + h - lift, w, lift);
      ctx.fillStyle = '#f6e6bd2b'; ctx.fillRect(x, y + h - lift, w, 2);
      for (let wx = x + 12; wx < x + w - 13; wx += 25) {
        ctx.fillStyle = '#344b4f'; ctx.fillRect(wx, y + h - lift + 4, 14, Math.max(5, lift - 8));
        ctx.fillStyle = '#abc8c255'; ctx.fillRect(wx + 2, y + h - lift + 5, 5, Math.max(3, lift - 11));
      }
      ctx.fillStyle = b.color; ctx.fillRect(x, ry, w, h);
      ctx.fillStyle = '#fff3ce30'; ctx.fillRect(x, ry, w, 4); ctx.fillRect(x, ry, 4, h);
      ctx.fillStyle = '#30464a50'; ctx.fillRect(x + w - 5, ry + 4, 5, h - 4); ctx.fillRect(x, ry + h - 5, w, 5);
      ctx.fillStyle = '#263d4421'; ctx.fillRect(x + 12, ry + 12, w - 24, h - 24);
      ctx.strokeStyle = '#efe2bf2b'; ctx.lineWidth = 1; ctx.strokeRect(x + 11, ry + 11, w - 23, h - 23);
      if (b.kind === 'tile') {
        ctx.fillStyle = '#b78060'; ctx.fillRect(x + 8, ry + 8, w - 16, h - 16);
        ctx.strokeStyle = '#744f3f45';
        for (let ty = ry + 9; ty < ry + h - 9; ty += 7) { ctx.beginPath(); ctx.moveTo(x + 8, ty); ctx.lineTo(x + w - 8, ty); ctx.stroke(); }
        ctx.strokeStyle = '#e8b89550';
        for (let tx = x + 12; tx < x + w - 8; tx += 10) { ctx.beginPath(); ctx.moveTo(tx, ry + 8); ctx.lineTo(tx, ry + h - 8); ctx.stroke(); }
        ctx.fillStyle = '#d4a177'; ctx.fillRect(x + 7, ry + h / 2 - 4, w - 14, 7);
      } else if (b.kind === 'warehouse' || b.kind === 'garage') {
        ctx.fillStyle = '#bcc0a72d';
        for (let tx = x + 12; tx < x + w - 14; tx += 13) ctx.fillRect(tx, ry + 12, 2, h - 26);
        ctx.fillStyle = '#2c465950';
        for (let tx = x + 38; tx < x + w - 35; tx += 79) {
          ctx.fillRect(tx + 3, ry + 28, 34, 59); ctx.fillStyle = '#a6c9c475'; ctx.fillRect(tx, ry + 24, 32, 56);
          ctx.strokeStyle = '#59716b'; ctx.strokeRect(tx, ry + 24, 32, 56); ctx.fillStyle = '#2c465950';
        }
      } else {
        const rng = new VM.util.SeededRandom(b.seed);
        for (let n = 0; n < Math.ceil(w / 90); n++) {
          const ax = x + rng.range(24, w - 44), ay = ry + rng.range(21, h - 44);
          ctx.fillStyle = '#334d4b30'; ctx.fillRect(ax + 5, ay + 7, 30, 26);
          ctx.fillStyle = '#d5d6be'; ctx.fillRect(ax, ay, 29, 22);
          ctx.fillStyle = '#93a29b'; ctx.fillRect(ax + 3, ay + 3, 21, 15);
          ctx.fillStyle = '#546d69'; ctx.beginPath(); ctx.arc(ax + 11, ay + 10, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#c1cabb'; ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(ax + 11, ay + 10); ctx.lineTo(ax + 11 + Math.cos(i * Math.PI / 2) * 5, ay + 10 + Math.sin(i * Math.PI / 2) * 5); ctx.stroke(); }
        }
        if (b.kind === 'apartments') {
          ctx.fillStyle = '#425d5860'; ctx.fillRect(x + w - 51, ry + h - 56, 34, 36);
          ctx.fillStyle = '#beb997'; ctx.fillRect(x + w - 55, ry + h - 60, 31, 33);
          ctx.strokeStyle = '#525f5a'; ctx.strokeRect(x + w - 55, ry + h - 60, 31, 33);
          ctx.fillStyle = '#749584'; ctx.fillRect(x + 17, ry + h - 43, Math.min(w - 80, 65), 22);
          for (let n = 0; n < 3; n++) { ctx.fillStyle = '#4a7460'; ctx.beginPath(); ctx.arc(x + 29 + n * 17, ry + h - 33, 8, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      if (b.kind === 'cinema') {
        ctx.fillStyle = '#304756'; ctx.fillRect(x + 25, ry + 31, w - 50, 55);
        ctx.strokeStyle = '#73d9d0'; ctx.lineWidth = 2; ctx.strokeRect(x + 29, ry + 35, w - 58, 47);
        VM.util.label(ctx, 'NOCHES DE CINE', x + w / 2, ry + 64, 13, '#ead7b3', 700, 'center');
      }
      if (b.kind === 'garage') {
        ctx.fillStyle = '#263c3b'; ctx.fillRect(x + w - 8, y + 30, 9, 67);
        ctx.fillStyle = '#90b8aa';
        for (let n = 0; n < 8; n++) ctx.fillRect(x + w - 7, y + 32 + n * 8, 7, 2);
        ctx.fillStyle = '#ffd28b'; ctx.fillRect(x + w - 6, y + 104, 6, 4);
      }
      if (b.name) {
        const sy = ry + h - 30, signW = Math.min(w - 20, b.name.length * 10 + 18);
        ctx.fillStyle = '#263d40'; ctx.fillRect(x + (w - signW) / 2, sy - 15, signW, 23);
        ctx.fillStyle = b.accent; ctx.fillRect(x + (w - signW) / 2, sy - 15, 3, 23);
        VM.util.label(ctx, b.name, x + w / 2, sy + 1, Math.min(15, (w - 26) / b.name.length * 1.4), b.accent, 800, 'center');
      }
      if (b.kind === 'shop' || b.kind === 'market' || b.kind === 'club') {
        ctx.fillStyle = b.accent; ctx.fillRect(x + 10, y + h - 7, w - 20, 13);
        ctx.fillStyle = '#f1dec28c';
        for (let ax = x + 15; ax < x + w - 14; ax += 18) ctx.fillRect(ax, y + h - 7, 9, 13);
        ctx.fillStyle = '#18333840'; ctx.fillRect(x + 10, y + h + 6, w - 20, 5);
      }
    }
    paintProp(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
      if (p.kind === 'bench') {
        ctx.fillStyle = '#324f4640'; ctx.fillRect(-17, -1, 40, 15);
        ctx.fillStyle = '#4b6660'; ctx.fillRect(-17, -7, 35, 12);
        ctx.fillStyle = '#a69168'; for (let n = 0; n < 3; n++) ctx.fillRect(-16, -6 + n * 4, 32, 2);
        ctx.fillStyle = '#344c45'; ctx.fillRect(-13, -9, 3, 17); ctx.fillRect(11, -9, 3, 17);
      } else if (p.kind === 'bin') {
        ctx.fillStyle = '#345e58'; VM.util.roundedRect(ctx, -6, -9, 12, 15, 2); ctx.fill();
        ctx.fillStyle = '#7f9d80'; ctx.fillRect(-7, -10, 14, 3);
      } else if (p.kind === 'hydrant') {
        ctx.fillStyle = '#bd7758'; ctx.fillRect(-4, -5, 8, 10); ctx.fillRect(-7, -2, 14, 4);
        ctx.fillStyle = '#e6bd84'; ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'umbrella' || p.kind === 'stall') {
        const r = p.kind === 'stall' ? 25 : 18;
        ctx.fillStyle = '#20363c27'; ctx.beginPath(); ctx.ellipse(9, 12, r + 4, r - 4, .3, 0, Math.PI * 2); ctx.fill();
        if (p.kind === 'stall') { ctx.fillStyle = '#82694f'; ctx.fillRect(-25, 10, 50, 15); ctx.fillStyle = '#d5b785'; ctx.fillRect(-23, 8, 46, 6); }
        for (let n = 0; n < 8; n++) {
          ctx.beginPath(); ctx.moveTo(0, -5); ctx.arc(0, -5, r, n * Math.PI / 4, (n + 1) * Math.PI / 4); ctx.closePath();
          ctx.fillStyle = n % 2 ? '#f2dab0' : p.color; ctx.fill();
        }
        ctx.fillStyle = '#ffedc4'; ctx.beginPath(); ctx.arc(0, -5, 3, 0, Math.PI * 2); ctx.fill();
        if (p.beach) { ctx.fillStyle = '#e7dbb8'; ctx.fillRect(-9, 22, 18, 36); ctx.strokeStyle = '#a79471'; ctx.strokeRect(-9, 22, 18, 36); }
      } else if (p.kind === 'container') {
        ctx.fillStyle = '#15313b30'; ctx.fillRect(-29, -13, 70, 37);
        ctx.fillStyle = p.color; ctx.fillRect(-34, -19, 67, 33);
        ctx.fillStyle = '#eee4b634'; ctx.fillRect(-34, -19, 67, 3);
        ctx.fillStyle = '#213b3c3b'; for (let n = 0; n < 10; n++) ctx.fillRect(-30 + n * 6, -14, 2, 24);
        VM.util.label(ctx, 'VM / 08', 0, 1, 6, '#ecd5b4a0', 700, 'center');
      } else if (p.kind === 'fuel') {
        ctx.fillStyle = '#586c68'; ctx.fillRect(-9, -15, 18, 29); ctx.fillStyle = '#e79b7b'; ctx.fillRect(-9, -16, 18, 10);
        ctx.fillStyle = '#152b31'; ctx.fillRect(-5, -2, 10, 8); ctx.strokeStyle = '#283e3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(13, 5, 10, -Math.PI / 2, Math.PI); ctx.stroke();
      } else if (p.kind === 'tires') {
        ctx.fillStyle = '#24383b'; for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.arc(n * 8 - 9, n % 2 * 9, 9, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#6b7a6d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-9, 0, 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    paintCrane(ctx) {
      const { x, y } = this.crane;
      ctx.fillStyle = '#19384230'; ctx.fillRect(x + 20, y + 10, 164, 25);
      ctx.strokeStyle = '#cdb071'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 157, y - 91); ctx.stroke();
      ctx.strokeStyle = '#526d6b'; ctx.lineWidth = 2;
      for (let n = 0; n < 7; n++) { ctx.beginPath(); ctx.moveTo(x + n * 23, y - n * 13); ctx.lineTo(x + n * 23 + 19, y - n * 13 + 3); ctx.lineTo(x + n * 23 + 15, y - n * 13 - 18); ctx.stroke(); }
      ctx.fillStyle = '#d2b979'; ctx.fillRect(x - 13, y - 22, 30, 29);
      ctx.strokeStyle = '#263f46'; ctx.beginPath(); ctx.moveTo(x + 155, y - 92); ctx.lineTo(x + 170, y - 17); ctx.stroke();
      ctx.fillStyle = '#496564'; ctx.fillRect(x + 164, y - 19, 13, 9);
    }
    drawWater(ctx, camera, time) {
      if (camera.x + this.game.width / camera.zoom / 2 < 2810) return;
      ctx.save(); ctx.lineWidth = 2;
      for (let n = 0; n < 45; n++) {
        const y = n * 79 + 20, x = 2930 + Math.sin(n * 7) * 33;
        ctx.strokeStyle = '#b8e6d735'; ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 54, y + Math.sin(time * .4 + n) * 7, x + 135, y + 4); ctx.stroke();
      }
      ctx.strokeStyle = '#f4edd276'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(2910, 0);
      for (let y = 0; y <= 2490; y += 32) ctx.lineTo(2905 + Math.sin(y * .023 + time * .6) * 4, y);
      ctx.stroke();
      for (const boat of this.watercraft) {
        if (!this.visible(boat, camera)) continue;
        ctx.save(); ctx.translate(boat.x, boat.y + Math.sin(time + boat.x) * 1.5); ctx.rotate(boat.angle);
        ctx.fillStyle = '#173f5450'; ctx.beginPath(); ctx.ellipse(8, 7, 18, boat.kind === 'yacht' ? 55 : 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eee6cb'; ctx.beginPath(); ctx.moveTo(0, -39); ctx.quadraticCurveTo(24, -16, 16, 29); ctx.lineTo(-16, 29); ctx.quadraticCurveTo(-24, -16, 0, -39); ctx.fill();
        ctx.fillStyle = '#709fa5'; ctx.fillRect(-9, -18, 18, 22); ctx.fillStyle = '#ced9c4'; ctx.fillRect(-9, 9, 18, 14);
        ctx.strokeStyle = '#f2edcf70'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, 38); ctx.lineTo(-25, 73); ctx.moveTo(16, 38); ctx.lineTo(25, 73); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    drawTrees(ctx, camera) {
      for (const tree of this.trees) {
        if (!this.visible(tree, camera, 65)) continue;
        ctx.save(); ctx.translate(tree.x, tree.y); ctx.scale(tree.scale, tree.scale);
        ctx.strokeStyle = '#796e4d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 1); ctx.quadraticCurveTo(3, -8, 1, -19); ctx.stroke();
        if (tree.palm) {
          ctx.translate(1, -19); ctx.rotate(tree.angle);
          for (let n = 0; n < 8; n++) {
            const angle = n * Math.PI / 4, length = 31 + (n % 3) * 5;
            ctx.save(); ctx.rotate(angle);
            ctx.strokeStyle = n % 2 ? '#3c725e' : '#487f64'; ctx.lineWidth = 8; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(15, -12, length, -1); ctx.stroke();
            ctx.strokeStyle = '#86a879'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1, -1); ctx.quadraticCurveTo(17, -11, length - 2, -2); ctx.stroke();
            ctx.strokeStyle = '#5f966c'; ctx.lineWidth = 2;
            for (let leaf = 8; leaf < length - 2; leaf += 6) { ctx.beginPath(); ctx.moveTo(leaf, -5); ctx.lineTo(leaf - 4, 1); ctx.stroke(); }
            ctx.restore();
          }
          ctx.fillStyle = '#a9b982'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        } else {
          for (let n = 0; n < 6; n++) {
            const angle = n * Math.PI / 3;
            ctx.fillStyle = ['#547d5f', '#638b65', '#75956b'][n % 3];
            ctx.beginPath(); ctx.arc(Math.cos(angle) * 10, -13 + Math.sin(angle) * 10, 18, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#8fa47760'; ctx.beginPath(); ctx.arc(-5, -21, 13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
    drawSignals(ctx, camera) {
      for (const intersection of this.intersections) {
        if (!this.visible(intersection, camera, 110)) continue;
        for (const [dx, dy, vertical] of [[-73, -73, true], [73, 73, true], [73, -73, false], [-73, 73, false]]) {
          const x = intersection.x + dx, y = intersection.y + dy;
          ctx.fillStyle = '#1f3337'; ctx.fillRect(x - 4, y - 14, 8, 19);
          const color = this.signal(intersection, vertical);
          for (let n = 0; n < 3; n++) {
            ctx.fillStyle = n === ['red', 'amber', 'green'].indexOf(color) ? ['#ed8c78', '#efcb80', '#8fddac'][n] : '#3d514a';
            ctx.beginPath(); ctx.arc(x, y - 11 + n * 6, 2.3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
    drawLights(ctx, camera, night) {
      if (night < .08) return;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (const lamp of this.lights) {
        if (!this.visible(lamp, camera, 130)) continue;
        const gradient = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, lamp.radius);
        gradient.addColorStop(0, `rgba(255,207,127,${night * .23})`);
        gradient.addColorStop(.45, `rgba(246,180,98,${night * .1})`); gradient.addColorStop(1, 'rgba(230,158,87,0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(lamp.x, lamp.y, lamp.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe5aa'; ctx.shadowColor = '#ffcf89'; ctx.shadowBlur = 9; ctx.beginPath(); ctx.arc(lamp.x, lamp.y - 2, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      for (const building of this.buildings) {
        if (!this.visible({ x: building.x + building.w / 2, y: building.y + building.h / 2 }, camera, 250)) continue;
        const b = building;
        ctx.shadowBlur = 7; ctx.shadowColor = '#f1bd79';
        for (let wx = b.x + 12; wx < b.x + b.w - 13; wx += 25) {
          if (VM.util.hashNoise(wx, b.y, b.seed) < .3) continue;
          ctx.fillStyle = '#f5ce8b'; ctx.globalAlpha = night * .83;
          ctx.fillRect(wx + 2, b.y + b.h - b.lift + 5, 10, Math.max(3, b.lift - 10));
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      for (const b of this.signs) {
        if (!this.visible({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, camera, 200)) continue;
        const sy = b.y - b.lift + b.h - 30;
        ctx.globalAlpha = night; ctx.shadowBlur = 13; ctx.shadowColor = b.accent;
        VM.util.label(ctx, b.name, b.x + b.w / 2, sy + 1, Math.min(15, (b.w - 26) / b.name.length * 1.4), b.accent, 800, 'center');
        ctx.strokeStyle = b.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x + 10, sy + 10); ctx.lineTo(b.x + b.w - 10, sy + 10); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
  VM.CoastalCity = CoastalCity;
  VM.installers.push(game => { game.city = new CoastalCity(game); });
})();
