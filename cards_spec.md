# A42 — Card-Stack Chat Panel

**Status:** As-built description, current at viewer.js?v=331 / commit `1e5a56a` on `main`.
**Replaces:** A36–A41b (textarea / CM6 / collect-basket model).
**Purpose of this document:** describe how the card system behaves from the user's point of view and document the framework hooks needed to extend it into a two-way buddy communication channel.

> **2026-07-15 amendment note.** The chat panel is now **always active from page load** and the Chat button was renamed **Join / Leave** (only manages pair state; does NOT toggle chat mode). §1 "The two text panels" below describes the previous default-panel / chat-panel either/or model — the default panel is now always hidden (CSS sibling selector still in place, kept for now to minimise diff). The hidden N=0 ghost described later is no longer created; `handleChatReady` produces the visible N=1 directly from the server's `chat_ready` message. Curation-code arriver-gate + same-device refusal + partner-card N.M labelling all preserved verbatim. Fuller detail in `CHANGELOG.md` 2026-07-15 entry and memory `always-on-chat`.

---

## 1. The two text panels

The viewer has two text panels that share the same screen real-estate:

- **Default panel** (`#default-panel`, ≈17dvh, dark indigo `#1c1a30`) — visible by default. Holds a single editable **system card**. Used as a *system message hub*: clicking a graph node populates this card with that node's text. A Save button to its right writes edited text back to memgraph (gated on a curation code typed in the dev-code box at bottom-left).
- **Chat panel** (`#chat-panel`, ≈33dvh) — hidden until the user presses the **Chat** button (top-right). Replaces the default panel while active. Holds a stack of *cards*: the user composes and curates content here.

Only one is visible at a time. The Chat button toggles between them.

---

## 2. The card stack

The chat panel contains a vertical stack of cards inside `#chat-stack`. New cards are added at the **top** of the stack; older cards push downward. There are three kinds.

### 2.1 Local cards — your composition surface

- Editable `<textarea>` body. Indigo-tinted background, alternating shades between odd/even cards for visual separation.
- Head label: `N=1`, `N=2`, `N=3`, … — a per-local serial that increments each time a local card is created.
- All user composition happens here. Multiple local cards can coexist; the most recent one is the implicit destination for new inserts.

### 2.2 Received cards — messages from your buddy

- Non-editable `<div>` body. Teal-tinted background (`#16242c`). Head: `C` (head also shows `· C` via CSS `::after`).
- Text can be *selected and copied* but not typed into.
- **Currently scaffolded but never created by any code path.** The WebSocket plumbing for `buddy_card` messages is the next phase of work — see §6.

### 2.3 System cards — runtime messages to the user

- Same shape as received: non-editable `<div>` body, copy-selectable. Head label: `System`. Amber-tinted background (`#2c241a`) to distinguish from local-indigo and received-teal.
- Currently used only for a **one-shot welcome card** that appears the first time the user presses Chat in a given page-load. The welcome text reads:

  > Click a node to start the conversation or type your own message. If you select text and copy, it will appear on your next card up. Start a new card if you wish. Send your top card to partner.

- The welcome is idempotent — toggling chat off and on doesn't re-prepend it. The user has to reload the page to see it again.

### 2.4 Visual layout example

After Chat is pressed for the first time:

```
┌──────────── #chat-panel ────────────┐
│  [System]  amber  ← welcome card    │   ← top
│  [N=1]     indigo (editable)        │   ← bottom
└─────────────────────────────────────┘
```

After the user clicks a graph node and the text lands in N=1:

```
┌──────────── #chat-panel ────────────┐
│  [System]  amber                    │   ← top
│  [N=1]     <node text here>         │
└─────────────────────────────────────┘
```

After the user selects some of that text and presses Copy:

```
┌──────────── #chat-panel ────────────┐
│  [N=2]     <selected text>          │   ← top (newly created above System)
│  [System]  amber                    │
│  [N=1]     <node text here>         │
└─────────────────────────────────────┘
```

The welcome card slides down naturally as the conversation grows above it.

---

## 3. User actions

### 3.1 Press Chat

- Toggles `#chat-panel.active`. Hides the default panel via CSS while active.
- **First time per page-load only:** auto-creates `N=1` if the stack is empty, then prepends the system welcome card above it. Subsequent presses are pure show/hide toggles.

### 3.2 Click a graph node

The text-prefix for navigation nodes (Root / Entry / Family / Cluster — the things the user clicks to traverse the graph) is always `Node: <name>\n<body>`. TextNodes (the leaves of the graph) use `title : work : seq\n<body>`.

What happens to this text depends on which panel is active:

- **Default panel active (Chat off):** the system card body is *replaced* with the new text, becomes `contentEditable`, and the Save button to the right can be used to write the edited text back to memgraph (after typing the curation code in the dev-code box).
- **Chat panel active (Chat on):** the text is *appended* to the most recent local card (the "top local card"). The `Node: <name>\n` prefix is stripped on the chat side so it doesn't clutter compositions. If there's no local card yet, one is created automatically.

### 3.3 Type into a local card

Local card bodies are plain textareas. Type anything. The user can also scroll back and edit older local cards — N is about creation order, not focus.

### 3.4 Press the New Card button

Right-hand control column has a **New Card** button. Pressing it creates a fresh empty local card at the top of the stack, scrolls the stack to the top, and focuses the new card's textarea.

### 3.5 Select text and trigger Copy (the main authoring gesture)

The browser's native copy gesture works from any card body — `Cmd+C` on macOS, `Ctrl+C` on Windows/Linux, the selection bubble's Copy option on iOS, right-click → Copy. The viewer hooks the `copy` event but **never calls `e.preventDefault()`**, so the system clipboard still receives the text (paste-outside still works as the user expects).

Side effect of every Copy:

- **Empty selection → no-op.**
- The copied text is *appended* to the top local card (newline-separated). The caret moves to the start of the inserted text.
- **If the source IS the top local card,** a fresh local card is created above it first; the copy lands in the new card. This means selecting from your current card and copying always grows the stack — a natural "draft → committed" rhythm.
- Selecting from a system or received card does *not* grow the stack; the text just appends to your current top local card.

Trailing blank lines on the destination are collapsed to a single `\n` so copies don't grow an ever-expanding blank line at the bottom.

### 3.6 Press Save (default panel, not chat)

Visible only when chat is off and a navigation node's text is in the default panel. Sends the edited body back to memgraph (`MATCH (n) WHERE $label IN labels(n) AND n.name = $name SET n.text = $text`) after a server-side timing-safe check against the `CURATION_CODE` typed into the `#dev-code` box. Nav labels allowed: `Root` / `Entry` / `Family` / `Cluster`. Sub-families are `:Family` with a non-palette name. Settling and Conversations are `:Entry` distinguished by name.

---

## 4. Mechanics relevant for extension

These are the internal hooks an implementer needs to know to add features without breaking the model.

### 4.1 Card data model

Each card object lives in the `cards[]` array (push-ordered by creation), and has a DOM element prepended to `#chat-stack`. Push order vs. DOM order matters:

- `cards[0]` is the oldest, `cards[cards.length-1]` is the newest.
- In the DOM, the newest is at the *top* of the panel (prepended), oldest at the bottom.

### 4.2 Two top-card helpers

- `topCard()` — `cards[cards.length-1]`, the literal newest. Includes system / received cards.
- `topLocalCard()` — scans backward for the most recent `kind: 'local'`. **This is the canonical insert destination** for `setChatText` and `handleCardCopy`. Non-editable kinds never become write targets.

### 4.3 Two serial counters

- `nextCardSerial` — globally unique id (`card_<n>`), incremented for every card regardless of kind.
- `nextLocalSerial` — only locals consume it. Drives the `N=k` head label so user-visible numbering doesn't skip when system or received cards are interleaved.

### 4.4 Card head labels

- Local: `N=<nextLocalSerial>`.
- System: `System`.
- Received: `C` (the body itself displays a buddy-supplied label inside, head shows `C · C` because of an existing CSS `::after`).

### 4.5 Volume (designed, not built)

Every card object carries `volume: 0.85` (used as `style.opacity`). The slider planned for the card head — see [project_a42_card_stack_design.md](memory:project_a42_card_stack_design.md) phase 13 — would write `card.volume` and `el.style.opacity` live. Per-card (not per-span) was chosen so spans don't dissolve under free editing.

### 4.6 Current-copy slot

Two module-scope globals are overwritten on each Copy event:

```js
let currentCopyText  = null;
let currentCopyRange = null;   // { cardId, from, to }
```

They name what was last selected-and-copied, for future per-selection commands (e.g. Send-to-buddy, when the design moves to a selection-driven send instead of a whole-card send).

### 4.7 Routing layer for node clicks

```
graph node click
  → routeNodeText(content, meta)
      ├── chatModeActive=true  →  setChatText(stripped)        →  topLocalCard()
      └── chatModeActive=false →  setSystemText(content, meta) →  default panel
```

`meta = { label, name }` is computed by `navNodeMeta(node)` only for the four navigation labels. TextNodes pass `null` meta (no save target). The Chat-side strip removes a leading `Node: <name>\n` line so compositions stay clean.

---

## 5. Communication with partner — designed, NOT YET BUILT

This is the next phase of work. The user has agreed the design points below; implementation is open.

### 5.1 Send button

- Lives in `#chat-right-col` (next to **New Card**). Always visible while in chat mode.
- Sends the **whole top local card's text** to the paired buddy.
- After a successful send, automatically creates a new empty top local card so the user has a fresh slate. The sent card stays in the stack unchanged.
- Disabled when unpaired or when the top local card is empty.

### 5.2 WebSocket message shape

Client → server:

```json
{
  "type": "buddy_card",
  "text": "<top local card's text>"
}
```

Server-side: route via the existing `sendToBuddy(ws.userId, …)` mechanism (see `server.js` — the `breadcrumb` handler at ~line 225 is the structural template). No persistence, no memgraph involvement.

Server → recipient:

```json
{
  "type": "buddy_card",
  "text": "<text>",
  "from": "<sender's viewer_id or display name>"
}
```

### 5.3 Receiving — N.M numbering

When the recipient receives a `buddy_card`:

- Create a `received` card and prepend it to the recipient's `#chat-stack` (lands above their current top).
- **Numbering convention:** received cards are labelled `N.M` where:
  - `N` = the serial of the top local card at the time of receipt (i.e. `topLocalCard().serial`).
  - `M` = a per-N counter that resets when a new local card is created.
- So if the user has `N=1` and receives three messages in a row, they're labelled `1.1`, `1.2`, `1.3` and sit above `N=1`. If the user then creates `N=2` and another message arrives, it's labelled `2.1`.

Required additions:
- A `receivedCountByN` map on the receiver side (`Map<number, number>`), keyed by local serial.
- `createCard({ kind: 'received', parentN, label })` so head can render `parentN.M`.
- An `updateReceivedHead(card)` helper if labels need re-rendering when a new local is created (probably not — numbers are frozen at receipt time).

### 5.4 Display details for received cards

- Same teal `#16242c` tint they already have.
- Head: `N.M` (replaces the current static `C`). Drop the `· C` CSS `::after` once the head label carries meaning.
- Body: non-editable but selectable. The existing `copy` listener already routes selections from received cards into the user's top local card per §3.5.
- Optional later: a buddy-name display in the head if the pairing model identifies the sender.

### 5.5 Pairing context

Pairing is already implemented (see [pairing memory](memory:project_pairing.md) for behaviour). The pair state and connect/disconnect events are exposed via `pairingState` passed into `setupInteractions`. The Send button should consult it; on disconnect, sent messages should fail visibly.

### 5.6 What's intentionally deferred for the first cut

- **Per-selection Send** (sending only `currentCopyText` from a card-head button per the original design §2.2) — superseded by the whole-card Send + auto-new-card model.
- Source-copied indicator (gold underline over the original selection).
- Buddy-name display in received-card head.

---

## 6. Persistence via `bd_` directives — designed, not started

The eventual save format for a card stack is a concatenation of `bd_` directive blocks, one per card:

```
%%bd_module text_card.html
%%bd_kind   local
%%bd_volume 0.85
%%bd_text [
…body content with original line breaks preserved…
%%bd_]
```

The `bd_` parser/dispatcher location in the repo has not been identified yet. This phase is blocked on locating (or writing) it.

---

## 7. Out of scope for A42

- Per-span volume.
- Reordering cards by drag.
- Deleting cards.
- Multi-card selection / cross-card copy.
- Search across the card stack.

Deferred to future amendments — explicitly *not* blocked by this design.
