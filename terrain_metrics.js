// terrain_metrics.js — 2026-11-08. Shared measures for the terrain pages.
//
// ONE COPY, deliberately. The triangle-scan work put a copy of its scan in the
// test page and so spent a round testing the copy instead of the code; and six
// proxy metrics disagreed with each other across that effort. Both of those
// are duplication problems, so every page that measures a heightfield uses
// this file and nothing else.
//
// WHAT HELD UP, AND WHAT DID NOT, from the triangle-scan work:
//
//   USE the DIRECTIONAL POWER SPECTRUM. It compares each direction against the
//   isotropic mean, so it still reads correctly when the structure moves from
//   one direction to another. It is also the only measure in that work that
//   agreed with the author's eye.
//
//   DO NOT use an along/across variogram RATIO ("elongation"). It reads 1.00
//   for a field streaked on both diagonals and 1.00 again for one streaked on
//   the axes, because it is a ratio between two of the directions in question.
//   It hid two false fixes.
//
//   DO NOT use a percentile ratio such as p99.9/median for roughness. It rises
//   when the median falls, so a smoother field scores worse — it inverted and
//   sent a default the wrong way. Absolute means, as shares of the relief.
//
//   CALIBRATE a direction measure on synthetic fields of known stripe angle
//   before believing a label. A wavevector at angle t means crests at t+90 and
//   reading one for the other is easy to do twice. `calibrate()` below does it.
//
//   COUNT at the scale the eye sees. A radius-4, 1.5%-prominence peak test read
//   68 where the eye saw 3,068. Both are reported, named for what they are.

// ── VARIOGRAM ───────────────────────────────────────────────────────────
// For fBm the log-log slope of the variogram against lag is 2H, so this is the
// check on whether a generator delivers the H it was asked for.
export function variogram(h, n, lag) {
  let t = 0, c = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x + lag < n; x++) {
    const d = h[y * n + x] - h[y * n + x + lag]; t += d * d; c++;
  }
  for (let x = 0; x < n; x++) for (let y = 0; y + lag < n; y++) {
    const d = h[y * n + x] - h[(y + lag) * n + x]; t += d * d; c++;
  }
  return c ? t / c : 0;
}
export function hurstFromVariogram(h, n, lo = 2, hi = 32) {
  const pts = [];
  for (let l = lo; l <= hi && l < n; l *= 2) {
    const v = variogram(h, n, l);
    if (v > 0) pts.push([Math.log(l), Math.log(v)]);
  }
  if (pts.length < 3) return { slope: NaN, H: NaN };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const [a, b] of pts) { sx += a; sy += b; sxy += a * b; sxx += a * a; }
  const m = pts.length;
  const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
  return { slope, H: slope / 2 };
}
// ── H FROM THE POWER SPECTRUM ───────────────────────────────────────────
// The variogram is the wrong instrument for checking a spectral generator, and
// measurably so. These fields are PERIODIC — they come out of an inverse FFT —
// and a periodic wrap flattens correlations at large lag, which lowers the
// log-log slope. The effect is systematic rather than noisy. Measured over five
// seeds at three grid sizes, with no cutoff and lags 2..n/8, the variogram H
// came out as (spread only +/-0.01 to 0.04, so this is bias, not scatter):
//
//   asked    0.40   0.50   0.65   0.80   0.90   0.95
//   n=128    0.411  0.484  0.591  0.691  0.750  0.777
//   n=256    0.438  0.516  0.630  0.732  0.789  0.814
//   n=512    0.421  0.501  0.619  0.726  0.787  0.813
//
// — fine at H = 0.5 and reading 0.14 low by H = 0.95. Reporting that against the
// H asked for would convict the generator of an error that belongs to the
// measurement.
//
// So H is also taken from the spectrum, which is what the generator actually
// sets: P ∝ |k|^-(2H+2), so a straight line through log P against log k has
// slope -(2H+2) and H = (-slope - 2)/2. NO WINDOW is applied, and that is the
// point — a Hann taper is what biases a spectral estimate, and a periodic field
// does not need one. Only a mid-range band is fitted, away from the few-bins
// region at low |k| and the Nyquist corner.
export function powerRadial(h, n) {
  // The radix-2 FFT below needs a power of two. Without this guard a grid like
  // 193 (three 64-cell chunks plus a shared edge) returned NaN and the readout
  // printed it, which is exactly the silent failure the standing rule forbids.
  if (n & (n - 1)) throw new Error(
    'powerRadial needs a power-of-two grid; got ' + n +
    '. Crop to one, or use the variogram — which is the right instrument anyway ' +
    'for a field that is not periodic.');
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  let mean = 0;
  for (let i = 0; i < n * n; i++) mean += h[i];
  mean /= n * n;
  for (let i = 0; i < n * n; i++) re[i] = h[i] - mean;
  // rows then columns, no taper
  const rr = new Float64Array(n), ri = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) { rr[x] = re[y * n + x]; ri[x] = im[y * n + x]; }
    fft1d(rr, ri);
    for (let x = 0; x < n; x++) { re[y * n + x] = rr[x]; im[y * n + x] = ri[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { rr[y] = re[y * n + x]; ri[y] = im[y * n + x]; }
    fft1d(rr, ri);
    for (let y = 0; y < n; y++) { re[y * n + x] = rr[y]; im[y * n + x] = ri[y]; }
  }
  const nr = Math.floor(n / 2);
  const sum = new Float64Array(nr + 1), cnt = new Float64Array(nr + 1);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = x <= n / 2 ? x : x - n, fy = y <= n / 2 ? y : y - n;
    const r = Math.round(Math.hypot(fx, fy));
    if (r < 1 || r > nr) continue;
    sum[r] += re[y * n + x] ** 2 + im[y * n + x] ** 2; cnt[r]++;
  }
  const k = [], P = [];
  for (let r = 1; r <= nr; r++) if (cnt[r]) { k.push(r); P.push(sum[r] / cnt[r]); }
  return { k, P };
}
// lo/hi as fractions of Nyquist, so the band scales with the grid.
export function hurstFromSpectrum(h, n, lo = 0.06, hi = 0.5) {
  // ONLY FOR A PERIODIC FIELD. This estimator's advantage is that it applies no
  // taper, which is legitimate only because an inverse-FFT field wraps. On a
  // field that does not wrap — anything from the noise method — a window is
  // needed and the estimate is biased, so use hurstFromVariogram there.
  const { k, P } = powerRadial(h, n);
  const nyq = n / 2;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, m = 0;
  for (let i = 0; i < k.length; i++) {
    const f = k[i] / nyq;
    if (f < lo || f > hi || !(P[i] > 0)) continue;
    const a = Math.log(k[i]), b = Math.log(P[i]);
    sx += a; sy += b; sxy += a * b; sxx += a * a; m++;
  }
  if (m < 4) return { slope: NaN, H: NaN, points: m };
  const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
  return { slope, H: (-slope - 2) / 2, points: m };
}

// The variogram by DIRECTION at one lag, as a second opinion on isotropy that
// does not involve a Fourier transform.
export function variogramByDirection(h, n, lag, bins = 8) {
  const out = [];
  for (let b = 0; b < bins; b++) {
    const a = Math.PI * b / bins;
    const du = Math.round(lag * Math.cos(a)), dv = Math.round(lag * Math.sin(a));
    let t = 0, c = 0;
    for (let y = 0; y < n; y += 2) for (let x = 0; x < n; x += 2) {
      const X = x + du, Y = y + dv;
      if (X < 0 || X >= n || Y < 0 || Y >= n) continue;
      const d = h[y * n + x] - h[Y * n + X]; t += d * d; c++;
    }
    out.push({ deg: Math.round(180 * a / Math.PI), v: c ? t / c : 0 });
  }
  const mean = out.reduce((p, q) => p + q.v, 0) / out.length;
  for (const o of out) o.rel = mean > 0 ? o.v / mean : 0;
  return out;
}

export const EXCESS_NOTE =
  'excess 1.0 = isotropic. One reading at n=256 carries about +/-0.4, so only ' +
  'past ~1.6 is it real; the visibly streaked triangle scan reads 2.9.';

// ── DIRECTIONAL POWER SPECTRUM ──────────────────────────────────────────
function fft1d(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const a = re[i]; re[i] = re[j]; re[j] = a;
                 const b = im[i]; im[i] = im[j]; im[j] = b; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
// Power of an S x S centred window, mean removed and Hann-tapered so the
// window edges do not spray energy across every direction.
function power2d(h, n, S) {
  const o = Math.max(0, Math.floor((n - S) / 2));
  let mean = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) mean += h[(y + o) * n + x + o];
  mean /= S * S;
  const han = i => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (S - 1));
  const re = [], im = [];
  for (let y = 0; y < S; y++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let x = 0; x < S; x++) r[x] = (h[(y + o) * n + x + o] - mean) * han(x) * han(y);
    fft1d(r, m); re.push(r); im.push(m);
  }
  for (let x = 0; x < S; x++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let y = 0; y < S; y++) { r[y] = re[y][x]; m[y] = im[y][x]; }
    fft1d(r, m);
    for (let y = 0; y < S; y++) { re[y][x] = r[y]; im[y][x] = m[y]; }
  }
  const P = [];
  for (let y = 0; y < S; y++) {
    const row = new Float64Array(S);
    for (let x = 0; x < S; x++) row[x] = re[y][x] ** 2 + im[y][x] ** 2;
    P.push(row);
  }
  return P;
}
// Power binned by the direction the STRUCTURE runs, which is the wavevector
// angle plus 90, compared against A MATCHED NULL. Both halves are needed.
//
// The estimator alone is BIASED for a red spectrum, and the bias is large. An
// earlier version reported the spectral method — whose entire claim is isotropy
// — as anisotropic at 1.80 to 2.17. It is not. With |k|^-(H+1) nearly all the
// power sits at low |k|, where a discrete grid holds only a handful of bins per
// direction, so a few noisy bins dominated the average. By radius band, H = 0.8:
//
//   radius 2-4     3 bins per direction   anisotropy 2.71
//   radius 4-8    12                                 1.75
//   radius 8-16   50                                 1.34
//   radius 16-32 201                                 1.21
//   radius 32-64 804                                 1.10
//   radius 64+  3084                                 1.05
//
// Falling monotonically with sample count is the signature of a noisy estimate,
// not of structure.
//
// The fix is NOT to debias the estimator. Dividing each bin by its own ring mean
// was tried and is worse: it reported 1.07 at 83 degrees for EVERY H, the same
// answer white noise gives, and failed three of the four stripe calibrations,
// because the window's leakage cross divided by a near-zero ring mean swamps the
// signal. A measure that returns one figure regardless of its input has simply
// gone blind, which is harder to notice than being wrong.
//
// So the estimator is left as it was — it passes the stripe calibrations — and
// it is given a NULL built from the field itself: a Gaussian field synthesised
// from the measurement's own radial profile, isotropic by construction and put
// through the identical window. That gives the noise floor FOR THIS FIELD'S OWN
// SPECTRUM AND SAMPLING, so a red field is judged against red noise instead of
// against a flat 1.00. `excess` is the honest number: measured / null, where
// 1.0 means indistinguishable from isotropic. See THE NULL below for the two
// nulls that were tried first and why each was wrong.
//
// HOW BIG AN EXCESS IS WORTH BELIEVING. The scatter is in the measurement, not
// the null, so averaging more nulls will not reduce it. At n = 256 with 12 bins,
// seven seeds of isotropic fBm gave a mean of 1.03 over a range 0.74 to 1.60.
// So one reading carries about +/- 0.4 and only an excess past roughly 1.6 means
// anything on its own. For scale, the triangle scan — whose streaking the author
// can see plainly — reads 2.89 at 53 degrees, near the 45-degree diagonal it
// runs along. Show EXCESS_NOTE wherever the figure is displayed.
function binByDirection(P, S, bins) {
  const acc = new Float64Array(bins), cnt = new Float64Array(bins);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x <= S / 2 ? x : x - S, fy = y <= S / 2 ? y : y - S;
    const r = Math.hypot(fx, fy);
    if (r < 3 || r > S / 2 - 2) continue;
    let a = Math.atan2(fy, fx); if (a < 0) a += Math.PI;
    const b = Math.min(bins - 1, Math.floor(a / Math.PI * bins));
    acc[b] += P[y][x]; cnt[b]++;
  }
  const raw = [];
  for (let b = 0; b < bins; b++) raw.push(cnt[b] ? acc[b] / cnt[b] : 0);
  const mean = raw.reduce((p, q) => p + q, 0) / bins || 1;
  const out = [];
  for (let b = 0; b < bins; b++) {
    const wave = 180 * (b + 0.5) / bins;
    out.push({ structureDeg: Math.round((wave + 90) % 180), rel: raw[b] / mean });
  }
  let peak = out[0];
  for (const o of out) if (o.rel > peak.rel) peak = o;
  return { bins: out, peak, anisotropy: peak.rel };
}
// THE NULL. Two earlier attempts were both wrong, and both wrong in the same
// direction — they made the null resemble the measurement — so they are recorded
// here to stop a third:
//
//   SHUFFLING each ring's power among its own cells destroys direction, but it
//   also destroys the correlation the Hann window creates between NEIGHBOURING
//   cells of a ring, which is much of the estimator's variance. The null came
//   out too small: fBm scored 0.81 to 1.69 across seven seeds, and a null some
//   seeds fall BELOW is a null that is too small.
//
//   ROTATING each ring is worse, and subtly so. A rotation PRESERVES the ring's
//   angular profile and merely moves it, and max-over-mean is almost rotation
//   invariant — so the null became a near-copy of the measurement. It read 1.01
//   on isotropic fBm, which looks like success, while the triangle scan's real
//   diagonal streaking fell from 2.17 to 1.47. A null that cannot tell the two
//   apart is not a null.
//
//   PHASE RANDOMISATION, the textbook surrogate, is no use here either: it
//   preserves the power spectrum exactly, angular structure included. It is a
//   null for nonlinearity, not for anisotropy.
//
// What is needed is a field ISOTROPIC BY CONSTRUCTION that keeps the measured
// radial profile and goes through the identical window. So the ring means are
// read off the measurement, a Gaussian field is synthesised with that radial
// spectrum and no preferred direction, and the same estimator is run on it. The
// effective sample count, the redness and the leakage all carry over; only the
// direction is gone.
function ifft2Real(re, im, S) {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];     // conjugate
  const rows = [], irows = [];
  for (let y = 0; y < S; y++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let x = 0; x < S; x++) { r[x] = re[y * S + x]; m[x] = im[y * S + x]; }
    fft1d(r, m); rows.push(r); irows.push(m);
  }
  for (let x = 0; x < S; x++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let y = 0; y < S; y++) { r[y] = rows[y][x]; m[y] = irows[y][x]; }
    fft1d(r, m);
    for (let y = 0; y < S; y++) { rows[y][x] = r[y]; irows[y][x] = m[y]; }
  }
  const out = new Float64Array(S * S), k = 1 / (S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) out[y * S + x] = rows[y][x] * k;
  return out;
}
function isotropicSurrogate(P, S, seed) {
  let a = (seed | 0) || 1;
  const rnd = () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return (a >>> 0) / 4294967296; };
  const gauss = () => {
    const u = Math.max(1e-12, rnd());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };
  // the measured radial profile
  const nr = Math.ceil(Math.hypot(S / 2, S / 2)) + 1;
  const sum = new Float64Array(nr), cnt = new Float64Array(nr);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x <= S / 2 ? x : x - S, fy = y <= S / 2 ? y : y - S;
    const r = Math.round(Math.hypot(fx, fy));
    sum[r] += P[y][x]; cnt[r]++;
  }
  const re = new Float64Array(S * S), im = new Float64Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x <= S / 2 ? x : x - S, fy = y <= S / 2 ? y : y - S;
    const r = Math.round(Math.hypot(fx, fy));
    // amplitude from the ring alone, so no direction can survive
    const amp = (r === 0 || !cnt[r]) ? 0 : Math.sqrt(sum[r] / cnt[r]);
    re[y * S + x] = gauss() * amp; im[y * S + x] = gauss() * amp;
  }
  return ifft2Real(re, im, S);   // real part; its spectrum is the symmetrised one
}
export function directionalPower(h, n, { window = 256, bins = 12, nulls = 8 } = {}) {
  const S = Math.min(window, 1 << Math.floor(Math.log2(n)));
  const P = power2d(h, n, S);
  const m = binByDirection(P, S, bins);
  let floor = 0;
  for (let i = 0; i < nulls; i++) {
    const sur = isotropicSurrogate(P, S, 1234567 + i * 7919);
    floor += binByDirection(power2d(sur, S, S), S, bins).anisotropy;
  }
  floor = nulls > 0 ? floor / nulls : 1;
  return { bins: m.bins, peak: m.peak, anisotropy: m.anisotropy,
           nullAnisotropy: floor, excess: floor > 0 ? m.anisotropy / floor : NaN };
}

// BOTH HALVES. Stripe fields prove the measure FINDS direction; white noise
// proves it reports 1.00 when there is none. Calibrating only on stripes is
// what let a biased version stand, because it passed every stripe test.
export function calibrate(n = 257) {
  const cases = [
    ['sin(2pi u/20): crests along v', (u, v) => Math.sin(2 * Math.PI * u / 20), 90],
    ['sin(2pi v/20): crests along u', (u, v) => Math.sin(2 * Math.PI * v / 20), 0],
    ['sin(2pi (u+v)/20): crests 135', (u, v) => Math.sin(2 * Math.PI * (u + v) / 20), 135],
    ['sin(2pi (u-v)/20): crests 45', (u, v) => Math.sin(2 * Math.PI * (u - v) / 20), 45],
  ];
  // the null case: isotropic by construction, so anisotropy must be near 1
  const out = [];
  {
    let a = 123456789;
    const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff - 0.5; };
    const h = new Float64Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = rnd();
    const an = directionalPower(h, n).anisotropy;
    out.push({ name: 'white noise: no direction at all', got: an.toFixed(2),
               expect: '< 1.25', pass: an < 1.25 });
  }
  return out.concat(cases.map(([name, f, expect]) => {
    const h = new Float64Array(n * n);
    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) h[v * n + u] = f(u, v);
    const got = directionalPower(h, n).peak.structureDeg;
    const err = Math.min(Math.abs(got - expect), 180 - Math.abs(got - expect));
    return { name, got, expect, pass: err <= 15 };
  }));
}

// ── WHAT THE EYE SEES ───────────────────────────────────────────────────
// Both scales, each named for what it is. A radius-4 1.5%-prominence test and
// a radius-1 test disagreed by a factor of 45 on the same field, and reporting
// only the first is what let four rounds of tuning aim at the wrong thing.
export function relief(h) {
  let mn = Infinity, mx = -Infinity;
  for (const v of h) { if (v < mn) mn = v; if (v > mx) mx = v; }
  return { min: mn, max: mx, relief: mx - mn };
}
export function bumps(h, n, rel) {
  let c = 0;
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const z = h[y * n + x];
    const a = h[y * n + x + 1], b = h[y * n + x - 1],
          d = h[(y + 1) * n + x], e = h[(y - 1) * n + x];
    if (z >= a && z >= b && z >= d && z >= e &&
        z > Math.min(a, b, d, e) + 0.0005 * rel) c++;
  }
  return c;
}
export function summits(h, n, R, rel) {
  let c = 0, best = 0;
  for (let y = R; y < n - R; y += 2) for (let x = R; x < n - R; x += 2) {
    const z = h[y * n + x]; let top = true, lo = z;
    for (let dy = -R; dy <= R && top; dy++) for (let dx = -R; dx <= R; dx++) {
      if ((!dx && !dy) || dx * dx + dy * dy > R * R) continue;
      const w = h[(y + dy) * n + x + dx];
      if (w > z) { top = false; break; }
      if (w < lo) lo = w;
    }
    if (top && z - lo > 0.02 * rel) { c++; if (z - lo > best) best = z - lo; }
  }
  return { count: c, best };
}
// ABSOLUTE, as a share of the relief. Never a percentile ratio.
export function curvature(h, n, rel) {
  let t = 0, c = 0, mx = 0;
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const l = Math.abs(h[y*n+x+1] + h[y*n+x-1] + h[(y+1)*n+x] + h[(y-1)*n+x] - 4 * h[y*n+x]);
    t += l; c++; if (l > mx) mx = l;
  }
  return { mean: 100 * (t / c) / rel, max: 100 * mx / rel };
}
export function roughness(h, n, rel) {
  let g = 0, c = 0;
  for (let y = 0; y < n; y++) for (let x = 1; x < n; x++) { g += Math.abs(h[y*n+x] - h[y*n+x-1]); c++; }
  return 100 * (g / c) / rel;
}
