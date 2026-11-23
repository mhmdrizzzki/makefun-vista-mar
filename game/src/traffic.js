// RoadTraffic: lane-aware routes, intersection turns, traffic signals, obstacles, and frightened drivers.
(() => {
  class RoadTraffic {
    constructor(game) {
      this.game = game; this.cars = []; this.spawnClock = 0;
      for (let n = 0; n < VM.CONFIG.trafficCount * 3 && this.cars.length < VM.CONFIG.trafficCount; n++) this.spawn();
      game.on('panic', event => this.panic(event));
      game.on('crime', event => this.panic({ ...event, radius: 230 }));
    }
    neighbors(node) {
      return [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ ix: node.ix + dx, iy: node.iy + dy }))
        .filter(n => n.ix >= 0 && n.ix < 5 && n.iy >= 0 && n.iy < 5);
    }
    chooseNext(from, to) {
      const options = this.neighbors(to).filter(n => n.ix !== from.ix || n.iy !== from.iy);
      const straight = options.find(n => n.ix - to.ix === to.ix - from.ix && n.iy - to.iy === to.iy - from.iy);
      return straight && this.game.rng.chance(.66) ? straight : this.game.rng.pick(options);
    }
    laneTarget(from, to) {
      const roads = this.game.city.roads;
      const dx = Math.sign(to.ix - from.ix), dy = Math.sign(to.iy - from.iy);
      return { x: roads[to.ix] - dy * 30, y: roads[to.iy] + dx * 30 };
    }
    attach(car, from, to) {
      car.ai = true; car.driver = 'civilian'; car.nav = { from, to, target: this.laneTarget(from, to) };
      car.desiredAngle = Math.atan2(to.iy - from.iy, to.ix - from.ix);
      car.angle = car.desiredAngle; car.speed = car.cruiseSpeed * .5;
      car.vx = Math.cos(car.angle) * car.speed; car.vy = Math.sin(car.angle) * car.speed;
      this.cars.push(car); return car;
    }
    spawn() {
      const from = { ix: this.game.rng.int(0, 4), iy: this.game.rng.int(0, 4) };
      const to = this.game.rng.pick(this.neighbors(from)), roads = this.game.city.roads;
      const t = this.game.rng.range(.14, .88), dx = Math.sign(to.ix - from.ix), dy = Math.sign(to.iy - from.iy);
      const x = VM.util.lerp(roads[from.ix], roads[to.ix], t) - dy * 30;
      const y = VM.util.lerp(roads[from.iy], roads[to.iy], t) + dx * 30;
      if (this.game.vehicles.list.some(car => Math.hypot(car.x - x, car.y - y) < 80)) return;
      const type = this.game.rng.pick(['sedan', 'sedan', 'sports', 'van', 'taxi', 'truck']);
      const car = this.game.vehicles.add(type, x, y, Math.atan2(dy, dx));
      this.attach(car, from, to);
    }
    recover(car) {
      if (!car.nav || car.controlled) return;
      const roads = this.game.city.roads;
      const nearest = { ix: 0, iy: 0 };
      nearest.ix = roads.reduce((best, r, i) => Math.abs(r - car.x) < Math.abs(roads[best] - car.x) ? i : best, 0);
      nearest.iy = roads.reduce((best, r, i) => Math.abs(r - car.y) < Math.abs(roads[best] - car.y) ? i : best, 0);
      const next = this.game.rng.pick(this.neighbors(nearest));
      car.nav = { from: nearest, to: next, target: this.laneTarget(nearest, next) };
    }
    panic(event) { for (const car of this.cars) if (car.ai && VM.util.distance(car, event) < (event.radius || 220)) car.panic = 7; }
    update(dt) {
      for (const car of this.cars) {
        if (!car.ai || car.wrecked || car.controlled || car.driver !== 'civilian') continue;
        const nav = car.nav; if (!nav) continue;
        let distance = VM.util.distance(car, nav.target);
        if (distance < 48) {
          const next = this.chooseNext(nav.from, nav.to);
          nav.from = nav.to; nav.to = next; nav.target = this.laneTarget(nav.from, nav.to);
          distance = VM.util.distance(car, nav.target);
        }
        car.desiredAngle = Math.atan2(nav.target.y - car.y, nav.target.x - car.x);
        let desired = car.cruiseSpeed * (car.panic ? 1.42 : 1);
        const turn = Math.abs(VM.util.angleDelta(car.angle, car.desiredAngle));
        desired *= VM.util.clamp(1 - turn * .38, .35, 1);
        const intersection = this.game.city.intersections.find(cross => cross.ix === nav.to.ix && cross.iy === nav.to.iy);
        const vertical = nav.to.iy !== nav.from.iy;
        if (!car.panic && distance < 164 && this.game.city.signal(intersection, vertical) !== 'green') {
          desired = Math.min(desired, Math.max(0, (distance - 112) * 1.7));
        }
        const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
        for (const other of this.game.vehicles.list) {
          if (other === car || other.wrecked) continue;
          const dx = other.x - car.x, dy = other.y - car.y, ahead = dx * fx + dy * fy, lateral = Math.abs(dx * -fy + dy * fx);
          if (ahead > 0 && ahead < 100 && lateral < 23) desired = Math.min(desired, Math.max(0, (ahead - 55) * 2));
        }
        for (const person of this.game.pedestrians?.list || []) {
          if (person.dead) continue;
          const dx = person.x - car.x, dy = person.y - car.y;
          if (dx * fx + dy * fy > 14 && dx * fx + dy * fy < 72 && Math.abs(dx * -fy + dy * fx) < 19) desired = Math.min(desired, 10);
        }
        if (!this.game.player.vehicle && this.game.mode === 'play' && VM.util.distance(car, this.game.player) < 90) desired = Math.min(desired, 28);
        car.desiredSpeed = desired;
      }
      this.spawnClock += dt;
      if (this.spawnClock > 12 && this.cars.filter(car => car.ai && !car.wrecked).length < VM.CONFIG.trafficCount) { this.spawnClock = 0; this.spawn(); }
    }
  }
  VM.RoadTraffic = RoadTraffic;
  VM.installers.push(game => { game.traffic = new RoadTraffic(game); game.addSystem('traffic routes and signals', game.traffic, 24); });
})();
