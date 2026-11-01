// Title screen: sunset over a field, Ben strolling along the fence, and two
// buttons. Play opens the save slots (SlotsScene).
// Browsers keep a page silent until the player presses a key or clicks, so the
// first time the title shows it says "Press any key" instead of the buttons:
// that press starts the music, then the buttons appear.

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.drawBackdrop();
    this.addBen();
    Music.play('title');

    const t = CONTENT.title;
    Minigame.centerText(this, t.top, 14, 'fontLight', 2);
    Minigame.centerText(this, t.bottom, 36, 'fontLight', 3).setTint(0xffd860);

    this.menu = new Menu(this, {
      w: 96, y: 70,
      items: [
        { label: 'Play', select: () => this.play() },
        { label: 'Settings', select: () => this.openSettings() },
      ],
    });
    this.controls = Minigame.centerText(this, t.controls, 114, 'miniLight').setAlpha(0.8);

    if (!Sound.ctx || Sound.ctx.state !== 'running') this.waitForPress();
    this.cameras.main.fadeIn(400);
  }

  // "Press any key" where the buttons go, until the first key press or click.
  waitForPress() {
    this.menu.setVisible(false);
    this.controls.setVisible(false);
    const prompt = Minigame.centerText(this, CONTENT.title.pressKey, 86, 'fontLight');
    const blink = this.time.addEvent({ delay: 500, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    const start = e => {
      if (e && e.repeat) return;
      this.input.keyboard.off('keydown', start);
      this.input.off('pointerdown', start);
      Sound.get();   // unlocks audio; the title song starts
      blink.remove();
      prompt.destroy();
      this.controls.setVisible(true);
      // Next frame, so this same key press doesn't also pick Play.
      this.time.delayedCall(50, () => this.menu.setVisible(true));
    };
    this.input.keyboard.on('keydown', start);
    this.input.on('pointerdown', start);
  }

  // Play: pick a save slot. Once one is picked (STATE is loaded or new), the day starts.
  play() {
    this.menu.setEnabled(false);
    this.scene.launch('Slots', {
      onStart: () => {
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DayIntro'));
      },
      onClose: () => this.menu.setEnabled(true),
    });
  }

  openSettings() {
    this.menu.setEnabled(false);
    this.scene.launch('Settings', { onClose: () => this.menu.setEnabled(true) });
  }

  drawBackdrop() {
    const g = this.add.graphics();
    // Sunset sky in bands, like an old console would draw it.
    const bands = [0x2a1f4a, 0x3d2558, 0x5c2d62, 0x86385f, 0xb54c56, 0xd8694a, 0xeb9248, 0xf5b85a];
    const bandH = 15;
    bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bandH, GAME_W, bandH));
    g.fillStyle(0xffe08a).fillCircle(250, 118, 16);
    g.fillStyle(0xfff2c0).fillCircle(250, 118, 11);
    // Tree line and rolling hills on the horizon.
    g.fillStyle(0x2c3a2a);
    for (let x = 0; x < GAME_W; x += 6) g.fillRect(x, 112 - ((x * 7) % 11), 6, 30);
    g.fillStyle(0x3d5a2c).fillRect(0, 126, GAME_W, 54);
    g.fillStyle(0x4f7434).fillRect(0, 150, GAME_W, 30);
    g.fillStyle(0x5f8a3c);
    for (let x = 3; x < GAME_W; x += 9) g.fillRect(x, 152 + ((x * 5) % 7) * 3, 1, 2);
    // Fence along the field.
    g.fillStyle(0x6b4a2e).fillRect(0, 138, GAME_W, 2).fillRect(0, 144, GAME_W, 2);
    for (let x = 4; x < GAME_W; x += 22) g.fillStyle(0x6b4a2e).fillRect(x, 134, 3, 16).fillStyle(0x4a321f).fillRect(x + 2, 134, 1, 16);
    // Darken behind the title so it reads.
    g.fillStyle(0x000000, 0.25).fillRect(0, 6, GAME_W, 70);
  }

  // Ben walks across the field, wraps around, and does it again.
  addBen() {
    const ben = this.add.sprite(-20, 180, 'ben', 'side_0').setOrigin(0.5, 1).setScale(2);
    let frame = 0;
    this.time.addEvent({
      delay: 180, loop: true,
      callback: () => {
        frame = (frame + 1) % 4;
        ben.setFrame(['side_0', 'side_1', 'side_0', 'side_2'][frame]);
      },
    });
    this.tweens.add({ targets: ben, x: GAME_W + 20, duration: 14000, repeat: -1, repeatDelay: 1500 });
  }
}
