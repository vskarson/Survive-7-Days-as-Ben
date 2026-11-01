// =============================================================================
// SURVIVE 7 DAYS AS BEN: story content
// Edit dialogue here without touching the game code.
//
// HOW DIALOGUE WORKS
// A dialogue is a list. Each item is either a line of text or a choice.
//
//   "Mom: Ben! Get up!"       -> Mom's name shows in the tag above the box.
//                               The name must match a character below.
//   "The fridge hums."        -> no name before a colon = narration.
//
// Long lines are fine: the game wraps them and splits them into 2-line
// boxes automatically. Shorter, punchier lines read better though.
//
// A choice shows a menu. Each option either jumps to another dialogue by name
// (goto) or has its own lines right there (then):
//
//   { choice: [
//       { text: "Yes ma'am", goto: 'momHappy' },
//       { text: 'Nah', then: ["Mom: Excuse me?!"] },
//   ] }
//
// The line right before a choice stays on screen while the player picks.
//
// Things that come up more than once can have versions, so they don't read the same:
//   parkArrive: { days: { Monday: ['...'], Tuesday: ['...'] } }  -> the one for today
//   coach: { vary: [['...'], ['...']] }  -> the next one each time, then around again
// Use `days` for story lines and `vary` for people and things Ben walks up to.
// Minigame `win` / `lose` screens and dayEndLabel can use them too.
//
// Music, as items in a dialogue list:
//   { music: 'tense' }  -> change the song until the story moves to the next beat
//   { music: null }     -> stop the music, same way
//
// Pointing at a bar, as an item in a dialogue list:
//   { hud: 'anger' }  -> blink a box and an arrow on that bar ('food', 'anger' or 'heat')
//   { hud: null }     -> stop (it also stops when the box closes)
//
// Option extras:
//   { text: 'Not yet', stay: true }       -> in a story beat: don't move the story on
//   { text: 'Skip work', jump: 'friends' } -> in a story beat: jump to the beat with that id
//   { text: 'Go to work', wear: 'hardees' } -> in a story beat: Ben changes into that outfit
//   { text: 'Dine and dash!', if: { heatAtLeast: 60 } } -> only shown when the `if` holds
//
// Decisions the stats screen lists: put `record` on the choice and `pick` on each option.
//   { record: 'sevenEleven', choice: [
//       { text: 'Steal some beer', pick: 'steal', heat: 25 },
//       { text: 'Just walk out', pick: 'walk' },
//   ] }
// The love interest is recorded as 'crush'; {crush} in any line becomes her name.
//
// EFFECTS (on a choice option, or on a story beat for when it's finished):
//   meal: true      -> Ben eats: food goes to full (put it on the meal's beat; two meals a day)
//   anger: 10       -> Mom gets madder. Only goes up (negative numbers are ignored)
//   heat: 25        -> cops and school get closer to locking Ben up. Only goes up
//   task: 'church'  -> mark today's task with that id as done
//   miss: 'church'  -> mark it as missed
//   show: 'breakfast' / hide: 'guitar' -> show or hide a prop on the map (props are listed in maps.js)
//   hold: 'guitar'  -> Ben carries it around (hold: null to put it down)
//
// =============================================================================
// HOW THE STORY WORKS
// Each day is a list of story beats, played in order. Time only moves when the
// story does. Food starts each day at 30; the first meal fills it, then it drains
// as story time passes so it's back at 30 right when the second meal comes (the
// drain rate comes from the meal beats' times). It never ends the game.
// A beat looks like:
//
//   {
//     time: '9:00 AM',                        // clock time for this beat
//     at: { map: 'church', spawn: 'door' },   // move Ben here (plays the fast-forward)
//     label: 'Church',                        // text under the fast-forward clock
//     intro: 'churchArrive',                  // dialogue when the beat starts
//     goal: 'Get on stage',                   // shown in the top-left corner (keep it under ~28 letters
//                                             // so it fits next to the stats panel)
//     on: 'mic',                              // what Ben has to do to finish the beat:
//                                             // inspect something with that name
//                                             // (left side of `inspect` below), or step
//                                             // on a door like 'frontDoor'
//     talk: 'churchSolo',                     // dialogue when he does it
//     task: 'church',                         // effects when he does it (see EFFECTS)
//   }
//
// A beat with no `on` runs by itself as soon as it starts (after its intro):
// cutscenes, choices, scenes that just happen.
//
// More beat options:
//     setup: { show: 'dinnerBeans' }   // effects applied as the beat begins, before Ben
//                             // gets there (dinner is already on the table when he walks in)
//     id: 'restaurant'        // name to `jump` to
//     next: 'night'           // after this beat, jump to the beat with that id
//     if: { chose: { sevenEleven: 'steal' } }   // skip this beat unless it holds
//                             // (also { heatAtLeast: 60 })
//     music: 'tense'          // song for this beat (songs are in src/music.js), or null for silence.
//                             // Without it: the night song from 5 PM, otherwise the map's `music`
//     scene: 'ChevyAttack'    // play this full-screen cutscene after the talk
//     wear: 'church'          // Ben changes into this outfit after the talk (BEN_OUTFITS in art.js)
//     instead: { frontDoor: 'stillPajamas' }   // while this beat waits, this thing says that dialogue
//     at: { map: 'card' }     // a place with no map yet: a black "scene card" showing `label`
//     at: { map: 'garage', spawn: 'door', night: true }   // tint the map dark blue (night scenes)
//
// A beat can also run a minigame after its talk (a minigame that isn't built
// yet asks the player "won it / lost it" instead):
//     game: 'guitar',                                    // see `minigames` below for the names
//     win:  { task: 'church', talk: 'guitarWin' },               // effects + dialogue if he wins
//     lose: { miss: 'church', anger: 5, talk: 'guitarLose' },    // ...or if he loses
//
// When the last beat of the day is done, the clock fast-forwards to 11 PM and
// Ben passes out. Tasks not done by then are missed. Mom's anger and Heat are
// only checked after Saturday (see groundedAt below).
// =============================================================================

// --- Scenes that repeat during the week (used in `days` below) -------------
// Each returns story beats. Places without a map yet use the scene card
// (at: { map: 'card' } with a `label`): a black screen with the place name.

// Getting to school: park, walk in, then the hallway and off to class.
// zyn: true (Monday and Friday, the lighter days) adds the Zyn choice at Ben's
// truck first, and the stealth minigame in the hallway if he sneaked one
// (caught = Mom +5, Heat +10; not caught = nothing). `classBeat` changes the
// "Get to class" beat: extra effects (Tuesday sets up the truck search) or its
// own goal and talk (Thursday goes straight into the math test). `music` plays
// for the whole morning (Wednesday's hangover).
function schoolMorning(time, { zyn = false, classBeat, music } = {}) {
  const park = { time, at: { map: 'parkingLot', spawn: 'truck' }, label: 'School', intro: 'parkArrive' };
  const beats = [
    ...(zyn ? [{ ...park, goal: 'Grab your bag from the truck', on: 'benTruck', talk: 'zynChoice' }] : []),
    { ...(zyn ? {} : park), goal: 'Head inside', on: 'schoolDoor' },
    { at: { map: 'hallway', spawn: 'entrance' }, label: 'School Hallway', intro: 'hallArrive' },
    ...(zyn ? [{
      if: { chose: { zyn: 'sneak' } }, game: 'zyn',
      win: { talk: 'zynSafe' },
      lose: { anger: 5, heat: 10, talk: 'zynCaught' },
    }] : []),
    { goal: 'Get to class', on: 'classDoor', talk: 'toClass', task: 'school', ...classBeat },
  ];
  return music ? beats.map(beat => ({ ...beat, music })) : beats;
}

// The choice at Ben's truck on Zyn days.
function zynPick(sneakLine) {
  return { record: 'zyn', choice: [
    { text: 'Sneak one in', pick: 'sneak', then: [sneakLine] },
    { text: 'Leave it in the truck', pick: 'leave' },
  ] };
}

// School lunch in the cafeteria (a meal).
function lunchScene(time, talk) {
  return {
    id: 'lunch', time, at: { map: 'cafeteria', spawn: 'door' }, label: 'Cafeteria',
    goal: 'Get in the lunch line', on: 'lunchLine', talk, meal: true,
  };
}

// Football practice: timing drills. Win or lose, no bar changes.
function practiceScene(time, intro) {
  return {
    time, at: { map: 'field', spawn: 'gate' }, label: 'Football Practice', intro,
    goal: 'Report to Coach', on: 'coach', game: 'practice', task: 'practice',
    win: { talk: 'practiceWin' }, lose: { talk: 'practiceLose' },
  };
}

// Dinner at the kitchen table (a meal). `talk` holds the day's main Mom choice.
// `food` is the dinner prop: on the table when Ben gets home, gone once he eats.
function dinnerScene(time, talk, food) {
  return {
    time, at: { map: 'house', spawn: 'frontDoor' }, label: 'Home', goal: 'Eat dinner', on: 'table', talk,
    meal: true, setup: { show: food }, hide: food,
  };
}

// Fix the dirtbike in the garage. Fail = Mom +5.
function dirtbikeScene(time, intro) {
  return {
    time, at: { map: 'garage', spawn: 'door' }, label: 'Garage', intro, goal: 'Fix the dirtbike', on: 'dirtbike',
    game: 'dirtbike', win: { task: 'fixBike', talk: 'bikeWin' }, lose: { miss: 'fixBike', anger: 5, talk: 'bikeLose' },
  };
}

// Ben changes at the clothes rack in his closet. He can't leave in his pajamas until he does.
function getDressed(goal, wear = 'casual') {
  return { goal, on: 'closetClothes', talk: 'getDressed', wear, instead: { frontDoor: 'stillPajamas' } };
}

// Morning at home: wake up, get dressed, then head out the front door.
function wakeScenes(time, intro, extra) {
  return [
    { time, at: { map: 'house', spawn: 'bed' }, intro, ...extra },
    getDressed('Get dressed for school'),
    { goal: 'Head to school', on: 'frontDoor' },
  ];
}

// =============================================================================

const CONTENT = {
  // Mom's anger at or above this after Saturday = Grounded Ben (if Heat isn't full).
  // (Heat is the code's name for what the player sees as the Crime meter.)
  groundedAt: 70,

  // The week. Tasks show on the day's intro card and the T checklist. List only the big things Ben
  // is expected to do, in order. No meals, and nothing the player should get to find out.
  //   task:      { id, text }
  //   props:     props shown when the day starts, e.g. { breakfast: true }
  //   todo:      true = story not written yet
  days: [
    {
      name: 'Sunday',
      props: { breakfast: true, momKitchen: true },
      tasks: [
        { id: 'church', text: 'Play guitar at church' },
        { id: 'hardeesShift', text: "Work your Hardee's shift" },
      ],
      story: [
        {
          time: '8:00 AM', at: { map: 'house', spawn: 'bed' }, intro: 'sunWake', talk: 'barsIntro',
        },
        {
          goal: 'Eat breakfast', on: 'table', talk: 'sunBreakfast', meal: true, hide: 'breakfast',
        },
        getDressed('Put on the blue flannel', 'church'),
        { goal: 'Grab your guitar', on: 'guitar', hide: 'guitar', hold: 'guitar' },
        { goal: 'Head to church', on: 'frontDoor', talk: 'sunLeave' },
        {
          time: '9:00 AM', at: { map: 'church', spawn: 'door' }, label: 'Church', intro: 'churchArrive',
          goal: 'Get on stage and play', on: 'mic',
          game: 'guitar',
          win: { task: 'church', talk: 'guitarWin' },
          lose: { miss: 'church', anger: 5, talk: 'guitarLose' },
        },
        { goal: 'Head to work', on: 'churchDoor', talk: 'churchLeave', hold: null },
        {
          time: '12:00 PM', at: { map: 'hardees', spawn: 'back' }, label: "Hardee's", intro: 'hardeesArrive',
          goal: 'Clock in at a register', on: 'register', talk: 'shiftStart',
          game: 'orders',
          win: { task: 'hardeesShift', talk: 'shiftWin' },
          lose: { miss: 'hardeesShift', anger: 5, talk: 'shiftLose' },
        },
        { time: '3:00 PM', intro: 'breakTime', goal: 'Grab food from the heat lamp', on: 'heatLamp', talk: 'breakFood',
          meal: true },
        { time: '5:00 PM', intro: 'shiftOver', goal: 'Clock out with the manager', on: 'manager', talk: 'clockOut' },
        // The big decision: steal or walk out (Heat +25 now, Mom +20 when she finds out tonight).
        {
          time: '6:00 PM', at: { map: 'sevenEleven', spawn: 'door' }, label: '7-Eleven', intro: 'sevenElevenArrive',
          goal: 'Check out the drinks', on: 'beerCooler', talk: 'sevenEleven',
        },
        { if: { chose: { sevenEleven: 'steal' } }, goal: 'Get out before he wakes up', on: 'storeDoor', talk: 'leaveStole',
          music: 'tense', hide: 'momKitchen', show: 'momDoor' },
        { if: { chose: { sevenEleven: 'walk' } }, goal: 'Head home', on: 'storeDoor', talk: 'leaveClean' },
        { if: { chose: { sevenEleven: 'steal' } }, time: '9:00 PM', at: { map: 'house', spawn: 'frontDoor' }, label: 'Home',
          music: 'tense', talk: 'momFindsOut', anger: 20 },
      ],
    },
    {
      name: 'Monday',
      props: { momKitchen: true },
      tasks: [
        { id: 'school', text: 'Go to school' },
        { id: 'practice', text: 'Go to football practice' },
        { id: 'fixBike', text: 'Fix the dirtbike' },
      ],
      story: [
        ...wakeScenes('7:00 AM', 'monWake', { talk: 'monCrushPick' }),
        ...schoolMorning('7:45 AM', { zyn: true }),
        lunchScene('12:00 PM', 'monLunch'),
        practiceScene('3:30 PM', 'monPractice'),
        dirtbikeScene('5:00 PM', 'monBike'),
        dinnerScene('6:30 PM', 'monDinner', 'dinnerMeatloaf'),
      ],
    },
    {
      name: 'Tuesday',
      props: { momKitchen: true },
      tasks: [
        { id: 'school', text: 'Go to school' },
        { id: 'practice', text: 'Go to football practice' },
        { id: 'thrift', text: 'Go to Label Shopper with Truman' },
      ],
      story: [
        ...wakeScenes('7:00 AM', 'tueWake', { talk: 'tueCrushText' }),
        // While Ben's in class, the officer and the knife show up at his truck.
        ...schoolMorning('7:45 AM', { classBeat: { show: ['officer', 'knife'], hide: ['lotTruman', 'lotStudent'] } }),
        // The officer finds a knife in Ben's truck bed. Argue = Mom +25, Heat +20.
        {
          time: '10:00 AM', at: { map: 'parkingLot', spawn: 'school' }, label: 'School Parking Lot', intro: 'knifeCalled',
          music: 'tense', goal: 'Go see Officer Gourley', on: 'officer', talk: 'knifeSearch', hide: ['officer', 'knife'],
        },
        lunchScene('12:00 PM', 'tueLunch'),
        practiceScene('3:30 PM', 'tuePractice'),
        // Thrifting with Truman. Buying a pile of junk = Mom +10.
        {
          time: '5:00 PM', at: { map: 'labelShopper', spawn: 'door' }, label: 'Label Shopper', intro: 'thriftArrive',
          goal: 'Check out the western wear', on: 'mannequin', talk: 'thrift', task: 'thrift',
        },
        { goal: 'Head home', on: 'thriftDoor' },
        dinnerScene('6:30 PM', 'tueDinner', 'dinnerBeans'),
        {
          time: '10:00 PM', at: { map: 'garage', spawn: 'door', night: true }, label: 'Later That Night...', intro: 'blackoutIntro',
          goal: 'Check the garage fridge', on: 'garageFridge', talk: 'blackout',
        },
      ],
    },
    {
      name: 'Wednesday',
      props: { momKitchen: true },
      tasks: [
        { id: 'school', text: 'Go to school' },
        { id: 'stepp', text: "Go to Mr. Stepp's class" },
        { id: 'practice', text: 'Go to football practice' },
      ],
      story: [
        { time: '7:30 AM', at: { map: 'house', spawn: 'bathFloor' }, intro: 'wedWake', goal: 'Get to the toilet. NOW.',
          music: null, on: 'toilet', talk: 'wedVomit' },
        { talk: 'wedCrushText', music: 'woozy' },
        { ...getDressed('Get dressed for school'), music: 'woozy' },
        { goal: 'Head to school', on: 'frontDoor', music: 'woozy' },
        ...schoolMorning('8:15 AM', { music: 'woozy' }),
        // Mr. Stepp threatens a write-up. Throwing markers = Mom +15, Heat +15 (then the minigame).
        {
          time: '10:00 AM', at: { map: 'classroom', spawn: 'door' }, label: "Mr. Stepp's Class", intro: 'steppArrive',
          goal: 'Sit at your desk', on: 'benDesk', talk: 'steppArgue', task: 'stepp',
        },
        {
          if: { chose: { stepp: 'markers' } }, game: 'markers',
          win: { talk: 'markersWin' }, lose: { talk: 'markersLose' },
        },
        lunchScene('12:00 PM', 'wedLunch'),
        // Ben hides in a stall, then Chevy walks in and the avoid-Chevy minigame starts.
        {
          time: '3:00 PM', at: { map: 'schoolBathroom', spawn: 'door' }, label: 'School Bathroom', intro: 'wedBathroom',
          goal: 'Get in a stall. FAST.', on: 'stall', talk: 'stallSit', show: 'chevy',
        },
        {
          intro: 'chevyHide', game: 'avoidChevy', hide: 'chevy',
          win: { talk: 'chevyEscape' }, lose: { talk: 'chevyFound' },
        },
        practiceScene('3:30 PM', 'wedPractice'),
        dinnerScene('6:30 PM', 'wedDinner', 'dinnerChicken'),
      ],
    },
    {
      name: 'Thursday',
      // The math teacher has the classroom today instead of Mr. Stepp.
      props: { momKitchen: true, stepp: false, mathTeacher: true },
      tasks: [
        { id: 'school', text: 'Go to school' },
        { id: 'mathTest', text: 'Pass the math test' },
        { id: 'practice', text: 'Go to football practice' },
        { id: 'cleanRoom', text: 'Clean your room' },
      ],
      story: [
        ...wakeScenes('7:00 AM', 'thuWake', { talk: 'thuCrushText' }),
        // Math is first period: from the hallway Ben walks right into the test (no time skip).
        ...schoolMorning('7:45 AM', { classBeat: { goal: 'Get to math class', talk: 'toMath' } }),
        {
          at: { map: 'classroom', spawn: 'door' }, label: 'Math Class', intro: 'mathIntro',
          goal: 'Sit at your desk', on: 'benDesk', talk: 'mathStart', game: 'math',
          win: { task: 'mathTest', talk: 'mathWin' }, lose: { miss: 'mathTest', anger: 5, talk: 'mathLose' },
        },
        lunchScene('12:00 PM', 'thuLunch'),
        // Back in the stall. Chevy rips the door off this time (a cutscene, no bar changes).
        {
          time: '3:00 PM', at: { map: 'schoolBathroom', spawn: 'door' }, label: 'School Bathroom', intro: 'thuBathroom',
          goal: 'Get in a stall', on: 'stall', scene: 'ChevyAttack',
        },
        practiceScene('3:30 PM', 'thuPractice'),
        {
          time: '5:30 PM', at: { map: 'house', spawn: 'frontDoor' }, label: 'Home', intro: 'cleanIntro',
          goal: 'Clean your room', on: 'hamper', game: 'cleanRoom',
          win: { task: 'cleanRoom', talk: 'cleanWin' }, lose: { miss: 'cleanRoom', anger: 15, talk: 'cleanLose' },
        },
        dinnerScene('6:30 PM', 'thuDinner', 'dinnerChili'),
      ],
    },
    {
      name: 'Friday',
      props: { breakfast: true, momKitchen: true },
      tasks: [
        { id: 'school', text: 'Go to school' },
        { id: 'fixBike', text: 'Fix the dirtbike (again)' },
        { id: 'fridayGame', text: 'Win the Friday night game' },
      ],
      story: [
        {
          time: '7:00 AM', at: { map: 'house', spawn: 'bed' }, intro: 'friWake',
          goal: 'Eat breakfast', on: 'table', talk: 'friBreakfast', meal: true, hide: 'breakfast',
        },
        getDressed('Get dressed for school'),
        { goal: 'Head to school', on: 'frontDoor' },
        ...schoolMorning('7:45 AM', { zyn: true }),
        lunchScene('12:00 PM', 'friLunch'),
        dirtbikeScene('4:00 PM', 'friBike'),
        {
          time: '7:00 PM', at: { map: 'field', spawn: 'gate', night: true }, label: 'Friday Night Game', intro: 'gameArrive',
          music: 'day', goal: 'Report to Coach', on: 'coach', talk: 'gameIntro', game: 'fridayGame',
          win: { task: 'fridayGame', talk: 'gameWin' }, lose: { miss: 'fridayGame', talk: 'gameLose' },
        },
        // The team's party out in a field. Ben gets his guitar and sings {crush} the song he wrote.
        {
          time: '10:00 PM', at: { map: 'party', spawn: 'truck', night: true }, label: 'The Party', intro: 'afterGame',
          music: 'title', goal: 'Grab your guitar', on: 'benTruck', talk: 'partyGuitar', hold: 'guitar',
        },
        { music: 'title', goal: 'Sing {crush} your song', on: 'crush', scene: 'PartySong' },
      ],
    },
    {
      name: 'Saturday',
      props: { breakfast: true, momKitchen: true },
      tasks: [
        { id: 'samTantrum', text: 'Calm Sam down' },
        { id: 'hardeesShift', text: "Work your Hardee's shift" },
      ],
      story: [
        {
          time: '8:00 AM', at: { map: 'house', spawn: 'bed' }, intro: 'satWake',
          goal: 'Eat breakfast', on: 'table', talk: 'satBreakfast', meal: true, hide: 'breakfast',
        },
        {
          time: '9:00 AM', intro: 'samStart', goal: "Calm Sam down in his room", on: 'sam', game: 'samTantrum',
          win: { task: 'samTantrum', talk: 'samWin' }, lose: { miss: 'samTantrum', anger: 10, talk: 'samLose' },
        },
        // Work or skip, at the closet (he changes for whichever it is). Skipping = Mom +20 and goes to the restaurant.
        { ...getDressed('Get dressed'), time: '10:30 AM', talk: 'workChoice' },
        { if: { chose: { work: 'work' } }, goal: 'Head to work', on: 'frontDoor' },
        { if: { chose: { work: 'skip' } }, goal: 'Head to El Rancho', on: 'frontDoor', next: 'restaurant' },
        {
          time: '11:00 AM', at: { map: 'hardees', spawn: 'back' }, label: "Hardee's", intro: 'satShiftStart',
          goal: 'Clock in at a register', on: 'register', game: 'orders',
          win: { task: 'hardeesShift', talk: 'shiftWin' }, lose: { miss: 'hardeesShift', anger: 5, talk: 'shiftLose' },
        },
        // Vinson and Delano walk up to the counter and record Ben (they leave by the break).
        { time: '1:00 PM', setup: { show: ['vinson', 'delano'] }, talk: 'friendsRecord' },
        { time: '3:00 PM', setup: { hide: ['vinson', 'delano'] }, intro: 'breakTime', goal: 'Grab food from the heat lamp',
          on: 'heatLamp', talk: 'breakFood', meal: true, next: 'night' },
        // Skipped work: lunch with Truman, Jake and Chevy, then the bill: pay or dine and dash.
        {
          id: 'restaurant', time: '12:00 PM', at: { map: 'elRancho', spawn: 'door' }, label: 'El Rancho', intro: 'ranchoArrive',
          goal: 'Sit with the boys', on: 'fajitas', talk: 'restaurantMeal', meal: true,
        },
        { talk: 'restaurantBill' },
        { id: 'night', time: '9:00 PM', at: { map: 'house', spawn: 'frontDoor' }, label: 'Home', intro: 'satNight',
          goal: 'Go to bed', on: 'benBed', talk: 'satBed' },
      ],
    },
  ],

  // Small line on scene cards (places that don't have a map yet).
  cardNote: '(This place gets its own map in a later step)',

  // Shown under the clock when the day fast-forwards to 11 PM.
  dayEndLabel: { days: {
    Sunday: 'Ben passes out...',
    Monday: 'Ben falls asleep on his phone...',
    Tuesday: 'Ben does not remember the rest...',
    Wednesday: 'Ben is out cold...',
    Thursday: 'Ben sleeps with one eye open...',
    Friday: 'Ben stares at the ceiling...',
    Saturday: 'Ben sleeps like a rock...',
  } },

  // Title screen. {day} and {name} in `saved` get filled in from the save.
  title: {
    top: 'Survive 7 Days',
    bottom: 'as Ben',
    pressKey: 'Press any key',
    controls: 'Arrows + Space   or click',
    // The save slots menu that opens from Play.
    slots: {
      title: 'Save slots',
      slot: 'Slot {n}',
      empty: 'New game',
      saved: 'Day {day}: {name}',
      play: 'Continue',
      delete: 'Delete save',
      back: 'Back',
      confirm: 'Delete slot {n}?',
    },
    // Types out in the settings screen so the player can see the text speed.
    textSample: "Yee haw! This is how fast text shows up. Air Force pilots read faster though.",
  },

  // Pause menu (Esc). quitWarning shows before quitting to the title.
  pause: {
    title: 'Paused',
    quitWarning: 'Quit? Today starts over.',
  },

  // What the numbers that pop up under the bars are called (food just shows the number).
  barNames: { anger: "Mom's anger", heat: 'Crime meter' },

  // Help screen (press H).
  help: [
    ['Arrows / WASD', 'Walk'],
    ['Space / Enter', 'Talk, inspect, next line'],
    ['Up / Down', 'Pick a choice'],
    ['T', 'Today\'s tasks'],
    ['H', 'This help'],
    ['Esc', 'Pause menu'],
    ['Yellow arrow', 'Where to go next'],
    ['Food bar', 'Meals fill it up'],
    ["Mom's anger", 'Past the line: grounded'],
    ['Crime meter', 'All the way full: jail'],
  ],

  // Minigame result screens. {hits} etc. get filled in with the player's numbers.
  // name: used in text like "(The Zyn sneak minigame isn't built yet.)"
  minigames: {
    zyn: {
      name: 'Zyn sneak',
      win: { days: {
        Monday: { title: 'SMOOTH.', lines: ['Made it to class with {time} seconds left.', 'Nobody saw a thing.'] },
        Friday: { title: 'ICE COLD.', lines: ['{time} seconds to spare.', 'The Air Force could use a guy like Ben.'] },
      } },
      lose: { days: {
        Monday: { title: 'BUSTED!', lines: ['{reason}', 'The lip bulge gave you away.'] },
        Friday: { title: 'CAUGHT!', lines: ['{reason}', 'That lip is not subtle, Ben.'] },
      } },
      // {reason} on the lose screen:
      spotted: 'A teacher spotted you.',
      bell: 'The bell rang. You were still in the hall.',
    },
    practice: {
      name: 'football practice',
      win: { days: {
        Monday: { title: 'NICE HUSTLE!', lines: ['{hits} of {total} good reps', 'Coach almost smiled. Almost.'] },
        Tuesday: { title: 'ON THE MONEY!', lines: ['{hits} of {total} good reps', 'Coach wrote something on his clipboard.'] },
        Wednesday: { title: 'STILL ALIVE!', lines: ['{hits} of {total} good reps', 'Ben held it together. Barely.'] },
        Thursday: { title: 'LOCKED IN!', lines: ['{hits} of {total} good reps', 'Even the sled looks scared.'] },
      } },
      lose: { days: {
        Monday: { title: 'RUN IT BACK.', lines: ['{hits} of {total} good reps', 'You needed {need}.', 'Coach is making you run laps.'] },
        Tuesday: { title: 'AGAIN.', lines: ['{hits} of {total} good reps', 'You needed {need}.', 'Coach blew his whistle for a while.'] },
        Wednesday: { title: 'ROUGH ONE.', lines: ['{hits} of {total} good reps', 'You needed {need}.', 'Ben is the same color as the turf.'] },
        Thursday: { title: 'NOT TODAY.', lines: ['{hits} of {total} good reps', 'You needed {need}.', 'Ben moves like he got hit by something.'] },
      } },
      // Coach's speech bubble after each rep (one picked at random).
      coach: {
        perfect: ['BEAUTIFUL!', 'THAT is football!', 'Somebody film that!'],
        good: ['Not bad, son!', "That'll work!", 'Keep it up!'],
        miss: ['My grandma hits harder!', 'Wake UP, Ben!', 'Air Force my foot!', 'Did you trip on AIR?'],
      },
    },
    fridayGame: {
      name: 'Friday night game',
      win: { title: 'TOUCHDOWN!', lines: ['Final: WARRIORS {home}, BULLDOGS {away}', 'The team carries Ben off the field.', 'He gets dropped. Twice.'] },
      lose: { title: 'TURNOVER.', lines: ['{yards} yards short of the end zone.', 'Final: WARRIORS {home}, BULLDOGS {away}'] },
      menuTitle: "Coach Sheffield: What's the play?",
      meterPrompt: 'Space in the green to snap it!',
      // name and risk show in the play menu; missText pops up when the meter misses.
      plays: {
        run: { name: 'Run up the middle', risk: 'short, safe', missText: 'STUFFED!' },
        pass: { name: 'Deep pass', risk: 'medium', missText: 'INCOMPLETE!' },
        trick: { name: 'Air Force Special', risk: 'huge, risky', missText: 'SACKED!' },
      },
    },
    dirtbike: {
      name: 'fix the dirtbike',
      win: { days: {
        Monday: { title: 'VROOM!', lines: ['All {total} parts on with {time} seconds left.', 'Wrong tries: {mistakes}'] },
        Friday: { title: 'BACK ON IT!', lines: ['All {total} parts on with {time} seconds left.', 'Wrong tries: {mistakes}'] },
      } },
      lose: { days: {
        Monday: { title: 'STILL BROKE.', lines: ['{placed} of {total} parts on.', 'The bike makes a noise like a sad goose.'] },
        Friday: { title: 'BROKE AGAIN.', lines: ['{placed} of {total} parts on.', 'Jake says it was like that when he got it.'] },
      } },
      right: 'Clunk!',
      wrong: "Doesn't fit there!",
      // Junk on the tray that fits nowhere.
      junk: {
        banana: "That's a banana.",
        dino: "That's Sam's dinosaur.",
        spoon: "That's Mom's spoon.",
        sandwich: "That's Jake's sandwich.",
      },
    },
    markers: {
      name: 'marker throwing',
      win: { title: 'BULLSEYE!', lines: ['Hit Mr. Stepp {hits} times.', 'He looks like a coloring book.'] },
      lose: { title: 'MISSED.', lines: ['Only {hits} of {need} hits.', 'One marker hit the fish tank.'] },
      // Stepp yells some of these when he pops up; a hit shows one of `hit`.
      yells: ['Put it DOWN, Ben!', "I'm callin' your mama!", 'This is a NEW shirt!', 'OFFICE! NOW!'],
      hit: ['SPLAT!', 'BONK!', 'Right in the tie!'],
      miss: 'Tink.',
    },
    avoidChevy: {
      name: 'avoid Chevy',
      win: { title: 'SAFE. FOR NOW.', lines: ['Chevy gave up and left.', 'Ben keeps his feet up. Just in case.'] },
      lose: { title: 'FOUND YA!', lines: ['{how}', 'Chevy found you after {time} seconds.'] },
      byFeet: 'He saw your boots under the door.',
      byDoor: 'He pushed the door open.',
      // Chevy's speech bubbles: while walking, when he pushes Ben's door, when he
      // peeks in the wrong stall, and when he finds Ben.
      calls: ['Beeeen? Buddy?', 'I can smell your body spray!', 'Hug time, buddy!', 'Come out, I brought snacks!'],
      pushes: ['Is this one locked?', 'Knock knock! Hug delivery!', "Ben? That you in there?"],
      wrongStall: 'Nope. Just a sock.',
      found: 'THERE you are, buddy!',
    },
    math: {
      name: 'math test',
      header: 'MATH TEST',
      win: { title: 'A+!', lines: ['{right} of {total} right.', 'Mrs. Norris checks if you cheated.', "You didn't."] },
      lose: { title: 'F.', lines: ['{right} of {total} right. You needed {need}.', 'You drew an F-16 on the back instead.'] },
    },
    samTantrum: {
      name: "Sam's tantrum",
      win: { title: 'NAP TIME.', lines: ['Sam calmed down.', 'He wiped his nose on your sleeve.'] },
      lose: { title: 'MELTDOWN.', lines: ['{reason}', 'Mom is coming up the stairs.'] },
      byToys: 'A dinosaur got you right in the face.',
      byLines: 'You kept saying the wrong thing.',
      dodgeHint: 'Left/Right: dodge the toys',
      talkHint: 'Pick the right thing to say',
      startYell: 'I DON\'T WANNA!',
      yells: ['NOOOO!', 'AAAAAAA!', 'I HATE SATURDAYS!', 'YOU\'RE A POTATO!'],
      ow: 'OW!',
      worse: 'AAAAAAAAAA!!',
      // Part two: what Sam yells, the line that calms him, and two that make it worse.
      rounds: [
        { sam: 'I WANT THE IPAD!', right: 'Wanna build a pillow fort instead?',
          wrong: ['Nah.', 'The iPad joined the Air Force.'] },
        { sam: "YOU'RE NOT THE BOSS OF ME!", right: "You're right. You're the boss. What now, boss?",
          wrong: ["I'm basically an adult.", 'Mom said I AM the boss.'] },
        { sam: "I'M GONNA SCREAM FOREVER!", right: 'Wanna hear my T-rex roar? RAWR!',
          wrong: ['Okay. I can wait.', 'Scream quieter then.'] },
      ],
      calmer: ['...a pillow fort?', '...I want a snack, peasant.', '...do it again.'],
    },
    guitar: {
      name: 'church guitar',
      win: { title: 'AMEN!', lines: ['Hit {hits} of {total} notes', 'Best combo: {combo}', 'The choir loved it.'] },
      lose: { title: 'OOF.', lines: ['Hit {hits} of {total} notes', 'You needed 70%.', 'Mom is giving you The Look.'] },
    },
    orders: {
      name: "Hardee's orders",
      win: { days: {
        Sunday: { title: 'NICE!', lines: ['{served} of {total} orders right', 'The manager nodded. Once.'] },
        Saturday: { title: 'RUSH SURVIVED!', lines: ['{served} of {total} orders right', 'Nobody threw anything.'] },
      } },
      lose: { days: {
        Sunday: { title: 'YIKES.', lines: ['{served} of {total} orders right', 'You needed 6.'] },
        Saturday: { title: 'SLAMMED.', lines: ['{served} of {total} orders right', 'You needed 6.', 'A lady asked for your manager.'] },
      } },
    },
    cleanRoom: {
      name: 'clean room',
      win: { title: 'SPOTLESS!', lines: ['Cleaned up all {total} things', '{time} seconds to spare', 'Mom might actually smile.'] },
      lose: { title: 'STILL GROSS.', lines: ['Cleaned up {cleaned} of {total} things', 'Mom opened the door.', 'Mom closed the door.'] },
    },
  },

  // Speech bubbles in cutscenes.
  cutscenes: {
    chevyAttack: {
      safe: 'Okay. Safe.',
      call: 'Beeeen?',
      knock: 'Knock knock.',
      occupied: '...Occupied.',
      know: 'I know.',
      gotcha: 'GOTCHA, BUDDY!',
      no: 'CHEVY NO--',
    },
    // who: ben, crush or truman. `chords` are strummed across the line.
    partySong: {
      intro: [['ben', 'Hey, {crush}. I wrote you a song.'], ['crush', 'Right now?'], ['ben', 'Right now.']],
      song: [
        { chords: ['G', 'C'], line: "Sittin' on my tailgate under Carolina skies," },
        { chords: ['G', 'D'], line: "Thinkin' 'bout you and them baby blue eyes." },
        { chords: ['Em', 'C'], line: "I got a big truck, girl, and a heart that's a wreck," },
        { chords: ['G', 'D'], line: "And all I'm missing is a big fat check." },
        { chords: ['C', 'G'], line: 'Aim high with me, {crush}. ...Please.' },
      ],
      rejection: [
        ['crush', 'Ben. That was really sweet.'],
        ['ben', 'So is that a--'],
        ['crush', 'No.'],
        ['ben', "I'm goin' to the Air Force."],
        ['crush', 'ok'],
      ],
      after: [['ben', "...Yeah. I was just jokin'."], ['truman', 'Bro.']],
    },
  },

  // Ending screens, checked after Saturday: Jail (Heat 100), then Grounded
  // (Mom's anger at groundedAt or more), then Good. Lines fit about 48 characters.
  endings: {
    jail: {
      title: 'JAIL BEN',
      lines: ['Beer. A knife. Markers. A fajita dash.', 'The cops had a whole folder on Ben.',
        'Ben is goin\' to jail. Forever.', "He tells his cellmate he's still goin' Air Force."],
      bubble: 'I want my phone call!',
    },
    grounded: {
      title: 'GROUNDED BEN',
      lines: ['Mom has had ENOUGH.', 'Phone: taken. Xbox: unplugged.', "The Air Force recruiter's been called. By Mom.",
        'Ben is grounded for life.'],
      bubble: 'GROUNDED. FOR. LIFE.',
    },
    good: {
      title: 'GOOD BEN',
      lines: ['Ben survived the week.', 'Mom is only a little mad. The cops forgot his name.', 'Aim High, baby.'],
      // Added before the last line when Ben won the Friday game.
      fridayWin: 'He even won the Friday night game, {score}!',
      bubble: "Seven days, boys!",
    },
    prompt: 'Press Space',
  },

  // The stats screen after the ending (mini font, about 36 characters per column).
  stats: {
    title: "BEN'S WEEK",
    ending: 'Ending: {name}',
    decisions: 'Decisions',
    noDecisions: 'None',
    summary: 'The week',
    bars: "Mom's anger: {anger}   Crime meter: {heat}",
    crush: 'Love interest: {crush}',
    friday: { win: 'Friday game: won {score}', lose: 'Friday game: lost {score}', none: 'Friday game: never played' },
    minigames: 'Minigames: won {won} of {played}',
    prompt: 'Press Space to play again',
    // Recorded decisions: a label, then what each pick shows. Zyn is counted over the week.
    choices: {
      sevenEleven: { label: '7-Eleven', steal: 'stole beer', walk: 'walked out' },
      zyn: { label: 'Zyn', count: 'snuck one in {n} of {of} days' },
      knife: { label: 'Knife', mine: 'said it was his', dads: "said it was his dad's" },
      thrift: { label: 'Label Shopper', buy: 'bought all of it', walk: 'walked out' },
      stepp: { label: 'Mr. Stepp', backDown: 'backed down', markers: 'threw markers' },
      work: { label: "Hardee's", work: 'went to work', skip: 'skipped work' },
      bill: { label: 'El Rancho', pay: 'paid the bill', dash: 'dine and dash' },
    },
  },

  // voice = how they sound in the text box: pitch in Hz, wave (square is buzzy,
  // triangle is soft, sawtooth is rough), range = how much it moves (default 0.3).
  characters: {
    ben: { name: 'Ben', voice: { pitch: 165, wave: 'square' } },
    mom: { name: 'Mom', voice: { pitch: 310, wave: 'square' } },
    sam: { name: 'Sam', voice: { pitch: 540, wave: 'square', range: 0.5 } },
    coach: { name: 'Coach Sheffield', voice: { pitch: 115, wave: 'sawtooth' } },
    manager: { name: 'Manager', voice: { pitch: 140, wave: 'sawtooth', range: 0.1 } },
    jake: { name: 'Jake', voice: { pitch: 205, wave: 'square', range: 0.4 } },
    chevy: { name: 'Chevy', voice: { pitch: 92, wave: 'square', range: 0.2 } },
    truman: { name: 'Truman', voice: { pitch: 190, wave: 'triangle', range: 0.15 } },
    maddy: { name: 'Maddy', voice: { pitch: 470, wave: 'triangle' } },
    jamie: { name: 'Jamie', voice: { pitch: 430, wave: 'triangle' } },
    vinson: { name: 'Vinson', voice: { pitch: 225, wave: 'square', range: 0.4 } },
    delano: { name: 'Delano', voice: { pitch: 245, wave: 'triangle', range: 0.4 } },
    stepp: { name: 'Stepp', voice: { pitch: 230, wave: 'sawtooth', range: 0.15 } },
    officer: { name: 'Officer Gourley', voice: { pitch: 125, wave: 'square', range: 0.1 } },
    mathTeacher: { name: 'Mrs. Norris', voice: { pitch: 360, wave: 'sawtooth', range: 0.15 } },
    waiter: { name: 'Waiter', voice: { pitch: 260, wave: 'triangle' } },
    cashier: { name: 'Cashier', voice: { pitch: 280, wave: 'triangle' } },
    teacher: { name: 'Teacher', voice: { pitch: 300, wave: 'sawtooth' } },
    lunchLady: { name: 'Lunch Lady', voice: { pitch: 255, wave: 'sawtooth' } },
    student: { name: 'Student', voice: { pitch: 330, wave: 'triangle' } },
    teammate: { name: 'Teammate', voice: { pitch: 180, wave: 'square' } },
    fan: { name: 'Fan', voice: { pitch: 215, wave: 'square' } },
    classmate: { name: 'Classmate', voice: { pitch: 275, wave: 'triangle' } },
    pastor: { name: 'Pastor', voice: { pitch: 150, wave: 'sawtooth', range: 0.1 } },
  },

  // What happens when Ben faces something and presses Space/Enter.
  // Left side = object name from the map, right side = its name for the story
  // and the dialogue it plays (unless the current story beat is waiting for it).
  inspect: {
    // Ben's room
    deskL: 'pc', deskR: 'pc',
    gamingChair: 'tv',
    beanbag: 'beanbag',
    bedHead: 'benBed', bedFoot: 'benBed',
    nightstand: 'nightstand',
    posterAF: 'posterAF',
    posterTruck: 'posterTruck',
    deer: 'deer',
    flag: 'flag',
    windowBen: 'windowBen',
    guitar: 'guitar',
    cowboyHat: 'cowboyHat', gunRack: 'gunRack', compoundBow: 'compoundBow', woodSign: 'woodSign',
    miniFridge: 'miniFridge', gameShelf: 'gameShelf',
    // rest of the house
    stairs0L: 'stairs', stairs0R: 'stairs', stairs1L: 'stairs', stairs1R: 'stairs', stairs2L: 'stairs', stairs2R: 'stairs',
    stairs3L: 'stairs', stairs3R: 'stairs', stairs4L: 'stairs', stairs4R: 'stairs',
    washer: 'laundry', dryer: 'laundry', couchL: 'couch', couchR: 'couch',
    bigTvL: 'livingTV', bigTvR: 'livingTV', recliner: 'recliner', lamp: 'lamp', plant: 'plant',
    windowLiving: 'windowLiving', closetJunk: 'closet', closetBoxes: 'closet',
    closetRackTop: 'closetClothes', closetRack: 'closetClothes',
    dresser: 'dresser',
    hamper: 'hamper',
    clothes: 'clothes',
    pizzaBox: 'pizza',
    chips: 'chips',
    socks: 'socks',
    cans: 'cans',
    trash: 'trash',
    helmet: 'helmet',
    // bathroom
    mirror: 'mirror',
    sink: 'mirror',
    toilet: 'toilet',
    tub0: 'tub', tub1: 'tub', tub2: 'tub',
    towel: 'towel',
    // hallway
    doorClosed: 'parentsDoor',
    photos: 'photos',
    cross: 'cross',
    doormat: 'frontDoor',
    // kitchen
    fridgeTop: 'fridge', fridgeBot: 'fridge',
    stove: 'stove',
    counter: 'counter', counterSink: 'counter', microwave: 'microwave', upperCabinet: 'counter',
    tableTL: 'table', tableTR: 'table', tableBL: 'table', tableBR: 'table', breakfastFood: 'table',
    dinnerMeatloaf: 'table', dinnerBeans: 'table', dinnerChicken: 'table', dinnerChili: 'table',
    windowKitchen: 'windowKitchen',
    // Sam's room
    samBedHead: 'samBed', samBedFoot: 'samBed',
    toybox: 'toybox',
    toys: 'toys',
    dinoPoster: 'dinoPoster',
    windowSam: 'windowSam',
    // 7-Eleven
    sodaCoolerTop: 'sodaCooler', sodaCoolerBot: 'sodaCooler',
    beerCoolerTop: 'beerCooler', beerCoolerBot: 'beerCooler',
    shelfL: 'shelf', shelfR: 'shelf',
    slurpee: 'slurpee', hotdogs: 'hotdogs',
    storeCounter: 'storeRegister', storeRegister: 'storeRegister',
    // school
    truckTL: 'benTruck', truckTR: 'benTruck', truckML: 'benTruck', truckMR: 'benTruck', truckBL: 'benTruck', truckBR: 'benTruck',
    carTL: 'car', carTR: 'car', carML: 'car', carMR: 'car', carBL: 'car', carBR: 'car',
    schoolDoorL: 'schoolDoor', schoolDoorR: 'schoolDoor', schoolWindow: 'schoolWindow',
    schoolSign0: 'schoolSign', schoolSign1: 'schoolSign', schoolSign2: 'schoolSign',
    warriorsBanner0: 'warriorsBanner', warriorsBanner1: 'warriorsBanner', warriorsBanner2: 'warriorsBanner',
    midW0: 'midfieldW', midW1: 'midfieldW', midW2: 'midfieldW', midW3: 'midfieldW',
    lockerTop: 'lockers', lockerBot: 'lockers', bulletin: 'bulletin', trophyCase: 'trophyCase', fountain: 'fountain',
    classDoor: 'classDoor',
    lunchCounter: 'lunchLine', cafMenu: 'cafMenu', cafTableL: 'cafTable', cafTableR: 'cafTable',
    bleacher: 'bleachers', sledL: 'sled', sledR: 'sled', cone: 'cone', waterCooler: 'waterCooler',
    // garage
    bikeL: 'dirtbike', bikeR: 'dirtbike',
    benchL: 'workbench', benchR: 'workbench',
    pegboard: 'pegboard',
    toolChest: 'toolChest',
    tires: 'tires',
    gasCan: 'gasCan',
    garageDoorTop: 'garageDoor', garageDoorBottom: 'garageDoor',
    garageFridgeTop: 'garageFridge', garageFridgeBot: 'garageFridge',
    knife: 'knife',
    // El Rancho
    boothL: 'booth', boothR: 'booth', fajitaL: 'fajitas', fajitaR: 'fajitas',
    papelPicado: 'papelPicado', sombrero: 'sombrero', pinata: 'pinata',
    // Friday night
    momSign0: 'momSign', momSign1: 'momSign', momSign2: 'momSign',
    // the field party
    pine: 'pine', fireTL: 'bonfire', fireTR: 'bonfire', fireBL: 'bonfire', fireBR: 'bonfire',
    logL: 'log', logR: 'log', hayBale: 'hayBale', cooler: 'cooler',
    pickupTL: 'pickup', pickupTR: 'pickup', pickupML: 'pickup', pickupMR: 'pickup', pickupBL: 'pickup', pickupBR: 'pickup',
    // classroom
    whiteboard0: 'whiteboard', whiteboard1: 'whiteboard', whiteboard2: 'whiteboard', whiteboard3: 'whiteboard',
    wallClock: 'wallClock', teacherDeskL: 'teacherDesk', teacherDeskR: 'teacherDesk',
    studentDesk: 'desk', benDesk: 'benDesk', fishTank: 'fishTank',
    // school bathroom
    stallWall: 'stall', stallDoor: 'stall', stallDoorOpen: 'stall', handDryer: 'handDryer',
    // Label Shopper
    thriftSign0: 'thriftSign', thriftSign1: 'thriftSign', thriftSign2: 'thriftSign', thriftSign3: 'thriftSign',
    rack0L: 'rack', rack0R: 'rack', rack1L: 'rack', rack1R: 'rack',
    junkShelfL: 'junkShelf', junkShelfR: 'junkShelf',
    mannequin: 'mannequin', bargainBin: 'bargainBin',
    fittingTop: 'fittingRoom', fittingBot: 'fittingRoom',
    // church
    stainedGlass: 'stainedGlass',
    crossL: 'bigCross', crossR: 'bigCross',
    pulpit: 'pulpit',
    micStand: 'mic',
    amp: 'amp',
    piano: 'piano',
    flowers: 'flowers',
    pewL: 'pew', pewM: 'pew', pewR: 'pew',
    // Hardee's
    grillL: 'grill', grillR: 'grill',
    fryer: 'fryer',
    heatLamp: 'heatLamp',
    sodaMachine: 'soda',
    kitchenSink: 'dishes',
    counterH: 'hCounter',
    register: 'register',
    menuL: 'menuBoard', menuM: 'menuBoard', menuR: 'menuBoard',
    diningTable: 'diningTable',
  },

  dialogue: {
    // --- Sunday story ---
    sunWake: ['Mom: BEN! Get up! Church is at nine!', 'Ben: Five more minutes.', 'Mom: You said that half an hour ago.'],
    // Sunday morning, the first thing in the game: what the bars at the top right mean.
    barsIntro: [
      { hud: 'food' },
      "This is Ben's food. It drops during the day. Meals fill it back up.",
      { hud: 'anger' },
      "This is Mom's anger. It only goes up. If it's past the white line after Saturday, Ben is grounded.",
      { hud: 'heat' },
      'This is the Crime meter. It only goes up. If it fills up, Ben goes to jail.',
      { hud: null },
      'Press H any time to see this again.',
    ],
    // Sunday's main Mom choice (each day has one dialogue choice that can make Mom mad).
    sunBreakfast: [
      "Mom: Wear the blue flannel today. Not the red one.",
      { choice: [
        { text: "Yes ma'am.", then: ['Mom: Thank you. Get dressed and get your guitar.'] },
        { text: 'I hate the red one.', anger: 10,
          then: ["Mom: I don't care. The whole choir is wearing blue today."] },
      ] },
    ],
    sunLeave: [
      'Leave for church?',
      { choice: [
        { text: "Let's go" },
        { text: 'Not yet', stay: true },
      ] },
    ],
    mom: { days: {
      Sunday: ['Mom: Eat, get dressed, get your guitar. We leave at quarter till.'],
      Monday: ['Mom: Did you charge your phone like I said?'],
      Tuesday: ['Mom: Is that the shirt you slept in?'],
      Wednesday: ['Mom: You look pale, baby.'],
      Thursday: ['Mom: That room better be clean by dinner.'],
      Friday: ["Mom: Don't touch the sign. The glitter's still wet."],
      Saturday: ["Mom: Your dad's still at the deer stand. Don't ask."],
    } },
    churchArrive: ["Mom: Go on up. They're waitin' on you."],
    guitarWin: ["Mom: That's my baby!"],
    guitarLose: ['Mom gives Ben The Look.'],
    pastor: ['Pastor: The Lord loves a joyful noise, Ben. Emphasis on noise.'],
    momChurch: ["Mom: Sit up straight. And don't you dare get your phone out."],
    churchLeave: ["Ben puts his guitar in the truck. Hardee's at noon."],

    // --- Hardee's ---
    hardeesArrive: ["Manager: You're late. Clock in, we've got a line."],
    shiftStart: ['Manager: Get the orders right.'],
    shiftWin: { days: {
      Sunday: ['Manager: Not bad.'],
      Saturday: ['Manager: You lived through a Saturday rush. Good work.'],
    } },
    shiftLose: { days: {
      Sunday: ["Manager: ...We'll talk about that later."],
      Saturday: ["Manager: What did I say about not messin' it up?"],
    } },
    breakTime: { days: {
      Sunday: ['Manager: Take your break and get some food.'],
      Saturday: ["Manager: Thirty minutes. I'm timin' it."],
    } },
    breakFood: { days: {
      Sunday: ["Ben eats a Cheeseburger in the walk-in freezer. It's the only quiet spot."],
      Saturday: ['Ben eats in the walk-in freezer again.'],
    } },
    shiftOver: ['Two hours later...'],
    clockOut: ['Manager: See you Saturday. Be on time.'],
    manager: { vary: [
      ["Manager: If you've got time to lean, you've got time to clean."],
      ["Manager: Those fries won't salt themselves."],
    ] },
    hardeesDoor: ["Ben: Can't leave in the middle of a shift."],
    grill: ["The grill. Ben's eyebrows grew back last month."],
    fryer: ['The fryer. Ben keeps a respectful distance.'],
    heatLamp: ["Burgers under the heat lamp. They've been there a while."],
    soda: ['The soda machine. The Hi-C is out. It is always out.'],
    dishes: ["Dirty dishes. Ben didn't see them."],
    hCounter: ['Somebody carved "J+K" into the counter.'],
    register: ['The register. Ben knows three of the buttons.'],
    menuBoard: ['The menu board. Ben could recite it in his sleep. He has.'],
    diningTable: ['A ketchup stain shaped like Texas.'],

    // --- Sunday night ---
    sevenElevenArrive: ["Truman: I'm getting some candy. You want something?"],
    sevenEleven: [
      { music: null },
      'The beer cooler. The cashier is asleep. Fully asleep.',
      { record: 'sevenEleven', choice: [
        { text: 'Steal some beer', pick: 'steal', heat: 25,
          then: ['Ben shoves a six-pack under his shirt. It clinks with every step.', 'Truman: Bro.'] },
        { text: 'Just walk out', pick: 'walk',
          then: ['Ben: Not worth it.', 'Truman: Awe good boy Ben.'] },
      ] },
    ],
    leaveStole: ['Clink. Clink. Clink.', 'The cashier keeps snoring.'],
    leaveClean: ['Truman smacks Ben on the back.'],
    momFindsOut: [
      'Mom is waiting at the door with her phone out.',
      'Mom: The Cops just came by with THIS.',
      "Ben: That's a real blurry picture of somebody else.",
      "Mom: You're wavin' at the camera, Benjamin.",
      { music: null },
    ],

    // --- School days: things that happen every day ---
    parkArrive: { days: {
      Monday: ["Ben parks across two spots. It's a big truck."],
      Tuesday: ['Ben arrived 30 minutes early to practice guitar in his truck.'],
      Wednesday: ["Ben's exhaust is about to fall off. He's in no shape to fix it."],
      Thursday: ['A freshman honks at Ben, then apologizes.'],
      Friday: ['Game day.'],
    } },
    hallArrive: { days: {
      Monday: ['The hallway smells like chicken shit.'],
      Tuesday: ['Somebody asked Ben to hit their vape, he froze and awkwardly declined.'],
      Wednesday: ['The lights in this hallway have never been this loud.'],
      Thursday: ["Kids are cramming for Mrs. Norris's Calculus test. Ben isn't worried."],
      Friday: ['The cheerleaders made a poster for every football player, they forgot about Ben.'],
    } },
    toMath: ['First period: the math test.'],
    toClass: { days: {
      Monday: ['Ben sits through class. He farted 8 times in one class.'],
      Tuesday: ['Ben sits through class. Lots of snoozing.'],
      Wednesday: ['Ben sits through class with his head down. Math can wait.'],
      Friday: ["It's game day, so the teacher puts on a movie."],
    } },
    zynChoice: { days: {
      Monday: ["Ben's Zyn can is in the cupholder.", zynPick('Ben puts one in. Now he just has to get past the teachers.')],
      Friday: ['The Zyn can is still in the cupholder.', zynPick('One more, for the nerves. Same teachers, same hallway.')],
    } },
    zynSafe: { days: {
      Monday: ['Ben walks into class like nothing happened.'],
      Friday: ["Nobody's lookin' at Ben's lip on game day."],
    } },
    zynCaught: { days: {
      Monday: [{ music: null }, "Teacher: Is that a Zyn? Office. I'm callin' your mother."],
      Friday: [{ music: null }, "Teacher: On game day, Ben? I'm callin' your mother."],
    } },
    practiceWin: { days: {
      Monday: ['Coach Sheffield: THAT is how you hit a sled!'],
      Tuesday: ['Coach Sheffield: Now do that every day.'],
      Wednesday: ['Coach Sheffield: You look like death, son, and you still got it done.'],
      Thursday: ["Coach Sheffield: Whatever's goin' on with you this week, keep it up."],
    } },
    practiceLose: { days: {
      Monday: ['Coach Sheffield: Son, you run like a shopping cart with a bad wheel.'],
      Tuesday: ['Coach Sheffield: Laps. You know where they are.'],
      Wednesday: ['Ben runs his laps. He stops twice to think about the alcohol last night.'],
      Thursday: ['Coach Sheffield: What happened to you? You get hit by a truck?', 'Ben: Bigger.'],
    } },

    // --- Monday ---
    monWake: ['Ben wakes up at 3% battery.'],
    monCrushPick: [
      "Ben: Today's the day I text her first.",
      { record: 'crush', choice: [
        { text: 'Text Maddy', pick: 'Maddy' },
        { text: 'Text Jamie', pick: 'Jamie' },
      ] },
      { phone: [
        'Ben: heyyyyyyy',
        'Ben: good mornin love',
        '{crush}: who is this',
        'Ben: its ben. i sit behind u in 4th',
        '{crush}: oh',
      ] },
      'Ben: "Oh." That\'s a start.',
    ],
    monLunch: ['Lunch Lady: What can I get for you hun?', 'Ben: Yes.'],
    monPractice: ['Coach Sheffield: Timing drills! Hit it in the green!'],
    monBike: ["The dirtbike won't start. Ben kicked it, and now it really won't start."],
    bikeWin: { days: {
      Monday: ['The bike starts. The whole house shakes.'],
      Friday: ['Fixed again. Ben hides the key from Jake.'],
    } },
    bikeLose: { days: {
      Monday: ['Mom: Is that bike STILL broke?'],
      Friday: ["Mom: All week out there and it's STILL broke?"],
    } },
    monDinner: [
      'Mom: How was school, baby?',
      { choice: [
        { text: 'Good.', then: ['Mom: Good. Eat your meatloaf.'] },
        { text: "I'm basically an adult, Mom.", anger: 10,
          then: ['Mom: Adults pay rent. You wanna start?'] },
      ] },
    ],

    // --- Tuesday ---
    tueWake: ['Ben checks if {crush} texted back.'],
    tueCrushText: [
      'She did not.',
      { phone: ['Ben: do u like guys in uniform', 'Ben: asking for the air force', '{crush}: k'] },
      'Ben: K. ...K is good, right?',
    ],
    knifeCalled: ['Ben gets called to the parking lot over the intercom. Everybody heard.'],
    knifeSearch: [
      "Officer Gourley: Truck search, Ben. Don't make it weird.",
      'He pulls a hunting knife out of the truck bed.',
      'Officer Gourley: Wanna tell me about this?',
      { record: 'knife', choice: [
        { text: "It's mine. So what?", pick: 'mine', anger: 25, heat: 20,
          then: ['Ben: Second Amendment.', "Officer Gourley: That's not the one about knives.", "Officer Gourley: I'm callin' your mother."] },
        { text: "It's my dad's.", pick: 'dads',
          then: ["Officer Gourley: Your dad's. ...Alright. Tell him to clean out his truck."] },
      ] },
    ],
    tueLunch: ['Taco Tuesday. The taco is mostly shell.'],
    tuePractice: ['Coach Sheffield: Footwork! Ben, LEFT. Your other left.'],
    thriftArrive: ["Truman drags Ben to Label Shopper. It smells like Grandma's attic."],
    thrift: [
      'The mannequin has a cowboy hat, a Texas belt buckle, and a beautiful Carhartt jacket.',
      'Ben: I need all of it.',
      'Truman: You need none of it.',
      { record: 'thrift', choice: [
        { text: 'Buy all of it', pick: 'buy', anger: 10,
          then: ["Ben spends his whole Hardee's check.", "Truman: Your mom's gonna kill you."] },
        { text: 'Walk out', pick: 'walk', then: ["Ben: It'll still be here next week."] },
      ] },
    ],
    tueDinner: [
      'Mom: You WILL eat the green beans.',
      { choice: [
        { text: "Yes ma'am.", then: ['Ben eats every bean.'] },
        { text: 'Green beans are a psyop.', anger: 10,
          then: ["Mom: Then I'm the government. EAT."] },
      ] },
    ],
    blackoutIntro: ["Ben can't sleep. He goes out to the garage for a snack."],
    blackout: [
      "There's no snack. There's a bottle in the back of Dad's fridge.",
      { music: null },
      'Ben: One sip.',
      'Ben drinks the whole thing.',
      'Everything goes black.',
    ],

    // --- Wednesday ---
    wedWake: ['Ben wakes up on the bathroom floor. His mouth tastes like a penny.'],
    wedVomit: ['Ben makes it to the toilet. Barely. Throw up is everywhere.', "Ben: I'm never drinkin' again."],
    wedCrushText: ['{crush} posted a story. Ben accidentally sends a heart reaction.'],
    steppArrive: ["Stepp: You're late, Ben. Sit down."],
    steppArgue: [
      'Ben checks his phone under the desk.',
      { music: 'tense' },
      'Stepp: Phone. Away. Third time.',
      "Ben: It's a calculator. That texts.",
      "Stepp: That's it. I'm writin' you up.",
      { record: 'stepp', choice: [
        { text: 'Back down', pick: 'backDown', then: ['Ben: ...Yes sir.'] },
        { text: 'Throw markers at him', pick: 'markers', anger: 15, heat: 15,
          then: ['Ben grabs a fistful of dry-erase markers.'] },
      ] },
    ],
    markersWin: ['Stepp: OFFICE. NOW.'],
    markersLose: ["Stepp: OFFICE. NOW. And somebody check on Scottie."],
    wedLunch: ['Ben can barely keep down the milk.'],
    wedBathroom: ["Ben's stomach is not done with him."],
    stallSit: ['Ben locks the stall. Finally, some peace.'],
    chevyHide: ['The bathroom door creaks open.', "Chevy: Beeeen? I know you're in here, buddy."],
    chevyEscape: ['Ben waits ten more minutes. Just in case.'],
    chevyFound: ['Ben slides out under the stall door and runs.'],
    wedPractice: ['Coach Sheffield: Ben, why are you green?', 'Ben: Allergies.'],
    wedDinner: [
      "Mom: You look awful, baby. You feelin' okay?",
      { choice: [
        { text: 'Just tired.', then: ['Mom: Bed early tonight.'] },
        { text: "It's called a hangover, Mom.", anger: 10,
          then: ['Mom puts her fork down.', 'Mom: A WHAT?'] },
      ] },
    ],

    // --- Thursday ---
    thuWake: ['Ben wakes up in his own bed. Progress.'],
    thuCrushText: [
      { phone: ['Ben: u should come to my game friday', 'Ben: im on the team', 'Ben: football', '{crush}: maybe'] },
      'Ben screenshots it.',
    ],
    mathIntro: ['Ben is actually good at math. Smart boy.'],
    mathStart: ['Mrs. Norris: Phones away. Eyes on your own paper, Ben.'],
    mathWin: ['Just another day for Ben.'],
    mathLose: ['Mom is gonna see that grade by tonight.'],
    thuLunch: ['Rectangle pizza. The best day of the week.'],
    thuBathroom: ['Ben checks under every stall. No Chevy.'],
    thuPractice: ["Coach Sheffield: Ben, why did you even come today?", "Ben: I'm sorry."],
    cleanIntro: ['Mom: Your room smells like a gas station bathroom. Clean it. Now.'],
    cleanWin: ['Mom peeks in and takes a picture. For the record.'],
    cleanLose: ["Mom: We'll talk about this at dinner."],
    thuDinner: [
      'Mom: Pass the cornbread.',
      { choice: [
        { text: 'Pass it', then: ['Mom: Thank you.'] },
        { text: 'I already ate it all.', anger: 10,
          then: ['Mom: This is why I like Sam more.'] },
      ] },
    ],

    // --- Friday ---
    friWake: ['Game day.'],
    friBreakfast: [
      "Mom: Big game tonight! I'm makin' a sign!",
      { choice: [
        { text: 'Thanks, Mom!', then: ["Mom: It's gonna have glitter."] },
        { text: 'Please do NOT make a sign.', anger: 10,
          then: ['Ben: Last year it said "GO BENNY BOO."', "Mom: This year it's bigger."] },
      ] },
    ],
    friLunch: ['Extra tots on game day.'],
    friBike: ['The dirtbike is broken again. Jake "borrowed" it.'],
    gameArrive: ['Friday night lights. The whole town showed up. Mom brought her sign.'],
    gameIntro: ['Coach Sheffield: Trinity. The Bulldogs. We all saw their TikToks, prove a point tonight.'],
    gameWin: ["The Warriors win! Mom's sign is glitterin' in the stands."],
    gameLose: ['The Bulldogs win. Chevy pats Ben on the head.'],
    afterGame: ['The whole team ends up in a field out past the school. {crush} came.'],
    partyGuitar: ["Ben's guitar is behind the seat. He wrote her a song. It took all week.", "Ben: This is it."],

    // --- Saturday ---
    satWake: ['Ben wakes up to screaming. Sam is up.'],
    satBreakfast: [
      'Mom: I need you to watch your brother this morning.',
      { choice: [
        { text: "Yes ma'am.", then: ["Mom: Thank you. He's in his room. Good luck."] },
        { text: "Why can't Dad do it?", anger: 10,
          then: ["Mom: Dad's at the deer stand. Watch your brother."] },
      ] },
    ],
    samStart: ['Sam is throwing toys. The heavy ones.'],
    samWin: ['Sam falls asleep in the pillow fort.'],
    samLose: ['Mom comes runnin\'. Sam points at Ben.'],
    workChoice: [
      'Truman: "Let\'s all go eat. Me, Jake and Chevy. You comin\'?"',
      "Ben's shift starts at eleven.",
      { record: 'work', choice: [
        { text: 'Go to work', pick: 'work', wear: 'hardees', then: ['Ben: Gotta pay for gas.'] },
        { text: 'Skip work, go eat', pick: 'skip', anger: 20, miss: 'hardeesShift', wear: 'casual',
          then: ['Ben: The manager will understand.', 'He will not understand.'] },
      ] },
    ],
    satShiftStart: ["Manager: Saturday rush. Don't mess it up."],
    friendsRecord: [
      'Vinson and Delano walk in with their phones out.',
      'Vinson: Yo, it\'s Hardee\'s Ben! Say "Welcome to Hardee\'s"!',
      "Ben: Welcome to Hardee's, can I take your order.",
      'Delano: HE DID IT.',
      "Vinson: Ben you're just too cute.",
    ],
    ranchoArrive: ['Truman, Jake and Chevy already have a booth.'],
    restaurantMeal: [
      'Chevy: Saved you a seat, buddy! Right next to me!',
      'Ben eats a whole fajita platter. It was still sizzling.',
    ],
    restaurantBill: [
      'The bill comes.',
      "Jake: I left my wallet in my other... I don't have a wallet.",
      { record: 'bill', choice: [
        { text: 'Pay the bill', pick: 'pay', then: ['Ben pays. Jake tips a penny.'] },
        { text: 'Dine and dash!', pick: 'dash', anger: 10, heat: 30,
          then: ['Ben: On three. One--', { music: 'minigame' }, 'Ben bolts. Chevy carries Jake. Truman stays and pays.'] },
      ] },
    ],
    satNight: ['Ben gets home. Long week.'],
    satBed: ['Ben: Seven days. I survived. ...Did I?'],

    // --- Ben's room ---
    tv: [
      'Ben: One more game.',
      { choice: [
        { text: 'Play one more', goto: 'tvPlay' },
        { text: 'Walk away', goto: 'tvLeave' },
      ] },
    ],
    tvPlay: ['One more game turns into six.'],
    tvLeave: ['Ben walks away. Character growth.'],
    pc: ['Ben: RGB makes it faster. Everybody knows that.'],
    beanbag: ['A beanbag with a permanent Ben-shaped dent in it.'],
    benBed: ["Ben's bed. The red blanket hasn't been folded since he got it."],
    nightstand: ['A lamp and a half-finished energy drink from... last week?'],
    posterAF: ["Ben: Aim High. I've told everybody. Twice."],
    posterTruck: ['Ben: One day.'],
    deer: ['Ben: My first buck. Well... Truman shot it. But I was there.'],
    flag: ['An American flag. Ben salutes it every morning on the way out.'],
    windowBen: ['One of the blinds is bent where Ben looks out.'],
    guitar: ["Ben's guitar. It's mostly in tune."],
    cowboyHat: ['A cowboy hat. Ben has never been on a horse.'],
    gunRack: ["The rifle rack. Ben's helmet lives on top of it now."],
    compoundBow: ["Ben's compound bow. Deer season is mostly sitting."],
    woodSign: ['A little wooden sign Mom hung up. Ben has never read it.'],
    miniFridge: ['The mini fridge. Energy drinks and one very old Lunchable.'],
    gameShelf: ['A stack of board games. Every one is missing pieces.'],
    closet: ["Ben's closet. Pool noodles and three bags of who knows what."],
    closetClothes: ["Ben's clothes. Mostly flannel."],
    getDressed: { days: {
      Sunday: ['The blue flannel. It still has the tag on it.'],
      Monday: ['Ben pulls on a flannel. It passes the sniff test.'],
      Tuesday: ['Ben pulls on the same flannel. Nobody will know.'],
      Wednesday: ['Ben gets dressed sitting on the floor. It takes a while.'],
      Thursday: ['Ben picks the flannel with the least mud on it.'],
      Friday: ['Game day flannel. Same as the other flannels.'],
    } },
    stillPajamas: { vary: [
      ["Ben: Can't go out in my pajamas."],
      ['Mom: Benjamin! Clothes!'],
    ] },
    dresser: ['A sock is hanging out of the top drawer. It has been there since August.'],
    hamper: ['The hamper is full. The floor is now the backup hamper.'],
    clothes: ["Ben: Clean or dirty? ...Smells clean enough."],
    pizza: ['Ben: One slice left. From... Tuesday? Breakfast of champions.'],
    chips: ['An empty chip bag, folded into a triangle. Ben is proud of that.'],
    socks: ['Two socks. Neither one matches anything Ben owns.'],
    cans: ['Empty energy drink cans. One of Ben\'s main food groups.'],
    trash: ['The trash can is full of more energy drink cans.'],
    helmet: ['Ben\'s football helmet. It smells like a locker room had a locker room.'],

    // --- Bathroom ---
    mirror: [
      "Ben's toothbrush is on the sink. The bristles are smashed flat.",
      'Ben looks in the mirror.',
      { choice: [
        { text: 'Flex', then: ['Ben flexes.', 'Nothing happens.', 'Ben: The muscles are on the inside.'] },
        { text: 'Salute', then: ['Ben: Airman Ben, reportin\' for duty, sir!', 'Ben salutes so hard he hits himself in the eye.'] },
        { text: 'Fix hair', then: ['Ben tries to fix his curls.', 'The curls win.'] },
        { text: 'Pose', then: ['Ben strikes a pose.', "Ben: Honestly? I'd make a pretty good femboy."] },
      ] },
    ],
    toilet: ["Ben: Not right now."],
    tub: ["A rubber duck. Ben: That's Sam's. Mostly."],
    towel: ['A towel. Ben used it to dry the dog one time. Nobody knows.'],

    // --- Hallway ---
    parentsDoor: ["Ben: Mom and Dad's room. I'm not tryin' to die today."],
    photos: ["Family pictures. Ben's eyes are closed in every single one."],
    cross: ['A wooden cross. Church is Sunday morning.'],
    frontDoor: { vary: [
      ['Nowhere Ben has to be right now.'],
      ['Not yet. Ben still has stuff to do here.'],
    ] },
    stairs: ['The stairs down to the basement. Ben has no reason to go down there.'],
    laundry: ['The washer and dryer. Ben knows they exist.'],
    couch: ['The couch. Sam lost a chicken nugget in it in May. It is still in there.'],
    recliner: ["Dad's recliner. Nobody sits in Dad's recliner."],
    livingTV: ['The big TV. Dad only watches the weather on it.'],
    lamp: ['A floor lamp. It flickers if you look at it wrong.'],
    plant: ["Mom's plant. Ben was supposed to water it."],
    windowLiving: ['The front window. The neighbor is mowing again.'],

    // --- Kitchen ---
    fridge: ["Sam's drawing of Ben. Ben: Why am I a potato?"],
    stove: ["Ben: Mom said I can't touch the stove after the grilled cheese incident."],
    counter: ['No snacks. Somebody ate all the snacks. It was Ben.'],
    microwave: ['Ben: The microwave. My one true kitchen skill.'],
    table: ['The kitchen table. Where Mom asks the hard questions.'],
    windowKitchen: ['Mom\'s country curtains. Do not touch the country curtains.'],

    // --- Sam's room ---
    samBed: ["Sam's bed. The star blanket is for bein' brave at night."],
    toybox: ["Sam's toy box. Ben: Half of these used to be mine."],
    toys: ["Ben: I've stepped on every single one of these."],
    dinoPoster: ['Ben: Rawr. ...Don\'t tell nobody I did that.'],
    windowSam: ['Ben: Sam put a sticker on the window. Mom is gonna love that.'],

    // --- 7-Eleven ---
    storeDoor: ["Truman: Where you goin'? We just got here."],
    sodaCooler: ['Every energy drink known to man. Ben has tried all of them. Twice.'],
    beerCooler: ['The beer cooler. Ben is sixteen.'],
    shelf: ["Chips, beef jerky, and a single dusty can of Vienna sausages. It's been there since 2009."],
    slurpee: ['The Slurpee machine. Blue raspberry is the only real flavor.'],
    hotdogs: ['Hot dogs spinning on the roller. They have been spinning since Tuesday.'],
    storeRegister: ['The cashier is asleep behind the register. Snoring. Loudly.'],
    truman: ["Truman: Blue raspberry. Every time. I'm a man of tradition."],
    cashier: ['The cashier is snoring. A string of drool is reaching for the counter.'],

    // --- School ---
    benTruck: ["Ben's truck. Lifted, loud, and paid for with Hardee's money."],
    car: ["Somebody's mom's minivan."],
    schoolDoor: ['The front doors. They squeak.'],
    schoolSign: ['Wheatmore High School. Home of the Warriors.'],
    schoolWindow: ['A classroom window. Somebody drew a smiley face in the fog.'],
    student: { vary: [
      ['Student: Is that the kid with the giant truck?'],
      ['Student: You know you parked across two spots, right?'],
      ['Student: Is it true you joined the Air Force already?', 'Ben: Basically.'],
    ] },
    lockers: ["Lockers. Ben forgot his combination in August. He just doesn't use his."],
    bulletin: ['Bulletin board: "PROM IS COMING." "LOST: ONE (1) IGUANA."'],
    trophyCase: ['The trophy case. One trophy is just a spray-painted bowling pin.'],
    warriorsBanner: ['GO WARRIORS. Somebody wrote "and Ben" under it in pencil. It was Ben.'],
    fountain: ['The water fountain. The water comes out warm and sad.'],
    hallTeacher: { vary: [
      ["Teacher: No runnin' in the halls."],
      ['Teacher: You were walkin\' fine. I just like sayin\' it.'],
      ['Teacher: Tuck your shirt in.'],
    ] },
    classDoor: ["Ben is not goin' to class early."],
    hallExit: { vary: [
      ["Ben: Can't skip. Mom has my location on."],
      ['Ben: Mom would know. She always knows.'],
    ] },
    lunchLine: ['The lunch line. The steam smells like a gym sock.'],
    lunchLady: { vary: [
      ['Lunch Lady: Keep it movin\', sugar.'],
      ['Lunch Lady: One ketchup, sugar. One.'],
      ["Lunch Lady: Don't ask what's in it."],
    ] },
    cafMenu: ['Menu: Monday nuggets. Tuesday tacos. Wednesday ??? Thursday pizza. Friday ???'],
    cafTable: ['A cafeteria table. Somebody carved "BEN WAS HERE." Ben did not.'],
    cafExit: ["Ben: Not leavin' till I eat."],
    bleachers: ['The bleachers. Mom sits right in the middle with her sign.'],
    midfieldW: ['The big W at midfield. Coach says if you step on it you run laps.'],
    sled: ['The tackling sled. Ben has lost to it many times.'],
    cone: ['A cone. Ben tripped over this exact cone in August.'],
    waterCooler: ['Gatorade cooler. Somebody already dumped it on Coach. Twice.'],
    trumanSchool: { days: {
      Monday: ["Truman: Mornin'. You look like you slept in your truck.", 'Ben: I did not. ...Not last night.'],
      Tuesday: ["Truman: Label Shopper after practice. Don't forget.", 'Ben: Do I have to?', 'Truman: Yes.'],
      Wednesday: ['Truman: Bro, you look like a wet paper towel.', "Ben: Don't talk so loud."],
      Thursday: ["Truman: Heard Chevy's lookin' for you.", 'Ben: Heard.'],
      Friday: ['Truman: Big game. You nervous?', "Ben: Air Force pilots don't get nervous."],
    } },
    trumanLunch: { days: {
      Monday: ["Truman: They gave me a nugget shaped like Arkansas. That's gotta be good luck."],
      Tuesday: ["Truman: This taco's already got a bite out of it. I ain't touched it."],
      Wednesday: ['Truman: You gonna eat that?', 'Ben: Please take it.'],
      Thursday: ["Truman: I'd marry this pizza."],
      Friday: ["Truman: Coach said no tots before the game. I've had nine."],
    } },
    coach: { vary: [
      ['Coach Sheffield: Hustle, Ben!'],
      ["Coach Sheffield: Why are you talkin' to me? Hustle!"],
      ['Coach Sheffield: Is that a helmet or a hat? Strap it on, son!'],
    ] },
    player: { vary: [
      ['Teammate: Coach is in a MOOD today.'],
      ["Teammate: Don't step on the W. I'm serious."],
      ['Teammate: My neck hurts and we have not started.'],
    ] },
    fieldExit: { days: {
      Monday: ["Coach Sheffield: Where you think you're goin'? PRACTICE, son!"],
      Friday: ["Coach Sheffield: Where you think you're goin'? We got a GAME, son!"],
    } },

    // --- Saturday ---
    sam: ['Sam: NOOOO! I DON\'T WANNA!', 'Ben: You don\'t wanna WHAT?', 'Sam: ANYTHING!!'],
    vinson: ['Vinson: Say it again! Say "Welcome to Hardee\'s"!'],
    delano: ["Delano: Hold on, I'm zoomin' in on your hairnet."],
    trumanRancho: ["Truman: Get the fajitas. Don't think. Just get the fajitas."],
    jake: ["Jake: You gonna finish those chips? You haven't started them? Even better."],
    chevyRancho: ['Chevy: Sit by ME, buddy! I saved you a seat! It\'s warm!'],
    waiter: ['Waiter: Careful, the plate is very hot. The fajitas are very hot. Everything is hot.'],
    diner: ['A man is wearing a sombrero from the wall. Nobody has said anything.'],
    ranchoExit: ["Ben: Can't leave. The fajitas are still sizzlin'."],
    booth: ['A red booth. It squeaks every time you sit down. It sounds like a fart. Every time.'],
    fajitas: ['The fajitas are STILL sizzling. Ben is scared of them. Ben wants them.'],
    papelPicado: ['Colorful paper flags strung across the wall. Very festive.'],
    sombrero: ['A giant sombrero on the wall. Ben: I could fit my whole truck under that.'],
    pinata: ['A donkey pinata. It has survived every birthday party. It has seen things.'],

    // --- Friday night ---
    momGame: ["Mom: GO BENNY BOO!! That's my baby!!", 'Ben: Mom. MOM. Everybody can hear you.'],
    momSign: ['Mom\'s sign. "GO BENNY BOO." There is glitter on it. There is glitter on everything.'],
    fan: ['Fan: Go Warriors!'],

    // --- The field party ---
    crush: ['{crush} is laughing at something by the fire. Ben needs his guitar first.'],
    partyGirl: ["Girl: Is that a guitar? Oh no."],
    trumanParty: ['Truman: You brought a guitar. To a party. On purpose.'],
    jakeParty: ["Jake: This cooler is mine now. I'm in charge of the Cheerwine."],
    chevyParty: ['Chevy: BUDDY! We good?', 'Ben: Stay over there.'],
    vinsonParty: ["Vinson: Ben's got his guitar. Delano, get your phone."],
    delanoParty: ["Delano: Already recordin'."],
    partyTeam: { vary: [["Teammate: What a night."], ['Teammate: My neck still hurts.']] },
    pine: ['Pine trees. All the way around.'],
    bonfire: ['The fire is mostly pallets.'],
    log: ['A log. It seats one and a half.'],
    hayBale: ['A hay bale. Somebody is already asleep on the other side of it.'],
    cooler: ['A cooler full of Cheerwine and ice.'],
    pickup: ["Somebody's truck. Ben's is taller."],

    // --- Classroom ---
    classroomExit: { days: {
      Wednesday: ["Stepp: Where do you think you're goin'? SIT."],
      Thursday: ['Mrs. Norris: Sit down, Ben. The test is that way.'],
    } },
    stepp: ['Stepp: Phone. Away. Now.'],
    mathTeacher: ["Mrs. Norris: No talkin' during the test, Ben."],
    classmate: { days: {
      Wednesday: ['Classmate: Bro, Stepp is gonna END you.'],
      Thursday: ['Classmate: You study?', "Ben: It's math. You just do it."],
    } },
    benDesk: ["Ben's desk. He carved an F-16 into it. It's honestly pretty good."],
    desk: ["Somebody's desk. There's gum under it. Old gum."],
    whiteboard: ["Mr. Stepp's notes, and a frog somebody drew. It's about frogs."],
    wallClock: ['The clock. Ben has stared at it so long it stared back.'],
    teacherDesk: ["Mr. Stepp's desk. His mug says 'I'D RATHER BE FISHING.'"],
    fishTank: ['The class fish tank. One fish is named Scottie. Scottie has seen too much.'],

    // --- School bathroom ---
    bathroomExit: ["Ben: Can't leave now. My stomach said so."],
    stall: ['The stall. Ben\'s office.'],
    schoolMirror: ['Ben looks in the mirror. Still a little green.'],
    handDryer: ['The hand dryer. It blows cold air and sadness.'],
    chevy: ['Chevy: BUDDY! You look like you need a hug!'],

    // --- Label Shopper ---
    thriftDoor: ["Truman: Hold up, I'm still lookin'."],
    thriftSign: ['Label Shopper. Everything is used. Some of it is VERY used.'],
    rack: ['A rack of shirts. One says "World\'s Okayest Grandpa." Ben is tempted.'],
    junkShelf: ['A lamp, three mugs, a creepy doll and a tiny TV. The doll is watching Ben.'],
    mannequin: ['Ben: That mannequin is DRIPPED out.'],
    bargainBin: ['The bargain bin. Ben finds one roller skate and a Shrek DVD.'],
    fittingRoom: ["The fitting room. Ben isn't goin' in there. He's seen things."],
    thriftRegister: ['The register. There is a bowl of free butterscotch candies. They are all stuck together.'],
    thriftCashier: ["Cashier: Everything with a yellow tag is half off, sugar."],
    trumanThrift: ['Truman: Look, a bowling shirt that says "Earl." I\'m Earl now.'],
    shopper: ['A man is holding a lamp shaped like a duck. He is very serious about it.'],
    officer: ["Officer Gourley: Don't run. I'm too old to run."],

    // --- Garage ---
    dirtbike: ["Ben's dirtbike. Ben: She's a little busted. Okay, a lot."],
    workbench: ["Dad's workbench. Every tool exactly where Dad left it. For now."],
    pegboard: ['Ben: I know what like three of these tools do.'],
    toolChest: ['A big red tool chest. The bottom drawer is just zip ties.'],
    tires: ['Old tires. Jake says he wants them. Jake has no money.'],
    gasCan: ["Ben: Who's been usin' my gas? ...Oh. Me."],
    garageDoor: ["Ben: Only Dad's allowed to press the button. It's a whole thing."],
    garageFridge: ["Dad's drinks. Off limits."],
    garageMat: ["Ben: Can't go back in yet. Got stuff to do out here."],
    knife: ["A big hunting knife in Ben's truck bed. Ben: Huh. How'd that get there?"],

    // --- Church ---
    stainedGlass: ['A stained glass window. The sun makes the whole floor look like a rainbow.'],
    bigCross: ['A big wooden cross hangs over the stage.'],
    pulpit: ["Ben: Not my spot. I'm talent, not management."],
    mic: ["Not Ben's turn yet."],
    amp: ["Ben's amp. Turned up to 4, because Mom said no higher than 4."],
    piano: ['The church piano. Ben knows exactly one song on it. Half of one song.'],
    flowers: ['Fresh flowers. They smell like old ladies. In a nice way.'],
    pew: ['Ben: Back row is the best row. Easiest to sneak out of.'],
    churchgoer: ['Shh! Service is about to start.'],
    churchDoor: ["Ben: Can't leave yet. Mom would end me."],
  },
};
