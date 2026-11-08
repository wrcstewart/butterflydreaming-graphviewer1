// noise_variants.js — 2026-11-08. Three ways to break the uniformity of the
// chunked-noise method, kept OUT of noise.js so that file stays exactly as it
// was extracted from AV/fractal-terrain-methods.md §11.3.
//
// THE PROBLEM, MEASURED. The author: *"noise with different variation on u v
// could be superimposed to break up the noise uniformity of the peaks"*. He is
// describing a real and well-known weakness. Plain octave-sum fBm is
// statistically HOMOGENEOUS: its statistics are the same everywhere, so every
// patch is equally rough and there is no distinction between a plain and a
// range. Measured as the coefficient of variation of local relief over 16-cell
// windows — low cv meaning every patch alike:
//
//     H = 0.50   cv 0.20
//     H = 0.75   cv 0.27
//     H = 0.90   cv 0.32
//
// Real terrain is nothing like that uniform. Three mechanisms below attack it,
// and they are genuinely different — worth knowing which one answers which
// complaint rather than reaching for whichever is nearest:
//
//   STRETCH breaks ISOTROPY. Scaling u and v differently elongates every
//   feature along one axis, giving grain or lineation — ridge-and-valley
//   country rather than a field of lumps. This is the one closest to the
//   author's literal words. Note it deliberately makes the field anisotropic,
//   so the directional measure on the page SHOULD report it; that is the
//   control working, not a fault. It is the one thing in this series where
//   anisotropy is wanted.
//
//   WARP breaks the uniformity of PLACEMENT. The sample position is displaced
//   by a second, slower noise field before the octaves are summed, so ridges
//   become sinuous and peak spacing becomes uneven instead of evenly scattered.
//   Standard domain warping, and §9 of the document suggests it.
//
//   HETERO breaks the uniformity of ROUGHNESS, and is the direct answer to
//   "uniformity of the peaks". Each octave's amplitude is modulated by the
//   previous octave's value, so fine detail appears where the ground is already
//   high and dies away in the lows: rough peaks above smooth plains. This is
//   Musgrave's multifractal idea in its simplest form.
//
// EVERY ONE OF THEM IS STILL A PURE FUNCTION of world position and seed, which
// is the property the whole method is for. So chunks still agree exactly along
// shared edges, and the page's edge test still reads 0 with all three engaged.
// That is checked rather than assumed — a variant that broke it would destroy
// the only reason to prefer this method.
//
// WITH EVERY CONTROL OFF THIS IS BIT-IDENTICAL TO noise.js. That is deliberate
// and tested: the baseline has to stay the document's own, or the figures
// measured against it stop meaning anything.

import { makeSimplex } from './noise.js';

export function makeVariedTerrain({
  seed = 42, H = 0.75, widestKm = 4, octaves = 7,
  stretchU = 1, stretchV = 1,          // 1,1 = isotropic
  warp = 0, warpKm = 8,                // warp in km of displacement
  hetero = 0,                          // 0 = homogeneous, 1 = fully modulated
  pinNorm = false,                     // see below
  softClamp = false,                   // see THE FLAT PLATEAU below
  // ── THE SLOW LAYER, see TWO LAYERS below. Off at baseShare 0, coverage 1.
  baseKm = 40,                         // wavelength of the gentle swell
  baseShare = 0,                       // its share of the amplitude
  coverage = 1,                        // fraction of ground that is mountainous
  foothills = 0.3,                     // width of the belt's transition
} = {}) {
  const simplex2 = makeSimplex(seed);
  // The slow field gets its own lattice, so it is independent of the mountains
  // rather than a rescaling of them.
  const slow = makeSimplex((seed ^ 0x27d4eb2f) >>> 0);
  // Separate lattices for the two warp components, or x and z would be
  // displaced identically and the warp would only slide the field diagonally.
  const warpX = warp > 0 ? makeSimplex((seed ^ 0x9e3779b9) >>> 0) : null;
  const warpZ = warp > 0 ? makeSimplex((seed ^ 0x85ebca6b) >>> 0) : null;

  const rot = Array.from({ length: octaves }, (_, o) => {
    const a = o * 0.83;
    return [Math.cos(a), Math.sin(a), o * 17.3, o * -9.1];
  });
  const gain = Math.pow(2, -H);

  // PINNING THE NORM is what makes zoom-by-adding-octaves exact. noise.js
  // divides by the sum of gains over the octaves it actually evaluates, so
  // adding octaves to gain detail also changes the divisor and the coarse shape
  // shifts slightly — measured, a mean change of 0.004 to 0.006 on a [0,1]
  // field, about half a percent. Summing the gains over a fixed large budget
  // instead makes the divisor independent of the octave count, so octaves can
  // be added or dropped per chunk for level of detail and the mountain does not
  // move at all. It is OFF by default only because it changes the amplitude by
  // about 2.6% and the baseline must stay identical to the document's.
  const NORM_OCTAVES = pinNorm ? 24 : octaves;
  let norm = 0;
  for (let o = 0; o < NORM_OCTAVES; o++) norm += Math.pow(gain, o);

  const f0 = 1 / widestKm;
  const su = stretchU > 0 ? stretchU : 1, sv = stretchV > 0 ? stretchV : 1;
  // THE HETERO WEIGHT MUST AVERAGE 1, and this divisor is why.
  //
  // The author, on the first version: *"the slider hetero seems to make it
  // smoother"*. He was right and the measurement agrees — mean |laplacian| fell
  // 7.24 to 4.48 and roughness 3.55 to 2.40 across the slider's range. The
  // weight 1 - h + h*(0.5 + 0.5n) has expectation 1 - h/2, because the noise is
  // zero-mean, so at h = 1 every octave after the first was damped to half
  // amplitude. The control was deleting detail, not moving it.
  //
  // Worse, my own metric hid it: cv = sd/mean RISES WHEN THE MEAN FALLS, so a
  // uniformly smoother field scored as more heterogeneous. That is the same
  // failure as the p99.9/median curvature ratio that inverted earlier in this
  // work, and it is written as a rule in terrain_metrics.js — which I then
  // walked into anyway. An absolute measure is reported alongside it now.
  //
  // Dividing by 1 - h/2 restores unit mean weight. At h = 1 the weight runs
  // 0 to 2 about a mean of 1: double the detail on the highs, none in the lows,
  // and the same total as before.
  const wNorm = hetero > 0 ? 1 / (1 - hetero / 2) : 1;

  // ── TWO LAYERS, AND A MOUNTAIN BELT ───────────────────────────────────
  // The author: *"What it really needs is at least two noise layers - the second
  // is as now but the first would be of lower amplitude and more imporatntly
  // more a slow gentle rolling ... The slow varying could carry on past the
  // mountains proper ie foothills"*.
  //
  // The scale question first, since it is what makes this necessary. f0 is
  // 1/widestKm with coordinates in km, so the LOWEST octave's wavelength is
  // exactly widestKm and the finest is widestKm/2^(octaves-1). What governs the
  // look is the RATIO of widestKm to the ground in view: at the defaults, 4 km
  // features across 8 km of ground means two big features per side, so nothing
  // larger than a hill organises the scene. Simply raising widestKm does not fix
  // it — that makes the whole surface coarser, and past about 16 km it hits the
  // clamp and shears flat.
  //
  // ONE SLOW FIELD, USED TWICE, which is the part worth keeping. It is both the
  // gentle swell and the mask that decides where mountains grow:
  //
  //   height = baseShare·slow + (1 - baseShare)·mask(slow)·mountains
  //
  // so ranges stand on the high ground of the swell, their flanks carry
  // low-amplitude mountains — which is what a foothill is — and the swell keeps
  // rolling across the lows where no mountains grow at all. That is also how
  // real ranges sit: on uplifted ground, not scattered at random. Tying the two
  // together costs one control instead of two lattices and gets the geology
  // right for free.
  //
  // `coverage` is the share of ground that is mountainous and `foothills` the
  // width of the transition into it; wide transitions give long gentle
  // approaches, narrow ones give a wall. Noise is bell-shaped rather than
  // uniform, so coverage is a dial and not a guarantee — the page MEASURES the
  // fraction that came out and reports it rather than restating the asked-for
  // number.
  //
  // At baseShare 0 and coverage 1 the mask is exactly 1 and the whole thing
  // collapses to the original formula, bit-identical. Checked.
  const BASE_OCT = 2;                  // a two-octave swell, less regular than one
  const beltOn = coverage < 0.999;
  function slowAt(xKm, zKm) {
    // Roughly [-1, 1]. Two octaves, so the swell itself is not a plain sine.
    let v = 0, f = 1 / Math.max(0.001, baseKm), a = 1, nm = 0;
    for (let o = 0; o < BASE_OCT; o++) {
      v += a * slow(xKm * f + o * 7.1, zKm * f - o * 4.3);
      nm += a; f *= 2; a *= 0.5;
    }
    return v / (nm || 1);
  }
  function beltMask(s01) {
    if (!beltOn) return 1;
    const w = Math.max(1e-6, foothills);
    let u = (s01 - (1 - coverage)) / w + 0.5;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return u * u * (3 - 2 * u);        // smoothstep: flat at both ends, no crease
  }

  // ── THE FLAT PLATEAU ──────────────────────────────────────────────────
  // The author: *"Theres a completely flat large palteau in one corner - whats
  // that about?"*. It is the HARD CLAMP that noise.js ends with,
  // min(1, max(0, 0.5 + 0.85*sum/norm)), and it is much worse at some settings
  // than the default figures suggested. Located by flood-filling for the largest
  // connected region at a rail:
  //
  //   widest  octaves   clamped   biggest single plateau
  //     4 km      7       0.53%    0.19% of the grid    (unnoticeable)
  //     8 km      3       5.17%    1.11%
  //    16 km      3       6.49%    5.30% of the grid, in a CORNER
  //
  // The mechanism: when the widest feature is comparable to the view, one broad
  // swell carries most of the amplitude and overshoots the ceiling, so min()
  // shears its entire top off and leaves a mesa. Few octaves make it worse,
  // because less of the budget goes to detail that would break the top up. At
  // 32 km the view is under one wavelength, the sum never reaches the rails, and
  // the relief drops to 0.85 instead — no clamping at all.
  //
  // A SOFT CEILING fixes it without touching the statistics in the middle. Only
  // the outer `knee` of the range is compressed, through t/(1+t), which
  // approaches the rail asymptotically and NEVER has zero gradient — so the top
  // of a swell stays curved however far it overshoots. The derivative is 1 at
  // the knee, so there is no crease where it takes over, and ordering is
  // preserved everywhere, which a clamp destroys.
  //
  // Off by default only because the baseline has to stay bit-identical to
  // noise.js. The page offers it and its readout names it when plateaus appear.
  const KNEE = 0.12;
  function squash(v) {
    if (!softClamp) return Math.min(1, Math.max(0, v));
    if (v > 1 - KNEE) {
      const t = (v - (1 - KNEE)) / KNEE;
      return 1 - KNEE + KNEE * t / (1 + t);
    }
    if (v < KNEE) {
      const t = (KNEE - v) / KNEE;
      return KNEE - KNEE * t / (1 + t);
    }
    return v;
  }

  function height01(xKm, zKm) {
    let x = xKm, z = zKm;
    if (warp > 0) {
      // Displace the sample point. Slower than the terrain itself, or it would
      // read as noise on noise rather than as bent ground.
      const fw = 1 / warpKm;
      x += warp * warpX(xKm * fw, zKm * fw);
      z += warp * warpZ(xKm * fw + 31.7, zKm * fw - 12.4);
    }
    // Stretch in WORLD space, before the per-octave rotation, so the grain runs
    // in one consistent direction. Stretching after the rotation would turn the
    // grain a different way in every octave and cancel out to nothing.
    const xs = x / su, zs = z / sv;
    let sum = 0, f = f0, a = 1, w = 1, amp = 0;
    for (let o = 0; o < octaves; o++) {
      const [c, s, ox, oy] = rot[o];
      const n = simplex2((xs * c - zs * s) * f + ox, (xs * s + zs * c) * f + oy);
      sum += a * w * n;
      amp += a;                            // amplitude available so far
      if (hetero > 0) {
        // MODULATE ON ACCUMULATED ELEVATION, not on the previous octave's
        // sample. Both were built and measured: modulating on the last octave
        // is a one-octave lookahead, which is noise-scale and incoherent, and
        // gave only +11% heterogeneity. The running sum is the terrain's own
        // elevation at this point, so roughness ends up tied to height — rough
        // peaks over smooth plains, which is what was actually asked for — and
        // it measured +33% at the same roughness. Musgrave's hybrid
        // multifractal works this way for the same reason.
        const elev = 0.5 + 0.5 * sum / (amp || 1);
        w = wNorm * Math.max(0, 1 - hetero + hetero * elev);
      }
      f *= 2; a *= gain;
    }
    // NOTE THE EXPRESSION, not just the value: the original is
    // `0.85 * sum / norm`, which associates as `(0.85 * sum) / norm`. Writing
    // `0.85 * (sum / norm)` instead changes the rounding and broke the
    // bit-identity claim by exactly one ulp, 2.2e-16. Kept verbatim on the
    // path that has to match.
    if (baseShare <= 0 && !beltOn) return squash(0.5 + 0.85 * sum / norm);
    const mtn = sum / norm;
    // The slow layer is sampled at the UNWARPED, UNSTRETCHED position, so the
    // regional swell is not dragged about by controls meant for the mountains.
    // Named slowV, not sv: `sv` is already the stretchV alias in this scope, and
    // shadowing it threw a TDZ error that the module syntax check passed clean —
    // two sites can be in the same function and not be the same binding.
    const slowV = slowAt(xKm, zKm);
    const s01 = 0.5 + 0.5 * slowV;
    return squash(0.5 + 0.85 *
      (baseShare * slowV + (1 - baseShare) * beltMask(s01) * mtn));
  }

  function chunk(cx, cz, { chunkKm = 4, res = 64 } = {}) {
    const n = res + 1, step = chunkKm / res, out = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)
      out[j * n + i] = height01(cx * chunkKm + i * step, cz * chunkKm + j * step);
    return out;
  }

  return { height01, chunk, finestKm: widestKm / Math.pow(2, octaves - 1) };
}

// The uniformity measure the mechanisms are judged by: the coefficient of
// variation of local relief. Low means every patch is equally rough, which is
// the complaint; higher means plains and ranges have become distinguishable.
// How much of the ground is actually MOUNTAINOUS, as against gentle. Measured
// rather than restated from the coverage dial, because simplex noise is
// bell-shaped and not uniform, so asking for 45% does not deliver 45%. A window
// counts as mountainous when its local relief exceeds a quarter of the biggest
// window's — a threshold inside the field, so it does not need calibrating
// against an absolute height.
export function mountainousFraction(h, n, W = 12) {
  const rel = [];
  for (let by = 0; by + W <= n; by += W) for (let bx = 0; bx + W <= n; bx += W) {
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const v = h[(by + y) * n + bx + x];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    rel.push(hi - lo);
  }
  if (!rel.length) return 0;
  const top = Math.max(...rel);
  if (!(top > 0)) return 0;
  return rel.filter(r => r > 0.25 * top).length / rel.length;
}

// THE LARGEST CONNECTED FLAT REGION, as a share of the grid. A total percentage
// of pinned cells does not describe what the eye sees: 0.53% scattered in
// specks is invisible, while 5.3% gathered into one mesa in a corner is the
// first thing noticed. This reports the blob, not the tally.
export function largestPlateau(h, n) {
  let lo = Infinity, hi = -Infinity;
  for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const rel = (hi - lo) || 1, tol = 0.002 * rel;
  const flat = new Uint8Array(n * n);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const g = Math.max(Math.abs(h[j * n + i + 1] - h[j * n + i - 1]),
                       Math.abs(h[(j + 1) * n + i] - h[(j - 1) * n + i])) / 2;
    if (g < tol) flat[j * n + i] = 1;
  }
  const seen = new Uint8Array(n * n);
  let best = 0, bv = 0;
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    if (!flat[j * n + i] || seen[j * n + i]) continue;
    let c = 0, sv = 0;
    const st = [[i, j]];
    seen[j * n + i] = 1;
    while (st.length) {
      const [x, y] = st.pop(); c++; sv += h[y * n + x];
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + a, v = y + b;
        if (u < 1 || v < 1 || u >= n - 1 || v >= n - 1) continue;
        if (seen[v * n + u] || !flat[v * n + u]) continue;
        seen[v * n + u] = 1; st.push([u, v]);
      }
    }
    if (c > best) { best = c; bv = sv / c; }
  }
  const atRail = bv <= lo + 1e-9 || bv >= hi - 1e-9;
  return { cells: best, pct: 100 * best / (n * n), value: bv, atRail };
}

// ABSOLUTE heterogeneity: the spread of local relief as a share of the GLOBAL
// relief. Unlike cv = sd/mean, its denominator is not a statistic the numerator
// can drag down, so a uniformly smoother field does not score as a more varied
// one. Report this one; cv is kept only because it is the familiar figure.
export function heterogeneity(h, n, W = 16) {
  const rel = [];
  let glo = Infinity, ghi = -Infinity;
  for (const v of h) { if (v < glo) glo = v; if (v > ghi) ghi = v; }
  const global = (ghi - glo) || 1;
  for (let by = 0; by + W <= n; by += W) for (let bx = 0; bx + W <= n; bx += W) {
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const v = h[(by + y) * n + bx + x];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    rel.push(hi - lo);
  }
  if (!rel.length) return { spread: 0, mean: 0 };
  const m = rel.reduce((p, q) => p + q, 0) / rel.length;
  const sd = Math.sqrt(rel.reduce((p, q) => p + (q - m) ** 2, 0) / rel.length);
  return { spread: sd / global, mean: m / global };
}
export function reliefVariation(h, n, W = 16) {
  const rel = [];
  for (let by = 0; by + W <= n; by += W) for (let bx = 0; bx + W <= n; bx += W) {
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const v = h[(by + y) * n + bx + x];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    rel.push(hi - lo);
  }
  if (!rel.length) return { mean: 0, cv: 0 };
  const m = rel.reduce((p, q) => p + q, 0) / rel.length;
  const sd = Math.sqrt(rel.reduce((p, q) => p + (q - m) ** 2, 0) / rel.length);
  return { mean: m, cv: m > 0 ? sd / m : 0 };
}
