// Tiny Web Audio synth: every sound is generated, no audio files.
// Everything goes through a master gain + compressor so it is loud on laptop speakers without clipping.
window.LCW = window.LCW || {};

LCW.audio = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let musicMuted = false;

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp).connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = musicMuted ? 0 : 0.9;
      musicBus.connect(master);
    }
    if (ctx.state !== 'running') ctx.resume();
  }

  // Browsers only allow audio after a user gesture: unlock on the first click/key, and again if suspended.
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (ctx) init(); }, { passive: true }));

  const ready = () => ctx && ctx.state === 'running';

  function tone(freqFrom, freqTo, dur, type = 'sine', vol = 0.4, delay = 0, bus = sfxBus) {
    if (!ready()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  const noiseBuffers = {};
  function noiseBuffer(dur) {
    const key = dur.toFixed(2);
    if (!noiseBuffers[key]) {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noiseBuffers[key] = buf;
    }
    return noiseBuffers[key];
  }

  function noise(dur, filterFreq, vol = 0.5, type = 'bandpass', delay = 0, bus = sfxBus) {
    if (!ready()) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(bus);
    src.start(t);
  }

  // ---------- Background music: a tiny step sequencer that speeds up with tension ----------
  // Pitched in the mid range so laptop and phone speakers actually play it.
  const BASS = [57, 57, 60, 62, 57, 57, 64, 62];
  const LEAD = [81, null, 84, 86, 88, null, 86, 84, 81, null, 79, 81, 84, null, null, null];
  const BPM = [112, 124, 138, 158];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let musicTimer = null, nextTime = 0, step = 0, level = 0;

  function schedule() {
    if (!ready()) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // recover after tab sleep
    while (nextTime < ctx.currentTime + 0.15) {
      const s = step % 16;
      const d = nextTime - ctx.currentTime;
      const up = level >= 3 && step % 64 >= 32 ? 2 : 0;
      if (s % 2 === 0) tone(midi(BASS[(s / 2) % 8] + up), midi(BASS[(s / 2) % 8] + up), 0.18, 'square', 0.18, d, musicBus);
      if (LEAD[s] && (level >= 1 || s % 4 === 0)) tone(midi(LEAD[s] + up), midi(LEAD[s] + up), 0.14, 'triangle', 0.3, d, musicBus);
      if (level >= 2 || s % 4 === 2) noise(0.04, 8000, s % 4 === 2 ? 0.25 : 0.1, 'highpass', d, musicBus);
      if (level >= 3 && s % 4 === 0) tone(150, 50, 0.18, 'sine', 0.9, d, musicBus); // heartbeat kick
      nextTime += 60 / BPM[level] / 4;
      step++;
    }
  }

  const music = {
    start() {
      init();
      if (musicTimer) return;
      step = 0;
      nextTime = 0;
      musicTimer = setInterval(schedule, 40);
    },
    stop() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    setLevel(l) { level = Math.max(0, Math.min(BPM.length - 1, l)); },
    toggleMute() {
      musicMuted = !musicMuted;
      if (musicBus) musicBus.gain.value = musicMuted ? 0 : 0.9;
      return musicMuted;
    },
  };

  return {
    init,
    music,
    isRunning: ready,
    start() { [523, 659, 784].forEach((f, i) => tone(f, f, 0.12, 'square', 0.3, i * 0.09)); },
    meow(pitch = 1) {
      tone(550 * pitch, 950 * pitch, 0.14, 'sawtooth', 0.3);
      tone(950 * pitch, 420 * pitch, 0.35, 'sawtooth', 0.3, 0.13);
    },
    purr() { [0, 0.25, 0.5].forEach((d) => { noise(0.22, 400, 1.0, 'lowpass', d); tone(90, 70, 0.2, 'sawtooth', 0.25, d); }); },
    shh() { noise(1.0, 4000, 1.0); },
    pop() { tone(300, 900, 0.12, 'triangle', 0.5); },
    eat() { tone(700, 1200, 0.08, 'square', 0.25); tone(800, 1300, 0.08, 'square', 0.25, 0.12); },
    crash() { noise(0.5, 900, 1.0); tone(220, 60, 0.4, 'square', 0.35); },
    type() { noise(0.03, 3000, 0.35); },
    zap() { tone(1500, 100, 0.3, 'sawtooth', 0.35); },
    alarm() { [0, 0.16, 0.32].forEach((d) => tone(880, 660, 0.13, 'square', 0.35, d)); },
    powerup() { [523, 784, 1046, 1568].forEach((f, i) => tone(f, f * 1.02, 0.1, 'triangle', 0.45, i * 0.06)); },
    ring() { [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(i % 2 ? 1320 : 1760, i % 2 ? 1320 : 1760, 0.08, 'square', 0.22, d)); },
    ding() { tone(1046, 1568, 0.15, 'triangle', 0.35); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.25, 'square', 0.3, i * 0.13)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.3, 'triangle', 0.5, i * 0.18)); },
  };
})();
