// A menu panel: a list of rows with a cursor, used by the title screen,
// settings, pause menu and yes/no questions.
//   Up/Down (or W/S) move, Space/Enter picks, Left/Right change a value row,
//   Esc cancels. Mouse: hover a row to point at it, click to pick (on a value
//   row, clicking left of the value's middle lowers it, right of it raises it).
//
// options: { x, y (top; centered on screen if left out), w, title, items, onCancel }
// item:    { label, select(), value() -> text, change(dir), disabled() }
// A slider row: { label, slider: { get() -> 0..max, set(v), max } } draws  -  [bar]  +
//   (click the - or +, or click on the bar to jump there; Left/Right work too).

const MENU_ROW_H = 14;
const SLIDER = { segW: 4, gap: 1, sideW: 9 };   // bar segment width, gap between them, room for - and +
const LEFT_CODES = ['ArrowLeft', 'KeyA'];
const RIGHT_CODES = ['ArrowRight', 'KeyD'];

class Menu {
  constructor(scene, opts) {
    this.scene = scene;
    this.items = opts.items;
    this.onCancel = opts.onCancel;
    this.enabled = true;
    this.index = 0;

    const titleH = opts.title ? 18 : 0;
    this.w = opts.w || 140;
    this.h = titleH + this.items.length * MENU_ROW_H + 10;
    this.x = opts.x ?? Math.floor((GAME_W - this.w) / 2);
    this.y = opts.y ?? Math.floor((GAME_H - this.h) / 2);
    const top = this.y + 6 + titleH;

    const g = scene.add.graphics();
    drawPanel(g, this.x, this.y, this.w, this.h);
    const parts = [g];
    if (opts.title) {
      const title = Font.clean(opts.title);
      parts.push(scene.add.bitmapText(Math.floor(this.x + (this.w - Font.measure(title)) / 2), this.y + 7, 'font', title));
    }

    this.rows = this.items.map((item, i) => {
      const y = top + i * MENU_ROW_H;
      const label = scene.add.bitmapText(this.x + 16, y + 1, 'font', Font.clean(item.label));
      const value = scene.add.bitmapText(0, y + 1, 'font', '');
      const zone = scene.add.zone(this.x + 4, y - 1, this.w - 8, MENU_ROW_H).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { if (this.enabled && !this.isDisabled(i)) this.point(i); });
      zone.on('pointerdown', pointer => {
        if (!this.enabled || this.isDisabled(i)) return;
        this.point(i);
        if (item.slider) this.clickSlider(item, pointer.x);
        // "<  Fast  >": clicking left of the middle of the value lowers it, right of it raises it.
        else if (item.change) this.change(pointer.x < value.x + value.width / 2 ? -1 : 1);
        else this.pick();
      });
      parts.push(label, value, zone);
      const row = { y, label, value, zone };
      if (item.slider) {
        row.bar = scene.add.graphics();
        row.minus = scene.add.bitmapText(0, y + 1, 'font', '-');
        row.plus = scene.add.bitmapText(0, y + 1, 'font', '+');
        parts.push(row.bar, row.minus, row.plus);
      }
      return row;
    });

    this.cursor = scene.add.graphics();
    this.cursor.fillStyle(UI_COLORS.ink).fillRect(0, 0, 1, 5).fillRect(1, 1, 1, 3).fillRect(2, 2, 1, 1);
    parts.push(this.cursor);
    this.root = scene.add.container(0, 0, parts).setDepth(opts.depth || 0);

    this.onKey = e => this.handleKey(e);
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => this.destroy());

    this.index = this.items.findIndex((_, i) => !this.isDisabled(i));
    this.refresh();
  }

  isDisabled(i) {
    const item = this.items[i];
    return !!(item.disabled && item.disabled());
  }

  // Redraw values and greyed-out rows (call after anything changes).
  refresh() {
    this.items.forEach((item, i) => {
      const row = this.rows[i];
      row.label.setAlpha(this.isDisabled(i) ? 0.4 : 1);
      if (item.value) {
        const text = Font.clean(item.value());
        row.value.setText(text).setX(this.x + this.w - 12 - Font.measure(text));
      }
      if (item.slider) this.drawSlider(item, row);
    });
    if (this.index >= 0) this.cursor.setPosition(this.x + 9, this.rows[this.index].y + 2);
  }

  // Where a slider's bar sits: its left edge and width.
  sliderBar(item) {
    const { segW, gap, sideW } = SLIDER;
    const w = item.slider.max * (segW + gap) - gap;
    return { x: this.x + this.w - 12 - sideW - w, w };
  }

  drawSlider(item, row) {
    const { segW, gap, sideW } = SLIDER;
    const bar = this.sliderBar(item);
    const v = item.slider.get();
    const g = row.bar.clear();
    for (let s = 0; s < item.slider.max; s++) {
      const sx = bar.x + s * (segW + gap);
      g.fillStyle(UI_COLORS.ink).fillRect(sx, row.y + 2, segW, 7);
      g.fillStyle(s < v ? UI_COLORS.accent : UI_COLORS.paper).fillRect(sx + 1, row.y + 3, segW - 2, 5);
    }
    row.minus.setX(bar.x - sideW + 2);
    row.plus.setX(bar.x + bar.w + 4);
    const off = this.isDisabled(this.rows.indexOf(row)) ? 0.4 : 1;
    [row.bar, row.minus, row.plus].forEach(o => o.setAlpha(off));
  }

  // A click on a slider row: the - or + steps it, a click on the bar jumps there.
  clickSlider(item, px) {
    const { segW, gap } = SLIDER;
    const bar = this.sliderBar(item);
    if (px < bar.x) this.change(-1);
    else if (px > bar.x + bar.w) this.change(1);
    else {
      const v = Phaser.Math.Clamp(Math.floor((px - bar.x) / (segW + gap)) + 1, 0, item.slider.max);
      item.slider.set(v === item.slider.get() && v === 1 ? 0 : v);   // clicking the first segment again turns it off
      this.refresh();
    }
  }

  point(i) {
    if (i === this.index) return;
    this.index = i;
    Sound.blip();
    this.refresh();
  }

  move(dir) {
    const n = this.items.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.isDisabled(i)) break;
    }
    this.point(i);
  }

  change(dir) {
    const item = this.items[this.index];
    if (item.slider) {
      const s = item.slider;
      s.set(Phaser.Math.Clamp(s.get() + dir, 0, s.max));
    } else if (item.change) item.change(dir);
    else return;
    this.refresh();
  }

  pick() {
    const item = this.items[this.index];
    if (item.change || item.slider) { this.change(1); return; }
    if (item.select) item.select();
  }

  handleKey(e) {
    // e.handled: another menu already used this key press (e.g. the one that just closed).
    if (!this.enabled || e.handled || e.repeat) return;
    const code = e.code;
    if (UP_CODES.includes(code)) this.move(-1);
    else if (DOWN_CODES.includes(code)) this.move(1);
    else if (LEFT_CODES.includes(code)) this.change(-1);
    else if (RIGHT_CODES.includes(code)) this.change(1);
    else if (CONFIRM_CODES.includes(code)) this.pick();
    else if (code === 'Escape' && this.onCancel) this.onCancel();
    else return;
    e.handled = true;
  }

  setEnabled(on) {
    this.enabled = on;
    this.rows.forEach(r => (on ? r.zone.setInteractive() : r.zone.disableInteractive()));
  }

  setVisible(on) {
    this.root.setVisible(on);
    this.setEnabled(on);
  }

  destroy() {
    if (!this.root) return;
    this.scene.input.keyboard.off('keydown', this.onKey);
    this.root.destroy();
    this.root = null;
  }
}

// A yes/no question on top of everything. Calls done(true) for Yes.
// No is picked first so a stray Space doesn't delete anything.
function confirmBox(scene, question, done, depth = 100) {
  const shade = scene.add.graphics().fillStyle(0x000000, 0.5).fillRect(0, 0, GAME_W, GAME_H).setDepth(depth);
  const w = Math.max(120, Font.measure(Font.clean(question)) + 24);
  const close = answer => {
    shade.destroy();
    menu.destroy();
    done(answer);
  };
  const menu = new Menu(scene, {
    w, title: question, depth: depth + 1, onCancel: () => close(false),
    items: [{ label: 'No', select: () => close(false) }, { label: 'Yes', select: () => close(true) }],
  });
  return menu;
}
