# A42 — Card-Stack Chat Panel

**Status:** Design spec, agreed 2026-06-21. Implementation not yet started.
**Replaces:** A36–A41b (textarea / CM6 / collect-basket model).
**Supersedes:** the CodeMirror 6 editor (`codemirror-bundle.js`, `cm6-entry.js`).
**Motivation:** cross-OS reliability (especially iOS), and a richer authoring surface that maps onto the same media-item plane as other `bd_` directive-driven modules.

---

## 1. Concepts

### 1.1 Card

A **card** is the unit of authored text in the chat panel. Each card has:

| Property | Description |
|---|---|
| `kind` | `local` (authored by the current user) or `received` (sent by buddy) |
| `volume` | A number in `[0, 1]`. The card's overall opacity. Default `0.85`. |
| `text`  | The card body — freely editable for `local`, read-only for `received`. |
| `id`    | A stable identifier, used for persistence and selection routing. |

Cards stack **vertically** inside `#chat-panel`. Order is fixed by creation time; the highest-numbered (newest) card sits at the top.

### 1.2 Top card

At any moment the panel has one **top card** — the highest-numbered existing card. Almost every action that mutates the stack writes here.

### 1.3 Current copy slot

Two module-scope globals act as a single "what was last copied" slot:

```js
let currentCopyText  = null;
let currentCopyRange = null;   // { cardId, from, to }
```

Any Copy from any card overwrites them. They are the implicit subject of *Send to buddy*, *Volume*, and any future per-selection command.

---

## 2. Visual Layout

```
┌──────────── #chat-panel ────────────┐
│  card C+1  (received, tinted A)     │   ← top
│  card N+3  (local, alt-tint B)      │
│  card N+2  (local, alt-tint A)      │
│  card N+1  (local, alt-tint B)      │
│  card N    (local, alt-tint A)      │   ← bottom
└─────────────────────────────────────┘
```

- Local cards alternate two tints (`A`, `B`) via `nth-child` on `.card.local` to make boundaries unambiguous without horizontal rules.
- Received cards override the alternation with a distinctive tint (suggestion: a faint blue/teal) and carry a `C` badge in their header.
- Each card has a header showing `label · Vol [slider]` and a body.

### 2.1 DOM sketch

```html
<div id="chat-panel">
  <!-- top of stack first -->
  <div class="card received" data-card-id="…" style="opacity:.85">
    <div class="card-head">C · from <buddy-name></div>
    <div class="card-body" contenteditable="false">…</div>
  </div>

  <div class="card local" data-card-id="…" style="opacity:.85">
    <div class="card-head">
      N+3 · <input type="range" class="vol-slider" min="0" max="1" step="0.05" value="0.85">
    </div>
    <textarea class="card-body">…freely editable…</textarea>
  </div>

  <!-- … older cards … -->
</div>
```

### 2.2 Card head controls

| Element | Behaviour |
|---|---|
| Label (`N+k` or `C`) | Display-only. |
| Volume slider | Live updates `style.opacity` and `cards[i].volume`. Persists on change. |
| Send-to-buddy button | Visible only on the card containing `currentCopyRange`. Sends `currentCopyText`. |

---

## 3. Copy Semantics

### 3.1 Leverage the OS-native copy gesture

Each card body has a `copy` event listener. The browser dispatches `copy` from:

- **iOS** — selection bubble → "Copy"
- **macOS** — Cmd+C, right-click → Copy
- **Windows / Linux** — Ctrl+C, right-click → Copy

The native clipboard is **not** preempted — `e.preventDefault()` is never called — so the user can paste outside the viewer (Notes, iMessage, email, …) as a free side-effect.

### 3.2 Handler logic

```js
function handleCardCopy(e, cardEl) {
  const cardId = cardEl.dataset.cardId;
  const body   = cardEl.querySelector('.card-body');

  // Read selection consistently from textarea and contenteditable.
  let from, to, text;
  if (body.tagName === 'TEXTAREA') {
    from = body.selectionStart;
    to   = body.selectionEnd;
    text = body.value.slice(from, to);
  } else {
    const sel = window.getSelection();
    text = sel.toString();
    // ranges in contenteditable map to chars via a helper (see §7)
    ({ from, to } = rangeWithinCard(body, sel));
  }

  if (!text) return;                          // empty selection — no-op

  currentCopyText  = text;
  currentCopyRange = { cardId, from, to };

  const dest = destinationCard(cardEl);       // §3.3
  appendToCard(dest, text);                   // §3.4
  markSourceCopied(body, from, to);           // §3.5 (optional, gold underline)
}
```

### 3.3 Destination rule

```js
function destinationCard(sourceEl) {
  const top = topCard();
  if (sourceEl === top) {
    // Source is already the top — grow the stack.
    return createCard({ kind: 'local' });
  }
  return top;
}
```

### 3.4 Append rule

- Body content has its trailing blank lines collapsed to a single `\n`
  (`current.replace(/\n{2,}$/, '\n')`).
- A single `\n` separator is inserted, then the copied text.
- For textareas, the caret moves to the start of the inserted text so it
  is visible without explicit scroll wrangling. (Textarea scroll-to-caret
  is automatic in most browsers; if not, set `body.scrollTop` to
  approximately `caretLine × lineHeight − panel.height / 2`.)

### 3.5 Source-copied indicator (optional, v1 skippable)

A gold underline span over the source range, mirroring the existing
`cm-collected` style. In a textarea this is faked by overlaying a
positioned `<div>` with the same text + a yellow background-clip — non-
trivial; defer. In a contenteditable it is trivial. Recommend deferring
until cards become contenteditable.

---

## 4. Volume

- Slider in the card head, `0 ≤ v ≤ 1`, step `0.05`.
- Sets `cards[i].volume` and the card element's `style.opacity` live.
- Persisted on `change` (debounced if cheap; immediate is fine for now).
- Does **not** affect the source range — only the card as a whole.

Rationale for per-card (not per-span): under free editing, span boundaries dissolve as soon as the user types in the middle. Per-card is stable across edits.

---

## 5. Send to Buddy

A button appears in the head of the card containing `currentCopyRange`. Pressing it sends:

```json
{
  "type":   "buddy_card",
  "text":   "<currentCopyText>",
  "source": { "kind": "local|received", "label": "N+3", "buddy": "<name>" }
}
```

Receiver behaviour:

- A **new** received card is created at the top of the receiver's stack
  with the incoming text. One sent message = one received card; no
  batching.
- The receiver's destination rule is unchanged: a copy *from* this
  received card auto-creates a fresh **local** card above it. The unified
  top pointer keeps both kinds in one ordered stack.

---

## 6. Persistence via `bd_` directives

Each card serialises to a directive block:

```
%%bd_module text_card.html
%%bd_kind local
%%bd_volume 0.85
%%bd_text [
…body content with original line breaks preserved…
%%bd_]
```

A stack of N cards is a concatenation of N such blocks in order (bottom-up or top-down — pick one and stay consistent; recommendation: **bottom-up**, matching `cards[]` array order).

**Parser/dispatcher location:** not yet identified. Action item before phase 4 begins: locate where existing `bd_module visual_module.html`-style directives are parsed and rendered, so cards can plug into the same path.

---

## 7. Helpers

### 7.1 `rangeWithinCard(bodyEl, selection)`

For contenteditable bodies, compute the character offsets of a DOM
`Selection` relative to the card's plain-text content. Standard recipe:

```js
function rangeWithinCard(bodyEl, sel) {
  const range = sel.getRangeAt(0);
  const pre   = range.cloneRange();
  pre.selectNodeContents(bodyEl);
  pre.setEnd(range.startContainer, range.startOffset);
  const from = pre.toString().length;
  const to   = from + range.toString().length;
  return { from, to };
}
```

For textarea bodies the helper isn't needed — `selectionStart`/`End` give
the offsets directly.

### 7.2 `topCard()` / `createCard()` / `appendToCard()`

Thin wrappers around the `cards[]` array and DOM. Implementation
straightforward; spec omits.

---

## 8. Out of Scope for A42

- Per-span volume.
- Reordering cards by drag.
- Deleting cards.
- Multi-card selection / cross-card copy.
- Search across the card stack.

These are deferred to future amendments and explicitly **not** blocked
by this design.

---

## 9. Migration Steps (for the implementer)

1. Delete `cm6-entry.js`, `codemirror-bundle.js`.
2. Remove the dynamic `import('./codemirror-bundle.js?v=…')` and the
   surrounding try/catch from `viewer.js`.
3. Remove from `index.html`: the basket buttons
   (`#chat-collect-btn`, `#chat-basket-count`, `#chat-basket-show`,
   `#chat-basket-clear`), the `+` checkbox (`#chat-append-cb`), and the
   `#chat-editor-mount` div.
4. Replace `#chat-panel`'s contents with an empty container ready to
   accept card children.
5. Implement `cards[]`, `topCard`, `createCard`, `appendToCard`,
   `handleCardCopy`, and the Volume slider handler.
6. Hook node-click → "Copy" path: a single-click on a graph node in chat
   mode currently calls `setChatText(buildTooltipContent(node))`.
   Replace with `appendToCard(topCard(), buildTooltipContent(node))`.
   First click on an empty panel auto-creates card 1.
7. Wire `bd_` save/load once the parser location is known.
8. Wire Send-to-buddy WebSocket plumbing.

`type="module"` on the viewer.js script tag **stays**.

---

## 10. Open Items Before Coding Phase 4

- Locate the `bd_` directive parser and renderer in the repo (or confirm
  it does not yet exist and must be written).
- Confirm "bottom-up vs top-down" persistence ordering.
- Confirm whether the source-copied indicator (§3.5) is wanted in v1.
