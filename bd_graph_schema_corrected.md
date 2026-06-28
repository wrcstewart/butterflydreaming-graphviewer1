# ButterflyDreaming — Graph Schema Reference

**Status:** Verified and corrected reference, current as of June 2026.
**Purpose:** Authoritative inventory of node labels, properties, relationship types,
and the navigation path, for designing features and briefing Claude Code.

---

## 1. Node labels

| Label | Role |
|---|---|
| `Root` | Single entry point of the whole graph |
| `Entry` | Top-level entries (Settling, Conversations), distinguished by name |
| `Family` | The six top-level Families (Nature, Emotion, Reason, Spirit, Symbolic, Arts). **SubFamily nodes also carry `:Family`**, distinguished by having a Family parent via DESCENDS_FROM |
| `Cluster` | Topic clusters under Families/SubFamilies |
| `TextNode` | Content nodes — corpus text, chunked. Includes gateways and title pages (distinguished by property, see §2) |

> **Correction from earlier version:** Family list included "Symbols" — the correct name is **Symbolic**.

No separate `Gateway` or `TitlePage` label — both are `TextNode`s distinguished by properties.

---

## 2. TextNode properties and the sequence model

TextNodes form **linear reading chains**, one per corpus work, linked by `CHILD` edges (§3).

| Property | Meaning |
|---|---|
| `seq` | Position in the work's chain. **`-1` = gateway**, **`0` = first title page**, `1, 2, …` = content chunks. Runs continuously through the whole work — in multi-story collections later title pages have seq > 0 |
| `gateway: true` | The **gateway node** — collection entry point for one corpus work (one per work). `seq: -1` |
| `section_title: true` | A **title-page node** — grey display in viewer. `seq: 0` for first title page in a work; in multi-story collections (e.g. Grimm's Fairy Tales) subsequent title pages have higher seq numbers continuing the global sequence |
| `source_text` | Work identifier string — e.g. `'Tao Te Ching'`, `'Grimm\'s Fairy Tales'`. Used for filtering queries |
| `text` | The full content including any `%%bd_` directives |
| `title` | Display name — poem title, chapter name, story name etc. |
| `n_r` | Pre-computed connection-count badge **stored on the node** (the viewer treats it as opaque data — see §2.2 for what computes it and the one runtime override) |
| `tagging_status` | `'complete'` on gateway and content nodes. **Absent** on title page nodes |

### 2.1 Chain shape

Single-work:
```
Gateway (seq:-1) -[:CHILD]-> Title page (seq:0) -[:CHILD]-> Chunk 1 (seq:1) -[:CHILD]-> Chunk 2 -> …
```

Multi-story collection (e.g. Grimm's Fairy Tales): gateway fans out to multiple title pages,
each starting its own chain. Later title pages continue the global seq count:
```
                 ┌─[:CHILD]-> Title page A (seq:0) -[:CHILD]-> A-chunk1 (seq:1) -> …
Gateway (seq:-1) ┤
                 └─[:CHILD]-> Title page B (seq:7) -[:CHILD]-> B-chunk1 (seq:8) -> …
```

### 2.2 `n_r` — clarification of source

The viewer reads `node.data('n_r')` as-is and displays it as a badge ([viewer.js:3036, 3064](viewer.js#L3036)). It does **not** compute the value at runtime from edge counts. The stated rules — TextNode `n_r` = outgoing `CHILD` count; Cluster `n_r` = all connections excluding Family / Root / gateway TextNodes — describe how the property is *pre-computed by the data-load / migration scripts* (verify those scripts before relying on the rule).

**One runtime display override (client-local only):** when a cluster's neighbourhood is shown, the viewer sets each visible gateway's cytoscape `node.data('n_r')` to the `count` property of the `CONTAINS_CLUSTER` edge from that gateway to that cluster ([viewer.js:1977](viewer.js#L1977)) — so a gateway badge in cluster view reads "chapters of this work that touch this cluster", not the gateway's stored `n_r`. **No WebSocket message is sent and Memgraph is not modified** — `node.data()` is a cytoscape in-memory setter only. The override is reverted when the user leaves cluster view (the comment at [viewer.js:2992](viewer.js#L2992) — *"preserve actual data; exitSnakeView restores badge"* — makes the intent explicit). The only operations that ever write to Memgraph are the `write_hints`, `edit_node_text`, and `cluster_rel` save WebSocket flows; none of them touch `n_r`.

---

## 3. Relationship (edge) types — COMPLETE INVENTORY

Six edge types exist:

| Edge | Direction | Properties | Purpose |
|---|---|---|---|
| `CONTAINS` | Root → Entry only | none | Top-level entry into the graph |
| `DESCENDS_FROM` | Conversations→Family, Family→SubFamily, Family/SubFamily→Cluster | `weight: Float` | Navigation hierarchy. Weights normalised to sum to 1.0 per child across all its parents. Used for colour blending and navigation |
| `CHILD` | TextNode → TextNode | `source: String` (**confirmed used by viewer**); `weight: Float` and `created_at: DateTime` claimed in earlier notes but the viewer reads neither — confirm via Memgraph query if relied upon | Linear reading chain (gateway → title → chunks) |
| `PART_OF` | TextNode → title page (`section_title: true`) | none | Navigation: clicking a TextNode shows its title page; clicking the title page triggers the **snake view**. ~170 relationships |
| `CONTAINS_CLUSTER` | Gateway TextNode → Cluster | `count: Integer` | Navigation: `count` = how many of that work's TextNodes connect to that Cluster. Invisible in viewer — stylesheet rule `{ opacity: 0, events: 'no' }` at [viewer.js:739-741](viewer.js#L739-L741), confirmed current and not overridden. Used only for navigation logic. The `count` also runtime-overrides the displaying gateway's `n_r` badge in cluster view (§2.2) |
| `CLUSTER_REL` | TextNode → Cluster | five sparse floats (see §3.1) | Semantic tagging of a TextNode against a Cluster's theme |

> **There is NO `CLUSTR_REL`** — earlier notes invented it. The Cluster-related edges are `CONTAINS_CLUSTER` (Gateway→Cluster, navigation, `count`) and `CLUSTER_REL` (TextNode→Cluster, semantic floats).

> **`__root_edge__` is a viewer-only synthetic edge type** ([viewer.js:732, 1920](viewer.js#L732)) created at render time for the root expansion. It is not a Memgraph relationship type and never persists. Ignore it for schema purposes.

> **Correction from earlier version:** DESCENDS_FROM carries `weight: Float` — this is critical for colour blending and was omitted. CHILD carries `weight`, `source`, and `created_at` properties — also omitted.

### 3.1 `CLUSTER_REL` semantic properties (the migration)

Five semantic relationship types that previously existed — `TAGGED_AS`, `RESONATES_WITH`,
`BRIDGES_TO`, `ECHOES`, `GIVES` — were **migrated into a single `CLUSTER_REL` edge**
carrying them as **sparse float properties**. The old types **no longer exist**.

```
(t:TextNode)-[:CLUSTER_REL {
    tagged_as:       Float | null,
    resonates_with:  Float | null,
    bridges_to:      Float | null,
    echoes:          Float | null,
    gives:           Float | null
}]->(c:Cluster)
```

- Absent property ⇒ **0.0**
- At least one property always present
- Edge width in viewer: `max(1.0, highest_non_null_value × 2.5)`
- Edge colour: derived from target Cluster's blended colour (computed at load time)

### 3.2 DESCENDS_FROM weight rules

Weights normalise to sum to 1.0 per child node across all its parents.
After any structural changes run the normalisation queries (see handover doc).
Weights are used for HSL circular mean colour blending of SubFamily and Cluster nodes.

---

## 4. Navigation path (Cluster → content)

```
Cluster clicked
  → CONTAINS_CLUSTER incoming edges → Gateway nodes
      (count property previews how many TextNodes in each work are relevant)
    → user clicks a Gateway
      → server queries relevant TextNodes
          by matching on source_text + cluster name via CLUSTER_REL
          (NOT by traversing further graph edges)
```

Key point: a Cluster knows which works touch it via `CONTAINS_CLUSTER`.
The actual TextNodes are fetched by a **server query (source_text + cluster name)**,
not a graph walk.

**TextNode → title page → snake view:**
```
TextNode clicked → one-hop neighbourhood shown + title page via PART_OF
Title page clicked → linear snake view (all chunks in seq order, cluster-tinted)
```

---

## 5. Colour system

Cluster and SubFamily node colours are **computed by the viewer at load time** — not stored in Memgraph. The algorithm is HSL circular mean with magnitude saturation scaling using DESCENDS_FROM weights and parent Family hex colours.

**Family colours (fixed, hardcoded in `viewer.js` as the `FAMILY_COLOURS` map keyed by Family name; injected onto in-memory nodes at load time by `buildNodeData` ([viewer.js:471-478](viewer.js#L471-L478)) — NOT read from a `hex` property in Memgraph):**

| Family | Hex |
|---|---|
| Nature | #4A8C4F |
| Emotion | #C0504D |
| Reason | #4A7BC0 |
| Spirit | #9B6B9B |
| Symbolic | #C09A3A |
| Arts | #C47A5A |

Implication: changing a top-level Family's colour is a client-side edit (the `FAMILY_COLOURS` literal), not a Memgraph write. A `hex` property may incidentally exist on Family nodes in Memgraph but the viewer does not consult it; the client constant wins.

SubFamilies are blended from their parent Family colours. Clusters are blended from their parent SubFamily/Family colours. Conflicting parents produce honest grey (magnitude near zero).

**Do NOT store colour properties on CLUSTER_REL relationships** — this is legacy behaviour from before the blending system and should not appear in new load files.

---

## 6. Coordinates / layout hints — IMPLEMENTED on DESCENDS_FROM

Coordinate hints are stored on **DESCENDS_FROM relationships** (not on nodes).
Three properties, written by a curator Write button in the viewer:

| Property | Type | Meaning |
|---|---|---|
| `hint_x` | Float | x-offset of child from parent, divided by hint_scale |
| `hint_y` | Float | y-offset of child from parent, divided by hint_scale |
| `hint_scale` | Float | per-family normalisation scale: max(hypot(dx, dy)) across all children at capture time |

**Capture (Write button):** records the current on-screen positions of all children
relative to the parent. The farthest child from the parent gets magnitude exactly 1.0 —
all others are proportionally scaled. Each component is in [-1, +1] as a consequence
of magnitude normalisation, not independent per-axis scaling.

**Replay (on family visit):** child position = parent position + (hint_x, hint_y) × hint_scale.
Exactly reproduces the original on-screen arrangement at any later viewport position.

**Fallback** for edges written before hint_scale existed:
```javascript
renderScale = hint_scale ?? (100 * Math.sqrt((childEdges.length || 1) + 1));
```

**Layout mode selection** (viewer.js) — three modes based on hint coverage:
- `force` — no children hinted → run fCoSE fresh
- `preset` — all children hinted → place exactly per hints, fCoSE pins everything
- `hybrid` — some hinted, some not → place hinted ones, seed un-hinted near centroid, fCoSE settles un-hinted

**Scope:** works on ANY DESCENDS_FROM edge where the curator has run Write.
Not SubFamily-specific — applies equally to Family→SubFamily and SubFamily→Cluster edges.

**Server side:** a single Cypher SET statement on the matched relationship.
Server is a dumb store — no coordinate transformation.

**Corrections to earlier notes:**
- "Stored on nodes" — wrong. Stored on the DESCENDS_FROM relationship.
- "Multiplied by 300 for pixels" — wrong. Multiplier is hint_scale (the original pixel max(hypot(...)) at capture, e.g. 200, 350, 500 depending on arrangement). The only 300 literal in viewer.js is DWELL_FIRE = 300 (tooltip debounce), unrelated to layout.
- "−1.0 to +1.0 axes" — partially right: components are in [-1, +1] but as a consequence of magnitude normalisation, not independent per-axis scaling.
- "SubFamily coordinate system" — misleading. The mechanism is general, not SubFamily-specific.

---

## 7. Memgraph syntax constraints

Critical gotchas for writing Cypher:

- No `EXISTS {}` subquery — use OPTIONAL MATCH + WITH + WHERE
- No pattern predicates in WHERE — use OPTIONAL MATCH
- No `COUNT {}` subquery — use OPTIONAL MATCH with count()
- Memgraph shares integer IDs across nodes AND relationships — prefix relationship
  IDs when mixing with node IDs in Cytoscape (`cf_`, `cw_`)
- datetime: max 6 decimal places
- No comment lines (//) in files loaded via mgconsole
- No Unicode characters in Cypher files

---

## 8. Summary inventory

**Labels:** `Root`, `Entry`, `Family` (incl. SubFamilies by having Family parent), `Cluster`, `TextNode`.

**TextNode markers:** `gateway: true` (seq −1), `section_title: true` (title page, seq 0 for first in work), `source_text`, `n_r`, `tagging_status`.

**Edges (all six):**
- `CONTAINS` — Root→Entry, no properties
- `DESCENDS_FROM` — Conversations→Family→SubFamily→Cluster, `{weight: Float}`
- `CHILD` — reading chain, `{source}` confirmed; `weight, created_at` claimed in earlier notes, viewer reads neither — verify in Memgraph if needed
- `PART_OF` — TextNode→title page, no properties
- `CONTAINS_CLUSTER` — Gateway→Cluster, `{count: Integer}`, invisible in viewer
- `CLUSTER_REL` — TextNode→Cluster, sparse semantic floats (tagged_as, resonates_with, bridges_to, echoes, gives)

**Planned, not built:** ~~`hint_x` / `hint_y` on `DESCENDS_FROM`~~ — **these are implemented.** See §6.

---

## 9. Corrections to earlier notes

- Invented non-existent **`CLUSTR_REL`** — deleted
- Claimed **`{weight, x, y}` coordinates on edges** — none exist; hints planned (hint_x/hint_y on DESCENDS_FROM), unbuilt
- Omitted **`CONTAINS_CLUSTER`** (Gateway→Cluster, count) and **`CONTAINS`** (Root→Entry)
- Left **`PART_OF`** unnamed (was "Text→Title" placeholder)
- Mislabelled Family as "Symbols" — correct name is **Symbolic**
- Omitted **`weight`** property on DESCENDS_FROM — critical for colour blending
- Omitted **`source`** property on CHILD (confirmed used by viewer); `weight` and `created_at` claimed by earlier notes but unverified — viewer reads neither
- Stated title pages always have seq:0 — incorrect for multi-story collections where later title pages continue the global seq count
- Omitted colour system entirely — Cluster/SubFamily colours are viewer-computed, not stored
- Earlier draft said top-level Family hex was "stored as `hex` property on Family nodes" — corrected (§5): hardcoded client-side in viewer.js `FAMILY_COLOURS` map, injected at load by `buildNodeData`
- Earlier draft described `n_r` only by computation rules — corrected (§2.2): the viewer reads `n_r` as opaque pre-stored data; the rules describe what the data-load scripts produce; the only runtime override is the gateway-in-cluster-view override using `CONTAINS_CLUSTER.count`
- Added note (§3) that `__root_edge__` is a viewer-internal synthetic edge type, not a Memgraph relationship

---

*ButterflyDreaming Graph Schema Reference — corrected June 2026, code-verified pass 2026-06-28 against viewer.js / server.js at commit `58332c3`.*
