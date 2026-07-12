# CHANGELOG

Human-readable running log of substantive work sessions. Newest entries at the top. Committed alongside the code, so `git log CHANGELOG.md` reads as a summary-of-summaries.

The full commit history in `git log` is authoritative; this file is the friendlier read.

---

## 2026-07-12 — MM3 amendment: BD invite panel + cross-tab kick

**Landmark commits:** `5ba9550` (part 1 scaffolding) → `4ad6b8d` → `72f3c64` → `9375167` (part 2 button wiring) → `e2aa7ec` (BroadcastChannel kick — later reverted) → `e864288` (cookie-based kick, final).

**What shipped:**

- **BD viewer now has its own invite panel** — reciprocal of the EV's "Butterfly Dreaming" panel. When you enter Player mode on a media node, a small panel materialises to the right of the module's stepper column:
  ```
  Explore
  [ Jump to ]
  [ Copy Link to ]
     *External*
     *Website*
  ```
- **Jump to** opens the standalone EV in a **new tab**, carrying the current node's script + node_url + source_text + title as a `?data=` payload. BD tab lives on so the chat/pair session isn't lost.
- **Copy Link to** writes the same URL to the clipboard with the three-rung fallback (async → execCommand → visible textarea).
- The action-bar's old `#copy-link-btn` was **removed** — that action moved into the invite panel. `buildExternalWebsiteUrl()` in `viewer.js` is now the single URL builder for both buttons.
- Canvas inside the module iframe **snugs against the left of the module column** on desktop (previously there was a huge gap between the square canvas and the 220-px control column). Achieved with `justify-content: flex-end` on `.canvas-wrapper`.
- **Media player** now appears immediately when the file list arrives from the server — no longer gated on navigating to the "Settling" node.

**Cross-tab kick — anti-gaming:**

Discovered mid-session that when a user does Jump-to → EV → Jump-in-back, the returning tab is a *new* BD WebSocket, and their original BD tab is still alive. That's two BD sessions on one device, enough to pair with yourself and defeat the two-user chat/save premise.

Fix: server-side `bd_device_id` cookie (per browser, 7-day Max-Age, UUID, only issued on GET / or /index.html to avoid asset-request races). Server tracks `deviceIdToWs: Map<deviceId, ws>`. On any new WebSocket connection whose device_id matches an existing entry, server sends `{type: 'kicked_by_newer_tab'}` to the old ws then closes it. The kicked client shows a specific session-expired overlay.

Initial attempt (commit `e2aa7ec`) used `BroadcastChannel` — worked but is same-origin only, so would break the moment the EV moves to GitHub Pages. Reverted and replaced with the cookie approach (`e864288`), which is origin-agnostic (cookie belongs to BD's origin regardless of where the browser navigated from).

**"Some trouble" bypass:** clear cookies, use incognito, or a second browser. Per user's explicit acceptance bar — same-device gaming becomes annoying enough not to be trivial, no tighter than that.

**Non-obvious gotcha:** `ws.on('close')` must **identity-check** the map entry before deleting (`if (deviceIdToWs.get(ws.deviceId) === ws) delete`). Without this, a fast kick+reconnect race can have the kicked-ws's later close event clobber the newer replacement entry.

---

## 2026-07-11 — MM2 amendment: hasModuleScript + EV button strip

**Landmark commits:** `a44a751` (plumbing) → `fdd2a7a` (EV button strip) → `9e466a1` (TDZ fix) → `cae1bb5` (virtual position) → `dd57ddd` (chat two-card) → `3dce0b5` (media player always-on) → `a207e50` → `77f932f` → `f57b270` → `ee56425` (EV invite-panel iterations).

**What shipped:**

- **DB migration** via new `migrate_mm2.js` (user-run, same pattern as `migrate_mm1.js`): renamed `bd_V_Kolam_1` → `bd_V_Kolam_001`, `bd_V_Kolam_2` → `bd_V_Kolam_002` (3-digit zero-padded convention). Set `hasModuleScript = 'bd_V_Kolam'` on both. Created two Memgraph indexes: `:TextNode(hasModuleScript)` and `:TextNode(created_at)`.
- **Two new HTTP endpoints** in `server.js` (the first HTTP routes in the codebase — everything else was WebSocket):
  - `GET /api/module-default?module=<id>` — returns the first content node by min(seq), plus `isFirst` (always true) and `isLast` (true iff module has one node).
  - `GET /api/module-sibling?node_url=<url>&direction=next|prev` — returns adjacent sibling under the same `hasModuleScript`. Uses a LIMIT 2 idiom in the Cypher: 1 row back means we're at the boundary in that direction, 2 rows means there's more beyond.
- **`bd_param_update` message type** added to `V_Kolam/visual_module.html` — lets a host harness set a single directive value directly instead of rewriting the whole script. Used by the EV's Freeze button (angle_drift → 0 and back). Adds a `<name>-slider` id lookup with an `input` event dispatch so `handleControlChange` fires unchanged.
- **External Viewer basic mode.** `preview.html` now starts with `body.ev-basic` — side panel (textarea + steppers) hidden by default. Bottom bar shows only:
  ```
  [Freeze] [Edit] [◀] [▶]   <source context>
  ```
- **Freeze**: `bd_param_update {angle_drift: 0}`, stores prior drift for restore, silently clears on any script swap.
- **Edit**: toggles `body.ev-basic` — side panel materialises with textarea + steppers.
- **◀ / ▶**: fetch `/api/module-sibling`, load response, `updateEvNavState(isFirst, isLast)` disables the boundary button.
- **Virtual "position 0" for `?data=` arrivals.** When EV loads with a `?data=` payload, that payload is cached as `virtualStart` and treated as slot 0 of the navigation list. DB siblings occupy slots 1, 2, 3, ... ◀ from the first DB sibling returns to virtual (so a user's edited-script arrival state stays reachable after browsing away).
- **Chat panel dual-card on `?data=` return.** When BD viewer receives a `?data=` return-from-standalone, the chat panel now shows **two** cards: the original DB script on N=1, the incoming (edited) payload script on N=2 (newest on top). Skipped when the two scripts are identical.
- **Media player always visible** — no longer gated on navigating to Settling. Opens immediately when the file list arrives.
- **`loadScript(script, meta?)` central function** in `preview.html` — used by initial-load, ?data= decode, Prev/Next, Copy Down. Central place for future script-application changes.
- **BD viewer default-node fallback rewritten structurally** — `handleReturnFromStandalone`'s fallback for missing `node_url` now uses `hasModuleScript + min(seq)` rather than a `moduleId + '_1'` name match. Robust to any naming change (was going to silently break the moment `_1 → _001` happened).

**EV invite panel iterations** (afternoon session): initially had "Jump In" alone → then added Copy Link → then removed Copy Link (redundant with URL bar) → then restored Copy Link with new naming ("Jump to Butterfly Dreaming" / "Copy Link to Butterfly Dreaming") so the italic "Butterfly Dreaming" line below acts as a shared object of both verb-buttons. Muted amber palette instead of bright gold. Text shortened from "You can use our Butterfly Dreaming Platform to explore context, collaborate and save" → "You can use our Platform to explore, collaborate and save".

**Non-obvious gotcha (worth remembering):** A `function` declaration hoists but its **body** doesn't. `updateEvNavState` closed over `evPrevBtn` / `evNextBtn` `const`s declared later in the file. When `loadInitialScript`'s `?data=` branch called it synchronously, the `const`s were still in TDZ → ReferenceError. The surrounding `try/catch` swallowed it and logged (misleading) `preview: failed to decode ?data param`. Actual decode had succeeded; the throw only interrupted the nav-state update, but the flow then fell through to `loadModuleDefault` which overwrote the payload with `bd_V_Kolam_001`. Fix: `updateEvNavState` now looks buttons up via `getElementById` at call time (no closure). See `feedback_tdz_destructure.md` for the general pattern.

---

## 2026-07-10 — server + tunnel restart after machine shutdown

No code changes. Helped restart local `node server.js` (killed a ghost process holding port 8080) and `cloudflared tunnel run` after machine reboot. Config at `~/.cloudflared/config.yml` unchanged; tunnel maps `graph.virtualfictions.uk` → `http://localhost:8080`.

---

## 2026-07-05 — MM1 amendment: media-module naming + return-from-standalone

**Landmark commits:** `588846e` (registry + URL rename `/visual1` → `/bd_V_Kolam`) → `5ee507d` (Copy Up enables on auto-load) → `bc2cf3c` (initial return-from-standalone) → `a3b577c` → `ebf4f15` → `1938a6e` (return-flow race-condition fixes) → `0ddc8b4` → `09ba3c5` (default-node fallback).

**What shipped:**

- **Module identifier convention** — every module now has a stable text id like `bd_V_Kolam` (BD platform prefix + type + module name). `%%bd_module bd_V_Kolam` in scripts.
- **`MODULE_REGISTRY`** in `viewer.js` maps id → iframe URL. Enables future multi-module support.
- **Strategy B auto-load** — entering Player mode on a media node auto-loads its script into the iframe (fast-path if same module, src-swap + await BD_READY if different). No need to press ↓ manually.
- **Full URL rename** `/visual1/` → `/bd_V_Kolam/` in the Express mount, the iframe src, and the Copy Link URL constructor. On-disk `V_Kolam/` directory unchanged.
- **Return-from-standalone flow.** When BD viewer opens with `?data=<base64 JSON>` in the URL (produced by the standalone player's "Enter ButterflyDreaming" button), viewer.js:
  1. Decodes the payload `{script, node_url, source_text, title}`.
  2. Finds the originating node by URL match.
  3. Locally overwrites `node.data('text')` with the payload script (so Player-mode auto-load uses the edited version, not the DB copy — not persisted).
  4. Engages Chat mode + populates the local card with the payload script.
  5. Engages Player mode → visual plays.
  6. Strips `?data=` from URL bar so a refresh doesn't re-fire (later reverted in dd57ddd to enable two-card chat display).
- **Pair button removed** — Chat button now toggles pair + chat + unpair as one action.
- **Curation-code gate** on pair completion (not on Chat press). Server: if `waitingUser` exists, arriver must send a valid code; otherwise queue silently. Solo dev testing works without a code.
- **`migrate_mm1.js`** — one-shot DB script for the initial `bd_V_Kolam` renames and CHILD/CLUSTER_REL setup.

**Non-obvious gotchas:**
- `V_Kolam/index.html` (thin relay) had `RELAY_UP` deliberately excluding `BD_READY` — fine when the viewer never needed BD_READY, broke silently under MM1.6's src-swap-and-wait path. Added `BD_READY` to `RELAY_UP`.
- `positionCyEl` was stamping `#visual-iframe` with `#cy.getBoundingClientRect()` — but in Player mode #cy is `.hidden` (display: none), so the rect is zero. Iframe collapsed to 0×0, module rendered blank. Guarded the stamp to skip on zero rect.
- `handleChatReady()` must be called synchronously in the return-flow before `setChatText` — the async chat_ready message from server hasn't arrived yet, so setChatText would land in the hidden N=0 ghost card instead of a visible N=1.

---

## 2026-07-04 — pair button rework, CHILD arrow symmetry fix, TextNode label priority

Merged into the MM1 arc. See `project_pairing.md` + `project_mm1_amendment.md` for the pair rework detail; `project_a42_visual_module.md` for the CHILD-symmetry fix (was: `handleGatewayClick` excluded CHILD edges from its show-set); label-priority fix (`name` wins over `source_text`, so `Kolam_1` renders as "Kolam_1" not "Visual Tests"). Also: attempted TextNode dedup by url (`95acef7`), reverted (`60eda62`) — dedup broke `handleGatewayClick`'s raw-elementId lookup. `cy` exposed on `window` for browser-console debugging.

---

## 2026-07-03 — Copy Link cross-app flow + standalone bd_bar

`3fef0b7` (Copy Link button in BD viewer) → `c6bd547` (preview.html decodes `?data=` envelope) → `6828974` (URL targets preview.html) → `6773772` (relocate button to #action-bar) → `779378c` (percent-encode base64 in URLs — silent `+ → space` bug) → `ef8ea01` → `3058633` (Copy Link prefers lastReadNodeId over activeNodeId) → `62ddef5` (standalone `#bd-bar` with source context + Enter BD) → `c8d809a` (Copy BD Link) → `7ff2131` → `3651ca1` → `c4a4d84` (three-rung clipboard: async → legacy execCommand → visible textarea).

Established the cross-app return-trip protocol and the three-rung clipboard strategy that lets Copy Link work on plain-HTTP LAN.

---

## Older work

Pre-2026-07-01 work — the initial A42 visual-module integration, the card-stack design, the chat panel — see the memory files in `~/.claude/projects/.../memory/`:
- `project_a42_visual_module.md`
- `project_a42_card_stack_design.md`
- `project_chat_panel.md`
- `project_layout_topology.md`

Or `git log --before='2026-07-01'` for the commit-level detail.
