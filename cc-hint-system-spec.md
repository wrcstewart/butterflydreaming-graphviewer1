# Spec: Manual Position-Hinting System (Nav Layers first)

## What this builds

A system where a developer (you) manually arranges the children of a parent node,
presses a gated **Write** button, and those positions are stored on the parent→child
`DESCENDS_FROM` edges. On later views, the viewer reproduces the arrangement. Layout
is chosen per view by scanning the edges for hints — no double render, no flashing.

This builds on the already-validated two-mode layout work. It is **viewer + small
server endpoint**; the data model gains two optional edge properties.

Scope now: the navigation layers (Family→SubFamily, Family→Cluster, SubFamily→Cluster
— all `DESCENDS_FROM`). The **same mechanism** later extends to Text-node→Cluster with
no code change — only more manual curation. Build it generically, keyed on "does this
edge carry hints," not on node level.

---

## Data model addition

On the `DESCENDS_FROM` edge (parent → child), add two OPTIONAL properties:

```
DESCENDS_FROM {
  weight:  Float,     // existing
  hint_x:  Float,     // NEW, nullable — centre-relative normalised offset
  hint_y:  Float      // NEW, nullable
}
```

Null/absent `hint_x`/`hint_y` means "this child has not been curated under this parent."
Because hints live on the edge (not the node), a child with several parents has an
independent arrangement per parent — which is required, since the same cluster can sit
under multiple sub-families.

---

## Coordinate format (CRITICAL — must work on mobile AND laptop)

Hints are stored as **centre-relative offsets normalised by a single uniform scale**.
This is what makes one stored arrangement reproduce faithfully on both a laptop
(landscape) and a phone (portrait) without shearing or re-curation.

### Why not screen percentages
Percent-of-width/height ties the layout to the container's aspect ratio. A portrait
phone would stretch x and y differently and shear the arrangement (circles → ellipses).
Centre-relative + single uniform scale avoids this: the whole constellation scales
proportionally and keeps its shape.

### Capture (in the Write button), per child:
```javascript
// parent is centred on screen during curation
const parentPos = parent.position();
// raw offset of each child from the parent
const dx = child.position('x') - parentPos.x;
const dy = child.position('y') - parentPos.y;
// single uniform normaliser: radius of the arrangement (farthest child from parent)
const scale = Math.max(...children.map(c =>
  Math.hypot(c.position('x') - parentPos.x, c.position('y') - parentPos.y))) || 1;
const hint_x = dx / scale;     // ~ -1..+1
const hint_y = dy / scale;
```
`scale` is ONE number applied to both axes — never separate x/y scales.

### Recovery (at render time), per hinted child:
```javascript
const area = cy.container().getBoundingClientRect();
const renderScale = 0.40 * Math.min(area.width, area.height); // margin factor k≈0.40
child.position({
  x: parentPos.x + hint_x * renderScale,
  y: parentPos.y + hint_y * renderScale
});
```
`Math.min(width, height)` is the mobile-critical choice: it makes the arrangement fit
the smaller dimension and rescale uniformly on a phone. Do NOT use width alone or scale
x and y separately.

---

## Layout selection: SCAN, then render once (no double render)

When a parent view is built, the child edges are already loaded (they came from the
parent's query). Inspect them BEFORE running any layout. Decide one of three modes,
seed positions accordingly, then run exactly one layout.

```javascript
const childEdges = cy.edges(`[source = "${parentId}"]`); // adapt to actual edge dir/type
const hinted = childEdges.filter(e => e.data('hint_x') != null && e.data('hint_y') != null);
const total  = childEdges.length;

let mode;
if (total === 0 || hinted.length === 0) mode = 'force';
else if (hinted.length === total)        mode = 'preset';
else                                     mode = 'hybrid';
```

### mode = 'force'  (un-curated parent → this IS the starting view)
Plain fCoSE from scratch. This is how you get an initial arrangement to curate from.
```javascript
cy.layout({ name:'fcose', randomize:true, quality:'proof',
            nodeSeparation:80, nodeRepulsion:4500, numIter:2500 }).run();
```

### mode = 'preset'  (fully curated)
Place every child from its hint (recovery formula above), then:
```javascript
cy.layout({ name:'preset' }).run();   // no forces; positions honoured exactly
```

### mode = 'hybrid'  (some children hinted, some not — e.g. gradual text-node curation)
Place hinted children from hints AND PIN them; seed un-hinted children at the centroid
of the hinted ones; run fCoSE so un-hinted nodes arrange around the fixed hinted ones.
Pinning (not just seeding) keeps hints exact despite edge attraction from un-hinted nodes.
```javascript
// 1. place + collect pins for hinted children (recovery formula)
const pins = [];
hintedChildren.forEach(c => { c.position(recover(c)); pins.push({ nodeId:c.id(), position:c.position() }); });
// 2. seed un-hinted children at centroid of hinted ones (so newcomers appear "among the family")
const cen = centroidOf(hintedChildren);
unhintedChildren.forEach(c => c.position({ x:cen.x, y:cen.y }));
// 3. one fCoSE run, hinted pinned
cy.layout({ name:'fcose', randomize:false, quality:'proof',
            nodeSeparation:80, nodeRepulsion:4500, numIter:2500,
            fixedNodeConstraint: pins }).run();
```

Note: the three modes are one spectrum (force = 0 hinted, preset = all hinted). Keeping
them named is for clarity and lets `preset` skip the simulation entirely when possible.

### Avoid the fit() trap
If a `cy.fit()` / auto-fit runs after layout it re-centres content and masks preset/hybrid
placement. On preset/hybrid views, skip fit() or pan to frame after fitting.

---

## Developer panel (UI)

Three controls. Only **Write** touches the database.

- **Code field** — a text input. The typed code is sent with the Write request and
  verified SERVER-SIDE before any DB write. The browser never holds or checks the secret.
- **Write** — scans current on-screen child positions, converts to centre-relative
  normalised offsets (capture formula), POSTs them with the code to the server, which
  writes `hint_x`/`hint_y` to the parent→child edges. On success, the view follows its
  own rule (hints now exist → re-render in preset/hybrid so you see the saved result).
  Pressing Write again later simply overwrites the saved positions.
- **Reset** — restores the on-screen arrangement WITHOUT touching the DB and WITHOUT
  needing the code: if the parent has saved hints, restore to those (discard unsaved
  dragging); if not, re-run fresh fCoSE. This is the press-constantly-while-fiddling button.

There is intentionally no "delete hints" button. To revert a parent to pure force layout
you would remove the hint fields — a one-line Cypher behind the same gate, addable later
if needed. Not in scope now.

### Panel visibility
The panel may be shown always; the server rejects writes without a valid code. Optionally,
gate the panel on a read-only `GET /api/curation-available → {available:boolean}` that is
true iff the server has a code configured — this reveals only whether the feature exists,
never the code.

---

## Server endpoint (code gate, graceful absence)

Secret lives in a gitignored config (e.g. `.env` → `CURATION_CODE`). Commit a
`config.example` documenting the slot so a different developer understands it is optional.

```javascript
const CURATION_CODE = process.env.CURATION_CODE || null; // null => curation disabled, app still runs

app.get('/api/curation-available', (_req, res) =>
  res.json({ available: CURATION_CODE !== null }));

app.post('/api/hints', rateLimit({ windowMs:60000, max:8 }), (req, res) => {
  if (!CURATION_CODE)            return res.status(403).json({ error:'curation_disabled' });
  const ok = req.body.code &&
    req.body.code.length === CURATION_CODE.length &&
    crypto.timingSafeEqual(Buffer.from(req.body.code), Buffer.from(CURATION_CODE));
  if (!ok)                       return res.status(401).json({ error:'bad_code' });
  // verified → write hints (Cypher below). req.body = { parentId, hints:[{childId,hint_x,hint_y}] }
});
```

Requirements:
- **Graceful absence:** missing config = curation simply unavailable; server boots and
  serves the viewer normally; never crashes.
- **Constant-time compare** (`crypto.timingSafeEqual`) — not `===`.
- **Rate-limit** the endpoint (a few tries/min) — it is reachable from the public URL.
- **HTTPS only** — never accept the code over plain HTTP.
- Make the code long and random (treat as a password). It gates ONLY hint writes.

---

## Memgraph Cypher

### Write hints for one parent's children
Run per child, or UNWIND a batch:
```cypher
UNWIND $hints AS h
MATCH (p {id: $parentId})-[r:DESCENDS_FROM]->(c {id: h.childId})
SET r.hint_x = h.hint_x, r.hint_y = h.hint_y
```

### Read hints when building a view (alongside existing child query)
Ensure the parent→child query RETURNs `r.hint_x, r.hint_y, r.weight` so the scan step
has them in hand. No extra round-trip.

### (Later, if ever needed) clear hints for a parent — NOT in scope now
```cypher
MATCH (p {id:$parentId})-[r:DESCENDS_FROM]->()
REMOVE r.hint_x, r.hint_y
```

---

## Build order

1. Read hints in the parent query; implement the scan → three-mode selection; render once.
2. Hybrid pinning + un-hinted centroid seeding.
3. Dev panel (Code + Write + Reset) and the gated server endpoint with graceful absence.
4. Write-back Cypher; confirm round-trip (arrange → Write → revisit → reproduced).

Test on nav layers. Text-node→Cluster is the identical path — enable later by curating
those parents; no code change required.

## Acceptance check
- Un-curated parent shows a force layout (starting view); no errors when hints absent.
- Arrange children, Write with correct code → positions saved; revisit reproduces them.
- Wrong/blank code or missing server config → write refused cleanly; viewer still works.
- Partially-hinted parent: hinted children honoured exactly, un-hinted settle nearby, no overlap.
- Same saved arrangement viewed on a narrow (portrait) viewport rescales uniformly — shape
  preserved, no shearing.
- Reset restores on-screen arrangement; Write again overwrites saved positions.
- No visible double render on view construction.

---

## Design Decision Record — Implementation 2026-06-11/12

### DDR-1: WebSocket over HTTP POST for write-back

The spec proposed a REST `POST /api/hints` endpoint. Implemented as a WebSocket
message (`type: 'write_hints'`) instead, consistent with all other server
communication. Rate limiting is handled per-connection via a timestamp on the
`ws` object (`ws._lastHintWrite`); no `express-rate-limit` package needed.
Code verification (`crypto.timingSafeEqual`) is identical either way.

### DDR-2: Edge direction is inconsistent in the DB

The spec assumed `DESCENDS_FROM` edges always run parent→child. The codebase stores
them the opposite way for most edges (child→parent), but some are reversed.
**All edge scans (capture, render, scan)** use direction-agnostic matching:
```javascript
e.source().id() === pid || e.target().id() === pid
```
The "neighbour" end of each edge is whichever endpoint is NOT the parent.
This also means the grandparent Family node (visible in the family view because
`connectedEdges` is direction-agnostic) gets a hint stored on its edge too,
so its position relative to the parent is preserved on revisit.

### DDR-3: Node lookup in write-back Cypher

The spec's `MATCH (p {id: $parentId})` cannot work — nodes have no `id` property.
Write-back keys directly on the relationship integer:
```cypher
MATCH ()-[r:DESCENDS_FROM]-() WHERE id(r) = toInteger(h.relId)
SET r.hint_x = h.hint_x, r.hint_y = h.hint_y
```
Direction-agnostic, no node property lookup needed. `raw_rel_id` is stored on
every edge in Cytoscape data (set in `buildEdgeData`, preserved when `ed.id` is
overwritten with its `r_`/`cf_`/`sf_` prefix).

### DDR-4: renderScale must be in graph coordinates, not screen pixels

The spec's `0.40 × Math.min(width, height)` is in screen pixels. Cytoscape
`node.position()` is in abstract graph coordinates; the relationship between
the two depends on `cy.zoom()` at that moment. Using screen pixels directly
caused nodes to appear at wildly different sizes depending on the zoom of the
previous view.

**Fix:** derive renderScale from `idealEdgeLength` and child count — the same
parameters fCoSE uses internally, in the same coordinate space:
```javascript
const renderScale = 100 * Math.sqrt((childEdges.length || 1) + 1);
```
This is independent of viewport size and current zoom. After fCoSE + `fit:true`,
the zoom adjusts to fill the screen regardless of the absolute graph-coordinate
scale, so the visual result is consistent across devices and navigation paths.

### DDR-5: Pure preset layout replaced by fCoSE with fixedNodeConstraint

The spec's mode='preset' used `cy.layout({ name:'preset' })` with no simulation.
This fails when non-hinted nodes (grandparent Family, un-hinted children) are
visible — they keep their stale positions from the previous view and pull `cy.fit()`
off-centre, making the parent appear non-central and edges appear much longer.

**Fix:** both preset and hybrid use fCoSE with `randomize: false` and
`fixedNodeConstraint` pinning the parent + hinted children. Un-hinted nodes
(including the grandparent) settle naturally via edge attraction. The parent is
explicitly centred in graph space before the layout runs:
```javascript
const graphCx = (area.width  / 2 - cy.pan().x) / curZoom;
const graphCy = (area.height / 2 - cy.pan().y) / curZoom;
```

### DDR-6: In-memory edge update after Write keyed by raw_rel_id

Initial implementation updated Cytoscape edge data by positional index after
Write. Fixed to key by `raw_rel_id` (Map lookup) — robust to any difference
in iteration order between the `childEdges` collection and the `hints` array.
