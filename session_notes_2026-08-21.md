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
