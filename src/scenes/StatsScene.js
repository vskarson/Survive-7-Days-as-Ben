// The stats screen after the ending: the decisions Ben made and a quick summary.
// Space starts over at the title screen.

const STATS_HEADER_COLOR = 0x5a7fb5;   // the line under each section title
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  create(data) {
    this.text = CONTENT.stats;
    this.cameras.main.setBackgroundColor('#181425');
    Music.play('title');
    const ending = CONTENT.endings[data.ending || Stats.ending()];

    Minigame.centerText(this, this.text.title, 3, 'fontLight', 2).setTint(0xffd860);
    Minigame.centerText(this, this.text.ending.replace('{name}', ending.title), 24, 'miniLight');

    const g = this.add.graphics();
    drawPanel(g, 6, 32, 308, 80);
    drawPanel(g, 6, 116, 308, 50);
    this.decisions(14, 37);
    this.summary(14, 121);

    const prompt = Minigame.centerText(this, this.text.prompt, GAME_H - 8, 'miniLight');
    this.time.addEvent({ delay: 450, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    this.ready = false;
    this.time.delayedCall(600, () => { this.ready = true; });
    const onKey = e => this.onKey(e);
    this.input.keyboard.on('keydown', onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', onKey));
    this.cameras.main.fadeIn(300);
  }

  line(x, y, text) {
    return this.add.bitmapText(x, y, 'mini', Font.clean(Story.fill(text), 'mini'));
  }

  // A section title, underlined in the panel color.
  header(x, y, text) {
    const t = this.line(x, y, text);
    this.add.graphics().fillStyle(STATS_HEADER_COLOR).fillRect(x, y + 7, t.width, 1);
  }

  // One line per recorded decision ("Tue  Knife: "It's my dad's""). The Zyn
  // choice comes up every school day, so it's one line counting the sneaks.
  decisions(x, y) {
    this.header(x, y, this.text.decisions);
    const labels = this.text.choices;
    const rows = [];
    const zyns = STATE.choices.filter(c => c.id === 'zyn');
    for (const c of STATE.choices) {
      const label = labels[c.id];
      if (!label) continue;   // the love interest has its own line
      if (c.id === 'zyn') {
        if (c !== zyns[0]) continue;
        const n = zyns.filter(z => z.pick === 'sneak').length;
        rows.push(['', `${label.label}: ${label.count.replace('{n}', n).replace('{of}', zyns.length)}`]);
      } else {
        rows.push([DAY_SHORT[c.day - 1], `${label.label}: ${label[c.pick] || c.pick}`]);
      }
    }
    if (!rows.length) rows.push(['', this.text.noDecisions]);
    rows.forEach(([day, text], i) => {
      this.line(x, y + 10 + i * 8, day);
      this.line(x + 20, y + 10 + i * 8, text);
    });
  }

  // Minigames won, the Friday game, the love interest and where the bars ended up.
  summary(x, y) {
    const t = this.text;
    this.header(x, y, t.summary);
    const won = STATE.games.filter(g => g.win).length;
    const friday = STATE.games.find(g => g.game === 'fridayGame');
    const f = t.friday;
    const fridayText = !friday ? f.none : (friday.win ? f.win : f.lose).replace('{score}', friday.score || '').trim();
    const bars = t.bars.replace('{anger}', Math.round(STATE.anger)).replace('{heat}', Math.round(STATE.heat));
    this.line(x, y + 11, t.minigames.replace('{won}', won).replace('{played}', STATE.games.length));
    this.line(x + 152, y + 11, fridayText);
    this.line(x, y + 21, t.crush.replace('{crush}', Story.chose('crush') || '-'));
    this.line(x + 152, y + 21, bars);
  }

  onKey(e) {
    if (!this.ready || e.repeat || !CONFIRM_CODES.includes(e.code)) return;
    this.ready = false;
    e.handled = true;
    Sound.good();
    Stats.newGame();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }
}
