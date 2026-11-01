// A walkable scene map. Ben moves tile by tile like classic handheld RPGs:
// tap a direction to turn, hold it to walk. Solid tiles stop him.

const STEP_MS = 200;  // time to walk one tile
const TURN_MS = 90;   // a tap shorter than this only turns Ben in place
const DIM_ALPHA = 0.6; // darkness of rooms Ben isn't in
const NIGHT_TINT = { color: 0x0a0a30, alpha: 0.45 }; // beats with `at: { night: true }`

// Minigame names used in content.js -> their scenes.
const MINIGAME_SCENES = {
  guitar: 'Guitar', orders: 'Orders', cleanRoom: 'CleanRoom', zyn: 'Zyn', practice: 'Practice', fridayGame: 'FridayGame',
  dirtbike: 'Dirtbike', markers: 'Markers', avoidChevy: 'AvoidChevy', math: 'Math',
  samTantrum: 'SamTantrum',
};

// Minigames that don't use the 'minigame' song (null = the game makes its own sound).
const MINIGAME_SONGS = { Guitar: null, Zyn: 'tense', AvoidChevy: 'tense', Math: 'night' };

const EVENING = 17 * 60;   // from 5 PM on, the night song plays
const CHANGE_MS = 220;     // the fade each way while Ben gets changed

// Walkable door tile -> its open version.
const DOOR_TILES = { door: 'doorOpen', sideDoor: 'sideDoorOpen', stallDoor: 'stallDoorOpen' };

const DIRS = {
  up: { dx: 0, dy: -1, keys: ['UP', 'W'] },
  down: { dx: 0, dy: 1, keys: ['DOWN', 'S'] },
  left: { dx: -1, dy: 0, keys: ['LEFT', 'A'] },
  right: { dx: 1, dy: 0, keys: ['RIGHT', 'D'] },
};

class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  // data: { map, spawn (name or {x, y, facing}), story (true = arriving for the
  // current story beat: play its intro, and run it if it doesn't wait for Ben),
  // label (place name shown on a scene card), night (true = dark blue tint) }
  init(data) {
    this.mapKey = data.map;
    this.spawn = data.spawn;
    this.storyArrival = !!data.story;
    this.label = data.label;
    this.night = !!data.night;
    this.mood = undefined;
  }

  create() {
    this.def = MAPS[this.mapKey];
    this.buildGrids();
    this.mapW = this.ground[0].length;
    this.mapH = this.ground.length;

    // Two layers: floors/walls underneath, furniture and wall decor on top.
    const [, objLayer] = [this.ground, this.objects].map(data => {
      const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      return map.createLayer(0, map.addTilesetImage('tiles'), 0, 0);
    });
    this.objLayer = objLayer;

    const spawnName = this.spawn || this.def.arrive;
    const start = typeof spawnName === 'string' ? this.def.spawns[spawnName] : spawnName;
    this.tx = start.x;
    this.ty = start.y;
    this.facing = start.facing || 'down';
    Ben.dressFor(this.def);
    this.ben = this.add.sprite(0, 0, Ben.texture(), 'down_0').setOrigin(0.5, 1).setDepth(10);
    this.ben.setPosition(this.tileX(this.tx), this.tileY(this.ty));
    if (this.def.card) this.buildCard();
    // The guitar on Ben's back: one layer behind him, one (the strap) over him.
    this.heldItem = ['Back', 'Front'].map(() => this.add.image(0, 0, 'carryGuitar', 'downBack').setOrigin(0.5, 1).setVisible(false));
    this.setBenFrame(0);
    this.propImages = [];
    this.npcs = [];
    this.propsKey = null;
    this.refreshProps();

    this.moving = false;
    this.stepParity = 0;
    this.held = [];       // held directions, most recently pressed last
    this.lastDir = null;
    this.holdMs = 0;
    this.turnHold = false;

    this.keys = {};
    for (const [dir, { keys }] of Object.entries(DIRS)) {
      this.keys[dir] = keys.map(k => this.input.keyboard.addKey(k));
    }

    this.setupDoors();
    this.setupLighting();
    // Night scenes: everything but the goal arrows is tinted dark blue.
    if (this.night) {
      this.add.rectangle(0, 0, this.mapW * TILE, this.mapH * TILE, NIGHT_TINT.color, NIGHT_TINT.alpha).setOrigin(0).setDepth(15);
    }
    // Firelight: warm circles over the tint that flicker a little (the map's `glow`, in tiles).
    for (const { x, y, r } of this.def.glow || []) {
      const rings = [1, 0.72, 0.46].map(share => this.add.circle(x * TILE, y * TILE, r * share, 0xff9030, 0.08).setBlendMode(Phaser.BlendModes.ADD).setDepth(16));
      this.tweens.add({ targets: rings, alpha: 0.75, scale: 0.96, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.goalKey = null;
    this.goalArrows = [];
    this.goalSpots = [];
    this.edgePointer = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.onBenTile(true);
    this.setupCamera();

    this.closeCutscene();
    this.ui = this.scene.get('UI');
    Music.play(this.song());
    const onKey = e => this.onKeyDown(e);
    this.input.keyboard.on('keydown', onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', onKey));
    // Keys let go while paused (pause menu, minigames) never reached us: start clean.
    const onResume = () => { this.input.keyboard.resetKeys(); this.held = []; };
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));

    this.transitioning = true;
    this.dayOver = false;
    this.cameras.main.fadeIn(250);
    this.cameras.main.once('camerafadeincomplete', () => {
      this.transitioning = false;
      if (this.storyArrival) this.startBeat();
    });
  }

  // Scene card: a stand-in for places that don't have a map yet. Black screen,
  // the place name, and the story plays as dialogue (Ben is hidden).
  buildCard() {
    this.ben.setVisible(false);
    const name = Font.clean(this.label || '');
    this.add.bitmapText(Math.floor((GAME_W - Font.measure(name) * 2) / 2), 52, 'fontLight', name)
      .setScale(2).setScrollFactor(0).setDepth(40);
    const note = Font.clean(CONTENT.cardNote, 'mini');
    this.add.bitmapText(Math.floor((GAME_W - Font.measure(note, 'mini')) / 2), 80, 'miniLight', note)
      .setScrollFactor(0).setDepth(40).setAlpha(0.6);
  }

  // True while something other than walking has control (text box, help, fade, day ending).
  busy() {
    return this.transitioning || this.dayOver || !!(this.ui.dialogue && this.ui.dialogue.active) || !!this.ui.helpOpen;
  }

  // Ben did something: inspected an object or stepped on a door. `alias` is its
  // name from CONTENT.inspect (or the map's own `inspect` list). If the current
  // story beat is waiting for it, the story moves on; otherwise it just talks.
  async interact(alias) {
    if (!alias) return false;
    if (Story.waitsFor(alias)) {
      await this.runBeat(Story.current());
      return true;
    }
    const line = ((Story.current() || {}).instead || {})[alias] || alias;
    if (!CONTENT.dialogue[line]) return false;
    const result = await this.ui.dialogue.play(line);
    if (result && result.travel) this.travel(result.travel);
    return true;
  }

  // A beat begins: its intro plays, and a beat with no `on` (nothing for Ben to
  // do first, like a cutscene or a choice) runs right away.
  async startBeat() {
    const beat = Story.current();
    if (!beat) return;
    if (beat.intro) await this.ui.dialogue.play(beat.intro);
    if (!beat.on && Story.current() === beat) await this.runBeat(beat);
  }

  // Ben did what the beat waits for (or it runs on its own): its talk, its
  // minigame and win/lose branch, its effects, then on to the next beat.
  async runBeat(beat) {
    const result = (beat.talk ? await this.ui.dialogue.play(beat.talk) : null) || {};
    if (result.stay) return;
    if (result.wear || beat.wear) await this.changeClothes(result.wear || beat.wear);
    if (beat.scene) await this.playCutscene(beat.scene);
    if (beat.game) {
      const outcome = MINIGAME_SCENES[beat.game]
        ? await this.playMinigame(MINIGAME_SCENES[beat.game], { win: beat.win, lose: beat.lose })
        : await this.standInMinigame(beat.game);
      Stats.recordGame(beat.game, outcome.win, 'home' in outcome ? `${outcome.home}-${outcome.away}` : null);
      const branch = outcome.win ? beat.win : beat.lose;
      Stats.apply(branch);
      if (branch && branch.talk) await this.ui.dialogue.play(branch.talk);
    }
    Stats.apply(beat); // the beat's own effects: task done, meal, anger, heat
    this.nextBeat(result.jump || beat.next);
  }

  // Ben gets changed: a quick fade to black while the clothes rustle.
  changeClothes(outfit) {
    this.transitioning = true;
    Sound.rustle();
    this.cameras.main.fadeOut(CHANGE_MS);
    return new Promise(resolve => {
      this.cameras.main.once('camerafadeoutcomplete', () => {
        STATE.outfit = outfit;
        this.ben.setTexture(Ben.texture());
        this.setBenFrame(0);
        this.cameras.main.fadeIn(CHANGE_MS);
        this.cameras.main.once('camerafadeincomplete', () => {
          this.transitioning = false;
          resolve();
        });
      });
    });
  }

  // Minigames that aren't built yet: the player just picks how it went.
  async standInMinigame(key) {
    const name = (CONTENT.minigames[key] || {}).name || key;
    const result = await this.ui.dialogue.play([
      `(The ${name} minigame isn't built yet.) How did it go?`,
      { choice: [{ text: 'Won it', minigame: 'win' }, { text: 'Lost it', minigame: 'lose' }] },
    ]);
    return { win: !!result && result.minigame === 'win' };
  }

  // Pause the world and run a minigame scene. Resolves with its outcome
  // ({ win, ... }) once the player closes the result screen.
  // `outcomes` ({ win, lose } effects) lets the result screen show the penalty.
  playMinigame(key, outcomes = {}) {
    Music.play(key in MINIGAME_SONGS ? MINIGAME_SONGS[key] : 'minigame');
    return new Promise(resolve => {
      this.scene.launch(key, {
        outcomes,
        done: outcome => {
          this.scene.stop(key);
          this.scene.resume();
          Music.play(this.song());
          resolve(outcome);
        },
      });
      this.scene.pause();
    });
  }

  // Pause the world and play a full-screen cutscene. It ends on a black screen
  // and stays up, hiding the fade-out, until the next map or the next day loads.
  playCutscene(key) {
    this.cutscene = key;
    return new Promise(resolve => {
      this.scene.launch(key, { done: () => { this.scene.resume(); resolve(); } });
      this.scene.pause();
    });
  }

  closeCutscene() {
    if (this.cutscene) this.scene.stop(this.cutscene);
    this.cutscene = null;
  }

  // What should be playing (null = silence), first match wins: a { music } line
  // in the current talk, the story beat's `music`, the night song on night maps
  // and in the evening, the map's `music`, then the day song.
  song() {
    if (this.mood !== undefined) return this.mood;
    const beat = Story.current();
    if (beat && beat.music !== undefined) return beat.music;
    if (this.night || STATE.minutes >= EVENING) return 'night';
    return this.def.music !== undefined ? this.def.music : 'day';
  }

  // A { music } line in the dialogue. Lasts until the story moves to the next beat.
  setMood(name) {
    this.mood = name;
    Music.play(this.song());
  }

  // Debug (M): pick any minigame and play it, without touching the story.
  async minigameMenu() {
    const options = Object.keys(MINIGAME_SCENES).map(key => ({ text: key, minigame: key }));
    options.push({ text: 'Cancel' });
    const result = await this.ui.dialogue.play(['Test which minigame?', { choice: options }]);
    if (result && result.minigame) await this.playMinigame(MINIGAME_SCENES[result.minigame]);
  }

  // Debug (J): skip to the start of any day, or to the ending. Bars, choices and
  // minigame results so far are kept; the skipped days just don't happen.
  async dayMenu() {
    const options = CONTENT.days.map((d, i) => ({ text: `Day ${i + 1}: ${d.name}`, day: i + 1 }));
    options.push({ text: 'The ending', day: WEEK_LENGTH + 1 }, { text: 'Cancel' });
    const result = await this.ui.dialogue.play(['Jump to which day?', { choice: options }]);
    if (!result || !result.day) return;
    this.dayOver = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      STATE.day = result.day;
      this.scene.start('DayIntro');
    });
  }

  // Move the story to the next beat (or the beat with id `jump`), skipping
  // beats whose `if` doesn't hold.
  nextBeat(jump) {
    STATE.beat = jump ? Story.indexOf(jump) : STATE.beat + 1;
    Story.skipUnmet();
    const beat = Story.current();
    if (!beat) { this.endDay(); return; }
    Stats.apply(beat.setup); // things that are already there when the beat begins (dinner on the table)
    if (beat.at) { this.travelToBeat(beat); return; }
    if (beat.time) Stats.passTime(Clock.parse(beat.time));
    this.setMood(undefined);
    this.startBeat();
  }

  // Fade out, fast-forward the clock to the beat's time, then load its map.
  travelToBeat(beat) {
    const to = beat.time ? Clock.parse(beat.time) : STATE.minutes;
    this.fastForward(to, beat.label || MAPS[beat.at.map].name, () => {
      this.scene.restart({ map: beat.at.map, spawn: beat.at.spawn, story: true, label: beat.label, night: beat.at.night });
    });
  }

  endDay() {
    this.dayOver = true;
    this.fastForward(DAY_END, Story.version('dayEnd', CONTENT.dayEndLabel), () => {
      Stats.finishDay();
      STATE.day++;
      this.closeCutscene();
      this.scene.start('DayIntro');
    });
  }

  // Fade out and play the fast-forward clock up to `to`, then call done.
  fastForward(to, label, done) {
    this.transitioning = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const from = STATE.minutes;
      Stats.passTime(to);
      if (to <= from) { done(); return; }
      this.scene.launch('FastForward', { from, to, label, done });
    });
  }

  // Free travel without the story (a dialogue option with `travel`).
  // `to` is a map key or { map, spawn }.
  travel(to) {
    const dest = typeof to === 'string' ? { map: to } : to;
    if (!MAPS[dest.map]) { console.warn(`[travel] no map called '${dest.map}'`); return; }
    this.transitioning = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ map: dest.map, spawn: dest.spawn || MAPS[dest.map].arrive });
    });
  }

  onKeyDown(e) {
    // Esc: pause menu (e.handled: the same Esc just closed the help screen).
    if (e.code === 'Escape' && !e.handled && !e.repeat && !this.busy()) {
      this.scene.launch('Pause');
      this.scene.pause();
      return;
    }

    // Test keys, only with ?debug in the URL:
    //   ] = finish the current story beat, 1 = -25 food, 2 = +25 Mom anger, 3 = +25 Heat,
    //   M = minigame menu, J = jump to any day
    if (DEBUG && !this.busy()) {
      if (e.code === 'BracketRight') { this.nextBeat(); return; }
      if (e.code === 'Digit1') { Stats.apply({ food: -25 }); return; }
      if (e.code === 'Digit2') { Stats.apply({ anger: 25 }); return; }
      if (e.code === 'Digit3') { Stats.apply({ heat: 25 }); return; }
      if (e.code === 'KeyM') { this.minigameMenu(); return; }
      if (e.code === 'KeyJ') { this.dayMenu(); return; }
    }

    // Space/Enter: inspect whatever Ben is facing.
    if (!CONFIRM_CODES.includes(e.code) || e.repeat || this.moving || this.busy()) return;
    const x = this.tx + DIRS[this.facing].dx;
    const y = this.ty + DIRS[this.facing].dy;
    let alias = this.aliasAt(x, y);
    // Facing a lower wall: check the decoration hanging on the wall above it.
    if (!alias && this.facing === 'up' && TILE_DEFS[this.ground[y][x]].name.startsWith('wallL')) {
      alias = this.aliasAt(x, y - 1);
    }
    if (!alias || !(Story.waitsFor(alias) || CONTENT.dialogue[alias])) return;
    const npc = this.npcAt(x, y);
    if (npc) this.faceNpc(npc, { up: 'down', down: 'up', left: 'right', right: 'left' }[this.facing]);
    e.handled = true; // so the same press doesn't also skip the first line
    this.interact(alias);
  }

  // Props are map objects the story can show or hide (breakfast on the table,
  // the guitar in Ben's room). Defined per map in `props`; STATE.props overrides.
  // A prop with `if` is there only while that holds (the mess on Ben's floor).
  propVisible(name, prop) {
    return STATE.props[name] ?? (prop.if ? Story.check(prop.if) : !prop.hidden);
  }

  // The visible prop on tile (x, y), if any.
  propAt(x, y) {
    // (people are checked separately in npcAt)
    const props = this.def.props || {};
    for (const [name, prop] of Object.entries(props)) {
      if (prop.x === x && prop.y === y && this.propVisible(name, prop)) return prop;
    }
    return null;
  }

  // The visible person standing on tile (x, y), if any.
  npcAt(x, y) {
    return this.npcs.find(n => n.def.x === x && n.def.y === y) || null;
  }

  // Rebuild prop images and people when something was shown or hidden.
  refreshProps() {
    const key = JSON.stringify([STATE.props, STATE.day, STATE.games.length]); // `if` props can change with these
    if (key === this.propsKey) return;
    this.propsKey = key;
    this.propImages.forEach(img => img.destroy());
    this.propImages = Object.entries(this.def.props || {})
      .filter(([name, prop]) => this.propVisible(name, prop))
      .map(([, prop]) => this.add.image(prop.x * TILE + (prop.dx || 0), prop.y * TILE + (prop.dy || 0), 'tiles', prop.obj)
        .setOrigin(0).setDepth(1));
    this.npcs.forEach(n => { n.sprite.destroy(); n.zzz.forEach(z => z.destroy()); });
    this.npcs = Object.entries(this.def.npcs || {})
      .filter(([name, npc]) => this.propVisible(name, npc))
      .map(([name, def]) => {
        const sprite = this.add.sprite(this.tileX(def.x), this.tileY(def.y), `npc_${def.who}`).setOrigin(0.5, 1);
        sprite.setDepth(10 + sprite.y * 0.001);
        const npc = { name, def, sprite, zzz: def.sleeping ? this.addZzz(sprite) : [] };
        this.faceNpc(npc, def.facing || 'down');
        return npc;
      });
    this.goalKey = null; // goal arrows may point at something that just appeared or vanished
  }

  // Little z's floating up from a sleeping person (`sleeping: true` in the map's npcs).
  addZzz(sprite) {
    return [0, 700, 1400].map(delay => {
      const z = this.add.bitmapText(sprite.x + 3, sprite.y - 22, 'font', 'z').setDepth(20).setAlpha(0);
      this.tweens.add({
        targets: z, x: '+=5', y: '-=10', alpha: { from: 1, to: 0 }, duration: 2100, delay, repeat: -1,
      });
      return z;
    });
  }

  faceNpc(npc, dir) {
    const side = dir === 'left' || dir === 'right';
    npc.sprite.setFrame(`${side ? 'side' : dir}_0`).setFlipX(dir === 'left');
  }

  // Whatever Ben is carrying (STATE.holding) follows him around.
  updateHeldItem() {
    this.ben.setDepth(10 + this.ben.y * 0.001); // in front of people above him, behind people below
    const show = STATE.holding === 'guitar' && !this.def.card;
    const side = this.facing === 'left' || this.facing === 'right';
    const view = side ? 'side' : this.facing;
    ['Back', 'Front'].forEach((layer, i) => {
      const img = this.heldItem[i];
      const frame = `${view}${layer}`;
      img.setVisible(show && this.textures.get('carryGuitar').has(frame));
      if (!img.visible) return;
      img.setFrame(frame).setFlipX(this.facing === 'left').setPosition(this.ben.x, this.ben.y);
      img.setDepth(this.ben.depth + (layer === 'Back' ? -0.0005 : 0.0005));
    });
  }

  // Where on this map the current story goal is: one spot per group of touching
  // tiles that finish the beat (so the 2x2 table gets one arrow, not four).
  // Each spot is { x: center, y: top } in world pixels.
  findGoalSpots() {
    const beat = Story.current();
    if (!beat || !beat.on) return [];
    const names = [].concat(beat.on);
    const hit = new Set();
    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) if (names.includes(this.aliasAt(x, y))) hit.add(`${x},${y}`);
    }
    for (const w of this.def.warps || []) if (names.includes(w.on)) hit.add(`${w.x},${w.y}`);

    const spots = [];
    const seen = new Set();
    for (const key of hit) {
      if (seen.has(key)) continue;
      const group = [];
      const stack = [key];
      seen.add(key);
      while (stack.length) {
        const [x, y] = stack.pop().split(',').map(Number);
        group.push([x, y]);
        for (const n of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
          if (hit.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
        }
      }
      const xs = group.map(g => g[0]);
      const ys = group.map(g => g[1]);
      const tall = group.some(([gx, gy]) => this.npcAt(gx, gy)) ? 8 : 0; // people stick up above their tile
      spots.push({ x: (Math.min(...xs) + Math.max(...xs) + 1) * TILE / 2, y: Math.min(...ys) * TILE - tall });
    }
    return spots;
  }

  // Bouncing arrows over the goal, plus a pointer on the screen edge when the
  // nearest goal spot is off-screen. Hidden while a text box or fade is up.
  updateGoalMarker() {
    const key = `${STATE.day}:${STATE.beat}`;
    if (key !== this.goalKey) {
      this.goalKey = key;
      this.goalArrows.forEach(a => a.destroy());
      this.goalSpots = this.findGoalSpots();
      this.goalArrows = this.goalSpots.map(s => this.add.image(s.x, s.y, 'goalArrow', 'down').setOrigin(0.5, 1).setDepth(20));
    }

    const hidden = this.busy();
    const view = this.cameras.main.worldView;
    const bob = Math.round((Math.sin(this.time.now / 190) + 1) * 2);
    this.goalArrows.forEach((arrow, i) => {
      // Bob above the spot, but never up under the panels at the top of the screen.
      arrow.y = Math.max(this.goalSpots[i].y + 3, view.y + HUD_TOP + 10) - bob;
      arrow.setVisible(!hidden);
    });
    this.edgePointer.clear();
    if (hidden || !this.goalSpots.length) return;

    const bx = this.ben.x, by = this.ben.y;
    const near = this.goalSpots.reduce((a, b) => (Math.hypot(a.x - bx, a.y - by) <= Math.hypot(b.x - bx, b.y - by) ? a : b));
    if (Phaser.Geom.Rectangle.Contains(view, near.x, near.y + 4)) return;
    this.drawEdgePointer(near.x - view.x, near.y - view.y);
  }

  // Triangle on the screen edge pointing toward (sx, sy) in screen pixels.
  // Kept clear of the panels at the top and the text box area.
  drawEdgePointer(sx, sy) {
    const cx = GAME_W / 2, cy = 80;
    const dx = sx - cx, dy = sy - cy;
    const bounds = { x0: 10, x1: GAME_W - 10, y0: HUD_TOP + 10, y1: 132 };
    const tx = dx > 0 ? (bounds.x1 - cx) / dx : dx < 0 ? (bounds.x0 - cx) / dx : Infinity;
    const ty = dy > 0 ? (bounds.y1 - cy) / dy : dy < 0 ? (bounds.y0 - cy) / dy : Infinity;
    const t = Math.min(tx, ty);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bob = Math.round(Math.sin(this.time.now / 180) * 2);
    const px = cx + dx * t + ux * bob, py = cy + dy * t + uy * bob;
    // Tip at (px, py), base 10px back toward the middle of the screen.
    const bxp = px - ux * 10, byp = py - uy * 10;
    const pts = [px, py, bxp - uy * 6, byp + ux * 6, bxp + uy * 6, byp - ux * 6];
    this.edgePointer.fillStyle(GOAL_COLORS.fill).fillTriangle(...pts);
    this.edgePointer.lineStyle(1, GOAL_COLORS.outline).strokeTriangle(...pts);
  }

  setupDoors() {
    this.doors = [];
    this.objects.forEach((row, y) => row.forEach((id, x) => {
      const name = id >= 0 && TILE_DEFS[id].name;
      if (DOOR_TILES[name]) this.doors.push({ x, y, shut: id, open: TILE_ID[DOOR_TILES[name]], isOpen: false });
    }));
  }

  // One dark overlay per lighting area; the area Ben is in gets faded out.
  setupLighting() {
    this.area = null;
    this.areaShades = {};
    for (const [name, rects] of Object.entries(this.def.areas || {})) {
      const g = this.add.graphics().setDepth(5).fillStyle(0x000000, 1);
      for (const r of rects) g.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
      this.areaShades[name] = g.setAlpha(DIM_ALPHA);
    }
  }

  areaAt(x, y) {
    for (const [name, rects] of Object.entries(this.def.areas || {})) {
      if (rects.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) return name;
    }
    return null;
  }

  // Called whenever Ben starts moving onto a new tile (and once at spawn).
  onBenTile(instant = false) {
    for (const d of this.doors) {
      const near = Math.abs(d.x - this.tx) + Math.abs(d.y - this.ty) <= 1;
      if (near !== d.isOpen) {
        d.isOpen = near;
        this.objLayer.putTileAt(near ? d.open : d.shut, d.x, d.y);
      }
    }

    const area = this.areaAt(this.tx, this.ty);
    if (!area || area === this.area) return;
    this.area = area;
    for (const [name, shade] of Object.entries(this.areaShades)) {
      const alpha = name === area ? 0 : DIM_ALPHA;
      this.tweens.killTweensOf(shade);
      if (instant) shade.setAlpha(alpha);
      else this.tweens.add({ targets: shade, alpha, duration: 250 });
    }
  }

  // Story/dialogue name of the object at (x, y), if any.
  aliasAt(x, y) {
    const npc = this.npcAt(x, y);
    if (npc) return npc.def.on;
    const prop = this.propAt(x, y);
    const obj = prop ? TILE_ID[prop.obj] : this.objects[y] && this.objects[y][x];
    if (!(obj >= 0)) return null;
    const name = TILE_DEFS[obj].name;
    const local = this.def.inspect || {};
    return name in local ? local[name] : CONTENT.inspect[name];
  }

  // Turn the map's character rows into tile ID grids. The room (zone) a tile
  // sits in decides which floor and wall style it gets.
  buildGrids() {
    const def = this.def;
    const styleAt = (x, y) => {
      const z = (def.zones || []).find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
      return z ? z.style : def.defaultStyle;
    };
    this.ground = [];
    this.objects = [];
    def.rows.forEach((row, y) => {
      this.ground.push([]);
      this.objects.push([]);
      [...row].forEach((ch, x) => {
        const entry = (def.legend && def.legend[ch]) || LEGEND[ch];
        if (!entry) console.warn(`[map] ${this.mapKey} has unknown tile '${ch}' at ${x},${y}`);
        const kind = (entry && entry.ground) || 'floor';
        const groundId = TILE_ID[`${kind}_${styleAt(x, y)}`] ?? TILE_ID[kind] ?? TILE_ID.void;
        this.ground[y].push(entry ? groundId : TILE_ID.void);
        this.objects[y].push(entry && entry.obj ? TILE_ID[entry.obj] : -1);
      });
    });
  }

  // Ben's sprite stands with his feet on the bottom edge of his tile.
  tileX(tx) { return tx * TILE + TILE / 2; }
  tileY(ty) { return ty * TILE + TILE; }

  setupCamera() {
    const cam = this.cameras.main;
    const w = this.mapW * TILE;
    const h = this.mapH * TILE;
    // Maps smaller than the screen sit centered; bigger maps scroll with Ben.
    const bx = w < GAME_W ? -Math.floor((GAME_W - w) / 2) : 0;
    const by = h < GAME_H ? -Math.floor((GAME_H - h) / 2) : 0;
    cam.setBounds(bx, by, Math.max(w, GAME_W), Math.max(h, GAME_H));
    cam.startFollow(this.ben, true);
  }

  setBenFrame(n) {
    const side = this.facing === 'left' || this.facing === 'right';
    this.ben.setFrame(`${side ? 'side' : this.facing}_${n}`);
    this.ben.setFlipX(this.facing === 'left');
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    const obj = this.objects[y][x];
    const prop = this.propAt(x, y);
    return !TILE_DEFS[this.ground[y][x]].solid && !(obj >= 0 && TILE_DEFS[obj].solid)
      && !(prop && TILE_DEFS[TILE_ID[prop.obj]].solid) && !this.npcAt(x, y);
  }

  update(time, delta) {
    this.refreshProps();
    this.updateHeldItem();
    this.updateGoalMarker();
    if (this.busy()) { this.lastDir = null; return; }
    if (!this.moving) this.handleInput(delta, false);
  }

  trackHeld() {
    for (const dir of Object.keys(DIRS)) {
      const down = this.keys[dir].some(k => k.isDown);
      const i = this.held.indexOf(dir);
      if (down && i === -1) this.held.push(dir);
      if (!down && i !== -1) this.held.splice(i, 1);
    }
  }

  // chained = called right after a step finished, so keep walking without the turn pause.
  handleInput(delta, chained) {
    this.trackHeld();
    const dir = this.held[this.held.length - 1];
    if (!dir) { this.lastDir = null; return; }

    if (dir !== this.lastDir) {
      this.lastDir = dir;
      this.holdMs = 0;
      this.turnHold = !chained && dir !== this.facing;
      this.facing = dir;
      this.setBenFrame(0);
    } else {
      this.holdMs += delta;
    }
    if (this.turnHold && this.holdMs < TURN_MS) return;

    this.step(dir);
  }

  step(dir) {
    const nx = this.tx + DIRS[dir].dx;
    const ny = this.ty + DIRS[dir].dy;
    this.moving = true;
    this.stepParity = 1 - this.stepParity;
    this.setBenFrame(1 + this.stepParity);

    if (!this.isWalkable(nx, ny)) {
      // Walk in place against the wall, a bit slower than a real step.
      this.time.delayedCall(STEP_MS * 0.6, () => this.setBenFrame(0));
      this.time.delayedCall(STEP_MS * 1.3, () => this.finishStep(false));
      return;
    }

    this.tx = nx;
    this.ty = ny;
    this.onBenTile();
    this.tweens.add({
      targets: this.ben,
      x: this.tileX(nx),
      y: this.tileY(ny),
      duration: STEP_MS,
      onUpdate: tween => { if (tween.progress >= 0.5) this.setBenFrame(0); },
      onComplete: () => this.finishStep(),
    });
  }

  finishStep(walked = true) {
    this.moving = false;
    this.setBenFrame(0);
    const warp = walked && (this.def.warps || []).find(w => w.x === this.tx && w.y === this.ty);
    if (warp && warp.to) { this.travel({ map: warp.to, spawn: warp.spawn }); return; }
    if (warp && warp.on && (Story.waitsFor(warp.on) || CONTENT.dialogue[warp.on])) { this.interact(warp.on); return; }
    if (!this.busy()) this.handleInput(0, true);
  }
}
