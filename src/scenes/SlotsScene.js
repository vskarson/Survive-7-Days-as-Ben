// Save slots, opened by Play on the title screen. An empty slot starts a new
// week in it; a saved slot asks Continue or Delete save.
// data: { onStart (a slot is ready to play), onClose (Back) }

class SlotsScene extends Phaser.Scene {
  constructor() { super('Slots'); }

  create(data) {
    this.onStart = data.onStart;
    this.onClose = data.onClose;
    this.text = CONTENT.title.slots;
    this.add.graphics().fillStyle(0x000000, 0.6).fillRect(0, 0, GAME_W, GAME_H);
    this.buildMenu();
  }

  buildMenu(index = 0) {
    if (this.menu) this.menu.destroy();
    const t = this.text;
    const items = [];
    for (let n = 1; n <= SAVE_SLOTS; n++) {
      items.push({
        label: t.slot.replace('{n}', n),
        value: () => this.describe(n),
        select: () => this.pickSlot(n),
      });
    }
    items.push({ label: t.back, select: () => this.close() });
    this.menu = new Menu(this, { w: 200, y: 40, title: t.title, items, onCancel: () => this.close() });
    this.menu.index = index;
    this.menu.refresh();
  }

  // "Day 5: Thursday" or "New game"
  describe(n) {
    const saved = Save.read(n);
    if (!saved) return this.text.empty;
    return this.text.saved.replace('{day}', saved.day).replace('{name}', CONTENT.days[saved.day - 1].name);
  }

  pickSlot(n) {
    if (!Save.exists(n)) {
      Stats.newGame();
      Save.slot = n;
      this.start();
      return;
    }
    // A saved slot: Continue, Delete save, or Back.
    const t = this.text;
    this.menu.setVisible(false);
    const close = () => {
      sub.destroy();
      this.menu.setVisible(true);
    };
    const sub = new Menu(this, {
      w: 150, depth: 11, title: `${t.slot.replace('{n}', n)}: ${this.describe(n)}`, onCancel: close,
      items: [
        { label: t.play, select: () => { Save.load(n); this.start(); } },
        {
          label: t.delete,
          select: () => {
            sub.setVisible(false);
            confirmBox(this, t.confirm.replace('{n}', n), yes => {
              close();
              if (yes) {
                Save.clear(n);
                Sound.bad();
              }
              this.buildMenu(n - 1);
            }, 20);
          },
        },
        { label: t.back, select: close },
      ],
    });
  }

  start() {
    Sound.good();
    this.scene.stop();
    if (this.onStart) this.onStart();
  }

  close() {
    this.scene.stop();
    if (this.onClose) this.onClose();
  }
}
