// Settings panel, opened from the title screen or the pause menu. Changes are
// saved right away. data: { onClose } (called when the panel closes)

class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(data) {
    this.onClose = data.onClose;
    this.add.graphics().fillStyle(0x000000, 0.6).fillRect(0, 0, GAME_W, GAME_H);

    const volume = key => ({
      slider: {
        max: VOLUME_STEPS,
        get: () => Settings[key],
        set: v => {
          Settings[key] = v;
          Settings.save();
          Sound.blip(); // hear the new sound effects volume (the music changes live)
        },
      },
    });

    this.menu = new Menu(this, {
      w: 190, y: 22, title: 'Settings', onCancel: () => this.close(),
      items: [
        { label: 'Music volume', ...volume('music') },
        { label: 'Sound effects', ...volume('sfx') },
        {
          label: 'Text speed',
          value: () => `<  ${Settings.textSpeed[0].toUpperCase()}${Settings.textSpeed.slice(1)}  >`,
          change: dir => {
            const i = TEXT_SPEED_NAMES.indexOf(Settings.textSpeed);
            Settings.textSpeed = TEXT_SPEED_NAMES[Phaser.Math.Clamp(i + dir, 0, TEXT_SPEED_NAMES.length - 1)];
            Settings.save();
            this.typeSample();
          },
        },
        { label: 'Back', select: () => this.close() },
      ],
    });

    this.buildSample();
    this.typeSample();
  }

  // A sample text box under the menu that types at the chosen text speed.
  buildSample() {
    const g = this.add.graphics();
    drawPanel(g, BOX.x, BOX.y, BOX.w, BOX.h);
    this.sample = this.add.bitmapText(TEXT_X, TEXT_Y, 'font', '');
    this.sampleTimer = null;
  }

  typeSample() {
    const text = Font.wrap(Font.clean(CONTENT.title.textSample), TEXT_W).slice(0, 2).join('\n');
    if (this.sampleTimer) this.sampleTimer.remove();
    let shown = 0;
    this.sampleTimer = this.time.addEvent({
      delay: Settings.charMs(), repeat: text.length - 1,
      callback: () => {
        this.sample.setText(text.slice(0, ++shown));
        Sound.talk(text, shown - 1, NARRATOR_VOICE);
      },
    });
  }

  close() {
    Settings.save();
    this.scene.stop();
    if (this.onClose) this.onClose();
  }
}
