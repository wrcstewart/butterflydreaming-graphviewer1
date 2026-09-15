# Ancillary Viewers (AV)

**Built 2026-09-14.** How to make a page that ButterflyDreaming drives.

---

## What an AV is

A **presentation surface**. BD designs the experience and holds the state; an AV
renders it on more screen with fewer controls. Move a slider in BD and the
viewer follows.

**It is not an editor.** There is no return channel, nothing an AV does reaches
the BD database, and it cannot save. That is deliberate: the standalones
(`bd_V_Kolam` and friends) are editors and remain so; an AV is the other thing.

The name supersedes "AT / ancillary tab" used in earlier notes. Same idea.

## You do not need anything of ours

An AV can live **anywhere** — your own domain, GitHub Pages, `localhost` while
you build it. Nothing needs to be in BD's repo, on BD's machine, or approved by
anyone. BD's Socket.IO server accepts any origin.

What you need is: **BD running**, and a token BD gives you.

## The shape of it

```
   BD  ──mints a token──▶  opens  https://your-host/your-viewer.html?t=<token>
    │
    └──av_push──▶ BD's server ──av_update──▶ your viewer  (live, repeatedly)
```

BD pushes whenever its state changes. You render. That is the whole protocol.

## Getting connected

Copy `bd_av_client.js`. It is small and deliberately readable.

```html
<script src="https://graph.virtualfictions.uk/socket.io/socket.io.js"></script>
<script src="bd_av_client.js"></script>
<script>
  BD_AV.connect({
    onUpdate: payload => { /* render payload.script */ },
    onState:  (state, info) => { /* 'connecting' | 'live' | 'no-token'
                                    | 'refused' | 'lost' */ }
  });
</script>
```

**Handle `onState`.** A viewer that silently shows nothing when it cannot reach
BD is the failure we are trying to avoid. Say what happened.

## The token (MST — Module Session Token)

- BD mints it and puts it in your URL as `?t=`.
- It is **short-lived** (2 minutes) and **single-use** — it exists only to
  bootstrap one socket.
- It is presented in the Socket.IO handshake as `auth: { token }`, **not** in
  the query string of the socket call: a query lands in the server's access log,
  and the token has already been exposed once in your page's URL.
- **Do not retry a refusal.** The token is consumed or expired; only BD can
  issue another.
- It identifies you. It does **not** privilege you. Pair-and-save stays gated on
  the curation code, and no token grants write access to anything.
- **Your socket may send exactly one message type: `av_hello`.** Everything
  else is dropped, silently and before any handler sees it (2026-09-15). This
  is not a courtesy limit you could talk us out of by sending a curation code —
  it was verified that a module socket holding the CORRECT code still reaches
  nothing. An AV renders what it is sent and says "I am ready"; anything more
  is a decision about what a viewer may DO, and has to be made deliberately
  rather than inherited.

Why the URL and not storage: `localStorage` and cookies are per-origin, so a
viewer hosted elsewhere cannot read BD's. The URL is the only channel that
crosses that boundary.

## Two traps, both of which cost us real time

**Do not open a viewer with a named window.** `window.name` survives navigation,
so a tab that was once a viewer keeps the name — and `window.open(url, thatName)`
then matches the *current* window and navigates BD into the viewer, replacing
itself. Use `_blank` and keep the handle.

**Do not give your renderer iframe a `src` in the HTML.** If it loads before your
message listener is attached, its readiness announcement arrives before anything
is listening and is lost — leaving a viewer that is connected, receiving pushes,
and permanently blank. Attach the listener, *then* set `frame.src` from JS.

## Speed

Measured: **~30 ms** round trip through Cloudflare to BD and back, against
**under 1 ms** for `postMessage` to a window BD opened directly.

Thirty milliseconds is below the threshold where lag is obvious, so slider work
feels responsive. But be clear about the trade: the socket is the *slow* route,
chosen because it is the only one that also reaches a viewer BD did not open —
which is exactly the case that makes third-party viewers possible.

## When there is no token

Someone will open your viewer cold — a bookmark, a shared link, a reload after
the token was consumed. That is not an error; it is a different **data mode**.
See `../module_data_modes.md`:

| | mode | what you get | needs BD up |
|---|---|---|---|
| **LD** | Live Data | this — token, socket, live state, read/write | yes |
| **SD** | Static Data | a published JSON snapshot, read-only | no |
| **UD** | URL Data | payload carried in the link, ~708 chars of prose | no |

`bd_av_client.js` implements **LD** and reports honestly when it cannot get it.
Falling back is left to you, because what a viewer should show when it cannot
reach BD depends on what it displays.

## Files here

| file | what it is |
|---|---|
| `bd_av_client.js` | the shim. Copy it. |
| `kolam.html` | the reference viewer. Uses the SAME renderer BD and the standalone use, so there is one renderer to maintain, not three. |

## Trying it

Open a Kolam node in BD, enter Player mode, press **View**. BD mints a token,
opens `AV/kolam.html` in a WINDOW beside BD, and pushes. Move things in BD; the
viewer follows.

If a viewer cannot be opened — no session, no token, popup blocked — View falls
back to the frozen standalone, so the button always does something.

(The button was called **Jump** until 2026-09-15, when it stopped jumping
anywhere: BD stays put and the viewer opens beside it.)

## Another device — where the QR code goes

Short answer: **entirely on the BD side. The AV needs no change at all.**

The confusion is worth dissolving properly, because the asymmetry is the whole
design. Only BD can **mint** a token — it is the party with the session. An AV
only ever **consumes** one, and it already accepts any token handed to it in
`?t=`. A camera opening `…/AV/kolam.html?t=<token>` is indistinguishable, to
the viewer and to the server, from BD navigating a window to the same URL.

So the feature is: **BD renders the token as a QR code instead of opening a
local window.** Another device's camera scans it and becomes the viewer.

**The protocol needs nothing.** `socket.data.moduleFor` holds a `userId`, not a
device, an IP, or a tab — the server has no idea and no opinion about where a
module socket comes from. Phone running BD with a desktop browser as the big
window works today, as does the reverse.

What has to be built, all of it in BD:

- A second action beside View — "View on another device" — because View's job
  is to `window.open`, and this one must NOT.
- A QR renderer. The payload is the same URL View would have navigated to.

Constraints to design around, all already true:

- **Mint on the press, never in advance.** The token expires in 2 minutes and
  is single-use, so a pre-rendered QR is a dead QR.
- **One scan, one viewer.** A second device needs a second press.
- **Whoever photographs the QR gets that stream** for the life of that socket.
  The short TTL is what bounds this, and is why it should stay short.
- **BD must stay awake.** The viewer follows BD; if the device running BD
  sleeps or drops, the viewer goes quiet. This matters most in exactly the
  phone-drives-desktop case, where the phone is the one that sleeps.
- A typed code instead of a scan would want a longer TTL and a shorter string —
  a different decision, not a harder one.

**Keep this separate from the question of whether a viewer may CONTROL BD.**
Reaching more devices is addressing — plumbing. A viewer that talks back is a
different system: `av_push` has no recipient field and no return channel, on
purpose. Conflating the two is what makes the design space feel infinite.
