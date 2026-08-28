# State of work — 20:27, 27/08/2026

> ## RESOLVED 2026-08-28 — read this first
>
> The test was run and **the green button appeared**. The log showed every link
> succeeding on both sides: the click reached the head branch, `pushGn` built
> the stack, `gn_mark` was received and resolved, and `updateGnBtn` decided to
> show. So §2's hypothesis below was **WRONG** — the cursor was at the head both
> times — and the layout suspects in §4 were never reached.
>
> The most likely explanation for the original failure is a **stale cached
> `viewer.js`**: the successful run followed a hard refresh, which is exactly
> what the canary is for.
>
> **One real fault was found while looking, and is fixed.** `showBlueNode`
> fetches a node that post-dates the receiver's graph load; the `gn_mark`
> handler did a bare `nodeByUrl` and gave up silently. So for any node newer
> than the receiver's load, the BLUE mark appeared and the GREEN one did not, on
> that side alone. Both now share one `resolvePartnerNode`. That would have
> shown up as an intermittent "green on one side only" — worth knowing it is
> gone, since it can no longer be mistaken for a recurrence.
>
> Instrumentation removed. The rest of this file stands as the record.

Handover for tomorrow. One open problem, one leading hypothesis, and one test
that settles it.

**Build:** `viewer.js?v=666`, `style.css?v=347`, canary **red**.
**Last commits:** `2f7c64e` (BN stack) → `c1c517e` (GN instrumentation).
Everything pushed; working tree clean.

---

## 1. THE OPEN PROBLEM

**A deliberate click on the blue (Remote) button does not produce a green
(Common) button.**

Confirmed by the user as *deliberate clicks*, not a misunderstanding of the
design — so this is a real fault, not "green only appears on a BN click".

What IS working: the local (Back) button; the blue button appearing, relabelling
when the partner moves, and jumping when clicked.

---

## 2. LEADING HYPOTHESIS — the cursor leaves the head too early

I think I introduced this a few commits ago, in `jumpToPartner`:

```js
// advance BEFORE navigating
if (bnStack.length > 1) bnCursor = (bnCursor + 1) % bnStack.length;
if (!atHead) { jumpToNode(n); return; }     // <-- no GN minted
pushGn(targetId);                            // <-- only reached at the head
```

A GN is minted **only when the cursor is at the head** (`bnCursor === 0`), which
is correct: following your partner to somewhere they have already left is not a
convergence.

But the cursor **advances on every press**. So:

| press | cursor before | mints a GN? |
|---|---|---|
| 1st (partner has moved ≥2 times) | 0 | yes |
| 2nd | 1 | **no** |
| 3rd | 2 | **no** |

and the cursor only returns to 0 when the **partner moves again**. During a
testing session where the partner is sitting still, every press after the first
silently mints nothing — which matches the report exactly.

### The fix I would apply

Advance the cursor **only when you are already standing on the target**, rather
than on every press:

```js
const here = (lastReadNodeId === targetId && lastReadNodeCy === cy);
if (here && bnStack.length > 1) bnCursor = (bnCursor + 1) % bnStack.length;
```

That still solves the original "gets stuck" complaint — pressing again when you
are already there steps back one — while keeping the cursor at the head for the
ordinary case, so following your partner keeps minting a GN.

**I have deliberately NOT applied this tonight**, so that tomorrow's test runs
against the build the symptom was seen on. If the log confirms the hypothesis it
is a two-line change.

---

## 3. WHAT I NEED YOU TO DO — one test, ~30 seconds

1. **Hard-refresh both browsers.** (`Cmd-Shift-R`. The canary border should be
   **red**; if it is not, the page is cached and nothing below is valid.)
2. Pair them.
3. Put them on **different** nodes, and move the partner **twice** so the stack
   has more than one entry.
4. Wait for the blue button to name your partner's node.
5. **Click the blue button once.**
6. Then click it a **second** time.
7. Tell me it is done — I will read `/private/tmp/bd_server.log` myself.

Do not clear anything or restart the server; the log is what I need.

### What the log will say

Four instrumented points, all prefixed `[gn-debug]`:

| line | meaning if PRESENT | meaning if ABSENT |
|---|---|---|
| `BN click at head — minting GN for …` | the click reached the minting branch | **cursor was not at the head — hypothesis confirmed** |
| `pushGn -> N entries; top = …` | the stack was built | `pushGn` never ran |
| `updateGnBtn: stack=… btn found=… show=…` | the button was asked to render | the renderer never ran |
| `gn_mark RECEIVED url=… resolved=…` | the partner's side got the message | the relay or a whitelist is dropping it |

The most useful single fact is whether line 1 appears on press 1 but not press 2.
That is the hypothesis, exactly.

---

## 4. IF THE HYPOTHESIS IS WRONG — next suspects, in order

1. **Panel clipping.** `#bd-toppanel` has `overflow: hidden`, and the three
   buttons are `max-width: 32%` each — 96% plus two 8px gaps plus 16px padding.
   On a narrow window that exceeds 100%, and **`#gn-btn` is last in the DOM, so
   it is the one cut off**. Would look exactly like "no green button" while the
   other two work. Test by narrowing/widening the window, or temporarily setting
   `overflow: visible`.
2. **The CSS cascade.** The three `#…-btn.visible { display: block }` rules were
   deleted in favour of one combined `display: flex`. It sits later in the file
   and should win, but it is worth confirming in devtools that `#gn-btn` has
   `display: flex` and a non-zero width when `.visible` is on.
3. **`gn_mark` dropped again.** It needs **three** sites — sender, server relay
   whitelist, client RECEIVE whitelist. All three were verified present tonight
   (`grep -n gn_mark viewer.js server.js`), but this failed silently once today
   already and would explain the mark missing on the *other* side only.

---

## 5. CLEANUP OWED once this is settled

- **Remove the four `[gn-debug]` log points** (commit `c1c517e`).
- `GRACE_MS` is **5s for development** — `BD_GRACE_MS=65000` restores it. The
  server warns at boot while it is short.

---

## 6. EVERYTHING ELSE IN FLIGHT

Fuller record in `session_notes_2026-08-27.md` and `corner_controls_plan.md`.

| item | state |
|---|---|
| Breadcrumb bars | Retired behind `BREADCRUMB_BARS = false`. Code kept whole — flip the constant to bring the parallel view back. |
| Control panel (HBP) | Built. 50px deep, permanent across Nodes/Edit/Player, three buttons as flex children. Canvas moved: top = panel bottom, bottom 90 → 37. |
| PN / BN / GN | All three are DOM controls. No parked graph nodes remain. |
| BN stack | Built today, reversing the morning's "live pointer" decision on your symmetry argument. Cursor over a newest-first stack, cap 3. |
| Explore offer/accept/lapse | **Still present and unretired.** Superseded by GN-on-BN-click; spans client and server, so its own commit. |
| Snap dialog | Off, behind `SNAP_DIALOG_ENABLED`. |
| Root node `#FFD700` | Not desaturated — it lives in `viewer.js` `buildStyle`, not the stylesheet. Next candidate. |
| `history` cap | None. Each entry stores every visible id. |
| Draft persistence | Unbuilt. Brief `CC.7` — still the only present-tense risk. |
| The write gate | Unbuilt. Agreement is witnessed, not enforced. |

### Watch-item recorded earlier today

Retiring the remote breadcrumb strip removed the only route to a position your
partner had already left — its chips navigated. **The BN stack built tonight
restores that capability**, which is worth noting: the two decisions turned out
to be connected, and the stack answers the loss.
