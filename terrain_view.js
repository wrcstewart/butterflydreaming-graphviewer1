// terrain_view.js — 2026-11-08. The shared view layer for the terrain pages.
//
// ONE COPY, for the same reason terrain_metrics.js is one copy. Three pages are
// planned on the three methods in AV/fractal-terrain-methods.md, and this repo
// has already paid for duplication twice: the triangle-scan work put a copy of
// its scan in the test page and spent a round testing the copy instead of the
// code, and two copies of music_module.html diverged. The colour schemes, the
// elevation ramp, the camera and the legend belong in one file.
//
// WHAT IS DELIBERATE HERE, rather than incidental:
//
//   NOTHING IS CARRIED BY HUE ALONE. The author has reduced colour vision, so
//   lighting carries the relief and every scheme keeps a bright surface against
//   a darker bounce. The sea scheme inverts the pattern on purpose — the
//   surface carries the colour and sits darker than the sky, as water does.
//
//   THE ELEVATION RAMP IS LUMINANCE-MONOTONE BY CONSTRUCTION. A naive rainbow
//   is the worst possible ramp for reduced colour vision: measured, its
//   luminance runs 0.202, 0.298, 0.615, 0.798, 0.704, 0.676, 0.685, 0.717,
//   0.482, 0.166, 0.070 — it peaks at yellow-green and falls off a cliff into
//   blue, so two different elevations share a brightness and the eye cannot
//   order them. Here the lightness at each hue is SOLVED by bisection so that
//   relative luminance is linear in elevation, 0.05 through to 0.42. The map is
//   then readable twice over: by hue, and by brightness.
//
//   THE SUN DEFAULTS LOW, and the pages should keep that. Lambert shading
//   sensitivity goes as grade x cot(elevation), so a 12-degree sun shows a
//   grade that an overhead sun flattens. It is the only lever that makes
//   shallow relief legible.
//
//   HEIGHTS ARE NEVER RESCALED PER FIELD. The vertical control is one fixed
//   multiplier. On an earlier page a normalising step divided a delta control
//   out entirely and the slider looked unwired — delta 1 and delta 100 differed
//   by 1.1e-15 — so the author's instruction is that no page normalises. The
//   cost is that relief genuinely varies between settings, which is why
//   frameShare() exists and why every page reports it.

export const SCHEMES = {
  grey:       { bg:0xffffff, surface:0xcfcdc4, sky:0xffffff, bounce:0x9a9a92,
                sun:0xffffff, hemi:0.55, sunI:2.3, rough:0.95 },
  whiteblue:  { bg:0xbcd4ec, surface:0xf8fbff, sky:0xe4eefa, bounce:0x6f8aa8,
                sun:0xfffdf6, hemi:0.75, sunI:2.0, rough:0.98 },
  whiteolive: { bg:0xa9a67a, surface:0xfbfaf3, sky:0xeeead6, bounce:0x62653a,
                sun:0xfff9ec, hemi:0.70, sunI:2.1, rough:0.97 },
  sea:        { bg:0x9cc4e8, surface:0x47a39a, sky:0xd4e6f7, bounce:0x123f4a,
                sun:0xfffdf4, hemi:0.60, sunI:2.4, rough:0.42, metal:0.10 },
  spectrum:   { bg:0x33332f, surface:0xffffff, sky:0xffffff, bounce:0xffffff,
                sun:0xffffff, hemi:0.90, sunI:1.1, rough:0.98, byElevation:true },
  // Vegetation by real altitude. The lighting stays neutral and fairly flat so
  // the colour carries the altitude rather than competing with shading, but the
  // sun still has to model relief — hence a moderate hemi rather than the
  // spectrum scheme's near-ambient 0.90.
  alpine:     { bg:0xb9cfe2, surface:0xffffff, sky:0xdce8f2, bounce:0x6e7466,
                sun:0xfff8e8, hemi:0.55, sunI:2.0, rough:0.92, byAltitude:true },
};
// A dark mark that reads by luminance against every scheme's surface — worst
// case measured 5.0:1, on the sea.
export const MARK_COLOUR = 0x0d2060;

const RAMP_N = 256;
export const RAMP = (() => {
  const lum = (r, g, b) => {
    const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const hsl = (h, sat, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * sat, hp = h / 60, x = c * (1 - Math.abs(hp % 2 - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; } else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
    const m = l - c / 2;
    return [r + m, g + m, b + m];
  };
  // 0.05 to 0.42, chosen by measurement rather than taste. Pushing the top to
  // 0.72 gives the strongest brightness ordering, 7.7:1 end to end, but drives
  // hue 240 to #dadafe — saturation 0.14, effectively white, not the blue that
  // was asked for. Dropping it to 0.18 gives a proper #6161fb but only 2.3:1,
  // too little to order by. At 0.42 the ramp holds saturation 0.97 through red,
  // orange, yellow, green and cyan, desaturates only for the last blue step,
  // and still runs 4.7:1 end to end.
  const LO = 0.05, HI = 0.42, out = [];
  for (let i = 0; i < RAMP_N; i++) {
    const t = i / (RAMP_N - 1), h = 240 * t, target = LO + (HI - LO) * t;
    let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) {
      const m = (lo + hi) / 2, c = hsl(h, 0.95, m);
      if (lum(c[0], c[1], c[2]) < target) lo = m; else hi = m;
    }
    out.push(hsl(h, 0.95, (lo + hi) / 2));
  }
  return out;
})();
export const rampAt = t =>
  RAMP[Math.max(0, Math.min(RAMP_N - 1, Math.round(t * (RAMP_N - 1))))];

// ── TREE LINE, SNOW LINE AND AN ALPINE RAMP ─────────────────────────────
// The author: *"Can you work out the hights in metres and define a tree line
// and a snow line - mid year say. Then have green merging to brown above tree
// line with a fairly sharp above snow line in white."*
//
// MID YEAR MEANS SUMMER, so the snow line here is the SUMMER snow line — the
// regional or orographic one, the highest it gets in the year and the altitude
// above which snow persists through the melt season. A winter snow line sits
// roughly a kilometre lower and would put most of these scenes under snow, so
// the assumption matters and is stated rather than buried.
//
// BOTH LINES DEPEND ON LATITUDE FAR MORE THAN ON ANYTHING ELSE, so latitude is
// the control and the lines are interpolated from observed values rather than
// from a formula. A cosine law was tried first and is wrong in the subtropics:
// it misses the fact that the snow line PEAKS around 20-25 degrees, where the
// dry subtropical highs leave the Andes and Himalaya snow-free to well over
// 5,000 m — higher than at the equator. These are approximate regional figures,
// good to a few hundred metres, and local climate moves them more than that:
//
//   lat      0     20     30     40     45     50     60     70     75
//   tree  3900   4000   3400   2700   2200   1800   1100    350      0
//   snow  4900   5300   4800   3600   2900   2500   1500    800    400
//
// Checkpoints against places: 46 degrees gives about 2,150 m and 2,860 m, which
// is the Alps (observed roughly 2,200 and 2,900); 60 degrees gives 1,100 m and
// 1,500 m, which is southern Norway; past about 73 degrees the tree line
// reaches zero and there are no trees at all, which is correct for the high
// Arctic.
const TREE_LINE = [[0,3900],[10,3900],[20,4000],[30,3400],[40,2700],[45,2200],
                   [50,1800],[55,1400],[60,1100],[65,700],[70,350],[75,0]];
const SNOW_LINE = [[0,4900],[10,4800],[20,5300],[30,4800],[40,3600],[45,2900],
                   [50,2500],[55,1900],[60,1500],[65,1100],[70,800],[75,400],[80,200]];
function interpTable(table, lat) {
  const x = Math.abs(lat);
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1], [x1, y1] = table[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}
export const treeLineM = lat => Math.max(0, interpTable(TREE_LINE, lat));
// Kept above the tree line by construction: trees cannot grow above permanent
// snow, and an inverted pair would colour a brown band on top of a white one.
export const snowLineM = lat =>
  Math.max(interpTable(SNOW_LINE, lat), treeLineM(lat) + 150);

// The ramp. GREEN TO BROWN IS A HUE DISTINCTION AND THEREFORE NOT ENOUGH on its
// own: the author has reduced colour vision, so every stop below also steps up
// in LUMINANCE, monotonically from 0.04 in the valley to 0.88 on the snow.
// Altitude is then legible twice over — by hue for the eye that has it, and by
// brightness for the ordering. Measured relative luminances are in the comment
// against each stop, and a test asserts the sequence is increasing.
const ALPINE_STOPS = [
  // [position, r, g, b]  position is relative to the bands described below
  [0.00, 0x27, 0x40, 0x1c],   // valley floor, deep green          lum 0.040
  [0.55, 0x3e, 0x5a, 0x26],   // conifer slope                     lum 0.080
  [1.00, 0x6b, 0x6b, 0x34],   // at the tree line, olive           lum 0.145
  [1.35, 0x94, 0x7e, 0x54],   // above it: scrub and soil, brown   lum 0.219
  [1.75, 0x9d, 0x93, 0x82],   // bare rock, grey-brown             lum 0.300
  [2.00, 0xb4, 0xad, 0x9e],   // scree just under the snow         lum 0.420
  [2.04, 0xf2, 0xf5, 0xf7],   // snow — a deliberate hard step     lum 0.880
];
// Position 0 is the valley floor, 1 is the tree line, 2 is the snow line, and
// the jump from 2.00 to 2.04 is the "fairly sharp" transition that was asked
// for: about 2% of the floor-to-snowline span, so a few tens of metres on these
// scenes. Not a true step, because an abrupt one aliases into a ragged edge on
// a triangle mesh; this is sharp enough to read as a snowline and still smooth.
export function alpineColour(aM, floorM, treeM, snowM) {
  let pos;
  if (aM <= treeM) {
    const span = Math.max(1, treeM - floorM);
    pos = Math.max(0, (aM - floorM) / span);
  } else {
    const span = Math.max(1, snowM - treeM);
    pos = 1 + (aM - treeM) / span;
  }
  if (pos >= ALPINE_STOPS[ALPINE_STOPS.length - 1][0]) {
    const c = ALPINE_STOPS[ALPINE_STOPS.length - 1];
    return [c[1] / 255, c[2] / 255, c[3] / 255];
  }
  for (let i = 1; i < ALPINE_STOPS.length; i++) {
    if (pos <= ALPINE_STOPS[i][0]) {
      const a = ALPINE_STOPS[i - 1], b = ALPINE_STOPS[i];
      const u = (pos - a[0]) / (b[0] - a[0] || 1);
      return [(a[1] + (b[1] - a[1]) * u) / 255,
              (a[2] + (b[2] - a[2]) * u) / 255,
              (a[3] + (b[3] - a[3]) * u) / 255];
    }
  }
  const c = ALPINE_STOPS[0];
  return [c[1] / 255, c[2] / 255, c[3] / 255];
}
export function relLuminance(r, g, b) {
  const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
// The stops, for a test to check the luminance ordering.
export const alpineStops = () => ALPINE_STOPS.map(c => ({
  pos: c[0], rgb: [c[1] / 255, c[2] / 255, c[3] / 255],
  lum: relLuminance(c[1] / 255, c[2] / 255, c[3] / 255),
}));

// The frame is 2 units across, so this is the share of it the relief fills.
// Under about 5% nothing can be judged, however correct the arithmetic.
// Takes the EFFECTIVE vertical from verticalFor(), not the raw slider.
export const frameShare = (relief, vxEff) => 100 * relief * vxEff / 2;

// ── GIVING HEIGHT A SCALE OF ITS OWN ────────────────────────────────────
// The author, on the spectral page: *"slider ground covered doesnt seems to do
// anything"*. It did not, and the reason was in the arithmetic rather than the
// wiring. The pages had been deriving metres AS relief x vx x km/2, which makes
// the drawing true-to-scale by construction — so widening the ground scaled
// both axes together, the shape could not change, and the control could only
// ever relabel the axis. A second instance of a working slider that looks dead,
// after the delta slider that a normalising step had divided out.
//
// The fix is to pin ONE fixed constant: one dimensionless height unit is
// METRES_PER_UNIT metres, always. Then the two controls separate and both do
// something visible and physical:
//
//   vertical  sets how tall the mountains are IN METRES, independent of km
//   km        sets how much ground is in the frame, so widening it flattens
//             the view — which is what looking at more land actually does
//
// and the surface is drawn true to scale, so a grade on screen is a real grade.
// 10,000 m per unit is chosen so the shipped defaults land on about 2,100 m of
// relief across 20 km, which is a real mountain range rather than a guess.
//
// This is NOT a normalisation. It is one constant, identical for every field,
// so H and the cutoff still change the height exactly as much as they really
// do — which is the thing the standing instruction protects.
export const METRES_PER_UNIT = 10000;
// 2 frame units of width = km x 1000 metres, so true scale needs this.
export const verticalFor = (vxSlider, km) =>
  vxSlider * 2 * METRES_PER_UNIT / (Math.max(0.001, km) * 1000);
// Height in metres, which depends on the vertical control ALONE. The km term
// cancels out of the legend's metre labels for the same reason.
export const reliefMetres = (relief, vxSlider) => relief * vxSlider * METRES_PER_UNIT;

// ── THE VIEWER ──────────────────────────────────────────────────────────
// Holds the renderer, camera, lights and one mesh PER TILE. Tiles exist because
// the noise method's claim is that independently generated chunks agree along
// their shared edges, and drawing them as separate meshes is what makes that
// visible rather than asserted — a disagreement would open a crack. A
// single-field page passes one tile covering the whole frame.
//
// `read` is a callback returning the current control values, so this module
// never reaches into a page's DOM by id.
export function makeViewer({ THREE, canvas, stage, legend, onError, read }) {
  if (!THREE) throw new Error('three.js is not loaded');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9a92, 0.55); scene.add(hemi);

  let tiles = [];          // { mesh, wire, h, n }
  let lo = 0, hi = 1;      // the elevation range ACROSS ALL TILES, so the ramp
                           // and the legend are comparable between them
  let az = -0.6, el = 0.45, dist = 2.4, dragging = false, lx = 0, ly = 0;

  function fail(msg) {
    if (onError) onError(msg);
    console.error(msg);
  }
  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = Math.max(stage.clientWidth / Math.max(stage.clientHeight, 1), 0.01);
    camera.updateProjectionMatrix();
  }
  function place() {
    const o = read();
    camera.position.set(dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el),
                        dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(0, 0, 0);
    const se = (o.sun || 12) * Math.PI / 180, sa = (o.sunaz || 135) * Math.PI / 180;
    sun.position.set(Math.cos(se) * Math.sin(sa), Math.sin(se), Math.cos(se) * Math.cos(sa));
    renderer.render(scene, camera);
  }

  canvas.addEventListener('pointerdown', e => {
    dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId);
  });
  // pointerup, not click: setPointerCapture suppresses click in Safari, which
  // cost a round on an earlier page.
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    az -= (e.clientX - lx) * 0.006; el += (e.clientY - ly) * 0.005;
    el = Math.max(0.05, Math.min(1.5, el));
    lx = e.clientX; ly = e.clientY; place();
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    dist = Math.max(0.6, Math.min(8, dist * (1 + Math.sign(e.deltaY) * 0.08)));
    place();
  }, { passive: false });
  window.addEventListener('resize', () => { resize(); place(); });
  resize();

  function clear() {
    for (const t of tiles) {
      scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
      if (t.wire) { scene.remove(t.wire); t.wire.geometry.dispose(); t.wire.material.dispose(); }
    }
    tiles = [];
  }

  // THE SEAM BETWEEN TILES, and why it needs more than matching heights.
  //
  // The author: *"There are two stiches lines down the centres - dividing scene
  // into 4 parts"* — at the 2x2 default, exactly the tile boundaries. The
  // heights are not the problem: the edge test reads max difference 0, so the
  // surfaces meet perfectly and there is no crack. What differs is the NORMALS.
  // computeVertexNormals() averages the faces of ITS OWN geometry, so a vertex
  // on a tile edge is averaged from triangles on one side only, and the vertex
  // in the neighbouring tile at the identical position gets a different normal
  // from its own half. Lambert shading then steps across the join and draws a
  // line — and the low 12-degree sun this page defaults to makes it as obvious
  // as possible.
  //
  // So normals are computed ANALYTICALLY from the height field instead, using a
  // one-cell apron sampled across the boundary. Both tiles then derive the same
  // gradient at a shared vertex, from the same neighbouring ground, and the
  // seam disappears while the tiles stay genuinely independent meshes — which
  // is the whole point of drawing them separately. This is what a real chunked
  // terrain renderer does.
  //
  // PlaneGeometry's vertex iy*n + ix is at local (x, -y), and rotating -90
  // degrees about x maps local z to world y and local -y to world z. So a world
  // normal (nx, ny, nz) is the local vector (nx, -nz, ny), and for a height
  // field whose world normal is (-dh/dx, 1, -dh/dz) the local normal is
  // (-dh/dx, dh/dz, 1). Flat ground gives (0, 0, 1), which rotates to straight
  // up — the check that the signs are the right way round.
  function analyticNormals(t, vx) {
    const { hp, n, size } = t;
    if (!hp) { t.mesh.geometry.computeVertexNormals(); return; }
    const w = n + 2;                       // the padded row stride
    const d = size / (n - 1);              // world spacing between samples
    const attr = t.mesh.geometry.attributes.normal;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const pj = j + 1, pi = i + 1;
      const dhdx = (hp[pj * w + pi + 1] - hp[pj * w + pi - 1]) * vx / (2 * d);
      const dhdz = (hp[(pj + 1) * w + pi] - hp[(pj - 1) * w + pi]) * vx / (2 * d);
      const lx = -dhdx, ly = dhdz, lz = 1;
      const len = Math.hypot(lx, ly, lz) || 1;
      attr.setXYZ(j * n + i, lx / len, ly / len, lz / len);
    }
    attr.needsUpdate = true;
  }

  // specs: [{ h, n, cx, cz, size, hp }] where size is the tile's width in frame
  // units and (cx, cz) is its centre. PlaneGeometry's vertex iy*n + ix sits at
  // local (x, -y); rotating -90 degrees about x sends local z to world y and
  // local -y to world z, so row index j increases with world z and column index
  // i with world x. That is the same order as h[j*n + i], which is why no
  // remapping is needed — and why tiles line up instead of mirroring.
  function setTiles(specs) {
    try {
      clear();
      const o = read();
      const sch = SCHEMES[o.scheme] || SCHEMES.grey;
      lo = Infinity; hi = -Infinity;
      for (const sp of specs) for (const v of sp.h) { if (v < lo) lo = v; if (v > hi) hi = v; }
      if (!isFinite(lo)) { lo = 0; hi = 1; }
      for (const sp of specs) {
        const n = sp.n, size = sp.size;
        const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, sp.h[i] * o.vx);
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
        geo.computeVertexNormals();        // replaced below when an apron exists
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          color: 0xffffff, vertexColors: true,
          roughness: sch.rough, metalness: sch.metal || 0, side: THREE.DoubleSide }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(sp.cx, 0, sp.cz);
        scene.add(mesh);
        let wire = null;
        if (o.wire) {
          wire = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
            color: 0x55554e, wireframe: true, transparent: true, opacity: 0.16 }));
          wire.rotation.x = -Math.PI / 2;
          wire.position.copy(mesh.position);
          scene.add(wire);
        }
        const t = { mesh, wire, h: sp.h, n, hp: sp.hp, size };
        tiles.push(t);
        analyticNormals(t, o.vx);
      }
      applyScheme();
    } catch (e) {
      fail('could not build the surface\n\n' + (e && e.stack ? e.stack : String(e)));
    }
  }

  function paint() {
    const o = read();
    const sch = SCHEMES[o.scheme] || SCHEMES.grey;
    const span = (hi - lo) || 1;
    const bands = Math.max(0, Math.min(40, o.bands | 0));
    const base = new THREE.Color().setHex(sch.surface);
    // Altitude in metres from the field value. The floor of the view is the
    // datum, so a height h sits at baseM + (h - lo) x mPerUnit: that works for
    // any page, including the ones whose fields are not in [0, 1].
    const alt = o.altitude || {};
    const baseM = alt.baseM || 0;
    const mPerUnit = alt.mPerUnit || 0;
    const treeM = alt.treeM || 2200, snowM = alt.snowM || 2900;
    for (const t of tiles) {
      const attr = t.mesh.geometry.attributes.color;
      if (!attr) continue;
      if (sch.byAltitude) {
        for (let i = 0; i < attr.count; i++) {
          const aM = baseM + (t.h[i] - lo) * mPerUnit;
          const c = alpineColour(aM, baseM, treeM, snowM);
          attr.setXYZ(i, c[0], c[1], c[2]);
        }
      } else if (sch.byElevation) {
        for (let i = 0; i < attr.count; i++) {
          let v = (t.h[i] - lo) / span;
          if (bands > 0) v = Math.min(bands - 1, Math.floor(v * bands)) / (bands - 1 || 1);
          const c = rampAt(v);
          attr.setXYZ(i, c[0], c[1], c[2]);
        }
      } else {
        for (let i = 0; i < attr.count; i++) attr.setXYZ(i, base.r, base.g, base.b);
      }
      attr.needsUpdate = true;
    }
    drawLegend();
  }

  function applyScheme() {
    const o = read();
    const sch = SCHEMES[o.scheme] || SCHEMES.grey;
    scene.background = new THREE.Color(sch.bg);
    hemi.color.setHex(sch.sky); hemi.groundColor.setHex(sch.bounce); hemi.intensity = sch.hemi;
    sun.color.setHex(sch.sun); sun.intensity = sch.sunI;
    for (const t of tiles) {
      t.mesh.material.roughness = sch.rough;
      t.mesh.material.metalness = sch.metal || 0;
    }
    paint();
    place();
  }

  // Only rescales the geometry, so the vertical control tracks the hand instead
  // of rebuilding the field and re-running every measurement.
  function rescale() {
    const o = read();
    for (const t of tiles) {
      const pos = t.mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, t.h[i] * o.vx);
      pos.needsUpdate = true;
      // The gradient scales with the vertical, so the normals are recomputed
      // rather than left over from the previous height.
      if (t.hp) analyticNormals(t, o.vx);
      else t.mesh.geometry.computeVertexNormals();
      if (t.wire) {
        const wp = t.wire.geometry.attributes.position;
        for (let i = 0; i < wp.count; i++) wp.setZ(i, t.h[i] * o.vx);
        wp.needsUpdate = true;
      }
    }
    drawLegend();
    place();
  }

  function drawLegend() {
    if (!legend) return;
    const o = read();
    const sch = SCHEMES[o.scheme] || SCHEMES.grey;
    if (sch.byAltitude && tiles.length) {
      const alt = o.altitude || {};
      const baseM = alt.baseM || 0, mPerUnit = alt.mPerUnit || 0;
      const treeM = alt.treeM || 2200, snowM = alt.snowM || 2900;
      const topM = baseM + (hi - lo) * mPerUnit;
      const steps = 60, sw = [];
      for (let i = 0; i < steps; i++) {
        const aM = baseM + (topM - baseM) * (i + 0.5) / steps;
        const c = alpineColour(aM, baseM, treeM, snowM)
          .map(v => Math.round(255 * Math.max(0, Math.min(1, v))));
        sw.push('<i style="background:rgb(' + c.join(',') + ')"></i>');
      }
      // Marks where the two lines fall INSIDE this scene, which is the thing
      // worth knowing: a snow line above the highest peak means no snow, and
      // saying so beats leaving someone to wonder why the tops are brown.
      const inScene = m => m > baseM && m < topM;
      const rows = [];
      rows.push('<tr><td>' + Math.round(topM) + ' m  peak</td></tr>');
      rows.push('<tr><td>' + (inScene(snowM) ? '' : '(') + Math.round(snowM) +
                ' m  snow line' + (inScene(snowM) ? '' : ', above the peak)') + '</td></tr>');
      rows.push('<tr><td>' + (inScene(treeM) ? '' : '(') + Math.round(treeM) +
                ' m  tree line' + (inScene(treeM) ? '' : ', above the peak)') + '</td></tr>');
      rows.push('<tr><td>' + Math.round(baseM) + ' m  valley</td></tr>');
      legend.style.display = 'block';
      legend.innerHTML =
        '<div style="margin-bottom:5px"><b>altitude</b> — mid-year lines</div>' +
        '<div class="wrapbar"><div class="bar">' + sw.join('') + '</div>' +
        '<table>' + rows.join('') + '</table></div>';
      return;
    }
    if (!sch.byElevation || !tiles.length) { legend.style.display = 'none'; return; }
    // The heights are dimensionless, so metres are reported against the ground
    // covered — the only length on the page carrying a unit.
    const metres = (hi - lo) * o.vx * (o.km || 20) * 1000 / 2;
    const bands = Math.max(0, Math.min(40, o.bands | 0));
    const steps = bands > 0 ? bands : 64;
    const sw = [];
    for (let i = 0; i < steps; i++) {
      const t = bands > 0 ? i / (steps - 1 || 1) : (i + 0.5) / steps;
      const c = rampAt(t).map(v => Math.round(255 * Math.max(0, Math.min(1, v))));
      sw.push('<i style="background:rgb(' + c.join(',') + ')"></i>');
    }
    const ticks = [];
    for (let i = 4; i >= 0; i--) ticks.push('<tr><td>' + Math.round(metres * i / 4) + ' m</td></tr>');
    legend.style.display = 'block';
    legend.innerHTML =
      '<div style="margin-bottom:5px"><b>elevation</b>' +
      (bands > 0 ? ' — ' + bands + ' bands of ' + Math.round(metres / bands) + ' m'
                 : ' — continuous') + '</div>' +
      '<div class="wrapbar"><div class="bar">' + sw.join('') + '</div>' +
      '<table>' + ticks.join('') + '</table></div>';
  }

  return { setTiles, paint, applyScheme, place, rescale, drawLegend, fail,
           get range() { return { lo, hi }; },
           get tileCount() { return tiles.length; } };
}
