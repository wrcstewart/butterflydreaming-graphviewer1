# Collaborative editing — Explore sessions

> ## v0.2 — 2026-08-27 — SUPERSEDES §2–§9 BELOW
>
> The design changed after building slices A–C and living with them. **§1 and
> §10–§11 still stand; §2–§9 describe a negotiation that is being removed.**
> Work plan: `corner_controls_plan.md`.
>
> ### What changed, and why
>
> **The marks become DOM controls, not graph nodes.** A cytoscape node has ONE
> position, so a mark cannot be both in the graph and in a corner — and the
> corner is needed precisely because a Blue Node jump can land you where the
> predecessor has *no structural path* to you. There is no edge to draw, so the
> node must be presented some other way.
>
> Making them DOM resolves that contradiction and removes, at a stroke, every
> problem of the two days spent on parked marks: edges stretching across the
> screen, the `cy.fit` feedback loop that walked the marks several graph-widths
> away, parking geometry, and layouts re-positioning them. They were UI
> pretending to be graph elements. A control also gains a **label**, which a
> halo cannot have — and the label is what you actually need to decide whether
> to go back.
>
> **Each corner is the top of a stack**, not a single mark. Only the top is
> drawn; clicking navigates and the next one surfaces.
>
> | corner | stack | records |
> |---|---|---|
> | top-left | GN, green | nodes reached by FOLLOWING your partner |
> | top-right | PN, faint amber | every local predecessor |
> | bottom-right | BN, blue | the partner's position NOW — **not a stack** |
>
> **Amended 2026-08-27.** The bottom-right corner is a live pointer, not a
> history: you are deliberately given no way to scan back through your partner's
> browsing, because that would realign local too far into remote. The GN stack
> is where following is recorded — and it holds the BNs local actually CLICKED,
> which is a record of your own choices rather than of their wanderings. That is
> also why the GN cycles rather than pops.
>
> **The in-graph halo stays** where the node is structurally present. The corner
> control is additional, not instead — which is only possible because it is no
> longer the node itself.
>
> ### AMENDED 2026-08-28 — TWO routes, one rule
>
> A GN is minted by **tapping your partner's haloed node** as well as by pressing
> the Remote control. The rule is therefore not "you pressed a particular
> control" but **"you deliberately arrived at where your partner is"** — the halo
> means they are here, so tapping it IS following them, and the distinction
> between doing that on the graph and on the chrome was arbitrary.
>
> Both routes are guarded identically: their CURRENT position, and only while
> they are still present. Both send `gn_mark`, so the record lands on both sides.
>
> The false positive — tapping a haloed node because it is in your path rather
> than because you noticed the halo — is accepted: it costs one of three slots
> and what it recorded was true, whereas a missed convergence costs the record.
>
> **Still covered only by the control:** if THEY come to YOU, no tap happens on
> your side. An argument for keeping the control, not against the change.
>
> When their node is NOT in your view there is no halo to tap, so the control is
> the only route — and it flashes for 5s to say so.
>
> ### The GN is created by a BN CLICK, not by coincidence
>
> This is what deletes the negotiation. A snap alone records nothing; only the
> deliberate act of following your partner does. No offer, no accept, no lapse,
> no dwell threshold, and no reconnect question — the machinery in §3–§7 exists
> to manage a negotiation that no longer happens.
>
> It is also symmetric for free: when you jump to your partner, your marker
> lands on their screen on the node they are already standing on, so both sides
> can record the same moment with no protocol at all.
>
> **`Accept` is therefore released to mean SAVING and nothing else** — which
> resolves the terminology problem of §7 far better than keeping two consent
> vocabularies apart.
>
> ### Stack semantics
>
> - **PN pops** — a back button, and a consumed entry is correct.
> - **GN cycles** — it is a *record*; visiting a snap must not destroy it.
> - **Dedup**: revisiting moves the existing entry to the top.
> - **Cap** each stack; 3 is a reasonable start.
> - **Click navigates TO the node**, rather than restoring a stored view: a
>   stored view references state that has moved on.
>
> ### Open, deliberately not decided
>
> - **Retiring the breadcrumb bars.** The strips cost ~46px permanently and
>   three buttons carry labels the chips cannot fit. But the bars' irreplaceable
>   property is the PARALLEL view — "Nature → Emotion → Loss" at a glance, which
>   a stack of one cannot say. Decide after living with the controls.
> - **Colour signalling node TYPE rather than content.** Designer feedback is
>   that the scheme is overbearing. Try DESATURATING `FAMILY_COLOURS` first — it
>   is one place, everything derives from it, and it is reversible. Re-purposing
>   the channel costs the sense of territory that makes the graph wanderable,
>   and shape already carries type.
>
> ### Retained from v0.1
>
> §1 (what this is), §10 (open items), §11 (dependencies: draft persistence and
> the write gate). Slice A's Snap detection is kept unchanged — the new model
> still needs it.

---


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
