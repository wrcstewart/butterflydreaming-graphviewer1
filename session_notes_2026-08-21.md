# Session notes — 2026-08-21

Design day, not a build day. One outcome: **`blue_node_spec.md`**, complete and
ready to build against. Read the spec, not this — these are the notes that do
not belong in it.

## What changed direction

The enlarged remote-breadcrumb panel (`#buddy-latest`, built 2026-08-20) is to
be **retired**. Not because it failed, but because the user proposed something
better: put the arriving remote crumb into the graph itself, as a haloed node.
"To a small extent the local user is then directly sharing with the remote."

That also disposes of the question left open overnight — circular node types
reading badly in the panel — because a real graph node has no such problem.

## Two corrections I had to make mid-discussion

Worth recording, because both were me stating a limit that was not there.

1. **"You cannot add a node without reloading."** Wrong, and the user pushed
   back. BD already does it in three places, including a real Cluster arriving
   from a server push (`handleClusterCloned`). The whole graph loads at boot and
   navigation is `hide()`/`show()` with `layout: 'preset'`, so adding is cheap
   and nothing re-draws. The real gap was narrower: no way to ASK the server for
   a node it does not have.
2. **"Ring order cannot encode who arrived first."** Wrong again. I had fixed on
   white-always-border and blue-always-outline; nothing forces that pairing.
   Whichever mark belongs inside is the border, whichever outside the outline —
   so the user's instinct (blue arrives, blue outside) was buildable all along.

Both times the user's question was better than my answer. Worth remembering that
"is that impossible?" deserves a check, not a recollection.

## The insight that shaped the sync design

Mine was heading for timestamped nodes AND edges, with an edge index. The user
asked whether finding new edges would be expensive, reasoning that a full update
would need a whole-DB scan. The scan worry was misplaced — a node's
neighbourhood is degree-bounded — but the question led somewhere better:

**bump `updated_at` on both ENDPOINTS when an edge changes**, and edges need no
timestamps, no index and no scan at all. The node delta covers them. That
removes the only part of the design that would not have scaled.

## The insight that shaped the BN design

Also the user's: **agreement decomposes by itself.** Either party navigating
away leaves the other's mark in place, so there is nothing to tear down. Hence
§1.2.1 — model two independent marks, never a third "agreed" state. Given how
this week went, a state machine with an `agreed` state would have produced
exactly the kind of exit-path bug that the pane/anchor runaway was.

## Where it stands

Nothing implemented. All four open questions closed. Build order in §9, starting
with `updated_at`/`created_at` on new writes — small, no behaviour change.

Facts measured today and worth not re-measuring: 477 nodes, 2,706 edges,
Memgraph 3.2.1, cytoscape 3.34.1 from the CDN, seven `cy.elements().hide()`
sites, 69 nodes carrying the legacy ISO-string `tagged_at`.

---

# Afternoon — building began

## WHERE WE ARE (read this first after a compaction)

**Stable-node-ID pass: DONE** (`467c2f7`), full §7 test plan passed including
the two-browser round trip. `stable_id_spec.md` marked DONE.

**Doing now:** `blue_node_spec.md` §9.4 — the fetch endpoint (`nodes-since(T)`
and `node-by-url(u)`). Keyed on `url`, which the client now speaks natively.

**Reminder from §7.5:** the delta MUST query per label — Memgraph 3.2.1 has no
global property index, so `MATCH (n) WHERE n.updated_at > $t` silently scans
everything.

## Done this afternoon

**§9.1 timestamps on writes** (`5e71c5f`, `b816954`). `created_at`/`updated_at`
on the four node write paths, and edge writes bump BOTH endpoints — the trick
that lets edges need no timestamps, index or scan. Verified with EXPLAIN against
the live DB before committing, then end-to-end after the restart.

**Server restarted** on the new code (the user has since said no need to ask
before restarting).

**§9.2 backfill** — all 477 nodes stamped, flagged `created_at_estimated: true`,
1 ms apart in `id(n)` order. Backup first:
`backups/memgraph_2026-08-21_140105.cypher`.

**§9.3 indexes** on `updated_at` for all eight labels. **Memgraph 3.2.1 has no
global property index** — `CREATE GLOBAL INDEX` is a syntax error — so the delta
MUST query per label. EXPLAIN proves it: label-scoped gives
`ScanAllByLabelProperties`, unlabelled gives `ScanAll + Filter`. The naive
`MATCH (n)` would silently scan everything and look fine at 477.

**`d83935b`** — crumbs now carry `url` and taps resolve by it. This was a PATCH
for the id problem; `stable_id_spec.md` supersedes it by making the cy id BE the
url. The patch stays for older cached crumbs.

## Two things found along the way

**The id problem.** cy ids are Memgraph elementIds, and the same Cluster or
Family returns different elementIds in different query contexts — the client
deduplicates by name, first-seen-wins, and first-seen order need not match
between browsers. So a crumb saying "node 89" can mean different nodes on the
two machines. **Tapping a partner's Cluster chip could already fail silently**
via `if (!main.length) return;`. This is why the stable-id pass jumped the
queue: the Blue Node is the first feature whose correctness DEPENDS on identity
matching.

**84 orphan nodes** — unlabelled, no properties before the backfill. Proven
pre-existing from the pre-backfill backup (`__mg_vertex__` with no label), not
created by me. They never enter the graph load and the label-scoped delta
excludes them. Cleanup candidate, not urgent, and deletion is irreversible so
not without a decision.

## A working note on method

Twice today I stated a limit that was not real — "you cannot add a node without
reloading", and "ring order cannot encode arrival" — and both times the user's
follow-up question was better than my answer. Also nearly added a duplicate
`url` field before checking `git show HEAD` and finding the chips already
carried it. **Check the file, not the memory.**
