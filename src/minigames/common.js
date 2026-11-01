// Shared pieces for minigame scenes: countdown, centered text, result screen.

const Minigame = {
  centerText(scene, text, y, font = 'fontLight', scale = 1) {
    const set = font.startsWith('mini') ? 'mini' : 'main';
    const clean = Font.clean(text, set);
    return scene.add.bitmapText(Math.floor((GAME_W - Font.measure(clean, set) * scale) / 2), y, font, clean).setScale(scale);
  },

  // The little football both football games throw around (texture 'football').
  footballTexture(scene) {
    if (scene.textures.exists('football')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x181425).fillEllipse(4, 3, 9, 7).fillStyle(0x8a4a22).fillEllipse(4, 3, 7, 5);
    g.fillStyle(0xf4f4f4).fillRect(2, 2, 5, 1);
    g.generateTexture('football', 9, 7);
    g.destroy();
  },

  // "3, 2, 1, GO!" in the middle of the screen, then calls go().
  countdown(scene, go, label = 'GO!') {
    const steps = ['3', '2', '1', label];
    let i = 0;
    const show = () => {
      const t = Minigame.centerText(scene, steps[i], 70, 'fontLight', 3).setDepth(50);
      if (i < 3) Sound.tick(); else Sound.good();
      scene.tweens.add({ targets: t, alpha: 0, delay: 350, duration: 250, onComplete: () => t.destroy() });
      i++;
      if (i < steps.length) scene.time.delayedCall(600, show);
      else go();
    };
    show();
  },

  // What winning or losing costs, from the story beat that started the game
  // (WorldScene passes { outcomes: { win, lose } }), e.g. ["Mom's anger +5"].
  penaltyLines(scene, win) {
    const outcomes = (scene.sys.settings.data || {}).outcomes || {};
    const fx = outcomes[win ? 'win' : 'lose'] || {};
    const lines = [];
    if (fx.anger > 0) lines.push(`Mom's anger +${fx.anger}`);
    if (fx.heat > 0) lines.push(`${CONTENT.barNames.heat} +${fx.heat}`);
    return lines;
  },

  // Result panel. text = { title, lines: [...] }. Space/Enter calls close().
  // Winning: green border, the title pops in. Losing: the screen goes red,
  // shakes, a sad trombone plays, and any penalty shows in red at the bottom.
  showResult(scene, win, text, close) {
    Music.stop(); // quiet for the win jingle / sad trombone
    const penalty = Minigame.penaltyLines(scene, win);
    const w = 220, h = 40 + (text.lines.length + penalty.length) * Font.LINE_H + 16 + (penalty.length ? 4 : 0);
    const x = Math.floor((GAME_W - w) / 2), y = Math.floor((GAME_H - h) / 2);
    scene.add.graphics().fillStyle(win ? 0x000000 : 0x40060c, win ? 0.55 : 0.7).fillRect(0, 0, GAME_W, GAME_H).setDepth(60);
    const g = scene.add.graphics().setDepth(61);
    drawPanel(g, x, y, w, h, win ? 0x3a9a48 : 0xc03030);
    const title = Font.clean(text.title);
    const t = scene.add.bitmapText(Math.floor(GAME_W / 2), y + 8, 'fontLight', title).setOrigin(0.5, 0).setScale(2).setDepth(62)
      .setTint(win ? 0x30a040 : 0xd03838);
    text.lines.forEach((line, i) => {
      const clean = Font.clean(line);
      scene.add.bitmapText(Math.floor(x + (w - Font.measure(clean)) / 2), y + 34 + i * Font.LINE_H, 'font', clean).setDepth(62);
    });
    penalty.forEach((line, i) => {
      const clean = Font.clean(line);
      const py = y + 38 + (text.lines.length + i) * Font.LINE_H;
      scene.add.bitmapText(Math.floor(x + (w - Font.measure(clean)) / 2), py, 'fontLight', clean).setDepth(62).setTint(0xd03838);
    });
    const prompt = Font.clean('Press Space', 'mini');
    const p = scene.add.bitmapText(Math.floor(x + (w - Font.measure(prompt, 'mini')) / 2), y + h - 11, 'mini', prompt).setDepth(62);
    scene.time.addEvent({ delay: 450, loop: true, callback: () => p.setVisible(!p.visible) });
    if (win) {
      Sound.good();
      scene.tweens.add({ targets: t, scale: { from: 0.5, to: 2 }, duration: 250, ease: 'Back.easeOut' });
    } else {
      Sound.fail();
      scene.cameras.main.shake(300, 0.012);
      scene.tweens.add({ targets: t, x: t.x + 3, duration: 60, yoyo: true, repeat: 5 });
    }

    // Short delay so a key still held from the game doesn't skip the screen.
    scene.time.delayedCall(600, () => {
      scene.input.keyboard.on('keydown', e => {
        if (!e.repeat && CONFIRM_CODES.includes(e.code)) close();
      });
    });
  },
};

// Minigame text (titles, result lines) lives in content.js under `minigames`.
function minigameText(key, win, fill) {
  const result = win ? 'win' : 'lose';
  const t = Story.version(`${key}.${result}`, CONTENT.minigames[key][result]);
  const sub = s => s.replace(/\{(\w+)\}/g, (_, k) => fill[k]);
  return { title: t.title, lines: t.lines.map(sub) };
}

// Timing meter (football practice, the Friday game): a cursor slides back and
// forth along a bar; press when it's in the green zone. The middle of the
// green is PERFECT. start() picks a new green spot, judge() scores the press.
class TimingMeter {
  constructor(scene, x, y, w) {
    Object.assign(this, { scene, x, y, w, pos: 0, dir: 1, speed: 0, green: 0, center: 0, running: false });
    this.g = scene.add.graphics().setDepth(40);
  }

  // speed in pixels per second, greenW = width of the green zone in pixels.
  start(speed, greenW) {
    this.speed = speed;
    this.green = greenW;
    this.center = Phaser.Math.Between(Math.ceil(greenW / 2) + 12, this.w - Math.ceil(greenW / 2) - 4);
    this.pos = 0;
    this.dir = 1;
    this.running = true;
    this.draw();
  }

  update(delta) {
    if (!this.running) return;
    this.pos += this.dir * this.speed * delta / 1000;
    if (this.pos >= this.w) { this.pos = this.w; this.dir = -1; }
    if (this.pos <= 0) { this.pos = 0; this.dir = 1; }
    this.draw();
  }

  // Stop the cursor and score where it is: 'perfect', 'good' or 'miss'.
  judge() {
    this.running = false;
    const off = Math.abs(this.pos - this.center);
    const result = off <= TIMING_PERFECT_PX ? 'perfect' : off <= this.green / 2 ? 'good' : 'miss';
    this.draw(result);
    return result;
  }

  draw(result) {
    const { g, x, y, w } = this;
    g.clear();
    g.fillStyle(0x181425).fillRect(x - 2, y - 2, w + 4, 12);
    g.fillStyle(0xc03030).fillRect(x, y, w, 8);
    g.fillStyle(0x40a040).fillRect(Math.round(x + this.center - this.green / 2), y, Math.round(this.green), 8);
    g.fillStyle(0x80f080).fillRect(Math.round(x + this.center - TIMING_PERFECT_PX), y, TIMING_PERFECT_PX * 2, 8);
    g.fillStyle(0xffffff, 0.3).fillRect(x, y, w, 2);
    const cx = Math.round(x + this.pos);
    const color = result === 'miss' ? 0xff6060 : result ? 0xfff080 : 0xffffff;
    g.fillStyle(0x181425).fillRect(cx - 2, y - 5, 5, 18);
    g.fillStyle(color).fillRect(cx - 1, y - 4, 3, 16);
  }
}
const TIMING_PERFECT_PX = 3;
