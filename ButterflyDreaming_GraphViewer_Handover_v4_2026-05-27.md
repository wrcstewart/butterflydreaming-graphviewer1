# ButterflyDreaming — Graph Viewer
## Comprehensive Handover Document v4
### For New Phase: Breadcrumb Trails and Dyadic Pairing

**Version:** 4.0  
**Date:** 27 May 2026  
**Prepared by:** Claude (Anthropic) with William Stewart  
**Preceding docs:** graphviewer.md (CC session record through Amendment 18 / DDR-5)  
**Primary codebase:** /Users/williamstewart2/butterflydreaming_graphviewer1  
**Live URL:** https://graph.virtualfictions.uk  
**Purpose:** Full context handover for new Claude session beginning breadcrumb trail and dyadic pairing implementation.

---

## 1. ButterflyDreaming — Platform Summary

ButterflyDreaming is a non-commercial anonymous social media platform that pairs two users in a temporary one-to-one encounter mediated by shared symbolic texts — poetry, myth, folktale, philosophy. The two users collaboratively draft a short new text (a child node) saved permanently to a growing public graph. No accounts, no profiles, no advertising, no data monetisation.

Philosophical foundations: Zhuangzi butterfly dream (permeable self/other boundary), Daoist wu wei (non-coercive mediation), chaos theory strange attractors (emergent thematic clusters), symbiogenesis (human-AI coevolution), Jungian amplification, Castoriadis agora.

Current development stage: graph viewer prototype with full corpus browsing, Search_CW navigation, and Cloudflare tunnel for remote access. Next phase: breadcrumb trails, dyadic pairing, gravity well scoring.

---

## 2. Infrastructure

### 2.1 Hardware and OS
MacBook M4 128GB — development host. macOS Sequoia 15.5. Sleep disabled (System Settings > Battery).

### 2.2 Technology Stack

| Component | Technology | Details |
|---|---|---|
| Graph database | Memgraph (Docker) | memgraph/memgraph-mage, container: memgraph-dev |
| Graph UI | Memgraph Lab (Docker) | memgraph/lab, container: memgraph-lab, port 3000 |
| App server | Express.js (Node.js) | server.js, port 8080, project root |
| Graph viewer | Cytoscape.js + fCoSE | viewer.js, served by Express |
| Dev database | Neo4j Desktop 2 | Schema design only — not used by viewer |
| Document store | MongoDB | Available but not currently used in production |
| Tunnel | Cloudflare cloudflared | tunnel: butterflydreaming, DNS: graph.virtualfictions.uk |
| Language | JavaScript + Python | JS for viewer/server, Python for utility scripts |
| Real-time | WebSocket (ws npm) | Integrated into Express server |

### 2.3 Key Commands

```bash
# Start Express server (from project root)
cd /Users/williamstewart2/butterflydreaming_graphviewer1
node server.js

# Start Cloudflare tunnel (separate terminal tab)
cloudflared tunnel run butterflydreaming

# Access locally
http://localhost:8080

# Access remotely
https://graph.virtualfictions.uk

# Memgraph Lab (Chrome only for copy/paste)
http://localhost:3000  |  host: memgraph-dev  port: 7687  user: memgraph  pass: memgraph

# Memgraph backup to Dropbox
docker cp memgraph-dev:/var/lib/memgraph /Users/williamstewart2/Dropbox/memgraphback

# Cron backup (every 3 hours)
0 */3 * * * /usr/local/bin/docker cp memgraph-dev:/var/lib/memgraph /Users/williamstewart2/Dropbox/memgraphback

# Load cypher file into Memgraph
docker exec -i memgraph-dev mgconsole --username memgraph --password memgraph < ~/Downloads/file.cypher
```

### 2.4 Docker Container State

```bash
docker ps   # should show:
#  memgraph-dev   memgraph/memgraph-mage   ports: 7687, 7444   network: memgraph-net
#  memgraph-lab   memgraph/lab             ports: 3000          network: memgraph-net

# Named volume for data persistence
# mg_lib -> /var/lib/memgraph inside container

# If containers stopped, restart with:
docker start memgraph-dev memgraph-lab
```

### 2.5 Neo4j Desktop (Reference Only)
Neo4j Desktop 2 (v2026.04.0) installed with data on /Volumes/Neo4jData (APFS volume, disk3s7). Instance: ButterflyDreaming-dev. The viewer no longer connects to Neo4j — kept for schema experimentation only. Memgraph is the canonical database.

---

## 3. Database Schema — Memgraph

### 3.1 Node Types

| Label | Count | Key properties | Notes |
|---|---|---|---|
| Root | 1 | name, text, url, source, lang, n_r | UI entry point — golden dot. Connects to Entry nodes via CONTAINS. |
| Entry | 2 | name, text, colour, url, n_r | Settling (#40E0D0) and Conversations (#E87A20). Navigation layer. |
| Family | 6 | name, colour, hex, description, n_r | Nature, Emotion, Reason, Spirit, Symbolic, Arts. n_r always 0. |
| Cluster | 76 | name, family_primary, display_name, label, n_r | 64 original + 12 new for Grimm. display_name for in-node label, label for hover. |
| TextNode | 151 | url, text, raw_text, source, source_text, translator, seq, title, lang, created_at, tagging_status, gateway, chapter, views, selects, fusions, n_r | All corpus content. gateway:true = top of lineage. n_r = outgoing CHILD count only. |

### 3.2 Relationship Types

| Type | Between | Properties | Notes |
|---|---|---|---|
| CONTAINS | Root/Entry/Conversations -> Entry/Family | none | Navigation hierarchy. |
| RESONATES_WITH | Cluster->Family, TextNode->Cluster | weight, family_colour | Strong thematic affinity. |
| BRIDGES_TO | Cluster->Family, TextNode->Cluster | weight, family_colour | Cross-family/cluster bridge. |
| ECHOES | Cluster->Family, TextNode->Cluster | weight, family_colour | Faint surface recall. |
| TAGGED_AS | TextNode->Cluster | weight, family_colour | Primary cluster classification. |
| GIVES | TextNode->Cluster | weight, family_colour | Generative — one enables another. |
| CHILD | TextNode->TextNode | weight, source, created_at | Genealogical lineage. Arrow: parent->child. source: sequence\|dyad\|editorial. |

### 3.3 Family Colours

| Family | Hex | Colour |
|---|---|---|
| Nature | #4A8C4F | Forest green |
| Emotion | #C0504D | Warm red |
| Reason | #4A7BC0 | Clear blue |
| Spirit | #9B6B9B | Muted violet |
| Symbolic | #C09A3A | Amber/gold |
| Arts | #C47A5A | Terracotta |

### 3.4 Current Corpus

| Work | source_text value | Nodes | Notes |
|---|---|---|---|
| Tao Te Ching | Tao Te Ching | 82 | 1 gateway + 81 chapters. McDonald 1996. Complete. |
| Zhuangzi | Zhuangzi (Inner Chapters) | 51 | 1 gateway + 50 sections. Inner Chapters only. |
| Whitman — Song of Myself | Whitman - Leaves of Grass | 11 | 1 gateway + 10 sections. |
| Grimm — Clever Elsie | Grimm's Fairy Tales | 7 | 1 gateway + 6 parts. Margaret Hunt 1884. |

**Total: 151 TextNodes. source_text must be exact and consistent within a work.**

### 3.5 n_r Rules

- **TextNode:** outgoing CHILD relationships only (child count in lineage)
- **Cluster:** all connections excluding Family, Root, and gateway TextNodes
- **Family:** always 0
- **Root/Entry:** 0

End-of-file recalculation block for every corpus load file:

```cypher
MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family
AND NOT m:Root
AND NOT (m:TextNode AND m.gateway = true)
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
```

### 3.6 family_colour Rule
Every TextNode-to-Cluster and Cluster-to-Family relationship must carry a `family_colour` property set to the hex of the relevant family. This drives edge colouring in the viewer. Set at load time — never omit.

---

## 4. Viewer Architecture

### 4.1 File Structure

```
butterflydreaming_graphviewer1/
  index.html          - page structure, loads Cytoscape CDN, viewer.js
  viewer.js           - all client-side graph logic (Cytoscape, WebSocket client)
  style.css           - canvas styling, tooltip, media bar, search bar
  cursor-wings.svg    - custom cursor (two triangles suggesting wings)
  server.js           - Express server + WebSocket server + Memgraph connection
  package.json        - dependencies: neo4j-driver, express, ws
  graphviewer.md      - CC session record (amendments + DDRs)
  bass_recorder_C3.mp3 - test audio file for Settling media player
```

### 4.2 server.js

```javascript
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

// Serialisation layer handles Memgraph typed returns
// serializeValue(), serializeProps(), serializeEntity()
// converts Integer, DateTime, Node, Relationship to plain JS

// Broadcast helper for corpus updates
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(message));
  });
}
// All CORPUS writes must call broadcast() after success

// Buddy-only send for navigation state
function sendToBuddy(sessionId, data) {
  const buddyId = sessions[sessionId].pairedWith;
  if (buddyId && clients[buddyId]?.readyState === WebSocket.OPEN)
    clients[buddyId].send(JSON.stringify({ type: 'buddy_update', data }));
}
```

### 4.3 WebSocket URL — Dynamic (Critical)

```javascript
// viewer.js — must be dynamic, never hardcoded to localhost
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
```

> **WARNING:** Never hardcode ws://localhost. Remote devices connect to their own localhost.

### 4.4 Node Visual Styling

| Type | Shape | Colour | Label | Border |
|---|---|---|---|---|
| Root | ellipse | #FFD700 gold | name property | 5px #90EE90 |
| Entry (Settling) | ellipse | #40E0D0 cyan | name property | 2px |
| Entry (Conversations) | ellipse | #E87A20 orange | name property | 2px |
| Family | **oval** (ellipse, wider than tall) | family hex | name property | 2px at 1/3 intensity |
| Cluster | ellipse | primary family colour (dynamic) | display_name (two lines where split) | 2px |
| TextNode (gateway) | round-rectangle | dark fill white border | seq: title | 2px white |
| TextNode (seed) | round-rectangle | dark fill white border | seq: title | 1px white |
| TextNode (dyad) | round-rectangle | dark fill grey border | seq: title | 0.6px #888888 |
| Search_CW (virtual) | rectangle 90x28 | lastClusterNode colour | work name | none |

**Family nodes are oval — set different width and height:**
```javascript
'shape': 'ellipse',
'width': 90,
'height': 45
```

**Cluster display_name uses \n for two-line labels. Ensure:**
```javascript
'text-wrap': 'wrap',
'text-max-width': '80px'
```

### 4.5 Edge Styling
All edges: `width = weight x 2.5, minimum 0.5px`. Colour = `family_colour` property.

CHILD edges only — triangle arrowhead parent->child:

| From | To | Source | Width | Colour |
|---|---|---|---|---|
| Gateway | Ordinary | seed | 1.5px | #ffffff |
| Gateway | Ordinary | dyad | 0.6px | #888888 |
| Ordinary | Ordinary | seed | 1.0px | #ffffff |
| Ordinary | Ordinary | dyad | 0.6px | #888888 |

Inter-TextNode edges (non-CHILD): #cccccc. Arrowhead scale: 1.2.

### 4.6 Interaction Model

**Core rule: clicking any node shows only that node and its immediate one-hop neighbours.**

| Node clicked | Result |
|---|---|
| Root | Shows Entry nodes via CONTAINS |
| Entry: Conversations | Shows 6 Family nodes |
| Entry: Settling | Shows Settling only + opens media player |
| Family | Shows connected Cluster nodes. Other families vanish. |
| Cluster | Shows Family nodes + Search_CW virtual nodes (one per work with chapters in this cluster) |
| Search_CW (graph) | Migrates to Phase 2 button. Shows gateway + chapters filtered by lastClusterNode. |
| Search_CW (Phase 2 button) | Re-runs chapter query. Button stays visible. |
| Gateway TextNode | Shows Chapter 1 (first CHILD) |
| Ordinary TextNode | Shows one-hop neighbourhood |
| Reset button | Returns to State 0 — Root node only |

### 4.7 Hover / Touch Behaviour

Dwell time: `DWELL_MS = 400ms` (display). `DWELL_FIRE = 300ms` (query fires early). Uses Pointer Events API for unified mouse/touch.

| Action | Desktop | Touch |
|---|---|---|
| Show tooltip | Hover 400ms dwell | First tap |
| Navigate | Click | Second tap same node (within 800ms) |
| Dismiss tooltip | Mouse leave | Tap different node or canvas |
| Toggle tooltip | n/a | Tap node already showing tooltip |

Tooltip position: 80px above node on touch. Bounds-checked — flips below if near top edge.

### 4.8 UI Layout — Top Bar

```
Top-left:   Reset button
Top-right:  Media player bar (#media-bar) — appears when Settling clicked
Second row: Search_CW tracker button (#search-bar) — centered at top: 52px
```

---

## 5. Search_CW Virtual Node — Full Specification

The Search_CW (Search Cluster-Work) node is a **virtual Cytoscape node with no Memgraph counterpart**. It solves the cluster-flooding problem (some clusters have 60+ chapters across 4 corpus works). Storing one Cluster-Work pair per cluster per work would mean 76 × N works nodes — unscalable. The virtual approach scales cleanly.

### 5.1 Session State Variables

```javascript
let lastClusterNode    = null;  // Cluster node most recently clicked
let currentClusterColour = null;  // its family colour
let lastSearchCWNode   = null;  // node that migrated to Phase 2 button
let syntheticEdgeIds   = new Set();  // HAS_GATEWAY edges to clean up
```

### 5.2 Two-Phase Lifecycle

**Phase 1 — Graph node:** Rectangle node in Cytoscape, positioned in horizontal row 150px below cluster. Shows work name. Tooltip: `Work : filtered by: Cluster`.

**Phase 2 — Fixed button:** On click, node disappears from graph, reappears as DOM button (#search-bar) in second row. Persistent — stays until reset or new cluster clicked.

### 5.3 Lifecycle Events

| Event | Effect |
|---|---|
| Cluster clicked | clearSearchCWNodes() -> new rectangle nodes added (Phase 1) |
| Search_CW graph node clicked | Graph nodes hidden; Phase 2 button appears; chapter results shown |
| Phase 2 button clicked | Chapter results re-queried; button stays visible |
| TextNode tapped (connected to cluster) | Search_CW nodes shown |
| TextNode tapped (not connected) | Search_CW nodes hidden |
| Reset pressed | clearSearchCWNodes() -> button hidden, nodes removed |
| Different cluster clicked | clearSearchCWNodes() -> new nodes for new cluster |

### 5.4 Queries

**Creation — finds works with chapters connected to active cluster:**
```cypher
MATCH (n:TextNode)-[r]->(c:Cluster {name: $clusterName})
WHERE n.gateway = false
RETURN n.source_text AS work, count(n) AS chapterCount
ORDER BY chapterCount DESC
```

**Click — finds chapters from work filtered by last cluster:**
```cypher
MATCH (gw:TextNode {source_text: $work, gateway: true})
OPTIONAL MATCH (gw)-[:CHILD*]->(n:TextNode)-[r]->(c:Cluster {name: $clusterName})
RETURN gw, n, r
```

---

## 6. Critical Bugs Fixed and Standing Rules

### 6.1 Memgraph Integer ID Namespace Collision — CRITICAL

> **WARNING:** Memgraph shares its integer ID namespace across both nodes and relationships. A TextNode and a Cluster-Family relationship can have the same integer ID. Cytoscape silently discards duplicate IDs.

**Fix:** prefix all Cluster-Family edge IDs with `cf_`.

**Standing rule:** ANY code that stores both Memgraph nodes and relationships in a shared namespace MUST prefix relationship IDs.

```javascript
// Recommended prefixes:
// Node IDs: use as-is
// Cluster-Family relationship IDs: prefix 'cf_'
// Cluster-Work virtual edges: prefix 'cw_'
// Any new relationship type: add type-specific prefix
```

### 6.2 WebSocket URL Must Be Dynamic
Never hardcode `ws://localhost` in viewer.js.

### 6.3 Cypher File Rules for Memgraph
- No comment lines (`//`) — mgconsole fails
- No Unicode (em-dashes, box-drawing)
- datetime: max 6 decimal places
- Escape apostrophes: `Grimm\'s Fairy Tales`
- CREATE for TextNodes, MERGE for relationships
- Both n_r recalculation blocks at end of every file

### 6.4 Broadcast and Transmission Rules

**Case 1 — Corpus writes** (TextNodes, Clusters, new relationships):
Broadcast to ALL connected clients.

```javascript
function broadcastCorpusUpdate(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify({ type: 'corpus_update', data }));
  });
}
```

**Case 2 — User navigation state** (attention trail, current cluster, breadcrumb events):
Send ONLY to the paired buddy. Unpaired users do not transmit navigation state.

```javascript
function sendToBuddy(sessionId, data) {
  const buddyId = sessions[sessionId].pairedWith;
  if (buddyId && clients[buddyId]?.readyState === WebSocket.OPEN)
    clients[buddyId].send(JSON.stringify({ type: 'buddy_update', data }));
}
```

**Temporary User nodes in Memgraph are legitimate** — enables graph queries spanning corpus and session data. MUST be deleted on WebSocket disconnect.

```javascript
ws.on('close', async () => {
  await session.run(
    'MATCH (u:User {websocket_id: $id}) DETACH DELETE u',
    { id: sessionId }
  );
});
```

### 6.5 Cytoscape Shadow Properties
Do not use `shadow-blur`, `shadow-color`, `shadow-opacity`, `shadow-offset-x/y` — not supported, generates console warnings with no visual effect.

### 6.6 Mobile Chrome Required for Memgraph Lab
Copy/paste in Memgraph Lab only works reliably in Chrome.

---

## 7. Next Phase — Breadcrumb Trails and Dyadic Pairing

### 7.1 Current State of Breadcrumbs
A single Phase 2 tracker button (#search-bar) shows the most recent work selection with cluster context. Tooltip shows `Work : filtered by: Cluster`. This is the seed of the breadcrumb trail.

### 7.2 'You' Breadcrumb Trail — Chip Structure

The trail is a complete readable record of the navigation path. Each navigation step appends its own chip:

```
[blue|Paradox] [TTC] [3] [7] [violet|Impermanence] [TTC] [42] [51]

Cluster chip    -> appended when any Cluster node is clicked
                   background: family colour, label: cluster name
Search_CW chip  -> appended when a work is selected from cluster
                   background: same colour as preceding cluster chip, label: work name
TextNode chip   -> appended when a TextNode is visited in that context
                   background: neutral, label: seq number only
```

- Display: horizontally scrollable row, most-recent on right
- Hover/touch on any chip shows full contextual tooltip in main canvas space
- Tap/double-tap on any chip centres main canvas on that node, shows one-hop neighbourhood
- All data available at moment of chip creation — no extra queries needed
- Cluster chip data: `clusterName`, `clusterColour` from `lastClusterNode` (already maintained)
- Search_CW chip data: `workName` from `node.data('source_text')`, colour from `currentClusterColour`
- TextNode chip data: `seq` from `node.data('seq')`, `url` from `node.data('url')`
- Implementation: local, no server changes required

**This is implemented first before any buddy/pairing work.**

### 7.3 Three-Canvas Architecture

Three independent Cytoscape instances on the same page:

```javascript
const mainCy  = cytoscape({ container: document.getElementById('cy-main'),  ... });
const youCy   = cytoscape({ container: document.getElementById('cy-you'),   ... });
const buddyCy = cytoscape({ container: document.getElementById('cy-buddy'), ... });
```

```
+---------------------------------------------+
| [reset]              [media player]         |  fixed top bar (existing)
+---------------------------------------------+
| BUDDY: [violet|Impermanence] [ZZ] [12] ... |  buddyCy  (~30px)
+---------------------------------------------+
| YOU:   [blue|Paradox] [TTC] [3] [7] ...    |  youCy    (~30px)
+---------------------------------------------+
|             MAIN CANVAS (mainCy)            |
|  [cross-canvas tooltips appear here]        |
+---------------------------------------------+
```

Vertical order (top to bottom): fixed top bar → buddyCy → youCy → mainCy.

Breadcrumb canvases: narrow horizontal strips (~30px each), simple left-to-right linear layout.
**Advantage:** breadcrumb rows fully separate from main graph — no interference.

### 7.4 Cross-Canvas Tooltip
Hover tooltips from breadcrumb nodes are absolutely positioned DOM elements extending **downward** into the main canvas space below. Content:
- The TextNode text read when this breadcrumb was created
- The cluster and family context
- For buddy chips: dwell strength indicator

**Downward direction rule:** Because mainCy sits below both breadcrumb strips, tooltips must be offset downward far enough to clear both rows before entering the main canvas area:

```javascript
// Extra offset to clear both breadcrumb rows
const BREADCRUMB_CLEAR = 80; // adjust to match total height of both rows
tooltipEl.style.top = `${chipPos.y2 + 10 + BREADCRUMB_CLEAR}px`;
```

`BREADCRUMB_CLEAR` is the total height of both breadcrumb strips plus any gap between them. Set it once to match the actual rendered height of the two youCy and buddyCy canvases — probably around 60–80px for two 30px strips with a gap.

### 7.5 Buddy Breadcrumb — Live Time Course Feed
The buddy breadcrumb row updates in near-real time. Reading it tells you:
- Family territory — chip colour
- Cluster specifically — chip label
- Corpus work in that context — work name
- Arc of journey and sustained attention

Gravity well forming visually before any algorithm runs — convergence visible when chips share family colours.

### 7.6 Cross-Canvas Navigation — Breadcrumb Tap
Clicking any breadcrumb chip — yours or buddy's — centres main canvas on that node.

```
First tap / hover  -> tooltip in main canvas space
Second tap / click -> centre main canvas on node, show one-hop neighbourhood
```

Symmetrical — buddy can tap your chips. Neither forced, both can choose.

### 7.7 Pairing — Immediate Last-Arrival Basis

```
1. ARRIVAL AND PAIRING
   User arrives -> if another waiting, paired immediately (last-arrival)
   Pairing before any node selection

2. FREE BROWSING WHILE PAIRED
   Both browse independently
   Breadcrumb trails grow in real time
   Hover buddy chips to read what they read
   Tap buddy chips to visit their territory
   No obligation to converge

3. GRAVITY WELL FORMING — EMERGENT
   Trails overlap in family/cluster territory
   Chip colour convergence visible
   System surfaces bridge nodes

4. WEAVE PHASE — CHOSEN CONVERGENCE
   Collaborative text drafting begins
   Breadcrumb history visible during Weave as context
   Child node carries trace of two paths converging
```

The breadcrumb trails are the evidence of the encounter — two independent journeys converging into a shared moment.

### 7.8 Search_CW as First Breadcrumb Chip
The Search_CW Phase 2 button is the first breadcrumb chip. Already a DOM element with the right data. Making it append to a scrollable row rather than replace itself is the key implementation step. Chip visual language, tooltip format, and tap contract are already established.

### 7.9 Implementation Order

| Step | Work | Server changes |
|---|---|---|
| 1 | 'You' breadcrumb trail — three-canvas layout, scrollable chip row, replay navigation | None |
| 2 | Pairing mechanism — WebSocket session management, buddy connection | Significant |
| 3 | 'Buddy' breadcrumb trail — receive buddy events, render buddyCy row | Moderate |
| 4 | Cross-canvas tooltip and tap-to-navigate from buddy chips | Moderate |
| 5 | Gravity well scoring — attention signals, overlap, visual emergence | Significant |

### 7.10 First Implementation Step — Cross-Canvas Event Test

Before building the full breadcrumb trail, establish the cross-canvas event pattern with the absolute minimum. One chip node on youCy, hover and click events crossing to mainCy.

**Step 1 — Create youCy canvas**

```html
<div id="cy-main"></div>
<div id="cy-you" style="height: 60px; width: 100%; position: relative;"></div>
```

Initialise in viewer.js as a separate Cytoscape instance, simple preset layout, no controls.

**Step 2 — Add one test chip node**

```javascript
youCy.add({
    group: 'nodes',
    data: {
        id: 'test-chip',
        type: 'Cluster',
        name: 'Paradox',
        colour: '#4A7BC0',
        seq: null,
        url: null
    },
    position: { x: 60, y: 30 }
});
```

Style as small coloured rectangle with white text label showing name.

**Step 3 — Cross-canvas hover event**

```javascript
youCy.on('mouseover', 'node', (event) => {
    const chip = event.target;
    const name = chip.data('name');
    const target = mainCy.nodes().filter(n => n.data('name') === name).first();
    if (target.length) {
        target.style('border-width', 6);
        target.style('border-color', '#ffffff');
    }
});

youCy.on('mouseout', 'node', (event) => {
    const chip = event.target;
    const name = chip.data('name');
    const target = mainCy.nodes().filter(n => n.data('name') === name).first();
    if (target.length) {
        target.style('border-width', 2);
        target.style('border-color', chip.data('colour'));
    }
});
```

**Step 4 — Cross-canvas click event**

```javascript
youCy.on('tap', 'node', (event) => {
    const chip = event.target;
    const name = chip.data('name');
    const target = mainCy.nodes().filter(n => n.data('name') === name).first();
    if (target.length) {
        mainCy.animate({ center: { eles: target }, zoom: 1.5 }, { duration: 300 });
        handleNodeTap(target);
    }
});
```

> **WARNING:** Report back what works and what does not before any further steps. Do not build the User node or server changes yet — this is purely a client-side canvas communication test.

### 7.11 User Node — Design

```javascript
// (:User {
//   websocket_id: 'ws-abc123',
//   memgraph_id: <integer — assigned at CREATE>,
//   current_cluster: 'Paradox',
//   path: [...node urls visited...]
// })

// Created at WebSocket connect
// MUST be deleted before WebSocket closes:
ws.on('close', async () => {
  await session.run(
    'MATCH (u:User {websocket_id: $id}) DETACH DELETE u',
    { id: sessionId }
  );
});
```

User node connects to visited corpus nodes and virtual node signals (vNodes). A vNode signal tells the viewer to compute hover/click response based on neighbouring nodes rather than fixed stored data. Build one working vNode before generalising.

---

## 8. Media Player

Custom JS audio player (not native HTML5 — Chrome/Safari shadow DOM defect). Injected into #media-bar. Currently loads `bass_recorder_C3.mp3` (test file) for the Settling node.

Player appears when Settling node is clicked (not hovered). Fixed position top-right. Only ✕ button closes it (toggle-close removed — state-machine problem).

Future: audio source will be a 2-minute mindfulness recording. General pattern of media controls appearing on node click established for future media modules. Eventually driven by `%%bd_` directives in node text.

---

## 9. Corpus Loading Rules — Summary

- No comment lines in .cypher files — mgconsole fails
- No Unicode (em-dashes, box-drawing) in Cypher code
- datetime: max 6 decimal places
- Escape apostrophes: `Grimm\'s`
- CREATE for TextNodes, MERGE for relationships
- source_text must be exact and consistent across all nodes of a work
- Both n_r recalculation blocks required at end of every file
- Each work needs a gateway TextNode (gateway:true) as the descriptive entry

---

*ButterflyDreaming Graph Viewer Handover v4 — 27 May 2026 — Prepared with Claude (Anthropic)*
