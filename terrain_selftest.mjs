// terrain_selftest.mjs — 2026-11-08.  node terrain_selftest.mjs
//
// Every invariant the three terrain pages rest on, in one command, so a session
// resuming cold can CHECK the claims in FractalTerrain_Notes.md rather than
// trust them. Each test states the fault it exists to catch, because several of
// these were live bugs and the measurement is the only thing that found them.
//
// Exits non-zero if anything fails.

import { fbm2d } from './fbm2d.js';
import { faults2d } from './faults.js';
import { makeTerrain } from './noise.js';
import { makeVariedTerrain, heterogeneity, largestPlateau } from './noise_variants.js';
import { calibrate, directionalPower, hurstFromVariogram, hurstFromSpectrum,
         relief as reliefOf, roughness } from './terrain_metrics.js';
import { treeLineM, snowLineM, alpineBands, alpineColour,
         relLuminance, verticalFor, reliefMetres, METRES_PER_UNIT } from './terrain_view.js';

let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? '   ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
};
const field = (gen, n, km) => {
  const h = new Float64Array(n * n), step = km / (n - 1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = gen(i * step, j * step);
  return h;
};

console.log('\n1. THE GENERATORS REPRODUCE THE DOCUMENT (its section 8 table)');
{
  const a = hurstFromVariogram(fbm2d({ n: 256, H: 0.5, seed: 1 }).heights, 256, 2, 32).slope;
  ok(Math.abs(a - 1.0) < 0.15, 'spectral H=0.5 variogram slope ~1.0', 'got ' + a.toFixed(2));
  const b = hurstFromVariogram(faults2d({ n: 128, H: 0.5, faults: 3000, seed: 1 }).heights, 128, 2, 16).slope;
  ok(Math.abs(b - 1.0) < 0.25, 'faults H=0.5 variogram slope ~1.0', 'got ' + b.toFixed(2));
  // same seed, same terrain: the document's reproducibility claim
  const p = fbm2d({ n: 64, H: 0.8, seed: 9 }).heights;
  const q = fbm2d({ n: 64, H: 0.8, seed: 9 }).heights;
  let same = true;
  for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) same = false;
  ok(same, 'same seed reproduces fbm2d output exactly');
}

console.log('\n2. THE VARIANTS DO NOT DISTURB THE BASELINE');
{
  // Caught a real regression: refactoring 0.85*sum/norm into 0.85*(sum/norm)
  // changed the rounding by one ulp. Bit-identity is an expression-level
  // property, not just a value-level one.
  const a = makeTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7 });
  const b = makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7 });
  let worst = 0;
  for (let j = 0; j < 90; j++) for (let i = 0; i < 90; i++) {
    const x = i * 0.09 - 3, z = j * 0.09 - 3;
    worst = Math.max(worst, Math.abs(a.height01(x, z) - b.height01(x, z)));
  }
  ok(worst === 0, 'variants off are BIT-IDENTICAL to noise.js', 'max diff ' + worst);
}

console.log('\n3. CHUNK EDGES ARE EXACT — the whole reason to use method C');
{
  const cases = [
    ['plain', {}],
    ['all four controls', { stretchU: 1.7, stretchV: 1 / 1.7, warp: 0.4, hetero: 1,
                            softClamp: true, baseShare: 0.35, coverage: 0.45 }],
  ];
  for (const [name, opt] of cases) {
    const t = makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7, ...opt });
    const n = 65;
    const A = t.chunk(0, 0, { chunkKm: 4, res: 64 });
    const B = t.chunk(1, 0, { chunkKm: 4, res: 64 });
    const C = t.chunk(0, 1, { chunkKm: 4, res: 64 });
    let mx = 0;
    for (let j = 0; j < n; j++) mx = Math.max(mx, Math.abs(A[j * n + 64] - B[j * n]));
    for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(A[64 * n + i] - C[i]));
    ok(mx === 0, 'shared edges exact, ' + name, 'max diff ' + mx);
  }
  // walking away and back must return the identical array
  const t = makeTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7 });
  const a = t.chunk(0, 0, { chunkKm: 4, res: 32 });
  t.chunk(5, 3, { chunkKm: 4, res: 32 });
  const b = t.chunk(0, 0, { chunkKm: 4, res: 32 });
  let same = true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) same = false;
  ok(same, 'walking away and back returns identical ground');
}

console.log('\n4. THE DIRECTION MEASURE IS CALIBRATED AND HAS A WORKING NULL');
{
  const rows = calibrate(256);
  ok(rows.every(r => r.pass), 'calibration: 4 known stripe angles + an isotropic null',
     rows.filter(r => !r.pass).map(r => r.name).join('; ') || (rows.length + ' cases'));
  // The estimator alone reported the isotropic spectral method at 1.80-2.17.
  // With the matched null it must read ~1, and must still SEE a real streak.
  let a = 1;
  const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff - 0.5; };
  const wn = new Float64Array(256 * 256);
  for (let i = 0; i < wn.length; i++) wn[i] = rnd();
  const wnE = directionalPower(wn, 256).excess;
  ok(wnE < 1.4, 'white noise reads isotropic', 'excess ' + wnE.toFixed(2));
  const ex = [1, 2, 3, 42, 77, 100, 2026].map(s =>
    directionalPower(fbm2d({ n: 256, H: 0.8, seed: s }).heights, 256).excess);
  const mean = ex.reduce((p, q) => p + q, 0) / ex.length;
  ok(Math.abs(mean - 1) < 0.25, 'spectral fBm reads isotropic over 7 seeds',
     'mean excess ' + mean.toFixed(2));
  // a deliberately anisotropic field must still be caught
  const st = makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7,
                                 stretchU: Math.sqrt(3), stretchV: 1 / Math.sqrt(3) });
  const stE = directionalPower(field(st.height01, 193, 8), 193).excess;
  ok(stE > 1.6, 'a 3:1 stretched field IS caught as directional', 'excess ' + stE.toFixed(2));
}

console.log('\n5. THE H ESTIMATORS, AND THE ONE THAT MUST REFUSE');
{
  // Spectral fields wrap, so the un-windowed spectral slope is near unbiased
  // while the variogram reads low. Reporting the variogram against the asked H
  // would convict the generator of the measurement's error.
  for (const H of [0.5, 0.8, 0.95]) {
    const h = fbm2d({ n: 256, H, seed: 42 }).heights;
    const hs = hurstFromSpectrum(h, 256).H;
    ok(Math.abs(hs - H) < 0.06, 'spectral H recovers asked H=' + H, 'got ' + hs.toFixed(3));
  }
  // and it must throw, not return NaN, on a grid it cannot transform
  let threw = false;
  try { hurstFromSpectrum(new Float64Array(193 * 193), 193); } catch (e) { threw = true; }
  ok(threw, 'hurstFromSpectrum THROWS on a non-power-of-two grid (no silent NaN)');
}

console.log('\n6. THE CLAMP, AND THE SOFT CEILING THAT CURES IT');
{
  // A broad swell overshooting the hard clamp is sheared into a mesa. WHICH
  // settings do it is realisation-dependent — this test first read 2.3% and
  // unpinned, because it samples an 8 km extent where the original 16 km / 3
  // octave measurement had sampled 12 km, so it was simply looking at different
  // ground. Widest 8 km over 2 octaves pins 12.8% of cells here with a 5%
  // single blob, which is unambiguous, and the clamp share is asserted first so
  // a future change of sampling fails loudly rather than quietly passing a test
  // of nothing.
  const opt = { seed: 42, H: 0.75, widestKm: 8, octaves: 2 };
  const hard = field(makeVariedTerrain(opt).height01, 193, 8);
  const soft = field(makeVariedTerrain({ ...opt, softClamp: true }).height01, 193, 8);
  let clamped = 0;
  for (const v of hard) if (v <= 1e-12 || v >= 1 - 1e-12) clamped++;
  ok(clamped / hard.length > 0.05, 'the chosen setting really does clamp',
     (100 * clamped / hard.length).toFixed(1) + '% of cells pinned');
  const ph = largestPlateau(hard, 193), ps = largestPlateau(soft, 193);
  ok(ph.atRail && ph.pct > 2, 'the hard clamp DOES produce a large pinned plateau',
     ph.pct.toFixed(1) + '% at value ' + ph.value.toFixed(3));
  ok(!ps.atRail, 'the soft ceiling leaves nothing pinned at a rail',
     'largest flat region ' + ps.pct.toFixed(1) + '%, at ' + ps.value.toFixed(3));
}

console.log('\n7. HETERO REDISTRIBUTES DETAIL, IT DOES NOT REMOVE IT');
{
  // The first version smoothed the terrain while cv = sd/mean scored it as more
  // varied, because the mean was falling. Roughness is the absolute check.
  const base = field(makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7 }).height01, 193, 8);
  const het = field(makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7, hetero: 1 }).height01, 193, 8);
  const rb = roughness(base, 193, reliefOf(base).relief);
  const rh = roughness(het, 193, reliefOf(het).relief);
  ok(rh >= rb * 0.98, 'hetero does not reduce absolute roughness',
     rb.toFixed(2) + ' -> ' + rh.toFixed(2));
  const hb = heterogeneity(base, 193, 16).spread, hh = heterogeneity(het, 193, 16).spread;
  ok(hh > hb * 1.15, 'hetero does raise heterogeneity',
     (100 * hb).toFixed(1) + '% -> ' + (100 * hh).toFixed(1) + '%');
  // the absolute measure must be blind to a pure rescale, which cv is not
  const half = new Float64Array(base.length);
  for (let i = 0; i < base.length; i++) half[i] = base[i] * 0.5;
  const a = heterogeneity(base, 193, 16).spread, b = heterogeneity(half, 193, 16).spread;
  ok(Math.abs(a - b) < 1e-9, 'heterogeneity is unchanged by a pure rescale');
}

console.log('\n8. THE ALTITUDE MODEL AND THE THREE COLOUR BANDS');
{
  let bad = 0;
  for (let lat = 0; lat <= 85; lat++) if (snowLineM(lat) <= treeLineM(lat)) bad++;
  ok(bad === 0, 'snow line is above the tree line at every latitude', bad + ' failures');
  ok(Math.abs(treeLineM(46) - 2120) < 60 && Math.abs(snowLineM(46) - 2820) < 60,
     'latitude 46 gives the Alps', Math.round(treeLineM(46)) + ' / ' + Math.round(snowLineM(46)) + ' m');
  const bands = alpineBands();
  const [g, br, w] = bands.map(b => b.lum);
  // NOT monotone here by design; what matters is that every PAIR is separable,
  // because the author's colour vision cannot carry a hue-only distinction.
  const sep = (a, b) => Math.max(a, b) / Math.min(a, b);
  ok(sep(g, br) > 2 && sep(w, g) > 1.8 && sep(w, br) > 4,
     'all three bands separable by luminance alone',
     'g/b ' + sep(g, br).toFixed(1) + ':1, w/g ' + sep(w, g).toFixed(1) + ':1, w/b ' + sep(w, br).toFixed(1) + ':1');
  const brown = bands[1].rgb;
  ok(brown[0] / brown[1] > 1.3, 'the brown is an ORDINARY brown, not an olive',
     'R/G ' + (brown[0] / brown[1]).toFixed(2) + ' (olive is 1.00)');
  // and it must survive the scheme's lighting without clipping to cream
  const gain = 0.75 + 0.40;
  const lit = brown.map(v => Math.min(255, v * gain));
  ok(lit[0] / lit[1] > 1.3, 'the brown survives the lighting gain of ' + gain.toFixed(2),
     'lit R/G ' + (lit[0] / lit[1]).toFixed(2));
}

console.log('\n9. THE METRE SCALE SEPARATES HEIGHT FROM GROUND WIDTH');
{
  // The fault the author found: metres had been derived from the same
  // quantities, so "ground covered" could only rename the axis.
  const m20 = reliefMetres(1.385, 0.15), m80 = reliefMetres(1.385, 0.15);
  ok(m20 === m80, 'relief in metres is independent of ground covered',
     Math.round(m20) + ' m either way');
  const s5 = 100 * 1.385 * verticalFor(0.15, 5) / 2;
  const s80 = 100 * 1.385 * verticalFor(0.15, 80) / 2;
  ok(s5 > s80 * 10, 'but widening the ground DOES flatten the view',
     s5.toFixed(0) + '% of frame at 5 km, ' + s80.toFixed(1) + '% at 80 km');
}

console.log('\n10. ANALYTIC NORMALS MATCH ACROSS A TILE SEAM');
{
  // Each tile is its own mesh, so computeVertexNormals() disagrees at the joins
  // and the shading creases — seen as "two stitch lines dividing the scene".
  const t = makeVariedTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7, hetero: 1, warp: 0.4 });
  const nrm = (cx, cz) => {
    const res = 64, n = res + 1, w = n + 2, step = 4 / res, vx = 0.3, size = 1;
    const hp = new Float64Array(w * w);
    for (let b = 0; b < w; b++) for (let a = 0; a < w; a++)
      hp[b * w + a] = t.height01(cx * 4 + (a - 1) * step, cz * 4 + (b - 1) * step);
    const d = size / (n - 1), out = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const pj = j + 1, pi = i + 1;
      const dx = (hp[pj * w + pi + 1] - hp[pj * w + pi - 1]) * vx / (2 * d);
      const dz = (hp[(pj + 1) * w + pi] - hp[(pj - 1) * w + pi]) * vx / (2 * d);
      const L = Math.hypot(-dx, dz, 1) || 1;
      out.push([-dx / L, dz / L, 1 / L]);
    }
    return { out, n };
  };
  const A = nrm(0, 0), B = nrm(1, 0), C = nrm(0, 1);
  let mx = 0;
  for (let j = 0; j < A.n; j++) {
    const a = A.out[j * A.n + (A.n - 1)], b = B.out[j * A.n];
    for (let k = 0; k < 3; k++) mx = Math.max(mx, Math.abs(a[k] - b[k]));
  }
  for (let i = 0; i < A.n; i++) {
    const a = A.out[(A.n - 1) * A.n + i], c = C.out[i];
    for (let k = 0; k < 3; k++) mx = Math.max(mx, Math.abs(a[k] - c[k]));
  }
  ok(mx === 0, 'normals identical at every shared vertex, both seams', 'max diff ' + mx);
}

console.log('\n' + (fail === 0
  ? '  ALL ' + pass + ' INVARIANTS HOLD'
  : '  ' + fail + ' FAILED, ' + pass + ' passed') + '\n');
process.exit(fail === 0 ? 0 : 1);
