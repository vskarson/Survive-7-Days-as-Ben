// Hardee's orders: customers walk up with an order bubble. Pick items from the
// menu (left/right + Space), then serve the tray (Up) before their patience
// runs out. Down tosses the tray. Win by getting ORDERS_TO_WIN orders right.

const ORDER_ITEMS = ['burger', 'fries', 'drink', 'biscuit', 'chicken'];
const ORDER_LABELS = { burger: 'Burger', fries: 'Fries', drink: 'Drink', biscuit: 'Biscuit', chicken: 'Chicken' };
const ORDER_SIZES = [1, 1, 2, 2, 2, 3, 3, 3];          // items per customer, in order
const ORDER_PATIENCE = [12, 12, 11, 11, 10, 10, 9, 9];  // seconds per customer
const ORDERS_TO_WIN = 6;
const TRAY_MAX = 4;
const BUBBLE_BAR_Y = 23;   // patience bar along the bottom inside the order bubble
const CUSTOMER_LOOKS = ['cust1', 'cust2', 'cust3', 'cust4', 'cust5'];

const FOOD_ICONS = {
  burger: [
    '............', '..kkkkkkkk..', '.kBBBBBBBBk.', 'kBbBBBbBBbBk', 'kkkkkkkkkkkk', 'kggggggggggk',
    'kmmmmmmmmmmk', 'kyyyyyyyyyyk', 'kBBBBBBBBBBk', '.kkkkkkkkkk.', '............', '............',
  ],
  fries: [
    '...y..y.y...', '..yy.yy.yy..', '..yyyyyyyy..', '.krrrrrrrrk.', '.krrwwwwrrk.', '.krrrrrrrrk.',
    '..krrrrrrk..', '..krrrrrrk..', '..krrrrrrk..', '...kkkkkk...', '............', '............',
  ],
  drink: [
    '.......k....', '......k.....', '..kkkkkkkk..', '..kwwwwwwk..', '..krrrrrrk..', '..krwwrrrk..',
    '...krrrrk...', '...krrrrk...', '...krrrrk...', '....kkkk....', '............', '............',
  ],
  biscuit: [
    '............', '............', '............', '..kkkkkkkk..', '.kBBBBBBBBk.', 'kBbBBBBBbBBk',
    'kBBBBBBBBBBk', 'kkkkkkkkkkkk', 'kBBBBBBBBBBk', '.kkkkkkkkkk.', '............', '............',
  ],
  chicken: [
    '............', '......kkk...', '.....kbbbk..', '....kbbbbbk.', '...kbbBbbbk.', '...kbbbbBk..',
    '..kbbbbbk...', '.kwkkkkk....', 'kwwk........', '.kk.........', '............', '............',
  ],
};
const FOOD_PAL = {
  k: K, B: '#d89a48', b: '#f0c070', g: '#40a040', m: '#6a3a1a', y: '#f0c040', r: '#c8323a', w: '#f4f4f4',
};
const CHICKEN_PAL = { ...FOOD_PAL, b: '#c87830', B: '#e8a050' };

class OrdersScene extends Phaser.Scene {
  constructor() { super('Orders'); }

  static buildTextures(scene) {
    for (const [name, rows] of Object.entries(FOOD_ICONS)) {
      Art.buildStrip(scene, `food_${name}`, { a: rows }, name === 'chicken' ? CHICKEN_PAL : FOOD_PAL, 12, 12);
    }
  }

  create(data) {
    this.done = data.done;
    this.customers = ORDER_SIZES.map((size, i) => ({
      who: CUSTOMER_LOOKS[(i + Phaser.Math.Between(0, 4)) % CUSTOMER_LOOKS.length],
      order: Array.from({ length: size }, () => Phaser.Utils.Array.GetRandom(ORDER_ITEMS)),
      patience: ORDER_PATIENCE[i] * 1000,
    }));
    this.index = 0;
    this.cursor = 0;
    this.tray = [];
    this.served = 0;
    this.active = null;   // the customer at the counter, once they've walked up
    this.finished = false; // Phaser reuses the scene object, so reset every play

    this.drawRoom();
    this.drawMenu();
    this.bubble = this.add.container(0, 0);
    this.patienceBar = this.add.graphics().setDepth(5);
    this.trayIcons = this.add.container(0, 0);
    this.queue = [];
    this.updateHud();
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => this.nextCustomer(), 'SERVE!'));
  }

  drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(0xd8b070).fillRect(0, 0, GAME_W, 62);
    g.fillStyle(0xc8323a).fillRect(0, 24, GAME_W, 6);
    g.fillStyle(0x7a4f2c).fillRect(0, 58, GAME_W, 4);
    for (let y = 62; y < 100; y += 8) for (let x = 0; x < GAME_W; x += 8) g.fillStyle((x + y) / 8 % 2 ? 0xd8c098 : 0xe8d8b8).fillRect(x, y, 8, 8);
    // window and door in the back
    g.fillStyle(0x5e3b20).fillRect(24, 8, 44, 34); g.fillStyle(0x8fcbea).fillRect(26, 10, 40, 30);
    g.fillStyle(0x5e3b20).fillRect(256, 6, 34, 54); g.fillStyle(0x9aa0ac).fillRect(258, 8, 30, 52);
    // counter (Ben is behind it)
    g.fillStyle(0xc8ccd0).fillRect(0, 98, GAME_W, 5);
    g.fillStyle(0xb82a2a).fillRect(0, 103, GAME_W, 12);
    g.fillStyle(0xe8c040).fillRect(0, 107, GAME_W, 2);
    g.fillStyle(0xa8442e).fillRect(0, 115, GAME_W, 65);
    g.fillStyle(0x000000, 0.25).fillRect(0, 115, GAME_W, 65);

    this.servedText = this.add.bitmapText(6, 4, 'mini', '').setDepth(5);
  }

  drawMenu() {
    this.slots = ORDER_ITEMS.map((item, i) => {
      const x = 25 + i * 54, y = 118;
      const g = this.add.graphics();
      drawPanel(g, x, y, 44, 34);
      this.add.image(x + 22, y + 15, `food_${item}`).setScale(2);
      const label = Font.clean(ORDER_LABELS[item], 'mini');
      this.add.bitmapText(x + 22 - Math.floor(Font.measure(label, 'mini') / 2), y + 26, 'mini', label);
      return { x, y };
    });
    this.cursorBox = this.add.graphics().setDepth(4);
    this.add.bitmapText(25, 158, 'miniLight', Font.clean('Tray', 'mini'));
    Minigame.centerText(this, 'Left/Right pick   Space add   Up serve   Down toss', 172, 'miniLight');
    this.drawCursor();
  }

  drawCursor() {
    const { x, y } = this.slots[this.cursor];
    this.cursorBox.clear().lineStyle(2, 0xf8d030).strokeRect(x - 1, y - 1, 46, 36);
  }

  drawTray() {
    this.trayIcons.removeAll(true);
    this.tray.forEach((item, i) => this.trayIcons.add(this.add.image(50 + i * 15, 160, `food_${item}`)));
  }

  updateHud() {
    this.servedText.setText(Font.clean(`Orders right ${this.served}/${this.customers.length}`, 'mini'));
  }

  // The next two people in line wait in the back of the room.
  drawQueue() {
    this.queue.forEach(s => s.destroy());
    this.queue = this.customers.slice(this.index + 1, this.index + 3).map((c, i) =>
      this.add.image(120 - i * 26, 92, `npc_${c.who}`, 'down_0').setOrigin(0.5, 1).setAlpha(0.8));
  }

  nextCustomer() {
    if (this.index >= this.customers.length) { this.finish(); return; }
    const c = this.customers[this.index];
    this.drawQueue();
    c.sprite = this.add.image(-20, 100, `npc_${c.who}`, 'side_0').setOrigin(0.5, 1).setScale(2).setDepth(2);
    this.tweens.add({
      targets: c.sprite, x: 160, duration: 600, ease: 'Sine.easeOut',
      onComplete: () => {
        c.sprite.setFrame('down_0');
        c.timeLeft = c.patience;
        this.active = c;
        this.showBubble(c);
      },
    });
  }

  showBubble(c) {
    const w = c.order.length * 15 + 12, h = 30, x = 186, y = 30;
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h);
    g.fillStyle(UI_COLORS.ink).fillTriangle(x + 1, y + 18, x + 1, y + 26, x - 6, y + 24);
    this.bubble.add(g);
    c.order.forEach((item, i) => this.bubble.add(this.add.image(x + 12 + i * 15, y + 12, `food_${item}`)));
    this.bubbleBox = { x, y, w };
  }

  onKey(e) {
    if (DEBUG && e.code === 'BracketRight') { this.finish(true); return; }
    if (DEBUG && e.code === 'BracketLeft') { this.finish(false); return; }
    if (this.finished || e.repeat) return;
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') { this.cursor = (this.cursor + ORDER_ITEMS.length - 1) % ORDER_ITEMS.length; this.drawCursor(); Sound.blip(); }
    if (code === 'ArrowRight' || code === 'KeyD') { this.cursor = (this.cursor + 1) % ORDER_ITEMS.length; this.drawCursor(); Sound.blip(); }
    if (CONFIRM_CODES.includes(code) && this.tray.length < TRAY_MAX) { this.tray.push(ORDER_ITEMS[this.cursor]); this.drawTray(); Sound.tick(); }
    if (code === 'ArrowDown' || code === 'KeyS') { this.tray = []; this.drawTray(); Sound.bad(); }
    if ((code === 'ArrowUp' || code === 'KeyW') && this.active && this.tray.length) this.serve();
  }

  serve() {
    const c = this.active;
    const sorted = a => [...a].sort().join(',');
    const right = sorted(this.tray) === sorted(c.order);
    this.tray = [];
    this.drawTray();
    if (right) {
      this.served++;
      Sound.cash();
      this.leave(c, true, 'Order up!');
    } else {
      Sound.bad();
      this.leave(c, false, 'Wrong order!');
    }
  }

  leave(c, happy, msg) {
    this.active = null;
    this.bubble.removeAll(true);
    this.patienceBar.clear();
    this.updateHud();
    const t = this.add.bitmapText(0, 44, 'fontLight', Font.clean(msg)).setDepth(10).setTint(happy ? 0x80f080 : 0xff7070);
    t.setX(160 - Math.floor(Font.measure(Font.clean(msg)) / 2));
    this.tweens.add({ targets: t, y: 30, alpha: 0, delay: 500, duration: 500, onComplete: () => t.destroy() });
    if (!happy) this.tweens.add({ targets: c.sprite, x: '+=3', duration: 50, yoyo: true, repeat: 3 });
    c.sprite.setFrame('side_0');
    this.tweens.add({
      targets: c.sprite, x: GAME_W + 30, duration: 700, delay: 350, ease: 'Sine.easeIn',
      onComplete: () => { c.sprite.destroy(); this.index++; this.nextCustomer(); },
    });
  }

  update(time, delta) {
    const c = this.active;
    if (!c || this.finished) return;
    c.timeLeft -= delta;
    const { x, y, w } = this.bubbleBox;
    const share = Math.max(0, c.timeLeft / c.patience);
    this.patienceBar.clear()
      .fillStyle(UI_COLORS.ink).fillRect(x + 4, y + BUBBLE_BAR_Y, w - 8, 4)
      .fillStyle(share > 0.5 ? 0x40a040 : share > 0.25 ? 0xe8c040 : 0xe04040).fillRect(x + 5, y + BUBBLE_BAR_Y + 1, Math.round((w - 10) * share), 2);
    if (c.timeLeft <= 0) { Sound.bad(); this.leave(c, false, 'Too slow!'); }
  }

  finish(forced) {
    if (this.finished) return;
    this.finished = true;
    const win = forced ?? this.served >= ORDERS_TO_WIN;
    const fill = { served: this.served, total: this.customers.length };
    Minigame.showResult(this, win, minigameText('orders', win, fill), () => this.done({ win, ...fill }));
  }
}
