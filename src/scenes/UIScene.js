// Runs on top of the world with a fixed camera. Layout (320x180):
//   top left   goal panel: "Goal: ..." + "(T) Tasks  (H) Help"
//   top right  stats panel: clock, then Food, Mom's anger and Heat bars
//   below the goal panel: task checklist (T)
//   middle: help screen (H)
//   bottom: dialogue box

const HUD_MARGIN = 4;
const HUD_H = 27;
const HUD_TOP = HUD_MARGIN + HUD_H;      // everything at the top of the screen ends here
const STATS_W = 118;
const BAR_W = 23;
const BAR_GROUP_W = 36;   // icon + bar + gap, per bar

// The three bars, left to right. Mom's anger gets a notch at the Grounded threshold.
const HUD_BARS = [
  { key: 'food', icon: 'food' },
  { key: 'anger', icon: 'mom', color: 0xe0503a },
  { key: 'heat', icon: 'heat', color: 0x4a7ae0 },
];
const POPUP_ROW = { anger: 0, heat: 8 };   // these two can change at once, so they don't share a line

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.buildGoalPanel();
    this.buildStatsPanel();
    this.checklist = this.add.container(0, 0);
    this.checklistOpen = false;
    this.checklistKey = null;
    this.buildHudFocus();
    this.buildHelp();
    this.dialogue = new DialogueBox(this);

    this.input.keyboard.addCapture('TAB');
    this.input.keyboard.on('keydown', e => this.onKey(e));
  }

  // (No day = the week just ended; the world is still up for one frame.)
  inWorld() {
    return this.scene.isActive('World') && !!Clock.today();
  }

  onKey(e) {
    if (e.repeat || !this.inWorld()) return;
    if (this.helpOpen) {
      if (['KeyH', 'Escape', ...CONFIRM_CODES].includes(e.code)) { this.helpOpen = false; e.handled = true; }
      return;
    }
    if (this.dialogue.active) return;
    if (e.code === 'KeyT' || e.code === 'Tab') this.checklistOpen = !this.checklistOpen;
    if (e.code === 'KeyH') { this.helpOpen = true; this.checklistOpen = false; }
  }

  // --- Goal panel (top left) ------------------------------------------------

  buildGoalPanel() {
    this.goalPanel = this.add.graphics();
    this.goalText = this.add.bitmapText(HUD_MARGIN + 7, HUD_MARGIN + 5, 'font', '');
    this.hintText = this.add.bitmapText(HUD_MARGIN + 7, HUD_MARGIN + 18, 'mini', Font.clean('(T) Tasks   (H) Help', 'mini'));
    this.goalLabel = null;
  }

  setGoal(label) {
    if (label === this.goalLabel) return;
    this.goalLabel = label;
    this.goalText.setText(label);
    const w = Math.max(Font.measure(label), Font.measure(this.hintText.text, 'mini')) + 14;
    this.goalPanel.clear();
    drawPanel(this.goalPanel, HUD_MARGIN, HUD_MARGIN, w, HUD_H);
  }

  // --- Stats panel (top right) ----------------------------------------------

  buildStatsPanel() {
    const x = GAME_W - HUD_MARGIN - STATS_W, y = HUD_MARGIN;
    this.statsX = x;
    const panel = this.add.graphics();
    drawPanel(panel, x, y, STATS_W, HUD_H);
    this.clockText = this.add.bitmapText(x + 7, y + 5, 'font', '');
    this.bars = this.add.graphics();
    this.barPos = {};
    const parts = [panel, this.clockText, this.bars];
    HUD_BARS.forEach(({ key, icon }, i) => {
      const gx = x + 7 + i * BAR_GROUP_W;
      parts.push(this.add.image(gx, y + 17, 'hudIcons', icon).setOrigin(0));
      this.barPos[key] = { x: gx + 9, y: y + 18 };
    });
    this.stats = this.add.container(0, 0, parts);
    // What the HUD shows; eases toward the real value so changes are visible.
    this.shown = this.realStats();
    this.easing = {};
  }

  realStats() {
    return { food: STATE.food, anger: STATE.anger, heat: STATE.heat };
  }

  drawBars() {
    const g = this.bars.clear();
    for (const { key, color } of HUD_BARS) {
      const v = this.shown[key];
      const fill = color ?? (v > 50 ? 0x40a040 : v > 25 ? 0xe8c040 : 0xe04040);
      const { x, y } = this.barPos[key];
      const filled = Math.round(BAR_W * v / 100);
      g.fillStyle(UI_COLORS.ink).fillRect(x - 1, y - 1, BAR_W + 2, 7);
      g.fillStyle(0x4a4a52).fillRect(x, y, BAR_W, 5);
      g.fillStyle(fill).fillRect(x, y, filled, 5);
      g.fillStyle(0xffffff, 0.35).fillRect(x, y, filled, 1);
    }
    // Notch on Mom's bar: at or past it after Saturday = Grounded Ben.
    const { x, y } = this.barPos.anger;
    const mx = x + Math.round(BAR_W * CONTENT.groundedAt / 100);
    g.fillStyle(UI_COLORS.ink).fillRect(mx, y - 2, 1, 9);
    g.fillStyle(0xffffff).fillRect(mx, y, 1, 5);
  }

  // "+45" or "Mom's anger +10" appears just under the stats panel and fades when something changes.
  popup(key, amount) {
    const label = CONTENT.barNames[key] ? `${CONTENT.barNames[key]} ` : '';
    const text = Font.clean(`${label}${amount > 0 ? '+' : ''}${Math.round(amount)}`, 'mini');
    const x = Math.min(this.barPos[key].x + 8, GAME_W - HUD_MARGIN - Font.measure(text, 'mini'));
    const t = this.add.bitmapText(x, HUD_TOP + 3 + (POPUP_ROW[key] || 0), 'miniLight', text);
    this.tweens.add({ targets: t, y: t.y + 5, alpha: 0, delay: 1200, duration: 600, onComplete: () => t.destroy() });
  }

  // A blinking box and an arrow on one bar, while a { hud } line in the dialogue explains it.
  buildHudFocus() {
    this.hudBox = this.add.graphics();
    this.hudArrow = this.add.image(0, 0, 'goalArrow', 'down').setOrigin(0.5, 0).setFlipY(true).setVisible(false);
  }

  setHudFocus(key) {
    this.hudFocus = key;
    this.hudBox.clear();
    this.hudArrow.setVisible(!!key);
    if (!key) return;
    const { x, y } = this.barPos[key];
    this.hudBox.lineStyle(1, GOAL_COLORS.fill).strokeRect(x - 11, y - 3, BAR_W + 13, 11);
    this.hudArrow.setPosition(x + 2, HUD_TOP + 3);
  }

  updateHudFocus() {
    if (!this.hudFocus) return;
    this.hudBox.setVisible(Math.floor(this.time.now / 260) % 2 === 0);
    this.hudArrow.y = HUD_TOP + 3 + Math.round((Math.sin(this.time.now / 190) + 1) * 2);
  }

  updateStats() {
    this.clockText.setText(Clock.label());
    for (const { key } of HUD_BARS) {
      const diff = STATE[key] - this.shown[key];
      if (Math.abs(diff) >= 1 && !this.easing[key]) this.popup(key, diff);
      this.easing[key] = Math.abs(diff) >= 0.5;
      this.shown[key] = Math.abs(diff) < 0.5 ? STATE[key] : this.shown[key] + Math.sign(diff) * Math.max(0.5, Math.abs(diff) * 0.08);
    }
    this.drawBars();
  }

  // --- Task checklist (T) ---------------------------------------------------

  // Redraw only when the day's task states change.
  refreshChecklist() {
    const key = `${STATE.day}:${JSON.stringify(STATE.tasks)}`;
    if (key === this.checklistKey) return;
    this.checklistKey = key;
    this.checklist.removeAll(true);

    const day = Clock.today();
    const rowH = 11;
    const texts = day.tasks.map(t => Font.clean(t.text));
    const w = Math.max(Font.measure(`${day.name} tasks`), ...texts.map(t => Font.measure(t) + 14)) + 16;
    const h = 20 + day.tasks.length * rowH;
    const x = HUD_MARGIN, y = HUD_TOP + 4;
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h);
    this.checklist.add(g);
    this.checklist.add(this.add.bitmapText(x + 8, y + 5, 'font', `${day.name} tasks`));
    day.tasks.forEach((task, i) => {
      const ty = y + 18 + i * rowH;
      const status = STATE.tasks[task.id];
      // checkbox: empty, green check, or red X
      g.fillStyle(UI_COLORS.ink).fillRect(x + 8, ty, 8, 8);
      g.fillStyle(0xffffff).fillRect(x + 9, ty + 1, 6, 6);
      if (status === 'done') {
        g.fillStyle(0x30a030).fillRect(x + 10, ty + 4, 1, 2).fillRect(x + 11, ty + 5, 1, 2).fillRect(x + 12, ty + 4, 1, 2)
          .fillRect(x + 13, ty + 2, 1, 3).fillRect(x + 14, ty + 1, 1, 2);
      } else if (status === 'missed') {
        g.fillStyle(0xd03030);
        for (let k = 0; k < 5; k++) { g.fillRect(x + 10 + k, ty + 2 + k, 1, 1); g.fillRect(x + 14 - k, ty + 2 + k, 1, 1); }
      }
      const label = this.add.bitmapText(x + 21, ty - 1, 'font', texts[i]);
      if (status) label.setAlpha(0.5);
      this.checklist.add(label);
    });
  }

  // --- Help screen (H) ------------------------------------------------------

  buildHelp() {
    this.helpOpen = false;
    const rows = CONTENT.help;
    const rowH = 12, keyW = 82;
    const w = 236, h = 34 + rows.length * rowH;
    const x = Math.floor((GAME_W - w) / 2), y = Math.floor((GAME_H - h) / 2);
    const shade = this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, GAME_H);
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h);
    const parts = [shade, g, this.add.bitmapText(x + 10, y + 6, 'font', 'Help')];
    rows.forEach(([key, what], i) => {
      parts.push(this.add.bitmapText(x + 10, y + 21 + i * rowH, 'font', Font.clean(key)).setAlpha(0.65));
      parts.push(this.add.bitmapText(x + 10 + keyW, y + 21 + i * rowH, 'font', Font.clean(what)));
    });
    const close = Font.clean('Press H to close', 'mini');
    parts.push(this.add.bitmapText(x + w - 10 - Font.measure(close, 'mini'), y + 8, 'mini', close));
    this.help = this.add.container(0, 0, parts).setVisible(false);
  }

  // --------------------------------------------------------------------------

  update() {
    const inWorld = this.inWorld();
    const beat = inWorld && Story.current();
    this.setGoal(Font.clean(beat && beat.goal ? `Goal: ${Story.fill(beat.goal)}` : 'Goal: -')); // {crush} works in goals
    for (const o of [this.goalPanel, this.goalText, this.hintText, this.stats]) o.setVisible(inWorld);

    if (!inWorld) {
      this.checklistOpen = false;
      this.helpOpen = false;
      this.checklist.setVisible(false);
      this.help.setVisible(false);
      this.shown = this.realStats();
      return;
    }

    this.updateStats();
    this.updateHudFocus();
    const showList = this.checklistOpen && !this.dialogue.active && !this.helpOpen;
    this.checklist.setVisible(showList);
    if (showList) this.refreshChecklist();
    this.help.setVisible(this.helpOpen);
  }
}
