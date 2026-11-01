// All graphics are drawn in code. Sprites are pixel arrays (one string per row,
// one character per pixel, '.' = transparent) turned into canvas textures.

const TILE = 16;
const TILESET_COLS = 16;
const K = '#181425'; // shared outline color

const Art = {
  // Walk a pixel array and hand each colored pixel to put(x, y, color).
  pixels(rows, pal, put, name = 'sprite') {
    const w = rows[0].length;
    rows.forEach((row, y) => {
      if (row.length !== w) console.warn(`[art] ${name} row ${y} is ${row.length} wide, expected ${w}`);
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === '.') continue;
        if (!pal[c]) { console.warn(`[art] ${name} has unknown color '${c}'`); continue; }
        put(x, y, pal[c]);
      }
    });
  },

  // Copy rows from a base frame and swap out a few (used for walk frames).
  withRows(base, changes) {
    const rows = base.slice();
    for (const [i, row] of Object.entries(changes)) rows[i] = row;
    return rows;
  },

  // Build a horizontal strip texture with one named frame per entry.
  buildStrip(scene, key, frames, pal, fw, fh) {
    const names = Object.keys(frames);
    const tex = scene.textures.createCanvas(key, fw * names.length, fh);
    const ctx = tex.getContext();
    names.forEach((name, i) => {
      Art.pixels(frames[name], pal, (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(i * fw + x, y, 1, 1); }, `${key}:${name}`);
      tex.add(name, 0, i * fw, 0, fw, fh);
    });
    tex.refresh();
  },

  // Build the tileset used by every map. Tile index = position in TILE_DEFS.
  buildTileset(scene) {
    const rows = Math.ceil(TILE_DEFS.length / TILESET_COLS);
    const tex = scene.textures.createCanvas('tiles', TILE * TILESET_COLS, TILE * rows);
    const ctx = tex.getContext();
    TILE_DEFS.forEach((def, i) => {
      const x = (i % TILESET_COLS) * TILE, y = Math.floor(i / TILESET_COLS) * TILE;
      def.draw(tilePainter(ctx, x, y));
      tex.add(def.name, 0, x, y, TILE, TILE); // named frames so props can be drawn as images
    });
    tex.refresh();
  },
};

// Drawing helper for one 16x16 tile slot. Everything is clipped to the slot,
// so big objects (TV, table, fridge) can be drawn whole and shifted per tile.
function tilePainter(ctx, tx, ty, dx = 0, dy = 0) {
  return {
    rect(x, y, w, h, color) {
      const x0 = Math.max(x + dx, 0), y0 = Math.max(y + dy, 0);
      const x1 = Math.min(x + dx + w, TILE), y1 = Math.min(y + dy + h, TILE);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.fillStyle = color;
      ctx.fillRect(tx + x0, ty + y0, x1 - x0, y1 - y0);
    },
    px(x, y, color) { this.rect(x, y, 1, 1, color); },
    pixels(rows, pal, ox, oy, name) { Art.pixels(rows, pal, (x, y, c) => this.rect(ox + x, oy + y, 1, 1, c), name); },
    // View of the same slot with the drawing moved by (sx, sy).
    shift(sx, sy) { return tilePainter(ctx, tx, ty, dx + sx, dy + sy); },
  };
}

// What hangs on Ben's clothes rack: [x, shirt, stripe down the middle].
const CLOSET_SHIRTS = [[1, '#d8483c', '#3a1c28'], [5, '#a8c4e8', '#3f5f9a'], [9, '#c8323a', '#f4f4f0'], [13, '#30303a', '#c8323a']];

// Same scattered pixels every time, for carpet and fuzz texture.
function speckle(p, colors, count = 14) {
  for (let i = 0; i < count; i++) p.px((i * 7 + 3) % 16, (i * 11 + 5) % 16, colors[i % colors.length]);
}

// ---------------------------------------------------------------------------
// Ben (curly brown hair, red plaid flannel,
// dark jeans, brown boots)
// ---------------------------------------------------------------------------

const BEN_PAL = {
  k: K,
  h: '#6b4226', // hair
  H: '#8a5a34', // hair highlight
  d: '#4a2c18', // hair shadow (curls)
  s: '#f3c9a6', // skin
  S: '#dba27e', // skin shade
  l: '#a85a4a', // mouth
  p: '#d8483c', // plaid light
  q: '#a82c30', // plaid mid
  Q: '#3a1c28', // plaid dark
  T: '#f4f4f0', // the T-shirt under his flannel
  j: '#26304f', // jeans
  J: '#1a2038', // jeans shade
  n: '#6e4a2c', // boots
  N: '#4a2f1b', // boot soles
};

// Ben's outfits: color swaps on BEN_PAL (shirt p/q/Q, pants j/J, shoes n/N).
// casual is the red flannel and jeans above. Each builds its own texture,
// 'ben_church' etc. (see Ben.texture() in state.js for which one shows).
const BEN_OUTFITS = {
  casual: {},
  // Blue flannel, khakis, brown church shoes.
  church: { p: '#a8c4e8', q: '#7a9cd0', Q: '#3f5f9a', j: '#b8a070', J: '#9a8458', n: '#5a3a22', N: '#3a2414' },
  // Red practice jersey with white stripes, white football pants, black cleats.
  // Red helmet (white stripe, gray face mask): r/e/W/m, drawn in BEN_HEADS.
  football: { p: '#c8323a', q: '#a82830', Q: '#f4f4f0', j: '#ecece4', J: '#c4c4bc', n: '#26262c', N: '#141418',
    r: '#c8323a', e: '#e86a6a', W: '#f4f4f0', m: '#9aa0ac' },
  // Hardee's uniform: black polo with red trim, black work pants.
  // Black cap with a red logo (c/y/b) and a gray headset with a mic (m/M), drawn in BEN_HEADS.
  hardees: { p: '#30303a', q: '#26262e', Q: '#c8323a', j: '#2a2a32', J: '#1c1c22', n: '#1c1c22', N: '#101014',
    c: '#2a2a32', y: '#d8323a', b: '#16161c', m: '#8a8f9a', M: '#16161c' },
  // Gray T-shirt, camo pajama pants, barefoot.
  pajamas: { p: '#a4a8b0', q: '#9498a0', Q: '#80848c', j: '#5a6a3a', J: '#3d4a28', n: '#f3c9a6', N: '#dba27e' },
  // The Jail ending: an orange jumpsuit.
  jail: { p: '#f08a30', q: '#e07a24', Q: '#c8641c', j: '#e07a24', J: '#c8641c', n: '#f4f4f0', N: '#c8c8c0' },
};

// Outfits that change Ben's head: rows 0-11 (the head) for each facing, used in
// place of his hair. Every frame facing that way gets them (the legs still walk).
const BEN_HEADS = {
  football: {
    down: [
      '.....kkkkkk.....',
      '...kkrrWWrrkk...',
      '..krerrWWrrrrk..',
      '.kreerrWWrrrrrk.',
      '.krerrrWWrrrrrk.',
      '.krrrrrWWrrrrrk.',
      '.krrkkkkkkkkrrk.',
      '.krksssssssskrk.',
      '.krksksssskskrk.',
      '.krkSssssssSkrk.',
      '.kmmmmmmmmmmmmk.',
      '..kkmssssssmkk..',
    ],
    up: [
      '.....kkkkkk.....',
      '...kkrrWWrrkk...',
      '..krerrWWrrrrk..',
      '.kreerrWWrrrrrk.',
      '.krerrrWWrrrrrk.',
      '.krrrrrWWrrrrrk.',
      '.krrrrrWWrrrrrk.',
      '.krrrrrWWrrrrrk.',
      '..krrrrWWrrrrk..',
      '..krrrrrrrrrrk..',
      '...kkrrrrrrkk...',
      '....kssssssk....',
    ],
    side: [
      '....kkkkkk......',
      '..kkrrrrrrkk....',
      '.krrWWWWWWrrk...',
      '.kreerrrrrrrrk..',
      '.krerrrrrrrrrk..',
      '.krrrkrrrrrrrk..',
      '.krrrrrrkkkkkk..',
      '..krrrrksssskm..',
      '..krrrrkssksmm..',
      '..krrrrksssssm..',
      '...krrrkssmmmm..',
      '....kkkkssssk...',
    ],
  },
  hardees: {
    down: [
      '......kkkk......',
      '....kkcccckk....',
      '...kcccyyccck...',
      '..kccccyycccck..',
      '.kcccccccccccck.',
      '.kbbbbbbbbbbbbk.',
      '.khhsssssssshhk.',
      '.mkhsssssssshkm.',
      '.mksskssssksskm.',
      '..kSssssssssSm..',
      '...ksssllssMm...',
      '....kssssssk....',
    ],
    up: [
      '......kkkk......',
      '....kkcccckk....',
      '...kcccccccck...',
      '..kcccccccccck..',
      '.kcccccccccccck.',
      '.kcccckmmkcccck.',
      '.khhhhdhhhhdhhk.',
      '.mkhHhhhhhhHhkm.',
      '.mkhhdhhhhdhhkm.',
      '..kShhhhhhhhSk..',
      '...khhhhhhhhk...',
      '....kssssssk....',
    ],
    side: [
      '.....kkkk.......',
      '...kkccccckk....',
      '..kccccccyyck...',
      '.kcccccccyycck..',
      '.kcccccccccccbbk',
      '.khhhmhhhhhkkkk.',
      '.khhhmhhsshshk..',
      '..khmmhsssssk...',
      '..khhSmsssksk...',
      '..khhssmssssk...',
      '...kssssMssk....',
      '....ksssssk.....',
    ],
  },
};

// Ben's frames for one outfit: BEN_FRAMES with that outfit's head, if it has one.
// His flannels are plaid. Everything else is the plain shirt from BODIES (people.js).
function benOutfitFrames(outfit) {
  if (outfit === 'casual' || outfit === 'church') return BEN_FRAMES;
  const heads = BEN_HEADS[outfit] || {};
  return Object.fromEntries(Object.entries(BEN_FRAMES).map(([name, rows]) => {
    const dir = name.split('_')[0];
    const changes = {};
    (heads[dir] || []).forEach((row, i) => { changes[i] = row; });
    BODIES.man[dir].slice(0, 6).forEach((row, i) => { changes[12 + i] = row; });
    return [name, Art.withRows(rows, changes)];
  }));
}

const BEN_DOWN = [
  '......kkkk......',
  '....kkhhhhkk....',
  '...khhHhhHhhk...',
  '..khHhhdhhhHhk..',
  '.khhdhHhhdhhHhk.',
  '.khHhhhdhhhhdhk.',
  '.khhsshhsshhshk.',
  '..khsssssssshk..',
  '..kssksssskssk..',
  '..kSssssssssSk..',
  '...ksssllsssk...',
  '....kSssssSk....',
  '...kkqpssQqkk...',
  '..kqQpQTTQpQqk..',
  '..kpkQpTTpQkpk..',
  '..kQkpQTTQpkQk..',
  '..kpkQpTTpQkpk..',
  '..kQkpQTTQpkQk..',
  '..kskjjjjjjksk..',
  '...kkjjJJjjkk...',
  '....kjjkkjjk....',
  '....kjJkkJjk....',
  '...knnnkknnnk...',
  '...kNNNkkNNNk...',
];

const BEN_UP = Art.withRows(BEN_DOWN, {
  6: '.khhhhdhhhhdhhk.',
  7: '..khHhhhhhhHhk..',
  8: '..khhdhhhhdhhk..',
  9: '..kShhhhhhhhSk..',
  10: '...khhhhhhhhk...',
  11: '.....kSssSk.....',
  12: '...kkqpQQpqkk...',
  13: '..kqpQpqqpQpqk..',
  14: '..kqkQqQQqQkqk..',
  15: '..kpkQpqqpQkpk..',
  16: '..kQkQqQQqQkQk..',
  17: '..kpkQpqqpQkpk..',
});

const BEN_SIDE = [
  '.....kkkk.......',
  '...kkhhhhkk.....',
  '..khHhhHhhhk....',
  '.khhdhhhdhHhk...',
  '.khHhhdhhhhhhk..',
  '.khhhdhhhHhdhk..',
  '.khhhhhhsshshk..',
  '..khhhhsssssk...',
  '..khhSssssksk...',
  '..khhsssssssk...',
  '...ksssssslsk...',
  '....kSsssssk....',
  '....kqpQqpk.....',
  '....kqpQpqTk....',
  '....kQqpkpTk....',
  '....kqpQkqTk....',
  '....kpQqkpTk....',
  '....kQqpksTk....',
  '....kjjjjjjk....',
  '....kjjjJjjk....',
  '.....kjjJjk.....',
  '.....kjjjjk.....',
  '.....knnnnnk....',
  '.....kNNNNNk....',
];

const BEN_W = 16;
const BEN_H = 24;

// Frame 0 = standing, 1 and 2 = alternating steps. Left uses side frames flipped.
const BEN_FRAMES = {
  down_0: BEN_DOWN,
  down_1: Art.withRows(BEN_DOWN, { 22: '...kNNNkknnnk...', 23: '........kNNNk...' }),
  down_2: Art.withRows(BEN_DOWN, { 22: '...knnnkkNNNk...', 23: '...kNNNk........' }),
  up_0: BEN_UP,
  up_1: Art.withRows(BEN_UP, { 22: '...kNNNkknnnk...', 23: '........kNNNk...' }),
  up_2: Art.withRows(BEN_UP, { 22: '...knnnkkNNNk...', 23: '...kNNNk........' }),
  side_0: BEN_SIDE,
  side_1: Art.withRows(BEN_SIDE, { 21: '....kjjkkjjk....', 22: '...knnk..knnnk..', 23: '...kNNk..kNNNk..' }),
  side_2: Art.withRows(BEN_SIDE, { 21: '.....kjjjk......', 22: '.....knnnnk.....', 23: '.....kNNNNk.....' }),
};

// Bouncing arrow that marks where the current story goal is.
const GOAL_ARROW = [
  '..kkkkk..',
  '..kywyk..',
  '..kywyk..',
  'kkkyyykkk',
  'kyyyyyyyk',
  '.kyyyyyk.',
  '..kyyyk..',
  '...kyk...',
  '....k....',
];
const GOAL_ARROW_PAL = { k: K, y: '#f8d030', w: '#fff4b0' };
const GOAL_COLORS = { fill: 0xf8d030, outline: 0x181425 };

// HUD icons, 7x7.
const HUD_ICONS = {
  food: [
    '...kk..',
    '..kbbk.',
    '.kbbbbk',
    '.kbbbk.',
    'kwkkk..',
    'kwk....',
    '.k.....',
  ],
  mom: [
    '.kkkkk.',
    'krrrrrk',
    'kkrrrkk',
    'krkrkrk',
    'krrrrrk',
    'krkkkrk',
    '.kkkkk.',
  ],
  // Heat: a police light, red and blue.
  heat: [
    '..kkk..',
    '.kRwBk.',
    '.kRwBk.',
    '.kRwBk.',
    'kkkkkkk',
    'kgggggk',
    'kkkkkkk',
  ],
};
const HUD_ICON_PAL = { k: K, b: '#c87830', w: '#f4f4f4', r: '#e85a5a', g: '#8a8f9a', R: '#e83a3a', B: '#3a6ae8' };

// Wheatmore High School's colors: red, white and black.
const WHEATMORE = { red: '#c8323a', dark: '#8a1f24', white: '#f4f4f0', black: '#22222a' };

// ---------------------------------------------------------------------------
// Room styles: each room gets its own floor and wall look.
// Walls come in three shapes: U (upper, crown trim), L (lower, baseboard),
// S (single row, both).
// ---------------------------------------------------------------------------

function planks(p) {
  p.rect(0, 0, 16, 16, '#d9b07a');
  for (const y of [3, 7, 11, 15]) p.rect(0, y, 16, 1, '#b88c58');
  for (const [x, y] of [[5, 0], [12, 4], [2, 8], [9, 12]]) p.rect(x, y, 1, 3, '#a67a48');
}

function checker(p, a, b, size) {
  p.rect(0, 0, 16, 16, a);
  for (let y = 0; y < 16; y += size) for (let x = 0; x < 16; x += size) if ((x + y) / size % 2) p.rect(x, y, size, size, b);
}

const STYLES = {
  // Ben's room: gray carpet, off-white walls with a warm LED strip along the top.
  ben: {
    floor: p => { p.rect(0, 0, 16, 16, '#8c8e96'); speckle(p, ['#7c7e86', '#9c9ea6']); },
    wall: p => { p.rect(0, 0, 16, 16, '#d2cfc8'); speckle(p, ['#dad7d0'], 6); },
    trim: '#fff6d8', base: '#d6d0c4', baseShade: '#b8b4a8',
  },
  // Living room: beige carpet, the same walls as the hall.
  living: {
    floor: p => { p.rect(0, 0, 16, 16, '#c8b89a'); speckle(p, ['#bcac8e', '#d4c4a6']); },
    wall: p => { p.rect(0, 0, 16, 16, '#d9c8a4'); for (const x of [1, 5, 9, 13]) p.rect(x, 0, 1, 16, '#e3d4b2'); },
    trim: '#f0ead8', base: '#8a5a33', baseShade: '#5e3b20',
  },
  hall: {
    floor: planks,
    wall: p => { p.rect(0, 0, 16, 16, '#d9c8a4'); for (const x of [1, 5, 9, 13]) p.rect(x, 0, 1, 16, '#e3d4b2'); },
    trim: '#f0ead8', base: '#8a5a33', baseShade: '#5e3b20',
  },
  bath: {
    floor: p => checker(p, '#eef2f4', '#bcd6e0', 8),
    wall: p => { p.rect(0, 0, 16, 16, '#a8d4cc'); for (const v of [3, 7, 11, 15]) { p.rect(0, v, 16, 1, '#c8e6e0'); p.rect(v, 0, 1, 16, '#c8e6e0'); } },
    trim: '#f0f0ec', base: '#e8e8e4', baseShade: '#a8b0b0',
  },
  kitchen: {
    floor: p => checker(p, '#efe6cf', '#c9b48a', 8),
    wall: p => { p.rect(0, 0, 16, 16, '#ecdc9c'); for (const [x, y] of [[3, 4], [11, 4], [7, 9], [15, 9], [3, 13], [11, 13]]) p.px(x, y, '#d0503a'); },
    trim: '#f4f0e0', base: '#b07d50', baseShade: '#7a4f2c',
  },
  garage: {
    floor: p => {
      p.rect(0, 0, 16, 16, '#9a9a96');
      speckle(p, ['#8a8a86', '#a8a8a4']);
      p.rect(0, 15, 16, 1, '#8e8e8a');
      p.rect(15, 0, 1, 16, '#8e8e8a');
    },
    wall: p => {
      p.rect(0, 0, 16, 16, '#c8c4bc');
      for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#a8a49c');
      for (let y = 0; y < 16; y += 4) p.rect(y % 8 ? 3 : 11, y, 1, 3, '#a8a49c');
    },
    trim: '#a8a49c', base: '#7a7670', baseShade: '#5a5650',
  },
  church: {
    floor: p => {
      p.rect(0, 0, 16, 16, '#b8885a');
      for (const y of [3, 7, 11, 15]) p.rect(0, y, 16, 1, '#9a6e44');
      for (const [x, y] of [[4, 0], [11, 4], [1, 8], [8, 12]]) p.rect(x, y, 1, 3, '#8a6038');
    },
    wall: p => { p.rect(0, 0, 16, 16, '#ece6d8'); p.rect(0, 9, 16, 7, '#c8a878'); p.rect(0, 9, 16, 1, '#8a6038'); },
    trim: '#f8f4ea', base: '#8a6038', baseShade: '#5e3b20',
  },
  stage: {
    floor: p => { p.rect(0, 0, 16, 16, '#a83a3a'); speckle(p, ['#983434', '#b84444'], 10); },
    wall: p => p.rect(0, 0, 16, 16, '#ece6d8'),
    trim: '#f8f4ea', base: '#8a6038', baseShade: '#5e3b20',
  },
  hkitchen: {
    floor: p => { p.rect(0, 0, 16, 16, '#a8442e'); p.rect(0, 7, 16, 1, '#8a3424'); p.rect(0, 15, 16, 1, '#8a3424'); p.rect(7, 0, 1, 7, '#8a3424'); p.rect(15, 8, 1, 7, '#8a3424'); },
    wall: p => { p.rect(0, 0, 16, 16, '#ececE6'); for (const v of [3, 7, 11, 15]) { p.rect(0, v, 16, 1, '#cfcfc8'); p.rect(v, 0, 1, 16, '#cfcfc8'); } },
    trim: '#c8323a', base: '#8a8e9c', baseShade: '#5a5e6c',
  },
  hdining: {
    floor: p => checker(p, '#e8d8b8', '#d8c098', 8),
    wall: p => { p.rect(0, 0, 16, 16, '#d8b070'); p.rect(0, 6, 16, 3, '#c8323a'); },
    trim: '#f4ead0', base: '#7a4f2c', baseShade: '#5e3b20',
  },
  // Gas station store: white floor tiles, white walls with orange/green/red stripes.
  store: {
    floor: p => { p.rect(0, 0, 16, 16, '#eceae4'); p.rect(0, 15, 16, 1, '#c8c6c0'); p.rect(15, 0, 1, 16, '#c8c6c0'); },
    wall: p => {
      p.rect(0, 0, 16, 16, '#f4f2ec');
      p.rect(0, 6, 16, 2, '#e8782a'); p.rect(0, 8, 16, 2, '#2f8a3a'); p.rect(0, 10, 16, 1, '#c8323a');
    },
    trim: '#d8d6d0', base: '#5a5e6c', baseShade: '#3a3e4c',
  },
  // School: parking lot, sidewalk, brick outside walls, hallway, cafeteria, football field.
  asphalt: {
    floor: p => { p.rect(0, 0, 16, 16, '#4c4e56'); speckle(p, ['#44464e', '#5a5c64'], 16); },
    wall: p => p.rect(0, 0, 16, 16, '#4c4e56'),
    trim: '#5a5c64', base: '#5a5c64', baseShade: '#3a3c44',
  },
  sidewalk: {
    floor: p => { p.rect(0, 0, 16, 16, '#b8b4ac'); p.rect(0, 15, 16, 1, '#9a968e'); p.rect(15, 0, 1, 16, '#9a968e'); speckle(p, ['#aaa69e'], 6); },
    wall: p => p.rect(0, 0, 16, 16, '#b8b4ac'),
    trim: '#c8c4bc', base: '#9a968e', baseShade: '#7a766e',
  },
  brick: {
    floor: p => p.rect(0, 0, 16, 16, '#b8b4ac'),
    wall: p => {
      p.rect(0, 0, 16, 16, '#a8503a');
      for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#c8b8a8');
      for (let y = 0; y < 16; y += 4) for (const x of (y % 8 ? [3, 11] : [7, 15])) p.rect(x, y, 1, 3, '#c8b8a8');
    },
    trim: '#d8d0c0', base: '#7a766e', baseShade: '#5a5650',
  },
  school: {
    floor: p => { p.rect(0, 0, 16, 16, '#d4d8dc'); p.rect(0, 15, 16, 1, '#b8bcc4'); p.rect(15, 0, 1, 16, '#b8bcc4'); p.rect(3, 3, 4, 1, '#eef0f4'); },
    // Wheatmore colors: white block wall, a red band with a black line on top.
    wall: p => { p.rect(0, 0, 16, 16, '#ece8e0'); p.rect(0, 9, 16, 7, WHEATMORE.red); p.rect(0, 9, 16, 1, WHEATMORE.black); },
    trim: '#f4f0e4', base: WHEATMORE.black, baseShade: '#141418',
  },
  cafeteria: {
    floor: p => checker(p, '#e8e4d8', '#c4ccd4', 8),
    wall: p => {
      // painted cinder block, white with a red stripe (Wheatmore colors)
      p.rect(0, 0, 16, 16, '#ece8e0');
      for (let y = 3; y < 16; y += 5) p.rect(0, y, 16, 1, '#d4d0c8');
      for (let y = 0; y < 16; y += 5) p.rect(y % 10 ? 4 : 12, y, 1, 4, '#d4d0c8');
      p.rect(0, 11, 16, 2, WHEATMORE.red);
    },
    trim: '#f4f0d8', base: '#8a8e9c', baseShade: '#5a5e6c',
  },
  field: {
    floor: p => { p.rect(0, 0, 8, 16, '#4f9a3a'); p.rect(8, 0, 8, 16, '#58a842'); speckle(p, ['#468a34', '#62b04a'], 8); },
    wall: p => { p.rect(0, 0, 16, 16, '#4f9a3a'); for (let x = 0; x < 16; x += 4) { p.rect(x, 0, 1, 16, '#9aa0ac'); } p.rect(0, 0, 16, 1, '#9aa0ac'); },
    trim: '#9aa0ac', base: '#3f7a2e', baseShade: '#2f5a22',
  },
  // Thrift store: worn speckled tile floor, mustard walls with a teal stripe.
  thrift: {
    floor: p => { p.rect(0, 0, 16, 16, '#cfc6a8'); speckle(p, ['#bdb494', '#ddd6bc', '#b8a884'], 16); p.rect(0, 15, 16, 1, '#b8ae90'); },
    wall: p => { p.rect(0, 0, 16, 16, '#e0b850'); p.rect(0, 9, 16, 2, '#3a9a8a'); speckle(p, ['#d4ac44'], 6); },
    trim: '#f0e4b8', base: '#7a5a3a', baseShade: '#5a3e26',
  },
  // El Rancho: terracotta floor tiles, warm stucco walls with a teal stripe.
  rancho: {
    floor: p => { p.rect(0, 0, 16, 16, '#c8703a'); p.rect(0, 7, 16, 1, '#a85a2a'); p.rect(0, 15, 16, 1, '#a85a2a'); p.rect(7, 0, 1, 7, '#a85a2a'); p.rect(15, 8, 1, 7, '#a85a2a'); },
    wall: p => { p.rect(0, 0, 16, 16, '#e8b860'); p.rect(0, 10, 16, 2, '#2a9a8a'); speckle(p, ['#dcac54'], 6); },
    trim: '#f4e0a8', base: '#8a4a22', baseShade: '#6a3418',
  },
  // The field party on Friday night: long pasture grass, and dirt trampled around the fire.
  pasture: {
    floor: p => { p.rect(0, 0, 16, 16, '#3f8a3a'); speckle(p, ['#347a30', '#4c9a44', '#2f6e2c'], 18); },
    wall: p => p.rect(0, 0, 16, 16, '#2f6e2c'),
    trim: '#3f8a3a', base: '#2f6e2c', baseShade: '#245a22',
  },
  pastureDirt: {
    floor: p => { p.rect(0, 0, 16, 16, '#8a6a42'); speckle(p, ['#7a5c38', '#9a7a50', '#6e5230'], 18); },
    wall: p => p.rect(0, 0, 16, 16, '#8a6a42'),
    trim: '#9a7a50', base: '#6e5230', baseShade: '#5a4426',
  },
  // Classroom: speckled tan tile, pale green walls with a wood chair rail.
  classroom: {
    floor: p => { p.rect(0, 0, 16, 16, '#d8ccb0'); speckle(p, ['#c8bca0', '#e4dac4'], 12); p.rect(0, 15, 16, 1, '#c4b89c'); p.rect(15, 0, 1, 16, '#c4b89c'); },
    wall: p => { p.rect(0, 0, 16, 16, '#b8d0b0'); p.rect(0, 10, 16, 1, '#8a6038'); p.rect(0, 11, 16, 5, '#a8c0a0'); },
    trim: '#e8f0e0', base: '#5e3b20', baseShade: '#3e2614',
  },
  // School bathroom: little white floor tiles, gross green wall tiles.
  schoolBath: {
    floor: p => checker(p, '#e8ecec', '#cfd8d8', 4),
    wall: p => { p.rect(0, 0, 16, 16, '#7aa890'); for (const v of [3, 7, 11, 15]) { p.rect(0, v, 16, 1, '#5a8a72'); p.rect(v, 0, 1, 16, '#5a8a72'); } },
    trim: '#d8e4dc', base: '#4a6a5a', baseShade: '#2a4a3a',
  },
  sam: {
    floor: p => { p.rect(0, 0, 16, 16, '#8cb4d8'); speckle(p, ['#7ca4c8', '#9cc4e8']); },
    wall: p => { p.rect(0, 0, 16, 16, '#a8cc90'); p.rect(0, 7, 16, 2, '#c0dca8'); },
    trim: '#f0f0e8', base: '#e8e8e0', baseShade: '#a8a8a0',
  },
};

function groundDefs() {
  const defs = [
    { name: 'void', solid: true, draw: p => p.rect(0, 0, 16, 16, '#000000') },
    { name: 'border', solid: true, draw: p => p.rect(0, 0, 16, 16, '#2a2030') },
  ];
  for (const [style, s] of Object.entries(STYLES)) {
    const crown = p => { p.rect(0, 0, 16, 2, s.trim); p.rect(0, 2, 16, 1, s.baseShade); };
    const baseboard = p => { p.rect(0, 12, 16, 4, s.base); p.rect(0, 12, 16, 1, s.trim); p.rect(0, 15, 16, 1, s.baseShade); };
    defs.push(
      { name: `floor_${style}`, solid: false, draw: s.floor },
      { name: `wallU_${style}`, solid: true, draw: p => { s.wall(p); crown(p); } },
      { name: `wallL_${style}`, solid: true, draw: p => { s.wall(p); baseboard(p); } },
      { name: `wallS_${style}`, solid: true, draw: p => { s.wall(p); crown(p); baseboard(p); } },
    );
  }
  return defs;
}

// ---------------------------------------------------------------------------
// Objects: drawn on a transparent background over the room's floor or wall.
// ---------------------------------------------------------------------------

const POSTER_AF = [
  'kkkkkkkkkkkk',
  'knnnnnnnnnnk',
  'knnnnwwnnnnk',
  'knnnwwwwnnnk',
  'kwwwwwwwwwwk',
  'knwwwwwwwwnk',
  'knnnwwwwnnnk',
  'knnwwnnwwnnk',
  'knnnnnnnnnnk',
  'knyyyyyyyynk',
  'knnnnnnnnnnk',
  'krrwwrrwwrrk',
  'kkkkkkkkkkkk',
];
const POSTER_AF_PAL = { k: K, n: '#1f3a7a', w: '#e8eef8', y: '#e8c040', r: '#c8323a' };

const POSTER_TRUCK = [
  'kkkkkkkkkkkk',
  'kyyyyyyyyyyk',
  'kyyyyyyyyyyk',
  'kyyyrrrryyyk',
  'kyyrrwwrryyk',
  'kyrrrrrrrrrk',
  'krrrrrrrrrrk',
  'kyKKyyyyKKyk',
  'kKKKKyyKKKKk',
  'kyKKyyyyKKyk',
  'kbbbbbbbbbbk',
  'kkkkkkkkkkkk',
];
const POSTER_TRUCK_PAL = { k: K, y: '#f0b040', r: '#c8323a', w: '#8fcbea', K: '#3a3a44', b: '#6e4a2c' };

const FLAG = [
  'bwbwbrrrrrrr',
  'bbbbbwwwwwww',
  'bwbwbrrrrrrr',
  'bbbbbwwwwwww',
  'rrrrrrrrrrrr',
  'wwwwwwwwwwww',
  'rrrrrrrrrrrr',
];
const FLAG_PAL = { b: '#2a3f8a', w: '#f0f0f0', r: '#c8323a' };

const DEER = [
  '.a.a......a.a.',
  '.aaa......aaa.',
  '..aa.a..a.aa..',
  '...aaa..aaa...',
  '.....a..a.....',
  '..FfkffffkfF..',
  '...kffffffk...',
  '....fkffkf....',
  '....ffffff....',
  '.....fmmf.....',
  '.....mmmm.....',
  '.....mkkm.....',
  '...pppppppp...',
  '...PPPPPPPP...',
];
const DEER_PAL = { a: '#eadbb8', f: '#8a5a33', F: '#5e3b20', m: '#c8a07a', k: K, p: '#6e4628', P: '#3e2614' };

const GUITAR = [
  '...kkkk...',
  '...kNNk...',
  '....nn....',
  '....nn....',
  '....nn....',
  '....nn....',
  '...kook...',
  '..kooook..',
  '..kokkok..',
  '..kokkok..',
  '...kook...',
  '..kooook..',
  '.kooooook.',
  '.koOOOOok.',
  '..kooook..',
  '...kkkk...',
];
const GUITAR_PAL = { k: K, N: '#2a2030', n: '#4a2e18', o: '#d08a3a', O: '#7a4a22' };

const BEANBAG = [
  '....kkkkkk....',
  '..kkrrrrrrkk..',
  '.krrRrrrrrrrk.',
  'krrRrrrrrrrrrk',
  'krRrrrrrrrrRrk',
  'krrrrrrrrrRrrk',
  'kRrrrrrrrrrrRk',
  '.kRRrrrrrrRRk.',
  '..kkRRRRRRkk..',
  '....kkkkkk....',
];
const BEANBAG_PAL = { k: K, r: '#3a3a48', R: '#26262f' };

const CLOTHES = [
  '...kkkk.....',
  '..krrRrkkk..',
  '.krrrRkbbbk.',
  '.kgggkbbbbk.',
  'kgggggkbBbbk',
  'kgGggkwwwwwk',
  '.kkkkkkkkkk.',
];
const CLOTHES_PAL = { k: K, r: '#c8323a', R: '#7e1d26', b: '#3d5a9e', B: '#2a3f73', g: '#a9adb5', G: '#5e6470', w: '#e8e8e8' };

const TRASH = [
  '.c.w.wc.',
  'kkkkkkkk',
  'kGGGGGGk',
  'kkkkkkkk',
  '.kgGggk.',
  '.kgGggk.',
  '.kgGggk.',
  '.kgGggk.',
  '.kgGggk.',
  '.kgGggk.',
  '.kkkkkk.',
];
const TRASH_PAL = { k: K, w: '#f4f4f4', c: '#3fa04a', G: '#b8bcc8', g: '#8a8e9c' };

const HELMET = [
  '...kkkkk....',
  '.kkmmmmmkk..',
  'kmmmmmmmmmk.',
  'kmmmwmmmmmk.',
  'kmmmmmmmkkk.',
  'kmmmmmmkgggk',
  'kmmmmmkg.g.k',
  '.kmmmkkgggk.',
  '..kkk..kkk..',
];
const HELMET_PAL = { k: K, m: '#7e1d26', w: '#e8e8e8', g: '#9a9ea8' };

const DINO_POSTER = [
  'kkkkkkkkkkkk',
  'kcccccgggcck',
  'kccccggkggck',
  'kccccgggggck',
  'kcgcgggcccck',
  'kcgggggggcck',
  'kccgggggcgck',
  'kcccggggccck',
  'kccccgccgcck',
  'kyyyyyyyyyyk',
  'kkkkkkkkkkkk',
];
const DINO_POSTER_PAL = { k: K, c: '#a8d8f0', g: '#4fa060', y: '#e8c040' };

function windowObj(curtains) {
  return p => {
    p.rect(0, 1, 16, 1, '#5e3b20');
    p.rect(2, 3, 12, 10, '#e8e4dc');
    p.rect(3, 4, 10, 8, '#8fcbea');
    p.rect(3, 7, 10, 1, '#e8e4dc');
    p.rect(7, 4, 2, 8, '#e8e4dc');
    p.px(4, 5, '#d8f1ff'); p.px(5, 5, '#d8f1ff'); p.px(4, 6, '#d8f1ff'); p.px(10, 9, '#d8f1ff');
    p.rect(1, 13, 14, 1, '#e8e4dc');
    p.rect(1, 14, 14, 1, '#b8b4ac');
    curtains(p);
  };
}

function bed(p, frame, blanket) {
  p.rect(1, 0, 14, 32, K);
  p.rect(2, 0, 12, 3, frame);
  p.rect(2, 3, 12, 26, '#e8e8e8');
  p.rect(3, 4, 10, 5, '#b8b8c8');
  p.rect(4, 5, 8, 3, '#ffffff');
  blanket(p);
  p.rect(2, 29, 12, 3, frame);
}

function camoBlanket(p) {
  p.rect(2, 10, 12, 19, '#6b7a3a');
  p.rect(2, 10, 12, 2, '#8a9a52');
  for (const [x, y, w, h, c] of [[3, 13, 4, 2, '#3f4a22'], [9, 15, 3, 3, '#8a7a4a'], [4, 19, 3, 3, '#3f4a22'], [10, 22, 3, 2, '#3f4a22'], [3, 25, 4, 2, '#8a7a4a'], [8, 26, 3, 2, '#3f4a22']]) p.rect(x, y, w, h, c);
}

// Ben's bed: rumpled gray sheets, a red plaid blanket thrown over the foot.
function benBlanket(p) {
  p.rect(2, 10, 12, 19, '#9a9ea8');
  p.rect(2, 10, 12, 2, '#b4b8c0');
  for (const [x, y] of [[4, 14], [9, 13], [6, 17], [11, 18]]) p.rect(x, y, 3, 1, '#868a94');
  p.rect(2, 21, 12, 8, '#c8323a');
  for (const y of [23, 26]) p.rect(2, y, 12, 1, '#22222a');
  for (const x of [5, 10]) p.rect(x, 21, 1, 8, '#22222a');
  p.rect(2, 21, 12, 1, '#e85a5a');
}

function starBlanket(p) {
  p.rect(2, 10, 12, 19, '#4fa060');
  p.rect(2, 10, 12, 2, '#7cc48a');
  for (const [x, y] of [[4, 14], [10, 16], [6, 20], [11, 23], [4, 26]]) {
    p.px(x, y, '#e8c040'); p.px(x - 1, y, '#e8c040'); p.px(x + 1, y, '#e8c040'); p.px(x, y - 1, '#e8c040'); p.px(x, y + 1, '#e8c040');
  }
}

function drawTV(p) {
  p.rect(1, 9, 30, 7, '#3a2e2a');
  p.rect(1, 9, 30, 1, '#4f403a');
  p.rect(4, 11, 8, 3, '#22222a');
  p.px(10, 12, '#40c0e0');
  p.rect(20, 12, 5, 2, '#5a5a64');
  p.rect(3, 0, 26, 9, '#141418');
  p.rect(4, 1, 24, 7, '#2a6ab0');
  p.rect(4, 5, 24, 3, '#3fa04a');
  p.rect(9, 3, 2, 2, '#f0d040');
  p.rect(18, 2, 3, 3, '#f4f4f4');
}

// One row of the stairwell, 32x16: two wooden steps with a red carpet runner down the
// middle and walls on both sides. Each row is darker on the way down to the basement.
const STAIR_WOOD = ['#c89a6a', '#b88a5c', '#a87a50', '#966a44', '#825a38', '#6e4a2e', '#5a3c24', '#46301c', '#342214', '#22160e'];
const STAIR_RUG = ['#a8323a', '#9a2e36', '#8c2a32', '#7c262c', '#6c2228', '#5c1e22', '#4c181c', '#3c1416', '#2c0e10', '#1e0a0c'];
function drawStairs(p, level) {
  for (let step = 0; step < 2; step++) {
    const i = level * 2 + step, y = step * 8;
    p.rect(2, y, 28, 6, STAIR_WOOD[i]);
    p.rect(2, y, 28, 1, i ? STAIR_WOOD[i - 1] : '#dcb080');     // the lit front edge of the step
    p.rect(2, y + 6, 28, 2, '#181009');                         // the drop to the next one
    p.rect(9, y, 14, 6, STAIR_RUG[i]);
    p.rect(9, y + 6, 14, 2, '#140608');
    p.rect(9, y, 1, 6, '#e8c040'); p.rect(22, y, 1, 6, '#e8c040');
  }
  p.rect(0, 0, 2, 16, '#2a1c14'); p.rect(30, 0, 2, 16, '#2a1c14');
}

// Ben's desk, 32x16, against the bottom wall: Ben sits above it facing down, so we
// see the keyboard on his side and the back of the monitor.
function drawDesk(p) {
  p.rect(0, 3, 32, 8, '#4a4a52');
  p.rect(0, 3, 32, 1, '#5a5a64');
  p.rect(1, 11, 2, 5, '#2a2a30');
  p.rect(29, 11, 2, 5, '#2a2a30');
  // RGB keyboard
  p.rect(7, 4, 12, 2, '#222228');
  for (let x = 8; x < 18; x += 3) { p.px(x, 4, '#e04060'); p.px(x + 1, 5, '#40e080'); p.px(x + 2, 4, '#4080f0'); }
  // back of the monitor, with the screen's glow along the top
  p.rect(6, 6, 14, 7, '#2a2a32');
  p.rect(7, 7, 12, 5, '#34343e');
  p.rect(6, 6, 14, 1, '#6a5ab0');
  p.rect(12, 9, 2, 3, '#1c1c22');
  // PC tower with RGB fans
  p.rect(22, 2, 8, 11, '#202028');
  p.rect(23, 3, 6, 9, '#2a1a3a');
  p.rect(24, 4, 3, 3, '#e040a0');
  p.rect(24, 8, 3, 2, '#40c0e0');
  // energy drink
  p.rect(2, 4, 2, 4, '#3fa04a');
  p.px(2, 4, '#c0c0c0'); p.px(3, 4, '#c0c0c0');
}

// A dining chair from the side. side 1 faces right (back on the left), -1 faces left.
function drawSideChair(p, side) {
  const box = (x, y, w, h, c) => p.rect(side > 0 ? x : 16 - x - w, y, w, h, c);
  box(2, 1, 3, 12, '#8a5a33');
  box(2, 1, 1, 12, '#6b4226');
  box(4, 7, 9, 4, '#b07d50');
  box(4, 7, 9, 1, '#c8966a');
  box(2, 13, 2, 2, '#5e3b20');
  box(11, 11, 2, 4, '#5e3b20');
}

function drawTub(p) {
  p.rect(1, 1, 14, 46, '#9aa4ac');
  p.rect(2, 2, 12, 44, '#f4f4f4');
  p.rect(4, 5, 8, 39, '#cfe0e8');
  p.rect(7, 2, 2, 3, '#c0c4c8');
  p.px(7, 40, '#9aa4ac');
  // rubber duck
  p.rect(6, 28, 3, 2, '#f0d040'); p.px(8, 27, '#f0d040'); p.px(9, 28, '#e08030');
}

function drawFridge(p, drawing = true) {
  p.rect(1, 0, 14, 32, '#9aa4ac');
  p.rect(2, 1, 12, 30, drawing ? '#f0f0ec' : '#dcdcd4');
  p.rect(2, 11, 12, 1, '#9aa4ac');
  p.rect(11, 4, 1, 5, '#9aa4ac');
  p.rect(11, 14, 1, 8, '#9aa4ac');
  if (!drawing) { p.rect(4, 22, 3, 2, '#b8a888'); return; } // old fridge, rust spot
  // Sam's crayon drawing on the fridge
  p.rect(4, 16, 5, 5, '#ffffff');
  p.rect(5, 17, 2, 2, '#e04040'); p.px(7, 19, '#4080f0'); p.rect(5, 20, 3, 1, '#40a040');
}

const WHEEL = [
  '...kkkk...',
  '.kkKKKKkk.',
  '.kK....Kk.',
  'kK..gg..Kk',
  'kK.g..g.Kk',
  'kK.g..g.Kk',
  'kK..gg..Kk',
  '.kK....Kk.',
  '.kkKKKKkk.',
  '...kkkk...',
];
const WHEEL_PAL = { k: K, K: '#4a4a52', g: '#b8bcc8' };

// Ben's dirtbike, 32x16, facing right.
function drawBike(p) {
  p.rect(3, 9, 10, 1, '#b8bcc8');            // exhaust
  p.rect(2, 4, 9, 2, '#c8323a');             // rear fender
  p.rect(11, 8, 7, 4, '#5a5a64');            // engine
  p.rect(9, 4, 12, 4, '#c8323a');            // body / tank
  p.rect(9, 4, 12, 1, '#e05a5a');
  p.rect(10, 2, 9, 2, '#22222a');            // seat
  p.rect(21, 1, 5, 6, '#f4f4f4');            // number plate
  p.rect(22, 2, 3, 3, '#22222a');
  p.rect(21, 0, 6, 1, '#4a4a52');            // handlebar
  for (let i = 0; i < 9; i++) p.px(24 + Math.floor(i / 3), 6 + i, '#b8bcc8'); // fork
  p.pixels(WHEEL, WHEEL_PAL, 1, 6, 'wheel');
  p.pixels(WHEEL, WHEEL_PAL, 21, 6, 'wheel');
}

function drawBench(p) {
  p.rect(0, 5, 32, 4, '#5e3b20');
  p.rect(0, 5, 32, 1, '#8a5a33');
  p.rect(1, 9, 30, 2, '#4a2e18');
  p.rect(1, 11, 2, 5, '#4a2e18'); p.rect(29, 11, 2, 5, '#4a2e18');
  p.rect(2, 2, 5, 3, '#5a5a64'); p.rect(3, 1, 3, 1, '#5a5a64');   // vise
  p.rect(11, 3, 7, 1, '#b8bcc8'); p.rect(17, 2, 2, 3, '#b8bcc8'); // wrench
  p.rect(22, 3, 6, 1, '#8a5a33'); p.rect(27, 1, 2, 4, '#5a5a64'); // hammer
}

function drawTable(p) {
  p.rect(1, 2, 30, 24, '#5a3a22');
  for (let y = 3; y < 25; y += 4) for (let x = 2; x < 30; x += 4) p.rect(x, y, 4, 4, ((x + y) / 4 | 0) % 2 ? '#c8323a' : '#f0e0e0');
  p.rect(3, 26, 2, 5, '#5a3a22');
  p.rect(27, 26, 2, 5, '#5a3a22');
}

// Mom's dinners on a plate (same size and spot as breakfast).
function drawDinner(p, kind) {
  const plate = '#ffffff';
  p.rect(5, 4, 6, 1, '#9aa4ac'); p.rect(3, 5, 10, 1, '#9aa4ac'); p.rect(2, 6, 12, 5, '#9aa4ac');
  p.rect(3, 11, 10, 1, '#9aa4ac'); p.rect(5, 12, 6, 1, '#9aa4ac');
  p.rect(5, 5, 6, 1, plate); p.rect(3, 6, 10, 5, plate); p.rect(5, 11, 6, 1, plate);
  if (kind === 'meatloaf') {
    p.rect(4, 7, 5, 3, '#7a3a1e'); p.rect(4, 7, 5, 1, '#c8323a');       // meatloaf with ketchup on top
    p.rect(10, 7, 2, 3, '#f0e8c8');                                    // mashed potatoes
  }
  if (kind === 'beans') {
    for (const [x, y] of [[4, 7], [6, 6], [8, 7], [10, 6], [5, 9], [7, 8], [9, 9], [11, 8], [6, 10]]) p.rect(x, y, 2, 1, '#4fa060');
    p.rect(8, 10, 2, 1, '#357a40');
  }
  if (kind === 'chicken') {
    p.rect(4, 7, 4, 4, '#f0ecd8'); p.rect(5, 6, 2, 1, '#f0ecd8');      // rice
    p.rect(8, 7, 4, 3, '#d8a060'); p.rect(8, 7, 4, 1, '#e8b878');      // chicken
  }
  if (kind === 'chili') {
    p.rect(4, 6, 8, 5, '#8a3a20'); p.px(6, 7, '#c8a040'); p.px(9, 8, '#c8a040'); p.px(7, 9, '#f4f4f4');
    p.rect(12, 9, 3, 3, '#e8c060'); p.rect(12, 9, 3, 1, '#f0d890');    // cornbread on the side
  }
}

// Mom's biscuits and gravy, sat in the middle of the table.
const BREAKFAST = [
  '.....kkkkkk.....',
  '...kkwwwwwwkk...',
  '..kwwbbwwbbwwk..',
  '.kwwbBBbbBBbwwk.',
  '.kwbggggggggbwk.',
  '.kwwbgggggggwwk.',
  '..kwwwggwwwwwk..',
  '...kkwwwwwwkk...',
  '.....kkkkkk.....',
];
const BREAKFAST_PAL = { k: '#9aa4ac', w: '#ffffff', b: '#d89a48', B: '#f0c070', g: '#d8ccb0' };

// Guitar Ben carries around, held across his body.
const HELD_GUITAR = [
  '.kkk.........',
  'kooOk......kk',
  'kokkonnnnnnNk',
  'kokkonnnnnnNk',
  'kooOk......kk',
  '.kkk.........',
];
const HELD_GUITAR_PAL = { k: K, o: '#d08a3a', O: '#7a4a22', n: '#4a2e18', N: '#2a2030' };

// Ben carrying his guitar in the world: strapped on his back. Each view has a
// Ben-sized (16x24) layer drawn behind him (the guitar) and one drawn over him
// (the strap across his chest). Facing up, the whole guitar is on top.
const CARRY_GUITAR = {
  downBack: [
    '................',
    '................',
    'NN..............',
    'NN..............',
    'nm..............',
    'nm..............',
    'nm..............',
    '.nm.............',
    '.nm.............',
    '.nm.............',
    '.nm.............',
    '..nm............',
    '..nm............',
    '..nm............',
    '............kk..',
    '...........koOk.',
    '..........koooOk',
    '.........koooooO',
    '.........kOooooO',
    '..........kOooOk',
    '...........kOOk.',
    '............kk..',
    '................',
    '................',
  ],
  downFront: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....t...........',
    '.....tt.........',
    '.......t........',
    '........t.......',
    '.........tt.....',
    '...........t....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  sideBack: [
    '.NN.............',
    '.NN.............',
    '..nm............',
    '..nm............',
    '..nm............',
    '...nm...........',
    '...nm...........',
    '...nm...........',
    '...nm...........',
    '....nm..........',
    '....nm..........',
    '....nm..........',
    '...kkk..........',
    '..kooOk.........',
    '..kooOk.........',
    '.koooOk.........',
    'kooooOk.........',
    'kooooOk.........',
    'kOoooOk.........',
    '.kOOOk..........',
    '..kkk...........',
    '................',
    '................',
    '................',
  ],
  sideFront: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....t..........',
    '......t.........',
    '......t.........',
    '.......t........',
    '........t.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  upFront: [
    '................',
    '.............NN.',
    '.............NN.',
    '.............nm.',
    '.............nm.',
    '............nm..',
    '............nm..',
    '...........nm...',
    '...........nm...',
    '..........nm....',
    '..........nm....',
    '.........nm.....',
    '...tt..kknm.....',
    '.....tkOOTk.....',
    '....kkOOOOTk....',
    '...kOOOOOOTt....',
    '...kOOOOOTk.t...',
    '...kOOOOTk......',
    '...kOOOOTk......',
    '...kTOOOTk......',
    '....kTTTk.......',
    '.....kkk........',
    '................',
    '................',
  ],
};
const CARRY_GUITAR_PAL = {
  k: K, o: '#d08a3a', O: '#9a5a26', n: '#3a2412', m: '#6a4424', N: '#2a2030', t: '#7a3a1e', T: '#5a2a14',
};

// The acoustic guitar Ben plays at the party, 68x34, tilted with the neck up to
// the right. It's worked out pixel by pixel in the guitar's own coordinates:
// `u` runs along it from the bottom of the body, `v` goes across it.
const SONG_GUITAR = { w: 68, h: 34, tilt: -0.24, x: 8, y: 24, size: 1.1 };

function songGuitarColor(u, v) {
  const side = Math.abs(v);
  const lower = u >= 0 && u <= 18 ? 10.5 * Math.sqrt(1 - ((u - 9) / 9) ** 2) : 0;
  const upper = u >= 12 && u <= 28 ? 8.2 * Math.sqrt(1 - ((u - 20) / 8) ** 2) : 0;
  const body = Math.max(lower, upper);

  // Tuners, then the headstock, the nut, the neck.
  if (u > 47 && u < 56 && side > 3.6 && side < 5.6 && (Math.round(u) - 48) % 3 < 2) return '#d8dce4';
  if (u >= 46.5 && u < 57) {
    if (side <= 3.2) return side < 0.5 ? '#8a5a34' : '#5e3820';
    return side <= 4.1 ? K : null;
  }
  if (u >= 45.5 && u < 46.5 && side <= 2.2) return '#f4ecd8';
  if (u >= 20 && u < 46 && side <= 2.2) {
    return [29, 34, 38.5, 42].some(f => Math.abs(u - f) < 0.4) ? '#d8dce4' : '#7a4c2a';
  }
  if (u >= 27 && u < 46.5 && side <= 3.1) return K;

  // The body.
  if (body === 0 || side > body + 1) return null;
  if (side > body) return K;
  if (side > body - 1) return '#f4ead0';                     // the binding around the edge
  const hole = Math.hypot(u - 18, v);
  if (hole < 3.6) return '#160c08';
  if (hole < 4.3) return '#f4ead0';
  if (hole < 4.9) return '#3a2214';
  if (hole < 5.5) return '#f4ead0';
  if (u > 5.5 && u < 8.5 && side < 5.5) return u > 6.6 && u < 7.4 ? '#f4ead0' : '#2a1810';   // the bridge
  if (u > 8 && u < 18 && side < 1.3 && side > 0.5) return '#d8dce4';                         // strings
  if (u > 11 && u < 18 && v > 5 && v < 8.5) return '#3a2014';                                // the pickguard
  const fade = Math.hypot((u - 13) / 15, v / 11);                                            // sunburst
  return fade < 0.42 ? '#f4cc7c' : fade < 0.62 ? '#e4a84c' : fade < 0.8 ? '#c47a2c' : fade < 0.92 ? '#8e4a1c' : '#5e2c12';
}

function buildSongGuitar(scene) {
  const { w, h, tilt, x: ox, y: oy, size } = SONG_GUITAR;
  const tex = scene.textures.createCanvas('songGuitar', w, h);
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - ox) / size, dy = (y + 0.5 - oy) / size;
      const color = songGuitarColor(dx * Math.cos(tilt) + dy * Math.sin(tilt) + 7, -dx * Math.sin(tilt) + dy * Math.cos(tilt));
      if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
    }
  }
  tex.refresh();
}

// Gas station cooler, 16x32: the top half hangs on the upper wall, the bottom
// on the lower wall. Glass door, a lit sign strip, and three shelves of drinks.
function drawCooler(p, beer) {
  p.rect(0, 2, 16, 30, '#7a808c');
  p.rect(1, 3, 14, 3, beer ? '#d8a830' : '#3a6ae8');
  p.rect(3, 4, 10, 1, beer ? '#fff0b0' : '#c8dcff');
  p.rect(1, 7, 14, 24, '#1e2e38');
  for (const y of [14, 21, 28]) p.rect(1, y, 14, 1, '#9aa0ac');
  const colors = beer ? ['#c8a040', '#8a5a20', '#e8e0c0'] : ['#c8323a', '#3a6ae8', '#40a040', '#e8c040'];
  [9, 16, 23].forEach((y, row) => {
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 3 + (i > 1 ? 1 : 0), c = colors[(i + row) % colors.length];
      if (beer) { p.rect(x, y + 1, 2, 4, c); p.px(x, y, c); p.rect(x, y + 2, 2, 1, '#f4f4f4'); }
      else { p.rect(x, y, 2, 5, c); p.px(x, y, '#c8ccd0'); }
    }
  });
  p.rect(7, 7, 2, 24, '#7a808c');                      // middle of the double door
  p.rect(5, 17, 1, 4, '#d8dce0'); p.rect(10, 17, 1, 4, '#d8dce0'); // handles
  p.rect(2, 8, 1, 20, 'rgba(255,255,255,0.15)');       // shine
}

// Store aisle shelf seen from above, 32x16 across two tiles: snacks in rows.
function drawShelf(p) {
  p.rect(0, 1, 32, 14, '#5a5e6c');
  p.rect(1, 2, 30, 11, '#c8ccd0');
  p.rect(0, 7, 32, 1, '#5a5e6c');
  const colors = ['#c8323a', '#e8c040', '#3a6ae8', '#40a040', '#e8782a', '#a050a0'];
  for (let i = 0; i < 9; i++) {
    p.rect(2 + i * 3, 3, 2, 3, colors[i % colors.length]);
    p.rect(2 + i * 3, 9, 2, 3, colors[(i + 3) % colors.length]);
  }
  p.rect(0, 14, 32, 2, 'rgba(0,0,0,0.25)');
}

// Store counter top (beige) with a wood front.
function drawStoreCounter(p) {
  p.rect(0, 2, 16, 5, '#e8dcc0'); p.rect(0, 6, 16, 1, '#b8a888');
  p.rect(0, 7, 16, 9, '#8a5a33'); p.rect(0, 10, 16, 1, '#6a4428');
}

// A vehicle seen from above, 32x48 across 2x3 tiles, front at the top.
// Ben's truck is lifted (big tires sticking out) with an open bed at the back.
function drawVehicle(p, color, shade, truck) {
  const tire = (x, y) => { p.rect(x, y, 5, 9, '#1a1a20'); p.rect(x + 1, y + 1, 3, 7, '#2a2a30'); };
  if (truck) { tire(1, 6); tire(26, 6); tire(1, 33); tire(26, 33); }
  else { tire(3, 7); tire(24, 7); tire(3, 33); tire(24, 33); }
  const x0 = truck ? 4 : 5, w = truck ? 24 : 22;
  p.rect(x0, 2, w, 44, '#181425');
  p.rect(x0 + 1, 3, w - 2, 42, color);
  p.rect(x0 + 1, 3, w - 2, 2, shade);                   // front bumper edge
  p.rect(x0 + 3, 4, 2, 2, '#f8f0c0'); p.rect(x0 + w - 5, 4, 2, 2, '#f8f0c0'); // headlights
  p.rect(x0 + 3, 10, w - 6, 6, '#8ab8d8');               // windshield
  p.rect(x0 + 4, 11, 3, 2, '#c8e0f0');
  p.rect(x0 + 2, 16, w - 4, 8, shade);                    // roof
  if (truck) {
    p.rect(x0 + 3, 26, w - 6, 17, '#3a2a20');             // open bed
    p.rect(x0 + 3, 26, w - 6, 1, '#181425');
    for (let y = 29; y < 43; y += 3) p.rect(x0 + 3, y, w - 6, 1, '#4a382a');
  } else {
    p.rect(x0 + 3, 25, w - 6, 5, '#8ab8d8');              // back window
    p.rect(x0 + 2, 31, w - 4, 12, shade);                 // trunk
  }
  p.rect(x0 + 2, 43, 3, 2, '#c8323a'); p.rect(x0 + w - 5, 43, 3, 2, '#c8323a'); // taillights
}

// Hallway lockers, 16x32: the top on the upper wall, the bottom on the lower wall.
function drawLockers(p) {
  p.rect(0, 2, 16, 30, '#3a1014');
  for (const x of [0, 8]) {
    p.rect(x + 1, 3, 6, 28, WHEATMORE.red);
    p.rect(x + 1, 3, 6, 1, '#e85a5a');
    for (const y of [6, 8, 10]) p.rect(x + 2, y, 4, 1, WHEATMORE.dark);
    p.rect(x + 5, 18, 1, 3, '#c8ccd0');
  }
}

// Flat-top grill with patties, 32x16 across two tiles.
function drawGrill(p) {
  p.rect(0, 2, 32, 14, '#9aa0ac');
  p.rect(1, 3, 30, 8, '#2a2a30');
  for (const x of [3, 10, 18, 25]) { p.rect(x, 5, 5, 4, '#6a3a1a'); p.rect(x + 1, 5, 3, 1, '#8a5a2a'); }
  p.rect(1, 12, 30, 1, '#5a5e6c');
  for (const x of [4, 14, 24]) p.rect(x, 13, 3, 2, '#22222a');
}

// Menu board on the kitchen wall, facing the customers.
function drawMenuBoard(p, item) {
  p.rect(1, 2, 14, 11, '#5e3b20');
  p.rect(2, 3, 12, 9, '#22222a');
  if (item === 'burger') { p.rect(4, 4, 8, 2, '#d89a48'); p.rect(4, 6, 8, 1, '#6a3a1a'); p.rect(4, 7, 8, 1, '#40a040'); p.rect(4, 8, 8, 2, '#d89a48'); }
  if (item === 'fries') { p.rect(5, 6, 6, 4, '#c8323a'); for (let x = 5; x < 11; x += 2) p.rect(x, 4, 1, 3, '#f0c040'); }
  if (item === 'biscuit') { p.rect(4, 5, 8, 4, '#d89a48'); p.rect(4, 5, 8, 1, '#f0c070'); }
  p.rect(3, 10, 10, 1, '#f4f4f4');
}

// Big wooden cross over the church stage, 32x16 across two wall tiles.
function drawBigCross(p) {
  p.rect(14, 1, 4, 15, '#8a5a33');
  p.rect(8, 4, 16, 4, '#8a5a33');
  p.rect(14, 1, 1, 15, '#b07d50');
  p.rect(8, 4, 16, 1, '#b07d50');
}

// Church pew seen from behind: backrest on top, seat below. Ends get armrests.
function drawPew(p, leftEnd, rightEnd) {
  p.rect(0, 3, 16, 5, '#7a4a28');
  p.rect(0, 3, 16, 1, '#a8744a');
  p.rect(0, 8, 16, 4, '#5e3b20');
  p.rect(0, 12, 16, 1, '#3e2614');
  if (leftEnd) { p.rect(0, 2, 2, 12, '#5e3b20'); p.rect(0, 2, 2, 1, '#a8744a'); }
  if (rightEnd) { p.rect(14, 2, 2, 12, '#5e3b20'); p.rect(14, 2, 2, 1, '#a8744a'); }
}

function drawDoorPanel(p) {
  p.rect(2, 1, 12, 15, '#8a5a33');
  for (const [x, y] of [[4, 3], [9, 3], [4, 9], [9, 9]]) p.rect(x, y, 3, 4, '#7a4a28');
  p.px(12, 9, '#e0c060');
}

function counterBase(p) {
  p.rect(0, 0, 16, 5, '#d8d8d0');
  p.rect(0, 5, 16, 1, '#a8a8a0');
  p.rect(0, 6, 16, 10, '#b07d50');
  p.rect(7, 7, 2, 9, '#8a5a33');
  p.px(5, 10, '#e0c060'); p.px(10, 10, '#e0c060');
}

// Tiny 3x5 capitals for signs (Label Shopper, Wheatmore, Mom's poster).
const SIGN_GLYPHS = {
  W: ['x.x', 'x.x', 'x.x', 'xxx', 'x.x'], T: ['xxx', '.x.', '.x.', '.x.', '.x.'], M: ['x.x', 'xxx', 'x.x', 'x.x', 'x.x'],
  I: ['xxx', '.x.', '.x.', '.x.', 'xxx'], C: ['.xx', 'x..', 'x..', 'x..', '.xx'],
  L: ['x..', 'x..', 'x..', 'x..', 'xxx'], A: ['.x.', 'x.x', 'xxx', 'x.x', 'x.x'], B: ['xx.', 'x.x', 'xx.', 'x.x', 'xx.'],
  E: ['xxx', 'x..', 'xx.', 'x..', 'xxx'], S: ['.xx', 'x..', '.x.', '..x', 'xx.'], H: ['x.x', 'x.x', 'xxx', 'x.x', 'x.x'],
  O: ['.x.', 'x.x', 'x.x', 'x.x', '.x.'], P: ['xx.', 'x.x', 'xx.', 'x..', 'x..'], R: ['xx.', 'x.x', 'xx.', 'x.x', 'x.x'],
  G: ['.xx', 'x..', 'x.x', 'x.x', '.xx'], N: ['x.x', 'xxx', 'xxx', 'x.x', 'x.x'], Y: ['x.x', 'x.x', '.x.', '.x.', '.x.'],
};

// Write `text` in the tiny sign capitals with its left edge at x.
function signText(p, text, x, y, color) {
  for (const ch of text) {
    if (ch !== ' ') SIGN_GLYPHS[ch].forEach((row, gy) => [...row].forEach((c, i) => { if (c === 'x') p.px(x + i, y + gy, color); }));
    x += 4;
  }
}

// Mom's poster for the Friday game, 48x16 across three tiles: "GO BENNY / BOO" in glitter.
function drawMomSign(p) {
  p.rect(2, 0, 44, 15, K);
  p.rect(3, 1, 42, 13, '#f4f4f4');
  signText(p, 'GO BENNY', 9, 2, '#e07aa0');
  signText(p, 'BOO', 19, 8, '#e07aa0');
  for (const [x, y] of [[5, 3], [41, 4], [7, 11], [38, 10], [15, 12], [32, 3], [27, 12]]) p.px(x, y, '#e8c040');
}

// Write `text` centered in a sign `w` pixels wide.
function signCentered(p, text, w, y, color) {
  signText(p, text, Math.floor((w - (text.length * 4 - 1)) / 2), y, color);
}

// The sign over the school's front doors, 48x16 across three tiles.
function drawWheatmoreSign(p) {
  p.rect(0, 1, 48, 14, WHEATMORE.black);
  p.rect(1, 2, 46, 12, WHEATMORE.red);
  p.rect(1, 2, 46, 1, '#e85a5a');
  signCentered(p, 'WHEATMORE', 48, 3, WHEATMORE.white);
  signCentered(p, 'HIGH SCHOOL', 48, 9, WHEATMORE.white);
}

// A red and white "GO WARRIORS" banner hung on the wall, 48x16 across three tiles.
function drawWarriorsBanner(p) {
  p.rect(1, 2, 46, 11, WHEATMORE.black);
  p.rect(2, 3, 44, 9, WHEATMORE.red);
  p.rect(2, 11, 44, 1, WHEATMORE.dark);
  for (const x of [3, 44]) p.rect(x, 0, 1, 3, '#9aa0ac');   // hanging strings
  signCentered(p, 'GO WARRIORS', 48, 5, WHEATMORE.white);
}

// Midfield logo: a big white-edged red W, 32x32 across 2x2 tiles.
function drawMidfieldW(p) {
  const rows = [
    'xxxx......xxxx......xxxx',
    'xxxx......xxxx......xxxx',
    '.xxxx....xxxxxx....xxxx.',
    '.xxxx....xxxxxx....xxxx.',
    '..xxxx..xxxxxxxx..xxxx..',
    '..xxxx..xxxx.xxxx.xxxx..',
    '...xxxxxxxx...xxxxxxx...',
    '...xxxxxxx....xxxxxxx...',
    '....xxxxxx.....xxxxx....',
    '....xxxxx......xxxxx....',
    '.....xxxx.......xxx.....',
    '.....xxx........xxx.....',
  ];
  // 24x12 pattern, each row drawn 2px tall: a white edge first, then the red letter on top.
  const ox = 4, oy = 4;
  for (const [color, grow] of [[WHEATMORE.white, 1], [WHEATMORE.red, 0]]) {
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === 'x') p.rect(ox + x - grow, oy + y * 2 - grow, 1 + grow * 2, 2 + grow * 2, color);
    }));
  }
}

// El Rancho booth table from above, 32x16: red booth seats on both sides of a
// wood table. The boys' table has a sizzling fajita skillet and chips and salsa.
function drawBooth(p, fajitas) {
  p.rect(0, 0, 32, 4, '#a8303a'); p.rect(0, 0, 32, 1, '#c84a50');
  p.rect(0, 12, 32, 4, '#a8303a'); p.rect(0, 15, 32, 1, '#7e1d26');
  p.rect(1, 4, 30, 8, '#8a5a33'); p.rect(1, 4, 30, 1, '#b07d50');
  if (!fajitas) { p.rect(13, 6, 6, 4, '#f4f4f4'); p.rect(14, 7, 4, 2, '#e8c040'); return; }
  p.rect(4, 5, 10, 6, '#22222a'); p.rect(14, 7, 4, 2, '#22222a');      // skillet + handle
  p.rect(5, 6, 3, 2, '#c87830'); p.rect(8, 7, 3, 2, '#40a040'); p.rect(6, 8, 3, 2, '#c8323a'); p.px(10, 6, '#e8c040');
  p.px(6, 3, '#f4f4f4'); p.px(9, 2, '#f4f4f4'); p.px(11, 3, '#f4f4f4');  // sizzle steam
  p.rect(20, 6, 6, 4, '#e8c040'); p.rect(21, 5, 2, 1, '#e8c040');      // chips
  p.rect(27, 7, 3, 3, '#c8323a');                                       // salsa
}

// The bonfire from above, 32x32: a ring of rocks, crossed logs and flames.
function drawBonfire(p) {
  for (const [x, y] of [[5, 7], [12, 3], [21, 4], [26, 10], [27, 19], [22, 26], [12, 27], [5, 21], [3, 14]]) {
    p.rect(x, y, 4, 3, K); p.rect(x + 1, y, 2, 2, '#8a8e96');
  }
  p.rect(8, 15, 16, 4, '#2a1a10'); p.rect(14, 9, 4, 16, '#2a1a10');
  p.rect(9, 16, 14, 2, '#6a4428'); p.rect(15, 10, 2, 14, '#6a4428');
  p.rect(10, 10, 12, 12, '#d8481a');
  p.rect(9, 12, 14, 8, '#d8481a'); p.rect(12, 8, 8, 16, '#d8481a');
  p.rect(12, 11, 8, 10, '#f09020'); p.rect(14, 9, 4, 14, '#f09020');
  p.rect(14, 13, 4, 6, '#f8d850'); p.rect(15, 11, 2, 9, '#f8d850');
  p.px(15, 14, '#fff8d0'); p.px(16, 15, '#fff8d0');
}

// "LABEL SHOPPER" sign, 64x16 across four upper-wall tiles.
function drawThriftSign(p) {
  p.rect(1, 2, 62, 12, '#5a2a6a');
  p.rect(2, 3, 60, 10, '#8a4aa0');
  let x = 7;
  for (const ch of 'LABEL SHOPPER') {
    if (ch !== ' ') SIGN_GLYPHS[ch].forEach((row, y) => [...row].forEach((c, i) => { if (c === 'x') p.px(x + i, 6 + y, '#f8d030'); }));
    x += 4;
  }
}

// Clothes rack seen from the front, 32x16 across two tiles: a chrome bar with
// shirts and jackets of every color hanging off it.
function drawRack(p, seed) {
  p.rect(1, 2, 30, 1, '#c8ccd0');
  p.rect(1, 2, 1, 14, '#9aa0ac'); p.rect(30, 2, 1, 14, '#9aa0ac');
  p.rect(0, 15, 4, 1, '#5a5e6c'); p.rect(28, 15, 4, 1, '#5a5e6c');
  const colors = ['#c8323a', '#3d5a9e', '#e8c040', '#4fa060', '#e07aa0', '#8a5a33', '#a9adb5', '#e8782a'];
  for (let i = 0; i < 7; i++) {
    const x = 3 + i * 4, c = colors[(i * 3 + seed) % colors.length], len = 8 + ((i + seed) % 3) * 2;
    p.px(x + 1, 3, '#5a5e6c');
    p.rect(x, 4, 4, len, K);
    p.rect(x, 4, 3, len - 1, c);
    p.rect(x, 4, 1, len - 1, 'rgba(255,255,255,0.25)');
  }
}

// Housewares shelf from the front, 32x16: lamps, mugs, VHS tapes and a creepy doll.
function drawJunkShelf(p) {
  p.rect(0, 0, 32, 16, '#5e3b20');
  p.rect(1, 1, 30, 6, '#3e2614'); p.rect(1, 8, 30, 6, '#3e2614');
  p.rect(0, 14, 32, 2, '#7a4f2c');
  p.rect(3, 2, 5, 2, '#e8c040'); p.rect(5, 4, 1, 3, '#c8ccd0');               // lamp
  p.rect(10, 4, 3, 3, '#f4f4f4'); p.rect(14, 4, 3, 3, '#c8323a');             // mugs
  p.rect(20, 2, 3, 3, '#f3c9a6'); p.rect(20, 5, 3, 2, '#e07aa0'); p.px(21, 3, K); // doll
  p.rect(26, 3, 3, 4, '#4fa060');                                             // vase
  for (let i = 0; i < 6; i++) p.rect(3 + i * 3, 9, 2, 5, i % 2 ? '#22222a' : '#3a3a48'); // VHS tapes
  p.rect(23, 10, 6, 4, '#a9adb5'); p.rect(24, 11, 4, 2, '#3a6ae8');           // tiny TV
}

// Mannequin in the western wear: camo cowboy hat, a "Mike's Plumbing" jacket and
// a belt buckle shaped like Texas.
function drawMannequin(p) {
  p.rect(7, 14, 2, 2, '#9aa0ac'); p.rect(5, 15, 6, 1, '#5a5e6c');             // stand
  p.rect(1, 2, 14, 1, '#4a5a34'); p.rect(4, 0, 8, 2, '#6a7a4a'); p.px(6, 0, '#3a4a28'); p.px(9, 1, '#8a8a5a'); // camo hat
  p.rect(6, 3, 4, 3, '#e8dcc8');                                              // head
  p.rect(4, 6, 8, 6, '#3d5a9e'); p.rect(3, 7, 1, 5, '#2a3f73'); p.rect(12, 7, 1, 5, '#2a3f73'); // jacket
  p.rect(5, 7, 3, 2, '#f4f4f4');                                              // name patch
  p.rect(4, 11, 8, 1, '#5a3a22'); p.rect(7, 11, 2, 2, '#e8c040');             // belt + buckle
  p.rect(5, 12, 6, 2, '#26304f');                                             // jeans
}

// Fitting room curtain, 16x32: top on the upper wall, bottom on the lower wall.
function drawFittingRoom(p) {
  p.rect(1, 3, 14, 29, '#5e3b20');
  p.rect(2, 4, 12, 1, '#c8ccd0');
  for (let x = 2; x < 14; x += 3) { p.rect(x, 5, 2, 27, '#a8303a'); p.rect(x + 2, 5, 1, 27, '#7e1d26'); }
}

// The hunting knife the officer finds in Ben's truck bed (a prop on the truck).
function drawKnife(p) {
  p.rect(3, 6, 6, 2, '#d8dce0'); p.rect(3, 6, 6, 1, '#f4f4f4'); p.px(2, 7, '#d8dce0');
  p.rect(9, 5, 1, 4, '#5a5e6c');
  p.rect(10, 6, 4, 2, '#6a4428'); p.rect(10, 6, 4, 1, '#8a5a33');
}

// Classroom whiteboard, 64x16 across four upper-wall tiles: Stepp's notes,
// a doodle somebody drew in the corner, and a marker tray (the ammo).
function drawWhiteboard(p) {
  p.rect(0, 1, 64, 13, '#9aa0ac');
  p.rect(1, 2, 62, 10, '#f8f8f4');
  for (const [x, y, w] of [[4, 4, 18], [4, 6, 12], [4, 8, 16], [28, 4, 10], [28, 6, 14]]) p.rect(x, y, w, 1, '#3a5a9a');
  p.rect(44, 4, 6, 1, '#c8323a'); p.rect(46, 3, 2, 3, '#c8323a');                 // "+"
  p.rect(52, 6, 6, 3, '#4fa060'); p.px(53, 7, K); p.px(56, 7, K); p.rect(54, 9, 2, 1, '#4fa060'); // a frog. It's about frogs.
  p.rect(2, 12, 60, 2, '#7a808c');
  for (const [x, c] of [[8, '#c8323a'], [12, '#3a6ae8'], [16, '#22222a'], [20, '#4fa060']]) p.rect(x, 12, 3, 1, c);
}

// Teacher's desk from the front, 32x16: papers, an apple and a mug.
function drawTeacherDesk(p) {
  p.rect(0, 4, 32, 12, '#6a4428');
  p.rect(0, 4, 32, 3, '#8a5a33'); p.rect(0, 7, 32, 1, '#4a2e18');
  p.rect(3, 9, 10, 5, '#5e3b20'); p.rect(19, 9, 10, 5, '#5e3b20'); p.px(8, 11, '#e0c060'); p.px(24, 11, '#e0c060');
  p.rect(4, 1, 7, 4, '#f4f4f4'); p.rect(5, 2, 5, 1, '#9aa0ac');                  // papers
  p.rect(16, 2, 3, 3, '#c8323a'); p.px(17, 1, '#4fa060');                       // apple
  p.rect(24, 1, 4, 4, '#f4f4f4'); p.rect(28, 2, 1, 2, '#f4f4f4');               // mug
}

// Student desk from the front: a tan top on a metal frame. Ben's has an F-16
// carved into it.
function drawStudentDesk(p, ben) {
  p.rect(2, 3, 12, 6, '#181425');
  p.rect(3, 4, 10, 4, '#d8b888'); p.rect(3, 4, 10, 1, '#e8cca0');
  p.rect(3, 9, 1, 6, '#7a808c'); p.rect(12, 9, 1, 6, '#7a808c'); p.rect(3, 12, 10, 1, '#7a808c');
  if (ben) { p.rect(5, 6, 6, 1, '#8a6a48'); p.rect(7, 5, 1, 3, '#8a6a48'); p.px(10, 5, '#8a6a48'); p.px(10, 7, '#8a6a48'); }
}

// Bathroom stall door: grey-green metal. Open = swung in against the partition.
function drawStallDoor(p, open) {
  if (open) { p.rect(0, 0, 3, 16, '#6a8a80'); p.rect(0, 0, 3, 1, '#8aaaa0'); return; }
  p.rect(0, 1, 16, 15, '#6a8a80'); p.rect(0, 1, 16, 1, '#8aaaa0');
  p.rect(11, 8, 3, 2, '#c8323a'); // "OCCUPIED"... or is it
}

function objectDefs() {
  return [
    // --- Ben's room ---
    { name: 'posterAF', solid: true, draw: p => p.pixels(POSTER_AF, POSTER_AF_PAL, 2, 2, 'posterAF') },
    { name: 'posterTruck', solid: true, draw: p => p.pixels(POSTER_TRUCK, POSTER_TRUCK_PAL, 2, 3, 'posterTruck') },
    { name: 'flag', solid: true, draw: p => p.pixels(FLAG, FLAG_PAL, 2, 4, 'flag') },
    { name: 'deer', solid: true, draw: p => p.pixels(DEER, DEER_PAL, 1, 2, 'deer') },
    {
      name: 'windowBen', solid: true, draw: windowObj(p => {
        for (let y = 4; y < 12; y += 2) p.rect(3, y, 10, 1, '#e8e4dc');   // blinds
        p.rect(8, 8, 3, 1, '#8fcbea');                                    // the bent one
        p.rect(0, 1, 3, 14, '#6a6e78'); p.rect(13, 1, 3, 14, '#6a6e78');  // gray curtains
        p.rect(2, 1, 1, 14, '#8a8e98'); p.rect(13, 1, 1, 14, '#8a8e98');
      }),
    },
    { name: 'bedHead', solid: true, draw: p => bed(p, '#3a2a20', benBlanket) },
    { name: 'bedFoot', solid: true, draw: p => bed(p.shift(0, -16), '#3a2a20', benBlanket) },
    {
      name: 'nightstand', solid: true, draw: p => {
        p.rect(1, 5, 14, 11, K);
        p.rect(2, 6, 12, 9, '#8a5a33');
        p.rect(2, 6, 12, 2, '#b07d50');
        p.rect(2, 10, 12, 1, '#5e3b20');
        p.px(7, 12, '#e0c060');
        p.rect(3, 0, 6, 3, '#e8d8a0');
        p.rect(5, 3, 2, 3, '#4a2e18');
        p.rect(10, 2, 2, 4, '#3fa04a');
        p.px(10, 2, '#c0c0c0'); p.px(11, 2, '#c0c0c0');
      },
    },
    { name: 'deskL', solid: true, draw: p => drawDesk(p) },
    { name: 'deskR', solid: true, draw: p => drawDesk(p.shift(-16, 0)) },
    { name: 'beanbag', solid: true, draw: p => p.pixels(BEANBAG, BEANBAG_PAL, 1, 5, 'beanbag') },
    {
      name: 'gamingChair', solid: true, draw: p => {
        p.rect(4, 0, 8, 10, '#22222a');
        p.rect(6, 1, 1, 8, '#c8323a'); p.rect(9, 1, 1, 8, '#c8323a');
        p.rect(3, 9, 10, 3, '#2a2a34');
        p.rect(7, 12, 2, 2, '#4a4a52');
        p.px(4, 14, '#4a4a52'); p.px(7, 15, '#4a4a52'); p.px(11, 14, '#4a4a52');
      },
    },
    { name: 'guitar', solid: true, draw: p => p.pixels(GUITAR, GUITAR_PAL, 3, 0, 'guitar') },
    {
      name: 'dresser', solid: true, draw: p => {
        p.rect(1, 1, 14, 15, '#4a2e18');
        p.rect(2, 2, 12, 13, '#8a5a33');
        p.rect(2, 2, 12, 2, '#b07d50');
        p.rect(3, 5, 10, 4, '#7a4a28');
        p.rect(3, 10, 10, 4, '#7a4a28');
        p.rect(7, 7, 2, 1, '#e0c060');
        p.rect(7, 12, 2, 1, '#e0c060');
        p.rect(4, 6, 3, 1, '#e6e6e2'); // sock hanging out
      },
    },
    {
      name: 'hamper', solid: true, draw: p => {
        p.rect(2, 6, 12, 10, '#a07840');
        for (let y = 7; y < 16; y += 2) p.rect(3, y, 10, 1, '#c8a060');
        p.rect(2, 3, 5, 4, '#c8323a');
        p.rect(6, 2, 5, 5, '#3d5a9e');
        p.rect(10, 4, 4, 3, '#a9adb5');
        p.rect(12, 6, 2, 6, '#e6e6e2');
      },
    },
    // Floor mess: Ben walks right over all of it.
    { name: 'clothes', solid: false, draw: p => p.pixels(CLOTHES, CLOTHES_PAL, 2, 8, 'clothes') },
    {
      name: 'pizzaBox', solid: false, draw: p => {
        p.rect(1, 3, 14, 11, '#a07848'); p.rect(2, 4, 12, 9, '#c8a070');
        p.rect(3, 5, 10, 7, '#b88a50');
        p.rect(4, 6, 4, 4, '#e8c040'); p.rect(5, 7, 1, 1, '#c8323a'); p.rect(7, 8, 1, 1, '#c8323a'); // one slice left
        p.px(10, 9, '#8a5a2a'); p.px(11, 7, '#8a5a2a');
      },
    },
    {
      name: 'chips', solid: false, draw: p => {
        p.rect(4, 4, 8, 9, '#e05a30'); p.rect(4, 4, 8, 2, '#c8402a'); p.rect(6, 7, 4, 3, '#f0c040');
        for (const [x, y] of [[2, 13], [13, 12], [11, 14], [3, 10]]) p.px(x, y, '#f0c040');
      },
    },
    {
      name: 'socks', solid: false, draw: p => {
        p.rect(2, 9, 5, 2, '#f4f4f4'); p.rect(5, 6, 2, 4, '#f4f4f4'); p.rect(2, 10, 2, 1, '#a9adb5');
        p.rect(9, 3, 2, 5, '#e8e8e8'); p.rect(9, 7, 5, 2, '#e8e8e8'); p.rect(12, 8, 2, 1, '#a9adb5');
      },
    },
    {
      name: 'cans', solid: false, draw: p => {
        p.rect(3, 8, 2, 4, '#3fa04a'); p.rect(3, 8, 2, 1, '#c0c0c0');
        p.rect(9, 4, 4, 2, '#4080f0'); p.rect(12, 4, 1, 2, '#c0c0c0');
        p.rect(10, 11, 3, 2, '#3fa04a'); p.px(11, 11, '#c0c0c0');
      },
    },
    { name: 'trash', solid: true, draw: p => p.pixels(TRASH, TRASH_PAL, 4, 4, 'trash') },
    { name: 'helmet', solid: true, draw: p => p.pixels(HELMET, HELMET_PAL, 2, 5, 'helmet') },
    { name: 'rugBen', solid: false, draw: p => { p.rect(0, 0, 16, 16, '#3a3f4a'); speckle(p, ['#454b58', '#30343e'], 10); } },
    // Ben's wall: cowboy hat, rifle rack with his helmet, bow, a little sign.
    {
      name: 'cowboyHat', solid: true, draw: p => {
        p.rect(6, 4, 4, 1, '#d8c08a'); p.rect(5, 5, 6, 4, '#d8c08a'); p.rect(7, 4, 2, 1, '#c4a870');
        p.rect(5, 8, 6, 1, '#5e3b20');
        p.rect(2, 9, 12, 2, '#d8c08a'); p.px(1, 10, '#c4a870'); p.px(14, 10, '#c4a870');
        p.rect(3, 11, 10, 1, '#b89a68');
      },
    },
    {
      name: 'gunRack', solid: true, draw: p => {
        p.rect(2, 6, 2, 5, '#8a5a33'); p.rect(12, 6, 2, 5, '#8a5a33');
        p.rect(0, 8, 11, 1, '#3a3a42'); p.rect(9, 7, 6, 3, '#6b4226'); p.px(6, 9, '#3a3a42');
        p.rect(3, 2, 6, 4, '#c8323a'); p.rect(3, 2, 6, 1, '#e85a5a'); p.rect(7, 4, 3, 2, '#9aa0ac');  // helmet on top
      },
    },
    {
      name: 'compoundBow', solid: true, draw: p => {
        p.rect(5, 2, 2, 12, '#2a2a30'); p.rect(4, 1, 3, 2, '#5a5a64'); p.rect(4, 13, 3, 2, '#5a5a64');
        p.rect(10, 2, 1, 12, '#d8d8d0'); p.px(9, 2, '#d8d8d0'); p.px(9, 13, '#d8d8d0');
        p.rect(6, 6, 2, 4, '#4a4a52'); p.px(8, 7, '#40e080');
      },
    },
    {
      name: 'woodSign', solid: true, draw: p => {
        p.px(6, 3, '#9aa0ac'); p.px(9, 3, '#9aa0ac');
        p.rect(3, 4, 10, 7, '#5e3b20'); p.rect(4, 5, 8, 5, '#b07d50');
        p.rect(5, 6, 6, 1, '#5e3b20'); p.rect(5, 8, 4, 1, '#5e3b20');
      },
    },
    {
      name: 'miniFridge', solid: true, draw: p => {
        p.rect(1, 2, 13, 14, '#181425'); p.rect(2, 3, 11, 12, '#d8d8d8'); p.rect(2, 3, 11, 3, '#ffffff');
        p.rect(10, 3, 3, 12, '#f4f4f4'); p.rect(10, 3, 1, 12, '#b8b8b8');   // the door, on the room side
        p.rect(13, 8, 2, 4, '#9aa0ac');                                     // handle
        p.rect(5, 0, 2, 3, '#3fa04a'); p.px(5, 0, '#c0c0c0');
      },
    },
    {
      name: 'gameShelf', solid: true, draw: p => {
        p.rect(1, 7, 14, 9, '#4a2e18'); p.rect(2, 8, 12, 7, '#8a5a33');
        p.rect(10, 8, 4, 7, '#a06a3a'); p.rect(10, 11, 4, 1, '#5e3b20');    // drawer fronts, on the room side
        p.px(13, 9, '#e0c060'); p.px(13, 13, '#e0c060');
        p.rect(2, 1, 6, 3, '#e8c040'); p.rect(2, 4, 8, 3, '#3fa04a'); p.rect(9, 2, 5, 5, '#c8323a'); p.rect(10, 3, 3, 1, '#f4f4f4');
      },
    },
    // --- Rest of the house ---
    // Stairs down to the basement (Ben can't go down): five rows, two tiles wide.
    ...[0, 1, 2, 3, 4].flatMap(level => ['L', 'R'].map((side, i) => ({
      name: `stairs${level}${side}`, solid: true, draw: q => drawStairs(q.shift(-i * 16, 0), level),
    }))),
    ...[['washer', '#8ab8d8'], ['dryer', '#5a5e6c']].map(([name, glass]) => ({
      name, solid: true, draw: p => {
        p.rect(1, 1, 14, 15, '#181425'); p.rect(2, 2, 12, 13, '#f0f0f0'); p.rect(2, 2, 12, 3, '#d8d8d8');
        p.px(4, 3, '#5a5e6c'); p.px(11, 3, '#5a5e6c');
        p.rect(5, 7, 6, 6, '#9aa0ac'); p.rect(6, 8, 4, 4, glass);
        if (name === 'dryer') { p.px(7, 10, '#c8323a'); p.px(8, 9, '#3a5aa8'); }
      },
    })),
    ...['L', 'R'].map((side, i) => ({
      // The living room couch, facing the TV (its back toward the bottom).
      name: `couch${side}`, solid: true, draw: q => {
        const p = q.shift(-i * 16, 0);
        p.rect(0, 3, 32, 13, '#181425'); p.rect(1, 4, 30, 11, '#7a5a3a');
        p.rect(3, 4, 12, 7, '#8e6a48'); p.rect(17, 4, 12, 7, '#8e6a48');
        p.rect(1, 11, 30, 4, '#5e4228'); p.rect(1, 4, 2, 9, '#5e4228'); p.rect(29, 4, 2, 9, '#5e4228');
        p.rect(4, 5, 4, 3, '#c8323a');
      },
    })),
    { name: 'bigTvL', solid: true, draw: p => drawTV(p) },
    { name: 'bigTvR', solid: true, draw: p => drawTV(p.shift(-16, 0)) },
    {
      name: 'recliner', solid: true, draw: p => {
        p.rect(2, 2, 13, 13, '#181425'); p.rect(3, 3, 11, 11, '#6b4226');
        p.rect(11, 3, 3, 11, '#4a2e18'); p.rect(3, 3, 8, 2, '#4a2e18'); p.rect(3, 12, 8, 2, '#4a2e18');
        p.rect(0, 6, 3, 5, '#6b4226');                                      // footrest
        p.rect(0, 6, 1, 5, '#181425');
      },
    },
    { name: 'livingRug', solid: false, draw: p => { p.rect(0, 0, 16, 16, '#8a3a2a'); speckle(p, ['#9a4a3a', '#7a2e20'], 10); } },
    {
      name: 'lamp', solid: true, draw: p => {
        p.rect(4, 1, 8, 5, '#f0e0b0'); p.rect(5, 6, 6, 1, '#d8c890');
        p.rect(7, 7, 2, 8, '#5e3b20'); p.rect(5, 14, 6, 2, '#3a2a20');
      },
    },
    {
      name: 'plant', solid: true, draw: p => {
        p.rect(5, 10, 6, 6, '#b0603a'); p.rect(4, 10, 8, 1, '#c87048');
        p.rect(3, 4, 4, 6, '#3f8a3a'); p.rect(9, 3, 4, 7, '#4fa04a'); p.rect(6, 1, 4, 9, '#5fb05a');
      },
    },
    {
      name: 'windowLiving', solid: true, draw: windowObj(p => {
        p.rect(1, 2, 2, 12, '#d8c8a0'); p.rect(13, 2, 2, 12, '#d8c8a0');
      }),
    },
    {
      // Ben's closet (the little room by the stairs): pool noodles, bags and boxes.
      name: 'closetJunk', solid: true, draw: p => {
        p.rect(2, 0, 2, 14, '#e8782a'); p.rect(5, 1, 2, 13, '#3fa04a');
        p.rect(8, 7, 7, 8, '#3a5aa8'); p.rect(9, 6, 5, 2, '#2a4a88');
      },
    },
    {
      name: 'closetBoxes', solid: true, draw: p => {
        p.rect(1, 6, 9, 9, '#c8a070'); p.rect(1, 6, 9, 1, '#e0c090'); p.rect(5, 6, 1, 9, '#a07848');
        p.rect(8, 1, 7, 6, '#b88a50'); p.rect(8, 3, 7, 1, '#a07848');
      },
    },
    {
      // Ben's clothes rack: the rod and the top of the shirts, then the rest of them.
      name: 'closetRackTop', solid: true, draw: p => {
        p.rect(0, 6, 16, 1, '#8a8f9a');
        for (const [x, shirt, stripe] of CLOSET_SHIRTS) {
          p.px(x + 1, 5, '#8a8f9a');
          p.rect(x, 7, 3, 9, shirt); p.rect(x + 1, 7, 1, 9, stripe);
        }
      },
    },
    {
      name: 'closetRack', solid: true, draw: p => {
        for (const [x, shirt, stripe] of CLOSET_SHIRTS) {
          p.rect(x, 0, 3, 8, shirt); p.rect(x + 1, 0, 1, 8, stripe); p.rect(x, 8, 3, 1, K);
        }
      },
    },

    // --- Bathroom ---
    {
      name: 'toilet', solid: true, draw: p => {
        p.rect(3, 0, 10, 6, '#9aa4ac'); p.rect(4, 1, 8, 4, '#f4f4f4');
        p.rect(4, 6, 8, 9, '#9aa4ac'); p.rect(3, 7, 10, 7, '#9aa4ac');
        p.rect(5, 7, 6, 7, '#f4f4f4'); p.rect(4, 8, 8, 5, '#f4f4f4');
        p.rect(6, 9, 4, 3, '#cfe0e8');
      },
    },
    {
      name: 'sink', solid: true, draw: p => {
        p.rect(1, 2, 14, 14, '#9aa4ac');
        p.rect(2, 3, 12, 4, '#c8ccd0');
        p.rect(4, 3, 8, 3, '#f4f8fa');
        p.rect(7, 1, 2, 2, '#c0c4c8');
        p.rect(2, 7, 12, 8, '#e8e4dc');
        p.rect(7, 8, 2, 7, '#c8c4bc');
        p.px(5, 11, '#9aa4ac'); p.px(10, 11, '#9aa4ac');
      },
    },
    {
      name: 'mirror', solid: true, draw: p => {
        p.rect(3, 3, 10, 11, '#c0c4c8');
        p.rect(4, 4, 8, 9, '#bfe0ec');
        p.px(5, 5, '#ffffff'); p.px(6, 6, '#ffffff'); p.px(5, 6, '#ffffff');
      },
    },
    {
      name: 'towel', solid: true, draw: p => {
        p.rect(2, 1, 12, 1, '#a0a4a8');
        p.rect(3, 2, 10, 9, '#3f6fa0');
        p.rect(3, 8, 10, 1, '#e8e8e8');
      },
    },
    { name: 'tub0', solid: true, draw: p => drawTub(p) },
    { name: 'tub1', solid: true, draw: p => drawTub(p.shift(0, -16)) },
    { name: 'tub2', solid: true, draw: p => drawTub(p.shift(0, -32)) },
    { name: 'bathMat', solid: false, draw: p => { p.rect(2, 0, 12, 16, '#5a8ac0'); for (let y = 2; y < 16; y += 4) p.rect(3, y, 10, 1, '#6a9ad0'); } },

    // --- Hallway ---
    // Walkable doors swap between these shut/open tiles as Ben comes near.
    { name: 'door', solid: false, draw: p => { p.rect(0, 0, 16, 16, '#e8e0d0'); drawDoorPanel(p); } },
    {
      name: 'doorOpen', solid: false, draw: p => {
        p.rect(0, 0, 2, 16, '#e8e0d0');
        p.rect(14, 0, 2, 16, '#e8e0d0');
        p.rect(0, 0, 16, 1, '#e8e0d0');
        p.rect(2, 1, 12, 3, 'rgba(0,0,0,0.3)');
        p.rect(2, 1, 3, 15, '#7a4a28'); // door swung open against the frame
        p.rect(2, 1, 1, 15, '#5e3b20');
      },
    },
    {
      name: 'sideDoor', solid: false, draw: p => {
        p.rect(0, 0, 16, 16, '#2a2030');
        p.rect(6, 0, 4, 16, '#8a5a33');
        p.rect(6, 0, 1, 16, '#b07d50');
        p.px(8, 9, '#e0c060');
      },
    },
    {
      name: 'sideDoorOpen', solid: false, draw: p => {
        p.rect(0, 0, 16, 1, '#2a2030');
        p.rect(0, 15, 16, 1, '#2a2030');
        p.rect(7, 1, 9, 3, '#8a5a33'); // door swung open against the wall
        p.rect(7, 1, 9, 1, '#b07d50');
      },
    },
    { name: 'doorClosed', solid: true, draw: p => { p.rect(1, 0, 14, 16, '#e8e0d0'); drawDoorPanel(p); } },
    {
      name: 'photos', solid: true, draw: p => {
        p.rect(2, 3, 6, 7, '#5a3a22'); p.rect(3, 4, 4, 5, '#a8c8e0'); p.rect(4, 6, 2, 3, '#c8323a');
        p.rect(9, 5, 5, 6, '#5a3a22'); p.rect(10, 6, 3, 4, '#e0b0a0'); p.px(11, 7, '#6b4226');
      },
    },
    { name: 'cross', solid: true, draw: p => { p.rect(7, 2, 2, 9, '#8a5a33'); p.rect(4, 4, 8, 2, '#8a5a33'); } },
    {
      name: 'runner', solid: false, draw: p => {
        p.rect(0, 2, 16, 12, '#8e2f2f');
        p.rect(0, 3, 16, 1, '#d9b45a'); p.rect(0, 12, 16, 1, '#d9b45a');
        p.rect(7, 6, 2, 4, '#d9b45a'); p.rect(6, 7, 4, 2, '#d9b45a');
      },
    },
    {
      name: 'doormat', solid: false, draw: p => {
        p.rect(1, 3, 14, 11, '#5a3a22');
        p.rect(2, 4, 12, 9, '#8a6a3a');
        p.rect(4, 7, 8, 1, '#5a3a22'); p.rect(4, 9, 8, 1, '#5a3a22');
      },
    },

    // --- Kitchen ---
    {
      name: 'upperCabinet', solid: true, draw: p => {
        p.rect(0, 3, 16, 10, '#8a5a33');
        p.rect(1, 4, 6, 8, '#b07d50'); p.rect(9, 4, 6, 8, '#b07d50');
        p.px(6, 8, '#e0c060'); p.px(9, 8, '#e0c060');
        p.rect(0, 13, 16, 1, '#5e3b20');
      },
    },
    {
      name: 'windowKitchen', solid: true, draw: windowObj(p => {
        for (const x of [1, 13]) {
          p.rect(x, 2, 2, 11, '#c8323a');
          for (let y = 2; y < 13; y += 2) p.px(x + (y % 4 === 2 ? 0 : 1), y, '#f0e0e0');
        }
      }),
    },
    { name: 'counter', solid: true, draw: counterBase },
    {
      name: 'counterSink', solid: true, draw: p => {
        counterBase(p);
        p.rect(3, 1, 10, 4, '#9aa4ac'); p.rect(4, 1, 8, 3, '#c8d4dc');
        p.rect(7, 0, 2, 1, '#c0c4c8');
      },
    },
    {
      name: 'microwave', solid: true, draw: p => {
        counterBase(p);
        p.rect(2, 0, 11, 5, '#2a2a30'); p.rect(3, 1, 6, 3, '#5a5a64'); p.rect(10, 1, 2, 3, '#40c040');
      },
    },
    {
      name: 'stove', solid: true, draw: p => {
        p.rect(0, 0, 16, 16, '#e8e8e8');
        p.rect(0, 0, 16, 7, '#2a2a30');
        for (const [x, y] of [[2, 1], [10, 1]]) { p.rect(x, y, 4, 4, '#55555f'); p.rect(x + 1, y + 1, 2, 2, '#2a2a30'); }
        p.rect(3, 8, 10, 1, '#a8a8a0');
        p.rect(3, 10, 10, 4, '#2a2a30');
      },
    },
    { name: 'fridgeTop', solid: true, draw: p => drawFridge(p) },
    { name: 'fridgeBot', solid: true, draw: p => drawFridge(p.shift(0, -16)) },
    { name: 'tableTL', solid: true, draw: p => drawTable(p) },
    { name: 'tableTR', solid: true, draw: p => drawTable(p.shift(-16, 0)) },
    { name: 'tableBL', solid: true, draw: p => drawTable(p.shift(0, -16)) },
    { name: 'tableBR', solid: true, draw: p => drawTable(p.shift(-16, -16)) },
    {
      // A prop: drawn centered on the 2x2 table (placed with a +8,+8 offset in maps.js).
      name: 'breakfastFood', solid: false, draw: p => {
        p.pixels(BREAKFAST, BREAKFAST_PAL, 0, 4, 'breakfast');
      },
    },
    ...['meatloaf', 'beans', 'chicken', 'chili'].map(kind => ({
      name: `dinner${kind[0].toUpperCase()}${kind.slice(1)}`, solid: false, draw: p => drawDinner(p, kind),
    })),
    { name: 'chairR', solid: true, draw: p => drawSideChair(p, 1) },
    { name: 'chairL', solid: true, draw: p => drawSideChair(p, -1) },

    // --- Sam's room ---
    {
      name: 'windowSam', solid: true, draw: windowObj(p => {
        for (const x of [1, 13]) { p.rect(x, 2, 2, 11, '#e8c040'); p.rect(x, 2, 1, 11, '#c8a030'); }
      }),
    },
    { name: 'dinoPoster', solid: true, draw: p => p.pixels(DINO_POSTER, DINO_POSTER_PAL, 2, 3, 'dinoPoster') },
    { name: 'samBedHead', solid: true, draw: p => bed(p, '#3f6fa0', starBlanket) },
    { name: 'samBedFoot', solid: true, draw: p => bed(p.shift(0, -16), '#3f6fa0', starBlanket) },
    {
      name: 'toybox', solid: true, draw: p => {
        p.rect(4, 2, 4, 4, '#4080f0'); p.px(5, 3, '#a0c0ff');
        p.rect(10, 2, 3, 4, '#8a5a33'); p.px(10, 2, '#5e3b20');
        p.rect(1, 5, 14, 11, K);
        p.rect(2, 6, 12, 9, '#c8323a');
        p.rect(2, 6, 12, 2, '#e8c040');
      },
    },
    {
      name: 'toys', solid: true, draw: p => {
        p.rect(2, 9, 3, 3, '#e04040');
        p.rect(6, 11, 3, 3, '#e8c040');
        p.rect(10, 7, 3, 3, '#4080f0');
        p.rect(9, 12, 5, 2, '#40a040'); p.px(10, 14, K); p.px(13, 14, K);
      },
    },
    // --- Garage ---
    {
      name: 'pegboard', solid: true, draw: p => {
        p.rect(1, 2, 14, 12, '#c8a070');
        for (let y = 4; y < 14; y += 3) for (let x = 3; x < 15; x += 3) p.px(x, y, '#8a6a4a');
        p.rect(3, 4, 1, 7, '#b8bcc8'); p.rect(2, 4, 3, 1, '#b8bcc8');   // wrench
        p.rect(7, 5, 1, 7, '#8a5a33'); p.rect(6, 4, 3, 2, '#5a5a64');   // hammer
        p.rect(10, 5, 4, 5, '#c8ccd0'); p.rect(10, 5, 4, 1, '#c8323a'); // saw
      },
    },
    {
      name: 'garageDoorTop', solid: true, draw: p => {
        p.rect(0, 2, 16, 14, '#c8ccd0');
        p.rect(0, 2, 16, 1, '#7a7670');
        for (let y = 6; y < 16; y += 4) p.rect(0, y, 16, 1, '#a0a4a8');
      },
    },
    {
      name: 'garageDoorBottom', solid: true, draw: p => {
        p.rect(0, 0, 16, 16, '#c8ccd0');
        for (let y = 2; y < 16; y += 4) p.rect(0, y, 16, 1, '#a0a4a8');
        p.rect(0, 14, 16, 2, '#3a3a40');
        p.rect(6, 8, 4, 1, '#5a5a64');
      },
    },
    { name: 'garageFridgeTop', solid: true, draw: p => drawFridge(p, false) },
    { name: 'garageFridgeBot', solid: true, draw: p => drawFridge(p.shift(0, -16), false) },
    { name: 'benchL', solid: true, draw: p => drawBench(p) },
    { name: 'benchR', solid: true, draw: p => drawBench(p.shift(-16, 0)) },
    {
      name: 'toolChest', solid: true, draw: p => {
        p.rect(2, 2, 12, 13, '#7e1d26');
        p.rect(3, 3, 10, 11, '#c8323a');
        for (const y of [6, 9, 12]) p.rect(3, y, 10, 1, '#7e1d26');
        for (const y of [4, 7, 10, 13]) p.rect(6, y, 4, 1, '#b8bcc8');
        p.px(3, 15, K); p.px(12, 15, K);
      },
    },
    { name: 'bikeL', solid: true, draw: p => drawBike(p) },
    { name: 'bikeR', solid: true, draw: p => drawBike(p.shift(-16, 0)) },
    {
      name: 'tires', solid: true, draw: p => {
        for (const y of [3, 7, 11]) {
          p.rect(2, y, 12, 4, '#22222a');
          p.rect(3, y + 1, 10, 1, '#3a3a44');
          p.rect(6, y + 1, 4, 2, '#4a4a52');
        }
      },
    },
    {
      name: 'oilStain', solid: false, draw: p => {
        p.rect(3, 5, 9, 6, 'rgba(30,30,40,0.35)');
        p.rect(5, 4, 5, 8, 'rgba(30,30,40,0.35)');
        p.rect(11, 9, 2, 2, 'rgba(30,30,40,0.35)');
      },
    },
    {
      name: 'gasCan', solid: true, draw: p => {
        p.rect(4, 7, 9, 9, '#7e1d26');
        p.rect(5, 8, 7, 7, '#c8323a');
        p.rect(5, 5, 4, 2, K);
        p.rect(11, 4, 2, 4, '#e8c040');
      },
    },
    // --- Church ---
    {
      name: 'stainedGlass', solid: true, draw: p => {
        p.rect(4, 2, 8, 13, '#5e3b20');
        p.rect(5, 1, 6, 1, '#5e3b20');
        const glass = ['#c8323a', '#4080f0', '#e8c040', '#40a040'];
        for (let y = 3; y < 14; y += 2) for (let x = 5; x < 11; x += 2) p.rect(x, y, 2, 2, glass[(x + y) % 4]);
        p.rect(7, 2, 2, 12, '#5e3b20');
        p.rect(5, 8, 6, 1, '#5e3b20');
      },
    },
    { name: 'crossL', solid: true, draw: p => drawBigCross(p) },
    { name: 'crossR', solid: true, draw: p => drawBigCross(p.shift(-16, 0)) },
    {
      name: 'piano', solid: true, draw: p => {
        p.rect(1, 1, 14, 15, '#22222a');
        p.rect(2, 2, 12, 4, '#3a3a44');
        p.rect(2, 7, 12, 3, '#f4f4f4');
        for (let x = 3; x < 14; x += 2) p.rect(x, 7, 1, 2, '#22222a');
        p.rect(2, 12, 2, 4, '#3a3a44'); p.rect(12, 12, 2, 4, '#3a3a44');
      },
    },
    {
      name: 'micStand', solid: true, draw: p => {
        p.rect(7, 2, 2, 3, '#3a3a44'); p.rect(7, 1, 2, 1, '#9aa0ac');
        p.rect(8, 5, 1, 9, '#5a5a64');
        p.rect(5, 14, 7, 1, '#3a3a44');
      },
    },
    {
      name: 'pulpit', solid: true, draw: p => {
        p.rect(2, 3, 12, 13, '#5e3b20');
        p.rect(1, 2, 14, 3, '#8a5a33');
        p.rect(4, 6, 8, 8, '#7a4a28');
        p.rect(7, 7, 2, 6, '#e8c040'); p.rect(5, 9, 6, 2, '#e8c040');
      },
    },
    {
      name: 'flowers', solid: true, draw: p => {
        p.rect(5, 9, 6, 7, '#c8a878'); p.rect(5, 9, 6, 1, '#8a6038');
        p.rect(7, 4, 1, 5, '#40a040'); p.rect(9, 5, 1, 4, '#40a040');
        p.rect(5, 2, 3, 3, '#f4f4f4'); p.rect(9, 3, 3, 3, '#e8c040'); p.rect(3, 5, 3, 3, '#e080a0');
      },
    },
    {
      name: 'amp', solid: true, draw: p => {
        p.rect(2, 4, 12, 12, '#22222a');
        p.rect(3, 5, 10, 2, '#5a5a64');
        p.rect(3, 8, 10, 7, '#3a3a44');
        for (const x of [5, 8, 11]) p.px(x, 6, '#e8c040');
      },
    },
    { name: 'pewL', solid: true, draw: p => drawPew(p, true, false) },
    { name: 'pewM', solid: true, draw: p => drawPew(p, false, false) },
    { name: 'pewR', solid: true, draw: p => drawPew(p, false, true) },
    // 2-tile-wide red carpet down the middle of the church
    { name: 'aisleL', solid: false, draw: p => { p.rect(2, 0, 14, 16, '#a83a3a'); p.rect(2, 0, 1, 16, '#d9b45a'); } },
    { name: 'aisleR', solid: false, draw: p => { p.rect(0, 0, 14, 16, '#a83a3a'); p.rect(13, 0, 1, 16, '#d9b45a'); } },
    // --- Hardee's ---
    { name: 'grillL', solid: true, draw: p => drawGrill(p) },
    { name: 'grillR', solid: true, draw: p => drawGrill(p.shift(-16, 0)) },
    {
      name: 'fryer', solid: true, draw: p => {
        p.rect(1, 1, 14, 15, '#9aa0ac'); p.rect(2, 2, 12, 6, '#c8a040');
        p.rect(3, 3, 4, 4, '#8a6a2a'); p.rect(9, 3, 4, 4, '#8a6a2a');
        for (let x = 3; x < 13; x += 2) p.px(x, 3, '#e8d080');
        p.rect(2, 9, 12, 6, '#b8bcc8'); p.rect(6, 11, 4, 1, '#5a5e6c');
      },
    },
    {
      name: 'heatLamp', solid: true, draw: p => {
        p.rect(0, 0, 16, 2, '#5a5e6c'); p.rect(2, 2, 12, 3, 'rgba(255,170,60,0.45)');
        p.rect(0, 8, 16, 2, '#b8bcc8'); p.rect(0, 10, 16, 6, '#9aa0ac');
        for (const x of [1, 6, 11]) { p.rect(x, 5, 4, 3, '#e8c040'); p.rect(x, 5, 4, 1, '#f8e8a0'); }
      },
    },
    {
      name: 'sodaMachine', solid: true, draw: p => {
        p.rect(1, 0, 14, 16, '#22222a'); p.rect(2, 1, 12, 5, '#c8323a'); p.rect(4, 2, 8, 2, '#f4f4f4');
        for (const x of [3, 7, 11]) p.rect(x, 7, 2, 3, '#9aa0ac');
        p.rect(2, 12, 12, 2, '#5a5e6c'); p.rect(4, 10, 3, 3, '#f4f4f4');
      },
    },
    {
      name: 'kitchenSink', solid: true, draw: p => {
        p.rect(0, 2, 16, 14, '#9aa0ac'); p.rect(2, 4, 12, 7, '#5a5e6c'); p.rect(3, 5, 10, 5, '#b8c8d0');
        p.rect(7, 1, 2, 4, '#c8ccd0');
      },
    },
    {
      name: 'counterH', solid: true, draw: p => {
        p.rect(0, 2, 16, 4, '#c8ccd0'); p.rect(0, 5, 16, 1, '#9aa0ac');
        p.rect(0, 6, 16, 10, '#b82a2a'); p.rect(0, 9, 16, 1, '#e8c040');
      },
    },
    {
      name: 'register', solid: true, draw: p => {
        p.rect(0, 2, 16, 4, '#c8ccd0'); p.rect(0, 5, 16, 1, '#9aa0ac');
        p.rect(0, 6, 16, 10, '#b82a2a'); p.rect(0, 9, 16, 1, '#e8c040');
        p.rect(3, 0, 10, 5, '#2a2a30'); p.rect(4, 1, 6, 2, '#60d080'); p.rect(11, 1, 1, 3, '#9aa0ac');
      },
    },
    { name: 'menuL', solid: true, draw: p => drawMenuBoard(p, 'burger') },
    { name: 'menuM', solid: true, draw: p => drawMenuBoard(p, 'fries') },
    { name: 'menuR', solid: true, draw: p => drawMenuBoard(p, 'biscuit') },
    {
      name: 'diningTable', solid: true, draw: p => {
        p.rect(0, 6, 3, 6, '#c8323a'); p.rect(13, 6, 3, 6, '#c8323a');
        p.rect(3, 4, 10, 8, '#8a5a33'); p.rect(3, 4, 10, 2, '#b07d50');
        p.rect(7, 12, 2, 4, '#5e3b20');
      },
    },
    // --- 7-Eleven ---
    { name: 'sodaCoolerTop', solid: true, draw: p => drawCooler(p, false) },
    { name: 'sodaCoolerBot', solid: true, draw: p => drawCooler(p.shift(0, -16), false) },
    { name: 'beerCoolerTop', solid: true, draw: p => drawCooler(p, true) },
    { name: 'beerCoolerBot', solid: true, draw: p => drawCooler(p.shift(0, -16), true) },
    { name: 'shelfL', solid: true, draw: p => drawShelf(p) },
    { name: 'shelfR', solid: true, draw: p => drawShelf(p.shift(-16, 0)) },
    { name: 'storeCounter', solid: true, draw: p => drawStoreCounter(p) },
    {
      name: 'storeRegister', solid: true, draw: p => {
        drawStoreCounter(p);
        p.rect(2, 0, 9, 5, '#2a2a30'); p.rect(3, 1, 5, 2, '#60d080');
        p.rect(12, 1, 3, 5, '#e8c040'); p.rect(12, 2, 3, 1, '#c8323a'); p.rect(12, 4, 3, 1, '#3a6ae8'); // scratch-offs
      },
    },
    {
      name: 'slurpee', solid: true, draw: p => {
        p.rect(1, 0, 14, 16, '#9aa0ac'); p.rect(1, 0, 14, 3, '#c8323a');
        p.rect(2, 4, 5, 7, '#3a6ae8'); p.rect(9, 4, 5, 7, '#c8323a');
        p.rect(3, 5, 1, 4, '#a8c8ff'); p.rect(10, 5, 1, 4, '#ffa8a8');
        p.rect(3, 12, 3, 2, '#5a5e6c'); p.rect(10, 12, 3, 2, '#5a5e6c');
      },
    },
    {
      name: 'hotdogs', solid: true, draw: p => {
        p.rect(0, 4, 16, 12, '#9aa0ac'); p.rect(1, 5, 14, 7, 'rgba(255,170,60,0.5)');
        for (const y of [6, 8, 10]) { p.rect(2, y, 12, 1, '#c8ccd0'); p.rect(3 + (y % 4), y, 5, 1, '#b8582a'); }
        p.rect(0, 14, 16, 2, '#5a5e6c');
      },
    },
    // --- School parking lot ---
    { name: 'parkLine', solid: false, draw: p => p.rect(7, 0, 2, 16, '#e8e4d8') },
    ...['TL', 'TR', 'ML', 'MR', 'BL', 'BR'].flatMap((part, i) => [
      { name: `truck${part}`, solid: true, draw: q => drawVehicle(q.shift(-(i % 2) * 16, -Math.floor(i / 2) * 16), '#34343c', '#24242a', true) },
      { name: `car${part}`, solid: true, draw: q => drawVehicle(q.shift(-(i % 2) * 16, -Math.floor(i / 2) * 16), '#3f6fa0', '#2a4a78', false) },
    ]),
    {
      name: 'schoolWindow', solid: true, draw: p => {
        p.rect(2, 4, 12, 9, '#d8d0c0'); p.rect(3, 5, 10, 7, '#8ab8d8'); p.rect(7, 5, 1, 7, '#d8d0c0'); p.rect(4, 6, 2, 2, '#c8e0f0');
      },
    },
    {
      name: 'schoolDoorL', solid: true, draw: p => {
        p.rect(1, 0, 15, 16, '#9aa0ac'); p.rect(3, 2, 12, 12, '#8ab8d8'); p.rect(4, 3, 3, 3, '#c8e0f0'); p.rect(13, 8, 1, 3, '#5a5e6c');
      },
    },
    {
      name: 'schoolDoorR', solid: true, draw: p => {
        p.rect(0, 0, 15, 16, '#9aa0ac'); p.rect(1, 2, 12, 12, '#8ab8d8'); p.rect(2, 3, 3, 3, '#c8e0f0'); p.rect(2, 8, 1, 3, '#5a5e6c');
      },
    },
    ...[0, 1, 2].map(i => ({ name: `schoolSign${i}`, solid: true, draw: p => drawWheatmoreSign(p.shift(-i * 16, 0)) })),
    // --- Hallway ---
    { name: 'lockerTop', solid: true, draw: p => drawLockers(p) },
    { name: 'lockerBot', solid: true, draw: p => drawLockers(p.shift(0, -16)) },
    {
      name: 'classDoor', solid: true, draw: p => {
        p.rect(2, 0, 12, 16, '#8a5a33'); p.rect(3, 1, 10, 15, '#b07d50');
        p.rect(5, 3, 6, 5, '#8ab8d8'); p.rect(11, 9, 1, 2, '#e8c040');
      },
    },
    ...[0, 1, 2].map(i => ({ name: `warriorsBanner${i}`, solid: true, draw: p => drawWarriorsBanner(p.shift(-i * 16, 0)) })),
    {
      name: 'bulletin', solid: true, draw: p => {
        p.rect(1, 3, 14, 10, '#8a5a33'); p.rect(2, 4, 12, 8, '#c89a5a');
        p.rect(3, 5, 4, 3, '#f4f4f4'); p.rect(8, 5, 5, 4, '#e8c040'); p.rect(4, 9, 5, 2, '#c8e0f0'); p.px(5, 5, '#c8323a'); p.px(10, 5, '#c8323a');
      },
    },
    {
      name: 'trophyCase', solid: true, draw: p => {
        p.rect(1, 1, 14, 15, '#5e3b20'); p.rect(2, 2, 12, 13, '#8ab8d8'); p.rect(2, 8, 12, 1, '#5e3b20');
        p.rect(4, 4, 2, 3, '#e8c040'); p.rect(9, 3, 3, 4, '#e8c040'); p.rect(5, 10, 3, 4, '#c8ccd0'); p.rect(10, 11, 2, 3, '#e8c040');
      },
    },
    {
      name: 'fountain', solid: true, draw: p => {
        p.rect(3, 4, 10, 6, '#c8ccd0'); p.rect(4, 5, 8, 3, '#9aa0ac'); p.rect(7, 4, 2, 1, '#5a5e6c'); p.rect(6, 10, 4, 6, '#9aa0ac');
      },
    },
    // --- Cafeteria ---
    {
      name: 'lunchCounter', solid: true, draw: p => {
        p.rect(0, 2, 16, 6, '#c8ccd0'); p.rect(0, 7, 16, 1, '#9aa0ac');
        p.rect(1, 3, 6, 4, '#5a5e6c'); p.rect(2, 4, 4, 2, '#e8c040'); // mac and cheese
        p.rect(9, 3, 6, 4, '#5a5e6c'); p.rect(10, 4, 4, 2, '#c87830'); // nuggets
        p.rect(0, 8, 16, 8, '#9aa0ac'); p.rect(0, 11, 16, 1, '#7a808c');
      },
    },
    {
      name: 'cafMenu', solid: true, draw: p => {
        p.rect(1, 2, 14, 11, '#5e3b20'); p.rect(2, 3, 12, 9, '#2f4a3a');
        for (const y of [5, 7, 9]) p.rect(4, y, y === 5 ? 8 : 6, 1, '#e8e8e0');
      },
    },
    ...['L', 'R'].map((side, i) => ({
      name: `cafTable${side}`, solid: true, draw: q => {
        const p = q.shift(-i * 16, 0);
        p.rect(1, 1, 30, 3, WHEATMORE.red); p.rect(1, 12, 30, 3, WHEATMORE.red);   // benches
        p.rect(0, 4, 32, 8, '#d8b888'); p.rect(0, 4, 32, 1, '#e8cca0'); p.rect(0, 11, 32, 1, '#a8885a'); // table top
        p.rect(4, 6, 4, 3, '#c8ccd0'); p.rect(20, 6, 4, 3, '#c8ccd0');     // trays
        p.rect(5, 7, 2, 1, '#c87830'); p.rect(21, 7, 2, 1, '#e8c040');
      },
    })),
    // --- Football field ---
    { name: 'yardLine', solid: false, draw: p => p.rect(7, 0, 2, 16, '#f0f0e8') },
    // Red end zones with a white goal line on the field side.
    { name: 'endZoneL', solid: false, draw: p => { p.rect(0, 0, 16, 16, WHEATMORE.red); p.rect(14, 0, 2, 16, '#f0f0e8'); } },
    { name: 'endZoneR', solid: false, draw: p => { p.rect(0, 0, 16, 16, WHEATMORE.red); p.rect(0, 0, 2, 16, '#f0f0e8'); } },
    ...[0, 1, 2, 3].map(i => ({ name: `midW${i}`, solid: false, draw: p => drawMidfieldW(p.shift(-(i % 2) * 16, -Math.floor(i / 2) * 16)) })),
    {
      name: 'bleacher', solid: true, draw: p => {
        p.rect(0, 0, 16, 16, '#7a808c');
        for (const y of [1, 6, 11]) { p.rect(0, y, 16, 3, '#c8ccd0'); p.rect(0, y + 3, 16, 1, '#5a5e6c'); }
      },
    },
    ...['L', 'R'].map((side, i) => ({
      name: `sled${side}`, solid: true, draw: q => {
        const p = q.shift(-i * 16, 0);
        p.rect(2, 12, 28, 2, '#5a5e6c');
        for (const x of [3, 18]) { p.rect(x, 2, 11, 11, '#181425'); p.rect(x + 1, 3, 9, 9, '#c8323a'); p.rect(x + 2, 4, 7, 2, '#e85a5a'); }
      },
    })),
    {
      name: 'cone', solid: true, draw: p => {
        p.rect(4, 13, 8, 2, '#e8782a'); p.rect(6, 6, 4, 7, '#e8782a'); p.rect(7, 4, 2, 2, '#e8782a'); p.rect(6, 9, 4, 1, '#f4f4f4');
      },
    },
    {
      name: 'waterCooler', solid: true, draw: p => {
        p.rect(3, 3, 10, 12, '#e8782a'); p.rect(3, 3, 10, 2, '#f4f4f4'); p.rect(5, 7, 6, 1, '#f4f4f4'); p.rect(12, 10, 2, 2, '#5a5e6c');
      },
    },
    // --- El Rancho ---
    { name: 'boothL', solid: true, draw: p => drawBooth(p, false) },
    { name: 'boothR', solid: true, draw: p => drawBooth(p.shift(-16, 0), false) },
    { name: 'fajitaL', solid: true, draw: p => drawBooth(p, true) },
    { name: 'fajitaR', solid: true, draw: p => drawBooth(p.shift(-16, 0), true) },
    {
      name: 'papelPicado', solid: true, draw: p => {
        p.rect(0, 2, 16, 1, '#5a3a22');
        [['#e07aa0', 1], ['#e8c040', 5], ['#3a9ae8', 9], ['#40a040', 13]].forEach(([c, x]) => { p.rect(x - 1, 3, 4, 4, c); p.px(x, 7, c); p.px(x + 1, 7, c); });
      },
    },
    {
      name: 'sombrero', solid: true, draw: p => {
        p.rect(0, 8, 16, 4, K); p.rect(1, 9, 14, 2, '#a86a2a');                       // brim
        p.rect(4, 3, 8, 6, K); p.rect(5, 4, 6, 5, '#c8883a'); p.rect(5, 7, 6, 1, '#c8323a'); // crown + band
      },
    },
    {
      name: 'pinata', solid: true, draw: p => {
        p.rect(7, 0, 1, 3, '#5a3a22');
        p.rect(3, 4, 8, 4, '#e07aa0'); p.rect(3, 5, 8, 1, '#e8c040'); p.rect(3, 7, 8, 1, '#3a9ae8'); // body stripes
        p.rect(10, 2, 3, 3, '#e07aa0'); p.px(11, 1, '#e07aa0'); p.px(12, 3, K);                    // head, ear, eye
        for (const x of [4, 9]) p.rect(x, 8, 1, 3, '#e8c040');                                      // legs
        p.rect(1, 5, 2, 1, '#40a040');                                                              // tail
      },
    },
    // --- Friday night game ---
    ...[0, 1, 2].map(i => ({ name: `momSign${i}`, solid: false, draw: p => drawMomSign(p.shift(-i * 16, 0)) })),
    // --- The field party ---
    {
      name: 'pine', solid: true, draw: p => {
        p.rect(7, 12, 2, 4, '#4a2e1a');
        p.rect(5, 1, 6, 4, '#1f5a34'); p.rect(3, 4, 10, 4, '#1a4e2e'); p.rect(1, 8, 14, 5, '#143f26');
        p.rect(6, 2, 2, 2, '#2f7a48'); p.rect(4, 5, 2, 2, '#2a6a3e'); p.rect(3, 9, 2, 2, '#245a34');
      },
    },
    ...['TL', 'TR', 'BL', 'BR'].map((part, i) => ({
      name: `fire${part}`, solid: true, draw: q => drawBonfire(q.shift(-(i % 2) * 16, -Math.floor(i / 2) * 16)),
    })),
    ...[0, 1].map(i => ({
      name: `log${'LR'[i]}`, solid: true, draw: q => {
        const p = q.shift(-i * 16, 0);
        p.rect(1, 5, 30, 8, K); p.rect(2, 6, 28, 6, '#6a4428'); p.rect(2, 6, 28, 1, '#8a5a33');
        for (const x of [8, 15, 23]) p.rect(x, 8, 4, 1, '#4a2e1a');
        p.rect(27, 6, 3, 6, '#c8955f'); p.rect(28, 8, 1, 2, '#8a5a33');
      },
    })),
    {
      name: 'hayBale', solid: true, draw: p => {
        p.rect(1, 3, 14, 12, K); p.rect(2, 4, 12, 10, '#d8b850');
        for (const y of [5, 8, 11]) p.rect(2, y, 12, 1, '#b8983a');
        p.rect(5, 4, 1, 10, '#8a5a33'); p.rect(10, 4, 1, 10, '#8a5a33');
      },
    },
    {
      name: 'cooler', solid: true, draw: p => {
        p.rect(2, 4, 12, 10, K); p.rect(3, 7, 10, 6, '#c8323a'); p.rect(3, 5, 10, 2, '#f4f4f4');
        p.rect(6, 8, 4, 1, '#f4f4f4');
      },
    },
    ...['TL', 'TR', 'ML', 'MR', 'BL', 'BR'].map((part, i) => ({
      name: `pickup${part}`, solid: true,
      draw: q => drawVehicle(q.shift(-(i % 2) * 16, -Math.floor(i / 2) * 16), '#8e3a2a', '#6a2a1e', true),
    })),
    // --- Classroom ---
    ...[0, 1, 2, 3].map(i => ({ name: `whiteboard${i}`, solid: true, draw: p => drawWhiteboard(p.shift(-i * 16, 0)) })),
    {
      name: 'wallClock', solid: true, draw: p => {
        p.rect(4, 3, 8, 8, K); p.rect(5, 4, 6, 6, '#f4f4f4'); p.rect(7, 5, 1, 3, K); p.rect(8, 7, 2, 1, K);
      },
    },
    { name: 'teacherDeskL', solid: true, draw: p => drawTeacherDesk(p) },
    { name: 'teacherDeskR', solid: true, draw: p => drawTeacherDesk(p.shift(-16, 0)) },
    { name: 'studentDesk', solid: true, draw: p => drawStudentDesk(p, false) },
    { name: 'benDesk', solid: true, draw: p => drawStudentDesk(p, true) },
    {
      name: 'fishTank', solid: true, draw: p => {
        p.rect(1, 10, 14, 6, '#5e3b20'); p.rect(1, 10, 14, 1, '#8a5a33');
        p.rect(1, 1, 14, 9, '#9aa0ac'); p.rect(2, 2, 12, 7, '#4a90c8'); p.rect(2, 2, 12, 1, '#8ac0e8');
        p.rect(4, 5, 3, 2, '#e8782a'); p.px(3, 5, '#e8782a'); p.rect(9, 3, 2, 1, '#e8c040'); p.px(11, 3, '#e8c040');
        p.rect(12, 6, 1, 3, '#4fa060'); p.rect(3, 8, 10, 1, '#c8b890');
      },
    },
    // --- School bathroom ---
    { name: 'stallWall', solid: true, draw: p => { p.rect(6, 0, 4, 16, '#5a7a70'); p.rect(6, 0, 1, 16, '#8aaaa0'); } },
    { name: 'stallDoor', solid: false, draw: p => drawStallDoor(p, false) },
    { name: 'stallDoorOpen', solid: false, draw: p => drawStallDoor(p, true) },
    {
      name: 'handDryer', solid: true, draw: p => {
        p.rect(4, 4, 8, 7, '#c8ccd0'); p.rect(4, 4, 8, 1, '#f4f4f4'); p.rect(6, 11, 4, 2, '#7a808c'); p.rect(7, 6, 2, 2, '#c8323a');
      },
    },
    // --- Label Shopper ---
    ...[0, 1, 2, 3].map(i => ({ name: `thriftSign${i}`, solid: true, draw: p => drawThriftSign(p.shift(-i * 16, 0)) })),
    ...[0, 1].flatMap(seed => ['L', 'R'].map((side, i) => ({
      name: `rack${seed}${side}`, solid: true, draw: p => drawRack(p.shift(-i * 16, 0), seed * 3),
    }))),
    { name: 'junkShelfL', solid: true, draw: p => drawJunkShelf(p) },
    { name: 'junkShelfR', solid: true, draw: p => drawJunkShelf(p.shift(-16, 0)) },
    { name: 'mannequin', solid: true, draw: p => drawMannequin(p) },
    {
      name: 'bargainBin', solid: true, draw: p => {
        p.rect(1, 5, 14, 10, '#8a5a33'); p.rect(1, 5, 14, 1, '#b07d50'); p.rect(1, 10, 14, 1, '#6a4428');
        for (const [x, y, c] of [[2, 3, '#c8323a'], [5, 2, '#e8c040'], [8, 3, '#3a6ae8'], [11, 2, '#4fa060'], [4, 4, '#f4f4f4'], [10, 4, '#e07aa0']]) p.rect(x, y, 3, 3, c);
      },
    },
    { name: 'fittingTop', solid: true, draw: p => drawFittingRoom(p) },
    { name: 'fittingBot', solid: true, draw: p => drawFittingRoom(p.shift(0, -16)) },
    { name: 'knife', solid: false, draw: p => drawKnife(p) },
    { name: 'samRug', solid: false, draw: p => { p.rect(0, 0, 16, 16, '#e8c040'); for (const [x, y] of [[2, 2], [10, 2], [6, 6], [14, 6], [2, 10], [10, 10], [6, 14], [14, 14]]) p.rect(x - 1, y - 1, 2, 2, '#d08a3a'); } },
  ];
}

// Order matters: a tile's index in this list is its tile ID in maps.
const TILE_DEFS = [...groundDefs(), ...objectDefs()];
const TILE_ID = Object.fromEntries(TILE_DEFS.map((d, i) => [d.name, i]));
