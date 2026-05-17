# ButterflyDreaming — Graph Viewer
## Claude Code Project Brief
**File:** graphviewer.md
**Date:** 15 May 2026
**Version:** 1.0
**Author:** William Stewart with Claude (Anthropic)

---

## 1. Project Context

ButterflyDreaming is a non-commercial social media platform that pairs two anonymous users in a temporary one-to-one encounter, mediated by a shared body of symbolic text — poetry, myth, folktale, and philosophy. The two users collaboratively draft a short new text (a "child node") that captures something of their encounter. This is saved permanently to a growing public graph of co-created symbolic content called the Text-Graph.

This viewer is the first real UI component of the platform. It is a browser-based graph visualisation tool built on Cytoscape.js, connecting to a local Neo4j database. It serves two purposes:

1. **Development tool** — for exploring and validating the graph schema during the design phase
2. **Prototype UI** — the foundation of the "Butterfly Browser" concept that will eventually become the platform's primary navigation interface

---

## 2. Technology Stack

- **Language:** JavaScript (vanilla JS for this viewer — no framework)
- **Graph visualisation:** Cytoscape.js (MIT licensed, free)
- **Graph layout:** fCoSE plugin for Cytoscape.js (force-directed, natural family groupings)
- **Database:** Neo4j (local instance, Community/Enterprise developer licence)
- **Driver:** Neo4j JavaScript driver (`neo4j-driver` npm package)
- **Dev server:** live-server (`npx live-server .` from project root)
- **Connection:** Bolt protocol, `neo4j://127.0.0.1:7687`

**Neo4j credentials:** username `neo4j` — password to be supplied separately, not stored in code.

---

## 3. Development Environment Setup

```bash
# Install dependencies (once only)
npm install neo4j-driver
npm install -g live-server

# Start dev server (each session, from project root)
npx live-server .
```

The dev server runs at `http://localhost:8080`, serves `index.html` automatically, and auto-refreshes on file save. Leave it running for the whole session.

**File structure:**
```
graphviewer1/
  index.html
  viewer.js
  style.css
  cursor-wings.svg  ← custom cursor asset
  graphviewer.md    ← this file
  package.json
```

---

## 4. Database Schema

### 4.1 Node Types

**Family** — top-level archetype groupings. 6 nodes.
Properties: `name`, `colour`, `hex`, `description`

**Cluster** — archetype clusters within families. 64 nodes.
Properties: `name`, `family_primary`

**TextNode** — symbolic text fragments (corpus and co-created).
Properties: `url` (UUID-based, primary app handle), `text`, `raw_text`, `source` ('seed'|'dyad_child'), `lang`, `created_at`, `tagging_status`, `root` (true on seed nodes with no TextNode parent)

### 4.2 Relationship Types — Cluster to Family

| Relationship | Meaning | Colour | Width |
|---|---|---|---|
| RESONATES_WITH | Primary belonging | #4A90D9 soft blue | 2px |
| BRIDGES_TO | Cross-family connector | #E8A838 amber | 4px |
| ECHOES | Faint surface recall | #9B59B6 muted violet | 1px |

All carry a `weight` property (Float, 0.0–1.0). Weights sum to 1.0 per cluster across all its family connections.

### 4.3 Relationship Types — TextNode Level

| Relationship | Meaning | Colour | Width |
|---|---|---|---|
| TAGGED_AS | Cluster tag | #888888 grey | 1px |
| CHILD | Genealogical lineage | #4A8C4F green | 2px |
| GIVES | One thing enables another | #E85A38 warm orange | 2px |
| RESONATES_WITH | Thematic affinity | #4A90D9 soft blue | 2px |
| BRIDGES_TO | Cross-cluster bridge | #E8A838 amber | 4px |
| ECHOES | Surface recall | #9B59B6 muted violet | 1px |

CHILD carries: `weight` (Float), `source` ('sequence'|'dyad'|'editorial'), `created_at` (datetime)

### 4.4 Family Colours

```
Nature      #4A8C4F    forest green
Emotion     #C0504D    warm red
Reason      #4A7BC0    clear blue
Spirit      #9B6B9B    muted violet
Symbolic    #C09A3A    amber / gold
Arts        #C47A5A    terracotta
```

### 4.5 Current Data State

- 6 Family nodes, 64 Cluster nodes, 191 cluster-to-family relationships loaded
- 2 TextNodes loaded: Tao Te Ching Chapters 1 and 2 (McDonald 1996 translation)
- Ch1 → Ch2 connected by CHILD {weight: 0.75, source: 'sequence'}
- Both TextNodes tagged with TAGGED_AS, BRIDGES_TO, ECHOES, GIVES relationships to Clusters

---

## 5. Visual Design

### 5.1 Canvas

- **Background:** Black (`#000000`)
- **Text:** White (`#ffffff`)
- **Secondary text / labels:** Light grey (`#cccccc`)

### 5.2 Node Styling

**Root node:**
- Small circle, bright gold (`#FFD700`)
- No label visible by default
- Label appears on hover dwell

**Family nodes:**
- Circle, coloured per family hex (see 4.4)
- Medium size
- No label by default — appears on hover dwell

**Cluster nodes:**
- Circle, slightly smaller than family nodes
- Coloured per their `family_primary` family colour, slightly desaturated
- No label by default — appears on hover dwell

**TextNodes:**
- Distinct shape or style from Family/Cluster — e.g. rounded rectangle or softer circle
- Neutral colour (white outline, dark fill) — not family-coloured
- No label by default

### 5.3 Hover Behaviour — Dwell Time

Labels and previews do not appear immediately on mouseover. A dwell timer fires after **400ms** of sustained hover. If the mouse leaves before 400ms, nothing appears.

```javascript
let dwellTimer = null;

cy.on('mouseover', 'node', (event) => {
    const node = event.target;
    dwellTimer = setTimeout(() => showLabel(node), 400);
});

cy.on('mouseout', 'node', () => {
    clearTimeout(dwellTimer);
    hideLabel();
});
```

**What appears on dwell:**
- Root node → its `name` property ("ButterflyDreaming")
- Family node → family name
- Cluster node → cluster name
- TextNode → preview of `text` property, truncated to approximately 6 short lines

### 5.4 Custom Cursor

A custom SVG cursor is used across the entire canvas. Two small triangles pointing upward with a gap between them, suggesting wings in silhouette — abstract, not literal. White on transparent background, 32x32px.

```css
#cy {
    cursor: url('cursor-wings.svg') 16 16, auto;
}
```

The two numbers after the URL are the hotspot coordinates — the pixel that registers as the click point. `16 16` centres it. `auto` is the fallback if the SVG fails to load.

**cursor-wings.svg** — create as part of step 1:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- Left wing triangle — pointing up, left of centre -->
  <polygon points="8,24 14,8 14,24" fill="white" opacity="0.85"/>
  <!-- Right wing triangle — pointing up, right of centre -->
  <polygon points="18,24 18,8 24,24" fill="white" opacity="0.85"/>
</svg>
```

Adjust triangle geometry to taste — the gap between `14` and `18` creates the wing separation.

### 6.1 Core Rule — Click Behaviour

**On clicking any node: show only that node and its immediate one-hop neighbours. All other nodes vanish.**

This rule applies uniformly at every level — root, family, cluster, TextNode. No special cases.

### 6.2 Step-by-Step Interaction Flow

**State 0 — Initial**
Canvas is black. Single small root node centred. No labels. User sees a quiet, minimal starting point.

**State 1 — Root hovered**
After 400ms dwell: root node label appears ("ButterflyDreaming" or equivalent). Disappears on mouseout.

**State 2 — Root clicked**
6 Family nodes appear arranged around the root. Root remains visible. All family nodes shown in their colours, no labels yet. All other nodes hidden.

**State 3 — Family node hovered**
After 400ms dwell: family name appears.

**State 4 — Family node clicked**
Clicked family node + its connected cluster nodes remain visible. All other nodes (other families, root) vanish. Clusters appear arranged around the family node.

**State 5 — Cluster node hovered**
After 400ms dwell: cluster name appears.

**State 6 — Cluster node clicked**
Clicked cluster + all its one-hop neighbours remain visible: its connected family nodes, and any connected TextNodes (seed nodes). All other nodes vanish.

**State 7 — TextNode hovered**
After 400ms dwell: text preview appears — first ~6 lines of the `text` property, truncated with ellipsis if longer.

**State 8 — TextNode clicked**
Clicked TextNode + its one-hop neighbours remain visible: connected clusters (via TAGGED_AS etc.) and any CHILD relationships to/from other TextNodes. One level of children visible.

**Subsequent TextNode clicks**
Each click on a TextNode expands one further level of CHILD relationships. One level at a time.

### 6.3 Collapse

A second click on the currently active node collapses one level — returning to the previous state. Collapse is one level at a time, not full subtree collapse.

### 6.4 Reset

A **Reset** button returns the canvas to State 0 — root node only, all else hidden. Positioned unobtrusively (e.g. top-right corner, small, low contrast until hovered).

---

## 7. Layout

- **fCoSE layout** for the cluster-family graph — produces natural family groupings through force-direction
- On each click-expand, new nodes animate into position (Cytoscape.js handles this natively)
- The canvas should support pan and zoom — Cytoscape.js default behaviour, do not disable

---

## 8. Implementation Notes

### 8.1 Disconnected Subgraphs

A single query may return two or more disconnected subgraphs (e.g. the cluster-family graph and a set of TextNodes not yet connected to it). Cytoscape renders all of them on the same canvas. This is expected behaviour — do not treat it as an error.

### 8.2 Show/Hide Pattern

Rather than re-querying Neo4j on each click, load the full relevant subgraph on initialisation and use Cytoscape's `show()` / `hide()` methods to reveal nodes progressively. This avoids repeated round-trips to the database and makes transitions faster.

Initial load query:
```cypher
MATCH (n)-[r]->(m)
RETURN n, r, m
```

Then manage visibility client-side via Cytoscape's element filtering.

### 8.3 Neo4j Driver Connection

```javascript
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
    'neo4j://127.0.0.1:7687',
    neo4j.auth.basic('neo4j', PASSWORD)
);

const session = driver.session({ database: 'neo4j' });
```

Password should be passed via a simple prompt or environment config — not hardcoded in source.

---

## 9. Future Directions
### (Design intent — not for current implementation)

### 9.1 Dual-User Buddy Browsing

In the live platform, two users browse the graph simultaneously in a dyadic session. Each user's current node and primary path will be rendered in a distinct colour — one per user. The two coloured threads coexist on the same canvas.

**User colours** (to be decided — must be distinct from all 6 family colours): likely light/bright tones against the dark background, e.g. white and pale cyan.

### 9.2 Primary Path and Buddy Path

Every TextNode has a primary path — its lineage back through CHILD relationships to a root seed node. This path is inherited: a child node's primary path is its parent's path extended by one step. The primary path determines which cluster territory "owns" that node.

The buddy's primary path — determined by which seed node they entered through — arrives as a second coloured thread. This is the secondary path, dynamically defined by the pairing, not pre-assigned. The metaphor: each user arrives carrying the pollen of their own path, and the encounter is where cross-pollination happens. The child node that emerges carries traces of both lineages.

Shared nodes — where both paths overlap — represent the forming gravity well.

### 9.3 Attention and Dwell as Signals

The 400ms dwell timer is not just a UX mechanism. In the live platform, sustained hover events (post-dwell) become attention signals fed into the gravity well scoring function:

```
score(node) = wA × attentionA(node) + wB × attentionB(node) + wAB × overlap(node)
```

The dwell threshold for local tooltip display and the threshold for broadcasting an attention signal to the partner may differ — local feedback warrants a shorter dwell; committing a signal to the partner's view warrants a longer one.

### 9.4 Click as Shared Signal

In buddy browsing mode, a click on a TextNode may carry additional meaning beyond local navigation — it may signal candidate interest in that node as a shared starting point for the Weave phase. This requires further design work. The current click model (show one-hop neighbourhood) should be designed with this extension in mind.

### 9.5 WebSocket Integration

Real-time buddy browsing requires a WebSocket connection broadcasting dwell and click events between paired users. A WebSocket dyadic test has already been prototyped in the ButterflyDreaming codebase. The graph viewer will eventually consume these events and render the buddy's attention state on the local canvas.

### 9.6 Reset Button

The current Reset button is a development convenience. In the live platform, session reset and navigation will be handled by the broader UI shell. The Reset button should be easy to remove or replace.

---

## 10. What to Build First

1. `cursor-wings.svg` — create the wing cursor asset; `index.html` — basic page structure, black background, Cytoscape.js canvas filling the viewport, cursor applied to canvas via CSS
2. `viewer.js` — Neo4j connection, load full graph, render all nodes hidden except root
3. Click handler implementing the one-hop show/hide rule
4. Hover dwell timer with label display
5. Family node colours applied
6. Relationship colours and widths applied
7. TextNode hover text preview
8. fCoSE layout applied
9. Reset button
10. TextNode CHILD expansion (one level per click)

Build and test each step before moving to the next.

---

*ButterflyDreaming graphviewer.md v1.0 — 15 May 2026*

# Amendment 1 — graphviewer.md — 15 May 2026

## A. Section 4.1 — TextNode properties (replace existing TextNode line)

**TextNode** — symbolic text fragments (corpus and co-created).
Properties: `url` (UUID-based, primary app handle), `text`, `raw_text`, `source` ('seed'|'dyad_child'), `lang`, `created_at`, `tagging_status`, `gateway` (boolean, present on all TextNodes — `true` if node has no incoming CHILD relationship, set at CREATE time; `false` if node has a TextNode parent)

## B. Section 5.2 — add after TextNode styling block

**Gateway vs non-gateway TextNodes**

When TextNodes appear following a cluster click, `gateway` status is communicated through line weight alone — no colour change, no size difference:

| Property | gateway: true | gateway: false |
|---|---|---|
| Node border | 3px | 1px |
| Connecting line from cluster | 4px | 1px |

Gateway nodes are entry points into a lineage — thicker treatment signals "start a journey here". Non-gateway nodes are children passing through this cluster's territory — present but not originating here.

## C. Section 6.4 — replace existing reset line

### 6.4 Reset

A **Reset** button returns the canvas to State 0 — root node only, all else hidden.

- Positioned top-right corner
- Small, low contrast at rest — brightens on hover/focus
- Works on both mouse click and touch tap
- In the future production UI this will be replaced by broader session navigation — design it to be easy to remove

## D. New section 6.5 — add after 6.4

### 6.5 Mobile and Touch Screen Support

The viewer must support touch screens from the start — not retrofitted later.

**Event model — Pointer Events API**

Use the Pointer Events API as the primary event model. It unifies mouse and touch into a single event set:

```javascript
cy.on('pointerdown', 'node', startDwell);
cy.on('pointerup', 'node', cancelDwell);
cy.on('pointermove', cancelDwell);
```

**Dwell on touch**
Touch-and-hold (pointerdown held for 400ms without pointermove) replaces hover dwell. Same timer logic, same threshold.

**Tap behaviour**
Single tap shows label/preview. Second tap triggers navigation. Avoids touch users never seeing labels.

**Touch-friendly node sizes**
Minimum tap target 44x44px per mobile UX guidelines.

**CSS touch fixes**
```css
#cy {
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
}
* {
    touch-action: manipulation;
}
```

**Hammer.js** — noted as future option if gesture complexity grows. Not needed for initial build.
# Amendment 2 — graphviewer.md — 15 May 2026

## Section 5.2 — Node label rendering

### Terminology note
Cytoscape.js uses the term "label" for the text rendered inside a node. 
To avoid confusion with our database property also called `label`, this 
document uses the following conventions throughout:

- **`display_name`** — our database property — the short formatted text 
  rendered inside the node on the canvas at all times
- **`label`** — our database property — the full original cluster name, 
  used only in the hover dwell tooltip, never passed to Cytoscape's label field
- **Cytoscape label** — Cytoscape's internal rendering field — always fed 
  from our `display_name` property, never from our `label` property

---

All nodes display a persistent in-node text in the smallest clearly readable 
white font, centred within the node. Text sits inside the node boundary — 
it does not float below. The node must be sized to contain its text 
comfortably with minimal padding.

**Text content by node type:**
- Root node — `name` property ("ButterflyDreaming")
- Family nodes — `name` property (single word, e.g. "Nature")
- Cluster nodes — `display_name` property (one or two words with line wrap, 
  e.g. "Water\nReflection", "Liminal")
- Gateway TextNodes — first 4-5 words of `text` property followed by ellipsis
- Non-gateway TextNodes — first 4-5 words of `text` property followed by ellipsis

**Cytoscape.js styling — feeding display_name into Cytoscape's label field:**
```javascript
'label': 'data(display_name)',  // Cytoscape label fed from our display_name property
'text-valign': 'center',
'text-halign': 'center',
'text-wrap': 'wrap',
'text-max-width': '80px',       // adjust per node size
'font-size': '9px',
'color': '#ffffff',
```

**Hover dwell tooltip — using our label property:**
On 400ms dwell, read the node's `label` property and display it as a tooltip 
overlay (e.g. "Water/Reflection", "The Liminal", "The Unknown Other"). 
This is handled in the dwell event handler — our `label` property is never 
passed to Cytoscape's label field.

```javascript
cy.on('pointerdown', 'node', (event) => {
    const node = event.target;
    dwellTimer = setTimeout(() => {
        showTooltip(node.data('label'));  // our label property → tooltip
    }, 400);
});
```

---

**Future schema note:**
In a future version `display_name` should become the primary node identifier 
replacing `name`, and `label` should be renamed `hover_preview` to eliminate 
the naming conflict with Cytoscape's label field. Current `name` is kept 
unchanged for backward compatibility as it is the structural key underpinning 
all 191 cluster-to-family relationships.

# Amendment 3 — graphviewer.md — 15 May 2026

## Section 5.2 — n_r counter display

Each node displays its relationship count (`n_r` property) in the top right 
of the node in small white text. If `n_r` is 0 or absent the counter is not 
displayed — the space remains blank.

**Cytoscape.js implementation:**
Position a second label or use a pie/badge overlay in the top right corner. 
The simplest approach is a Cytoscape compound node or a separate small 
overlay element per node driven by the data:

```javascript
// Only show n_r if greater than 0
'content': function(node) {
    const nr = node.data('n_r');
    return (nr && nr > 0) ? String(nr) : '';
}
```

Styling — small, unobtrusive, white, top-right of node:
```javascript
'text-valign': 'top',
'text-halign': 'right',
'font-size': '7px',
'color': '#ffffff',
```

Note: This conflicts with the centred display_name label — CC should 
implement n_r as a separate overlay element rather than Cytoscape's 
main label field, which is reserved for display_name.

---

## Standing instruction — n_r integrity rule

**This rule applies to all current and future code in the ButterflyDreaming 
project, not just the viewer.**

Every relationship creation must increment `n_r` on both affected nodes 
atomically in the same transaction:

```cypher
MATCH (a {url: $urlA}), (b {url: $urlB})
CREATE (a)-[r:RELATIONSHIP_TYPE {weight: $weight}]->(b)
SET a.n_r = coalesce(a.n_r, 0) + 1
SET b.n_r = coalesce(b.n_r, 0) + 1
```

`coalesce` handles nodes where `n_r` is not yet set — treats null as zero.

Any script or application that creates relationships without going through 
this pattern must run the following repair query afterwards:

```cypher
MATCH (n)
WITH n, COUNT { (n)--() } AS rel_count
SET n.n_r = rel_count
```

**Any future Claude session or app reading this document must follow this 
convention. The n_r property is a platform-wide data integrity rule, 
not a viewer-specific concern.**

Design Decision Record (DDR)
## DDR-1: n_r Relationship Counter
**Date:** 15 May 2026
**Status:** Implemented

### Decision
Each node carries an `n_r` property counting its direct relationships, 
displayed in the top right of the node in small white text. Blank (not 
displayed) if zero.

### What n_r counts
Relationships to any directly connected node **excluding** Family nodes 
and the Root UI node. Family-to-cluster classification relationships are 
structural, not content relationships, and would inflate the count 
meaninglessly. Root is a UI element, not a data node.

### Initial seed query
Run once to set n_r on all existing nodes:
```cypher
MATCH (n)
WITH n, COUNT { 
    (n)--(m) WHERE NOT m:Family AND NOT m:Root
} AS rel_count
SET n.n_r = rel_count
```

Family nodes then explicitly zeroed:
```cypher
MATCH (n:Family)
SET n.n_r = 0
```

### Application layer rule — platform wide
Every relationship creation in code must increment n_r on both affected 
nodes in the same transaction, excluding relationships to Family or Root nodes:

```cypher
MATCH (a {url: $urlA}), (b {url: $urlB})
CREATE (a)-[r:RELATIONSHIP_TYPE {weight: $weight}]->(b)
SET a.n_r = coalesce(a.n_r, 0) + 1
SET b.n_r = coalesce(b.n_r, 0) + 1
```

If a relationship is ever created outside this convention, run the seed 
query above to repair all counts.

### Display rule
```javascript
const nr = node.data('n_r');
return (nr && nr > 0) ? String(nr) : '';
```

Top right of node, font-size 7px, white. Implemented in CC session 
15 May 2026.

### Future sessions
Any Claude session or application reading this document must follow the 
n_r increment convention. It is a platform-wide data integrity rule, 
not viewer-specific.

### Future schema note
Consider renaming `n_r` to something more descriptive such as 
`connection_count` in a future version when the schema is reviewed.

Here is the amendment ready to paste into `graphviewer.md`:

---

```markdown
## Amendment 4 — graphviewer.md — 16 May 2026

## Section 4.3 / Viewer styling — CHILD relationship arrows

Arrows are displayed on CHILD relationships only. All other relationship 
types (RESONATES_WITH, BRIDGES_TO, ECHOES, TAGGED_AS, GIVES) render as 
plain lines with no arrowhead — their direction is a Cypher convention 
only and carries no meaning worth displaying.

CHILD arrows point from parent to child, confirming the direction of 
lineage descent.

**Cytoscape.js styling for CHILD relationships:**
```javascript
{
    selector: 'edge[type="CHILD"]',
    style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#4A8C4F',
        'arrow-scale': 1.2,
        'line-color': '#4A8C4F',
        'width': 2
    }
}
```

All other edge selectors should explicitly set:
```javascript
'target-arrow-shape': 'none'
```

This prevents any default arrow rendering on non-CHILD relationships.
```

Here is Amendment 5 revised — the Cypher has already been run, CC just reads the data:

---

```markdown
## Amendment 5 — graphviewer.md — 16 May 2026

## Edge styling — family colour and weight-proportional thickness

### Two changes replacing previous edge styling rules

Previous fixed colours per relationship type and fixed widths per 
relationship type are withdrawn. Replace entirely with the following.

---

### 5a — Edge colour from family node

Cluster-to-family relationship lines take the colour of the family node 
at the other end. This distributes family colour outward into the cluster 
layer, making family groupings visually legible across the whole graph.

Relationship type (RESONATES_WITH, BRIDGES_TO, ECHOES) is no longer 
indicated by colour — it is indicated by weight-proportional thickness 
only (see 5b).

**Data:** All cluster-to-family edges already carry a `family_colour` 
property set to the target family's hex colour. This was applied directly 
in Neo4j — CC does not need to run any Cypher. Simply read `family_colour` 
from the edge data.

**Cytoscape.js edge colour styling:**
```javascript
{
    selector: 'edge',
    style: {
        'line-color': 'data(family_colour)',
    }
}
```

For edges that have no `family_colour` property (CHILD, TAGGED_AS, 
GIVES, RESONATES_WITH and ECHOES between TextNodes) retain their 
existing defined colours.

---

### 5b — Weight-proportional line thickness

All relationship line thickness is proportional to the relationship's 
`weight` property, multiplied by 2.5, with a minimum of 0.5px:

```javascript
{
    selector: 'edge',
    style: {
        'width': function(edge) {
            return Math.max(0.5, edge.data('weight') * 2.5);
        }
    }
}
```

**Scale reference:**
| Weight | Thickness |
|--------|-----------|
| 0.1    | 0.5px (minimum) |
| 0.25   | 0.625px |
| 0.5    | 1.25px |
| 0.75   | 1.875px |
| 0.85   | 2.125px |
| 1.0    | 2.5px (maximum) |

Fixed widths per relationship type (previously 1px, 2px, 4px) are 
withdrawn entirely. Weight is the sole determinant of line thickness.

---

### Standing rule for future relationship creation

Any future cluster-to-family relationship created in code must also 
set `family_colour` from the target family's `hex` property in the 
same transaction:

```cypher
MATCH (c:Cluster)-[r]->(f:Family)
SET r.family_colour = f.hex
```
```

## Amendment 6 — graphviewer.md — 16 May 2026

## Cluster node colour — derived dynamically from highest weighted family connection

### Decision
Cluster node colour is derived at runtime from the family node at the 
end of the cluster's highest weighted relationship, regardless of 
relationship type. This is consistent with the general principle that 
all visual properties are data-driven at runtime — line width from 
`weight`, line colour from `family_colour`, node colour from graph 
structure.

### Query to derive primary family colour per cluster
Run at viewer load time:

```cypher
MATCH (c:Cluster)-[r]->(f:Family)
WITH c, f, r.weight AS w
ORDER BY w DESC
WITH c, collect(f)[0] AS primary_family
RETURN c.name, primary_family.hex AS colour
```

Pass the resulting colour into Cytoscape as a node data property 
and apply via:

```javascript
{
    selector: 'node[type="Cluster"]',
    style: {
        'background-color': 'data(colour)'
    }
}
```

### family_primary property
The `family_primary` property stored on Cluster nodes is now redundant — 
the same information is derived more accurately from the graph structure. 
It is retained for now for backward compatibility but should be removed 
in a future schema cleanup pass.

### Standing principle
All visual properties in the ButterflyDreaming viewer are derived at 
runtime from graph data. No visual property should be stored separately 
if it can be accurately derived from existing node and relationship 
properties. This keeps the graph as the single source of truth.

Here is Amendment 7:

---

```markdown
## Amendment 7 — graphviewer.md — 16 May 2026

## TextNode-to-cluster edge colour — family colour from cluster

### Decision
TextNode-to-cluster relationship edges take the colour of the cluster's 
primary family — the family at the end of the cluster's highest weighted 
relationship. This is consistent with the cluster-to-family edge colouring 
(Amendment 5) and extends the family colour thread through the full graph:

```
Family → Cluster → TextNode
colour   colour    colour
```

Semantic relationship type information (TAGGED_AS, BRIDGES_TO, ECHOES, 
GIVES) is not encoded in colour — simplicity and consistency take 
priority. Weight-proportional line thickness (weight × 2.5, minimum 
0.5px) applies to all edges including TextNode-to-cluster.

### Data
All TextNode-to-cluster edges carry `family_colour` set to the primary 
family hex of the cluster at the other end. Applied directly in Neo4j 
— CC does not need to run any Cypher. Simply read `family_colour` from 
the edge data.

This was set via:
```cypher
MATCH (n:TextNode)-[r]->(c:Cluster)-[r2]->(f:Family)
WITH r, f, r2.weight AS w
ORDER BY w DESC
WITH r, collect(f)[0] AS primary_family
SET r.family_colour = primary_family.hex
```

### Programmatic creation checklist update
When TextNode-to-cluster relationship creation becomes programmatic, 
the following must fire in the same transaction:

1. Create the relationship with weight property
2. Set `family_colour` from the cluster's highest weighted family connection
3. Increment `n_r` on both connected nodes (excluding Family and Root 
   per DDR-1)

### Standing principle reaffirmed
All edges in the ButterflyDreaming viewer carry `family_colour` derived 
from the family node at the end of the relevant chain. Edge width is 
weight × 2.5, minimum 0.5px. No fixed colours or widths anywhere.
```

## DDR-2: Semantic Relationship Types — Display vs AI Usage
**Date:** 16 May 2026
**Status:** Decision made — not yet implemented at AI layer

### Decision
TextNode-to-cluster relationship types (TAGGED_AS, BRIDGES_TO, ECHOES, 
RESONATES_WITH, GIVES) are not displayed visually in the viewer. Human 
users infer meaning from line thickness (weight) and colour (family). 
Adding type labels or symbols would clutter the graph and is inconsistent 
with the platform's exploratory philosophy.

### Relationship types retained in data for AI usage
The five relationship types carry distinct semantic meaning that is 
important for AI modulator functions:

| Type | Semantic meaning |
|---|---|
| TAGGED_AS | Primary cluster classification |
| BRIDGES_TO | Cross-cluster bridge — connects distant territories |
| ECHOES | Faint surface recall — loose thematic resonance |
| RESONATES_WITH | Strong thematic affinity |
| GIVES | Generative — one thing enables or produces another |

These distinctions matter for:
- Gravity well scoring — RESONATES_WITH and TAGGED_AS carry more 
  weight than ECHOES in attention calculations
- Bridge node surfacing — BRIDGES_TO connections are the primary 
  signal for the AI modulator's Unexpected mode
- Content recommendation — GIVES relationships suggest generative 
  paths through the graph

### Visual encoding
All edges encoded visually by:
- **Colour** — family colour of the cluster at the other end (Amendment 7)
- **Width** — weight × 2.5, minimum 0.5px (Amendment 5b)

Relationship type is not encoded visually. This is a deliberate decision, 
not an omission.

### Future sessions
Any AI modulator code reading this document should use relationship 
types as first-class signals in scoring and recommendation algorithms. 
Any viewer code reading this document should not attempt to display 
relationship types visually.

