# Session notes — 2026-08-28

Short session. The green-button fault from the previous evening resolved, one
real bug found while looking for it, and the GN minting rule generalised.

Canary ended **red** at `viewer.js?v=670`, `style.css?v=350`.

---

## 1. The "no green button" fault — hypothesis wrong, cause probably cache

Handover: `state of work-20:27-270826.md` (now carries the outcome at its head).

My overnight hypothesis was that `jumpToPartner` advanced the BN cursor on every
press while minting only at the head, so the first press would mint and later
ones silently would not. **Wrong.** The instrumented run showed every link
succeeding on both sides — click reaching the head branch, `pushGn` building the
stack, `gn_mark` received and resolved, `updateGnBtn` deciding to show — and the
button appeared.

The likeliest explanation for the original failure is a **stale cached
`viewer.js`**: the successful run followed a hard refresh. That is exactly what
the canary exists to catch, and the lesson is to confirm the canary colour
*before* reporting, not after.

**Method note:** instrumenting cost one round trip and settled in one line what
two rounds of reasoning had got wrong. The second wrong model is the signal.

---

## 2. A real bug found on the way — duplicated resolution

`showBlueNode` fetches a node that post-dates the receiver's graph load (§7.3).
The `gn_mark` handler did a bare `nodeByUrl` and **gave up in silence**.

So for any node newer than the receiver's load, the BLUE mark appeared — fetched
— while the GREEN one did not, on that side only. Exactly the shape of an
intermittent "green on one side" report, and it would have been easy to mistake
for a recurrence.

Both now go through one `resolvePartnerNode`. *The duplication was the fault:
the same question answered in two places, with only one of them having learned
the answer.* Third time in three days that a second copy of something was the
bug — the parallel back stack, the hand-rolled jump dispatch, and now this.

---

## 3. The GN minting rule, generalised — the user's observation

**Tapping your partner's haloed node now mints a GN, exactly as pressing the
Remote button does.**

This makes the rule *simpler*, not more complex. It is no longer "you pressed a
particular control" but **"you deliberately arrived at where your partner is"**.
The halo means they are here, so tapping it IS following them, and the
distinction between doing that on the graph and on the chrome was arbitrary.

Guarded exactly as the button is: their CURRENT position, and only while they
are still present.

**The false positive is accepted deliberately.** You might tap a haloed node
because it is in your path rather than because you noticed the halo. That costs
one of three slots and what it recorded was TRUE; a missed convergence costs the
record itself. The asymmetry favours minting.

**Still covered only by the button:** if THEY come to YOU, no tap happens on
your side, so nothing mints. An argument for keeping the button, not against the
change.

### Orphan BN alert

When your partner's node is not in your view there is no halo to tap, so the
button is the only route — and that extra path is invisible exactly when it is
the only one. The Remote button now flashes for **5 seconds** on arrival, and
also when the view suppresses the halo entirely.

Five pulses at 1s, then it stops and stays put: *an alert that keeps moving
after it has been read is costing attention and battery for nothing.* The cue is
a **spreading ring, not a colour change** — motion and luminance rather than hue.
Under `prefers-reduced-motion` the ring holds steady for the same five seconds
rather than the alert vanishing.

---

## 4. The trap the breadcrumb retirement left

The mint went into `handleNodeTap` first, and never fired. **That function is now
dead:** its only callers were the two breadcrumb chip handlers, and both bars are
retired. The live path is `cy.on('tap','node')`, which calls `markReadNode` and
`advanceOrNavigate` directly.

It reads like the obvious home for anything tap-related and is not. A warning to
that effect now sits at its head, because it is kept whole behind
`BREADCRUMB_BARS` and will keep looking inviting.

---

## Open

| item | note |
|---|---|
| Explore offer/accept/lapse | **Still live and now redundant** — the GN is minted by a click, so the button does a job nothing needs. Most visible inconsistency on screen. Spans client and server. |
| Untested: BN retrace | Pressing Remote repeatedly to walk back through the partner's positions has never been confirmed. |
| Untested: Edit / Player modes | The control panel is new and permanent; the iframe rect moved with the canvas. |
| Untested: phone | 44px buttons, three across, panel width at narrow widths. |
| `GRACE_MS` is 5s | `BD_GRACE_MS=65000` before real use. |
| Root node `#FFD700` | Last undesaturated colour; lives in `buildStyle`, not the stylesheet. |
| `history` cap | None. Each entry stores every visible id. |
| Draft persistence / write gate | Both unbuilt. Brief `CC.7`. |
