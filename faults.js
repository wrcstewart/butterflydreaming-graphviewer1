// Extracted verbatim from AV/fractal-terrain-methods.md section 11.2 on 2026-11-08.
// Not retyped: lifted programmatically from the document so the two cannot
// drift apart silently. If this file is edited, say so there too.
// faults.js — Mandelbrot's random-fault ("Poisson faults") construction of a Brownian / fBm-like surface.
// No dependencies. ES module.
//
//   import { faults2d } from './faults.js';
//   const { heights, n } = faults2d({ n: 256, H: 0.5, faults: 4000, seed: 42 });
//
// Each fault is a random straight line x·cosθ + y·sinθ = p with θ ~ U[0, π), p ~ U over the grid's span,
// and a random amplitude Q ~ N(0,1). Every grid point gets Q·profile(signed distance to the line) added.
//   profile(d) = sgn(d)·|d|^α
// α = 0 is a pure step (cliff): the sum tends to Lévy's Brownian surface, H = 0.5.
// α > 0 makes each fault a ramp and the result smoother. Working assumption: H ≈ α + 1/2
// (Mandelbrot 1975, C.R. Acad. Sci. A280; Fellous & Granara 1985). Verify against the sources before relying on it.

import { mulberry32, gaussian } from './fbm2d.js';

export function faults2d({ n = 256, H = 0.5, faults = 4000, seed = 1, normalise = true } = {}) {
  const alpha = H - 0.5;                       // assumed relation, see header
  const rand = mulberry32(seed), randn = gaussian(rand);
  const h = new Float64Array(n * n);
  const c = (n - 1) / 2, R = Math.SQRT2 * c;   // lines pass within the grid's bounding circle
  const eps = 0.5;                             // half a cell: avoids |d|^α blowing up at d = 0 when α < 0

  for (let f = 0; f < faults; f++) {
    const th = Math.PI * rand();
    const ct = Math.cos(th), st = Math.sin(th);
    const p = (2 * rand() - 1) * R;
    const Q = randn();
    for (let y = 0; y < n; y++) {
      const base = (y - c) * st - p;
      for (let x = 0; x < n; x++) {
        const d = (x - c) * ct + base;         // signed distance from the line, in cells
        const ad = Math.max(Math.abs(d), eps);
        h[y * n + x] += Q * Math.sign(d) * (alpha === 0 ? 1 : Math.pow(ad, alpha));
      }
    }
  }

  if (normalise) {
    let lo = Infinity, hi = -Infinity;
    for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = hi - lo || 1;
    for (let i = 0; i < h.length; i++) h[i] = (h[i] - lo) / span;
  }
  return { heights: h, n };
}
