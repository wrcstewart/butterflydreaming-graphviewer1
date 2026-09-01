# Views inside a work — gateways, titles, passages

**2026-08-31.** How the viewer presents a work, and why each view shows what it
does. Companion to `edge_model.md`, which is the reference for the relations
themselves.

---

## 1. The three kinds of thing, and their silhouettes

With state now achromatic and content colour living in the label, **shape carries
real load** — it is the only thing distinguishing these at a glance.

| | shape | what it is |
|---|---|---|
| gateway | **diamond** 170 × 38 | the way into a work |
| title page | **octagon**, grey italic | a section heading |
| passage | **round-rectangle** | the text itself |

Three shapes were tried for the gateway and the first two were wrong for reasons
worth keeping:

- **`tag` is ASYMMETRIC** — flat one side, pointed the other — so which face an
  edge left from depended on where the layout put the node. The same
  relationship looked different from one view to the next.
- **`rhomboid` is cytoscape's name for a PARALLELOGRAM**, not a rhombus. A
  skewed rectangle reads as a 3D sheet in perspective on a flat page, and its
  width/height behave as side lengths.
- **`diamond`** has four equal sides and its width and height ARE the horizontal
  and vertical diagonals — so it sits in a rectangle you control, stays flat, and
  is symmetric in both axes.

`cut-rectangle` was tried for titles and rejected: clipping the corners of a
rectangle is a couple of pixels at 34px — the same silhouette with a haircut.

---

## 2. `CONTAINS_SECTION` — the relation that was missing

    (gateway:TextNode)-[:CONTAINS_SECTION]->(title:TextNode {section_title:true})

**`CHILD` meant two things.** It is the linear reading spine (seq *n* → *n+1*),
and Grimms was also using it to hang a second title off its gateway — the only
way "contains this section" could be said at all. Every other work could not say
it, so entering Hardy showed one of its four sections.

Now: **`CHILD` is strictly the spine**, `CONTAINS_SECTION` is containment. The
gateway→first-title edges stay `CHILD` because they genuinely ARE the spine head
(seq −1 → 0); deleting them to keep a naming rule would have broken the chain.

10 edges, every gateway to every title in its work. **New works must create these
at ingest** — the viewer falls back to selecting by `source_text`, so a missing
edge is invisible except that the gateway is not drawn connected to its sections.

---

## 3. Entering a work (gateway, no cluster context)

Shows **the gateway and its title pages**. Nothing else.

It previously showed the gateway's `CONTAINS_CLUSTER` clusters — up to 48 for the
Tao Te Ching. That was a wall, and a **dead end**: nothing about a list of themes
tells you how to begin reading. The title page is the reading entrance —
tapping it gathers the work's passages into the spine — so `gateway → title →
passages` is the path and this is its first step.

---

## 4. A gateway WITH a cluster (the filtered view)

Shows the cluster, the gateway, the work's title pages, and **every passage of
that work touching that cluster**.

### Edges: show only what VARIES

"Show every relationship that exists" produced a moiré. Every passage here links
to the SAME cluster and to its own title, so those hold for everything on screen:
N passages give 2N lines converging on two points. **A fact true of every node
distinguishes none of them.**

Hidden here: `PART_OF`, `CLUSTER_REL`, and any `CHILD` edge touching a title.
Kept: the gateway's links to the cluster and its sections, and the seq arrows
between passages.

**The break where a title sits IS the signal.** A title sits in the sequence
(Hardy's at seq 0, 5, 10, 13), so hiding its spine edges leaves a gap exactly
where a section begins — which says "this starts here" more plainly than a line
into the title, and costs nothing.

### All passages, not just titles — decided deliberately

Titles alone would be tidier. But then reading anything means entering the spine
and expanding one passage at a time, which is cumbersome, and you lose the
ability to scan the set for content **and for other clusters** at a glance. The
field is worth the untidiness.

### The gateway and cluster sit at the top

So the view reads downward: work and theme above, sections and passages beneath.

Positioned **after** layout, against the CONTENT's bounding box — never
`cy.extent()`, which strands them at the window corners when a view is laid out
to roughly the panel width. Re-applied on EVERY layoutstop rather than once,
because a layout already in flight consumes a `cy.one` handler.

---

## 5. A passage view (tap a passage)

Shows the passage, its clusters, its title page and its seq neighbours. **Two of
those edges are marked, and they point OPPOSITE ways — the direction is the
meaning.**

| | head on | because |
|---|---|---|
| `.title-edge` — passage → title | the **title** | that is where you would GO. Every other arrow in the viewer means "click this" (the route step, the reading spine), and this is a navigation route, not a fact. |
| `.fc-edge` — passage → filtering cluster | the **passage** | this IS a fact about it: the theme claims this text. There is nothing to go to. |

Both width 4 at **opacity 0.7**, so they can be seen through rather than blocking
what they cross. The title edge takes the title label's grey, so it belongs to
what it leads to; the FC edge takes the cluster's own colour, **inkified** — the
stored blend is far too dark against black.

Making both terminate on the passage was the first proposal. It would have given
two different meanings the same direction, leaving thickness alone to say which
was navigable. Pointing them opposite ways lets direction carry it: **what points
IN explains the passage, what points OUT is somewhere you can go.**

Directions are set in the STYLESHEET rather than per edge, which is only safe
because the database is uniform — verified: all 188 `PART_OF` run passage→title,
all 1640 `CLUSTER_REL` run passage→cluster. If either were mixed this would need
the per-edge treatment the route arrows use.

Neither is marked while a route view is showing, and both clear on every layout
pass, so they cannot linger onto a view whose centre is not a passage.

### The successor sits horizontally right of the centre

So the next passage is always in the same place and reading feels like reading
rather than searching. The centre and its successor are pinned via fcose's
**`fixedNodeConstraint`**, so the rest of the neighbourhood resolves AROUND them.

**This was first done the wrong way, and the mistake is the useful part.** The
successor was moved on `layoutstop` — after the layout. The simulation therefore
never knew about it: everything else was arranged as though the node were where
fcose had put it, and it was then dropped on top of them. **It collided every
time, and no care in the placement could have helped.** The layout was not
constrained, it was ignored.

> **Placing a node after a layout is not a constraint on that layout.**
> If other nodes must accommodate it, the layout has to be told — which for
> fcose means `fixedNodeConstraint`, not a post-hoc `position()`.

This is the opposite lesson from the gateway/cluster pair, which IS placed after
the layout — and correctly so, because nothing needs to move out of its way: it
sits above the content, in space nothing else occupies. **Post-layout placement
is right when you are moving a node into empty space, and wrong when other nodes
must yield.**

Two details that are easy to get wrong:

- Positions must be handed over as **numbers**. `position()` returns a LIVE
  reference, so a constraint built from one gives the layout a value that moves
  while it solves — the trap that made the August layout pins no-ops.
- Only one mechanism may own a position. The post-layout mover was DELETED
  rather than kept as a fallback: two writers would fight and the later would win
  silently.

### Why the title (snake) view still earns its place

A gateway view shows only the passages matching the filtering cluster. **The
title view shows EVERY passage of the work, in order, with the filtered ones
marked** — which the gateway view cannot show at all. The two are genuinely
complementary and the second cannot be reconstructed from the first.

That is what the marked title edge is for: it makes the alternative route
apparent from inside a passage, rather than something you have to know about.

*(An accidental red lived here until 2026-08-31: `PART_OF` had no colour rule, so
it fell through to `line-color: data(colour)` with nothing to read and took
cytoscape's own default. Nobody chose it.)*

---

## 6. Two traps this work produced

**An undefined identifier in an `async` function is silent.** `clusterNode` is
`expandToCluster`'s parameter; in `handleGatewayClick` the cluster is
`lastClusterNode`. Using the wrong one became an unhandled rejection —
`node --check` cannot see it, the syntax being valid.

It appeared twice at two distances from the throw. Inside a callback it threw at
layout time, so the layout ran and only the placement failed: the pair appeared
BELOW the titles. Moved out of the callback it threw before `runLayout`, so
nothing was arranged at all and everything collapsed onto one point.
**"Renders but wrongly" and "does not render" were the same bug.**

The forwarded client log named file and line immediately. Reach for
`/private/tmp/bd_server.log` BEFORE forming a hypothesis about layout.

**Test against the outlier.** Hardy has four title pages; every other work has
one. The single-title case hid the fault completely.
