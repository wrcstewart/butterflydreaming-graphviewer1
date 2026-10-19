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

## Step 0 · Who are the players? — "the runtime", defined

This document used **"the runtime"** from Step 3 onwards without ever saying what
it is, which in a document premised on defining every term is simply a hole. The
author stopped it: *"I don't understand what you mean by the runtime, and
therefore its assumption of floor height."* Fair.

**There are five pieces of software between a vertex and an eye, and you wrote
one of them.**

```
  5  THE PAGE            BD's visual_module.html. YOURS.
         │ calls
  4  THREE.JS            a library, running inside the page. Yours to choose,
         │ calls          not yours to have written.
  3  THE BROWSER          Chromium on a Quest, Safari on a Vision Pro.
         │ talks to       Exposes the WebXR Device API to the page.
  2  THE XR RUNTIME       ◀── "THE RUNTIME" MEANS THIS ONE
         │ drives         The HEADSET'S OWN SYSTEM SOFTWARE. Part of Horizon OS
         │                on a Quest; visionOS on a Vision Pro.
  1  SENSORS AND PANELS   cameras, inertial sensors, the two screens. Hardware.
```

> **THE XR RUNTIME** — the headset's own system software. It fuses the sensor
> data into poses, holds the device's model of the room, supplies the per-eye
> projection matrices, and runs the compositor that puts images on the panels.
> It is not part of the browser and not part of the web at all; a native headset
> app talks to the same thing.

So when this document says "the runtime's, not yours", it means **layer 2** — and
the practical force of that is: it is configured in the headset's own menus, not
by anything BD can do.

### Where the floor actually lives in that stack

Now §2a's answer can be said properly, because "the device's room knowledge" was
standing in for something specific:

- **Room setup is a layer-2 thing.** On a Quest you run **Space Setup** in the
  system interface — not in the browser, not in BD. It scans or asks for the
  floor, and **the runtime stores that height** as part of its persistent model
  of the room. It is per-device and per-room, and it survives between sessions.
- **The browser (layer 3) reads it** and reports it through WebXR as the origin
  of a `local-floor` space.
- **And the estimate, when there is no floor, is the BROWSER's licence, not the
  runtime's.** The specification allows the *user agent* to supply an estimated
  floor if the device cannot. So in branch 2 of §2a the assumption is being made
  one layer higher than the words "the runtime" suggested. **Corrected here.**

### Which gives the one practically useful consequence

> **If the floor is wrong, it is not a code problem.** Run Space Setup on the
> headset. Nothing in BD, three.js, or the page can fix a floor the system
> software has wrong, and nothing in BD needs to: §2a's cancellation means a
> figure placed relative to the read eye height does not care either way.

### And two more terms this document leans on

> **THE COMPOSITOR** — the part of the runtime that takes your two finished
> images and puts them on the panels, pre-distorting for the lens and
> reprojecting for any head movement since the pose you were given. Step 10.
>
> **THE USER AGENT** — the specifications' word for the browser. Where it appears
> in a standard, it usually marks a point at which browsers are *allowed to
> differ*, which is exactly what the floor estimate is.

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

### But how does it know where the floor IS?

The author, pressing on the weak part of the above: *"how does the software know
the vertical level of the room, i.e. how does it know where the viewer's feet
are? If it's not deduced from the 1.2 below the level of the eyes…"*

**"The device's room knowledge" was doing a lot of work in that sentence, and the
honest answer has two branches — in one of which the author's suspected
circularity is exactly what happens.**

**Branch 1 — MEASURED, and this is the normal case.** The headset knows the floor
independently of the person:

- **Room setup.** Every Quest asks for it. On earlier models you pointed a
  controller at the floor and confirmed the height; on a Quest 3 the Space Setup
  scan uses the depth sensor to find the floor plane. That height is **stored**
  and persists between sessions.
- **Plane detection.** The dominant horizontal plane below the viewer, found by
  the same depth sensing that keeps the guardian honest.

In this branch the floor is a **fact about the room**, not about the person. A
child and an adult standing in the same room get **the same floor** and
**different `camera.position.y`** — which is the whole point, and what makes the
reading worth having.

**Branch 2 — ASSUMED, and here the author is right.** If no floor is known,
there is nothing to measure, and the documented behaviour is that **the BROWSER
may estimate** — the specification gives that licence to the user agent rather
than to the headset's system software, so this branch happens one layer up from
where Step 0's "the runtime" sits. The estimate works precisely as suspected: assume a standing eye
height and put the floor that far below the head. Values around 1.5–1.6 m are
commonly quoted. **IMPLEMENTATION-DEPENDENT, AND UNVERIFIED HERE** — it has not
been read off a device.

> **So in branch 2 the circularity is real, and it has a nasty property: you
> cannot tell from the number.** `camera.position.y` comes back as 1.6 either
> because the person's eyes are 1.6 m above a measured floor, or because the
> runtime assumed 1.6 and derived the floor from it. The same reading, two
> completely different meanings.

### So when is the floor actually missing?

The author's obvious next question: *"how could the floor height not be there?"*
Which reframes the whole thing, because **the estimate is not there to paper over
a fault. It is there so that the API never has to say no.**

The specification allows `local-floor` to be granted with an estimated floor
precisely so that a page asking for one is not refused. A browser would rather
hand over a plausible floor than fail the request and make every page handle its
absence. **So branch 2 is a deliberate design decision in the standard, not a
broken device**, and the circularity the author spotted is the price of that
decision.

When it actually bites, in rough order of likelihood for this project:

| situation | floor | note |
|---|---|---|
| **a WebXR emulator** — a browser extension, or DevTools' XR emulation | **synthetic** | **the likeliest one by far**, because it is how any of this gets tested before hardware arrives |
| a phone, or any 3DoF device | **none at all** | no position tracking, so no floor to have |
| a headset whose room setup was never completed | estimated | a fresh device, or a new room |
| PC VR calibrated seated-only | approximate | the floor is where the setup said, which may be the chair |
| **a Quest 3 that has been through Space Setup** | **measured** | **the case that matters here, and it is fine** |

So for BD's actual target the question is close to moot. **Where it is not moot
is in testing**: an eye height read in an emulator is the emulator's number and
says nothing about any person, so no placement rule should ever be *validated*
there. Which is worth knowing now rather than after an afternoon of tuning a
figure against a synthetic 1.6 m viewer.

**One indirect test exists:** `bounded-floor` is only available when the device
has a real, traced room boundary. **If a request for `bounded-floor` succeeds,
room setup has been done** and branch 1 is in force. That is evidence rather than
proof, and it is cheap — a line in `/x`.

### And the fix makes the question stop mattering

This is the part worth taking away, because it dissolves the problem rather than
answering it:

> **Anything placed relative to the READ eye height is immune to floor error.
> Anything placed relative to `y = 0` inherits it in full.**

The arithmetic, since it is not obvious. Let the true eye height be `H` and let
the runtime's floor be wrong by `e` — too high, say. Then the origin is `e` above
the real floor, and `camera.position.y` reads `H − e`: wrong, by `e`.

Now place the figure at `camera.position.y − 0.3`, i.e. 30 cm below the eye. In
the runtime's coordinates that is `H − e − 0.3`. Measured from the **real** floor
it is `(H − e − 0.3) + e = H − 0.3`. **The error cancels exactly** — the figure
ends up 30 cm below the person's actual eye, whatever the runtime believed about
the floor, and whether it measured or guessed.

Place the same figure at a literal `y = 1.3` instead and it sits `1.3 + e` above
the real floor: wrong by the full error, silently.

**So the rule from the previous section gets a second and better reason.** Read
`camera.position.y` and place relative to it — not only because people are
different heights, but because **it is the only placement that survives a floor
the device merely assumed.** The floor's accuracy becomes something you no longer
need to know.

The one thing that genuinely wants a trustworthy floor is a floor-like object —
a ground plane, a static reference frame for comfort (§5d). Those are the things
to put under a `bounded-floor` check.

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

## Step 2b · Checking the summary — three "positions" that are easy to conflate

The author, consolidating: *"so the plate is a coordinate frame at reported
(stored measurement or default) floor level, with one of its axes positioned
along the gaze direction of the headset. Its position is determined by
`camera.position`, and it is in units of metres?"*

**Two of those are right, one is nearly right, and one is inverted.** Taking them
in turn, because each error is worth more than the correct parts.

### ✓ "at reported floor level" — yes

Stored measurement where room setup has been done, the browser's estimate where
it has not (§2a, §0).

### ✓ "in units of metres" — yes

Fixed by the standard, not a choice. And by §8a, `camera.position` is in this
frame, so **that reading is in metres too, whatever units the world is in.**

### ✗ "along the gaze direction" — along the gaze AT SESSION START, then frozen

This is the one worth stopping on. The plate's −Z is aligned to where the viewer
was facing **at the instant the session began**, and then **it never moves
again.**

> **If the plate tracked the gaze, nothing would ever appear to move when you
> turned your head.** The whole figure would swing round with you and stay dead
> centre — the "stuck to your face" failure of §7. The plate must be frozen for
> the world to stay still.

Two details inside that:

- **Levelled to gravity.** If the person was looking up or down when they
  started, that pitch is discarded. **Only the yaw survives**, so the plate's +Y
  is gravity-up and never head-up.
- **It is a measurement you did not take, of a moment you did not choose.** If
  someone opens a session facing a wall, the plate's −Z points at that wall and
  the figure is off to one side.

### ✗✗ "its position is determined by `camera.position`" — inverted

**`camera.position` is the head's position INSIDE the plate.** It says nothing
about where the plate is. Three different things are being run together here, and
separating them is most of understanding this:

| the question | the answer | kind | whose |
|---|---|---|---|
| where did the plate's origin land **in the real room**? | **no JavaScript value at all** — it is where the person was standing when the session started | MEASURED, once | the runtime's |
| where does the plate sit **on the plan**? | **`camera.parent.position`** / `.rotation` — §7b's four lines | DECLARED | **yours** |
| where is the head **inside the plate**? | **`camera.position`** — metres, read after each frame | MEASURED, every frame | the runtime's |

So the plate has, in a sense, two positions: one in the room that nobody wrote
and nobody can read as a number, and one on the plan that is entirely yours.
`camera.position` is neither of them — it is the person moving about on top.

### And the rule the two errors have in common

The eye height (§2a) and the starting facing are **the same kind of problem**:
both are facts about the person and the moment, both are unknowable in advance,
and both have the same fix.

> **Read them on the first frame and place relative to what you read.** Eye
> height from `camera.position.y`; starting facing from `camera.quaternion`'s
> yaw. Then a short viewer, a seated viewer, and a viewer who began facing the
> wrong way all get the composition you intended.

**Assume either one and roughly half your viewers get something you did not
design.** It is the same discipline as §2a's floor cancellation, applied to the
other two unknowns — and it costs one frame's delay before placing anything.

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

## Step 6a · "Why not calibrate `step` and distances in metres from the word go?"

The author's proposal, and **the instinct is right: metres is the correct gauge,
and "easy for the user to understand" is the correct reason.** It is the same
conclusion §7a reached from the arithmetic, arrived at from the better end.

But it does not survive contact with `step`, and the reason is worth knowing
because it is a fact about the module rather than about units.

### `step` is not a length

```js
  params.effectiveStep = params.step / Math.pow(3, Math.max(0, params.depth - 1));
```

**`step` is a nominal number divided by depth.** At depth 5 it is divided by 81,
so the stored `step 9900` draws segments of **122 units**, not 9900. Denominate
that in metres and `step 9.9` would draw 12 cm segments.

> **A metric-looking number that is not the length of anything visible is WORSE
> than a frankly arbitrary one, because it invites belief.** "Step 9.9 metres"
> reads as a promise the figure does not keep; "step 9900" at least announces
> that it is a dial.

The division is not an accident either — it is what keeps the figure roughly the
same overall size as depth changes, since the segment count goes as 4^depth.
Removing it to make `step` a true length would make depth a size control, which
is worse.

**And the stored scripts show how little `step` corresponds to anything.** All
four of them:

| script | depth | `step` | segment actually drawn |
|---|---|---|---|
| `bd_V_Kolam_001` | 2 | 299 | 99.7 |
| `bd_V_Kolam_002` | 3 | 40 | 4.4 |
| `bd_V_Kolam3D_001` | 2 | 50 | 16.7 |
| `bd_V_Kolam3D_002` | 5 | **9900** | **122.2** |

`step` spans a factor of 247 across those; the thing drawn spans 28. There is no
exchange rate to state.

### Two smaller costs, and one objection that turned out to be weak

- **The 2D and 3D modules share the vocabulary.** `bd_V_Kolam3D` is a *measured*
  superset of `bd_V_Kolam` — pitch 0 and `cam_elevation 90` reproduce the flat
  figure to Float32Array precision — and that property is what lets a script
  move between them. A `step` in metres in one and in canvas units in the other
  ends it.
- **The steppers assume largish integers.** `step` runs 1–9900 with a coarse
  step above 1000, and the hold-repeat rate is derived from the range. A
  metre-denominated range of 0.001–100 wants fractional stepping, which changes
  the feel of every press on every control.
- **MIGRATION IS NOT A REAL OBJECTION, and I nearly treated it as one.**
  Counted rather than assumed: **four stored scripts**, two per module. Whatever
  is decided here, rewriting four nodes is an afternoon's nothing.

### The better form of the same idea: say the SIZE, not the unit

What the author actually wants is to think in metres, and §7a established what
the useful metric question is: **how big is this thing relative to a person?**
So state *that*, once, and let the module do the conversion:

```
  %%bd_size 4          the figure's longest extent is four metres
```

**The module already measures its own extent** — `render()` computes
`Math.hypot(built.maxXZ, built.maxY * pitchScale())` for the camera's auto-fit —
so the scale is one division: `wanted ÷ measured`, applied on the root group
(§5c.3). Absent, it defaults to 1 and today's behaviour is unchanged to the bit.

Why this is better than redenominating anything:

- **The author states the number they care about**, not a conversion factor
  nobody can picture.
- **It is independent of how the figure is made.** Change `step`, `angle`,
  `depth`, or the score and the figure is still four metres. The parameters go
  back to being compositional, which is what they are.
- **`step` stops needing to mean anything**, which is just as well, since it
  does not.
- **Both modules keep one vocabulary**, so a script still travels.
- **And it answers the VR question in passing.** With the figure's size stated
  in metres, world coordinates ARE metres, the plate can be the identity, and
  §5i's "the first session shows black" cannot happen.

### Two things to settle — and the author has settled the first

> *"Probably an approximate overall size is okay — to set the rig distance, then
> the user should be able to position the rig."*

**SETTLED, and it lowers the bar usefully.** `%%bd_size` is a FRAMING AID
followed by adjustment, not a precision instrument. Which disposes of the bore
objection: it does not matter that a tunnel's longest extent is the wrong handle
for its bore, because the number only has to land the viewer somewhere sensible
before they move. "Longest extent" is then the right choice precisely because it
is the crudest one — it can never put the viewer inside the figure by accident,
which is the only failure that matters at this stage.

- ~~For a tunnel the bore matters more than the length~~ — **withdrawn, above.**
- **A live `size` rescales the figure as other controls move.** Sweep `angle`
  and the figure stays four metres while its proportions change. That is
  probably the desired behaviour, and it is a change of character for controls
  that currently grow the figure, so it should be chosen rather than fallen
  into. **Still open.**

### And the terminology the author asks for

> *"We will need some sort of neutral terminology that covers camera distance
> for non-XR and rig distance for XR?"*

**Yes — but the need is for a word to THINK with, not a directive to rename.**
The proposal, in three parts.

**1. The concept is THE STANDPOINT.** Where the viewing is done from.

> **THE STANDPOINT** — the place the view is taken from, relative to the figure.
> In a flat window it is the camera; in a headset it is the rig, and the person
> standing on it. One word for both, because it names the RELATIONSHIP and not
> the apparatus.

"Standpoint" is chosen over the alternatives for being ordinary English that
needs no gloss, for carrying the bodily sense a headset actually has, and for
being honest about a flat window too — a camera at `cam_distance 600` is a
standpoint 600 units out.

**2. The directives do not need renaming, and should not be.** Four reasons,
and the first is the substantial one:

- **`cam_distance` already names the relationship rather than the mechanism.**
  "The viewpoint is 600 from the figure" is true in both modes; §5i's finding was
  that the arithmetic is identical and only its destination changes. The word
  "cam" is then slightly inaccurate in a session — there is no single camera —
  but nothing it *says* becomes false.
- **The `cam_` prefix is load-bearing in the column.** The markup says so
  explicitly: it exists so the camera controls sort and read as one group.
  Renaming one of them breaks the group; renaming all of them is a much larger
  change than the problem.
- The 13-character label limit. `standpoint_distance` is 19 and wraps;
  `viewpoint_distance` is 18. The only neutral name that fits is **`standoff`**
  (8) or `cam_standoff` (12) — recorded in case it is ever wanted, not
  recommended now.
- Four stored scripts would need rewriting. A weak reason, as §6a already
  conceded, but not a zero one.

**3. And the real distinction the question exposes is not camera-versus-rig.**
It is this:

> **In a flat window the standpoint is MAINTAINED. In a headset it is only the
> OPENING POSITION.**
>
> `cam_distance 600` on a monitor means the eye is at 600 and stays there. In a
> session it means the viewer *begins* 600 out — and then walks, leans, and sits
> down. **Every camera directive becomes an initial condition rather than a
> continuing state**, and no renaming fixes that, because it is a change in what
> the number can promise rather than in what it refers to.

That is the thing to carry into any XR work, and it is worth more than the
vocabulary: a directive that was a setting becomes a **starting** setting, and
anything relying on it to stay true needs rethinking. `cam_distance_speed` is the
clearest case — a flight that assumes it owns the distance is a flight the viewer
can simply walk out of.

### **4. Corrected by the author: it is TWO QUANTITIES, not one weakened**

> *"But the rig distance, which is what is controlled, isn't the cam distance,
> because the user can move about on the rig. Maybe 'vantage' gives the hint that
> it is a point external to the user's headset."*

**Right, and part 3 above understates it.** "An opening position" treats it as
one quantity whose promise has weakened. It is not. **There are two distances in
a headset, and they are different kinds of thing:**

| | what it is | who sets it | kind |
|---|---|---|---|
| **the vantage's** distance from the figure | where the plate is placed — a property of the PLATE | **the script** | DECLARED |
| **the eye's** distance from the figure | the vantage combined with where the person is standing on it | **the person** | MEASURED |

```
  the eye   =   the vantage          ← the script's, settable
              + where they stand on it   ← the person's, readable only

  On a flat screen the second term does not exist — there is no plate and
  nobody standing on it — so the two collapse into one number. WHICH IS WHY
  ONE WORD HAS SUFFICED UNTIL NOW.
```

**And "vantage" is the better word, for exactly the reason given.** A vantage is
a place *prepared* for viewing — a hide, a viewing platform, an emplacement. **It
exists before anyone occupies it, and it stays where it is when they move about
on it.** That is precisely the plate. "Standpoint", which this section proposed
a moment ago, says *where you stand*, which is the person — the very thing that
is not under control. **Withdrawn in favour of the author's term.**

> **THE VANTAGE** — the place prepared for viewing, external to the viewer and
> set by the script. In a headset it is the plate's placement; in a flat window
> it is the camera, there being nobody to stand anywhere else. **The EYE is where
> the viewer has put themselves within the vantage** — readable, never settable.

As a rename candidate the arithmetic of the label limit is: `vantage` 7 fits,
`vantage_dist` 12 fits but abbreviates, `vantage_distance` 16 wraps. Still not
recommended — §6a's reasons stand — but `vantage` now replaces `standoff` as the
name to use if one is ever wanted.

### The consequence that matters, and it is not about naming

**`cam_axis` can only aim the VANTAGE.** It measures a strand's axis and points
the viewing position down it — and then the person takes one step sideways and
their eye is no longer on that axis at all. The aim this module computes to a
fortieth of a degree (§5f) is an aim of the platform, not of the eye.

Three ways that can go, recorded rather than chosen:

- **Accept it.** The person can look at the tunnel from beside it if they like.
  Probably correct, and it is what every room-scale piece does.
- **Re-aim continuously on the head's position.** Keeps the eye on the axis and
  is the nausea case — the world would swing whenever they leaned.
- **Invite rather than enforce**: place the vantage so that the axis runs through
  where a person naturally stands, and let the figure's own shape do the
  persuading. The only one of the three that treats the viewer as a participant.

**And the same correction applies to `cam_distance_speed`.** It flies the
*vantage* in. The eye arrives too, as long as the person stays put — so the
flight is an offer rather than a trajectory, and §5d's comfort argument becomes
sharper still: a viewer who dislikes it can step out of it, which is a far better
safety valve than anything the script could provide.

### The author's prediction, recorded so it can be checked

> *"I would guess the rig is approximately on the tunnel but slightly off centre
> maybe. Will need to try this out."*

**Almost certainly right, and the arithmetic says which term will cause it.**
Computed at a 3 m vantage distance:

| source of off-centre | size | |
|---|---|---|
| the bearing, rounded to the arcminute (§5f) | **0.35 mm** | negligible |
| the fitted axis missing the origin | **0** | already handled — the camera looks at the axis, not the origin |
| a lean forward | **~100 mm** | |
| **half a step sideways on the plate** | **~250 mm** | **DOMINATES, by three orders of magnitude** |

So the aim is not what will be off. **The person is**, and that is the vantage /
eye distinction showing up as a number rather than an argument.

**And one part of it is irreducible: a perfect aim cannot put BOTH eyes on the
axis.** Each sits 32 mm either side of it, always — so whether that matters is
set entirely by the bore:

| bore | each eye off-axis | reads as |
|---|---|---|
| 0.24 m (§7a's drainpipe) | **27% of the radius** | each eye looking down a different part of the wall |
| 0.50 m | 13% | noticeably asymmetric |
| 1.00 m | 6% | effectively centred |
| 2.00 m | 3% | effectively centred |

Which is §7a's bore finding arriving by a second route: **a tunnel wide enough to
fly through is also a tunnel wide enough for two eyes to agree about.**

### What can actually be tried, and when

Worth separating, so the test is not waited on longer than necessary:

- **Testable now, flat, and already was**: the aim itself, the axis-miss fix, the
  hole sitting centred.
- **Needs the headset**: whether the fly-through is bearable, whether a hairline
  fuses, whether stereo rescues the figure.
- **Needs the headset AND an immersive session in the module, which does not yet
  exist**: everything about the vantage / eye split, including this prediction.
  There is no `immersive-vr` request in `V_Kolam3D` — §5h's recommendation is
  still to wait, so the prediction stands unchecked on purpose.



**This is §3b's "scale directive — table, room, or building" with a shape at
last**, and the author's framing is what gave it one.

---

## Step 6b · Adopting "vantage" throughout — what the mode switch must actually do

The author: *"I thought the idea re vantage would be to adopt that terminology
all the way through, not just for XR. When the context changes, non-XR or XR, the
code will take necessary action to switch from camera to rig distance?"*

**Agreed on the principle, which is the project's own: the script is the source
of truth and should not have to know which mode it is in.** A script written
flat should work in a headset. "cam" becomes a lie in a session — there are two
cameras and neither is the author's — where "vantage" stays true in both.

Two costs, checked rather than assumed:

- **The 2D module shares NOTHING here.** `grep` finds no `cam_*` directive in
  `V_Kolam/visual_module.html` at all — the flat module has no camera. So the
  "a script must travel between the modules" objection does not apply, and it
  was the only substantial one.
- **Label widths worsen.** 5 of the 10 camera labels already wrap; after a
  `vantage_*` rename, 8 would. `vantage_roll` (12) and `vantage_axis` (12) fit;
  `vantage_distance` (16) and `vantage_elevation` (17) do not. A real cost, but
  the same kind the column already carries, not a new one.
- Two stored 3D scripts to migrate, and an alias so old spellings still read —
  which the module's RULE 1 machinery (`setDirectiveValue` reconstructs the form
  it read) already has the shape for.

### But the switch is not one branch, because three of the five change MEANING

This is the part the proposal does not yet account for. "Write it to the rig
instead of the camera" is right for the distance and wrong for the rest, and the
reason is the same one throughout: **the viewer has a body.**

| directive | flat | in a session | why |
|---|---|---|---|
| **distance** | the camera's position | **the rig's position** | a clean transfer. the eye's distance is then this plus where they stand |
| **azimuth** | position *and* orientation | **position, and yaw only** | a yaw of the rig turns their world about the vertical — the mildest of the rotations, and it composes with wherever they happen to be looking |
| **elevation** | position *and* orientation | **POSITION ONLY — no tilt** | the flat camera must tilt to look down because it has no neck. **A person has a neck.** Place the vantage above the figure and leave the viewer upright; they will look down by themselves |
| **roll** | the camera's up vector | **must NOT go to the rig** | rolling a rig tilts the horizon of someone who can feel which way is down, and **no neck movement can compensate for a tilted world.** Apply it to the FIGURE instead — visually near-identical for one object, and it leaves the viewer level |
| **axis** | aims the camera | aims the **vantage** | §6a: the person can step off the axis it computed |

**So the honest form of the author's proposal is: one vocabulary, and a
per-directive translation rather than a single redirect.** The directive names
stop caring about the mode; the *implementations* differ in three places out of
five, and each difference is the vantage/eye split showing up again — in the
distance first, and then in the bearing, which §6a had not followed through.

**The elevation row is the one worth keeping hold of.** It is the clearest case
in this whole document of a flat-screen idiom being a workaround for a missing
body: a camera tilts because it cannot turn its head. Carrying that tilt into a
headset would be reproducing a limitation as if it were a feature.

### Order of work, if it is wanted

1. **`%%bd_size` first.** It buys something today — a figure whose size is
   stated in metres — and it is what makes a first session show anything at all.
2. **The rename second.** Safe, testable flat (behaviour identical by
   construction), and it buys nothing until the port — but it stops the
   vocabulary being wrong, and every script written after it is written in the
   right terms.
3. **The translation table above last**, with the port, since it cannot be
   tested without a session.

---

## Step 6c · What `angle` and `pitch` actually govern — measured

Raised while settling the `size`/`step` question: *"isn't the natural place for
pitch to be pitch per angle? That would be easier, wouldn't it?"*

**Measured, and the answer is the opposite — a ratio would make it worse.**
Simulating `bd_V_Kolam3D_002`'s own script and varying one parameter at a time:

| | holds | across |
|---|---|---|
| **`pitch` sets the LENGTH** | `length / pitch` = 1090, 1088, 1080, 1049 | pitch 2 → 16 |
| **`angle` sets the BORE** | `bore × angle` ≈ 12200 … 16300 | angle 13.5 → 108 |

**The two are already nearly independent, one governing width and one governing
length.** `pitch` holds the length to within 4% over an eightfold range; `angle`
gives a bore going as roughly 1/angle, less tidily because the small-angle
approximation frays by 108°.

So expressing pitch as a fraction of angle would **couple two controls that are
currently orthogonal in the only thing that matters** — how wide against how
long. Which is why holding `pitch/angle` fixed preserves nothing: at a constant
ratio of 0.148, angle 13.5 gives a shell at 1:2 and angle 108 gives 1:116.

### The invariant is the PRODUCT, not the ratio

Holding `pitch × angle = 432`:

| angle | pitch | length : bore |
|---|---|---|
| 13.5 | 32 | 1:33.2 |
| 27 | 16 | 1:33.1 |
| 54 | 8 | 1:32.3 |
| 108 | 4 | 1:28.8 |

Constant to within 13% across an eightfold range of angle. **So the
aspect-preserving move is to scale `angle` and `pitch` INVERSELY** — halve one
and double the other for the same proportions at a different winding density.
That is the thing a ratio was hoped to give and the product actually gives.

### And it corrects a claim written into the node the same day

`bd_V_Kolam3D_002`'s prose called `step_pitch` "the one control that decides
whether a person fits inside the piece at all". **Wrong.** `step_pitch`
stretches the figure along its own near-vertical axis, so it changes the LENGTH
and reaches the bore only indirectly, by enlarging the span that `%%bd_size`
divides by. **`angle` is the direct bore control**, and therefore the one that
decides whether a person fits. Node corrected.

### Which completes a clean three-way decomposition

Worth having in one place, because it is what the `size`/`step` work was
reaching for:

```
  SIZE   (or step)   ->  the overall scale
  ANGLE              ->  the bore          — how wide
  PITCH              ->  the length        — how long
```

Three controls, three nearly-separable properties. **`step` is the only one of
the four that governs nothing of its own** — it is a pure uniform scale, which
is exactly why `size` can replace it (§6a) and why a ratio for `pitch` would be
solving a problem that `angle` and `pitch` do not have.

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
