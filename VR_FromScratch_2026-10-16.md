# From the figure to the headset screens — from scratch

**2026-10-16.** Written because a diagram did not help, and a diagram that does
not help is usually one that assumes the thing it was meant to explain. This
starts from nothing and defines every term the first time it is used.

It answers one question: **when a headset is on, how does a number the turtle
wrote become a lit pixel in front of someone's eye?** Everything else here is in
service of that.

`ThreeJS_and_VR_2026-09-28.md` §5c–§5k covers the same ground for a reader who
already has the vocabulary. This document is the one to read first.

---

## How to read the "degree of virtuality" labels

The author asked that each thing be marked for how real it is, which turns out to
be the most useful organising idea in the whole subject — because the confusion
comes almost entirely from treating things of different kinds as if they were the
same kind of thing. Five kinds appear:

| label | what it means | can it be wrong? |
|---|---|---|
| **PHYSICAL** | exists in the world whether or not any software runs | no — it just is |
| **MEASURED** | a physical fact the hardware estimates, in metres, with error | **yes** — drift, noise, loss of tracking |
| **DECLARED** | a decision somebody wrote down; no physical counterpart at all | not wrong, but it can be *unwise* |
| **PURE NUMBER** | digits with no unit and no meaning until something maps them | meaningless rather than wrong |
| **DERIVED** | computed this frame from the above, thrown away, recomputed | wrong only if the inputs are |

A sentence to keep: **the room is PHYSICAL, the figure is PURE NUMBER, and
everything difficult happens in the DECLARED layer between them.**

---

## Step 1 · The room

> **THE ROOM** — the actual physical space the person is standing in. Floor,
> walls, a chair they might bark their shin on.

**Degree of virtuality: PHYSICAL.**

**Coordinates: none.** This is the point. The room has no coordinates, in the
same way that Tuesday has no colour. Coordinates are something we *impose* on
the room in the next step, and a different choice would have done as well.

It belongs in this list because it is the only thing here that can hurt you, and
because every comfort question in this project is a question about the
relationship between the room and everything else.

---

## Step 2 · The plate

> **THE PLATE** — a coordinate frame laid over the room, so that positions in
> the room can be stated as numbers. Its proper name in the standard is an
> **XRReferenceSpace**; "the plate" is this project's word for it, because once
> it exists it can be picked up and set down somewhere in a virtual world, like
> a movable floor plate with the person standing on it.

**Degree of virtuality: a DECLARED frame over a PHYSICAL thing.** The room is
real; where we decide to put the origin is not.

**Coordinates: metres, and this is not negotiable.** The standard fixes the unit.
Several kinds of plate exist; the one three.js asks for by default is
`local-floor`:

- origin **on the floor**, directly below where the person's head was when the
  session started
- **+Y up**, away from the floor
- **−Z the direction they were facing** at that moment
- +X to their right

So a person standing still at the start is at about **`(0, 1.6, 0)`** — the 1.6
being their eye height in metres. Take one step forward and they are at about
`(0, 1.6, −0.7)`. Negative Z, because forward is −Z. That sign catches everyone
once.

**The thing to hold on to: the plate is pinned to the room.** It does not move
when the virtual world moves. That single fact is why a person's own body is a
reliable reference for them and why moving the world around them is the
uncomfortable option.

---

## Step 2a · Where does the floor come from, and is the eye height set or read?

The author: *"you had some explanation about choosing origin floor and then
`camera.position` was 1.2 m up the Y axis — are you saying that coordinate is
just read in some way, or that it determines the floor, i.e. the headset
constitutes the origin in reality and the 1.2 sets the floor?"*

**It is READ, and it is not one measurement but the difference between two.**
Pulling the origin apart axis by axis is what makes this clear, because the three
axes do not come from the same place:

| | what fixes it | when | kind |
|---|---|---|---|
| the origin's **X and Z** | **the headset** — where the viewer was standing | once, at session start | MEASURED |
| the origin's **Y** | **the room** — the floor, as the device knows it from room setup or its own floor estimate | once | MEASURED |
| the origin's **facing** | **the headset** — where the viewer was looking, levelled to gravity so only the yaw survives | once, at session start | MEASURED |
| the head's position | **tracking** | **every frame** | MEASURED |

So the author's phrase is right about half of it: **the headset does constitute
the origin in reality — horizontally. The room constitutes it vertically.**

And then:

```
  camera.position.y   =   where the head is   −   where the floor is
                          (tracked, per frame)    (the device's room knowledge)
```

**Nothing anywhere chose 1.6, or 1.2.** It is a *subtraction of two measurements*,
and its value is a fact about the person: how tall they are and how they are
holding their head. That is what the MEASURED label in this document is for —
and this is the clearest example of it in the whole chain, because it looks so
much like a setting.

### Which has a consequence worth acting on

**You cannot assume an eye height.** Plausible values for the same code:

```
  1.75   a tall adult standing
  1.60   an average adult standing
  1.20   a child, or a short adult        ← the author's number, and a real one
  1.10   anybody sitting down
  0.30   somebody lying on a sofa
```

So a figure placed on the assumption of a 1.6 m eye is **seen from below by a
child and from well below by a seated viewer**. The fix costs nothing:

> **Read `camera.position.y` on the first frame and place things relative to
> that**, rather than hard-coding a height. §8a establishes why that reading is
> available and what frame it is in — it is the head in the ROOM's metres, which
> is exactly the number wanted here.

### And this is the whole reason to ask for `local-floor` rather than `local`

> **`local`** — origin at the viewer's head position at session start.
> **`local-floor`** — the same, moved down to the floor.

Under `local`, the head starts at about `(0, 0, 0)` and **eye height is simply
not available**: there is no floor in the frame to measure from. Under
`local-floor` the floor is `y = 0`, so `camera.position.y` *is* the eye height,
free, every frame.

three.js asks for `local-floor` by default, which is the right default and worth
knowing is a default rather than a law — `renderer.xr.setReferenceSpaceType()`
changes it, and changing it to `local` would silently remove the one number this
section is about.

---

## Step 3 · The head pose

> **POSE** — a position *and* an orientation together. Six numbers: three for
> where, three for which way round.
>
> **THE HEAD POSE** — where the person's head is, stated in the plate's
> coordinates, as estimated by the headset's cameras and sensors.

**Degree of virtuality: MEASURED.** It is an estimate of a physical fact. It has
noise, it drifts, and it can be lost entirely if the cameras are covered.

**Coordinates: metres, in the plate's frame.** For example:

```
  position     (0, 1.62, -0.10)      leaning 10 cm forward, eye height 1.62 m
  orientation  identity               facing the way they started
```

**Nobody writes this.** It arrives. Each frame the browser hands it over and the
only correct response is to use it. There is no supported way to set it, and
wanting to set it is the single most common misunderstanding about VR
programming — it is the equivalent of wanting to decide where someone's head is.

---

## Step 4 · Is there a headset virtual camera?

The author's question, and the honest answer is **no — there are two, and you do
not own either of them.**

> **A VIEW** — one eye's worth of seeing: a pose, plus a description of the
> shape of what that eye can see. The standard calls it an **XRView** and hands
> over one per eye, normally two.

**Degree of virtuality: DERIVED, from a MEASURED head pose.** Each eye's pose is
the head pose with that eye's offset applied — about 32 mm either side of centre
for a 64 mm separation.

**Coordinates, continuing the example above:**

```
  left eye   (-0.032, 1.620, -0.100)
  right eye  ( 0.032, 1.620, -0.100)
```

Each view also carries a **projection matrix** — the exact shape of its visible
cone:

> **PROJECTION MATRIX** — the arithmetic that turns "where something is in front
> of the eye" into "where it lands on the picture". It encodes the field of view.

**And this is the part worth knowing: the projection matrix comes from the
headset, not from you.** It is **asymmetric** — the visible cone is not centred
on the eye's axis, because the lens is not. On a Quest you can see more towards
your temple than towards your nose. A camera with a single "field of view"
setting cannot describe that, which is why the runtime supplies the matrix ready
made and why `CAM_FOV = 50` in `V_Kolam3D` has no meaning in a session.

In three.js these two appear as `cameraL` and `cameraR` inside an **ArrayCamera**
obtained from `renderer.xr.getCamera()`. **three creates them, not you.** They
are the cameras that actually render.

---

## Step 5 · The figure, in pure numbers

> **THE FIGURE** — in this project, the Kolam: the output of the turtle walk. A
> long list of vertex positions, held in a `Float32Array` on the GPU.

**Degree of virtuality: PURE NUMBER.** This is the most abstract thing in the
document and the easiest to mistake for something concrete. The turtle was told
`step 9900`, `angle 54`, `depth 5`, and it produced numbers. **Those numbers have
no unit.** They are not metres, not centimetres, not anything. `step 9900` is not
9900 of something; it is 9900.

**Coordinates: a sample vertex, chosen for this document:**

```
  (12, 400, 0)          12 across the tube, 400 along it
```

Nothing about that is a length until Step 6 says what it is a length *of*. The
whole figure is like this: `bd_V_Kolam3D_002` spans several hundred of these
unitless numbers, and a figure "600 across" is 600 across *of nothing in
particular*.

This is also where the module's own `group` lives, so one definition more:

> **`group`** — a three.js `Object3D` holding the figure. The symmetry copies
> hang off it as children, each turned about Y, and `group` itself carries the
> `step_pitch` scale in Y.

---

## Step 6 · The plan, or world coordinates

> **WORLD COORDINATES**, which this project calls **THE PLAN** — the single
> frame the scene is described in. Everything drawable has a position in it.

**Degree of virtuality: DECLARED, and entirely so.** There is no fact of the
matter about where the world's origin is. Somebody picked it.

**Coordinates: whatever units the author decides** — and the decision is made by
the transform that maps the figure into it. Two choices, with wildly different
consequences:

**(a) Leave it alone.** `group` is effectively the identity, which is what
`V_Kolam3D` does today. Then the figure's unitless numbers become world
coordinates unchanged, and because the plate's numbers are metres, **a vertex at
400 is 400 metres away.** On a flat monitor this is harmless — the camera is
placed in the same units and nothing else in the scene disagrees. **In a session
it means you see nothing**, because the figure is kilometres wide and starts
hundreds of metres off.

**(b) Map it deliberately.** For this document, make the tunnel four metres long
and float it at eye height, two metres in front of where the person started:

```
  group.matrix  =  translate(0, 1.6, -2)  ·  rotate -90° about X  ·  scale 0.01
```

Then, computed:

| | figure numbers | world coordinates |
|---|---|---|
| the mouth | `(0, 0, 0)` | `(0.00, 1.60, -2.00)` |
| the far end | `(0, 400, 0)` | `(0.00, 1.60, -6.00)` |
| our sample vertex | `(12, 400, 0)` | `(0.12, 1.60, -6.00)` |

Read in order, the three parts of that transform say: **scale 0.01** — one
hundred figure units is a metre; **rotate −90° about X** — the tube ran up the
figure's own Y, lay it down along −Z so it runs away from the viewer; **translate
(0, 1.6, −2)** — lift it to eye height and push it two metres out.

**World coordinates are now in metres**, because that transform decided so. They
were not before and nothing forced it.

---

## Step 7 · `.parent` — where the plate stands on the plan

> **`camera.parent`** — an ordinary three.js `Object3D` that has the camera as a
> child. Nothing about it is special. It is a scene object like any other.

**Degree of virtuality: DECLARED.**

Its one distinction is a convention: **three.js looks at `camera.parent` when it
writes the headset's pose, and treats that object's transform as the map from
the plate's frame into the plan's.** So:

```
  where an eye is on the plan  =  the .parent's transform     ← yours, DECLARED
                                ×  the head pose              ← the runtime's, MEASURED
                                ×  that eye's offset          ← the runtime's, DERIVED
```

**Coordinates, for the two useful cases:**

```
  (i)  no .parent at all, or an identity one       ← the default
       position (0,0,0)  ·  no rotation  ·  scale 1
       The plate's numbers and the plan's numbers are THE SAME NUMBERS.
       This is why it is tempting to say "world coordinates are the room" —
       true here, and false the moment anyone places the plate.

  (ii) the plate set down inside the figure
       position (0, 1.6, 600)  ·  rotation 180° about Y  ·  scale 100
       The plan is now in figure units, and one metre of real walking
       covers a hundred of them.
```

**In `V_Kolam3D` today there is no `.parent`.** The camera is never added to the
scene at all; `placeCamera` writes coordinates straight into it. On a monitor
that is correct and complete — nobody is standing anywhere, so no plate is
needed. **A headset is the situation where somebody *is* standing somewhere**, so
the plate exists whether or not the code acknowledges it, and `.parent` is where
the code gets to say where it stands.

---

## Step 7a · So what actually *determines* any of these numbers?

The author, having read the above: *"so the scale is set by us? After that, in
case (b), what actually determines the world coordinates, and what determines
the coordinates of the plate in the world coordinates — assuming it is that way
round?"*

Taking the easy half first. **Yes, it is that way round.** `camera.parent`'s
transform maps **plate coordinates → world coordinates**, so it holds the
plate's position, orientation and scale *expressed in world coordinates*. Its
inverse runs the other way and answers "where is that vertex relative to the
room".

Now the hard half, and the answer is uncomfortable but it is the truth:

> **NOTHING DETERMINES WORLD COORDINATES. They are a free choice — a gauge, in
> the physicist's sense. Any choice works provided everything is described
> consistently in it, and no measurement anywhere can tell you which one was
> picked.**

That is why Step 6 is labelled DECLARED and not MEASURED. There is no fact of
the matter.

### The one real constraint: the two transforms are a single decision

What you actually have is **one** thing to decide and **two** places to write it:

```
   how the figure is placed        (group.matrix)
   where the plate stands          (camera.parent)
                                   ─────────────────
   the viewer's relation to the figure     ← the ONLY thing that has consequences
```

§5k of `ThreeJS_and_VR` proves it with numbers: every ratio that reaches the eye
is identical whichever of the two carries the work. So the question "what
determines the plate's coordinates" has this answer: **the plate's placement is
the residue.** Decide the relationship you want, decide how much of it to put in
the figure's transform, and what is left over is the plate's. It is not an
independent fact and there is nothing to look up.

**In case (b) I put the whole mapping in `group.matrix` and left the plate as
the identity.** So the plate's coordinates in the world are `(0,0,0)`, no
rotation, scale 1 — and world coordinates came out in metres as a *consequence*
of that, not as a separate decision. The plate's numbers are metres, the identity
map preserves them, so the world's numbers are metres too.

### The practical rule, then

**Decide the relationship in physical words first.** "The viewer stands two
metres back from a four-metre tunnel, at eye height, looking down its axis."
*That* is the real content. The two matrices are bookkeeping that follows from
it, and either can carry the work.

### And three reasons to make world coordinates metres anyway

Nothing forces the gauge, but one choice is much better and it is worth knowing
why rather than taking it on trust:

1. **`camera.near` / `.far` reach the session in metres.** If world coordinates
   are something else, those two must be converted by hand — and getting it
   wrong does not raise an error, it silently clips the figure.
2. **Everything added later is naturally specified in metres.** Text at a 2 cm
   cap height, a floor, a static reference frame for comfort (§5d). If world
   coordinates are figure units, every one of those needs the conversion applied
   by hand, every time, forever.
3. **The deep one: your own body is in metres.** Eye separation 0.064. A lean,
   0.1. Eye height, 1.6. **The entire design question in VR is "how big is this
   thing relative to a person", and that question is only easy to ask when both
   are in the same units.**

### Reason 3 earning its keep immediately

Ask that question of case (b) and it answers back something unwelcome. The
example vertex `(12, 400, 0)` makes the tube **33 times longer than it is
wide**. In metres:

| scale | tunnel length | bore diameter | your eyes, as a share of the bore | what it actually is |
|---|---|---|---|---|
| **0.01** — case (b) | 4.0 m | **0.24 m** | 27% | **a drainpipe** |
| 0.05 | 20.0 m | 1.20 m | 5% | a culvert you could crawl into |
| **0.083** | **33.3 m** | **2.00 m** | 3% | a tunnel you can stand in |
| 0.25 | 100.0 m | 6.00 m | 1% | architecture |

**So case (b) is wrong for the thing it was meant to show.** A four-metre tunnel
at these proportions has a 24 cm bore — your head does not fit, and with your
eyes 27% of the bore apart the stereo would be grotesque. To fly *through* it the
bore wants two metres or more, and at these proportions that makes the figure
**33 metres long**.

Three consequences, none of which were visible before the units were metres:

- **The figure is LANDSCAPE-scale, not room-scale.** Virtual space does not care
  that 33 m exceeds the room — but §3b's "table, room, or building" question has
  an answer now, and the answer is none of the three.
- **`depthFar` must cover 33 m, not 10.** Which is Step 8's near/far row turning
  from a note into a number.
- **The proportions are a parameter, not a given.** `step_pitch` below `step`
  squashes the tunnel shorter and fatter — which is listed in
  `bd_V_Kolam3D_002`'s own prose as a thing to try, and is now the control that
  decides whether a person fits inside the figure at all.

**That is what the metres gauge buys**, and it is the honest answer to "what
determines the world coordinates": nothing does — but choosing metres is what
let the arithmetic tell us the tunnel was a drainpipe.

---

## Step 7b · The same thing again, with one line and no rotations

§7a answered "what determines these numbers" philosophically. The author meant
something more practical: **which upstream choices fix them?** So here is the
whole chain again with everything removable removed — **one straight line, two
endpoints, no symmetry children, no rotations anywhere.**

### The figure

```
  a line from  (0, 0, 0)  to  (10, 5, 1)       figure-local, PURE NUMBER
  its length: 11.225 of whatever those are
```

### There are exactly TWO upstream choices

Everything else follows from them. That is the answer to the question.

> **CHOICE 1 — how big should the figure be for a person?**
> This fixes the scale in `group.matrix`, and nothing else does. Say "the line
> should be about a metre": `scale 0.1`, because 11.225 × 0.1 = 1.12 m.
>
> **CHOICE 2 — where should the person be, relative to the figure?**
> This fixes the plate's placement, and nothing else does. Say "standing three
> metres back from it": the plate goes to `(0, 0, 3)`.

Two sentences of plain English, two numbers. **Nothing downstream is a decision
at all** — view space, the projection, the pixels, all of it is arithmetic.

### "Wouldn't the world origin be the same as the figure's local origin?"

**Yes — and leaving it that way is the right default.** With `group.matrix`
carrying nothing but a scale:

```
  figure (0, 0, 0)   →  world (0.000, 0.000, 0.000)     ← the same point
  figure (10, 5, 1)  →  world (1.000, 0.500, 0.100)
```

A scale fixes the origin. So the figure's origin *is* the world's origin, and the
only difference between the two frames is how long a unit is. That is as simple
as this can get, and it is what `V_Kolam3D` does today (with the scale at 1, so
the frames are not merely sharing an origin, they are identical).

**Keeping the figure at the origin and moving the plate** is therefore the
natural choice — and worth noticing: it is Option A of §5k, *carry the viewer*,
which is also the cheap port, because `placeCamera` already computes a position
relative to a figure sitting at the origin. The simplest choice and the cheapest
choice are the same one. **It is also the less comfortable one** (§5d), which is
a tension to know about rather than resolve here.

### But the simple choice forces two things nobody chose

**(a) The figure lands on the floor.** The plate's origin is on the floor — that
is what `local-floor` means — so putting the figure's origin there puts the
figure's origin *on the floor*. The head is 1.6 m up, so **the line is seen from
above, and anything with a negative Y is underground.** The figure has no idea
there is a floor; its origin is just wherever the turtle started. Nothing
reconciles those two facts except a decision.

**(b) +Z is behind the viewer.** The figure runs into positive X, Y and Z, and
the viewer faces −Z. That is *why* Choice 2 put the plate at `(0, 0, +3)`: it
steps the person backwards so the figure is in front of them. Had the plate been
left at the origin, the person would be standing at the figure's root with it
behind them.

### Now the arithmetic, both endpoints, both eyes

```
  CHOICES      group.matrix = scale 0.1          ← choice 1
               plate at (0, 0, 3), no rotation   ← choice 2
  MEASURED     head on the plate (0, 1.6, 0), facing as they started
  DERIVED      head in world (0, 1.6, 3) · left eye (-0.032, 1.600, 3.000)
```

| | A — figure `(0,0,0)` | B — figure `(10,5,1)` |
|---|---|---|
| world | `(0.000, 0.000, 0.000)` | `(1.000, 0.500, 0.100)` |
| view space, **left** eye | `(0.032, -1.600, -3.000)` | `(1.032, -1.100, -2.900)` |
| …read in words | 3.00 m ahead, 1.60 m **below** eye | 2.90 m ahead, 1.10 m below, 1.03 m right |
| NDC, left | `(0.01067, -0.53333)` | `(0.35586, -0.37931)` |
| **pixel, left eye** | **`(1043.0, 1692.8)`** | **`(1399.2, 1522.8)`** |
| pixel, right eye | `(1021.0, 1692.8)` | `(1376.5, 1522.8)` |
| **disparity** | **22.0 px** | **22.8 px** |

Image centre is `(1032, 1104)`, so both endpoints are **well below centre** —
consequence (a), the figure on the floor, showing up as a number. On screen the
line runs **356 px across and 170 px up**, which on a 2064-wide image is a clear,
comfortably long stroke.

### And one thing the numbers say that was not obvious

**The disparity barely changes along the line: 22.0 px at one end, 22.8 at the
other — 0.76 px across the whole thing.** Because the line spans only 0.10 m of
depth out of about 3 m: it is very nearly *fronto-parallel*, flat-on to the
viewer.

> **So for this line, stereo contributes almost nothing.** Under a pixel of
> disparity gradient is below what anyone can use. The two eyes agree about its
> shape, and a flat screen would convey it just as well.

Which sharpens §5e's claim rather than contradicting it. Stereo does not reward
3D content; **it rewards DEPTH DIFFERENCES.** A figure spread across the view at
roughly one distance gets nothing from a headset. A tunnel receding away from you
gets everything, because its far end and its near end are metres apart in depth.

**And that is what `cam_axis` is for**, seen from a new angle: aiming down a
strand's axis is precisely the act of turning a fronto-parallel figure into a
receding one — which on a flat screen is a composition choice and in a headset is
the difference between stereo working and stereo idling.

### The whole of it, in four lines

```
  choice 1   how big, for a person          →  group.matrix's scale
  choice 2   where the person stands        →  the plate's placement
  forced     the figure sits at the origin, so it sits on the FLOOR
  forced     everything after that is arithmetic
```

### And this is what choice 2 looks like as code

The author, checking: *"I was sort of expecting that the plate would now get
positioned some way away from the figure — that would be done by
`camera.parent`?"* **Yes. That is exactly it, and it is four lines.**

```js
  const plate = new THREE.Group();   // THIS IS THE PLATE. An ordinary Group.
  plate.position.set(0, 0, 3);       // CHOICE 2: three metres back from the figure
  plate.add(camera);                 // now camera.parent === plate
  scene.add(plate);
```

That is the entire mechanism. **There is no special plate class, no API to call,
nothing to register.** `camera.parent` is a `Group` with a position, and its only
distinction is the convention that three.js maps the headset's pose through
whatever object the camera happens to be a child of.

Note what is NOT in those lines: nothing is done to `camera` itself. The camera
is put inside the plate and then left alone, because from the moment a session
starts its position is a readout (Step 8).

### Two consequences of choice 2 that are easy to miss

**Standing somewhere other than due +Z needs a rotation after all.** The viewer's
starting facing is fixed by the standard — they face the plate's −Z — so to put
them anywhere else *and still have them looking at the figure*, the plate must be
turned as well as moved:

```js
  plate.position.set(3, 0, 0);          // off to one side
  plate.rotation.y = Math.PI / 2;       // turned to face back at the figure
```

That is why rotations reappear the moment the viewpoint is not straight down the
axis. It is a rotation about Y — turning on the spot — which is the mild kind.

**And the plate's placement is secretly a statement about the real room.** Put
the figure three metres away and a person with two metres of floor **can never
reach it by walking**; they would need the flight. Put it one metre away and they
can walk round it, reach into it, put their head inside it. **The same two
numbers that decide what the figure looks like also decide whether it is
touchable**, and that only becomes visible once both the figure and the room are
in metres — §7a's third reason, arriving again.

### Does the plate have to be positioned before or after the session starts?

The author: *"the headset is set up before or after the plate is positioned — I
guess it doesn't matter?"* **Correct, it does not** — and the reason is worth
having, because it is not "either order works out in the end":

> **The plate's placement is read EVERY FRAME, not applied once.** three.js
> composes `parent.matrixWorld × camera.matrix` on each frame, so moving the
> plate at any moment takes effect on the next one. There is no setup step to get
> in the right order, and no difference between placing it and animating it.

**But one ordering does matter, and it is a different one.** `local-floor`'s
origin is fixed **at the instant the session starts** — on the floor, below
wherever the person's head happened to be at that moment, facing wherever they
happened to face. So:

- **the plate's PLACEMENT** (yours): order-free, live, change it whenever.
- **the plate's ORIGIN in the real room** (the runtime's): fixed once, by where
  the person was standing when they pressed the button.

Which is why headsets have a recentre gesture, and why
`getOffsetReferenceSpace()` (§5c.2) exists as its programmatic equivalent. If
someone starts a session facing the wrong way, no amount of plate placement
undoes it — it shifts them relative to the figure, but their "forward" is still
the direction they were facing.

### NOT `camera.position`. That is the one to get right.

The author's second half: *"and that is done using `camera.position` and
`camera.orientation`."* **No — and this is the single most important correction
in this document.**

Positioning the plate is:

```js
  plate.position.set(0, 0, 3);        // ✓  yours, read every frame
  plate.rotation.y = Math.PI / 2;     // ✓  yours   (three calls it .rotation /
                                      //     .quaternion — there is no .orientation)
```

Writing to the camera is:

```js
  camera.position.set(0, 0, 3);       // ✗  silently overwritten on the next frame
  camera.lookAt(0, 0, 0);             // ✗  likewise
```

Not an error. Not a warning. **It simply has no effect**, because three writes
the head pose into `camera` after every frame — Step 8. The camera's position
stops being something you say and becomes something you can ask.

**The migration, in one table.** This is the whole of what changes:

| | on a monitor | in a session |
|---|---|---|
| `camera.position` / `.quaternion` | **yours — this is how you aim** | the runtime's **readout** |
| `plate.position` / `.rotation` | not needed; there is no plate | **yours — this is how you aim** |
| `camera.near` / `.far` | yours | **yours**, and now in metres |

**The aiming moves from the camera to the plate, and nothing else moves at all.**
Which is the concrete form of the claim made elsewhere that `placeCamera`'s
arithmetic survives and only its destination changes: the same computed position
and orientation, written one object further out.

---

## Step 8 · The three.js camera, and what becomes of it

> **THE THREE.JS CAMERA** — the `PerspectiveCamera` the module creates:
> `new THREE.PerspectiveCamera(CAM_FOV, 1, 1, 100000)`.

**Outside a session it is the whole story.** `placeCamera` sets its position, its
up vector and what it looks at; its field of view and aspect build the
projection; the picture follows.

**Inside a session it becomes a readout.** After each frame three writes the
head's pose into it, so `camera.position` and `camera.quaternion` **report where
the person's head is.** They are outputs. Writing to them achieves nothing,
because the next frame overwrites them.

Precisely what survives, and what does not:

| | in a session |
|---|---|
| `camera.position`, `.quaternion`, `.up` | **overwritten every frame** — a readout |
| `camera.fov` | ~~unused~~ — **OVERWRITTEN**, see §8a. Not an input, but not ignored either |
| `camera.aspect` | unused — the runtime's projection matrix replaces it |
| `camera.scale` | **overwritten**, and non-unit if the plate is scaled (§8a) |
| `camera.near`, `.far` | **still yours.** three forwards them to the session as `depthNear` / `depthFar` — **in metres**, so a value derived from a figure-unit distance will be wrong by whatever Step 6 chose |
| `camera.parent` | **yours, and now load-bearing** |
| `renderer.render(scene, camera)` | still called with your camera; three quietly substitutes the ArrayCamera |
| the render loop | becomes `renderer.setAnimationLoop(fn)`, driven by the headset at 72–120 Hz |

**So the two cameras of Step 4 and Step 8 are different things with the same
name**, which is most of why this is confusing: *your* camera is a request on a
monitor and a report in a headset, while *three's* two cameras are the ones that
actually draw and are never yours at all.

---

## Step 8a · "Surely `camera.position` and `.quaternion` fix the headset?"

The author, having set aside the word "position" in its informal sense: *"but
`camera.position` and `.quaternion` do fix the headset and its direction of
facing, surely?"*

**No — they report it.** And the reason is not an API restriction, it is physics:
**the headset is a physical object on somebody's head, and nothing written in
JavaScript can move it.** Outside a session those two properties are a request;
inside one they are an answer. Same properties, opposite causality, and **nothing
in the API signals the change** — which is exactly why this is the easy mistake.

### Verified against three 0.160.0's own source

The code that does it, verbatim from the build this module loads:

```js
  function updateUserCamera( camera, cameraXR, parent ) {
    if ( parent === null ) {
      camera.matrix.copy( cameraXR.matrixWorld );
    } else {
      camera.matrix.copy( parent.matrixWorld );
      camera.matrix.invert();
      camera.matrix.multiply( cameraXR.matrixWorld );
    }
    camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );
    …
  }
```

Three things fall out of that, two of which correct statements made earlier in
this document.

**1. `camera.position` is the head's pose IN THE PLATE'S FRAME — not in world
coordinates.** It is decomposed from `camera.matrix`, the camera's *local*
transform, which that code sets to `parent⁻¹ × (the XR pose)`. So:

```js
  camera.position            // the head in the ROOM. metres. e.g. (0, 1.62, -0.10)
  camera.getWorldPosition(v) // the head on the PLAN. whatever units step 6 chose.
```

A real trap, and a useful one once known: **`camera.position` is the one place the
room's own metres are handed back to you**, whatever gauge the world is in.

**2. `camera.fov` is OVERWRITTEN, not ignored.** This document said "unused".
Wrong — three back-computes a nominal vertical field of view from the runtime's
projection matrix and writes it in:

```js
  camera.fov = RAD2DEG * 2 * Math.atan( 1 / camera.projectionMatrix.elements[5] );
```

So after one frame, **`camera.fov` tells you the headset's own vertical field of
view.** Nominal rather than exact, because the real frustum is asymmetric and a
single number cannot describe one — but it is a reading, not a leftover. `CAM_FOV
= 50` does not merely stop working: the variable it feeds would come back holding
the device's figure.

**3. `camera.scale` is written too**, and a plate carrying a scale makes it
non-unit — a plate at scale 100 leaves `camera.scale` at 0.01, because the
inverse is in that product. Harmless, and baffling if encountered without
knowing why.

### And `near` / `far` confirmed

The claim made twice elsewhere, now read from source rather than remembered:

```js
  cameraXR.near = cameraR.near = cameraL.near = camera.near;
  cameraXR.far  = cameraR.far  = cameraL.far  = camera.far;
  if ( _currentDepthNear !== cameraXR.near || … ) {
    session.updateRenderState( { depthNear: cameraXR.near, depthFar: cameraXR.far } );
  }
```

**Yours, and forwarded.** With one detail three's own comment supplies: *"the new
renderState won't apply until the next frame"* — so a change to `near` or `far`
lands one frame late. Immaterial for a setting, worth knowing if anything ever
animates them.

### So what DOES determine where the viewer is?

```
   where the viewer is on the plan  =  the plate's placement   ← YOURS
                                     × the head's pose         ← THEIRS, measured
```

**Two factors, one of them yours, and neither of them is `camera.position`.** The
author's intuition is right that something fixes the viewer's pose and that part
of it is the author's to set — it is simply one object further out than it looks.

---

## Step 9 · The whole sequence, one vertex, figure to pixel

Every number below is computed, not illustrative. The example is Step 6's
option (b): a four-metre tunnel at eye height two metres ahead, with the plate
left as the identity, and the person leaning 10 cm forward.

```
 ─────────────────────────────────────────────────────────────────────────────
 1.  THE FIGURE'S OWN NUMBERS                                    PURE NUMBER
     (12, 400, 0)
     What the turtle wrote. No unit. Means nothing yet.
 ─────────────────────────────────────────────────────────────────────────────
         × the symmetry child's rotation about Y  (copy 0: identity)
         × group's step_pitch scale in Y          (step_pitch = step: identity)
         × group.matrix: scale 0.01, rotate -90° about X, translate (0,1.6,-2)
 ─────────────────────────────────────────────────────────────────────────────
 2.  WORLD COORDINATES — THE PLAN                                   DECLARED
     (0.1200, 1.6000, -6.0000)      metres, because step 6 said so
     The tunnel runs from (0,1.6,-2) to (0,1.6,-6).
 ─────────────────────────────────────────────────────────────────────────────
         × the inverse of ( .parent  ×  head pose  ×  eye offset )
           .parent  identity                                       DECLARED
           head     (0, 1.62, -0.10), facing as they started       MEASURED
           left eye (-0.032, 1.620, -0.100)                        DERIVED
 ─────────────────────────────────────────────────────────────────────────────
 3.  VIEW SPACE, LEFT EYE                                            DERIVED
     (0.1520, -0.0200, -5.9000)
     Where the vertex is relative to that eye. Reading it: 15.2 cm to the
     right, 2 cm below, and 5.90 m in front — the -Z being "in front".
 ─────────────────────────────────────────────────────────────────────────────
         × the projection matrix supplied by the headset       the runtime's
           (illustrated here with a symmetric 90° cone; the real one is
            ASYMMETRIC, which no single fov number can express)
 ─────────────────────────────────────────────────────────────────────────────
 4.  CLIP SPACE, then NORMALISED DEVICE COORDINATES                  DERIVED
     (0.02576, -0.00339)
     A square from -1 to +1 covering what the eye can see. Just right of
     centre and a whisker low. Anything outside the square is not visible.
 ─────────────────────────────────────────────────────────────────────────────
         × the viewport of the layer's framebuffer
           (Quest 3 native, 2064 x 2208 per eye)
 ─────────────────────────────────────────────────────────────────────────────
 5.  A PIXEL IN THE LEFT EYE'S IMAGE                                 DERIVED
     (1058.6, 1107.7)        centre of that image is (1032, 1104)
     26.6 px right of centre, 3.7 px down.
 ─────────────────────────────────────────────────────────────────────────────
         the same arithmetic again for the right eye
 ─────────────────────────────────────────────────────────────────────────────
 6.  THE SAME VERTEX IN THE RIGHT EYE                                DERIVED
     1047.4        — so the two images differ by 11.2 PIXELS
     THAT DIFFERENCE IS THE STEREO. It is the only reason the vertex is
     seen at 5.9 m rather than painted flat, and it is the cue the figure
     has almost nothing else to offer (see §5e: no shading, no ground
     plane, and depthWrite off below opacity 1, so no occlusion either).
 ─────────────────────────────────────────────────────────────────────────────
```

---

## Step 10 · The stage after yours

> **THE COMPOSITOR** — the headset's own software, which takes the two images
> and puts them on the panels.

**Degree of virtuality: PHYSICAL at the far end, and entirely out of reach.**

It does at least two things worth knowing about:

- **Lens distortion.** The lens bends the image, so the compositor pre-bends it
  the opposite way. **The picture on the panel is not the picture you rendered**,
  and it is not meant to be.
- **Reprojection**, also called timewarp. If the head moved between the pose you
  were given and the moment of display, the compositor shifts the finished image
  to compensate. **So the headset corrects for your frame being slightly late**,
  which is why a dropped frame is a judder rather than a lurch — and why
  `V_Kolam3D`'s 20-a-second camera clock against a 90 Hz display needs measuring
  rather than reasoning about: the compositor's correction and a deliberately
  slow camera may or may not fight.

---

## Everything, in one table

| the thing | its name in the code | degree of virtuality | coordinates | whose |
|---|---|---|---|---|
| the room | — | **PHYSICAL** | **none — that is the point** | nobody's |
| the plate | `XRReferenceSpace` | DECLARED frame on a PHYSICAL thing | metres; floor origin, −Z forward | the standard's |
| the head pose | from `getViewerPose()` | **MEASURED** | `(0, 1.62, -0.10)` m | the runtime's |
| each eye's view | `XRView` ×2 | DERIVED | `(±0.032, 1.620, -0.100)` m | the runtime's |
| each eye's projection | `view.projectionMatrix` | the device's own optics | asymmetric; no `fov` describes it | the runtime's |
| the figure | the `Float32Array` | **PURE NUMBER** | `(12, 400, 0)` — **no unit** | yours |
| the figure's placement | `group.matrix` | DECLARED | the transform that gives the plan its units | **yours** |
| the plan | world coordinates | DECLARED | `(0.12, 1.60, -6.00)` m in the example | **yours** |
| the plate's placement | `camera.parent` | DECLARED | identity in the example | **yours** |
| your camera | `camera` | request on a monitor, **readout in a session** | reports the head pose | yours in name |
| three's two cameras | `cameraL`, `cameraR` | DERIVED | the eye poses | three's |
| view space | — | DERIVED, per frame | `(0.152, -0.020, -5.900)` m | transient |
| NDC | — | DERIVED, per frame | `(0.0258, -0.0034)`, a −1…+1 square | transient |
| the pixel | the layer's framebuffer | DERIVED, per frame | `(1059, 1108)` of 2064×2208 | transient |
| the panel | the compositor's output | **PHYSICAL** | distorted and reprojected | the headset's |

**Four rows are yours**, and they are consecutive: how the figure is placed, what
the plan's units are, where the plate stands, and the near/far pair. Everything
above them is the person's body and everything below them is the device. **That
is the whole of the authoring surface, and it is smaller than it looks from
inside the current module.**

---

## What this means for `V_Kolam3D` as it stands

1. **The figure needs no change.** Its numbers are already in world coordinates
   and `group` is already the place a placement would go. Nothing about the
   turtle, the symmetry copies or the score is affected.
2. **One decision is unavoidable before a first session: the scale.** Step 6
   (a) is the default and it shows black. This is the "scale directive — table,
   room, or building" already on the open list, and it stops being a design
   question the moment a session opens.
3. **`placeCamera`'s arithmetic survives; only its destination changes.** It
   already computes an eye position and an orientation. Writing those to a
   `.parent` instead of to the camera needs the orientation as a quaternion
   rather than via `lookAt` — one line of three.js.
4. **`CAM_FOV = 50` dies, and two calibrations die with it**: `fitDistance`'s
   sphere fit, and the measured "world height ≈ 0.64 × cap height in CSS px"
   that any text work would have leaned on.
5. **`camera.near` / `.far` keep working and change units.** The most easily
   missed item on this list, because it will not error — it will just clip.

And the standing recommendation is unchanged: **none of this should be built
yet.** The current module is the baseline every headset measurement will be read
against. See §5h.

---

## Related

- `ThreeJS_and_VR_2026-09-28.md` §5c–§5k — the same material for a reader who
  already has the vocabulary, plus the comfort argument and the open list.
- `/plate` — the 2-D drawing of the frames, served from BD itself.
- `/x` — the headset capability check, to be run on the device.
