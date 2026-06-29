# ButterflyDreaming — Chat Panel Card System

**Snapshot date:** 2026-06-28
**Latest commit covered:** `489ff9f` on `main`
**Latest viewer / style:** `viewer.js?v=349`, `style.css?v=85`
**Scope:** the chat panel and its card stack — model, layout, lifecycle, protocol. Self-contained: read this and the protocol below describe everything you need to reason about chat-panel behaviour without the codebase open.

For full project history see the v6 handover (`ButterflyDreaming_GraphViewer_Handover_v6_2026-06-24.md`). For the design rationale see `cards_spec.md` (card model) and `communications.md` (buddy channel).

---

## 1. What the chat panel is

A vertically-stacked container (`#chat-stack`) that appears in the upper portion of the viewport when the user presses **Chat** (a button gated by the `#dev-code` being non-empty — curator-only). It is the user's workspace for paired conversation with a buddy: compose, send, receive, plus a running status log from the server.

Coexists with the **default panel** (`#default-panel`) which sits above the graph canvas and shows system-level node-text edits when chat is not active. The default panel is hidden via CSS while `#chat-panel.active`. Only one of the two is visible at any time.

---

## 2. Card model — three kinds (plus one hidden ghost)

Every visible element in the stack is a **card**. Cards are produced by `createCard({ kind, label?, hidden? })`. Three kinds:

| Kind | Body | Editable? | Head | Colour | Stored property `text` |
|---|---|---|---|---|---|
| `local` | `<textarea>` | yes | `N=k` (k = visible serial) | head yellow `#5a5000`, body pure black | what the user has typed |
| `received` | `<div>` | no (selectable) | `N.M` (computed at receipt) | head navy `#001f4d`, body pure black | partner's message text |
| `system` | `<div>` | no (selectable) | `System` | head dim yellow `#2a2a00`, body pure black | server-emitted message text |

All head text is white. Card bodies share `font-size: 16px` (deliberate — prevents iOS auto-zoom on focus).

### 2.1 The hidden N=0 ghost

`createCard({ kind: 'local', hidden: true })` produces a special card with `serial: 0` and the CSS class `.card-hidden` (`display: none`). It exists in the DOM and in the `cards[]` array but is never visually rendered. Its sole purpose: anchor `topLocalCard().serial` to a defined value in the brief window between Chat press and the server's `chat_ready` signal. See §6 for the lifecycle.

`topLocalCard()` includes the ghost; `topVisibleLocalCard()` skips it. `updateSendBtn` and `sendTopLocalCard` both guard `top.hidden` so Send stays disabled until a visible local exists.

---

## 3. Counters

- `nextCardSerial` — unique DOM/data id across all kinds (`card_<n>`).
- `nextLocalSerial` — drives the visible `N=k` head label. Only `'local'` kind cards increment it, and only when `hidden` is false. The ghost takes `serial: 0` explicitly; the next visible local is `N=1`.

---

## 4. Three top-card helpers

- `topCard()` — literal last element in `cards[]` regardless of kind. Rarely what you want.
- `topLocalCard()` — most recent local (includes the hidden ghost). Use for chat-side insert destinations (`setChatText`, `handleCardCopy`) and for partner-card `N.M` labelling.
- `topVisibleLocalCard()` — most recent local that is NOT the hidden ghost. Used by the system-card placement rule (§5) to dock new system cards below the user's compose area.

Call sites that should ignore the ghost — Send-button gating, `sendTopLocalCard` — check `top.hidden` explicitly.

---

## 5. Placement rule — kind-aware

`createCard` always does `chatStackEl.prepend(el)`, so newest goes to the visual top of the stack by default. After that:

| Kind | Placement |
|---|---|
| `local` | strict newest-on-top — no further repositioning |
| `received` (partner) | strict newest-on-top — `prependPartnerCard` does NOT reposition |
| `system` | docked **immediately below the topmost visible local** via `top.el.after(sys.el)` in `prependSystemCard`. Falls back to natural top-prepend when only the hidden N=0 ghost exists (initial batch, before `chat_ready` lands and N=1 is created) |

This produces a stack shape that's symmetric between user A (first to press Chat) and user B (second to press Chat) after they pair: in both cases `[ N=k ][ newest sys ][ … ][ oldest sys ][ how-to ][ N=0 hidden ]` reading top → bottom. A's stack just accumulates more status cards over time; the user's compose card always stays pinned at the top.

**Do not change `prependPartnerCard` to also dock below the top local without explicit user request.** This was tried, then reversed: partner messages are conversation content, not status noise, and the user prefers them strict newest-on-top.

---

## 6. Chat-presence protocol (server ↔ client)

### 6.1 The handshake

When the user presses **Chat** in the client:

1. Client `toggleChatMode` calls `ensureLocalCard()` which creates the hidden N=0 ghost if no local exists.
2. Client emits `{ type: 'enter_chat' }` over the existing WebSocket.
3. Server tracks `inChat[userId] = true`. Then emits to this client, in order:
   - **how-to system card** (gated by `howToSent[userId]` — once per session)
   - **status system card** — content depends on whether the buddy is also in chat (`statusTextFor(userId)`):
     - both in chat → `"You're chatting — try putting a message above."`
     - solo → `"Partner not available — please wait."`
   - **`{ type: 'chat_ready' }`** — one-shot signal that the initial batch is done
4. If the buddy is already in chat, server emits *to the buddy* one extra system card: `"Partner joined chat — try putting a message above."` (intentionally collapsed from the earlier two-card sequence "Partner joined chat." + status refresh).
5. Client receives the system cards via the inbound `buddy_card` handler (§7); `prependSystemCard` renders each one. Until N=1 exists they prepend naturally to the top of the stack.
6. Client receives `chat_ready` and runs `handleChatReady()` which is **idempotent**: if the topmost local is the hidden ghost (or null), create a visible N=1; otherwise no-op. N=1 prepends to the now-top of the stack.

Net visible stack on first open (top → bottom):
```
N=1                ← visible, user composes here
status             ← e.g. "Partner not available — please wait."
how-to             ← the welcome instructions
N=0 ghost          ← display: none
```

### 6.2 Status accumulation

Subsequent presence events (partner joins / leaves / disconnects, this user toggles Chat off and on) each emit a fresh system card. They accumulate as a running log. This is **deliberate during the development phase** (per `communications.md` §3.2) — explicitly chosen so a long-running session shows a visible record of what happened. If real-use feedback proves it noisy, a later amendment can switch to self-replacing status cards.

### 6.3 Why the N=0 ghost exists at all

So `topLocalCard().serial` has a defined value (0) in the brief window between Chat press and `chat_ready`. The partner-card N.M labelling rule (§9) needs that. In practice partner messages can't physically arrive in that window because the WebSocket channel is only "open" when both clients are in chat — but having the ghost makes the labelling rule total instead of partial, so a race condition can't produce undefined behaviour.

---

## 7. Inbound `buddy_card` — unified rendering path

All inbound rendering goes through one WebSocket message type with a `channel` discriminator:

```json
{ "type": "buddy_card", "channel": "system" | "partner", "text": "…" }
```

- `channel: 'system'` → `prependSystemCard(text)` (amber-ish, docked below top visible local)
- `channel: 'partner'` → `prependPartnerCard(text)` (navy, strict newest-on-top)

Per `communications.md` §1: "one inbound path, one rendering rule." This collapses what would otherwise be two parallel inbound handlers into one. Future card kinds (e.g. AI bot messages) can land on the same path by adding a channel value.

---

## 8. Send → ack → delivered stamp

### 8.1 Send button

Lives in `#chat-right-col`. Disabled state combines three conditions:
- `pairingState.active` is true (both users are paired)
- `topLocalCard()` is not the hidden ghost
- The top local's textarea has non-empty trimmed text

When the user types into the top local, the textarea's `input` event fires `updateSendBtn` which re-evaluates the three conditions. Programmatic writes (copy-paste, node-click inserts) do not fire `input`, so `setCardText` and `appendToCard` both call `updateSendBtn()` at their tail — without this, the button would stay disabled until the user pressed Return.

### 8.2 Send click

Generates a client-monotonic `sendId` (e.g. `send_1`, `send_2`, …), records `pendingSends.set(sendId, card)`, and emits:

```json
{ "type": "buddy_card", "sendId": "send_42", "text": "…whole card text…" }
```

**Sent card stays in place.** No auto-new-card. The user explicitly chose this — `communications.md` §6.1. If they want a new compose surface they press the **New Card** button next to Send.

### 8.3 Server relay

The server `buddy_card` handler is a pure pass-through, structurally cloned from the existing `breadcrumb` relay. It:
1. Validates `channelOpen(senderId)` (paired AND both in chat). If not → emits a `"Partner not available — please wait."` system card back to the sender, no relay, no ack.
2. Forwards to the partner as `{ "type": "buddy_card", "channel": "partner", "text": "…" }`.
3. On successful relay, sends back to the sender:
   ```json
   { "type": "buddy_card_ack", "sendId": "send_42", "deliveredAt": "2026-06-28T14:30:00Z" }
   ```

No persistence. The server stores nothing about the message.

### 8.4 Delivered stamp

When the client receives `buddy_card_ack`, `handleBuddyCardAck` looks up the originating card via `pendingSends.get(sendId)`, then stamps `delivered HH:MM:SS` into the card head via a `.card-delivered` span. Re-sending the same card overwrites the stamp with the new server timestamp. If the partner is absent (server emits the unavailable system card instead of relaying), no ack arrives — the sender's card never gets stamped, which is the visible signal that delivery failed.

---

## 9. Partner receive — N.M numbering

When the client receives `{ type: 'buddy_card', channel: 'partner', text: '…' }`:

1. `prependPartnerCard(text)` reads `parentN = topLocalCard().serial` at receipt time. (This is why the ghost matters — even before N=1 exists, parentN has a defined value 0.)
2. `receivedCountByN.get(parentN) || 0` + 1 → the new `M`.
3. `receivedCountByN.set(parentN, M)`.
4. `createCard({ kind: 'received', label: parentN + '.' + M })` — the head displays e.g. `1.3`.

**The label is frozen at receipt.** If the user later creates `N=2` via the New Card button, partner messages received after that point will be labelled `2.M` (M counts independently per N). The `1.M` cards already in the stack keep their labels — they're not re-numbered.

---

## 10. Bot-context display fork (curator-only)

This is the `[ … ]` ↔ `%%bd_ai_read [ … %%bd_]` mechanism for nav-node text editing (Root / Entry / Family / Cluster). Lives in the default panel's Save flow, not the chat panel, but worth noting because it shares the `#dev-code` gating signal.

- Curator types bracket content `[ bot-only context ]` in the editable node body.
- On Save, the client runs `normalizeBotBlocks(text)` which replaces each `[ X ]` with `%%bd_ai_read [X%%bd_]` and the directive form is what's persisted to Memgraph.
- On re-render of a nav node, the client checks `#dev-code` presence:
  - **Curator view** (code present) → `unnormalizeBotBlocks(content)` shows the brackets back, editable.
  - **Ordinary user view** (code absent) → `stripBotBlocks(content)` removes the directives entirely.
- A future `bdbot` reads raw stored text from Memgraph directly, bypassing this layer.

Round-trip contract: content between `[` and `]` is placed **verbatim** between `%%bd_ai_read [` and `%%bd_]`. No whitespace added or stripped. Known limitation: bracket content containing literal `[`, `]`, or `%%bd_]` is not supported — won't round-trip cleanly. Unlikely in curator prose; documented.

---

## 11. OS-native Copy is the primary input

Each card body has a `copy` listener. The listener does **not** call `e.preventDefault()` — the system clipboard still receives the text. Side effect: copied text is also appended to `topLocalCard()`.

- If the source IS the top local card → `createCard({ kind: 'local' })` first (new local above the current top), then append.
- Otherwise → append to the existing top local, or create one if it doesn't exist.
- No `focus()` on the destination — focusing the textarea pops the iOS keyboard on every node click, which is intolerable.

---

## 12. Node-click routing

Six tap sites (buddyCy / youCy / main cy, each touch + desktop) all go through `routeNodeText(content, meta)` inside `setupInteractions`:

- **Chat active** → `setChatText` (append to `topLocalCard()`; leading `Node: <name>\n` prefix stripped to keep it out of the user's composition)
- **Chat inactive** → `setSystemText` in the default panel (replaces body, makes it `contentEditable`, Save button targets it)

Tap timing uses a **deferred** pattern: single tap doesn't fire `routeNodeText` immediately — it schedules a setTimeout that fires after a debounce window. A second tap within the window cancels the timeout and runs `handleNodeTap(node)` for navigation instead. Net effect: single tap → text shows after debounce; double tap → navigate, no text.

Debounce values (currently set, easy to tune):
- **Desktop click → text:** 320 ms
- **Touch tap → text:** 560 ms

Applied identically to main cy nodes, cy-buddy chips, cy-you chips (eight timer sites in total, all kept in sync). If double-clicks/taps start being missed, raise the values; if text feels laggy, lower them — but the 220/460 cut tried earlier was too aggressive and dropped doubles.

---

## 13. Default panel coexistence

`#default-panel` (height `34dvh` after being doubled from `17dvh` on 2026-06-23 to give system messages more room) sits above the graph canvas. Shows the system card whose editable Save-target drives nav-node text edits.

`#chat-panel.active ~ #default-panel { display: none; }` — when chat is active the default panel is hidden, freeing the screen for the chat stack.

`#cy` (the graph canvas) is `position: fixed` with `top` set dynamically to the bottom of whichever panel is showing (chat or default) via `positionCyEl()`. Its `bottom: 34px` floats it above the help bar at the very bottom. **The initial pin must run BEFORE cytoscape constructs** — otherwise `cy.fit(root, 120)` measures the CSS fallback rect and the root lands off-centre. This bit you on iPhone once.

---

## 14. Performance knobs

Two levers govern perceived responsiveness:

### 14.1 Debounce values (above, §12). Currently 320 ms desktop / 560 ms touch.

### 14.2 Lazy node-text fetch (not built; ceiling defined)

The page-open WebSocket query pulls every node's full properties including `text`. Cytoscape ingests it all into `node.data()`. All subsequent navigation is a visibility filter — no network involved. This is **fine today** (curator-authored graph, low thousands of nodes) and **load-bearing for the UX** (instant double-tap navigation, instant bot-context display).

Threshold for action: initial load on iPhone Safari exceeding ~3 seconds. When that fires, the cheapest refactor is to:
1. Server: exclude `n.text` from the initial query; add a new `get_node_text` WS message that returns one node's text.
2. Client: in `routeNodeText`, before `buildTooltipContent`, check `node.data('text') === undefined`. If so, fetch via the new message and `node.data('text', fetchedText)`. The cytoscape data store IS the cache — no separate Map needed. All existing readers of `node.data('text')` (including the bot-context normalisers) keep working unchanged.

Don't preemptively split. Text always lives in Memgraph as `n.text` regardless; the change is only about when the client asks for it.

---

## 15. Where things live in viewer.js (rough map)

- Module scope (top of file ~lines 30–45): `chatModeActive`, `cards`, `nextCardSerial`, `nextLocalSerial`, `chatStackEl`, `defaultStackEl`, `currentCopyText`, `currentCopyRange`.
- `setSystemText` (~line 56) — default-panel only. Has the `meta` branch (editable Save-target for nav nodes) with the bot-context display fork.
- Inside `setupInteractions` (~lines 1380–1700): `topCard`, `topLocalCard`, `topVisibleLocalCard`, `createCard`, `handleCardCopy`, `setCardText`, `appendToCard`, `setChatText`, `prependSystemCard`, `prependPartnerCard`, `ensureLocalCard`, `handleChatReady`, `setSendBtn`, `updateSendBtn`, `sendTopLocalCard`, `handleBuddyCardAck`, `routeNodeText`, `navNodeMeta`, `buildTooltipContent`.
- `init()` body (~lines 3230–3340): `toggleChatMode`, the **New Card** button click handler, the **Send** button binding (MUST run after the `setupInteractions` destructure or a TDZ error breaks `init()` mid-function — silently disables every later listener).
- `init()` WebSocket onmessage (~lines 3380–3395): inbound `buddy_card`, `buddy_card_ack`, `chat_ready` handlers.

---

## 16. Open / deferred work

1. **Per-card Volume slider** in the card head — older A42 design item. Not started.
2. **`bd_` persistence beyond `bd_ai_read`** — other directives planned (e.g. `bd_module`, `bd_volume`, `bd_score`). Parser location TBD.
3. **AI bot fallback** when no human partner is available — `communications.md` §5.4. Designed, not started. Bot would arrive on the same `buddy_card` inbound path, just with a `channel: 'bot'` discriminator.
4. **Status-card noise review** — they accumulate as a running log today. Revisit only if real use proves it noisy (`communications.md` §3.2 contemplates switching to self-replacing).

---

## 17. Safety nets / rules that exist for a reason

Treat these as invariants until explicitly revisited:

1. **System cards dock below the top visible local; partner cards stay strict newest-on-top.** Tried unification both ways; this asymmetry is intentional (compose card stays pinned; conversation content stays in arrival order).
2. **`prependSystemCard` falls back to natural top-prepend when only the hidden ghost exists.** Required so the chat_ready protocol works: initial system cards land on top until `handleChatReady` creates N=1, which then prepends above them.
3. **All focusable inputs must be `font-size: 16px` or larger.** iOS Safari auto-zooms below that threshold and doesn't reliably restore.
4. **Pin `#cy.style.top` BEFORE `cytoscape({...})` constructs.** Otherwise the initial `cy.fit(root, ...)` measures the CSS fallback rect and the root lands off-centre — especially visible on iPhone after `#default-panel` was doubled.
5. **`cy.fit(eles, padding)` second arg is in absolute pixels.** Always pass the `fitPadding(cy, maxPad)` helper, which scales the padding to a fraction of the smaller canvas dim with a floor and a cap. Otherwise small canvases get crushed.
6. **Programmatic `value =` assignment doesn't fire `input`.** Anywhere code mutates a textarea/input that has an `input`-listener-driven enable state, manually invoke the dependent updater after the assignment (the `updateSendBtn()` calls in `setCardText` / `appendToCard` are the canonical example).
7. **In `init()`, DOM bindings that immediately call helpers destructured from `setupInteractions(...)` must run AFTER the destructure.** Hoisting saves function declarations, not `const { … } = …` bindings. A previous iteration broke ALL node clicks because the Send-button binding sat too early.
8. **The user has reduced colour vision.** Never rely on hue alone to differentiate UI controls; pair with luminance contrast or non-colour cues. When the user offers a colour suggestion themselves, trust it.

---

*ButterflyDreaming — Chat Panel Card System reference, written 2026-06-28 against `viewer.js?v=349` at commit `489ff9f`.*
