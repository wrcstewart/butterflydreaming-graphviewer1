# Remote view sharing — spec

**Branch `remote-graph-view`. Designed and BUILT 2026-08-29.**

> ## AS BUILT, 2026-08-30 — read this box and the next one before §1–§6
>
> The design moved a long way once it was on screen. **Three simplifications,
> each made after seeing the previous version, and each smaller than the thing
> it replaced.** Where the sections below disagree with these boxes, the boxes
> are what exists.
>
> ### What the screen shows now
>
> | | |
> |---|---|
> | thin yellow `#FFD400`, 1.5px | a node in YOUR view |
> | thin blue `#4a9bff`, 1.5px | your partner can see it too |
> | **fat turquoise `#16CAB8`, 4px** | your partner is ON it |
> | green `#50E272`, 8px | you are both on it |
> | solid light-blue arrow `#9FD0FF` | the recommended next step, head on the node to CLICK |
>
> **Your own centre is deliberately NOT marked.** You clicked it, so you know
> where you are — and where you did not (Back, leaving a route, a resize) the
> reading panel names it, in words, more precisely than a ring could. The rings
> spend themselves entirely on what you cannot otherwise know.
>
> **The three remote colours are a LADDER in hue AND luminance** — 213/174/134
> and 6.9/9.5/11.7, each step 1.25-1.43x. Awareness, focus, convergence. Do not
> move one without the others: blue and green were 1.1x apart before the
> turquoise needed room, which is nearly indistinguishable for a reading that
> leans on luminance.
>
> **Amber is no longer the ground.** It was, and blue was an annotation on top;
> since shared nodes dropped their amber inner ring, yellow means "yours alone"
> and blue "yours and theirs". A deliberate change, not a tidying — "everything
> on your screen is yours" is now something you know rather than something you
> see.
>
> **The yellow must stay near hue 50-55 at ~50% lightness.** At hue 41 and 72%
> lightness it read as GREEN to the user: an orange-leaning hue sits between
> yellow and the greens, and lightness bleeds the colour out. Legibility is a
> constraint, subtlety is a taste; spend the subtlety on WIDTH.
>
> ### The Remote control
>
> Shows their node's name, plus **their seq with a direction arrow** when you are
> in the same work and the route never leaves it, or **the hop count** otherwise.
> That number counts down as they close on you — the waiting affordance was
> already there and only needed to be legible.
>
> Pressing it shows the **ROUTE VIEW**: your view is replaced by the chain from
> where you are to where they are. Local (Back) or ✕ restores it.
>
> ### The route
>
> Dijkstra over the resident corpus — no query, nothing asked of the partner.
> **From your CURRENT node.** Hubs excluded as intermediates: root, the Entry
> nodes, `__root_edge__`, and **gateways** (up to 48 cluster links each — a route
> through one says only "both are in the corpus"). Capped at 5 intermediates.
>
> **Measured on 400 sampled TextNode pairs**, gateways excluded: **80% are two
> hops through a single shared Cluster**; 8 adjacent; 44 at three; 18 at four;
> 6 at five; 4 at six; **zero unreachable**. Intermediates are `Cluster` (318),
> `Text > Cluster` (44), `Text > Cluster > Text` (6), `Cluster > Sub > Cluster`
> (6). Top-level Family never appears.
>
> **So exclusion is currently costing nothing** — I had argued it would strand
> pairs and it does not. Switching to WEIGHTED hubs (expensive, not forbidden) is
> a refinement for when the corpus is much larger, not a fix for anything now.
>
> ### The arrow appears only when the halos cannot answer
>
> A TextNode view shows that node's linked Clusters, so at two hops — the 80%
> case — the shared cluster is ALREADY on both screens wearing a blue ring. An
> arrow there would be worse than redundant: every shared cluster is an equally
> short way across, so picking one implies it is THE way. **Tap any blue node.**
>
> The test is on the NODE (already visible AND already marked shared), not on the
> distance, so it adjusts to the view by itself — a Cluster view does not show
> one-hop neighbours, and there the arrow is still needed at the same distance.
>
> The hop count and seq readout are computed BEFORE that suppression: they are
> wanted even when the arrow is not.
>
> ### Traps found here, worth carrying
>
> - **The payload was one navigation stale.** `addYouChip`/`publishPosition` runs
>   at the TOP of the fresh-tap branch while `navigateInto` expands at the BOTTOM.
>   Deferred one frame AND coalesced.
> - **The arrowhead followed the EDGE's direction**, not the journey's. `CHILD`
>   runs seq 2->3, so stepping backwards put the head on the node you were
>   standing on. Which end carries it is now decided per use.
> - **Stale blue halos.** `routeActive` survived every exit except Back, so
>   tapping away left the partner's old position marked. A tap now leaves the
>   route.
> - **Stray edges.** `applyMergedView` revealed every edge whose endpoints were
>   both visible — NOT the rule the expands use (`expandToNode` shows the closed
>   neighbourhood of the CENTRE). Removed.
> - **A span replacement deleted `findBridge`**, so no route ever appeared. Third
>   time this week. The check that works: after replacing a span, grep for every
>   function the new code CALLS — not for the code just written.
> - **One commit shipped only the version bump** when a stale anchor aborted the
>   Python and the `&&` chain committed anyway. Put the verification grep BEFORE
>   the commit, not after.
>
> ### Still open
>
> - **THE CROSSING — noticed 2026-08-30, undecided.** If both users click each
>   other's node at once they SWAP and no green appears: the snap is emergent
>   (each side checks `my centre === their last reported centre`), so there is no
>   arbitration and no first-wins. Staggered clicks give a brief green on BOTH
>   screens before the second move breaks it; simultaneous ones give none at all.
>
>   It is locally detectable with no protocol, because `previous` is already in
>   the payload: `their current === my previous AND their previous === my
>   current`. Both sides compute the same answer independently.
>
>   What to DO with it is the open question, and the two readings differ in kind:
>   "you passed each other" is a failure to fix, "you crossed" is an event worth
>   marking. Only the second makes the near-miss valuable. (This is also what
>   `previous` was kept in the payload for, after predecessors stopped being
>   signalled and it had nothing to do.)
> - Weighted hubs instead of exclusion (not urgent — see the measurement).
> - Gamifying the chase. The countdown is the hook; no new machinery needed.
> - `renderMembership` takes a `prevId` it no longer uses.
> - At ~40 works the **Cluster view's gateway row** is what breaks first: ~10
>   gateways average, ~27 for popular themes, against 2.2 today. Texts per
>   cluster×work stays ~7 however large the corpus gets.

---

> ## AMENDED IN BUILD — read this before §1–§6
>
> Two things changed once it was on screen, and both simplify it. The sections
> below are the reasoning that got here; where they disagree with this box, this
> box is what is built.
>
> ### 1. The OVERLAP, not the union
>
> The full union was more than a reader can hold — the user's judgement on seeing
> it, and correct. Their whole view is no longer pulled across. What shows:
>
> - every node of theirs **already in your view**, painted blue, updated **live**
> - **their current node**, brought in by the button if it is not already there
> - nothing else of theirs
>
> The picture answers *"which of these are we both seeing?"* rather than *"what
> is everything either of us can see?"*.
>
> **The layout-churn argument no longer applies to the overlap.** It adds no
> nodes, so it moves nothing, so it can be live. §2's reasoning was sound but was
> answering a harder question than the one worth answering. The button is left
> with one job — fetch their current node — and adds at most ONE node.
>
> ### 2. TWO halo tiers, not three
>
> Predecessors are no longer signalled. With amber and blue each carrying a
> scale, three levels meant six things to tell apart and the middle earned the
> least. **0.85** the node you are on, **0.5** everything else, in either colour.
> The rest rose from 0.2 because it no longer has to leave room beneath a middle
> tier. `previous` is still sent and stored; nothing paints it.
>
> ### Built, in order
>
> | | |
> |---|---|
> | `29ab8de` | transport on the existing crumb — verified, 15 navigations, every id resolvable |
> | `762a770` | merge + Clear plumbing, `localViewIds` / `mergedRemoteIds` |
> | `4da448b` | membership rings — one pass replacing four branches |
> | `cc1d8a9` | publish deferred one frame (see below) |
> | `529775f` | overlap not union |
> | `0309dec` | two tiers; imported node placed against content |
>
> ### Three faults worth remembering
>
> - **The payload was one navigation stale.** `addYouChip` — and so
>   `publishPosition` — runs at the TOP of the fresh-tap branch, while
>   `navigateInto` expands at the BOTTOM. So `current` named the new node while
>   `ids` held the old view. Now deferred one frame **and coalesced**, since two
>   navigations in one frame would otherwise have both read the final view and
>   the first message would have carried the second's ids.
> - **Merged nodes wore amber.** Nothing painted them: the stylesheet's resting
>   tier is amber and the only blue was one inline style on their current node.
>   The merge arrived invisible. Fixed by the single membership pass, which also
>   fixed blue being `outline-width: 6` against local 3.
> - **The imported node landed at the window edge.** Structurally disconnected,
>   so fcose packs it as its own component. Same fault as the parked marks:
>   `cy.extent()` standing in for the bounding box of what the layout occupies.
>   Now placed top-left of YOUR nodes, after `layoutstop` (before that the layout
>   overwrites it), clamped into the viewport, and carrying `.imported-mark` so
>   every `cy.fit` excludes it — including it is a feedback loop.
>
> ### Still open
>
> - `renderMembership` takes a `prevId` it no longer uses.
> - **Edges.** The user asked whether they earn their place now the halos carry
>   relationship. They do — the user's own principle is that arrows and edges
>   signal CONSTRUCTED relationships while colour signals history and
>   local/remote/agreed. Halos say *whose*, edges say *how joined*. If the load
>   is still too high, hide edges on the ONE imported node, which has no honest
>   structural relation to your view.
> - Slice 4 (the 8px green snap ring) is written and live inside the membership
>   pass but **untested** — it needs both users selecting the same node.
> - Freezing your own component is now probably unnecessary: at most one node
>   arrives.


Showing your partner's graph on your own screen, so the two of you can see where
the other is working. Companion to `ink_mode.md`, which frees the colour channel
this needs.

---

## 1. The model

Your screen shows **your view ∪ a merged snapshot of theirs**. Four states:

| state | meaning | inner ring (`border`) | outer ring (`outline`) |
|---|---|---|---|
| local only | in your view | — | amber |
| **NLR** | remote only | — | blue |
| **LR** | in both | amber | blue |
| snap | both of you selected it | — | green, 8px |

Cytoscape gives exactly two concentric strokes per node, and the four states fit
without needing a third. Outline is always the *outermost* membership; the inner
ring appears only when both apply. Transparent bodies (ink mode) make the inner
ring free — there is no fill to protect.

Opacity within each colour follows the local scale: **0.85** their current node,
**0.65** their previous, **0.2** the rest.

**Clicking an NLR makes it LR.** Not a special case — navigating there puts it in
`expand(your current node)`, so it becomes local while remaining in the merged
set. The rule falls out of the model.

---

## 2. The merge is USER-INVOKED. This is the whole design.

The first sketch had your screen track theirs live. That fails on **layout
churn**: their nodes are usually in an unrelated part of the corpus, so every move
they make re-arranges your screen while you are reading it. Not a rendering
detail — the thing most likely to make the feature unusable.

So: their state arrives continuously but is only **shown on the blue button**
until you press it. Pressing merges their view into yours. **Your layout changes
only when you act.**

- The merge is a **SNAPSHOT.** They move on; what you pulled in is where they
  were. Tracking them live would reinstate the churn.
- Their **live** position remains a separate signal — the 0.85 blue node if it is
  in your view, the corner button (with its orphan flash) when it is not.
- Presses **accumulate**; **Clear** empties everything remote-sourced.
- A merge is a view change, so it goes through `saveState` — **Back already
  undoes it** for free. Clear is still wanted, because Back also unwinds your
  navigation.

---

## 3. Transport — on the existing crumb, pushed, structural only

**Payload:** `{ ids, current, previous }` added to the existing `breadcrumb`
message. The button labels from `current`; the merge consumes `ids`.

**Why the existing message.** `server.js` forwards the crumb payload wholesale —
`sendToBuddy(..., { type: 'buddy_breadcrumb', data: msg.data })` — so extra
fields need **no server change and no whitelist entries**. A new type would need
three sites, and two of three fails silently (see the `gn_mark` incident).

**Why pushed, not requested.** A request/response would add two message types,
a round trip that fails silently when an iOS tab has been discarded, and — worst
— **staleness**: by the time they replied they may have moved, so you would merge
a view newer than the one the button named. One message carrying both means the
label and the merge cannot disagree.

Cost, measured: 477 nodes in the corpus; a cluster neighbourhood averages **17**
and peaks at **168**. About 1 KB typical, 10 KB worst, a few times a minute.

**Why the view is TRANSMITTED, not re-derived.** A receiver could run the same
expand logic on their node — the corpus is resident on both sides. It would
sometimes be wrong: `handleGatewayClick` builds its view from the gateway node
**and** `lastClusterNode`, i.e. their history. The same gateway gives that
cluster's chunks with a valid context, or the work's themes (up to 48 clusters)
without one. Same node, different view. Re-deriving is also a second
implementation of "what does this view contain", which is the bug shape that
caught us three times in a week.

**Send your STRUCTURAL view only** — `expand(your current node)` — never the
merged remainder. Otherwise: A merges B, sends everything visible back, B merges
that, and the union grows monotonically until both screens are the same blob and
the blue channel means nothing. A merged node you actually navigate to enters
`expand(your current)` and is sent, which is the NLR → LR transition again.

---

## 4. The data model this forces

The view can no longer be inferred from what is on screen:

    localViewIds     recomputed on each navigation
    mergedRemoteIds  accumulated by the button, emptied by Clear
    drawn            = the union

Membership is then set arithmetic over those two, which is testable in isolation.
`publishPosition` sends `localViewIds`, never the union.

**Membership must be expressed as CLASSES, not inline styles.** `clearMarksFrom`
strips inline `outline-*`, so inline membership would be erased on the next mark
change and reappear only when something happened to repaint — the silent,
intermittent failure shape. Classes survive, and the cascade does the work.

---

## 5. Decisions taken

| | |
|---|---|
| `ids` contains | **nodes only** — edges follow, since any edge with both endpoints visible is shown |
| merge survives your navigation | **yes**, sticky until Clear |
| the Blue Node halo | **absorbed** — "their current node, blue, brightest" IS the 0.85 tier. Membership rendering replaces `renderMarks`' inline BN painting |
| second press of the blue button | **merges the current view only.** The retrace stack is PARKED — it may prove unnecessary once you can see where they have been |
| Clear | a fourth, **icon-only** button. The other three name nodes and earn their labels; Clear names nothing |
| their `previous` | sent — already tracked locally as `prevReadNodeId` |
| capped? persisted? partner told? | no / no / no — the merge is a purely local act, so no new message and no new failure mode |

**Preliminary, before the rings:** move the four inline marks (current,
predecessor, BN, GN) to classes. They currently beat any class rule by
precedence-accident. Doing it first makes the whole system one cascade and
deletes code.

---

## 6. Build order

Each slice independently verifiable, and **layout policy is deliberately kept out
of the early ones** — building it alongside the communication logic would mean a
failure told us nothing about which half was wrong.

1. **Transmit and receive. No visual change.** Their set arrives, is stored, is
   logged. Verified from `/private/tmp/bd_server.log`.
2. **Merge + rings.** Button adds their set; plain `runLayout`; membership
   classes and the four states.
3. **Clear.**
4. **Snap → the 8px green ring.**

Then, separately: **freeze your own component** so a merge lays their nodes into
the space around yours instead of re-arranging everything. Once per press is
tolerable where once per partner-move was not, so this may not be needed at all —
which is exactly why it is not slice 2.

---

## 7. Open

- **Green would mean two things** — "we are both here now" (the 8px ring) and
  "a convergence you recorded" (the corner stack). Proposed resolution: live snap
  = the ring, record = the corner button only. Needs stating in `editing_spec.md`
  when built.
- **Top-level views.** The Blue Node was suppressed at Root/Settling/Gateways
  because a deep text node drawn at that scale looked absurd. A merged view puts
  their whole neighbourhood there. Suppress, or accept?
- **Density.** Two views plus halos on everything. The resting tier may need to
  drop below 0.2.
