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

> **REVISED 2026-08-27, after the user asked whether PN is just the existing
> Back button wearing the previous node's style. It essentially is — and the
> existing one is already CORRECT.**
>
> `#back-btn` is driven by a view stack at viewer.js:4267–4300. `saveState`
> pushes `{ids, parent, chipNode}` from six navigation sites; `restoreState`
> **pops**. So it has had the right semantics all along, which is why it has
> never oscillated.
>
> **That reframes the oscillation bug entirely.** It was not graph-node-vs-DOM,
> and it was not a missing feature — it was a SECOND, parallel history
> (`prevReadNodeId`) built alongside a working one and lacking its pop. The
> lesson is not "make it DOM", it is "there was already a back stack".
>
> And the depiction comes free: `history[history.length - 1].chipNode` is
> exactly the node the control should wear — `saveState` sets it to the focused
> node, falling back to the parent. So step 2 is:
>
>     style/label from  history[history.length-1].chipNode
>     click             restoreState()          // existing, unchanged
>     hidden when       history.length === 0    // existing updateBackBtn rule
>
> Nothing new to record, pop, dedup or cap for PN. Step 5's stack work applies
> to GN and BN only.
>
> **Placement — done 2026-08-27.** The user asked whether the old Back button
> was reused because a DOM control could not be put on the canvas. It can, and
> it now is: `positionPnBtn` writes top/right from `#cy`'s LIVE rect, so the
> button sits at the canvas top-right and follows the panel stack, the
> Nodes/Edit/Player toggle and every resize. Never a constant — the canvas top
> is not one. The reuse of `#back-btn` was only ever about its stack.
>
> **One correction to this plan's own instruction:** "navigate-to, not
> restore-the-view" is right for GN — you may have no stored view for a snap —
> but WRONG for PN. Restoring the view returns what you were looking at, which
> is what Back should do, and it is already built and tested. Node ids are the
> durable `url` and every node is permanently resident, so a stored id set does
> not go stale in the way that instruction assumed.
>
> **The one thing that must not be forgotten at step 4:** the BN jump has to
> call `saveState()`. Crossing a BN jump is the entire reason a corner control
> was wanted — the destination has no structural path back — and Back only
> covers it if the jump is recorded like any other navigation. There is no BN
> jump in the code today, so this is a new-code obligation, not a check.
>
> **Does Back cope with a jump to an unrelated subgraph? Yes — checked.**
> `restoreState` traverses nothing. It hides everything and re-shows a stored id
> set, and every node is permanently resident with a durable `url` id, so the
> set stays valid however far the jump went. Returning across a BN jump is no
> harder for it than collapsing to a parent. Reading material survives too —
> nothing clears the card stack on navigation.
>
> Three gaps to close when the jump lands:
>
> 1. **The selection is lost.** `restoreState` sets `activeNodeId = null`, so no
>    node is selected on return — no amber ring, and Unified Focus does not
>    re-focus what you were reading. Fine when Back means "collapse to parent"
>    (all six current callers); wrong when it means "return from a jump", where
>    you WERE on a specific node. Restore `activeNodeId` from `chipNode` when it
>    is a TextNode.
> 2. **The you-trail extends rather than unwinds** — `addYouChip` always
>    appends, so jump-and-back reads `Loss → DuFu → Loss`. Defensible as a
>    record of where you have been; note it is a choice, not an oversight.
> 3. **`history` has no cap** and each entry stores every visible id. Cluster
>    views are small; a Gateways view is not, and a partner moving about drives
>    jumps. Cap it before the jump ships.

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

- **AMENDED 2026-08-28: a GN is minted by tapping the HALOED NODE too**, not
  only by the control — one rule, "you deliberately arrived at where your
  partner is", two routes, identically guarded. The control flashes 5s when the
  node is off-view and it is therefore the only route.
- **GN is created ONLY by a BN click** — a conscious act of following, not an
  automatic snap. This is the decision that removes the whole
  offer/accept/lapse state machine.
- Expect the convergence to be symmetric for free: when you jump to your
  partner, your marker lands on their screen on the node they are already on.
  Both sides can record the same moment with no protocol.

### 4b. WHICH corners are stacks — decided 2026-08-27 by the user

**The BN corner is NOT a stack.** It shows the partner's CURRENT position and
nothing else. You are deliberately not offered a way to scan back through their
browsing, because — the user's reason, and it is the right one — *that would
realign local too far into remote*. Following someone should be a choice you
make at a moment, not a second trail you can wander independently of your own.
Your thread stays primary; theirs is a live pointer, not a history.

**REVERSED, same day, and BUILT.** The user chose to try the stack after all,
and the symptom that prompted it was the argument making itself: once you have
jumped, a pointer names the node you are standing on and there is nowhere
further to go — it "gets stuck".

Built as a CURSOR over a newest-first stack (cap 3), not a rotation: the halo
always tracks `bnStack[0]`, where your partner IS, while the cursor is where
your browsing has reached. Rotating would make "their current position" wander,
which is the one thing the BN must never lie about. Any move by your partner
resets the cursor to 0 — they moved, that is news, and it outranks a tour.

**A GN is still minted ONLY from the head.** Following them to somewhere they
have already left is not a convergence, so no green mark and no `gn_mark` — the
reasoning that made the GN cheap is unchanged by the BN gaining depth.

The original argument, for the record:

**A third argument FOR a BN stack, from the user 2026-08-27 — deferred, not
rejected:** it would make BN and PN behave SYMMETRICALLY, which helps
understanding and may simplify both design and implementation, and it is
quasi-symmetrical with GN too. Weigh this against the "realigns local into
remote" objection when the question is reopened. Left as a live pointer for now.

**The GN corner is the stack, and it records the BNs local actually CLICKED.**
That is the recovery path: not "everywhere they went", but "the places I chose
to follow them to". It is a record of your own decisions, which is why it cycles
rather than pops.

This is what makes "the GN is created ONLY by a BN click" more than a
simplification — the click is the only event that carries local's intent, so it
is the only one worth recording. Everything else is the partner moving about.

Corrects the table in the summary above and in `editing_spec.md` §v0.2, both of
which had the bottom-right corner holding "the partner's positions", plural.

---

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

### 6. Retire the breadcrumb bars — **DECIDED 2026-08-27, do this next**

The user has chosen to **sacrifice the parallel view for simplicity**. The open
question below is settled; what follows it is kept as the record of what was
weighed.

**Order of work:**

1. **Stop CALLING the breadcrumb bar code. Do not delete it.** Kept whole so the
   parallel view can come back if it turns out to be missed.
2. **Move the graph area down** so its bottom sits where the bottom of the local
   breadcrumb strip is now.
3. **A new permanent panel ABOVE the graph**, present in Player mode too.
4. **The three corner buttons move into it** — placement inside it is open for
   now. Keep its depth roughly the current breadcrumb depth: a **description of
   each button goes above it**.

**Consequence to watch, and it is a real one.** The remote breadcrumb strip is
today the only way to reach a position your partner has ALREADY LEFT — its chips
navigate (viewer.js `buddyCy.on('tap','node')`). Retiring it makes the BN
strictly a live pointer with no history behind it anywhere. That is consistent
with the decision that BN is not a stack, and it was half the argument against
giving it one — so if the loss bites, the honest fix is to reconsider the BN
stack rather than to bring the strip back.

---

### 6 (original). Then, and only then, consider retiring the breadcrumb bars
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
