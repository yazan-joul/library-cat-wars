// Tiny Web Audio synth: every sound is generated, no audio files.
window.LCW = window.LCW || {};

LCW.audio = (() => {
  let ctx = null;

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freqFrom, freqTo, dur, type = 'sine', vol = 0.15) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(dur, filterFreq, vol = 0.2) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  // ---------- Background music: a tiny step sequencer that speeds up with tension ----------
  const BASS = [45, 45, 48, 50, 45, 45, 52, 50];
  const LEAD = [69, null, 72, 74, 76, null, 74, 72, 69, null, 67, 69, 72, null, null, null];
  const BPM = [112, 124, 138, 158];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let musicGain = null, musicTimer = null, nextTime = 0, step = 0, level = 0, muted = false;

  function note(freq, t, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function hat(t, vol) {
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(musicGain);
    src.start(t);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.15) {
      const s = step % 16;
      if (s % 2 === 0) note(midi(BASS[(s / 2) % 8] + (level >= 3 && step % 64 >= 32 ? 2 : 0)), nextTime, 0.2, 'triangle', 0.12);
      if (level >= 1 && LEAD[s]) note(midi(LEAD[s] + (level >= 3 ? 12 : 0)), nextTime, 0.12, 'square', 0.025);
      if (level >= 2) hat(nextTime, s % 4 === 2 ? 0.08 : 0.035);
      if (level >= 3 && s % 4 === 0) note(70, nextTime, 0.15, 'sine', 0.3); // heartbeat kick
      nextTime += 60 / BPM[level] / 4;
      step++;
    }
  }

  const music = {
    start() {
      if (!ctx) return;
      if (!musicGain) {
        musicGain = ctx.createGain();
        musicGain.connect(ctx.destination);
      }
      musicGain.gain.value = muted ? 0 : 0.8;
      if (musicTimer) return;
      step = 0;
      nextTime = ctx.currentTime + 0.05;
      musicTimer = setInterval(schedule, 50);
    },
    stop() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    setLevel(l) { level = Math.max(0, Math.min(BPM.length - 1, l)); },
    toggleMute() {
      muted = !muted;
      if (musicGain) musicGain.gain.value = muted ? 0 : 0.8;
      return muted;
    },
  };

  return {
    init,
    music,
    alarm() { [0, 160].forEach((d) => setTimeout(() => tone(880, 660, 0.14, 'square', 0.07), d)); },
    powerup() { [523, 784, 1046, 1568].forEach((f, i) => setTimeout(() => tone(f, f * 1.02, 0.1, 'triangle', 0.12), i * 60)); },
    ding() { tone(1046, 1568, 0.15, 'triangle', 0.1); },
    meow(pitch = 1) {
      tone(500 * pitch, 900 * pitch, 0.15, 'sawtooth', 0.06);
      setTimeout(() => tone(900 * pitch, 380 * pitch, 0.35, 'sawtooth', 0.06), 140);
    },
    purr() { noise(0.8, 120, 0.25); },
    shh() { noise(0.9, 4500, 0.35); },
    pop() { tone(300, 900, 0.12, 'triangle', 0.15); },
    eat() { tone(700, 1200, 0.08, 'square', 0.05); setTimeout(() => tone(800, 1300, 0.08, 'square', 0.05), 120); },
    crash() { noise(0.5, 600, 0.35); tone(200, 60, 0.4, 'square', 0.08); },
    type() { tone(1800 + Math.random() * 400, 1500, 0.03, 'square', 0.02); },
    zap() { tone(1500, 100, 0.3, 'sawtooth', 0.08); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.25, 'triangle', 0.15), i * 130)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, f * 0.97, 0.3, 'triangle', 0.15), i * 180)); },
  };
})();
