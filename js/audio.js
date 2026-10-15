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

  return {
    init,
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
