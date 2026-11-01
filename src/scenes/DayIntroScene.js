// Black title card at the start of each day: "DAY 3 / Tuesday" plus the
// day's tasks. Space/Enter starts the day. The game saves here.

class DayIntroScene extends Phaser.Scene {
  constructor() { super('DayIntro'); }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    // After Saturday: the ending, then the stats screen.
    if (STATE.day > WEEK_LENGTH) { this.scene.start('Ending'); return; }

    Save.write();
    const day = Clock.today();
    this.centered(`DAY ${STATE.day}`, 12, 'fontLight', 2);
    this.centered(day.name, 38, 'fontLight');
    this.add.bitmapText(90, 58, 'fontLight', "Today's tasks:");
    day.tasks.forEach((task, i) => {
      this.add.bitmapText(96, 72 + i * Font.LINE_H, 'fontLight', Font.clean(`- ${task.text}`));
    });

    const prompt = this.centered('Press Space', 162, 'fontLight');
    this.time.addEvent({ delay: 500, loop: true, callback: () => prompt.setVisible(!prompt.visible) });

    this.cameras.main.fadeIn(400);
    this.ready = false;
    this.time.delayedCall(400, () => { this.ready = true; });
    const onKey = e => this.onKey(e);
    this.input.keyboard.on('keydown', onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', onKey));
  }

  centered(text, y, font, scale = 1) {
    const w = Font.measure(text) * scale;
    return this.add.bitmapText(Math.floor((GAME_W - w) / 2), y, font, text).setScale(scale);
  }

  onKey(e) {
    if (!this.ready || e.repeat || !CONFIRM_CODES.includes(e.code)) return;
    this.ready = false;
    e.handled = true;

    // The first story beat says where and when Ben wakes up.
    Stats.startDay();
    STATE.beat = 0;
    Story.skipUnmet();
    const first = Story.current();
    Stats.apply(first.setup);
    STATE.minutes = Clock.parse(first.time);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('World', { map: first.at.map, spawn: first.at.spawn, story: true, label: first.label });
    });
  }
}
