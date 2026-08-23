# A4x — Paired-Discussion Convergence Node (`convergence_node.md`)

**Status:** Design / exploration. Not yet built. **Not for Claude Code yet — prototype first.**
**Relates to:** `communications.md` (paired channel, anonymity, bot), `bot_context.md` (bot context), and the graph schema below.
**Purpose:** define what a *saved* paired discussion becomes in the graph, and the protocol for attaching it to the two seed nodes the two users arrived from.

---

## 1. Current graph schema (the precedent this builds on)

> Full detail in **`bd_graph_schema.md`** (authoritative, code-verified at commit `58332c3`). Summary below.

**Node labels:** `Root`, `Entry`, `Family` (SubFamilies also `:Family`, identified by having a Family parent via `DESCENDS_FROM`), `Cluster`, `TextNode`. The six Families are Nature, Emotion, Reason, Spirit, **Symbolic**, Arts. Gateways (`gateway: true`, `seq: -1`) and title pages (`section_title: true`) are `TextNode`s distinguished by property.

**Edge types (all six that exist):**
| Edge | Direction | Key properties | Purpose |
|---|---|---|---|
| `CONTAINS` | Root→Entry | none | top-level entry |
| `DESCENDS_FROM` | Conversations→Family→SubFamily→Cluster | `weight` (colour blend); `hint_x`/`hint_y`/`hint_scale` (layout) | navigation hierarchy + layout hints |
| `CHILD` | TextNode→TextNode | `source` | linear reading chain |
| `PART_OF` | TextNode→title page | none | navigation (snake view) |
| `CONTAINS_CLUSTER` | Gateway→Cluster | `count` | navigation (invisible edge) |
| `CLUSTER_REL` | TextNode→Cluster | sparse semantic floats | semantic tagging |

**Precedent for the convergence node:** different *kinds* of relationship get their own edge type — navigation (`DESCENDS_FROM`, `CONTAINS_CLUSTER`), semantic (`CLUSTER_REL`), sequence (`CHILD`). A user-generated convergence link should likewise be its own edge type.

> **Coordinate hints ARE implemented** — `hint_x`/`hint_y`/`hint_scale` live on `DESCENDS_FROM`, with force/preset/hybrid layout-mode selection in the viewer. **But** they are wired specifically to `DESCENDS_FROM`. A convergence node on a *different* edge type (`DIALOGUE_REL`, §3) would **not** automatically inherit that machinery — see §5 for the implication.

## 2. What a saved paired discussion is

**[DESIGN — to confirm by prototype]** When a paired discussion is saved, it becomes a **convergence node**: a single new node descending from **two** parent seed nodes — the node User 1 entered from (A) and the node User 2 entered from (B).

```
      A (User 1's seed)        B (User 2's seed)
          \                       /
           \                     /
            ▼                   ▼
          ( Dialogue convergence node )
```

This is the natural realisation of the multi-parent idea — a node descending from two parents — now arising at runtime from two users rather than from curation. The per-parent coordinate-frame machinery (`hint_x`/`hint_y`/`hint_scale`) is real and live, but currently bound to `DESCENDS_FROM` edges (§5).

**Open (Q1):** is the saved artifact *one shared text* (one node, two parent edges) or *a pair of texts* (two nodes, or one node holding both)? This doc assumes **one shared convergence node** as the baseline; the pair-of-texts variant is a prototype branch.

---

## 3. Proposed label and edge type

**[DESIGN]** Give convergence nodes their **own label** — proposal `:Dialogue` — for the same reason `TextNode` is distinct: so viewer layout, bot retrieval, moderation, and visibility rules can treat user-generated convergence content as its own category without contaminating the curated layers.

**[DESIGN]** Connect each parent to the convergence node with a **distinct edge type** — proposal `DIALOGUE_REL` — rather than reusing `DESCENDS_FROM`. Rationale: these are *emergent, user-generated* links, not *curated descents*. Mirroring how `TextNode` uses `CLUSTR_REL` rather than `DESCENDS_FROM` keeps "curated structure" and "emergent structure" cleanly separable in queries and layout.

Resulting shape: `(A)-[:DIALOGUE_REL]->(d:Dialogue)` and `(B)-[:DIALOGUE_REL]->(d:Dialogue)`.

**Note (layout):** coordinate hints (`hint_x`/`hint_y`/`hint_scale`) exist and work, but the viewer's layout-mode selection reads them off `DESCENDS_FROM` edges. A `DIALOGUE_REL` edge would need the same three properties **and** the viewer's hint-scanning extended to recognise `DIALOGUE_REL`, or convergence nodes reuse `DESCENDS_FROM` (giving up the curated-vs-emergent separation). This is a real design fork — see §5.

---

## 4. The save / attachment protocol (the crux)

**[DESIGN — the part to prototype]** The hard constraint is **mutual anonymity** (from `communications.md` §2): nothing identifying crosses the wire, and neither user should learn the other's seed node. Yet the saved node must attach to *both* seeds. Resolution: **the server is the only party that knows both parents**, and it performs the attachment.

Each client already entered chat *from* a node, so the server can associate each in-chat client with its seed node at `enter_chat` time (server-side only — never sent to the partner). On save:

1. Each client sends a save intent referencing **its own** seed node (which the server already holds) and the agreed text. Neither client sends or receives the other's seed.
2. The server creates one `:Dialogue` node with the shared text.
3. The server writes **both** `DIALOGUE_REL` edges — `A→d` and `B→d` — from the two seeds it privately holds.
4. Neither client learns the other's parent; each only knows "the discussion was saved, attached to my seed (and my partner's, whatever it was)."

**Open (Q2) — joint vs unilateral save.** Does saving require **both** users to consent (a two-party handshake), or can one user save unilaterally? Options:
- *Joint:* both must press Save; server attaches both parents only when both intents arrive. If only one saves, nothing persists (or a timeout cancels). Protects against one party persisting a shared conversation the other considers private.
- *Unilateral:* either save creates the node, but then — with only one seed known from that client — does it attach one parent or both? Since the server knows both seeds regardless, it *could* attach both on a single save, but that means one user persists shared content (and a link from the other's seed) without the other's consent.

Recommendation to test: **joint save** (both consent), as the safer default for an intimate, anonymous context. Confirm by prototype.

---

## 5. Where these nodes live (keeping the curated layer clean)

**[DESIGN]** `:Dialogue` nodes must **not** pollute the curated navigation/text layers. Questions to settle by experiment:

- **Colour:** Cluster/SubFamily colours are viewer-computed by HSL blend of parent `DESCENDS_FROM` `weight`s and Family colours. A `:Dialogue` node with two parents in different Families has no defined blend rule yet — decide whether it inherits a blend of both parents' colours (honest grey if they conflict, per the existing magnitude-near-zero rule) or gets its own distinct treatment.
- **Visibility scoping:** are saved dialogues private to their participants, visible to future visitors of A or B, or globally browsable? This is a product/values decision, not just technical.
- **Volume / lifecycle:** over time the graph could fill with `:Dialogue` nodes. Need a policy — expiry, curator moderation/promotion, or capped visibility — so emergent content doesn't overwhelm curated content.
- **Rendering:** a `:Dialogue` node has two parents in possibly *different families* (e.g. A under Emotion, B under Reason). Coordinate hints exist (`hint_x`/`hint_y`/`hint_scale` on `DESCENDS_FROM`), but the viewer scans **`DESCENDS_FROM`** for hint coverage when choosing force/preset/hybrid mode. **Design fork:** either (a) reuse `DESCENDS_FROM` for convergence edges so hints work for free, sacrificing the curated/emergent label separation; or (b) use a distinct `DIALOGUE_REL` and extend the viewer's hint-scan + replay to include it. Prototype both; (b) is cleaner long-term but needs viewer changes.

---

## 6. The bot's role here (distinct from the absent-partner role)

**[DESIGN]** In `communications.md` §5.4 the bot was the **substitute** when no human partner is present. Here a second, different role appears: the bot as **facilitator of two present humans** — helping the pair converge on the shared text they will save (proposing a synthesis, summarising where they agree, offering the merged text as a save candidate).

**Open (Q3):** is the bot in this feature the facilitator, the absent-partner substitute, or both context-dependent? If facilitator, its output is a *proposed convergence text* the humans accept/edit before saving — a new bot behaviour worth specifying separately once the save protocol is settled.

---

## 7. Prototype plan (before any Claude Code handoff)

The practical questions only surface by trying it. Suggested experiments, smallest first:

1. **Manual two-parent write.** In Memgraph, hand-create a `:Dialogue` node and two `DIALOGUE_REL` edges from two seeds in *different* families. Confirm the write, then confirm the viewer can load and render it from each parent's side. This tests the topology before any protocol.
2. **Render-from-either-side.** Check how the two-parent node behaves from A's view and B's view. Test whether reusing `DESCENDS_FROM` lets the existing hint machinery position it (cheap), versus a `DIALOGUE_REL` that the viewer's hint-scan doesn't yet recognise (needs viewer work).
3. **Save handshake (paper first).** Sketch the joint-save message flow over the existing WebSocket, preserving anonymity (server holds both seeds; clients send only their own intent). Validate the anonymity invariant on paper before coding.
4. **Then** decide one-text vs pair-of-texts (Q1) based on what the rendering and conversation actually feel like.

---

## 8. Open questions (consolidated)

- **Q1** — Saved artifact: one shared convergence node, or a pair of texts? (baseline: one node)
- **Q2** — Save consent: joint (both press Save) or unilateral? (recommend: joint)
- **Q3** — Bot role: facilitator of two humans, absent-partner substitute, or both?
- **Q4** — Visibility scoping of `:Dialogue` nodes: private / parent-local / global?
- **Q5** — Lifecycle: expiry, moderation, or curator promotion to keep curated content dominant?
- **Q6** — Label/edge names: `:Dialogue` / `DIALOGUE_REL` acceptable, or other?

---

**Status: exploration spec. Prototype the two-parent write (§7.1) before committing the protocol or handing to Claude Code.**
