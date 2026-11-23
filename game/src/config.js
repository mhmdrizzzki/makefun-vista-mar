// Vista Mar's original world scale, palette, controls, and vehicle roster.
(() => {
  const GAME_CONFIG = Object.freeze({
    title: 'VISTA MAR', subtitle: 'LOW TIDE', version: '1.0',
    width: 3200, height: 3200, roadWidth: 124,
    roads: [300, 890, 1480, 2070, 2660], coast: 2830,
    seed: 16, pedestrianCount: 160, trafficCount: 54,
    maxParticles: 640, dayLength: 660, playerRadius: 11,
    safehouse: { x: 449, y: 2380 }, garage: { x: 2384, y: 1664 },
    colors: {
      ink: '#102a30', dark: '#11242c', aqua: '#8cf0cd', coral: '#ff8d76',
      gold: '#f8ca77', paper: '#f6f0de', muted: '#9cb4b5', road: '#35454c',
      sidewalk: '#c5bc9f', sea: '#3c9fa1', grass: '#718d65',
    },
    vehicles: {
      sedan: { name: 'Brisa 240', length: 51, width: 25, maxSpeed: 235, accel: 140, steer: 2.8, hp: 130 },
      sports: { name: 'Caimán GT', length: 53, width: 26, maxSpeed: 350, accel: 210, steer: 3.3, hp: 110 },
      van: { name: 'Mercado Panel', length: 64, width: 30, maxSpeed: 188, accel: 105, steer: 2.1, hp: 210 },
      taxi: { name: 'Solana Taxi', length: 54, width: 26, maxSpeed: 247, accel: 150, steer: 2.7, hp: 145 },
      police: { name: 'Patrol Interceptor', length: 57, width: 27, maxSpeed: 300, accel: 190, steer: 2.9, hp: 200 },
      truck: { name: 'Puerto Hauler', length: 76, width: 31, maxSpeed: 170, accel: 90, steer: 1.9, hp: 280 },
    },
  });
  window.VM.CONFIG = GAME_CONFIG;
})();
