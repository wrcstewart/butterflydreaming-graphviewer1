// trianglescan_fft.js — 2026-11-07. The directional power spectrum of a
// triangle-scan field, kept because it is the only measure in this work that
// saw the streaking correctly.
//
// WHY IT IS HERE AND THE ELONGATION RATIO IS NOT. Elongation — the along/across
// variogram ratio — reads 1.00 for a field streaked on BOTH diagonals and 1.00
// again for one streaked on the AXES. Any statistic that is a ratio between two
// of the directions in question goes blind the moment the structure leaves both,
// and it misled this work twice: four-corner averaging and the sideways fan both
// looked like cures by that figure and were not.
//
// TWO CONDITIONS, learned the hard way. A wavevector at angle t means crests at
// t+90, and reading one for the other is an easy mistake to make twice — so the
// labelling is CALIBRATED against synthetic fields of known stripe direction
// before any result is believed. And each direction is compared against the
// ISOTROPIC MEAN rather than against another direction.
//
//   node trianglescan_fft.js
//
// 2D power spectrum of the triangle-scan field, binned by DIRECTION.
// Structure parallel to a line in the image shows as energy concentrated
// PERPENDICULAR to it in frequency space, so a directional histogram of power
// says at once whether the field is streaked and along which axes.
global.self = global;
const mod = require('/Users/williamstewart2/butterflydreaming_graphviewer1/lib/lindenmayer-1.5.4.js');
const L = global.LSystem || mod;
const TS = require('/Users/williamstewart2/butterflydreaming_graphviewer1/trianglescan_scan.js');

// in-place radix-2 FFT
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i+k], ui = im[i+k];
        const vr = re[i+k+len/2]*cr - im[i+k+len/2]*ci;
        const vi = re[i+k+len/2]*ci + im[i+k+len/2]*cr;
        re[i+k] = ur+vr; im[i+k] = ui+vi;
        re[i+k+len/2] = ur-vr; im[i+k+len/2] = ui-vi;
        const nr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nr;
      }
    }
  }
}
// power spectrum of an S x S window, mean removed and a Hann taper applied so
// the window edges do not spray energy across every direction
function power2d(h, N, S) {
  const o = Math.floor((N - S) / 2);
  const re = [], im = [];
  let mean = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) mean += h[(y+o)*N + x+o];
  mean /= S*S;
  const han = i => 0.5 - 0.5*Math.cos(2*Math.PI*i/(S-1));
  for (let y = 0; y < S; y++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let x = 0; x < S; x++) r[x] = (h[(y+o)*N + x+o] - mean) * han(x) * han(y);
    fft(r, m, false);
    re.push(r); im.push(m);
  }
  for (let x = 0; x < S; x++) {
    const r = new Float64Array(S), m = new Float64Array(S);
    for (let y = 0; y < S; y++) { r[y] = re[y][x]; m[y] = im[y][x]; }
    fft(r, m, false);
    for (let y = 0; y < S; y++) { re[y][x] = r[y]; im[y][x] = m[y]; }
  }
  const P = [];
  for (let y = 0; y < S; y++) { const row = new Float64Array(S);
    for (let x = 0; x < S; x++) row[x] = re[y][x]*re[y][x] + im[y][x]*im[y][x];
    P.push(row); }
  return P;
}
// power by direction: bin every frequency bin by the angle of its wavevector
function byDirection(P, S, bins) {
  const acc = new Float64Array(bins), cnt = new Float64Array(bins);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x <= S/2 ? x : x - S, fy = y <= S/2 ? y : y - S;
    const r = Math.hypot(fx, fy);
    if (r < 3 || r > S/2 - 2) continue;        // skip DC and the corners
    let a = Math.atan2(fy, fx); if (a < 0) a += Math.PI;
    const b = Math.min(bins-1, Math.floor(a / Math.PI * bins));
    acc[b] += P[y][x]; cnt[b]++;
  }
  const out = [];
  for (let b = 0; b < bins; b++) out.push(cnt[b] ? acc[b]/cnt[b] : 0);
  const mean = out.reduce((p,q)=>p+q,0)/bins;
  return out.map(v => v/mean);
}

const ls = new L({axiom:'X', productions:{X:'<>+>XYX+',Y:'XZ<-YZ-+',Z:'<ZZZ>-'}});
ls.iterate(10);
const G = 0.09, T = {'+':1,'-':-1,'>':G,'<':-G,'=':0};
let seq = []; for (const c of ls.getString()) if (c in T) seq.push(T[c]);
const m = seq.reduce((a,b)=>a+b,0)/seq.length;
const bal = seq.map(v => v - m);
const N = 257, steps = 2*(N-1), S = 128;
const maxAbs=(a,K)=>{let s=0,mm=0;for(let i=0;i<K&&i<a.length;i++){s+=a[i];const v=Math.abs(s);if(v>mm)mm=v;}return mm;};
const dh = 1/Math.max(maxAbs(bal, Math.min(steps, bal.length)), 1e-9);
const off = Math.floor(0.58*bal.length);


// A wavevector at angle t means crests running PERPENDICULAR to it, so the
// direction the STRUCTURE runs is t + 90. Relabelled, because reading the
// wavevector angle as the structure angle is an easy mistake to make twice.
const BINS = 12;
console.log('POWER BY THE DIRECTION THE STRUCTURE RUNS (1.00 = isotropic)');
console.log('45 deg is the MAIN diagonal (u=v), 135 deg the ANTI-diagonal.');
console.log('0 and 90 are the u and v axes.');
console.log();
let head = '  field                    ';
for (let b = 0; b < BINS; b++) {
  const struct = (Math.round(180*(b+0.5)/BINS) + 90) % 180;
  head += String(struct).padStart(6);
}
console.log(head + '      worst');
const cases = [
  ['one corner, stretch 1  ', () => TS.scanField(N, bal, 0.5, dh, true, 0, false, off, 1).h],
  ['one corner, stretch 16 ', () => TS.scanField(N, bal, 0.5, dh, true, 0, false, off, 16).h],
  ['four corners, stretch 1 ', () => TS.scanFourCorners(N, bal, 0.5, dh*2, true, 0, false, off, 1).h],
  ['four corners, stretch 16', () => TS.scanFourCorners(N, bal, 0.5, dh*2, true, 0, false, off, 16).h],
];
for (const [nm, f] of cases) {
  const d = byDirection(power2d(f(), N, S), S, BINS);
  console.log('  ' + nm.padEnd(25) + d.map(v=>v.toFixed(2).padStart(6)).join('') +
    '   ' + Math.max(...d).toFixed(2));
}
console.log();
console.log('the two diagonal columns are 38+90=128 -> 45ish, and 143+90=53 -> the other.');
console.log('read them as: how much more power than isotropic runs along each diagonal.');
