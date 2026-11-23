// Vista Mar: Low Tide — ProceduralAudio: locally synthesized engines, sirens, impacts, and musical cues.
(() => {
  class ProceduralAudio {
    constructor(game) {
      this.game = game; this.context = null; this.master = null; this.muted = false;
      this.engineGain = null; this.engineTone = null; this.sirenGain = null; this.sirenTone = null;
      this.noiseBuffer = null; this.tireClock = 0; this.musicClock = 0;
    }
    unlock() {
      if (this.context) { if (this.context.state === 'suspended') this.context.resume().catch(() => {}); return; }
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext(); this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .42; this.master.connect(this.context.destination);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
        const data = this.noiseBuffer.getChannelData(0), rng = new VM.util.SeededRandom(7681);
        for (let n = 0; n < data.length; n++) data[n] = rng.range(-1, 1);
        this.engineTone = this.context.createOscillator(); this.engineTone.type = 'sawtooth'; this.engineTone.frequency.value = 52;
        const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 270;
        this.engineGain = this.context.createGain(); this.engineGain.gain.value = 0;
        this.engineTone.connect(filter); filter.connect(this.engineGain); this.engineGain.connect(this.master); this.engineTone.start();
        this.sirenTone = this.context.createOscillator(); this.sirenTone.type = 'sine';
        this.sirenGain = this.context.createGain(); this.sirenGain.gain.value = 0;
        this.sirenTone.connect(this.sirenGain); this.sirenGain.connect(this.master); this.sirenTone.start();
      } catch (error) { this.context = null; console.info(`Audio remains optional: ${error.message}`); }
    }
    tone(frequency, duration, volume = .16, type = 'triangle', delay = 0, endFrequency = null) {
      if (!this.context) return;
      const time = this.context.currentTime + delay, osc = this.context.createOscillator(), gain = this.context.createGain();
      osc.type = type; osc.frequency.setValueAtTime(frequency, time);
      if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
      gain.gain.setValueAtTime(.001, time); gain.gain.linearRampToValueAtTime(volume, time + .009);
      gain.gain.exponentialRampToValueAtTime(.001, time + duration);
      osc.connect(gain); gain.connect(this.master); osc.start(time); osc.stop(time + duration + .02);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    noise(duration, volume, frequency = 900, type = 'lowpass') {
      if (!this.context) return;
      const time = this.context.currentTime, source = this.context.createBufferSource(), gain = this.context.createGain();
      const filter = this.context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency;
      source.buffer = this.noiseBuffer; source.connect(filter); filter.connect(gain); gain.connect(this.master);
      gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
      source.start(time); source.stop(time + duration + .01);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    play(name) {
      if (!this.context || this.muted) return;
      try {
        switch (name) {
          case 'shot': this.noise(.15, .32, 1800); this.tone(155, .095, .2, 'square', 0, 50); break;
          case 'explosion': this.noise(.9, .5, 480); this.tone(80, .65, .3, 'sine', 0, 23); break;
          case 'crash': this.noise(.22, .19, 1100); this.tone(92, .12, .1, 'triangle'); break;
          case 'horn': this.tone(185, .3, .085, 'sawtooth'); this.tone(233, .32, .07, 'sawtooth'); break;
          case 'hurt': this.noise(.075, .12, 430); this.tone(92, .16, .07, 'sine', 0, 45); break;
          case 'punch': this.noise(.09, .17, 430); break;
          case 'pickup': this.tone(660, .1, .09); this.tone(990, .22, .1, 'sine', .08); break;
          case 'menu': this.tone(480, .09, .07, 'triangle'); break;
          case 'door': this.noise(.09, .09, 200); this.tone(135, .07, .05); break;
          case 'steal': this.noise(.08, .1, 200); this.tone(320, .13, .05, 'triangle', .06); break;
          case 'reload': this.noise(.05, .09, 3100); this.tone(230, .06, .035, 'square', .15); break;
          case 'complete': [587.33, 739.99, 880, 1174.66].forEach((f, i) => this.tone(f, .45, .075, 'triangle', i * .12)); break;
          case 'fail': this.tone(220, .3, .09, 'sine'); this.tone(164.81, .5, .09, 'sine', .2); break;
        }
      } catch (error) { console.info(`Audio cue skipped: ${error.message}`); }
    }
    setEngine(speed, throttle) {
      if (!this.context || !this.engineGain) return;
      const time = this.context.currentTime;
      this.engineTone.frequency.setTargetAtTime(44 + speed * 133 + throttle * 12, time, .09);
      this.engineGain.gain.setTargetAtTime(this.game.player.vehicle ? .025 + speed * .025 : 0, time, .15);
    }
    tires(intensity) {
      if (this.tireClock > 0) return;
      this.tireClock = .13; this.noise(.16, .045 * intensity, 1400, 'bandpass');
    }
    toggle() { this.muted = !this.muted; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : .42, this.context.currentTime, .06); return this.muted; }
    update(dt) {
      this.tireClock = Math.max(0, this.tireClock - dt);
      if (!this.context) return;
      const police = this.game.police, player = this.game.player;
      let gain = 0;
      if (police?.stars && police.units.length) {
        const distance = Math.min(...police.units.map(unit => VM.util.distance(unit, player)));
        gain = VM.util.clamp(1 - distance / 750, 0, 1) * .025;
      }
      this.sirenTone.frequency.setTargetAtTime(630 + Math.sin(this.game.time * 5) * 270, this.context.currentTime, .04);
      this.sirenGain.gain.setTargetAtTime(gain, this.context.currentTime, .18);
      this.musicClock += dt;
      if (this.musicClock > 5.6 && !police?.stars && !this.muted) {
        this.musicClock = 0;
        const chord = this.game.player.vehicle ? [146.83, 220, 293.66] : [174.61, 220, 329.63];
        chord.forEach((note, index) => this.tone(note, 2.8, .012, 'sine', index * .12));
      }
    }
  }
  VM.ProceduralAudio = ProceduralAudio;
  VM.installers.push(game => { game.audio = new ProceduralAudio(game); game.addSystem('procedural audio engine', game.audio, 95); });
})();
