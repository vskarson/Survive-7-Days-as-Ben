// Player settings and the save file, both kept in localStorage. localStorage
// can be missing or blocked (private windows), so every read and write is
// wrapped and the game still runs without it.

const SETTINGS_KEY = 'ben7days.settings';
const SAVE_KEY = 'ben7days.save';   // slots are 'ben7days.save.1' to '.3'
const SAVE_VERSION = 1;

const VOLUME_STEPS = 10;
const TEXT_SPEEDS = { slow: 45, normal: 22, fast: 8 };   // ms per letter in the text box
const TEXT_SPEED_NAMES = Object.keys(TEXT_SPEEDS);

const Storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* no storage: settings last this visit only */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* nothing to remove */ }
  },
};

const Settings = {
  music: 7,             // 0-10
  sfx: VOLUME_STEPS,    // 0-10
  textSpeed: 'normal',  // slow / normal / fast

  load() {
    const saved = Storage.get(SETTINGS_KEY) || {};
    const vol = v => (Number.isInteger(v) ? Phaser.Math.Clamp(v, 0, VOLUME_STEPS) : null);
    this.music = vol(saved.music) ?? this.music;
    this.sfx = vol(saved.sfx) ?? this.sfx;
    if (TEXT_SPEEDS[saved.textSpeed]) this.textSpeed = saved.textSpeed;
  },

  save() {
    Storage.set(SETTINGS_KEY, { music: this.music, sfx: this.sfx, textSpeed: this.textSpeed });
  },

  charMs() {
    return TEXT_SPEEDS[this.textSpeed];
  },
};

// Three save slots, picked after Play. The game writes to the slot being
// played at the start of each day (on the day card).
const SAVE_SLOTS = 3;

const Save = {
  slot: 1,   // the slot being played

  key(n) {
    return `${SAVE_KEY}.${n}`;
  },

  // A slot's saved state, or null if it's empty (or from an older version).
  read(n = Save.slot) {
    const data = Storage.get(Save.key(n));
    if (!data || data.version !== SAVE_VERSION || !data.state) return null;
    const day = data.state.day;
    return Number.isInteger(day) && day >= 1 && day <= WEEK_LENGTH ? data.state : null;
  },

  exists(n = Save.slot) {
    return !!Save.read(n);
  },

  write() {
    Storage.set(Save.key(Save.slot), { version: SAVE_VERSION, state: JSON.parse(JSON.stringify(STATE)) });
  },

  // Play slot n from its save. Returns false if it was empty.
  load(n) {
    const state = Save.read(n);
    if (!state) return false;
    Save.slot = n;
    Stats.newGame();
    Object.assign(STATE, state);
    return true;
  },

  clear(n = Save.slot) {
    Storage.remove(Save.key(n));
  },

  // Before slots there was one save: it becomes slot 1.
  migrate() {
    const old = Storage.get(SAVE_KEY);
    if (!old) return;
    if (!Storage.get(Save.key(1))) Storage.set(Save.key(1), old);
    Storage.remove(SAVE_KEY);
  },
};

Settings.load();
Save.migrate();
