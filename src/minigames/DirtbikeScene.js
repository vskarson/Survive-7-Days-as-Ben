// Dirtbike fix: Ben's bike is missing four parts. Drag each part from the tray
// to the spot on the bike that shows its outline (mouse), or pick a part with
// Left/Right + Space and then a spot with the arrows + Space (keyboard).
// Junk on the tray (a banana, Sam's dinosaur...) fits nowhere. A wrong try
// bounces back and costs time. Get all four on before the timer runs out.

const BIKE_TIME_S = 40;
const BIKE_PENALTY_S = 3;
const BIKE_SCALE = 5;
const BIKE_X = 80, BIKE_Y = 30;    // top-left of the big bike drawing
const BIKE_SNAP = 16;              // how close a drop has to be to a spot
const TRAY_Y = 156;

// Part pictures, 12x12. `spot` = where it goes on the bike (bike pixels, before scaling).
const BIKE_PARTS = {
  sparkPlug: {
    spot: [14, 8.5],
    pal: { k: K, w: '#f4f4f4', g: '#9aa0ac', G: '#5a5e6c' },
    rows: ['.....kk.....', '....kwwk....', '....kwwk....', '...kggggk...', '...kggggk...', '....kwwk....',
      '....kwwk....', '....kwwk....', '...kGGGGk...', '...kGGGGk...', '....kGGk....', '.....kk.....'],
  },
  chain: {
    spot: [7.5, 12],
    pal: { k: K, g: '#c8ccd0', G: '#7a808c' },
    rows: ['............', '..kkkkkkkk..', '.kGgGgGgGgk.', '.kg......Gk.', '.kG......gk.', '.kg......Gk.',
      '.kG......gk.', '.kg......Gk.', '.kG......gk.', '.kgGgGgGgGk.', '..kkkkkkkk..', '............'],
  },
  airFilter: {
    spot: [10.5, 5.5],
    pal: { k: K, o: '#e8782a', O: '#a85a20' },
    rows: ['............', '..kkkkkkkk..', '.kooOoOoOok.', '.koOoOoOoOk.', '.kooOoOoOok.', '.koOoOoOoOk.',
      '.kooOoOoOok.', '.koOoOoOoOk.', '.kooOoOoOok.', '..kkkkkkkk..', '............', '............'],
  },
  gasCap: {
    spot: [17.5, 3.5],
    pal: { k: K, d: '#3a3a48', D: '#7a808c' },
    rows: ['............', '............', '...kkkkkk...', '..kddddddk..', '.kdDdDdDdDk.', '.kddddddddk.',
      '.kdDdDdDdDk.', '..kddddddk..', '...kkkkkk...', '............', '............', '............'],
  },
  // junk: fits nowhere
  banana: {
    pal: { k: K, y: '#f0d040' },
    rows: ['............', '.........kk.', '........kyk.', '.......kyyk.', '......kyyk..', '.....kyyyk..',
      'k...kyyyk...', 'kykkyyyk....', '.kyyyyk.....', '..kkkk......', '............', '............'],
  },
  dino: {
    pal: { k: K, g: '#4fa060' },
    rows: ['............', '.......kkk..', '......kgggk.', '......kgkgk.', '.kk..kggggk.', 'kgk.kggggk..',
      'kggkgggggk..', '.kggggggk...', '..kggggk....', '..kgk.kgk...', '..kk...kk...', '............'],
  },
  spoon: {
    pal: { k: K, s: '#d8dce0', S: '#9aa0ac' },
    rows: ['............', '.........kk.', '........kssk', '........kssk', '.......kssk.', '......kSk...',
      '.....kSk....', '....kSk.....', '...kSk......', '..kSk.......', '..kk........', '............'],
  },
  sandwich: {
    pal: { k: K, b: '#d8a060', g: '#4fa060', r: '#c8323a', y: '#f0d040' },
    rows: ['............', '............', '..kkkkkkkk..', '.kbbbbbbbbk.', '.kggggggggk.', '.krrrrrrrrk.',
      '.kyyyyyyyyk.', '.kbbbbbbbbk.', '..kkkkkkkk..', '............', '............', '............'],
  },
};

class DirtbikeScene extends Phaser.Scene {
  constructor() { super('Dirtbike'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.timeLeft = BIKE_TIME_S * 1000;
    this.mistakes = 0;
    this.held = null;       // keyboard: the part picked up
    this.trayIndex = 0;
    this.spotIndex = 0;
    this.text = CONTENT.minigames.dirtbike;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    for (const [id, part] of Object.entries(BIKE_PARTS)) {
      if (!this.textures.exists(`part_${id}`)) Art.buildStrip(this, `part_${id}`, { a: part.rows }, part.pal, 12, 12);
    }

    // Garage wall and floor behind the bike.
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 20; tx++) {
      this.add.image(tx * TILE, ty * TILE, 'tiles', ty < 2 ? 'wallU_garage' : ty === 2 ? 'wallL_garage' : 'floor_garage').setOrigin(0);
    }
    this.add.image(BIKE_X, BIKE_Y, 'tiles', 'bikeL').setOrigin(0).setScale(BIKE_SCALE);
    this.add.image(BIKE_X + 16 * BIKE_SCALE, BIKE_Y, 'tiles', 'bikeR').setOrigin(0).setScale(BIKE_SCALE);

    // Empty spots: a dark outline of the part that goes there.
    this.spots = Object.entries(BIKE_PARTS).filter(([, p]) => p.spot).map(([id, p]) => {
      const x = BIKE_X + p.spot[0] * BIKE_SCALE, y = BIKE_Y + p.spot[1] * BIKE_SCALE;
      const ring = this.add.graphics().setDepth(5);
      const ghost = this.add.image(x, y, `part_${id}`).setScale(1.5).setTint(0x000000).setAlpha(0.45).setDepth(6);
      return { id, x, y, ring, ghost, filled: false };
    });

    // The tray: the four parts plus junk, shuffled.
    this.add.graphics().fillStyle(0x5e3b20).fillRect(0, TRAY_Y - 16, GAME_W, 40).fillStyle(0x8a5a33).fillRect(0, TRAY_Y - 16, GAME_W, 2).setDepth(1);
    const ids = Phaser.Utils.Array.Shuffle(Object.keys(BIKE_PARTS));
    this.tray = ids.map((id, i) => {
      const home = { x: 34 + i * 36, y: TRAY_Y };
      const img = this.add.image(home.x, home.y, `part_${id}`).setScale(2).setDepth(20).setInteractive({ useHandCursor: true });
      this.input.setDraggable(img);
      const part = { id, img, home, placed: false, junk: !BIKE_PARTS[id].spot };
      img.on('drag', (pointer, x, y) => { if (this.canPlay()) img.setPosition(x, y).setDepth(30); });
      img.on('dragend', () => { if (this.canPlay()) this.drop(part, this.spotNear(img.x, img.y)); });
      return part;
    });
    this.cursor = this.add.graphics().setDepth(25);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.leftText = this.add.bitmapText(4, 3, 'miniLight', '').setDepth(51);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    const hint = Font.clean('Drag parts on   or arrows + Space', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(51);
    this.updateHud();
    this.drawSpots();

    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; this.drawCursor(); }, 'WRENCH!'));
  }

  canPlay() { return this.started && !this.finished; }

  partsLeft() { return this.spots.filter(s => !s.filled).length; }

  updateHud() {
    this.leftText.setText(Font.clean(`Parts left: ${this.partsLeft()}`, 'mini'));
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2)).setTint(s <= 10 ? 0xff7070 : 0xffffff);
  }

  // Empty spots get a blinking yellow ring.
  drawSpots(time = 0) {
    const on = Math.floor(time / 400) % 2 === 0;
    for (const s of this.spots) {
      s.ring.clear();
      if (s.filled) continue;
      s.ring.lineStyle(1, 0xf8d030, on ? 1 : 0.5).strokeCircle(s.x, s.y, 12);
    }
  }

  spotNear(x, y) {
    return this.spots.find(s => !s.filled && Phaser.Math.Distance.Between(x, y, s.x, s.y) < BIKE_SNAP) || null;
  }

  // Try to put `part` on `spot` (null = dropped somewhere else: just goes back to the tray).
  drop(part, spot) {
    if (!spot) { this.sendHome(part); return; }
    if (part.id === spot.id) {
      part.placed = true;
      spot.filled = true;
      spot.ghost.setVisible(false);
      part.img.disableInteractive().setPosition(spot.x, spot.y).setScale(1.5).setDepth(7);
      Sound.cash();
      this.flash(spot.x, spot.y - 14, this.text.right, 0x80f080);
      this.updateHud();
      this.drawSpots();
      if (!this.partsLeft()) this.finish(true);
      return;
    }
    // Wrong: junk gets its own joke, a real part just doesn't fit here.
    this.mistakes++;
    this.timeLeft -= BIKE_PENALTY_S * 1000;
    Sound.bad();
    this.cameras.main.shake(120, 0.006);
    this.flash(spot.x, spot.y - 14, part.junk ? this.text.junk[part.id] : this.text.wrong, 0xff8080);
    this.flash(GAME_W / 2, 16, `-${BIKE_PENALTY_S} SEC`, 0xff8080);
    this.sendHome(part);
  }

  sendHome(part) {
    this.tweens.add({ targets: part.img, x: part.home.x, y: part.home.y, duration: 200, onComplete: () => part.img.setDepth(20) });
  }

  flash(x, y, text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.round(x - Font.measure(clean) / 2), y, 'fontLight', clean).setTint(color).setDepth(40);
    this.tweens.add({ targets: t, y: y - 8, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() });
  }

  // Keyboard: Left/Right pick a part on the tray, Space picks it up; then the
  // arrows pick a spot and Space puts it there (Esc puts it back).
  onKey(e) {
    if (DEBUG && e.code === 'BracketRight') { this.finish(true); return; }
    if (DEBUG && e.code === 'BracketLeft') { this.finish(false); return; }
    if (!this.canPlay() || e.repeat) return;
    const left = ['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(e.code);
    const right = ['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(e.code);
    if (!this.held) {
      const open = this.tray.filter(p => !p.placed);
      if (!open.length) return;
      this.trayIndex = Phaser.Math.Clamp(this.trayIndex, 0, open.length - 1);
      if (left || right) { this.trayIndex = (this.trayIndex + (right ? 1 : -1) + open.length) % open.length; Sound.blip(); }
      else if (CONFIRM_CODES.includes(e.code)) { this.held = open[this.trayIndex]; this.spotIndex = 0; this.held.img.setDepth(30); Sound.blip(); }
    } else {
      const empty = this.spots.filter(s => !s.filled);
      if (left || right) { this.spotIndex = (this.spotIndex + (right ? 1 : -1) + empty.length) % empty.length; Sound.blip(); }
      else if (e.code === 'Escape') { this.sendHome(this.held); this.held = null; }
      else if (CONFIRM_CODES.includes(e.code)) { const part = this.held; this.held = null; this.drop(part, empty[this.spotIndex]); }
    }
    this.drawCursor();
  }

  // Keyboard cursor: a box under the chosen tray part, or the held part hovering over the chosen spot.
  drawCursor() {
    this.cursor.clear();
    if (!this.canPlay()) return;
    if (this.held) {
      const empty = this.spots.filter(s => !s.filled);
      const s = empty[Math.min(this.spotIndex, empty.length - 1)];
      if (!s) return;
      this.held.img.setPosition(s.x, s.y - 18);
      this.cursor.lineStyle(1, 0xffffff).strokeCircle(s.x, s.y, 14);
      return;
    }
    const open = this.tray.filter(p => !p.placed);
    const p = open[Phaser.Math.Clamp(this.trayIndex, 0, open.length - 1)];
    if (p) this.cursor.lineStyle(1, 0xffffff).strokeRect(p.home.x - 15, p.home.y - 15, 30, 30);
  }

  update(time, delta) {
    if (!this.canPlay()) return;
    this.timeLeft -= delta;
    this.drawSpots(time);
    this.updateHud();
    if (this.timeLeft <= 0) this.finish(false);
  }

  finish(win) {
    if (this.finished) return;
    this.finished = true;
    this.cursor.clear();
    const total = this.spots.length;
    const fill = { placed: total - this.partsLeft(), total, time: Math.max(0, Math.ceil(this.timeLeft / 1000)), mistakes: this.mistakes };
    Minigame.showResult(this, win, minigameText('dirtbike', win, fill), () => this.done({ win, ...fill }));
  }
}
