// Math test: ten questions on a test paper, each with four answers. Pick one
// with the arrows + Space, the number keys 1-4, or a click. Questions get
// harder as you go. Get MATH_NEED right before the time runs out.

const MATH_QUESTIONS = 10;
const MATH_NEED = 7;
const MATH_TIME_S = 50;
const PAPER = { x: 40, y: 16, w: 240, h: 160 };
const ANSWER_BOXES = [[84, 104], [184, 104], [84, 134], [184, 134]];  // centers, 2x2
const ANSWER_W = 80, ANSWER_H = 22;

// One question for slot i (0-9): [text, answer]. Tiers get harder.
function mathQuestion(i) {
  const r = (a, b) => Phaser.Math.Between(a, b);
  if (i < 3) { const a = r(12, 48), b = r(3, 9); return [`${a} + ${b}`, a + b]; }
  if (i < 5) { const a = r(20, 60), b = r(4, 19); return [`${a} - ${b}`, a - b]; }
  if (i < 8) { const a = r(3, 9), b = r(4, 9); return [`${a} x ${b}`, a * b]; }
  const b = r(3, 9), ans = r(3, 9);
  return [`${b * ans} / ${b}`, ans];
}

// Four choices: the answer plus three close wrong ones, shuffled.
function mathChoices(answer) {
  const wrong = new Set();
  const offsets = Phaser.Utils.Array.Shuffle([-10, -2, -1, 1, 2, 10, 3, -3]);
  for (const o of offsets) { if (wrong.size < 3 && answer + o > 0) wrong.add(answer + o); }
  return Phaser.Utils.Array.Shuffle([answer, ...wrong]);
}

class MathScene extends Phaser.Scene {
  constructor() { super('Math'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.q = 0;
    this.right = 0;
    this.choice = 0;
    this.locked = false;   // short pause after answering
    this.timeLeft = MATH_TIME_S * 1000;
    this.text = CONTENT.minigames.math;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    // Ben's desk and the test paper.
    const g = this.add.graphics();
    g.fillStyle(0xb07d50).fillRect(0, 0, GAME_W, GAME_H);
    for (let y = 6; y < GAME_H; y += 14) g.fillStyle(0x9a6a40).fillRect(0, y, GAME_W, 1);
    g.fillStyle(0x000000, 0.25).fillRect(PAPER.x + 3, PAPER.y + 3, PAPER.w, PAPER.h);
    g.fillStyle(0xf8f6ec).fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
    for (let y = PAPER.y + 30; y < PAPER.y + PAPER.h; y += 10) g.fillStyle(0xc8dcf0).fillRect(PAPER.x, y, PAPER.w, 1);
    g.fillStyle(0xe8a0a0).fillRect(PAPER.x + 22, PAPER.y, 1, PAPER.h);   // the red margin line
    // pencil
    g.fillStyle(0xe8c040).fillRect(286, 60, 6, 70).fillStyle(0xf0c8a0).fillRect(286, 130, 6, 6).fillStyle(0x3a3a48).fillRect(288, 136, 2, 3);
    g.fillStyle(0xe07aa0).fillRect(286, 54, 6, 6);

    this.add.bitmapText(PAPER.x + 28, PAPER.y + 6, 'font', Font.clean(this.text.header));
    this.add.bitmapText(PAPER.x + PAPER.w - 70, PAPER.y + 6, 'font', Font.clean('Name: Ben'));
    this.marks = this.add.graphics();       // checks and X's down the margin
    this.numText = this.add.bitmapText(PAPER.x + 28, PAPER.y + 32, 'font', '');
    this.qText = this.add.bitmapText(0, PAPER.y + 52, 'font', '').setScale(2);
    this.boxes = this.add.graphics();
    this.answerTexts = ANSWER_BOXES.map(([x, y], i) => {
      const zone = this.add.zone(x - ANSWER_W / 2, y - ANSWER_H / 2, ANSWER_W, ANSWER_H).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { if (this.canPlay()) { this.choice = i; this.drawBoxes(); } });
      zone.on('pointerdown', () => { if (this.canPlay()) { this.choice = i; this.answer(); } });
      return this.add.bitmapText(0, y - 4, 'font', '');
    });
    this.doodle = this.add.graphics();       // Ben's F-16 grows in the corner as time runs out

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.scoreText = this.add.bitmapText(4, 3, 'miniLight', '').setDepth(51);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    const hint = Font.clean('Arrows + Space, keys 1-4, or click', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(51);

    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.showQuestion();
    this.updateHud();
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; this.drawBoxes(); }, 'PENCILS UP!'));
  }

  canPlay() { return this.started && !this.finished && !this.locked; }

  showQuestion() {
    const [text, answer] = mathQuestion(this.q);
    this.answerValue = answer;
    this.choices = mathChoices(answer);
    this.numText.setText(Font.clean(`Question ${this.q + 1} of ${MATH_QUESTIONS}`));
    const qt = Font.clean(`${text} = ?`);
    this.qText.setText(qt).setX(Math.floor(PAPER.x + 22 + (PAPER.w - 22 - Font.measure(qt) * 2) / 2));
    this.choices.forEach((c, i) => {
      const label = Font.clean(`${'ABCD'[i]})  ${c}`);
      this.answerTexts[i].setText(label).setX(Math.floor(ANSWER_BOXES[i][0] - Font.measure(label) / 2));
    });
    this.choice = 0;
    this.drawBoxes();
  }

  drawBoxes(result) {
    const b = this.boxes.clear();
    ANSWER_BOXES.forEach(([x, y], i) => {
      const picked = i === this.choice && this.started;
      let fill = picked ? 0xfff4b0 : 0xffffff;
      if (result && i === this.choice) fill = result === 'right' ? 0xb8f0b8 : 0xf8b8b8;
      if (result === 'wrong' && this.choices[i] === this.answerValue) fill = 0xb8f0b8;
      b.fillStyle(0x181425).fillRect(x - ANSWER_W / 2 - 1, y - ANSWER_H / 2 - 1, ANSWER_W + 2, ANSWER_H + 2);
      b.fillStyle(fill).fillRect(x - ANSWER_W / 2, y - ANSWER_H / 2, ANSWER_W, ANSWER_H);
    });
  }

  updateHud() {
    this.scoreText.setText(Font.clean(`Right: ${this.right}/${MATH_QUESTIONS}  (need ${MATH_NEED})`, 'mini'));
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2)).setTint(s <= 10 ? 0xff7070 : 0xffffff);
  }

  onKey(e) {
    if (DEBUG && e.code === 'BracketRight') { this.right = MATH_NEED; this.finish(); return; }
    if (DEBUG && e.code === 'BracketLeft') { this.right = 0; this.finish(); return; }
    if (!this.canPlay() || e.repeat) return;
    const num = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (num >= 0) { this.choice = num; this.answer(); return; }
    const col = this.choice % 2, row = Math.floor(this.choice / 2);
    if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) this.choice = row * 2 + (1 - col);
    else if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) this.choice = (1 - row) * 2 + col;
    else if (CONFIRM_CODES.includes(e.code)) { this.answer(); return; }
    else return;
    Sound.blip();
    this.drawBoxes();
  }

  answer() {
    const ok = this.choices[this.choice] === this.answerValue;
    if (ok) { this.right++; Sound.good(); } else Sound.bad();
    // A check or an X in the margin next to this question's row.
    const my = PAPER.y + 34 + this.q * 12.5;
    const m = this.marks;
    if (ok) m.fillStyle(0x30a040).fillRect(PAPER.x + 6, my + 3, 2, 2).fillRect(PAPER.x + 8, my + 5, 2, 2).fillRect(PAPER.x + 10, my + 1, 2, 4).fillRect(PAPER.x + 12, my - 1, 2, 2);
    else m.fillStyle(0xd03838).fillRect(PAPER.x + 6, my, 2, 2).fillRect(PAPER.x + 12, my, 2, 2).fillRect(PAPER.x + 8, my + 2, 4, 2).fillRect(PAPER.x + 6, my + 4, 2, 2).fillRect(PAPER.x + 12, my + 4, 2, 2);
    this.drawBoxes(ok ? 'right' : 'wrong');
    this.updateHud();
    this.locked = true;
    this.time.delayedCall(ok ? 350 : 700, () => {
      this.locked = false;
      this.q++;
      if (this.q >= MATH_QUESTIONS) { this.finish(); return; }
      this.showQuestion();
    });
  }

  // The longer the test goes, the more of an F-16 Ben has drawn in the corner.
  drawDoodle() {
    const k = 1 - this.timeLeft / (MATH_TIME_S * 1000);
    const d = this.doodle.clear().fillStyle(0x5a6aa8);
    const x = PAPER.x + PAPER.w - 44, y = PAPER.y + 30;
    if (k > 0.2) d.fillRect(x, y + 6, 30, 2);                       // body
    if (k > 0.4) d.fillRect(x + 10, y + 2, 8, 10);                   // wings
    if (k > 0.6) d.fillRect(x, y + 3, 3, 8);                        // tail
    if (k > 0.8) d.fillRect(x + 30, y + 6, 4, 1).fillStyle(0xe8782a).fillRect(x - 4, y + 6, 4, 2); // nose + afterburner
  }

  update(time, delta) {
    if (!this.started || this.finished) return;
    this.timeLeft -= delta;
    this.drawDoodle();
    this.updateHud();
    if (this.timeLeft <= 0) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const win = this.right >= MATH_NEED;
    const fill = { right: this.right, total: MATH_QUESTIONS, need: MATH_NEED };
    Minigame.showResult(this, win, minigameText('math', win, fill), () => this.done({ win, ...fill }));
  }
}
