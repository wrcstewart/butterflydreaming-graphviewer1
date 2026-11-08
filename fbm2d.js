// Extracted verbatim from AV/fractal-terrain-methods.md section 11.1 on 2026-11-08.
// Not retyped: lifted programmatically from the document so the two cannot
// drift apart silently. If this file is edited, say so there too.
//
// ONE DEPARTURE FROM THAT SECTION, and it is there because the DOCUMENT ITSELF
// carries two different fbm2d implementations. Section 11.1, extracted here,
// takes (n, H, seed) only. The demo page later in the same document declares
// `fbm2d(n, H, seed, k0 = 0)` with a Butterworth-style high-pass, and section 3
// describes that cutoff — amp x k^4/(k^4 + k0^4) — as one of the method's
// controls. Without it the widest feature is always the whole grid, i.e. a
// single tile-sized hump rather than a range of mountains, so the control is
// not optional in practice. `k0` is therefore added below, copied from the
// document's own demo-page version rather than invented, and defaulting to 0 so
// every existing caller and the section 8 test table are unaffected.
// Worth resolving in the document: the two implementations should be one.
// fbm2d.js — seeded 2D fractional Brownian surface by spectral synthesis.
// No dependencies. Works in the browser (ES module) and Node.
//
//   import { fbm2d } from './fbm2d.js';
//   const { heights, n } = fbm2d({ n: 256, H: 0.8, seed: 42 });
//   // heights is a Float64Array of n*n values, row-major: heights[y*n + x]

// ---- Seeded uniform generator (Mulberry32): same seed -> same stream ----
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0, 1)
  };
}

// ---- Gaussian generator from uniforms (Box–Muller, both outputs used) ----
export function gaussian(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = rand();          // avoid log(0)
    const v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

// ---- In-place iterative radix-2 FFT on (re, im); n must be a power of 2 ----
function fft1d(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {   // bit-reversal permutation
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr;        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// 2D FFT: transform every row, then every column.
function fft2d(re, im, n, inverse) {
  const rr = new Float64Array(n), ri = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) { rr[x] = re[y * n + x]; ri[x] = im[y * n + x]; }
    fft1d(rr, ri, inverse);
    for (let x = 0; x < n; x++) { re[y * n + x] = rr[x]; im[y * n + x] = ri[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { rr[y] = re[y * n + x]; ri[y] = im[y * n + x]; }
    fft1d(rr, ri, inverse);
    for (let y = 0; y < n; y++) { re[y * n + x] = rr[y]; im[y * n + x] = ri[y]; }
  }
}

// Same convention as numpy.fft.fftfreq: 0, 1/n, ..., then negatives.
const freq = (i, n) => (i < n / 2 ? i : i - n) / n;

// ---- The generator ----
// n: grid size (power of 2). H: Hurst exponent in (0,1); surface dimension D = 3 - H.
// seed: integer; same seed -> same terrain. normalise: rescale heights to [0,1].
// k0: soft high-pass cutoff in cycles per sample, suppressing features wider
// than about 1/k0 samples. 0 = off, which is the section 11.1 behaviour.
export function fbm2d({ n = 256, H = 0.8, seed = 1, normalise = true, k0 = 0 } = {}) {
  if (n & (n - 1)) throw new Error('n must be a power of 2');
  const randn = gaussian(mulberry32(seed));
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  const k04 = Math.pow(k0, 4);

  for (let y = 0; y < n; y++) {
    const ky = freq(y, n);
    for (let x = 0; x < n; x++) {
      const kx = freq(x, n);
      const k = Math.hypot(kx, ky);
      // Power spectrum ∝ |k|^-(2H+2)  =>  amplitude ∝ |k|^-(H+1). Drop k = 0 (mean height).
      let amp = k === 0 ? 0 : Math.pow(k, -(H + 1));
      // Butterworth-style high-pass, from the document's demo-page fbm2d.
      if (k0 > 0 && k > 0) { const k4 = Math.pow(k, 4); amp *= k4 / (k4 + k04); }
      // Draw both Gaussians even when amp = 0, so the stream order is fixed.
      const g1 = randn(), g2 = randn();
      re[y * n + x] = g1 * amp;
      im[y * n + x] = g2 * amp;
    }
  }

  fft2d(re, im, n, true);                // inverse FFT
  const heights = re;                    // real part is the Gaussian fBm surface

  if (normalise) {
    let lo = Infinity, hi = -Infinity;
    for (const v of heights) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = hi - lo || 1;
    for (let i = 0; i < heights.length; i++) heights[i] = (heights[i] - lo) / span;
  }
  return { heights, n };
}

// Helper: one horizontal slice (row y) — itself a 1D fBm ridge profile, handy for ink silhouettes.
export function profile({ heights, n }, y) {
  return heights.slice(y * n, (y + 1) * n);
}
