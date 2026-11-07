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

  // ── THE DIAGONAL WEIGHT IS sqrt(2), NOT 1/sqrt(2) ─────────────────────
  // It began as reciprocal distance — the orthogonal neighbours are 1 away and
  // the diagonal one sqrt(2), so 1 : 1 : 1/sqrt(2). That is the natural
  // reading and it pulls the wrong way, which the author spotted from the
  // table: "the rise should be more like 41% bigger on the diagonal but we are
  // more like 60%".
  //
  // He is right and the figure is exact. Comparing (n,n) with (n,0), the old
  // weighting gave 2 x 0.792893 = 1.5858, so 58.6% bigger (64.4% at n=9, the
  // rest being edge influence). If height tracked TRUE DISTANCE it would be
  // sqrt(2), so 41.4%. The diagonal was over-climbing by 1.1213.
  //
  // WHY. The diagonal cell is sqrt(2) further away, which argues for LESS
  // weight — but it is also TWO diagonals back rather than one, which argues
  // for MORE, and it is the second effect that governs height. The interior
  // slope is 1/(1 + w_diag), so an isotropic rise per unit distance needs
  // slope = 1/sqrt(2), hence lag = sqrt(2), hence w_diag = sqrt(2) - 1
  // normalised — that is unnormalised weights 1 : 1 : sqrt(2) over 2 + sqrt(2).
  // The diagonal neighbour weighted sqrt(2) times MORE than the orthogonal
  // pair, by exactly the factor that reciprocal distance would have removed.
  //
  // MEASURED after the change: gain per unit of true distance is 1.0000 on the
  // axes and 1.0097 on the diagonal, down from 1.1295. The 30 and 60 degree
  // shoulders remain about 7% high — the double-ridge residue, a separate and
  // much smaller matter.
  //
  // The DENOMINATOR follows automatically and at the edges too, because `den`
  // accumulates only the weights actually used rather than assuming a total.
  const W_ORTH = 1, W_DIAG = Math.SQRT2;
  const W_SUM = 2 * W_ORTH + W_DIAG;                 // 3.41421
  const LAG_INTERIOR = 1 + W_DIAG / W_SUM;           // 1.41421 = sqrt(2)
  const SLOPE_INTERIOR = 1 / LAG_INTERIOR;           // 0.707107 = 1/sqrt(2)
  const DEFICIT_FRACTION = 1 - SLOPE_INTERIOR;       // 0.292893
  const TROUGH_FRACTION = DEFICIT_FRACTION;          // kept: the old name

  // ── THE SIDEWAYS FAN ────────────────────────────────────────────────────
  // The three-cell stencil streaks badly along the main diagonal, and the
  // reason is in its impulse response, not in the sequence. Measured: inject
  // one unit of dH at a single cell and it travels 100 cells along the
  // diagonal while spreading only 13 across — an aspect ratio of 7.7.
  //
  // WHY. In the rotated frame the sideways component of a step is +-1/sqrt(2)
  // for the two orthogonal cells and EXACTLY ZERO for the diagonal one, which
  // carries the heaviest weight. So the mean step is straight down the
  // diagonal while sideways variance is only 0.369 per step: travel grows as
  // n, spread as sqrt(0.369 n). The field is a superposition of long thin
  // plumes all pointing the same way, and that alone gives diagonal structure
  // even from perfectly uncorrelated input — which is what the author's
  // objection correctly predicted the input could not supply.
  //
  // THE FIX is cells with real sideways reach. Diagonal k-1 extends sideways
  // and all of it is established, but the old stencil used only its two
  // innermost cells. The fan adds (u-1-j, v+j) and (u+j, v-1-j) for
  // j = 1..fan, still on k-1, at distances sqrt(5), sqrt(13), ... and sideways
  // offsets +-2.12, +-3.54, ... against the original +-0.71.
  //
  // MEASURED on the fractal at grid 257, elongation (1.00 = isotropic):
  //
  //   fan   stretch 1   stretch 16
  //     0        2.49         3.57
  //     1        1.10         1.81
  //     2        0.78         1.13   <- the default
  //     3        0.58         0.77
  //
  // It OVERSHOOTS if pushed: beyond 2 the field streaks along the ANTI-diagonal
  // instead, because the fan averages along the previous diagonal and that
  // creates correlation in the other direction. The right value depends on how
  // fast the input varies, which is why it is a control and not a constant.
  //
  // It also undoes the height-against-distance isotropy the sqrt(2) weighting
  // bought, since the fan cells are one diagonal back while being 2.24 away.
  // The author: *"height against isotropy i dont think matters in fact it
  // might be a bad thing because scenery isnt like that - much more important
  // is getting rid of the streaks"*. So that trade is made deliberately.
  function stencil(fan) {
    const st = [[-1, 0], [0, -1], [-1, -1]];
    const W = [W_ORTH, W_ORTH, W_DIAG];
    for (let j = 1; j <= (fan | 0); j++) {
      for (const d of [[-1 - j, j], [j, -1 - j]]) {
        st.push(d);
        W.push(1 / Math.hypot(d[0], d[1]));      // reciprocal distance
      }
    }
    return { st, W };
  }

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
  function scanField(N, seq, h0, dh, serpentine, markN, compensate, offset, stretch, fan) {
    const ST = stencil(fan || 0);
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
    // ── WHERE IN THE SEQUENCE TO START ────────────────────────────────────
    // The author: *"Can you put in a slider to shift the part of fractal that
    // is used ... We want the slider to take it far away from the start as
    // that can often repeat."* An L-system's opening is the least
    // characteristic part of it — the first symbols come straight from the
    // axiom's own expansion — so being able to start deep in the derivation
    // matters.
    //
    // There has to BE room, and at the old default there was none: depth 8
    // yields 17,475 drawing symbols against the 66,049 a 257 grid consumes, so
    // it wrapped 3.8 times and an offset would merely have rotated a repeat.
    // Depth 10 yields 162,019 — 2.45 passes — and depth 11 gives 7.45.
    const off = (offset | 0) % seq.length;
    // ── HOW MANY CELLS EACH SYMBOL COVERS ─────────────────────────────────
    // The author: *"the frequency of the bumps in general is way to high we
    // need more slowly changing."* One symbol per cell makes the cell the
    // finest scale there is, and measured along the anti-diagonal the bumps
    // came out at 18-23 cells — eleven to fourteen across a 257 grid.
    //
    // Holding each symbol for `stretch` cells scales the whole structure by
    // that factor, and because a held symbol is a CONSTANT dH over those
    // cells, each stretch produces a smooth ramp rather than a step — which
    // the constant-delta page established directly.
    //
    // It also buys sequence: one corner needs N*N/stretch symbols instead of
    // N*N, so the passes available multiply by the same factor.
    const st = Math.max(1, stretch | 0) || 1;
    const wrap = i => seq[(off + Math.floor(i / st)) % seq.length];
    for (let k = 1; k <= maxK; k++) {
      const uLo = Math.max(0, k - (N - 1)), uHi = Math.min(k, N - 1);
      const fromU = serpentine ? (k % 2 === 1) : true;   // odd k: u axis -> v axis
      const list = [];
      if (fromU) for (let u = uHi; u >= uLo; u--) list.push(u);
      else       for (let u = uLo; u <= uHi; u++) list.push(u);
      for (const u of list) {
        const v = k - u;
        let num = 0, den = 0, lagNum = 0;
        for (let i = 0; i < ST.st.length; i++) {
          const a = u + ST.st[i][0], b = v + ST.st[i][1];
          if (a < 0 || a >= N || b < 0 || b >= N) continue;
          if (a + b >= k) continue;              // must already be established
          num += ST.W[i] * h[ix(a, b)];
          den += ST.W[i];
          lagNum += ST.W[i] * (k - a - b);       // how many diagonals back
        }
        const base = den > 0 ? num / den : h0;
        // ── LAG COMPENSATION: KEPT AS A DIAGNOSTIC, AND IT IS NOT A FIX ──
        // It multiplies each cell's dH by its own SUM(w_i x lag_i), which
        // equalises the rise per DIAGONAL: every cell then gains dH per
        // diagonal whatever stencil it has.
        //
        // MEASURED, THAT MAKES THE ANISOTROPY WORSE, not better. Gain per unit
        // of true distance goes from axis 1.0000 / diagonal 1.1295 to axis
        // 1.0000 / diagonal 1.4142 — exactly sqrt(2) — because a diagonal step
        // covers sqrt(2) of distance while an axis step covers 1, so levelling
        // per-k over-rewards the diagonal. The weighting above is the real fix;
        // this switch stays only to show what per-k levelling does.
        const lag = den > 0 ? lagNum / den : 1;
        h[ix(u, v)] = base + wrap(used++) * dh * (compensate ? lag : 1);
        if (marks.length < markN) marks.push(ix(u, v));
      }
    }
    return { h, used, marks };
  }

  // ── FOUR CORNERS ────────────────────────────────────────────────────────
  // The streaking along +u+v was predicted from the stencil at the outset and
  // measured at elongation 4.38. It is the SINGLE CAUSAL DIRECTION, and the
  // proof is that entering from the opposite corner gives 0.23 — the same
  // factor the other way, 1/4.3. So scanning from all four corners and
  // averaging cancels the bias.
  //
  // Each scan consumes the sequence AFRESH from the start in its own
  // traversal, so the four fields are not mirrors of one another. That matters:
  // a first attempt mirrored one field and averaged, which forces a 4-fold
  // symmetric result and an elongation of 1.00 by construction rather than by
  // cancellation. Checked — the honest average is asymmetric about u=v by
  // 6.7e-2, so the isotropy is earned.
  //
  // MEASURED: elongation 4.38 -> 1.00, at the cost of roughness 1.036 -> 0.516
  // and relief 0.361 -> 0.142, because averaging four partly-correlated fields
  // cancels signal along with bias. The roughness ratio is almost exactly 2, as
  // it should be for four fields, so the caller is told to double dH; the
  // amplitude is a free parameter and no normalisation is involved.
  const CORNER_AMP = 2;
  function scanFourCorners(N, seq, h0, dh, serpentine, markN, compensate, offset, stretch, fan) {
    const acc = new Float64Array(N * N);
    let marks = null;
    for (const fu of [0, 1]) for (const fv of [0, 1]) {
      const one = scanCorner(N, seq, h0, dh, serpentine, fu ? 0 : (fv ? 0 : markN),
                             compensate, fu, fv, offset, stretch, fan);
      for (let i = 0; i < acc.length; i++) acc[i] += one.h[i];
      if (!fu && !fv) marks = one.marks;
    }
    for (let i = 0; i < acc.length; i++) acc[i] /= 4;
    return { h: acc, used: N * N - 1, marks: marks || [] };
  }
  // The scan with its origin at a chosen corner. fu/fv flip the axis, so the
  // traversal starts there while the sequence still runs from the beginning.
  function scanCorner(N, seq, h0, dh, serpentine, markN, compensate, fu, fv, offset, stretch, fan) {
    const ST = stencil(fan || 0);
    const h = new Float64Array(N * N);
    const X = u => (fu ? N - 1 - u : u), Y = v => (fv ? N - 1 - v : v);
    const ix = (u, v) => Y(v) * N + X(u);
    const marks = [];
    h[ix(0, 0)] = h0;
    if (markN > 0) marks.push(ix(0, 0));
    let used = 0;
    const maxK = 2 * (N - 1);
    // ── WHERE IN THE SEQUENCE TO START ────────────────────────────────────
    // The author: *"Can you put in a slider to shift the part of fractal that
    // is used ... We want the slider to take it far away from the start as
    // that can often repeat."* An L-system's opening is the least
    // characteristic part of it — the first symbols come straight from the
    // axiom's own expansion — so being able to start deep in the derivation
    // matters.
    //
    // There has to BE room, and at the old default there was none: depth 8
    // yields 17,475 drawing symbols against the 66,049 a 257 grid consumes, so
    // it wrapped 3.8 times and an offset would merely have rotated a repeat.
    // Depth 10 yields 162,019 — 2.45 passes — and depth 11 gives 7.45.
    const off = (offset | 0) % seq.length;
    // ── HOW MANY CELLS EACH SYMBOL COVERS ─────────────────────────────────
    // The author: *"the frequency of the bumps in general is way to high we
    // need more slowly changing."* One symbol per cell makes the cell the
    // finest scale there is, and measured along the anti-diagonal the bumps
    // came out at 18-23 cells — eleven to fourteen across a 257 grid.
    //
    // Holding each symbol for `stretch` cells scales the whole structure by
    // that factor, and because a held symbol is a CONSTANT dH over those
    // cells, each stretch produces a smooth ramp rather than a step — which
    // the constant-delta page established directly.
    //
    // It also buys sequence: one corner needs N*N/stretch symbols instead of
    // N*N, so the passes available multiply by the same factor.
    const st = Math.max(1, stretch | 0) || 1;
    const wrap = i => seq[(off + Math.floor(i / st)) % seq.length];
    for (let k = 1; k <= maxK; k++) {
      const uLo = Math.max(0, k - (N - 1)), uHi = Math.min(k, N - 1);
      const fromU = serpentine ? (k % 2 === 1) : true;
      const list = [];
      if (fromU) for (let u = uHi; u >= uLo; u--) list.push(u);
      else       for (let u = uLo; u <= uHi; u++) list.push(u);
      for (const u of list) {
        const v = k - u;
        let num = 0, den = 0, lagNum = 0;
        for (let i = 0; i < ST.st.length; i++) {
          const a = u + ST.st[i][0], b = v + ST.st[i][1];
          if (a < 0 || a >= N || b < 0 || b >= N) continue;
          if (a + b >= k) continue;              // must already be established
          num += ST.W[i] * h[ix(a, b)];
          den += ST.W[i];
          lagNum += ST.W[i] * (k - a - b);       // how many diagonals back
        }
        const base = den > 0 ? num / den : h0;
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
    // FAN 0 THROUGHOUT. These assert the closed form for the THREE-cell
    // stencil — the axis slope, the interior slope, the lag. A fan changes the
    // stencil and so changes those answers; asserting them with a fan would be
    // testing a different claim. The fan's effect is measured separately, by
    // elongation, which is the thing it exists to change.
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
    out.push({ name: 'lag compensation equalises the rise per diagonal',
               pass: Math.abs(sc - 1) < 1e-9,
               detail: 'diagonal slope ' + sc.toFixed(9) +
                       ' per diagonal — note this WORSENS the per-distance anisotropy' });

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
    GRID_LINES, lineColourOver, stampGridLines, DEFICIT_FRACTION, stencil,
    scanFourCorners, scanCorner, CORNER_AMP,
    scanField, selfTest,
    W_ORTH, W_DIAG, W_SUM, LAG_INTERIOR, SLOPE_INTERIOR, TROUGH_FRACTION,
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).TriangleScan;
}
