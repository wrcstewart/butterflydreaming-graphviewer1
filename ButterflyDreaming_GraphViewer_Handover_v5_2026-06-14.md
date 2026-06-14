# ButterflyDreaming — Graph Viewer
## Comprehensive Handover Document v5

**Version:** 5.0  
**Date:** 14 June 2026  
**Prepared by:** Claude (Anthropic) with William Stewart  
**Preceding doc:** ButterflyDreaming_GraphViewer_Handover_v4_2026-05-27.md  
**Primary codebase:** /Users/williamstewart2/butterflydreaming_graphviewer1  
**Live URL:** https://graph.virtualfictions.uk  
**Purpose:** Full context handover reflecting all work completed since v4 — breadcrumbs, pairing, media player, layout restructure, position hinting, snake view, and related fixes.

---

## 1. ButterflyDreaming — Platform Summary

ButterflyDreaming is a non-commercial anonymous social media platform that pairs two users in a temporary one-to-one encounter mediated by shared symbolic texts — poetry, myth, folktale, philosophy. The two users collaboratively draft a short new text (a child node) saved permanently to a growing public graph. No accounts, no profiles, no advertising, no data monetisation.

Philosophical foundations: Zhuangzi butterfly dream (permeable self/other boundary), Daoist wu wei (non-coercive mediation), chaos theory strange attractors (emergent thematic clusters), symbiogenesis (human-AI coevolution), Jungian amplification, Castoriadis agora.

Current development stage: Breadcrumb trails and dyadic pairing are fully implemented. Graph browsing, hint-based layout save/restore, media player, and snake view are working. Next phase: gravity well scoring, Weave phase (collaborative text drafting), child node creation.

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
| Real-time | WebSocket (ws npm) | All client-server communication — no HTTP REST endpoints |

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

### 2.5 Media Files
MP3 files in the project root follow a naming convention: `D_` prefix = default track, `A_` prefix = alternate track. The server scans for these on startup. **Restart server to pick up new files.** Currently:
- `D_ChineseSad1.mp3` — default track
- `A_QiuFengCi.mp3` — alternate track
- `bass_recorder_C3.mp3` — test file (no prefix, not shown in player)

### 2.6 Security
- `config.js` is gitignored — contains `CURATION_CODE` for position-hint write access. Must never be committed.
- Memgraph credentials (username `memgraph`, password `memgraph`) live only in `server.js`.
- Always run `git push origin main` immediately after every `git commit`.

---

## 3. Database Schema — Memgraph

### 3.1 Node Types

| Label | Count | Key properties | Notes |
|---|---|---|---|
| Root | 1 | name, text, url, source, lang, n_r | UI entry point — golden dot. |
| Entry | 2 | name, text, colour, url, n_r | Settling (#40E0D0) and Conversations (#E87A20). |
| Family | ~12 | name, colour, hex, description, n_r | 6 top-level + subfamily nodes. Subfamilies descend via DESCENDS_FROM. |
| Cluster | 76+ | name, family_primary, display_name, label, n_r | 64 original + 12 new for Grimm + growth. |
| TextNode | 151+ | url, text, raw_text, source, source_text, translator, seq, title, lang, created_at, tagging_status, gateway, section_title, chapter, views, selects, fusions, n_r | All corpus content. gateway:true = top of lineage. section_title:true = title page of a work within a corpus. |
| User | ephemeral | viewer_id, created_at | Created on WebSocket connect, deleted on disconnect. viewer_id = 'N_' + Memgraph integer id. |

### 3.2 Relationship Types

| Type | Between | Properties | Notes |
|---|---|---|---|
| CONTAINS | Root/Entry → Entry/Family | none | Navigation hierarchy. |
| DESCENDS_FROM | SubFamily → Family, or Cluster → Family | weight | Hierarchy. Edge direction inconsistent in DB — code always uses direction-agnostic lookups. |
| CLUSTER_REL | TextNode → Cluster | weight, tagged_as, resonates_with, bridges_to, echoes, gives | Consolidated thematic affinity edge. Carries individual relationship scores as properties. |
| CHILD | TextNode → TextNode | weight, source, created_at | Genealogical lineage. source: 'seed' / 'dyad' / 'editorial'. |
| CONTAINS_CLUSTER | Gateway TextNode → Cluster | count | Replaced the virtual Search_CW node system (A31). count = number of non-gateway chapters in this work connected to this cluster. Used to show chapter counts as n_r badges. |
| PART_OF | TextNode → section_title TextNode | none | Connects corpus chapters to their section_title (title page) node. Invisible edge — used for snake view navigation. |

### 3.3 Family Colours (Top-Level)

| Family | Hex | Colour |
|---|---|---|
| Nature | #4A8C4F | Forest green |
| Emotion | #C0504D | Warm red |
| Reason | #4A7BC0 | Clear blue |
| Spirit | #9B6B9B | Muted violet |
| Symbolic | #C09A3A | Amber/gold |
| Arts | #C47A5A | Terracotta |

Subfamily nodes (Family nodes that DESCEND_FROM other Family nodes) get a blended colour computed by `computeBlendedColours()` at load time using weighted circular-mean hue blending. They render smaller than top-level Family nodes.

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
- **Family/SubFamily/Root/Entry:** 0

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

### 3.6 Edge ID Prefixes — CRITICAL

Memgraph shares its integer ID namespace across both nodes and relationships. Cytoscape silently discards duplicate IDs. All edges are prefixed on load:

| Edge category | Prefix | Reason |
|---|---|---|
| General edges (main query) | `r_` | Avoid collision with node IDs |
| Cluster-Family edges (cfRecords query) | `cf_` | These IDs duplicate TextNode IDs |
| SubFamily DESCENDS_FROM edges (sfRecords query) | `sf_` | Same issue |

`raw_rel_id` is preserved on each edge data object (before the prefix is applied) so the position-hint write system can match edges by their DB integer ID.

### 3.7 Memgraph elementId Deduplication

The same Cluster or Family node can return different `elementId` values in different query contexts. On load, `computeBlendedColours` and `buildNodeData` deduplicate by name (first-seen wins), and all edge source/target references are rewritten to the canonical ID. Without this, TextNode→Cluster edges land on phantom duplicate nodes and produce disconnected components in fCoSE.

---

## 4. Viewer Architecture

### 4.1 File Structure

```
butterflydreaming_graphviewer1/
  index.html              - page structure, loads Cytoscape CDN, viewer.js
  viewer.js               - all client-side graph logic (~2134 lines, v227)
  style.css               - layout, breadcrumb bars, media bar, tooltip (v47)
  cursor-wings.svg        - custom cursor (two triangles suggesting wings)
  server.js               - Express + WebSocket server + Memgraph connection
  package.json            - dependencies: neo4j-driver, express, ws
  config.js               - GITIGNORED — contains CURATION_CODE
  config.example.js       - template for config.js
  D_ChineseSad1.mp3       - default audio track (D_ prefix)
  A_QiuFengCi.mp3         - alternate audio track (A_ prefix)
  bass_recorder_C3.mp3    - test audio (no prefix — not shown in player)
  cc-hint-system-spec.md  - position-hinting technical specification
  ButterflyDreamingColourDesignNotes.md
  graphviewer (2).md      - legacy session record
```

### 4.2 Three-Canvas Layout

Three independent Cytoscape instances share the same page:

```
+-----------------------------------------------------------+
| Butterfly Dreaming — Navigation Development               |  #title-bar (amber italic, ~21px)
+-----------------------------------------------------------+
| [bc-spacer — 50px tall]                                   |
| [Pair] button centred in bc-spacer  [Back] button left    |
+-----------------------------------------------------------+
| BUDDY:  [chip] [chip] [chip] → scrollable right           |  #cy-buddy (36px, blue bg)
| [10px gap / margin-bottom on cy-buddy]                    |
+-----------------------------------------------------------+
| YOU:    [chip] [chip] [chip] → scrollable right           |  #cy-you (36px, amber bg)
+-----------------------------------------------------------+
|                   MAIN CANVAS                             |  #cy (flex: 1, fills remainder)
|   (graph browsing, tooltips appear here)                  |
+-----------------------------------------------------------+
| [dev-panel bottom-left]     [help text centre-bottom]     |  fixed overlays
|                             [user-count bottom-right]     |
|                   [media player top-right, fixed]         |
+-----------------------------------------------------------+
```

`BARS_BOTTOM = 158` — distance from viewport top to top of main canvas. Used for tooltip minimum-top clamping. Calculated as: bc-spacer(50) + title-bar(26) + cy-buddy(36) + gap(10) + cy-you(36) = 158.

### 4.3 WebSocket — Dynamic URL (Critical)

```javascript
// viewer.js — must be dynamic, never hardcoded to localhost
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
```

> **WARNING:** Never hardcode ws://localhost. Remote devices connect to their own localhost.

### 4.4 Module-Scope Variables (Critical)

These are at the top of viewer.js, outside all functions:

```javascript
const isTouchDevice = navigator.maxTouchPoints > 0;
let mediaFilesList = [];  // populated via WebSocket after connect
```

`mediaFilesList` **must** stay at module scope. If declared inside `setupInteractions` and assigned in the `init()` WebSocket handler, they are different variables — the list never populates. This was a real bug that was fixed.

### 4.5 Node Visual Styling

| Type | Shape | Colour | Size | Notes |
|---|---|---|---|---|
| Root | ellipse | #FFD700 gold | 76×76 | 5px #90EE90 border |
| Entry (Settling) | round-triangle | #40E0D0 cyan | 76×76 | dim border |
| Entry (Conversations) | ellipse | #E87A20 orange | 68×68 | dim border |
| Family (top-level) | ellipse | family hex | 80×33 | dim border, full opacity |
| Family (subfamily) | ellipse | blended hex | 53×22 | smaller, 8px font |
| Cluster | round-rectangle | blended colour | 70×34 | dim border |
| Cluster (active) | round-rectangle | blended colour | 98×48 | enlarged when clicked |
| TextNode (gateway) | round-rectangle | #ffffff bg | 120×34 | uppercase, black text |
| TextNode (section_title) | round-rectangle | #cccccc bg | 120×34 | dark text, grey |
| TextNode (ordinary) | round-rectangle | #1a1a2e | 120×34 | white text |
| TextNode (abbreviated) | round-rectangle | same | 40×34 | narrow chip form in breadcrumbs |

**Do NOT use Cytoscape shadow properties** — not supported, generates console warnings with no effect.

### 4.6 Edge Styling

All CLUSTER_REL edges: width from `getClusterRelWidth()` — takes max of tagged_as, resonates_with, bridges_to, echoes, gives properties × 2.5, minimum 1.0.

CHILD edges: triangle arrowhead parent→child. Width/colour depends on `rel_source` property:
- Gateway source + sequence: 1.0px white
- dyad source: 0.6px #888888
- Other: 0.7px #cccccc

CONTAINS_CLUSTER edges: opacity 0, no events — structural only.
PART_OF edges: opacity 0.55.
DESCENDS_FROM edges: opacity 0.7.

### 4.7 Interaction Model

**Core rule:** clicking any node shows only that node and its immediate one-hop neighbours.

| Node clicked | Result |
|---|---|
| Root | Shows Entry nodes via CONTAINS edges |
| Entry: Conversations | Shows 6 Family nodes |
| Entry: Settling | Opens media player with default D_ track |
| Family (top-level) | Shows connected SubFamily and Cluster nodes |
| Family (subfamily) | Same as Family |
| Cluster | Shows Family nodes + gateway TextNodes with chapter count badges (from CONTAINS_CLUSTER). Gateways arranged in a row 150px below cluster. |
| Gateway TextNode | Shows all TextNodes in this work connected to the active cluster, via DB query. Also shows section_title nodes for those chapters. |
| section_title TextNode | Snake view — shows all PART_OF content chapters in a grid layout |
| Ordinary TextNode | Shows one-hop neighbourhood |
| Back button | Restores previous visible element set |

### 4.8 Hover / Touch Behaviour

`DWELL_MS = 200ms` (tooltip display). `DWELL_FIRE = 300ms` (prefetch fires before dwell).

| Action | Desktop | Touch |
|---|---|---|
| Show tooltip | Hover 200ms dwell | First tap |
| Navigate | Click | Double-tap same node within 800ms |
| Dismiss tooltip | Mouse leave | Tap different node or canvas |

Tooltip is a DOM `#label-tooltip` element. Position clamped: must not appear above `BARS_BOTTOM` (158px). For breadcrumb bar chips, tooltip appears just below the bar (at `bar.getBoundingClientRect().bottom + 6px`).

### 4.9 Help Text

At bottom of screen, fixed position (`#help-bar`). Pulses amber 30 times on load. Changes contextually as user navigates. Shortened messages — one short line only.

---

## 5. Breadcrumb System

### 5.1 Overview

Two horizontal Cytoscape instances (`youCy`, `buddyCy`) act as scrollable breadcrumb bars. Chips are added as the user navigates. They never scroll backward — most recent chip is always rightmost, visible.

### 5.2 You Breadcrumbs (`youCy` — #cy-you, amber bar)

`addYouChip(node)` adds a chip whenever:
- Entry, Family, Cluster, or TextNode is tapped in the main graph
- Back button is pressed (chips the node being returned to)

**Chip content rules:**
- Full display_name or name for Entry, Family, Cluster
- Gateway TextNodes: full name (source_text), never abbreviated
- section_title TextNodes: full title, never abbreviated
- Ordinary TextNodes in same source_text as previous chip: abbreviated (just seq number, narrow chip)
- First TextNode of a new source_text: full display (`seq: source_text`)

**Chip state:**
- Most recent chip gets `latest` class (white border)
- `lastYouChipId` tracks the previous chip for edge drawing
- `lastYouSourceText` tracks whether next TextNode should be abbreviated

**Chip interaction (desktop):** mousemove over the `#cy-you` container — manual bounding box hit detection (Cytoscape's native events unreliable on narrow strips). Hover shows tooltip anchored below the bar.

**Chip interaction (touch):** single tap shows tooltip; double-tap within 800ms navigates main graph to that node via `handleNodeTap(main)`.

**Broadcasting:** when paired, each new chip is immediately sent to the buddy via `ws.send({ type: 'breadcrumb', data: {...} })`.

### 5.3 Buddy Breadcrumbs (`buddyCy` — #cy-buddy, blue bar)

`appendBuddyChip(data)` mirrors the same chip logic for remote user's trail. Data arrives via WebSocket `buddy_breadcrumb` message. Same abbreviation logic as `addYouChip`.

**On disconnect:** `buddyCy.nodes().addClass('buddy-gone')` — chips get opacity 0.3 but remain visible. System does NOT clear the buddy bar on disconnect; chips stay as a record of the encounter.

`resetBuddyBar()` clears the buddy bar and resets all counters — called only when a new pairing is established.

### 5.4 History Stack and Back Button

```javascript
function saveState() {
  const focusEl = activeNodeId ? cy.getElementById(activeNodeId) : null;
  const chipNode = (focusEl && focusEl.length) ? focusEl : lastParentNode;
  history.push({ ids: cy.elements(':visible').map(el => el.id()), parent: lastParentNode, chipNode });
  updateBackBtn();
}

function restoreState() {
  if (history.length === 0) return false;
  const state = history.pop();
  // ... restore visible elements, run layout ...
  const dest = state.chipNode || state.parent;
  if (dest && dest.length) {
    const ptype = dest.data('type');
    if (ptype === 'Entry' || ptype === 'Family' || ptype === 'Cluster' || ptype === 'TextNode')
      addYouChip(dest);
  }
  return true;
}
```

`chipNode` in the history entry is the FOCUSED node (what the user clicked), not the layout parent. This ensures back navigation chips the right node, not an ancestor.

Back button (`#back-btn`): top-left, same visual height as Pair button. Shows only when `history.length > 0`. `visible` class toggles its `display: block`.

---

## 6. Dyadic Pairing System

### 6.1 Protocol

```
Client                              Server
  ──────────────────────────────────────
  ready_to_pair  ────────────────>
                 <──────────────  wait_state (if queue empty)
                                  OR
                 <──────────────  paired (if buddy waiting)
                                    buddy's trail sent as:
  buddy_breadcrumb  <─────────────  (each chip the buddy adds)
  buddy_disconnected  <───────────  (when buddy WebSocket closes)
```

After `buddy_disconnected`, client auto-requeues: `ws.send({ type: 'ready_to_pair' })`.

### 6.2 Server-Side State (server.js)

```javascript
const sessions    = new Map();  // userId → ws
let   waitingUser = null;        // { userId, ws } | null
const pairedWith  = new Map();  // userId → buddyUserId
```

On connect: ephemeral User node created in Memgraph (`viewer_id = 'N_' + integer_id`). `sessions.set(ws.userId, ws)`. `broadcastUserCount()` fires.

On disconnect: User node deleted, `sessions.delete(ws.userId)`, `broadcastUserCount()`. If paired, buddy gets `buddy_disconnected`. If waiting, removed from queue.

Server-side keepalive: `ws.ping()` every 25 seconds (protocol-level ping — browser replies with pong automatically at the WS protocol layer, no client JS needed).

### 6.3 Client-Side Pairing State

```javascript
const pairingState = { active: false };
```

Set to `true` on `paired` message. Set to `false` on `buddy_disconnected`. The `addYouChip` function checks `pairingState.active` before broadcasting each chip.

On pairing: `resetBuddyBar()` clears any previous buddy trail. `pairBtn.style.display = 'none'` hides the Pair button for the session.

### 6.4 Pair Button

Top-centre of the page, same height as Back button (top: 34px). Label: "Pair". Disappears after pairing. Status text (`#pair-status`) shows "Waiting..." or "Paired" next to it.

### 6.5 User Count Panel

`#user-count-panel` — bottom-right, fixed. Shows `N connected`. Server pushes `user_count` on every connect/disconnect. Client also explicitly requests count after setup (`get_user_count` message) to avoid a timing race where the broadcast fires before the persistent message handler is registered.

---

## 7. Position Hinting System

### 7.1 Purpose

Saves manually arranged node positions so Family/cluster views restore to the same layout across sessions and devices. Positions are stored as normalised offsets on DESCENDS_FROM edges in Memgraph.

### 7.2 Storage

Each DESCENDS_FROM edge carries:
- `hint_x`, `hint_y` — normalised offset from parent (child_pos - parent_pos) / scale
- `hint_scale` — the actual graph-coordinate radius at capture time (max distance from parent to any child)

### 7.3 Three Layout Modes

`runLayout(cy, parentNode)` inspects edges for hints and picks a mode:

| Mode | Condition | Behaviour |
|---|---|---|
| `force` | No hints, or no parentNode | fCoSE physics layout |
| `preset` | All child edges have hints | All children pinned to stored positions + fCoSE for non-child nodes |
| `hybrid` | Some child edges have hints | Hinted children pinned, un-hinted settle via fCoSE |

**Diagnostic log (always present):**
```
[BD] hint scan: parent=Nature total=5 hinted=5 mode=preset hint_scale=412.3 formula_scale=244.9
```

### 7.4 Dev Panel

`#dev-panel` — bottom-left, fixed. Password field + Write + Reset buttons. Visible always.

**Write:** captures current visible positions, computes scale, sends `write_hints` WebSocket message with the curation code. Server rate-limits to one write per 8 seconds. On success, updates in-memory edge data immediately so the next Reset uses preset mode.

**Reset:** calls `runLayout(cy, lastParentNode)` to re-run layout from stored hints (or force if none).

**Important:** `zoom` does NOT change `node.position()` in graph coordinates. Only physically dragging nodes changes their positions. Zoom is a viewport-only transform.

### 7.5 Server-Side Hint Write (server.js)

```javascript
// Rate limit: 8 seconds between writes per connection
// Timing-safe code comparison (crypto.timingSafeEqual)
// Writes hint_x, hint_y, hint_scale to matched edges by DB integer ID
UNWIND $hints AS h
MATCH ()-[r]-() WHERE id(r) = toInteger(h.relId)
SET r.hint_x = h.hint_x, r.hint_y = h.hint_y, r.hint_scale = h.hint_scale
```

---

## 8. Gateway and Snake Views

### 8.1 Gateway View (Cluster → Work filter)

When a gateway TextNode is clicked after a Cluster has been selected:

```javascript
async function handleGatewayClick(node) {
  // Query: chapters in this work connected to the active cluster
  records = await safeQuery('gwClick',
    'MATCH (n:TextNode {source_text: $work, gateway: false})-[r]->(c:Cluster {name: $clusterName}) RETURN n, r',
    { work, clusterName }
  );
  // Show: cluster, gateway, matching chapters, their section_title nodes (via PART_OF)
}
```

The CONTAINS_CLUSTER relationship (gateway → cluster) carries a `count` property shown as an n_r badge on the gateway node in cluster view. Badge is a DOM overlay (`setupNrBadges`), not a Cytoscape label.

### 8.2 Snake View (section_title tap)

Tapping a section_title TextNode reveals all its chapters (connected via PART_OF) in a boustrophedon grid (left-right row 0, right-left row 1, etc.):

- Node dimensions computed from count and container width
- Chapters linked to the active cluster are highlighted in cluster colour
- `snake-section` class applied — overrides size and label to just `seq` number
- Title page stays visible at top; active cluster stays visible for context

---

## 9. Session Management

### 9.1 Session Expiry

60-minute idle timeout. A `setInterval` runs every minute checking `Date.now() - wsRef.lastActivity > MAX_IDLE_MS`. On expiry: `#session-expired` overlay shown with reload button.

`wsRef.lastActivity` is updated on every node tap.

### 9.2 WebSocket Reconnect

If the WebSocket drops within the idle window (e.g. mobile screen lock), `safeQuery()` reconnects transparently:

```javascript
if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
  if (Date.now() - wsRef.lastActivity > wsRef.maxIdleMs) throw new Error('session_expired');
  wsRef.current = await connectWS();  // transparent reconnect
}
```

### 9.3 iOS Safari bfcache

```javascript
window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});
```

Without this, pressing the browser back button on iOS Safari restores a frozen JS snapshot (stale graph state). Force-reload prevents it.

---

## 10. Media Player

### 10.1 File Convention

Files in project root with `D_` prefix (default) or `A_` prefix (alternate) are scanned by the server on startup and served as `media_files` via WebSocket. Names stripped of prefix and `.mp3` extension for display (max 12 chars). Restart server to pick up new files.

### 10.2 Client Behaviour

After setup, client sends `get_media_files` to receive the list. List stored at module scope in `mediaFilesList`.

Player opens when Settling node is tapped. Default track = first `D_` file. Track selector dropdown (`.mp-select`) populated from `mediaFilesList`. Changing track via dropdown calls `loadMediaTrack()` — pauses if playing, swaps src, resumes if was playing. Only the ✕ button closes the player (no toggle-close — state-machine problem with idempotency).

### 10.3 DOM Structure

```html
<select class="mp-select">...</select>
<button class="mp-btn">▶</button>
<audio src="..."></audio>
<button class="media-close">✕</button>
```

Injected into `#media-bar` via innerHTML. Fixed position top-right.

---

## 11. Load Sequence (init())

1. Show loading overlay "Connecting…"
2. Retry loop: connect WebSocket, then run three parallel queries (graph, clusterFamily, subfamilyLinks)
3. Build `nodesById` and `edgesById` maps with prefixed IDs
4. Deduplicate Cluster/Family nodes by name; rewrite edge endpoints
5. Post-process edges (gateway TextNode edge widths)
6. Init main `cy` Cytoscape instance (preset layout, all elements hidden)
7. `computeBlendedColours(cy)` — sets subfamily and cluster colours
8. Show root node only, fit
9. Init `youCy` and `buddyCy` (empty, zoom/pan locked)
10. Init `pairingState`, pair button handler
11. `setupNrBadges(cy)` — creates DOM overlay for n_r badges
12. `setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState)` — all event handling
13. Register persistent WebSocket message handler (user_count, media_files, pairing messages)
14. Send `get_user_count` and `get_media_files` explicitly (timing-safe — avoids race with broadcast)

---

## 12. Critical Bugs Fixed — Standing Rules

### 12.1 WebSocket URL Must Be Dynamic
Never hardcode `ws://localhost`. Use `window.location.host`.

### 12.2 mediaFilesList Scope Bug
`let mediaFilesList = []` MUST be at module scope (top of viewer.js). If declared inside `setupInteractions`, the assignment in `init()`'s message handler sets a different variable — the list never populates.

### 12.3 User Count Timing Race
Server broadcasts `user_count` on connect, but the client's persistent message handler isn't registered until after all graph queries complete. Fix: client sends `get_user_count` explicitly after setup; server responds directly.

### 12.4 Memgraph Integer ID Collision
Memgraph shares integer ID namespace between nodes and relationships. Always prefix:
- `r_` — general edges
- `cf_` — Cluster-Family edges
- `sf_` — SubFamily DESCENDS_FROM edges

### 12.5 Memgraph elementId Inconsistency
Same Cluster/Family node returns different elementIds in different query contexts. Deduplicate by name (first-seen wins) and rewrite all edge endpoints to canonical ID.

### 12.6 Cytoscape Shadow Properties
Do not use `shadow-blur`, `shadow-color`, `shadow-opacity`, `shadow-offset-x/y` — not supported, generates console warnings with no visual effect.

### 12.7 Cypher File Rules for Memgraph
- No comment lines (`//`) — mgconsole fails
- No Unicode (em-dashes, box-drawing)
- datetime: max 6 decimal places
- Escape apostrophes: `Grimm\'s Fairy Tales`
- CREATE for TextNodes, MERGE for relationships
- Both n_r recalculation blocks at end of every file

### 12.8 DESCENDS_FROM Edge Direction
DB stores these inconsistently (sometimes child→parent, sometimes parent→child). All code uses direction-agnostic lookups: `node.connectedEdges('[type="DESCENDS_FROM"]')` not directional incomers/outgoers.

### 12.9 iOS Safari bfcache
`pageshow` with `event.persisted = true` means browser restored a frozen snapshot. Always force-reload.

### 12.10 Zoom Does Not Change Graph Coordinates
`node.position()` returns graph-space coordinates, unaffected by zoom. Only dragging nodes changes their positions. Zoom is a viewport transform only. Relevant for position hinting: only drag to reposition; zooming in before saving has no effect on stored positions.

---

## 13. Next Phase — Gravity Well and Weave

These are not yet implemented:

### 13.1 Gravity Well Scoring
Attention signals from breadcrumb trails. Overlap in family/cluster territory between the two users' trails. Visual emergence: chip colour convergence visible before any algorithm runs. System surfaces bridge nodes when trails converge.

### 13.2 Weave Phase
Collaborative text drafting begins when users choose to converge. Breadcrumb history visible during Weave as context. Child node carries trace of two paths converging. Collaborative text entry UI not yet designed.

### 13.3 Child Node Creation
New TextNode saved permanently to Memgraph. Broadcast to all connected clients (corpus update → all clients need to add the new node). CHILD relationship from both parents. Source = 'dyad'.

### 13.4 Implementation Order (Remaining)

| Step | Work |
|---|---|
| 1 | Gravity well scoring — attention signal accumulation, overlap detection |
| 2 | Visual emergence — cluster/family colour convergence in breadcrumb bars |
| 3 | Bridge node surfacing — when trails converge, highlight shared territory |
| 4 | Weave phase UI — text entry, collaborative editing |
| 5 | Child node persistence — save to Memgraph, broadcast to all clients |

---

*ButterflyDreaming Graph Viewer Handover v5 — 14 June 2026 — Prepared with Claude (Anthropic)*
