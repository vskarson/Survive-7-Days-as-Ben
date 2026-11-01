// Avoid Chevy: Ben is hiding in the middle stall. Chevy wanders the bathroom.
// When he crouches to peek under Ben's stall, hold Up to lift Ben's feet (his
// legs get tired). When he pushes on Ben's door, mash Space to hold it shut.
// Last until Chevy gives up. Goofy, not scary: he just wants a hug.

const CHEVY_TIME_S = 35;
const CHEVY_STALLS = [80, 160, 240];   // stall door centers
const CHEVY_BEN_STALL = 1;
const CHEVY_FLOOR_Y = 168;            // Chevy's feet
const CHEVY_WALK = 55;                // pixels per second
const CHEVY_CROUCH_MS = 700;          // the warning before he looks
const CHEVY_LOOK_MS = 900;
const LEGS_DRAIN = 22, LEGS_REGEN = 30;   // stamina per second while lifted / resting
const DOOR_PUSH = 55, DOOR_HOLD = 13, DOOR_SETTLE = 70; // door open % per second / per Space / per second when he stops
const DOOR_TOP = 36, DOOR_BOTTOM = 112;

// The bathroom seen from the side (also Chevy's attack on Thursday): green tile
// wall down to the floor line, floor tiles below, and the stall partitions.
function drawStallRoom(scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x7aa890).fillRect(0, 0, GAME_W, DOOR_BOTTOM + 10);
  for (let y = 3; y < DOOR_BOTTOM + 10; y += 8) g.fillStyle(0x5a8a72).fillRect(0, y, GAME_W, 1);
  for (let x = 3; x < GAME_W; x += 8) g.fillStyle(0x5a8a72).fillRect(x, 0, 1, DOOR_BOTTOM + 10);
  for (let y = DOOR_BOTTOM + 10; y < GAME_H; y += TILE) for (let x = 0; x < GAME_W; x += TILE) scene.add.image(x, y, 'tiles', 'floor_schoolBath').setOrigin(0);
  for (const x of [40, 120, 200, 280]) g.fillStyle(0x4a6a60).fillRect(x - 3, DOOR_TOP - 6, 6, DOOR_BOTTOM - DOOR_TOP + 16);
  g.fillStyle(0x101818).fillRect(40, DOOR_BOTTOM, 240, 10);   // the dark gap under the doors
}

class AvoidChevyScene extends Phaser.Scene {
  constructor() { super('AvoidChevy'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.timeLeft = CHEVY_TIME_S * 1000;
    this.legs = 100;
    this.door = 0;            // how far Chevy has pushed the door open, 0-100
    this.feetUp = false;
    this.mode = 'walk';       // walk, crouch, look, push, yell
    this.text = CONTENT.minigames.avoidChevy;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    drawStallRoom(this);
    this.doors = CHEVY_STALLS.map(x => this.add.container(x, DOOR_TOP, [
      this.add.rectangle(-37, 0, 74, DOOR_BOTTOM - DOOR_TOP, 0x6a8a80).setOrigin(0, 0).setStrokeStyle(1, 0x2a4a40),
      this.add.rectangle(24, 34, 6, 3, x === CHEVY_STALLS[CHEVY_BEN_STALL] ? 0xc8323a : 0x40a040),  // lock: red = occupied
    ]).setDepth(5));
    this.crack = this.add.graphics().setDepth(4);   // dark gap when the door gets pushed open

    // Ben's boots under his door.
    const bx = CHEVY_STALLS[CHEVY_BEN_STALL];
    this.boots = this.add.graphics().setDepth(6);
    this.boots.fillStyle(0x181425).fillRect(bx - 11, DOOR_BOTTOM + 3, 9, 6).fillRect(bx + 2, DOOR_BOTTOM + 3, 9, 6);
    this.boots.fillStyle(0x6a4428).fillRect(bx - 10, DOOR_BOTTOM + 4, 7, 4).fillRect(bx + 3, DOOR_BOTTOM + 4, 7, 4);

    this.chevy = this.add.sprite(20, CHEVY_FLOOR_Y, 'npc_chevy', 'side_0').setOrigin(0.5, 1).setScale(2).setDepth(10);
    this.chevyTarget = null;
    this.alert = this.add.bitmapText(0, 0, 'fontLight', '!').setScale(2).setDepth(30).setVisible(false).setTint(0xffd040);

    // HUD strip and the two bars at the bottom.
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.add.bitmapText(4, 3, 'miniLight', Font.clean('Hide from Chevy', 'mini')).setDepth(51);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    const hint = Font.clean('Up: lift feet   Space: hold door', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(51);
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 172, GAME_W, 8).setDepth(50);
    this.add.bitmapText(4, 173, 'miniLight', Font.clean('Legs', 'mini')).setDepth(51);
    this.add.bitmapText(170, 173, 'miniLight', Font.clean('Door', 'mini')).setDepth(51);
    this.bars = this.add.graphics().setDepth(51);

    this.keys = this.input.keyboard.addKeys('UP,W');
    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') { this.finish(true); return; }
      if (DEBUG && e.code === 'BracketLeft') { this.finish(false); return; }
      if (!e.repeat && CONFIRM_CODES.includes(e.code) && this.canPlay() && this.door > 0) {
        this.door = Math.max(0, this.door - DOOR_HOLD);
        Sound.tick();
      }
    });
    this.updateHud();
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; this.nextMove(); }, 'HIDE!'));
  }

  canPlay() { return this.started && !this.finished; }

  updateHud() {
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2));
    const b = this.bars.clear();
    for (const [x, v, color] of [[26, this.legs, this.legs < 30 ? 0xe04040 : 0x40a040], [192, this.door, 0xe8782a]]) {
      b.fillStyle(0x4a4a52).fillRect(x, 174, 100, 4).fillStyle(color).fillRect(x, 174, Math.round(v), 4);
    }
  }

  // Chevy decides what to do next: walk to a stall, then peek or push there.
  nextMove() {
    if (!this.canPlay()) return;
    // Always a different stall than the one he's at (so Ben's legs get a break); Ben's comes up the most.
    const here = this.chevyTarget ? this.chevyTarget.stall : -1;
    const stall = Phaser.Utils.Array.GetRandom([0, 1, 1, 2, 1].filter(s => s !== here));
    this.mode = 'walk';
    this.chevyTarget = { x: CHEVY_STALLS[stall], stall };
    if (Math.random() < 0.3) this.say(Phaser.Utils.Array.GetRandom(this.text.calls));
  }

  arrive(stall) {
    const atBen = stall === CHEVY_BEN_STALL;
    if (atBen && Math.random() < 0.45) this.startPush(); else this.startPeek(stall);
  }

  // Crouch (the warning), then look under the door.
  startPeek(stall) {
    this.mode = 'crouch';
    this.chevy.setFrame('up_0').setFlipX(false);
    this.alert.setPosition(this.chevy.x - 4, CHEVY_FLOOR_Y - 70).setVisible(stall === CHEVY_BEN_STALL);
    this.tweens.add({ targets: this.chevy, scaleY: 1.3, duration: CHEVY_CROUCH_MS });
    this.time.delayedCall(CHEVY_CROUCH_MS, () => {
      if (!this.canPlay()) return;
      this.mode = 'look';
      this.lookStall = stall;
      if (stall !== CHEVY_BEN_STALL) this.say(this.text.wrongStall);
      this.time.delayedCall(CHEVY_LOOK_MS, () => {
        if (!this.canPlay()) return;
        this.alert.setVisible(false);
        this.tweens.add({ targets: this.chevy, scaleY: 2, duration: 200, onComplete: () => this.nextMove() });
        this.mode = 'stand';
      });
    });
  }

  startPush() {
    this.mode = 'push';
    this.chevy.setFrame('up_0').setFlipX(false);
    this.say(Phaser.Utils.Array.GetRandom(this.text.pushes));
    this.time.delayedCall(Phaser.Math.Between(2200, 3400), () => {
      if (!this.canPlay()) return;
      this.mode = 'stand';
      this.time.delayedCall(300, () => this.nextMove());
    });
  }

  say(line) {
    if (this.bubble) this.bubble.forEach(o => o.destroy());
    const clean = Font.clean(line, 'mini');
    const w = Font.measure(clean, 'mini') + 8;
    // Beside his head (not above it, where it would cover Ben's boots under the door).
    const right = this.chevy.x + 18 + w <= GAME_W - 2;
    const x = right ? Math.round(this.chevy.x + 18) : Math.round(this.chevy.x - 18 - w), y = CHEVY_FLOOR_Y - 40;
    const g = this.add.graphics().setDepth(40);
    drawPanel(g, x, y, w, 11);
    const t = this.add.bitmapText(x + 4, y + 3, 'mini', clean).setDepth(41);
    this.bubble = [g, t];
    this.time.delayedCall(1100, () => { g.destroy(); t.destroy(); });
  }

  update(time, delta) {
    if (!this.canPlay()) return;
    this.timeLeft -= delta;

    // Feet: Up lifts them while Ben's legs last.
    const wantUp = this.keys.UP.isDown || this.keys.W.isDown;
    this.feetUp = wantUp && this.legs > 0;
    this.legs = Phaser.Math.Clamp(this.legs + (this.feetUp ? -LEGS_DRAIN : LEGS_REGEN) * delta / 1000, 0, 100);
    this.boots.setVisible(!this.feetUp);
    // Tired legs shake.
    this.boots.x = this.feetUp ? 0 : this.legs < 30 ? Math.round(Math.sin(time / 40)) : 0;

    // Chevy walking.
    if (this.mode === 'walk' && this.chevyTarget) {
      const dx = this.chevyTarget.x - this.chevy.x;
      const step = CHEVY_WALK * delta / 1000;
      this.chevy.setFrame(`side_0`).setFlipX(dx < 0);
      if (Math.abs(dx) <= step) { this.chevy.x = this.chevyTarget.x; this.arrive(this.chevyTarget.stall); }
      else this.chevy.x += Math.sign(dx) * step;
      this.chevy.y = CHEVY_FLOOR_Y - Math.abs(Math.sin(time / 90)) * 2; // little bounce in his step
    }

    // Door: Chevy pushes it open, Space shoves it back, it settles shut when he stops.
    const ben = CHEVY_STALLS[CHEVY_BEN_STALL];
    if (this.mode === 'push') this.door = Math.min(100, this.door + DOOR_PUSH * delta / 1000);
    else this.door = Math.max(0, this.door - DOOR_SETTLE * delta / 1000);
    const shove = this.mode === 'push' ? Math.round(Math.sin(time / 30)) : 0;
    this.doors[CHEVY_BEN_STALL].x = ben + shove;
    this.crack.clear();
    if (this.door > 0) this.crack.fillStyle(0x101818).fillRect(ben + 37 - this.door * 0.3, DOOR_TOP, this.door * 0.3, DOOR_BOTTOM - DOOR_TOP);
    this.doors[CHEVY_BEN_STALL].list[0].setSize(74 - this.door * 0.3, DOOR_BOTTOM - DOOR_TOP); // swings open on the right

    // Caught?
    if (this.mode === 'look' && this.lookStall === CHEVY_BEN_STALL && !this.feetUp) { this.finish(false, 'feet'); return; }
    if (this.door >= 100) { this.finish(false, 'door'); return; }
    this.updateHud();
    if (this.timeLeft <= 0) this.finish(true);
  }

  finish(win, how) {
    if (this.finished) return;
    this.finished = true;
    this.alert.setVisible(false);
    this.boots.setVisible(true);
    if (!win) this.say(this.text.found);
    const fill = { time: Math.max(0, Math.round((CHEVY_TIME_S * 1000 - this.timeLeft) / 1000)), how: how === 'door' ? this.text.byDoor : this.text.byFeet };
    this.time.delayedCall(win ? 0 : 500, () => {
      Minigame.showResult(this, win, minigameText('avoidChevy', win, fill), () => this.done({ win, ...fill }));
    });
  }
}
