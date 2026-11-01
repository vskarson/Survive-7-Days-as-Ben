// Zyn sneak: Ben has a Zyn in his lip and has to get down the hallway to class
// without a teacher noticing. Teachers have vision cones; students and the trash
// can block them. Standing in a cone fills the "!" meter; full = busted.
// Reach the classroom door before the bell.

const ZYN_TIME_S = 50;
const ZYN_SPEED = 85;            // pixels per second
const ZYN_SPOT_MS = 600;         // time in a cone before Ben is busted
const ZYN_DOOR_REACH = 12;
const CONE_RAYS = 28;

// The hallway, one character per tile (20 x 11). Lockers along the top, the
// classroom door at the top right.
const ZYN_HALL = [
  '#kkkkkbkkkkkkbkkkUk#',
  '#KKKKKLKKKKKKLKKKDK#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '####################',
];
const ZYN_LEGEND = {
  '#': ['border'], '.': ['floor_school'], 'U': ['wallU_school'], 'L': ['wallL_school'],
  'k': ['wallU_school', 'lockerTop'], 'K': ['wallL_school', 'lockerBot'], 'b': ['wallU_school', 'bulletin'],
  'D': ['wallL_school', 'classDoor'],
};

// Teachers. Eyes at (x, y); `patrol` walks between two points facing the way
// they walk, `sweep` stands still and turns between two angles (degrees, 0 = right, 90 = down).
const ZYN_TEACHERS = [
  { who: 'hallTeacher', range: 64, half: 26, patrol: { from: [96, 56], to: [96, 150], speed: 38 } },
  { who: 'stepp', range: 100, half: 20, at: [176, 152], sweep: { from: 205, to: 335, periodMs: 4400 } },
  { who: 'mathTeacher', range: 64, half: 24, patrol: { from: [214, 58], to: [300, 58], speed: 30 } },
];

// Cover: students standing around and a trash can. They block Ben and the cones.
const ZYN_COVER = [
  { who: 'cust2', x: 56, y: 84 },
  { who: 'teen', x: 140, y: 108 },
  { who: 'cust5', x: 236, y: 136 },
  { obj: 'trash', x: 200, y: 96 },
];

class ZynScene extends Phaser.Scene {
  constructor() { super('Zyn'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.started = false;
    this.timeLeft = ZYN_TIME_S * 1000;
    this.walkMs = 0;
    this.facing = 'right';
    this.suspicion = 0;
    this.cameras.main.setBackgroundColor('#000000'); // cover the paused world behind

    this.solid = new Set();
    ZYN_HALL.forEach((row, ty) => [...row].forEach((ch, tx) => {
      const layers = ZYN_LEGEND[ch];
      layers.forEach(name => this.add.image(tx * TILE, ty * TILE, 'tiles', name).setOrigin(0));
      if (TILE_DEFS[TILE_ID[layers[layers.length - 1]]].solid) this.solid.add(`${tx},${ty}`);
      if (ch === 'D') this.door = { x: tx * TILE + 8, y: (ty + 1) * TILE + 6 };
    }));

    // Cover pieces: a box around each that blocks walking and sight.
    this.blockers = ZYN_COVER.map(c => {
      if (c.who) this.add.sprite(c.x, c.y, `npc_${c.who}`, 'up_0').setOrigin(0.5, 1).setDepth(10 + c.y * 0.001);
      else this.add.image(c.x, c.y, 'tiles', c.obj).setOrigin(0.5, 1).setDepth(10 + c.y * 0.001);
      return new Phaser.Geom.Rectangle(c.x - 6, c.y - 14, 12, 14);
    });

    this.cones = this.add.graphics().setDepth(5);
    this.teachers = ZYN_TEACHERS.map(def => {
      const start = def.patrol ? def.patrol.from : def.at;
      const t = { def, x: start[0], y: start[1], dir: 1, angle: 0, sweepMs: 0 };
      t.sprite = this.add.sprite(t.x, t.y + 8, `npc_${def.who}`, 'down_0').setOrigin(0.5, 1);
      t.alert = this.add.bitmapText(t.x, t.y - 24, 'fontLight', '!').setOrigin(0.5, 0).setDepth(40).setVisible(false);
      return t;
    });

    this.ben = this.add.sprite(24, 150, Ben.texture(), 'side_0').setOrigin(0.5, 1).setDepth(10);
    this.meter = this.add.graphics().setDepth(41);

    // HUD strip
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_W, 12).setDepth(50);
    this.timerText = this.add.bitmapText(0, 3, 'miniLight', '').setDepth(51);
    this.add.bitmapText(4, 3, 'miniLight', Font.clean('Get to class', 'mini')).setDepth(51);
    const hint = Font.clean('Stay out of the cones', 'mini');
    this.add.bitmapText(GAME_W - 4 - Font.measure(hint, 'mini'), 3, 'miniLight', hint).setDepth(51);
    this.doorMarker = this.add.image(this.door.x, this.door.y - 10, 'goalArrow', 'down').setOrigin(0.5, 1).setDepth(40);

    this.moveTeachers(0);
    this.updateHud();
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard.on('keydown', e => {
      if (DEBUG && e.code === 'BracketRight') this.finish(true);
      if (DEBUG && e.code === 'BracketLeft') this.finish(false, 'spotted');
    });
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => Minigame.countdown(this, () => { this.started = true; }, 'SNEAK!'));
  }

  updateHud() {
    const s = Math.ceil(this.timeLeft / 1000);
    const t = Font.clean(`0:${String(Math.max(0, s)).padStart(2, '0')}`, 'mini');
    this.timerText.setText(t).setX(Math.floor((GAME_W - Font.measure(t, 'mini')) / 2)).setTint(s <= 10 ? 0xff7070 : 0xffffff);
  }

  // Can Ben's feet (a 10x5 box) stand at (x, y)?
  canStand(x, y) {
    for (const [px, py] of [[x - 5, y - 5], [x + 4, y - 5], [x - 5, y - 1], [x + 4, y - 1]]) {
      if (this.solid.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`)) return false;
      if (this.blockers.some(b => b.contains(px, py))) return false;
    }
    return true;
  }

  // How far a look from (x, y) at `angle` gets before a wall or cover stops it.
  rayLength(x, y, angle, range) {
    const cx = Math.cos(angle), cy = Math.sin(angle);
    for (let d = 4; d < range; d += 3) {
      const px = x + cx * d, py = y + cy * d;
      if (this.solid.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`)) return d;
      if (this.blockers.some(b => b.contains(px, py))) return d;
    }
    return range;
  }

  moveTeachers(delta) {
    for (const t of this.teachers) {
      const { patrol, sweep } = t.def;
      if (patrol) {
        const [ax, ay] = patrol.from, [bx, by] = patrol.to;
        const [tx, ty] = t.dir > 0 ? [bx, by] : [ax, ay];
        const dist = Math.hypot(tx - t.x, ty - t.y);
        const step = patrol.speed * delta / 1000;
        if (dist <= step) { t.x = tx; t.y = ty; t.dir = -t.dir; } else { t.x += (tx - t.x) / dist * step; t.y += (ty - t.y) / dist * step; }
        t.angle = t.dir > 0 ? Math.atan2(by - ay, bx - ax) : Math.atan2(ay - by, ax - bx); // look where they're walking
      } else {
        t.sweepMs += delta;
        const k = (1 - Math.cos(t.sweepMs / sweep.periodMs * Math.PI * 2)) / 2; // 0 -> 1 -> 0, easing at the ends
        t.angle = Phaser.Math.DegToRad(sweep.from + (sweep.to - sweep.from) * k);
      }
      // Face the way they're looking.
      const cx = Math.cos(t.angle), cy = Math.sin(t.angle);
      const view = Math.abs(cx) > Math.abs(cy) ? 'side' : cy > 0 ? 'down' : 'up';
      t.sprite.setPosition(t.x, t.y + 8).setFrame(`${view}_0`).setFlipX(view === 'side' && cx < 0);
      t.sprite.setDepth(10 + t.sprite.y * 0.001);
      t.alert.setPosition(t.x, t.y - 26);
    }
  }

  // Draw every cone (cut short by walls and cover) and say whether one sees Ben.
  drawConesAndLook() {
    this.cones.clear();
    const bx = this.ben.x, by = this.ben.y - 8;
    let seenBy = null;
    for (const t of this.teachers) {
      const { range, half } = t.def;
      const halfRad = Phaser.Math.DegToRad(half);
      const pts = [{ x: t.x, y: t.y }];
      for (let i = 0; i <= CONE_RAYS; i++) {
        const a = t.angle - halfRad + (2 * halfRad * i) / CONE_RAYS;
        const len = this.rayLength(t.x, t.y, a, range);
        pts.push({ x: t.x + Math.cos(a) * len, y: t.y + Math.sin(a) * len });
      }
      const dist = Math.hypot(bx - t.x, by - t.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(by - t.y, bx - t.x) - t.angle));
      const sees = dist < range && diff < halfRad && this.rayLength(t.x, t.y, Math.atan2(by - t.y, bx - t.x), dist) >= dist;
      if (sees) seenBy = t;
      this.cones.fillStyle(sees ? 0xff4040 : 0xfff080, sees ? 0.4 : 0.25).fillPoints(pts, true);
      t.alert.setVisible(sees);
    }
    return seenBy;
  }

  update(time, delta) {
    if (!this.started || this.finished) return;
    this.timeLeft -= delta;

    // movement
    const k = this.keys;
    let dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const moving = dx || dy;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    const step = ZYN_SPEED * delta / 1000;
    if (dx && this.canStand(this.ben.x + dx * step, this.ben.y)) this.ben.x += dx * step;
    if (dy && this.canStand(this.ben.x, this.ben.y + dy * step)) this.ben.y += dy * step;
    if (moving) this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.walkMs = moving ? this.walkMs + delta : 0;
    const frame = moving ? [1, 0, 2, 0][Math.floor(this.walkMs / 120) % 4] : 0;
    const side = this.facing === 'left' || this.facing === 'right';
    this.ben.setFrame(`${side ? 'side' : this.facing}_${frame}`).setFlipX(this.facing === 'left');
    this.ben.setDepth(10 + this.ben.y * 0.001);

    this.moveTeachers(delta);
    const seenBy = this.drawConesAndLook();
    this.suspicion = seenBy ? this.suspicion + delta / ZYN_SPOT_MS : Math.max(0, this.suspicion - delta / (ZYN_SPOT_MS * 2));
    if (seenBy && this.suspicion < 1 && Math.floor(this.suspicion * 4) !== this.lastBeep) Sound.tick();
    this.lastBeep = seenBy ? Math.floor(this.suspicion * 4) : -1;
    this.drawMeter();
    this.doorMarker.y = this.door.y - 10 - Math.round((Math.sin(time / 190) + 1) * 2);
    this.updateHud();

    if (this.suspicion >= 1) this.finish(false, 'spotted');
    else if (Phaser.Math.Distance.Between(this.ben.x, this.ben.y, this.door.x, this.door.y) < ZYN_DOOR_REACH) this.finish(true);
    else if (this.timeLeft <= 0) this.finish(false, 'bell');
  }

  // The "!" meter over Ben's head while a teacher is noticing him.
  drawMeter() {
    this.meter.clear();
    if (this.suspicion <= 0) return;
    const x = Math.round(this.ben.x - 8), y = Math.round(this.ben.y - 30);
    this.meter.fillStyle(0x181425).fillRect(x - 1, y - 1, 18, 5);
    this.meter.fillStyle(0x4a4a52).fillRect(x, y, 16, 3);
    this.meter.fillStyle(0xff4040).fillRect(x, y, Math.round(16 * Math.min(1, this.suspicion)), 3);
  }

  finish(win, reason) {
    if (this.finished) return;
    this.finished = true;
    this.ben.setFrame('down_0').setFlipX(false);
    const fill = {
      time: Math.max(0, Math.ceil(this.timeLeft / 1000)),
      reason: reason === 'bell' ? CONTENT.minigames.zyn.bell : CONTENT.minigames.zyn.spotted,
    };
    Minigame.showResult(this, win, minigameText('zyn', win, fill), () => this.done({ win, ...fill }));
  }
}
