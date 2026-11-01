// Football practice: three timing drills on the field, three reps each. A
// cursor slides along the meter; press Space when it's in the green (the
// middle is PERFECT). Each drill is faster with a smaller green zone.
// Win with PRACTICE_NEED good reps. Coach yells after every rep.

const PRACTICE_REPS = 3;
const PRACTICE_NEED = 6;
const PRACTICE_TOO_SLOW_MS = 4000;  // no press by then = a miss
const PRACTICE_GROUND = 112;        // y of everyone's feet
const PRACTICE_DRILLS = [
  { kind: 'sled', name: 'Hit the sled', speed: 130, green: 40 },
  { kind: 'catch', name: 'Catch the pass', speed: 170, green: 32 },
  { kind: 'cones', name: 'Run the cones', speed: 210, green: 26 },
];
const PRACTICE_CONES_X = [150, 180, 210];

class PracticeScene extends Phaser.Scene {
  constructor() { super('Practice'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.drill = 0;
    this.rep = 0;
    this.hits = 0;
    this.waiting = false;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind
    Minigame.footballTexture(this);

    // The field: bleachers on top, grass with yard lines.
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 20; tx++) {
      this.add.image(tx * TILE, ty * TILE, 'tiles', ty < 2 ? 'bleacher' : 'floor_field').setOrigin(0);
      if (ty >= 2 && tx % 5 === 2) this.add.image(tx * TILE, ty * TILE, 'tiles', 'yardLine').setOrigin(0);
    }

    this.sled = this.add.container(0, 0, [
      this.add.image(0, 0, 'tiles', 'sledL').setOrigin(0, 1), this.add.image(16, 0, 'tiles', 'sledR').setOrigin(0, 1),
    ]).setDepth(9);
    this.cones = PRACTICE_CONES_X.map(x => this.add.image(x, PRACTICE_GROUND, 'tiles', 'cone').setOrigin(0.5, 1).setDepth(9));
    this.coach = this.add.sprite(250, PRACTICE_GROUND, 'npc_coach', 'side_0').setOrigin(0.5, 1).setFlipX(true).setDepth(10);
    this.ben = this.add.sprite(110, PRACTICE_GROUND, Ben.texture('football'), 'side_0').setOrigin(0.5, 1).setDepth(11);
    this.ball = this.add.image(0, 0, 'football').setDepth(12).setVisible(false);

    // Bottom panel: drill name, the meter, how to play.
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 124, GAME_W, 56).setDepth(30);
    this.drillText = this.add.bitmapText(0, 128, 'fontLight', '').setDepth(41);
    this.meter = new TimingMeter(this, 80, 146, 160);
    const how = Font.clean('Press Space in the green', 'mini');
    this.add.bitmapText(Math.floor((GAME_W - Font.measure(how, 'mini')) / 2), 164, 'miniLight', how).setDepth(41);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.add.bitmapText(4, 3, 'miniLight', Font.clean('Football practice', 'mini')).setDepth(51);
    this.scoreText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    this.updateHud();

    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') { this.hits = PRACTICE_NEED; this.finish(); return; }
      if (DEBUG && e.code === 'BracketLeft') { this.hits = 0; this.finish(); return; }
      if (!e.repeat && CONFIRM_CODES.includes(e.code) && this.waiting) this.press();
    });
    this.setupDrill();
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => this.startRep(), 'HUT!'));
  }

  updateHud() {
    const t = Font.clean(`Good reps: ${this.hits}/${PRACTICE_REPS * PRACTICE_DRILLS.length}  (need ${PRACTICE_NEED})`, 'mini');
    this.scoreText.setText(t).setX(GAME_W - 4 - Font.measure(t, 'mini'));
    const d = PRACTICE_DRILLS[this.drill];
    const name = Font.clean(`Drill ${this.drill + 1}: ${d.name}   Rep ${Math.min(this.rep + 1, PRACTICE_REPS)}/${PRACTICE_REPS}`);
    this.drillText.setText(name).setX(Math.floor((GAME_W - Font.measure(name)) / 2));
  }

  // Put everyone where this drill starts.
  setupDrill() {
    const kind = PRACTICE_DRILLS[this.drill].kind;
    this.sled.setVisible(kind === 'sled').setPosition(184, PRACTICE_GROUND);
    this.cones.forEach((c, i) => c.setVisible(kind === 'cones').setPosition(PRACTICE_CONES_X[i], PRACTICE_GROUND).setAngle(0));
    this.ben.setPosition(kind === 'sled' ? 150 : 110, PRACTICE_GROUND).setAngle(0).setFrame('side_0').setFlipX(false);
    this.coach.setPosition(kind === 'sled' ? 262 : 250, PRACTICE_GROUND);
    this.ball.setVisible(false).setAngle(0);
  }

  startRep() {
    if (this.finished) return;
    const d = PRACTICE_DRILLS[this.drill];
    this.updateHud();
    this.meter.start(d.speed, d.green);
    this.waiting = true;
    this.slowTimer = this.time.delayedCall(PRACTICE_TOO_SLOW_MS, () => this.press(true));
  }

  update(time, delta) {
    if (this.waiting) this.meter.update(delta);
  }

  press(tooSlow = false) {
    if (!this.waiting) return;
    this.waiting = false;
    this.slowTimer.remove();
    let result = this.meter.judge();
    if (tooSlow) result = 'miss';
    const hit = result !== 'miss';
    if (hit) this.hits++;
    this.updateHud();
    this.popText(tooSlow ? 'TOO SLOW!' : { perfect: 'PERFECT!', good: 'GOOD!', miss: 'MISS!' }[result], hit ? 0x80f080 : 0xff7070);
    this.coachYells(result);
    const ms = this.playRep(PRACTICE_DRILLS[this.drill].kind, hit);
    this.time.delayedCall(ms + 500, () => this.nextRep());
  }

  nextRep() {
    this.rep++;
    if (this.rep >= PRACTICE_REPS) {
      this.rep = 0;
      this.drill++;
      if (this.drill >= PRACTICE_DRILLS.length) { this.finish(); return; }
    }
    this.setupDrill();
    this.updateHud();
    this.time.delayedCall(250, () => this.startRep());
  }

  // Ben does the rep. Returns how long the animation takes (ms).
  playRep(kind, hit) {
    const ben = this.ben;
    ben.setFrame('side_1');
    if (kind === 'sled') {
      this.tweens.add({ targets: ben, x: 178, duration: 140, ease: 'Quad.easeIn' });
      this.time.delayedCall(140, () => {
        Sound.kick();
        if (hit) {
          this.tweens.add({ targets: this.sled, x: 200, duration: 200, ease: 'Quad.easeOut' });
          this.tweens.add({ targets: ben, x: 194, duration: 200, ease: 'Quad.easeOut' });
        } else {
          this.fall(ben, 150);
        }
      });
      return 700;
    }
    if (kind === 'catch') {
      this.ball.setVisible(true).setPosition(this.coach.x - 6, PRACTICE_GROUND - 14);
      const to = hit ? { x: ben.x + 7, y: PRACTICE_GROUND - 12 } : { x: ben.x + 1, y: PRACTICE_GROUND - 24 };
      this.tweens.add({ targets: this.ball, x: to.x, duration: 600 });
      this.tweens.add({ targets: this.ball, y: PRACTICE_GROUND - 50, duration: 300, ease: 'Quad.easeOut', yoyo: true }); // the arc
      this.tweens.add({ targets: this.ball, angle: 360, duration: 600 });
      this.time.delayedCall(600, () => {
        this.tweens.killTweensOf(this.ball);
        this.ball.setPosition(to.x, to.y).setAngle(0);
        if (hit) { Sound.good(); ben.setFrame('side_0'); return; }
        Sound.kick(); // bonk
        this.tweens.add({ targets: this.ball, x: ben.x - 20, y: PRACTICE_GROUND - 2, angle: -200, duration: 400, ease: 'Quad.easeIn' });
        this.fall(ben, ben.x);
      });
      return 1100;
    }
    // cones: weave through; a miss trips over the first one.
    if (hit) {
      const path = [[135, -6], [165, 6], [195, -6], [235, 0]];
      path.forEach(([x, dy], i) => this.time.delayedCall(i * 170, () => {
        this.tweens.add({ targets: ben, x, y: PRACTICE_GROUND + dy, duration: 170 });
        ben.setFrame(`side_${1 + (i % 2)}`);
      }));
      this.time.delayedCall(700, () => ben.setFrame('side_0').setY(PRACTICE_GROUND));
      return 750;
    }
    this.tweens.add({ targets: ben, x: PRACTICE_CONES_X[0] - 6, duration: 220, ease: 'Quad.easeIn' });
    this.time.delayedCall(220, () => {
      Sound.kick();
      this.tweens.add({ targets: this.cones[0], x: '+=24', y: '-=6', angle: 160, duration: 300 });
      this.fall(ben, PRACTICE_CONES_X[0] + 4);
    });
    return 900;
  }

  // Ben eats grass.
  fall(ben, x) {
    Sound.bad();
    ben.setFrame('side_0');
    this.tweens.add({ targets: ben, x, angle: 90, duration: 220, ease: 'Quad.easeOut' });
  }

  popText(text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.floor((GAME_W - Font.measure(clean) * 2) / 2), 60, 'fontLight', clean)
      .setScale(2).setTint(color).setDepth(45);
    this.tweens.add({ targets: t, y: 50, alpha: 0, delay: 450, duration: 400, onComplete: () => t.destroy() });
  }

  // A speech bubble over Coach with a random line for how the rep went.
  coachYells(result) {
    const lines = CONTENT.minigames.practice.coach[result];
    const line = Font.clean(Phaser.Utils.Array.GetRandom(lines), 'mini');
    const w = Font.measure(line, 'mini') + 8;
    const x = Math.min(GAME_W - w - 2, Math.round(this.coach.x - w / 2)), y = PRACTICE_GROUND - 36;
    const g = this.add.graphics().setDepth(44);
    drawPanel(g, x, y, w, 11);
    const t = this.add.bitmapText(x + 4, y + 3, 'mini', line).setDepth(45);
    this.time.delayedCall(900, () => { g.destroy(); t.destroy(); });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.waiting = false;
    if (this.slowTimer) this.slowTimer.remove();
    const win = this.hits >= PRACTICE_NEED;
    const fill = { hits: this.hits, total: PRACTICE_REPS * PRACTICE_DRILLS.length, need: PRACTICE_NEED };
    Minigame.showResult(this, win, minigameText('practice', win, fill), () => this.done({ win, ...fill }));
  }
}
