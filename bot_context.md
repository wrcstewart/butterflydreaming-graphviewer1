# A4x — Bot Context Authoring (`bot_context.md`)

**Status:** Design, not yet built. **Not yet handed to Claude Code.**
**Relates to:** the forthcoming `bdbot` local-AI feature; the nav-node Save flow in `cards_spec.md` §3.6 and the v6 handover; the `bd_` directive grammar in `project_a42_card_stack_design.md`.
**Scope of this document:** how curator-authored, bot-only context is attached to nav nodes (Root / Entry / Family / Cluster), stored, and shown. It covers **authoring and storage only**. How the bot *assembles* this context at conversation time (graph traversal vs. semantic / vector retrieval) is deliberately **out of scope** here and will be designed after the Memgraph RAG / semantic-graph research.

> **[SPEC]** = agreed behaviour. **[BUILD INSTRUCTION]** = directive for Claude Code to locate the relevant code and wire in, when this is eventually handed over.

---

## 1. Purpose

The curator (William) already edits each nav node's user-facing `text` via the default-panel Save flow. This feature lets the curator attach **additional text intended only for `bdbot`** — context that deepens the bot's understanding of a node but is never shown to ordinary users.

The guiding principle: **author once, in the same field, edited in the same flow.** The bot-context lives inside the node's existing `text` property, not in a separate store, so it cannot drift out of sync with the human text. (Same rationale as "coordinates belong on edges" — put the data where it cannot desynchronise.)

---

## 2. Authoring gesture

**[SPEC]** The curator marks bot-only text by enclosing it in **square brackets** `[ … ]` anywhere within a node's text. The brackets alone are the signal — **no label, prefix, or keyword** is typed inside. Example as authored:

```
Patience

The capacity to remain steady while things unfold in their own time.

[sits under Emotion; the user is usually wrestling with a concrete waiting
situation, not seeking a definition]
```

Everything **outside** the brackets is user-facing. Everything **inside** is bot-only.

### 2.1 Reserved-character tradeoff

**[SPEC]** Square brackets become **reserved** in nav-node text: any `[ … ]` is treated as a bot block. This is the accepted price of a one-character marker. For the short personal-growth descriptions in this graph it is not expected to collide with legitimate bracket use.

**[SPEC, deferred escape hatch]** If literal brackets are ever needed in user-facing text, a later refinement can restrict the trigger (e.g. only a block at the start of a line, or only a single trailing block) so inline mid-sentence brackets are left alone. Not built now.

---

## 3. Storage — canonical `%%bd_ai_read` form

**[SPEC]** The bracket form is an **authoring convenience only**; it is never the stored form. On **Save**, the viewer normalises each `[ … ]` block into the canonical `bd_` directive before the text is written to Memgraph:

```
%%bd_ai_read [
…bracketed content, line breaks preserved…
%%bd_]
```

So the stored `text` property contains the human text plus zero or more `%%bd_ai_read` blocks. The bare `[ … ]` form is never persisted.

**[BUILD INSTRUCTION]** The normalisation runs viewer-side in the Save path (where the edited body is read before the `edit_node_text` WebSocket message is sent — `cards_spec.md` §3.6). `server.js` stores and serves the `text` verbatim; it does **not** parse or transform `bd_` directives. This keeps the server a dumb store-and-forward, consistent with the relay design.

---

## 4. Three consumers, three views of one field

**[SPEC]** The single stored `text` field is read differently by three consumers. This separation is the core of the design.

| Consumer | Sees | Mechanism |
|---|---|---|
| **Ordinary user** (no curation code) | human text only; bot blocks stripped | display-time strip |
| **Curator** (valid code in `#dev-code`) | human text + bot blocks shown as friendly `[ … ]`, editable | display-time un-normalisation |
| **bdbot** | raw stored text including `%%bd_ai_read` blocks | reads straight from Memgraph, ignores the display layer entirely |

### 4.1 The display fork is gated by the dev-code box

**[SPEC]** When a nav node's text is rendered into the default-panel system card, the view depends on whether a valid curation code is present in `#dev-code` **at render time**:

- **Code present → curator view.** Each stored `%%bd_ai_read [ … %%bd_]` block is un-normalised back to `[ … ]` and shown inline, editable. On the next Save it normalises back to `%%bd_ai_read` (§3). This closes the round-trip: `[ … ]` authored → `%%bd_` stored → `[ … ]` shown back → edited → `%%bd_` stored again. The curator only ever sees and types the bracket form; the verbose directive is never in their face.
- **Code absent → user view.** Every `%%bd_ai_read [ … %%bd_]` block is stripped entirely; only human-facing text renders.

Both branches are the **same parse** of the same blocks — differing only in whether the captured group is kept-and-bracketed or dropped.

### 4.2 bdbot ignores the code box

**[SPEC]** The bot never consults `#dev-code`. It reads the raw stored `text` (with `%%bd_ai_read` intact) directly from Memgraph when assembling context. The code box governs **only** the human display fork (curator vs ordinary user), never the bot.

### 4.3 Known behaviour — render-time evaluation

**[SPEC]** The view is decided by the code box's state **when the node is clicked / rendered**, not retroactively. In the normal curation workflow the curator enters the code first, then clicks nodes — so they get the curator view. If the code is entered *after* a node is already rendered, that card does not retroactively reveal its bot blocks until re-rendered (re-click the node).

**[SPEC, optional]** A listener that re-renders the current card on code entry could remove this wrinkle, but is **not** required for the first cut. Documented as expected behaviour, not a bug.

---

## 5. Authoring guidance — semantic vs conversational (curator's note)

**[SPEC, advisory]** Two kinds of content could go in a bot block, and keeping them distinct keeps the bot's job clean:

- **Semantic enrichment** — what the concept additionally encompasses, its nuances, neighbouring ideas. *This is the primary intended use.*
- **Conversational direction** — how to steer a chat about it.

Recommendation: keep bot blocks mostly **semantic**, and handle global conversational style **once** in bdbot's system prompt rather than repeating it per node. Not enforced by code — an authoring convention.

### 5.1 Write fragments that compose

**[SPEC, advisory]** Because the bot's eventual understanding of a Cluster will come from **assembling** blocks down a branch (Family → Cluster → topic nodes — exact retrieval method TBD, §6), each node's bot block is best written as a **composable fragment** that assumes its parents' context, rather than a self-contained essay that repeats what the parent already says. This avoids redundancy when blocks are concatenated. (Advisory only; does not affect storage or display.)

---

## 6. Out of scope — retrieval / assembly (the other half)

**Explicitly not designed in this document.** How bdbot turns these per-node blocks into the context for a given conversation is a separate, larger design, pending research into Memgraph's RAG / semantic-graph / vector capabilities. The open question to resolve there:

- **Traversal** — when the topic is a known node, walk `DESCENDS_FROM` / `CLUSTR_REL` edges to gather the family above and topic nodes below, concatenate their `%%bd_ai_read` blocks. Deterministic, cheap, uses existing structure. Likely sufficient for a curated, modestly-sized graph.
- **Semantic / vector retrieval (RAG)** — embed node texts so the bot can find the relevant region of the graph from free-form user input ("which node is this about?"), then traverse. A richer phase-two enhancement.

The per-node authoring in this document is the **foundation both approaches rest on**, which is why it is worth building first regardless of which retrieval path is chosen.

---

## 7. Build order (when eventually handed to Claude Code)

1. **Save-path normalisation** (§3): `[ … ]` → `%%bd_ai_read [ … %%bd_]` before the `edit_node_text` message is sent.
2. **Display fork** (§4.1): on nav-node render, branch on `#dev-code` — curator view (un-normalise to `[ … ]`, editable) vs user view (strip).
3. *(Later, separate doc)* Bot context-assembly / retrieval (§6).

Steps 1–2 are a contained change to the existing default-panel Save/render flow and can be built and tested with no bot present — authoring and curator round-trip stand on their own.

---

**Status: design captured, NOT yet handed to Claude Code. Retrieval half (§6) awaits Memgraph research.**
