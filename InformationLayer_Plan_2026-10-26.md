# The Information layer, and an `Arriving` node

**Status: PLAN, agreed 2026-10-26. Nothing built at the time of writing.**
Written before any change, at the author's request, so the justifications are on
record rather than reconstructed afterwards.

---

## What this is for

The author wants to rationalise the BD information site and let interested
parties reach **facts about the system** from inside BD, where existing nodes
can illustrate or broaden a description. Two things follow.

**A new entry point.** `Information` joins `Settling` as a door into BD. In the
author's words it is *"another entry point into BD along with Settling and from
Back button in View looked at externally"*, and *"it rather fuses left and right
brain cognition — but only if the user has entered via Information."*

**A tidy-up on the way in.** A new `Arriving` node sits between `Root` and
`Settling`, which also fixes an existing awkwardness: the development notice and
the speech offer currently fire on the first click on **Root**, so Root's own
text cannot be read until both dialogs are dismissed. Moving them to `Arriving`
makes Root readable immediately.

---

## It is a LAYER, not a subgraph — and that decided the design

The author's own correction, and it is the most consequential point here:

> *"when I talked of a subgraph I am not sure if that might be misleading — I
> will need edges out to other nodes e.g. text nodes so that the user can
> actively see what is being talked about."*

A subgraph implies a region entered and left by one door. This has **edges out
into the reading corpus** — and every such edge is also an edge *into* the
Information layer from a text node's point of view. So the risk the author named
— *"it might compromise the meditative experience of BD if users keep flitting
about for facts"* — does not live in the Information nodes. **It lives in the
edges.**

### The curation lever is the RELATION TYPE, not the node label

Measured in the code rather than assumed, because the first two theories about
it were wrong:

**Direction gives no protection.** BD uses cytoscape's `connectedEdges()`
almost everywhere, which is **undirected** — including `hasNavDescendants`
(`viewer.js:1560`). Only one site uses `outgoers()`. An `Information → TextNode`
edge is therefore just as visible from the text side as from the info side, and
"point the edges one way" buys nothing.

**But every traversal filters by TYPE.** `[type="CHILD"]`,
`[type="DESCENDS_FROM"]`, `[type="CONTAINS"]`, `[type="CLUSTER_REL"]`,
`[type="PART_OF"]`, `[type="CONTAINS_CLUSTER"]`. A relation type that no filter
names **matches nothing**, so it cannot enter a reading view at all.

**Protection therefore holds at two levels, by construction:**

1. no traversal selects an unnamed type, so the Information node never joins a
   text node's view; and
2. cytoscape draws an edge only when **both** endpoints are visible — so the
   line is not suppressed, it simply has nowhere to appear.

**And nothing is dropped on the way in**, which is the other half worth knowing:
the graph load is `MATCH (n)-[r]->(m)` — **untyped** — and `buildEdgeData` passes
`r.type` straight through, giving an unknown type a default grey. So a new
relation arrives in cytoscape as a first-class edge with no registration
anywhere. It exists, it is inert, and it becomes navigable the moment a
traversal names it.

**So: introduce a named relation (`ILLUSTRATES` is the working name) when the
first illustration edge is actually drawn, and name it only in the Information
view's own traversal.** One rule decides visibility for every such link, for
ever, and the decision is reversible without touching a node. Curating
individual edges by hand would mean re-taking that judgement on every link ever
added.

### The consequence to accept deliberately

An illustration link is **one-way in practice**. A reader who reaches a passage
*from* Information can read it; the same reader arriving at that passage later
through the reading spine sees no trace of the link — no "as discussed in…"
affordance. **That is the feature, not a gap:** the same passage is a plain
passage to a Settling reader and an illustration to an Information reader, so
nobody has facts pushed at them. The fusion the author describes is an
**entry-time choice**. A reverse affordance would undo that, so it should only
ever be added on purpose.

---

## The nodes

### `Arriving` — label `Entry`

| | |
|---|---|
| label | `Entry` |
| shape | **inverted triangle** — `shape: polygon` with `shape-polygon-points` |
| text | "Now choose Settling to begin the ButterflyDreaming. (Or choose Information to learn more about the system.)" — split into two sentences 2026-10-26, the second bracketed, so the wording carries the same hierarchy as the smaller node and the dotted edge |

**Why `Entry` and not a new label:** Entries are already styled individually by
name — `node[type="Entry"][name="Settling"]`, `[name="Gateways"]`,
`[name="Conversations"]` — so a distinct shape costs one rule and no new
machinery. A new node type fans out through several registries.

**Why an inverted triangle:** `Settling` is a `round-triangle`, apex up. An
inverted triangle makes `Arriving` its mirror, pointing down into it, so the two
read as a pair. Cytoscape has no built-in inverted triangle; `polygon` points
give it exactly.

**Why the text reads as instructions:** the dialogs fire on clicking Arriving, so
the card is obscured until they are dismissed. The author's point — any prose
there would be read *after* the dialogs, so it should be the instruction for
what to do next rather than anything to savour.

### `Information` — label `Entry`, shape `cut-rectangle`

**The author first asked for a new label `Info`. Measured, that costs six sites,
and most fail silently:**

| site | what breaks |
|---|---|
| `buildNodeData:4339` | label tests run in order; an unknown label falls through to `type: 'Unknown'`, colour `#555555` |
| `navigation:8702` | its text never gets a header, so the card renders wrong |
| chip lists `8481`, `9511`, `10528` | no breadcrumb chip — visiting leaves no trail |
| route-finding `6287` | excluded from the hub set, so routes treat it as a passage |
| **`server.js:2120`** | `allowed = ['Root','Entry','Family','Cluster']` — **its text could never be saved**, rejected as `invalid_label` |

That last is decisive: the node would not be editable through BD at all. This is
the project's own recorded pattern — *an enumerating matcher is an obligation* —
and a comment predicting the failure is not a mechanism preventing it.

**So `Entry` for now, and `Info` later if the layer earns it**, with all six
sites done at once and the server whitelist first. A stub needs no type of its
own; thirty nodes might. **And since the relation type carries the curation, the
label was never the design decision** — it only settles shape, chip and
editability.

**One thing `Entry` buys for free:** route-finding treats `root` and every
`Entry` as a **hub**, and excludes hubs as route *intermediates* — the comment at
`viewer.js:6287` says a route through one "says only *these are both in the
corpus*". So `Information` is automatically an **endpoint, never a corridor**,
which is exactly right for an entry point and would have been exactly wrong for
a `TextNode`.

**Why `cut-rectangle`:** taken shapes are `round-triangle` (Settling), `ellipse`
(Gateways), `octagon` (Conversations, section titles), `round-rectangle`
(Cluster, TextNode, edit chip), `diamond` (gateways). `cut-rectangle` reads as a
page with a clipped corner — *document* — is unused, and still reads that way
when the layer has thirty nodes. `tag` is the alternative if *label* is wanted
instead of *page*. Shape carries real identity load here, since state went
achromatic, and the author has reduced colour vision — so two triangles side by
side would have been a loss.

---

## The spine

```
BEFORE   Root ─CONTAINS→ Settling ─CONTAINS→ Conversations → …

AFTER    Root ─CONTAINS→ Arriving ─CONTAINS→ Settling ─CONTAINS→ Conversations → …
                              └───CONTAINS→ Information
```

`Root ─CONTAINS→ Settling` is **removed**. Keeping it would leave a bypass, so
`Arriving` would be optional — and the notices with it.

---

## The notices

`showDevNotice().then(showSpeechIntro)` fires from
`introWillShow = isRoot && isLast && !bootPriming && hasNavDescendants(node)`
(`viewer.js:8525`). The `isRoot` test becomes a test for `Arriving`.

**`rootIntroPending` retargets too.** It currently delivers Root's opening to a
visitor who arrived by a node URL and later pressed Local. Left pointing at Root,
such a visitor could read several nodes without ever being told this is a
development version.

---

## The way back, and why one step at a time is acceptable

`BREADCRUMB_BARS = false`, so the chip trail is **off** — `addYouChip` still runs
but only to publish a position to a partner. **So Local/Back is the only way
back, and it is strictly one step per press:** it pops a stack of saved *views*
(`history.push({ ids, parent, chipNode })`), retracing the exact route.

The author's reading, and it holds: *"that would permit further wandering before
return — that's not a bad thing maybe?"* The return path **is** the record of the
wander, and it cannot be skipped without re-walking what was read. For a system
whose claim is that nodes are starting points rather than a map, that is apt —
and it is a consequence of the existing design rather than something added here.

**If six-press returns become tiresome, the answer is the chip trail that is
already built and switched off**, not a new mechanism.

---

## Build order

1. **this plan, committed** ✔ — the author's instruction: write it up first
2. **a full DB backup** ✔ — `backups/memgraph_2026-10-26_113345.cypher`, 3,234
   statements, 792,792 bytes. `bd_tool cypher` does **not** auto-backup.
3. **the two nodes and the rewired spine** ✔ — verified by walking
   `(:Root)-[:CONTAINS*1..3]->(n)`:
   `ButterflyDreaming → Arriving → Settling → Conversations` and
   `ButterflyDreaming → Arriving → Information`, with Root back to exactly one
   child. Both nodes carry `colour`, `created_at`, `n_r`, `name`, `text`,
   `updated_at`, `url` — Settling's set apart from `created_at_estimated`,
   omitted on purpose because these timestamps are real rather than guessed at
   import. Urls: Arriving `…/n/3a82e24d-78e3-4b88-b478-646af9077e73`,
   Information `…/n/69217cc2-2bb8-4098-a8b2-4ec16c3dbba9`.
   
   The deleted `Root → Settling` edge carried **view-scoped layout hints**
   (`hint_x_<parentUuid>`, `hint_y_…`, `hint_scale_…`), so Settling's stored
   placement under Root is gone with it. Recoverable from the backup; not wanted,
   since Root now contains Arriving instead.
4. **the two style rules** ✔ — `shape: polygon` with points `-1 -1 1 -1 0 1`
   for Arriving, `cut-rectangle` for Information. Arriving's label needed
   `text-margin-y: -13`, the mirror of Settling's `+13`: at the vertical centre
   a triangle is half its width, so a centred word overhangs the slanted sides —
   and this triangle is wide at the TOP, so the label moves up where Settling's
   moves down. Information needs no such correction, a cut rectangle being full
   width at its centre.
5. **the notice move, and `rootIntroPending` with it** ✔ — `isArriving` matches
   on the NAME, since Arriving is an ordinary Entry. Three details that were not
   obvious from the plan:
   
   - **the gate takes `isRoot || isArriving`, not Arriving alone.** That block
     does two jobs — fire the dialogs and reveal the node's children — and Root
     still needs the second, or tapping Root leaves a card telling you to choose
     something that was never shown.
   - **the early `navigateInto` is now suppressed for Arriving too.** The card
     path navigates before the dialog block, so without this Arriving would open
     the graph and THEN show the notices, which is exactly what that block's own
     comment forbids: the dialog would compete with a layout animation. Root was
     already excluded for that reason.
   - **`rootIntroPending` retargets to Arriving**, or a visitor arriving by a
     `/n/<uuid>` link and pressing Local would reach Root, read its text, and
     never meet the development notice.

**BD loads node text at BOOT, so every DB step needs a reload to be seen.**

---

## Found in testing: once per session, not once per visit

The author, on first use: Arriving *"reissues the dialog"* when selected again
after visiting Information, or Settling.

**An intent that stopped fitting rather than an oversight.** The notices fired
on every fresh open, which was deliberate while they lived on **Root** — a place
you start from, visited once or twice — and `showSpeechIntro`'s own note defends
it: a refusal is *not* persisted, so the offer returns next time rather than
being lost for ever.

**Arriving is a junction.** Settling and Information both hang off it, so a
reader passes back through it repeatedly and "every visit" becomes nagging.

So `introShownThisSession` gates it: **once per session, nothing written to
storage.** That keeps the original principle — a refusal is still not remembered
across visits, and a new session asks again — while a single reader is asked
once. And the flag is set **before** the dialogs open, not in their `.then()`:
they are promises, so a second tap on Arriving while the first notice was still
on screen would otherwise stack a second pair behind it.

The structural diagnostic beside it was taught to stay quiet for this reason.
It exists to catch a node that is *wrong* — "if this ever prints again it is the
node that is wrong" — and having been shown already is not that, so it would
have cried wolf on every return to Arriving and stopped being read.

---

## Stage one of the meditation: the node exists, the directive does not

The author's design question — inline directive, module type, or collage —
answered by what the code already does:

**Not a module.** BD's speech lives in the HOST: Piper, `speak()`, the queue and
its gaps are all in `viewer.js`. A module is an iframe that would have to ask BD
to speak, inverting the relationship — and a new module costs four registries. A
meditation's substance is words and silence, which the host owns.

**Pause inline, not meditation-specific**, so any passage can breathe: a
Settling text, a gateway, a poem. Same cost, broader gain.

**Meditation as a collage**, because that is already the composition the author
described — words now, a graphic or music later, all three working together. And
one piece is better than hoped: a collage step ALREADY ends when the reading
ends (`viewer.js:16180` — *"0.5s a word is an ESTIMATE, needed only because the
real length was unknowable. With the voice running it is knowable"*). That is a
meditation's timing, built.

### What the check found

`collageTextBody` **strips nothing** — it pushes every line between `%%bd_text [`
and `%%bd_]` verbatim. So a `%%bd_pause 4` inside a text block **survives into
`blk.body`** intact, and is destroyed only at the last step, by
`speechTextFrom`'s `replace(/^%%bd_\w*.*$/gm, '')`. **One function owns the
fix**, and it is the function that already owns how text becomes speech — it
already normalises spaced dashes *because* the phonemiser turns them into
pauses.

Two sites, then: `speechTextFrom` must turn the line into a gap instead of
deleting it, and the collage's **display** must strip it, since
`collageTextBody` will not.

### `Settling Meditation` — created, label `Entry`

| | |
|---|---|
| label | `Entry`, via `Settling ─CONTAINS→` |
| url | `butterflydreaming.org/n/e8888d97-af6a-43a0-a908-b746cf53d907` |
| text | a text-only collage: `%%bd_collage 1`, one `%%bd_module text`, six `%%bd_pause` lines of 4–6 s |

**Why `Entry` and not `TextNode`,** though the existing collages are TextNodes:
the corpus has `Entry ─CONTAINS→ Entry` four times over and **no**
`Entry ─CONTAINS→ TextNode` anywhere. A TextNode under Settling would be a
label/relation pair the renderer has never been asked to draw — the kind of
untested shape that costs rounds. It carries a collage script regardless, since
`parseCollage` reads text and ignores type.

**It has no style rule**, so it renders with the default Entry appearance until
one is written.

**The words are a draft**, in Settling's own idiom — *"starting points, not a
map"* — and meant to be replaced.

**Until the directive is coded, the pause lines are inert**: `speechTextFrom`
deletes them, so the meditation currently reads as continuous prose, and the
lines are *visible* in the collage's displayed text because `collageTextBody`
does not strip them. Both are expected at this stage.

---

## Stage two: `%%bd_pause N` is built

**Seconds, not milliseconds** — a meditation is written in breaths —
and fractions work: `%%bd_pause 2.5`. **No `p_` prefix**, because it is not
stepper-backed.

**It needed almost no machinery**, which is why it was worth checking first.
Each queue item already carried its own `gap`, honoured as
`setTimeout(playNextSpeech, next.gap)`; verse lines and sentence ends already
used it. A pause is **not a new kind of thing — it is a longer value for a
number the player already waits on.**

**Three sites:**

1. **`speechTextFrom`** converts `%%bd_pause N` into a marker in a private-use
   character, **before** its own blanket `replace(/^%%bd_\w*.*$/gm, '')`. That
   ordering is the whole reason a marker is needed: directives must not reach
   the phonemiser, so the pause has to leave the `%%bd_` form before the strip
   and be recovered after it.
2. **`speak`** splits on the marker and puts each segment's silence on the
   **last utterance before it**, so the reading says its line and then waits.
   The gap rides on a real utterance rather than becoming an empty one, which
   would have been handed to both the synthesiser and the prefetch, neither of
   which has any use for one.
3. **the three display sites** wrap the collage body in `nodeProse`. This is
   necessary *because* `collageTextBody` strips nothing — the property that
   lets the directive survive to speech is the same property that would
   otherwise print `%%bd_pause 7` in the middle of a meditation.

### A leading pause, and why unit-testing earned its keep

Six shapes were tested without a browser, and one was **wrong**: a pause before
any words landed *after* the first line, because gaps sit BETWEEN utterances and
the carry-forward attached it to the next one. **Silently moving a meditation's
silence is worse than ignoring it.** A leading pause now delays the first
`playNextSpeech` instead, which is what it actually means — generation-checked,
so an interrupt during the lead silence cannot be followed by a timer starting
the reading it cancelled.

| shape | result |
|---|---|
| `Settle…` / pause 4 / `Let…` / pause 7 | gaps 4000, 7000 ✔ |
| pause 3 then pause 5, consecutive | **added** → 8000 ✔ |
| pause before any words | lead 9000, first line keeps its normal gap ✔ |
| pause after the last words | 6000 on the last ✔ |
| no pauses | unchanged, 504 ✔ |
| a pause and nothing else | nothing queued, nothing scheduled ✔ |

**Capped at 60 s** (`PAUSE_MAX_MS`), so a typo'd `%%bd_pause 600` cannot freeze
a reading.

### Known limit

A pause is only honoured **where speech is**. With Speak off, the written
silences are invisible and the meditation reads as continuous prose — so the
shape of it exists only when heard. Whether the written form should carry the
rhythm too (a blank line, a faint mark) is still open below.

---

## Two from testing the meditation

### "Press View to begin the meditation."

Placed **above** `%%bd_collage 1`, not inside the text block, and the placement
is the whole trick:

- `nodeProse` keeps non-directive lines, so the **Browse card shows it**;
- `parseCollage` starts with `cur = null` and only collects lines **after** a
  `%%bd_module` header, so the collage **drops it**;
- `collageTextBody` reads only inside `%%bd_text [ … %%bd_]`, so it is **not in
  the meditation** and is never read aloud as part of it.

Verified against the stored text: the Browse card opens "Press View to begin the
meditation." while the meditation still opens "Settle where you are."

### The Player helper card was being read out at the end of a meditation

The author: *"for some reason it displays then reads the following helper
message when pressing the back button."*

**Two faults in one.** `prependSystemCard` **speaks** its text, and the card in
question describes *"the script controls the pattern and the steppers can
synchronise"* — on a node with no pattern and no steppers. Its gate was
`mode === 'player' && enteringLayout && !playerHelperShown`: **nothing asked
whether the node had steppers at all.**

`bdNodeHasModule` could not answer it either, and the reason is worth keeping:
`MODULE_RE` matches **any** `%%bd_module`, `%%bd_module text` included, so a
text-only collage counts as carrying a module. *Having a module* and *having
controls* are different questions, and only the first had a name. Now
`bdNodeHasSteppers` answers the second, via `getModuleKind`, which returns
'visual' or 'music' for a real module and nothing for `text`.

**And the first version of that fix contained the mirror of the bug.** Using
`parseModuleId` would have consulted only the FIRST `%%bd_module` line — and
`bd_Collage_002` opens with `%%bd_module text` before its Kolam3D and DroneFrac
blocks, so that collage would have been judged stepper-less and lost a helper it
should have. Checked against the four real stored scripts before shipping:

| node | module blocks | first-only | all blocks |
|---|---|---|---|
| `bd_Collage_001` | `bd_V_Kolam3D, text` | true | true |
| **`bd_Collage_002`** | `text, bd_V_Kolam3D, bd_M_DroneFrac` | **false** | **true** |
| `bd_V_Kolam3D_002` | `bd_V_Kolam3D` | true | true |
| `Settling Meditation` | `text` | false | false |

So the predicate consults **every** module line.

---

## Staleness audit, 2026-10-26

The author: *"everything needs to be maximally up to date as we have time to
correct these things before the site is much looked at."*

**Corrected.** `Settling` said *"Use the player at the screen bottom to hear"* —
true until the meditation moved into a node earlier the same day. It now says
*"Tap the Settling Meditation node to hear one."* That phrase was the only
genuinely stale interface claim in 253 nodes of reader-facing prose, found by
sweeping for the UI changes of the last two months: the retired `auto` tick box,
the arrows that carry cards rather than scripts since 2026-10-13, and
one-tap unified focus.

**Checked and found CORRECT**, so recorded rather than touched:

- **"stamped eight times"** on `bd_V_Kolam3D` — the module's default `symmetry`
  is **8**.
- **"every one of five hundred steps"** — the default `depth` is **2**, and with
  an eight-symbol axiom and an eight-symbol production that is 8 × 8² = **512**.
- **`helper-nav-hint`'s "there is no second tap to make"** — correct, and the
  opposite of a stale claim: it tells the reader the retired behaviour is gone.
- **`bd_V_Kolam3D` carries zero directives**, which looked alarming and is
  right: it is a DESCRIPTION node for the module family, with the scripts on its
  children. The module would throw "No score found in node text" if it were
  asked to render, and it is never asked to.

**Left alone, with the reason:** `bd_Collage_001` and `_002` still use
`%%bd_p_step_pitch` in their scripts. The module reads that as `step_pitch /
step` on purpose, so both render correctly. `001` converts cleanly to
`stretch 0.5`; `002` is `step=358 step_pitch=4`, i.e. **stretch 0.0112** against
a control whose increment is 0.05 — writing it risks a snap that changes a
tuned figure. A conversion wants eyes on the before and after, not a migration.

---

## A forward edge from the meditation

The author: *"there is no reason to rout users back through Settling."* So
`Settling Meditation ─CONTAINS→ Conversations`, and a reader who has finished
the meditation goes straight on.

**`CONTAINS`, not `CHILD`, and the distinction matters.** `edge[type="CHILD"]`
is the only edge style that draws a **triangle arrowhead** — every other edge has
`target-arrow-shape: none` — so `CHILD` is the tempting answer to "a forward
arrow". But `hasNavDescendants` routes an `Entry` to
`[type="DESCENDS_FROM"], edge[type="CONTAINS"]` and ignores `CHILD` entirely. A
`CHILD` edge would have drawn a handsome arrow that **the meditation could not
follow** — the arrowhead without the passage.

So the link is navigable and, like every other `CONTAINS`, drawn without an
arrowhead. If the visual cue is wanted it is a one-line style rule, and a
separate decision from whether the step exists.

**Two consequences worth seeing before judging it:**

- The meditation now has **two** neighbours — `Settling` behind, `Conversations`
  ahead — so tapping it reveals both. The way back is still there; it is no
  longer the only way on.
- Viewing `Settling` shows Conversations and the Meditation together, and this
  new edge joins them, so that view draws a **triangle**. Informative rather
  than wrong, but it is a change to a view the author has looked at often.

---

## The meditation node's card, in full

Two lines, at the author's wording:

```
Press View to begin the meditation.
Click 'Conversations' to start browsing
```

**And the meditation's own words are NOT in the card**, which is worth recording
because it is easy to assume otherwise and I did, briefly. `nodeProse` skips
block CONTENTS as well as directive lines — `BD_BLOCK_OPEN_RE` matches
`%%bd_text [` — so the Browse card carries the instructions alone.

That makes the whole arrangement behave properly rather than by luck:

| surface | what it shows |
|---|---|
| Browse card | the two instructions only |
| Speak, on arrival | the two instructions only — **not** a flat reading of the meditation |
| View | the meditation, with its silences |

Had `nodeProse` kept block contents, landing on the node with Speak ticked
would have read the whole meditation **without pauses** before the reader
pressed View, and then read it again properly — the words performed badly once
and well once. It does not, and the reason it does not is one regex.

---

## Settling is the main road; Information is the side door

The author: *"the main route from Arriving will be Settling — I would like to
signal that with a smaller node and reduced brightness and ideally a dotted grey
edge. I can position it to the side myself."*

**The node: 76×60 → 56×44, label dimmed to `text-opacity: 0.6`, font 9px.**
Size is the loudest status signal on this canvas — the Gateways note in
`buildStyle` says so, having been *enlarged* for precisely that reason — so a
smaller node reads as secondary with no words spent on it.

**`text-opacity`, not a dimmer colour, and the reason is ink mode.** It is the
default, and in it node bodies are transparent (`INK_BG` at
`INK_BODY_OPACITY`) with identity carried by the **label**, coloured through
`inkify()`. So "brightness" here is the label's, and `text-opacity` is the one
lever that dims it in **both** modes — `inkModeOverrides()` sets `color` but
never `text-opacity`.

**`inkPurity` would have been the wrong dial**, which is worth recording because
it looks like the right one: it drives chroma toward neutral rather than
changing lightness. It would have made Information **greyer**, not quieter — and
greyness is not a hierarchy a reader with reduced colour vision can see.

**The edge is DATA-DRIVEN.** The edge carries `aside: true` in the DB,
`buildEdgeData` passes unknown properties straight through, and
`edge[?aside]` matches whatever is flagged. So further secondary links in the
Information layer can be marked without touching a stylesheet — the same
reasoning as holding the curation in the relation type rather than in a list of
node names. One edge is flagged today.

**Placed LAST in `base`** on purpose: the ink-mode edge rule recolours lines
from their target's ink and later rules win, so this has to follow it.
`inkModeOverrides()` appends after everything but styles **nodes only**, so none
of it reaches the edge.

Positioning is left to the author, as asked — the new edges carry no layout
hints, so fcose places them until `Wr` saves a layout.

---

## Open, deliberately

- **`aside` is binary, and the corpus already has two degrees of it.** Decided
  2026-10-26 to leave `Settling ─CONTAINS→ Conversations` undotted, on the
  author's reading: *"tricky because it's less of an aside than the former
  Information route."* Right — Information is a **side door into a different
  mode of reading**, while that edge is a **shortcut past a recommended step**.
  Both are bracketed in prose, and only one is dotted, so the graph and the
  words disagree there on purpose. If the Information layer grows enough
  secondary links to need it, the flag wants to become a degree rather than a
  boolean — but a distinction with two instances does not yet need a mechanism.

- **`ILLUSTRATES` is unbuilt and unnamed in code.** Introduce it with the first
  real illustration edge, not before.
- **Whether the layer ever earns the `Info` label.** Revisit when its content
  exists; do the server whitelist first.
- **A reverse affordance** from a passage back to what discusses it. Would undo
  the entry-time choice above, so it needs a decision rather than a drift.
- **Whether `Information` should be reachable from anywhere but `Arriving`.**
  Currently the plan gives it exactly one door.
