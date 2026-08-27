# Corner controls — work plan

**Written 2026-08-27, before starting.** A resumable, ordered plan, so a session
that loses context mid-way can pick up from the last completed step rather than
re-deriving the design.

**Design rationale is in `editing_spec.md` §v0.2.** This file is only *what to
do, in what order*.

Tick a step by committing it. `git log --oneline` shows how far it got.

---

## The one-line summary

The three marks (previous / partner / agreed) stop being cytoscape nodes moved
into corners, and become **DOM controls** that *represent* nodes. Each is the
top of its own stack; clicking navigates and advances the stack.

---

## Why this is worth doing (short version)

A cytoscape node has one position, so a mark cannot be both in the graph and in
a corner. Making the corner marks DOM removes that contradiction — and with it
every bug of the last two days: edge stretching, the `cy.fit` feedback loop,
parking geometry, and layout races re-positioning them. They were UI pretending
to be graph elements.

---

## Order of work

### 1. Desaturate the family palette — SEPARATE, DO FIRST, EASILY REVERTED
Designer feedback: the scheme is overbearing. `FAMILY_COLOURS` (viewer.js ~77)
is six near-full-saturation colours and **everything else derives from them** via
`computeBlendedColours`, so a 30–40% saturation cut calms the whole graph from
one place.

Do this on its own and look at it before anything else. It is reversible, it
tests the observation directly, and it may remove the reason to re-purpose the
colour channel at all.

**Do NOT re-purpose colour to signal node type yet.** That is a much larger
move with a real cost — colour-as-domain is most of what makes the graph
wanderable. Shape already carries type (hexagon / square / round-rectangle /
round-triangle) and could carry more.

### 2. Build one control end-to-end: PN
Prove the pattern on the simplest case before generalising.

- A DOM element in a fixed corner (top-right), styled from the node it stands
  for: background = `data('colour')`, shape via border-radius/clip-path,
  plus a **truncated label** — reuse `truncateChipLabel`, and remember it must
  FLATTEN whitespace first (cluster `display_name` carries real newlines).
- Click → navigate to that node. **Navigate-to, not restore-the-view**: a stored
  view references state that has moved on.
- Hidden when the stack is empty.

### 3. Retire the PN graph-node machinery — **PARKING DONE EARLY, 2026-08-27**
Was to be done only once step 2 works. The **parking** was pulled forward
anyway, because a corner graph node from the superseded design was on screen
confusing the user ("why are there nodes appearing top right — have you
partially started this?"). A half-built thing from a design we have abandoned
costs more sitting there than it saves.

Removed: `placePrevNode`, the `markCorner` 'prev' branch, `reassertPrevNode`'s
body, the un-park in `clearPrevVisuals`, `pnWasRevealed`, and the Back-tap
special case. **The faint amber halo stays**, as below.

Still to delete, once step 2 lands: nothing for PN — this step is complete.

Original wording, for the other two marks. Delete, for each: `parkMark` use,
`markCorner` 'prev' branch, `reassertPrevNode`, `clearPrevVisuals`, the
`.parked-mark` handling, and the Back-tap special case in the node tap handler.

**Keep the in-graph faint amber halo** when the node is present — that is the
structurally honest signal and the corner control is additional, not instead.

### 4. Generalise to BN and GN
Same control, three instances, three corners: agreed top-left, previous
top-right, partner bottom-right.

- **GN is created ONLY by a BN click** — a conscious act of following, not an
  automatic snap. This is the decision that removes the whole
  offer/accept/lapse state machine.
- Expect the convergence to be symmetric for free: when you jump to your
  partner, your marker lands on their screen on the node they are already on.
  Both sides can record the same moment with no protocol.

### 5. Stack semantics

**Observed 2026-08-27, and it is not theoretical.** Testing the graph-node PN
before it was removed: sequential Back clicks **oscillate A→B→A→B**. Clicking
Back navigates you, and the same recorder that logs every navigation then writes
the node you just LEFT as the new PN. So Back's own target becomes the next
Back's target.

**The DOM control does NOT fix this by itself.** Nothing in the oscillation
depends on the mark being a cytoscape node — if step 4's click handler routes
through the ordinary navigation path, it reproduces the bug exactly. The fix is
the pop below, and it must be built WITH the control, not after it.

The distinction the bug exposes: a back button and a "most recent other node"
indicator behave identically for one click and diverge on the second.

- **PN pops** — it is a back button, and a consumed entry is correct. Concretely:
  a Back click must **not** push the departed node. Test with THREE clicks, not
  two — A→B→C then Back Back should reach A, and the broken version reaches C.
- **GN cycles** — it is a *record*; visiting a snap must not destroy it.
- **Dedup**: revisiting a node moves its existing entry to the top rather than
  adding a second.
- **Cap** each stack (3 is a reasonable start).

### 6. Then, and only then, consider retiring the breadcrumb bars
The two strips cost ~46px of permanent vertical space; three buttons in one
strip cost less and carry labels the chips cannot fit.

**Check first what is lost.** The bars' irreplaceable property is the PARALLEL
view of the trail — "Nature → Emotion → Loss" at a glance, which a stack of one
cannot say. That may matter more on desktop than on a phone. Decide after
living with the controls, not before.

---

## What gets deleted along the way

Expect this change to remove more code than it adds. Candidates, once all three
marks are DOM:

- `parkMark`, `markCorner`, `placeBlueNode` / `placeGreenNode` / `placePrevNode`
- the `.parked-mark` class and its exclusion from every `cy.fit`
- edge-hiding on parked nodes, and `markBlueEdges`' parked check
- `reassertBlueNode` / `reassertGreenNode` / `reassertPrevNode` and the
  `layoutstop` / rAF re-park paths
- most of `exploreState` — `offered`, `invited`, the lapse-on-snap-break rule,
  the partner-gone dimming, `explore_offer` / `explore_accept` / `explore_cancel`
  on both client and server

**Keep**: slice A's Snap detection (`snapNodeId`, published from `renderMarks`).
The new model still needs it, unchanged.

---

## Traps carried forward from the last two days

- **A cytoscape node has ONE position.** It cannot be in the graph and in a
  corner. This is the constraint the whole redesign answers.
- **Whatever runs last decides.** Anything position-dependent must run after
  everything that moves things. Bit three times: a `setTimeout` rewriting the
  gateway row, a layout running after the mark parking, the bars correcting
  against pane geometry that `positionCyEl` then changed.
- **Revealing and marking are separate effects.** Undoing one is not undoing the
  other — the cause of the Blue Nodes piling up.
- **`ele.position()` returns a LIVE reference**, so a `fixedNodeConstraint` built
  from it follows the node instead of holding it.
- **Two chip builders exist** — the live one and `addYouChipFromData`, which
  rebuilds from cache at boot. A change to one only looks intermittent.
- **Cluster `display_name` contains real newlines.** Flatten before measuring.
- Client console forwards to `/private/tmp/bd_server.log`. **Measure early**; a
  second "no different" means instrument, not iterate.

---

## Not part of this work

- The **write gate** — the generic query channel still runs arbitrary Cypher, so
  any agreement is witnessed rather than enforced. Deferred by the user.
- **Draft persistence** — brief `CC.7`, still the only present-tense risk.
- The **grace period is 5s for development**. `BD_GRACE_MS=65000` restores it;
  the server warns at boot while it is short.
