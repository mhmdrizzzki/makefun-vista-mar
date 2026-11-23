// CoastalStory: Sol Vega, Inés Rojas, and Dario Vela in an original six-contract harbor story.
(() => {
  const INTRO_BEATS = [
    { who: 'Sol Vega', text: 'Three years off the road. One letter pulled me back.' },
    { who: 'Inés Rojas', text: 'Vela bought the harbor. Your family’s repair shop is next.' },
    { who: 'Sol Vega', text: 'Then we borrow something he can’t buy back.' },
    { who: 'Inés Rojas', text: 'Come to Rojas Motor. There’s still a city worth fighting for.' },
  ];
  class CoastalStory {
    constructor(game) { this.game = game; this.lines = []; this.index = 0; this.blocking = false; this.callback = null; this.radioLine = null; }
    intro(callback) { this.say(INTRO_BEATS, callback); }
    say(lines, callback = null) {
      this.lines = lines.map(line => typeof line === 'string' ? { who: 'Inés Rojas', text: line } : line);
      this.index = 0; this.callback = callback; this.blocking = this.lines.length > 0;
      if (this.blocking) this.game.paused = true; else callback?.();
    }
    advance() {
      if (!this.blocking) return;
      this.game.audio.play('menu'); this.index++;
      if (this.index >= this.lines.length) {
        this.blocking = false; this.game.paused = Boolean(this.game.ui?.menu || this.game.ui?.map);
        const callback = this.callback; this.callback = null; callback?.();
      }
    }
    skip() { while (this.blocking) this.advance(); }
    radio(who, text, duration = 6) { this.radioLine = { who, text, life: duration }; }
    update(dt) { if (this.radioLine) { this.radioLine.life -= dt; if (this.radioLine.life <= 0) this.radioLine = null; } }
    interface() {
      if (this.blocking && !this.game.ui?.menu && !this.game.ui?.map
        && (this.game.input.take('Space') || this.game.input.take('Enter') || this.game.input.take('KeyE'))) this.advance();
    }
    portrait(ctx, x, y, size, name = 'Sol Vega') {
      ctx.save(); ctx.translate(x, y); ctx.scale(size / 88, size / 88);
      const ines = name.startsWith('Inés'), dario = name.startsWith('Dario');
      VM.util.panel(ctx, 0, 0, 88, 88, ines ? '#755b42' : dario ? '#563947' : '#315d57', null, 7);
      ctx.fillStyle = '#071f3027'; ctx.beginPath(); ctx.arc(48, 38, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dario ? '#9a777b' : ines ? '#bfa16c' : '#78bea6';
      ctx.beginPath(); ctx.moveTo(10, 88); ctx.quadraticCurveTo(12, 60, 38, 58); ctx.lineTo(58, 58); ctx.quadraticCurveTo(78, 63, 81, 88); ctx.fill();
      ctx.fillStyle = '#bf906c'; ctx.fillRect(35, 50, 19, 19);
      ctx.fillStyle = dario ? '#d1aa85' : '#d7a780';
      ctx.beginPath(); ctx.ellipse(44, 37, 20, 25, -.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dario ? '#65716b' : '#253b3b';
      ctx.beginPath(); ctx.moveTo(23, 37); ctx.quadraticCurveTo(16, 6, 43, 9); ctx.quadraticCurveTo(71, 5, 65, 36);
      ctx.lineTo(58, 24); ctx.quadraticCurveTo(43, 29, 30, 22); ctx.lineTo(29, 44); ctx.closePath(); ctx.fill();
      if (ines) { ctx.beginPath(); ctx.ellipse(25, 26, 8, 17, .4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e0ba78'; ctx.fillRect(19, 18, 44, 7); }
      ctx.strokeStyle = '#533d34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, 36); ctx.lineTo(39, 35); ctx.moveTo(49, 35); ctx.lineTo(55, 35); ctx.stroke();
      ctx.strokeStyle = '#a67559'; ctx.beginPath(); ctx.moveTo(44, 37); ctx.lineTo(41, 46); ctx.lineTo(46, 46); ctx.stroke();
      ctx.strokeStyle = '#895b4e'; ctx.beginPath(); ctx.moveTo(38, 53); ctx.quadraticCurveTo(44, 56, 51, 52); ctx.stroke();
      if (!dario) { ctx.fillStyle = '#efdeb3'; ctx.beginPath(); ctx.arc(26, 44, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (!ines && !dario) { ctx.fillStyle = '#ef957c'; ctx.beginPath(); ctx.moveTo(33, 62); ctx.lineTo(49, 67); ctx.lineTo(55, 88); ctx.lineTo(46, 88); ctx.lineTo(41, 68); ctx.closePath(); ctx.fill(); }
      if (dario) { ctx.fillStyle = '#ded2b8'; ctx.beginPath(); ctx.moveTo(31, 61); ctx.lineTo(57, 61); ctx.lineTo(46, 86); ctx.fill(); ctx.fillStyle = '#704856'; ctx.fillRect(42, 65, 5, 20); }
      ctx.restore();
    }
    draw(ctx) {
      const game = this.game;
      if (game.mode === 'title' || game.ui?.menu === 'victory') return;
      const line = this.blocking ? this.lines[this.index] : this.radioLine;
      if (!line) return;
      const w = Math.min(688, game.width - 360), x = (game.width - w) / 2, y = game.height - (this.blocking ? 177 : 145);
      VM.util.panel(ctx, x, y, w, 125, '#102b31f5', '#9de6c840', 9);
      ctx.fillStyle = '#86d6b9'; ctx.fillRect(x, y + 16, 3, 92);
      this.portrait(ctx, x + 18, y + 20, 79, line.who);
      VM.util.trackedText(ctx, line.who.toUpperCase(), x + 116, y + 27, 2, 11, '#a1ead0');
      ctx.font = '400 16px Arial';
      const lines = VM.util.wrapText(ctx, line.text, w - 143);
      lines.slice(0, 3).forEach((text, index) => VM.util.label(ctx, text, x + 116, y + 53 + index * 22, 16, '#efeedd', 400));
      if (this.blocking) {
        VM.util.label(ctx, `${this.index + 1} / ${this.lines.length}`, x + 117, y + 108, 10, '#87a7a7');
        VM.util.label(ctx, 'SPACE  /  CONTINUE  →', x + w - 22, y + 109, 10, '#a1ead0', 700, 'right');
      } else VM.util.label(ctx, 'RADIO COBRE  /  ENCRYPTED', x + w - 22, y + 108, 9, '#87a7a7', 700, 'right');
    }
  }
  VM.CoastalStory = CoastalStory;
  VM.installers.push(game => { game.story = new CoastalStory(game); game.addSystem('story and dialogue', game.story, 55); game.screenDraw.push(ctx => game.story.draw(ctx)); });
})();
