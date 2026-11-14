# Lorenz — notes (2026-11-13/14)

Two things built from Lorenz's 1963 convection equations:

1. **`Lorenz Workbench.html`**: a three.js bench for investigating the
   attractor, at `/Lorenz%20Workbench.html`.
2. **The root node's butterfly**: the classic xz projection, drawn live
   behind BD's root node on the home page (`viewer.js`).

Author's verdicts: the bench additions were asked for one at a time and accepted
as they came. The live root butterfly drew "Thats good" (2026-11-14).

---

## The equations

```
dx/dt = σ(y − x)
dy/dt = x(ρ − z) − y
dz/dt = xy − βz
```

Lorenz's values: σ = 10, ρ = 28, β = 8/3. Both places use the same method:

- **Integration:** fourth-order Runge–Kutta (RK4), time step dt = 0.005.
  Euler drifts visibly at step sizes a browser can afford.
- **Start:** (1, 1, 1).
- **Fixed points:** C± = (±√(β(ρ−1)), ±√(β(ρ−1)), ρ−1). The wings wind round these.
- **Below ρ ≈ 24.74:** the trace settles onto one of the fixed points.
- **Below ρ = 1:** everything falls to the origin.

**Axes on screen.** Lorenz's z is drawn **up**:
`toWorld(x, y, z) = world (x, z, −y)`, centred on world (0, 25, 0). Every
projection below depends on this mapping.

---

## 1. Lorenz Workbench (`Lorenz Workbench.html`)

One self-contained page: three r128 plus OrbitControls from jsDelivr, using the
Shan Shui page's sheet UI (seal 蝶).

| Group | Controls |
|---|---|
| Starting point | x₀, y₀ (−30..30), z₀ (−10..50), step 0.01. Any change restarts the trace. Steps of 0.01 are fine enough to show the butterfly effect. |
| Constants | σ, ρ, β (β shown as "8/3" while exact), **Lorenz's values** button. Not asked for, but ρ is what turns the attractor on. |
| Tracing | time step, steps per frame, trail length (500–60,000; the oldest points drop off), **opacity** (0.02–1), Restart, Pause |
| Camera | azimuth, elevation, distance, spin (°/s round the vertical). **Every camera control is a slider**, so each can become a BD stepper; dragging moves the sliders too. |
| Tick boxes | axes + fixed points (on); **projection onto the xy plane (floor)**; **classic projection onto the xz plane (back wall)** |

### How it is built — and why

- **Trace buffer.** One buffer sized for the LONGEST trail (60,000 points).
  When the trail is full, the oldest points are dropped with `copyWithin`.
  `frustumCulled = false`, because the bounding sphere is never recomputed as
  the trace grows.
- **Opacity.** The materials are `transparent` with **`depthWrite: false`**.
  With depth writes on, nearer segments would hide farther ones, and the
  overlaps would not add up. With them off, places the orbit passes often show
  brighter, so its density becomes visible. The head blob, its shadows and the
  dropped lines follow the slider too (the dropped lines at half its value).
- **Projections share the trace's geometry.** Each is a second `THREE.Line` on
  the same buffer, squashed flat along one world axis (`scale[axis] = 0`) and
  moved to where its plane sits. So they grow, and lose their oldest points, in
  step with the trace, for free. All of them are built by one function,
  `makeProjection(axis, at)`. Each also has the newest point's shadow and a
  dropped line from the point to it.
  - xy: world y flattened, at 0. This is Lorenz's z = 0, the floor under the
    figure.
  - xz (classic): world z flattened, at −XZ_WALL (35). Lorenz's y = 0 runs
    through the **middle** of the figure, so the shadow is put on a back wall
    at y = +35, just past the trace's reach of about ±28. The picture is the
    same at any y.
  - To see the classic view face on: azimuth 0°, elevation 0°.
- **Run-away guard.** The trace stops if values blow up, which extreme
  constants can cause.
- **Canary.** The Restart button's border (`--canary`) and `LW_BUILD`, shown in
  the readout. They rotate in step with BD's.

### Open

- **Colour control.** The author will decide it. The trace is plain #d9ddd4;
  the projections are #8c968f (dimmer, so the difference is in brightness, not
  hue).
- Not offered yet: a yz projection, and two traces from neighbouring starts
  side by side (the butterfly effect shown directly).

---

## 2. The root node's butterfly (`viewer.js`)

The classic xz projection, drawn **live** behind the root node's label on BD's
home page. It ran as a still image first (2026-11-14a), then live (2026-11-14b).

### `startRootButterfly(cy)`, called right after `window.cy = cy` in `init`

- **Its own canvas, `#root-butterfly`.** It is fixed, at **z-index 0, behind
  `#cy` (z-index 1)**. Cytoscape's canvases are transparent, so the root's
  label draws over the butterfly, and `pointer-events: none` sends taps to the
  graph.
- **It follows the node every frame.** It is placed on `root.renderedPosition()`
  and `root.renderedWidth()` plus `#cy`'s screen rectangle, so pan, zoom, layout
  animation and drag all carry it. Its opacity follows
  `root.effectiveOpacity()`.
- **When it hides.** It hides when there is no root, the root is not visible,
  `#cy` has zero width, or `#cy` has the `hidden` class.
- **It never stops.** Each frame it advances `STEPS_PER_FRAME` (5) RK4 steps
  into a ring buffer of `TRAIL` (4000) projected points (x, z). That is about
  1.5 Lorenz time units a second, and about 13 s of drawing on screen.
- **Start-up.** It skips the first 2000 steps (t = 10, the run-in from the start
  point), then **pre-fills the whole trail**, so the full butterfly is there on
  the first frame.
- **The fade.** Each frame the canvas is cleared and the trail is stroked in
  `BANDS` (24) chunks. Opacity rises linearly from faint (oldest) to
  `ALPHA_MAX` (0.6) on the newest. Neighbouring chunks share an end point, so
  there are no gaps. There is **no head blob**, by request.
- **Size and colour.** The figure (about 52 units across) fills 80% of the node
  (`FILL`). Strokes are gold (255, 215, 0) in ink mode and black on `?ink=0`.
  On `?ink=0` the root's gold body (opacity 0.7) covers the canvas, so the
  lines show only faintly there.
- **Once per page.** If `#root-butterfly` already exists, the function returns.

### Why not the node's own background image

The first version (2026-11-14a) was a cytoscape `background-image`: an SVG
path, computed once at boot. **Animating that would flicker.** Every new image
must LOAD before cytoscape draws it, and the node shows blank while it loads.
A canvas of its own is redrawn in place. The still SVG (`rootButterflyUri()`)
is kept **only for `prefers-reduced-motion`**, read once at load into
`ROOT_BUTTERFLY_STILL`. In that case `buildStyle` sets the image and the live
canvas is never made.

### Traps met while building it — kept as rules

- **A data-URI image can miss a headless screenshot.** The first screenshot
  showed no butterfly; it was taken before the image loaded. Reading the root's
  live style in a probe page (`cy.nodes('[type="root"]').pstyle(...)`, using
  `window.cy`) showed it was set. A later screenshot showed it drawn.
- **`background-fit: contain` overrides `background-width`/`-height`.** It
  fits the whole image to the node; measured, 80% there changed nothing. The
  margin that keeps the wing tips off the ring is in the SVG's **viewBox**
  instead (65 units across for a figure about 52 wide), and the live canvas uses
  `FILL`.
- **Cytoscape rasterises an SVG at its own `width`/`height`, then scales the
  bitmap.** So the still SVG declares 600×600, to stay sharp when zoomed in.
- **Ink mode is the default** (`?ink=0` is the escape). The root's body is
  transparent there, so the strokes must be light (gold), not dark.
- **Proving it moves without a real screen.** rAF fires rarely under headless
  Chrome, so two screenshots can look identical. Instead, a probe page iframes
  `/`, reads `#root-butterfly`'s pixels with `getImageData` at 8 s and 12 s, and
  compares hashes. They differed, so the canvas is redrawing new content.

### Not measured

- **Phone cost.** Each frame strokes up to 4000 line segments into a canvas
  about 200–400 device pixels square. This is cheap on desktop, but the phone
  frame rate has NOT been measured.
- **Off-screen and hidden tabs.** rAF pauses in a hidden tab. While the root is
  off screen the integration still runs (5 steps a frame, negligible) but
  nothing is drawn.

### Tuning — each is one constant in `startRootButterfly`

| constant | value | what it changes |
|---|---|---|
| `STEPS_PER_FRAME` | 5 | drawing speed |
| `TRAIL` | 4000 | how much path is on screen at once |
| `ALPHA_MAX` | 0.6 | brightness of the newest stretch |
| `BANDS` | 24 | smoothness of the fade |
| `FILL` | 0.8 | size inside the node |

---

## Commits

| commit | what |
|---|---|
| `8a08063` | Lorenz Workbench built |
| `4be6f37` | trace opacity slider |
| `8480bc2` | xy projection (floor), head shadow + dropped line |
| `568008e` | head blob follows opacity |
| `1484562` | classic xz projection (back wall), `makeProjection()` |
| `1da4142` | root node: still SVG butterfly |
| `32e4406` | root node: live canvas butterfly |
