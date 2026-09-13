# External collage viewer — design thinking

**Status: MULLING. Nothing built, nothing decided.** Recorded 2026-09-13 so the
shape of the idea survives, not as a specification.

---

## The idea

A public-facing player, opened by URL, that displays a **collage** — text, music
and graphics drawn from BD — to someone who is not a BD user. Call them the
external user (UE).

- Material comes from **saved nodes**, so in principle it is reachable from node
  **ids** alone.
- UE controls are deliberately **superficial**: volume, opacity. **No saving.**
- How the source ids get selected is **TBA**.
- Content would come from the BD database **via the server** — websocket or POST
  — rather than being carried in the link.

## The model shift, which is the important part

> **BD designs the experience. The external players are viewers.**

That is **not** the current model. Today's standalones (`bd_V_Kolam`,
`bd_M_ABC`, `bd_M_Fractal`) are *editors*: they take a script, let you change it,
and hand it back through a return link. The collage viewer inverts that — it
receives an arrangement and presents it, with no path back.

Worth being explicit about, because nearly every existing mechanism (Copy BD
Link, Enter BD, the `?j=` return leg, `%%bd_` round-tripping) exists to serve
the editor model and has no counterpart here.

## The question the author is holding open

**What does the external collage give that BD does not already?** Candidate
answers, none settled:

- more screen real estate
- fewer controls — presentation rather than instrument
- an intermediate level of integration into nicer XR viewers

This is the right question to keep asking. If the answer stays thin, the honest
conclusion may be that the collage belongs *inside* BD.

## Constraints already established that bear on it

**Fetching from the server reintroduces the laptop dependency.** Everything
built to date deliberately avoids it: a self-contained link works when this
machine is off, which is why a cloud store was considered and rejected (see
`DeepLinking.md`, "DECIDED 2026-09-12"). A viewer that pulls content from BD's
server is dark whenever BD is. For a public audience that is a different
proposition from a link shared between two people — worth deciding
*deliberately* rather than inheriting.

**Ids are cheap, content is not.** A three-node collage of saved nodes encodes
to **87 chars** as ids, against 1,730 inline. So id-based selection is not only
possible, it is dramatically the smaller option — if the receiver can resolve
them, which is exactly what routing through the server buys.

**Some media cannot travel by link at all.** An ABC score is ~75% irreducible
content; an actual recording (`A_GreatWall.mp3`, 57 MB) is out of the question
by any encoding. If the collage is to carry audio recordings rather than
generated music, the server route stops being a choice and becomes the only
option.

**The 659-char ceiling applies to whatever URL a person is given.** Apple's data
detector truncates plain-text URLs past it. An id-based collage link is far
under; an inline one is not.

## Deferred, and related

**`?n=<uuid>` for BD self-links** — when the panel text is identical to the
node's stored text, the payload carries nothing the receiver lacks, so the id
alone suffices: **999 chars → 72** on the measured Whitman example. Applies to
every node type, not just text, and to BD→BD only: a standalone has no corpus to
resolve an id against. Deferred 2026-09-13 pending the author's table of what
each button does in each context, so it can be designed against the full set of
cases rather than one.

Caveat if built: BD deliberately overwrites `node.data('text')` on a deep-link
arrival, so a node that received an edited version earlier in the session would
compare "unchanged" against that shadowed text and silently ship the database
version instead. Mark locally-shadowed nodes and never send `?n=` for them.

---

# Leaning: BD stays central, with a second TAB for real estate (2026-09-13)

Rather than an external app fed from the server, a **second tab served by BD
itself**. Pairing and editing stay a few clicks away, and the browser-only
requirement — which is what makes XR plausible — is preserved.

## The same-origin dividend

**`BroadcastChannel` works again.** It was abandoned earlier only because of the
EV → GitHub-Pages **origin split**; a tab served by BD is the same origin, so the
two tabs can talk directly, instantly, with **no size limit at all**.

That dissolves this entire week's sizing problem *for this case*: no 659-char
ceiling, no ~8 KB request line, no JSP encoding, no wire table. You hand the tab
an arrangement object. All that machinery remains necessary for the GitHub-Pages
standalones and for anything sent to another person — it simply does not apply
between two tabs of the same origin.

## Correction — a second BD tab is NOT kicked

Checked in `server.js` rather than assumed. The connect-time kick was tried and
**abandoned** in July 2026: it tore down a live pair when a user returned from a
standalone. What survives is narrower — `ready_to_pair` refuses to pair two
sockets carrying the same `bd_device_id`, purely to stop self-pairing across two
tabs. A second tab connects and lives normally.

## XR — two different things

Browsers are generally present (Quest ships Chromium with WebXR; Vision Pro's
Safari gained WebXR in visionOS 2; Pico has one). But:

- **A 2D page on a floating panel in a headset** — you already have this. Any BD
  tab works there today, and a wider tab is exactly the "more real estate" win.
- **An immersive WebXR scene** — `navigator.xr`, a session request, a 3D-rendered
  scene. A different build, not a bigger window.

Decide which is wanted. The first is nearly free; the second is a project.

*(XR support noted from knowledge to ~May 2026 — moves quickly, verify before
relying on it.)*

---

# If a slimmed-down external TEXT viewer is still wanted

Measured across the 207 prose nodes (text 8–1,796 chars, avg 597):

| encoding | avg URL | max | fit under 659 |
|---|---|---|---|
| current `?data=` | 1,076 | 2,685 | **41 / 207** |
| deflate + base64url | 584 | 1,183 | **142 / 207** |

Compression is worth **1.84x** on the URL and takes it from a fifth of the
corpus working to about two thirds. **It is not sufficient on its own.**

**Maximum raw text that fits under 659 when deflated: ~708 chars** — roughly 120
words of English prose. 65 of 207 nodes exceed it; their text runs 661–1,796.

## On truncating to fit

Possible, but note what is being traded. The 659 ceiling binds **only** for a URL
pasted as plain text into an Apple app. The same 2,685-char link is fine through
webmail, an HTML mail link, or the address bar. So truncation sacrifices the
author's text to satisfy one channel.

If it is done anyway, truncate visibly — an ellipsis and a "read the whole thing
in BD" link — so the reader knows they have part of something, rather than
silently receiving a poem with its last third removed. A third of this corpus
would be affected, and for the longest node more than half the text would go.

## The way back into BD — two invitations, not one

If a viewer shows a passage, the link home is the point of the whole thing. Two
different invitations, landing in different places:

| Invitation | When | Lands on | Cost |
|---|---|---|---|
| "Read the rest of this passage" | only when truncated | **that node** — `?n=<uuid>` | ~72 chars |
| "See more of where this came from" | always | **Root** | ~33 chars, no id needed |

Not exclusive; the strongest version carries both. The first converts a reader
who is mid-passage, the second catches one who has finished and is wondering
what this was.

Both are `<a href>` **inside the page**, so the 659-char detector ceiling never
applies to them. The only URL under pressure is the one handed to the reader in
the first place — the viewer's own.

**A stranger following "see more" arrives at Root** — which is the path made
coherent on 2026-09-13: development notice, speech offer, then Root's
orientation text, in the same order a landing-page visitor gets them.

### On the wording

**"Media corpus" is BD's internal language.** Someone who has just read eight
lines of Whitman on a phone does not know what a corpus is, or that there is a
collection behind what they are looking at. Name what they would *find* — the
writing, the music, the graphics — or simply "where this came from". That link
is the one moment the system has a stranger's attention while they know nothing
about it.

## What this settles

The open question at the head of this document — *what does an external viewer
give that BD does not?* — has an answer now, and it is not "a complete reading
experience". That needs the corpus, and having the corpus **is** BD.

It is: **a passage put in front of someone who was never going to open BD, with
a door back into it.** A taster, not a rival. Which also turns truncation from a
loss into the reason the link exists.
