# Lorenz — notes (2026-11-13/14/15)

Three things built from Lorenz's 1963 convection equations:

1. **`Lorenz Workbench.html`**: a three.js bench for investigating the
   attractor, at `/Lorenz%20Workbench.html`.
2. **The root node's butterfly**: the classic xz projection, drawn live
   behind BD's root node on the home page (`viewer.js`).
3. **The BD module `bd_V_LorenzV1`** and its node Lorenz3D_001 (§3).

Author's verdicts: the bench additions were asked for one at a time and accepted
as they came. The live root butterfly drew "Thats good" (2026-11-14), and the BD
module (§3) "Its good" (2026-11-15).

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

## 3. The BD module `bd_V_LorenzV1` and its node (2026-11-15)

The author: "create a node off Graphics called LorenzEqu and the normal route
through to a node for the 3D Lorenz equations ... Put the sliders as you think
fit using the standard positions as per Kolam3D etc. ... when I get the VR going
this will be a good node to test on as the graphic is not too complicated."

### In the graph

SubFamily **Graphics** → Cluster **LorenzEqu** → gateway **Lorenz3D** → node
**Lorenz3D_001** (seq 1, `hasModuleScript: bd_V_LorenzV1`). Created by
`bd_v_lorenz_ingest.js` (Shan Shui's ingest, renamed; backup taken first).

- **Why the gateway is not also "LorenzEqu":** a Cluster and a gateway with
  one name make name lookups ambiguous (the reason Shan Shui's cluster is
  Mountain/Water).
- **Permanent link:** `/n/9efd37f7-cf61-45f2-b839-155e67079015` (Lorenz3D_001).
  Gateway `7d235e44-…`, cluster `9333cbbf-…`.
- **Speech:** `_` between word characters is spoken as a space, so the node is
  read "Lorenz3D 001". The lexicon matches WHOLE words (`\b…\b`), so if the
  voice gets it wrong, the entry to add to `speech_lexicon.json` is
  **`Lorenz3D`** (an entry for plain `Lorenz` would not match inside it).

### The module (`V_Lorenz/`)

- **Files:** `V_Lorenz/index.html` (the relay, Shan Shui's renamed) and
  `V_Lorenz/visual_module.html`, ASSEMBLED from:
  - Shan Shui's stylesheet, parser, `setDirectiveValue` and stepper machinery;
  - the Workbench's scene with its DOM wiring removed;
  - a glue script cut down from Shan Shui's.
- **Served at `/bd_V_LorenzV1/`**, mapped to `V_Lorenz/` by an `app.use` in
  `server.js`, as for the other modules. For its first few hours it ran from
  `/V_Lorenz/` through the root route, because an alias needs a server restart.
  The author then allowed a restart (2026-11-15), and the alias went in.
  Checked after the restart:
  - 200, locally and at butterflydreaming.net;
  - HTML no-cache;
  - BD's log shows `setting src= /bd_V_LorenzV1/index.html`.
- **The script (stored in Lorenz3D_001):**

```
%%bd_module bd_V_LorenzV1
%%bd_p_sigma 10
%%bd_p_rho 28
%%bd_p_beta 2.667
%%bd_p_x0 1
%%bd_p_y0 1
%%bd_p_z0 1
%%bd_p_speed 6
%%bd_p_trail 20000
%%bd_p_opacity 1
%%bd_p_projection none
%%bd_p_azimuth 40
%%bd_p_elevation 15
%%bd_p_distance 95
%%bd_p_spin 0
%%bd_time_step 0.005
%%bd_axes 1
```

- **The column, top to bottom** (my choice, the author to adjust): the
  constants σ ρ β; the start x0 y0 z0; how it is drawn (speed, trail, opacity,
  projection); where it is seen from (azimuth, elevation, distance, spin).
  Ranges are the Workbench's, in the module's one `CONTROLS` table.
  - **speed** is RK4 steps per frame, 0–30; **0 is the pause**, so there is no
    Pause button (Shan Shui's travel_speed rule).
  - **beta** is shown "8/3" and integrated as exactly 8/3 while the script says
    2.667, and written back as 2.667.
  - **trail** is shown in thousands ("20k").
  - **projection** is a word from a selector: none, xy (floor), xz (back wall,
    the classic view), both. A word not in the list is ignored.
  - **time_step** and **axes** (axes and the two fixed points, 1 or 0) are
    fixed by the script: no `_p_`, no row.
- **A change to σ, ρ, β or the start RESTARTS the trace**, since it is a
  different trajectory. Every other control applies to what is drawn.
- **Spin turns the azimuth and writes it back into the script** every 200 ms,
  marked `fromDrift`, with the hand winning: Shan Shui's clock pattern.
- **The loop stops** at speed 0 and spin 0; the figure stays as drawn.
- **Run-away** (extreme constants) stops the drawing and says so in the status
  line and the log; a restart clears it.
- **No drag**, as in Shan Shui: the camera is the three orbit numbers.
- **Canary:** the stepper buttons' colour plus `LZ_BUILD`, rotated with the
  others.
- **VR:** a plain three.js scene (lines, three spheres, no shadows, no
  post-processing), so it is a light first test for WebXR. Nothing VR-specific
  is built yet.

### Tested (headless)

- **The module alone:** a test page iframed `/V_Lorenz/index.html` and posted
  the script. Results:
  - 14 rows shown;
  - β exact;
  - the xz shadow visible;
  - spin wrote `%%bd_p_azimuth` back;
  - the square was 468×468 in a 760×520 frame.
- **In BD:** opened `/n/9efd37f7-…` and pressed View. The server log read:
  `loadModuleForNode: swap path, setting src= /V_Lorenz/index.html script
  length= 288`, then the module's BLUE build line, then `script in: 288
  chars, 17 directives`. The axes, the fixed points and the start of the trace
  drew full screen. A TAP alone does not open a module in Browse; that is the
  same for ShanShui_001, checked side by side.

### Not yet

- Device (AV) rendering, as for Shan Shui.
- A published Standalone page.

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
| `47f502b` | BD module `bd_V_LorenzV1` + node Lorenz3D_001 (served at `/V_Lorenz/`) |
| `93a3f4f` | served at `/bd_V_LorenzV1/` like the other modules (server restarted) |
