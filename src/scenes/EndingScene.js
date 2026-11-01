// The ending, shown after Saturday: Jail Ben, Grounded Ben or Good Ben
// (Stats.ending() picks one). A drawn scene, the title and a few lines.
// Space goes on to the stats screen.

const ENDING_FLOOR = 108;   // where everyone's feet are in the drawn scene
const ENDING_COLORS = { jail: 0x9ab8ff, grounded: 0xe0503a, good: 0xffd860 };

class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    this.ending = Stats.ending();
    this.speaker = null;
    const text = CONTENT.endings[this.ending];
    Save.clear(); // the week is over, so Play starts a new one
    this.cameras.main.setBackgroundColor('#000000');

    if (this.ending === 'jail') this.drawJail();
    else if (this.ending === 'grounded') this.drawGrounded();
    else this.drawGood();
    this.bubble(Story.fill(text.bubble));

    // Title on a dark strip, the lines on a dark panel under the scene.
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 4, GAME_W, 24);
    const title = Minigame.centerText(this, text.title, 8, 'fontLight', 2).setTint(ENDING_COLORS[this.ending]);
    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 600 });
    const lines = [...text.lines];
    const friday = STATE.games.find(g => g.game === 'fridayGame');
    if (this.ending === 'good' && friday && friday.win) {
      lines.splice(lines.length - 1, 0, text.fridayWin.replace('{score}', friday.score || ''));
    }
    const top = 114;
    this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, top - 2, GAME_W, GAME_H - top + 2);
    lines.forEach((line, i) => {
      const t = Minigame.centerText(this, Story.fill(line), top + 2 + i * Font.LINE_H, 'fontLight').setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 500 + i * 450, duration: 300 });
    });
    const prompt = Minigame.centerText(this, CONTENT.endings.prompt, GAME_H - 8, 'miniLight').setVisible(false);
    const showAt = 500 + lines.length * 450;
    this.time.delayedCall(showAt, () => {
      this.ready = true;
      this.time.addEvent({ delay: 450, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    });

    if (this.ending === 'good') Sound.good(); else Sound.fail();
    Music.play(this.ending === 'good' ? 'good' : 'sad');
    this.ready = false;
    const onKey = e => this.onKey(e);
    this.input.keyboard.on('keydown', onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', onKey));
    this.cameras.main.fadeIn(600);
  }

  onKey(e) {
    if (!this.ready || e.repeat || !CONFIRM_CODES.includes(e.code)) return;
    this.ready = false;
    e.handled = true;
    Sound.blip();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Stats', { ending: this.ending }));
  }

  // A person standing on the floor at x, 2x size. `who` = 'ben' or an npc id.
  // Ben's outfit: the orange jumpsuit in jail, pajamas when grounded, his football
  // uniform if he won the Friday game, otherwise the flannel.
  person(who, x, frame = 'down_0', flip = false) {
    const won = (STATE.games.find(g => g.game === 'fridayGame') || {}).win;
    const outfit = { jail: 'jail', grounded: 'pajamas' }[this.ending] || (won ? 'football' : 'casual');
    const key = who === 'ben' ? Ben.texture(outfit) : `npc_${who}`;
    return this.add.sprite(x, ENDING_FLOOR, key, frame).setOrigin(0.5, 1).setScale(2).setFlipX(flip);
  }

  // Speech bubble over whoever talks (Ben, or Mom when she grounds him).
  bubble(text) {
    const who = this.speaker || this.ben;
    const clean = Font.clean(text, 'mini');
    const w = Font.measure(clean, 'mini') + 8;
    const x = Math.floor(who.x - w / 2), y = ENDING_FLOOR - 60;
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(UI_COLORS.ink).fillRect(x - 1, y - 1, w + 2, 12);
    g.fillStyle(UI_COLORS.paper).fillRect(x, y, w, 10).fillRect(who.x - 1, y + 10, 3, 2).fillRect(who.x, y + 12, 1, 1);
    this.add.bitmapText(x + 4, y + 2, 'mini', clean).setDepth(6);
  }

  // A cinderblock cell. Ben behind the bars.
  drawJail() {
    const g = this.add.graphics();
    g.fillStyle(0x6a6a74).fillRect(0, 0, GAME_W, ENDING_FLOOR);
    g.fillStyle(0x5a5a64);
    for (let y = 8; y < ENDING_FLOOR; y += 10) {
      g.fillRect(0, y, GAME_W, 1);
      for (let x = (y / 10) % 2 ? 0 : 12; x < GAME_W; x += 24) g.fillRect(x, y - 9, 1, 9);
    }
    g.fillStyle(0x45454e).fillRect(0, ENDING_FLOOR, GAME_W, GAME_H - ENDING_FLOOR);
    // little barred window with the night outside
    g.fillStyle(0x1c2448).fillRect(70, 38, 22, 16).fillStyle(0xf8f0c0).fillRect(84, 41, 3, 3);
    g.fillStyle(0x2a2a30);
    for (let x = 74; x < 92; x += 5) g.fillRect(x, 38, 2, 16);
    // the cot and the toilet
    g.fillStyle(0x3a3a42).fillRect(214, 92, 50, 4).fillRect(216, 96, 3, 12).fillRect(259, 96, 3, 12);
    g.fillStyle(0x8a8a9a).fillRect(214, 88, 50, 4).fillStyle(0xf0f0f0).fillRect(254, 85, 9, 4);
    g.fillStyle(0xc8c8d0).fillRect(46, 92, 12, 9).fillRect(48, 101, 8, 7).fillStyle(0x8a8a94).fillRect(48, 93, 8, 3);
    this.ben = this.person('ben', 160);
    // the bars, in front of Ben
    const bars = this.add.graphics();
    bars.fillStyle(0x2a2a30).fillRect(110, 34, 100, 3).fillRect(110, 70, 100, 3);
    for (let x = 112; x <= 206; x += 10) bars.fillStyle(0x2a2a30).fillRect(x, 34, 3, ENDING_FLOOR - 34).fillStyle(0x8a8a96).fillRect(x, 34, 1, ENDING_FLOOR - 34);
  }

  // Ben's room. Mom has his phone and the Xbox controller.
  drawGrounded() {
    const g = this.add.graphics();
    g.fillStyle(0x34497a).fillRect(0, 0, GAME_W, ENDING_FLOOR - 16);
    g.fillStyle(0xd8d0c0).fillRect(0, ENDING_FLOOR - 18, GAME_W, 2);
    g.fillStyle(0x8c8c92).fillRect(0, ENDING_FLOOR - 16, GAME_W, GAME_H);
    // Air Force poster and the window
    g.fillStyle(0xf0f0f0).fillRect(56, 38, 20, 26).fillStyle(0x2a4a9a).fillRect(58, 40, 16, 22).fillStyle(0xf0f0f0).fillRect(62, 48, 8, 2).fillRect(65, 45, 2, 8);
    g.fillStyle(0xd8d0c0).fillRect(236, 36, 34, 26).fillStyle(0x1c2448).fillRect(238, 38, 30, 22).fillStyle(0xd8d0c0).fillRect(252, 38, 2, 22);
    // camo bed
    g.fillStyle(0x5a4a32).fillRect(96, 84, 44, 24).fillStyle(0x5f7a3c).fillRect(98, 86, 40, 14).fillStyle(0x3d5a2c).fillRect(104, 88, 8, 4).fillRect(122, 92, 10, 5);
    g.fillStyle(0xf0f0f0).fillRect(98, 86, 10, 6);
    this.ben = this.person('ben', 150);
    this.speaker = this.person('mom', 196, 'side_0', true);
    // Mom holds up the phone and the controller.
    g.fillStyle(0x181425).fillRect(180, 76, 5, 8).fillStyle(0x6ab0f0).fillRect(181, 77, 3, 5);
    g.fillStyle(0x2a2a30).fillRect(206, 80, 9, 5).fillStyle(0x40c040).fillRect(212, 81, 1, 1);
  }

  // Sunset over the field (the title screen), Ben with his boys.
  drawGood() {
    TitleScene.prototype.drawBackdrop.call(this);
    this.children.list[this.children.list.length - 1].setY(-26); // horizon up, so the boys stand in the field
    this.ben = this.person('ben', 160);
    this.person('truman', 128);
    this.person('chevy', 192);
    this.person('jake', 98);
    const friday = STATE.games.find(g => g.game === 'fridayGame');
    if (friday && friday.win) {
      Minigame.footballTexture(this);
      // Ben tosses the game ball up and catches it.
      const ball = this.add.image(174, ENDING_FLOOR - 26, 'football').setScale(2);
      this.tweens.add({ targets: ball, y: ball.y - 14, angle: 360, duration: 500, yoyo: true, repeat: -1, repeatDelay: 300, ease: 'Sine.easeOut' });
    }
  }
}
