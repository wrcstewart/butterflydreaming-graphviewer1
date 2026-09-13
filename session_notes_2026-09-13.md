# Session notes — 2026-09-13

JSP shipped for Kolam in both directions, then a long pass over what a
deep-link arrival actually does. Ended at **`viewer.js?v=823`**, canary
**blue**.

Reference: `DeepLinking.md` (START HERE summary at the top).

---

## 1. JSP — "just send parameters" — built for Kolam

`?j=<tag>v<ver>.<uuid>.<pairs>~<score>`, each pair a two-char key plus a
percent-encoded value.

| Link | Before | Now |
|---|---|---|
| BD → Kolam (Jump / Copy Link to) | 650 | **237** |
| Kolam → BD (Copy BD Link / Enter) | 633 | **219** |
| BD self-link (Copy Link) | 667 | **218** |

Short keys rather than a positional array, at a cost of 24 chars. A positional
array fails **silently**: if the two copies of the order diverge, every value
after the divergence is mis-assigned — symmetry becomes depth — with nothing to
alert the reader. With keys, order carries no meaning; an unknown key is
ignored, a missing key falls back to its default.

`module_wire_tables.js` is the single authoring source **and now holds the
codec**, copied to each standalone by `sync_module_tables.sh`. A copy rather
than a runtime fetch: the standalones must keep working when this machine is
off, which is the whole point of a self-contained link.

Three safety valves, each verified: prose in the card, a directive absent from
the wire table, and an unknown wire version all fall back or refuse **loudly**
rather than losing a value.

**Decided and recorded:** data stays in the URL; no JSON (`?data=` already IS
base64 JSON, and it is the 686-char form being replaced); no cloud store (only
an intermediary — if a dependency is acceptable the honest version is BD's own
server, and then links die when the laptop sleeps).

## 2. Deep-link arrival — what it actually did

Three faults, none of them where they appeared to be.

**The breadcrumb seed has been dead since 2026-08-27.** `addYouChip` returns
immediately when `BREADCRUMB_BARS` is false, which it now is. The arrival's
`addYouChip(root); addYouChip(target)` only publishes position to a partner. It
looked like the thing that built the trail; it has not been for weeks.

**The arrival pushed nothing onto the back-stack** — no `saveState` anywhere in
that flow — so Root was never a step and Back could only reach the boot landing
view. Fixed with `jumpToNode(root)` before `enterNode(target)`: it marks,
dispatches by type and saves state but creates **no card**, which is exactly
right. An arriving visitor sees the node they were sent to, not the panel
history of a visit they never made; Root's card appears only if they go there.

**Root's opening belonged to the wrong thing.** A visitor who pressed Local
straight away got the dev notice and speech offer; one who read a few nodes
first got neither, because `restoreState` restores the view only. Now
`rootIntroPending` — "this visitor has not yet had Root's opening" — set on
arrival, never cleared by navigation, cleared only when the opening runs, and
honoured on every route to Root. The Local button is plain Back again.

## 3. The graph drew at half size on arrival

30 elements drawing **704x458 inside a 243px canvas** at the zoom held from
boot. `enterNode` shows the neighbourhood but nothing in that flow calls
`runLayout`, which is what normally ends in a fit. Any click made cytoscape
re-render, which is what made it look like a resize bug.

**Three wrong fixes before the right one, all instrument failures:**

1. `positionCyEl()` is not in scope at that listener — it threw a
   ReferenceError the catch swallowed, skipping the resize and fit with it.
2. `requestAnimationFrame` does not fire in a tab that is not being painted —
   headless Chrome **and a backgrounded tab**, which is where a deep link often
   opens. The callback never ran at all.
3. A fixed 200-250ms delay lands **mid-animation** (`animate: true`,
   `animationDuration: 400-450`) and is overridden when the animation
   completes. In headless the animation never runs, so the fit survived and
   every measurement looked clean while the real browser was unchanged.

`fitVisibleWhenSettled()` waits for `layoutstop`, with a 900ms timeout as
fallback.

## 4. Lessons that cost real time

**`setupInteractions()` and `init()` are different scopes.** `jumpToNode`,
`saveState`, `markReadNode`, `addYouChip` live in the former; the arrival
handler lives in the latter. Reaching across needs the returned bundle that
`init()` destructures — that is how `enterNode` gets there. A call written
without that threw `ReferenceError` and **my own try/catch swallowed it**, so
the behaviour simply did not change.

**A test that passes without exercising the change is worse than no test.** I
checked "no Root card on arrival" and "Root card after Local" — both already
true via another branch — and concluded the new code worked when it had never
run. The fault was sitting in the forwarded client console the whole time.

**`Runtime.evaluate` cannot see module scope.** `fitPadding`, `youCy`,
`jumpToNode` all appear undefined from a CDP probe while being perfectly in
scope inside `viewer.js`. I nearly rewrote working code on that basis.

**Exposing a `const` before its declaration breaks boot.** `window.youCy =
youCy` placed above the `const youCy = …` line threw a temporal-dead-zone
error inside `init()`.

**Read `/private/tmp/bd_server.log`.** The client console is forwarded there.
Every one of the faults above was visible in it before it was visible to me.
