// Church guitar: a rhythm game. Arrows slide down four lanes toward the line;
// press the matching arrow key (or WASD) as each one crosses it.
// Win by hitting at least WIN_SHARE of the notes.

const GUITAR_BPM = 100;
const GUITAR_TRAVEL_MS = 1500;     // how long a note takes to fall to the line
const GUITAR_PERFECT_MS = 70;
const GUITAR_GOOD_MS = 140;
const GUITAR_WIN_SHARE = 0.7;
const HIT_Y = 140;
const LANES = ['left', 'down', 'up', 'right'];
const LANE_X = [130, 150, 170, 190];
const LANE_KEYS = { ArrowLeft: 0, KeyA: 0, ArrowDown: 1, KeyS: 1, ArrowUp: 2, KeyW: 2, ArrowRight: 3, KeyD: 3 };
const LANE_COLORS = [['#d070f0', '#9a40c0'], ['#50b0f8', '#2a78c8'], ['#50d070', '#2a9a48'], ['#f86060', '#c03030']];

// The song: one string per bar, 8 slots per bar (eighth notes).
// l d u r = which arrow, . = rest. Each bar strums its own chord.
const GUITAR_CHART = [
  ['l...d...', 'G'], ['u...r...', 'C'], ['l.d.u.r.', 'G'], ['r.u.d.l.', 'D'],
  ['l.l.u.u.', 'Em'], ['d.r.d.r.', 'C'], ['l.du.r.l', 'G'], ['u.d.l.r.', 'D'],
  ['lr.ud.l.', 'Em'], ['r.l.ud..', 'C'], ['l.r.l.r.', 'D'], ['u...l...', 'G'],
];
const CHORDS = {
  G: [NOTE.G2, NOTE.B2, NOTE.D3, NOTE.G3], C: [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.C4],
  D: [NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.D4], Em: [NOTE.E3, NOTE.G3, NOTE.B3, NOTE.E4],
};

const LANE_ARROW = [
  '.....k.....',
  '....kok....',
  '...kooOk...',
  '..kooooOk..',
  '.kooooooOk.',
  'kkkkooOkkkk',
  '...kooOk...',
  '...kooOk...',
  '...kooOk...',
  '...kooOk...',
  '...kkkkk...',
];

class GuitarScene extends Phaser.Scene {
  constructor() { super('Guitar'); }

  static buildTextures(scene) {
    LANE_COLORS.forEach(([o, O], i) => Art.buildStrip(scene, `laneArrow${i}`, { a: LANE_ARROW }, { k: K, o, O }, 11, 11));
    Art.buildStrip(scene, 'laneTarget', { a: LANE_ARROW }, { k: '#c8ccd8', o: '#3a3a48', O: '#2a2a34' }, 11, 11);
  }

  create(data) {
    this.done = data.done;
    const beatMs = 60000 / GUITAR_BPM;
    this.slotMs = beatMs / 2;
    // One bar of beats before the first note so it has time to fall into view.
    this.leadMs = 8 * this.slotMs;
    this.notes = [];
    this.chordAt = [];
    GUITAR_CHART.forEach(([bar, chord], b) => {
      this.chordAt.push(chord);
      [...bar].forEach((c, s) => {
        const lane = 'ldur'.indexOf(c);
        if (lane >= 0) this.notes.push({ lane, time: this.leadMs + (b * 8 + s) * this.slotMs, bar: b, sprite: null, judged: false });
      });
    });
    this.songMs = this.leadMs + GUITAR_CHART.length * 8 * this.slotMs;
    this.hits = 0;
    this.perfects = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.started = false;
    this.finished = false; // Phaser reuses the scene object, so reset every play
    this.lastBeat = -1;

    this.drawStage();
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => {
      this.started = true;
      this.songStart = this.time.now;
    }, 'PLAY!'));
  }

  drawStage() {
    const g = this.add.graphics();
    // church wall, stained glass, stage
    g.fillStyle(0xece6d8).fillRect(0, 0, GAME_W, 110);
    for (const x of [30, 270]) {
      g.fillStyle(0x5e3b20).fillRect(x - 9, 14, 18, 40);
      const colors = [0xc8323a, 0x4080f0, 0xe8c040, 0x40a040];
      for (let y = 0; y < 4; y++) for (let c = 0; c < 2; c++) g.fillStyle(colors[(y + c) % 4]).fillRect(x - 7 + c * 7, 16 + y * 9, 6, 8);
    }
    g.fillStyle(0xa83a3a).fillRect(0, 110, GAME_W, 70);
    g.fillStyle(0x8a2e2e).fillRect(0, 110, GAME_W, 2);
    // lanes
    g.fillStyle(0x181425, 0.75).fillRect(118, 0, 84, GAME_H);
    for (const x of LANE_X) g.fillStyle(0xffffff, 0.06).fillRect(x - 1, 0, 2, GAME_H);
    g.fillStyle(0xffffff, 0.35).fillRect(118, HIT_Y, 84, 1);
    LANE_X.forEach((x, i) => this.add.image(x, HIT_Y, 'laneTarget').setAngle(this.laneAngle(i)));

    // Ben with his guitar on the left, Mom watching on the right (2x size)
    this.ben = this.add.image(62, 160, Ben.texture('church'), 'down_0').setOrigin(0.5, 1).setScale(2);
    this.guitar = this.add.image(64, 144, 'heldGuitar').setScale(2);
    this.add.image(262, 160, 'npc_mom', 'down_0').setOrigin(0.5, 1).setScale(2);
    this.add.image(292, 160, 'npc_pastor', 'down_0').setOrigin(0.5, 1).setScale(2);

    // score + crowd meter
    this.add.bitmapText(8, 6, 'mini', Font.clean('Church vibes', 'mini'));
    this.vibe = this.add.graphics();
    this.comboText = this.add.bitmapText(214, 6, 'mini', '');
    this.judgeText = this.add.bitmapText(0, HIT_Y - 26, 'fontLight', '').setDepth(20);
    this.drawVibe();
  }

  laneAngle(i) { return [-90, 180, 0, 90][i]; }

  drawVibe() {
    const judged = this.notes.filter(n => n.judged).length;
    const share = judged ? this.hits / judged : 1;
    const g = this.vibe.clear();
    g.fillStyle(UI_COLORS.ink).fillRect(7, 13, 62, 7);
    g.fillStyle(0x4a4a52).fillRect(8, 14, 60, 5);
    g.fillStyle(share >= GUITAR_WIN_SHARE ? 0x40c060 : 0xe8c040).fillRect(8, 14, Math.round(60 * share), 5);
    g.fillStyle(0xffffff).fillRect(8 + Math.round(60 * GUITAR_WIN_SHARE), 13, 1, 7); // the line to beat
    this.comboText.setText(Font.clean(`Combo ${this.combo}`, 'mini'));
  }

  judge(text, color) {
    const clean = Font.clean(text);
    this.judgeText.setText(clean).setX(160 - Math.floor(Font.measure(clean) / 2)).setTint(color).setAlpha(1);
    this.tweens.killTweensOf(this.judgeText);
    this.tweens.add({ targets: this.judgeText, alpha: 0, delay: 300, duration: 250 });
  }

  onKey(e) {
    if (DEBUG && e.code === 'BracketRight') { this.finish(true); return; }
    if (DEBUG && e.code === 'BracketLeft') { this.finish(false); return; }
    if (!this.started || this.finished || e.repeat) return;
    const lane = LANE_KEYS[e.code];
    if (lane === undefined) return;
    const now = this.time.now - this.songStart;
    // closest note in that lane that hasn't been judged yet
    let best = null;
    for (const n of this.notes) {
      if (n.judged || n.lane !== lane) continue;
      const off = Math.abs(n.time - now);
      if (off <= GUITAR_GOOD_MS && (!best || off < Math.abs(best.time - now))) best = n;
    }
    if (!best) return; // pressing on empty air costs nothing
    best.judged = true;
    best.sprite?.destroy();
    this.hits++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const perfect = Math.abs(best.time - now) <= GUITAR_PERFECT_MS;
    if (perfect) this.perfects++;
    this.judge(perfect ? 'PERFECT' : 'GOOD', perfect ? 0xf8e060 : 0x80d0ff);
    Sound.strum(CHORDS[this.chordAt[best.bar]].map((f, i) => (i === lane ? f * 2 : f)));
    this.tweens.add({ targets: this.guitar, angle: { from: -12, to: 0 }, duration: 150 });
    this.drawVibe();
  }

  update() {
    if (!this.started || this.finished) return;
    const now = this.time.now - this.songStart;

    // a soft kick on every beat to play along to
    const beat = Math.floor(now / (this.slotMs * 2));
    if (beat !== this.lastBeat && beat >= 0 && now < this.songMs) { this.lastBeat = beat; Sound.kick(); }

    for (const n of this.notes) {
      if (n.judged) continue;
      const until = n.time - now;
      if (until < -GUITAR_GOOD_MS) {
        n.judged = true;
        n.sprite?.destroy();
        this.combo = 0;
        this.judge('MISS', 0xff6060);
        Sound.bad();
        this.drawVibe();
        continue;
      }
      if (until <= GUITAR_TRAVEL_MS) {
        if (!n.sprite) n.sprite = this.add.image(LANE_X[n.lane], 0, `laneArrow${n.lane}`).setAngle(this.laneAngle(n.lane));
        n.sprite.y = Math.round(HIT_Y - (until / GUITAR_TRAVEL_MS) * (HIT_Y + 12));
      }
    }

    if (now > this.songMs + 600) this.finish(this.hits >= this.notes.length * GUITAR_WIN_SHARE);
  }

  finish(win) {
    if (this.finished) return;
    this.finished = true;
    const fill = { hits: this.hits, total: this.notes.length, perfects: this.perfects, combo: this.bestCombo };
    Minigame.showResult(this, win, minigameText('guitar', win, fill), () => this.done({ win, ...fill }));
  }
}
