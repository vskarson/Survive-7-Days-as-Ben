// Chiptune music made with the Web Audio API: a lead (square), a bass
// (triangle) and drums (noise and a sine kick), looping. Songs are written as
// one token per eighth note:
//   'G4' = a note, '-' = hold the note before, '.' = rest
//   drums: 'k' = kick, 's' = snare, 'h' = hi-hat
// Tracks can be shorter than the lead; they repeat to fill it.
// Music waits for the first key press or click (browsers block audio until then).

const MUSIC_MAX_VOLUME = 0.08;  // music master volume with the Music setting at 10 (sits under the sound effects)
const MUSIC_DUCK = 0.5;         // volume share while the text box is open, so the words come first
const MUSIC_LOOKAHEAD = 0.25;   // seconds of notes scheduled ahead
const LEAD_VOLUME = { square: 0.05, triangle: 0.09 };   // triangle is softer, so it needs more

const SONGS = {
  // Mornings at home: soft, no drums, in G.
  home: {
    bpm: 88, wave: 'triangle',
    lead: 'D5 - B4 - G4 - - - | E5 - C5 - G4 - - - | D5 - B4 - A4 - G4 - | A4 - - - - - . . |' +
          'D5 - B4 - G4 - B4 - | C5 - E5 - D5 - C5 - | B4 - A4 - G4 - A4 - | G4 - - - - - . .',
    bass: 'G2 - - - D3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - - | D3 - - - A2 - - - |' +
          'G2 - - - D3 - - - | C3 - - - A2 - - - | D3 - - - D3 - - - | G2 - - - - - - -',
    drums: '.',
  },
  // Church: "Amazing Grace", slow and in three (six eighths to the bar).
  church: {
    bpm: 66, wave: 'triangle',
    lead: 'D4 - | G4 - - - B4 G4 | B4 - - - A4 - | G4 - - - E4 - | D4 - - - D4 - | G4 - - - B4 G4 | B4 - - - A4 - |' +
          'D5 - - - - - | - - - - B4 - | D5 - - - B4 G4 | B4 - - - A4 - | G4 - - - E4 - | D4 - - - D4 - |' +
          'G4 - - - B4 G4 | B4 - - - A4 - | G4 - - - - - | - - - -',
    bass: '. . | G2 - - - - - | G2 - - - - - | C3 - - - - - | G2 - - - - - | G2 - - - - - | G2 - - - - - |' +
          'D3 - - - - - | D3 - - - - - | G2 - - - - - | G2 - - - - - | C3 - - - - - | G2 - - - - - |' +
          'G2 - - - - - | D3 - - - - - | G2 - - - - - | G2 - - -',
    drums: '.',
  },
  // Trouble: a heartbeat, a low pulse and hardly any tune, in E minor.
  tense: {
    bpm: 84, wave: 'triangle',
    lead: '. . . . . . . . | E4 - - . . . . . | . . . . . . . . | F4 - - . E4 - - . |',
    bass: 'E2 . . E2 . . E2 . | E2 . . E2 . . F2 . |',
    drums: 'k . k . . . . . |',
  },
  // Ben's hangover: everything slides slowly downhill.
  woozy: {
    bpm: 60, wave: 'triangle',
    lead: 'E4 - - - - - D#4 - | D4 - - - - - C#4 - | C4 - - - - - B3 - | A#3 - - - - - - - |',
    bass: 'A2 - - - - - - - | G#2 - - - - - - - | G2 - - - - - - - | F#2 - - - - - - - |',
    drums: '.',
  },
  // Title and stats screens: a slow country sunset in G.
  title: {
    bpm: 96,
    lead: 'B4 - - D5 B4 - A4 G4 | E4 - G4 - E4 - D4 - | B4 - D5 - E5 - D5 B4 | A4 - - - F#4 - D4 - |' +
          'B4 - D5 B4 A4 - G4 - | E5 - D5 - C5 - B4 A4 | A4 - B4 A4 F#4 - D4 - | G4 - - - - - . .',
    bass: 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | D3 . A2 . D3 . A2 . |' +
          'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 .',
    drums: 'k . h . s . h . |',
  },
  // Walking around in the daytime: bouncy, in C.
  day: {
    bpm: 116,
    lead: 'E5 . G5 . E5 D5 C5 . | A4 . C5 . A4 G4 F4 . | G4 . B4 . D5 . B4 . | C5 - - . . . G4 . |' +
          'A4 . C5 . E5 . C5 . | A4 . C5 . F5 . E5 D5 | D5 . B4 . G4 . A4 B4 | D5 - - . . . . .',
    bass: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 . |' +
          'A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . B2 .',
    drums: 'k . h k s . h . |',
  },
  // Evenings and nights: slow and mellow, in A minor.
  night: {
    bpm: 76, wave: 'triangle',
    lead: 'A4 - - - C5 - B4 - | A4 - - - - - . . | G4 - - - E4 - G4 - | D4 - - - - - . . |' +
          'A4 - - - C5 - E5 - | D5 - - - C5 - A4 - | G4 - - - E4 - C4 - | D4 - - - B3 - - -',
    bass: 'A2 - - - E3 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - - |',
    drums: 'k . . . h . . . |',
  },
  // Every minigame except the guitar one (it has its own strumming): fast, in E minor.
  minigame: {
    bpm: 150,
    lead: 'E5 . B4 . E5 . G5 F#5 | E5 . C5 . G4 . C5 . | D5 . B4 . G4 . B4 D5 | F#5 - - . D5 . A4 . |' +
          'G5 . F#5 . E5 . B4 . | C5 . E5 . G5 . E5 . | F#5 . A5 . F#5 . D5 . | A5 - - - . . . .',
    bass: 'E2 E3 E2 E3 E2 E3 E2 E3 | C3 C2 C3 C2 C3 C2 C3 C2 | G2 G3 G2 G3 G2 G3 G2 G3 | D3 D2 D3 D2 D3 D2 D3 D2 |',
    drums: 'k h s h k k s h |',
  },
  // Good Ben: triumphant, in G.
  good: {
    bpm: 108,
    lead: 'G4 . B4 . D5 - - - | F#5 - E5 - D5 - A4 - | E5 - - - G5 - - - | F#5 - - - A5 - - - |' +
          'G5 - - - D5 - B4 - | C5 - E5 - G5 - E5 - | D5 - - - F#5 - A5 - | G5 - - - - - - -',
    bass: 'G2 . D3 . G2 . D3 . | D3 . A2 . D3 . A2 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . F#3 . |' +
          'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 .',
    drums: 'k . h . s . h h | k . h . s . s s |',
  },
  // Grounded Ben and Jail Ben: slow sad blues, in A minor.
  sad: {
    bpm: 72, wave: 'triangle',
    lead: 'E4 - - - C4 - A3 - | F4 - - - D4 - A3 - | G#4 - - - B4 - - - | A4 - - - - - - - |' +
          'D5 - - - C5 - A4 - | C5 - - - A4 - E4 - | D4 - - - E4 - G#4 - | A4 - - - - - - -',
    bass: 'A2 - - - E2 - - - | D2 - - - A2 - - - | E2 - - - B2 - - - | A2 - - - E2 - - - |',
    drums: 'k . . . s . . . |',
  },
};

// 'F#4' -> Hz
function noteFreq(name) {
  const m = name.match(/^([A-G])(#|b)?(\d)$/);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, ((Number(m[3]) + 1) * 12 + semis - 69) / 12);
}

// A track string -> one entry per eighth: null, or { freq, steps } / { hit } at note starts.
function parseTrack(text, drums) {
  const tokens = text.split(/[\s|]+/).filter(Boolean);   // '|' marks bars, for reading only
  return tokens.map((t, i) => {
    if (t === '.' || t === '-') return null;
    if (drums) return { hit: t };
    let steps = 1;
    while (tokens[i + steps] === '-') steps++;
    return { freq: noteFreq(t), steps };
  });
}

for (const song of Object.values(SONGS)) {
  song.tracks = { lead: parseTrack(song.lead), bass: parseTrack(song.bass), drums: parseTrack(song.drums, true) };
  song.length = song.tracks.lead.length;
}

const Music = {
  current: null,   // song name, or null for silence
  step: 0,
  nextTime: 0,
  timer: null,
  out: null,       // this song's gain node (each song gets its own, so the old one can fade out)
  ducked: false,   // true while the text box is open

  get volume() {
    return MUSIC_MAX_VOLUME * Settings.music / VOLUME_STEPS * (this.ducked ? MUSIC_DUCK : 1);
  },

  // Start a song (from the top), or keep it going if it's already playing.
  play(name) {
    if (name === this.current) return;
    this.stop();
    if (!name) return;
    this.current = name;
    this.step = 0;
    this.timer = setInterval(() => this.tick(), 60);
    this.tick();
  },

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    if (this.out && Sound.ctx) {
      const out = this.out;
      out.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.08);
      setTimeout(() => out.disconnect(), 1000);
    }
    this.out = null;
  },

  // Schedule the notes due in the next MUSIC_LOOKAHEAD seconds.
  tick() {
    const ctx = Sound.ctx;
    if (!this.current || !ctx || ctx.state !== 'running') return;   // no key pressed yet
    if (!this.out) {
      this.out = ctx.createGain();
      this.out.gain.value = this.volume;
      this.out.connect(ctx.destination);
      this.nextTime = ctx.currentTime + 0.05;
    }
    this.out.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.05);   // follows the Music setting live
    // The tab was in the background (timers slow down): pick up from now, no burst of old notes.
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.02;
    const song = SONGS[this.current];
    const stepDur = 60 / song.bpm / 2;
    while (this.nextTime < ctx.currentTime + MUSIC_LOOKAHEAD) {
      if (this.volume > 0) this.playStep(ctx, song, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % song.length;
      this.nextTime += stepDur;
    }
  },

  playStep(ctx, song, step, t, stepDur) {
    const { lead, bass, drums } = song.tracks;
    const l = lead[step % lead.length], b = bass[step % bass.length], d = drums[step % drums.length];
    const wave = song.wave || 'square';
    if (l) this.voice(ctx, l.freq, t, l.steps * stepDur, wave, LEAD_VOLUME[wave]);
    if (b) this.voice(ctx, b.freq, t, b.steps * stepDur, 'triangle', 0.16);
    if (d && d.hit === 'k') this.kick(ctx, t);
    if (d && d.hit === 's') this.hiss(ctx, t, 0.1, 0.06, 1800);
    if (d && d.hit === 'h') this.hiss(ctx, t, 0.03, 0.025, 7000);
  },

  // One note: quick attack, held, released at the end.
  voice(ctx, freq, t, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const end = t + dur * 0.92;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.setValueAtTime(vol * 0.7, Math.max(t + 0.013, end - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(end + 0.02);
  },

  kick(ctx, t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.14);
  },

  // Snare and hi-hat: a burst of white noise through a high-pass filter.
  hiss(ctx, t, dur, vol, cutoff) {
    const src = ctx.createBufferSource();
    src.buffer = Sound.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(t);
    src.stop(t + dur + 0.01);
  },
};

// The first key press or click unlocks audio, and the waiting song starts.
for (const type of ['keydown', 'pointerdown']) {
  window.addEventListener(type, () => { Sound.get(); Music.tick(); });
}
