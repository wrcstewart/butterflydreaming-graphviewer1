// trianglescan_scan.js — 2026-11-07. THE scan, in one place.
//
// WHY THIS FILE EXISTS. The author: *"The reason for doing this is to test your
// code so we need to simulate it hence although serpentine option shouldnt
// matter we need to test it - so put it back using same scan code ideally as
// when we do the fractal!"*
//
// He is right twice. First, I had removed the serpentine control from the
// constant-delta page on the ground that it provably cannot matter — but
// "provably cannot matter" is the hypothesis a test exists to check, not
// grounds for deleting the check. Second and worse, I had given the test page
// its own COPY of the scan, so it was exercising a duplicate rather than the
// code the fractal page runs. A test against a copy tests the copy. This repo
// already carries that scar: two copies of music_module.html that diverged.
//
// So both pages now load this file and neither contains a scan of its own:
//   trianglescan_terrain.html   the fractal version
//   constdelta_terrain.html     the constant-delta test
//
// ONE FUNCTION SERVES BOTH, with no special case. A constant delta is just a
// sequence of length 1 holding the value 1: `wrap` indexes modulo the length,
// so it yields 1 for ever. The test therefore goes down exactly the same path
// as the fractal, which is the whole point.
//
// Loaded as a plain script rather than a module, matching how the pages load
// three.js and lindenmayer, and referenced ROOT-RELATIVELY — a bare path
// resolves against the page, which is what broke the voice files on /n/ links.
(function (root) {
  'use strict';

  // Reciprocal distance: the orthogonal neighbours are 1 away, the diagonal
  // one sqrt(2). These are the only constants in the construction.
  const W_ORTH = 1, W_DIAG = 1 / Math.SQRT2;
  const W_SUM = 2 * W_ORTH + W_DIAG;                 // 2.7071
  const LAG_INTERIOR = 1 + W_DIAG / W_SUM;           // 1.26120
  const SLOPE_INTERIOR = 1 / LAG_INTERIOR;           // 0.792893
  const TROUGH_FRACTION = 1 - SLOPE_INTERIOR;        // 0.207107 = (sqrt(2)-1)/2

  // A u,v grid filled in anti-diagonal order from the origin. Each cell's base
  // height is the reciprocal-distance weighted average of its three already
  // established neighbours — (u-1,v) and (u,v-1) at weight 1, (u-1,v-1) at
  // 1/sqrt(2) — and the sequence supplies a dH on top. The three neighbours
  // have u+v sums of k-1, k-1 and k-2, all strictly interior, so nothing is
  // read before it is written; on the axes only one neighbour exists and the
  // weight renormalises to 1, making each axis a pure 1D walk of the sequence.
  //
  // SERPENTINE is the author's design. Odd k runs from the u axis to the v
  // axis, even k back again. Symbols are consumed in traversal order, so a
  // raster scan would put the last cell of line k and the first of line k+1 at
  // opposite corners — consecutive symbols landing far apart, a seam down one
  // edge. The alternation removes it, for the same reason boustrophedon beats
  // raster in space-filling constructions.
  function scanField(N, seq, h0, dh, serpentine, markN, compensate) {
    const h = new Float64Array(N * N);
    const ix = (u, v) => v * N + u;
    // The first `markN` cells in PLOT ORDER, so the origin and the opening
    // scan lines can be found on the surface. Recorded here because this is
    // the only place that knows the traversal.
    const marks = [];
    h[ix(0, 0)] = h0;
    if (markN > 0) marks.push(ix(0, 0));
    let used = 0;
    const maxK = 2 * (N - 1);
    const wrap = i => seq[i % seq.length];
    for (let k = 1; k <= maxK; k++) {
      const uLo = Math.max(0, k - (N - 1)), uHi = Math.min(k, N - 1);
      const fromU = serpentine ? (k % 2 === 1) : true;   // odd k: u axis -> v axis
      const list = [];
      if (fromU) for (let u = uHi; u >= uLo; u--) list.push(u);
      else       for (let u = uLo; u <= uHi; u++) list.push(u);
      for (const u of list) {
        const v = k - u;
        let num = 0, den = 0, lagNum = 0;
        if (u > 0)          { num += W_ORTH * h[ix(u-1, v)];   den += W_ORTH; lagNum += W_ORTH * 1; }
        if (v > 0)          { num += W_ORTH * h[ix(u, v-1)];   den += W_ORTH; lagNum += W_ORTH * 1; }
        if (u > 0 && v > 0) { num += W_DIAG * h[ix(u-1, v-1)]; den += W_DIAG; lagNum += W_DIAG * 2; }
        const base = den > 0 ? num / den : h0;
        // ── LAG COMPENSATION ──────────────────────────────────────────
        // Found by the constant-delta test. Each neighbour sits a number of
        // diagonals back: 1 for the orthogonal pair, 2 for (u-1,v-1). So a
        // cell's base lags the current diagonal by SUM(w_i * lag_i) — interior
        // 1 + w_diag = 1.26120, an axis cell exactly 1. Hence with a constant
        // delta the axes rise at delta per diagonal and the interior at
        // 0.792893, and the gap is a valley along the main diagonal worth
        // (sqrt(2)-1)/2 = 20.7% of the edge rise at every scale. Multiplying
        // delta by the cell's own lag levels it exactly.
        const lag = den > 0 ? lagNum / den : 1;
        h[ix(u, v)] = base + wrap(used++) * dh * (compensate ? lag : 1);
        if (marks.length < markN) marks.push(ix(u, v));
      }
    }
    return { h, used, marks };
  }

  // ── THE SELF-TESTS ──────────────────────────────────────────────────────
  // Properties that should hold by construction, asserted rather than assumed.
  // Run from the constant-delta page, which exists to test this code.
  function selfTest(N) {
    const out = [];
    const constSeq = [1];                       // length 1: wraps to a constant
    const d = 2;

    // 1. With a constant delta the traversal order within a diagonal cannot
    //    matter, because every cell gets the same dH. This is the test the
    //    author asked for, and the one I wrongly deleted the control for.
    const a = scanField(N, constSeq, 0, d, true, 0, false);
    const b = scanField(N, constSeq, 0, d, false, 0, false);
    let maxDiff = 0;
    for (let i = 0; i < a.h.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a.h[i] - b.h[i]));
    out.push({ name: 'serpentine and raster agree under a constant delta',
               pass: maxDiff === 0, detail: 'largest difference ' + maxDiff.toExponential(2) + ' m' });

    // 2. The axes must rise at exactly delta per diagonal: one neighbour, so
    //    weight 1 and lag 1.
    const fit = pts => {
      let sx = 0, sy = 0, sxy = 0, sxx = 0;
      for (const [x, y] of pts) { sx += x; sy += y; sxy += x * y; sxx += x * x; }
      return (pts.length * sxy - sx * sy) / (pts.length * sxx - sx * sx);
    };
    const eU = [], eV = [], diag = [];
    for (let k = 2; k < N - 2; k++) {
      eU.push([k, a.h[0 * N + k]]);
      eV.push([k, a.h[k * N + 0]]);
      if (k % 2 === 0) diag.push([k, a.h[(k / 2) * N + (k / 2)]]);
    }
    const su = fit(eU) / d, sv = fit(eV) / d;
    out.push({ name: 'both axes rise at exactly delta per diagonal',
               pass: Math.abs(su - 1) < 1e-9 && Math.abs(sv - 1) < 1e-9,
               detail: 'u axis ' + su.toFixed(9) + ', v axis ' + sv.toFixed(9) });

    // 3. The axes must agree with each other: the stencil is symmetric in u
    //    and v, so the field must be symmetric about the main diagonal.
    let maxAsym = 0;
    for (let v = 0; v < N; v++) for (let u = 0; u < N; u++)
      maxAsym = Math.max(maxAsym, Math.abs(a.h[v * N + u] - a.h[u * N + v]));
    out.push({ name: 'field is symmetric about u = v', pass: maxAsym === 0,
               detail: 'largest asymmetry ' + maxAsym.toExponential(2) + ' m' });

    // 4. The interior slope must CONVERGE to the closed form as the window
    //    moves outward. The closed form assumes no edge influence, and the
    //    axes — which run faster — bleed their surplus inward, so near the
    //    origin the fitted slope sits ABOVE it and settles as the edges
    //    recede. Testing convergence rather than one window is the honest
    //    form: a single fit over k > 0.8N reads 0.797072, and loosening the
    //    tolerance until that passed would have tested nothing.
    //
    //    AND A CORRECTION TO MY OWN EARLIER CLAIM. I reported that the scan
    //    "reproduces the closed form to six decimal places in the far field".
    //    It does not, and that measurement was faulty: the window started at
    //    an ODD k and took m = k/2, and since m*N+m is m*(N+1) with N+1 even,
    //    a half-integer m still yields a VALID INTEGER INDEX — for a different
    //    cell. It was sampling (243,114) and never touched the diagonal. The
    //    real far-field slopes are 0.798681, 0.796964 and 0.795767 at N = 129,
    //    257 and 513: converging on 0.792893, roughly as 1/sqrt(N), and still
    //    0.4% short at 513. A finite grid does not reach the asymptote, so the
    //    tolerance here is 1% and the convergence ordering carries the test.
    //    The exact properties below — the axes, the symmetry, serpentine
    //    versus raster, the compensation — are all still exact to the last
    //    bit, and those were never in doubt.
    const kMax = diag.length ? diag[diag.length - 1][0] : 0;
    const win = (lo, hi) => fit(diag.filter(p => p[0] >= lo && p[0] <= hi)) / d;
    const near = win(2, 0.2 * kMax), mid = win(0.4 * kMax, 0.6 * kMax),
          far = win(0.9 * kMax, kMax);
    out.push({ name: 'interior slope converges to 1/(1+w_diag) as the edges recede',
               pass: near > mid && mid >= far && far > SLOPE_INTERIOR &&
                     Math.abs(far - SLOPE_INTERIOR) < 1e-2,
               detail: 'near ' + near.toFixed(6) + ' > mid ' + mid.toFixed(6) +
                       ' > far ' + far.toFixed(6) + ', closed form ' +
                       SLOPE_INTERIOR.toFixed(6) });

    // 5. Lag compensation must level it: every cell at delta per diagonal.
    const c = scanField(N, constSeq, 0, d, true, 0, true);
    const cd = [];
    for (let k = 2; k < N - 2; k += 2) cd.push([k, c.h[(k / 2) * N + (k / 2)]]);
    const sc = fit(cd) / d;
    out.push({ name: 'lag compensation levels the diagonal valley',
               pass: Math.abs(sc - 1) < 1e-9, detail: 'diagonal slope ' + sc.toFixed(9) });

    // 6. Every cell must be written, and exactly once each.
    const n = N * N;
    out.push({ name: 'every cell is visited exactly once',
               pass: a.used === n - 1,
               detail: a.used.toLocaleString() + ' deltas applied for ' +
                       n.toLocaleString() + ' cells, the origin taking the start height' });
    return out;
  }

  // ── THE u,v GRID LINES ──────────────────────────────────────────────────
  // The author asked for a thin white line marking u=9, v=9, u=30 and v=30 —
  // 9 being the edge of the 10x10 table he had just worked through, and 30 a
  // larger reference.
  //
  // WHITE ALONE WOULD BE A BROKEN FEATURE. Measured, the four scheme surfaces
  // have luminances 0.609 (grey), 0.962 (white on blue), 0.954 (white on olive)
  // and 0.299 (sea): white would vanish on three of the four, and on the
  // elevation spectrum it would vanish at the pale blue top of the ramp. So the
  // line is decided PER CELL against whatever colour is already there — white
  // on dark ground, near-black on light. It is white wherever white can be
  // seen, which is what was asked for, and visible everywhere else, which is
  // what was meant.
  const GRID_LINES = [9, 30];
  const WHITE = [1, 1, 1], NEARBLACK = [0.06, 0.06, 0.06];
  function lineColourOver(r, g, b) {
    const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    return L < 0.5 ? WHITE : NEARBLACK;
  }
  // Stamps the lines into a three-component colour attribute. Called last, so
  // the lines sit on top of everything else.
  function stampGridLines(attr, N) {
    const put = (u, v) => {
      if (u < 0 || u >= N || v < 0 || v >= N) return;
      const i = v * N + u;
      if (i < 0 || i >= attr.count) return;
      const c = lineColourOver(attr.getX(i), attr.getY(i), attr.getZ(i));
      attr.setXYZ(i, c[0], c[1], c[2]);
    };
    let drawn = 0;
    for (const n of GRID_LINES) {
      if (n >= N) continue;                 // the grid is smaller than the line
      for (let t = 0; t < N; t++) { put(n, t); put(t, n); }
      drawn++;
    }
    return drawn;
  }

  root.TriangleScan = {
    GRID_LINES, lineColourOver, stampGridLines,
    scanField, selfTest,
    W_ORTH, W_DIAG, W_SUM, LAG_INTERIOR, SLOPE_INTERIOR, TROUGH_FRACTION,
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).TriangleScan;
}
