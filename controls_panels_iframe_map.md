# Controls / Panels / iframe Relations — BD Viewer & Standalone Visual Module Viewer

*A briefing for design discussion. Written 2026-07-02 while planning how the standalone visual module and the BD graph viewer might collaborate, and what shape a dyadic-convergence-node (DCN) save mechanism should take.*

---

## 1. What ButterflyDreaming is (one paragraph)

BD is a Neo4j-backed graph viewer (`index.html` + `viewer.js` + Cytoscape) rendering a graph whose text nodes carry ordinary prose *and* short blocks of what we call **%%bd_ directives** — a shared control language interpreted by media modules. Two anonymous "dyad" users edit the graph collaboratively over a WebSocket link (`server.js`), pairing up, opening a chat panel, drilling into a node, and negotiating its content. When a node happens to contain %%bd_ directives that name a visual (or eventually audio) media module, an embedded iframe renders it — the media module becomes a live participant in the dyadic exchange rather than a passive attachment.

## 2. The three layers

Every media node has three things that need to stay in sync:

| layer | what it is | where it lives | who writes it |
|---|---|---|---|
| **script** | full text of a graph node — prose + `%%bd_` directive lines + a `%%bd_score [ … %%bd_]` block | textarea in the host UI; also inside the Neo4j `text` property of a node | the user (typing) or ↑ (receive-from-module) |
| **directives** | individual `%%bd_<name> <value>` lines parsed out of the script | derived — nothing stores them separately | parsed by the module on render |
| **controls** | +/− stepper widgets, one per numeric-arg directive | the module (`visual_module.html`) *and* the host (`viewer.js` or `preview.html`) each carry their own set | the user (tapping) or drift-automation (ticking) |

The **script is user intent**. The **controls are runtime knobs**. This distinction matters because drift-automation ticks the controls but does *not* rewrite the script — the user chooses when to bake current control state back into the script by pressing ↑ (receive).

Directives that take a single numeric argument (e.g. `%%bd_symmetry 8`, `%%bd_angle 45`, `%%bd_colour_speed 4`) all get identical stepper treatment: `−` button · read-out span · `+` button, with the directive's exact name (`symmetry`, `angle`, `colour_speed`) as the label below. Directives that carry a colour (`%%bd_background #0a0a0f`) or a token (`%%bd_stroke angle`) don't get steppers — for now they're script-only.

One directive is deliberately special-cased: `%%bd_angle_seconds` is a sub-arc-minute drift accumulator. It has no script representation and no visible control — it lives only in a hidden `<input>` inside the module. The module's `render()` reads it live from that input; if we tried to round-trip it through the script the visual would only advance once per minute of arc (visibly jerky). See `project_a42_visual_module.md` gotchas #9 and #10 for the paired lesson.

## 3. Two hosting contexts for the same media module

The visual module (`V_Kolam/visual_module.html`) is one file. Two different parents can host it in an `<iframe>`.

### 3a. BD graph viewer (`index.html` + `viewer.js`)

```
┌──────────────────────────────────────────────────────────────┐
│  Cytoscape canvas (#cy)          │  Chat / edit panel        │
│  ┌────────────────────────────┐  │  ┌─────────────────────┐  │
│  │                            │  │  │ CodeMirror6 script  │  │
│  │  <iframe #visual-iframe>   │  │  │ textarea            │  │
│  │  positioned over #cy       │  │  ├─────────────────────┤  │
│  │  when node is a media node │  │  │ ↓ Copy Down         │  │
│  │                            │  │  │ ↑ Copy Up           │  │
│  │  visual_module.html        │  │  │ ● Nodes / ○ Player  │  │
│  │  (renderer + its own       │  │  └─────────────────────┘  │
│  │   stepper column, visible) │  │                           │
│  └────────────────────────────┘  │  Buddy bar, breadcrumbs   │
└──────────────────────────────────────────────────────────────┘
```

The script comes *from a graph node*. `↓ Copy Down` copies the textarea text into the module via `bd_script_update`. `↑ Copy Up` asks the module for its current state (`bd_script_request` → `bd_script_response`) and drops it into the textarea. Any changes the user keeps live in the textarea are saved back to Neo4j via WebSocket when the node is closed — that's the persistence path.

The module's *own* stepper column is visible in this mode. It sits inside the iframe alongside the canvas. Two dyad users, each running their own BD viewer, converge on the same script through the graph — the WebSocket doesn't relay `bd_param_update` yet (A42 §42.11 deferred it); consensus is currently reached at script granularity, not knob granularity.

### 3b. Standalone preview (`V_Kolam/preview.html`)

```
┌──────────────────────────────────────────────────────────────┐
│  Canvas (kolam render, full-window minus side panel)         │
│                                     ┌──────────────────────┐ │
│                                     │ script textarea      │ │
│                                     │────5px amber bar─────│ │
│                                     │ Copy Link · Copy ·   │ │
│                                     │   ↓ · ↑              │ │
│                                     │────7px gap───────────│ │
│                                     │ symmetry  − 8 +      │ │
│                                     │ depth     − 3 +      │ │
│                                     │ step      − 40 +     │ │
│                                     │ angle     − 45 +     │ │
│                                     │ …                    │ │
│                                     │ status               │ │
│                                     └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The script comes *from the URL* — `?script=<base64 UTF-8>` — or from `DEFAULT_SCRIPT` if the URL has no param. Copy Link builds `window.location.origin + pathname + '?script=<btoa of textarea>'` and writes it to clipboard. That URL *is* the shareable state. No backend, no accounts, no login.

To avoid two stacked stepper columns (one in the module, one in the host), `preview.html` sends `bd_ui_config { hideControls: true }` on `BD_READY`; the module hides its own control panel and expands the canvas. The steppers you interact with in preview.html live in `preview.html`; they relay changes into the module by rewriting the `%%bd_<name>` line in the shared script text and sending a fresh `bd_script_update`.

`preview.html` also serves as **the reference layout for a future BD Player-mode** — the mode where the dyad users, having negotiated a script, want to sit back and watch the module render it at full scale with the score textarea alongside as a live editor rather than as a graph node. The dashboard-with-steppers pattern is the same one BD Player will use.

## 4. postMessage protocol (both contexts speak the same one)

| message | direction | payload |
|---|---|---|
| `BD_READY` | module → host | (empty) posted once on module load |
| `bd_script_update` | host → module | `{ script: <text> }` — full script (initial send, ↓ copy down, or on any stepper tap in preview) |
| `bd_script_request` | host → module | ask module for its current script |
| `bd_script_response` | module → host | `{ script: <text> }` — answers ↑ copy up |
| `bd_ui_config` | host → module | `{ hideControls: bool }` — toggle the module's internal stepper panel (preview.html uses this to avoid double-up) |
| `bd_state_update` | module → host | `{ angle, angle_minutes, angle_seconds }` — broadcast every drift tick so host steppers stay live |
| `bd_param_update` | either | `{ name, value }` — single-directive nudge (reserved but not wired yet; A42 §42.11 defers WebSocket relay) |
| `BD_ERROR` | module → host | `{ payload: { message } }` — render error |

The `BD_INIT` / `BD_UPDATE` / `BD_REQUEST_UPDATE` family is legacy — still accepted for the frozen `_copy` reference harness inside `V_Kolam/`, but new hosts should use the lower-cased `bd_*` set above.

## 5. Copy Link — the state-in-URL trick

`preview.html` reads `?script=<base64>` on load; encodes textarea contents into `?script=<btoa(unescape(encodeURIComponent(text)))>` on Copy Link. Because the URL fully encodes the state, sharing the URL is equivalent to sharing the script. No server-side state; no shortener; no expiry.

This works because everything the visual needs is in the script text. Every meaningful control value is a `%%bd_` directive (except `angle_seconds`, which is drift-runtime only). Round-trip is perfect for anything the user actively authored.

**Limitation:** URLs get long (~1–2 KB for a typical kolam). Clipboard write from `navigator.clipboard.writeText` needs a secure context — works on the tunnelled `graph.virtualfictions.uk`, not on plain-HTTP LAN IP. Everything *else* (steppers, drift sync, ↓/↑) works over plain HTTP fine, so phone-testing on LAN is viable except for the Copy Link button itself.

## 6. Persistence today

| context | how state is saved |
|---|---|
| BD viewer, connected as a dyad | script lives in Neo4j `text` property of the node; saved via WebSocket when the node closes; git commits of `server.js` config only, not user content |
| BD viewer, solo / offline | same — Neo4j is authoritative; if the server is down, no save |
| Standalone preview.html | Copy Link URL — that's it. No accounts. No history. Refresh with no `?script=` loses the work. |

## 7. Design questions the user wants to think about

These are what motivated writing this summary. Not decisions, not proposals — questions to bring to a design conversation.

**a. Standalone → BD-dyad "beaming".** If someone plays with a standalone preview URL and produces a kolam they love, how do they escalate it into a live BD dyad conversation? Options include: paste the Copy Link URL as a node's text in the graph; drag-drop; a "seed a new node" button in preview.html that opens a BD viewer URL with the script preloaded.

**b. BD-dyad → standalone URL "beaming out".** The reverse — during a dyad session, one user wants to share the current script with a non-BD-user (someone without an account). "Copy standalone link" button that wraps the current node script into a preview URL.

**c. Local-remote collaboration.** Two people, one on standalone preview, one in the BD graph — can they collaborate in real time, or only asynchronously through URLs? If real-time is desirable, does the standalone preview need to *become* a lightweight BD client (WebSocket in, chat panel out) — and if so, is that still "standalone"?

**d. DCN saving mechanism.** A dyadic-convergence-node is the artifact produced when two users reach agreement. Today "save" is the WebSocket write into Neo4j. Should a DCN carry: (i) the final script text only, (ii) both the final script *and* both parties' trailing suggestions before convergence, (iii) the standalone-preview URL representing the final state, (iv) a snapshot of runtime state (frozen drift angle)? Each choice has different implications for what "replaying" a DCN means.

**e. Controls granularity for collaboration.** `bd_param_update` exists but WebSocket relay is deferred. Should convergence happen at the script level (only broadcast when the user commits) or at the control level (every knob tap goes over the wire)? Kolam has ~10 knobs; audio module will have more; realtime knob-broadcast could be chatty.

**f. Multi-module futures.** The stepper convention is deliberately generic. When a music module (`M_*`) or Xong module lands, its steppers will look identical, and the host layouts (BD viewer, preview.html) shouldn't need module-specific code. Currently the stepper list in `preview.html` is hardcoded to the Kolam directive set — parking that as a known limitation until we have a second module to test against.

---

## Appendix — key files, one-liners

- `V_Kolam/visual_module.html` — the renderer. Owns its own stepper column (`bd_ui_config` can hide it). Broadcasts `bd_state_update` every drift tick.
- `V_Kolam/preview.html` — standalone host. Owns its own stepper column, hides the module's. `?script=<base64>` state.
- `V_Kolam/index.html` — thin relay wrapper; two-way postMessage relay for the BD viewer's embed path.
- `V_Kolam/index_copy.html` / `visual_module_copy.html` — **frozen** reference harness. Do not modify.
- `index.html` + `viewer.js` — BD viewer. Embeds `V_Kolam/index.html` in `#visual-iframe`. Steppers TBD (currently uses the CodeMirror6 textarea + ↓/↑ buttons for state exchange).
- `server.js` — Express + WebSocket + Neo4j. Serves `V_Kolam/` at `/visual1/`. Binds `0.0.0.0` so LAN phone testing works.
- `graphviewer (2).md` — spec doc. A42 §a–§f record the preview / stepper / script-vs-runtime decisions.
