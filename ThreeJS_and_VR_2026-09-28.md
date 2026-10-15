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

## 5. Two delivery shapes — and a third that dissolves the choice

Raised 2026-09-28: either BD runs on a phone or laptop and the Quest runs the AV
viewer, or BD itself runs on the Quest and you navigate the node graph in there.

There is a third, and it is probably the answer.

### C. BD on the Quest as a FLAT page; only the module goes immersive

The standard WebXR arrangement: an ordinary 2D page with an Enter VR button. BD
runs in the Quest's browser window — a large virtual monitor — you navigate the
graph on a flat screen as you should, press Enter VR, and the **module's scene**
takes over the headset. BD's DOM is gone while you are in there. Exit returns you
to the page.

**Cheaper than the viewer route**, because BD's player already hosts the module
in an iframe on the same origin: no token, no socket, no relay, just the
postMessage that exists. The AV path needs the connection to survive a worn
headset, which is the untested risk; this path has no connection to lose.

**The audio settles it.** Speech is Piper, client-side, in BD. With BD on a
laptop and the Quest as viewer, the spoken poetics come out of the **laptop**.
For the voice to reach the headset the viewer would have to synthesise it there
— the same Quest-compute unknown as §8b — or audio would have to be streamed,
which does not exist. With BD on the Quest there is one device, one audio
context, and pattern, music and voice are coherent by construction.

### A. BD elsewhere, Quest as AV viewer — the FACILITATED mode

Not a fallback. A facilitator drives the script while a participant is immersed,
and BD already has the whole pairing apparatus for exactly two people in
conversation — which is what the system is *for*. Keep it.

**A and C are not competing.** They are the solo mode and the facilitated mode,
and **both run the identical module** — the only difference is whether the
script arrives over a socket or from the page underneath. Nothing has to be
chosen between them.

### B. Porting BD's own UI into 3D — avoid

The graph, the cards and the chat rendered in VR. BD is text-heavy by design (a
corpus of literature), and reading prose in a headset is worse than reading it
on a screen. The flat browser window gives the graph at no cost and without that
loss.

**Is there a 3D graph to port TO?** Asked 2026-09-28, for completeness. Two
parts, and the answer is clean both ways.

**cytoscape.js is 2D only** — no 3D version exists; it renders to a 2D canvas.
BD loads `cytoscape@3` + `cytoscape-fcose` from unpkg, and that is the whole
graph stack. three.js is currently nowhere on the BD page itself; it lives only
inside the Kolam3D module's iframe.

**The natural 3D graph library IS three.js-based** — `3d-force-graph` wraps
three.js directly and has VR and AR sibling builds. So a 3D graph would sit
*inside* the standing decision rather than against it. That is the tidy half.

**Four reasons to decline it for NAVIGATION anyway**, none of them taste:

1. 3D node-link diagrams generally **underperform** 2D for topology tasks —
   occlusion and depth ambiguity cost more than the extra dimension buys.
2. **Label legibility gets worse**, not better: labels at varying depths,
   foreshortened, occluded by nearer nodes. BD's 10px labels are already the
   marginal thing (§5, §8b) and this is the wrong direction for them.
3. **BD's layout carries meaning designed in 2D** — cluster views, `seq` grids,
   fcose relative-placement constraints, ink mode, blue-node halos, node shapes
   doing achromatic work. Much of that has no 3D equivalent; it is simply lost.
4. It is a large rewrite of the most mature part of the system.

**Where a 3D graph COULD earn its place is elsewhere:** not as the navigation,
but as a **presentational object** — the corpus as a thing you stand inside, or
an element in a collage. A different proposition from replacing the viewer, and
a good fit for the transformative piece. Held as an idea, not a plan.

(Flagged rather than asserted: there has been work on a WebGL renderer for
cytoscape.js. It would help performance at scale but would not make it 3D, so it
changes none of the above — worth a check only if graph performance ever becomes
the binding constraint.)

### Is BD's own UI legible in that window? — a test item, not a blocker

Raised 2026-09-28, and worth being precise about rather than alarmed by. MEASURED
in `style.css` and `viewer.js`:

| what | size | verdict |
|---|---|---|
| `.card-body` — **the literature itself** | **16px** | the largest text in the system, and the thing a participant actually reads. Fine. |
| `.card.system .card-body` — helper / remote cards | 12.8px | carries instructions. Mid-risk. |
| utility chrome — send, new card, copy link, pair status, media bar, dev status, user count | **8-11px** | *"most of the really small text on the buttons is not completely essential"* — agreed. A person learns where a button IS; they do not re-read its label each time. |
| **cytoscape node labels** | **10px**, and **6.8px** for SubFamily | **the one that is not chrome.** This is DATA, not affordance: you can learn a button's position, you cannot memorise the names of a corpus. |

**But the node labels already carry their own mitigation:** the graph zooms, and
`maxZoom` is **8**, `userZoomingEnabled: true`. A 10px label at 2x is a 20px
label. So it costs more pinching than on a laptop and nothing else.

Which narrows the fix enormously if one is wanted at all. It is **not** a `?vr=1`
UI overhaul — that was an over-call. It is one or two numbers in the cytoscape
style, and only if the test says so.

The other half of the argument is the author's:

> *"XR users are going to be more resourceful in finding out how to navigate the
> system — hopefully!!"*

Reasonable for the author and for an experimenter. Worth revisiting **if VR ever
becomes a delivery route for participants** rather than a way of making the work,
because BD's audience is arts therapy and peer counselling and does not select
for that. Not a concern today.

Contrast, for completeness, is the healthy half: the amber palette runs 15:1
against the black ground and `#cccccc` 13:1. Two are marginal — `#a07820` at
5.2:1 and `#8d7900` (the local-gold mark) at 4.87:1. Both clear the 4.5
threshold on a monitor, but a headset LCD has raised blacks and lens scatter, so
delivered contrast is lower than the computed figure. Those two grey out first,
and the fix is luminance, not hue.

### The dependency to verify first

C rests on **an iframe being able to request an immersive session, with the
session presenting only that context**. Believed correct and standard, but not
verified here, and C is built on it. The §8 test answers it.

---

## 5a. What the headset has to carry

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

### How the sound actually gets out, and the mic

Four output paths: **built-in speakers** (stereo, in the strap arms, spatial
audio, zero latency), **3.5mm jack** (left side, virtually zero delay),
**USB-C wired**, and **Bluetooth 5.2 LE** — supported but with noticeable
latency. The low-latency wireless option is a 2.4GHz USB-C dongle, not BT.

**Wired 3.5mm for the solo piece** — no latency, isolation, better bass.

**But the built-in speakers may be the RIGHT answer for §5A rather than the
compromise.** They are open-ear: the participant stays aware of the room and a
facilitator can speak to them without the headset coming off. In arts therapy
and peer counselling that is a presence and safety property, not an audio-quality
one. If the facilitated mode is the delivery shape, open-ear is a feature.

**Bluetooth latency, honestly:** for a drifting figure with ambient music and
nothing tightly synced, 100-300ms is imperceptible and would not matter. Where
it bites is BD's tap-a-node-and-it-speaks interaction, where the delay stacks on
Piper's synthesis time. Mode-dependent; wired sidesteps it.

**The mic, with a gotcha worth knowing before buying earbuds:** there is a
built-in array and it is fine for voice, but **headset mics over the 3.5mm jack
are NOT supported** — inline-mic earbuds will not work as a mic, you stay on the
built-in one. Do not buy earbuds for their microphone.

**And this is not hypothetical:** `sr_editor.html` runs Whisper base.en via
transformers.js with AudioWorklet direct-PCM capture. On the Quest that means
the built-in mic through `getUserMedia` — two unknowns of exactly the same shape
as the Piper one (§8b): whether `getUserMedia` behaves in that browser, and
whether Whisper runs acceptably on a mobile chipset. Test the two together.

This question and the collage fork in §7 are the same question wearing different
clothes. Both are "how do several media share one surface".

---

## 5b. The turtle makes SHELLS, not helices — except at large angles (2026-10-15)

The author asked whether the parameters could wind the figure into a **tunnel**:
many turns along the vertical, viewed from inside, flown through slowly. The
answer is yes, but not where anyone would look for it — and the reasoning that
got there analytically was wrong twice, so this is what the simulation says.

### Why the obvious settings cannot work

Every `+` applies **yaw about the turtle's own up AND pitch about its own left**.
That is one fixed rotation in the body frame, so the trajectory is formally a
helix: `H` precesses on a cone about the composite rotation's axis, and the rise
per step is `step × cos(angle between H and that axis)`.

**The catch is that the angle is almost exactly 90°.** `H` is the body's forward
axis and the composite axis lies very nearly in the up/left plane, so:

| angle | pitch | rotation/step | angle(H, axis) | rise per step of 50 |
|---|---|---|---|---|
| 90 | 1 | 90.0° | 89.50° | 0.44 |
| 3.52 | 0.1 | 3.52° | 89.95° | 0.04 |
| 3.52 | 3 | 4.63° | 88.86° | 1.00 |
| 30 | 30 | 42.18° | 79.27° | **9.31** |

The X component of that axis is second order in the two angles, so at small
angles there is essentially no advance and the curve wraps a **shell**. Which is
the module's own description in different words — *"one degree lifts the figure
into a shallow dome, five degrees into a deep shell"*. Over a 120-point grid of
small angles the best roundness obtainable was a radius varying sevenfold with
the path doubling back along the axis twenty times. No tunnel exists there.

### Where the helix is

Both angles large and comparable. Measured over 1,023 steps, radius taken about
the **centroid** axis — measuring from a line through the first point was the
error that hid this, since that point lies on the surface, not the axis:

| angle | pitch | roundness | radius | length | turns | reverses | axis off vertical |
|---|---|---|---|---|---|---|---|
| **54** | **8** | **0.997** | 55 | 3535 | 153 | 0 | **9°** |
| 58 | 12 | 0.961 | 51 | 5254 | 165 | 0 | 12° |
| 32 | 18 | 0.979 | 80 | 7024 | 91 | 0 | 30° |
| 52 | 56 | 0.996 | 39 | 17301 | 148 | 0 | 50° |

`1.00` is a perfect tube; `0 reverses` means it never doubles back, so it can be
flown. **The axis tilt is the column that decides usefulness**: the camera orbits
in azimuth and elevation, so only a near-vertical axis can be looked *along* at
`cam_elevation 90`. That rules out the roundest of them (52/56, tilted 50°) in
favour of 54/8.

### Three things the recipe depends on

- **The SCORE, as much as the angles.** The default rule's minus signs are what
  make a kolam. `axiom: F` with `F: F+F+F+F` expands to `F(+F)×1023` — uniform
  turning at every depth — and `depth` caps at **5**, so `4^5 = 1024` steps is
  the budget. `F: F+F` is uniform too but reaches only 32.
- **`step` must be near its maximum.** `effectiveStep = step / 3^(depth-1)`, so
  at depth 5 everything is 1/81 scale. With `step 9900` the tube comes out at
  radius ~134 and length ~8,600, and `cam_distance`'s floor of 20 is then
  comfortably **inside** it. At `step 50` the radius would be 0.7 and nothing
  could get in.
- **Flying through needs no new geometry.** At `cam_elevation 90` the camera sits
  at `(0, d, 0)` looking at the origin, so `cam_distance` **is** the position
  along the tunnel. Winding it down is the fly-through, and press-and-hold
  already gives a slow one. What is missing is only automation: there is
  `cam_elevation_speed` and no `cam_distance_speed`. One parameter of a shape
  that already exists.

### And the VR caveat, which is the serious one

**A slow fly-through is the most reliably nausea-inducing motion in VR**, and it
is exactly what §1's comfort requirement warns against — *in VR the steppers
must move the WORLD, not the eye*. Moving the tunnel past a stationary viewer
produces the same optical flow, so there is no trick that avoids it: the
mitigations are slowness and a stable reference frame in view. On a flat screen
this should be lovely. **In a headset, treat it as the one effect that must be
tested for comfort rather than assumed** — and note that it is the first thing
BD would do that the standing decision actively cautions about.

**Built as `bd_V_Kolam3D_002`**, seq 4 under the `bd_V_Kolam3D` gateway in the
Kolam3D cluster, so it is a script to open and adjust rather than a block of text
to paste. Reload BD to see it.

---

## 5c. Moving the world instead of the eye — the three mechanisms (2026-10-15)

The author's question: *"given that three.js has this VR capability — is there a
way of adjusting the world view independent of the camera, if as you say the
camera is effectively the viewer + headset?"*

Yes, and there are exactly three places to put it. They are not variations on a
theme; they differ in **what they move** and therefore in what the viewer feels.

### 1. Move the viewer's play space — the DOLLY

Put the camera inside a `Group` and transform the group:

```js
const dolly = new THREE.Group();
dolly.add(camera);
scene.add(dolly);
// the headset writes the camera's own pose; the dolly says where the
// play space sits in the world
dolly.position.set(…); dolly.quaternion.set(…);
```

This works because three's `WebXRManager` composes the user camera's PARENT
world matrix when it writes the XR pose each frame — `camera.matrixWorld =
parent.matrixWorld × camera.matrix`. So the headset still owns the camera and
the author still owns where the camera's world is. It is the standard pattern in
three's own XR examples.

**What it feels like: being carried.** The room moves with you, because the
play space IS the room. Which is the vection case — this is locomotion, and it
is the mechanism most likely to make someone ill.

### 2. Re-origin the tracking space — the OFFSET REFERENCE SPACE

`XRReferenceSpace.getOffsetReferenceSpace(new XRRigidTransform(pos, quat))`,
reached in three through `renderer.xr.setReferenceSpace()`. It re-origins the
whole session once, costs nothing per frame, and composes with the headset's
tracking rather than fighting it.

**Note the sense: the transform gives the NEW ORIGIN's pose in the OLD space, so
its effect on the viewer is the inverse of what it reads like.** That is the
first thing to get wrong.

**What it is for: recentring, not animating.** This is the right mechanism for
"take where I am looking and write it" (§9) and the wrong one for a fly-through.

### 3. Move the content — the ROOT GROUP

One group above everything the module draws, carrying the pose the camera
controls used to carry. **This is the one that matters here**, for a reason that
has nothing to do with VR:

**IT MAKES THE FLAT AND IMMERSIVE PATHS THE SAME CODE.** Re-express
`cam_azimuth`, `cam_elevation`, `cam_roll` and `cam_distance` as a transform on
the root group, leave the camera FIXED, and the flat screen becomes a special
case of the headset rather than a different renderer — one set of directives,
one code path, no branch on whether a session is running. Today the module has a
camera model that cannot survive `immersive-vr` at all (§9); after the
conversion it has none to lose.

**What it feels like: the figure moving in a still room** — the comfortable
option, and the one §1's standing rule has always been pointing at.

**And the whole conversion is testable on a flat screen TODAY**, which is the
part worth acting on. Rolling the camera and counter-rolling one rigid figure on
a plain ground are IDENTICAL PIXELS, so the refactor can be verified to the
pixel before any headset exists, and the remaining VR work is then a session
flag and a `setAnimationLoop`.

### What each of them costs, measured against the code as it stands

- The root group must sit **ABOVE** the existing `group`, which carries the
  `step_pitch` Y scale: a Y scale does not commute with a rotation about an
  arbitrary axis, so putting the pose on `group` itself would shear the figure.
- **The pivot becomes a decision that the camera model never had to state.**
  `cam_azimuth` orbits the eye about the look-at point; the content equivalent
  is rotating the content about that same point in the opposite sense. Rotating
  about the content's own centroid instead is a different picture, and both are
  defensible — so it has to be written down rather than fallen into.
- `camera.near` / `camera.far` are currently derived from `cam_distance`. In a
  session the projection belongs to the session (`updateRenderState({ depthNear,
  depthFar })`), so that logic moves rather than ports.
- `cam_distance` as a content translation is relatively identical to flying in,
  and at room scale it means the figure passing THROUGH the viewer. That is a
  composition question, not a bug.

All three mechanisms are **UNVERIFIED on hardware**. The dolly's parent-matrix
composition is read from three's source, not measured.

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

### New evidence, 2026-10-08 — text in the scene decides it

The author sketched a **second collage module: takes the text a line at a time
and displays it in 3D on a programmable interval.** It is for later, but it is
the first concrete thing that *requires* the shared scene, and that makes it
evidence in this fork rather than a feature request beside it.

Under **A**, a 3D text module gets its own iframe, its own WebGL context and its
own scene. The text is then composited with the Kolam figure **by CSS, not by a
depth buffer** — so it can never be occluded by the figure, and can never
intersect it. That is the one thing text in a scene offers over a flat DOM
overlay; without it, A's version of a 3D text module is a worse flat overlay
with extra machinery.

So the fork now has a third resolution alongside A and B: **the text is a MODE
INSIDE `V_Kolam3D`**, not a module at all. One scene, one context, no new
contract, and the occlusion works. It gives up composing text with an *arbitrary*
visual module, which is the thing B would buy.

Two numbers that bear on it, measured from the module (`CAM_FOV = 50`, square
canvas, default `cam_distance` 260 → a 242.5-world-unit vertical span):

- **world height ≈ 0.64 × desired cap height in CSS px**, scaling linearly with
  `cam_distance` — which is a live stepper (20–9900), so world-sized text swims
  unless it is parented to the camera or slaved to the distance.
- **A headset-safe line is ~18 characters**, against ~50 at a comfortable
  on-screen 14px equivalent: a Quest 3 gives ~25 pixels per degree where a phone
  gives ~95, so glyphs need 3–4× the angular size. §8c's rule, applied to text.

Also settled while measuring, and relevant to A: the Kolam canvas is **square**,
sized to the narrower wrapper dimension. On a portrait phone that makes the BD
preview (~380 px) and full-screen View (~390 px) **the same size** — so a
small-preview legibility worry is misplaced, and a collage laying several square
slots across a phone has far less glyph area than the arithmetic of screen width
suggests.

Full detail: `PLANNING_REGISTER.md`, *Added 2026-10-08 — text over a 3D graphic*.

---

## 8. The cheap test, before anything is built

Point the Quest browser at the **existing** viewer URL over the tunnel and look
at it as a flat 2D page. No code at all, and it answers the three real unknowns:

1. does the headset reach BD, and does the socket hold while worn;
2. how the current 1-pixel lines read at that pixel density (i.e. how urgent §6
   really is);
3. whether the frame rate is anywhere near acceptable before stereo doubles it;
4. **whether BD's own graph is usable in that browser window** — which decides
   whether §5C is real;
5. **whether Enter VR from inside the module iframe behaves** — the one
   dependency §5C rests on;
6. **how BD's own text reads at 16px (cards), 12.8px (helper cards) and 10px
   (node labels)** — the three sizes that matter, in that order of importance.
   The 8-11px chrome can be ignored: knowing where a button is beats reading it;
7. **whether cytoscape's pinch-zoom and drag-pan actually reach the page**
   through a controller ray and through hand tracking. **This is a dependency,
   not a nicety.** The §8b conclusion that node labels do not differentiate the
   headsets rests entirely on "a 1.2x pinch closes the gap" — if those gestures
   do not work cleanly in that browser, the mitigation evaporates and the labels
   matter again. `userZoomingEnabled` and `userPanningEnabled` are both true and
   `maxZoom` is 8, so the page is willing; the question is the input path.

   Note while testing that **head movement does NOT scroll the flat panel** — it
   is a window, not a gaze-following viewport. Panning a zoomed graph is a drag.
   Enlarging or nearing the panel is the only thing that makes looking around
   reveal more, and only for content that already fits the page. The immersive
   scene is the opposite case, where looking around IS the navigation — which is
   why §3a's camera steppers must move the world and not the eye.

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

So: cheapest storage, best optics and resolution affordable.

**The optics split is pancake versus Fresnel, and it is the one to weight above
raw resolution** — they usually come together anyway. Fresnel lenses have a
SWEET SPOT: sharp where you are looking, degrading toward the edges, so you keep
your head pointed at whatever you want to read instead of moving your eyes.
Pancake largely removes that. **That matters more here than it would for a
game**, because §5C means reading a text-heavy interface in a flat panel —
looking *around* a page — and because when the kolam fills the field of view,
edge clarity is where the pattern's outer reaches live.

As of a May-2026 cutoff the line was **Quest 3** (pancake, ~2064x2208 per eye)
and **Quest 3S** (Quest 3's chipset, Quest 2's Fresnel optics and lower
resolution). Lineups move and model names date badly, so check the current spec
sheet — but these criteria do not date, in this order for this use:

1. **lens type — pancake, not Fresnel**
2. per-eye resolution
3. refresh rate — 90 Hz or better, because the piece is continuous and §4 says
   smoothness beats fidelity
4. storage — whatever is cheapest

**In practice the lineup does not let you follow 4 (2026-09-28).** The available
choice was *Quest 3S at 128 GB* or *Quest 3 at 512 GB* — the good optics are not
sold with the small drive. **Take the Quest 3 anyway.** The 512 GB is money with
no return here, and it is the price of the lenses in the lineup on offer; for
this work the optics are not part of the toolchain, they are part of the piece.

**"Infinite Display" is Meta's brand name for that optical stack** — the panels
plus the pancake lenses — not a display technology despite the name. Pancake
lenses bounce light several times inside a stack of reflective and polarising
layers instead of letting it travel straight through, which folds the optical
path into ~40% less depth. Meta's own figures for it: **~25% sharper in the
centre of the field, ~70% sharper in the PERIPHERY**, with "significantly less
stray or scattered light artifacts".

Those two numbers are the two arguments below, in the manufacturer's own words.
The peripheral figure being nearly three times the central one *is* the
sweet-spot fix — you look around with your eyes rather than pointing your head,
which is exactly the reading motion §5C's flat panel demands. And "less stray or
scattered light" is the god-ray point.

(One real cost of pancake optics, relevant to the battery question: they are
**light-inefficient**. The folded path through polarisers discards most of the
panel's output, so the display must be driven much harder — part of why runtime
is what it is.)

The decisive reason is sharper than the general one. **Fresnel lenses produce
god rays — radial glare streaks — on bright content against dark backgrounds.**
BD is amber on black and the kolam is bright hue-cycling lines on `#0a0a0f`:
close to the worst possible content for Fresnel. And because the author reads by
luminance rather than hue (see the `user_colour_vision` memory), glare that
smears bright content across dark areas costs more here than it would most
people. On a 3S the palette would be fighting the optics.

The numbers agree, less dramatically. MEASURED against BD's smallest *essential*
text, the 10px cytoscape node label:

| | lenses | per eye | field of view | ~centre PPD | 10px label |
|---|---|---|---|---|---|
| Quest 3S | **Fresnel** | 1832 x 1920 | **96°** | ~20 | 8.3 px |
| Quest 3 | pancake | 2064 x 2208 | **110°** | ~25 | 10.4 px |
| a laptop | — | — | — | ~45 | 18.8 px |

**The 3S does not have the Infinite Display stack at all** — confirmed, not
inferred. It is physically thicker as a result, because Fresnel needs the air
gap that folding the light path removes. Road to VR's summary is the crisp one:
the 3S is *"effectively a Quest 2 upgraded with colour passthrough cameras, the
Quest 3's controllers and a much better processor… but not notably improved
optical quality."* **New chipset, old optics.**

**The FIELD OF VIEW is a third reason, and the most on-target of the three.**
96° against 110° is noticeably less of the world in view, and this piece is
built on immersion and presence with the figure meant to surround the viewer.
Glare and resolution bear on legibility; FOV bears on the work itself.

*Honest nuance that trims one of the arguments:* crudely dividing panel width by
field of view gives near-parity — 1832/96 ≈ 19 against 2064/110 ≈ 19. The quoted
PPD figures are CENTRE-of-field measurements, and the gap between those two ways
of counting is exactly what the lens stack does: pancake optics distribute
pixels better across the field, which is why Meta's periphery figure (~70%) is
so much larger than its centre one (~25%). So the label comparison below
probably overstates the 3S's disadvantage on text — consistent with the
correction already recorded there: **the labels are not the differentiator. The
glare and the field of view are.**

("4K+ Infinite Display" decodes as 4128 px across BOTH eyes — 2064 each — not
4K per eye.)

**But that row largely dissolves, and the correction matters.** Worked through
properly, the number that decides legibility is **x-height**, about half the em:

| | node label (10px) | SubFamily (6.8px) |
|---|---|---|
| Quest 3S | 4.2px x-height — *word-SHAPE recognition only* | 2.8px — **gone** |
| Quest 3 | 5.2px — *readable, effortful* | 3.5px — shape only |
| a laptop | 9.4px — comfortable | 6.4px — effortful |

So on a 3S you would recognise `bd_V_Kolam_001` by its shape once you knew it,
and could not read a name you had not seen. That is "guessing". **But the zoom
needed to close it is 1.2x on a 3S and 1.0x on a 3** — against a `maxZoom` of 8,
plus a resizable, movable window as a second lever on the same arithmetic.

**The labels are therefore NOT a real differentiator between the two headsets,
and weighting them was a mistake.** A small pinch erases the gap. What has no
user-side lever at all is the GLARE: Fresnel god-rays on bright-on-black are
optics, and no amount of zooming or resizing touches them. The recommendation
stands, on that one reason rather than two.

(Shaky input: the CSS-pixels-per-degree figure depends on panel placement, and
x-height varies by typeface. Test item 6 settles it in a minute.)

Same chipset either way, so nothing in the depth or smoothness policy changes.

The one case for the 3S: if this stays exploratory and budget binds. There is
even a silver lining — develop against the worse optics and nothing will ever
flatter you. But on the stated aim of a transformative experience, the glare is
not a development inconvenience, it is a defect in the work.

**One genuine unknown, and it is compute rather than storage:** whether Piper
speech synthesis runs acceptably in the Quest browser. It is WASM plus a neural
model on a mobile-class CPU, and BD's rule is that every high-data presentation
is derived on the client. Worth testing early if §5 is wanted, because it could
decide whether the headset carries the voice or only receives audio.

---

## 8c. Designing against hardware that improves slowly

> *"I'm designing on the assumption that the tech will gradually improve —
> though this is going very slowly for VR."* — 2026-09-28

Accurate, and the reason matters because it separates what will improve from
what will not.

**The wall is not panel manufacture.** Angular resolution costs its SQUARE in
rendering, doubled for stereo, on a battery. Approximate history and arithmetic:

| | ~PPD |
|---|---|
| Quest 1 (2019) | 14 |
| Quest 2 (2020) | 20 |
| Quest 3 (2023) | 25 |
| a laptop screen | 45 |
| "retina" for VR | 60 |

25% in three years on the mainstream line. Parity with a laptop needs **1.8x
linear = 3.2x the pixels**; 60 PPD needs **5.8x**. Hence foveated rendering as
the route out rather than bigger displays, and hence progress that arrives in
lumps.

**What to assume, then:**

| improves | does not, on any timescale worth designing around |
|---|---|
| GPU throughput — depth 4 and 5 become comfortable | text in a headset matching text on a screen |
| foveated rendering maturity | lens glare on bright-on-black (optics physics — mitigated, not solved) |
| angular resolution, slowly | |

### The rule that falls out: specify size in ANGLE, not pixels

**A 1-pixel line gets WORSE as hardware improves.** As PPD rises a 1px line
subtends less angle — finer, shimmerier, more aliased. Betting on better
hardware to rescue hairlines is backwards; it makes them thinner.

So anything sized in pixels *shrinks* as the tech improves, and anything sized
in angle or world units stays correct at 20 PPD and at 60. This is an argument
for `Line2` (§6) that does not depend on today's numbers at all. The same logic
says BD's 16px card text is safe — it scales with browser zoom — while the 6.8px
node label is not.

### The architecture already hedges this

§5C keeps the reading interface in a **flat panel**, where browser zoom is a
user-side lever entirely independent of hardware, and puts only the pattern in
the immersion. VR is *already* good at what the piece needs — scale, presence,
spatial audio — and bad at what the interface needs. The design routes around
the weakness instead of waiting for it to close.

And the three.js decision (§1) is the right shape for a bet on uncertain tech:
**cheap to hold.** If VR stays slow for another five years, nothing is lost —
three.js renders perfectly well on a flat screen.

### The guard

Designing for future hardware can quietly mean shipping something poor now. Keep
it good at TODAY's numbers and treat improvement as upside rather than a
dependency. §4's "depth 3 entirely smooth beats depth 5 that stutters" already
does exactly that, and is the model for the rest.

---

## 8d. Glasses — the horizon, and what does NOT transfer

Asked 2026-09-28, closing the fact-gathering: how do the flat-browser and
immersive halves work out on *specs*, which is where the research push is?

**The good news: §5C is the portable architecture, not a Quest-shaped
compromise.** WebXR ships in Chrome 79+, Edge, Opera, Samsung Internet, the
Quest browser and Safari on visionOS. **Android XR** is the vehicle — Samsung's
Galaxy XR headset shipped late 2025 as the first device, and **Xreal's Project
Aura AR glasses launch globally on it during 2026**, with more makers following.
Android XR means Chrome, and Chrome means WebXR. An ordinary page that hands off
to an immersive session is the standard model everywhere. Nothing to change.

**The bad news is that the optics INVERT.**

AR glasses are **additive displays**. Waveguides and birdbaths *add* light to
what you already see; they cannot render black. Black is transparent.

| | on a headset | on additive glasses |
|---|---|---|
| `%%bd_background #0a0a0f` | a black ground | **does not exist** — your room is the ground |
| BD's amber-on-black interface | fine in a flat panel | **worse** — low contrast over a lit room, washes out in daylight |
| the kolam: bright lines on near-black | glare on Fresnel (§8b) | **better** — glowing lines hanging in space, no visible ground |

**So additive displays suit the artwork and hurt the interface — the exact
inverse of the Quest**, where the interface is fine and the artwork suffers from
glare.

### …except that you can DIM the room, which largely answers it

Asked immediately after the above, and it revises it. **Electrochromic dimming
is standard on the relevant glasses, and it is graded.** XREAL Aura — the
Android XR device launching this year — has **5 levels**, described exactly as
wanted: fully black for VR, fully transparent for AR, manual or automatic.
Viture's Beast has **9 levels** with auto-transparency. Magic Leap 2 already
does **segmented** dimming — 5,000 independently dimmable zones, >300:1
contrast, 8ms response — though that is an enterprise device. CES 2026 showed
faster films coming.

So the black-background problem above is largely answered: dim the room and
`%%bd_background` becomes approximately real again, and the amber-on-black
interface regains its contrast.

*Honest caveat:* dimming gives a **dark grey, not black**. "Fully black" is
marketing; the one device with a published figure manages >300:1 and consumer
global dimming will be less. In a dim room — which this piece wants anyway —
close enough.

### The dial that a headset cannot offer

The important part is not the contrast fix. **Dimming is a continuous dial
between the two delivery modes of §5:**

| dimming | mode |
|---|---|
| fully transparent | **§5A facilitated** — the participant stays visually present in the room, the facilitator is *visible to them*, open-ear audio, grounded |
| fully dimmed | **§5C solo immersion** |

And it is adjustable **during** a session. A facilitator could bring someone
gently out of immersion by raising transparency rather than by taking a headset
off their face. For arts therapy and peer counselling that is a real therapeutic
affordance — and **a headset cannot offer it**: a Quest is binary, and its
passthrough is camera-mediated rather than optical, so "seeing the room" is
still a screen.

**That reframes glasses for BD.** Not merely the horizon, but potentially the
*better eventual target* — for reasons specific to what the system is FOR,
rather than for graphics.

**A connection worth keeping:** `?ink=1` — transparent bodies, identity carried
in the label — is **closer to an AR-ready theme than the default dark one is**.
If glasses become a target, that is the ancestor to build from.

**The counterweights still stand.** Field of view is far smaller — roughly
45-58° against the Quest 3's 110° — so an immersive figure is a *window* rather
than a surround, undercutting the presence the piece rests on. And WebXR
maturity on glasses trails headsets. **Still the horizon — but now worth
designing toward rather than merely tolerating.**

### So will glasses eventually do everything a Quest 3 does, minus FOV?

Asked 2026-09-28. Broadly yes, but not quite — and one of the differences runs
the opposite way from "newer will be better".

| | versus a Quest 3 | |
|---|---|---|
| **field of view** | ~45-58° against 110° | **worse** — a window, not a surround |
| **black** | dark grey even fully dimmed (>300:1 on the one published figure) | **different** — and arguably suits the figure, which becomes glowing lines in space |
| **sustained compute** | less thermal headroom in a lighter body | **WORSE, and this is the non-obvious one** |
| **angular resolution** | ~1080p over ~50° works out above ~25 PPD | **BETTER** — text may read better than in a headset |
| **the dimming dial** | — | **a capability the headset does not have at all** |

**The compute row is the one to take seriously.** The whole point of glasses is
small and light, and small and light means less thermal headroom — therefore
less *sustained* compute. This piece is precisely the sustained kind: a twenty
minute continuous session is the worst case for thermal throttling, where a
game's bursty load is the best. So everything already in question on a Quest —
Piper (§8b), Whisper (§5a), and the drift timer's geometry rebuild at depth 4-5
(§3) — gets **harder** on a lighter device, not easier. Meta's VR Glasses put
the compute on a tethered puck for exactly this reason.

**The resolution row is the pleasant surprise**, and it would answer §5's node
label question outright: fewer pixels over a much smaller field gives higher
angular density than a headset. Verify on any specific model, but the arithmetic
points the right way.

**So it is not "Quest 3 minus FOV".** It is a different trade — smaller window,
greyer black, less sustained compute, sharper text — **plus one thing the
headset cannot do in any form.**

### TWO DIVERGENT TRAJECTORIES (Meta Connect, 23-24 September 2026)

Checked because Meta had just held its conference. One announcement matters, and
**its name invites exactly the wrong reading.**

**Meta VR Glasses** — ~100g (5x lighter than Quest 3), magnesium frames,
**pancake lenses**, a **5K display with full-colour PASSTHROUGH**, processing
moved to a tethered puck (Snapdragon Reality Elite) holding battery and storage.
Runs all Quest games. **Spring 2027, $1,300.**

**These are VR glasses, NOT AR glasses.** Full-colour *passthrough* means an
opaque display in a spectacle form factor: the room arrives through cameras,
exactly as on a Quest. **So the dimming dial above does NOT apply to this
device.** The therapeutic affordance belongs to the *optical* see-through
category — Xreal, Viture, Magic Leap, Android XR — and Meta announced nothing in
that lane.

Which is the structural fact to carry:

| trajectory | what it is | does the §8d dial apply? |
|---|---|---|
| **Meta** | opaque VR, made smaller and lighter | **No** — camera passthrough is still a screen |
| **Android XR / Xreal / Viture / ML2** | optical see-through, made better | **Yes** — this is where the dial lives |

**BD's dial argument attaches to the second trajectory, not to Meta's.**

If the Meta device ships as described it would suit BD well — 5K and pancake at
100g address thin-line legibility and long-session comfort directly, and
"runs all Quest games" implies Horizon OS and therefore the Quest browser and
WebXR. *Flagged as inference:* Engadget explicitly notes no OS or browser detail
was given. And "5K" is ambiguous — Quest 3's "4K+" is 4128 COMBINED, so 5K
likely means ~2500 per eye: a bump, not a transformation.

**It changes nothing about buying now** — Spring 2027 and $1,300 against a
Quest 3 available today. §8b stands.

(Also from Connect, neither a BD platform: **Ray-Ban Display** widened
availability, now €899 in France, but it is a small heads-up display rather than
a canvas; and **Ray-Ban Meta Audio**, camera-free at $349, has no display at
all.)

**The free hedge**, in the spirit of §8c: keep the figure legible as **lines in
space** rather than as lines on a black ground. It costs nothing, because it
already is — near-black is very nearly transparent. Do not let anything come to
*depend* on the background being there.

---

## 8e. Readability on a Quest 3, and Quest 3 against Vision Pro (2026-10-15)

The author asked two things on the same day — which headset, and *"what are we
anticipating for BD readability on the Quest 3"* — and they turn out to be one
question, because the answer to the second decides the first.

### The arithmetic, which is the part worth keeping

**Quest 3 is about 25 pixels per degree.** One arcminute — roughly the limit of
20/20 vision — therefore gets **0.42 pixels**. The headset is *below* the
resolving power of the eye: its pixel structure is visible. A phone at ~95 PPD
gives ~1.6 px per arcminute and is above it.

Comfortable **sustained** reading wants a cap height of about 16–20 arcminutes.
On the Quest that is **7–8 pixels of cap height** — enough to read and not
enough to be crisp, because antialiasing has almost nothing to work with. Stems
look soft; thin strokes flicker as the head moves.

**What this does NOT mean is that text is too small.** Window size and distance
are the user's to set in the Quest browser, so angular size can always be
bought. What cannot be bought is **characters per line at that size**, which is
where the earlier measurement came from: **~18 characters per headset-safe line
against ~50 on a phone** (§8b).

### So BD has three kinds of text, and they fail at different points

| | anticipated on a Quest 3 |
|---|---|
| **View's prose** (`clamp(20px, 2.2vw, 28px)`; a collage's `clamp(11px, 4.2cqmin, 24px)`) | **Readable.** A Tao chapter is fine. The cost is line length, so BD's long cards and the module descriptions mean a great deal of scrolling, and sustained reading tires in a way a phone does not. |
| **Graph node labels, 6.8px** | **The thing that breaks first**, and BD's navigation is label-driven. Tempered by something §9 already knew and the first answer missed: **the graph zooms to 8×**, so a label can be enlarged — at the price of seeing fewer nodes at once, which is precisely what the graph is for. Whether 6.8px is hopeless or merely poor is the single most useful thing to learn from a real device. |
| **The immersive module** | `weight 0.5` is a hairline, and a one-pixel line at 25 PPD is a flickering thread — multiplied by eight overlapping symmetric copies. Expect to want heavier strokes in a session than on screen, which argues for `weight` becoming **angle-derived** when an immersive session is active rather than staying a fixed number. §6 and §8c already say this; the arithmetic above is the number behind it. |

### The conclusion, and it is not the one expected

**On a headset, speech stops being an accessibility extra and becomes the
primary reading mode.** Prose at eighteen characters a line is for glancing at;
the voice is for reading. Which means the speech work of 2026-10-13/14 — the
synthesis backlog, the serialisation, `maxLen` as a latency budget — **pays off
more on the headset than anywhere else**, and the Whisper dictation prototype
matters more too, because typing in a headset is worse than reading in one.

That also promotes two §9 rows from "open question" to "load-bearing": whether
Piper runs acceptably in the Quest browser, and whether Whisper and
`getUserMedia` do. They are no longer about convenience.

### Quest 3 against Vision Pro (M5), for BD specifically

| | Quest 3 | Vision Pro (M5) |
|---|---|---|
| per-eye resolution | 2064 × 2208, ~25 PPD | ~3680 × 3140, ~34 PPD |
| optics / FOV | pancake, ~110° | pancake, ~100° |
| `immersive-vr` in the browser | mature, most-exercised | **enabled by default since visionOS 2** |
| `immersive-ar` | yes | **not exposed** — no plane/mesh detection |
| WASM speed | Snapdragon XR2 Gen 2 | M5 — near-desktop |
| input | controllers + hands | eyes + hands, `transient-pointer` on a pinch |
| passthrough | colour, camera-mediated | best available |
| immersion control | passthrough on/off | **Digital Crown: a continuous dial** |
| dev loop | Chromium, `adb`, `chrome://inspect` | Safari Web Inspector from the Mac |

**The WebXR risk I first stated does not survive checking.** I warned that
buying the better display might mean discovering a WebXR gap that stops the
project dead. Safari on visionOS 2+ has `immersive-vr` **on by default**, with
hand tracking through the WebXR hand-input module; what it withholds is
`immersive-ar`, plane detection and mesh detection — **none of which BD uses**,
because under delivery shape C only the module goes immersive and it shows a
WebGL scene rather than the room. So the gap is in features BD has no use for.

What remains, then, is a genuine trade rather than a risk:

- **Vision Pro wins on the two things BD is made of.** ~34 PPD against ~25 is
  the difference between "readable with 3–4× glyph sizes" and something close to
  comfortable prose — and it revises §8b, which says the case for the better
  headset rests on glare and FOV *rather than* text legibility. That was true
  comparing Quest models. Against Vision Pro, **text is the biggest
  differentiator**, because BD is text-heavy. And M5 against XR2 is the
  difference between Piper and Whisper being usable and not — the ~50 ms per
  character measured on the Mac is the yardstick.
- **Quest 3 wins on the development loop**, and that is not a small thing:
  Chromium, `adb`, and `chrome://inspect` giving a real console for the page
  running in the headset.
- Two smaller points for the Vision Pro that are easy to miss: **eye-tracking
  plus pinch is better for small targets** than a ray, which suits BD's stepper
  columns; and debugging over Safari Web Inspector from a Mac the author already
  owns needs no `adb`.

**The recommendation is an order, not a choice:** the Quest is the better place
to *build* and the Vision Pro looks like the better place to *deliver*. They do
not conflict.

### A correction to §8d's dial argument

§8d says a continuously adjustable depth of immersion is "a therapeutic
affordance no headset can offer", reserving it for the optical see-through lane.
**The Vision Pro's Digital Crown is that dial today** — blended continuously
between passthrough and the immersive scene. The real distinction is
**optical versus camera-mediated** transparency, not whether a dial exists. The
argument for glasses survives, but on the narrower ground: optical see-through
passes the room through unprocessed, where a camera-mediated dial is still a
screen. For the facilitated case (§5A) the Crown is already enough to turn a
participant back toward the room without removing anything.

### Getting a URL into a headset — and a correction I had to make

I told the author a QR code could not open a web page in a headset. **That was
wrong for the Quest, and his own recollection was right**: BD's Device button has
generated a QR for exactly this purpose since September.

- **Quest 3 / 3S** — Horizon OS v2.9 adds a **built-in** scanner opened by voice
  ("Hey Meta, open QR code scanner") or from Quick controls, reading codes
  through passthrough with an open-link action; currently on the Public Test
  Channel. Third-party scanners do the same on the release channel today.
- **Vision Pro** — no native scanner. A third-party app exists, so it works on a
  device you own and have installed it on.
- **A demo unit in a shop** — nothing can be installed and no account is yours,
  so Handoff, iCloud tabs and AirDrop are all out and the URL must be **typed by
  gaze and pinch**.

So the rule is about **whose device it is**, not about QR codes — which is the
over-generalisation I made. Two consequences, both built 2026-10-15:

- **`/x`** — the headset check, at the shortest path there is because every
  character is paid for by hand on a demo unit. It reports `navigator.xr`,
  `immersive-vr`, `immersive-ar`, threads and the blend mode; shows BD's OWN
  text sizes (28, 24, 17, 11 and the 6.8px node label) with an 18- and
  50-character ruler; enters an immersive session with three text sizes on a
  CanvasTexture plane at 1.6 m and reports input-source kinds and frame rate;
  and times one 400-character Piper utterance in **ms per character**, directly
  comparable with the Mac's ~50. Nothing downloads unasked.
- **`/qr`** — a QR for any BD URL, defaulting to `/x`, reusing BD's own
  `qrcode.js` so there is one encoder in the project and not two.

**Thirty seconds on a real device beats all of the above**, and the one number
to come back with is whether 6.8px node labels resolve at all.

---

## 9. Open, in one place

| question | notes |
|---|---|
| **The collage fork (§7)** | The one that must be settled first. |
| **Do the world-transform refactor NOW? (§5c)** | **The one item on this list that needs no headset.** Re-express `cam_azimuth`/`cam_elevation`/`cam_roll`/`cam_distance` as a transform on a root group above `group`, fix the camera, and the flat and immersive paths become one code path — verifiable to the pixel on a flat screen, because camera-roll and content-counter-roll of one rigid figure are identical. Decide the PIVOT explicitly (§5c). Not started. |
| **ALIGNMENT FROM THE OTHER END (2026-10-15)** | **The author's observation, and it reframes the arcminute work.** If the world is what moves, then in a headset the VIEWER supplies the fine alignment: you lean a fraction of a degree instead of dialling one. Three things follow. **(1) It is finer AND better conditioned.** Inside-out tracking resolves well under a tenth of a degree, against a stepper's one degree — or one arcminute with `cam_azimuth_minutes` / `cam_elevation_minutes` — and it is CLOSED-LOOP: you see the result while you move, where a stepper is dial-then-look. The badly-conditioned bit of the spherical-coordinate aim (§5b: at elevation 82 a degree of azimuth is 0.139° of view and a degree of elevation is a whole one) simply stops being the author's problem, because the head does not work in azimuth and elevation. **(2) It is good for FINDING an alignment and bad for HOLDING one.** A neck held off-axis for a minute-long fly-through is precisely the wrong ergonomics for a long contemplative piece. So the headset wants the inverse of `cam_axis`: not "measure the geometry and write the bearing" but **"take where I am looking and write it"** — the same shape, the other instrument. That is a real control to build, and the thing that makes head alignment persist. **(3) The right primitive is not a group rotation.** WebXR already has this: `XRReferenceSpace.getOffsetReferenceSpace(XRRigidTransform)`, reached in three through `renderer.xr.setReferenceSpace()`. It re-origins the world for the whole session, costs nothing per frame, and composes with the headset's own tracking instead of fighting it. UNVERIFIED on hardware. |
| **EYE OR OBJECT? (2026-10-15)** | **The author's question — "are we reversing the roles so that the object is the one moving conceptually?" — and the answer is NO, not yet.** **AND IT IS NOT MERELY A COMFORT CHOICE: in an immersive session the eye-moving model STOPS WORKING.** `renderer.xr` takes the camera pose from the headset every frame, derived from the reference space, so `camera.position.set` and `camera.lookAt` are simply overwritten — the module cannot place its own eye at all. Moving the world is the PRECONDITION for an immersive session, not a concession to the stomach. That is the strongest argument in this table for doing it, and it was reached by the author asking the question rather than by scoping the port. All five camera controls move the EYE: `cam_azimuth`, `cam_elevation`, `cam_roll`, `cam_distance` and their speeds place and point a camera orbiting a target. **On a flat screen that is not a choice at all** — the scene is one rigid figure on a plain ground, so rolling the camera and counter-rolling the object give IDENTICAL pixels, and spending anything on the distinction today buys nothing. **In a headset they are not remotely the same thing**, which is what §1's standing rule already says: move the WORLD, not the eye. Camera roll rolls the viewer's own horizon — the motion the vestibular system has no matching signal for — where rotating the object leaves the room still. `cam_distance` has the same split: an eye flying forward is the vection that makes people ill; an object approaching is far more tolerable. So the conversion is **the whole camera model at once, not one control**, and `cam_roll` is the one to convert first. COST, measured against the code as it stands: the rotation cannot go on `group`, which carries the `step_pitch` Y scale, because a Y scale does not commute with a rotation about an arbitrary axis — it needs an outer wrapper holding the alignment, and the axis moves whenever the aim does. The flat-screen equivalence is what makes this safe to defer; it is **not** an argument that it will not be needed. |
| **Retire `bd_V_Kolam`?** | The 3D module is a *measured* superset. Costs: `weight` (§6), and the canvas rasterises a bezier for free where three tessellates it. Two stored nodes would need migrating. |
| **Is BD's UI legible in the flat window? (§5, §8e)** | A TEST ITEM, not a blocker. The reading path is 16px; the sub-11px items are chrome whose position a user learns. The only real risk is the 10px / 6.8px node labels, and the graph already zooms to 8x. **§8e adds the arithmetic**: 25 PPD gives 7–8 px of cap height at a comfortable angular size, so prose reads but at ~18 characters a line. **Measure it with `/x`** — the one number wanted is whether 6.8px resolves. |
| **Delivery shape (§5)** | Leaning C — BD flat in the Quest browser, module immersive. A (facilitated, two people) stays alongside it; both run the same module. Depends on the iframe/immersive-session question. |
| **Does the headset carry music and voice (§5a)?** | Under §5C it must, because there is only one device. That makes the Piper question (§8b) load-bearing rather than optional. |
| **Depth / drift policy inside a session (§3)** | Cap depth, slow drift, or move the L-system off the main thread. |
| **Scale directive (§3b)** | Table, room, or building. A design decision, not a constant. |
| ~~**`cam_distance_speed`**~~ | **BUILT 2026-10-15.** Signed world units a second, negative inward. It rides on `cam_elevation_speed`'s existing 20-a-second clock rather than bringing its own — one draw per tick, one write-back throttle, one place to stop. It CLAMPS AND STOPS rather than wrapping or bouncing: an angle is cyclic and a distance is not, and a piece that arrives somewhere beats one that never ends. On arrival the clock stops entirely, because twenty redraws a second for a motionless camera is a real battery cost in a module meant to run for hours. **§5b's comfort caveat still stands and is now testable**: the fly-through exists, so the question of whether it is bearable in a headset is a measurement rather than a worry. **AND IT IS NOW TWO MEASUREMENTS** — `cam_roll_speed` (2026-10-15) rolls the camera about the flight axis, and a roll about the view axis is the motion the vestibular system has no matching signal for at all, where a yaw at least resembles turning your head. A fly-through that also rolls is this caveat squared. Test them separately before testing them together. |
| **A yaw-ONLY symbol, or a roll? (§5b)** | `+` couples yaw and pitch, which is why helices exist only at large comparable angles. A third rotation — a roll about the heading — or a symbol that yaws without pitching would open up helices at any tightness, and much else. A change to the SCORE GRAMMAR, so it needs a name and a migration story. Not needed for the tunnel, which exists without it. |
| **WebGL context ceiling** | Measure on desktop Safari, iOS Safari, Quest. |
| **`Line2` (§6)** | Worth it for VR; the ESM/import-map cost is known and real. |
| **Does anything DEPEND on the black background? (§8d)** | The free hedge for additive AR displays, where black is transparent. Keep the figure legible as lines in space. Costs nothing today. |
| **An AR theme, if glasses ever matter (§8d)** | `?ink=1` is the closer ancestor than the dark default. Not now — FOV and WebXR maturity both trail headsets. |
| **Which trajectory to watch (§8d)** | Meta is making opaque VR smaller (VR Glasses, spring 2027); Android XR and the glasses makers are making optical see-through better. **BD's dial argument attaches to the second.** Watch that lane, not Meta's. |
| **Immersion as a DIAL, not a switch (§8d, corrected §8e)** | Electrochromic dimming makes depth-of-immersion continuous and adjustable mid-session — a facilitator can raise transparency instead of removing a headset. ~~A therapeutic affordance no headset can offer~~ — **the Vision Pro's Digital Crown is that dial today.** The real distinction is OPTICAL versus CAMERA-MEDIATED transparency, not whether a dial exists. The glasses argument survives on that narrower ground. |
| **Does Piper run in the Quest browser? (§8b, §8e)** | Compute, not storage. **Promoted from open question to LOAD-BEARING by §8e**: at 25 PPD, speech is the primary reading mode rather than an extra, so this decides whether BD is usable on a Quest at all. The yardstick is ~50 ms per CHARACTER on the Mac, and `/x` measures it in one press. |
| **Text in the scene — module or MODE? (§7)** | A line-at-a-time 3D text module is the first thing that NEEDS the shared scene: under A its text cannot be occluded by the figure (CSS composites, not a depth buffer). Third resolution: make the text a MODE inside `V_Kolam3D`. Gives up composing text with an arbitrary visual module, which is what B buys. |
| **How is 3D text sized? (§7)** | `cam_distance` is a live stepper 20–9900, so world-sized text swims. Parent it to the camera (fixed angular size) or slave its scale to the distance. Decide before building. |
| **Two clocks: speech vs the line interval** | Piper utterance length is not predictable from character count. Default worth assuming: **speech drives, the interval is a floor.** Named, not decided. |
| **`MODULES.kind` is a binary** | A timed module with visual output is both. Needs a third value or a second axis before a line-at-a-time text module exists. |
| **Does anything need a TRANSPARENT 3D canvas?** | `V_Kolam3D` has no `alpha: true`, so a dimmed figure is still an opaque near-black rectangle. Fine while the ground is `#0a0a0f`; two stacked visual slots or a light background need `alpha: true` + `setClearAlpha(0)` + `scene.background = null`. A change to the MODULE. |
| **Does Whisper / `getUserMedia` work there too? (§5a, §8e)** | Same shape as the Piper question, same test. `sr_editor.html` would run off the built-in mic — note that 3.5mm inline mics are not supported, so there is no wired fallback. **Also load-bearing now**: typing in a headset is worse than reading in one, so dictation is the input method rather than a convenience. |
| **Which headset (§8e)** | **The WebXR risk is gone**: visionOS 2+ has `immersive-vr` on by default and withholds only the AR modules BD does not use. What is left is a trade — Vision Pro wins on the two things BD is made of (~34 PPD against ~25, and M5 against XR2 for Piper/Whisper); Quest wins on the development loop (Chromium, `adb`, `chrome://inspect`). An ORDER rather than a choice: build on the Quest, deliver on the better display. |
| **Should `weight` be ANGLE-derived in a session? (§6, §8e)** | At 25 PPD a 1px line is a flickering thread, eight times over. Not built, and §8c's rule already says to size in angle. |
| **Do the graph's label sizes need a headset case? (§8e)** | 6.8px will not resolve at 25 PPD without zooming, and zooming defeats the graph's purpose. One or two cytoscape numbers behind a device test — but do the test first. |

---

## Related

- `CollagePlanStarted_2026-09-22.md` — the collage plan proper; §7 here is a
  fork inside it, and RULE 9 there came out of §6 here.
- `BDX_DEMO_PLAN.md` — the BDX harness whose third-party-authoring argument §7
  has to protect.
- `AV/README.md` — the viewer this would become.
- `PLANNING_REGISTER.md` — how far each of the above is built.
