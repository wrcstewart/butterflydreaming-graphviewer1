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
| **Does anything DEPEND on the black background? (§8d)** | The free hedge for additive AR displays, where black is transparent. Keep the figure legible as lines in space. Costs nothing today. |
| **An AR theme, if glasses ever matter (§8d)** | `?ink=1` is the closer ancestor than the dark default. Not now — FOV and WebXR maturity both trail headsets. |
| **Which trajectory to watch (§8d)** | Meta is making opaque VR smaller (VR Glasses, spring 2027); Android XR and the glasses makers are making optical see-through better. **BD's dial argument attaches to the second.** Watch that lane, not Meta's. |
| **Immersion as a DIAL, not a switch (§8d)** | Electrochromic dimming makes depth-of-immersion continuous and adjustable mid-session — a facilitator can raise transparency instead of removing a headset. A therapeutic affordance no headset can offer, and the strongest argument for glasses as an eventual target. |
| **Does Piper run in the Quest browser? (§8b)** | Compute, not storage. Decides whether the headset carries the voice or only receives audio. |
| **Does Whisper / `getUserMedia` work there too? (§5a)** | Same shape as the Piper question, same test. `sr_editor.html` would run off the built-in mic — note that 3.5mm inline mics are not supported, so there is no wired fallback. |

---

## Related

- `CollagePlanStarted_2026-09-22.md` — the collage plan proper; §7 here is a
  fork inside it, and RULE 9 there came out of §6 here.
- `BDX_DEMO_PLAN.md` — the BDX harness whose third-party-authoring argument §7
  has to protect.
- `AV/README.md` — the viewer this would become.
- `PLANNING_REGISTER.md` — how far each of the above is built.
