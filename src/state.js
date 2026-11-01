// Game state shared by every scene, the story-driven clock, and the story
// beat helpers. Time never runs on its own: each story beat sets it.

const DAY_END = 23 * 60;   // 11:00 PM, shown when Ben passes out at the end of a day
const WEEK_LENGTH = 7;

// Tuning (the Grounded threshold is CONTENT.groundedAt in content.js)
const FOOD_MAX = 100;
const START_FOOD = 30;            // food when Ben wakes up
const FOOD_BEFORE_MEAL = 30;      // after a meal, food drains to exactly this by the time of the next meal
const ANGER_MAX = 100;
const HEAT_MAX = 100;             // full Heat after Saturday = Jail Ben

// Add ?debug to the URL to turn on test keys (see WorldScene.onKeyDown).
const DEBUG = new URLSearchParams(location.search).has('debug');

const STATE = {
  day: 1,         // 1 = Sunday ... 7 = Saturday
  beat: 0,        // index into today's story
  minutes: 0,     // current time of day, minutes after midnight
  food: START_FOOD,
  anger: 0,       // Mom's anger, only goes up
  heat: 0,        // how close Ben is to getting locked up, only goes up
  meals: 0,       // meals eaten today
  mealAt: null,   // time of today's last meal (food drains from there)
  tasks: {},      // today's task id -> 'done' | 'missed'
  week: [],       // finished days: { day, tasks: { id: 'done' | 'missed' } }
  choices: [],    // decisions made: { day, id, pick }, e.g. { day: 1, id: 'sevenEleven', pick: 'steal' }
  games: [],      // minigames played in the story: { day, game, win }
  props: {},      // prop name -> true (shown) / false (hidden), overriding the map's default
  holding: null,  // what Ben is carrying, e.g. 'guitar'
  outfit: 'pajamas', // what Ben is wearing (BEN_OUTFITS in art.js); set by his closet and the map he's on
  seen: {},       // dialogue id -> times played, for lines that vary (Story.version)
};

// Which of Ben's textures to draw. Each outfit is its own texture: 'ben' is the
// casual flannel, the others are 'ben_church', 'ben_football'...
const Ben = {
  texture(outfit = STATE.outfit) {
    if (!BEN_OUTFITS[outfit] || outfit === 'casual') return 'ben';
    return `ben_${outfit}`;
  },

  // Getting dressed for a map: its `outfit` in maps.js (default casual).
  //   'keep' = whatever he had on (still in his uniform after the game)
  //   'home' = still in pajamas if he hasn't changed yet, otherwise casual
  dressFor(mapDef) {
    const outfit = mapDef.outfit || 'casual';
    if (outfit === 'keep') return;
    if (outfit === 'home') { if (STATE.outfit !== 'pajamas') STATE.outfit = 'casual'; return; }
    STATE.outfit = outfit;
  },
};

// Food, Mom's anger, Heat, tasks, and the props/items the story moves around.
const Stats = {
  // Effects can sit on story beats and on choice options in content.js:
  //   meal: true (food to full), anger: 10, heat: 25, task: 'church' (done), miss: 'church' (missed),
  //   show: 'breakfast' / hide: 'guitar' (props on the map), hold: 'guitar' (or hold: null to put it down)
  apply(fx) {
    if (!fx) return;
    if (fx.meal) {
      STATE.food = FOOD_MAX;
      STATE.meals++;
      STATE.mealAt = STATE.minutes;
    }
    if (fx.food) STATE.food = Phaser.Math.Clamp(STATE.food + fx.food, 0, FOOD_MAX); // debug key only
    STATE.anger = Stats.raise(STATE.anger, fx.anger, ANGER_MAX, 'anger');
    STATE.heat = Stats.raise(STATE.heat, fx.heat, HEAT_MAX, 'heat');
    if (fx.task) STATE.tasks[fx.task] = 'done';
    if (fx.miss) STATE.tasks[fx.miss] = 'missed';
    for (const name of [].concat(fx.show || [])) STATE.props[name] = true;
    for (const name of [].concat(fx.hide || [])) STATE.props[name] = false;
    if ('hold' in fx) STATE.holding = fx.hold || null;
  },

  // A decision for the stats screen (a choice with `record` in content.js).
  record(id, pick) {
    STATE.choices.push({ day: STATE.day, id, pick });
  },

  // A minigame played in the story. `score` is the Friday game's final score ("21-14").
  recordGame(game, win, score) {
    STATE.games.push({ day: STATE.day, game, win, ...(score ? { score } : {}) });
  },

  // Mom's anger and Heat only ever go up.
  raise(value, amount, max, name) {
    if (!amount) return value;
    if (amount < 0) { console.warn(`[stats] ${name} only goes up; ignoring ${amount}`); return value; }
    return Math.min(max, value + amount);
  },

  // Called when Ben wakes up: reset today's tasks, food, meals, props, hands and clothes.
  startDay() {
    const day = Clock.today();
    STATE.food = START_FOOD;
    STATE.meals = 0;
    STATE.mealAt = null;
    STATE.tasks = {};
    STATE.props = { ...(day.props || {}) };
    STATE.holding = null;
    STATE.outfit = 'pajamas';   // he wakes up in them
  },

  newGame() {
    Object.assign(STATE, {
      day: 1, beat: 0, food: START_FOOD, anger: 0, heat: 0, meals: 0, mealAt: null,
      tasks: {}, week: [], choices: [], games: [], props: {}, holding: null, outfit: 'pajamas', seen: {},
    });
  },

  // End of the day: anything not done is missed.
  finishDay() {
    const day = Clock.today();
    for (const task of day.tasks) {
      if (!STATE.tasks[task.id]) STATE.tasks[task.id] = 'missed';
    }
    STATE.week.push({ day: STATE.day, tasks: { ...STATE.tasks } });
  },

  // Story time moves forward to `to`. Food drains in a straight line from the
  // last meal (full) to the next meal's time (FOOD_BEFORE_MEAL). Before the
  // first meal and after the last one it stays put. Never a game over.
  passTime(to) {
    STATE.minutes = Math.max(STATE.minutes, to);
    const next = Story.nextMealTime();
    if (STATE.mealAt === null || next === null || next <= STATE.mealAt) return;
    const share = Math.min(1, (STATE.minutes - STATE.mealAt) / (next - STATE.mealAt));
    STATE.food = FOOD_MAX - (FOOD_MAX - FOOD_BEFORE_MEAL) * share;
  },

  // Endings are only checked after Saturday, in this order.
  ending() {
    if (Stats.isJailed()) return 'jail';
    if (Stats.isGrounded()) return 'grounded';
    return 'good';
  },

  isJailed() {
    return STATE.heat >= HEAT_MAX;
  },

  isGrounded() {
    return STATE.anger >= CONTENT.groundedAt;
  },
};

const Clock = {
  today() {
    return CONTENT.days[STATE.day - 1];
  },

  // "8:30" or "8:30 PM" -> minutes after midnight
  parse(text) {
    const m = text.trim().match(/^(\d+):(\d+)\s*(am|pm)?$/i);
    let h = Number(m[1]);
    if (m[3] && m[3].toLowerCase() === 'pm' && h < 12) h += 12;
    if (m[3] && m[3].toLowerCase() === 'am' && h === 12) h = 0;
    return h * 60 + Number(m[2]);
  },

  // 545 -> "9:05 AM"
  format(minutes) {
    const total = Math.floor(minutes);
    const h24 = Math.floor(total / 60) % 24;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(total % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  },

  // e.g. "Sun 9:05 AM"
  label() {
    return `${Clock.today().name.slice(0, 3)} ${Clock.format(STATE.minutes)}`;
  },
};

// A day's story is a list of beats (see the notes in content.js).
const Story = {
  beats() {
    const day = Clock.today();
    return day ? day.story : []; // after Saturday there's no day (the week is over)
  },

  current() {
    return Story.beats()[STATE.beat];
  },

  indexOf(id) {
    const i = Story.beats().findIndex(b => b.id === id);
    if (i < 0) console.warn(`[story] no beat with id '${id}' today`);
    return i;
  },

  // Text that comes in versions, so what repeats doesn't read the same:
  //   { days: { Monday: [...], Friday: [...] } }  today's version (the first one on any other day)
  //   { vary: [[...], [...]] }                    the next version each time, then around again
  // Anything else is the text itself. `id` is what `vary` counts plays under.
  version(id, text) {
    if (text && text.days) return Story.version(id, text.days[Clock.today().name] ?? Object.values(text.days)[0]);
    if (text && text.vary) {
      const seen = STATE.seen[id] || 0;
      STATE.seen[id] = seen + 1;
      return text.vary[seen % text.vary.length];
    }
    return text;
  },

  // Clock time of the next meal from the current beat on (the current beat
  // counts: food reaches its low right as Ben sits down), or null. Beats
  // without a `time` happen at the last time set before them.
  nextMealTime() {
    let time = null;
    const beats = Story.beats();
    for (let i = 0; i < beats.length; i++) {
      if (beats[i].time) time = Clock.parse(beats[i].time);
      if (i >= STATE.beat && beats[i].meal) return time;
    }
    return null;
  },

  // The latest pick for a recorded decision (e.g. 'crush' -> 'Maddy'), or null.
  chose(id) {
    const found = STATE.choices.filter(c => c.id === id).pop();
    return found ? found.pick : null;
  },

  // `if` on a beat or a choice option. Leave it out = always.
  //   { heatAtLeast: 60 }                 Heat is 60 or more
  //   { chose: { sevenEleven: 'steal' } } that decision went that way
  //   { notChose: { crush: 'Jamie' } }    that decision didn't go that way (or wasn't made)
  //   { dayAtLeast: 3 }                   it's day 3 (Tuesday) or later
  //   { notWon: 'cleanRoom' }             Ben hasn't won that minigame yet this week
  check(cond) {
    if (!cond) return true;
    if (cond.heatAtLeast !== undefined && STATE.heat < cond.heatAtLeast) return false;
    if (cond.dayAtLeast !== undefined && STATE.day < cond.dayAtLeast) return false;
    if (cond.notWon && STATE.games.some(g => g.game === cond.notWon && g.win)) return false;
    for (const [id, pick] of Object.entries(cond.chose || {})) if (Story.chose(id) !== pick) return false;
    for (const [id, pick] of Object.entries(cond.notChose || {})) if (Story.chose(id) === pick) return false;
    return true;
  },

  // Move past beats whose `if` doesn't hold.
  skipUnmet() {
    while (Story.current() && !Story.check(Story.current().if)) STATE.beat++;
  },

  // Fill {crush} in story text with the love interest Ben picked.
  fill(text) {
    return text.replace(/\{crush\}/g, Story.chose('crush') || 'Maddy');
  },

  // Does doing `alias` (inspecting something, stepping on a door) finish the current beat?
  waitsFor(alias) {
    const beat = Story.current();
    return !!(beat && beat.on && [].concat(beat.on).includes(alias));
  },
};
