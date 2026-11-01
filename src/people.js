// Other people (NPCs). Every person is built from the same 16x24 template:
// a head (short hair, long hair, cap, beanie, glasses...) on top of a body
// (BODIES), recolored with their own palette. Frames: down_0, up_0, side_0.

const HEAD_DOWN = [
  '................',
  '.....kkkkkk.....',
  '....khHhhhhk....',
  '...khHhhhdhhk...',
  '...khhhdhhHhk...',
  '...khdhhhhdhk...',
  '...khhsssshhk...',
  '...khsssssshk...',
  '...kskssssksk...',
  '...kSssssssSk...',
  '...ksssmmsssk...',
  '....kSssssSk....',
];

const HEAD_UP = Art.withRows(HEAD_DOWN, {
  6: '...khhhhhhhhk...',
  7: '...khhhhhhhhk...',
  8: '...khhhhhhhhk...',
  9: '...kShhhhhhSk...',
  10: '...khhhhhhhhk...',
});

const HEAD_SIDE = [
  '................',
  '....kkkkkk......',
  '...khHhhhhk.....',
  '..khHhhhdhhk....',
  '..khhhdhhHhk....',
  '..khdhhhhdhk....',
  '..khhhssssk.....',
  '..khhSssssk.....',
  '..khhsssksk.....',
  '..khsssssssk....',
  '...ksssssmk.....',
  '....kSssssk.....',
];

const CURLS = {
  down: ['................', '....kkkkkkkk....', '....khHdhHdk....', '...khdhHdhHhk...', '...kHhdhhdhHk...', '...khdshhsdhk...', '...khsssssshk...'],
  up: ['................', '....kkkkkkkk....', '....khHdhHdk....', '...khdhHdhHhk...', '...kHhdhhdhHk...', '...khdhHhdhhk...', '...khdhHhdhhk...', '...khhdhhHhhk...', '...khhhhhhhhk...', '...kShhhhhhSk...', '...kSssssssSk...'],
  side: ['................', '....kkkkkkk.....', '...khHdhHdk.....', '..khdhHdhHhk....', '..kHhdhhdHk.....', '..khdhHhdsk.....'],
};

const ROUND_HEAD = {
  down: [
    '................',
    '.....kkkkkk.....',
    '....khHhhhhk....',
    '...khHhhhdhhk...',
    '...khhhhhhhhk...',
    '..khhhhhhhhhhk..',
    '..khhsssssshhk..',
    '..khsssssssshk..',
    '..kssksssskssk..',
    '..kSssssssssSk..',
    '..kSsssmmsssSk..',
    '...kSssssssSk...',
  ],
  up: [
    '................',
    '.....kkkkkk.....',
    '....khHhhhhk....',
    '...khHhhhdhhk...',
    '...khhhhhhhhk...',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..khhhhdhhhhhk..',
    '..khhhhhhhhhhk..',
    '..kShhhhhhhhSk..',
    '..kShhhhhhhhSk..',
    '...kSssssssSk...',
  ],
  side: [
    '................',
    '....kkkkkkk.....',
    '...khHhhhhhk....',
    '..khHhhhdhhhk...',
    '..khhhhhhhhhk...',
    '..khhhhhhhhhhk..',
    '..khhhssssssk...',
    '..khhSsssssssk..',
    '..khhssssskssk..',
    '..khSsssssssk...',
    '..kSssssssmmk...',
    '...kSssssssk....',
  ],
};

// Changes layered on a head, per facing direction. Each returns new rows.
const HEAD_STYLES = {
  short: rows => rows,
  // Hair down past the shoulders.
  long: (rows, dir) => rows.map((row, y) => {
    if (y < 5 || y > 13) return row;
    const r = [...row];
    if (dir === 'side') { r[1] = 'k'; r[2] = 'h'; r[3] = 'h'; } else { r[2] = 'k'; r[3] = 'h'; r[12] = 'h'; r[13] = 'k'; }
    return r.join('');
  }),
  cap: (rows, dir) => Art.withRows(rows, dir === 'side' ? {
    1: '....kkkkkk......', 2: '...kccccccK.....', 3: '..kcccccccck....', 4: '..kkkkkkkkkkkk..',
  } : dir === 'up' ? {
    1: '.....kkkkkk.....', 2: '....kccccccK....', 3: '...kcccccccck...', 4: '...kCCCCCCCCk...',
  } : {
    1: '.....kkkkkk.....', 2: '....kcccccck....', 3: '...kcccwwccck...', 4: '..kkkkkkkkkkkk..',
  }),
  // Short curls (Truman, Jake), and Chevy's whole round head.
  curly: (rows, dir) => Art.withRows(rows, Object.assign({}, CURLS[dir])),
  round: (rows, dir) => ROUND_HEAD[dir],
  beanie: (rows, dir) => Art.withRows(rows, dir === 'side' ? {
    1: '....kkkkkk......', 2: '...kcccccck.....', 3: '..kcccccccck....', 4: '..kcccccccck....', 5: '..kCCCCCCCCk....',
  } : {
    1: '.....kkkkkk.....', 2: '....kcccccck....', 3: '...kcccccccck...', 4: '...kcccccccck...', 5: '...kCCCCCCCCk...',
  }),
};

// Glasses go on after the hair style.
function addGlasses(rows, dir) {
  if (dir === 'up') return rows;
  return Art.withRows(rows, dir === 'side' ? { 8: '..khhsGGGsk.....' } : { 8: '...kGGssssGGk...' });
}

// A thin, faint mustache.
function addStache(rows, dir) {
  if (dir === 'up') return rows;
  return Art.withRows(rows, dir === 'side' ? { 9: '..khsssssttk....' } : { 9: '...kSsttttsSk...' });
}

// Bodies, from row 12 of a person down: arms at their sides, a real waist, long legs.
// Shirt colors: p main, q shade, Q the collar, trim or logo. tee is short sleeves,
// lean is a thin one, skinny is a tall frame (two rows taller than the rest), big is a wide one.
const BODIES = {
  man: {
    down: [
      '...kkppQQppkk...',
      '..kpppqQQqpppk..',
      '..kpkpqppqpkpk..',
      '..kpkppppppkpk..',
      '..kqkppppppkqk..',
      '..kqkqppppqkqk..',
      '..kskjjjjjjksk..',
      '...kkjjJJjjkk...',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    up: [
      '...kkppppppkk...',
      '..kppppppppppk..',
      '..kpkppppppkpk..',
      '..kpkppppppkpk..',
      '..kqkppppppkqk..',
      '..kqkqppppqkqk..',
      '..kskjjjjjjksk..',
      '...kkjjJJjjkk...',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    side: [
      '....kpppppk.....',
      '....kppppqqk....',
      '....kpppkpqk....',
      '....kpppkpqk....',
      '....kpppkpqk....',
      '....kqppksqk....',
      '....kjjjjjjk....',
      '....kjjjJjjk....',
      '.....kjjJjk.....',
      '.....kjjjjk.....',
      '.....knnnnnk....',
      '.....kNNNNNk....',
    ],
  },
  woman: {
    down: [
      '....kkppppkk....',
      '...kpppQQpppk...',
      '...kpkppppkpk...',
      '...kpkppppkpk...',
      '...kqkkppkkqk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjJJjjk....',
      '....kjjkkjjk....',
      '.....kjkkjk.....',
      '....knnkknnk....',
      '....kNNkkNNk....',
    ],
    up: [
      '....kkppppkk....',
      '...kppppppppk...',
      '...kpkppppkpk...',
      '...kpkppppkpk...',
      '...kqkkppkkqk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjJJjjk....',
      '....kjjkkjjk....',
      '.....kjkkjk.....',
      '....knnkknnk....',
      '....kNNkkNNk....',
    ],
    side: [
      '.....kpppk......',
      '....kppppqk.....',
      '....kpppkqk.....',
      '....kpppkqk.....',
      '.....kppkqk.....',
      '.....kjjksk.....',
      '....kjjjjjk.....',
      '....kjjjJjk.....',
      '.....kjjJjk.....',
      '.....kjjjk......',
      '.....knnnnk.....',
      '.....kNNNNk.....',
    ],
  },
  tee: {
    down: [
      '...kkppppppkk...',
      '..kppppppppppk..',
      '..kppppppppppk..',
      '..kkkppppppkkk..',
      '..kskppppppksk..',
      '..kskppppppksk..',
      '..kskjjjjjjksk..',
      '...kkjjJJjjkk...',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    up: [
      '...kkppppppkk...',
      '..kppppppppppk..',
      '..kppppppppppk..',
      '..kkkppppppkkk..',
      '..kskppppppksk..',
      '..kskppppppksk..',
      '..kskjjjjjjksk..',
      '...kkjjJJjjkk...',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    side: [
      '....kpppppk.....',
      '....kppppppk....',
      '....kppppppk....',
      '....kpppkspk....',
      '....kpppkspk....',
      '....kqppkspk....',
      '....kjjjjjjk....',
      '....kjjjJjjk....',
      '.....kjjJjk.....',
      '.....kjjjjk.....',
      '.....knnnnnk....',
      '.....kNNNNNk....',
    ],
  },
  lean: {
    down: [
      '....kkppppkk....',
      '...kppppppppk...',
      '...kppppppppk...',
      '...kkkppppkkk...',
      '...kskppppksk...',
      '...kskppppksk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    up: [
      '....kkppppkk....',
      '...kppppppppk...',
      '...kppppppppk...',
      '...kkkppppkkk...',
      '...kskppppksk...',
      '...kskppppksk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '...knnnkknnnk...',
      '...kNNNkkNNNk...',
    ],
    side: [
      '.....kpppk......',
      '....kpppppk.....',
      '....kppppqk.....',
      '....kpppksk.....',
      '....kpppksk.....',
      '....kqppksk.....',
      '....kjjjksk.....',
      '....kjjjjjk.....',
      '.....kjjjk......',
      '.....kjJjk......',
      '.....knnnnk.....',
      '.....kNNNNk.....',
    ],
  },
  skinny: {
    down: [
      '....kkppppkk....',
      '...kppQQQQppk...',
      '...kppqQQqppk...',
      '...kskpQQpksk...',
      '...kskppppksk...',
      '...kskppppksk...',
      '...kskqppqksk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjkkjjk....',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '....kwwkkwwk....',
      '...knnnkknnnk...',
    ],
    up: [
      '....kkppppkk....',
      '...kppppppppk...',
      '...kppppppppk...',
      '...kskppppksk...',
      '...kskppppksk...',
      '...kskppppksk...',
      '...kskqppqksk...',
      '...kskjjjjksk...',
      '....kkjjjjkk....',
      '....kjjkkjjk....',
      '....kjjkkjjk....',
      '....kjJkkJjk....',
      '....kwwkkwwk....',
      '...knnnkknnnk...',
    ],
    side: [
      '.....kpppk......',
      '....kpppppk.....',
      '....kppppqk.....',
      '....kpppksk.....',
      '....kpppksk.....',
      '....kpppksk.....',
      '....kqppksk.....',
      '....kjjjksk.....',
      '....kjjjjjk.....',
      '.....kjjjk......',
      '.....kjjjk......',
      '.....kjJjk......',
      '.....kwwwk......',
      '.....knnnnk.....',
    ],
  },
  big: {
    down: [
      '..kkppppppppkk..',
      '.kppppppppppppk.',
      '.kppQQkQQkQQppk.',
      '.kkpQkkkkkkQpkk.',
      '.kskppppppppksk.',
      '.kskppppppppksk.',
      '.kskjjjjjjjjksk.',
      '..kkjjjjjjjjkk..',
      '...kjjjkkjjjk...',
      '...kjjjkkjjjk...',
      '..knnnnkknnnnk..',
      '..kNNNNkkNNNNk..',
    ],
    up: [
      '..kkppppppppkk..',
      '.kppppppppppppk.',
      '.kppppppppppppk.',
      '.kkkppppppppkkk.',
      '.kskppppppppksk.',
      '.kskppppppppksk.',
      '.kskjjjjjjjjksk.',
      '..kkjjjjjjjjkk..',
      '...kjjjkkjjjk...',
      '...kjjjkkjjjk...',
      '..knnnnkknnnnk..',
      '..kNNNNkkNNNNk..',
    ],
    side: [
      '...kkpppppkk....',
      '..kpppppppppk...',
      '..kppppppQQpk...',
      '..kppppkkQQpk...',
      '..kppppkskppk...',
      '..kppppkskppk...',
      '..kjjjjkskjjk...',
      '..kjjjjjjjjjk...',
      '...kjjjjjjjk....',
      '...kjjjjjjjk....',
      '...knnnnnnnk....',
      '...kNNNNNNNk....',
    ],
  },
};

// Kids (Sam): same head on a shorter body, pushed down so their feet still sit on the tile.
const KID_ROWS_CUT = [2, 3, 9];
const SHORTS_FROM = 9;   // body rows from here down are bare leg with `shorts: true`

function personFrame(dir, look) {
  const head = { down: HEAD_DOWN, up: HEAD_UP, side: HEAD_SIDE }[dir];
  let rows = HEAD_STYLES[look.hair || 'short'](head, dir);
  if (look.glasses) rows = addGlasses(rows, dir);
  let body = BODIES[look.body || 'man'][dir];
  if (look.logo && dir === 'down') body = Art.withRows(body, look.logo);
  if (look.shorts) body = body.map((row, i) => (i >= SHORTS_FROM ? row.replace(/[jJ]/g, 's') : row));
  if (look.stache) rows = addStache(rows, dir);
  if (look.tie && dir === 'down') body = Art.withRows(body, { 2: '..kpkpqQQqpkpk..', 3: '..kpkppQQppkpk..', 4: '..kqkppQQppkqk..' });
  if (look.kid) return [...KID_ROWS_CUT.map(() => '.'.repeat(BEN_W)), ...rows, ...body.filter((_, i) => !KID_ROWS_CUT.includes(i))];
  return [...rows, ...body];
}

const SKIN = { light: ['#f3c9a6', '#dba27e'], tan: ['#d8a27a', '#b88058'], dark: ['#9a6a48', '#7a5034'] };

// Each person: hair style + colors. Shirt uses 3 shades (light, mid, dark stripes).
const PEOPLE = {
  mom: { body: 'woman', hair: 'long', hairC: '#3a2414', skin: 'light', shirt: ['#f0a8c8', '#e07aa0', '#c05a84'], pants: '#3d5a9e', shoes: '#5a3a22' },
  pastor: { hair: 'short', hairC: '#c0c0c8', glasses: true, skin: 'light', shirt: ['#3a3a48', '#3a3a48', '#2a2a34'], pants: '#2a2a34', shoes: '#181425' },
  manager: { hair: 'cap', hairC: '#3a2a20', capC: ['#c8323a', '#8e1f2a'], skin: 'tan', shirt: ['#d8403a', '#c8323a', '#a02028'], pants: '#22222a', shoes: '#181425' },
  // Tall and skinny: faded blue Superman shirt, gray sweatpants, white socks and slides.
  truman: { body: 'skinny', hair: 'curly', hairC: '#7a5030', skin: 'light', shirt: ['#5a96c4', '#4a7ea8', '#b8505c'], pants: '#8a8c88', shoes: '#4a5048' },
  cashier: { hair: 'short', hairC: '#7a7a80', skin: 'tan', shirt: ['#40a040', '#2f8a3a', '#e8782a'], pants: '#3a3a48', shoes: '#22222a' },
  coach: { hair: 'cap', hairC: '#5a5a60', capC: ['#c8323a', '#8e1f2a'], skin: 'tan', shirt: ['#a8acb4', '#9aa0ac', '#7a808c'], pants: '#c8b890', shoes: '#f4f4f4' },
  lunchLady: { body: 'woman', hair: 'beanie', hairC: '#c0c0c8', capC: ['#f4f4f4', '#d8d8e0'], skin: 'light', shirt: ['#f4f4f4', '#e8e8ec', '#c8c8d0'], pants: '#3a3a48', shoes: '#22222a' },
  hallTeacher: { hair: 'short', hairC: '#3a2a20', glasses: true, skin: 'light', shirt: ['#7a5aa0', '#6a4a90', '#4a3470'], pants: '#3a3a48', shoes: '#3a2a20' },
  player1: { hair: 'short', hairC: '#22222a', skin: 'dark', shirt: ['#c8323a', '#c8323a', '#f4f4f4'], pants: '#f4f4f4', shoes: '#22222a' },
  player2: { hair: 'short', hairC: '#c89a5a', skin: 'light', shirt: ['#c8323a', '#c8323a', '#f4f4f4'], pants: '#f4f4f4', shoes: '#22222a' },
  // The Trinity Bulldogs (Wheatmore's rival, Friday night): Columbia blue and black.
  bulldog1: { hair: 'short', hairC: '#3a2414', skin: 'tan', shirt: ['#8ab8e0', '#8ab8e0', '#22222a'], pants: '#22222a', shoes: '#f4f4f4' },
  bulldog2: { hair: 'short', hairC: '#22222a', skin: 'dark', shirt: ['#8ab8e0', '#8ab8e0', '#22222a'], pants: '#22222a', shoes: '#f4f4f4' },
  // Lean, short dark curls and a thin mustache: black Wheatmore baseball shirt, jeans.
  jake: { body: 'lean', hair: 'curly', stache: true, hairC: '#3a2820', skin: 'light', shirt: ['#2c2830', '#201c24', '#c8323a'], pants: '#26304f', shoes: '#3a2a20',
    logo: { 1: '...kpQQQQQQpk...', 2: '...kQQpQQpQQk...' } },
  cust1: { body: 'woman', hair: 'long', hairC: '#e8c860', skin: 'light', shirt: ['#80b0e8', '#5a8ac0', '#3f6fa0'], pants: '#3a3a48', shoes: '#22222a' },
  cust2: { hair: 'short', hairC: '#22222a', skin: 'dark', shirt: ['#80c870', '#4fa060', '#357a40'], pants: '#3d5a9e', shoes: '#f4f4f4' },
  cust3: { hair: 'short', hairC: '#d8d8d8', glasses: true, skin: 'light', shirt: ['#c8a070', '#a07848', '#7a5a34'], pants: '#5a4a3a', shoes: '#3a2a20' },
  cust4: { hair: 'cap', hairC: '#6b4226', capC: ['#3f6fa0', '#2a4a78'], skin: 'tan', shirt: ['#f0a050', '#e08030', '#b86020'], pants: '#3a3a48', shoes: '#c8323a' },
  cust5: { body: 'woman', hair: 'long', hairC: '#3a2a20', skin: 'dark', shirt: ['#e0a0e0', '#c070c0', '#a050a0'], pants: '#22222a', shoes: '#22222a' },
  oldLady: { body: 'woman', hair: 'long', hairC: '#e8e8ec', glasses: true, skin: 'light', shirt: ['#b090d8', '#9070c0', '#7050a0'], pants: '#5a5a64', shoes: '#22222a' },
  farmer: { hair: 'cap', hairC: '#8a5a34', capC: ['#3f8a3a', '#2a6a28'], skin: 'tan', shirt: ['#c87050', '#a85030', '#7a3a20'], pants: '#3d5a9e', shoes: '#5a3a22' },
  officer: { hair: 'cap', hairC: '#22222a', capC: ['#26304f', '#1a2238'], skin: 'tan', shirt: ['#3a4a7a', '#34446e', '#26304f'], pants: '#22222a', shoes: '#181425' },
  stepp: { tie: true, hair: 'short', hairC: '#6b4226', skin: 'light', shirt: ['#c8dcf0', '#a8c0e0', '#c8323a'], pants: '#3a3a48', shoes: '#3a2a20' },
  mathTeacher: { body: 'woman', hair: 'long', hairC: '#b8582a', glasses: true, skin: 'light', shirt: ['#5a9a6a', '#4a8a5a', '#3a6a48'], pants: '#3a3a48', shoes: '#22222a' },
  // Ben's little brother (kid: shorter), in a dinosaur-green shirt.
  sam: { kid: true, hair: 'short', hairC: '#c89a5a', skin: 'light', shirt: ['#6ac050', '#4fa060', '#e8c040'], pants: '#3d5a9e', shoes: '#c8323a' },
  // Long dark hair and glasses: navy shirt with an orange logo down one side, khaki shorts.
  vinson: { body: 'tee', shorts: true, hair: 'long', hairC: '#1e1a22', glasses: true, skin: 'tan', shirt: ['#26305a', '#1e264a', '#e8902a'], pants: '#c0ac84', shoes: '#3a2a20',
    logo: { 1: '..kppppppQpppk..', 2: '..kppppppQpppk..', 3: '..kkkpppQppkkk..' } },
  delano: { hair: 'beanie', hairC: '#3a2414', capC: ['#22222a', '#181425'], skin: 'tan', shirt: ['#a9adb5', '#8a8f9a', '#6a6f7a'], pants: '#26304f', shoes: '#c8323a' },
  waiter: { hair: 'short', hairC: '#22222a', skin: 'tan', shirt: ['#f4f4f4', '#e8e8ec', '#c8323a'], pants: '#22222a', shoes: '#181425' },
  // The love interest: a cute blonde. Maddy and Jamie look the same.
  maddy: { body: 'woman', hair: 'long', hairC: '#f0d878', skin: 'light', shirt: ['#f8b8d0', '#f098b8', '#d87098'], pants: '#3d5a9e', shoes: '#f4f4f4' },
  jamie: { body: 'woman', hair: 'long', hairC: '#f0d878', skin: 'light', shirt: ['#f8b8d0', '#f098b8', '#d87098'], pants: '#3d5a9e', shoes: '#f4f4f4' },
  // Big and round: black Batman shirt, black shorts, black sneakers with white soles.
  chevy: { body: 'big', shorts: true, hair: 'round', hairC: '#3a2a20', skin: 'light', shirt: ['#2c2c34', '#22222a', '#e8c838'], pants: '#1c1c22', shoes: '#1c1c22', sole: '#e8e8e8' },
  teen: { hair: 'short', hairC: '#e8c860', skin: 'light', shirt: ['#f4f4f4', '#d8d8e0', '#b8b8c8'], pants: '#26304f', shoes: '#c8323a' },
};

// A color made lighter or darker: shade('#806040', 0.75).
function shade(hex, by) {
  const value = [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * by)));
  return `#${value.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function personPalette(look) {
  const [skin, skinShade] = SKIN[look.skin];
  const [cap, capDark] = look.capC || ['#888888', '#666666'];
  return {
    k: K, K, h: look.hairC, H: shade(look.hairC, 1.25), d: shade(look.hairC, 0.75), s: skin, S: skinShade, m: '#a85a4a',
    c: cap, C: capDark, w: '#f4f4f4', G: '#22222a', g: skin, t: '#8a6a58',
    p: look.shirt[0], q: look.shirt[1], Q: look.shirt[2],
    j: look.pants, J: shade(look.pants, 0.75), n: look.shoes, N: look.sole || K,
  };
}

const People = {
  // One texture per person: 'npc_mom' etc. with frames down_0, up_0, side_0.
  build(scene) {
    for (const [id, look] of Object.entries(PEOPLE)) {
      const frames = { down_0: personFrame('down', look), up_0: personFrame('up', look), side_0: personFrame('side', look) };
      Art.buildStrip(scene, `npc_${id}`, frames, personPalette(look), BEN_W, frames.down_0.length);
    }
  },
};
