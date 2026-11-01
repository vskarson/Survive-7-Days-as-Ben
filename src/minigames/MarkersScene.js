// Marker throwing: Mr. Stepp keeps popping up from behind his desk and ducking
// back down. Aim the crosshair (arrows/WASD or the mouse) and throw a marker
// (Space or click). A marker takes a moment to land, so lead him a little.
// Hit him MARKERS_NEED times before the markers or the time run out.

const MARKERS_AMMO = 10;
const MARKERS_NEED = 5;
const MARKERS_TIME_S = 30;
const MARKERS_AIM_SPEED = 150;     // crosshair, pixels per second
const MARKERS_FLIGHT_MS = 380;
const DESK = { x: 96, y: 96, scale: 4 };            // top-left of the big desk drawing (32x16 tiles at 4x)
const DESK_TOP = DESK.y + 4 * DESK.scale;          // where the desk top edge is drawn
const STEPP_SPOTS = [120, 160, 200];               // where he pops up behind the desk
const STEPP_UP_Y = DESK_TOP + 2, STEPP_DOWN_Y = DESK_TOP + 50; // up: head clear of the papers on the desk // feet of the (2x) sprite
const MARKER_COLORS = [0xc8323a, 0x3a6ae8, 0x40a040, 0x22222a];

class MarkersScene extends Phaser.Scene {
  constructor() { super('Markers'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.ammo = MARKERS_AMMO;
    this.hits = 0;
    this.inFlight = 0;
    this.timeLeft = MARKERS_TIME_S * 1000;
    this.text = CONTENT.minigames.markers;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    // The front of the classroom: wall with the whiteboard, floor, Stepp's big desk.
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 20; tx++) {
      const name = ty < 3 ? 'wallU_classroom' : ty === 3 ? 'wallL_classroom' : 'floor_classroom';
      this.add.image(tx * TILE, ty * TILE, 'tiles', name).setOrigin(0);
    }
    for (let i = 0; i < 4; i++) this.add.image(96 + i * 32, 18, 'tiles', `whiteboard${i}`).setOrigin(0).setScale(2);
    this.add.image(272, 8, 'tiles', 'wallClock').setOrigin(0).setScale(2);

    this.stepp = this.add.sprite(STEPP_SPOTS[1], STEPP_DOWN_Y, 'npc_stepp', 'down_0').setOrigin(0.5, 1).setScale(2).setDepth(5);
    this.splats = this.add.graphics().setDepth(6);  // marker ink on Stepp, drawn relative to him
    this.splatList = [];
    this.add.image(DESK.x, DESK.y, 'tiles', 'teacherDeskL').setOrigin(0).setScale(DESK.scale).setDepth(10);
    this.add.image(DESK.x + 16 * DESK.scale, DESK.y, 'tiles', 'teacherDeskR').setOrigin(0).setScale(DESK.scale).setDepth(10);
    this.steppUp = false;
    this.steppX = STEPP_SPOTS[1];

    // Ben's back at the bottom of the screen, throwing from his desk.
    this.ben = this.add.sprite(160, 200, Ben.texture(), 'up_0').setOrigin(0.5, 1).setScale(3).setDepth(20);
    this.aim = { x: 160, y: 90 };
    this.reticle = this.add.graphics().setDepth(40);
    this.inkOnBoard = this.add.graphics().setDepth(2);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.leftText = this.add.bitmapText(4, 3, 'miniLight', '').setDepth(51);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    const hint = Font.clean('Aim, then Space (or click)', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(51);
    this.updateHud();

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') { this.hits = MARKERS_NEED; this.finish(); return; }
      if (DEBUG && e.code === 'BracketLeft') { this.hits = 0; this.finish(); return; }
      if (!e.repeat && CONFIRM_CODES.includes(e.code)) this.throwMarker();
    });
    this.input.on('pointermove', p => { if (this.canPlay()) this.setAim(p.x, p.y); });
    this.input.on('pointerdown', p => { if (this.canPlay()) { this.setAim(p.x, p.y); this.throwMarker(); } });
    this.drawReticle();
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; this.popUp(); }, 'THROW!'));
  }

  canPlay() { return this.started && !this.finished; }

  setAim(x, y) {
    this.aim.x = Phaser.Math.Clamp(x, 8, GAME_W - 8);
    this.aim.y = Phaser.Math.Clamp(y, 20, 150);
  }

  updateHud() {
    this.leftText.setText(Font.clean(`Markers: ${this.ammo}   Hits: ${this.hits}/${MARKERS_NEED}`, 'mini'));
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2)).setTint(s <= 10 ? 0xff7070 : 0xffffff);
  }

  // Stepp's timing gets quicker with every hit.
  upMs() { return Math.max(650, 1300 - this.hits * 130) + Phaser.Math.Between(0, 300); }
  downMs() { return Math.max(350, 900 - this.hits * 90) + Phaser.Math.Between(0, 400); }

  popUp() {
    if (!this.canPlay()) return;
    const spots = STEPP_SPOTS.filter(x => x !== this.steppX);
    this.steppX = Phaser.Utils.Array.GetRandom(spots);
    this.stepp.setPosition(this.steppX, STEPP_DOWN_Y);
    this.tweens.add({
      targets: this.stepp, y: STEPP_UP_Y, duration: 140, ease: 'Quad.easeOut',
      onComplete: () => { this.steppUp = true; if (Math.random() < 0.5) this.yell(Phaser.Utils.Array.GetRandom(this.text.yells)); },
    });
    this.duckTimer = this.time.delayedCall(140 + this.upMs(), () => this.duck());
  }

  duck() {
    if (this.duckTimer) this.duckTimer.remove();
    this.steppUp = false;
    this.tweens.killTweensOf(this.stepp);
    this.tweens.add({ targets: this.stepp, y: STEPP_DOWN_Y, duration: 120, ease: 'Quad.easeIn' });
    this.popTimer = this.time.delayedCall(120 + this.downMs(), () => this.popUp());
  }

  // Stepp's head and shirt above the desk: where a marker counts as a hit.
  steppBox() {
    const top = this.stepp.y - BEN_H * 2;
    return new Phaser.Geom.Rectangle(this.stepp.x - 12, top, 24, DESK_TOP + 4 - top);
  }

  throwMarker() {
    if (!this.canPlay() || this.ammo <= 0) return;
    this.ammo--;
    this.inFlight++;
    this.updateHud();
    Sound.blip();
    const color = MARKER_COLORS[this.ammo % MARKER_COLORS.length];
    const m = this.add.rectangle(150, 170, 3, 12, color).setStrokeStyle(1, 0x181425).setDepth(30);
    const to = { x: this.aim.x, y: this.aim.y };
    this.ben.setFrame('up_1');
    this.time.delayedCall(150, () => this.ben.setFrame('up_0'));
    this.tweens.add({ targets: m, x: to.x, duration: MARKERS_FLIGHT_MS });
    // Up in an arc, then down onto the target.
    this.tweens.chain({ targets: m, tweens: [
      { y: Math.min(to.y, 150) - 24, duration: MARKERS_FLIGHT_MS / 2, ease: 'Quad.easeOut' },
      { y: to.y, duration: MARKERS_FLIGHT_MS / 2, ease: 'Quad.easeIn' },
    ] });
    this.tweens.add({ targets: m, angle: 720, scale: 0.6, duration: MARKERS_FLIGHT_MS });
    this.time.delayedCall(MARKERS_FLIGHT_MS, () => { m.destroy(); this.land(to, color); });
  }

  land(at, color) {
    this.inFlight--;
    if (this.finished) return;
    if (this.steppUp && this.steppBox().contains(at.x, at.y)) {
      this.hits++;
      Sound.kick();
      this.cameras.main.shake(100, 0.006);
      // Ink stays on him for the rest of the game.
      this.splatList.push({ dx: at.x - this.stepp.x, dy: at.y - this.stepp.y, color });
      this.flash(at.x, at.y - 18, Phaser.Utils.Array.GetRandom(this.text.hit), 0x80f080);
      this.duck();
    } else {
      Sound.tick();
      if (at.y < DESK_TOP - 8) this.inkOnBoard.fillStyle(color, 0.9).fillRect(Math.round(at.x) - 1, Math.round(at.y) - 1, 3, 3);
      this.flash(at.x, at.y - 12, this.text.miss, 0xff8080);
    }
    this.updateHud();
    if (this.hits >= MARKERS_NEED || (this.ammo <= 0 && this.inFlight <= 0)) this.finish();
  }

  yell(line) {
    const clean = Font.clean(line, 'mini');
    const w = Font.measure(clean, 'mini') + 8;
    const x = Phaser.Math.Clamp(Math.round(this.stepp.x - w / 2), 2, GAME_W - w - 2), y = STEPP_UP_Y - 60;
    const g = this.add.graphics().setDepth(45);
    drawPanel(g, x, y, w, 11);
    const t = this.add.bitmapText(x + 4, y + 3, 'mini', clean).setDepth(46);
    this.time.delayedCall(800, () => { g.destroy(); t.destroy(); });
  }

  flash(x, y, text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.round(x - Font.measure(clean) / 2), y, 'fontLight', clean).setTint(color).setDepth(48);
    this.tweens.add({ targets: t, y: y - 8, alpha: 0, delay: 400, duration: 400, onComplete: () => t.destroy() });
  }

  drawReticle() {
    const { x, y } = this.aim;
    this.reticle.clear().lineStyle(1, 0x181425).strokeCircle(x, y, 7).lineStyle(1, 0xffffff).strokeCircle(x, y, 6);
    this.reticle.fillStyle(0xffffff).fillRect(x - 10, y, 6, 1).fillRect(x + 5, y, 6, 1).fillRect(x, y - 10, 1, 6).fillRect(x, y + 5, 1, 6);
  }

  update(time, delta) {
    // Ink splats ride along with Stepp, hidden behind the desk when he ducks.
    this.splats.clear();
    for (const s of this.splatList) {
      const sy = this.stepp.y + s.dy;
      if (sy < DESK_TOP + 2) this.splats.fillStyle(s.color).fillRect(Math.round(this.stepp.x + s.dx) - 2, Math.round(sy) - 1, 4, 3);
    }
    if (!this.canPlay()) return;
    this.timeLeft -= delta;
    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (dx || dy) this.setAim(this.aim.x + dx * MARKERS_AIM_SPEED * delta / 1000, this.aim.y + dy * MARKERS_AIM_SPEED * delta / 1000);
    this.drawReticle();
    this.updateHud();
    if (this.timeLeft <= 0) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.reticle.clear();
    [this.duckTimer, this.popTimer].forEach(t => t && t.remove());
    const win = this.hits >= MARKERS_NEED;
    const fill = { hits: this.hits, need: MARKERS_NEED, ammo: MARKERS_AMMO };
    Minigame.showResult(this, win, minigameText('markers', win, fill), () => this.done({ win, ...fill }));
  }
}
