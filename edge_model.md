# BD edge & cluster model — how relationships actually reach the graph

**Written 2026-08-21.** Prompted by a suspicion that some relationships were
"presented by carrying out a live query and simulating the edges … to avoid too
many edges". **That system does not exist.** This document records what is
actually there, so the question does not have to be asked again.

Everything below was verified against the running Memgraph instance and the
cytoscape 3.34.1 source, not inferred from comments. Where something is a
hypothesis it says so.

## 0. How this was established — and how to disprove it

Worth stating, because "there is no simulation" is a claim about CODE and could
not be settled by looking at the database. The layers were checked separately:

| Claim | Evidence | Layer |
|---|---|---|
| All edges resident at boot | the boot query string has no label/type/LIMIT | viewer.js |
| Navigation never creates edges | every nav function is `hide()`/`show()`; 4 runtime `cy.add` edge sites, all mirroring a committed DB write | viewer.js |
| Nothing is synthesised client-side | grep for edge construction (`target:`) → 7 hits, every one accounted for | viewer.js |
| Nothing is synthesised server-side | `server.js` never constructs a `source`/`target` pair — **zero** hits; the query channel runs the client's Cypher verbatim and `serializeRecord` is a pure key-by-key mapping | server.js |
| Gateway→Cluster edges are stored, not derived | 227 rows of the real relationship | Memgraph |

Only the last row is a database fact. **The database could never have shown the
absence of simulation** — that had to come from the client and the server.

**The falsifiable cross-check.** The DB holds **2,706** relationships
(2026-08-21). If every edge is resident and nothing is invented, then in the
browser console:

```js
cy.edges().length        // expect ≈ 2706
```

Materially **lower** ⇒ the boot load is selective after all and this document is
wrong. **Higher** ⇒ something is synthesising edges. Re-run the count with
`node bd_tool.js cypher "MATCH ()-[r]->() RETURN count(r) AS total"` first, since
curation writes move it. *Not yet run in a browser — stated so it can be.*

---

## 1. The headline: every edge is resident from boot

`init()` (viewer.js ~4692) runs three Cypher queries in parallel. The first is:

```cypher
MATCH (n)-[r]->(m) RETURN n, r, m
```

No label. No type. No `LIMIT`. **This matches every directed relationship in
the database**, so the entire corpus of edges is loaded up front as real
cytoscape edge elements.

The other two are *not* extra coverage — they are direction normalisers for
edges the first query already returned, re-minted with `cf_` / `sf_` id
prefixes while the `r_` copy is deleted from the dedup Map:

```cypher
MATCH (c:Cluster)-[r]-(f:Family)               RETURN c, r, f   -- 'clusterFamily'
MATCH (sf:Family)-[r:DESCENDS_FROM]->(f:Family) RETURN sf, r, f  -- 'subfamilyLinks'
```

`clusterFamily` is the one place edge *direction* is imposed by the client
rather than mirrored from the DB (source forced to the Cluster).

Immediately after construction:

```js
cy.elements().hide();
root.show();
```

**That single line is the entire view mechanism.** The full graph is resident
and hidden; each view un-hides a computed subset. Navigation never creates or
destroys anything — `expandToNode`, `expandToFamily`, `expandChildLevel`,
`expandToCluster`, `handleGatewayClick`, `handleTitlePageTap` and
`restoreState` all follow the same `hide()`-then-`show()` shape. `saveState`
snapshots visible **ids**, which only works because elements are never
destroyed.

There are exactly five Cypher strings in all of viewer.js. Nothing else in the
client talks to the database.

## 2. What is in the database (verified 2026-08-21)

```
CLUSTER_REL       1640
DESCENDS_FROM      390
CHILD              245
CONTAINS_CLUSTER   227
PART_OF            188
GATEWAY_LINK         9
CONTAINS_HELPER      5
CONTAINS             2
```

Every one of these is a stored relationship. None is synthesised.

### Gateway → Cluster edges are explicit

All 227 `CONTAINS_CLUSTER` relationships are uniform:

```
(:TextNode {gateway: true}) -[:CONTAINS_CLUSTER {count}]-> (:Cluster)
```

**The edge is stored; the `count` PROPERTY is derived** — auto-computed from the
CLUSTER_REL fan-in and refreshed by the server, feeding the gateway badge. That
distinction is probably the source of the "derived association" memory. See
[[ingest-workflow]]: bulk inserts skip the server's automatic `n_r` refresh, so
the counts go stale unless the UNWIND refresh is run afterwards.

### GATEWAY_LINK has no style rule at all

9 relationships, all `(:TextNode)-[:GATEWAY_LINK]->(:Entry {name:"Gateways"})`,
three of them the media modules (`bd_V_Kolam`, `bd_M_ABC`, `bd_M_Fractal`).
**`buildStyle` has no selector for this type**, so it falls through to the
generic `#666666` fallback in `buildEdgeData`. It is loaded like everything
else and therefore already drawn somewhere in default grey. Not investigated
further — flagged, not fixed.

## 3. Runtime edge changes — four adds, one remove

Nothing navigation-driven. Every one mirrors something the server already
committed, except the last:

| Site | Type | Trigger |
|---|---|---|
| viewer.js:4391 `handleClusterCloned` | DESCENDS_FROM | server `cluster_cloned` |
| viewer.js:4430 `handleClusterRelMsg` | CLUSTER_REL | server `cluster_rel_saved` |
| viewer.js:4470 `handleClusterRelMsg` | CONTAINS_CLUSTER | first association only |
| viewer.js:4682 `addFetchedRows` | any | Blue Node partner sync (§7.3) |

The only removal is `cluster_rel_deleted` (viewer.js:4437). **No view teardown
removes edges** — `exitSnakeView`, `clearFamilyView`, `restoreState` only
toggle classes, styles and visibility.

Synthetic elements that DO exist are all **nodes**: `ClusterEditChip` and the
breadcrumb chips in `youCy`/`buddyCy`. They carry no edges in the main graph.

## 4. Three fossils that explain the false memory

The suspicion was well-founded — these are what it attaches to:

1. **`handleGatewayClick` (viewer.js:3309) really does run a live query during
   navigation.** It binds `r` and then *never uses it*. The rows only build a
   Set of node ids; the edges shown come from the resident graph via
   `cy.edges().filter(both endpoints visible).show()`. The strongest single
   piece of evidence for the resident model: even the one navigation-time
   round-trip resolves to a **visibility** decision.
2. **`__root_edge__`** — has a stylesheet rule reading *"Synthetic root→family
   edges: invisible but present for fCoSE layout"* (viewer.js:1185) and a
   filter at 3207, but **nothing anywhere constructs one**. The fossil of
   exactly the client-side synthetic-edge idea being remembered.
3. **`fetchNodesSince`** (viewer.js:4650) is fully written and has **zero call
   sites**.

Several types are also styled `opacity: 0` — present but never drawn. "Avoiding
too many edges" was done by *hiding*, not by *not loading*.

## 5. What this meant for the Blue Node's blue edges

The premise was sound — `connectedEdges()` does see every real relationship —
but the implementation was broken in the opposite direction, and worse.

**Blue edges were never drawn at all.** `cy.elements().hide()` sets
`display:none` on everything; each view shows only what it computed; the BN was
never in that set, because `placeBlueNode` shows the **node** alone.
`markBlueEdges` only added a class — and a class sets `line-color` and
`opacity`, it **cannot undo `display:none`**. Every blue edge was landing on an
invisible element. The feature looked built and did nothing, with no error.

Fixed in `fb19717`: it now shows the edges and records which ones it revealed,
so retiring puts back exactly those and leaves the view's own edges alone —
the same asymmetry that had made blue *nodes* pile up, one layer down.

**Second, latent:** `edge.bn-edge` sits LATER in the stylesheet (1342) than
`edge[type="CONTAINS_CLUSTER"]` (1192), so on equal specificity it wins.
Marking one would have overridden that deliberate `opacity: 0` and drawn a
structural line the graph is meant never to show. `CONTAINS_CLUSTER` and
`__root_edge__` are now skipped via `BN_EDGE_SKIP`.

**Consequence to accept:** a Blue Node connected only by gateway→cluster shows
no edges. That is correct, not a gap — those links are invisible in ordinary
viewing too.

## 6. Cytoscape rendering facts established the same day

Read from the 3.34.1 source rather than assumed. These cost several wrong
guesses; they are worth keeping.

- **`outline-offset` is measured from the node BODY, not from the border.**
  Internally `r = outline-width + outline-offset`, stroked outside the shape.
  The border then paints **over** it (proof: a white border remains visible
  under a 10px blue outline).
- **`border-position`** takes `center` | `inside` | `outside`;
  `outerWidth = width + (center ? bw : outside ? 2*bw : 0)`. So `outside`
  places the whole border beyond the body and takes nothing from the interior —
  which is what stops a mark covering a label.
- **`renderedBoundingBox` grows to include the outline.** This broke the `n_r`
  badge: it was positioned from the box and subtracted only `border-width`, so
  every pixel of halo pushed it outward — 1px outside the fill under a solo
  blue ring, 3px out and swallowed by the white ring under the Snap. Badges now
  derive from `renderedPosition + renderedHeight/2`, which no outline can move.
- **A class cannot override `display:none`.** See §5.
- **Inline `.style()` persists across branches.** `border-position:'inside'`
  set only in the Snap branch leaked to the plain white-mark branch, which set
  width/colour/opacity but not position — so the white frame drew inward across
  the badge, and only on nodes that had been through a Snap. **The rule:
  every branch sets every property it depends on.**
- Two abutting strokes leave an antialiasing hairline of canvas black between
  them. The Snap rings now **overlap** (offset 2 + width 8, still totalling 10)
  so the blue tucks under the border's inner edge. Visible geometry unchanged.
  *Still slightly visible as of 2026-08-21 — user judged it "thin, prob an
  artefact". If it persists, suspect the blue's 0.4 opacity darkening toward
  its edge rather than a geometric gap.*

## 7. If on-demand edges are ever actually wanted

The machinery is half-built and idiomatic: `fetchNodeByUrl` + `addFetchedRows`
is exactly a one-hop loader, with the both-endpoints-present guard and stable
`r_`-prefixed ids already correct. Missing are (a) a boot query narrower than
`MATCH (n)-[r]->(m)`, and (b) an eviction path — today nothing but
`cluster_rel_deleted` ever removes an edge.

Note the scale first: 2,706 relationships total. There is no evidence this is a
performance problem, and the resident model is what makes `saveState`'s
id-snapshot history work. **Do not narrow the boot query without a measured
reason.**
