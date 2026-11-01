// Friday night game: the final drive. Down 14-17 with 2:00 left, Ben's team
// needs a touchdown. Each play: pick a play (safe run, pass, or the risky Air
// Force Special), then hit the timing meter. Score before running out of plays.

const GAME_YARDS = 40;       // yards to the end zone at the start of the drive
const GAME_PLAYS = 5;
const GAME_YARD_PX = 5;      // field drawing: pixels per yard
const GAME_GOAL_X = 272;     // x of the goal line
const GAME_FIELD_Y = 92;     // y of the players' feet
const GAME_SCORE = { home: 14, away: 17 };

// Plays: meter speed and green width, yards for good / perfect / a miss.
const GAME_PLAYBOOK = [
  { id: 'run', speed: 140, green: 44, good: 6, perfect: 10, miss: 0 },
  { id: 'pass', speed: 180, green: 30, good: 15, perfect: 22, miss: 0 },
  { id: 'trick', speed: 220, green: 18, good: 30, perfect: 40, miss: -8 },
];

class FridayGameScene extends Phaser.Scene {
  constructor() { super('FridayGame'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.toGo = GAME_YARDS;
    this.play = 0;
    this.clockS = 120;
    this.state = 'intro';
    this.text = CONTENT.minigames.fridayGame;
    this.cameras.main.setBackgroundColor('#0a0a20'); // night sky; covers the paused world
    Minigame.footballTexture(this);

    this.drawField();
    // Ben's team (red) on the left of the ball, the Bulldogs (blue) on the right.
    this.teammates = ['player1', 'player2', 'player1'].map(who => this.add.sprite(0, 0, `npc_${who}`, 'side_0').setOrigin(0.5, 1));
    this.defenders = ['bulldog1', 'bulldog2', 'bulldog1'].map(who => this.add.sprite(0, 0, `npc_${who}`, 'side_0').setOrigin(0.5, 1).setFlipX(true));
    this.ben = this.add.sprite(0, 0, Ben.texture('football'), 'side_0').setOrigin(0.5, 1);
    this.ball = this.add.image(0, 0, 'football').setVisible(false).setDepth(30);
    this.lineup();

    // Scoreboard strip on top, the meter panel on the bottom.
    this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, GAME_W, 22).setDepth(50);
    this.scoreText = this.add.bitmapText(0, 3, 'fontLight', '').setDepth(51);
    this.downText = this.add.bitmapText(0, 13, 'miniLight', '').setDepth(51);
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 130, GAME_W, 50).setDepth(30);
    this.meter = new TimingMeter(this, 80, 152, 160);
    this.meter.g.setVisible(false);
    this.prompt = this.add.bitmapText(0, 136, 'fontLight', '').setDepth(41);
    this.updateHud();

    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') { this.toGo = 0; this.finish(); return; }
      if (DEBUG && e.code === 'BracketLeft') { this.play = GAME_PLAYS; this.finish(); return; }
      if (!e.repeat && !e.handled && CONFIRM_CODES.includes(e.code) && this.state === 'meter') this.snap();
    });
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => this.callPlay(), 'HIKE!'));
  }

  // Grass with yard lines every 10 yards, the end zone on the right, stadium lights.
  drawField() {
    const g = this.add.graphics();
    g.fillStyle(0x2f6a26).fillRect(0, 40, GAME_W, 70);
    for (let x = 0; x < GAME_W; x += 16) g.fillStyle(x % 32 ? 0x34742a : 0x2f6a26).fillRect(x, 40, 16, 70);
    g.fillStyle(0xa8303a).fillRect(GAME_GOAL_X, 40, GAME_W - GAME_GOAL_X, 70);
    g.fillStyle(0xf4f4f4).fillRect(GAME_GOAL_X, 40, 2, 70);
    for (let yd = 10; yd <= 50; yd += 10) {
      const x = GAME_GOAL_X - yd * GAME_YARD_PX;
      g.fillStyle(0xe8e8e0, 0.8).fillRect(x, 40, 1, 70);
      const n = Font.clean(String(yd), 'mini');
      this.add.bitmapText(x - Math.floor(Font.measure(n, 'mini') / 2), 100, 'miniLight', n).setAlpha(0.8);
    }
    // WARRIORS down the end zone, one letter per line
    [...'WARRIORS'].forEach((ch, i) => {
      const c = Font.clean(ch, 'mini');
      this.add.bitmapText(Math.floor(GAME_GOAL_X + (GAME_W - GAME_GOAL_X - Font.measure(c, 'mini')) / 2) + 1, 44 + i * 8, 'miniLight', c);
    });
    // bleachers and lights in the dark above (a red, white and black home crowd)
    g.fillStyle(0x3a3e4c).fillRect(0, 24, GAME_W, 16);
    for (let x = 4; x < GAME_W; x += 10) g.fillStyle([0xc8323a, 0xf4f4f4, 0x22222a, 0xc8323a][x % 4]).fillRect(x, 28 + (x % 3) * 3, 3, 3);
    for (const x of [40, 160, 280]) { g.fillStyle(0xfff4b0).fillRect(x - 6, 23, 12, 2); }
    this.losLine = this.add.graphics().setDepth(5);
  }

  ballX() { return GAME_GOAL_X - this.toGo * GAME_YARD_PX; }

  // Everyone lines up at the ball: blue line of scrimmage, teammates on the ball, Ben behind.
  lineup() {
    const bx = this.ballX();
    this.losLine.clear().fillStyle(0x6aa8ff, 0.8).fillRect(bx, 40, 1, 70);
    this.teammates.forEach((s, i) => s.setPosition(bx - 3, GAME_FIELD_Y - 18 + i * 18).setAngle(0).setDepth(10 + i));
    this.defenders.forEach((s, i) => s.setPosition(bx + 10, GAME_FIELD_Y - 18 + i * 18).setAngle(0).setDepth(10 + i));
    this.ben.setPosition(bx - 18, GAME_FIELD_Y).setAngle(0).setFrame('side_0').setDepth(12);
    this.ball.setVisible(false);
  }

  updateHud() {
    const clock = `${Math.floor(this.clockS / 60)}:${String(this.clockS % 60).padStart(2, '0')}`;
    const score = Font.clean(`WARRIORS ${GAME_SCORE.home}   BULLDOGS ${GAME_SCORE.away}   4TH ${clock}`);
    this.scoreText.setText(score).setX(Math.floor((GAME_W - Font.measure(score)) / 2));
    const left = GAME_PLAYS - this.play;
    const down = Font.clean(`${left} play${left === 1 ? '' : 's'} left   ${Math.max(0, this.toGo)} yards to the end zone`, 'mini');
    this.downText.setText(down).setX(Math.floor((GAME_W - Font.measure(down, 'mini')) / 2));
  }

  setPrompt(text) {
    const clean = Font.clean(text);
    this.prompt.setText(clean).setX(Math.floor((GAME_W - Font.measure(clean)) / 2));
  }

  // Coach's play call: a menu of the three plays.
  callPlay() {
    if (this.finished) return;
    this.state = 'menu';
    this.setPrompt(''); // the menu sits over the bottom panel, below the field
    this.meter.g.setVisible(false);
    this.menu = new Menu(this, {
      w: 236, y: 108, title: this.text.menuTitle, depth: 60,
      items: GAME_PLAYBOOK.map(p => ({
        label: this.text.plays[p.id].name,
        value: () => this.text.plays[p.id].risk,
        select: () => this.startMeter(p),
      })),
    });
  }

  startMeter(playDef) {
    this.menu.destroy();
    this.current = playDef;
    this.state = 'meter';
    this.setPrompt(this.text.meterPrompt);
    this.meter.g.setVisible(true);
    this.meter.start(playDef.speed, playDef.green);
  }

  update(time, delta) {
    if (this.state === 'meter') this.meter.update(delta);
  }

  // Space on the meter: how the play goes.
  snap() {
    this.state = 'play';
    const result = this.meter.judge();
    const p = this.current;
    const yards = p[result === 'miss' ? 'miss' : result];
    const word = result === 'miss' ? this.text.plays[p.id].missText : result === 'perfect' ? 'PERFECT!' : 'NICE!';
    this.play++;
    this.clockS = Math.max(0, this.clockS - 22);
    this.animatePlay(p.id, result !== 'miss', yards, () => {
      this.toGo = Math.max(0, this.toGo - yards);
      const label = yards > 0 ? `${word} +${yards} YARDS` : yards < 0 ? `${word} ${yards} YARDS` : word;
      this.popText(this.toGo <= 0 ? 'TOUCHDOWN!' : label, yards > 0 ? 0x80f080 : 0xff7070);
      this.updateHud();
      this.time.delayedCall(900, () => {
        if (this.toGo <= 0 || this.play >= GAME_PLAYS) { this.finish(); return; }
        this.lineup();
        this.callPlay();
      });
    });
  }

  // Ben (and the ball) go where the play takes them, then done().
  animatePlay(kind, hit, yards, done) {
    const ben = this.ben, to = this.ballX() + yards * GAME_YARD_PX - 18;
    const goalX = Math.min(to, GAME_GOAL_X + 20);
    ben.setFrame('side_1');
    Sound.kick();
    // The defenders rush either way.
    this.defenders.forEach((d, i) => this.tweens.add({ targets: d, x: d.x - 10 - i * 4, duration: 300 }));
    if (kind === 'pass' && !hit) {
      // Incomplete: the ball sails way over everybody.
      this.ball.setVisible(true).setPosition(ben.x + 4, GAME_FIELD_Y - 14);
      this.tweens.add({ targets: this.ball, x: ben.x + 160, y: 30, angle: 540, duration: 700, onComplete: () => { Sound.bad(); done(); } });
      return;
    }
    if (!hit) {
      // Stuffed (run) or sacked (trick): a Bulldog flattens Ben.
      const back = ben.x + yards * GAME_YARD_PX + (kind === 'run' ? 8 : 0);
      this.tweens.add({ targets: this.defenders[1], x: back + 8, y: GAME_FIELD_Y, duration: 300, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: ben, x: back, duration: 300 });
      this.time.delayedCall(300, () => {
        Sound.bad();
        this.cameras.main.shake(150, 0.01);
        this.tweens.add({ targets: ben, angle: 90, duration: 150, onComplete: () => this.time.delayedCall(250, done) });
      });
      return;
    }
    if (kind === 'pass' || kind === 'trick') {
      this.ball.setVisible(true).setPosition(ben.x + 4, GAME_FIELD_Y - 14);
      this.tweens.add({ targets: this.ball, x: goalX + 4, duration: 600 });
      this.tweens.add({ targets: this.ball, y: GAME_FIELD_Y - 44, duration: 300, ease: 'Quad.easeOut', yoyo: true });
    }
    // Ben runs it (on a pass he runs under it and catches it himself. It's the Air Force Special).
    this.tweens.add({
      targets: ben, x: goalX, duration: kind === 'run' ? 500 : 600,
      onUpdate: tw => ben.setFrame(`side_${1 + (Math.floor(tw.progress * 6) % 2)}`),
      onComplete: () => { ben.setFrame('side_0'); this.ball.setVisible(false); Sound.good(); done(); },
    });
  }

  popText(text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.floor((GAME_W - Font.measure(clean) * 2) / 2), 52, 'fontLight', clean)
      .setScale(2).setTint(color).setDepth(55);
    this.tweens.add({ targets: t, y: 44, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'over';
    if (this.menu) this.menu.destroy();
    const win = this.toGo <= 0;
    const fill = { home: GAME_SCORE.home + (win ? 7 : 0), away: GAME_SCORE.away, yards: Math.max(0, this.toGo) };
    Minigame.showResult(this, win, minigameText('fridayGame', win, fill), () => this.done({ win, ...fill }));
  }
}
