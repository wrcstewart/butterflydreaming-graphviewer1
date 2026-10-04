#!/usr/bin/env node
'use strict';
//
// Generate a drone source from nothing but arithmetic.
//
// WHY THIS EXISTS. Every other pad in sources/ is derived from someone's
// recording, which means a licence to establish, a chain to confirm and a
// provenance note to keep honest — and one entry is still flagged
// lowest-confidence because its uploader deleted their account. A SYNTHESISED
// source has no upstream at all. It is CC0 by construction, reproducible from
// this file, and fully understood, which was the author's actual reason for
// wanting it.
//
// WHAT THE MEASUREMENTS SAY IT NEEDS. Three things, learned the hard way from
// ten sampled pads:
//
//   1. NO TRANSIENTS. Trivial here — nothing starts or stops.
//   2. STEADY LEVEL. Also trivial, and not enough on its own: a perfectly
//      steady drone is also a perfectly static one.
//   3. MOVEMENT THAT SURVIVES A 2-SECOND WINDOW. This is the hard part and the
//      reason this file is not just a sine stack. Detuning two partials makes
//      them BEAT, which moves the amplitude but barely touches the spectrum —
//      measured as spectral flux it is close to nothing, where the pads worth
//      hearing sit at 0.29 to 0.43. So every partial also gets its own slow
//      AMPLITUDE DRIFT at its own rate: when partials rise and fall against
//      each other the balance of the spectrum keeps changing, which is what
//      flux measures and what the ear hears as alive.
//
// SEAMLESS BY CONSTRUCTION. Every frequency and every drift rate is rounded to
// an exact multiple of 1/duration, so each completes a whole number of cycles
// in the file. The end therefore joins the beginning perfectly — no click, no
// crossfade, no 5 ms fade needed. That is something no recording can offer and
// it cost three rounds of fighting loop clicks on the sampled pads. The
// rounding is to 1/duration Hz — 0.05 Hz at 20 s — which is far finer than any
// detuning cares about.
//
//   node make_synth_pad.js
//
// Edit CONFIG, run, and it writes sources/ with a name describing itself.

const fs = require('fs');
const path = require('path');

const CONFIG = {
  duration:   20,        // seconds. Longer = finer frequency grid.
  sampleRate: 48000,
  root:       110,       // Hz. 110 = A2.
  peakDb:     -6,        // grains SUM in the module, so leave headroom
  // Each partial: ratio to the root, gain, how many detuned copies, and how
  // far apart in cents. `driftHz` is that partial's own amplitude drift rate
  // and `driftDepth` how deep (0..1).
  //
  // Ratios need not be integers. Inharmonic partials (2.4, 5.1) give a bell or
  // glass colour; strict harmonics give an organ or string colour. The set
  // below is harmonic with two inharmonic additions for air.
  partials: [
    { ratio: 1,    gain: 1.00, copies: 3, cents: 4,  driftHz: 0.07, driftDepth: 0.25 },
    { ratio: 2,    gain: 0.50, copies: 3, cents: 5,  driftHz: 0.11, driftDepth: 0.30 },
    { ratio: 3,    gain: 0.28, copies: 2, cents: 6,  driftHz: 0.13, driftDepth: 0.35 },
    { ratio: 4,    gain: 0.20, copies: 2, cents: 7,  driftHz: 0.17, driftDepth: 0.40 },
    { ratio: 5,    gain: 0.12, copies: 2, cents: 8,  driftHz: 0.19, driftDepth: 0.45 },
    { ratio: 6,    gain: 0.09, copies: 2, cents: 9,  driftHz: 0.23, driftDepth: 0.45 },
    { ratio: 8,    gain: 0.06, copies: 2, cents: 11, driftHz: 0.29, driftDepth: 0.50 },
    { ratio: 2.41, gain: 0.07, copies: 2, cents: 7,  driftHz: 0.31, driftDepth: 0.50 },
    { ratio: 5.13, gain: 0.04, copies: 2, cents: 9,  driftHz: 0.37, driftDepth: 0.55 },
  ],
};

const TAU = Math.PI * 2;

function build(cfg) {
  const n = Math.round(cfg.duration * cfg.sampleRate);
  const grid = 1 / cfg.duration;                 // frequency resolution, Hz
  const snap = (hz) => Math.max(grid, Math.round(hz / grid) * grid);

  // Flatten the partial list into individual oscillators.
  const oscs = [];
  for (const p of cfg.partials) {
    for (let c = 0; c < p.copies; c++) {
      // Spread the copies symmetrically about the partial's own frequency.
      const offset = p.copies === 1 ? 0 : (c - (p.copies - 1) / 2) * p.cents;
      const hz = snap(cfg.root * p.ratio * Math.pow(2, offset / 1200));
      oscs.push({
        hz,
        gain: p.gain / p.copies,
        // Each copy drifts at a slightly different rate, so no two partials
        // ever rise and fall together — that lack of coincidence is the
        // movement.
        driftHz: snap(p.driftHz * (1 + 0.13 * c)),
        driftDepth: p.driftDepth,
        // A fixed phase offset per oscillator, so they do not all start at
        // zero and sum into one loud spike at t=0.
        phase: (c * 0.37 + p.ratio * 0.61) % 1,
        driftPhase: (c * 0.29 + p.ratio * 0.43) % 1,
        // Stereo: pan by index so the partials spread across the image.
        pan: ((oscs.length % 5) - 2) / 2 * 0.7,
      });
    }
  }

  const L = new Float64Array(n);
  const R = new Float64Array(n);
  for (const o of oscs) {
    const w = TAU * o.hz / cfg.sampleRate;
    const dw = TAU * o.driftHz / cfg.sampleRate;
    const ph = TAU * o.phase;
    const dph = TAU * o.driftPhase;
    const gl = o.gain * Math.sqrt((1 - o.pan) / 2);
    const gr = o.gain * Math.sqrt((1 + o.pan) / 2);
    for (let i = 0; i < n; i++) {
      // drift is 1 at the top of its cycle and (1 - depth) at the bottom
      const d = 1 - o.driftDepth * 0.5 * (1 - Math.cos(dw * i + dph));
      const v = Math.sin(w * i + ph) * d;
      L[i] += v * gl;
      R[i] += v * gr;
    }
  }

  // Normalise to the target peak. No limiting: nothing here clips unless the
  // gains are absurd, and a limiter would flatten the drift that is the point.
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(L[i]), b = Math.abs(R[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }
  const g = Math.pow(10, cfg.peakDb / 20) / (peak || 1);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  return { L, R, n, oscs };
}

// 24-bit PCM, format 1 — deliberately NOT float and not WAVE_FORMAT_EXTENSIBLE,
// both of which defeat Python's `wave` module. read_any() goes through ffmpeg
// and would cope either way, but a file other tools can open is worth more.
function writeWav(file, L, R, sampleRate) {
  const n = L.length, ch = 2, bits = 24, bytes = bits / 8;
  const dataLen = n * ch * bytes;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * ch * bytes, 28);
  buf.writeUInt16LE(ch * bytes, 32); buf.writeUInt16LE(bits, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  let o = 44;
  const put = (x) => {
    let v = Math.round(Math.max(-1, Math.min(1, x)) * 8388607);
    if (v < 0) v += 0x1000000;
    buf.writeUIntLE(v & 0xffffff, o, 3); o += 3;
  };
  for (let i = 0; i < n; i++) { put(L[i]); put(R[i]); }
  fs.writeFileSync(file, buf);
  return dataLen + 44;
}

// The filename describes the patch, which is the author's request and also the
// provenance: a synthesised source needs no licence note, only its recipe.
function nameFor(cfg) {
  const ratios = cfg.partials.map((p) => String(p.ratio).replace('.', 'p')).join('-');
  return `synth_r${cfg.root}_${cfg.duration}s_p${cfg.partials.length}_${ratios}.wav`;
}

const out = path.join(__dirname, 'sources', nameFor(CONFIG));
const { L, R, n, oscs } = build(CONFIG);
const size = writeWav(out, L, R, CONFIG.sampleRate);

let sum = 0, peak = 0;
for (let i = 0; i < n; i++) {
  sum += L[i] * L[i] + R[i] * R[i];
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const db = (x) => (20 * Math.log10(x)).toFixed(1);
console.log(`  ${path.basename(out)}`);
console.log(`  ${oscs.length} oscillators from ${CONFIG.partials.length} partials`);
console.log(`  ${CONFIG.duration}s  ${CONFIG.sampleRate} Hz  24-bit stereo  ${Math.round(size / 1024)} KB`);
console.log(`  RMS ${db(Math.sqrt(sum / (n * 2)))} dB   peak ${db(peak)} dB`);
console.log(`  loops seamlessly: every frequency is a multiple of ${(1 / CONFIG.duration).toFixed(3)} Hz`);
