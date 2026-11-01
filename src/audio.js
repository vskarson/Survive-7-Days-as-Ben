// Tiny chiptune sound effects made with the Web Audio API. Browsers only allow
// audio after the player presses a key or clicks, so the audio context is
// created the first time a sound is played (always from a key press).
// Music is in music.js.

const SFX_MAX_VOLUME = 0.5;   // master volume with the Sound effects setting at 10

// Talking sounds. Each character's voice is in CONTENT.characters.
const NARRATOR_VOICE = { pitch: 320, wave: 'triangle', range: 0.1 };
const TALK_GAP = 0.065;       // about this many seconds between blips, whatever the text speed
const TALK_RANGE = 0.3;       // how far a voice moves up and down (0.3 = 30% of its pitch)
const TALK_VOL = { square: 0.03, sawtooth: 0.035, triangle: 0.08 };   // so every wave is about as loud

const Sound = {
  ctx: null,

  get volume() {
    return SFX_MAX_VOLUME * Settings.sfx / VOLUME_STEPS;
  },

  get() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  // One note: oscillator through a quick attack / decay envelope.
  tone(freq, dur, type = 'square', vol = 0.1, delay = 0, slideTo = null) {
    if (this.volume <= 0) return;   // the volume ramps below can't reach 0
    const ctx = this.get();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol * this.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  // A strummed chord (frequencies in Hz).
  strum(freqs) {
    freqs.forEach((f, i) => {
      this.tone(f, 0.45, 'triangle', 0.12, i * 0.018);
      this.tone(f * 2, 0.15, 'square', 0.02, i * 0.018);
    });
  },

  // Letter `i` of the text on screen, spoken in a voice ({ pitch, wave, range }).
  // Each letter has its own note, so a line always sounds the same. ALL-CAPS
  // words are yelled, and the end of a question goes up.
  talk(page, i, voice) {
    const letter = page[i].toLowerCase();
    const every = Math.ceil(TALK_GAP * 1000 / Settings.charMs());
    if (!/[a-z0-9]/.test(letter) || page.slice(0, i).replace(/[^a-z0-9]/gi, '').length % every) return;
    const { pitch, wave = 'square', range = TALK_RANGE } = voice;
    const note = (letter.charCodeAt(0) * 7 % 11) / 10 - 0.5;   // -0.5 to 0.5
    const yell = /[A-Z]{2}/.test(page.slice(Math.max(0, i - 1), i + 2));
    const ask = page.trimEnd().endsWith('?') && i >= page.trimEnd().length - 7;
    const freq = pitch * (1 + range * note) * (yell ? 1.2 : 1) * (ask ? 1.25 : 1);
    const vowel = 'aeiou'.includes(letter);
    this.tone(freq, vowel ? 0.075 : 0.05, wave, TALK_VOL[wave] * (yell ? 1.4 : 1), 0, vowel ? freq * 0.94 : null);
  },

  // White noise, shared with the music's drums.
  noiseBuffer(ctx) {
    if (!this.noiseData) {
      this.noiseData = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
      const data = this.noiseData.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseData;
  },

  // A burst of noise through a high-pass filter (crashes, whooshes).
  noise(dur, vol, cutoff) {
    if (this.volume <= 0) return;
    const ctx = this.get();
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + dur + 0.01);
  },

  // Ben getting changed.
  rustle() { this.noise(0.3, 0.07, 2800); },

  // After a bad song.
  cricket() { for (const d of [0, 0.09, 0.18]) this.tone(4200, 0.05, 'sine', 0.025, d); },

  // Chevy's attack.
  creak() { this.tone(170, 0.45, 'sawtooth', 0.03, 0, 300); this.tone(260, 0.35, 'sawtooth', 0.02, 0.3, 140); },
  stomp() { this.tone(62, 0.24, 'sine', 0.45, 0, 34); this.noise(0.07, 0.06, 150); },
  knock() { this.tone(180, 0.09, 'square', 0.14, 0, 90); },
  groan(dur) { this.tone(68, dur, 'sawtooth', 0.08, 0, 112); this.tone(102, dur, 'sawtooth', 0.04, 0, 74); },
  ping(freq) { this.tone(freq, 0.14, 'square', 0.05, 0, freq * 0.8); },
  whoosh() { this.noise(0.38, 0.14, 1400); },
  crash() { this.noise(0.6, 0.25, 260); this.tone(88, 0.45, 'sine', 0.35, 0, 28); this.tone(1100, 0.2, 'square', 0.04, 0, 240); },

  kick() { this.tone(140, 0.12, 'sine', 0.25, 0, 45); },
  tick() { this.tone(1400, 0.04, 'square', 0.05); },
  good() { this.tone(880, 0.08, 'square', 0.07); this.tone(1320, 0.12, 'square', 0.07, 0.07); },
  bad() { this.tone(160, 0.25, 'sawtooth', 0.08, 0, 90); },
  cash() { this.tone(1568, 0.07, 'square', 0.06); this.tone(2093, 0.15, 'square', 0.06, 0.06); },
  blip() { this.tone(660, 0.05, 'square', 0.05); },
  // Sad trombone: wah, wah, wah, waaah.
  fail() {
    [[392, 0], [370, 0.28], [349, 0.56]].forEach(([f, d]) => this.tone(f, 0.24, 'sawtooth', 0.06, d, f * 0.97));
    this.tone(330, 0.8, 'sawtooth', 0.06, 0.84, 290);
  },
};

// Note frequencies used by the guitar minigame.
const NOTE = {
  G2: 98.0, A2: 110.0, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0,
  A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.0,
};
