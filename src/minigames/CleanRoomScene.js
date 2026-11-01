// Clean room: Ben's room is trashed. Walk over stuff to pick it up (carry up
// to CARRY_MAX), then walk to the hamper (clothes) or the trash can (trash)
// to drop it off. Clear the whole room before the timer runs out. The mess is
// the same 22 pieces that piled up on his floor from Sunday to Thursday.

const CLEAN_TIME_S = 70;
const CARRY_MAX = 3;
const CLEAN_SPEED = 95;           // pixels per second
const CLEAN_REACH = 10;           // how close Ben's feet must be to grab something
const BIN_REACH = 20;

// Mess on the floor: which tile picture, and where it goes.
const MESS = [
  { obj: 'clothes', bin: 'hamper' }, { obj: 'socks', bin: 'hamper' },
  { obj: 'cans', bin: 'trash' }, { obj: 'chips', bin: 'trash' }, { obj: 'pizzaBox', bin: 'trash' },
];

// The room, one character per tile (20 x 11). Furniture blocks Ben.
const CLEAN_ROOM = [
  '#UYUhUUUgUkUUAUUiUU#',
  '#LLLLLLLLLLLLLLLLLL#',
  '#Bn...............D#',
  '#b.................#',
  '#q.................#',
  '#s.................#',
  '#..................#',
  '#..................#',
  '#........c.........#',
  '#.H......34......t.#',
  '####################',
];
const CLEAN_LEGEND = {
  '#': ['border'], 'U': ['wallU_ben'], 'L': ['wallL_ben'], '.': ['floor_ben'],
  'Y': ['wallU_ben', 'windowBen'], 'Q': ['wallU_ben', 'posterTruck'], 'A': ['wallU_ben', 'posterAF'],
  'h': ['wallU_ben', 'cowboyHat'], 'g': ['wallU_ben', 'gunRack'],
  'k': ['wallU_ben', 'compoundBow'], 'i': ['wallU_ben', 'woodSign'],
  'q': ['floor_ben', 'miniFridge'], 's': ['floor_ben', 'gameShelf'],
  'B': ['floor_ben', 'bedHead'], 'b': ['floor_ben', 'bedFoot'], 'n': ['floor_ben', 'nightstand'],
  '3': ['floor_ben', 'deskL'], '4': ['floor_ben', 'deskR'],
  'c': ['floor_ben', 'gamingChair'], 'D': ['floor_ben', 'dresser'],
  'H': ['floor_ben', 'hamper'], 't': ['floor_ben', 'trash'],
};

class CleanRoomScene extends Phaser.Scene {
  constructor() { super('CleanRoom'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.carried = [];
    this.cleaned = 0;
    this.timeLeft = CLEAN_TIME_S * 1000;
    this.walkMs = 0;
    this.facing = 'down';
    this.warnCooldown = 0;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    this.solid = new Set();
    CLEAN_ROOM.forEach((row, ty) => [...row].forEach((ch, tx) => {
      const layers = CLEAN_LEGEND[ch];
      layers.forEach(name => this.add.image(tx * TILE, ty * TILE, 'tiles', name).setOrigin(0));
      const top = layers[layers.length - 1];
      if (TILE_DEFS[TILE_ID[top]].solid) this.solid.add(`${tx},${ty}`);
      if (ch === 'H') this.hamper = { x: tx * TILE + 8, y: ty * TILE + 10 };
      if (ch === 't') this.trashCan = { x: tx * TILE + 8, y: ty * TILE + 10 };
    }));
    this.binLabel('Hamper', this.hamper);
    this.binLabel('Trash', this.trashCan);

    // The same mess that piled up on Ben's floor all week (BEN_MESS in maps.js),
    // stretched from his small room to this bigger one. A piece that lands on
    // furniture, a bin (or its label), Ben's start or another piece moves to the
    // nearest open spot.
    const nearBin = (tx, ty) => [this.hamper, this.trashCan].some(b => Math.abs(tx - Math.floor(b.x / TILE)) <= 1 && ty >= 8);
    const taken = new Set();
    const open = (tx, ty) => tx >= 1 && tx <= 18 && ty >= 3 && ty <= 9 && !this.solid.has(`${tx},${ty}`) &&
      !nearBin(tx, ty) && !(Math.abs(tx - 10) < 2 && Math.abs(ty - 6) < 2) && !taken.has(`${tx},${ty}`);
    this.items = BEN_MESS.map(([mx, my, obj]) => {
      const want = {
        tx: 1 + Math.round((mx - BEN_ROOM.x) * 17 / (BEN_ROOM.w - 1)),
        ty: 3 + Math.round((my - BEN_ROOM.y) * 6 / (BEN_ROOM.h - 1)),
      };
      let spot = null;
      for (let r = 0; !spot && r < 20; r++) {
        for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && open(want.tx + dx, want.ty + dy)) spot = { tx: want.tx + dx, ty: want.ty + dy };
        }
      }
      taken.add(`${spot.tx},${spot.ty}`);
      const kind = MESS.find(m => m.obj === obj);
      const x = spot.tx * TILE + 8, y = spot.ty * TILE + 8;
      return { ...kind, x, y, sprite: this.add.image(x, y, 'tiles', kind.obj).setDepth(1) };
    });
    this.total = this.items.length;

    this.ben = this.add.sprite(10 * TILE + 8, 6 * TILE + 14, Ben.texture(), 'down_0').setOrigin(0.5, 1).setDepth(10);
    this.carryIcons = this.add.container(0, 0).setDepth(11);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(20);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(21);
    this.leftText = this.add.bitmapText(4, 3, 'miniLight', '').setDepth(21);
    const hint = Font.clean('Clothes to hamper   Trash to can', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(21);
    this.updateHud();

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') this.finish(true);
      if (DEBUG && e.code === 'BracketLeft') this.finish(false);
    });
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; }, 'CLEAN!'));
  }

  binLabel(text, bin) {
    const t = Font.clean(text, 'mini');
    const w = Font.measure(t, 'mini') + 6;
    const g = this.add.graphics().setDepth(5).fillStyle(0x000000, 0.6).fillRect(bin.x - w / 2, bin.y - 24, w, 9);
    this.add.bitmapText(Math.round(bin.x - w / 2 + 3), bin.y - 22, 'miniLight', t).setDepth(6);
    return g;
  }

  updateHud() {
    const left = this.items.length + this.carried.length;
    this.leftText.setText(Font.clean(`Mess left: ${left}`, 'mini'));
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2)).setTint(s <= 10 ? 0xff7070 : 0xffffff);
  }

  // Can Ben's feet (a 10x5 box) stand at (x, y)?
  canStand(x, y) {
    for (const [px, py] of [[x - 5, y - 5], [x + 4, y - 5], [x - 5, y - 1], [x + 4, y - 1]]) {
      if (this.solid.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`)) return false;
    }
    return true;
  }

  update(time, delta) {
    if (!this.started || this.finished) return;
    this.timeLeft -= delta;
    this.warnCooldown -= delta;

    // movement
    const k = this.keys;
    let dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const moving = dx || dy;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    const step = CLEAN_SPEED * delta / 1000;
    if (dx && this.canStand(this.ben.x + dx * step, this.ben.y)) this.ben.x += dx * step;
    if (dy && this.canStand(this.ben.x, this.ben.y + dy * step)) this.ben.y += dy * step;
    if (moving) this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.walkMs = moving ? this.walkMs + delta : 0;
    const frame = moving ? [1, 0, 2, 0][Math.floor(this.walkMs / 120) % 4] : 0;
    const side = this.facing === 'left' || this.facing === 'right';
    this.ben.setFrame(`${side ? 'side' : this.facing}_${frame}`).setFlipX(this.facing === 'left');
    this.ben.setDepth(10 + this.ben.y * 0.001);

    // pick things up
    for (const item of [...this.items]) {
      if (this.carried.length >= CARRY_MAX) break;
      if (Phaser.Math.Distance.Between(this.ben.x, this.ben.y - 3, item.x, item.y) < CLEAN_REACH) {
        item.sprite.destroy();
        this.items.splice(this.items.indexOf(item), 1);
        this.carried.push(item);
        Sound.blip();
      }
    }

    // drop things off
    this.dropAt('hamper', this.hamper);
    this.dropAt('trash', this.trashCan);
    this.drawCarry();
    this.updateHud();

    if (!this.items.length && !this.carried.length) this.finish(true);
    else if (this.timeLeft <= 0) this.finish(false);
  }

  dropAt(bin, spot) {
    if (Phaser.Math.Distance.Between(this.ben.x, this.ben.y - 3, spot.x, spot.y) > BIN_REACH || !this.carried.length) return;
    const fits = this.carried.filter(i => i.bin === bin);
    if (fits.length) {
      this.carried = this.carried.filter(i => i.bin !== bin);
      this.cleaned += fits.length;
      Sound.cash();
      this.flash(spot, `+${fits.length}`, 0x80f080);
    } else if (this.warnCooldown <= 0) {
      this.warnCooldown = 1500;
      Sound.bad();
      this.flash(spot, bin === 'hamper' ? "That's trash!" : 'Those are clothes!', 0xff8080);
    }
  }

  flash(spot, text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.round(spot.x - Font.measure(clean) / 2), spot.y - 40, 'fontLight', clean).setTint(color).setDepth(30);
    this.tweens.add({ targets: t, y: t.y - 8, alpha: 0, delay: 400, duration: 500, onComplete: () => t.destroy() });
  }

  // What Ben is carrying floats over his head.
  drawCarry() {
    this.carryIcons.removeAll(true);
    this.carried.forEach((item, i) => {
      const x = this.ben.x - (this.carried.length - 1) * 5 + i * 10;
      this.carryIcons.add(this.add.image(x, this.ben.y - 28, 'tiles', item.obj).setScale(0.6));
    });
  }

  finish(win) {
    if (this.finished) return;
    this.finished = true;
    this.ben.setFrame('down_0');
    const fill = { cleaned: this.cleaned, total: this.total, time: Math.max(0, Math.ceil(this.timeLeft / 1000)) };
    Minigame.showResult(this, win, minigameText('cleanRoom', win, fill), () => this.done({ win, ...fill }));
  }
}
