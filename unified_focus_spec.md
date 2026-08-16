# Unified Focus Model — spec (v0.1, 2026-08-16)

Status: **reference / pre-implementation.** Describes the target interaction
model where one tap on a node reveals *both* its text and its neighbourhood,
plus the staged Root boot sequence. Migration is staged and flag-gated (see §7).

---

## 1. Core principle

A node is a **unit of `text ⊕ neighbourhood`**. The display already lives in two
non-competing regions, so there is no layout reason to serialise them:

- **Graph region** (cytoscape canvas) — the node and its *view* (one-hop
  neighbourhood, laid out via the hint/preset/fcose path in `runLayout`).
- **Text region** (the card stack) — the node's text as card(s).

**One tap on a node = focus it.** Focusing paints both regions at once. Going
deeper = tapping a neighbour. Reading = scrolling. The gesture that used to
mean "advance my reading / then navigate" is retired everywhere except the
Root boot sequence (§4).

---

## 2. Regions & gesture vocabulary

| Gesture | Region | Meaning |
|---|---|---|
| Tap a node | Graph | **Focus** it — repaint graph neighbourhood + text card(s) |
| Tap a neighbour | Graph | Focus that neighbour (i.e. navigate deeper) |
| Scroll within a card | Text | Read a long node |
| Scroll the card stack | Text | Move across cards |
| Radio: Node/Reading | Text | Show the focused node's **text** |
| Radio: Player/Module | Text | Show the focused node's **player/module** |

Two regions, two gesture vocabularies. The graph owns *focus*; the text region
owns *reading* and *mode*. Neither overloads the other.

---

## 3. The focus action (uniform, non-Root)

On a fresh tap of node **N**:

1. **Text region** — render N's text card(s). (Chunking is effectively
   Root-only, §5, so this is normally a single card.)
2. **Graph region** — expand N's neighbourhood exactly as `navigateInto(N)`
   does today, dispatched by type:
   - `Cluster` → `expandToCluster`
   - `Family` → `expandToFamily`
   - gateway `TextNode` → `handleGatewayClick`
   - section-title `TextNode` → `handleTitlePageTap`
   - else → `expandToNode`
3. **Player** — if N is a module node, the player is **armed**. Default:
   auto-switch the text region to Player. Fallback (if it proves cumbersome):
   do *not* auto-switch; show a small "tap Player to hear this" invite in the
   media/card area. This is a one-line toggle, decided by feel, not now.
4. **Breadcrumb** — push a chip **only when the focus node actually changes**;
   dedupe consecutive repeats so uniform tapping doesn't bloat the trail.

Leaf nodes (no neighbourhood) simply focus with an empty/unchanged graph and a
text card — no special case.

---

## 4. Root boot sequence (the one staged exception)

Root gets a guided, click-advanced intro. This is the *only* place a tap
advances a message rather than changing focus. **The ButterflyDreaming (Root)
node is visible from load and is itself what the user taps to advance** — there
is no separate invisible node; Root hosts messages (0) and (1) as its two
`%%bd_chunk` chunks (resolves D1 + D2).

- **B0 — load.** Graph region shows **only the ButterflyDreaming node** (Settling
  and all else hidden). Text region shows **message (0)**. Its closing line
  invites: *"Tap the ButterflyDreaming node below for its next message to you."*
- **B1 — tap ButterflyDreaming.** Text region advances to **message (1)** (Root
  chunk 1). Graph region reveals the **Settling** node linked to Root. Message
  (1)'s closing line now invites: *"Tap the Settling node to advance."*
- **B2 — tap Settling.** Uniform focus action (§3): text region shows the
  **Settling** message; graph region shows Settling's linkage to **Gateways,
  Conversations, Root**.
- **B3 onward.** Pure uniform model. No more staged messages.

**Message copy (author into Root's `text` as two chunks, split on `%%bd_chunk`):**

> **(0)** Welcome to ButterflyDreaming, a free anonymous experimental social
> media graph that keeps no user data. Intrinsically private and safe, it aims
> to be a conversational tool that integrates well with other media: read, chat,
> write, create art and music.
> *Tap the ButterflyDreaming node below for its next message to you.*

> **(1)** Welcome to ButterflyDreaming, a free anonymous experimental social
> media graph that keeps no user data. Intrinsically private and safe, it aims
> to be a conversational tool that integrates well with other media: read, chat,
> write, create art and music.
> *Tap the Settling node to advance.*

(The welcome body repeats across (0) and (1); only the closing call-to-action
changes. Trimming (1)'s repeated body to a short continuation is an easy later
tweak — copy is not load-bearing.)

The existing `parentIsRoot` special case in `runLayout` (fixed nav-layer
layout) remains the layout for "focus === Root". Note B0 shows Root **alone**
(Settling hidden until B1), which is a slightly more staged start than today's
root splash (Root + Settling together) — the boot machine owns this.

---

## 5. Chunking & reading

Chunking (`%%bd_chunk`) is used **only on Root** (for the boot sequence).
Everywhere else, a node renders as one card and long text is handled by
**scrolling within the card and scrolling the card stack** — not by tap-advance.
`splitNodeChunks` / `insertNodeChunkAsCard` stay, but the per-tap advance loop
in `advanceOrNavigate` is exercised only by the Root boot machine.

---

## 6. Current behaviour being replaced (as traced 2026-08-16)

`advanceOrNavigate(node)` in `viewer.js` today:

- **Fresh node** (`readingState.nodeId !== nid`) → add breadcrumb chip, split
  chunks, show chunk 0. **Graph is NOT expanded.**
- **Same node, chunks remaining** → advance to next chunk.
- **Same node, past last chunk + `hasDescendants`** → `navigateInto(node)`
  (this is where the graph finally expands).
- **Same node, past last chunk, no descendants** → silent no-op.

So the graph expand is gated behind tapping through every chunk. The unified
model moves the expand onto the **fresh tap**, alongside the text render, and
retires the past-last navigation for non-Root nodes.

---

## 7. Migration plan (cautious, staged, flag-gated)

Flag: `UNIFIED_FOCUS` (default **off** initially). Each step is independently
shippable and reversible.

1. **Trace & spec** — ✅ done (this document + §6).
2. **Flag scaffold.** — ✅ done. `UNIFIED_FOCUS` now reads the URL param `?uf=1`
   (default off). Opt-in per visit so the model can be felt end-to-end without
   changing the default experience.
3. **Uniform focus path.** — ✅ done. In `advanceOrNavigate`, when `?uf=1` and
   the node is **not** Root: fresh tap renders the text card **and** calls
   `navigateInto(node)`; re-tapping the focused node is a no-op. Legacy path
   intact when the flag is off.
4. **Root boot.** — ✅ core done (ships for ALL users, not flag-gated, because
   Root already has its two `%%bd_chunk` messages and its only neighbour is
   Settling): B0 = Root alone + message (0) (existing `primeRootReading` +
   boot-time `root.show()`); tap Root → message (1) and, on reaching the last
   chunk, `navigateInto(Root)` reveals Settling (`parentIsRoot` nav layout);
   tap Settling → normal focus shows Gateways/Conversations/Root. Message (1)'s
   existing onboarding body was kept; only its closing hint changed to "Tap the
   Settling node to advance".
5. **Player arming.** Wire the auto-switch-to-player default with the
   invite-note fallback as a sub-flag, so we can flip it by feel.
6. **Breadcrumb dedupe.** Push on focus-change only; dedupe repeats.
7. **Bake-in.** — ✅ done. `UNIFIED_FOCUS` now defaults ON for everyone; escape
   hatch `?uf=0` falls back to the legacy behaviour. The legacy path is kept in
   `advanceOrNavigate` for now (reachable via `?uf=0`); remove it in a later
   pass once the one-tap model has proven out, preserving the Root-boot use.

Each step: verify on desktop + iPhone before the next. No step removes the old
path until step 7.

---

## 8. Open decisions

- **D1** — ✅ RESOLVED. Messages (0)/(1) are Root's two `%%bd_chunk` chunks (§4).
- **D2** — ✅ RESOLVED. No virtual node: Root is visible from B0 and hosts both
  messages; Settling is revealed at B1 (§4).
- **D2a** — ✅ RESOLVED. Message (1)'s closing CTA changes from "Tap the
  ButterflyDreaming node…" to **"Tap the Settling node to advance."**
- **D3** — ⏸ DEFERRED. Do **not** change player auto-engage now; leave current
  behaviour, revisit later. Migration step 5 is deferred (§7).
- **D4** — ✅ RESOLVED. Every tap commits: **1 click = 1 breadcrumb** (with
  dedupe so re-tapping the already-focused node adds nothing).
