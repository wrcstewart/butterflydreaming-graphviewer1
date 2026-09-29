# Collage plan — started 2026-09-22

Two phases of work, agreed in discussion:

1. **text_media and UX alteration** — text nodes become module scripts, the
   three radio modes become two, controls auto-populate, scripts merge, and a
   collage module binds them.
2. **Shared editing** — collaboration and saving, *after* the data structure is
   settled.

The sequencing is deliberate and it is the right way round: **the merge
semantics ARE the data structure.** Steppers and modes are presentation and can
be revised cheaply. A script format that has reached the corpus cannot.

---

## 1. `_p_` — marking a directive that carries a user control

`%%bd_p_symmetry 8` means "symmetry, and give it a control". The parser strips
`_p_` and proceeds; the directive's meaning is unchanged. Only the part after
`_p_` appears in the control's label, truncated if it must be.

### Why this form, and not a declaration line

A `%%bd_ui symmetry, angle, stroke` line was proposed and rejected **on
length**, which is the constraint that actually binds here. For eight controls:

| | cost |
|---|---|
| `_p_` on eight directives | **24 chars** |
| a `%%bd_ui` line naming eight | ~70 chars, and it repeats every name |

`DeepLinking.md` measured the ceiling: **659 characters** for plain text
scanned by Apple's data detector, and a real link is already ~650. Three
characters per control is affordable; seventy is not. The `%%bd_ui` form would
also have needed its own namespacing rules once two modules both carry
`opacity`.

### Why namespacing is not a problem

**Scripts always read between a module header and its closing, presented
sequentially.** The block is the namespace: `opacity` inside the Kolam block is
Kolam's. No qualified names, no scoping rules, no language design — which was
the explicit design goal and is worth holding to.

### What it is NOT

**`_p_` does not mean "this is a parameter".** A directive whose control is
hidden must still be read and applied — the whole point is to reduce the number
of controls *while maintaining the script values*. So:

- **content vs parameter** stays where it already is: **structural**. Content
  lives in a bracket block (`%%bd_score [ … %%bd_]`); parameters are single
  lines. Both existing modules already obey this — `music_module.html:776`
  strips every single-line `%%bd_` directive to recover plain `.abc`, and the
  Kolam axiom and rules live inside `%%bd_score`.
- **`_p_` means "expose a control"**, and nothing else.

---

## 2. Rules the implementation must follow

### RULE 1 — the writer must reconstruct the form it read

**This is the first bug this feature will have, and it exists today.**
`setDirectiveValue()` (`V_Kolam/visual_module.html:713`) rebuilds the line from
the *stripped* name:

```
script has:   %%bd_p_symmetry 8
parse gives:  name = "symmetry"
write builds: %%bd_symmetry        ← does not match, `replaced` stays false
result:       a SECOND line is inserted before %%bd_score [
```

One press of a stepper would leave `%%bd_p_symmetry 8` *and* `%%bd_symmetry 9`
in the same script: duplicated directive, stale marker, and a control that may
read either. **The parse must carry the marker with the directive, and every
write path must put it back.** Same class of fault as the `Sv` round-trip —
*a renderer needs its inverse beside it*.

### RULE 2 — a script with no `_p_` anywhere keeps the current behaviour

Auto-population is **not new**: `visual_module.html:331` already gives *every
numeric-arg `%%bd_` directive* a stepper, labelled by the name after `%%bd_`.

So make the rule self-describing and skip the migration entirely:

- **any `_p_` present** → explicit marking; only marked directives get controls.
- **none present** → legacy script; fall back to "numeric ⇒ stepper".

Every saved node, every shared link and every frozen standalone script then
keeps working untouched, and new content opts in by being written that way.
No corpus migration, no format version flag needed for this step.

### RULE 3 — two-phase deploy, receivers first

**Old consumers do not strip `_p_`.** The frozen standalones, the BDX copy on
GitHub Pages and any third-party module would read `%%bd_p_symmetry` as a
directive named `p_symmetry`, miss it, and render at defaults — **silently**,
which is this project's recurring failure mode.

`DeepLinking.md` already states the procedure and it applies unchanged: ship
the **receivers** first as a no-op, poll the live URLs until every one serves
the new code, and only then let anything emit `_p_`. Reverse order breaks every
existing link.

Note `bd_relay.js` is byte-identical between BD and the demo and
`renderer.html` is a tracked copy refreshed by `sync_from_bd.sh`, so the
renderer change propagates to BDX in one step — but GitHub Pages deploys on its
own schedule, which is exactly what the two-phase rule is for.

### RULE 3a — the frozen standalones are OUT (decided 2026-09-22)

`V_Kolam/preview.html` parses directives itself and has already diverged four
ways from the live renderer. It will **not** be taught to strip `_p_`.

The consequence, stated so it is not discovered: **a `_p_` script opened in a
standalone loses its parameters and renders at defaults.** Frozen does not have
to mean maintained, but it does have to mean decided — and the decision is that
new scripts are not for the standalones. The same applies to any third-party
module built against the old convention.

### RULE 4 — truncated labels can collide

The label is the name after `_p_`, truncated to fit. Two directives sharing a
prefix — `colour_speed` and `colour_scale` — truncate to the same string and
become indistinguishable. Accepted for now; worth remembering when it happens,
because it will look like a rendering bug rather than a naming one. The
`colour_speed` readout was fixed once already by showing the directive's own
*value* rather than a mangled name.

---

### RULE 4a — a new module ships as a receiver from day one (2026-09-27)

RULE 3's two-phase order — receivers before writers — is about *migrating* a
module that already exists. A module written after the rules simply obeys them
on its first commit, and `bd_V_Kolam3D` does: mark-blind parser, RULE-1 writer,
RULE-2 fallback, RULE-7 announcement. There is no phase to sequence.

What that module adds to the picture is a case RULE 4 did not cover. Its labels
do NOT truncate — `.control-row label` has no `overflow`/`text-overflow`, so a
long name **wraps** — which makes the collision RULE 4 describes impossible
there rather than merely unlikely. 13 characters is the one-line limit (set by
`angle_minutes`); `cam_elevation` and `pitch_minutes` both fit inside it. So
RULE 4 is a property of the *stylesheet*, not of the naming scheme: a module
whose labels wrap is exempt, and grouping a family of controls by a shared
**prefix** (`cam_azimuth`, `cam_elevation`, `cam_distance`) is safe there and
would not have been under truncation.

One departure worth recording, because it is a decision and not an oversight:
`bd_V_Kolam3D` has **no control for `%%bd_weight`**. Core WebGL ignores line
width. The mark is a request for a control, and a module may decline it when it
cannot honour one — which is better than the alternative reading, that every
`_p_` obliges a knob and some knobs may do nothing.

That raised the next question, and RULE 9 is the answer to it.

---

### RULE 9 — a module's default script carries no directive it cannot act on (2026-09-27)

A directive a module cannot act on is **dead text in a card a person reads**.
The script is not a private config file; it is the thing shown, edited, copied
and collaged, so every line in it should be a line that does something.

`bd_V_Kolam3D_001` shipped two that did not:

- `%%bd_weight` — read, but applied to `material.linewidth`, which core WebGL
  ignores.
- `%%bd_stroke` — **not read at all**. The 3D renderer always takes its hue from
  the yaw; the flat module uses `stroke` to decide whether it does.

Both removed. Every directive left in that node is one the module acts on.

**What makes it safe rather than merely tidy** is that nothing is lost. Absent,
the flat module defaults `stroke` to `angle` and the 3D module defaults `weight`
to 1.5 — in both cases precisely the value the removed lines carried. Check that
before removing a line, because "the module ignores it" and "removing it changes
nothing" are not the same statement.

**And note what this rule is NOT.** It governs the DEFAULT script a module
ships. It does not license a module to strip a directive it does not understand
from a script that already has one — that is RULE 1's territory, and a figure
given a weight in the flat module must keep it on a trip through the 3D one. The
protection there comes from the 3D module never *rewriting* `weight`, which is
unchanged. The two are independent: what a module WRITES and what its default
script CARRIES are different decisions.

A useful consequence for the collage: if a directive is absent from every script
of a module, and that module neither reads nor writes it, it has left the
vocabulary for that module without anyone having to declare a retirement.

---

## 3. Modes: three become two

| now | becomes |
|---|---|
| Nodes | **Browse** |
| Player + Edit | **Create** |

**Fewer mode boundaries is a correctness argument, not just a tidiness one.**
2026-09-22's card-overwrite bug existed precisely because leaving Player *hid*
the module without unloading it and the echo did not know which mode it was in.
Every boundary is a place for that class of fault.

**Renamed 2026-09-29: Read becomes BROWSE.** Same thing; the author's word.

### Why this is being done, in the author's words (2026-09-29)

> *"that is the reason for doing this change — iteration towards a user
> comprehensible create a Collage structure"*

**Not tidiness. A prerequisite.** The collage has to be explicable to someone who
did not build it, and three modes — two of which differ only in whether two
buttons are visible — cannot be explained. Everything below is in service of
that, which is also the test for any later argument about it: does it make the
collage easier to describe?

### The open question, ANSWERED (2026-09-29)

It was: *what occupies the screen in Create? Player shows the iframe and hides
`cy`; Edit does the reverse.*

**The answer is that the question was the wrong shape.** Create does not choose a
layout — **the NODE does.** On a node carrying a module script the module shows;
on any other node the graph and the card show. The mode does not decide what is
on screen; it decides what TOOLS are on screen.

That is not a rename of the boundary, it removes it. **The module stops being a
mode you are IN and becomes a property of the node you are ON.** You never "leave
Player" — you navigate away from a module node. Which is exactly the fault this
section was written about: the 09-22 card overwrite happened because leaving
Player *hid* the module without unloading it and the echo did not know which mode
it was in. With no leaving, there is nothing to be wrong about.

**Revised after testing, the same day.** The first cut made mode and layout
fully independent, which reads well and left a hole: on a module node, pressing
Browse kept the module on screen, so **the radio stopped being the way back to
the graph that it has always been** and the only escape was `#back-btn` — step 3
arriving uninvited.

So: **Browse is the GRAPH, always.** Selecting it clears the module layout. And
**landing on a module node switches the MODE to Create**, not just the layout,
because until Browse can show a module *bare* (step 2), a module on screen means
the module's own steppers are on screen — and that is Create's surface. The
label is then honest now rather than after step 2.

The invariant that falls out, and it is checkable: **`browse` + module layout is
unreachable by any route.** Verified against every alias and every path.

At step 2 this inverts. Browse gains the bare module, the radio stops being an
escape, and the back button becomes the way out — which is precisely why step 3
is scheduled after step 2 and not before.

### What that forces, and it cannot be deferred

`setViewMode` today reads, in its own comment: *"'nodes' or 'edit' — both keep cy
visible + hide iframe"*, while `player` hides `cy` and shows the iframe. **The two
modes being merged are the two with opposite layouts**, and `player-active` and
`edit-active` are mutually exclusive by construction.

So a straight rename would REGRESS: on a module node, Create would give the
player layout and no editing furniture, and the Edit radio is today the only way
to reach the compose controls for such a node.

**Therefore `edit-active` must become orthogonal to `player-active`.** Create sets
the furniture whichever layout the node has chosen. That is a small change — the
player branch stops clearing `edit-active` — and it is the right long-term shape
regardless.

*The one thing that cannot be checked without eyes:* **both classes set at once
is a new state.** How the compose controls sit over the module layout needs
looking at. If it is wrong, one line suppresses them there and the hole waits for
the back button instead.

### The order, agreed 2026-09-29

1. **Radio 3 → 2**, with the layout chosen by the node and `edit-active`
   orthogonal. *(This step.)*
2. **Browse is TEXT; Create is media.** *(BUILT 2026-09-29 — and it went a
   different way than planned, for a better reason.)*

   The plan was for Browse to play the module *bare*. The author's argument
   against: **Browse eventually shows a COLLAGE, not one work**, and a module
   inline competes for the room that collage needs. The earlier options all
   quietly assumed Browse displays one node at a time, and that assumption
   expires. So Browse does not raise the module at all — it stays text and
   offers **View**, which reaches the work through the viewer that already
   exists, on this screen or another.

   And a second argument from the author, which is the one to keep: it **keeps
   BD itself pure text in Browse**, which is worth more for comprehensibility
   than immediacy is.

   **The rule that came out of it is bigger than module nodes.** Browse shows
   the node's PROSE — everything outside the `%%bd_` directives — for EVERY
   node. Create shows the whole script. So "BD is pure text in Browse" is true
   by construction rather than by special-casing modules.

   Chosen over GENERATING a description from the script: authored prose says
   what a piece IS rather than enumerating its parameters, and it needs no
   describer kept in step with the directives — which would have been a second
   vocabulary for the same facts. A node that is nothing but directives falls
   back to its **name**.

   **This largely dissolves §4.** It stops mattering where a directive lives,
   because Browse never shows one. What remains of that section is a different
   question — whether a text node's *content* should feed a module — and it is
   no longer entangled with this one.

   **THE STRIP HAS NO INVERSE, and that is the danger.** You cannot rebuild
   `%%bd_score` from prose, so anything writing a Browse card back to a node
   destroys the script. That is the Sv bug exactly, and the Down button repeated
   it. `autoWrite`'s redraw was already guarded by `player-active`; **`Sv` now
   refuses outside Create**, because it is gated on the curation code and not on
   the mode, so a curator could have reached it. Any NEW writer must check.

   *Still to do:* the five module nodes are pure directives and now show only
   their name. Each wants a line of prose — a small task, and a good one, since
   it forces "what is this piece?", which is the question a collage is made of.

   *Provisional:* the View button is exposed wherever a module is in play, but
   it is still positioned for the player layout's right-hand band, so in Browse
   it sits over the graph's edge. Agreed home is the Local/Remote row — that row
   becomes **where things go**: Local is me, Remote is them, View is another
   screen. Done once it can be seen rather than guessed.
3. **`Local` as a back button**, labelled `Local:Browse` / `Local:Create` so both
   ends know the mode. Deferred deliberately, and it now has one clean job:
   **reaching the graph while on a module node in Create.** A nameable missing
   action rather than a vague gap. *(Step 2 did not create the escape hole after
   all — Browse still clears the module layout, so the radio remains a way out.
   This is now a convenience rather than a necessity.)*

   **On the labels: SHOW the mode, do not SYNC it.** The question arose whether
   local and remote must both be in Create. They must not — the asymmetric case
   is the valuable one: **facilitator in Create, participant in Browse**, one
   making and adjusting while the other receives the work without the furniture.
   That is the same shape as the dimming dial in
   `ThreeJS_and_VR_2026-09-28.md` §8d: depth of involvement as a dial, not a
   switch. And what actually needs protecting is protected elsewhere — writing
   to the graph needs partner agreement by the consent model. Mode is not the
   gate; agreement is. The label is a cheaper answer than negotiation.

**Still open after all three**, and it is this section's original worry: Create
needs the module visible *and* the history panel reachable, because Merge is a
click in history. On a phone that is tight. The back button answers "how do I
leave", not "how do I reach history while making". **If a sub-toggle appears to
solve that, it is the third mode returning in disguise.**

**Not to be done:** making the curation code the mode switch. The code already
separates `editModeUnlocked` (you proved the code — a capability) from
`editModeActive` (a mode), deliberately. Merging them would trap a curator in
Create, unable to browse without clearing their code. Create is the making
SURFACE; writing to the corpus stays gated server-side by `curationCodeOk()`.

---

## 4. Text nodes as module scripts

Text nodes become media-module scripts and may carry `%%bd_` directives.
Invisible in Read; in Create the panel shows the script — initially very simple,
perhaps just a module directive, a text block, and an opacity to test with.

### The risk that matters

**Read hides the directives. If anything writes back what Read shows, the
directives are gone** — and that is `Sv` at corpus scale: the rendered card was
round-tripped to the DB and destroyed `%%bd_center` markup. Two rules follow:

- **Read is a pure projection with no write path.**
- **`getCardText` must read the source, never the rendering.** This has already
  bitten once, when the tap-hint was welded onto `%%bd_]` and `score` stopped
  parsing.

### Do not migrate the corpus

**Treat the absence of `%%bd_module` as "this is text".** Thousands of existing
nodes are then already valid scripts, nothing needs converting, and Create adds
directives only when someone actually wants them.

---

> **2026-09-28 — a fork inside this section, opened elsewhere.** Visual modules
> now render through three.js by standing decision, which makes a second shape
> possible for a collage: ONE scene holding several objects, rather than several
> iframes side by side. That is the only version that means anything in a
> headset — but it would mean modules exporting geometry rather than pixels, and
> the iframe contract is what lets a stranger write a BD module at all. The
> comparison, the middle path, and what to measure first are in
> `ThreeJS_and_VR_2026-09-28.md` §7. **Choose before building this section.**

## 5. Merge, and the collage module

The workflow, in the author's words: *create using a single module, then recover
your creations or text-node work from the history and merge it into the top
panel — whereupon you can remove `_p_` directives if you wish, or edit an
optionally-included collage module that binds them.*

- **Merge** = a click on a script in the history panel + a **Merge** button.
- The merged script is the module blocks, **sequential**.
- Controls after a merge default to **all** of them; reducing is deleting `_p_`
  markers, which leaves the values in place.
- A **collage module** may be included by default, carrying its own directives
  for relative placement of the text, music and graphics it binds.

### Still to decide

- What the closing of a module block looks like, and whether a merged script
  needs a format version from the start. `DeepLinking.md`'s own conclusion —
  *version the format from day one, the exact lesson of the `name` field* — was
  written about a change far smaller than this one.
- Whether the collage module's placement directives are themselves `_p_`-marked
  (they are parameters, and would want controls).
- What happens to two identical module blocks in one merged script.

---

## PHASE 0 — DONE 2026-09-22

**Mark-blind matching, shipped before any script carries a mark.** This is
RULE 3 applied inside BD rather than only to deployed copies, and it is the
step the plan as first sketched would have skipped.

The reason it goes first: `AV_ANGLE_LINES` (`viewer.js:427`) and its BDX twin
name the angle triple **literally**. Had a script gained `%%bd_p_angle` while
those still read `%%bd_angle`, they would have stopped matching, every drift
frame would have read as a human change, and all of it would have been pushed
to the viewer — last week's iOS smoothness work undone, with **no error to
notice**, only a warmer phone.

Changed, all of them behaviour-preserving while no mark exists:

| site | what it does | change |
|---|---|---|
| `viewer.js` `BD_DIRECTIVE_RE` | new shared parser | groups: mark, bare name, value |
| `viewer.js` `bdNameRe()` | new shared matcher | one named directive, marked or not |
| `mergeExploredValues` | merges a viewer's values onto saved text | keys by the BARE name; rebuilds with the SAVED line's own mark |
| `AV_ANGLE_LINES` | drift suppression | `(?:p_)?` |
| `avWithAngleFrom` | resync | takes the VALUE from source, keeps the FORM found here |
| `bdx.html` `ANGLE_LINES` | BDX drift suppression | `(?:p_)?` |

**Two rules fell out of writing it**, both about not letting a mark travel:

- An exploration carries **values**. Merging one in must not add or remove a
  control, so the saved line's own mark wins.
- A resync copies a **value**, not a line. Copying the whole matched line
  would carry the source's mark with it — a presentation change smuggled in by
  a value update.

Verified by extracting the real functions and running 12 cases: legacy scripts
behave exactly as before; marked scripts behave the same way; mixed marking
keeps each script's own form; an angle-only difference still compares equal
(and a real one still differs); and an exploration still cannot introduce a
directive the node does not have.

**Not done, and deliberately:** nothing emits a mark yet. Phase 1 is the
renderer (RULE 1), phase 2 is the first script that carries one.

---

## PHASES 1 AND 2 — DONE 2026-09-23, working

The renderer reads `%%bd_p_<name>`; the control column follows it; BDX's
default script carries marks and BD's saved nodes do not. Tested by hand: mark
one directive in a BD script and only that stepper appears, its value applies,
and pressing it updates the line **in place**.

**RULE 1 was already violated by existing code**, exactly where predicted —
`setDirectiveValue` built its line from the stripped name. Fixed and covered by
15 extracted-function tests, including five successive presses leaving one line
with its mark, and `p_angle` not being mistaken for `angle_minutes`.

### RULE 5 — an authored mark beats a saved one

Learned the hard way, having shipped it the other way round for a morning.

`loadModuleForNode` pushes `mergeExploredValues(savedText, explored)`.
`savedText` is whatever Memgraph last stored; the edit lives in `explored`. The
first rule said the **saved** mark wins — reasoning that an exploration carries
values and should not restyle the controls. True of a *viewer*, and wrong about
where authoring happens: **the script is the source of truth and it lives in
the card.** So a hand-edited mark was reverted on every merge and could not be
authored at all without first saving the node.

Two corollaries, both found by the same test:

- **The explored mark wins outright**, not `saved || explored` — with the
  fallback the wrong way round a saved mark would survive the user *removing*
  it, and removing a mark to shed a control is the point of the feature.
- **A mark change is a change.** The merge short-circuited on the value alone,
  so adding a `p_` without touching the number was skipped as nothing to do.

**The cost, recorded rather than buried:** a viewer's reported script can now
change which controls the host shows. It still cannot introduce a directive —
only lines already present are rewritten — so the blast radius is which
steppers appear, not what the script contains.

### RULE 6 — a hand on a stepper is a hand off the card

`autoWrite` refuses to redraw a card that has focus. Right for drift; wrong
after a deliberate control change, because the caret does not move on its own.
Edit a script, work the steppers, and the echo never returns — v1's failure
verbatim inside the v3 design meant to have retired it. `fromDrift:false` now
blurs the card and writes; drift still waits.

**BDX does not share this**, and the reason is worth keeping: its panel is a
`<textarea>`, so it can use the v2 approach — write anyway, restore the
selection — which a contentEditable card cannot.

### RULE 8 — a display alias is allowed, on two conditions

Noticed 2026-09-24: Fractal's `scale` stepper reads **`pent`** while the script
says **`min_pentatonic`**. That is a departure from "the readout shows the
directive's value", and it is a legitimate one — but only because both of these
hold, and they are the conditions to insist on anywhere else:

1. **The inverse is DERIVED, not written.** `ENUM_DISPLAY_INV` is built from
   `ENUM_DISPLAY` by `Object.fromEntries`, so the two cannot drift. `loop` broke
   the same morning precisely because its display (`'on'`) and its reader
   (`txt === 'on'`) were independent literals.
2. **No display token equals a real value.** Scales are `minor, major,
   min_pentatonic, blues`; the token is `pent`. A token colliding with a real
   name would shadow it silently.

**The distinction that makes it legitimate:** `pent` is an *abbreviation* of a
name still spelled out in the script, so the script remains the unambiguous
record. `off` against `false` was a *second vocabulary* for the same concept,
with nothing saying they were the same thing. Abbreviate, do not translate.

**Known consequence, accepted:** `SCALE_ALIASES` accepts `pentatonic` and
`minor_pentatonic`, but the write path always emits the canonical
`min_pentatonic` — so a script using an old name **rewrites itself on the first
stepper press**. Benign, and canonicalising is the more useful behaviour, but it
is a script editing itself and that matters more once scripts are shared and
collaged.

### Still open at this stage

- **Memgraph node scripts are unmarked.** RULE 2 means nothing is broken by
  that, and marking them is a data change wanting a backup and a deliberate
  pass. Not done as a side effect.
- **A typo fails silently.** `%%bd_psymmetry` — the underscore missed — parses
  as a directive named `psymmetry`, and the real one falls back to its default.
  Seen in the log during testing, since every keystroke is pushed to the
  module. Worth a warning eventually.
- **Fractal: DONE 2026-09-23.** `auto` works both ways; the module announces
  `bd_av_state` on a stepper press and forwards its console; its relay wrapper
  whitelists both. **Still unmarked** — it shows every control, which RULE 2
  makes correct rather than broken.
- **ABC: not started.** Its wrapper has neither `bd_av_state` nor
  `bd_module_log`, and the module announces neither. The same three edits as
  Fractal, then the `_p_` pass.

### RULE 7 — announce on a HUMAN action, never on a script push

Tried on Fractal 2026-09-23 and reverted within the hour. Announcing from the
`bd_script_update` handler loops: **the script is rebuilt from the steppers**,
so what comes back is never identical to what went in, BD's "the card already
equals the text" guard never fires, and the two ping-pong. Observed alternating
at 421 and 430 characters until the graph died.

It looks safe, and the commit that added it said so in as many words —
"bounded, not a loop" — which was a property asserted rather than checked
against how that module actually behaves. A stepper press cannot loop: a person
has to press something.

The cost of NOT announcing there is that `avLastState` keeps holding the
previous module's script. That is handled, and visibly: the module guard
declines and says which pair it refused.

---

## 6. What was checked, not assumed, while writing this

- Auto-population already exists — `visual_module.html:331`.
- Content/parameter is already structural — `music_module.html:776`,
  `visual_module.html:597`.
- The directive parser is `/^%%bd_([A-Za-z_]+)[ \t]+(.*)$/` (`viewer.js:380`),
  so `p_symmetry` parses as a *different directive* unless stripped.
- The write-back path builds `%%bd_${name}` from the stripped name —
  `visual_module.html:713`. This is RULE 1.
