# Session notes — 2026-08-24 → 25

Explore sessions designed and built to slice C; the `{?}` button found and
fixed; gateway text stripped of appraisal; the mark colour scheme settled.

Canary ended **green** at `viewer.js?v=640`, `style.css?v=321`.

---

## 1. Explore sessions — designed, then built

Spec at `editing_spec.md`, memory at `explore-sessions`. Two paired users agree
they are working on one node, then wander the graph gathering material while
staying anchored to it.

**Design decisions that took the discussion** (all in the spec):

- Green is the existing marker **recoloured**, not a copy of the node — a
  duplicate would need its own id, which is the bug class the stable-id work
  removed.
- **One** green ring, not two. Two rings mean "two marks that coincide"; one
  means "a shared commitment".
- **Leave is unilateral**, framed as leaving your own participation. Your mark
  goes, your partner's **dims**. Propose-to-end was rejected: it sounds
  courteous and traps you when the partner's tab has been discarded.
- **Exploratory consent is NOT save consent.** The user identified this as a
  labelling problem, and it is — the vocabularies are kept apart so nobody
  presses Save from muscle memory built on Explore.

**Built:** slices A (button + trigger), B (protocol), C (green mark).
**Not built:** the acceptance dialog, and what happens across a reconnect.

**Three bugs in testing, all the same shape — something ran afterwards:**
`retireBlueNode` destroying the green anchor when the partner moved off the
node; a parked Blue Node sitting in the corner the new one was about to use;
and the marks losing their corner because the layout ran after the parking.
That last is now handled on `cy`'s `layoutstop`.

**Marks now always park at their corners.** The user found them wandering
"overwhelming", and they were: a mark was only parked when its node was *not*
in the view. One exception — a mark on the node you are standing on stays
central.

---

## 2. The `{?}` button — three exchanges I cost by looking in the wrong file

Reported as not working. It is `sr-wrap-btn` in BD's **own action bar**,
labelled `{?}`, immediately left of `{?✓}`. The `sr-` prefix sent me into
`sr_editor.html` and then a separate `bd_SR_Editor` repo, and I twice reported
that no such button existed while the user was looking straight at it. Their
description — "to the left of the accept {?tick}, right of the speech record
stuff" — was exact.

**The actual fault:** it enables only when a caret snapshot holds a
non-collapsed selection, and that snapshot updated on
`focusin/input/keyup/mouseup/focusout`. **Selecting text by long-press on iOS
fires none of them.** So it stayed `disabled`, and a disabled button does not
emit `click` either — dead with no feedback.

Fixed with `selectionchange` (the only event that fires for every way a
selection can be made, including the iOS handles being dragged afterwards) plus
`touchend`, and `preventDefault` on the button's pointerdown so pressing it
cannot collapse the selection.

Then **generalised**: it only ever saw `<textarea>` in `#current-stack`, which
is the top Local card. Every other card body is a `contenteditable` div and
History is editable too, so most of the editor could not be marked. Now handles
both kinds in both stacks.

A `Mark {?…}` button added to the SR editor during the confusion was **reverted**
from both repos — `{?}` is BD editor vocabulary for signalling "tentative" to a
partner, not a transcription feature.

---

## 3. Gateway text

Six gateways rewritten to attribution, dates, translator/version and
public-domain status. The appraisal is gone — "maps of the inner life", "the
great democratic voice of the nineteenth century", and Hardy's 300-word
appreciation.

Facts kept where they are facts: that Hardy's 1912–13 poems followed Emma's
death is biography; that they are "unguarded reckonings with loss" is a verdict.

Two claims made more careful in passing: Du Fu now states that the ORIGINALS
are public domain while the translations were made for this project, and Tao Te
Ching states public domain at all, which it never did.

Applied via `bd_tool write`, so a full DB dump went into `backups/` first. Patch
kept as `gateway_text_factual.md`.

---

## 4. The mark colours — settled after several rounds

Ended at: **local `#8d7900`** (breadcrumb strip, local card head AND selection
ring — one colour), remote blue `#4a9bff`, agreed green `#3ddc84`.
`MARK_WHITE` renamed **`MARK_LOCAL`**.

**The finding worth keeping** (full table in the `mark-palette` memory): the
breadcrumb chips span the whole luminance range, so **no MID gold can serve as
the strip**. Halving the brightness makes it *worse*, not better — the
midpoints are the worst places available, and `#8d7900` puts 7 of 10 chips
under 1.5:1.

The user shipped it anyway with the numbers in view, judging the family reading
as one colour more important than chip separation. That is a legitimate call —
contrast ratios describe a risk, not a verdict.

**If chips do disappear, do not darken the strip again.** A hairline border on
`.breadcrumb-chip` frees the strip colour entirely instead of trading against
it.

**Then finished on the 25th** (`fdfe7de`, `bead3c9`). The reading-spine arrow
and successor were an unrelated `#e0a020`; they are part of the same signal as
the selection ring, so the arrow now IS `MARK_LOCAL` and the successor is 25%
dimmer with hue preserved exactly. `MARK_LOCAL` moved to module scope —
`buildStyle` could not see it, which is how a second literal came to exist.

And the agreed green is now **derived** rather than picked: `#1bbb40`, hue 134°,
midway between local gold (51°) and remote navy (216°). **Mixing the two
literally does not work** — averaging or adding lands on olive at 68-69°, barely
17° from the gold; additive yellow + blue gives grey-olive on a screen. Only the
hue midpoint is green. Candidates live at `colour_options.html` as rings on a
node against the real canvas, because a flat swatch says nothing about how a
thin ring reads.

**Method note:** computing contrast took seconds and twice reversed the
intuitive answer. Uniform RGB scaling preserves hue exactly, so "same colour,
less bright" is arithmetic — but perceived hue genuinely shifts with lightness,
so the eye disagreeing with the arithmetic is not a mistake.

---

## 5. Breadcrumb bar — five fixes, all late on the 25th

`393c047` · `2ad387e` · `005707a` · `cd0b5a7` · `5c5698d`

**Chips now carry a 1px black hairline** (`border-position: outside`, so it does
not eat a 63×18 interior whose labels already clip). That dissolves the
constraint behind the whole colour argument: chip colours span the luminance
range, so the STRIP was having to carry all the separation, which forced it
darker than every chip and stopped it matching the selection ring. **The strip
colour is now free.** `.breadcrumb-chip.latest` restates white, since it sits
after the general rule and would otherwise have lost its marker.

**Chips fell off the bar when zoomed.** They sit at model `y = 11`, commented
"centre of 23px bar" — true at zoom 1 and only at zoom 1, since screen y is
`model_y × zoom + pan_y` and `pan_y` was hardcoded to 0. At zoom 3 they render
at 33px, off a 23px bar. `pan_y` is now `h/2 − 11 × zoom`, with `h` read from
the container rather than assumed.

**Then they vanished entirely after a zoom — my own fix, half-done.** The zoom
handler corrected only the vertical and left the horizontal wherever the pinch
had put it, so the trail slid out sideways with nothing to bring it back. It now
re-anchors the whole trail. *Fixing half a pan was worse than fixing none.*

**Long labels mangled — two builders, one truncating.** The live builder
truncates to 13 chars; `addYouChipFromData`, which rebuilds the trail from cache
at boot, rendered the stored name in full. So a fresh crumb was fine and the same
crumb after a reload was not — which is why the report came with "not sure if it
happened before".

**And the real cause of the missing letters: an embedded NEWLINE.** Cluster
`display_name` is genuinely two-line — `"Loss\nLonging"`, `"Garden\nWild"` —
which suits the main graph and cannot render in an 18px chip. It also **defeated
the length check**: `"Loss\nLonging"` is 12 characters, under the 13 limit, so
truncation returned it untouched. *The truncation looked like it was working
precisely because it did nothing.* Whitespace is now collapsed BEFORE measuring —
order is the whole fix.

A left-edge fade was added to `#cy-you` while chasing the wrong cause (a
right-aligned trail clipping its leftmost chip). It is defensible on its own —
a faded word reads as "continues" — but it was aimed at a symptom that turned
out to have a different explanation, and could be removed.

---

## 6. Live resize on desktop

`d76575e` · `242fbc6`

**`#cy` had no resize handler at all.** Only the two breadcrumb bars and the
media player listened, so dragging a desktop window left the graph at its old
dimensions and framing until the next navigation.

Four steps, and the order is the whole thing:

    positionCyEl()   re-place the element
    cy.resize()      cytoscape re-reads its container
    cy.fit(...)      re-frame to what is visible
    reassertMarks()  re-park the Blue and Green marks
    refitBars()      re-sync both breadcrumb bars

**The last two are not optional.** The marks park at corners derived from
`cy.extent()`, and the fit is precisely what changes it — omitting the re-park
is *worse* than doing nothing, because a correctly-framed canvas with two marks
adrift reads as a fresh bug where a wholly stale view reads as stale. A plain
`cy.fit` emits no `layoutstop`, so the re-park that normally follows a layout
never fires.

The bars then went blank, and **they were not the fault**: both already had
resize listeners and both already called `resize()`. Their listeners fire
immediately while this one is debounced 120ms, so they corrected against the
OLD pane geometry and were invalidated by `positionCyEl` afterwards.

*Whatever runs last decides.* Anything position-dependent has to run after
everything that moves things — the third time that shape appeared today.

**Not done, deliberately:** the cluster layout picks column counts from the
canvas, so after a big resize the shape is stale rather than wrong. Re-running
it would rearrange the graph under the user's hands mid-drag; it belongs on
resize-END if it proves annoying.

---

## Open at end of session

| item | note |
|---|---|
| Explore: acceptance dialog | Spec §8, wording to settle at build time. |
| Explore: reconnect behaviour | Spec §10 — does a session survive the 65s grace period? |
| Draft persistence | Brief `CC.7`. Now more pressing: a ceremony promises shared work, and a backgrounded iOS tab loses it. |
| The write gate | Generic query channel still runs arbitrary Cypher — agreement is witnessed, not enforced. |
| Card-head text | White on `#8d7900` is 4.3:1, marginally under the 4.5 for body text. |
| Blue Node ring seam | Colour problem, not geometry. |
| Strip colour now unconstrained | The chip hairline freed it — the contrast table no longer applies. |
| `#cy-you` left-edge fade | Added while chasing the wrong cause; defensible alone, but removable. |
