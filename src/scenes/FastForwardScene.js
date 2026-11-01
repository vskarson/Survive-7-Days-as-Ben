// Time-skip between story beats: a clock face whose hands spin from the old
// time to the new one, the digital time counting up, and where Ben is headed.
// data: { from, to (minutes after midnight), label, done (called at the end) }

class FastForwardScene extends Phaser.Scene {
  constructor() { super('FastForward'); }

  create(data) {
    this.cameras.main.setBackgroundColor('#000000');
    const cx = GAME_W / 2, cy = 70, r = 34;
    this.center = { x: cx, y: cy };

    const face = this.add.graphics();
    face.fillStyle(0xf8f8f8).fillCircle(cx, cy, r);
    face.lineStyle(2, UI_COLORS.accent).strokeCircle(cx, cy, r - 1);
    face.fillStyle(UI_COLORS.ink);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const len = i % 3 === 0 ? 3 : 2;
      face.fillRect(Math.round(cx + Math.sin(a) * (r - 6)) - 1, Math.round(cy - Math.cos(a) * (r - 6)) - 1, len, len);
    }
    this.hands = this.add.graphics();

    // ▶▶ fast-forward icon, blinking
    const ff = this.add.graphics().fillStyle(0xf8f8f8);
    for (const ox of [0, 7]) ff.fillTriangle(ox, 0, ox, 10, ox + 7, 5);
    ff.setPosition(GAME_W / 2 - 7, 10);
    this.time.addEvent({ delay: 250, loop: true, callback: () => ff.setVisible(!ff.visible) });

    this.digital = this.add.bitmapText(0, 114, 'fontLight', '').setScale(2);
    if (data.label) {
      const label = Font.clean(data.label);
      this.add.bitmapText(Math.floor((GAME_W - Font.measure(label)) / 2), 146, 'fontLight', label);
    }

    // Longer skips spin a little longer, within limits.
    const duration = Phaser.Math.Clamp((data.to - data.from) / 60 * 300, 1400, 2600);
    this.drawTime(data.from);
    this.cameras.main.fadeIn(200);
    this.tweens.addCounter({
      from: data.from, to: data.to, duration, ease: 'Sine.easeInOut', delay: 200,
      onUpdate: tween => this.drawTime(tween.getValue()),
      onComplete: () => this.time.delayedCall(500, () => {
        this.cameras.main.fadeOut(200);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop();
          data.done();
        });
      }),
    });
  }

  drawTime(minutes) {
    const { x, y } = this.center;
    const hourA = ((minutes / 60) % 12) / 12 * Math.PI * 2;
    const minA = (minutes % 60) / 60 * Math.PI * 2;
    this.hands.clear();
    this.hands.lineStyle(3, UI_COLORS.ink).lineBetween(x, y, x + Math.sin(hourA) * 16, y - Math.cos(hourA) * 16);
    this.hands.lineStyle(2, 0xc8323a).lineBetween(x, y, x + Math.sin(minA) * 25, y - Math.cos(minA) * 25);
    this.hands.fillStyle(UI_COLORS.ink).fillRect(x - 2, y - 2, 4, 4);

    const text = Clock.format(minutes);
    this.digital.setText(text).setX(Math.floor((GAME_W - Font.measure(text) * 2) / 2));
  }
}
