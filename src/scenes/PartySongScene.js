// Friday night: Ben sings {crush} the country song he wrote her, by the fire, and
// she turns him down. A cutscene with no controls. Ends on a fade to black.
// All its text is in CONTENT.cutscenes.partySong.

const SONG_BEN_X = 90, SONG_CRUSH_X = 232, SONG_FEET = 134;
const SONG_SCALE = 3;
const SONG_GUITAR_X = SONG_BEN_X - 13, SONG_GUITAR_Y = SONG_FEET - 47;   // its top left corner
const SONG_FIRE = { x: 178, y: 128 };
const SONG_BUBBLE_Y = 44;
const SONG_LETTER_MS = 38;           // how fast the words come when he's singing
const SONG_STRUM_MS = 1150;          // one chord to the next
const SONG_CHORDS = {
  G: [NOTE.G2, NOTE.D3, NOTE.G3, NOTE.B3],
  C: [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.C4],
  D: [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.Fs4],
  Em: [NOTE.E3, NOTE.B3, NOTE.E4, NOTE.G4],
};

class PartySongScene extends Cutscene {
  constructor() { super('PartySong'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.text = CONTENT.cutscenes.partySong;
    this.crushKey = (Story.chose('crush') || 'Maddy').toLowerCase();
    this.cameras.main.setBackgroundColor('#0c1030');
    this.drawNight();
    this.fire = this.add.graphics().setDepth(4);
    for (const r of [64, 46, 30]) {
      this.add.circle(SONG_FIRE.x, SONG_FIRE.y - 8, r, 0xff9030, 0.05).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    }
    this.time.addEvent({ delay: 110, loop: true, callback: () => this.drawFire() });
    this.time.addEvent({ delay: 260, loop: true, callback: () => this.spark() });
    this.drawFire();

    this.ben = this.add.sprite(SONG_BEN_X, SONG_FEET, Ben.texture('casual'), 'side_0').setOrigin(0.5, 1).setScale(SONG_SCALE).setDepth(10);
    this.add.image(SONG_GUITAR_X, SONG_GUITAR_Y, 'songGuitar').setOrigin(0).setDepth(11);
    this.buildHand(SONG_GUITAR_X + 36, SONG_GUITAR_Y + 13);
    this.strummingHand = this.buildHand(SONG_GUITAR_X + 12, SONG_GUITAR_Y + 18);
    this.crush = this.add.sprite(SONG_CRUSH_X, SONG_FEET, `npc_${this.crushKey}`, 'side_0')
      .setOrigin(0.5, 1).setScale(SONG_SCALE).setFlipX(true).setDepth(10);

    this.input.keyboard.on('keydown', e => { if (DEBUG && e.code === 'BracketRight') this.finish(); });
    this.run();
  }

  // The sky, the tree line, the field, and the party behind them.
  drawNight() {
    const g = this.add.graphics();
    g.fillStyle(0x161a44).fillRect(0, 50, GAME_W, 60);
    for (let i = 0; i < 46; i++) g.fillStyle(i % 5 ? 0xa8b0d8 : 0xf4f4f4).fillRect((i * 83) % GAME_W, (i * 37) % 62, 1, 1);
    g.fillStyle(0x0a1420);
    for (let x = -6; x < GAME_W; x += 15) {
      const h = 22 + (x * 7 + 50) % 19;
      g.fillTriangle(x - 12, 104, x + 12, 104, x, 104 - h);
    }
    g.fillRect(0, 100, GAME_W, 12);
    g.fillStyle(0x1e3a24).fillRect(0, 108, GAME_W, GAME_H - 108);
    for (let i = 0; i < 90; i++) g.fillStyle(i % 3 ? 0x28482c : 0x16301c).fillRect((i * 53) % GAME_W, 110 + (i * 29) % 70, 2, 1);
    ['teen', 'cust1', 'cust2', 'vinson', 'delano', 'chevy'].forEach((who, i) => {
      this.add.sprite([26, 52, 268, 292, 244, 306][i], 112, `npc_${who}`, 'down_0').setOrigin(0.5, 1).setScale(2)
        .setTintFill(0x0c1220).setDepth(1);
    });
  }

  // New flames each time, so the fire moves.
  drawFire() {
    const { x, y } = SONG_FIRE;
    const g = this.fire.clear();
    g.fillStyle(0x2a1a10).fillRect(x - 18, y - 2, 36, 5);
    g.fillStyle(0x6a4428).fillRect(x - 16, y - 1, 32, 3);
    const lick = (w, h, color) => {
      for (let dx = -w; dx <= w; dx += 4) {
        const tall = Math.round(h * (1 - Math.abs(dx) / (w + 4)) * Phaser.Math.FloatBetween(0.7, 1.1));
        g.fillStyle(color).fillRect(x + dx - 2, y - tall, 4, tall);
      }
    };
    lick(16, 30, 0xd8481a);
    lick(11, 22, 0xf09020);
    lick(6, 13, 0xf8d850);
  }

  spark() {
    const bit = this.add.rectangle(SONG_FIRE.x + Phaser.Math.Between(-10, 10), SONG_FIRE.y - 20, 1, 1, 0xffc060).setDepth(6);
    this.tweens.add({
      targets: bit, y: bit.y - Phaser.Math.Between(30, 60), x: bit.x + Phaser.Math.Between(-8, 8), alpha: 0,
      duration: Phaser.Math.Between(600, 1100), onComplete: () => bit.destroy(),
    });
  }

  // One of Ben's hands on the guitar.
  buildHand(x, y) {
    const g = this.add.graphics({ x, y }).setDepth(12);
    g.fillStyle(0x181425).fillRoundedRect(-1, -1, 9, 8, 2);
    g.fillStyle(0xf3c9a6).fillRoundedRect(0, 0, 7, 6, 2);
    g.fillStyle(0xdba27e).fillRect(1, 4, 5, 1);
    return g;
  }

  // His hand comes down across the strings and back up.
  strum(chord) {
    Sound.strum(SONG_CHORDS[chord]);
    this.tweens.add({ targets: this.strummingHand, y: this.strummingHand.y + 6, duration: 70, yoyo: true, ease: 'Sine.easeOut' });
  }

  // One line of the song in the text box: chords across it, the words typing out.
  async sing({ chords, line }) {
    const page = Font.wrap(Font.clean(Story.fill(line)), TEXT_W).join('\n');
    chords.forEach((chord, i) => this.time.delayedCall(i * SONG_STRUM_MS, () => this.strum(chord)));
    for (let i = 0; i < page.length; i++) {
      this.lyric.setText(page.slice(0, i + 1));
      Sound.talk(page, i, CONTENT.characters.ben.voice);
      await this.wait(SONG_LETTER_MS);
    }
    await this.wait(Math.max(500, chords.length * SONG_STRUM_MS - page.length * SONG_LETTER_MS));
  }

  speakerX(who) {
    return who === 'crush' ? SONG_CRUSH_X : SONG_BEN_X;
  }

  async talk(lines, hold) {
    for (const [who, line] of lines) {
      const key = who === 'crush' ? this.crushKey : who;
      await this.say(key, this.speakerX(who), SONG_BUBBLE_Y, line, hold);
    }
  }

  async run() {
    Music.stop();
    this.cameras.main.fadeIn(350);
    await this.wait(600);
    await this.talk(this.text.intro, 500);
    await this.wait(250);

    const box = this.add.graphics().setDepth(30);
    drawPanel(box, BOX.x, BOX.y, BOX.w, BOX.h);
    this.lyric = this.add.bitmapText(TEXT_X, TEXT_Y, 'font', '').setDepth(31);
    for (const verse of this.text.song) await this.sing(verse);
    await this.wait(500);
    box.destroy();
    this.lyric.destroy();

    Sound.cricket();
    await this.wait(900);
    Sound.cricket();
    await this.wait(600);
    await this.talk(this.text.rejection, 650);

    // She goes back to her friends. He's still holding the guitar.
    this.crush.setFlipX(false);
    await this.tween({ targets: this.crush, x: GAME_W + 30, duration: 1100, ease: 'Sine.easeIn' });
    Music.play('sad');
    await this.wait(500);
    const truman = this.add.sprite(-20, SONG_FEET, 'npc_truman', 'side_0').setOrigin(0.5, 1).setScale(SONG_SCALE).setDepth(9);
    const [ben, bro] = this.text.after;
    await this.talk([ben], 700);
    await this.tween({ targets: truman, x: SONG_BEN_X - 44, duration: 700, ease: 'Sine.easeOut' });
    await this.say('truman', SONG_BEN_X - 44, SONG_BUBBLE_Y, bro[1], 1000);
    this.finish();
  }

  // Fade to black, and the day ends behind it.
  finish() {
    if (this.finished) return;
    this.finished = true;
    this.cameras.main.fadeOut(600);
    this.cameras.main.once('camerafadeoutcomplete', () => this.done());
  }
}
