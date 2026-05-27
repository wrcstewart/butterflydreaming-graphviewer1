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

Here is Amendment 8:

---

```markdown
## Amendment 8 — graphviewer.md — 16 May 2026

## CHILD relationship styling — TextNode to TextNode

### Decision
CHILD relationship lines between TextNodes are styled by two factors:
the gateway status of the source node and the `source` property of 
the relationship. All CHILD relationships carry a triangle arrowhead 
pointing from parent to child (per Amendment 4).

### Styling rules

| From | To | source | Width | Colour |
|---|---|---|---|---|
| Gateway TextNode | Ordinary TextNode | seed | 1.5px | #ffffff white |
| Gateway TextNode | Ordinary TextNode | dyad | 0.6px | #888888 medium grey |
| Ordinary TextNode | Ordinary TextNode | seed | 1.0px | #ffffff white |
| Ordinary TextNode | Ordinary TextNode | dyad | 0.6px | #888888 medium grey |

### Key points
- Arrow colour matches line colour — white arrow on white line, 
  grey arrow on grey line
- `source` property on the CHILD relationship determines seed vs dyad
- `gateway` property on the source TextNode determines gateway vs ordinary
- Weight-proportional thickness (Amendment 5b) does not apply to 
  CHILD relationships — fixed widths per this table take precedence
- These rules apply regardless of how deep in the lineage the nodes sit

### Cytoscape.js implementation note
CC will need to evaluate both the source node's `gateway` property 
and the edge's `source` property to apply the correct style. 
This requires a function-based style selector rather than a 
static CSS selector:

```javascript
{
    selector: 'edge[type="CHILD"]',
    style: {
        'width': function(edge) {
            const isGateway = edge.source().data('gateway');
            const source = edge.data('source');
            if (isGateway && source === 'seed') return 1.5;
            if (isGateway && source === 'dyad') return 0.6;
            if (!isGateway && source === 'seed') return 1.0;
            return 0.6; // ordinary to ordinary, dyad
        },
        'line-color': function(edge) {
            return edge.data('source') === 'seed' ? '#ffffff' : '#888888';
        },
        'target-arrow-color': function(edge) {
            return edge.data('source') === 'seed' ? '#ffffff' : '#888888';
        },
        'target-arrow-shape': 'triangle'
    }
}
```
```

### Implementation notes — CC session 17 May 2026

**Data correction:** The CHILD relationship `source` property value is
`'sequence'` in Neo4j, not `'seed'` as the spec assumed. The dyad value
is `'dyad'` as specified. All checks updated accordingly.

**Naming collision fix:** Cytoscape's required `source` field (source node
ID) overwrites the Neo4j `source` property during edge construction. The
Neo4j value is preserved as `rel_source` in Cytoscape edge data.

**Opacity fix:** CHILD edges inherit `opacity: 0.65` from the base edge
style. Added `opacity: 1` to the CHILD selector so white lines render as
true white.

**Final implemented widths and colours:**

| From | To | rel_source | Width | Colour |
|---|---|---|---|---|
| Gateway TextNode | Ordinary TextNode | sequence | 1.0px | #ffffff white |
| Gateway TextNode | Ordinary TextNode | dyad | 0.6px | #888888 medium grey |
| Ordinary TextNode | Ordinary TextNode | sequence | 0.7px | #aaaaaa light grey |
| Ordinary TextNode | Ordinary TextNode | dyad | 0.6px | #888888 medium grey |

Arrow scale: 0.6 (spec said 1.2 — halved after visual review).

---

Here is Amendment 9:

---

```markdown
## Amendment 9 — graphviewer.md — 16 May 2026

## TextNode border styling — gateway status and source

### Decision
TextNode borders reflect gateway status and source property using the 
same visual language as CHILD relationship lines (Amendment 8).

### Border styling rules

| Node type | Border width | Border colour |
|---|---|---|
| Gateway TextNode | 2px | #ffffff white |
| Ordinary TextNode (seed) | 1px | #ffffff white |
| Ordinary TextNode (dyad) | 0.6px | #888888 medium grey |

### Cytoscape.js implementation

```javascript
{
    selector: 'node[type="TextNode"]',
    style: {
        'border-width': function(node) {
            if (node.data('gateway') === true) return 2;
            if (node.data('source') === 'seed') return 1;
            return 0.6;
        },
        'border-color': function(node) {
            if (node.data('source') === 'dyad') return '#888888';
            return '#ffffff';
        }
    }
}
```

### Note
If CC is currently deriving CHILD edge colours from node border colours, 
correcting the border styling per this amendment may also correct the 
edge colouring without further changes. Check edge colours after 
applying this amendment before investigating further.
```

### Implementation notes — CC session 17 May 2026

**Colour rule simplified:** All ordinary TextNodes (gateway=false) use
grey border regardless of seed/dyad. Only gateway nodes get white.

**Final implemented values:**

| Node type | Border width | Border colour |
|---|---|---|
| Gateway TextNode | 1px | #ffffff white |
| Ordinary TextNode (seed) | 0.5px | #888888 grey |
| Ordinary TextNode (dyad) | 0.3px | #888888 grey |

Original spec widths (2px / 1px / 0.6px) halved after visual review.
`gateway` check uses truthy evaluation, not strict `=== true`.
## DDR-3: n_r on TextNodes counts outgoing CHILD relationships only
**Date:** 16 May 2026
**Status:** Implemented

### Decision
The `n_r` property on TextNodes counts only outgoing CHILD relationships 
— the number of direct text descendants. It does not count cluster tag 
relationships (TAGGED_AS, BRIDGES_TO, ECHOES, RESONATES_WITH, GIVES) 
which would inflate the number and mislead the user.

This makes `n_r` meaningful on TextNodes — it tells the user how many 
text children this node has, which is useful for navigation and 
indicates how much has grown from this point in the lineage.

### Distinction from Cluster and Family nodes
On Cluster and Family nodes `n_r` counts all non-Family, non-Root 
connections per DDR-1. On TextNodes `n_r` counts outgoing CHILD 
only. The property has different semantics by node type.

### Query applied
```cypher
MATCH (n:TextNode)
WITH n, COUNT { (n)-[:CHILD]->() } AS child_count
SET n.n_r = child_count
```

### Programmatic creation rule
When a new CHILD relationship is created from a TextNode, increment 
`n_r` on the parent TextNode only — not the child, and not via the 
general n_r rule in DDR-1. The child starts with n_r = 0.

### Current values
- Gateway TextNode (Tao Te Ching description) — n_r: 1
- Chapter 1 — n_r: 1  
- Chapter 2 — n_r: 0
## DDR-3: n_r on TextNodes counts outgoing CHILD relationships only
**Date:** 16 May 2026
**Status:** Implemented

### Decision
The `n_r` property on TextNodes counts only outgoing CHILD relationships 
— the number of direct text descendants. It does not count cluster tag 
relationships (TAGGED_AS, BRIDGES_TO, ECHOES, RESONATES_WITH, GIVES) 
which would inflate the number and mislead the user.

This makes `n_r` meaningful on TextNodes — it tells the user how many 
text children this node has, which is useful for navigation and 
indicates how much has grown from this point in the lineage.

### Distinction from Cluster and Family nodes
On Cluster and Family nodes `n_r` counts all non-Family, non-Root 
connections per DDR-1. On TextNodes `n_r` counts outgoing CHILD 
only. The property has different semantics by node type.

### Query applied
```cypher
MATCH (n:TextNode)
WITH n, COUNT { (n)-[:CHILD]->() } AS child_count
SET n.n_r = child_count
```

### Programmatic creation rule
When a new CHILD relationship is created from a TextNode, increment 
`n_r` on the parent TextNode only — not the child, and not via the 
general n_r rule in DDR-1. The child starts with n_r = 0.

### Current values
- Gateway TextNode (Tao Te Ching description) — n_r: 1
- Chapter 1 — n_r: 1  
- Chapter 2 — n_r: 0
## Amendment 10 — graphviewer.md — 18 May 2026

## Database migration — Neo4j to Memgraph

### Current state
The viewer was built against Neo4j Desktop (local, port 7687, bolt protocol).
The canonical database has now moved to Memgraph running in Docker.
CC should update the database connection to point at Memgraph.

### New connection details

```javascript
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('memgraph', 'memgraph')
);
```

The port is the same (7687 Bolt) and the neo4j-driver npm package works 
with both Neo4j and Memgraph — no driver change needed. Only the 
credentials change.

### Why the move
Memgraph is the planned production database for ButterflyDreaming.
Neo4j Desktop was used for schema design and experimentation only.
The Memgraph instance is a corrected, canonical version of the data:

- Root node connects to Family nodes via CONTAINS relationships 
  (not CHILD — that was an error in Neo4j corrected in Memgraph)
- All TextNode properties normalised across all three nodes
- No spurious Root→Family CHILD relationships
- Datetime formats corrected for Memgraph compatibility

### Memgraph infrastructure
- Database container: `memgraph-dev` (Docker, named volume `mg_lib`)
- Lab UI: `http://localhost:3000` (Docker container `memgraph-lab`)
- Network: `memgraph-net` (shared Docker network)
- Backup: cron every 3 hours → Dropbox/memgraphback

### CONTAINS relationship
The Root node connects to all 6 Family nodes via a CONTAINS relationship.
This is the navigation relationship that allows the viewer to show all 
Family nodes when Root is clicked — consistent with the one-hop rule.

```cypher
MATCH (r:Root)-[:CONTAINS]->(f:Family)
RETURN f
```

This replaces the incorrect CHILD relationships CC created in Neo4j 
between Root and Family nodes. The viewer click handler for the Root 
node should follow CONTAINS relationships to find Family nodes, not CHILD.

### Neo4j Desktop
Neo4j Desktop remains installed and running for reference. Do not 
delete it. It may be useful for schema experimentation. The viewer 
should no longer connect to it.

Here is Amendment 11:

---

```markdown
## Amendment 11 — graphviewer.md — 18 May 2026

## Architecture change — Express server + WebSocket

### Overview
The viewer is extended from a browser-only Cytoscape app to a 
client-server architecture. An Express server serves index.html 
and handles all Memgraph queries server-side. The browser 
communicates with the server exclusively over WebSocket.

This is the foundation for Cloudflare tunnel access and future 
dyadic real-time features (buddy browsing, gravity well, attention 
signals). All real-time events — hover, click, query, attention — 
travel on the same WebSocket connection.

### Project structure — extend existing, do not start fresh

```
butterflydreaming_graphviewer1/
  index.html          ← existing, load from Express not live-server
  viewer.js           ← existing, replace neo4j-driver with WebSocket client
  style.css           ← existing, unchanged
  cursor-wings.svg    ← existing, unchanged
  server.js           ← NEW
  package.json        ← update: add express, ws
  graphviewer.md      ← this file
```

### server.js responsibilities
- Serve `index.html` statically via Express
- Connect to Memgraph via neo4j-driver (server-side only)
- Accept WebSocket connections from browser clients
- Receive query requests over WebSocket
- Execute queries against Memgraph
- Return results over WebSocket

```javascript
const express = require('express');
const { WebSocketServer } = require('ws');
const neo4j = require('neo4j-driver');

const app = express();
app.use(express.static('.'));

const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('memgraph', 'memgraph')
);

const server = app.listen(8080);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const { type, query, params } = JSON.parse(message);
        const session = driver.session();
        try {
            const result = await session.run(query, params);
            ws.send(JSON.stringify({ type, data: result.records }));
        } finally {
            await session.close();
        }
    });
});
```

### viewer.js changes
Remove direct neo4j-driver connection. Replace with WebSocket client:

```javascript
const ws = new WebSocket('ws://localhost:8080');

function queryGraph(type, query, params = {}) {
    ws.send(JSON.stringify({ type, query, params }));
}

ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    handleQueryResult(type, data);
};
```

All Cypher queries currently run client-side move to server-side. 
The browser sends a query request, the server runs it and returns 
results. The browser never connects to Memgraph directly.

### Dwell threshold — configurable constant

The dwell timer fires the WebSocket query before the threshold 
completes, so the result arrives in time to display at the threshold:

```
t=0      mouse enters node — dwell timer starts
t=DWELL_FIRE   query fired over WebSocket
t=DWELL_FIRE + round_trip   result arrives
t=DWELL_MS     text displays (if result already arrived)
```

Define two constants at the top of viewer.js:

```javascript
const DWELL_MS = 400;       // threshold for display (ms)
const DWELL_FIRE = 300;     // fire query this many ms into dwell (ms)
```

Local (Memgraph on same machine): round-trip ~50ms — DWELL_FIRE 300ms 
gives result at ~350ms, well before DWELL_MS.

Cloudflare tunnel: round-trip ~150-200ms — reduce DWELL_FIRE to 150ms, 
result arrives at ~330ms, still before DWELL_MS.

DWELL_MS stays constant at 400ms — perceived response time is consistent 
regardless of network. Only DWELL_FIRE needs tuning per environment.

### Package updates

```bash
npm install express ws
```

neo4j-driver remains in package.json — now used server-side only.

### Starting the server

Replace live-server with:

```bash
node server.js
```

Access at `http://localhost:8080`. Auto-restart during development 
with nodemon:

```bash
npm install -g nodemon
nodemon server.js
```

### Cloudflare tunnel (future)
When ready for external access, point the Cloudflare tunnel at 
`http://localhost:8080`. No changes to server.js needed — the 
tunnel sits in front of Express. The WebSocket connection upgrades 
automatically through the tunnel.

### Neo4j Desktop
No longer used by the viewer. Neo4j Desktop remains installed for 
schema experimentation only.
```

that is working please make a note
Here is Amendment 12:

---

```markdown
## Amendment 12 — graphviewer.md — 18 May 2026

## Mobile touch fixes

### Problem 1 — Single tap triggering navigation
A single tap fires touchstart then touchend on the same point, which 
is being interpreted as a click/navigation event. On touch devices 
navigation should require a deliberate double-tap.

**Fix — double-tap pattern for touch devices:**

- First tap on a node → show tooltip/preview only (equivalent to 
  hover dwell on desktop). Do not navigate.
- Second tap on same node → trigger navigation action (equivalent 
  to click on desktop).
- Tap on different node → show that node's tooltip, reset tap state.
- Tap on empty canvas → hide tooltip, reset tap state.

Implementation — track last-tapped node and tap counter:

```javascript
let lastTappedNode = null;
let tapCount = 0;
let tapResetTimer = null;

cy.on('tap', 'node', (event) => {
    const node = event.target;
    clearTimeout(tapResetTimer);

    if (lastTappedNode && lastTappedNode.id() === node.id()) {
        tapCount++;
    } else {
        tapCount = 1;
        lastTappedNode = node;
        showTooltip(node);
    }

    if (tapCount >= 2) {
        triggerNavigation(node);
        tapCount = 0;
        lastTappedNode = null;
    } else {
        tapResetTimer = setTimeout(() => {
            tapCount = 0;
            lastTappedNode = null;
        }, 800);
    }
});
```

---

### Problem 2 — Finger obscures tooltip
On touch devices the tooltip appears at or near the node, directly 
under the user's finger. It must appear above the finger.

**Fix — offset tooltip 80px above node centre on touch devices:**

Detect touch device and apply different tooltip positioning:

```javascript
const isTouchDevice = ('ontouchstart' in window);

function positionTooltip(node) {
    const pos = node.renderedPosition();
    const offset = isTouchDevice ? -80 : 10;
    let top = pos.y + offset;
    let left = pos.x + 10;

    // Bounds check — see Problem 3
    if (top < 10) {
        top = pos.y + 80; // flip below if too close to top
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}
```

On desktop the tooltip appears adjacent to the cursor as before.
On touch devices it appears 80px above the node centre.

---

### Problem 3 — Tooltip clipped at top in landscape mode
In landscape orientation on mobile, nodes near the top of the canvas 
cause the tooltip to appear above the viewport and get clipped.

**Fix — bounds check before positioning, flip below if clipped:**

Included in the `positionTooltip` function above:

```javascript
if (top < 10) {
    top = pos.y + 80; // flip to below node
}
```

If the calculated top position is within 10px of the viewport top 
edge, the tooltip flips to appear 80px below the node centre instead.

Also check right edge to prevent horizontal clipping:

```javascript
const tooltipWidth = tooltip.offsetWidth;
if (left + tooltipWidth > window.innerWidth - 10) {
    left = pos.x - tooltipWidth - 10; // flip to left of node
}
```

---

### Summary of touch behaviour after fixes

| Action | Desktop | Touch |
|---|---|---|
| Hover/dwell | Show tooltip | — |
| First tap | — | Show tooltip |
| Second tap same node | — | Navigate |
| Click | Navigate | — |
| Tap different node | — | Show new tooltip, reset |
| Tap empty canvas | — | Hide tooltip, reset |

---

### Note on pointer events
These fixes use Cytoscape's `tap` event which abstracts both mouse 
click and touch tap. The existing pointer events implementation 
(Amendment 3, section 6.5) should be reviewed to ensure tap and 
click events are not both firing on touch devices — if so, suppress 
the click handler on touch devices using `isTouchDevice`.
```
Here is Amendment 14:

---

```markdown
## Amendment 14 — graphviewer.md — 19 May 2026

## Hover tooltip — media functions and controls

### Principle
The hover tooltip is the general surface for revealing all available 
functions associated with a node — not just text. When a node is 
hovered, the tooltip shows:

1. The node's text (existing behaviour)
2. Any media controls or functions associated with that node

This is the foundation for the %%bd_ directive system described in 
the main ButterflyDreaming handover — nodes will eventually carry 
embedded directives that trigger media modules (audio, music, 
visual, XR). Hover is the natural moment to surface these.

### Current implementation — Settling node audio player

The Settling Entry node is the first media-enabled node. When 
hovered it shows its text plus a compact HTML5 audio player:

```html
<div class="tooltip-text">node text here</div>
<audio controls style="width:100%; margin-top:8px;">
  <source src="" type="audio/mpeg">
</audio>
```

The audio source is a placeholder — the mindfulness recording 
URL will be added when the audio file is ready.

The Settling tooltip should be wider than standard to accommodate 
the player — approximately 280px minimum width.

### Detecting media-enabled nodes
For now detect by node name — hardcode the audio player for 
the Settling node specifically:

```javascript
function buildTooltipContent(node) {
    let html = `<div class="tooltip-text">${node.data('text')}</div>`;
    
    if (node.data('name') === 'Settling') {
        html += `
            <audio controls style="width:100%; margin-top:8px;">
                <source src="" type="audio/mpeg">
            </audio>`;
    }
    
    return html;
}
```

### Future — %%bd_ directive system
In a future version, media modules will be triggered by directives 
embedded in node text using the %%bd_ prefix (e.g. 
%%bd_audio_src, %%bd_music, %%bd_visual). The tooltip builder 
will parse these directives and load the appropriate module. 
For now hardcoding by node name is sufficient.

### Pattern for future media nodes
Any node that should surface media controls on hover:
1. Add the relevant %%bd_ directive to its text property 
   (future) or detect by name (current)
2. Add the corresponding HTML control to buildTooltipContent()
3. Keep controls compact — the tooltip should not dominate 
   the canvas

### Mobile behaviour
Audio controls are touch-friendly natively in HTML5. No 
additional touch handling needed for the player itself. 
The tooltip positioning rules from Amendment 12 apply — 
the wider Settling tooltip should also be bounds-checked 
against the viewport edges.
```
## Amendment 15 — graphviewer.md — 19 May 2026

# Amendment 15 — graphviewer.md — 19 May 2026

## Media controls — screen-fixed position, activated by node click

### Problem with Amendment 14
Placing interactive controls (audio player) in the hover tooltip 
means the tooltip disappears when the cursor moves to click the 
controls. Hover is suitable for read-only content only — text, 
labels, previews. Interactive controls must live outside the tooltip.

### Revised principle
**Hover** — text and read-only preview only. No interactive controls.
**Click** — activates any media players or renderers associated 
with the node. Controls appear in a fixed screen position and 
persist until dismissed.

### Media control bar
A fixed media control bar sits in the top bar of the screen, 
to the right of the Reset button. It is hidden by default and 
appears when a media-enabled node is clicked.
[ Reset ]  [ ▶ Settling — mindfulness audio  ✕ ]

The bar contains:
- Node name label
- Relevant media control (audio player, music player etc.)
- Close button (✕) to dismiss

### Settling node implementation
When the Settling node is clicked:
- The media bar appears with a compact HTML5 audio player
- The bar remains visible while the user browses freely
- Clicking ✕ dismisses the bar
- Clicking Settling again while bar is visible dismisses it (toggle)

```javascript
function handleNodeClick(node) {
    // existing one-hop navigation...
    
    // check for media
    if (node.data('name') === 'Settling') {
        toggleMediaBar({
            label: 'Settling — mindfulness audio',
            html: `<audio controls>
                     <source src="" type="audio/mpeg">
                   </audio>`
        });
    }
}

function toggleMediaBar(content) {
    const bar = document.getElementById('media-bar');
    if (bar.classList.contains('active') && 
        bar.dataset.node === content.label) {
        // same node clicked again — dismiss
        bar.classList.remove('active');
        bar.dataset.node = '';
    } else {
        bar.innerHTML = `
            <span class="media-label">${content.label}</span>
            ${content.html}
            <button class="media-close" onclick="dismissMediaBar()">✕</button>`;
        bar.dataset.node = content.label;
        bar.classList.add('active');
    }
}

function dismissMediaBar() {
    const bar = document.getElementById('media-bar');
    bar.classList.remove('active');
    bar.dataset.node = '';
}
```

### HTML structure
Add to index.html alongside the reset button:

```html
<div id="top-bar">
    <button id="reset-btn">Reset</button>
    <div id="media-bar"></div>
</div>
```

### CSS
Media bar hidden by default, appears inline with reset button:

```css
#top-bar {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1000;
}

#media-bar {
    display: none;
    align-items: center;
    gap: 8px;
    background: rgba(0,0,0,0.7);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 6px 12px;
    color: white;
    font-size: 12px;
}

#media-bar.active {
    display: flex;
}
```

### Future — general mechanism
When any node is clicked, the click handler should check for 
associated media or renderers and activate them in the media bar. 
In a future version this will be driven by %%bd_ directives 
parsed from node text. For now detect by node name.

Multiple media bars may eventually be needed for different 
renderer types (audio, music, visual) — for now one bar 
handles all.

### Amendment 14 — partial revert
Remove the audio player from the hover tooltip for Settling. 
Hover returns to text-only for all nodes. The buildTooltipContent 
function should no longer add audio controls for any node.

Understood — here is Amendment 16 in full:

---

## Amendment 16 — graphviewer.md — 21 May 2026

## Search_CW Node — Virtual Cluster-Work Navigation Node

### Before implementing — check node data properties

Before writing any code for this amendment, check what data
properties are currently set on nodes in the Cytoscape instance.
In the browser console run:

```javascript
cy.nodes().first().data()
```

Then check specifically for type properties across all nodes:

```javascript
cy.nodes().filter('[type]').map(n => n.data('type'))
```

If `type` is not currently set on nodes, it must be added to
the node data when the graph is loaded from Memgraph — before
any Search_CW logic is implemented. The `type` property is
required for all selector logic in this amendment.

Report findings before proceeding.

---

### Background and design rationale

As the corpus grows, clicking a cluster would reveal dozens or hundreds
of directly connected TextNodes — unnavigable on screen. A filtering
layer is needed between the cluster and individual TextNodes.

The solution is a virtual navigation node called **Search_CW**
(Search Cluster-Work). It is not stored in Memgraph — it exists only
in the viewer's Cytoscape instance as a temporary node for the duration
of a user's navigation context. This is a deliberate architectural decision:

- The Memgraph graph remains a pure shared corpus — no user-specific or session-specific data
- Each user's viewer constructs their own Search_CW nodes independently
- The node's content is always dynamically constructed from Memgraph at the moment it is needed
- When the session ends or context changes the nodes are removed

This distinction between the shared persistent graph (Memgraph) and ephemeral session state (viewer memory) is fundamental to the platform's privacy architecture. No user journey is stored.

### What Search_CW represents

One Search_CW node appears per corpus work when a cluster is clicked. It represents the intersection of:
- A specific corpus work (e.g. Tao Te Ching)
- The currently active cluster (e.g. Paradox)

Its content — the TextNodes it reveals — is the set of chapters from that work connected to the active cluster, constructed dynamically by a Memgraph query at click time.

### Navigation flow

```
Cluster clicked
  → All existing Search_CW nodes removed
  → Memgraph queried for works with chapters connected to this cluster
  → New Search_CW node(s) created in Cytoscape — one per work found
  → User clicks Search_CW
    → Memgraph query returns: all TextNodes from that work
      connected to lastClusterNode + the Gateway node for that work
    → Results rendered in Cytoscape alongside Search_CW node
  → User clicks a TextNode
    → Standard one-hop neighbourhood displayed
    → Search_CW remains visible while current node connects to lastClusterNode
    → Search_CW hidden (not removed) when user navigates to a node
      with no connection to lastClusterNode
  → User clicks Search_CW again
    → Reruns query using current lastClusterNode — usually same result
      but may differ if user has clicked a different cluster since
  → User clicks a new Cluster
    → All Search_CW nodes removed
    → New Search_CW nodes created for new cluster context
```

### lastClusterNode — session state variable

A single variable maintained in viewer.js:

```javascript
let lastClusterNode = null; // the Cluster node most recently clicked
let currentClusterColour = null; // its family colour
```

Set when any Cluster node is clicked:

```javascript
cy.on('tap', 'node', (event) => {
    const node = event.target;
    if (node.data('type') === 'Cluster') {
        lastClusterNode = node;
        currentClusterColour = node.data('colour');
    }
});
```

This variable drives:
- Which Search_CW nodes to create and display
- The colour of Search_CW nodes (cluster's family colour)
- The Memgraph query when Search_CW is clicked
- Whether Search_CW remains visible as the user navigates

### Search_CW node — visual specification

- **Shape:** octagon — visually distinct from all other node types
- **Colour:** family colour of lastClusterNode at time of creation
- **Label:** work name e.g. "Tao Te Ching" — centred inside node, white text
- **n_r display:** count of TextNodes from this work connected to lastClusterNode — shown top right as per other nodes
- **Border:** 1px white

### Search_CW node — lifecycle in Cytoscape

The Search_CW node is a temporary Cytoscape node. It must be explicitly created and destroyed by the viewer at the right moments. CC must implement this lifecycle carefully — Cytoscape will not manage it automatically.

**Creation — when a Cluster is clicked:**
1. Remove any existing Search_CW nodes from the Cytoscape instance
2. Run the Memgraph query to find works connected to this cluster
3. For each work returned, add a new Search_CW node to Cytoscape
4. Add edges between the clicked Cluster node and each Search_CW node
5. Apply layout update to position the new nodes naturally

**Persistence — while user navigates TextNodes:**
Search_CW nodes remain in the Cytoscape instance. They stay visible or hidden according to the breadcrumb rule but are not removed from Cytoscape until a new cluster is clicked or reset.

**Hiding vs removal:**
- **Hide** (cy.hide()) when breadcrumb trail expires — user has navigated away from cluster territory. Node stays in Cytoscape in case user returns
- **Remove** (cy.remove()) when a new cluster is clicked or reset button pressed — clean slate for new context

**Destruction — when any of these occur:**
- A new Cluster node is clicked — remove all Search_CW nodes, create new ones for the new cluster
- Reset button clicked — remove all Search_CW nodes
- Session ends — Cytoscape instance destroyed, all nodes gone

**Why temporary Cytoscape nodes rather than pure DOM:**
Cytoscape manages all layout, positioning, zoom, pan, and interaction consistently across node types. Adding Search_CW as a proper Cytoscape node means it participates in the force layout naturally, responds to zoom and pan correctly, and handles touch events through the same event system as all other nodes. Managing it as a separate DOM element would require duplicating all of that handling.

### Search_CW node — creation query

When a Cluster is clicked, query Memgraph for all works that have TextNodes connected to that cluster:

```javascript
const query = `
    MATCH (n:TextNode)-[r]->(c:Cluster {name: $clusterName})
    WHERE n.gateway = false
    RETURN n.source_text AS work, count(n) AS chapterCount
    ORDER BY chapterCount DESC
`;
```

For each result, create a temporary Cytoscape node:

```javascript
cy.add({
    group: 'nodes',
    data: {
        id: `search_cw_${work.replace(/\s+/g, '_')}`,
        type: 'Search_CW',
        name: work,
        colour: currentClusterColour,
        n_r: chapterCount,
        source_text: work
    }
});

// Add edge from clicked cluster to Search_CW node
cy.add({
    group: 'edges',
    data: {
        source: lastClusterNode.id(),
        target: `search_cw_${work.replace(/\s+/g, '_')}`,
        type: 'HAS_SEARCH_CW'
    }
});
```

### Search_CW node — click behaviour

When a Search_CW node is clicked, run the dynamic Memgraph query:

```javascript
const query = `
    MATCH (gw:TextNode {source_text: $work, gateway: true})
    OPTIONAL MATCH (gw)-[:CHILD*]->(n:TextNode)-[r]->(c:Cluster {name: $clusterName})
    RETURN gw, n, r
`;
```

This returns:
- The Gateway node (always — sequential entry point to the work)
- All TextNodes from that work connected to lastClusterNode
- The relationships (for colour and weight styling)

Render these in Cytoscape alongside the Search_CW node, following the standard one-hop display rules.

### Search_CW persistence — breadcrumb trail

After a Search_CW click, as the user navigates into TextNodes, on each node click check whether the current node has any relationship to lastClusterNode:

```javascript
function checkSearchCWVisibility(clickedNode) {
    if (!lastClusterNode) return;
    const clusterName = lastClusterNode.data('name');
    const connected = clickedNode.neighborhood()
        .filter(n => n.data('name') === clusterName)
        .length > 0;
    if (connected) {
        cy.$('[type="Search_CW"]').show();
    } else {
        cy.$('[type="Search_CW"]').hide();
    }
}
```

### Future — User node

A future implementation will introduce a User node in Memgraph to record the session path through real and virtual nodes:

```
(:User {
    websocket_id: 'ws-abc123',
    path: [...node urls visited...],
    current_cluster: 'Paradox'
})
```

This will support gravity well scoring, dyadic pairing, and optional research/moderation logging. For now lastClusterNode in viewer.js is sufficient.

### Note for CC and future developers

The Search_CW node is the first example of a virtual/temporary node in the ButterflyDreaming viewer — a Cytoscape node with no Memgraph counterpart. This pattern will recur as the dyadic phase develops. Virtual nodes always:
- Have a `type` property identifying them as virtual (type: 'Search_CW')
- Are created and destroyed by viewer logic, never persisted to Memgraph
- Derive their content from Memgraph queries using session state variables
- Do not follow the standard one-hop click rule — they have their own defined click behaviour as specified above
- Participate fully in Cytoscape layout, zoom, pan, and touch handling

The separation between Memgraph (shared permanent corpus) and viewer session state (ephemeral, user-specific) must be maintained. Never store user navigation state in Memgraph.

### Works currently in Memgraph
- Tao Te Ching (McDonald 1996) — 82 nodes (1 gateway + 81 chapters)

### This structure is designed to scale
When new corpus works are added to Memgraph, Search_CW nodes for those works will appear automatically when their chapters share cluster connections with the active cluster. No viewer code changes are needed — the creation query finds all works dynamically.

---

## Amendment 17 — graphviewer.md — 22–23 May 2026

## Search_CW two-phase migration, audio player, visual refinements, and bug fixes

---

### 17.1 — Search_CW two-phase implementation

The design from Amendment 16 was implemented and refined into a two-phase interaction model.

**Phase 1 — Graph node (octagon in graph)**

When the user clicks a Cluster node, one octagon Search_CW node is created per matching work and added to the Cytoscape graph, connected to the cluster by a dashed `HAS_SEARCH_CW` edge. The octagon inherits the cluster's family colour. An `n_r` badge showing chapter count is overlaid on the node. The octagon is positioned by the fCoSE layout alongside the cluster and its Family neighbours.

**Phase 2 — Fixed button (migrated to UI)**

When the user clicks an octagon node in the graph, the octagon disappears from the graph and reappears as a fixed-position button at the top of the screen, retaining its octagon shape, family colour, and label. The chapter results (gateway + matching TextNodes) are simultaneously shown in the graph, with a solid synthetic `HAS_GATEWAY` edge guaranteeing a visible line from the cluster to the gateway node.

The Phase 2 button is a **persistent context control**: it stays visible while the user navigates chapter nodes and does not hide until the user clicks a different cluster or presses Reset. This means the user can repeatedly re-run the chapter search from the button without losing their place.

Clicking the button re-runs `handleSearchCWTap` on the stored `lastSearchCWNode`, re-querying and re-displaying the chapter results.

**Session state variables**

```javascript
let lastClusterNode    = null;  // the last cluster whose Search_CW nodes are active
let currentClusterColour = null;  // colour passed to new Search_CW nodes
let lastSearchCWNode   = null;  // the node that migrated to the Phase 2 button
let syntheticEdgeIds   = new Set();  // HAS_GATEWAY edges to clean up on reset
```

**Lifecycle**

| Event | Effect |
|---|---|
| Cluster clicked | clearSearchCWNodes → new octagon nodes added to graph (Phase 1) |
| Octagon clicked | Graph nodes hidden; button appears (Phase 2) |
| Button clicked | Chapter results re-queried and shown; button stays visible |
| Non-TextNode tapped (Phase 1) | Octagon nodes hidden in graph |
| TextNode connected to cluster (Phase 1) | Octagon nodes shown |
| TextNode not connected (Phase 1) | Octagon nodes hidden |
| Any node tapped (Phase 2) | Button unchanged |
| Reset pressed | clearSearchCWNodes → button hidden, nodes removed |
| Different cluster clicked | clearSearchCWNodes → new octagons for new cluster |

---

### 17.2 — Search_CW button — visual specification

The Phase 2 button is a DOM `<div>` with the same octagon shape as the Cytoscape graph node, using CSS `clip-path`:

```css
#search-bar {
  position: fixed;
  top: 16px;
  left: 30%;
  transform: translateX(-50%);
  width: 98px;
  height: 98px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  filter: drop-shadow(0 0 3px rgba(255,255,255,0.85));
  color: #ffffff;
  font-size: 11px;
  display: none;   /* hidden by default */
  z-index: 10;
}
#search-bar.active { display: flex; }
```

The background colour is set dynamically from `node.data('colour')` (the cluster's family colour). The `filter: drop-shadow` provides a visible white glow outline — `border` and `outline` are clipped by `clip-path` and cannot be used.

**Placement:** centred at 30% from the left edge of the screen (not the full centre) to avoid overlapping the media player bar in the top-right on narrow phone screens.

---

### 17.3 — Custom HTML5 audio player (Amendment 15 replacement)

The native `<audio controls>` element was replaced by a custom player to fix a Chrome/Safari shadow DOM rendering defect in which the rounded-rectangle play button control obscured the time readout. The custom player is injected into `#media-bar`:

```javascript
function toggleMediaBar(label, audioSrc) {
  // Creates: [label] [▶/⏸ button] [time display] [✕ close]
  // Audio element is managed in JS, not rendered as a native control
}
```

Time display uses `fmtTime(s)` → `m:ss` format. The player currently loads `bass_recorder_C3.mp3` (a test file in the project root) for the Settling node. The player is served via `express.static('.')` from `server.js` — no special route needed.

---

### 17.4 — Visual refinements

| Change | Before | After |
|---|---|---|
| Arrowhead size | `arrow-scale: 0.6` | `arrow-scale: 1.2` (doubled) |
| Inter-TextNode edge colour | `#aaaaaa` | `#cccccc` (brighter but not white) |
| Gateway node border width | 1px | 2px (doubled) |
| Conversations cluster size | undersized | 60px (contains label) |
| n_r badge drop-shadow | none | `rgba(255,255,255,0.65)` subtle white |

---

### 17.5 — Bug fixes

**Bug: Search_CW node re-appearing after migration**

`showIds` in `handleSearchCWTap` included `node.id()` (the virtual Search_CW node). After `cy.elements().hide()`, `showIds.forEach(el.show())` immediately re-showed it, undoing the octagon hide. Fixed by removing the virtual node's ID from `showIds`.

**Bug: Octagons appearing when Family node clicked**

`updateSearchCWVisibility` checked whether the tapped node was a neighbour of `lastClusterNode`. Family nodes are direct Cytoscape neighbours of Cluster nodes, so `connected` was always `true` for Family taps, incorrectly re-showing the octagons. Fixed by gating the show logic on `node.data('type') === 'TextNode'` — any other node type hides the octagons.

**Bug: Phase 2 button disappearing when non-cluster nodes tapped**

`updateSearchCWVisibility` was hiding the Phase 2 button when the user tapped a gateway node (which has no direct Cytoscape edge to the cluster). Fixed by making Phase 2 a no-op in `updateSearchCWVisibility` — the button is now persistent and is only cleared by `clearSearchCWNodes` (reset or new cluster click).

**Bug: Tooltip cut off at left screen edge on narrow devices**

`positionTooltip` clamped right and bottom overflow but not left. Fixed by adding `if (left < pad) left = pad` in both mouse and touch positioning functions.

---

### 17.6 — Cypher corpus file

The 14 individual `.cypher` files from the Tao Te Ching corpus were concatenated into a single file `TaoTeChing11_81.cypher` for easier loading into Memgraph. This file is in the project root and is not committed to GitHub (it is too large and Memgraph-specific).

---

### 17.7 — Server

`server.js` was migrated from `neo4j-driver` targeting a local Neo4j instance to `neo4j-driver` targeting a local **Memgraph** instance (`bolt://localhost:7687`, credentials `memgraph`/`memgraph`, database `memgraph`). The serialisation layer (`serializeValue`, `serializeProps`, `serializeEntity`) handles Memgraph's typed return values (Integer, DateTime, Node, Relationship) and converts them to plain JS before JSON serialisation.

---

## Amendment 18 — graphviewer.md — 26–27 May 2026

## Missing Cluster-Family edges, visual cleanup, and UI layout overhaul

---

### 18.1 — Visual style: shadow properties removed

Cytoscape.js does not support the `shadow-blur`, `shadow-color`, `shadow-opacity`, `shadow-offset-x`, `shadow-offset-y` style properties. These were applied in earlier sessions to Family, Cluster, Settling, Conversations, gateway TextNode, and Search_CW nodes. They generated a console warning on every page load and had no visual effect.

All shadow properties were removed from `buildStyle()`. Node visual depth is now achieved through borders only (see Amendment 17 visual refinements). The border settings are unchanged:

- Family, Cluster, Settling, Conversations, Search_CW: `border-width: 2`, `border-color` at 1/3 colour intensity, `border-opacity: 0.5`
- Root: `border-width: 5`, `border-color: #90EE90` (light green, no shadow — glow effect tried and rejected as "too designed")

---

### 18.2 — UI layout overhaul: top bar reorganisation

The fixed top-bar controls were reorganised to make space for the tracker button concept (see 18.3):

| Control | Before | After |
|---|---|---|
| Reset button | Top-right | Top-left |
| Media player bar | Inside top-bar (below reset) | Top-right, independently positioned |
| Tracker button | Top-left (single position) | Second row, centered (`top: 52px; left: 50%`) |

The `#media-bar` element was moved out of `#top-bar` in `index.html` and given its own `position: fixed` at `top: 16px; right: 16px`. Both the reset button and media bar now sit at the same vertical level at opposite ends of the screen.

The tracker button (`#search-bar`) sits on a second visual row at `top: 52px`, centered horizontally. This positions it below the reset/player row and reserves space for future breadcrumb expansion (see 18.3).

---

### 18.3 — Tracker button concept: Search_CW shape change and row layout

The Search_CW nodes were changed from octagon to rectangle (`shape: 'rectangle'`, `width: 90`, `height: 28`) to match the visual weight of the reset button and to introduce the tracker button concept more deliberately.

**Tracker button concept.** These nodes represent the user's in-session navigation context — which corpus works are relevant to the current cluster. As the platform develops toward cooperative browsing (dyadic sessions), these will become a breadcrumb row: a horizontal strip of small rectangular buttons recording the path through the corpus. One button per work visited during the session. For now a single tracker button appears when a cluster is activated.

**Horizontal row positioning.** After the fCoSE layout settles (500ms delay), Search_CW nodes are repositioned into a horizontal row 150px below the cluster node, centered on the cluster's x-position with 110px spacing between nodes:

```javascript
setTimeout(() => {
  const trackers = cy.nodes('[type="Search_CW"]:visible');
  if (!trackers.length) return;
  const rowX = clusterNode.position().x - ((trackers.length - 1) * 110) / 2;
  const rowY = clusterNode.position().y + 150;
  trackers.forEach((n, i) => n.position({ x: rowX + i * 110, y: rowY }));
  cy.fit(cy.elements(':visible'), 60);
}, 500);
```

The Phase 2 tracker button (DOM element `#search-bar`) retains the work name and cluster colour but is now styled as a plain rectangle matching the reset button (same padding, font size, letter spacing). It sits centered on the second row.

---

### 18.4 — Media player: remove toggle-close behaviour

The media player previously closed when the Settling node was tapped a second time (toggle behaviour). This caused a state-machine problem: if the player had been dismissed and the user tapped Settling, the tap could be interpreted as a second tap on an already-active node and no-op, making the player impossible to reopen without navigating away.

The toggle-close branch was removed. The player now only opens (or does nothing if the same track is already showing). The only way to close the player is the `✕` button:

```javascript
function toggleMediaBar(label, audioSrc) {
  if (mediaBar.classList.contains('active') && mediaBar.dataset.node === label) {
    return;  // already open — only ✕ closes the player
  }
  // open or switch track...
}
```

---

## DDR-4: Missing Cluster-Family edges — Memgraph integer ID namespace collision
**Date:** 26 May 2026
**Status:** Resolved

### The problem

When clicking a Family node, some Cluster nodes that should appear in its neighbourhood were absent — despite all 76 clusters being present in the Cytoscape graph. The missing clusters (Paradox, Order/Chaos, Naming/Becoming, and others) could be reached via TextNode clicks but not via Family clicks, meaning their Cluster-Family edges were absent from Cytoscape while their Cluster-TextNode edges were present.

### Investigation

Three rounds of diagnostic logging were added across two sessions.

**Round 1** confirmed all 76 clusters loaded into `nodesById`. The missing clusters existed in the graph but had no Family connections.

**Round 2** (name-based resolution fix) added a second query `MATCH (c:Cluster)-[r]-(f:Family) RETURN c, r, f` and built a name→id lookup to resolve the known Memgraph elementId inconsistency (the same node returning different elementIds in different query contexts). The fix ran correctly but the missing edges were still absent.

**Round 3** added targeted logging inside the cfRecords loop and a post-init check on Cytoscape's actual edge state for the Paradox cluster. The logs revealed:

```
[BD] cf: Paradox → Reason | cResolved: true | fResolved: true | cId: "120" | fId: "85" | rId: "314"
[BD] Paradox connectedEdges: 127  — ALL have tgt:120, NONE have src:120
```

The cfRecords loop was correctly resolving IDs and storing the edge with `source: "120"` (Paradox), `target: "85"` (Reason). Yet the edge never appeared in Cytoscape.

### Root cause

**Memgraph shares its integer ID namespace across both nodes and relationships.**

A node and a relationship can have the same integer ID — e.g. TextNode node `315` and the Paradox-Spirit Cluster-Family relationship `315` are two entirely different objects that happen to share the same integer identifier.

Cytoscape.js requires all elements (nodes and edges) to have unique `id` values across the entire graph. In `init()`, nodes are added to the elements array before edges:

```javascript
nodesById.forEach(nd => elements.push({ data: nd }));   // nodes first
edgesById.forEach(ed => elements.push({ data: ed }));   // edges second
```

When Cytoscape processes this array, it registers the TextNode with id `"315"` first. When it then encounters the Cluster-Family edge with id `"315"`, the ID is already taken — Cytoscape silently discards the edge.

This affected only the Cluster-Family edges because those are the only edges whose relationship IDs collide with node IDs in the data as it currently stands. TextNode→Cluster relationship IDs happen to not collide — so the majority of the graph worked correctly.

### Fix

Prefix every Cluster-Family edge ID with `"cf_"` before storing it in `edgesById`:

```javascript
const cfEdgeId = 'cf_' + rId;
const ed = buildEdgeData(r, c, f);
ed.id = cfEdgeId;
ed.source = cId;
ed.target = fId;
edgesById.delete(rId);    // remove any raw-rId entry that would be dropped anyway
edgesById.set(cfEdgeId, ed);
```

The prefix guarantees the ID can never collide with a Memgraph integer node ID. The `edgesById.delete(rId)` removes any entry stored under the raw relationship ID by the main query, which would have been silently dropped by Cytoscape anyway.

### Standing rule for future development

**Memgraph does not guarantee unique IDs across node and relationship objects.** Any code that stores both nodes and relationships in a shared namespace (such as Cytoscape's element ID space, a JavaScript Map, or any other keyed collection that mixes both) must prefix or namespace the keys to avoid collisions.

Recommended prefixes:
- Node IDs: use as-is (numeric strings from Memgraph `elementId`)
- Relationship IDs where used as element IDs: prefix with a type-specific tag (e.g. `cf_` for Cluster-Family, `cw_` for cluster-work edges)

This is a platform-wide concern. Any future code creating Cytoscape elements from Memgraph data must apply this rule.

---

## DDR-5: Search_CW contextual tooltip and forward design — scrolling breadcrumbs for two users
**Date:** 27 May 2026
**Status:** Implemented (phase 1); forward design captured

---

### 5.1 — Contextual tooltip for Search_CW nodes

#### Problem

Search_CW nodes (the small rectangular "work" nodes that appear below a Cluster when it is expanded) previously showed only the bare work title as a tooltip. The breadcrumb bar button (`#search-bar`) showed the same plain title. Neither surface gave the user context about *why* that work was surfaced — i.e. which cluster filter produced it.

#### Decision

Generate the tooltip text programmatically at display time using both the work name stored on the node and the `lastClusterNode` that is already maintained in the interaction layer:

```
<work name> : filtered by: <cluster name>
```

Example: `Tao Te Ching : filtered by: Transformation`

This applies uniformly to:

1. **Cytoscape graph nodes** — `buildTooltipContent()` constructs the string for any `Search_CW` node.
2. **`#search-bar` DOM button** (breadcrumb phase 2) — a `searchBarTooltipLabel()` helper reads `searchBar.textContent` (the work name) and `lastClusterNode.data('name')` and constructs the same string.

Both surfaces follow the same interaction contract: **hover / first mobile touch shows the tooltip; click / second mobile touch navigates.**

#### Implementation

`buildTooltipContent` (viewer.js):

```javascript
if (type === 'Search_CW') {
  const work = node.data('name') || '';
  const cluster = lastClusterNode ? lastClusterNode.data('name') : '';
  return (work && cluster) ? `${work} : filtered by: ${cluster}` : work;
}
```

`#search-bar` mouseenter and touchstart use a shared helper:

```javascript
function searchBarTooltipLabel() {
  const work = searchBar.textContent.trim();
  const cluster = lastClusterNode ? lastClusterNode.data('name') : '';
  return (work && cluster) ? `${work} : filtered by: ${cluster}` : work;
}
```

---

### 5.2 — Forward design: scrolling breadcrumbs for two users

#### Context

The breadcrumb bar concept (currently a single `#search-bar` button showing the most recent work selection) is the seed of a richer navigation history surface. The next phase of development extends this into a **scrolling breadcrumb trail** that records a user's navigation path through the graph.

The viewer will eventually support two concurrent users:

- **"you"** — the local user navigating on the current device
- **"buddy"** — a remote user whose navigation state is transmitted to the local view

Both users will have their own breadcrumb trail. The "you" trail is implemented first.

#### Scrolling breadcrumbs — "you"

Each time the local user selects a work from a cluster (i.e. taps/clicks a Search_CW node and confirms navigation), a breadcrumb entry is appended to the trail. An entry records at minimum:

- The work title
- The cluster context at the time of selection (the "filtered by" cluster)

The trail is displayed as a horizontally scrollable row of labelled chips or buttons, most-recent on the right. Tapping/clicking a breadcrumb replays that navigation step — returning to the work in its cluster context.

The tooltip format introduced in DDR-5.1 (`<work> : filtered by: <cluster>`) is the natural text for each breadcrumb chip. The chip label may be shortened (work title only) with the full contextual string appearing on hover/touch.

#### Two-user model — "buddy"

The "buddy" breadcrumb trail is displayed in a second row (or a visually distinct band within the same row). Buddy's trail represents navigation performed on a separate device or session, transmitted to the local view in near-real time.

**The hover/touch interaction on a buddy breadcrumb chip is the primary mechanism by which the two users come together during the navigation phase.** When the local user hovers over (desktop) or first-touches (mobile) a buddy chip, the graph can shift to highlight or surface the work that buddy is currently viewing — creating a shared moment of attention without requiring either user to explicitly synchronise.

This "hover to converge" model means:

- Neither user is forced to follow the other's path
- The act of noticing and hovering on a buddy chip is a deliberate, low-friction gesture of interest
- It maps naturally onto the existing first-touch = tooltip, second-touch = navigate contract already established for Search_CW nodes

#### Implementation order

1. **"you" breadcrumb trail** — local, single-user, no server changes required. Append to trail on `handleSearchCWTap`; render as scrollable chip row above or below the current `#search-bar` position; wire tap/click to replay navigation.

2. **"buddy" breadcrumb trail** — requires a server-side session and broadcast mechanism (WebSocket fan-out). Buddy navigation events are received as messages and appended to the buddy row. Hover/touch on a buddy chip triggers the graph convergence interaction.

---

*Amendment 18 — 26–27 May 2026*