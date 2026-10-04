// Sound and vibration — the sheet's moments felt as well as seen. Off by
// default, behind one Settings toggle: a play aid that makes noise unasked is
// one you stop opening on the bus. Nothing here decides anything; every cue is
// played after the state it marks already exists.
//
// No audio files: every sound is synthesised with the Web Audio API, so the app
// shell gains nothing to cache. The noise is drawn from a fixed linear
// congruential sequence, never from crypto.getRandomValues — that source is the
// dice's alone, and a seeded playtest must not have its rolls shifted by a sound.

import { Settings } from "./settings.js";

let ctx = null;
let noise = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  // One second of noise, from a fixed sequence (see above).
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let x = 2463534242;
  for (let i = 0; i < data.length; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    data[i] = (x / 4294967296) * 2 - 1;
  }
  return ctx;
}

// A filtered burst of noise: a die on the table, a pen across a box, a page.
function burst(at, { freq, q = 1, gain = 0.25, length = 0.04, type = "bandpass" }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(filter).connect(amp).connect(ctx.destination);
  src.start(at, (at * 7.3) % 0.9, length + 0.02);
}

// A low knock: the seal pressed in.
function knock(at, freq = 95, length = 0.22) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(freq * 1.6, at);
  osc.frequency.exponentialRampToValueAtTime(freq, at + 0.05);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(0.35, at + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(amp).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

const SOUNDS = {
  // Dice: four clicks, close together and falling off, like a die settling.
  roll: (t) => [0, 0.055, 0.12, 0.2].forEach((d, i) =>
    burst(t + d, { freq: 2600 - i * 300, q: 3, gain: 0.3 - i * 0.06, length: 0.035 })),
  // A pen crossing a box: two short strokes.
  cross: (t) => {
    burst(t, { freq: 1800, q: 0.8, gain: 0.18, length: 0.09 });
    burst(t + 0.1, { freq: 1500, q: 0.8, gain: 0.16, length: 0.09 });
  },
  // A sheet laid down.
  page: (t) => burst(t, { freq: 900, q: 0.5, gain: 0.06, length: 0.16, type: "lowpass" }),
  // The seal.
  seal: (t) => { knock(t); burst(t, { freq: 3000, q: 2, gain: 0.12, length: 0.03 }); },
};

const BUZZ = { roll: [12, 40, 12], cross: [18], seal: [30, 50, 70], page: null };

export function cue(kind) {
  if (!Settings.feel()) return;
  if (document.visibilityState !== "visible") return;
  const play = SOUNDS[kind];
  if (play && audio()) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    try { play(ctx.currentTime + 0.01); } catch { /* a refused audio graph is silence */ }
  }
  const pattern = BUZZ[kind];
  if (pattern && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* not every browser lets a page vibrate */ }
  }
}
