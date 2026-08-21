# Stable node IDs — spec v0.1, 2026-08-21

Status: **DONE 2026-08-21** (`467c2f7`), test plan §7 passed in full. Kept as
the record of why the change was made and what it removed.

Make the cytoscape node id **the node's durable `url`** (a UUID property written
once at creation) instead of Memgraph's `elementId`.

## 1. Why

`elementId` is the database engine's own handle. It is not stored, and
`viewer.js` records that **the same Cluster or Family comes back with different
elementIds in different query contexts**. The client copes by deduplicating on
`name` and keeping whichever it saw first — and "first seen" depends on result
ordering, which is not guaranteed to match between two browsers.

Consequences today:

- A crumb saying "I am at node 89" can mean a different node on the partner's
  machine. Tapping a partner's Cluster or Family chip could resolve to nothing,
  and `if (!main.length) return;` swallowed it — no error, nothing happened.
  Patched on 2026-08-21 (`d83935b`) by sending `url` alongside; this spec
  removes the need for the patch.
- Every cross-client feature inherits the fragility. The Blue Node
  (`blue_node_spec.md`) is the first whose correctness *depends* on identity
  matching, which is why this comes first.

## 2. Preconditions — both verified 2026-08-21

- **All 393 labelled nodes have a `url`.** (477 total; the 84 without are
  unlabelled orphans that never enter the graph load.)
- **All 393 urls are distinct.**

## 3. The finding that makes this small: NO server change

Every query that mints an id already returns **whole nodes**, so `url` is
present in the properties the client already receives:

| site | query |
|---|---|
| graph load | `MATCH (n)-[r]->(m) RETURN n, r, m` |
| graph load | `MATCH (c:Cluster)-[r]-(f:Family) RETURN c, r, f` |
| graph load | `MATCH (sf:Family)-[r:DESCENDS_FROM]->(f:Family) RETURN sf, r, f` |
| gateway click | `RETURN n, r` |

`buildNodeData` already does `Object.assign({}, props, …)`, so every DB property
including `url` is on the node. **This is a client-only change.**

## 4. What changes

1. **`nodeId(entity)`** — new helper: the flattened `url`, falling back to
   `getElementId(entity)` for anything without one. One place to reason about.
2. **`buildNodeData`** — `id = nodeId(n)`.
3. **`buildEdgeData`** — `source`/`target` = `nodeId(n)` / `nodeId(m)`.
   Edge ids themselves keep their elementId basis and `r_`/`cf_`/`sf_` prefixes:
   edges are never referenced across clients, so their ids need not be stable.
4. **`handleGatewayClick`** — `const id = nodeId(rec.n)` instead of
   `getElementId(rec.n)`. **This is the site that broke the July attempt** (see
   §6) and the one to get right.
5. **Delete the name-based dedup block** (~36 lines: `clusterIdByName`,
   `familyIdByName`, `canonicalNodeId` and the edge-rewrite loop). Two query
   contexts returning different elementIds for one Cluster now produce the same
   `url`, so `nodesById` collapses them automatically. The workaround existed
   only because the id was unstable.
6. The four `clusterIdByName.get(...) || getElementId(...)` fallbacks in the
   cf/sf loops become plain `nodeId(...)`.

## 5. What does NOT change

- Server queries, payloads and routes.
- Edge ids and their prefixes.
- `resolveChipNode`'s url-first lookup (`d83935b`) — it becomes redundant, since
  `node.id()` will BE the url, but is harmless and keeps older cached crumbs
  working. Remove later, not in this pass.
- Persisted breadcrumb caches hold old elementId-based `mainId`s. They will miss
  and fall back — acceptable, and self-healing on the next hop. Noted so the
  first-run behaviour is not mistaken for a bug.

## 6. The risk, already recorded in the code

> *2026-07-04: TextNode dedup was tried and reverted — it broke
> handleGatewayClick's path, which uses raw DB elementIds from a follow-up
> Cypher query. Any future TextNode dedup must also canonicalise IDs at every
> DB-query result site, not just at graph-load time.*

That is exactly this failure mode. The July attempt canonicalised at load time
only, leaving follow-up queries speaking elementIds — so ids from the two
sources stopped matching. **This spec avoids it by construction**: `url` is used
at every site, load and follow-up alike, so both sides speak the same identifier
with nothing to translate.

**The rule for this pass: no site may mint a node id from `getElementId`.** Any
remaining call is either an edge (fine) or a bug.

## 6a. Measured before implementing (2026-08-21)

- **Node count unchanged.** 477 nodes enter the graph under both schemes — the
  new ids partition exactly as the old ones did.
- **The elementId conflict is not currently reproducing.** Across all three load
  queries, 388 urls each map to exactly ONE elementId. So the dedup block was
  defending against a condition this dataset does not presently exhibit. It was
  still right to keep until now — the comment says it HAS occurred — and url
  makes it impossible rather than merely absent.
- **42 edge rows have a url-less endpoint.** These are the 84 unlabelled orphan
  nodes; they are connected, and they DO enter the graph today via the
  unlabelled `MATCH (n)-[r]->(m)`. `nodeId()`'s fallback to `getElementId` keeps
  them distinct and behaving exactly as before — without it they would all
  collapse to a single id and take the graph with them. **The defensive fallback
  is load-bearing, not decoration; do not remove it.**

## 7. Test plan

1. Graph loads; node count matches (393 labelled nodes, no duplicates, no
   orphan edges).
2. Tap through Root → Family → Cluster → TextNode.
3. **Gateway click** — the July failure point. NOT the snake view: that comes
   from tapping the grey TITLE node (`handleTitlePageTap`). The gateway runs a
   FOLLOW-UP Cypher query after load and matches its results against nodes
   already in cytoscape, revealing the work's content nodes connected to that
   cluster. If load-time and follow-up ids disagree, `showIds` matches nothing
   and the reveal is silently empty — no error, just nothing. Test both, since
   the title path also resolves ids.
   **PASSED 2026-08-21** — user confirms gateway and title both behave as
   before.
4. Cluster clone and node-text save still resolve their targets.
5. Breadcrumbs: tap a chip in your own trail; tap a partner's Cluster chip
   (the bug this fixes) across two browsers.
6. Layout hints still apply — they are keyed per edge and viewing parent, and
   the parent uuid is already a url, so this should be unaffected. Verify.

### 7.1 Result — 2026-08-21

Items 1, 2, 3 and 6 pass. Gateway and title clicks behave exactly as before,
navigation is normal, and the forwarded client console shows no errors since the
new build (31 hint-scan lines, so layout hints are running — item 6).

**Item 5 PASSES (2026-08-21).** Two browsers: clicking Cluster A in one raises
Cluster A in the other's remote panel; clicking THAT opens it and raises Cluster
A back in the first. The round trip completes, which it could not reliably do
before — a Cluster's cy id was per-client. **This pass is complete.**

## 8. Rollback

Single commit, client-only, no data migration. `git revert` restores the
previous behaviour exactly; nothing in the database changes, so there is no
state to unwind.
