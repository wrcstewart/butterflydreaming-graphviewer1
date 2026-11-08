// Extracted verbatim from AV/fractal-terrain-methods.md section 11.3 on 2026-11-08.
// Not retyped: lifted programmatically from the document so the two cannot
// drift apart silently. If this file is edited, say so there too.
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
