// Scene maps. Each row is one line of tiles; each character maps to a
// ground tile (floor/wall, styled by which room it's in) and optionally an
// object drawn on top. Solid ground or a solid object blocks Ben.
//
// Ground kinds: floor, wallU (upper wall), wallL (lower wall with baseboard),
// wallS (single-row wall), border (dark wall tops / rooms not shown).

const LEGEND = {
  // structure
  '#': { ground: 'border' },
  'U': { ground: 'wallU' },
  'L': { ground: 'wallL' },
  'W': { ground: 'wallS' },
  '.': { ground: 'floor' },
  '_': { ground: 'floor' }, // door threshold
  // Ben's room
  'A': { ground: 'wallU', obj: 'posterAF' },
  'Q': { ground: 'wallU', obj: 'posterTruck' },
  'F': { ground: 'wallU', obj: 'flag' },
  'K': { ground: 'wallU', obj: 'deer' },
  'Y': { ground: 'wallU', obj: 'windowBen' },
  'B': { obj: 'bedHead' },
  'b': { obj: 'bedFoot' },
  'n': { obj: 'nightstand' },
  '3': { obj: 'deskL' },
  '4': { obj: 'deskR' },
  'o': { obj: 'beanbag' },
  'c': { obj: 'gamingChair' },
  'G': { obj: 'guitar' },
  'D': { obj: 'dresser' },
  'H': { obj: 'hamper' },
  'x': { obj: 'clothes' },
  'z': { obj: 'cans' },
  't': { obj: 'trash' },
  'm': { obj: 'helmet' },
  'r': { obj: 'rugBen' },
  // bathroom
  'M': { ground: 'wallU', obj: 'mirror' },
  'O': { ground: 'wallL', obj: 'towel' },
  'T': { obj: 'toilet' },
  'S': { obj: 'sink' },
  '5': { obj: 'tub0' },
  '6': { obj: 'tub1' },
  '7': { obj: 'tub2' },
  'a': { obj: 'bathMat' },
  // hallway
  'd': { obj: 'door' },     // opens when Ben walks up to it
  '|': { obj: 'sideDoor' }, // door in a side wall
  'X': { ground: 'wallS', obj: 'doorClosed' },
  'p': { ground: 'wallS', obj: 'photos' },
  '+': { ground: 'wallS', obj: 'cross' },
  'R': { obj: 'runner' },
  'e': { obj: 'doormat' },
  // kitchen
  'u': { ground: 'wallU', obj: 'upperCabinet' },
  'y': { ground: 'wallU', obj: 'windowKitchen' },
  'g': { ground: 'wallL', obj: 'fridgeTop' },
  'f': { obj: 'fridgeBot' },
  'C': { obj: 'counter' },
  'V': { obj: 'counterSink' },
  'I': { obj: 'microwave' },
  'E': { obj: 'stove' },
  '8': { obj: 'tableTL' },
  '9': { obj: 'tableTR' },
  '(': { obj: 'tableBL' },
  ')': { obj: 'tableBR' },
  'j': { obj: 'chairR' },    // on the left of a table, facing right
  // Sam's room
  'Z': { ground: 'wallU', obj: 'windowSam' },
  '&': { ground: 'wallU', obj: 'dinoPoster' },
  '<': { obj: 'samBedHead' },
  '>': { obj: 'samBedFoot' },
  '%': { obj: 'toybox' },
  '~': { obj: 'toys' },
  'w': { obj: 'samRug' },
  // garage
  'P': { ground: 'wallU', obj: 'pegboard' },
  'N': { ground: 'wallU', obj: 'garageDoorTop' },
  'J': { ground: 'wallL', obj: 'garageDoorBottom' },
  'q': { ground: 'wallL', obj: 'garageFridgeTop' },
  's': { obj: 'garageFridgeBot' },
  '[': { obj: 'benchL' },
  ']': { obj: 'benchR' },
  'k': { obj: 'toolChest' },
  '{': { obj: 'bikeL' },
  '}': { obj: 'bikeR' },
  'i': { obj: 'tires' },
  'l': { obj: 'oilStain' },
  'v': { obj: 'gasCan' },
};

// Ben's floor in the house (the clean room minigame stretches this to its own room).
const BEN_ROOM = { x: 1, y: 13, w: 9, h: 7 };

// The mess on Ben's floor: [x, y, object, first day it shows up]. It piles up
// from Sunday (day 1) to Thursday (day 5), then it's gone for the rest of the
// week once Ben wins the clean room game. (Lose it and the mess stays.)
const BEN_MESS = [
  [5, 13, 'clothes', 1], [1, 17, 'cans', 1], [8, 17, 'chips', 1], [1, 18, 'clothes', 1], [8, 19, 'cans', 1],
  [2, 16, 'clothes', 2], [6, 15, 'chips', 2], [3, 19, 'cans', 2], [3, 15, 'socks', 3], [5, 16, 'pizzaBox', 3],
  [7, 19, 'clothes', 3], [9, 16, 'cans', 3], [6, 13, 'socks', 4], [6, 16, 'clothes', 4], [2, 19, 'socks', 4],
  [7, 18, 'chips', 4], [2, 15, 'clothes', 5], [8, 16, 'socks', 5], [3, 17, 'clothes', 5], [4, 16, 'pizzaBox', 5],
  [7, 16, 'cans', 5], [4, 19, 'clothes', 5],
];

function messProps() {
  return Object.fromEntries(BEN_MESS.map(([x, y, obj, day], i) => [
    `mess${i}`, { x, y, obj, if: { dayAtLeast: day, notWon: 'cleanRoom' } },
  ]));
}

const MAPS = {
  // Ben's house. Sam's room is L-shaped across the
  // top left, then the bathroom (one door, to the hall) and the kitchen, which
  // the hall opens straight into. Down the middle: the stairs to the basement
  // (Ben can't go down), the washer and dryer nook, and a room that isn't in the
  // game. Bottom: Ben's room, his closet under the stairs, and the living room,
  // one open space with the front door.
  house: {
    name: "Ben's House",
    // What Ben wears on this map (Ben.dressFor in state.js; maps without one are casual).
    outfit: 'home', // pajamas until he changes in his closet, casual when he comes back home
    music: 'home',
    // Named places Ben can appear. `arrive` is used when traveling here.
    spawns: {
      bed: { x: 2, y: 14, facing: 'down' },
      bathFloor: { x: 12, y: 5, facing: 'up' },
      frontDoor: { x: 15, y: 18, facing: 'up' },
    },
    arrive: 'frontDoor',
    // Stepping on a warp tile either travels (to) or counts as doing `on`,
    // the same as inspecting something with that name (story beats can wait for it).
    warps: [{ x: 15, y: 19, on: 'frontDoor' }],
    inspect: { doormat: 'frontDoor', doorClosed: 'frontDoor' },
    // Props the story can show/hide (`show`/`hide` effects in content.js).
    // hidden: true = not there unless the story shows it. dx/dy nudge the drawing in pixels.
    props: {
      guitar: { x: 3, y: 13, obj: 'guitar' },   // leaning against Ben's wall
      breakfast: { x: 21, y: 5, obj: 'breakfastFood', dx: 8, dy: 8, hidden: true },
      // Mom's dinners (Monday to Thursday): on the table when Ben gets home, gone once he eats.
      dinnerMeatloaf: { x: 21, y: 5, obj: 'dinnerMeatloaf', dx: 8, dy: 8, hidden: true },
      dinnerBeans: { x: 21, y: 5, obj: 'dinnerBeans', dx: 8, dy: 8, hidden: true },
      dinnerChicken: { x: 21, y: 5, obj: 'dinnerChicken', dx: 8, dy: 8, hidden: true },
      dinnerChili: { x: 21, y: 5, obj: 'dinnerChili', dx: 8, dy: 8, hidden: true },
      ...messProps(),
    },
    // People standing on the map. `who` = which sprite (src/people.js), `on` = their
    // name for talking and story beats. Shown/hidden like props.
    npcs: {
      // At the end of the table, low enough that the panels at the top of the screen don't cover her.
      momKitchen: { x: 24, y: 6, facing: 'left', who: 'mom', on: 'mom', hidden: true },
      // Waiting inside the front door the night she finds out about the 7-Eleven.
      momDoor: { x: 15, y: 17, facing: 'down', who: 'mom', on: 'mom', hidden: true },
      // Saturday (day 7): Sam in his room, mid-tantrum, by his toys.
      sam: { x: 4, y: 7, facing: 'down', who: 'sam', on: 'sam', if: { dayAtLeast: 7 } },
    },
    defaultStyle: 'hall',
    // Floor/wall style per room; everything else uses defaultStyle.
    zones: [
      { style: 'sam', x: 1, y: 1, w: 10, h: 5 },
      { style: 'sam', x: 1, y: 6, w: 6, h: 5 },
      { style: 'bath', x: 12, y: 1, w: 4, h: 5 },
      { style: 'kitchen', x: 17, y: 1, w: 10, h: 9 },
      { style: 'ben', x: 1, y: 12, w: 9, h: 8 },
      { style: 'living', x: 14, y: 15, w: 13, h: 5 },
    ],
    // Lighting areas: only the area Ben is standing in is lit, the rest is
    // dimmed. Tiles outside every area (door tiles) keep the current lighting.
    areas: {
      ben: [{ x: 1, y: 12, w: 9, h: 8 }],
      closet: [{ x: 11, y: 16, w: 2, h: 4 }],
      sam: [{ x: 1, y: 1, w: 10, h: 5 }, { x: 1, y: 6, w: 6, h: 5 }],
      bath: [{ x: 12, y: 1, w: 4, h: 5 }],
      main: [
        { x: 17, y: 1, w: 10, h: 9 }, { x: 8, y: 7, w: 9, h: 3 }, { x: 8, y: 10, w: 2, h: 1 }, { x: 11, y: 10, w: 2, h: 5 },
        { x: 14, y: 10, w: 3, h: 5 }, { x: 17, y: 11, w: 3, h: 3 }, { x: 14, y: 15, w: 13, h: 5 },
      ],
    },
    // House-only characters (they mean something else on other maps).
    legend: {
      'Y': { ground: 'wallS', obj: 'windowBen' }, 'A': { ground: 'wallS', obj: 'posterAF' },
      'h': { ground: 'wallS', obj: 'cowboyHat' }, 'v': { ground: 'wallS', obj: 'gunRack' },
      'k': { ground: 'wallS', obj: 'compoundBow' }, 'i': { ground: 'wallS', obj: 'woodSign' },
      ':': { ground: 'wallS', obj: 'windowLiving' },
      'q': { obj: 'miniFridge' }, 's': { obj: 'gameShelf' },
      'J': { obj: 'stairs0L' }, 'Q': { obj: 'stairs0R' }, 'N': { obj: 'stairs1L' }, 'F': { obj: 'stairs1R' },
      'P': { obj: 'stairs2L' }, '=': { obj: 'stairs2R' }, 'G': { obj: 'stairs3L' }, '/': { obj: 'stairs3R' },
      'K': { obj: 'stairs4L' }, ';': { obj: 'stairs4R' },
      '0': { obj: 'washer' }, '@': { obj: 'dryer' }, ',': { obj: 'chairL' },
      '*': { obj: 'closetJunk' }, '$': { obj: 'closetBoxes' }, '^': { obj: 'closetRackTop' }, '`': { obj: 'closetRack' },
      '[': { obj: 'couchL' }, ']': { obj: 'couchR' }, '{': { obj: 'bigTvL' }, '}': { obj: 'bigTvR' },
      '?': { obj: 'recliner' }, '-': { obj: 'livingRug' }, '!': { obj: 'lamp' }, 'l': { obj: 'plant' },
    },
    rows: [
      '############################',
      '#UZU&UUUUUU#UMUU#uuyuuUUUUU#',
      '#LLLLLLLLLL#LLOL#LLLLLLLLLg#',
      '#<n.D....%.#TS.5#CIVCE...tf#',
      '#>.......~.#..a6#..........#',
      '#..........#..a7#...j89,...#',
      '#.wwww.#_####_###...j(),...#',
      '#.wwww.#dpW+WdWW#..........#',
      '#.wwww~#...................#',
      '#......#RRRRRRRRR..........#',
      '#......#..#JQ#...###########',
      '########_##NF#...WWW########',
      '#YWWhvkAdi#P=#....0@########',
      '#Bn......D#G/#......########',
      '#b........#K;#...###########',
      '#q.rrrrr..####...WW:WpW:WWW#',
      '#s.rrrrr..#WW#.......{}...l#',
      '#..rrrrr..#*^#......----...#',
      '#....c....d.`#......----?..#',
      '#H...34..t#.$#.e....![]....#',
      '###############X############',
    ],
  },

  // Scene card: a stand-in for places that don't have a map yet. Black screen
  // with the beat's `label` as the place name (see WorldScene.buildCard).
  card: {
    name: 'Somewhere',
    card: true,
    spawns: { center: { x: 10, y: 6, facing: 'down' } },
    arrive: 'center',
    defaultStyle: 'garage',
    rows: Array(12).fill('#'.repeat(20)),
  },

  sevenEleven: {
    name: '7-Eleven',
    spawns: { door: { x: 4, y: 8, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 4, y: 9, on: 'storeDoor' }],
    inspect: { doormat: 'storeDoor' },
    npcs: {
      truman: { x: 2, y: 4, facing: 'left', who: 'truman', on: 'truman' },
      cashier: { x: 11, y: 5, facing: 'down', who: 'cashier', on: 'cashier', sleeping: true },
    },
    defaultStyle: 'store',
    legend: {
      'C': { ground: 'wallU', obj: 'sodaCoolerTop' },
      'c': { ground: 'wallL', obj: 'sodaCoolerBot' },
      'B': { ground: 'wallU', obj: 'beerCoolerTop' },
      'b': { ground: 'wallL', obj: 'beerCoolerBot' },
      '[': { obj: 'shelfL' },
      ']': { obj: 'shelfR' },
      '=': { obj: 'storeCounter' },
      'r': { obj: 'storeRegister' },
      'S': { obj: 'slurpee' },
      'h': { obj: 'hotdogs' },
    },
    // Two border rows on top and 11 rows in all, so the coolers sit below the HUD.
    // The cashier sleeps behind the counter in the top-right corner.
    rows: [
      '##############',
      '##############',
      '#UCCCCBBBBUUU#',
      '#LccccbbbbLLL#',
      '#S........=..#',
      '#h.[]..[].=..#',
      '#.........=r=#',
      '#..[]..[]....#',
      '#............#',
      '#...e........#',
      '##############',
    ],
  },

  // --- School (Monday-Friday) ----------------------------------------------
  // Each school map starts with two border rows and is at most 11 rows tall, so
  // it fits on screen without scrolling and the top wall sits below the HUD.

  parkingLot: {
    name: 'School',
    spawns: {
      truck: { x: 6, y: 7, facing: 'left' },
      school: { x: 7, y: 4, facing: 'down' }, // coming back out the front doors
    },
    arrive: 'truck',
    // Tuesday's truck search: the officer and the knife show up during class (and
    // Truman and the student go inside).
    props: {
      knife: { x: 4, y: 7, obj: 'knife', dx: 6, dy: 2, hidden: true },
    },
    npcs: {
      lotTruman: { x: 10, y: 4, facing: 'down', who: 'truman', on: 'trumanSchool' },
      lotStudent: { x: 3, y: 4, facing: 'right', who: 'teen', on: 'student' },
      officer: { x: 3, y: 7, facing: 'right', who: 'officer', on: 'officer', hidden: true },
    },
    defaultStyle: 'asphalt',
    zones: [{ style: 'brick', x: 0, y: 0, w: 16, h: 4 }, { style: 'sidewalk', x: 1, y: 4, w: 14, h: 1 }],
    legend: {
      'w': { ground: 'wallU', obj: 'schoolWindow' },
      '1': { ground: 'wallU', obj: 'schoolSign0' }, '2': { ground: 'wallU', obj: 'schoolSign1' },
      '3': { ground: 'wallU', obj: 'schoolSign2' },
      '{': { ground: 'wallL', obj: 'schoolDoorL' },
      '}': { ground: 'wallL', obj: 'schoolDoorR' },
      ',': { ground: 'floor' },
      '|': { obj: 'parkLine' },
      'A': { obj: 'truckTL' }, 'B': { obj: 'truckTR' }, 'C': { obj: 'truckML' },
      'D': { obj: 'truckMR' }, 'E': { obj: 'truckBL' }, 'F': { obj: 'truckBR' },
      'a': { obj: 'carTL' }, 'b': { obj: 'carTR' }, 'c': { obj: 'carML' },
      'd': { obj: 'carMR' }, 'e': { obj: 'carBL' }, 'f': { obj: 'carBR' },
    },
    rows: [
      '################',
      '################',
      '#UwUwU123wUwUwU#',
      '#LLLLLL{}LLLLLL#',
      '#,,,,,,,,,,,,,,#',
      '#..|..|..|..|..#',
      '#..|AB|..|ab|..#',
      '#..|CD|..|cd|..#',
      '#..|EF|..|ef|..#',
      '#..|..|..|..|..#',
      '################',
    ],
  },

  hallway: {
    name: 'School Hallway',
    spawns: { entrance: { x: 1, y: 6, facing: 'right' } },
    arrive: 'entrance',
    warps: [{ x: 1, y: 7, on: 'hallExit' }],
    inspect: { doormat: 'hallExit' },
    npcs: {
      teacher: { x: 12, y: 5, facing: 'left', who: 'hallTeacher', on: 'hallTeacher' },
      student1: { x: 3, y: 4, facing: 'up', who: 'cust5', on: 'student' },
      student2: { x: 7, y: 4, facing: 'up', who: 'cust2', on: 'student' },
    },
    defaultStyle: 'school',
    legend: {
      'k': { ground: 'wallU', obj: 'lockerTop' },
      'K': { ground: 'wallL', obj: 'lockerBot' },
      'b': { ground: 'wallU', obj: 'bulletin' },
      'x': { ground: 'wallU', obj: 'warriorsBanner0' }, 'y': { ground: 'wallU', obj: 'warriorsBanner1' },
      'z': { ground: 'wallU', obj: 'warriorsBanner2' },
      '1': { ground: 'wallL', obj: 'classDoor' },
      'T': { ground: 'wallL', obj: 'trophyCase' },
      'F': { obj: 'fountain' },
    },
    rows: [
      '##################',
      '##################',
      '#kkkkbkkkxyzkkkkU#',
      '#KKKKLKKK1LTKKKKL#',
      '#...............F#',
      '#................#',
      '#................#',
      '#e...............#',
      '##################',
    ],
  },

  cafeteria: {
    name: 'Cafeteria',
    spawns: { door: { x: 14, y: 8, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 14, y: 9, on: 'cafExit' }],
    inspect: { doormat: 'cafExit' },
    npcs: {
      lunchLady: { x: 3, y: 4, facing: 'down', who: 'lunchLady', on: 'lunchLady' },
      truman: { x: 4, y: 8, facing: 'up', who: 'truman', on: 'trumanLunch' },
      student1: { x: 9, y: 6, facing: 'left', who: 'teen', on: 'student' },
      student2: { x: 11, y: 8, facing: 'up', who: 'cust1', on: 'student' },
    },
    defaultStyle: 'cafeteria',
    legend: {
      'm': { ground: 'wallU', obj: 'cafMenu' },
      'w': { ground: 'wallU', obj: 'schoolWindow' },
      'X': { ground: 'wallU', obj: 'warriorsBanner0' }, 'Y': { ground: 'wallU', obj: 'warriorsBanner1' },
      'Z': { ground: 'wallU', obj: 'warriorsBanner2' },
      'l': { obj: 'lunchCounter' },
      'x': { obj: 'trash' },
      '[': { obj: 'cafTableL' },
      ']': { obj: 'cafTableR' },
    },
    rows: [
      '################',
      '################',
      '#UUmUXYZUwUUUwU#',
      '#LLLLLLLLLLLLLL#',
      '#.....l.......x#',
      '#llllll........#',
      '#..............#',
      '#..[]..[]..[]..#',
      '#..............#',
      '#..[]..[]..[].e#',
      '################',
    ],
  },

  field: {
    name: 'Football Field',
    outfit: 'football', // football uniform
    spawns: { gate: { x: 9, y: 8, facing: 'up' } },
    arrive: 'gate',
    warps: [{ x: 9, y: 9, on: 'fieldExit' }],
    inspect: { doormat: 'fieldExit' },
    npcs: {
      coach: { x: 9, y: 6, facing: 'down', who: 'coach', on: 'coach' },
      player1: { x: 3, y: 8, facing: 'up', who: 'player1', on: 'player' },
      player2: { x: 13, y: 7, facing: 'left', who: 'player2', on: 'player' },
      // Friday night (day 6): a crowd in the bleachers, and Mom with her sign.
      momGame: { x: 10, y: 3, facing: 'down', who: 'mom', on: 'momGame', if: { dayAtLeast: 6 } },
      fan1: { x: 2, y: 2, facing: 'down', who: 'cust1', on: 'fan', if: { dayAtLeast: 6 } },
      fan2: { x: 4, y: 3, facing: 'down', who: 'farmer', on: 'fan', if: { dayAtLeast: 6 } },
      fan3: { x: 7, y: 2, facing: 'down', who: 'cust4', on: 'fan', if: { dayAtLeast: 6 } },
      fan4: { x: 13, y: 3, facing: 'down', who: 'oldLady', on: 'fan', if: { dayAtLeast: 6 } },
      fan5: { x: 15, y: 2, facing: 'down', who: 'teen', on: 'fan', if: { dayAtLeast: 6 } },
      fan6: { x: 17, y: 3, facing: 'down', who: 'cust2', on: 'fan', if: { dayAtLeast: 6 } },
    },
    props: {
      momSign0: { x: 9, y: 2, obj: 'momSign0', dy: -4, if: { dayAtLeast: 6 } },
      momSign1: { x: 10, y: 2, obj: 'momSign1', dy: -4, if: { dayAtLeast: 6 } },
      momSign2: { x: 11, y: 2, obj: 'momSign2', dy: -4, if: { dayAtLeast: 6 } },
    },
    defaultStyle: 'field',
    legend: {
      'B': { obj: 'bleacher' },
      '|': { obj: 'yardLine' },
      '(': { obj: 'endZoneL' }, ')': { obj: 'endZoneR' },
      '6': { obj: 'midW0' }, '7': { obj: 'midW1' }, '8': { obj: 'midW2' }, '9': { obj: 'midW3' },
      '<': { obj: 'sledL' },
      '>': { obj: 'sledR' },
      'c': { obj: 'cone' },
      'W': { obj: 'waterCooler' },
    },
    rows: [
      '####################',
      '####################',
      '#BBBBBBBBBBBBBBBBBB#',
      '#BBBBBBBBBBBBBBBBBB#',
      '#(...|....|....|..W#',
      '#(...|....|....|..)#',
      '#(.<>|.67.|.c..|..)#',
      '#(...|.89.|....|.c)#',
      '#(...|....|....|..)#',
      '#(...|...e|....|..)#',
      '####################',
    ],
  },

  // El Rancho (Saturday if Ben skips work): Truman, Jake and Chevy already
  // have a booth with a sizzling fajita platter.
  elRancho: {
    name: 'El Rancho',
    spawns: { door: { x: 7, y: 8, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 7, y: 9, on: 'ranchoExit' }],
    inspect: { doormat: 'ranchoExit' },
    npcs: {
      truman: { x: 8, y: 4, facing: 'down', who: 'truman', on: 'trumanRancho' },
      jake: { x: 9, y: 4, facing: 'down', who: 'jake', on: 'jake' },
      chevy: { x: 10, y: 5, facing: 'left', who: 'chevy', on: 'chevyRancho' },
      waiter: { x: 4, y: 6, facing: 'right', who: 'waiter', on: 'waiter' },
      diner1: { x: 2, y: 4, facing: 'down', who: 'farmer', on: 'diner' },
      diner2: { x: 13, y: 6, facing: 'up', who: 'cust5', on: 'diner' },
    },
    defaultStyle: 'rancho',
    legend: {
      'p': { ground: 'wallU', obj: 'papelPicado' },
      's': { ground: 'wallU', obj: 'sombrero' },
      'n': { ground: 'wallU', obj: 'pinata' },
      '[': { obj: 'boothL' },
      ']': { obj: 'boothR' },
      '{': { obj: 'fajitaL' },
      '}': { obj: 'fajitaR' },
    },
    rows: [
      '################',
      '################',
      '#ppsppnppppsppn#',
      '#LLLLLLLLLLLLLL#',
      '#..............#',
      '#.[]....{}..[].#',
      '#..............#',
      '#.[]........[].#',
      '#..............#',
      '#......e.......#',
      '################',
    ],
  },

  // The team's party after the Friday game, out in a field: a bonfire, trucks
  // backed up to it, and pines all the way around. Ben's truck is bottom left.
  party: {
    name: 'The Party',
    spawns: { truck: { x: 3, y: 8, facing: 'left' } },
    arrive: 'truck',
    glow: [{ x: 10, y: 7, r: 62 }],   // firelight, on top of the night tint
    npcs: {
      crushMaddy: { x: 14, y: 6, facing: 'left', who: 'maddy', on: 'crush', if: { notChose: { crush: 'Jamie' } } },
      crushJamie: { x: 14, y: 6, facing: 'left', who: 'jamie', on: 'crush', if: { chose: { crush: 'Jamie' } } },
      friend: { x: 15, y: 7, facing: 'left', who: 'cust1', on: 'partyGirl' },
      truman: { x: 6, y: 6, facing: 'right', who: 'truman', on: 'trumanParty' },
      jake: { x: 16, y: 5, facing: 'left', who: 'jake', on: 'jakeParty' },
      chevy: { x: 17, y: 8, facing: 'left', who: 'chevy', on: 'chevyParty' },
      vinson: { x: 6, y: 8, facing: 'up', who: 'vinson', on: 'vinsonParty' },
      delano: { x: 7, y: 9, facing: 'up', who: 'delano', on: 'delanoParty' },
      team1: { x: 14, y: 8, facing: 'up', who: 'cust2', on: 'partyTeam' },
      team2: { x: 5, y: 5, facing: 'right', who: 'teen', on: 'partyTeam' },
    },
    defaultStyle: 'pasture',
    zones: [{ style: 'pastureDirt', x: 7, y: 5, w: 6, h: 4 }],
    legend: {
      '^': { obj: 'pine' },
      'q': { obj: 'fireTL' }, 'r': { obj: 'fireTR' }, 's': { obj: 'fireBL' }, 't': { obj: 'fireBR' },
      '[': { obj: 'logL' }, ']': { obj: 'logR' },
      'h': { obj: 'hayBale' },
      'x': { obj: 'cooler' },
      'A': { obj: 'truckTL' }, 'B': { obj: 'truckTR' }, 'C': { obj: 'truckML' },
      'D': { obj: 'truckMR' }, 'E': { obj: 'truckBL' }, 'F': { obj: 'truckBR' },
      'a': { obj: 'pickupTL' }, 'b': { obj: 'pickupTR' }, 'c': { obj: 'pickupML' },
      'd': { obj: 'pickupMR' }, 'e': { obj: 'pickupBL' }, 'f': { obj: 'pickupBR' },
    },
    rows: [
      '^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^',
      '^..ab....ab....ab..^',
      '^..cd....cd....cd..^',
      '^..ef....ef....ef..^',
      '^........[]........^',
      '^..x....hqrh....x..^',
      '^AB.....hsth.......^',
      '^CD......[]........^',
      '^EF................^',
      '^^^^^^^^^^^^^^^^^^^^',
    ],
  },

  // Mr. Stepp's classroom (Wednesday's argument). Students sit below their desks,
  // facing the whiteboard. Ben's desk is the empty one in the back.
  classroom: {
    name: "Mr. Stepp's Class",
    music: null,   // quiet in class
    spawns: { door: { x: 14, y: 8, facing: 'left' } },
    arrive: 'door',
    warps: [{ x: 14, y: 9, on: 'classroomExit' }],
    inspect: { doormat: 'classroomExit' },
    npcs: {
      stepp: { x: 4, y: 4, facing: 'down', who: 'stepp', on: 'stepp' },
      // Thursday's math test: the day hides Stepp and shows her instead.
      mathTeacher: { x: 4, y: 4, facing: 'down', who: 'mathTeacher', on: 'mathTeacher', hidden: true },
      kid1: { x: 3, y: 7, facing: 'up', who: 'teen', on: 'classmate' },
      kid2: { x: 7, y: 7, facing: 'up', who: 'cust1', on: 'classmate' },
      kid3: { x: 7, y: 9, facing: 'up', who: 'cust2', on: 'classmate' },
      kid4: { x: 5, y: 9, facing: 'up', who: 'cust5', on: 'classmate' },
      kid5: { x: 9, y: 9, facing: 'up', who: 'player1', on: 'classmate' },
    },
    defaultStyle: 'classroom',
    legend: {
      '1': { ground: 'wallU', obj: 'whiteboard0' },
      '2': { ground: 'wallU', obj: 'whiteboard1' },
      '3': { ground: 'wallU', obj: 'whiteboard2' },
      '4': { ground: 'wallU', obj: 'whiteboard3' },
      'c': { ground: 'wallU', obj: 'wallClock' },
      'w': { ground: 'wallU', obj: 'schoolWindow' },
      '[': { obj: 'teacherDeskL' },
      ']': { obj: 'teacherDeskR' },
      'd': { obj: 'studentDesk' },
      'B': { obj: 'benDesk' },
      'f': { obj: 'fishTank' },
    },
    rows: [
      '################',
      '################',
      '#UU1234UUcUwUwU#',
      '#LLLLLLLLLLLLLL#',
      '#.[].........f.#',
      '#..............#',
      '#..d.d.d.d.d...#',
      '#..............#',
      '#..d.d.d.d.B...#',
      '#.............e#',
      '################',
    ],
  },

  // School bathroom: three stalls on the left, sinks on the right.
  // Chevy shows up at the door (Wednesday and Thursday).
  schoolBathroom: {
    name: 'School Bathroom',
    music: null,   // Chevy could be anywhere
    spawns: { door: { x: 10, y: 7, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 10, y: 8, on: 'bathroomExit' }],
    inspect: { doormat: 'bathroomExit', toilet: 'stall', mirror: 'schoolMirror', sink: 'schoolMirror' },
    npcs: {
      chevy: { x: 10, y: 7, facing: 'left', who: 'chevy', on: 'chevy', hidden: true },
    },
    defaultStyle: 'schoolBath',
    legend: {
      '|': { obj: 'stallWall' },
      'S': { obj: 'stallDoor' },
      'h': { ground: 'wallU', obj: 'handDryer' },
      's': { obj: 'sink' },
      'x': { obj: 'trash' },
    },
    rows: [
      '##############',
      '##############',
      '#UUUUUUMUMUhU#',
      '#LLLLLLLLLLLL#',
      '#T|T|T.s.s.x.#',
      '#S|S|S.......#',
      '#............#',
      '#............#',
      '#.........e..#',
      '##############',
    ],
  },

  // Thrift store (Tuesday after practice, with Truman).
  labelShopper: {
    name: 'Label Shopper',
    spawns: { door: { x: 5, y: 8, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 5, y: 9, on: 'thriftDoor' }],
    inspect: { doormat: 'thriftDoor', storeCounter: 'thriftRegister', storeRegister: 'thriftRegister' },
    npcs: {
      truman: { x: 14, y: 7, facing: 'left', who: 'truman', on: 'trumanThrift' },
      cashier: { x: 13, y: 4, facing: 'down', who: 'oldLady', on: 'thriftCashier' },
      shopper: { x: 4, y: 6, facing: 'up', who: 'cust3', on: 'shopper' },
    },
    defaultStyle: 'thrift',
    legend: {
      '1': { ground: 'wallU', obj: 'thriftSign0' },
      '2': { ground: 'wallU', obj: 'thriftSign1' },
      '3': { ground: 'wallU', obj: 'thriftSign2' },
      '4': { ground: 'wallU', obj: 'thriftSign3' },
      'f': { ground: 'wallU', obj: 'fittingTop' },
      'F': { ground: 'wallL', obj: 'fittingBot' },
      '[': { obj: 'rack0L' },
      ']': { obj: 'rack0R' },
      '{': { obj: 'rack1L' },
      '}': { obj: 'rack1R' },
      '<': { obj: 'junkShelfL' },
      '>': { obj: 'junkShelfR' },
      'M': { obj: 'mannequin' },
      'b': { obj: 'bargainBin' },
      '=': { obj: 'storeCounter' },
      'r': { obj: 'storeRegister' },
    },
    // Two border rows on top and 11 rows in all, like the school maps.
    rows: [
      '################',
      '################',
      '#U1234UfUfUUUUU#',
      '#LLLLLLFLFLLLLL#',
      '#..............#',
      '#.[]..{}b...=r=#',
      '#..............#',
      '#.{}..[]..<>.M.#',
      '#..............#',
      '#....e.........#',
      '################',
    ],
  },

  garage: {
    name: 'Garage',
    spawns: { door: { x: 5, y: 6, facing: 'up' } },
    arrive: 'door',
    // The story always says when Ben leaves, so the mat only talks.
    warps: [{ x: 5, y: 7, on: 'garageMat' }],
    // Per-map overrides of CONTENT.inspect (the doormat isn't the front door here).
    inspect: { doormat: 'garageMat' },
    defaultStyle: 'garage',
    rows: [
      '############',
      '#UPPUNNNNUU#',
      '#LLLLJJJJLq#',
      '#[]k.....is#',
      '#..........#',
      '#..{}..l...#',
      '#v.........#',
      '#....e.....#',
      '############',
    ],
  },

  church: {
    name: 'Church',
    outfit: 'church', // dressed up for church
    music: 'church',
    spawns: { door: { x: 6, y: 10, facing: 'up' } },
    arrive: 'door',
    warps: [{ x: 6, y: 11, on: 'churchDoor' }],
    inspect: { doormat: 'churchDoor' },
    npcs: {
      pastor: { x: 7, y: 4, facing: 'down', who: 'pastor', on: 'pastor' },
      momChurch: { x: 4, y: 7, facing: 'up', who: 'mom', on: 'momChurch' },
      // the congregation, sitting behind the pews and facing the stage
      pew1: { x: 2, y: 7, facing: 'up', who: 'oldLady', on: 'churchgoer' },
      pew2: { x: 9, y: 7, facing: 'up', who: 'farmer', on: 'churchgoer' },
      pew3: { x: 10, y: 7, facing: 'up', who: 'cust1', on: 'churchgoer' },
      pew4: { x: 3, y: 9, facing: 'up', who: 'cust3', on: 'churchgoer' },
      pew5: { x: 5, y: 9, facing: 'up', who: 'teen', on: 'churchgoer' },
      pew6: { x: 8, y: 9, facing: 'up', who: 'cust2', on: 'churchgoer' },
      pew7: { x: 11, y: 9, facing: 'up', who: 'cust5', on: 'churchgoer' },
      pew8: { x: 2, y: 11, facing: 'up', who: 'farmer', on: 'churchgoer' },
      pew9: { x: 10, y: 11, facing: 'up', who: 'oldLady', on: 'churchgoer' },
      pew10: { x: 4, y: 11, facing: 'up', who: 'cust4', on: 'churchgoer' },
    },
    defaultStyle: 'church',
    zones: [{ style: 'stage', x: 1, y: 3, w: 12, h: 2 }],
    // Extra characters for this map only (added on top of LEGEND).
    legend: {
      'G': { ground: 'wallU', obj: 'stainedGlass' },
      '<': { ground: 'wallU', obj: 'crossL' },
      '>': { ground: 'wallU', obj: 'crossR' },
      'n': { obj: 'piano' },
      'm': { obj: 'micStand' },
      'p': { obj: 'pulpit' },
      'f': { obj: 'flowers' },
      'a': { obj: 'amp' },
      '[': { obj: 'pewL' },
      '=': { obj: 'pewM' },
      ']': { obj: 'pewR' },
      '(': { obj: 'aisleL' },
      ')': { obj: 'aisleR' },
    },
    rows: [
      '##############',
      '#UGUUU<>UUUGU#',
      '#LLLLLLLLLLLL#',
      '#n.m..pf..m.a#',
      '#............#',
      '#.....().....#',
      '#.[==]()[==].#',
      '#.....().....#',
      '#.[==]()[==].#',
      '#.....().....#',
      '#.[==]()[==].#',
      '#.....e).....#',
      '##############',
    ],
  },

  hardees: {
    name: "Hardee's",
    outfit: 'hardees', // the Hardee's uniform
    spawns: {
      back: { x: 13, y: 4, facing: 'left' },
      door: { x: 7, y: 10, facing: 'up' },
    },
    arrive: 'back',
    warps: [{ x: 7, y: 11, on: 'hardeesDoor' }],
    inspect: { doormat: 'hardeesDoor' },
    npcs: {
      manager: { x: 10, y: 4, facing: 'down', who: 'manager', on: 'manager' },
      // Saturday's shift: they walk up to the counter and record Ben.
      vinson: { x: 6, y: 7, facing: 'up', who: 'vinson', on: 'vinson', hidden: true },
      delano: { x: 7, y: 7, facing: 'up', who: 'delano', on: 'delano', hidden: true },
    },
    defaultStyle: 'hdining',
    zones: [{ style: 'hkitchen', x: 1, y: 1, w: 14, h: 5 }],
    legend: {
      '1': { ground: 'wallU', obj: 'menuL' },
      '2': { ground: 'wallU', obj: 'menuM' },
      '3': { ground: 'wallU', obj: 'menuR' },
      'g': { obj: 'grillL' },
      'G': { obj: 'grillR' },
      'f': { obj: 'fryer' },
      'h': { obj: 'heatLamp' },
      's': { obj: 'sodaMachine' },
      'k': { obj: 'kitchenSink' },
      '=': { obj: 'counterH' },
      'r': { obj: 'register' },
      'o': { obj: 'diningTable' },
      'x': { obj: 'trash' },
    },
    rows: [
      '################',
      '#UU123UUU123UUU#',
      '#LLLLLLLLLLLLLL#',
      '#gG.f..hh..s.k.#',
      '#..............#',
      '#..............#',
      '#=r===r====..==#',
      '#..............#',
      '#.o..o..o...x..#',
      '#..............#',
      '#.o..o..o......#',
      '#......e.......#',
      '################',
    ],
  },
};
