# Note on Cluster-Textnode edges

*Captured 2026-08-01 from a walk through the DB + code.*

## Two edge types exist between TextNode and Cluster

### 1. `CONTAINS_CLUSTER` — 210 edges, TextNode → Cluster
- Only meaningful on **gateway** TextNodes (the works that own a cluster).
- Carries **one property**: `count` (integer, chapter/section count for the
  badge shown next to the gateway node).
- No "weight" as such — it's structural, not fuzzy.

### 2. `CLUSTER_REL` — ~1,650 edges, TextNode → Cluster
The direction is *never* reversed — zero edges Cluster → TextNode.

The rich, weighted association between a text piece and a theme cluster.

**Five named weight properties** (all optional, all range `0.0`–`1.0`):

| Property         | Edges using it | Sense                                                |
| ---------------- | -------------: | ---------------------------------------------------- |
| `tagged_as`      |            596 | "this text is *about* this cluster" (most common)    |
| `bridges_to`     |            372 |                                                      |
| `gives`          |            366 |                                                      |
| `echoes`         |            227 |                                                      |
| `resonates_with` |            194 |                                                      |

A single edge can carry **any subset** of the five (most carry one, some
carry two or three — e.g. `{tagged_as: 0.6, gives: 0.5}`).

**No normalisation rule** — the five weights sum to whatever they sum to.
Each is a *degree of that specific relationship*, not a probability.

## How weights are controlled

The `#cluster-editor-bar` UI (the spinner strip that appears when you're
in edit mode and have a TextNode selected inside a Cluster context):

- Five numeric spinners, one per property, `min=0 max=1 step=0.1`,
  defaulting to `0.5` for `tagged_as` and `0.0` for the rest.
- **Enter edit mode** by typing the curation code (`3850`) into the
  dev-panel code box.
- Click a Cluster to expand it, click a gateway TextNode to see its
  contents, then click a text-content node. The editor bar populates
  with that edge's current weights.
- Adjust spinners → **Save** button emits `edit_save` ([viewer.js:3299]).
  Server-side, it drops the existing edge and re-creates it with the
  new weights ([server.js:1268]).
- Any spinner left at 0 → that property is **omitted** from the edge,
  not stored as zero ([viewer.js:3293-3297]). So "0" means "not this
  kind of relationship" rather than "no strength of it".
- **Delete edge** (the Delete button) removes the entire `CLUSTER_REL`
  edge — the TextNode no longer belongs to that Cluster along any
  dimension.

## What the weights DO

Structurally: they're stored on the edge and used by the client
([viewer.js:772]) to compute a colour-mix on TextNode nodes based on
their strongest cluster memberships. In practice they encode "how
strongly does this text piece belong to this cluster, and along which
dimension of belonging."

There is **no automatic normalisation** — a TextNode with three
`CLUSTER_REL` edges each at `tagged_as=1.0` is perfectly valid.
Curator judgement is the only control. If enforced normalisation were
wanted (e.g. "the `tagged_as` weights across all a TextNode's Clusters
must sum to 1"), that would be a new rule to add.

## Related

- [BackupNotes.md](BackupNotes.md) — restore procedures if a mass edit
  goes wrong.
- `bd_tool.js cypher` — direct read/write of these edges from the
  command line.
