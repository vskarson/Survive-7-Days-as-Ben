// Sam's tantrum, in two parts. First Sam throws toys at Ben: move left/right
// (arrows/WASD) to dodge them; three hits and Ben loses. Then Sam runs out of
// breath and yells three things: pick the right calming line each time (two of
// three right wins). Wrong lines get a toy to the face but no hearts lost.

const SAM_DODGE_S = 20;
const SAM_HEARTS = 3;
const SAM_LINES_NEED = 2;
const SAM_BEN_Y = 166;            // Ben's feet
const SAM_SPEED = 130;            // Ben, pixels per second
const SAM_AT = { x: 160, y: 72 }; // Sam's feet (2x sprite)
const SAM_HIT_R = 10;

class SamTantrumScene extends Phaser.Scene {
  constructor() { super('SamTantrum'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.phase = 'intro';
    this.hearts = SAM_HEARTS;
    this.goodLines = 0;
    this.round = 0;
    this.elapsed = 0;
    this.nextThrow = 600;
    this.toys = [];
    this.hurtMs = 0;
    this.text = CONTENT.minigames.samTantrum;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind
    this.buildToyTextures();

    // Sam's room: blue carpet, green wall with his window and dinosaur poster.
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 20; tx++) {
      this.add.image(tx * TILE, ty * TILE, 'tiles', ty < 2 ? 'wallU_sam' : ty === 2 ? 'wallL_sam' : 'floor_sam').setOrigin(0);
    }
    this.add.image(64, 8, 'tiles', 'windowSam').setOrigin(0).setScale(1.5);
    this.add.image(232, 8, 'tiles', 'dinoPoster').setOrigin(0).setScale(1.5);
    for (let x = 128; x < 192; x += 16) for (let y = 48; y < 80; y += 16) this.add.image(x, y, 'tiles', 'samRug').setOrigin(0);
    this.add.image(40, 64, 'tiles', 'toybox').setOrigin(0).setScale(2);

    this.sam = this.add.sprite(SAM_AT.x, SAM_AT.y, 'npc_sam', 'down_0').setOrigin(0.5, 1).setScale(2).setDepth(10);
    this.ben = this.add.sprite(160, SAM_BEN_Y, Ben.texture(), 'up_0').setOrigin(0.5, 1).setDepth(20);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.heartIcons = this.add.graphics().setDepth(51);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    this.hintText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    this.setHint(this.text.dodgeHint);
    this.updateHud();

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D');
    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') { this.goodLines = SAM_LINES_NEED; this.finish(true); }
      if (DEBUG && e.code === 'BracketLeft') this.finish(false, 'hearts');
    });
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.phase = 'dodge'; this.say(this.text.startYell); }, 'DODGE!'));
  }

  // Toys Sam throws: a dinosaur, a block, a ball and a toy truck.
  buildToyTextures() {
    const toys = {
      toyDino: [BIKE_PARTS.dino.rows, BIKE_PARTS.dino.pal],
      toyBlock: [['kkkkkkkkkk', 'kbbbbbbbbk', 'kbwwbbwwbk', 'kbwbwwbwbk', 'kbwwwwwwbk', 'kbwbbbbwbk', 'kbwbbbbwbk', 'kbbbbbbbbk', 'kkkkkkkkkk'],
        { k: K, b: '#3a6ae8', w: '#f4f4f4' }],
      toyBall: [['..kkkk..', '.krrwrk.', 'krrrrwrk', 'kyyyyyyk', 'kyyyyyyk', 'krrrrrrk', '.krrrrk.', '..kkkk..'],
        { k: K, r: '#c8323a', y: '#f0d040', w: '#f4f4f4' }],
      toyTruck: [['....kkkk..', '...krrbbk.', 'kkkkrrrrkk', 'krrrrrrrrk', 'kkkkkkkkkk', '.kgk..kgk.', '..k....k..'],
        { k: K, r: '#e8782a', b: '#8ab8d8', g: '#9aa0ac' }],
    };
    for (const [key, [rows, pal]] of Object.entries(toys)) {
      if (!this.textures.exists(key)) Art.buildStrip(this, key, { a: rows }, pal, rows[0].length, rows.length);
    }
    this.toyKeys = Object.keys(toys);
  }

  setHint(text) {
    const clean = Font.clean(text, 'mini');
    this.hintText.setText(clean).setX(GAME_W - 4 - Font.measure(clean, 'mini'));
  }

  updateHud() {
    const g = this.heartIcons.clear();
    for (let i = 0; i < SAM_HEARTS; i++) {
      const x = 4 + i * 10, on = i < this.hearts;
      g.fillStyle(on ? 0xe83a3a : 0x4a4a52).fillRect(x, 4, 3, 3).fillRect(x + 4, 4, 3, 3).fillRect(x, 6, 7, 2).fillRect(x + 1, 8, 5, 1).fillRect(x + 2, 9, 3, 1);
    }
    const left = this.phase === 'dodge' ? Math.max(0, Math.ceil(SAM_DODGE_S - this.elapsed / 1000)) : 0;
    const t = this.phase === 'dodge' ? Font.clean(`0:${String(left).padStart(2, '0')}`, 'mini')
      : this.phase === 'talk' ? Font.clean(`Calm him down: ${this.round + 1}/${this.text.rounds.length}`, 'mini') : '';
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2));
  }

  say(line, ms = 1200) {
    if (this.bubble) this.bubble.forEach(o => o.destroy());
    const clean = Font.clean(line);
    const w = Font.measure(clean) + 10;
    const x = Math.round(SAM_AT.x - w / 2), y = 16;
    const g = this.add.graphics().setDepth(40);
    drawPanel(g, x, y, w, 14);
    const t = this.add.bitmapText(x + 5, y + 4, 'font', clean).setDepth(41);
    this.bubble = [g, t];
    if (ms) this.time.delayedCall(ms, () => { if (this.bubble && this.bubble[1] === t) { g.destroy(); t.destroy(); this.bubble = null; } });
  }

  // A toy flies in an arc from Sam's hands toward where Ben is (a bit off, so moving matters).
  throwToy() {
    const k = Math.min(1, this.elapsed / (SAM_DODGE_S * 1000));
    const flight = 1200 - 400 * k;
    const tx = Phaser.Math.Clamp(this.ben.x + Phaser.Math.Between(-24, 24), 12, GAME_W - 12);
    const toy = this.add.image(SAM_AT.x + Phaser.Math.Between(-8, 8), SAM_AT.y - 30, Phaser.Utils.Array.GetRandom(this.toyKeys))
      .setScale(1.5).setDepth(30);
    const fromX = toy.x, fromY = toy.y, toY = SAM_BEN_Y - 6;
    // A shadow on the carpet shows where it's going to land, getting darker as it falls.
    const shadow = this.add.ellipse(tx, SAM_BEN_Y - 1, 12, 4, 0x000000, 0.15).setDepth(15);
    const obj = { toy, shadow, hit: false };
    this.toys.push(obj);
    this.sam.setFrame('side_0').setFlipX(tx < SAM_AT.x);
    this.time.delayedCall(200, () => this.sam.setFrame('down_0'));
    obj.tween = this.tweens.addCounter({
      from: 0, to: 1, duration: flight,
      onUpdate: tw => {
        const p = tw.getValue();
        toy.setPosition(fromX + (tx - fromX) * p, fromY + (toY - fromY) * p - Math.sin(p * Math.PI) * 40).setAngle(p * 540);
        shadow.setFillStyle(0x000000, 0.15 + 0.35 * p).setSize(8 + 8 * p, 3 + 2 * p);
      },
      onComplete: () => {
        shadow.destroy();
        // Lands on the carpet and stays there a moment.
        this.tweens.add({ targets: toy, alpha: 0, delay: 500, duration: 300, onComplete: () => toy.destroy() });
        this.toys = this.toys.filter(o => o !== obj);
      },
    });
  }

  update(time, delta) {
    if (this.finished || this.phase !== 'dodge') return;
    this.elapsed += delta;
    this.hurtMs = Math.max(0, this.hurtMs - delta);

    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    this.ben.x = Phaser.Math.Clamp(this.ben.x + dx * SAM_SPEED * delta / 1000, 12, GAME_W - 12);
    this.walkMs = dx ? (this.walkMs || 0) + delta : 0;
    this.ben.setFrame(dx ? `side_${[1, 0, 2, 0][Math.floor(this.walkMs / 120) % 4]}` : 'up_0').setFlipX(dx < 0);
    this.ben.setAlpha(this.hurtMs > 0 && Math.floor(this.hurtMs / 80) % 2 ? 0.4 : 1);

    // Sam throws faster as it goes on.
    this.nextThrow -= delta;
    if (this.nextThrow <= 0) {
      this.throwToy();
      this.nextThrow = 1150 - 450 * Math.min(1, this.elapsed / (SAM_DODGE_S * 1000)) + Phaser.Math.Between(0, 250);
      if (Math.random() < 0.15) this.say(Phaser.Utils.Array.GetRandom(this.text.yells), 900);
    }
    // Toys only hurt on the way down, near the floor.
    for (const o of this.toys) {
      if (o.hit || this.hurtMs > 0 || o.toy.y < SAM_BEN_Y - 30) continue;
      if (Phaser.Math.Distance.Between(o.toy.x, o.toy.y, this.ben.x, this.ben.y - 10) < SAM_HIT_R) {
        o.hit = true;
        this.hearts--;
        this.hurtMs = 900;
        Sound.bad();
        this.cameras.main.shake(150, 0.01);
        this.flash(this.ben.x, this.ben.y - 34, this.text.ow, 0xff8080);
        if (this.hearts <= 0) { this.finish(false, 'hearts'); return; }
      }
    }
    this.updateHud();
    if (this.elapsed >= SAM_DODGE_S * 1000) this.startTalk();
  }

  flash(x, y, text, color) {
    const clean = Font.clean(text);
    const t = this.add.bitmapText(Math.round(x - Font.measure(clean) / 2), y, 'fontLight', clean).setTint(color).setDepth(45);
    this.tweens.add({ targets: t, y: y - 8, alpha: 0, delay: 400, duration: 400, onComplete: () => t.destroy() });
  }

  // Part two: Sam is out of breath. Three things he yells, three lines to pick from.
  startTalk() {
    this.phase = 'talk';
    // Toys still in the air just drop out of the scene.
    for (const o of this.toys) { o.tween.remove(); o.toy.destroy(); o.shadow.destroy(); }
    this.toys = [];
    this.ben.setFrame('up_0').setFlipX(false).setAlpha(1);
    this.tweens.add({ targets: this.ben, x: 160, duration: 300 });
    this.setHint(this.text.talkHint);
    this.time.delayedCall(500, () => this.askRound());
  }

  askRound() {
    if (this.finished) return;
    const r = this.text.rounds[this.round];
    this.updateHud();
    this.say(r.sam, 0);
    const options = Phaser.Utils.Array.Shuffle([{ text: r.right, good: true }, ...r.wrong.map(text => ({ text, good: false }))]);
    this.menu = new Menu(this, {
      w: 300, y: 92, depth: 60,
      items: options.map(o => ({ label: o.text, select: () => this.pickLine(o.good) })),
    });
  }

  pickLine(good) {
    this.menu.destroy();
    if (good) {
      this.goodLines++;
      Sound.good();
      this.say(this.text.calmer[this.round] || '...okay.', 0);
    } else {
      Sound.bad();
      this.say(this.text.worse, 0);
      // A toy to the face for saying the wrong thing.
      const toy = this.add.image(SAM_AT.x, SAM_AT.y - 30, 'toyDino').setScale(1.5).setDepth(30);
      this.tweens.add({ targets: toy, x: this.ben.x, y: this.ben.y - 16, angle: 360, duration: 400, onComplete: () => {
        Sound.kick(); this.cameras.main.shake(120, 0.008); toy.destroy(); this.flash(this.ben.x, this.ben.y - 34, this.text.ow, 0xff8080);
      } });
    }
    this.time.delayedCall(1300, () => {
      this.round++;
      if (this.round >= this.text.rounds.length) this.finish(this.goodLines >= SAM_LINES_NEED, 'lines');
      else this.askRound();
    });
  }

  finish(win, reason) {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'over';
    if (this.menu) this.menu.destroy();
    const fill = { reason: reason === 'hearts' ? this.text.byToys : this.text.byLines, good: this.goodLines, hearts: this.hearts };
    this.time.delayedCall(win ? 0 : 400, () => {
      Minigame.showResult(this, win, minigameText('samTantrum', win, fill), () => this.done({ win, ...fill }));
    });
  }
}
