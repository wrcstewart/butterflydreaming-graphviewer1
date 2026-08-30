# Continuation note — 2026-08-30, 17:50 BST

**Read this first if context has been lost.** It says where the work is, what
state it is in, and which document answers which question.

---

## 1. Where the work is

**Branch `remote-graph-view`.** `main` is untouched and still the stable viewer.

    git branch --show-current     # expect: remote-graph-view
    git log --oneline -1          # expect: 1e33df0 or later

**Nothing here is merged.** If `main` is what you want, `git checkout main`.

Current build: **`viewer.js?v=710`, `style.css?v=392`**, canary **red**.
Server: `BD_GRACE_MS=5000 node server.js` (5s grace is a DEVELOPMENT value —
`BD_GRACE_MS=65000` before real use; the server warns at boot).

Two flags gate everything on this branch:

| flag | default | what it does |
|---|---|---|
| `?ink=1` | off | the whole colour scheme. **Without it the branch renders like `main`.** |
| `BREADCRUMB_BARS` in viewer.js | `false` | the retired breadcrumb strips. Flip to bring them back. |

---

## 2. Which document answers which question

| question | file |
|---|---|
| What does the screen mean? Why is it built this way? | **`remote_view_spec.md`** — read the AS-BUILT box at its head first |
| Why are the colours what they are? | **`ink_mode.md`**, and `ink_palette_swatch.html` (open at `localhost:8080/ink_palette_swatch.html`) |
| What was decided about the corner controls? | `corner_controls_plan.md`, `editing_spec.md` §v0.2 |
| What happened on a given day? | `session_notes_2026-08-2*.md`, and this branch's git log |
| What is every doc, and how far is each built? | `DOCS_INDEX.md`, `PLANNING_REGISTER.md` |
| How does the graph actually work? | `edge_model.md` — **read before touching layout or edges** |

Memory lives outside git at
`~/.claude/projects/-Users-williamstewart2-butterflydreaming-graphviewer1/memory/`
and is mirrored into the repo as `MEMORY_SNAPSHOT.md`. See `HowToRestore.md`.

---

## 3. What the screen means, in one table

| | meaning |
|---|---|
| thin yellow ring `#FFD400`, 1.5px | a node in YOUR view |
| thin blue ring `#4a9bff`, 1.5px | your partner can see it too |
| **fat turquoise ring `#16CAB8`, 4px** | your partner is ON it |
| green ring `#50E272`, 8px | you are both on it |
| solid light-blue arrow `#9FD0FF` | the recommended next step toward them |
| dotted grey edges | a revealed route (Remote button) |

**Your own centre is deliberately NOT marked** — you clicked it, and the reading
panel names it. The rings spend themselves on what you cannot otherwise know.

The three colours are a LADDER in hue *and* luminance: 213/174/134 and
6.9/9.5/11.7. Do not change one without the others.

Card heads say WHO: gold `#8d7900` you, navy `#001f4d` partner, grey `#C9CCD1`
system. Helper hints share the system grey.

---

## 4. What is unfinished

| | |
|---|---|
| **The crossing** | Simultaneous clicks swap without reaching green. Detectable with no protocol via `previous`. **The user is deciding what it should MEAN** — "you passed each other" vs "you crossed". `remote_view_spec.md` open list. |
| Weighted hubs | Routes currently EXCLUDE hubs outright. Measured: 0 of 400 pairs unreachable, so this is a refinement for a larger corpus, not a fix. |
| Gateway row at scale | At ~40 works a Cluster view shows ~10 gateways (27 for popular themes) against 2.2 now. **This is what breaks first.** |
| `.card.local .card-head` | Still `#8d7900`, chosen to match the old selection ring. The ring is now `#FFD400`, so that correspondence has lapsed. |
| `isGreen` in renderMarks | Declared, now unused. |
| Explore protocol | Retired. A consent step is still wanted for SAVING — see `editing_spec.md` §7, which is the part worth re-reading. |

---

## 5. Traps that have cost real time

- **Verify the effect, not the exit code.** A `&&` chain commits even when the
  edit aborted. One commit shipped only a version bump. Put the verifying grep
  BEFORE the commit.
- **After replacing a span of code, grep for every function the new code CALLS**
  — not for what you just wrote. A span replacement silently deleted
  `findBridge` and no route appeared; `node --check` passes on a deletion.
- **Never `git add -A` here.** The repo root permanently holds ~127 MB of
  untracked mp3s. Stage by name.
- **A relayed message needs THREE sites** — sender, server whitelist, client
  RECEIVE whitelist. Two of three fails silently.
- **Whatever runs last decides** — and its mirror: `publishPosition` ran FIRST
  and so reported the view it was leaving.
- Client console forwards to **`/private/tmp/bd_server.log`**. A second "no
  different" means instrument, not iterate.
