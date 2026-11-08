# Fractal Mountain Terrain: Methods and Code

Prepared 8 November 2026 as a handover for further tuning and integration (e.g. with Claude Code).
Context: generating mountains for Chinese landscape (*shan shui*) style rendering, in JavaScript, with seeded reproducibility.

## Contents

1. Background: what is being simulated
2. Method A: random faults ("cracks")
3. Method B: spectral synthesis (FFT)
4. Method C: chunked seeded noise
5. Comparison
6. Seeded randomness
7. Shared rendering approach (3D viewers)
8. Test results
9. Known issues and suggested next steps
10. References
11. Appendix: full source code (`fbm2d.js`, `faults.js`, `noise.js`, `shanshui-terrain.html`, `shanshui-endless.html`)

---

## 1. Background: what is being simulated

All three methods aim at the same statistical target: a **fractional Brownian motion (fBm) surface**, a heightfield z = f(x, y) in which the height difference between any two ground points separated by distance r is Gaussian with variance

```
E[(Z(p) − Z(q))²] ∝ r^(2H)
```

in every direction (isotropic) [1], [2]. The Hurst exponent H ∈ (0, 1) controls roughness:

- H = 0.5 is ordinary (Lévy) Brownian relief [3], which is too rough for most real mountains [4].
- H ≈ 0.7–0.8 gives convincing mountain relief [5].
- The surface's fractal dimension is D = 3 − H, and contour lines (coastlines) cut from it have dimension 2 − H [2], [5].

Two properties follow that the code relies on:

- **Self-similarity.** Zooming in by 2 gives a surface statistically identical to the original, scaled vertically by 2^H.
- **Transects are 1D fBm.** Any straight vertical slice through the surface is a 1D fBm profile with the same H, so ridgeline silhouettes for 2D ink rendering can be taken directly from rows of the surface.

fBm is a statistical *description* of relief across scales, not a model of tectonics or erosion [2], [4]. Real terrain behaves fractally only over a limited range of scales [6].

The "Brownian" name comes from Lévy's mathematical generalisation of Brownian motion to multi-dimensional "time" [3], not from any physical particle path. The shared ingredient is the central limit theorem: summing many independent small random contributions gives Gaussian values with variance growing in proportion to their number.

---

## 2. Method A: random faults ("cracks")

**Idea.** Mandelbrot showed that relief resembling the Earth's can be built by superposing very many small cliffs placed along independent, uniformly random straight faults [4]. With pure step faults, the sum converges to Lévy's Brownian surface (H = 0.5), constructed earlier by Chentsov [7].

**Generalisation to other H.** Replace the step with a fault cross-section of the form Q·sgn(d)·|d|^α, with |α| < ½ and Q random [8], [9]. Here d is the signed distance from the fault line. α = 0 is the plain step; α > 0 turns each fault into a ramp and gives smoother relief. Fellous and Granara derive the general condition on fault profiles that yields a Gaussian process of a given type, and give convergence results [9].

**Relation between α and H.** The implementation uses **H = α + ½**. The test results in Section 8 support this empirically (variogram slope 1.59 against an expected 1.60 for H = 0.8), but it should still be checked against [8] and [9].

**Algorithm** (`faults.js`):

1. Represent each fault line as x·cos θ + y·sin θ = p, with θ ~ U[0, π) and p ~ U[−R, R], where R is the radius of the grid's bounding circle. This gives an isotropic Poisson line process [10].
2. Draw the amplitude Q ~ N(0, 1), independently for each fault.
3. Add Q·sgn(d)·max(|d|, ε)^α to every grid point, where d is the signed distance to the line. The clamp ε = ½ cell avoids divergence at d = 0 when α < 0.
4. Repeat for many faults, typically several thousand.

**Notes.**
- Line placement must be uniform and independent. Structured generators such as L-systems would bias directions and break isotropy.
- Low-discrepancy (quasi-random) sequences such as Halton or Sobol may be used for θ and p to give more even coverage [11]. Q must remain genuinely random, or the Gaussian property is lost.
- Cost is O(faults × n²), and convergence is slow. The method is conceptually attractive and works well on spheres (planets), where FFTs are awkward [5].
- L-systems are better used *on top of* the terrain, for trees and vegetation [12].

---

## 3. Method B: spectral synthesis (FFT)

**Idea.** Build the surface as a sum of waves (Fourier modes) running in all directions [5], [13]:

1. Give each wavevector k on an n × n grid a random complex coefficient whose real and imaginary parts are independent standard Gaussians.
2. Multiply each coefficient by the amplitude envelope |k|^−(H+1), which gives a power spectrum ∝ |k|^−(2H+2) in 2D.
3. Inverse-FFT and take the real part.

**Why the output is Gaussian.** Every height is a weighted sum of independent Gaussian coefficients, so it is *exactly* Gaussian, with no central-limit approximation needed.

**Why the correlations are right.** By the Wiener–Khinchin theorem, the power spectrum and the correlation structure are Fourier-transform pairs [14]. The power law |k|^−(2H+2) corresponds to the variogram ∝ r^(2H).

**Where the fractal comes from.** Only from the power law, which has no built-in length scale. Changing the envelope to one that peaks at a single wavelength still gives a Gaussian surface, but not a fractal one: smooth dunes of one size.

**Where it stops being fractal.** Below one grid spacing (no finer waves) and above the grid size (the surface wraps around and tiles).

**Variants and controls in the viewer.**
- **Widest-feature cutoff.** A soft Butterworth-style high-pass on the spectrum, amp × k⁴ / (k⁴ + k₀⁴). It suppresses features wider than about 1/k₀, so one grid-sized massif becomes a range of similar-sized mountains, while keeping the fractal scaling below that size.
- **Area.** The grid size n and the physical extent scale together, so the detail per metre stays constant.
- **Massif falloff.** An optional radial smoothstep mask that gathers the tile into a single mountain group.

**Exact alternative.** Stein's circulant-embedding method gives exact fBm surface statistics in O(n log n) [15], building on Wood and Chan [16]. Use it where statistical exactness matters, e.g. comparison with real terrain.

**Approximate alternatives (not implemented here).**
- Diamond-square / midpoint displacement [17] is fast but not stationary: it leaves visible creases along grid lines [18].
- Voss's successive random additions reduce those artefacts [5].

---

## 4. Method C: chunked seeded noise

**Idea.** Define height as a pure *function* of world position and seed, rather than as an array produced all at once. Then:

- The world is divided into square chunks (here 4 km × 4 km at 65 × 65 samples).
- Neighbouring chunks agree exactly along shared edges, because they evaluate the same function.
- Only chunks near the viewer are generated, nearest first, and far ones are discarded. The world is unbounded while memory stays bounded.

**Noise function.** Seeded 2D simplex noise [19], [20]. The seed shuffles the permutation table with a Fisher–Yates shuffle driven by Mulberry32.

**fBm by octave summation.** Octave o has frequency f₀·2^o and amplitude 2^(−H·o), the same power law as Method B but only over the octaves summed [13]:
- The widest feature is set by f₀ = 1/(widest km).
- The finest detail is widest / 2^(octaves−1).
- Each octave is rotated and offset to hide the noise lattice's tendency to line features up with the axes [13].

**Seam-free lighting.** Normals are computed by central differences of the *global* height function, not per chunk, so the shading also matches across chunk edges.

**Trade-offs versus FFT.**
- It never repeats and never runs out, but the statistics are only approximately fBm.
- The scaling holds only between the lowest and highest octave.
- The cost per sample is octaves × simplex evaluations, so normals cost 5× that.

---

## 5. Comparison

| | A: Random faults | B: Spectral (FFT) | C: Chunked noise |
|---|---|---|---|
| Statistics | Converges to exact Gaussian fBm as faults → ∞ | Exact Gaussian; correct spectrum (periodic) | Approximate fBm over summed octaves |
| Extent | Finite grid (or sphere) | Finite, tiles seamlessly | Unbounded |
| Cost | O(faults × n²), slow | O(n² log n), fast | O(samples × octaves), streams |
| H control | Fault profile exponent α = H − ½ | Spectral exponent | Octave gain 2^−H |
| Largest feature | Grid size | Grid size, or set by high-pass cutoff | Set by lowest octave |
| Best for | Conceptual clarity; planets | Accurate fixed scenes; analysis | Endless scrolling scenes |
| File | `faults.js` | `fbm2d.js`, `shanshui-terrain.html` | `noise.js`, `shanshui-endless.html` |

---

## 6. Seeded randomness

All modules use **Mulberry32**, a compact 32-bit generator, so the same seed gives the same terrain on any JS engine. `Math.random()` cannot be seeded. Gaussian draws use the Box–Muller transform, with both outputs used [21].

- Library generators are also deterministic, but their streams are not guaranteed stable across versions. NumPy, for example, freezes only the legacy `RandomState` [22]. Owning the generator removes that dependency.
- For stronger statistical quality, PCG [23] or xorshift [24] are equally compact.
- Bit-identical output across languages (e.g. Python and JS) would also require the same Gaussian transform, the same draw order and 32-bit integer arithmetic. FFT results may still differ in the last decimal places.
- **Known behaviour of `fbm2d.js`:** coefficients are drawn in grid order, so the same seed at a different n gives a *different* surface, not the same one at a new resolution.

---

## 7. Shared rendering approach (3D viewers)

Both viewers are self-contained HTML pages using Three.js r128 and OrbitControls, loaded from jsDelivr.

- **Mesh:** a heightfield on a regular grid, rendered with MeshLambertMaterial and per-vertex colours.
- **Palettes:** "ink" (a pale wash grading to dense ink) and "blue-green", after the mineral-pigment *qinglü* style.
- **Slope darkening:** colour is darkened as the normal tilts, a crude stand-in for *cun* texture strokes.
- **Distance fog:** set to the page background, for atmospheric recession as in layered scrolls.
- **Theming:** the page follows the viewer's light or dark theme; the sky and fog read the CSS tokens.
- **World scale:** 1 scene unit = 4 km. The spectral viewer's base 256 grid covers 8 km at about 31 m per sample.

---

## 8. Test results

Variogram slopes were measured in Node.js. For fBm, the log–log slope of the variogram against lag should equal 2H.

| Test | Result | Expected |
|---|---|---|
| Spectral, H = 0.5, n = 512, lags 2–32 | 1.04 | 1.0 |
| Spectral, H = 0.8, local slope at lags 1–8 | 1.55–1.67 | 1.6 |
| Spectral, H = 0.8, local slope at lags 64–128 (n = 1024) | 1.33 | 1.6 (flattened by periodic wrap) |
| Faults, H = 0.5, n = 128, 3000 faults | 1.00 | 1.0 |
| Faults, H = 0.8, n = 128, 3000 faults | 1.59 | 1.6 |
| Same seed reproduces `fbm2d` output | identical | identical |
| Chunked noise, shared edge of adjacent chunks | max difference 0 | 0 |

Timing: the fault method took about 1.9 s for 3000 faults at n = 128 when α ≠ 0, because of the `Math.pow` calls. The spectral method takes about 1 s at n = 1024.

---

## 9. Known issues and suggested next steps

**Statistics**
- **Spectral periodicity** flattens correlations at large lags. If statistics must hold across the whole image, generate at 2n and crop the centre, or use Stein's method [15].
- **Resolution-stable seeds:** draw spectral coefficients in order of increasing |k|, so that a larger n adds detail to the same mountain.
- **Fault method α–H relation:** confirmed empirically here; cite and check against [8] and [9].

**Performance**
- **Fault method speed:** precompute |d|^α with a lookup table, or vectorise.
- **Chunked LOD:** distant chunks could use a lower `res`. Building could move to a Web Worker.
- **Simplex artefacts:** consider domain warping, or OpenSimplex2, for less lattice structure.

**Realism**
- **Ridged multifractal / erosion:** Musgrave's ridged multifractal [13], or a hydraulic-erosion pass, would give sharper Chinese-style peaks.

**Rendering**
- **Ink rendering:** extract silhouettes (rows or horizon lines) for 2D SVG ink rendering in the style of {Shan, Shui}* [25]. Add stroke-based *cun* hatching clipped inside the silhouette, and layer the depth planes with fading ink.
- **Export:** write meshes as .obj or .glb for Blender.

---

## 10. References

1. Mandelbrot, B. B. & Van Ness, J. W. (1968). Fractional Brownian motions, fractional noises and applications. *SIAM Review*, 10(4), 422–437.
2. Mandelbrot, B. B. (1982). *The Fractal Geometry of Nature*. W. H. Freeman.
3. Lévy, P. (1948). *Processus stochastiques et mouvement brownien*. Gauthier-Villars.
4. Mandelbrot, B. B. (1975). Stochastic models for the Earth's relief, the shape and the fractal dimension of the coastlines, and the number–area rule for islands. *Proceedings of the National Academy of Sciences*, 72(10), 3825–3828. doi:10.1073/pnas.72.10.3825
5. Voss, R. F. (1988). Fractals in nature: from characterization to simulation. In Peitgen, H.-O. & Saupe, D. (eds.), *The Science of Fractal Images*, Springer, 21–70.
6. Turcotte, D. L. (1997). *Fractals and Chaos in Geology and Geophysics* (2nd ed.). Cambridge University Press.
7. Chentsov, N. N. (1957). Lévy Brownian motion for several parameters and generalized white noise. *Theory of Probability and Its Applications*, 2(2), 265–266.
8. Mandelbrot, B. B. (1975). Fonctions aléatoires pluri-temporelles: approximation poissonienne du cas brownien et généralisations. *Comptes Rendus de l'Académie des Sciences, Paris*, A280, 1075–1078.
9. Fellous, A. & Granara, J. (1985). Superposition de déformations cylindriques d'axes poissonniens dans le plan. *Zeitschrift für Wahrscheinlichkeitstheorie und verwandte Gebiete*, 69, 47–64. doi:10.1007/BF00532585
10. Stoyan, D., Kendall, W. S. & Mecke, J. (1987). *Stochastic Geometry and Its Applications*. Wiley.
11. Niederreiter, H. (1992). *Random Number Generation and Quasi-Monte Carlo Methods*. SIAM.
12. Prusinkiewicz, P. & Lindenmayer, A. (1990). *The Algorithmic Beauty of Plants*. Springer.
13. Ebert, D. S., Musgrave, F. K., Peachey, D., Perlin, K. & Worley, S. (2003). *Texturing and Modeling: A Procedural Approach* (3rd ed.). Morgan Kaufmann.
14. Wiener, N. (1930). Generalized harmonic analysis. *Acta Mathematica*, 55, 117–258.
15. Stein, M. L. (2002). Fast and exact simulation of fractional Brownian surfaces. *Journal of Computational and Graphical Statistics*, 11(3), 587–599.
16. Wood, A. T. A. & Chan, G. (1994). Simulation of stationary Gaussian processes in [0,1]^d. *Journal of Computational and Graphical Statistics*, 3(4), 409–432.
17. Fournier, A., Fussell, D. & Carpenter, L. (1982). Computer rendering of stochastic models. *Communications of the ACM*, 25(6), 371–384. doi:10.1145/358523.358553
18. Miller, G. S. P. (1986). The definition and rendering of terrain maps. *ACM SIGGRAPH Computer Graphics*, 20(4), 39–48.
19. Perlin, K. (1985). An image synthesizer. *ACM SIGGRAPH Computer Graphics*, 19(3), 287–296.
20. Perlin, K. (2002). Improving noise. *ACM Transactions on Graphics*, 21(3), 681–682.
21. Box, G. E. P. & Muller, M. E. (1958). A note on the generation of random normal deviates. *Annals of Mathematical Statistics*, 29(2), 610–611.
22. NumPy Developers (2018). *NEP 19 — Random number generator policy*. https://numpy.org/neps/nep-0019-rng-policy.html
23. O'Neill, M. E. (2014). *PCG: A family of simple fast space-efficient statistically good algorithms for random number generation*. Technical Report HMC-CS-2014-0905, Harvey Mudd College.
24. Marsaglia, G. (2003). Xorshift RNGs. *Journal of Statistical Software*, 8(14), 1–6.
25. Huang, L. *{Shan, Shui}\** [software]. Procedurally generated Chinese landscape in JavaScript/SVG. https://github.com/LingDong-/shan-shui-inf

---

## 11. Appendix: full source code

File layout assumed by the imports:

```
fbm2d.js        Method B core + shared seeded RNG (mulberry32, gaussian)
faults.js       Method A (imports from fbm2d.js)
noise.js        Method C core (imports from fbm2d.js)
shanshui-terrain.html   3D viewer, Method B (self-contained)
shanshui-endless.html   3D viewer, Method C (self-contained)
```

The two HTML viewers inline their own copies of the generator code, so each runs standalone in a browser.

### 11.1 `fbm2d.js`: spectral synthesis and shared RNG

```js
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
export function fbm2d({ n = 256, H = 0.8, seed = 1, normalise = true } = {}) {
  if (n & (n - 1)) throw new Error('n must be a power of 2');
  const randn = gaussian(mulberry32(seed));
  const re = new Float64Array(n * n), im = new Float64Array(n * n);

  for (let y = 0; y < n; y++) {
    const ky = freq(y, n);
    for (let x = 0; x < n; x++) {
      const kx = freq(x, n);
      const k = Math.hypot(kx, ky);
      // Power spectrum ∝ |k|^-(2H+2)  =>  amplitude ∝ |k|^-(H+1). Drop k = 0 (mean height).
      const amp = k === 0 ? 0 : Math.pow(k, -(H + 1));
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
```

### 11.2 `faults.js`: random faults

```js
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
```

### 11.3 `noise.js`: chunked seeded noise

```js
// noise.js — seeded 2D simplex noise and octave-sum fBm for chunked, unbounded terrain.
// No dependencies. ES module. Same algorithm as the "Shan Shui Endless" viewer.
//
//   import { makeTerrain } from './noise.js';
//   const terrain = makeTerrain({ seed: 42, H: 0.75, widestKm: 4, octaves: 7 });
//   const h = terrain.height01(xKm, zKm);     // height in [0, 1] at any world position
//   const chunk = terrain.chunk(cx, cz, { chunkKm: 4, res: 64 });   // Float32Array of (res+1)^2 heights
//
// Because height01 is a pure function of world position and seed, chunks computed independently
// agree exactly along shared edges, so the world can be generated piecewise and without limit.

import { mulberry32 } from './fbm2d.js';

const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;

// 2D simplex noise after Gustavson's public-domain reference. Returns roughly [-1, 1].
export function makeSimplex(seed) {
  const r = mulberry32(seed), p = new Uint8Array(256), perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return function simplex2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, tt, g;
    tt = 0.5 - x0*x0 - y0*y0; if (tt > 0) { g = GRAD[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt*tt*(g[0]*x0 + g[1]*y0); }
    tt = 0.5 - x1*x1 - y1*y1; if (tt > 0) { g = GRAD[perm[ii+i1 + perm[jj+j1]] & 7]; tt *= tt; n += tt*tt*(g[0]*x1 + g[1]*y1); }
    tt = 0.5 - x2*x2 - y2*y2; if (tt > 0) { g = GRAD[perm[ii+1 + perm[jj+1]] & 7]; tt *= tt; n += tt*tt*(g[0]*x2 + g[1]*y2); }
    return 70 * n;
  };
}

// Octave o: frequency f0·2^o, amplitude 2^(−H·o) — the fBm power law over the octaves summed.
// Each octave is rotated and offset to hide the simplex lattice's axis alignment.
export function makeTerrain({ seed = 42, H = 0.75, widestKm = 4, octaves = 7 } = {}) {
  const simplex2 = makeSimplex(seed);
  const rot = Array.from({ length: octaves }, (_, o) => { const a = o * 0.83; return [Math.cos(a), Math.sin(a), o * 17.3, o * -9.1]; });
  const gain = Math.pow(2, -H);
  let norm = 0; for (let o = 0; o < octaves; o++) norm += Math.pow(gain, o);
  const f0 = 1 / widestKm;                       // cycles per km for the widest feature

  function height01(xKm, zKm) {
    let sum = 0, f = f0, a = 1;
    for (let o = 0; o < octaves; o++) {
      const [c, s, ox, oy] = rot[o];
      sum += a * simplex2((xKm * c - zKm * s) * f + ox, (xKm * s + zKm * c) * f + oy);
      f *= 2; a *= gain;
    }
    return Math.min(1, Math.max(0, 0.5 + 0.85 * sum / norm));
  }

  // Heights for chunk (cx, cz): (res+1)×(res+1) samples, row-major, edges shared with neighbours.
  function chunk(cx, cz, { chunkKm = 4, res = 64 } = {}) {
    const n = res + 1, step = chunkKm / res, out = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)
      out[j * n + i] = height01(cx * chunkKm + i * step, cz * chunkKm + j * step);
    return out;
  }

  return { height01, chunk, finestKm: widestKm / Math.pow(2, octaves - 1) };
}
```

### 11.4 `shanshui-terrain.html`: 3D viewer, spectral method

```html
<title>Shan Shui Terrain</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap">
<style>
/* Layout: full-bleed 3D scene; one floating control sheet (bottom-left desktop, bottom sheet on phones). */
:root {
  --paper: #e3e5dc;      /* silk ground, faint green bias */
  --ink: #1d2422;        /* text and ink */
  --ink-soft: #5b6560;
  --sheet: rgba(240, 242, 236, 0.9);
  --rule: #c3c8bd;
  --seal: #a8322a;       /* cinnabar seal red, used once */
  --display: "Zen Old Mincho", "Songti SC", "Noto Serif CJK SC", Georgia, serif;
  --body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #161a19; --ink: #e2e5de; --ink-soft: #9aa49e;
    --sheet: rgba(28, 33, 31, 0.9); --rule: #39413d; --seal: #d0574c;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #161a19; --ink: #e2e5de; --ink-soft: #9aa49e;
  --sheet: rgba(28, 33, 31, 0.9); --rule: #39413d; --seal: #d0574c;
  color-scheme: dark;
}
html, body { height: 100%; }
body { background: var(--paper); color: var(--ink); font-family: var(--body); overflow: hidden; }
#scene { position: fixed; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; }

.sheet {
  position: fixed;
  left: calc(16px + env(safe-area-inset-left, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  width: 300px; max-width: calc(100% - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
  background: var(--sheet); backdrop-filter: blur(6px);
  border: 1px solid var(--rule); border-radius: 4px;
  padding: 16px 18px; display: grid; gap: 14px;
}
.head { display: flex; align-items: center; gap: 10px; }
.seal {
  width: 30px; height: 30px; flex: none; border-radius: 3px;
  background: var(--seal); color: #fff;
  font-family: var(--display); font-weight: 700; font-size: 17px;
  display: grid; place-items: center; line-height: 1;
}
h1 { margin: 0; font-family: var(--display); font-weight: 700; font-size: 19px; letter-spacing: 0.02em; text-wrap: balance; }
.sub { margin: 2px 0 0; font-size: 12px; color: var(--ink-soft); }

.ctl { display: grid; gap: 4px; }
.ctl label { display: flex; justify-content: space-between; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
.ctl output { font-family: var(--mono); font-size: 12px; color: var(--ink); text-transform: none; letter-spacing: 0; font-variant-numeric: tabular-nums; }
input[type=range] { width: 100%; accent-color: var(--ink); margin: 0; }
input:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid var(--seal); outline-offset: 2px; }

.row { display: flex; gap: 8px; flex-wrap: wrap; }
.seg { display: flex; border: 1px solid var(--rule); border-radius: 3px; overflow: hidden; }
.seg button {
  font: 500 12px var(--body); padding: 6px 10px; border: 0; background: transparent; color: var(--ink-soft); cursor: pointer;
}
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
.btn {
  font: 500 12px var(--body); padding: 6px 12px; border: 1px solid var(--ink); border-radius: 3px;
  background: transparent; color: var(--ink); cursor: pointer;
}
.btn:hover { background: var(--ink); color: var(--paper); }
.check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft); }
.hint { font-size: 11px; color: var(--ink-soft); margin: 0; }
.dim { font-family: var(--mono); }

#toggle { display: none; }
@media (max-width: 560px) {
  .sheet { left: calc(8px + env(safe-area-inset-left, 0px)); right: calc(8px + env(safe-area-inset-right, 0px)); width: auto; max-width: none; bottom: calc(8px + env(safe-area-inset-bottom, 0px)); padding: 12px 14px; gap: 10px; }
  .sheet.collapsed .body { display: none; }
  #toggle { display: inline-block; margin-left: auto; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<canvas id="scene" aria-label="3D view of a generated mountain terrain. Drag to orbit, scroll or pinch to zoom."></canvas>

<section class="sheet" id="sheet">
  <div class="head">
    <div class="seal" aria-hidden="true">山</div>
    <div>
      <h1>Shan Shui Terrain</h1>
      <p class="sub">fBm surface, spectral synthesis</p>
    </div>
    <button class="btn" id="toggle" aria-expanded="true">Hide</button>
  </div>
  <div class="body" style="display:grid; gap:14px">
    <div class="ctl">
      <label for="H">Hurst exponent H <output id="Hout"></output></label>
      <input type="range" id="H" min="0.1" max="0.95" step="0.05" value="0.8">
      <p class="hint">Surface dimension D = 3 − H = <span class="dim" id="Dout"></span>. Lower H is rougher.</p>
    </div>
    <div class="ctl">
      <label for="relief">Relief <output id="reliefOut"></output></label>
      <input type="range" id="relief" min="0.1" max="1.2" step="0.05" value="0.55">
    </div>
    <div class="ctl">
      <label for="widest">Widest mountain <output id="widestOut"></output></label>
      <input type="range" id="widest" min="0" max="4" step="1" value="0">
      <p class="hint">Removes features wider than this, turning one massif into a range.</p>
    </div>
    <div class="ctl">
      <label for="seed">Seed <output id="seedOut"></output></label>
      <input type="range" id="seed" min="1" max="999" step="1" value="42">
    </div>
    <div class="row">
      <div class="seg" role="group" aria-label="Palette">
        <button id="pInk" aria-pressed="true">Ink</button>
        <button id="pBlue" aria-pressed="false">Blue-green</button>
      </div>
    </div>
    <div class="ctl">
      <label>Area <output id="areaOut"></output></label>
      <div class="seg" role="group" aria-label="Area">
        <button id="v256" aria-pressed="true">Massif</button>
        <button id="v512" aria-pressed="false">Range</button>
        <button id="v1024" aria-pressed="false">Wide</button>
      </div>
      <p class="hint">Same detail per metre, larger area. Wide is heavy on phones.</p>
    </div>
    <div class="row" style="align-items:center">
      <label class="check"><input type="checkbox" id="massif" checked> Massif falloff</label>
      <button class="btn" id="newSeed" style="margin-left:auto">New mountain</button>
    </div>
    <p class="hint">Drag to orbit · scroll or pinch to zoom · right-drag to pan</p>
  </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
// ---------- fBm generator (same algorithm as fbm2d.js) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rand();
    const v = rand(), r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}
function fft1d(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = sign * 2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2d(re, im, n, inverse) {
  const rr = new Float64Array(n), ri = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) { rr[x] = re[y*n+x]; ri[x] = im[y*n+x]; }
    fft1d(rr, ri, inverse);
    for (let x = 0; x < n; x++) { re[y*n+x] = rr[x]; im[y*n+x] = ri[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { rr[y] = re[y*n+x]; ri[y] = im[y*n+x]; }
    fft1d(rr, ri, inverse);
    for (let y = 0; y < n; y++) { re[y*n+x] = rr[y]; im[y*n+x] = ri[y]; }
  }
}
const freq = (i, n) => (i < n / 2 ? i : i - n) / n;
// k0 (cycles per sample): soft high-pass cutoff. Features wider than ~1/k0 samples are suppressed,
// so the surface becomes a range of similar-sized mountains instead of one grid-sized hump. 0 = off.
function fbm2d(n, H, seed, k0 = 0) {
  const randn = gaussian(mulberry32(seed));
  const re = new Float64Array(n*n), im = new Float64Array(n*n);
  const k04 = Math.pow(k0, 4);
  for (let y = 0; y < n; y++) {
    const ky = freq(y, n);
    for (let x = 0; x < n; x++) {
      const k = Math.hypot(freq(x, n), ky);
      let amp = k === 0 ? 0 : Math.pow(k, -(H + 1));
      if (k0 > 0 && k > 0) { const k4 = Math.pow(k, 4); amp *= k4 / (k4 + k04); }  // Butterworth-style high-pass
      const g1 = randn(), g2 = randn();
      re[y*n+x] = g1 * amp; im[y*n+x] = g2 * amp;
    }
  }
  fft2d(re, im, n, true);
  let lo = Infinity, hi = -Infinity;
  for (const v of re) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  for (let i = 0; i < re.length; i++) re[i] = (re[i] - lo) / span;
  return re;
}

// ---------- State and controls ----------
const $ = id => document.getElementById(id);
// World scale: 1 scene unit = 4 km, so the base 256 grid covers 8 km at ~31 m per sample.
const KM_PER_UNIT = 4;
const SPACING = 2 / 256;                         // scene units per sample, fixed across areas
const WIDEST_KM = [0, 8, 4, 2, 1];               // 0 = no cutoff
const state = { H: 0.8, relief: 0.55, seed: 42, n: 256, palette: 'ink', massif: true, widest: 0 };
const size = () => state.n * SPACING;
function k0() {                                  // cutoff in cycles per sample
  const km = WIDEST_KM[state.widest];
  return km ? SPACING / (km / KM_PER_UNIT) : 0;
}
function syncLabels() {
  $('Hout').textContent = state.H.toFixed(2);
  $('Dout').textContent = (3 - state.H).toFixed(2);
  $('reliefOut').textContent = (state.relief * KM_PER_UNIT).toFixed(1) + ' km';
  $('seedOut').textContent = state.seed;
  const km = WIDEST_KM[state.widest];
  $('widestOut').textContent = km ? '≈ ' + km + ' km' : 'no limit';
  const s = size() * KM_PER_UNIT;
  $('areaOut').textContent = s + ' × ' + s + ' km';
}

// ---------- Three.js scene ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 50);
camera.position.set(1.6, 0.9, 1.6);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.12, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.4; controls.maxDistance = 6;

scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7570, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-1.5, 1.2, 0.6);
scene.add(sun);

let mesh = null;

function cssColor(name) {
  return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
}
function applyTheme() {
  const bg = cssColor('--paper');
  scene.background = bg;
  const s = size() / 2;
  scene.fog = new THREE.Fog(bg, 2.0 * s, 5.0 * s);   // distance haze, as in layered landscape scrolls
}
// Move the camera out (or in) to frame the current area, keeping its viewing direction.
function frameArea(prevSize) {
  const f = size() / prevSize;
  camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);
  camera.far = 25 * size(); camera.updateProjectionMatrix();
  controls.maxDistance = 3 * size();
}

// Palettes: [height stop, colour]. Ink = wash to dense ink; blue-green = mineral qinglü style.
const PALETTES = {
  ink:  [[0.0, '#c9ccc2'], [0.35, '#9ca29a'], [0.65, '#5e6661'], [1.0, '#22282a']],
  blue: [[0.0, '#c8c3a4'], [0.3, '#8fa58a'], [0.6, '#3f7a74'], [0.85, '#2b5a72'], [1.0, '#2a3e4f']]
};
function rampColor(stops, t, out) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0] || i === stops.length - 1) {
      const [t0, c0] = stops[i-1], [t1, c1] = stops[i];
      const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      out.copy(new THREE.Color(c0)).lerp(new THREE.Color(c1), f);
      return out;
    }
  }
}

function build() {
  const { n, H, seed, relief, massif } = state;
  const h = fbm2d(n, H, seed, k0());

  // Optional massif falloff: fade heights toward the edges so the tile reads as one mountain group.
  if (massif) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x / (n - 1) * 2 - 1, dy = y / (n - 1) * 2 - 1;
      const r = Math.min(1, Math.hypot(dx, dy));
      const m = 1 - r * r * (3 - 2 * r);           // smoothstep falloff
      h[y*n+x] *= 0.15 + 0.85 * m;
    }
  }

  const geo = new THREE.PlaneGeometry(size(), size(), n - 1, n - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) pos.setY(i, h[i] * relief);
  geo.computeVertexNormals();

  // Colour by height, darkened on steep slopes (a crude stand-in for cun texture strokes).
  const nrm = geo.attributes.normal, c = new THREE.Color();
  const stops = PALETTES[state.palette];
  for (let i = 0; i < pos.count; i++) {
    rampColor(stops, h[i], c);
    const steep = 1 - nrm.getY(i);                 // 0 flat, ~1 vertical
    c.multiplyScalar(1 - 0.45 * Math.min(1, steep * 1.6));
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
  mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
}

function resize() {
  const w = window.innerWidth, hgt = window.innerHeight;
  renderer.setSize(w, hgt, false);
  camera.aspect = w / hgt; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function loop() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); }

// ---------- Wire controls ----------
let pending = null;
function rebuildSoon() { clearTimeout(pending); pending = setTimeout(build, state.n >= 1024 ? 350 : 60); }
$('widest').addEventListener('input', e => { state.widest = +e.target.value; syncLabels(); rebuildSoon(); });
$('H').addEventListener('input', e => { state.H = +e.target.value; syncLabels(); rebuildSoon(); });
$('relief').addEventListener('input', e => { state.relief = +e.target.value; syncLabels(); rebuildSoon(); });
$('seed').addEventListener('input', e => { state.seed = +e.target.value; syncLabels(); rebuildSoon(); });
$('massif').addEventListener('change', e => { state.massif = e.target.checked; build(); });
$('newSeed').addEventListener('click', () => {
  state.seed = 1 + Math.floor(Math.random() * 999); $('seed').value = state.seed; syncLabels(); build();
});
function seg(onId, offId, apply) {
  $(onId).addEventListener('click', () => {
    $(onId).setAttribute('aria-pressed', 'true'); $(offId).setAttribute('aria-pressed', 'false'); apply(); build();
  });
}
seg('pInk', 'pBlue', () => state.palette = 'ink');
seg('pBlue', 'pInk', () => state.palette = 'blue');
// Area buttons: three-way, each scales the grid and the physical area together.
const AREAS = { v256: 256, v512: 512, v1024: 1024 };
for (const id of Object.keys(AREAS)) {
  $(id).addEventListener('click', () => {
    for (const other of Object.keys(AREAS)) $(other).setAttribute('aria-pressed', String(other === id));
    const prev = size();
    state.n = AREAS[id];
    syncLabels(); frameArea(prev); applyTheme(); build();
  });
}
$('toggle').addEventListener('click', () => {
  const s = $('sheet'), collapsed = s.classList.toggle('collapsed');
  $('toggle').textContent = collapsed ? 'Show' : 'Hide';
  $('toggle').setAttribute('aria-expanded', String(!collapsed));
});

// Follow the viewer's theme for sky and fog.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

syncLabels(); applyTheme(); resize(); build(); loop();
</script>
```

### 11.5 `shanshui-endless.html`: 3D viewer, chunked noise

```html
<title>Shan Shui Endless</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap">
<style>
/* Layout: full-bleed 3D scene; one floating control sheet (bottom-left desktop, bottom sheet on phones). */
:root {
  --paper: #e3e5dc;
  --ink: #1d2422;
  --ink-soft: #5b6560;
  --sheet: rgba(240, 242, 236, 0.9);
  --rule: #c3c8bd;
  --seal: #a8322a;
  --display: "Zen Old Mincho", "Songti SC", "Noto Serif CJK SC", Georgia, serif;
  --body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #161a19; --ink: #e2e5de; --ink-soft: #9aa49e;
    --sheet: rgba(28, 33, 31, 0.9); --rule: #39413d; --seal: #d0574c;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #161a19; --ink: #e2e5de; --ink-soft: #9aa49e;
  --sheet: rgba(28, 33, 31, 0.9); --rule: #39413d; --seal: #d0574c;
  color-scheme: dark;
}
html, body { height: 100%; }
body { background: var(--paper); color: var(--ink); font-family: var(--body); overflow: hidden; }
#scene { position: fixed; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; }

.sheet {
  position: fixed;
  left: calc(16px + env(safe-area-inset-left, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  width: 300px; max-width: calc(100% - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
  background: var(--sheet); backdrop-filter: blur(6px);
  border: 1px solid var(--rule); border-radius: 4px;
  padding: 16px 18px; display: grid; gap: 14px;
}
.head { display: flex; align-items: center; gap: 10px; }
.seal {
  width: 30px; height: 30px; flex: none; border-radius: 3px;
  background: var(--seal); color: #fff;
  font-family: var(--display); font-weight: 700; font-size: 17px;
  display: grid; place-items: center; line-height: 1;
}
h1 { margin: 0; font-family: var(--display); font-weight: 700; font-size: 19px; letter-spacing: 0.02em; text-wrap: balance; }
.sub { margin: 2px 0 0; font-size: 12px; color: var(--ink-soft); }
.body { display: grid; gap: 14px; }
.ctl { display: grid; gap: 4px; }
.ctl label { display: flex; justify-content: space-between; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
.ctl output { font-family: var(--mono); font-size: 12px; color: var(--ink); text-transform: none; letter-spacing: 0; font-variant-numeric: tabular-nums; }
input[type=range] { width: 100%; accent-color: var(--ink); margin: 0; }
input:focus-visible, button:focus-visible { outline: 2px solid var(--seal); outline-offset: 2px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.seg { display: flex; border: 1px solid var(--rule); border-radius: 3px; overflow: hidden; }
.seg button { font: 500 12px var(--body); padding: 6px 10px; border: 0; background: transparent; color: var(--ink-soft); cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
.btn { font: 500 12px var(--body); padding: 6px 12px; border: 1px solid var(--ink); border-radius: 3px; background: transparent; color: var(--ink); cursor: pointer; }
.btn:hover { background: var(--ink); color: var(--paper); }
.hint { font-size: 11px; color: var(--ink-soft); margin: 0; }
.stats { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
#toggle { display: none; }
@media (max-width: 560px) {
  .sheet { left: calc(8px + env(safe-area-inset-left, 0px)); right: calc(8px + env(safe-area-inset-right, 0px)); width: auto; max-width: none; bottom: calc(8px + env(safe-area-inset-bottom, 0px)); padding: 12px 14px; gap: 10px; }
  .sheet.collapsed .body { display: none; }
  #toggle { display: inline-block; margin-left: auto; }
}
</style>

<canvas id="scene" aria-label="3D view of an endless generated mountain landscape. Drag to orbit, scroll or pinch to zoom."></canvas>

<section class="sheet" id="sheet">
  <div class="head">
    <div class="seal" aria-hidden="true">遊</div>
    <div>
      <h1>Shan Shui Endless</h1>
      <p class="sub">Chunked simplex fBm, built as you travel</p>
    </div>
    <button class="btn" id="toggle" aria-expanded="true">Hide</button>
  </div>
  <div class="body">
    <div class="ctl">
      <label for="H">Hurst exponent H <output id="Hout"></output></label>
      <input type="range" id="H" min="0.1" max="0.95" step="0.05" value="0.75">
      <p class="hint">Each octave's amplitude falls by 2<sup>−H</sup>.</p>
    </div>
    <div class="ctl">
      <label for="widest">Widest mountain <output id="widestOut"></output></label>
      <input type="range" id="widest" min="1" max="12" step="0.5" value="4">
    </div>
    <div class="ctl">
      <label for="octaves">Octaves <output id="octOut"></output></label>
      <input type="range" id="octaves" min="2" max="9" step="1" value="7">
      <p class="hint">Finest detail ≈ <span class="stats" id="finest"></span>. Fewer octaves look smoother.</p>
    </div>
    <div class="ctl">
      <label for="relief">Relief <output id="reliefOut"></output></label>
      <input type="range" id="relief" min="0.1" max="1.0" step="0.05" value="0.45">
    </div>
    <div class="row">
      <div class="seg" role="group" aria-label="Palette">
        <button id="pInk" aria-pressed="true">Ink</button>
        <button id="pBlue" aria-pressed="false">Blue-green</button>
      </div>
      <button class="btn" id="fly" aria-pressed="true">Pause</button>
      <button class="btn" id="newSeed">New world</button>
    </div>
    <div class="ctl">
      <label for="speed">Travel speed <output id="speedOut"></output></label>
      <input type="range" id="speed" min="0.2" max="4" step="0.1" value="1">
    </div>
    <p class="hint stats" id="status"></p>
  </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
// ---------- Seeded generator (same as fbm2d.js) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 2D simplex noise (after Gustavson's public-domain reference) ----------
// A pure function of (x, y) and the seed's permutation table: that is what makes chunks join seamlessly.
const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
let perm = new Uint8Array(512);
function seedNoise(seed) {
  const r = mulberry32(seed), p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
function simplex2(xin, yin) {
  const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
  const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0, tt, g;
  tt = 0.5 - x0*x0 - y0*y0; if (tt > 0) { g = GRAD[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt*tt*(g[0]*x0 + g[1]*y0); }
  tt = 0.5 - x1*x1 - y1*y1; if (tt > 0) { g = GRAD[perm[ii+i1 + perm[jj+j1]] & 7]; tt *= tt; n += tt*tt*(g[0]*x1 + g[1]*y1); }
  tt = 0.5 - x2*x2 - y2*y2; if (tt > 0) { g = GRAD[perm[ii+1 + perm[jj+1]] & 7]; tt *= tt; n += tt*tt*(g[0]*x2 + g[1]*y2); }
  return 70 * n;                                   // roughly in [-1, 1]
}

// ---------- fBm by octave summation ----------
// Octave o has frequency f0·2^o and amplitude 2^(−H·o): the same power law as the spectral method,
// but only over the octaves summed. A per-octave rotation and offset hide the noise lattice's axis alignment.
const KM_PER_UNIT = 4;
const state = { H: 0.75, widestKm: 4, octaves: 7, relief: 0.45, seed: 42, palette: 'ink', flying: true, speed: 1 };
const ROT = Array.from({ length: 12 }, (_, o) => { const a = o * 0.83; return [Math.cos(a), Math.sin(a), o * 17.3, o * -9.1]; });
let ampNorm = 1;
function updateNorm() { ampNorm = 0; for (let o = 0; o < state.octaves; o++) ampNorm += Math.pow(2, -state.H * o); }
function height01(x, z) {
  const f0 = KM_PER_UNIT / state.widestKm;       // cycles per scene unit for the widest feature
  let sum = 0, f = f0, a = 1;
  const gain = Math.pow(2, -state.H);
  for (let o = 0; o < state.octaves; o++) {
    const [c, s, ox, oy] = ROT[o];
    const u = (x * c - z * s) * f + ox, v = (x * s + z * c) * f + oy;
    sum += a * simplex2(u, v);
    f *= 2; a *= gain;
  }
  const h = 0.5 + 0.85 * sum / ampNorm;
  return Math.min(1, Math.max(0, h));
}

// ---------- Scene ----------
const $ = id => document.getElementById(id);
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 40);
camera.position.set(0, 1.1, 2.6);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.15, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 0.4; controls.maxDistance = 6;
scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7570, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-1.5, 1.2, 0.6);
scene.add(sun);

const CHUNK = 1;          // scene units per chunk (4 km)
const RES = 64;           // segments per chunk side (~62 m per sample)
const RADIUS = 6;         // chunks kept around the viewer
const BUILD_PER_FRAME = 2;
const chunks = new Map(); // "cx,cz" -> mesh
const material = new THREE.MeshLambertMaterial({ vertexColors: true });

function cssColor(name) { return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim()); }
function applyTheme() {
  const bg = cssColor('--paper');
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, RADIUS * CHUNK * 0.35, RADIUS * CHUNK * 0.95);   // hides the chunk edge
}

const PALETTES = {
  ink:  [[0.0, '#c9ccc2'], [0.35, '#9ca29a'], [0.65, '#5e6661'], [1.0, '#22282a']],
  blue: [[0.0, '#c8c3a4'], [0.3, '#8fa58a'], [0.6, '#3f7a74'], [0.85, '#2b5a72'], [1.0, '#2a3e4f']]
};
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function ramp(stops, t, out) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0] || i === stops.length - 1) {
      const [t0, c0] = stops[i-1], [t1, c1] = stops[i];
      const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      return out.copy(tmpA.set(c0)).lerp(tmpB.set(c1), f);
    }
  }
}

// One chunk: heights, normals by finite differences of the global function (so lighting matches across
// seams), and colours by height with steep slopes darkened.
function buildChunk(cx, cz) {
  const n = RES + 1, step = CHUNK / RES;
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
  const relief = state.relief, stops = PALETTES[state.palette], c = new THREE.Color();
  const e = step;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + i * step, z = z0 + j * step, k = (j * n + i) * 3;
    const h = height01(x, z);
    pos[k] = x; pos[k+1] = h * relief; pos[k+2] = z;
    const dx = (height01(x + e, z) - height01(x - e, z)) * relief / (2 * e);
    const dz = (height01(x, z + e) - height01(x, z - e)) * relief / (2 * e);
    const len = Math.hypot(dx, 1, dz);
    const ny = 1 / len;
    nor[k] = -dx / len; nor[k+1] = ny; nor[k+2] = -dz / len;
    ramp(stops, h, c);
    c.multiplyScalar(1 - 0.45 * Math.min(1, (1 - ny) * 1.6));
    col[k] = c.r; col[k+1] = c.g; col[k+2] = c.b;
  }
  const idx = new Uint32Array(RES * RES * 6);
  let p = 0;
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    const a = j * n + i, b = a + 1, d = a + n, f = d + 1;
    idx[p++] = a; idx[p++] = d; idx[p++] = b;
    idx[p++] = b; idx[p++] = d; idx[p++] = f;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return new THREE.Mesh(geo, material);
}

function clearChunks() {
  for (const m of chunks.values()) { scene.remove(m); m.geometry.dispose(); }
  chunks.clear();
}

// Keep the set of chunks within RADIUS of the viewer: build missing ones nearest-first, drop far ones.
function updateChunks() {
  const ccx = Math.floor(controls.target.x / CHUNK), ccz = Math.floor(controls.target.z / CHUNK);
  const wanted = [];
  for (let dz = -RADIUS; dz <= RADIUS; dz++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
    const d2 = dx*dx + dz*dz;
    if (d2 > RADIUS * RADIUS) continue;
    const key = (ccx + dx) + ',' + (ccz + dz);
    if (!chunks.has(key)) wanted.push([d2, ccx + dx, ccz + dz, key]);
  }
  wanted.sort((a, b) => a[0] - b[0]);
  for (let w = 0; w < Math.min(BUILD_PER_FRAME, wanted.length); w++) {
    const [, cx, cz, key] = wanted[w];
    const m = buildChunk(cx, cz); scene.add(m); chunks.set(key, m);
  }
  for (const [key, m] of chunks) {
    const [cx, cz] = key.split(',').map(Number);
    if ((cx - ccx) ** 2 + (cz - ccz) ** 2 > (RADIUS + 1) ** 2) { scene.remove(m); m.geometry.dispose(); chunks.delete(key); }
  }
  $('status').textContent = chunks.size + ' chunks live · built ' + built + ' · position ' +
    (controls.target.z * -KM_PER_UNIT).toFixed(1) + ' km';
}
let built = 0;
const _build = buildChunk;
buildChunk = (cx, cz) => { built++; return _build(cx, cz); };

// ---------- Travel ----------
// The viewer glides toward −z; the camera and its orbit target move together so dragging still works.
const clock = new THREE.Clock();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (state.flying) {
    const dz = -0.12 * state.speed * dt;
    camera.position.z += dz; controls.target.z += dz;
  }
  // Keep the view above the ground under the target.
  const ground = height01(controls.target.x, controls.target.z) * state.relief;
  controls.target.y += (ground + 0.08 - controls.target.y) * Math.min(1, dt * 2);
  controls.update();
  updateChunks();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- Controls ----------
function syncLabels() {
  $('Hout').textContent = state.H.toFixed(2);
  $('widestOut').textContent = '≈ ' + state.widestKm + ' km';
  $('octOut').textContent = state.octaves;
  const finestM = state.widestKm * 1000 / Math.pow(2, state.octaves - 1);
  $('finest').textContent = finestM >= 1000 ? (finestM / 1000).toFixed(1) + ' km' : Math.round(finestM) + ' m';
  $('reliefOut').textContent = (state.relief * KM_PER_UNIT).toFixed(1) + ' km';
  $('speedOut').textContent = state.speed.toFixed(1) + '×';
}
let pending = null;
function regenerate() { clearTimeout(pending); pending = setTimeout(() => { updateNorm(); clearChunks(); }, 80); }
function bindRange(id, key, rebuild = true) {
  $(id).addEventListener('input', e => { state[key] = +e.target.value; syncLabels(); if (rebuild) regenerate(); });
}
bindRange('H', 'H'); bindRange('widest', 'widestKm'); bindRange('octaves', 'octaves'); bindRange('relief', 'relief');
bindRange('speed', 'speed', false);
function seg(onId, offId, apply) {
  $(onId).addEventListener('click', () => {
    $(onId).setAttribute('aria-pressed', 'true'); $(offId).setAttribute('aria-pressed', 'false'); apply(); clearChunks();
  });
}
seg('pInk', 'pBlue', () => state.palette = 'ink');
seg('pBlue', 'pInk', () => state.palette = 'blue');
$('fly').addEventListener('click', () => {
  state.flying = !state.flying;
  $('fly').textContent = state.flying ? 'Pause' : 'Travel';
  $('fly').setAttribute('aria-pressed', String(state.flying));
});
$('newSeed').addEventListener('click', () => { state.seed = 1 + Math.floor(Math.random() * 99999); seedNoise(state.seed); clearChunks(); });
$('toggle').addEventListener('click', () => {
  const s = $('sheet'), collapsed = s.classList.toggle('collapsed');
  $('toggle').textContent = collapsed ? 'Show' : 'Hide';
  $('toggle').setAttribute('aria-expanded', String(!collapsed));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

if (reduceMotion) { state.flying = false; $('fly').textContent = 'Travel'; $('fly').setAttribute('aria-pressed', 'false'); }
seedNoise(state.seed); updateNorm(); syncLabels(); applyTheme(); resize(); loop();
</script>
```
