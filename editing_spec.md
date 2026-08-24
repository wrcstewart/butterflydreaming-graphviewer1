# Collaborative editing — Explore sessions

**Spec v0.1, 2026-08-23/24.** Designed with the user across this session.
Decided items are marked **DECIDED**; anything else is open and should not be
built on without asking.

Companion to `blue_node_spec.md`, whose marker machinery this reuses almost
entirely.

---

## 1. What this is

A way for two paired users to agree they are working on the same node, then
wander the graph gathering material while staying anchored to it.

It is **not** the save mechanism. Agreeing to explore commits nothing to the
database. The save is a separate, heavier act with its own vocabulary — see §7.

---

## 2. The trigger — DECIDED

The offer becomes available when **both users are on the same node**: the Snap,
where the white (local) and blue (partner) marks coincide.

That condition is already computed in `renderMarks` as an emergent property of
two independent marks, so nothing new is needed to detect it, and it decomposes
by itself the moment either user navigates away.

---

## 3. Button states — DECIDED

One control on the action bar. A button says what pressing it **does**; state
belongs in the status strip, not on the control. This follows the existing
pairing button, which reads `Join` then `Leave` and never "Paired".

| state | initiator | partner |
|---|---|---|
| available (Snap holds, no offer) | `Explore` | `Explore` (dim) |
| offered | `Cancel` | `Accept` |
| active (both in) | `Leave` | `Leave` |

`Cancel` and `End`/`Leave` are deliberately different words: withdrawing an
offer nobody accepted is not the same act as leaving a session you are both in.

**Colour must not carry the state alone** — the label changes with it. Colour
progression red → amber → green is a second channel, not the only one.

---

## 4. Attention — DECIDED

- On offer: pulse **~3.4s** (the Blue Node's cadence, already judged right),
  then a **heartbeat repeat every 20 seconds**. Reading and deciding takes
  longer than noticing.
- **Decay:** heartbeat for the first minute or two, then stay lit but stop
  moving. An offer unanswered for five minutes has become wallpaper, and the
  movement is then costing attention and battery for nothing.
- Flashing stops immediately on accept or cancel.

---

## 5. The green mark — DECIDED

**Green is the existing marker recoloured, not a new element and not a copy of
the node.** A duplicate would need its own id, and two elements carrying one
`url` is exactly the class of bug the stable-id work removed. Tapping the real
node to return is also honest in a way tapping a copy is not.

This means `renderMarks` gains a mode and everything else already works:
reveal-at-a-corner, re-assert after every navigation, stand down when the node
is on screen, dim when the partner leaves.

**ONE green ring, not two.** The two-ring vocabulary means "two independent
marks that happen to coincide". A single ring says "one shared commitment", and
the difference reads without a legend. It also leaves the ring-order channel
free for later use.

**Three marks are live during exploration:**

| mark | meaning | corner when off-screen |
|---|---|---|
| green | the node you agreed to work on | **top-left** |
| blue | where your partner is now | **bottom-right** (unchanged) |
| white | where you are now | n/a — always on screen |

Green and blue can be off-screen at the same time, which is why they need
opposite corners rather than sharing one.

---

## 6. Leaving — DECIDED

**Unilateral, and framed as leaving your own participation rather than ending a
shared thing.**

Pressing `Leave` drops **your** green mark. Your partner's does **not** vanish
— it **dims**, exactly as the Blue Node dims when a partner disconnects
(`bnGone`). They remain anchored to the node they were working on and simply
know they are there alone. They leave when ready.

Nothing is taken from anyone, and no negotiation is needed.

**Rejected: propose-to-end** (press End, partner confirms). It sounds like the
courteous option and is the one that bites — if the partner has backgrounded
their tab, walked away, or been discarded by iOS, you are stuck in a session
you cannot leave. It needs a timeout, and the timeout falls back to unilateral,
so it is unilateral with extra steps and a worse failure mode.

**Rejected: shared-state undo window** (both see "ending in 5s — Keep"). Honest
and symmetric, but more machinery and a delay on every exit, for a problem the
framing above dissolves.

**The principle:** the exploratory state should be cheap to enter and cheap to
leave. The weight belongs on the save, which is the irreversible act. If
leaving needs a negotiation, people hesitate to start.

---

## 7. What acceptance means — DECIDED

Accepting an Explore offer means: *we are both working on this node, and I may
wander the graph to gather material.*

It is **not** acceptance of a save. That confusion is a labelling problem and is
resolved by keeping the two vocabularies apart:

| | words | weight |
|---|---|---|
| exploratory | `Explore` / `Accept` / `Cancel` / `Leave` | light, reversible, writes nothing |
| the write | `Propose save` / `Confirm save` | heavy, irreversible, names what will be written |

They must not share a control or a word, or someone will press Save from muscle
memory built on Explore. The save pair should also *look* heavier — different
placement, and the confirm should state what is about to be written.

`Join` is unavailable: the pairing button already owns it.

---

## 8. The dialog on acceptance — DECIDED in substance

> You are working together on **&lt;node title&gt;**. Use the panel to edit —
> explore the graph to find useful text to weave in. Press the green halo node
> to return at any time.

Exact wording to be settled at build time.

---

## 9. Editing — DECIDED

**There is no shared buffer.** Each user edits their own card and sends it
across, integrating what arrives using the existing tools — `{?}` tentative
marking, `{?✓}` accept, SR dictation, the card stack.

"Working together" here means shared *attention*, not a shared cursor. A
genuinely shared buffer would need relayed edits, conflict handling and
turn-taking, none of which exists; the ceremony does the real work without it.

---

## 10. Open — decide before or during build

- **Anchors should not vanish.** The Blue Node is suppressed at
  Root/Settling/Gateways/Conversations. If green inherits that, the way back
  disappears exactly when the user is deepest in the graph. Either exempt
  green, or add a Return affordance on the action bar so the anchor is not only
  spatial.
- **Offer into a dead tab.** iOS discards backgrounded tabs routinely. The
  server knows whether the partner's socket is live; an offer to a client that
  is not there should be refused up front rather than flashed at nobody.
- **Disconnect mid-session.** Pairing has a 65s grace period. Does an Explore
  session survive a reconnect within it? Probably yes, since it is a shared
  commitment, but it needs stating.
- **Snap breaks during an offer.** The offer's premise is "we are both here".
  Recommend the offer is voided explicitly, with a message, rather than
  silently.

---

## 11. Two things this depends on that are not built

- **Draft persistence** (`BD_Viewer_Scaling_Brief.md` §CC.7). `buddy_card` has
  no server persistence, so a weave in progress lives only in two browsers and
  a backgrounded iOS tab loses it. That was a nuisance before; after a ceremony
  that says "you are working together on this", it breaks a promise the
  interface has just made.
- **The write gate.** The generic query channel runs arbitrary Cypher with no
  guard, so agreement enforced only in the UI is *witnessed*, not *enforced* —
  the same distinction that made the export-button gating theatre. Does not
  block prototyping this, but when the save lands it should be a dedicated
  server handler that checks both parties consented.
