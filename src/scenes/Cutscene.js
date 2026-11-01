// What full-screen cutscenes share. They play as a script: async steps that wait
// on timers, tweens and speech bubbles (see WorldScene.playCutscene).

class Cutscene extends Phaser.Scene {
  wait(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  tween(config) {
    return new Promise(resolve => this.tweens.add({ ...config, onComplete: resolve }));
  }

  // A speech bubble that types out in the speaker's voice and stays for `hold` ms.
  // `who` is a key in CONTENT.characters.
  async say(who, x, y, line, hold) {
    const clean = Font.clean(Story.fill(line));
    const w = Font.measure(clean) + 12;
    const left = Phaser.Math.Clamp(Math.round(x - w / 2), 2, GAME_W - w - 2);
    const g = this.add.graphics().setDepth(40);
    drawPanel(g, left, y, w, 15);
    const t = this.add.bitmapText(left + 6, y + 4, 'font', '').setDepth(41);
    for (let i = 0; i < clean.length; i++) {
      t.setText(clean.slice(0, i + 1));
      Sound.talk(clean, i, CONTENT.characters[who].voice);
      await this.wait(Settings.charMs());
    }
    await this.wait(hold);
    g.destroy();
    t.destroy();
  }
}
