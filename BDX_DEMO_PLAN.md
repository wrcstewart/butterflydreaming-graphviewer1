# BDX / AVX / RX — an independent demo of the module architecture

**Status: planned 2026-09-19, part 1 built (`bf70980`).**
Written down before building because the reasoning matters more than the code,
and the code is easy to rebuild from it.

---

## 1. What this is, and the argument it makes

Three small things, hosted away from ButterflyDreaming, that together drive a
live Kolam from a script — proving that **the module architecture needs nothing
of BD**: no Memgraph, no corpus, no graph, no nodes, no cards, no pairing, no
curation, no speech.

| | what it is | where it runs |
|---|---|---|
| **BDX** | the controller: a script panel, steppers, and the renderer | GitHub Pages (static) |
| **AVX** | the viewer: renders what it is told, no controls | GitHub Pages (static) |
| **RX**  | the relay: a rendezvous for two browsers on different devices | a Node host |

The claim it supports: *a third party can build a media module for BD, or use
this architecture entirely on their own, without depending on us.*

## 2. The dependency ladder — what actually needs a server

This is the heart of it, and the thing to state carefully because it is easy to
overclaim in either direction.

1. **Same machine → NO SERVER AT ALL.** If the controller OPENED the viewer, it
   holds a window handle and `postMessage` reaches it — cross-origin included.
   Measured in `AV/README.md`: **~1 ms, against ~30 ms through a socket.**
   BDX on their site and AVX on GitHub Pages can talk directly.
2. **Cross-device → a rendezvous is unavoidable.** Two browsers on two devices
   cannot reach each other; a window handle does not exist. Something in the
   middle must exist. That is RX, and it is the ONLY reason the socket path
   exists in BD at all.
3. **Whose rendezvous** is then a free choice: run RX yourself (~10 lines to
   start, no account), or point at ours for a demo.

So: the architecture does not require *our* server. It requires *a* server, and
only for the cross-device case. Say it that way.

## 3. What already exists

- **`bd_relay.js`** — BUILT (`bf70980`). 198 lines, the whole relay, free of BD.
  `server.js` calls it; `rx.js` will run it standalone.
- **`AV/bd_av_client.js`** — the viewer shim. This is the third-party contract.
- **`AV/kolam.html`** — the reference viewer; the template for AVX.
- **`V_Kolam/preview.html`** — *already a BDX*: script panel, steppers, renderer,
  on a URL, no corpus. Built as the frozen standalone. The template for BDX.
- **`V_Kolam/visual_module.html`** — the renderer. The demo needs a copy.

## 4. What to build

    rx.js            ~10 lines around bd_relay.js. process.env.PORT, a /health
                     route, CORS '*'. socket.io its only dependency.
    package.json     one dependency, a start script.
    bdx.html         script panel + steppers + renderer iframe + a View button.
    avx.html         viewer + the health strip + a way back.
    bd_av_client.js  COPY of the shim — this is the artifact a third party uses.
    renderer.html    COPY of visual_module.html.
    sync_from_bd.sh  refreshes both copies, so the copying is deliberate.
    README.md        the three tiers, how to run RX, how to point at another.

## 5. The divergence risk, and how each copy is handled

This repository has already lost this argument twice: two copies of
`music_module.html` diverged, and the frozen Kolam standalone has drifted FOUR
ways from the live renderer (angle 5..90, no angle_minutes, step capped at 200,
colour shown as the exponent). A published copy rots.

- **The relay is a MODULE, never copied.** One implementation, two entry points.
  This is why part 1 was done first.
- **The shim and the renderer must be copies**, because the demo has to stand
  alone — that is the entire point of it. So the copying is made *deliberate*:
  a `sync_from_bd.sh` that refreshes them, and a header in each naming its
  source and the date. A copy that announces itself is survivable; one that
  pretends to be original is not.

## 6. Hosting

- **BDX + AVX**: GitHub Pages. Static, free, always up.
- **RX**: GitHub Pages CANNOT host it — it is a server. A free Node host is the
  assumption (decided 2026-09-19). RX is written for one: `process.env.PORT`,
  a health route, no filesystem state, one dependency.
- **`?rx=<url>`** on both pages, so the *published* pages work against any
  relay — ours, theirs, or `localhost` — without forking anything.
- The demo defaults to our hosted RX so a stranger clicking the link sees it
  work. The AVX health strip already fails honestly ("NO CONTACT…") when the
  relay is unreachable, which is the right behaviour for a demo that may be
  pointed at a sleeping free-tier host.

## 7. Testing

Re-use the probes that verified the extraction. They drive the raw Socket.IO
polling protocol with `fetch` and need no client library:

    token single-use · type filtering · av_pull/av_state_report round trip ·
    av_return strips a destination · viewer allowlist holds

Plus, for the demo specifically: BDX drives AVX on the same machine; then on two
devices through RX; then BDX pointed at a *different* RX via `?rx=`.

## 8. Decisions taken

- RX assumes a **free Node host** (2026-09-19).
- The relay ships as a **module**, not a copy.
- The demo **defaults to our RX**, with `?rx=` to override.
- A demo that does not work on click is not convincing, so tier 1 hosting is
  worth having even though tier 3 (`node rx.js`) is what proves the argument.

## 9. Decisions outstanding

- **Creating the public GitHub repo** — outward-facing, needs an explicit yes.
  Name not chosen. `bdx-demo`? `bd_module_demo`?
- **Which free host**, and the deploy walkthrough, wanted later.
- Whether to add a QR / short-code path for cross-device pairing. Designed in
  `AV/README.md`, entirely controller-side, NOT built. Deliberately out of scope
  for this demo: the multi-device transport is a separate job.

## 10. The one thing not to get wrong

Only the controller can MINT a token, because a token derives its meaning from a
session. A viewer only ever CONSUMES one. Any design where "AVX gives BDX a
token" is backwards and will not work — see `AV/README.md`, *Another device*.
