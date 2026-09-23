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

## 3. Modes: three become two

| now | becomes |
|---|---|
| Nodes | **Read** |
| Player + Edit | **Create** |

**Fewer mode boundaries is a correctness argument, not just a tidiness one.**
2026-09-22's card-overwrite bug existed precisely because leaving Player *hid*
the module without unloading it and the echo did not know which mode it was in.
Every boundary is a place for that class of fault.

**Open question — what occupies the screen in Create?** Player shows the iframe
and hides `cy`; Edit does the reverse. Create needs the module visible *and*
the history panel reachable (Merge is a click in history). On a phone that is
tight. This needs a layout answer before it needs code, or the sub-toggle that
appears will be a third mode wearing a disguise.

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

### Still open at this stage

- **Memgraph node scripts are unmarked.** RULE 2 means nothing is broken by
  that, and marking them is a data change wanting a backup and a deliberate
  pass. Not done as a side effect.
- **A typo fails silently.** `%%bd_psymmetry` — the underscore missed — parses
  as a directive named `psymmetry`, and the real one falls back to its default.
  Seen in the log during testing, since every keystroke is pushed to the
  module. Worth a warning eventually.
- Fractal and ABC are untouched, by decision: finish Kolam and the nodes first.

---

## 6. What was checked, not assumed, while writing this

- Auto-population already exists — `visual_module.html:331`.
- Content/parameter is already structural — `music_module.html:776`,
  `visual_module.html:597`.
- The directive parser is `/^%%bd_([A-Za-z_]+)[ \t]+(.*)$/` (`viewer.js:380`),
  so `p_symmetry` parses as a *different directive* unless stripped.
- The write-back path builds `%%bd_${name}` from the stripped name —
  `visual_module.html:713`. This is RULE 1.
