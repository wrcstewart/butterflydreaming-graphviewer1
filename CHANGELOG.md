# CHANGELOG

Human-readable running log of substantive work sessions. Newest entries at the top. Committed alongside the code, so `git log CHANGELOG.md` reads as a summary-of-summaries.

The full commit history in `git log` is authoritative; this file is the friendlier read.

---

## 2026-07-17 — @flag review workflow + :User retired + Player gated + URLs stripped

**Landmark commits:** `540b46b` (sync-helpers @flag gate) → `de85344` (retire :User nodes) → `fbad529` (backfill-urls) → `f36cd78` (multi-block write + dump-nav-nodes + nav_nodes_text.md) → `aeb2115` (Player visibility gate + deep-link URL strip) → `7fdf7bc` (extractor: line-walk not paragraph-split).

**What shipped, by theme:**

### Bulk-review workflow

- **`@flag update_this: true|false`** directive now recognised by both `sync-helpers` (per @hub/@helper block) and the newly-multi-block-aware `write` command (per @match/@set block). CREATE (node doesn't exist yet) always applies. UPDATE (node exists) only applies when the flag is `true`; otherwise skipped and reported. Flags auto-reset to `false` after apply — file returns to a "no pending edits" state. Test on 6-block helper_messages.md: flipped `helper-nav-hint` to true, added a comma, sync applied 1 + skipped 5, flag reset to false in the .md.
- **`write` extended to multi-block** — `---` divider between blocks, same @match/@set format. `parsePatch` retired in favour of `parsePatchesFile`. `@match title` added as third-tier identity (url > name > title) for section-title TextNodes.
- **`backfill-urls`** subcommand — corpus-wide UUID identity coverage for `:Cluster` + `:Family` (default target labels). One round-trip: query candidates by `id(n)` (Memgraph doesn't have `elementId()`), JS generates UUIDs, one `UNWIND'd SET`. Applied to 126 nodes (120 Cluster + 6 Family). Corpus is now url-keyed everywhere except 84 empty orphan nodes (separate cleanup deferred).
- **`dump-nav-nodes`** subcommand + **`nav_nodes_text.md`** — 172-block file at repo root covering every Root + Entry + Family + Cluster + gateway/section-title TextNode (content-chunk TextNodes deliberately excluded). Each block carries `@match url` (always), `@match name` where present, `@match title` fallback for section-titles, `@flag update_this: false`, and `@set text:` with current text. Ready for the user's periodic review pass.

### Architectural cleanup: `:User` nodes retired

Server was creating a `:User` node in Memgraph on every socket connect purely to inherit an integer from `id(u)` into the viewer_id string. Leaky (~42 orphans had accumulated across dev iterations when purge timers died with their process). Now `viewer_id = 'N_' + crypto.randomUUID().split('-')[0]` — 8 hex chars, globally unique, in-memory only. `executePurge` no longer touches the DB.

Boot chain also gains `purgeStaleUsers()` chained after `pingMemgraph`: `MATCH (u:User) DETACH DELETE u` — one-off cleanup deleted the 42 orphans; a cheap no-op on every subsequent boot.

**Principle codified by user:** "no nodes in Memgraph for non-obvious architectural reasons".

### Memgraph id() vs elementId() gotcha

Discovered live: `elementId()` is Neo4j-only, Memgraph doesn't implement it. Memgraph uses `id()`. AND `id()` returns a numeric id that shares its space with relationship ids, so a bare `WHERE id() = X` could false-match either. Rule now codified: always scope MATCH patterns to nodes-only via `MATCH (n)` before the WHERE clause. Correct form:

```cypher
MATCH (n) WHERE id(n) = $nid SET n.url = $url
```

Never `MATCH () WHERE id() = X`. User's warning materialised on my first backfill-urls draft (used elementId — parse error `Function 'elementId' doesn't exist`); the corrected `id()` form runs everywhere in bd_tool.js writes.

### Player mode gated on module-in-top-card

Was previously always-enabled from boot. Now hidden AND disabled by default; visible + enabled only when the top local card's text contains a `%%bd_module` directive. Extends `updateSendBtn` (already called from every top-card mutation) with a regex check + label toggle. If user is currently in Player mode and the module disappears from the top card (e.g. new empty Local card created), a `bd:force-nodes-mode` custom event fires and init()'s listener calls `setViewMode('nodes')` to surface the graph.

### Deep-link URLs stripped to latest module block only

Cards accumulate paragraphs from every node-tap (each separated by `\n\n` since 2026-07-16). Previously, deep-link URL builders baked the whole card into the payload's `script` field, leaking "text from previous browsing". Now they call new helper `extractLatestModuleScript(text)` which returns just the latest module-script block.

Algorithm — LINE-WALK not paragraph-split (per user question: why require a blank line above the `%%bd_module` marker?):

1. Find the last line matching `/^%%bd_module\s+\S+/`
2. Walk forward, keeping every line while EITHER it starts with `%%bd_` OR we're inside an open `%%bd_score [ … %%bd_]` block (blank lines allowed inside score)
3. Stop at the first line that's neither a `%%bd_` directive nor inside an open score block

The module's own directive syntax is the boundary. Handles: no-blank-above, blank-inside-score, trailing-prose-cut, multiple-modules-last-wins. Verified with a five-case smoke test.

**Related memory:** [[bd-tool-and-helper-messages]] amended with all today's tool + workflow additions; [[deep-link-v2-moderation]] amended with the Player gate + URL strip; MEMORY.md index refreshed.

---

## 2026-07-16 — bd_tool.js + Helper Messages in DB (big infrastructure day)

**Landmark commits (chronological):**

- Chat polish: `3292412` (System card head = Root yellow #FFD700) → `1852f50` (accumulated card inserts get paragraph separators) → `ec7911b` (bot-context curator/user fork on chat side) → `df58afb` (card head labels: N=k → Local(k), Remote(k)) → `39cdc9f` (Remote label carries N.M inside brackets) → `d6695ad` (System → Helper (N.M))
- Onboarding text + helper text tweaks: `bd37458` (Helper 0.1 rewrite mentioning Helper/Remote roles) → `7235349` (dropped boot Helper 0.2 status; added on-Join no-partner message) → `367c4fb` (on-pair "successfully partnered" helper) → `1dcfe67` (Helper 0.2 navigation gesture)
- Button label reframe: `7c62c7a` (Remote Chat / Local Only) → `260af48` (idle → Join Remote to match helper text) → `9ae3d39` (toggled → Say: Bye)
- Card placement: `06b1e85` (helper cards strict newest-on-top, drop the dock-below-local rule)
- Infrastructure: `eb2c337` (bd_tool.js CLI: read / read-id / labels / cypher / write-stub) → `40aa6ac` (write from .md patch; Settling text fix as proof) → `78b20bf` (sync-helpers subcommand: parse @hub/@helper blocks, auto-generate url, write back into .md) → `de2f7ef` (helper_messages.md source-of-truth) → `c7be29b` (first sync — 6 nodes + 5 edges + 6 urls back into .md) → `f65910e` (server integration: retired 4 hard-coded string constants, 7 send sites now sendHelperByName from DB-loaded cache) → `0147aed` (wording iteration proof — flatten paragraph break in no-partner-waiting) → `952ebc8` (backup subcommand — DUMP DATABASE → replayable .cypher)

**Chat panel polish (the visible bits):**

- **System card head colour** — was `#2a2a00` (dim yellow, easy to miss). Now `#FFD700` — the same gold used for the Root node in the graph, with `#1a1a20` near-black text so luminance contrast passes (`[[user-colour-vision]]`).
- **Paragraph separation for accumulated inserts** — multiple node-taps into one local card used to jam together with single-newline separators. Now `\n\n` between inserts, and any `%%bd_ai_read [ … %%bd_]` block inside the incoming content gets a blank line before and after so it reads as its own paragraph.
- **Bot-context curator/user fork** — chat-side inserts now respect the same rule as `setSystemText` on the (dormant) default panel: with `#dev-code` non-empty, `%%bd_ai_read [ … %%bd_]` un-normalises to `[ … ]`; without it, the block is stripped entirely. Ordering (paragraph-normalise FIRST, then apply fork) matters.
- **Card head labels reframed** — `N=1` / `N=2` → `Local (1)` / `Local (2)`; partner cards `1.1` / `2.3` → `Remote (1.1)` / `Remote (2.3)` (N.M inside brackets preserves the compose-card association from the old `communications.md §4.1` scheme); system cards → `Helper`, then `Helper (N.M)` matching Remote's scheme (0.1 / 0.2 for boot-time messages that arrive before Local (1) exists).
- **Helper cards strict newest-on-top** — dropped `top.el.after(sys.el)` docking rule; helpers now prepend at the top like Local and Remote. `[[system-card-placement]]` memory marked superseded.

**Onboarding text tweaks:**

- Helper (0.1) rewrite mentioning both Helper and Remote roles
- Boot-time "Partner not available — please wait." card removed (was firing unconditionally to every arrival before they'd expressed pair intent)
- New helper: NAV_HINT ("Remember one click…") as Helper (0.2)
- New helper: NO_PARTNER_WAITING when user presses Join with no one waiting
- New helper: PAIRED sent to both sides on pair completion

**Button labels reframed:**

- Idle: `Chat` → `Join` → `Remote Chat` → **`Join Remote`** (final; kept for consistency with NO_PARTNER_WAITING helper text referencing "if someone remote presses Join")
- Toggled (waiting/paired): `Leave` → `Local Only` → **`Say: Bye`** (final; farewell framing)

**bd_tool.js — new CLI at repo root:**

```
node bd_tool.js read <name>
node bd_tool.js read-id <elementId>
node bd_tool.js labels
node bd_tool.js cypher <query> [<paramsJSON>]
node bd_tool.js write <patch.md> [--dry-run]
node bd_tool.js sync-helpers <helpers.md> [--dry-run]
node bd_tool.js backup [<outPath>]
```

Talks Bolt to localhost:7687 (same as server.js). JSON on stdout, progress/errors on stderr. `disableLosslessIntegers: true` so Integer values arrive as plain JS numbers.

`write` patch format: `@match url|name: <value>` picks target (url preferred), `@set <prop>: <value>` writes (inline or multi-line up to next `@` / EOF). Prose ignored — reads as a normal .md doc. Refuses ambiguous @match, no-match. Proof: `patch_settling_text_fix.md` fixed `tbottom` → `bottom` and stray spaces in the Settling Entry node.

**Helper Messages architecture (the big one):**

- New node kinds: `:HelperHub` (one, `name: 'Helper Messages'`), `:HelperMessage` (one per helper, `{ name, title, trigger, text, url }`)
- New edge type: `:CONTAINS_HELPER` from hub to each message
- New source-of-truth file: `helper_messages.md` at repo root — one hub declaration + N helper blocks separated by `---`
- `sync-helpers` subcommand parses the .md, upserts nodes (identity by url, then name), ensures edges, auto-generates urls on create and writes them back into the .md so the file becomes durable-identity source of truth
- Server side (`server.js`): new `helpersByName` cache Map, `loadHelpers()` reads all HelperMessages at boot chained after `pingMemgraph`, `sendHelperByName(userId, key)` replaces the old `sendSystemCard(userId, HOW_TO_TEXT)` pattern at 7 send sites
- Retired 4 hard-coded string constants + 2 inline `'Partner disconnected.'` literals
- Wording iteration is now: edit .md → sync-helpers → restart server. No code changes for wording tweaks.

Current 5 helpers: `helper-how-to`, `helper-nav-hint`, `helper-no-partner-waiting`, `helper-paired-success`, `helper-partner-disconnected`.

**Backup:**

`node bd_tool.js backup` dumps whole graph via Memgraph's `DUMP DATABASE` → `backups/memgraph_YYYY-MM-DD_HHMMSS.cypher`. First backup 3037 statements, ~810 KB. `backups/` in .gitignore.

Restore recipe: `mgconsole … < backups/memgraph_….cypher` against an empty Memgraph.

**Related memory:** [[bd-tool-and-helper-messages]] (new comprehensive doc); [[system-card-placement]] flagged SUPERSEDED.

---

## 2026-07-15 (part 2) — Deep link generation + content-moderation ops

**Landmark commits:** `9c9c5fd` (BD-self Copy Link + action bar reshape) → `7003273` (add node_id — WRONG identity choice) → `e75af6e` (revert; node_url is the durable UUID) → `4d57e71` (Op 1: receiver-gate payload.script on isModuleTarget) → `c88c9f1` (Op 2: EV textarea readonly) → `c63529c` (deep-link arrival breadcrumb seed Root→target) → `2029353` (chip font 9→8) → `3b5cf70` (chip width +5% + Back / Root exit Player mode) → `9deb2a3` (EV "Should I update the script?" dialog) → `ca73e74` (Op 3: EV sliders no longer auto-write textarea) → `dc4f034` (dialog extended to BD's three Player-mode share buttons) → `bffacaf` (wording: "settings may have changed", not "drifted").

**What shipped — three connected threads:**

### 1. BD-self Copy Link button + action-bar layout squeeze

New `#copy-link-btn` on BD's action bar generates a URL back to BD itself (`window.location.origin + "/?data=..."`) carrying the same payload shape as the EV Copy Link. Same three-rung clipboard fallback (async → execCommand → visible textarea). Old New Card lost `margin-left: auto` and moved next to ↑; both New Card and the new Copy Link use two-line labels (`New<br>Card`, `Copy<br>Link`) so each stays narrow enough for the iPhone action bar.

Receiver flow uses `handleReturnFromStandalone` — same code path that already handles EV → BD arrivals.

### 2. Deep-link identity: `node_url` (UUID-based), not Neo4j elementId

Tried using Neo4j's elementId as a "stable id" (commit 7003273). Reverted the next commit — the project already has a durable UUID-based identity: `node.data('url')` = `'butterflydreaming.org/n/<uuid>'`, set at node creation via `crypto.randomUUID()` in the MM1+ migration scripts. Neo4j elementId is DB-instance-scoped and regenerates on reimport — wrong tool for durable share links.

Coverage gap flagged: legacy corpus TextNodes predate the UUID convention and have no `url`. BD-self deep links to those fall through and no-op. Backfilling `url` on the legacy corpus is a data-side migration task, not yet scoped.

### 3. Content-moderation architecture (Ops 1-3 + confirm dialog)

Threat model: users typing free-form text into producer surfaces → Copy Link → receiver applies content as if authoritative. Not a code-injection concern (no eval / DOM injection) but a **content-curation** one — the corpus is curated; chat cards and scripts shouldn't leak arbitrary text through shared URLs. User's framing: "layered security screen will filter engineered URLs anyway; this is more because editing belongs in BD not EV" — the fix here is separation of concerns.

**Op 1** — BD's `handleReturnFromStandalone` computes `isModuleTarget = !!(target.data('hasModuleScript') || parseModuleId(target.data('text')))` and branches:
- **Module target** → payload.script is trusted (producer's UI, post-Ops-2/3, ensures it's slider-derived). Full existing flow: shadow node.text, original DB script on N=1, payload script on N=2, auto-Player.
- **Normal target** → payload.script is IGNORED. Navigate to node, populate top card with node's OWN DB text (mirrors a manual tap). Stay in Nodes mode. Sender's typed chat drops on floor.

**Op 2** — EV's script textarea gets `readonly` attribute. Keyboard editing rejected. Sliders write to `.value` programmatically (`readonly` doesn't block JS assignments). Color slightly desaturated + `cursor: default` as read-only cues.

**Op 3** — EV sliders no longer auto-write the textarea. Previously `stepControl` did `textarea.value = writeDirective(textarea.value, ...)` making the textarea a live mirror (Op 1/2's protection would have been hollow). Now sliders update `currentScript` (module-scope mirror) and post that to the module; textarea holds only the LAST COMMITTED script (from loadScript, ↑ Receive, or ↓ Send). User commits accumulated slider + drift state to the textarea by pressing ↑ or accepting the update-script dialog.

**Update-script dialog** — fires from both EV Copy-Link buttons AND (in Player mode) all three BD share buttons (`#jump-to-ext-btn`, `#copy-link-to-ext-btn`, `#copy-link-btn`). Same wording, same shape, same `localStorage.bd_ev_copylink_updatemode` key (BD + EV share an origin, one preference applies). "Yes, update" fires `bd_script_request` to the module, awaits `bd_script_response` (500ms timeout), then runs the copy — existing top-level handler updates textarea (EV) / focused card (BD), promise resolves, copy fires with fresh source. Non-Player-mode BD Copy Link skips the dialog entirely (normal-node share, receiver ignores script anyway).

### Receiver arrival UX polish

- **Breadcrumb seed** — after `enterNode(target)`, `#cy-you` gets two chips: `Root` and target, connected by an amber curved edge (`.deep-link-hop`, `curve-style: unbundled-bezier`, control-point-distance -11px). Signals "we jumped here, we didn't walk step by step". Required exposing `addYouChip` from setupInteractions.
- **Chip typography** — width 60 → 63 (+5%), font 9 → 8 (~10% smaller). Edge characters no longer clip.
- **Back button + Root chip exit Player mode** — two supplementary listeners in init(). Without them, `restoreState()` / `expandToNode(root)` fired correctly but the graph update happened UNDER the module iframe — user saw nothing. Now Back and Root taps surface the graph.

### Wording note

Dialog body originally said "The visual may have drifted…". User pushed back — "drifted" is jargon tied to the specific angle-drift feature. Changed to "The settings may have changed since the last sync…" in both origins.

**Files touched:**

- `viewer.js`: `buildBdSelfUrl`, `isModuleTarget` branching, breadcrumb seed, Back/Root mode exits, `withUpdatePrompt` + `requestModuleSyncBD`, dialog wiring for 3 buttons, `addYouChip` exposed
- `index.html`: action bar reshape, `#copy-link-btn` new, radios `disabled` attr removed, dialog markup
- `style.css`: two-line button styling, `.modal-*` rules, chip width/font tweak
- `V_Kolam/preview.html`: `<textarea readonly>` + colour/cursor cue, `stepControl` uses `currentScript`, `bd_script_response` + `sendBtn` also update `currentScript`, dialog markup + CSS + JS, `withUpdatePrompt` + `requestModuleSync`, dialog wiring for 2 buttons, header comment updated

**Deferred:**

- Backfill `url` property on legacy corpus TextNodes (data-side migration)
- Wrap EV's `#bd-enter-btn` (Jump to BD, same-tab) in the update-script dialog — semantics of dialog-on-navigation weren't obvious enough to just do
- ESC / click-outside dismiss on both dialogs
- UI-visible "reset preference" (currently DevTools-only via `localStorage.removeItem`)

**Related memory:** [[deep-link-v2-moderation]] (new comprehensive doc); [[mm1-amendment]] updated with second-amendment note; [[always-on-chat]] unchanged but interacts (unlocking Player at boot is what made step 6's auto-Player always-fire, which Op 1 then re-gated).

---

## 2026-07-15 — Chat always on; Chat button → Join / Leave

**Landmark commits:** `893e9af` (UX simplification) → `fd43b45` (onboarding line).

**What shipped:**

- **Chat panel is now permanently active from page load.** Previously the user arrived in a "browse-only" state; the Chat button gated chat mode, Player mode, and pair queue simultaneously — meaning users couldn't try Player or see chat panel until they entered the pair queue with a curation code. Now the panel is visible immediately, populated with the how-to + status system cards, ready for a real N=1 local card to compose in.
- **Nodes / Player radios enabled from boot;** EV "Extend / Jump to / Copy Link to External Website" invite panel appears the moment a user picks Player — no pair required.
- **Chat button renamed Join / Leave** and only manages pair state. Label flips based on `pairingState.active || pairingState.waiting`. Curation code still required for arriver; same-device refusal still enforced (MM3 mechanics untouched).
- **No auto-requeue when buddy leaves.** Previously, on `buddy_disconnected`, client auto-re-emitted `ready_to_pair`. Now the button reverts to Join and the user must press again to try another partner. Matches the opt-in-both-directions model.
- **N=0 hidden ghost card removed.** Server's `chat_ready` still fires (once, right after boot-time `enter_chat`); client's `handleChatReady` still runs and creates the visible N=1 directly. No more hidden serial-0 placeholder.
- **Onboarding demoed live.** `HOW_TO_TEXT` in server.js gains "Try it out now — select and copy this line!" — turns the how-to card itself into the demo target for the OS-copy card-lift mechanism (which was already wired but invisible to new users).

**Files touched:**

- `viewer.js`: `chatModeActive` initial `true`; `pairingState.waiting` added; boot activation block after ws connect (chat panel active, enter_chat emit, radios/Copy Down unlocked, Join label, positionCyEl rAF); `toggleChatMode` (~60 lines) replaced by `togglePair` + `updateJoinButtonLabel` (~30 lines); all four pair-state handlers now sync button label; `handleReturnFromStandalone` step 4 removed; step 5 (`handleChatReady` force-call) preserved.
- `index.html`: `#chat-btn` label `Chat` → `Join`; `disabled` attr removed from radios + `#copy-down-btn` (JS boot still enables them; removing from HTML prevents flash). Cache-bust `viewer.js?v=401`.
- `server.js`: `HOW_TO_TEXT` extended with the try-it-now sentence. No behaviour change to any handler.

**Discovered but deferred:**

- **OS-copy card-lift mechanism was already wired but invisible.** Every card body listens for `copy` (via `handleCardCopy`), and any copied text auto-appends into the top local card. Users didn't discover this — hence the new demo line. Considered adding a visible per-card lift button; user preferred to leave the wire alone and add the invitation line to onboarding first.
- **Dead code left in place** for now: `ensureLocalCard` function + destructure slot; stale comments referencing `toggleChatMode`; `#default-panel` in HTML (always hidden via sibling selector). All safe to prune in a follow-up once the new UX is settled.

**Behaviour verification:**

Test flow on reload — page loads → chat panel visible with system cards → Player radio works → EV invite panel appears in Player mode → Join button queues for pair (with optional curation code) → Leave button unpairs / walks out of queue → buddy disconnect returns solo user to Join without auto-requeue → same-device refusal keeps chat panel active (was already the case pre-2026-07-15, now the same is true for `code_required` too).

**Related memory:** [[always-on-chat]] (new); [[project-pairing]] amended for opt-in / no-auto-requeue; [[chat-panel-state]] chat-toggle sections marked superseded; [[n0-ghost-protocol]] marked superseded; [[mm1-amendment]] "Pair button removed" note flagged as reversed.

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
