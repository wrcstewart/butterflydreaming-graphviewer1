// voice_snr.js — signal-to-noise of one recorded take, measured in the browser.
//
// 2026-11-01. The rig reported PEAK only, and peak is the wrong number twice
// over: the level meter saturates at -2.3 dBFS so it cannot show how close a
// take is to the ceiling, and peak says nothing at all about the noise floor,
// which is the thing that actually ends up in the trained voice. The author,
// after ringlet reproduced the whirr from her room: *"we have seen that it
// learns the noise"*. Whatever is in the clips is what the model learns, so the
// floor has to be visible AT THE MOMENT OF RECORDING, while the take can still
// be done again — not discovered after 125 utterances.
//
// The method is the one the measurements in this project settled on, and the
// numbers it prints are meant to be the SAME numbers quoted in analysis, so a
// reading here can be compared with one taken offline.
//
// FOUR MISTAKES THIS DELIBERATELY AVOIDS, each made earlier in this work:
//
//  1. A PEAK-RELATIVE THRESHOLD FINDS THE START OF THE FILE, NOT THE VOICE.
//     "First sample above 2% of the peak" put the head silence at 0.03 s when
//     the author was plainly pausing half a second, because 2% of a 40% peak is
//     -42 dBFS against a -60 dBFS room. Speech bounds here come from SUSTAINED
//     ENERGY: 10 ms RMS frames, threshold relative to the LOUDEST frame, 50 ms
//     consecutive required, and the same run reversed for the tail.
//
//  2. LEAD-IN AND TAIL ARE DIFFERENT MEASUREMENTS. Comparing one against the
//     other made a preamp look +4.5, then +0.3, then -0.5 dB. Only the LEAD-IN
//     is used, always, so successive takes are comparable.
//
//  3. A-WEIGHTING DECIDES WHAT IS AUDIBLE. 60% of the noise energy in this room
//     is below 80 Hz, where the ear is 26-40 dB less sensitive: a 120 Hz
//     high-pass removed 5.0 dB of ENERGY and 0.07 dB of AUDIBLE noise. An
//     unweighted figure would call a take with subsonic desk rumble bad and a
//     take with a 1 kHz whirr good, which is backwards.
//
//  4. A SCRIPT THAT PRINTS A VERDICT FROM AN IMPOSSIBLE READING. Two null tests
//     measured LOUDER than the speech they were meant to floor, and the verdict
//     was printed anyway, twice. Here an impossible or unmeasurable reading
//     returns ok:false with a reason, and the caller must handle it.

const FRAME_MS = 10;     // RMS frame for speech detection
const RUN_MS   = 50;     // consecutive frames required to call it speech
// The speech threshold is anchored to BOTH ends, and the floor is the end that
// matters. 2026-11-01, the author: *"it seems sensitive to the overall level of
// my voice"*. He was right, and the fault was here. A threshold of peak-30 dB
// lands only 3 dB above the room floor when the voice is 33 dB above it, so a
// line read a few dB quieter put the threshold INTO the noise, the lead-in
// registered as speech, and the take came back "no pause before speaking". The
// quiet meditative lines of the Tao set are exactly where that would have hit.
//
// So: at least FLOOR_MARGIN_DB above the measured floor, and no higher than
// PEAK_DROP_DB below the loudest frame, whichever of the two is greater.
const PEAK_DROP_DB  = 30; // never require more than this far below the peak
const FLOOR_MARGIN_DB = 12; // but always stay this far clear of the floor
const FLOOR_PCT = 10;     // the floor is the 10th percentile of frame levels

// ── THE TRIGGER IMPULSE IS NEITHER SPEECH NOR ROOM (2026-11-01) ───────────
//
// Hold-to-record puts a mechanical impulse at t=0 of every take: measured at
// +6.2 and +6.6 dB of 20-90 Hz on the two Rode takes, and -40 to -44 dBFS
// broadband over the first 100 ms, against a settled floor of -57 dBFS. It is
// the button, arriving through the desk and through the air.
//
// It has to be excluded from BOTH ends of the measurement. Left in the onset
// search it is detected as the start of speech, which is the fault the author
// found: *"it seems sensitive to the overall level of my voice"* -- at his
// normal level the impulse cleared the threshold by a hair and the reading
// survived by luck; a line read 3 dB quieter and the detector locked onto the
// click and reported "no pause before speaking". Left in the noise window it
// inflates the floor by several dB and understates the signal-to-noise.
//
// It is not room noise and it is not voice, so it is not part of either
// measurement. 300 ms covers the impulse and the settling behind it.
const SKIP_START_MS = 300;
const GUARD_MS = 50;     // kept clear between speech and the noise window
const MIN_NOISE_MS = 200;// shorter than this is not a measurement
const MIN_DYN_DB = 15;   // less range than this is steady noise, not speech
const NFFT = 4096;       // 85 ms at 48 kHz

// ---- A-weighting, IEC 61672-1 ---------------------------------------------
export function aWeightDb(f) {
  if (f <= 0) return -200;
  const f2 = f * f;
  const num = Math.pow(12194, 2) * f2 * f2;
  const den = (f2 + Math.pow(20.6, 2))
            * Math.sqrt((f2 + Math.pow(107.7, 2)) * (f2 + Math.pow(737.9, 2)))
            * (f2 + Math.pow(12194, 2));
  return 20 * Math.log10(num / den) + 2.0;
}

// ---- FFT, iterative radix-2 ------------------------------------------------
// In place on re/im, length must be a power of two.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t;
                 t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k],          ai = im[i + k];
        const br = re[i + k + len / 2], bi = im[i + k + len / 2];
        const tr = br * cr - bi * ci,   ti = br * ci + bi * cr;
        re[i + k] = ar + tr;            im[i + k] = ai + ti;
        re[i + k + len / 2] = ar - tr;  im[i + k + len / 2] = ai - ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// Averaged power spectrum, Hann window, 50% overlap (Welch). Returned
// UNSCALED: every use below is a RATIO of two integrals of this spectrum, so
// the window and length constants cancel and cannot introduce a bias.
function psd(x, rate) {
  const n = Math.min(NFFT, 1 << Math.floor(Math.log2(Math.max(x.length, 2))));
  if (n < 64) return null;
  const win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
  const half = n / 2, acc = new Float64Array(half + 1);
  const hop = n >> 1;
  let segs = 0;
  for (let off = 0; off + n <= x.length; off += hop) {
    const re = new Float64Array(n), im = new Float64Array(n);
    // Remove each segment's mean before windowing, as scipy.welch does by
    // default (detrend='constant'). Without this, DC and the sub-20 Hz drift
    // this room has leak into the lowest bins and shift the result by about
    // half a dB -- enough to stop a reading here matching one taken offline.
    let mean = 0;
    for (let i = 0; i < n; i++) mean += x[off + i];
    mean /= n;
    for (let i = 0; i < n; i++) re[i] = (x[off + i] - mean) * win[i];
    fft(re, im);
    for (let k = 0; k <= half; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      acc[k] += (k === 0 || k === half) ? p : 2 * p;
    }
    segs++;
  }
  if (!segs) return null;
  const freq = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) { acc[k] /= segs; freq[k] = k * rate / n; }
  return { freq, pow: acc };
}

function integrate(freq, pow, lo, hi, weightDb) {
  let s = 0;
  for (let k = 1; k < freq.length; k++) {
    const f0 = freq[k - 1], f1 = freq[k];
    if (f1 < lo || f0 > hi) continue;
    let p0 = pow[k - 1], p1 = pow[k];
    if (weightDb) {
      p0 *= Math.pow(10, aWeightDb(f0) / 10);
      p1 *= Math.pow(10, aWeightDb(f1) / 10);
    }
    s += 0.5 * (p0 + p1) * (f1 - f0);
  }
  return s;
}

function rmsDb(x, a, b) {
  let s = 0; const n = b - a;
  if (n <= 0) return -Infinity;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return 20 * Math.log10(Math.max(Math.sqrt(s / n), 1e-12));
}

// Levels of one window: plain RMS, A-weighted, and the 200-1000 Hz band that
// carried the audible component of the noise in this room. The weighted figures
// are expressed as the RMS plus a ratio of spectrum integrals, so they stay
// correct whatever the absolute scaling of psd().
function levels(x, a, b, rate) {
  const n = b - a;
  if (n < rate * 0.05) return null;
  const seg = x.subarray ? x.subarray(a, b) : x.slice(a, b);
  const rms = rmsDb(x, a, b);
  const S = psd(seg, rate);
  if (!S) return { rms, a: rms, band: rms };
  const tot = integrate(S.freq, S.pow, 0, rate / 2, false);
  if (!(tot > 0)) return { rms, a: rms, band: rms };
  const aw = integrate(S.freq, S.pow, 0, rate / 2, true);
  const bd = integrate(S.freq, S.pow, 200, 1000, false);
  return {
    rms,
    a:    rms + 10 * Math.log10(Math.max(aw, 1e-30) / tot),
    band: rms + 10 * Math.log10(Math.max(bd, 1e-30) / tot),
  };
}

function frameDb(x, rate) {
  const h = Math.max(1, Math.round(rate * FRAME_MS / 1000));
  const nf = Math.floor(x.length / h);
  const out = new Float64Array(nf);
  for (let i = 0; i < nf; i++) out[i] = rmsDb(x, i * h, (i + 1) * h);
  return { db: out, hop: h };
}

// Sustained energy, forward for the onset and reversed for the tail.
function speechBounds(x, rate) {
  const { db, hop } = frameDb(x, rate);
  if (!db.length) return null;
  // Everything below ignores the first SKIP_START_MS -- see the note above.
  const skip = Math.min(db.length - 1,
                        Math.round(SKIP_START_MS / FRAME_MS));
  const usable = db.slice(skip);
  if (usable.length < 4) return null;
  let max = -Infinity;
  for (const v of usable) if (v > max) max = v;
  const asc = Array.from(usable).sort((p, q) => p - q);
  const floor = asc[Math.min(asc.length - 1,
                             Math.floor(asc.length * FLOOR_PCT / 100))];
  const thr = Math.max(floor + FLOOR_MARGIN_DB, max - PEAK_DROP_DB);
  const need = Math.max(1, Math.round(RUN_MS / FRAME_MS));
  let run = 0, start = -1;
  for (let i = skip; i < db.length; i++) {
    run = db[i] >= thr ? run + 1 : 0;
    if (run >= need) { start = i - need + 1; break; }
  }
  if (start < 0) return null;
  run = 0; let end = -1;
  for (let i = db.length - 1; i >= skip; i--) {
    run = db[i] >= thr ? run + 1 : 0;
    if (run >= need) { end = i + need - 1; break; }
  }
  const median = asc[Math.floor(asc.length / 2)];
  return { skip: skip * hop, start: start * hop,
           end: Math.min(x.length, (end + 1) * hop),
           dyn: max - median };
}

// ---- the one entry point ---------------------------------------------------
// pcm: Float32Array of the whole take. Returns ok:false with a reason whenever
// the take cannot be measured, rather than a number that looks like a result.
export function analyseTake(pcm, rate) {
  if (!pcm || pcm.length < rate * 0.3) return { ok: false, reason: 'too short to measure' };
  const b = speechBounds(pcm, rate);
  if (!b) return { ok: false, reason: 'no speech found' };
  if (b.dyn < MIN_DYN_DB) return { ok: false, reason: 'no speech found' };
  const guard = Math.round(rate * GUARD_MS / 1000);
  const headS = b.start / rate;
  const tailS = (pcm.length - b.end) / rate;
  const noiseStart = b.skip;
  const noiseEnd = Math.max(noiseStart, b.start - guard);
  if (noiseEnd - noiseStart < rate * MIN_NOISE_MS / 1000) {
    return { ok: false, reason: 'no pause before speaking', headS, tailS };
  }
  const sp = levels(pcm, b.start, b.end, rate);
  const nz = levels(pcm, noiseStart, noiseEnd, rate);
  if (!sp || !nz) return { ok: false, reason: 'windows too short', headS, tailS };
  // The impossible-sign gate. A lead-in louder than the speech means the
  // detector or the take is wrong, and no SNR from it means anything.
  if (nz.rms >= sp.rms - 3) {
    return { ok: false, reason: 'lead-in as loud as the speech', headS, tailS };
  }
  return {
    ok: true,
    snrA:    sp.a - nz.a,
    snrBand: sp.band - nz.band,
    speechDb: sp.rms, noiseA: nz.a,
    headS, tailS, noiseWindowS: (noiseEnd - noiseStart) / rate,
  };
}
