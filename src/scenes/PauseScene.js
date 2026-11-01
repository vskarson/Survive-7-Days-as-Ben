// Pause menu (Esc in the world). The world scene is paused underneath.

class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, GAME_H);
    this.menu = new Menu(this, {
      w: 120, title: CONTENT.pause.title, onCancel: () => this.resume(),
      items: [
        { label: 'Resume', select: () => this.resume() },
        { label: 'Settings', select: () => this.openSettings() },
        { label: 'Quit to title', select: () => this.quit() },
      ],
    });
  }

  resume() {
    this.scene.resume('World');
    this.scene.stop();
  }

  openSettings() {
    this.menu.setVisible(false);
    this.scene.launch('Settings', { onClose: () => this.menu.setVisible(true) });
  }

  quit() {
    this.menu.setEnabled(false);
    confirmBox(this, CONTENT.pause.quitWarning, yes => {
      if (!yes) { this.menu.setEnabled(true); return; }
      this.scene.stop('World');
      this.scene.start('Title');
    });
  }
}
