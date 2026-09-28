# Planning register — design docs and how far each is built

**Created 2026-08-23. Updated 2026-09-12** — eight designs added, two statuses
corrected against the code, one open item closed.

Companion to `DOCS_INDEX.md`, which says what every
file in the repo *is*. This one covers the **design and planning documents
only**, and answers the question the index does not: *how much of this is
actually built?*

A spec that says "design, not yet built" may be half-implemented; one that says
nothing may be finished. Where possible the status below is **evidence-based** —
a named symbol found or not found in the code — rather than taken from the
document's own header.

Keep this updated when a design moves. A stale register is worse than none.

---

## Status vocabulary

| | |
|---|---|
| **Built** | Implemented and in use. |
| **Built, doc stale** | Implemented, but the document describes an older state. |
| **Partly built** | Some of it exists; named gaps remain. |
| **Design only** | Nothing in the code yet. |
| **Planning only** | Deliberately not for implementation — thinking, not a queue item. |
| **Superseded** | Replaced by something later. |

---

## At a glance

| doc | date | status | evidence |
|---|---|---|---|
| `editing_spec.md` + `corner_controls_plan.md` | 08-27 | **Built** (v0.2 corner controls) | `#gn-btn`/`#bn-btn`, `gnStack`, `gn_mark`, `paintNodeButton` |
| `stable_id_spec.md` | 08-21 | **Built** | `nodeId()`, url-keyed ids throughout |
| `blue_node_spec.md` | 08-21 | **Built** (partly untested) | `showBlueNode`, `renderMarks`, `markBlueEdges` |
| `edge_model.md` | 08-22 | **Reference** (not a plan) | describes as-built |
| `work_views.md` | 08-31 | **Reference** (not a plan) | gateway/title/passage views, as-built |
| `unified_focus_spec.md` | 08-16 | **Built**, default ON | `UNIFIED_FOCUS` ×5 |
| `cc-hint-system-spec.md` | 06-12 | **Built, doc stale** | `hint_x_*`, `write_hints` ×9 |
| `cards_spec.md` | 07-15 | **Built, doc stale** | `createCard`, `card-head` ×23 |
| `communications.md` | 07-15 | **Built** | `buddy_card`, `prependPartnerCard` ×10 |
| `music_player_layout_spec.md` | 08-19 | **Partly built** | ABC done; see below |
| `SR_Editor_Rules_v0.1.md` | 08-13 | **Built** (separate page) | `sr_editor.html` |
| `bot_context.md` | 06-24 | **Partly built** | `stripBotBlocks` etc. ×5 — despite "not yet built" |
| `convergence_node.md` | 06-28 | **Design only — idea absorbed** | 12 `convergence` hits in `viewer.js`, but all are Explore vocabulary ("a recorded convergence" = a GN mark). This doc's own design was never built. *Corrected 09-12: the earlier "zero hits" evidence is stale and reads misleadingly.* |
| `BD_Viewer_Scaling_Brief.md` | 08-23 | **Planning only** | nothing scheduled, by intent |
| `speech_plan.md` | 09-04 | **Built** (stages 0–1, shipped) | `piper_direct.js`, `speakReady` ×7 in `viewer.js` |
| `voice_training_pipeline.md` | 09-06 | **Built** (first fine-tune) | `voices/bd_will_01.onnx` present |
| `ink_mode.md` | 08-28 | **Built, now DEFAULT** | `get('ink') !== '0'` — `?ink=0` is the escape |
| `ink_promotion_plan.md` | 09-04 | **Partly built** | stage 1 done (above); stage 2, walking every view, open |
| `remote_view_spec.md` | 08-31 | **Built**, colour scheme superseded | `gn_mark`/`#gn-btn` ×13; achromatic model replaced its ladder |
| `DeepLinking.md` | 09-12 | **Reference** (not a plan) | measurements; two experiments reverted |
| `speech_lexicon_draft.md` | 09-04 | **Design only** | explicitly a draft for checking by ear |
| `corner_controls_plan.md` | 08-28 | **Partly built** | breadcrumb bars retired (`BREADCRUMB_BARS = false`); offer/accept/lapse retirement open |

---

## Detail

### `stable_id_spec.md` — Built (2026-08-21)

Node ids are the durable `url`, not Memgraph `elementId`. Done and load-bearing.

**Watch:** `nodeId()`'s fallback to `getElementId` is *not* dead code — 42 edge
rows have url-less orphan endpoints. No **node** id may come from
`getElementId`; edges may.

---

### `blue_node_spec.md` — Built, partly untested (2026-08-21)

The partner's position drawn as a haloed node on your own graph, replacing the
old `#buddy-latest` panel.

**Built and confirmed:** arrival halo, retirement of the previous marker,
`n_r` badge clearing the rings, the arrival pulse, the radial-gradient rim,
suppression at the top-level views, fixed bottom-right placement, 0.75 opacity
for a revealed node.

**Open:** a thin dark line between the white and blue rings when both marks
coincide — overlapping the strokes did not clear it. Next suspect is the blue's
0.4 outline-opacity darkening toward its edge, i.e. a colour problem, not a
geometric one. **Do not tweak the offset again.**

**Untested:** blue edges (they were a no-op until 2026-08-22), the Snap's
mirrored ring orders, and iOS generally.

**Correction the spec itself needs:** §4 of the scaling brief prescribes
`cy.getElementById(id).length > 0` as the halo/corner test. Every node is
permanently resident, so that is never 0. The correct test is `.visible()`.

---

### `edge_model.md` — Reference, not a plan (2026-08-22)

Not a proposal; a description of how the graph actually works, written because
the same wrong assumption recurred twice. Establishes that **no simulated-edge
system exists** — the whole corpus is resident from boot — and that the
technique being remembered was real and retired before this repo's history.

Read before touching anything edge- or layout-related. §6 carries the measured
cytoscape 3.34.1 rendering facts, two of which are the opposite of their CSS
namesakes.

---

### `unified_focus_spec.md` — Built, default ON (2026-08-16)

One tap shows text and neighbourhood together. `?uf=0` restores the legacy
behaviour.

**Consequence worth knowing:** it retires chunk-advance for non-root nodes, so
`readingState.chunkIndex` never leaves 0. Nothing is lost today — no node in
the corpus carries `%%bd_chunk` — but the chunked-UX machinery is dormant
rather than removed, and would need this guard revisited to work again.

---

### `cc-hint-system-spec.md` — Built, doc stale (2026-06-12)

Manual position-hinting, built and in use.

**Two changes the doc predates:**
1. **2026-07-23** — hints became per-edge *and* per-viewing-parent
   (`hint_x_<parentUuid>`), fixing cross-view clobbering.
2. **2026-08-22** — Cluster parents now **ignore** the bare pre-scoping keys.
   Measured: not one of the 126 clusters had hints scoped to itself, while 59
   were being dragged out of the clean layout path by a stale bare value left
   by a Family view. Family views still use the fallback and still need it.

---

### `cards_spec.md` — Built, doc stale (2026-07-15)

Self-declares as-built at `viewer.js?v=331`; the viewer is past v600. The
*shape* is current, the detail is historical.

---

### `communications.md` — Built (2026-07-15)

The buddy channel. Self-declares "design, largely built"; the code says built.

**Fact with design consequences:** `buddy_card` is **pure pass-through with no
server persistence**. A reload loses everything the partner sent, with nowhere
to recover it from. This is the strongest argument for the draft-persistence
work in the scaling brief's `CC.7`.

---

### `music_player_layout_spec.md` — Partly built (2026-08-19, v0.2)

Shared panel-grid for media modules; the module owns a CSS grid with two empty
dock-slots and BD mirrors its chrome onto them.

**Done:** ABC embedded and standalone; Fractal embedded and aligned.

**Open:** desktop docking (`positionExtendPanel` early-returns above 1024px);
Kolam and any module lacking the slots still use per-module fallbacks.

**Trap:** an empty dock slot has no height of its own — its height comes from
the panel sharing its grid row. Read §the dock-slot gotcha before pinning
anything to one.

---

### `SR_Editor_Rules_v0.1.md` + `BD_SR_Editor_Design_Notes_v0.1.md` — Built (2026-08-13)

Speech-recognition editor, living at `sr_editor.html` — a **separate page**, not
part of the viewer. Whisper via transformers.js, AudioWorklet PCM capture.

---

### `bot_context.md` — Partly built, despite its own header (2026-06-24)

Self-declares "design, not yet built", but the viewer carries
`stripBotBlocks` / `unnormalizeBotBlocks` and a curator-view fork on bot blocks
— 5 references. So the **rendering** side exists; the authoring flow is what
does not.

A good illustration of why this register is evidence-based: the document's own
status line is wrong in the direction that matters.

---

### `convergence_node.md` — Design only (2026-06-28)

Paired-discussion convergence node. **Zero references in `viewer.js`** — nothing
is built.

Relevant now: this is the nearest existing thinking to the imminent
**pair-agreed-edit** work (saving a pair's agreed edit as a new node). Read it
before designing that, and expect to supersede it.

*Was untracked until 2026-08-23 — existed only on one machine.*

---

### `BD_Viewer_Scaling_Brief.md` — Planning only (2026-08-23)

Whether the viewer scales. **Nothing scheduled, by intent.**

The `CC analysis` section corrects the brief's central premise — the viewer
neither accumulates nor replaces, it loads the entire corpus at boot — and
holds three measured findings worth acting on eventually, in value order:

1. Each node is sent once per incident edge (mean 12.6×). Deduping is a
   query-level change with no behavioural effect.
2. `raw_text` is byte-identical to `text` in 198 of 198 nodes carrying both.
3. Text could be fetched on open rather than at boot.

Together ~50×, turning a projected 405 MB boot at 100× corpus into ~8 MB.

**`CC.7` is the only present-tense item in the whole document** — draft loss on
tab reload — and it is unimplemented. It arrives by backgrounding, not by
memory pressure, so it needs no scaling wall to bite.

**`CC.9` lists what the pair-agreed-edit work will invalidate.** Re-read before
acting on any of it.

---

## Added 2026-09-28 — STANDING DECISION: graphics render through three.js

| item | where | note |
|---|---|---|
| **Every visual module from here uses three.js, not a 2D canvas** | `ThreeJS_and_VR_2026-09-28.md` | **AUTHOR'S DECISION, 2026-09-28.** Stated reason: keep a WebXR conversion possible. A canvas renderer has no VR meaning at all; a three.js scene is a session flag and a camera-ownership change away from a headset. Do not reach for `getContext('2d')` for a new visual module. |
| **`bd_V_Kolam3D` is a measured superset of `bd_V_Kolam`** | `V_Kolam3D/`, `V_Kolam/` | At `pitch 0` and `cam_elevation 90` the 3D module draws the flat one's figure to `Float32Array` precision — 6.1e-5 world units on a radius of 1362, verified across five settings. So the flat module could be RETIRED rather than ported. The one real loss is `weight`: `ctx.lineWidth` works, core WebGL ignores line width. Second, smaller: the canvas rasterises a bezier for free where three tessellates it. Not decided. |
| **THE COLLAGE FORK — decide before building, not after** | `ThreeJS_and_VR_2026-09-28.md` §7 | If visuals are three.js, a collage can be **one scene holding several objects** rather than several iframes side by side — which is the only version that means anything in a headset, where a collage is a space you stand in. But the module contract is deliberately iframe + postMessage so a third party can write one (the whole point of the BDX harness). A shared scene means modules export GEOMETRY, not pixels: a new contract, and the isolation goes. Pressure towards the shared scene: browsers cap live WebGL contexts (~16 in Chrome, oldest silently lost), so an iframe-per-visual collage has a hard ceiling. **Worth measuring on the target devices before choosing.** |

---

## Added 2026-09-27 — RULE 9, dead directives

| item | where | note |
|---|---|---|
| **RULE 9: a module's default script carries no directive it cannot act on** | `CollagePlanStarted_2026-09-22.md` | The script is not a private config file — it is the card a person reads, edits, copies and collages, so every line should do something. `bd_V_Kolam3D_001` shipped `%%bd_weight` (read, but applied to a WebGL property that is ignored) and `%%bd_stroke` (**not read at all** — the 3D renderer always takes its hue from the yaw). Both removed; all 20 remaining directives are live. |
| **Safe because nothing is lost — checked, not assumed** | — | Absent, the flat module defaults `stroke` to `angle` and the 3D module defaults `weight` to 1.5: exactly the values the removed lines carried. "The module ignores it" and "removing it changes nothing" are different statements, and the second is the one that licenses removal. |
| **What a module WRITES and what its default script CARRIES are separate** | — | RULE 9 does not license stripping a directive from a script that has one. A figure given a weight in the flat module keeps it through the 3D one, because that module never *rewrites* `weight` — unchanged by this. |

---

## Added 2026-09-27 — the viewer and the sender's clock

| item | where | note |
|---|---|---|
| **A drift frame differing only in pitch or cam_elevation was pushed to the viewer** | `viewer.js` | **FIXED.** `pushScriptToAV` declines a drift frame that differs from the last push only in a value the receiver computes itself — but the comparison stripped `AV_ANGLE_LINES`, which named the angle triple LITERALLY. So the camera rotation was pushed, and the viewer snapped back to a value up to a second stale: "small jerks of elevation every one or two seconds". Now `AV_CLOCK_LINES`: angle triple + pitch triple + `cam_elevation`. Pitch was leaking identically and unnoticed because the node ships `pitch_drift 0`. Rates are deliberately excluded and the exclusion is structural, not careful. 31 cases checked. |
| **A matcher that lists a category must be edited when the category grows** | `viewer.js` | The comment above that regex had already predicted the exact failure — "if it stopped matching, every drift frame would read as a human change and be pushed". What it missed is that ADDING A CLOCK does the same damage as the regex breaking. Note now says so, and says where to edit. |
| **`avWithClockDrivenFrom` carries all five values** | `viewer.js` | A resync exists to make the viewer agree with BD NOW. It copied only angle and angle_minutes; a value left out would have been the one parameter a resync could not fix. That resync is what makes the phase offset between two independent clocks tolerable. |
| **Two independent clocks hold a phase offset** | — | **ACCEPTED, with the same standing as angle drift.** BD and the viewer each compute the rotation from `cam_elevation_speed`, starting at different moments, so they can show different elevations. Sync is the way back into step. |

---

## Added 2026-09-27 — camera range and auto-rotate

| item | where | note |
|---|---|---|
| **`cam_elevation` is the full turn, cyclic** | `V_Kolam3D/visual_module.html` | **BUILT.** −180..179, wrapping. It was −90..90 under a comment of MINE claiming the poles would flip the azimuth and break round-tripping. That comment was wrong about code written to avoid exactly that: the up vector is the sphere's north tangent, not world +Y. VERIFIED across all 360 degrees — up stays unit, up·view is 0 to twelve places at the poles included, no two elevations give the same view, every 1° step moves the camera 0.01745 of the radius with no jump over the top. Stops at 179 because 180 ≡ −180 and one picture must not have two spellings. |
| **`cam_elevation_speed` — auto-rotate** | `V_Kolam3D/visual_module.html` | **BUILT.** Degrees per second: 0 off, 1 = a turn in 6 min, 60 = 6 s. NOT called `_drift`, because drift means arcseconds per tick in this module and at that unit's maximum the camera would need 21 minutes for one turn — a control borrowing a family name must borrow its unit. **Its own clock at 20 Hz, not the drift timer's**, which is depth-throttled to 1 Hz at depth 5 because it rebuilds geometry; a camera move rebuilds nothing, so the rotation is smooth at every depth. Drawing follows a float, the script records whole degrees at ≤5 writes/s, announced as drift (RULE 7). |
| **No azimuth speed yet** | — | **OPEN, one row.** A turntable is the more usual auto-rotate than a pole-to-pole tumble; only elevation was asked for. Same mechanism, so it is a stepper plus three lines. |

---

## Added 2026-09-27 — opacity

| item | where | note |
|---|---|---|
| **`%%bd_p_opacity`, 0 to 1** | `V_Kolam3D/visual_module.html` | **BUILT.** Seventeenth stepper, twentieths. Worth more here than in the flat module: eight symmetric copies of a folded curve are mostly self-occluding. `depthWrite` follows the transparency — with it left on, the nearest line per pixel hides everything behind it and the figure reads as a solid shell. `transparent` is in three's program cache key, so `needsUpdate` is guarded behind an actual change (this runs 5-10x a second under drift). Material only, so it joins the no-rebuild path. Readout drops the leading zero; measured, all 21 values fit the span and the round trip is float-exact. |
| **Opacity is NOT in the flat module** | `V_Kolam/` | Deliberate — not asked for, and marginal on a 2D canvas. Verified safe: the flat module reads `opacity` into its directives, has no `CONTROL_FOR` entry so offers no row, and never writes it — so the line survives a round trip there intact and draws opaque. |

---

## Added 2026-09-27 — hold-repeat

| item | where | note |
|---|---|---|
| **A held stepper ran away** | `V_Kolam/`, `V_Kolam3D/` | **BUILT.** Two faults. (1) A small range had NO BRAKE: the repeat floored at one step per 60ms tick and returned early saying such controls were "already quick enough", so `depth` crossed its entire 4-wide range in **0.24s**. The code could not express "slower than one step per tick" and the comment recorded that limit as a property. (2) A 2500ms traverse was brisk for wide ranges too. Fixed by letting the magnitude go FRACTIONAL and accumulating in the caller, so the range-derived rate governs small ranges as well; the floor is now a TIME (one step per `START_STEP_MS`) not one step per tick. Traverse 7000ms, ramp 1400ms. Measured before/after in the changelog. |
| **The two Kolam modules share this block and must stay identical** | `V_Kolam/`, `V_Kolam3D/` | The 3D file's header states the parser, stepper machinery and drift clock are the 2D file's verbatim. Fixing only the module that was complained about would have quietly made that false. A check compares the two blocks with comments stripped. The MUSIC modules use an older repeat and were not touched. |

---

## Added 2026-09-27 — the 3D kolam

| item | where | note |
|---|---|---|
| **`bd_V_Kolam3D` — kolam in three dimensions** | `V_Kolam3D/`, `server.js`, `viewer.js`, `AV/kolam.html` | **BUILT.** A SIBLING of Kolam, a Cluster off Graphics — same `%%bd_` script, different renderer. `+` turns by `angle` about the turtle's up axis AND by `pitch` about its left, so **pitch 0 at cam_elevation 90 reproduces the 2D figure exactly**: VERIFIED numerically over five settings, worst deviation 6.1e-5 world units on a radius of 1362, which is `Float32Array` precision and not the arithmetic. three.js 0.160.0 UMD from jsdelivr, pinned, colour management OFF so `setHSL` matches a 2D canvas. |
| **Camera steppers** | `V_Kolam3D/visual_module.html` | **BUILT.** `cam_azimuth` / `cam_elevation` / `cam_distance`, on a fast path that rebuilds no geometry — the drawing is on the card, so looking at it from elsewhere is a matrix. `cam_distance` **auto-frames on first render** when the script does not name it, because the stored Kolam settings have radii from 97 to 1362 and a camera inside the geometry shows nothing. The auto-fit is not announced (RULE 7) and enters the script on the first human control change. |
| **Pitch compounds — the control bites harder than a degree suggests** | — | MEASURED: **five** degrees takes the default figure's max \|y\| from 0 to 343 world units against an in-plane radius of 97; one degree gives 75. The turn applies at every one of 512 steps. `pitch_minutes` is load-bearing, not a nicety. **Corrected**: this row first said ONE degree gave 343, reading the wrong line of the table, and `step_pitch`'s node default was picked from it ten times too small. |
| **`%%bd_step_pitch` — the step length in the new dimension** | `V_Kolam3D/visual_module.html` | **BUILT**, same day, off the first test. The answer to the row above: the turtle's step length out of the plane, in `step`'s units. Applied as `group.scale.y`, which is EXACTLY equivalent to scaling the y of every move — verified against an independent turtle that scales during the walk, five ratios including 0 and 2.5, agreement to `Float32Array` precision. So it rebuilds no geometry and the figure inflates under your finger at depth 5. On the group above the symmetry children, because a y-rotation commutes with a y-scale. Inert at pitch 0, correctly. Node default 5 against step 50; the module's fallback for a script that omits it is `step` itself, because isotropic is the only default that cannot change a figure written earlier. |
| **No `weight` stepper in 3D** | `V_Kolam3D/visual_module.html` | **DELIBERATE, and an OPEN item if thickness is wanted.** Core WebGL ignores line width, so a weight control would be wired to nothing. `%%bd_weight` is passed through untouched so a figure keeps it on the way back to the flat module. Real thickness = `Line2` / `LineMaterial` from `examples/jsm`: ES modules, an import map, three more CDN fetches. Not silent work. |
| **The 3D wrapper closes two whitelist gaps the 2D one has** | `V_Kolam3D/index.html` | `bd_ui_config` in `RELAY_DOWN` and **`BD_ERROR` in `RELAY_UP`**. The second is specific to this module: it depends on a CDN, and "the library did not load" is the one sentence that must never stop at a relay. Said on screen too, in a different colour from "waiting" — a dead module must not look like a slow one. |
| **Paired stepper column** | `V_Kolam3D/visual_module.html` | **BUILT.** Every quantity that exists in both planes beside its counterpart: step/step_pitch, angle/pitch, angle_minutes/pitch_minutes, angle_drift/pitch_drift. Column, `CONTROL_FOR`, the writer and the stored script's `_p_` marks are all in that one order, and a check asserts all four agree. |
| **The node opens at pitch 1** | `bd_V_Kolam3D_001` | **BUILT.** A control that does nothing in the default state is a bad control however correct it is — step_pitch was inert at pitch 0 and was reported as broken. The MODULE's parse fallback stays 0, deliberately: a script that never mentions pitch was written for the flat module and must render flat. Markup default and parse fallback differ on purpose, and say so. |
| **iOS / phone testing of Kolam3D** | — | **PENDING.** Verified on this machine only. WebGL context loss on a backgrounded tab is the specific thing to watch; the 2D canvas has no equivalent failure. |

---

## Added 2026-09-22 — align BD with BDX

**The plan, in order.** BDX/AVX/RX grew four things BD does not have, and the
two are supposed to be the same architecture. `bd_relay.js` is already
byte-identical between them and `bd_av_client.js` is a tracked copy, so most of
the alignment is already structural — what is missing is the **controller**
half, which lives in `viewer.js` and was only ever written for BDX.

Facts established 2026-09-22, by test rather than assumption: **BD is publicly
hosted** at `https://graph.virtualfictions.uk` (cloudflared tunnel on this Mac
to `localhost:8080`, running since May), the AV page is served from the same
origin, and **WebSocket crosses that tunnel**. So BD needs none of the
apparatus BDX needed — no `?rx=`, no substitutable relay, no mixed content —
because BD serves the pages *and* is the relay, over https throughout.

**ALL FOUR BUILT 2026-09-22.** BD's server was restarted to pick up the relay
handler (it had been running since Sep 19, and `av_spare_token` landed Sep 20 —
sender and client without the middle site, the failure this project has
documented before). Proven against BD's own relay: spare delivered, spent token
refused, spare accepted.

| # | item | status | note |
|---|---|---|---|
| 1 | `av_spare_token` sent by `viewer.js` | **BUILT** | The relay carries it and `bd_av_client.js` already stores and spends it; BD never sends one. BD's viewers have an opener and renew through it, so this has never shown — but a viewer opened from a *pasted link* has no opener, and on a phone that is the ordinary case. Needed whether or not the rest is built. |
| 2 | `qrcode.js` vendored into BD | **BUILT** | MIT, 57 KB, lazy-loaded on first press. Verified by decoding, not by matrix comparison — see `BDX_DEMO_PLAN.md`. |
| 3 | "Device" button + dialog | **BUILT** | Beside View. Mint on the press; single-use, three minutes; countdown from the relay's own `ttl_ms`. Refuse on localhost, where the link means the other device itself. |
| 4 | Safari clipboard pattern | **BUILT** | A write after the mint's round trip is refused — the gesture is over. Hand the clipboard the *promise* during the press, then `writeText`, then a visible copy button. |

**Design note for (3): leave room for a short typed code.** The QR is one
delivery, not the mechanism. A VR headset is exactly the device this exists for
— no window handle — and is also the worst at both scanning a QR and typing a
150-character URL. A six-character code typed into the viewer would suit it,
and is the one option needing a **protocol addition**, so the dialog should be
laid out to accept it later rather than be retrofitted.

**VERIFIED BY HAND 2026-09-22.** Device → QR → a phone across the room → drift
there → Sync → BD lands on the node at the phone's position and says so. The
viewer's back button was rebuilt for the case: BD marks the launch URL `d=1`
and such a viewer offers **Sync** rather than a way back that is not there.

**Two process notes from getting there**, both in memory:

- **BD's client-console log is stdout.** Restart it as
  `node server.js >> /private/tmp/bd_server.log 2>&1`, or the log silently
  stops growing and the next debugging session reads a dead file. That cost
  two rounds here.
- **Block scope is not function scope.** A helper declared in a nested block of
  `init()` is invisible to a dispatcher one level out, even though both are
  "inside `init()`". Checking by backwards-searching for an indent-0 function
  header cannot see this and will say they match.

**`GRACE_MS` and cross-device — a real interaction, noted 2026-09-22.**
`server.js:1301` runs at **10s**, and that is DELIBERATE, not an oversight: the
comment records it as the author's development compromise of 2026-09-12 — long
enough that a brief blur does not tear a pair down, short enough that a dev
restart leaves no ghost occupying the pair slot. The production value is 65000,
chosen to sit just above Socket.IO's 60s `connectionStateRecovery`.

The interaction worth knowing: a purged session takes its viewers with it. A
viewer's `moduleFor` names a session, and `sessions.get()` returning nothing
means `av_hello` and `av_return` are dropped — the relay has nobody to deliver
to. **At 10s a controller that sleeps for eleven seconds orphans a phone
permanently**, and the spare token does not help: it covers the VIEWER losing
its connection, not the controller's session being reaped. Cross-device is
precisely the case where the controller sits unattended.

No code change: `BD_GRACE_MS=65000 node server.js` sets the production value
without editing anything.

**Found on the way, unrelated to the feature:** `MODULE_ORIGINS`
(`server.js:1038`) is **dead code** — declared, referenced nowhere, while
`cors.origin` is `'*'`. Its comment claims "an explicit ALLOWLIST, not `'*'`",
which is not true. The real gates (`curationCodeOk()`, `VIEWER_MAY_SEND`) were
tested and do hold, so this is not an open hole; but it is a comment that would
licence a bad decision later, and BD is on the public internet. Either enforce
it or delete it. If enforced, note BD's own public origin is **not** in the
list, so View would break with it.

---

## Added 2026-09-22 — the collage plan

### `CollagePlanStarted_2026-09-22.md` — Design only, discussed and agreed

Two phases: **text_media + UX alteration** (text nodes as module scripts, three
modes to two, `_p_` control marking, merge from history, a collage module),
then **shared editing**. The sequencing is deliberate: the merge semantics ARE
the data structure, and a format that has reached the corpus cannot be revised
cheaply.

`_p_` was chosen over a `%%bd_ui` declaration line **on length** — 24 chars for
eight controls against ~70 — which is the constraint that binds, given the
659-char ceiling measured in `DeepLinking.md`. Module blocks provide the
namespace, so no qualified names are needed.

Four rules in the doc, all evidence-based rather than anticipated:

| rule | why |
|---|---|
| The writer must reconstruct the form it read | `setDirectiveValue` (`visual_module.html:713`) builds `%%bd_${name}` from the STRIPPED name — one stepper press would leave both `%%bd_p_symmetry 8` and `%%bd_symmetry 9` in the script. Exists today, waiting. |
| A script with no `_p_` keeps current behaviour | Auto-population already exists (`visual_module.html:331`). Makes the format self-describing and removes the corpus migration entirely. |
| Two-phase deploy, receivers first | Old consumers do not strip `_p_` and would render at defaults, silently. `DeepLinking.md`'s existing procedure applies unchanged. |
| Truncated labels can collide | `colour_speed` / `colour_scale` truncate alike. Accepted, recorded. |

**Open, and needed before code:** what occupies the screen in Create (Player
shows the iframe, Edit shows `cy`, and Merge needs history reachable); what a
module block's closing looks like; whether a merged script carries a format
version.

---

## What is genuinely open, in one place

Not a schedule — a list of what has been designed and not built.

| item | where | note |
|---|---|---|
| Draft/panel persistence across reload | brief `CC.7` | Present-tense risk. Design complete, including the `pagehide` trap. |
| ~~Retire breadcrumb bars + panel above canvas~~ | `corner_controls_plan.md` §6 | **DONE** — `BREADCRUMB_BARS = false` at `viewer.js:468`. Verified 2026-09-12. |
| Retire explore offer/accept/lapse | `corner_controls_plan.md` | Superseded by GN-on-BN-click; spans client and server. |
| Explore: reconnect behaviour | `editing_spec.md` §10 | Acceptance dialog is moot — the negotiation is going. |
| Pair-agreed edit → SAVE a new node | — | The Explore ceremony is its front door. Consent vocabularies deliberately kept apart. |
| Boot-payload dedupe + drop `raw_text` | brief `CC.4` | Two easy wins, no behaviour change. |
| Fetch text on open | brief `CC.4` | Moderate; needs a small endpoint. |
| Desktop docking for media modules | layout spec | `positionExtendPanel` early-returns above 1024px. |
| Bot authoring flow | `bot_context.md` | Rendering exists; authoring does not. |
| Blue Node ring seam | `blue_node_spec.md` | Colour problem, not geometry. |
| Delete stale BARE layout hints | `cc-hint-system-spec.md` | 166 edges (162 DESCENDS_FROM, 3 CLUSTER_REL, 1 CONTAINS). They route views down the wrong `runLayout` branch — three incidents so far. The Cluster reader already ignores them; deleting is a data change. |
| Selection rule for capped neighbourhoods | brief §5 | Curation/ethics question. Affects 15 of 105 clusters. |
| ~~BD/BDX alignment (4 items)~~ | Added 2026-09-22, above | **DONE 2026-09-22.** Untested in a browser: nobody has pressed Device. |
| `MODULE_ORIGINS` dead code | `server.js:1038` | Enforce it or delete it. The comment claims a protection that is not there. |
| Short typed code for a viewer | Added 2026-09-22, above | The one hand-off option needing a protocol addition. For headsets. |
| Collage: `_p_`, modes, merge | `CollagePlanStarted_2026-09-22.md` | Phases 0-2 BUILT for Kolam + Fractal; nodes 001/002 migrated. Read/Create modes and merge not started. |
| ABC: `_p_` + announcements | same doc | Three edits — module announces `bd_av_state`, wrapper whitelists it and `bd_module_log` — then the mark pass. |
| Never announce on a script push | same doc, RULE 7 | Looks safe, loops. A module rebuilds the script, so it never matches what was pushed. |
| Create-mode layout | same doc | Player and Edit show opposite things; Merge needs both. Needs a layout answer before code. |

---

## Added 2026-09-12

| item | where | note |
|---|---|---|
| **JSP — "just send parameters"** | `DeepLinking.md` | **BUILT + VERIFIED IN USE for Kolam 2026-09-12** (`77c5bba` + `2d44c71` + guard `26f1329`): `?j=` short-key pairs, 237 chars against 650; round trip confirmed in a browser. ABC, Fractal and the return trip still use `?data=`. Originally: Positional parameter arrays instead of `%%bd_` directive text: Kolam 650→181 chars, Fractal 822→188, ABC 664→266. A 3-node collage of saved nodes is **87 chars** against 1,730 today. **Version the format from day one** — the exact lesson of the `name` field. |
| **Collage module** | `DeepLinking.md` | Not built, no repo. Blocked in its current shape: a 3-node collage inline is **8,276 chars** and fails GitHub Pages' ~8 KB request-line limit **on a button press**, sharing not involved. |
| Deep links unclickable in Apple native apps | `DeepLinking.md` | Links are ~686 chars against a **659-char** data-detector cap. Email and the address bar are unaffected. Four fixes ranked in the doc; the fragment move and the rich-`<a href>` clipboard were both built and **reverted**. |
| Pronunciation lexicon | `speech_plan.md`, `speech_lexicon_draft.md` | The live edge of the speech work. The draft needs checking by ear — the corpus mixes Legge's 1891 romanisation with modern pinyin. |
| Ink promotion stage 2 | `ink_promotion_plan.md` | Walk every view under the achromatic default. |
| `MEMORY.md` index discipline | — | The index hit 29 KB against a ~24 KB load limit on 2026-09-12 and was being truncated. Trimmed to 15 KB by moving detail into topic files. **Keep entries under ~230 chars.** |

## Added 2026-09-18 — the script becomes the source of truth

Author's reason, recorded because it governs the rest: *"only the script is
flexible enough to combine sharing / saving / collaging"*.

| item | where | note |
|---|---|---|
| **BD pushes the CARD, not the module** | `viewer.js` | **BUILT** (`849c34e`). What a viewer shows is now what the script says — the same text that is shared, saved or collaged. A card edited BY HAND reaches the viewer too, which the module-direct push could never do. |
| **`auto` tick box, two-way, on by default** | `index.html`, `style.css`, `viewer.js` | **BUILT** (`a5dec2d`, `001f595`, `849c34e`). ONE meaning covering both directions: the card and the module are the same thing. Unticked, the card stops tracking the steppers and so does the viewer — the honest meaning of the decision, not a regression, which is why ticked is the default. The ↓ also moved 50% lower: the two arrows do opposite things, so hitting the wrong one costs whichever side you had just got right. |
| **The drifting angle is RECORDED but not pushed** | `viewer.js` | **BUILT** (`76d3434`). It determines the picture more than any other parameter, so the script must hold it. It is still not sent to a viewer while drift runs: the viewer computes it from the same script, and pushing ours snapped it backwards on a phone (the 09-16 fault). **The script records; the viewer computes.** Throttled to 1/s with a trailing write so a drift stopped mid-interval records where it stopped. |
| **Half-typed scripts are held back** | `viewer.js` | **BUILT** (`2d24488`). The renderer fills an unparseable value from a hardcoded default, so deleting a digit sent the figure to the DEFAULT instead of holding still. Fixed in BD, not the renderer — the renderer cannot tell a cold script from a live edit, and BD knows the card is being typed in. |
| **Recording vs redrawing** | `viewer.js` | **BUILT after three attempts** (`27a48d6`, `fe874f5`). Recording is data and must never stop; redrawing is presentation and must never land under a live cursor. v1 blocked on focus and killed sync permanently after any edit; v2 wrote anyway and reset the caret on contentEditable. The lesson is in `project_script_source_of_truth.md`. |
| **Eight follow-up fixes from testing** | `viewer.js`, `AV/` | **BUILT** (`b8fdd6d`, `a5d201c`, `d23f9c4`, `45f34c1`, `2cb6e2f`, `c10a867`, `0a02fab`, `6e10627`). Four were "the wrong thing treated as the truth": av_hello answered with the module; **`avLastPushed` had TWO WRITERS** so fixing the reader achieved nothing; re-ticking `auto` ran the wrong way; the viewer was gated on `auto` (it must not be — that box governs card↔module ONLY). Four were timing, ending in the drift clock. |
| **Drift clock rate bias** | `V_Kolam/visual_module.html` | **BUILT** (`0a02fab`). The next tick was scheduled AFTER the render, so the period was `render time + interval` — a SYSTEMATIC bias. A bigger canvas ticks slower for ever, so BD and a viewer ran at different RATES. Measured: 11,321 vs 9,837 ticks over 20 min at 6ms/22ms render. Now scheduled from when the tick was DUE: 12,000 and 12,000. No feedback loop needed once the systematic error is gone. |
| **iOS testing of the script migration** | — | **PENDING.** The angle/viewer division and the hand-back are verified on desktop only. Timing issues are reported resolved on desktop as of 09-18. |

## Added 2026-09-17

| item | where | note |
|---|---|---|
| **Down button fixed** | `viewer.js` | **BUILT** (`b8f0b6e`). `getCardText` flattened a BUILT card with `textContent`, welding the tap-hint onto `%%bd_]` so the score block never closed and the renderer threw for want of an axiom. `readChunkBody` is the inverse and already existed. Sv's September lesson repeating. |
| **The renderer forwards its console** | `V_Kolam/`, `viewer.js` | **BUILT** (`2f64c03`). It was in an iframe and reached nobody; `render()` swallows its own exceptions. Now `[module] …` in the server log. Needed `bd_module_log` in the wrapper's `RELAY_UP` — the same whitelist trap as `bd_av_state`. |
| **Angle is a full turn, angle_minutes is a stepper** | `V_Kolam/visual_module.html` | **BUILT** (`bad75d4`, `cd86dae`). Three disagreeing definitions of the range meant drift walked 270 degrees all drawn as 90. One definition now, 0..359 wrapping, stepper wraps too. Low angles with `angle_minutes` are the interesting region, not a dead spot. |
| **Way-back button opens the node** | `viewer.js`, `AV/` | **BUILT** (`691e080`, `47481c8`, `511c237`, `5902c6a`). It only raised the window — indistinguishable from nothing on a desktop. Now `av_return` (no destination) → `openNodeAsTap` → card + Player. `armFreshOpen` clears `readingState` + `lastAutoPlayerNodeId`, **on the request, never on Player exit**. |
| **The viewer hands state over on the way back** | `server.js`, `AV/` | **BUILT + VERIFIED ON iOS** (`4b48caf`). On a phone the button closes the viewer, so asking later cannot work. `av_return` may carry a script and never a destination; BD seeds the cache before opening so the node opens already correct. |

## Added 2026-09-16

| item | where | note |
|---|---|---|
| **An exploration survives wandering off** | `viewer.js` | **BUILT** (`5a4f0aa`). `loadModuleForNode` posted the node's SAVED text to the module and pushed it to any viewer, so walking away and returning destroyed the explored steppers in both places — on desktop too, where BD was never suspended and had the state all along. Now cached per node, in memory only, and **VALUES merged onto the saved text**: the node supplies the score block and structure, and a directive is restored only if the node already has it. The card is untouched, so Down still loads what the author wrote. |
| **One viewer per module TYPE** | `server.js`, `viewer.js` | **BUILT + PROVEN** (`383194d`). `av_push` fanned out to every module socket the user had open and the token carried no type — a second viewer of another kind would have been handed an L-system score to play. Token now carries the type, handshake stamps it, delivery filters on it, **server-side** so a third-party author need not implement "ignore what is not mine". Grants BD no new reach — still scoped to `moduleFor`. Verified with two viewers of different types on one session. `avWindow` is now a registry keyed by module id. |
| **The viewer answers when asked** | `server.js`, `viewer.js`, `AV/` | **BUILT + PROVEN** (`afbaf5e`). The one thing a viewer knows that BD cannot: while you look at the viewer, BD is a background tab and is throttled or suspended, so the viewer's drift is the only record. BD asks on return to the foreground; the answer is merged values-only. Module allowlist gains its **second** entry (`av_state_report`, solicited only) — a viewer still cannot push, address anything, or reach a corpus handler, verified while holding a valid curation code. Guards: 1.2s expiry, node-id verification via the `?n=` handed at launch, and no adoption unless the module still shows that node. |
| **A viewer page for ABC / Fractal** | `AV/` | **NOT BUILT — the blocker on the type rule being visible.** Only `/AV/kolam.html` exists, so a different module type reports "no viewer page yet" and falls back to the standalone. The second window becomes real when these are written. |
| **QR code for a cross-device viewer** | `AV/README.md` | Still not built; design unchanged and still entirely BD-side. |
| **Background-rate probe** | `viewer.js` | **BUILT** (`c92eec9`), not yet read. Logs one line on return to visible: how many of BD's own 1s timers fired against wall clock, and how many frames the renderer managed. Inference from the old symptom was ~0.2 ticks/s, about 2% of foreground — near-total suspension in bursts, not a steady slow tick. |

## Added 2026-09-15

| item | where | note |
|---|---|---|
| **Curation code required on every corpus write** | `server.js`, `viewer.js` | **BUILT + PROVEN 2026-09-15** (`dd6368d`). `edit_save`, `edit_delete` and `edit_clone_cluster` checked only that a code was CONFIGURED, then wrote — reachable by any origin under `cors: '*'`. An anonymous socket from `https://evil.example` got ACCEPTED before, `bad_code` after; the same probe was run against the pre-fix server so the pass is not vacuous. `curationCodeOk()` is now the ONE check. **`socket.data.userId` is not authorisation** — every socket gets one. A module socket may send only `av_hello`, verified even with the correct code in hand. |
| **Curation UI end-to-end test** | — | **PENDING — the one thing not verified.** The gate was proven over a socket, but Sv / Wr / the cluster editor have NOT been clicked in a browser since the change. The client now sends `code` on three emits it never sent one on. If curation appears dead, this is the first place to look: a rejection now shows in `#dev-status` as "code rejected — re-enter it" rather than failing silently. |
| **QR code for a cross-device viewer** | `AV/README.md` | **NOT BUILT. Design settled, and it is entirely BD-side.** Only BD can mint a token; an AV only consumes one and already accepts any token in `?t=`. So BD renders the token as a QR instead of opening a local window, and a camera makes the other device the viewer. The protocol needs NOTHING — `moduleFor` is a userId, not a device. Needs: a second action beside View (which must NOT `window.open`), and a QR renderer. Mint on the press — a pre-rendered QR is a dead QR. |
| **`V_Kolam/preview.html` has drifted from the live renderer** | `V_Kolam/` | **OPEN DECISION, raised twice.** The standalone's own stepper table still shows the colour EXPONENT where BD now shows the directive's value, and still caps `step` at 200 where BD allows 999 — so a shared link carrying `step 400` renders differently from the one that was sent. Both are two-line fixes. Held because standalones are frozen and unfreezing one is the author's call. |
| **View replaces Jump; the update dialog is off that path** | `viewer.js`, `index.html` | **BUILT 2026-09-15** (`b6f603e`). The dialog asked whether to sync the module into the card before baking a URL; the AV never reads the card, so the question had no consequence. Removing it made the handler synchronous to `window.open`, which is what Safari requires — the click is now the gesture. `Copy external url` is RETIRED, NOT DELETED (`hidden`, handler wired). |
| **Kolam `step` ceiling 200 → 999** | `V_Kolam/visual_module.html` | **BUILT 2026-09-15** (`c90ee30`). Raising the number alone would not have delivered it: at one step per 60ms tick the new range took 60s to cross. Hold-repeat now scales with the range — any control crosses in ~2.5s — so small ranges are unchanged by construction, not by exception. |
| **The media modules have NO canary host** | `style.css` | **OPEN.** `style.css` claims the role moved to `music_module.html`'s play button; it is not there, in any module. BD's `#copy-link-btn` is doing double duty — it reports both BD chrome changes and renderer changes, and cannot distinguish them. A canary on the Kolam stepper panel would separate them and would show in the AV too. |

## Added 2026-09-14 — direction change

| item | where | note |
|---|---|---|
| **Socket.IO CORS** | `server.js` | **BUILT 2026-09-14** (`5dae4f4`) as an allowlist, then **widened to `origin: '*'` by the author** so a third party can host a module anywhere without asking us first. That is deliberate. It is also why the write handlers had to be gated properly — see 2026-09-15 below. |
| **LD / SD / UD data modes** | `module_data_modes.md` | **Design, partly built.** LD needs MST minting + MDP over the socket (not built). SD needs a publish step (not built). UD is built — that is JSP. |
| **Ancillary Viewer (AV)** | `AV/README.md` | **BUILT 2026-09-14** (`4b1106c`): MST tokens, `av_push` relay, client shim, Kolam reference viewer, Jump repurposed as launcher. Verified end to end. Terminology settled: **AV**, superseding the earlier **AT**. |
| ~~Ancillary tabs (AT) replace standalones for new work~~ | `external_collage_viewer.md` | **DECIDED 2026-09-14.** A second tab served by BD, for presentation: near-full screen, collage, minimal chrome. Same origin, so `BroadcastChannel` carries an arrangement with **no size limit** — no encoding, no wire table, no deploy lag. |
| **Standalones FROZEN, not retired** | — | `bd_V_Kolam`, `bd_M_ABC`, `bd_M_Fractal` stay deployed and working; still useful to an experimenter and still a good way to send one node. No new features. **Finish Fractal and ABC first** so all three are left coherent. |
| AT controls | `external_collage_viewer.md` | **The open question.** Presentation is the job, so "few" — which few is undecided. Keep the AT (for the BD user) distinct from the external viewer (for a stranger). |

## Added 2026-09-13

| item | where | note |
|---|---|---|
| **External collage viewer** | `external_collage_viewer.md` | **Mulling, nothing decided.** A public viewer opened by URL, showing a collage of saved-node material; superficial controls, no saving; content from the BD database via the server. **Inverts the model**: BD designs the experience, externals are viewers — today's standalones are editors. Open question the author is holding: what does it give that BD does not? |
| `?n=<uuid>` for BD self-links | `external_collage_viewer.md` | Deferred pending the button/context table. When the panel text equals the node's stored text the id alone suffices — measured 999 → 72 chars. BD→BD only; a standalone has no corpus to resolve against. |

## Verified still open (2026-09-12)

Re-checked against code and the live DB rather than carried forward on trust:

| item | evidence |
|---|---|
| Delete stale BARE layout hints | **166 edges** still carry `hint_x` — unchanged since 08-23. |
| Drop `raw_text` duplication | No references in `server.js` or `viewer.js`; the duplication is DB-side only, so this is a migration, not a code change. |
| Desktop docking for media modules | `positionExtendPanel` still early-returns above 1024px. |
