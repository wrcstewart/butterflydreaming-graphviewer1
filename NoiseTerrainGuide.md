# Noise terrain — how the scene is built, and what every control does

**2026-11-09.** A guide to `noise_terrain.html`, served at
`http://localhost:8080/noise_terrain.html`. This is Method C from
`AV/fractal-terrain-methods.md` plus four mechanisms and a second layer added on
top of it, and it is the best of the three terrain pages.

For the measured findings and the faults found along the way, see
`FractalTerrain_Notes.md` — its top section is the current state. To check that
any claim here still holds, run `node terrain_selftest.mjs`.

---

## 1. The one idea

**There is no stored map. Height is a function.**

```
height01(xKm, zKm)  →  a number in [0, 1]
```

It is a *pure* function of world position and seed: the same coordinates always
return the same height, with nothing remembered between calls. Everything the
page can do follows from that single property:

- **The world has no edge.** Chunk (0,0) and chunk (10000, −7000) are the same
  amount of work. Walking away and back returns the identical ground, asserted
  by the self-test.
- **Chunks need no stitching.** Two patches generated independently agree
  *exactly* where they meet, because both evaluate the same function at the same
  coordinates. The readout measures this at **max difference 0**, not "within a
  tolerance".
- **Detail can be added without moving anything.** More octaves is more detail
  at the same place — which is a working level-of-detail path (§7).

The cost is that the function must be evaluated for every vertex drawn, every
time. That is why the page is quick at 2×2 chunks and deliberate about going
larger.

---

## 2. How the scene is constructed

Six steps, in order.

### 2.1 Chunks, generated independently

The page asks the terrain for `k × k` chunks, each `chunkKm` across, each
sampled on a `res × res` grid — so `(res+1)²` heights per chunk, the extra row
and column being the shared edge. The default 2×2 of 4 km at 64 cells is 8 km of
ground in 16,900 samples.

Each chunk comes from its own `chunk(cx, cz)` call. **That is deliberate**: it is
the method's central claim under test, so the page gets its geometry the same way
a real streaming world would, rather than slicing up one big grid afterwards and
proving nothing.

### 2.2 The edge test

Before drawing, every pair of adjacent chunks is compared along its shared
boundary — `k=2` gives 4 pairs, `k=3` gives 12. The result appears on the
**shared edges** line. It reads exactly 0 with every control engaged.

At `k=1` there are no adjacent pairs, so the line says **not tested** rather than
reporting a pass from a test that never ran.

### 2.3 One mesh per chunk

Each chunk becomes its own `THREE.PlaneGeometry`, placed so the set tiles a frame
2 units wide. Separate meshes, again deliberately: if the heights disagreed, a
crack would open where they meet, and a single stitched surface would hide it.

### 2.4 Normals from an apron, not from the mesh

This is the one part that cannot be done per-chunk. `computeVertexNormals()`
averages only the triangles of *its own* geometry, so a vertex on a tile boundary
takes its normal from one side while its twin in the next tile takes a different
one. The heights match perfectly and the shading still creases — it showed as
*two stitch lines dividing the scene into four*.

So each chunk also carries a **one-cell apron**: the heights just *outside* its
own edges. Normals come from the height gradient across that apron, so both tiles
compute the same normal at a shared vertex — verified bit-identical. This is only
possible because `height01` is defined everywhere, which is the same property the
whole method rests on.

### 2.5 Colour in a vertex attribute

The surface colour lives in a per-vertex attribute and the material stays white,
because three.js *multiplies* material colour by vertex colour. Changing scheme
refills the attribute and does not rebuild the field.

One consequence matters: **a lit vertex colour is `colour × (sun + hemi)`, and
channels past 1.0 pin.** At a gain of 2.55 a brown renders as 255,229,110 — pale
cream — because red and green clip together and the result drifts yellow. The
alpine scheme therefore runs a deliberately tame exposure (sun 0.75, hemi 0.40,
gain 1.15). **In the one scheme where colour carries information, exposure is set
for colour fidelity, not for contrast.**

### 2.6 The metre scale

The field is dimensionless, so one fixed constant fixes everything else: **one
height unit is 10,000 m**. From that:

```
metre relief  = relief × mountain height × 10,000        (independent of km)
ground width  = chunks across × chunk size, in km
altitude      = valley floor + (h − lowest) × mountain height × 10,000
```

Because height has a scale of its own, the two controls separate and both do
something physical: **mountain height** sets how tall the mountains are in
metres, **chunk size and count** set how much ground is in frame — so widening
the ground flattens the view, as looking at more land does. The surface is drawn
true to scale between them, so an on-screen grade is a real grade.

---

## 3. How the noise is generated

`height01` runs the following in this order. Each stage is a control, so this is
also the map of what affects what.

```
  (x, z) in km
      │
  1.  warp ............ displace the sample point by a second, slower noise field
      │
  2.  stretch ......... divide x and z unequally  (area-preserving)
      │
  3.  octave sum ...... the mountains: 7 rotated simplex samples at doubling
      │                 frequency and 2^−H amplitude, each weighted by w
      │
  4.  ÷ norm .......... normalise to roughly [−1, 1]
      │
  5.  slow layer ...... a 2-octave swell, sampled at the UNWARPED position
      │
  6.  combine ......... baseShare·swell + (1−baseShare)·beltMask(swell)·mountains
      │
  7.  squash .......... hard clamp, or a soft knee, into [0, 1]
      ▼
  height in [0, 1]
```

### 3.1 The octave sum — the mountains

```
sum = Σ  aₒ · wₒ · simplex( rotateₒ(x/su, z/sv) · fₒ + offsetₒ )
       o
      fₒ = (1/widest) · 2ᵒ          amplitude  aₒ = (2^−H)ᵒ
```

- **`f₀ = 1/widest`, with coordinates in kilometres.** So the lowest octave's
  wavelength *is* the widest feature, and the finest detail is
  `widest / 2^(octaves−1)`. What governs the look is the **ratio of widest to
  the ground in view**: 4 km features across 8 km of ground gives two big
  features per side.
- **Each octave is rotated by 0.83 radians** and offset by `(17.3o, −9.1o)`.
  Simplex noise has a lattice, and both the rotation and the offsets exist to
  stop the octaves lining up on it. The readout's anisotropy figure is the check
  that this worked; it reads about 0.9, i.e. no detectable direction.
- **`gain = 2^−H`** is what makes the sum fractional Brownian motion. Note the
  H asked for is *not* the H delivered — see §6.
- **`norm = Σ gainᵒ`**, so the sum lands in roughly [−1, 1] whatever the octave
  count. With **stable zoom** on, that divisor is computed over a fixed budget
  instead, which is what makes adding octaves leave the coarse shape exactly
  where it was.

### 3.2 The four modifiers

Plain octave noise is statistically **homogeneous** — the same everywhere — so
every patch is equally rough and nothing distinguishes a plain from a range.
These break that, and they break *different* things:

| | what it breaks | how |
|---|---|---|
| **warp** | uniformity of *placement* | the sample point is displaced by a slower noise field before the octaves are summed, so ridges become sinuous and peaks stop being evenly scattered |
| **stretch** | *isotropy* | x and z are scaled unequally, elongating every feature along one axis. **Area-preserving** — √r one way, 1/√r the other — because stretching one axis alone just lowers the frequency along it and smooths the whole surface |
| **hetero** | uniformity of *roughness* | each octave's weight `w` is modulated by the **accumulated elevation** so far, so detail appears where the ground is already high and dies in the lows: rough peaks over smooth plains |
| **the slow layer** | the *scale* | adds a swell much larger than any mountain, which also decides where mountains grow at all |

`hetero`'s weight is normalised to average exactly 1 (`w = (1−h+h·elev)/(1−h/2)`),
so it *redistributes* detail rather than removing it. Without that divisor the
mean weight is `1−h/2` and the control simply smoothed the terrain.

**All the figures quoted for these three are measured against plain noise with
the slow layer OFF**, and that matters, because the belt overlaps with hetero.
The honest comparison is the correlation between a patch's roughness and its
height — which is what "rough peaks over smooth plains" actually means:

| | roughness-to-height correlation |
|---|---|
| plain noise | **0.008** — none at all, every patch equally rough |
| hetero 1, no belt | 0.439 |
| the belt, hetero 0 | **0.793** |
| the belt and hetero 1 | 0.831 |

**The belt is much the stronger mechanism**, because mountains only grow on the
swell's high ground, which ties roughness to height by construction. So at the
page's defaults hetero adds little — reach for it when you want rough peaks
*without* confining the mountains to a belt, which is a different landscape:
mountains everywhere, but only the high ones rugged.

### 3.2a Which mechanism to reach for

They are not interchangeable, and two of them cost something:

- Want **large-scale organisation** — ranges here, plains there? The **slow
  layer**. Nothing else supplies structure bigger than one mountain.
- Want **lineation**, ridge-and-valley country? **Stretch**. It is the only one
  that produces a direction, and it costs roughness (3.55 → 2.33 at 3:1) because
  a stretched axis has gentler gradients.
- Want **irregular placement**, sinuous ridges, uneven spacing? **Warp**. It
  costs the grain if you also want stretch.
- Want **rough summits over smooth ground, with no belt**? **Hetero**. Free of
  side effects — it keeps isotropy and does not reduce roughness.

### 3.3 The slow layer, and why it is one field doing two jobs

```
height = baseShare·swell  +  (1 − baseShare)·beltMask(swell)·mountains
```

The swell is two octaves of its own noise at wavelength `baseKm`, sampled at the
**unwarped, unstretched** position so the regional shape is not dragged about by
controls meant for the mountains.

It is used twice: as the gentle rolling ground *and* as the mask deciding where
mountains grow. So ranges stand on the high ground of the swell, its flanks carry
low-amplitude mountains — which is what a foothill is — and it keeps rolling
across the lows where no mountains grow at all. That also gets the geology right
for nothing: real ranges sit on uplifted ground rather than scattered at random.

The mask is a smoothstep: `u = (swell01 − (1−coverage))/foothills + 0.5`, clamped,
then `u²(3−2u)`. Smoothstep because it is flat at both ends, so the belt has no
crease at its edge.

### 3.4 The squash

`0.5 + 0.85·combined` is finally forced into [0, 1]. The original method uses a
**hard clamp**, and where a broad swell overshoots it the whole top is sheared off
into a dead-flat mesa — measured, 5.3% of the grid as a single region in one
corner at widest 16 km over 3 octaves. **Soft ceiling** replaces the corner with
a knee over the outer 12%, approaching the rail asymptotically and never reaching
zero gradient, so a swell stays curved however far it overshoots.

---

## 4. The controls

In panel order, as they appear down the page. `id` is given because it is what
the code and the self-test use.

### Surface — the mountains themselves

| control | id | range | default | purpose |
|---|---|---|---|---|
| **seed** | `seed` | integer ≥ 1 | 42 | Picks the world. Same seed, same terrain, for ever. Change it to get a different landscape with identical statistics. |
| **octaves** | `oct` | 1–12 | 7 | How many doublings of detail are summed. Sets the finest feature at `widest/2^(octaves−1)` — 62.5 m at the defaults. **Few octaves make the clamp bite much harder**, because less of the amplitude goes to detail that would break a flat top up. |
| **Hurst exponent H** | `H` | 0.30–0.95 | 0.75 | Roughness. Sets the octave gain to 2^−H, so high H means each finer octave contributes more and the surface is smooth and rolling; low H is rough and Brownian. Fractal dimension is 3 − H. |
| **widest feature** | `widest` | 1–32 km | 4 | The lowest octave's wavelength, and so the size of the largest mountain. **Judge it against the ground in view, not on its own.** Raising it coarsens everything equally rather than adding large structure — which is what the slow layer is for. |

### Two layers — swell and mountain belt

| control | id | range | default | purpose |
|---|---|---|---|---|
| **swell wavelength** | `bk` | 2–60 km | 8 | The size of the regional uplift. Measured, **about the width of the view works best** — one belt in frame, continuing past the edge. At 40 km across an 8 km view it flattens into a ramp and the belt structure is lost. |
| **swell share** | `bs` | 0–0.80 | 0.35 | How much of the total amplitude the swell takes. **0 turns the layer off entirely**, and with cover at 1 and soft ceiling off that reproduces the document's plain method bit for bit. |
| **mountain cover** | `cov` | 0.15–1 | 0.45 | The share of ground carrying mountains; 1 puts them everywhere as before. Noise is bell-shaped rather than uniform, so **this is a dial and not a guarantee** — the readout measures what came out. It tracks well to about 0.3, below which the *measure* breaks before the control does. |
| **foothills** | `fh` | 0.05–0.80 | 0.30 | Width of the transition into the belt. Wide gives long gentle approaches; narrow gives a wall rising straight off the plain. |

### Break up the uniformity

| control | id | range | default | purpose |
|---|---|---|---|---|
| **stretch u:v** | `st` | 1–4 | 1 | Grain. Elongates features along one axis: ridge-and-valley country instead of a field of lumps. **This one makes the terrain genuinely anisotropic on purpose**, so the readout will report a direction — that is the control working, and the only place in this work where a direction is wanted. |
| **warp** | `wp` | 0–3 km | 0 | Sinuosity. Displaces the sample point so ridges bend and peak spacing becomes uneven. **Warp fights stretch**: 3:1 stretch alone gives a grain of 2.15, but warp at 1.5 km randomises the direction and the grain falls to 1.43. Keep it under ~0.5 km if you want grain. |
| **hetero** | `ht` | 0–1 | 0 | Rough peaks over smooth plains, and the only one of the three that **keeps isotropy**. It bites above about 0.75 — +2% at 0.5, +13% at 0.75, +33% at 1.0 — because the weight only swings its full range at the top. **Overlaps with the belt**, which already ties roughness to height (correlation 0.793 against hetero's 0.439 alone), so at the page defaults this adds little; it is the mechanism for rough peaks *without* a belt. |
| **soft ceiling** | `soft` | checkbox | **ON** | Replaces the hard clamp with a knee that never flattens. Leave it on unless you want the document's exact behaviour. |
| **stable zoom** | `pin` | checkbox | off | Computes the amplitude divisor over a fixed octave budget, so **adding octaves leaves the coarse shape exactly where it was** instead of shifting it about half a percent. Off by default only because it changes the overall amplitude by 2.6%. |

### Chunks — the world, and how much of it

| control | id | range | default | purpose |
|---|---|---|---|---|
| **chunks across** | `k` | 1, 2, 3, 4 | 2 | How many chunks per side. More chunks means more ground in frame and so a flatter-looking view. At 1 the edge test cannot run. |
| **cells per chunk** | `res` | 32, 64, 96 | 64 | Mesh resolution. Costs `k² × (res+1)²` samples — 4×4 at 96 is 160,000. Does *not* add detail below the finest octave (§7). |
| **chunk size** | `ck` | 1–16 km | 4 | Ground covered per chunk. With `k`, sets the view's width in km, which is half of the metre scale. |
| **world position** | `cx`, `cz` | any integer | 0, 0 | Which chunk you are standing on. Try a few thousand out — it costs nothing and proves the point. |
| **the walk pad** | — | ↑ ← → ↓, home | — | Steps one chunk. Going east then west returns the identical terrain, which is the edge property felt by hand. |

### Altitude and vegetation

The field is dimensionless, so a datum is needed before a tree line means
anything. **Mid-year is assumed**, so the snow line is the *summer* one — the
altitude above which snow survives the melt season. A winter line sits roughly a
kilometre lower and would bury every scene here.

| control | id | range | default | purpose |
|---|---|---|---|---|
| **valley floor** | `base` | 0–3000 m | 1000 | The altitude of the lowest point in view — the datum everything else is measured from. |
| **latitude** | `lat` | 0–78° | 46 | Drives both lines, interpolated from observed figures rather than a formula: a cosine law is wrong in the subtropics, where dry highs push the snow line *above* its equatorial value. 46° is the Alps, 60° southern Norway, past 73° there are no trees. |
| **tree line** | `tree` | metres | 2120 | Moving latitude resets this; type over it to hold a local climate. |
| **snow line** | `snow` | metres | 2820 | As above. Held at least 150 m above the tree line, since trees cannot grow above permanent snow. |

### View

| control | id | range | default | purpose |
|---|---|---|---|---|
| **mountain height** | `vx` | 0.01–1 | 0.45 | Relief **in metres** — a fixed multiplier, never a per-field rescale, so H and the other controls still change the height by as much as they really do. Also moves every altitude, so the snow line slides down the mountain as you raise it. |
| **colour** | `scheme` | 6 schemes | alpine | `alpine` is three flat bands by real altitude — light green, ordinary brown, white — with 11 m transitions. The other five are the shared schemes: grey, white-on-blue, white-on-greeny-brown, blue-green sea, and the luminance-monotone elevation spectrum. |
| **spectrum bands** | `bands` | 0–40 | 0 | Elevation-spectrum scheme only. 0 is continuous; above 0 quantises into countable contours with a metre range in the legend. |
| **sun elevation** | `sun` | 2–80° | 12 | **The lever for shallow relief.** Shading sensitivity goes as grade × cot(elevation), so 12° shows a grade an overhead sun flattens. |
| **sun azimuth** | `sunaz` | 0–359° | 135 | Which way the light comes from. Worth sweeping — relief that is invisible at one azimuth can be obvious at another. |
| **wireframe** | `wire` | checkbox | off | Overlays the mesh, so resolution and chunk boundaries can be seen directly. |

### Measure

| control | id | default | purpose |
|---|---|---|---|
| **measure on every build** | `domeasure` | ON | Runs H, anisotropy, uniformity and texture. Costs a 2D FFT plus eight synthetic nulls, so turn it off to drag sliders freely. **The edge test is cheap and always runs.** |

### Mouse

Drag to orbit, wheel to zoom. Nothing else is bound.

---

## 5. Reading the readout

Bottom left, and every line is measured on the field actually drawn.

| line | what it tells you |
|---|---|
| **chunks** | size, resolution and build time |
| **world** | where you are standing, in km, and that there is no stored map |
| **shared edges** | the method's central claim. **Must read exactly 0.** |
| **relief** | metres, the ground it spans, and the share of the frame it fills — under 5% nothing can be judged and it says so |
| **feature scale** | widest and finest features, and metres per cell |
| **clamp** | cells pinned flat at a rail, and the height range |
| **flattest patch** | the largest *connected* flat region. **Pinned at a rail means the clamp; large but unpinned beyond a belt is the design.** A total percentage would hide both. |
| **anisotropy** | measured against a matched isotropic null, as an excess where 1.0 means no direction. One reading carries ±0.4, so only past ~1.6 is it real. Knows whether stretch *asked* for a direction. |
| **altitude** | valley to peak, both climate lines, and the share of ground in each colour band |
| **two layers** | swell size and share, cover asked against **cover measured** |
| **uniformity** | local relief spread against the same settings with the controls off, so the figure is a gain over a matched baseline rather than an absolute to be remembered |
| **texture** | bumps, summits, curvature — absolute, never a percentile ratio |

---

## 6. Things that look like faults and are not

- **The H asked for is not the H delivered.** 0.50 gives 0.47, but 0.90 gives
  only 0.72. Discrete octave spacing and simplex's own spectral shape are not a
  true power law. This is the method's behaviour, and the readout shows both
  figures rather than implying they agree.
- **Relief is always exactly 1.000 with the layer off.** `height01` clamps to
  [0, 1], so the method normalises itself and relief is not a measure here. That
  is why metres come from the height control alone.
- **The anisotropy figure is noisy**, ±0.4 on one reading at this grid size,
  because a red spectrum puts nearly all its power where the grid has fewest
  samples per direction.
- **Gentle ground outside a belt is the design**, not the clamp. The readout
  distinguishes them.
- **Stretch costs some roughness.** A stretched axis has gentler gradients; even
  area-preserving, roughness falls from 3.55 to 2.33 at 3:1. Unavoidable.

---

## 7. The zoom ceiling, and the LOD path

**Zooming in past the finest octave shows nothing new.** The octave set is fixed,
so detail stops at `widest / 2^(octaves−1)` — 62.5 m at the defaults. Sampling
one 200 m patch from 28.6 m spacing down to 0.8 m gives relief 0.1975, 0.1976,
0.1975: a smoother interpolation of the same surface, no new ground. Raising
**cells per chunk** does not help; raising **octaves** does.

That is also the level-of-detail path, and it works because `height01` is a pure
function: adding octaves while zooming leaves the coarse shape within half a
percent, and *exactly* with **stable zoom** on. Far chunks few octaves, near
chunks many, and the mountain does not move. Nothing in the page consumes this
yet — a walk-through would.

---

## 8. Settings worth trying

| what you want | set |
|---|---|
| **the document's plain method** | swell share 0, cover 1, soft ceiling off — bit-identical to `noise.js` |
| **a mountain range with foothills** | the defaults |
| **ridge-and-valley country** | stretch 2.5–3, warp under 0.5, hetero 0.8 |
| **rough peaks, smooth plains, mountains everywhere** | swell share 0, cover 1, hetero 1.0 — the belt off, so hetero is doing the work |
| **sinuous, uneven ranges** | warp 1.5–2.5, stretch 1 |
| **an isolated massif** | cover 0.20–0.25, foothills 0.5, swell 12–16 km |
| **see the clamp artefact** | widest 8 km, octaves 2, soft ceiling **off** |
| **see the lattice question answered** | octaves 10, measure on, read the anisotropy line |
| **snow on everything** | latitude 65, or valley floor 2200 |
| **prove the world is endless** | world position 5000, 5000 — then home |
