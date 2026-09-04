// Synthesised sound only - no audio files to download, ship or fail to load.
let ctx = null, master = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
}

export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

function tone(freq, dur, type = 'sine', vol = 1, slideTo = null, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

// pitch rises with the combo count - the little dopamine ladder
export function sfxPickup(step = 0) {
  const base = 660 * Math.pow(1.0595, Math.min(step, 16));
  tone(base, 0.10, 'triangle', 0.5);
  tone(base * 2, 0.07, 'sine', 0.22, null, 0.03);
}
export function sfxJump()   { tone(300, 0.16, 'sine', 0.4, 620); }
export function sfxLand()   { tone(180, 0.10, 'sine', 0.32, 110); }
export function sfxDash()   { tone(200, 0.22, 'sawtooth', 0.16, 900); }
export function sfxBlip()   { tone(520, 0.05, 'square', 0.10); }
export function sfxDeny()   { tone(200, 0.16, 'square', 0.20, 120); }
export function sfxCoin()   { tone(880, 0.08, 'square', 0.25); tone(1320, 0.12, 'square', 0.2, null, 0.07); }
export function sfxQuest()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.35, null, i * 0.09)); }
export function sfxPearl()  { [523, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.35, null, i * 0.11)); }
export function sfxLevel()  { [659, 880, 1109].forEach((f, i) => tone(f, 0.3, 'square', 0.2, null, i * 0.1)); }
export function sfxOpen()   { tone(440, 0.09, 'triangle', 0.25, 660); }
