// Pixel font drawn in code. Each glyph is rows of 'x' (ink) and '.' (blank),
// either as one string with '/' between rows or as an array of rows.
// Rows 0-6 sit on the line; rows 7-8 are descenders (g, j, p, q, y, commas).
// Glyphs are proportional: each character advances by its own width + 1.

const GLYPHS = {
  A: '.xxx./x...x/x...x/xxxxx/x...x/x...x/x...x',
  B: 'xxxx./x...x/x...x/xxxx./x...x/x...x/xxxx.',
  C: '.xxx./x...x/x..../x..../x..../x...x/.xxx.',
  D: 'xxxx./x...x/x...x/x...x/x...x/x...x/xxxx.',
  E: 'xxxxx/x..../x..../xxxx./x..../x..../xxxxx',
  F: 'xxxxx/x..../x..../xxxx./x..../x..../x....',
  G: '.xxx./x...x/x..../x.xxx/x...x/x...x/.xxxx',
  H: 'x...x/x...x/x...x/xxxxx/x...x/x...x/x...x',
  I: 'xxx/.x./.x./.x./.x./.x./xxx',
  J: '..xxx/...x./...x./...x./x..x./x..x./.xx..',
  K: 'x...x/x..x./x.x../xx.../x.x../x..x./x...x',
  L: 'x..../x..../x..../x..../x..../x..../xxxxx',
  M: 'x...x/xx.xx/x.x.x/x.x.x/x...x/x...x/x...x',
  N: 'x...x/xx..x/x.x.x/x..xx/x...x/x...x/x...x',
  O: '.xxx./x...x/x...x/x...x/x...x/x...x/.xxx.',
  P: 'xxxx./x...x/x...x/xxxx./x..../x..../x....',
  Q: '.xxx./x...x/x...x/x...x/x.x.x/x..x./.xx.x',
  R: 'xxxx./x...x/x...x/xxxx./x.x../x..x./x...x',
  S: '.xxxx/x..../x..../.xxx./....x/....x/xxxx.',
  T: 'xxxxx/..x../..x../..x../..x../..x../..x..',
  U: 'x...x/x...x/x...x/x...x/x...x/x...x/.xxx.',
  V: 'x...x/x...x/x...x/x...x/x...x/.x.x./..x..',
  W: 'x...x/x...x/x...x/x.x.x/x.x.x/x.x.x/.x.x.',
  X: 'x...x/x...x/.x.x./..x../.x.x./x...x/x...x',
  Y: 'x...x/x...x/.x.x./..x../..x../..x../..x..',
  Z: 'xxxxx/....x/...x./..x../.x.../x..../xxxxx',
  a: '...../...../.xxx./....x/.xxxx/x...x/.xxxx',
  b: 'x..../x..../xxxx./x...x/x...x/x...x/xxxx.',
  c: '...../...../.xxx./x..../x..../x..../.xxx.',
  d: '....x/....x/.xxxx/x...x/x...x/x...x/.xxxx',
  e: '...../...../.xxx./x...x/xxxxx/x..../.xxx.',
  f: '..xx/.x../xxx./.x../.x../.x../.x..',
  g: '...../...../.xxxx/x...x/x...x/x...x/.xxxx/....x/.xxx.',
  h: 'x..../x..../xxxx./x...x/x...x/x...x/x...x',
  i: 'x/./x/x/x/x/x',
  j: '..x/.../..x/..x/..x/..x/..x/x.x/.x.',
  k: 'x.../x.../x..x/x.x./xx../x.x./x..x',
  l: 'x/x/x/x/x/x/x',
  m: '...../...../xx.x./x.x.x/x.x.x/x.x.x/x.x.x',
  n: '...../...../xxxx./x...x/x...x/x...x/x...x',
  o: '...../...../.xxx./x...x/x...x/x...x/.xxx.',
  p: '...../...../xxxx./x...x/x...x/x...x/xxxx./x..../x....',
  q: '...../...../.xxxx/x...x/x...x/x...x/.xxxx/....x/....x',
  r: '..../..../x.xx/xx../x.../x.../x...',
  s: '...../...../.xxxx/x..../.xxx./....x/xxxx.',
  t: '.x../.x../xxx./.x../.x../.x../..xx',
  u: '...../...../x...x/x...x/x...x/x...x/.xxxx',
  v: '...../...../x...x/x...x/x...x/.x.x./..x..',
  w: '...../...../x...x/x...x/x.x.x/x.x.x/.x.x.',
  x: '...../...../x...x/.x.x./..x../.x.x./x...x',
  y: '...../...../x...x/x...x/x...x/x...x/.xxxx/....x/.xxx.',
  z: '...../...../xxxxx/...x./..x../.x.../xxxxx',
  0: '.xxx./x...x/x..xx/x.x.x/xx..x/x...x/.xxx.',
  1: '.x./xx./.x./.x./.x./.x./xxx',
  2: '.xxx./x...x/....x/...x./..x../.x.../xxxxx',
  3: 'xxxx./....x/....x/.xxx./....x/....x/xxxx.',
  4: '...x./..xx./.x.x./x..x./xxxxx/...x./...x.',
  5: 'xxxxx/x..../xxxx./....x/....x/x...x/.xxx.',
  6: '.xxx./x..../x..../xxxx./x...x/x...x/.xxx.',
  7: 'xxxxx/....x/...x./..x../.x.../.x.../.x...',
  8: '.xxx./x...x/x...x/.xxx./x...x/x...x/.xxx.',
  9: '.xxx./x...x/x...x/.xxxx/....x/....x/.xxx.',
  ' ': ['...'],
  '.': ['.', '.', '.', '.', '.', '.', 'x'],
  ',': ['..', '..', '..', '..', '..', '.x', '.x', 'x.'],
  '!': ['x', 'x', 'x', 'x', 'x', '.', 'x'],
  '?': '.xxx./x...x/....x/...x./..x../...../..x..',
  "'": ['x', 'x'],
  '"': ['x.x', 'x.x'],
  '-': ['....', '....', '....', 'xxxx'],
  ':': ['.', '.', 'x', '.', '.', 'x'],
  ';': ['..', '..', '.x', '..', '..', '.x', '.x', 'x.'],
  '(': ['.x', 'x.', 'x.', 'x.', 'x.', 'x.', '.x'],
  ')': ['x.', '.x', '.x', '.x', '.x', '.x', 'x.'],
  '/': '....x/...x./...x./..x../.x.../.x.../x....',
  '&': '.xx../x..x./x.x../.x.../x.x.x/x..x./.xx.x',
  '$': '..x../.xxxx/x.x../.xxx./..x.x/xxxx./..x..',
  '+': '...../..x../..x../xxxxx/..x../..x..',
  '*': '...../x.x.x/.xxx./xxxxx/.xxx./x.x.x',
  '#': '.x.x./xxxxx/.x.x./.x.x./xxxxx/.x.x.',
  '%': 'xx..x/xx..x/...x./..x../.x.../x..xx/x..xx',
  '=': '...../...../xxxxx/...../xxxxx',
  '<': '..../...x/..x./.x../x.../.x../..x./...x',
  '>': '..../x.../.x../..x./...x/..x./.x../x...',
};

// Small capitals-only font (3x5) for HUD hints and labels.
const MINI_GLYPHS = {
  A: '.x./x.x/xxx/x.x/x.x', B: 'xx./x.x/xx./x.x/xx.', C: '.xx/x../x../x../.xx', D: 'xx./x.x/x.x/x.x/xx.',
  E: 'xxx/x../xx./x../xxx', F: 'xxx/x../xx./x../x..', G: '.xx/x../x.x/x.x/.xx', H: 'x.x/x.x/xxx/x.x/x.x',
  I: 'xxx/.x./.x./.x./xxx', J: '..x/..x/..x/x.x/.x.', K: 'x.x/x.x/xx./x.x/x.x', L: 'x../x../x../x../xxx',
  M: 'x.x/xxx/xxx/x.x/x.x', N: 'xx./x.x/x.x/x.x/x.x', O: '.x./x.x/x.x/x.x/.x.', P: 'xx./x.x/xx./x../x..',
  Q: '.x./x.x/x.x/xx./.xx', R: 'xx./x.x/xx./x.x/x.x', S: '.xx/x../.x./..x/xx.', T: 'xxx/.x./.x./.x./.x.',
  U: 'x.x/x.x/x.x/x.x/xxx', V: 'x.x/x.x/x.x/x.x/.x.', W: 'x.x/x.x/xxx/xxx/x.x', X: 'x.x/x.x/.x./x.x/x.x',
  Y: 'x.x/x.x/.x./.x./.x.', Z: 'xxx/..x/.x./x../xxx',
  0: 'xxx/x.x/x.x/x.x/xxx', 1: '.x./xx./.x./.x./xxx', 2: 'xx./..x/.x./x../xxx', 3: 'xx./..x/.x./..x/xx.',
  4: 'x.x/x.x/xxx/..x/..x', 5: 'xxx/x../xx./..x/xx.', 6: '.xx/x../xxx/x.x/xxx', 7: 'xxx/..x/.x./.x./.x.',
  8: 'xxx/x.x/xxx/x.x/xxx', 9: 'xxx/x.x/xxx/..x/xx.',
  ' ': ['..'], '.': ['.', '.', '.', '.', 'x'], ',': ['.', '.', '.', 'x', 'x'], ':': ['.', 'x', '.', 'x', '.'],
  '!': ['x', 'x', 'x', '.', 'x'], '?': 'xx./..x/.x./.../.x.', "'": ['x', 'x'], '-': '.../.../xxx',
  '+': '.../.x./xxx/.x.', '/': '..x/..x/.x./x../x..', '(': '.x/x./x./x./.x', ')': 'x./.x/.x/.x/x.',
  '$': '.xx/xx./.x./.xx/xx.', '&': '.x./x.x/.x./x.x/.xx',
};

// Each set: glyphs, cell size and line height. 'main' is the regular text font.
const FONT_SETS = {
  main: { glyphs: GLYPHS, cellW: 6, cellH: 10, lineH: 12 },
  mini: { glyphs: MINI_GLYPHS, cellW: 4, cellH: 6, lineH: 7, upper: true },
};

// Typographic characters people type in content.js, swapped for ones we draw.
const FONT_SWAPS = { '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', '…': '...' };

const Font = {
  LINE_H: FONT_SETS.main.lineH,

  rows(ch, set = 'main') {
    const g = FONT_SETS[set].glyphs[ch];
    return Array.isArray(g) ? g : g.split('/');
  },

  width(ch, set = 'main') {
    return FONT_SETS[set].glyphs[ch] === undefined ? Font.width('?', set) : Font.rows(ch, set)[0].length;
  },

  clean(text, set = 'main') {
    const { glyphs, upper } = FONT_SETS[set];
    const swapped = text.replace(/[‘’“”–—…]/g, c => FONT_SWAPS[c]);
    return [...(upper ? swapped.toUpperCase() : swapped)]
      .map(c => (c === '\n' || glyphs[c] !== undefined ? c : '?')).join('');
  },

  measure(text, set = 'main') {
    let w = 0;
    for (const ch of text) w += Font.width(ch, set) + 1;
    return Math.max(0, w - 1);
  },

  // Break text into lines no wider than maxW pixels.
  wrap(text, maxW, set = 'main') {
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (!line || Font.measure(next, set) <= maxW) line = next;
        else { lines.push(line); line = word; }
      }
      lines.push(line);
    }
    return lines;
  },

  // Builds the bitmap fonts: 'font' (dark text, light shadow, for white boxes),
  // 'fontLight' (white text, dark shadow, for dark backgrounds), and the small
  // capitals versions 'mini' / 'miniLight'.
  build(scene) {
    const perRow = 16;
    const variants = [
      ['font', 'main', '#303038', '#c8c8d0'], ['fontLight', 'main', '#f8f8f8', '#303038'],
      ['mini', 'mini', '#303038', '#d8d8e0'], ['miniLight', 'mini', '#f8f8f8', '#303038'],
    ];
    for (const [key, set, ink, shadow] of variants) {
      const { glyphs, cellW, cellH, lineH } = FONT_SETS[set];
      const chars = Object.keys(glyphs).join('');
      const tex = scene.textures.createCanvas(key, perRow * cellW, Math.ceil(chars.length / perRow) * cellH);
      const ctx = tex.getContext();
      [...chars].forEach((ch, i) => {
        const ox = (i % perRow) * cellW;
        const oy = Math.floor(i / perRow) * cellH;
        const rows = Font.rows(ch, set);
        for (const [color, off] of [[shadow, 1], [ink, 0]]) {
          Art.pixels(rows.map(r => r.replace(/x/g, 'i')), { i: color }, (x, y, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(ox + x + off, oy + y + off, 1, 1);
          }, `font '${ch}'`);
        }
      });
      tex.refresh();

      const parsed = Phaser.GameObjects.RetroFont.Parse(scene, {
        image: key, width: cellW, height: cellH, chars, charsPerRow: perRow,
        spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: lineH - cellH,
      });
      const entry = parsed.data ? parsed : { data: parsed, texture: key, frame: null };
      for (const ch of chars) entry.data.chars[ch.charCodeAt(0)].xAdvance = Font.width(ch, set) + 1;
      scene.cache.bitmapFont.add(key, entry);
    }
  },
};
