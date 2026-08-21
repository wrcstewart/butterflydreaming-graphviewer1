# Blue Node (BN) + graph sync — spec v0.1, 2026-08-21

Status: **pre-implementation, but all four open questions are now CLOSED
(2026-08-21). Ready to build against §9's order.** Red-line anything that still
looks wrong before code is written.

The arriving remote breadcrumb becomes a node on the local user's own graph,
edged in blue, instead of a panel beside it. Two parts, deliberately separable:

- **§1–§6 the BN** — the user-facing feature.
- **§7 graph sync** — the timestamp/delta primitive the BN needs when the remote
  references a node this client has never loaded. Infrastructure: it also fixes
  breadcrumb restore and deep links, and could be built first and alone.

Measured facts this rests on (2026-08-21): 477 nodes, 2,706 edges, Memgraph
3.2.1. The whole graph is loaded into cytoscape at boot and navigation works by
`cy.elements().hide()` then `.show()`, with `layout: 'preset'`. Adding a node to
the live instance is already done in three places, including a real Cluster
arriving from a server push (`handleClusterCloned`, `viewer.js:4140`).

## 0. Why

The remote trail is the one thing a user cannot zoom, and where the partner is
sits at the centre of the conversation. Putting it in the graph rather than in
chrome means the local user is, to a small extent, directly sharing the
partner's position rather than reading a report of it. It also solves the
readability problem the enlarged panel was straining at: a real node renders at
its natural size with its full label.

## 1. What a BN is

A node **already in `cy`**, shown with a blue halo (`.bn` class). Not a new
element, not a copy — the same graph node the partner is on. That is what makes
"tap it and it becomes your central node" honest rather than a simulation.

- One BN at a time.
- Never a fill: the node keeps its own type colour, so the blue is an
  annotation on top rather than a recolouring.

### 1.1 An OUTLINE, not a border — and a low-opacity halo

Use cytoscape's `outline-*`, not `border-*`. Verified 2026-08-21: the CDN's
`cytoscape@3` resolves to **3.34.1**, whose build implements `outline-width`,
`outline-color`, `outline-offset`, `outline-opacity` and `outline-style`.

```
outline-width:   6
outline-color:   <blue>
outline-opacity: ~0.4          /* halo, not a ring */
outline-offset:  2             /* stands off the node */
```

Why an outline rather than a border:

- **Borders straddle the shape's edge**, half inside. That interior half is
  already a known nuisance here: the central-node border comment (2026-08-17)
  records 5px "nibbling tight labels (e.g. SubFamily)", and it is what pushed
  the Cluster count badge under the frame on 2026-08-19. An outline takes none
  of the node's interior, so the label — the whole point of showing the
  partner's position — is untouched.
- **It does not compete with the node's own border.** Clusters carry a 2px
  darkened-colour border already; an outline sits clear of it, so the node keeps
  its identity and the blue is unambiguously an annotation.
- **It composes with the white "you are here" border.** On tap the outline drops
  and the white border applies; they occupy different space, so there is no
  conflict to resolve.

On the low opacity and [[user-colour-vision]]: a faint halo would normally be
the wrong call, but here the cue is **geometric, not chromatic** — a ring exists
where other nodes have none. Presence carries the meaning; blue only says whose.
That is why low opacity is safe here in a way a low-opacity fill would not be.

**Caveat to remember:** an outline is NOT counted in `renderedBoundingBox` the
way a border is. Anything positioned from a node's box — the count badge, the
arrow docks, the extend panel — will not account for the halo. Given the badge
fix of 2026-08-19 was precisely about a border eating into that box, this is a
difference to remember rather than rediscover.

**Related, not urgent:** the same `outline-*` swap would retire the straddling
border everywhere and cure the label nibbling at source. That was worked around
on 2026-08-19 (the badge now measures the live border width), so it is a
cleanup, not a fix — but it changes the apparent size of every bordered node, so
it wants its own pass rather than being slipped in with the BN.

### 1.2 Agreement — when you are both on the same node

The round-trip case (§8.2, closed): the partner is on the node you are centred
on, either because they followed you there or because you went to them. This is
not an awkward collision to suppress — it is a state worth showing, and the pair
will want to know it.

**Both marks co-exist.** A border straddles the node's edge; an outline sits
outside it. They occupy different space by construction, so the node simply
wears two rings. That reads as "both of us are here" with no new vocabulary and
no reliance on hue.

**THE RULE: the OUTER ring is whoever arrived last.**

| | inner (border, 4px) | outer (outline, 6px, offset 3) | reads as |
|---|---|---|---|
| **A.** you were here, they arrive | white — yours | **blue** — theirs | they came to me |
| **B.** they were here, you arrive | blue — theirs | **white** — yours | I went to them |

**How to remember it: rings accrete outward, like tree rings. Later is further
out.** The newcomer arrives and wraps around what was already there. Nothing to
memorise beyond that.

Note the pairing is NOT fixed — whichever mark belongs inside is drawn as the
`border`, whichever belongs outside as the `outline`. An early draft of this
spec assumed white was always the border and blue always the outline, which
would have made the order un-encodable; it is not so.

**Two consequences, accepted knowingly:**

- **In case B the node loses its own type border.** Clusters carry a 2px
  darkened-colour border; blue-as-border replaces it. The fill still identifies
  the type, so little is lost — but it is a real change, not an oversight.
- **White renders differently in case B** — as an outline standing off the node,
  not the straddling border it is everywhere else in BD. That difference is part
  of the signal, but it will look odd to someone who does not know why, hence
  this paragraph.

### 1.2.1 There is no "agreement state" — do not build one

Agreement decomposes by itself, which is the strongest argument for this design
(user, 2026-08-21). Model **two independent marks**, not a third combined state:

- **You navigate away** → your white moves with you; their blue stays behind.
  The old node reverts to a plain BN, the new one gets your white border.
- **They navigate away** → their blue moves to the new BN (latest-wins); the old
  node keeps your white border and reverts to a plain central node.

Nothing has to be torn down, because nothing was ever assembled. Two marks
happened to coincide; when one moves, its mark moves with it. **Build it as a
state machine with an "agreed" state and you will have to handle every exit from
it by hand — and get one wrong.**

The one piece of state genuinely needed is **per-node arrival order**, so the
rings know which is inner and which is outer. Set it when the SECOND mark lands
on a node; it is meaningless while only one mark is present. Coming back to a
node you left is handled by the same rule with no special case: you are the
newcomer, so your white goes outside.

**Rejected: two shades of blue** to encode who joined whom. Considered and
dropped on 2026-08-21. Two close blues is the hardest possible discrimination
and the weakest available channel ([[user-colour-vision]]) — carrying meaning
there, for a secondary fact, when a geometric channel was available, would have
been the wrong trade. Ring order does the same job on the stronger channel.

Also worth knowing, and an argument against over-engineering this: **in the
moment you already know who moved.** If you tapped, you joined them; if you did
not move and a ring appeared, they came to you. The encoding earns its keep
only AFTER the moment — you look away, come back, and the node still carries
the answer.

## 2. Lifecycle

| event | behaviour |
|---|---|
| remote crumb arrives | that node gets `.bn`, is shown, positioned (§3) |
| another arrives while one is pending | **latest wins** — the old BN clears, the new one shows |
| user taps the BN | it becomes the central node (`handleNodeTap`); the rings re-order per §1.2 case B — blue moves inside, white outside |
| remote arrives on your central node | §1.2 case A — white stays inside, blue outline outside. Never suppress the halo here |
| user navigates elsewhere | **the BN persists** (§5) |
| partner leaves | BN stays, dimmed, matching how the strip dims on `buddy_disconnected` |
| new pair | cleared, as `resetBuddyBar` does |

**Latest-wins, not FIFO** (decided 2026-08-21). A fast-moving partner would back
up a queue of stale positions; the question the BN answers is "where are they
*now*". The remote strip keeps the history — the two do different jobs, and both
are kept (§6).

## 3. Placement

`layout: 'preset'`, so position is free — no layout engine runs and nothing is
re-drawn.

- Hint **bottom-right of the current viewport**, computed from `cy.extent()`.
- Nudge if it lands on a visible node. Simple displacement is enough; this is a
  hint, not a constraint.
- If the node is **already visible**, do not move it and do not duplicate it —
  just add `.bn` where it sits (§5).

## 4. Edges

On arrival, add thin blue edges (`.bn-edge`) from the BN to **nodes already
visible**:

```js
bn.connectedEdges().filter(e => e.source().visible() && e.target().visible())
```

The edges already exist in `cy`, so this is a class change, not a graph change.

**Do NOT import unknown neighbours to make more edges drawable.** A one-hop pull
is cheap (degree-bounded — a sampled Cluster had 17 edges) but it would quietly
add nodes the pair has never visited. The graph should stay a record of where
they have actually been. Edges to unknown nodes are simply not drawn.

## 5. Persistence — the main integration cost

`cy.elements().hide()` appears in **seven places**; every local navigation blanks
the view and re-shows a computed set. Each would hide the BN.

So the BN needs re-asserting after every navigation. **That re-assert must be
idempotent** — this is the same shape as the pane/anchor feedback loop that ran
away on 2026-08-20 ([[kolam-player-chrome]]): a thing that reasserts itself on
every pass must compute the same result every pass, or it spirals.

Open: a persisting BN can end up with no visible neighbours after the user
navigates away, so its blue edges vanish and it floats. Acceptable, or should it
fade? See §8.

## 6. What this replaces, and what it does not

- **Replaces `#buddy-latest`**, the enlarged-copy panel (2026-08-20,
  `dfc5d76`..`bdc3b16`). Retire it with the feature, including `buddyLatestCy`,
  the `.tap-shield` and its CSS. Its unresolved circular-node problem
  (`session_notes_2026-08-20.md` §9) disappears with it — a real graph node has
  no such problem.
- **Keeps the remote strip** (`#cy-buddy`). The trail is history; the BN is the
  live position.
- Chip labels stay truncated at 13 characters (`truncateChipLabel`); the BN
  carries the full name, which is now the reason the truncation is acceptable.
- The panel's gradient, tap-shield and sizing work (2026-08-20) goes with it.
  Nothing there transfers: a graph node needs no shield (the main `cy` already
  handles taps) and no fitting (it renders at its own size).

## 7. Graph sync — the UBN problem

**UBN = a BN whose id this client does not have**, because the node was created
after this client loaded. Today this fails silently: the chip tap does
`if (!main.length) return;` — nothing happens, no explanation.

### 7.1 What to store

Two integer-millisecond-UTC properties, written by the **server's** clock:

- **`updated_at`** — set on EVERY write to the node. This, not `created_at`, is
  what the delta keys on: an edited node is stale for an early-loading client
  just as much as a missing one.
- **`created_at`** — set once.
- **`created_at_estimated: true`** on backfilled nodes, so a later reader cannot
  mistake a retrofit value for a real creation time.

Integers, not the ISO-with-zone string the existing `tagged_at` uses (69 nodes)
— integers compare and index cleanly.

**The timestamp is NOT an identifier.** Nodes already have a durable UUID
(`url`). Making a timestamp unique-by-construction (the "1 ms later than the
last" idea) would oblige every future write to hold that uniqueness — a
serialising counter or a check — for no gain over the UUID. Using 1 ms spacing
during the *backfill* purely to get a stable sort order is fine; relying on it
as identity is not.

### 7.2 Edges need no timestamps at all

**Bump `updated_at` on both endpoint nodes whenever an edge touching them is
created or changed.** Then:

- the delta is a NODE query only — one indexed lookup;
- each returned node's edges are fetched by degree-bounded lookup;
- an edge added between two *old* nodes still surfaces, because both endpoints
  were touched.

No edge timestamps, no edge index, no edge scan — which matters because
scanning edges by property without an index is O(edges), the one part of this
that would not have scaled. (`server.js:1298` is the case that motivated it: a
`CLUSTER_REL` between two pre-existing nodes. It is curation, now behind
`CLUSTER_ASSIGN` and moving to the curator tool, but the endpoint-bump makes the
exception irrelevant either way.)

### 7.3 One endpoint, two uses

```
nodes-since(T)  → nodes with updated_at > T, each with its edges
node-by-url(u)  → that node, with its edges
```

Both return edges only to nodes the client already knows; the client drops the
rest. Cytoscape cannot hold a dangling edge, so this is a constraint, not a
choice.

The BN repair and the delta sync are therefore **one piece of work**.

### 7.4 Deletions — decided, not overlooked

Users cannot delete. Deletion requires a reload. **No tombstones, no
`deleted_at`.** A delta can add and update but never remove; that is accepted
because the situation is rare and a reload is bearable. Revisit if curator-side
deletion ever reaches live clients.

### 7.5 Index

Label-property index on `updated_at`. Without it the delta is a full scan —
irrelevant at 477 nodes, not irrelevant later.

## 8. Questions raised and settled

All four closed on 2026-08-21. Kept with their answers rather than deleted: the
reasoning is the useful part, and it stops each one being re-opened from
scratch.

1. ~~A BN with no visible neighbours.~~ **CLOSED 2026-08-21: leave it floating,
   fully visible.** It is also the legible copy of the last remote crumb — the
   job `#buddy-latest` used to do — so fading it would quietly remove the thing
   it replaced. The edge structure signals relevance on its own; the halo does
   not need to.
2. ~~Round trips.~~ **CLOSED 2026-08-21 — see §1.2.**
3. ~~Provisional BN.~~ **CLOSED 2026-08-21: show NOTHING, and say so.** No
   provisional node — one that cannot honestly become your central node when
   tapped would be a lie the moment it is pressed. Instead
   `prependSystemCard(...)` in the main panel (`viewer.js:2664`, BD's existing
   way of speaking to the user) explaining that the partner is somewhere this
   graph does not have yet. Silence is the one thing to avoid: today the chip
   tap already fails silently via `if (!main.length) return;`, which is the
   behaviour this replaces.
4. ~~Mode switch.~~ **CLOSED 2026-08-21: yes, it survives and shows on return.**
   Cheap if `.bn` is a class on the node rather than state rebuilt on entry —
   the node keeps the class while `#cy` is hidden. Latest-wins applies
   throughout, so crumbs arriving during Player mode are not queued: the last
   one is what shows on return.

## 9. Build order

1. `updated_at` / `created_at` on new writes (§7.1) — small, no risk, no
   behaviour change.
2. Backfill 477 nodes via `bd_tool.js`, so it inherits the pre-flight backup
   ([[backup-safety]]).
3. Index (§7.5).
4. The endpoint (§7.3).
5. The BN itself (§1–§6), retiring `#buddy-latest`.

Steps 1–4 stand alone and are worth having regardless of whether the BN ships.
