# ButterflyDreaming GraphViewer — Handover v6

**Period covered:** 2026-06-14 (end of v5) → 2026-06-24
**Branch:** `main`
**Latest commit:** `0f78626` (after the A45 init-order fix)
**Latest cache-bust:** `viewer.js?v=342`, `style.css?v=86`

This handover covers everything that landed since the v5 handover — primarily the chat panel becoming a real buddy-communications surface (A43), a colour-coding pass (A44), and a small batch of mobile/UX fixes (A45). The bulk of the work is server- and client-side wiring around a new WebSocket protocol; the rest is CSS and a couple of init-order corrections.

---

## 1. What was already in place at v5

- A42 card-stack chat panel scaffolded: `local` (textarea, head `N=k`), `received` (div, head `C`), `system` (div, head `System`). Single `#chat-stack` container, `createCard` prepends so newest visually on top.
- Default-panel system card with editable Save flow for nav-node text (Root/Entry/Family/Cluster).
- A first-open welcome card hardcoded client-side via `showWelcomeOnce()`.
- No partner messaging — `received` was scaffolded but the WebSocket plumbing was not yet wired.

---

## 2. A43 — Buddy communication channel (the big one)

Spec: `communications.md` at the repo root. The chat panel now serves as a real two-way comms channel between paired buddies.

### 2.1 Slice 1 — Chat presence + server-emitted system cards (commit `1a98e1e`)

- **Server (`server.js`):** new `inChat` map, `howToSent` set, helpers `channelOpen` / `sendSystemCard` / `sendHowToOnce` / `statusTextFor`. Handlers for `enter_chat` and `leave_chat`. On disconnect, "Partner disconnected." is dropped into the buddy's running log before tearing down the pair.
- **Client (`viewer.js`):** `toggleChatMode` emits `{type:'enter_chat'}` on activation and `{type:'leave_chat'}` on deactivation. New `prependSystemCard(text)` renders inbound `{type:'buddy_card', channel:'system', text}` messages. Retired the hardcoded client-side welcome — the how-to text is now server-owned.
- **Status cards accumulate** (running log) — deliberate during dev phase; communications.md §3.2 allows revisiting later if too noisy.

### 2.2 Slices 2–4 — Send button, partner relay, partner-receive (commit `21ad5ae`)

- **Server `buddy_card` handler:** pure pass-through modelled on the existing `breadcrumb` handler. Validates `channelOpen` (both paired AND both in chat). On success forwards to the partner as `{type:'buddy_card', channel:'partner', text}` and sends back `{type:'buddy_card_ack', sendId, deliveredAt: ISO timestamp}`. Absent partner → emits a `Partner not available` system card to the sender and no ack.
- **Send button** in `#chat-right-col`, disabled until pairing is active AND the top local card is visible AND non-empty. Each click generates a monotonic `sendId`, records `pendingSends.set(sendId, card)`, emits `{type:'buddy_card', sendId, text}`. Sent card stays in place — no auto-new-card per spec §6.1.
- **`handleBuddyCardAck`** looks up the originating card by `sendId` and stamps `delivered HH:MM:SS` into the card head via a `.card-delivered` span. Re-sending the same card overwrites the stamp.
- **Partner receive** via `prependPartnerCard(text)` — creates a teal `received` card with head label `N.M` where `N = topLocalCard().serial at receipt time` and `M` increments per-N. The label is frozen at receipt (communications.md §4.1).

### 2.3 Hidden N=0 ghost + chat_ready protocol (commit `6e0c26e`)

Originally the chat panel created a visible `N=1` on chat press, which sat empty at the bottom of the stack while the server's how-to + status cards landed above it — confusing.

The new protocol:
1. On Chat press, `ensureLocalCard` creates a **hidden ghost** `{ kind:'local', hidden:true, serial:0 }`. It gets `.card-hidden` (display:none) — never rendered, but anchors `topLocalCard().serial` to a defined value (0) in the window between Chat press and `chat_ready`.
2. Client sends `enter_chat`. Server emits how-to (gated by `howToSent`), then a status card, then `{type:'chat_ready'}` (one-shot per enter_chat).
3. Client `handleChatReady` is idempotent: if the topmost local is the hidden ghost (or null), create a visible N=1.

Net stack on first open (top → bottom): `[ N=1 ][ status ][ how-to ][ N=0 ghost (display:none) ]`.

Guards: `updateSendBtn` and `sendTopLocalCard` both check `top.hidden` so Send can't enable until N=1 exists.

### 2.4 System-card pinning for A/B symmetry (commit `02905d0`)

Subsequent system messages (e.g. "Partner joined chat") under strict newest-on-top would prepend above N=1, bumping the compose card down. To keep A's and B's layouts structurally identical after pair-up, **system cards dock immediately below the topmost VISIBLE local** via `top.el.after(sys.el)`, using a new `topVisibleLocalCard()` helper. Falls back to natural top-prepend when only the hidden N=0 ghost exists (preserves the chat_ready protocol).

Locals and partner (received) cards keep strict newest-on-top — they are conversation content, not status noise.

### 2.5 Other A43 fixes worth knowing

- **Combined card** (commit `1ebdd67`): two cards ("Partner joined chat." + status refresh) collapsed into one "Partner joined chat — try putting a message above." (text reworded in `0beb6ee`).
- **Shrink-wrap non-editable bodies** (commit `9a9c82f`): system + received card bodies get `min-height: 0` (locals keep the 8.5em writing floor).
- **Refresh Send-state on programmatic writes** (commit `8d85247`): `setCardText` and `appendToCard` now call `updateSendBtn()`. Programmatic `value =` assignment doesn't fire `input`, so without this the Send button stayed disabled until the user typed.

---

## 3. A44 — Colour-coded card heads (commits `d4fd62a` → `82f39f9`)

Heads are now colour-coded to mirror the breadcrumb / title palette:

| Element | Hex | Description |
|---|---|---|
| Local head (+ `#cy-you` breadcrumb) | `#5a5000` | Brighter pure yellow |
| Received head (+ `#cy-buddy` breadcrumb) | `#001f4d` | Dark navy |
| System head | `#2a2a00` | Darker pure yellow (much lower luminance than local) |
| All card bodies | `#000` | Pure black |
| All head text | `#fff` | White |

**The user has reduced colour vision.** Multiple iterations were needed to land on this palette. Hue alone is not enough; pair hue with clear luminance contrast or non-colour cues. Don't rely on subtle hue differences to differentiate UI controls. Concrete example: dark olive `#3d2e00` and dark gold `#3d3500` were perceptually identical.

Default-panel system card unchanged — only the chat-stack system card got the new dark-yellow.

---

## 4. A45 — Miscellaneous UX / mobile (commits `cc0b486` → `0f78626`)

- **Chat button gated on `#dev-code`** (commit `cc0b486`): curator-only access. `#chat-btn` starts `disabled`; an input listener on `#dev-code` toggles based on `value.trim()` non-empty. Mirrors the Save-button pattern. CSS adds `#chat-btn:disabled` dimming and a `:not(:disabled)` qualifier on `#chat-btn:hover`.
- **`#dev-code` font-size 16px** (commit `fd9d68c`): iOS Safari auto-zooms any text input under 16px on focus and doesn't reliably restore the zoom. Was 11px. **All focusable inputs in this project must be ≥ 16px.** Box width bumped 72px → 96px for proportion.
- **`#default-panel` height 17dvh → 34dvh** (commit `4d1b035`): user wanted more room for system messages. `#cy` shrinks accordingly via `positionCyEl`.
- **`#cy` init-order fix** (commit `0f78626`): `cy.fit(root, 120)` was running before `cy.style.top` got pinned to the bottom of `#default-panel`, so cytoscape measured the CSS fallback (`top: 158px`) and centred the root against the wrong rect. Hardly visible at 17dvh; doubling to 34dvh widened the gap and on iPhone the root landed near the bottom. **Fix: pin `cy.style.top` BEFORE `cytoscape({...})` constructs**, and remove the redundant later pin.

---

## 5. Current architecture quick reference

### 5.1 Card model

Three kinds in `#chat-stack`, all created by `createCard({ kind, label?, hidden? })`:

- **`local`** — `<textarea>` body, freely editable. Head label `N=k` (k = `nextLocalSerial`, increments per visible local only). The `hidden:true` ghost takes `serial:0` explicitly and gets `.card-hidden` (display:none).
- **`received`** — non-editable `<div>` body, computed head label `N.M`.
- **`system`** — non-editable `<div>` body, head label `System`, server-emitted only.

### 5.2 Top-card helpers

- `topCard()` — literal last in `cards[]`, any kind. Rarely what you want.
- `topLocalCard()` — most recent local (includes the hidden ghost). Use for chat-side insert destinations and `N.M` labelling.
- `topVisibleLocalCard()` — most recent local that is NOT the hidden ghost. Used by `prependSystemCard` for dock-below placement.

### 5.3 Placement rule (kind-aware)

| Kind | Placement |
|---|---|
| local | strict newest-on-top — `createCard` prepends to `chatStackEl`, no repositioning |
| received | strict newest-on-top — `prependPartnerCard` does NOT reposition |
| system | dock immediately below the topmost VISIBLE local via `top.el.after(sys.el)` in `prependSystemCard`; falls back to natural top-prepend when only the hidden N=0 ghost exists |

This is documented in detail in the `system-card-placement` memory and was deliberately chosen for A/B layout symmetry — don't flip it back without re-reading the rationale.

### 5.4 WebSocket protocol (chat-relevant)

Client → server:
- `{ type: 'enter_chat' }`
- `{ type: 'leave_chat' }`
- `{ type: 'buddy_card', sendId, text }`

Server → client:
- `{ type: 'chat_ready' }` — emitted after the initial how-to + status batch
- `{ type: 'buddy_card', channel: 'system' | 'partner', text }`
- `{ type: 'buddy_card_ack', sendId, deliveredAt }`

The single inbound `buddy_card` rendering path is intentional (communications.md §1).

### 5.5 Layout

```
viewport top
↓
#title-bar              ~25px
#cy-buddy               36px  (partner breadcrumb — dark navy bg)
#cy-you                 36px  (your breadcrumb — yellow bg)
#default-panel          34dvh (when chat not active)
  OR #chat-panel        33dvh (when active)
#cy                     fills the rest, top set dynamically by positionCyEl
#help-bar               34px
↓
viewport bottom
```

`#cy.style.top` is set dynamically by `positionCyEl()` to `getBoundingClientRect().bottom` of whichever panel is showing. **Init-time pin must run before `cytoscape({...})` constructs** (see safety net §7).

---

## 6. Deferred / not started

1. **Per-card Volume slider** in the card header (older A42 phase). Not started.
2. **`bd_` persistence** — needs parser location identification first. Not started.
3. **AI bot fallback** when no human partner (communications.md §5.4). Not started.
4. **Status-card noise review** — currently they accumulate as a running log; communications.md §3.2 contemplates self-replacing if real use proves noisy. Worth revisiting after enough real-use data.

---

## 6.5 Performance knobs (tuning levers — not invariants)

Two levers govern perceived responsiveness. Treat as knobs, not commitments.

### 6.5.1 Click / tap debounce

The single-click → text-display path is gated by a debounce timer that waits to see if a second click arrives (would mean double-click → navigate via `handleNodeTap`). Network is NOT in this path — text lives in `node.data()`, populated at page open. The entire wait IS the debounce.

| Path | Earlier value | Current (commit `2f3fa5f`) |
|---|---|---|
| Desktop click → text | 450 ms | **320 ms** |
| Touch tap → text | 800 ms | **560 ms** |

All 8 sites in `viewer.js` use bare `, 320)` / `, 560)` literals — `grep -E ", (320\|560)\)" viewer.js` enumerates them. To bump: edit globally via `replace_all`; keep them in sync.

If touch double-taps start feeling unreliable (slow taps), bump 560 first. Next snappier step if more is wanted: 280 ms desktop / 480 ms touch.

### 6.5.2 Initial-load size — the lazy-text-fetch ceiling (not yet built)

Currently the page-open WS query is `MATCH (n)-[r]->(m) RETURN n, r, m` ([viewer.js:3118](viewer.js#L3118)) — pulls every node's full properties, including `text`. Cytoscape ingests it all into `node.data()`. All subsequent navigation is a visibility filter; no network involved.

**Why this is fine today:** the graph is curator-authored (low thousands of nodes max for the foreseeable horizon). Initial load is fast, navigation is instant, bot-context display is local.

**Rough scaling thresholds on iPhone Safari:**

| Node count | Initial load | iPhone memory | Verdict |
|---|---|---|---|
| < 1,000 | snappy | trivial | current is ideal |
| 1k–5k | 1–3 s | low single-digit MB | fine; first paint slows |
| 5k–20k | 3–10 s | tens of MB | wait noticeable; tap latency still good |
| 20k+ | 10 s+ | hundreds of MB | risk of Safari eviction on backgrounding |

**Trigger for action:** initial load on iPhone Safari exceeding ~3 seconds. Until then, don't refactor.

**When the trigger hits — the cheapest refactor:**

Separate "identity / structure" (always loaded) from "text" (lazy):

1. **Server:** change the initial query to exclude `n.text` (and any other heavy properties). Add a new `get_node_text` WS message that returns just `{nodeId, text}` for a single node.
2. **Client:** in `routeNodeText`, before `buildTooltipContent` runs, check `node.data('text') === undefined`. If so, fetch via the new message and `node.data('text', fetchedText)`. The cytoscape data store IS the cache — no separate Map needed. All existing reads of `node.data('text')` (in `buildTooltipContent`, bot-context normalisers, Save handler, etc.) keep working unchanged.
3. Sub-200 ms hop on first click of a given node, then nothing on revisit.

**Don't preemptively split.** The current "load it all up front" enables instant double-tap navigation, instant bot-context display, and the simple in-memory mental model. It's load-bearing for the current UX. The day it stops being load-bearing because of network/memory, the above is the cheapest cutover. Permanent storage stays in memgraph regardless — text lives there as `n.text`; the only thing that changes is when the client asks for it.

---

## 7. Safety nets / rules worth keeping

These are the gotchas this period exposed. Future-you / Claude Chat should not re-litigate these without re-reading the rationale.

1. **TDZ destructure ordering** (commit `da6a5e2`): In `init()`, DOM bindings that immediately call helpers destructured from `setupInteractions(...)` must run AFTER the destructure. Hoisting saves function declarations, not `const { … } = …` bindings. A previous iteration broke ALL node clicks (silent ReferenceError aborted `init()` mid-function) because the Send-button block was placed too early.

2. **iOS input auto-zoom** (commit `fd9d68c`): Every focusable input, textarea, or contenteditable in this project must be `font-size: 16px` or larger. iOS Safari auto-zooms below that threshold and doesn't reliably restore. To make a control visually compact, shrink with `width` / `padding` / `transform: scale(...)` — not by lowering `font-size`. Note: cluster-editor spinners and `#clone-name-input` were not audited as part of this work; if those are touched on mobile, check them.

3. **#cy init-order rule** (commit `0f78626`): Pin `#cy.style.top` BEFORE `cytoscape({...})` constructs. The init-time `cy.fit(root, 120)` measures the container's current bounds; a later `cy.style.top = … ; cy.resize()` preserves pan rather than re-fitting, so the root ends up off-centre. The chat-toggle path is fine because `positionCyEl` is followed by an explicit `cy.fit(undefined, 40)` in a `requestAnimationFrame`.

4. **Card-stack placement rule is kind-aware**: locals + partner strict newest-on-top; system docks below the topmost visible local. The user has been through three iterations of this and explicitly settled here — don't unify the rule without asking.

5. **Reduced colour vision**: Don't rely on hue alone to differentiate UI controls. Pair hue with clear luminance contrast or non-colour cues (italic, icons, borders). Compute approximate luminance (`Y = 0.299R + 0.587G + 0.114B`) and aim for noticeable gaps. When the user offers a colour suggestion themselves, trust it over a palette tool.

6. **Programmatic input assignment doesn't fire `input`**: anywhere code does `el.value = …` on a textarea/input that has an `input` listener wired (e.g. for enable-state), the listener won't fire automatically. Manually invoke the dependent updater after the assignment (the `updateSendBtn()` calls in `setCardText` / `appendToCard` are the canonical example).

---

## 8. Where to look first if picking up this work

- `viewer.js` — module-scope state at lines ~30-45 (`cards`, `nextLocalSerial`, etc.); `setSystemText` at ~line 56 (default panel only); `setupInteractions` body lines ~1380-1700 (most chat-stack helpers); `init()` body lines ~3200-3400 (cytoscape construct, button bindings, WS dispatcher).
- `server.js` — chat-relevant handlers around lines 270-310 (`enter_chat`, `leave_chat`, `buddy_card`).
- `communications.md` — full A43 spec, the source of truth for protocol decisions.
- `cards_spec.md` — A42 card model spec.

Memory directory (project + feedback notes) lives outside the repo at `~/.claude/projects/-Users-williamstewart2-butterflydreaming-graphviewer1/memory/` and tracks much of this in machine-readable form; not portable to Claude Chat directly but the relevant content is summarised here.

---

**End of v6.** Successor amendment will pick up from `0f78626`.
