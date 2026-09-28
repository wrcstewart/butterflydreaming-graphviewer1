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
3. whether the frame rate is anywhere near acceptable before stereo doubles it;
4. **whether BD's own graph is usable in that browser window** — which decides
   whether §5C is real;
5. **whether Enter VR from inside the module iframe behaves** — the one
   dependency §5C rests on;
6. **how BD's own text reads at 16px (cards), 12.8px (helper cards) and 10px
   (node labels)** — the three sizes that matter, in that order of importance.
   The 8-11px chrome can be ignored: knowing where a button is beats reading it.

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

The decisive reason is sharper than the general one. **Fresnel lenses produce
god rays — radial glare streaks — on bright content against dark backgrounds.**
BD is amber on black and the kolam is bright hue-cycling lines on `#0a0a0f`:
close to the worst possible content for Fresnel. And because the author reads by
luminance rather than hue (see the `user_colour_vision` memory), glare that
smears bright content across dark areas costs more here than it would most
people. On a 3S the palette would be fighting the optics.

The numbers agree, less dramatically. MEASURED against BD's smallest *essential*
text, the 10px cytoscape node label:

| | per eye | angular density | 10px label renders as |
|---|---|---|---|
| Quest 3S | 1832 x 1920 | ~20 PPD | **8.3 px** |
| Quest 3 | 2064 x 2208 | ~25 PPD | **10.4 px** |
| a laptop | — | ~45 PPD | 18.8 px |

Roughly 10 rendered pixels of glyph height is the floor for legibility, so 8.3
is below it and 10.4 is just above. ("4K+ Infinite Display" decodes as 4128 px
across BOTH eyes — 2064 each — not 4K per eye.)

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

## 9. Open, in one place

| question | notes |
|---|---|
| **The collage fork (§7)** | The one that must be settled first. |
| **Retire `bd_V_Kolam`?** | The 3D module is a *measured* superset. Costs: `weight` (§6), and the canvas rasterises a bezier for free where three tessellates it. Two stored nodes would need migrating. |
| **Is BD's UI legible in the flat window? (§5)** | A TEST ITEM, not a blocker — the earlier framing over-called it. The reading path is 16px; the sub-11px items are chrome whose position a user learns. The only real risk is the 10px / 6.8px node labels, and the graph already zooms to 8x. If a fix is needed it is one or two cytoscape numbers. |
| **Delivery shape (§5)** | Leaning C — BD flat in the Quest browser, module immersive. A (facilitated, two people) stays alongside it; both run the same module. Depends on the iframe/immersive-session question. |
| **Does the headset carry music and voice (§5a)?** | Under §5C it must, because there is only one device. That makes the Piper question (§8b) load-bearing rather than optional. |
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
