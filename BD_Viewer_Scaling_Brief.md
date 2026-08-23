# ButterflyDreaming — Graph Viewer Scaling Brief

**Version** 1.0
**Date** 23 August 2026
**Status** Design thinking only — no implementation intended in the near term
**Audience** Claude Code (CC), for verification and challenge
**Prepared by** Claude (Anthropic) with William Stewart

---

## 0. Purpose

This is not a build specification and nothing here is scheduled for
implementation.

It records an examination of whether the Cytoscape.js viewer can scale
against a production-sized Memgraph corpus, and concludes that it can,
without architectural change, provided one property holds. The intent is to
establish that a reliable path exists — so that current development can
proceed without anxiety about a scaling wall, and so that present-day
decisions do not foreclose anything.

CC is asked to verify the claims below against the actual codebase and
database, and to challenge them where they are wrong.

---

## 1. The concern examined

The viewer loads a working set into Cytoscape.js and renders it
client-side. The question raised:

> If one grants an upper limit of say 10 KB per node, then a 200 MB
> Cytoscape only handles 20k nodes, whereas the Memgraph on the server
> could easily store 100 times as many.

The underlying instinct — that the client must not mirror the corpus — is
correct. The scale at which it bites, however, is nowhere near current or
plausible future working-set sizes, for the reason set out next.

Two facts about the intended design settle it:

1. **A whole-graph overview is never required.** The viewer's purpose is
   wandering, not surveying. This removes the hard version of the problem
   entirely. A 100k+ node overview would demand abandoning Cytoscape for a
   WebGL renderer (sigma.js, regl) or a precomputed static map. None of
   that is needed.

2. **The display is a single hop.** One selected node, at most a couple of
   dozen neighbours, plus a potential hop across to the Blue Node.

---

## 2. The decisive property: replace, don't accumulate

Cytoscape.js does **not** cull offscreen elements by default. Rendering and
hit-testing costs track the size of the loaded collection, not the number
of elements within the viewport. A 500-element graph displaying 24 of them
still pays redraw and hit-test across all 500.

The performance question is therefore not *how many nodes are displayed*
but **whether visited hops accumulate inside `cy`**.

| | Resident in `cy` | Consequence |
|---|---|---|
| **Accumulating** — each hop adds to the graph | Grows without bound across a session | Would eventually require LRU eviction, edge closure, element budgets |
| **Replacing** — each hop clears and redraws | 25–50 elements, permanently flat | No memory or rendering concern at any corpus size |

The intended design is **replacing**. Prior hops, if wanted for
back-navigation, are held as raw JSON outside Cytoscape — roughly 500 bytes
to 1 KB per element, versus 2–4 KB for a rendered element carrying style
cache, bounding box and event handlers — or simply refetched, which at this
scale costs nothing.

**Consequence:** the working set is two dozen to fifty elements. Cytoscape
is comfortable with this on a decade-old phone. Memgraph can hold two
million nodes and the viewer neither knows nor cares.

Note also that the 10 KB per node figure in §1 is mostly avoidable payload.
Cytoscape's own per-element overhead is 2–4 KB; the remainder is
`source_text`. A Tao Te Ching chapter or a Hardy poem is 1–3 KB on its own,
and need not be in the graph payload at all (see §3.2).

---

## 3. What does require attention

### 3.1 Per-hop latency is the performance metric that matters

One capped query per hop, server-side. At a 24-element working set this is
the only thing worth measuring. Client-side rendering cost is negligible.

### 3.2 Payload thinning

Send only what is needed to draw and label a node: `id`, the
`getTextNodeLabel` output, `seq`, the `section_title` flag, node type,
colour, edge references. Fetch full `source_text` on selection via a
separate endpoint.

This is not a memory question at this scale. It is a round-trip speed
question, and therefore a question about how fluid wandering feels. Worth
doing; not urgent.

### 3.3 The degree cap

Clusters are hubs. An uncapped query returns thousands of TextNodes, so a
cap per anchor is necessary — but as a **display** decision rather than a
memory one. Which two dozen neighbours the user sees is the substantive
question, and §5 is devoted to it.

Memgraph note: the cap will want `UNWIND` over anchor ids with
`WITH ... ORDER BY ... LIMIT` per anchor, rather than a pattern predicate
in `WHERE`, given the known syntax constraints (no `EXISTS{}`, no
`NOT IN`, no pattern predicates in `WHERE`, no `COUNT{}`).

### 3.4 Truncation must be visible

Where the cap truncates, render a small "…more" stub. At two dozen visible
neighbours out of a possible several hundred, the user is seeing a *sample*
of the local graph, and the interface should not imply otherwise. Without
it the user perceives a closed world and assumes an edge of the corpus that
does not exist. This matters for the wander metaphor, not merely for
usability.

### 3.5 Deterministic layout is available and probably better

At this scale, force-directed layout is unnecessary and arguably harmful.
Two dozen nodes can be placed deterministically — focus centred, neighbours
radial, BN parked in a fixed position — giving the same arrangement every
time a node is revisited. A cose or cola run produces a different
arrangement on each visit, undermining spatial memory during a wander.
This is a quality improvement made possible by the small working set, not a
constraint imposed by it.

### 3.6 iOS Safari resilience — unrelated to graph size, still relevant

Safari renders each page in a separate `com.apple.WebKit.WebContent`
process with its own jetsam limit, observed at 2048 MB even on an iPhone
17 Pro with 12 GB RAM [1]. Below that, WebKit's own MemoryPressureHandler
begins purging caches in the 300–450 MB range, and the lower of the two
limits always governs [2]. A separate `WebKit.GPU` process carries a
smaller budget, observed being killed in the 316–522 MB range [3], which
constrains canvas and WebGPU work — relevant to the V_Kolam and 3D modules
rather than to the graph.

Safari exposes neither `performance.memory` nor `navigator.deviceMemory`,
so the available budget cannot be feature-detected at runtime.

A 24-element graph will never approach any of these limits. But a long
session with media modules, audio buffers and accumulated JS state can, and
a jetsam kill is instant with no catchable JavaScript exception.

**Implication, independent of everything else here:** session and draft
state should be persisted to IndexedDB on every change, so that a tab death
during a Weave is recoverable rather than catastrophic. This is a
present-day risk, not a future one.

---

## 4. The Blue Node (BN)

The BN is a single marker showing the partner's current focus. It haloes an
on-screen node or sits in the corner, shows edges to locally resident
nodes, and is clickable — that is its purpose. Exactly one per client,
ever. The partner's focus may be a TextNode, Cluster, SubFamily or Family,
since sharing navigation across the hierarchy is intended.

At a single-hop working set:

**Memory impact: nil.** One element. The concern that a client operates
across two cached subsets does not materialise.

**Pin against replacement.** When a hop clears the graph, the BN must
survive the clear or be re-added immediately, or it flickers on every
navigation.

**Halo vs corner should be residency-driven.** Compute as
`cy.getElementById(partnerFocusId).length > 0`, evaluated on both partner
update and local hop. Not from a hop-distance calculation — distance is
expensive on a large graph and can disagree with what is actually drawn,
producing the worst bug class here: a corner marker for a node visibly on
screen.

**Edges from the corner BN.** Rather than re-querying the server on every
local hop, fetch the BN's neighbour id list once per partner move — ids and
relationship type only, no text — hold it outside Cytoscape in a
single-slot cache, and intersect client-side against the resident set. With
only two dozen residents this intersection is trivial and recomputes free
on every hop.

Where the partner's focus is a hierarchy node, its direct neighbours are
SubFamilies or Clusters that will frequently not be resident, so the corner
BN will often draw with no edges at all. This is correct and honest
behaviour: the BN is a pointer, and the pointer is saying *elsewhere*.

**Cap the radiating edges** at 5–8 ordered by `CLUSTER_REL` weight, styled
distinctly (dashed, low opacity, blue) so they read as links to elsewhere
rather than as graph structure. Against a 24-node display, more than a
handful of long diagonals to a fixed corner would dominate the view and be
mistaken for real topology.

**Speculative prefetch of the BN destination: not needed.** A cold fetch on
press is one round trip over a local tunnel, plausibly under 100 ms and
quite possibly imperceptible. Measure before optimising. If it ever proves
otherwise, prefetch only a minimal core — focus node, parent cluster, title
page, roughly ten elements — and only after the partner has dwelt for a
couple of seconds. A full speculative horizon churns on every partner move,
costing bandwidth and battery on mobile and generating tunnel load that
scales with pairs rather than clients.

**Emergent property worth noting.** When the local user presses the BN and
jumps to the partner's focus, their own BN appears in the partner's viewer
as a halo on the partner's own node. Convergence becomes mutually visible
without either party being notified of anything — the gravity well
surfacing at the interaction layer rather than the scoring layer.

---

## 5. The question that actually matters

With a working set of roughly two dozen neighbours, **which** neighbours
appear is not a performance detail. It is most of the wander experience. A
Cluster holding three hundred TextNodes will surface twenty-four of them,
and the selection rule determines what any user ever encounters.

Candidate orderings, none yet chosen:

- Highest `CLUSTER_REL` weight — strongest semantic relation
- `seq` proximity — narrative or sequential continuity
- Least recently visited, globally — surfaces quiet nodes
- Random sample within a weight band — variety without steering
- A deliberate mix: a majority by weight, a reserved minority of quiet
  nodes

This bears directly on the famous-node-collapse mitigations already
documented — equal-weight seeding, fragmentation of famous texts, inclusion
of quiet nodes in every browsing panel [4]. A cap that always favours the
most-connected nodes is a preferential-attachment amplifier by another
name.

It also touches the non-coercion principle. The interface may reveal what
is near the user but must never steer toward a designed destination. At 24
slots out of 300, the ordering rule *is* the steering mechanism, whether or
not it is intended as one.

This deserves its own session. It should not be settled incidentally as
part of a query-writing exercise.

---

## 6. Questions for CC

Primary:

1. **Does the current viewer replace or accumulate?** When the user
   navigates from one node to another, is the previous hop's collection
   cleared from `cy`, or does it remain? If it accumulates, does anything
   bound the growth across a long session? This single question determines
   whether any further architecture is ever needed.

2. **What is the actual per-hop latency**, measured over the tunnel from an
   iPhone — from click to rendered graph? Broken down into query time,
   transfer and render if that is practical to instrument.

Secondary — useful but not blocking:

3. What is the present per-element payload in bytes as served, and how much
   of it is `source_text`?

4. What is the largest fan-out in the database — the maximum TextNode count
   on any single Cluster via `CLUSTER_REL`? This sizes the gap between what
   exists and what is shown, and therefore how consequential §5 is.

5. Confirm the `DESCENDS_FROM` direction as implemented. Recollection is
   parent-to-child, i.e. `(f:Family)-[:DESCENDS_FROM]->(c:Cluster)`, which
   reads backwards from the relationship name. A query written against the
   wrong assumption fails silently by returning nothing.

6. Is session and draft state persisted to IndexedDB? See §3.6 — this is
   the one item here representing a present risk rather than a future
   consideration.

---

## 7. Conclusion

There is no scaling wall. The viewer's working set is bounded by the
interaction model rather than by any budget, and remains flat as the corpus
grows. Provided hops replace rather than accumulate, the architecture
already in place will carry a corpus two orders of magnitude larger than
the present one without modification.

The genuine open questions are not about capacity. They are about
*selection* — which of a Cluster's many members a wanderer is shown — and
that is a curation and ethics question rather than an engineering one.

---

## References

[1] Apple Developer Forums, WebKit tag. Report of
`com.apple.WebKit.WebContent` terminated by jetsam at an ActiveHard limit
of 2048 MB on iPhone 17 Pro (12 GB RAM), iOS 26.3–26.4.1.
https://developer.apple.com/forums/tags/webkit

[2] Catch Metrics. *Deep Dive: RAM Internals in WebKit.* On the interaction
of WebKit's MemoryPressureHandler with the iOS jetsam subsystem, and the
300–450 MB practical range for web pages on iOS.
https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit

[3] Apple Developer Forums, thread 735018. Report of
`com.apple.WebKit.GPU` terminated for highwater at 316–522 MB.
https://developer.apple.com/forums/thread/735018

[4] ButterflyDreaming — Graph Sub-Project Handover, v1.0, May 2026.
Section 6.6, preventing famous-node collapse.

[5] ButterflyDreaming — Handover v7 and associated schema reference, for
the current relationship vocabulary: `CONTAINS`, `DESCENDS_FROM`, `CHILD`,
`PART_OF`, `CONTAINS_CLUSTER`, `CLUSTER_REL`.

---

*End of brief. No implementation is proposed at this time.*


---

# CC analysis

**Added 23 August 2026 by Claude Code.** Verification of §6's questions against
the live codebase and Memgraph instance, plus a full design for the draft-loss
mitigation in §3.6.

**Nothing here is implemented.** It is written to be actionable later without
re-deriving any of it. See §CC.9 for what will need revising after the
pair-agreed-edit work lands.

Every figure below is measured unless explicitly marked as an estimate.

---

## CC.1 The headline correction: the viewer does NEITHER

§2 frames the choice as accumulate vs replace, and §7 concludes the
architecture will scale "provided hops replace rather than accumulate".

**It does neither.** The viewer loads the entire corpus at boot and never adds
or removes anything afterwards:

```cypher
MATCH (n)-[r]->(m) RETURN n, r, m      -- no label, no type, no LIMIT
```

Then `cy.elements().hide()`, and every navigation is pure `show()`/`hide()`
over that fixed set. `saveState` snapshots visible **ids**, which works only
because elements are never destroyed.

| measured | |
|---|---|
| nodes | 477 |
| edges | 2,706 |
| **elements permanently resident in `cy`** | **3,183** |
| elements typically visible | ~24 |

§2's own observation — *"a 500-element graph displaying 24 of them still pays
redraw and hit-test across all 500"* — is therefore already true here at six
times that example.

**Consequence for §7.** The conclusion is unearned as written. At 100x the
present corpus the client would hold ~47,700 nodes and ~270,600 edges from the
first frame. The wall is real; it is simply not where the brief looked. The
brief's *direction* is right — an interaction-bounded working set is the
answer — but that is work not yet done, not a property already held.

The machinery is half-built and idiomatic: `fetchNodeByUrl` + `addFetchedRows`
is already a one-hop loader with correct id discipline and a both-endpoints
guard. What is missing is a narrower boot query and an eviction path. See
repo-root `edge_model.md` §7.

---

## CC.2 Payload: the real number is the WIRE cost, not the stored size

This is the most important correction, because at scale the corpus is ~99%
TextNodes.

### Per TextNode, stored properties (211 TextNodes measured)

| | JSON bytes |
|---|---|
| mean | **1,598** |
| median | 1,547 |
| p90 / p99 | 2,572 / 3,488 |
| max | 4,055 |

### The multiplier nobody was counting

`MATCH (n)-[r]->(m) RETURN n, r, m` returns **both endpoints of every edge**, so
a node is serialised once per incident edge.

- TextNode mean degree: **12.597**  (max 89)
- Total TextNode serialisations per boot: **2,658** for 211 distinct nodes

**Effective wire cost per TextNode: 1,598 x 12.6 = ~19.7 KB.**

The 10 KB/node figure in §1 was therefore not pessimistic — it was **half** the
real figure. §2's dismissal of it ("mostly avoidable payload", "2-4 KB
overhead") measured stored text rather than transferred bytes. So did CC's
first review pass. Correcting it changes the conclusion.

### `raw_text` is a verbatim duplicate of `text`

Of the 198 TextNodes carrying both, **198 are byte-identical (100%)**. Together
they are **76%** of the payload — every passage is shipped twice.

| per TextNode | bytes | change |
|---|---|---|
| as served today | 1,598 | — |
| without `raw_text` | 998 | −38% |
| without `raw_text` and `text` | 384 | −76% |

### Boot transfer, TextNodes only

| corpus | today | deduped | + no `raw_text` | labels only |
|---|---|---|---|---|
| 211 (present) | **4.1 MB** | 0.3 MB | 0.2 MB | 0.1 MB |
| 2,110 (10x) | 40.5 MB | 3.2 MB | 2.0 MB | 0.8 MB |
| 21,100 (100x) | **405 MB** | 32 MB | 20 MB | **7.7 MB** |

---

## CC.3 Memory or latency? Latency, by roughly 10x

Answering the question directly, since §1 and §3.1 disagree about which matters.

**Transfer is the binding constraint, and it bites about an order of magnitude
sooner than memory.** Transfer costs ~19.7 KB per TextNode; storage costs
~1.6 KB of data plus Cytoscape's own per-element overhead. Transfer is the
larger figure, it is all incurred at once at startup, and it crosses a network.

At 10x the corpus the boot download is ~40 MB — painful on mobile, while memory
is still comfortable. At 100x it is ~405 MB and simply fails. Memory would
eventually matter too; you would never get there.

**Note for future readers:** the duplicated payload is *not* stored 12.6 times.
The client dedupes into `nodesById` / `edgesById` Maps before constructing the
graph. The waste is entirely in transfer, which is why it is the cheaper of the
two problems to fix.

---

## CC.4 The three fixes, in value order

| # | change | saving | behaviour change | difficulty |
|---|---|---|---|---|
| 1 | Send each node once, not once per incident edge | **~12.6x** | none | low — query/serialisation only |
| 2 | Stop sending `raw_text` | **~2x** | none | trivial |
| 3 | Send `text` only when a node is opened | ~2.6x | one small fetch on tap | moderate |

Combined: **~50x**, turning 405 MB into ~7.7 MB at 100x corpus.

Fixes 1 and 2 are pure wins with no user-visible effect. **§3.2 rates payload
thinning "worth doing; not urgent" — it is in fact the LEAST valuable of the
three**, and the two more valuable ones are easier.

Only beyond that does the architectural change (stop loading the whole graph at
boot) become necessary. That one is genuinely hard, because much of the current
design depends on total residency: id-based back-navigation, hide/show
navigation, and Blue Node resolution against always-present nodes.

---

## CC.5 Answers to §6

**Q1 — replace or accumulate?** Neither. See CC.1.

**Q2 — per-hop latency.** Not measured; needs instrumenting on-device. Note the
question is less central than the brief assumes, because navigation currently
performs **no fetch at all** — it is hide/show over the resident graph. The one
exception is `handleGatewayClick`, which does query, but binds `r` and never
uses it; the rows resolve only to a visibility decision. Per-hop latency becomes
the right metric only *after* fix 3 / the architectural change.

**Q3 — per-element payload.** CC.2. Mean 1,598 B stored, ~19.7 KB on the wire,
76% of it two copies of the same text.

**Q4 — largest fan-out.** Max **162** TextNodes on one Cluster
(Questioning/Doubt); mean **15.6**. Only **15 of 105** clusters exceed 24, and
**6** exceed 50. This makes §5 more tractable than it reads: a cap of 24 bites
on a handful of hubs, not on most of the corpus. The *principle* stands intact.

**Q5 — `DESCENDS_FROM` direction.** The recollection is right about the dominant
case and **wrong about consistency**:

| from → to | count |
|---|---|
| Family → Cluster | 279 |
| Family → Family | 102 |
| Entry → Family | 6 |
| **Cluster → Family** | **2** |
| Entry → Entry | 1 |

`viewer.js` already knows this — there is a comment reading *"Edge direction is
inconsistent in the DB (some stored child→parent, some parent→child)"* — and it
matches on **either** endpoint throughout. A query written to one direction
fails silently on those 2 edges, which is the exact failure mode §6 warns of.

**Q6 — IndexedDB?** No. `indexedDB` appears **zero** times. `localStorage.setItem`
appears exactly **twice**: breadcrumbs, and (since 22 Aug) the curation code.
**Draft card text is not persisted at all.** See CC.7.

---

## CC.6 Corrections to §4 (Blue Node)

CC implemented the BN on 21–22 August, so these are from the code rather than
from reading.

**§4's residency test would cause the bug §4 warns about.** It prescribes:

```js
cy.getElementById(partnerFocusId).length > 0
```

In this architecture **every node is permanently resident**, so `.length` is
never 0 — the BN would *always* halo and never park in the corner. The correct
test is **`.visible()`**, which is what the implementation uses. §4 names the
worst bug class here ("a corner marker for a node visibly on screen") and then
specifies the check producing its mirror image.

**Holds up as written:** "pin against replacement" (implemented as a re-assert
on the frame after each of the six view-clearing sites); "exactly one per
client"; and the emergent mutual-convergence observation, which is correct and
is the best paragraph in the brief.

**Over-cautious given current architecture:**
- The corner-BN neighbour-id cache is unnecessary — all edges are resident, so
  `connectedEdges()` is a free local call. It becomes necessary only after the
  architectural change.
- Capping radiating edges at 5–8 is less pressing than stated: edges are drawn
  only where **both** endpoints are visible, so the count is bounded by the ~24
  visible nodes, not by the 162-edge hub. Still sensible; not urgent.

**Known open (22 Aug):** a thin dark line between the white and blue rings when
both marks coincide. Overlapping the strokes did not fully clear it. Next
suspect is the blue's 0.4 outline-opacity darkening toward its edge — a colour
problem, not a geometric one.

---

## CC.7 Draft loss — full design (the one present-tense risk)

§3.6 is right that this is the only item representing a risk today. Two
findings sharpen it considerably.

### CC.7.1 The kill is not the main threat

**iOS Safari discards backgrounded tabs as routine housekeeping**, not only
under memory pressure. Switching apps for a few minutes and returning reloads
the page. That needs no memory crisis, happens constantly on a phone, and has
**exactly the same consequence** as a jetsam kill. Guarding only against
out-of-memory would miss the common case.

### CC.7.2 What is actually lost is worse than "a draft"

`buddy_card` is explicitly pure pass-through with **no server persistence**. So
a reload loses not only what the local user was writing but **everything the
partner sent** — and there is nowhere to recover it from. This is the strongest
argument for the mitigation.

### CC.7.3 There is no warning, and none is obtainable

A jetsam kill is a SIGKILL to the WebContent process: no `pagehide`, no
`beforeunload`, no `visibilitychange`, no catchable exception. Safari also
exposes neither `performance.memory` nor `navigator.deviceMemory`, so the
approach to a limit cannot be detected either. **Nothing can be done on the way
down.**

What IS available:
- **The server sees it** within the ping timeout; the 65 s grace-period purge
  then tears the pair down and notifies the partner. The partner is not left
  hanging.
- **The reload is the moment to act.** Safari re-loads the tab when the user
  returns; that is a fresh boot with our code running, and where the "you were
  interrupted — here is your work back, rejoin?" invitation belongs.
- After a kill the pair is genuinely gone (new viewer id, pairing already torn
  down), so the invitation is "press Join again" — and the partner must too.

### CC.7.4 Agreed design

Settled with the user, 23 August:

- **Cadence:** write every ~5 s when something has changed, plus a final flush
  on `pagehide`. Per-keystroke saving is over-engineering for an event this
  rare.
- **Restore:** automatic, with a system card announcing it, so the user is not
  disoriented.
- **Clearing:** breadcrumbs AND panel cache cleared on explicit exit (Leave), for
  anonymity.
- **Expiry:** 3 hours, on both, as the backstop.

### CC.7.5 Crash detection — the dirty flag

1. On boot, set a flag in localStorage meaning "session in progress".
2. On explicit clean exit, clear the flag **and** the caches.
3. On boot, a snapshot found **with the flag still set** means the previous
   session never exited cleanly → restore it.

### CC.7.6 THE TRAP — `pagehide` must SAVE, never CLEAR

On iOS, `pagehide` fires when a tab is merely **backgrounded**. If clearing hung
off it, the cache would be wiped at precisely the moment it is needed.

Therefore:
- `pagehide` → final flush (save).
- Clearing → only an explicit user action (Leave / finish), plus the 3-hour
  expiry.

This means "normal exit" is really "the user said they were done" rather than
"the tab closed", because the web cannot reliably distinguish a close from a
background. That is an accepted trade; the expiry covers the remainder.

### CC.7.7 What to store

One key, an ordered array of `{kind, label, text}` covering the Current card and
the History stack, capped at ~30 most recent.

Priority if trimming is ever needed:
1. **Local draft text** — the user's own words, irreplaceable.
2. **Received partner cards** — irreplaceable, not stored server-side (CC.7.2).
3. Helper/system cards — regenerable, lowest priority.

`localStorage` is the right home to begin with: synchronous, simple, and card
text is tiny against its limit. IndexedDB is more robust and asynchronous but is
a great deal more machinery for a few kilobytes; move only if the snapshot ever
grows to include media.

---

## CC.8 Memory headroom — how far off is the tab killer?

Comfortably far. Every accumulator is bounded:

| | |
|---|---|
| Graph | 3,183 elements — a few MB, negligible |
| **mp3s (57.4 + 63.1 + 0.8 + 0.1 MB)** | **Streamed via `<audio src=…>`, NOT decoded.** This is the one that could have been catastrophic: 63 MB of MP3 decoded to raw PCM exceeds 1 GB and would kill the tab instantly. It is not happening. |
| Baked session tracks | `SESSION_TRACK_CAP = 5`, with `URL.revokeObjectURL` on eviction. Correctly bounded. |

Realistic pressure comes from canvas and Tone.js work in the Fractal and Kolam
modules during a long session — and per §3.6's own citations that is the **GPU**
process, a separate and smaller budget than the page.

**Conclusion:** the memory wall is distant and does not warrant attention. The
data loss in CC.7 does — it arrives by backgrounding, not by memory pressure,
and needs no wall at all.

---

## CC.9 What will need revising after the pair-agreed-edit work

Flagged by the user, 23 August: saving a pair's agreed edit as a new node is
imminent and will change some of the above.

Expect to revisit:

- **CC.7.7 (what to store).** An agreed edit in progress is higher-value than a
  chat draft and may warrant server-side persistence rather than a local
  snapshot — which would change the priority order, and possibly remove the
  need for local caching of that particular state.
- **CC.7.2.** If agreed edits are persisted server-side, the "nowhere to recover
  it from" argument weakens for that content, though it still holds for ordinary
  partner cards.
- **CC.1 / CC.4.** Writing new nodes mid-session adds a second path that mutates
  `cy` at runtime (alongside the four existing DB-mirroring sites). Any future
  eviction policy must not evict a node the user is part-way through editing.
- **§5 (selection).** A growing corpus of user-created nodes changes what "which
  two dozen neighbours" means — new nodes have no `CLUSTER_REL` weight history
  and would be invisible under a weight-ordered cap. This strengthens the
  brief's own argument for reserving slots for quiet nodes.

---

## CC.10 Summary

- The engineering conclusion in §7 is **unearned**; the design conclusion is
  **sound**. The brief should say "this architecture is not yet in place" rather
  than "provided one property holds", because the property does not hold.
- The binding constraint is **transfer, not memory**, and the two most valuable
  fixes are the two easiest, neither of which changes behaviour.
- §5 remains the most interesting question in the document and is **more
  tractable** than it appears (15 clusters, not 105).
- **§3.6 should be promoted above everything else.** It is the only present-tense
  risk, it is confirmed unimplemented, and it arrives by a route the brief did
  not consider.
- Nothing currently being built forecloses any of it. That was the brief's
  actual purpose, and on that it succeeds.
