# Graphics through three.js, and the road to VR

**Started 2026-09-28.** A standing decision, the evidence behind it, and the one
fork that has to be chosen before the collage is built.

Status: the decision is in force from today. Nothing VR is built. The numbers
below were measured while scoping it, not estimated — where something is
**documented behaviour rather than measured here**, it says so.

---

## 1. The decision

> *"I think from now on the rendering of the graphics should be using three.js
> so we have the possibility of converting to VR. I'm thinking of the collage
> system."* — 2026-09-28

**No new visual module is built on a 2D canvas.** `getContext('2d')` is not the
starting point any more.

The reason is narrow and worth stating precisely, because it is not "3D is
better". A canvas renderer has **no VR meaning at all** — there is no route from
a rasterised 2D context to a headset short of rewriting it. A three.js scene is
a session flag, an animation loop and a change of who owns the camera away from
one. The decision buys an option, and the option is cheap only if it is taken
before the code exists rather than after.

The aim it serves: **a continuous "transformative" experience of pattern, music
and spoken poetics.** That aim shapes almost every judgement in §4 and §5, and
it is why some of the usual priorities invert.

---

## 2. What is already true

`bd_V_Kolam3D` (2026-09-27) is the first module built this way, so much of the
groundwork is done and measured.

| fact | value | how known |
|---|---|---|
| three.js pinned on the CDN | 0.160.0, `three.min.js`, **UMD** — defines `window.THREE`, no import map | preamble inspected |
| its size | 654 KB (ESM build is 1243 KB) | `content-length` |
| BD over https | `graph.virtualfictions.uk` → 200 | requested |
| `VRButton.js` | 4.5 KB, **zero imports** — works with the UMD build as-is | fetched and read |
| `Line2` trio (`LineSegments2`, `LineSegmentsGeometry`, `LineMaterial`) | 24 KB total, all 200, but `import … from 'three'` | fetched and read |
| 3D module reproduces the flat one | pitch 0 + cam_elevation 90, to **6.1e-5 world units on a radius of 1362** — `Float32Array` precision, five settings | numeric harness vs a 2D reference turtle |
| the viewer survives a dropped socket | says "NO CONTACT", **never sends `BD_STOP`**, never tears down the renderer | read in `AV/kolam.html` |

And the architecture is already the right shape. **BDX controls, the viewer
plays** — the division insisted on for the music modules ("the point of AVX is
to play the music on another device, that's all") is exactly what a headset
wants. A VR viewer is the viewer that exists, with an XR session.

---

## 3. What WebXR actually needs

### The small part — realistically half a day

- `renderer.xr.enabled = true`
- an enter-VR button (`VRButton.js`, or ~40 lines hand-rolled around
  `navigator.xr.requestSession('immersive-vr')`)
- **swap the on-demand `draw()` for `renderer.setAnimationLoop()`** — the one
  structural change to the render model. The module currently draws when
  something changes; XR needs a continuous loop at 72–120 Hz.
- `allow="xr-spatial-tracking"` on the iframe. Same-origin, so it is likely
  permitted by default — but a silent permissions gap is the exact failure
  shape that has cost a day twice here (`bd_av_state`, `bd_module_log`), so it
  goes in as insurance rather than as a finding.
- the headset must use the **tunnel URL**. `localhost:8080` is not a secure
  context from another device.

### The three parts that are real work

**a. The camera steppers stop working, and must be inverted.**
In a session the headset owns the view matrix; `camera.position` and `lookAt`
are ignored. `cam_azimuth` / `cam_elevation` / `cam_distance` have to move **the
world** instead — wrap the group and apply the inverse. Same code either way;
what changes is the meaning: from "where I stand" to "where the object sits
relative to me". See §4, where this stops being plumbing.

**b. Scale.**
WebXR is in metres. The figure's radius runs **97 to 1362 world units** across
the four stored Kolam settings. A kolam on a table, one you stand inside, and
one the size of a building are three different works. Needs an explicit
directive, not a constant.

**c. Line quality — see §6.** The biggest single chunk.

### A depth policy, which the numbers force

Per eye, per frame, at 8-fold symmetry:

| depth | line segments | vertices per eye | verdict |
|---|---|---|---|
| 2 | 3,072 | 49,152 | trivial |
| 3 | 16,384 | 262,144 | comfortable |
| 4 | 65,536 | 1,048,576 | borderline at 72–90 Hz |
| 5 | 262,144 | 4,194,304 | not viable |

**But the sharper problem is not drawing, it is rebuilding.** Every drift tick
rebuilds the whole geometry buffer. At depth 4–5 that is a multi-megabyte upload
several times a second, and it will stutter long before the draw does. Options:
cap depth inside a session, slow the drift there, or move the L-system off the
main thread.

The consolation: `step_pitch`, `opacity` and all three camera controls already
rebuild nothing (the `NO_REBUILD_INPUT_IDS` path), so they are free in VR.

**Estimate: half a day to something you can look at; two to three days on top
for it to be good** — mostly §6 and the scale design.

---

## 4. What the AIM changes — two requirements, not preferences

The intended use is a long, continuous, attended piece. That was raised against
an earlier worry of mine about the connection dropping when a headset is put
down mid-session:

> *"the aim is to create a 'transformative' experience via pattern, music,
> spoken poetics and this wouldn't sit too well with a cup of coffee half way!"*

Correct, and the architecture backs it up: a dropped socket means **"no new
parameters arrive"**, not "it stops" — the drift and rotation run on the
module's own timers from the last script received. That is a soft failure and
almost harmless here. (The one case still inside an attended session: lifting
the headset trips the proximity sensor and suspends it — and by the above, it
resumes into a piece that never stopped.)

But the same framing **raises** two things, and both are requirements:

### NEVER MOVE THE CAMERA

Continuous VR with an auto-rotating viewpoint is the textbook cause of
sickness — moving a person's view without their head asking for it.
`cam_elevation_speed` must tumble **the figure** in front of a stationary
viewer, never the viewer around the figure. Get it backwards in a twenty-minute
piece and it is not transformative, it is emetic.

This is the same code as §3a. It is listed twice on purpose: there it is a
consequence of how XR works, here it is a safety property.

### SUSTAINED SMOOTHNESS BEATS FIDELITY

In something glanced at, a hitch is nothing. In a continuous meditative piece it
is the whole thing broken — and the drift timer's whole-buffer rebuild is
*precisely* a periodic hitch, the worst-shaped fault available for this aim.

**Depth 3 entirely smooth will serve this better than depth 5 that stutters.**
That inverts the usual instinct and should be written into whatever ships.

---

## 5. The larger question: what the headset has to carry

Right now BD plays the music and the viewer shows the graphics **on another
device**. Pattern, music and spoken poetics *together* means the headset carries
all three.

So a VR viewer is **not** `bd_V_Kolam3D` plus an XR session. It is a viewer
hosting several modules at once — or one that also runs Tone.js and Piper. That
is a bigger architectural step than the XR plumbing, and it resets what the
half-day buys: **half a day gets the pattern into the headset, silent.**

The consolation is that spatial audio then comes nearly free and is very much on
theme: a WebAudio `PannerNode` inside an XR session puts the sound where the
figure is.

This question and the collage fork in §7 are the same question wearing different
clothes. Both are "how do several media share one surface".

---

## 6. Line weight, and why VR forces the issue

Current position, as of RULE 9:

- **Flat module**: `weight` works fully. A stepper, 0.5–5, applied as
  `ctx.lineWidth`. Both stored flat nodes carry `%%bd_p_weight 1.5`.
- **3D module**: no weight stepper, deliberately. Core WebGL ignores line width
  above 1 on every platform that matters — *documented three.js behaviour, not
  measured here* — so a control would be a knob wired to nothing.
  `material.linewidth` is still set as a free best-effort.
- **The directive is honoured if present and never invented.** RULE 9 removed
  `%%bd_weight` (and `%%bd_stroke`, which the 3D module does not read at all)
  from the default script, because a directive a module cannot act on is dead
  text in a card a person reads. A figure given a weight elsewhere still keeps
  it, because the 3D module never *rewrites* it.

**VR changes the weighting of this.** One-pixel lines in a headset are thin,
alias badly and shimmer with head motion; it is the least forgiving display
there is. So `Line2` goes from optional polish to close to mandatory, and its
cost is known:

- 24 KB of extra files, all available pinned — **but** they are ES modules
  importing bare `'three'`, so: an **import map**, `<script type="module">`, and
  the **ESM build at 1243 KB instead of the UMD 654 KB** — nearly double the
  download, against the stated priority of keeping load off the tunnel.
- `LineMaterial` needs its `resolution` uniform updated on every resize, so it
  couples to canvas sizing.
- `LineSegmentsGeometry` expands each segment into an instanced quad, so memory
  per segment rises — which is exactly where the depth-4/5 numbers in §3 hurt.

---

## 7. THE COLLAGE FORK — choose before building

This is the decision the whole document exists for, and it is cheap now and
expensive later.

If visuals are three.js, a collage **could** be one scene holding several
objects rather than several iframes side by side. In a headset that is the only
version that means anything: a collage is a space you stand in, with the pieces
arranged around you. A collage of 2D canvases has no VR reading at all.

But the module contract is deliberately **iframe + postMessage**, so that a
third party can write a module — that is the entire argument the BDX harness
exists to make.

| | several iframes, one canvas each | ONE scene, several objects |
|---|---|---|
| module contract | unchanged — postMessage, isolation kept | new: modules export **geometry**, not pixels |
| third-party authoring | works today | needs a new, harder contract |
| VR | no shared space; a collage is a page layout | native — one camera, one space |
| cost | N WebGL contexts, N animation loops | one of each |
| ceiling | browsers cap live WebGL contexts (**~16 in Chrome, oldest silently lost — documented, NOT measured here**) | none of consequence |

**Neither is obviously right.** The isolation is a real asset and the reason a
stranger can write a BD module at all. But the shared scene is the only one that
serves §5.

**A middle path worth thinking about:** keep the iframe contract for *authoring*
and add an optional second output — a module may also offer its geometry, and a
collage uses that when it can and falls back to an iframe when it cannot. Two
contracts is a cost, but it does not force a choice today.

**Before choosing, measure:** how many live WebGL contexts the target devices
actually allow — desktop Safari, iOS Safari, and the Quest browser. That number
decides whether the iframe option has a ceiling worth caring about.

---

## 8. The cheap test, before anything is built

Point the Quest browser at the **existing** viewer URL over the tunnel and look
at it as a flat 2D page. No code at all, and it answers the three real unknowns:

1. does the headset reach BD, and does the socket hold while worn;
2. how the current 1-pixel lines read at that pixel density (i.e. how urgent §6
   really is);
3. whether the frame rate is anywhere near acceptable before stereo doubles it.

---

## 8b. Which headset — and why storage is the wrong axis

Asked 2026-09-28: 128, 256 or 512 GB?

**128 GB, and the question to spend money on is the MODEL, not the tier.**

Browser WebXR installs nothing. The whole payload here is ~654 KB of three.js
plus a few KB of module, from a CDN, into the browser cache. Even if the headset
later carries the voice (§5), a Piper model is tens of megabytes. Storage on a
Quest is consumed by *installed native apps*, which is not what this is.

Within a model the tiers are the same silicon, so a larger one buys nothing for
this work. Across models the differences are exactly the ones §6 cares about:

- **per-eye resolution** — 1-pixel lines alias and shimmer, and pixel density is
  the single biggest lever on whether they read well;
- **lens type** — pancake optics hold clarity to the edge of the field, which
  matters when the figure fills it;
- chipset and RAM matter far less, because this is a browser page drawing lines,
  not a native game.

So: cheapest storage, best optics and resolution affordable. *(Model specifics
are as of a 2026 knowledge cutoff and lineups move — worth confirming current
models before buying. The reasoning, that storage is irrelevant and resolution
is not, does not move.)*

**One genuine unknown, and it is compute rather than storage:** whether Piper
speech synthesis runs acceptably in the Quest browser. It is WASM plus a neural
model on a mobile-class CPU, and BD's rule is that every high-data presentation
is derived on the client. Worth testing early if §5 is wanted, because it could
decide whether the headset carries the voice or only receives audio.

---

## 9. Open, in one place

| question | notes |
|---|---|
| **The collage fork (§7)** | The one that must be settled first. |
| **Retire `bd_V_Kolam`?** | The 3D module is a *measured* superset. Costs: `weight` (§6), and the canvas rasterises a bezier for free where three tessellates it. Two stored nodes would need migrating. |
| **Does the headset carry music and voice (§5)?** | Decides whether "VR viewer" is a weekend or a project. |
| **Depth / drift policy inside a session (§3)** | Cap depth, slow drift, or move the L-system off the main thread. |
| **Scale directive (§3b)** | Table, room, or building. A design decision, not a constant. |
| **WebGL context ceiling** | Measure on desktop Safari, iOS Safari, Quest. |
| **`Line2` (§6)** | Worth it for VR; the ESM/import-map cost is known and real. |
| **Does Piper run in the Quest browser? (§8b)** | Compute, not storage. Decides whether the headset carries the voice or only receives audio. |

---

## Related

- `CollagePlanStarted_2026-09-22.md` — the collage plan proper; §7 here is a
  fork inside it, and RULE 9 there came out of §6 here.
- `BDX_DEMO_PLAN.md` — the BDX harness whose third-party-authoring argument §7
  has to protect.
- `AV/README.md` — the viewer this would become.
- `PLANNING_REGISTER.md` — how far each of the above is built.
