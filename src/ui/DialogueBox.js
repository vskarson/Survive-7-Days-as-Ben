// Classic RPG text box: 2 lines per box, text types out letter by letter,
// a name tag shows who's talking, and choice menus pop up above the box.
//
// Scripts come from content.js (see the notes at the top of that file).
// A { phone: [...] } entry shows a text-message conversation on Ben's phone.

const BOX = { x: 4, y: 140, w: 312, h: 36 };
const TEXT_X = BOX.x + 9;
const TEXT_Y = BOX.y + 7;
const TEXT_W = BOX.w - 26;                         // leaves room for the ▼ arrow
const CONFIRM_CODES = ['Space', 'Enter', 'NumpadEnter'];
const UP_CODES = ['ArrowUp', 'KeyW'];
const DOWN_CODES = ['ArrowDown', 'KeyS'];

const UI_COLORS = { ink: 0x181425, paper: 0xf8f8f8, accent: 0x5a7fb5 };

// Extra letter-lengths the text waits after punctuation, so it reads like talking.
const TEXT_PAUSE = { ',': 3, '.': 5, '!': 5, '?': 5 };

// Ben's phone for text conversations: centered above the dialogue box.
const PHONE = { w: 116, h: 132, y: 6, bubbleW: 76 };

// Double-bordered panel with clipped corners (accent = the inner border color).
function drawPanel(g, x, y, w, h, accent = UI_COLORS.accent) {
  g.fillStyle(UI_COLORS.ink).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
  g.fillStyle(UI_COLORS.paper).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(accent).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(UI_COLORS.paper).fillRect(x + 3, y + 3, w - 6, h - 6);
}

class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.active = false;

    this.nameTag = scene.add.graphics();
    this.nameText = scene.add.bitmapText(0, 0, 'font', '');
    this.panel = scene.add.graphics();
    drawPanel(this.panel, BOX.x, BOX.y, BOX.w, BOX.h);
    this.text = scene.add.bitmapText(TEXT_X, TEXT_Y, 'font', '');

    // ▼ "press to continue" arrow, bobbing
    this.arrow = scene.add.graphics();
    const ax = BOX.x + BOX.w - 14, ay = BOX.y + BOX.h - 11;
    this.arrow.fillStyle(UI_COLORS.ink).fillRect(ax, ay, 5, 1).fillRect(ax + 1, ay + 1, 3, 1).fillRect(ax + 2, ay + 2, 1, 1);
    scene.time.addEvent({ delay: 300, loop: true, callback: () => { this.arrow.y = this.arrow.y ? 0 : 1; } });

    this.choicePanel = scene.add.graphics();
    this.choiceTexts = [];
    this.cursor = scene.add.graphics();
    this.cursor.fillStyle(UI_COLORS.ink).fillRect(0, 0, 1, 5).fillRect(1, 1, 1, 3).fillRect(2, 2, 1, 1);

    this.root = scene.add.container(0, 0, [this.nameTag, this.nameText, this.panel, this.text, this.arrow, this.choicePanel, this.cursor]);
    this.root.setVisible(false);
    this.hideChoice();

    scene.input.keyboard.on('keydown', e => this.onKey(e));
  }

  // Play a script: either a dialogue ID from CONTENT.dialogue or an array of entries.
  // Resolves when the box closes, with { travel, stay, jump, wear } from any chosen options.
  async play(script) {
    if (this.active) return null;
    const entries = this.resolve(script);
    if (!entries) return null;
    this.active = true;
    this.result = {};
    this.root.setVisible(true);
    Music.ducked = true;
    try {
      await this.run(entries);
    } finally {
      this.scene.setHudFocus(null);
      this.root.setVisible(false);
      this.text.setText('');
      this.active = false;
      Music.ducked = false;
    }
    return this.result;
  }

  resolve(script) {
    if (Array.isArray(script)) return script;
    if (typeof script === 'string') {
      const found = CONTENT.dialogue[script];
      if (!found) console.warn(`[dialogue] no dialogue called '${script}' in content.js`);
      return Story.version(script, found);
    }
    return null;
  }

  async run(entries) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const next = entries[i + 1];
      if (typeof entry === 'string') {
        // If a choice comes next, leave this line up while the player picks.
        await this.say(entry, !!(next && next.choice));
      } else if (entry && entry.phone) {
        await this.showPhone(entry.phone);
      } else if (entry && entry.music !== undefined) {
        // { music: 'tense' } or { music: null } for silence, until the story moves on.
        const world = this.scene.scene.get('World');
        if (world) world.setMood(entry.music);
      } else if (entry && 'hud' in entry) {
        this.scene.setHudFocus(entry.hud);
      } else if (entry && entry.choice) {
        const option = await this.choose(entry.choice.filter(o => Story.check(o.if)));
        if (entry.record) Stats.record(entry.record, option.pick ?? option.text);
        for (const key of ['travel', 'stay', 'jump', 'wear', 'minigame', 'day']) if (option[key]) this.result[key] = option[key];
        Stats.apply(option); // meal / anger / heat / task effects show up right away
        const branch = option.goto ? this.resolve(option.goto) : option.then;
        if (branch) await this.run(branch);
      }
    }
  }

  // Text messages: Ben's on the right in blue, the other person's on the left in
  // grey, one more per Space press. The newest stay on screen; older ones scroll off.
  async showPhone(lines) {
    const msgs = lines.map(line => this.parseLine(line));
    const contact = (msgs.find(m => m.speaker && m.speaker !== 'Ben') || {}).speaker || '';
    const x = Math.floor((GAME_W - PHONE.w) / 2), y = PHONE.y;
    const screen = { x: x + 5, y: y + 23, w: PHONE.w - 10, h: PHONE.h - 38 };
    const phone = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    g.fillStyle(UI_COLORS.ink).fillRect(x, y + 1, PHONE.w, PHONE.h - 2).fillRect(x + 1, y, PHONE.w - 2, PHONE.h);
    g.fillStyle(0x3a3a48).fillRect(x + 2, y + 2, PHONE.w - 4, PHONE.h - 4);
    g.fillStyle(0xf4f6fa).fillRect(x + 5, y + 6, PHONE.w - 10, PHONE.h - 18);
    g.fillStyle(0xdde2ea).fillRect(x + 5, y + 6, PHONE.w - 10, 13);
    g.fillStyle(0x22222a).fillRect(x + PHONE.w / 2 - 8, y + PHONE.h - 9, 16, 4);
    const name = Font.clean(contact);
    const hint = Font.clean('Space', 'mini');
    phone.add([g, this.scene.add.bitmapText(Math.floor(x + (PHONE.w - Font.measure(name)) / 2), y + 7, 'font', name),
      this.scene.add.bitmapText(x + PHONE.w - 7 - Font.measure(hint, 'mini'), y + PHONE.h - 17, 'mini', hint).setAlpha(0.6)]);
    const bubbles = this.scene.add.container(0, 0);
    phone.add(bubbles);
    this.root.setVisible(false);

    const shown = [];
    const layout = () => {
      bubbles.removeAll(true);
      // Fit the newest messages, then draw them top to bottom.
      const sized = shown.map(m => {
        const rows = Font.wrap(Font.clean(m.text), PHONE.bubbleW);
        return { ...m, rows, w: Math.max(...rows.map(r => Font.measure(r))) + 8, h: rows.length * Font.LINE_H + 3 };
      });
      let total = 0, first = sized.length;
      while (first > 0 && total + sized[first - 1].h + 3 <= screen.h) total += sized[--first].h + 3;
      let by = screen.y;
      for (const b of sized.slice(first)) {
        const mine = b.speaker === 'Ben';
        const bx = mine ? screen.x + screen.w - 3 - b.w : screen.x + 3;
        const bg = this.scene.add.graphics().fillStyle(mine ? 0x3a7ae8 : 0xc8ccd4)
          .fillRect(bx + 1, by, b.w - 2, b.h).fillRect(bx, by + 1, b.w, b.h - 2);
        bubbles.add(bg);
        b.rows.forEach((row, i) => bubbles.add(this.scene.add.bitmapText(bx + 4, by + 1 + i * Font.LINE_H, mine ? 'fontLight' : 'font', row)));
        by += b.h + 3;
      }
    };
    try {
      for (const m of msgs) {
        shown.push(m);
        layout();
        Sound.blip();
        await new Promise(resolve => { this.onConfirm = resolve; });
      }
    } finally {
      phone.destroy();
      this.root.setVisible(true);
    }
  }

  // "Mom: Get up!" -> speaker Mom. Lines without a known name are narration.
  parseLine(line) {
    line = Story.fill(line);
    const m = line.match(/^([^:]{1,20}):\s+([\s\S]*)$/);
    if (m) {
      const who = Object.values(CONTENT.characters).find(c => c.name.toLowerCase() === m[1].trim().toLowerCase());
      if (who) return { speaker: who.name, voice: who.voice, text: m[2] };
    }
    return { speaker: null, voice: NARRATOR_VOICE, text: line };
  }

  setSpeaker(name) {
    this.nameTag.clear();
    this.nameText.setText(name || '');
    if (!name) return;
    const w = Font.measure(name) + 14;
    drawPanel(this.nameTag, BOX.x + 4, BOX.y - 14, w, 17);
    this.nameText.setPosition(BOX.x + 11, BOX.y - 10);
  }

  async say(line, leaveOpen) {
    const { speaker, voice, text } = this.parseLine(line);
    this.setSpeaker(speaker);
    const lines = Font.wrap(Font.clean(text), TEXT_W);
    for (let i = 0; i < lines.length; i += 2) {
      await this.typePage(lines.slice(i, i + 2).join('\n'), voice);
      if (leaveOpen && i + 2 >= lines.length) return;
      this.arrow.setVisible(true);
      await new Promise(resolve => { this.onConfirm = resolve; });
      this.arrow.setVisible(false);
    }
  }

  typePage(page, voice) {
    return new Promise(resolve => {
      let shown = 0, pause = 0;
      this.text.setText('');
      this.arrow.setVisible(false);
      this.typing = true;
      this.finishTyping = () => {
        if (!this.typing) return;
        this.typing = false;
        timer.remove();
        this.text.setText(page);
        resolve();
      };
      const timer = this.scene.time.addEvent({
        delay: Settings.charMs(), loop: true,   // typing speed per letter (Settings)
        callback: () => {
          if (pause > 0) { pause--; return; }
          shown++;
          this.text.setText(page.slice(0, shown));
          Sound.talk(page, shown - 1, voice);
          pause = TEXT_PAUSE[page[shown - 1]] || 0;
          if (shown >= page.length) this.finishTyping();
        },
      });
    });
  }

  choose(options) {
    const widest = Math.max(...options.map(o => Font.measure(Font.clean(Story.fill(o.text)))));
    const w = widest + 26;
    const h = options.length * Font.LINE_H + 12;
    const x = BOX.x + BOX.w - w;
    const y = BOX.y - h - 1;
    drawPanel(this.choicePanel, x, y, w, h);
    this.choiceTexts = options.map((o, i) => {
      const t = this.scene.add.bitmapText(x + 15, y + 7 + i * Font.LINE_H, 'font', Font.clean(Story.fill(o.text)));
      this.root.add(t);
      return t;
    });
    this.choiceIndex = 0;
    this.choiceAt = i => this.cursor.setPosition(x + 8, y + 8 + i * Font.LINE_H);
    this.choiceAt(0);
    this.cursor.setVisible(true);
    return new Promise(resolve => {
      this.choice = { options, resolve };
    });
  }

  hideChoice() {
    this.choicePanel.clear();
    this.choiceTexts.forEach(t => t.destroy());
    this.choiceTexts = [];
    this.cursor.setVisible(false);
    this.choice = null;
  }

  onKey(e) {
    // e.handled is set by the world when the same key press opened this box.
    if (!this.active || e.handled || e.repeat) return;
    const code = e.code;

    if (this.choice) {
      const n = this.choice.options.length;
      if (UP_CODES.includes(code)) this.choiceAt(this.choiceIndex = (this.choiceIndex + n - 1) % n);
      else if (DOWN_CODES.includes(code)) this.choiceAt(this.choiceIndex = (this.choiceIndex + 1) % n);
      else if (CONFIRM_CODES.includes(code)) {
        const { options, resolve } = this.choice;
        this.hideChoice();
        resolve(options[this.choiceIndex]);
      }
      return;
    }

    if (!CONFIRM_CODES.includes(code)) return;
    if (this.typing) this.finishTyping();
    else if (this.onConfirm) {
      const done = this.onConfirm;
      this.onConfirm = null;
      done();
    }
  }
}
