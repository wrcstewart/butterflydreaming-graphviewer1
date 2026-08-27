# Session notes — 2026-08-27

The corner-controls redesign built end to end, the colour scheme desaturated,
and four bugs found by testing that were each older than the work that exposed
them.

Canary ended **blue** at `viewer.js?v=661`, `style.css?v=343`.

---

## 1. Desaturation

Designer feedback (the user's daughter): the scheme is overbearing, and the
worst of it is the bright yellow of the top-row buttons and the helper card
header.

- `FAMILY_COLOURS` capped at **32% saturation** (`5a56451`). Everything derives
  from these six via `computeBlendedColours`, so it calms the whole graph from
  one place.
- The system gold `#FFD700` → **`#BFAC40`**, 50% saturation, hue and lightness
  unchanged (`5908981`). 7.6:1 against the dark text it carries, where the
  bright version gave 12.5:1.
- Made a **variable**, `--bd-gold`. It appeared in 12 declarations; the next
  adjustment is one line rather than twelve.

**Not touched:** the root node's `#FFD700`, which lives in `viewer.js`
`buildStyle` rather than the stylesheet. The obvious next candidate.

**A near-miss worth keeping:** `44cc267` shipped only the canary and version
bump — the Python rewriting `FAMILY_COLOURS` died on `%` signs in its own
comment and the `&&` chain committed anyway. Caught by reading output, not the
exit code. Same trap as the memory-index failure four days earlier.

---

## 2. Corner controls — the redesign, built

Plan at `corner_controls_plan.md`, rationale at `editing_spec.md` §v0.2.

**Three DOM controls, one vocabulary.** Only the border separates them:

| corner | control | border | records |
|---|---|---|---|
| top-left | GN | green `#1bbb40` | convergences you chose |
| top-right | PN | dark | your own trail (the Back button) |
| bottom-right | BN | blue `#4a9bff` | the partner's position NOW |

**None of the three is a parked graph node any more.** The in-graph halo still
paints wherever the node is genuinely in view; the control is *additional*.

### The finding that shrank the work

The user asked whether the PN is just the existing Back button wearing the
previous node's style. **It is** — and `#back-btn`'s stack already POPS
(`saveState`/`restoreState`). So step 2 collapsed from "build a control with a
new stack" to "give the existing one a face".

Which reframed the oscillation bug the user found the day before: sequential
Back clicks going A→B→A→B was **not** graph-node-versus-DOM and **not** a
missing feature. It was a *second, parallel* history (`prevReadNodeId`) built
beside a working one, without its pop. Two mechanisms for one job, the newer
one wrong.

The test that exposes it needs **three** clicks, not two: A→B→C then Back Back
reaches A when correct and C when not. A back button and a "most recent other
node" indicator are indistinguishable at one click.

### Which corners are stacks — the user's decision

- **BN is NOT a stack.** It is a live pointer. No scanning back through the
  partner's browsing, because that "realigns local too far into remote". Their
  trail is *already* browsable in the remote breadcrumb strip, whose chips
  already navigate — a stack would be a worse duplicate.
- **GN is the stack**, holding the BNs local actually CLICKED. A record of your
  own choices, not their wanderings. It **cycles** rather than pops: visiting a
  record must not destroy it, which is the exact opposite of Back.
- Capped at 3; revisiting moves the existing entry to the top.

### The GN was one-sided, and the plan was wrong about why

The plan claimed symmetry came "for free": you arrive on the node they occupy,
so they would notice. **They cannot.** Nothing about your arrival changes their
state — your position reaches them as an ordinary crumb they were already
receiving, indistinguishable from you wandering there alone. The convergence is
an *event* only for the side that CHOSE it, so the choice is what must cross the
wire. New `gn_mark` message.

### `gn_mark` needed THREE sites

Sender, server relay whitelist, **and the client's own receive whitelist**. I
added two. The third dropped every message silently on arrival — wire fine,
relay logging delivery, handler correct, and the only symptom the mark appearing
on one side, which looks exactly like a minting bug.

---

## 3. Four bugs found by testing, all older than the work that exposed them

**A childless Cluster did nothing.** 21 of 126 clusters have no gateways, so
`hasNavDescendants` was false and the tap inserted a text card without
navigating — no expand, no `saveState`, no history entry. **The one node kind
you could read without visiting**, and the panel showed text Back could not
return you to. Now navigates to its Family parents (all 21 have 1–9; none has
zero), which `expandToCluster` already showed. The `nav` flag drives the tap AND
the chunk hint together, so it cannot navigate while its card says there is
nowhere to go.

**Gateway click sometimes showed 70+ clusters.** One stale variable, two faults.
`lastClusterNode` is written only by `expandToCluster` and never cleared:
*cold*, it is null and the click fell through to `expandToNode`, revealing the
gateway's entire neighbourhood — up to 48 clusters plus every chunk TextNode
(hence "sometimes": usually you have been through a cluster first); *stale*, it
may belong to another work, so the query finds nothing and the view collapses to
two nodes, which reads as the gateway not doing much. Context is now validated;
without one, the click shows the work's THEMES.

**Gateway nodes painted black on the corner buttons.** `paintNodeButton` read
`data('colour')`, which gateway TextNodes do not have — `colour: null` in the
DB, white by the stylesheet. **This was already solved once:** the blue radial
fill needed the same thing and has `bnBaseColour`. A control that stands for a
node must wear what that node actually looks like, or it stops being
recognisable, which is its whole job.

**And one I introduced today:** `jumpToNode` hand-rolled its own type dispatch
with no gateway branch, so jumping to a partner on a gateway hit the
whole-neighbourhood path every time. Now calls `navigateInto`. *Two copies of a
branch list, the newer one incomplete* — the same shape as the parallel back
stack, twice in one day.

---

## 4. Smaller things

- Back now restores the **selection**, not just the view. Nulling `activeNodeId`
  was tolerable while Back meant "collapse to parent"; returning across a jump
  is different.
- The BN button **dims** when you are already on that node. The no-op was
  correct but silent, and a silent no-op reads as broken.
- The **snap dialog is off**, behind `SNAP_DIALOG_ENABLED`. It explained more
  than wanted and described the offer/accept flow being retired.
- Arrow **after** the label on the Back button — a left-pointing arrow after the
  word points AT the word ("back to this"); leading it points away.
- `git add -A` swept 127 MB of untracked mp3s into a commit and pushed it.
  Recovered with `reset --soft` + `--force-with-lease`. **Stage by name here.**

---

## 5. Decided at end of session — NEXT WORK

**Retire the breadcrumb bars, and put a panel ABOVE the canvas.**

The user has chosen to **sacrifice the parallel view for simplicity**. This was
the open question in the plan's step 6, and it is now settled.

Order of work:

1. **Stop calling the breadcrumb bar code — do not delete it.** Kept whole in
   case the parallel view is missed.
2. **Move the graph area down** so its bottom sits where the bottom of the local
   breadcrumb strip is now.
3. **New permanent panel ABOVE the graph**, present in Player mode too.
4. **The three corner buttons move into it** — anywhere for now. Keep its depth
   roughly the current breadcrumb depth, because a **description of each button
   will go above it**.

Note the consequence to watch: the remote breadcrumb strip is currently the only
way to reach a position your partner has already left. Retiring it makes the BN
strictly a live pointer with no history behind it anywhere — which is consistent
with the decision above, but is a real capability leaving.

---

## Open

| item | note |
|---|---|
| Retire offer/accept/lapse machinery | Spans client and server; its own commit. |
| Root node's `#FFD700` | Not in the stylesheet; next desaturation candidate. |
| `history` has no cap | Each entry stores every visible id. |
| You-trail appends on Back | `Loss → DuFu → Loss`. A choice, not an oversight — moot if the bars go. |
| Draft persistence | Brief `CC.7`. Still the only present-tense risk. |
| The write gate | Agreement is witnessed, not enforced. |
| `GRACE_MS` is 5s | `BD_GRACE_MS=65000` restores it. |
