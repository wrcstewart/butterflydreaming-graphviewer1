# Module data modes — LD / SD / UD

**2026-09-14. Design, partly built.** How a module gets node content from BD,
and what each way costs. Terminology is fixed here so it can be used elsewhere
without re-explaining.

---

## The three modes

| | mode | how the data arrives | read/write | needs BD running | size limit |
|---|---|---|---|---|---|
| **LD** | **Live Data** | MST → websocket → BD's live database | **read + write** | **yes** | none |
| **SD** | **Static Data** | published JSON snapshot (GitHub Pages) | read only | no | none |
| **UD** | **URL Data** | carried in the link itself | read only | no | **~708 chars of prose** |

They form a ladder: **LD → SD → UD**, strictly decreasing capability and
strictly increasing availability. A module tries them in order and **announces
which it got**, so a reader is never left wondering why saving is missing.

## Supporting terms

| | term | meaning |
|---|---|---|
| **MST** | Module Session Token | short-lived, **single-use**, minted by BD, handed over as `?t=`, exchanged for a socket via Socket.IO `auth: { token }`. Never in the query string of the socket call — it would land in access logs. |
| **MDP** | Module Data Protocol | the minimal contract: request node(s) by id, receive Node Records. Primary form is over the LD socket; SD and UD deliver the same records by other means. |
| **NR** | Node Record | **the one JSON shape every mode delivers.** |
| **OH** | Opener Handover | `postMessage` via `window.opener`. Unlimited, no server, no token, works cross-origin — but **launch-time only and one-way**. An optimisation, not a mode. |

## NR is the integration — everything else is transport

If a node arrives as the same object whether it came down a socket, out of a
static file, or decoded from a URL, the module's rendering code is written
**once** and the modes are genuinely interchangeable. If the shapes differ you do
not have one module with three modes; you have three modules.

**Version `NR` from the first record ever emitted.** The `name` field that
silently broke sharing in July is the cautionary case: a payload gained a field,
nothing declared a version, and the failure surfaced two months later as
something else entirely.

## Does the ladder make sense? Yes, with three honest costs

**Three modes is a burden on a third-party developer.** Mitigate by making **LD
the only required one**; SD and UD are optional and a module may legitimately
support none of them. A small client shim implementing the ladder would remove
the burden entirely and is probably the single most useful thing to publish
alongside the protocol.

**Write is LD-only, inherently.** SD is a snapshot; UD is a copy in a link.
Neither can accept a save. The interface must say so rather than presenting
controls that quietly do nothing — which is the same instinct as "superficial
controls, no saving" for an external viewer.

**SD needs a publish step and only covers public content.** It is stale between
publishes (Pages sets `max-age=600`), and anything unpublished must not be in
the bundle.

## How a module actually connects (LD)

Route A, chosen 2026-09-14 and **built**: allow the origin on the Socket.IO
server, keeping the polling fallback.

```js
// server.js
const io = new SocketIOServer(server, {
  connectionStateRecovery: { maxDisconnectionDuration: 60_000, skipMiddlewares: true },
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// module page — hosted anywhere
const socket = io('https://graph.virtualfictions.uk', { auth: { token } });
```

**This said "an explicit allowlist, never `'*'`, because a module socket carries
session authority" until 2026-09-15.** It was widened to `'*'` deliberately: an
allowlist is a registration step, and requiring a stranger to ask us before
building anything is the opposite of the point.

The premise was also wrong, and worth correcting rather than quietly deleting.
A module socket does **not** carry session authority. It carries an *address* —
`socket.data.moduleFor`, the session it may be pushed to — and since
2026-09-15 it may send exactly one message type, `av_hello`. CORS was never the
thing protecting the corpus; it was standing in front of write handlers that
had no check of their own, and three of them turned out to have none at all
(`edit_save`, `edit_delete`, `edit_clone_cluster` — fixed in `dd6368d`, see
`PLANNING_REGISTER.md`). **An open origin is safe exactly to the degree that
every handler behind it is gated on its own.**

**Why not raw WebSocket-only:** a raw `new WebSocket` is not CORS-gated at all,
but Socket.IO opens with HTTP long-polling and upgrades, and that first XHR is.
Forcing `transports: ['websocket']` would dodge CORS and lose the polling
fallback that gets through restrictive networks.

**Already in our favour:** `connectionStateRecovery` has `skipMiddlewares: true`,
so a *recovered* connection does not re-run the auth middleware — a single-use
MST therefore survives a dropped connection inside the 60-second window without
reissue. Past that, BD must be able to mint a fresh one.

## Open questions

- **Who may mint an MST, and can a cold module ask for one?** It cannot
  authenticate, so the answer is probably no: cold means SD or UD.
- ~~**The origin allowlist is a registration step.**~~ **RESOLVED 2026-09-15:
  friction, removed.** `cors.origin` is `'*'`; anyone may host a module without
  asking. The gate that replaced it is per-handler, which is where it belonged.
- **Does BD ever need to push unprompted** (a partner saved something), or is
  request/response enough? Push is the reason LD exists at all.

## What this changes about the earlier options

The static-corpus idea (SD) cannot serve pair-and-save, as the author noted —
saves mutate the live database and a snapshot cannot see them. That is what LD
is for. SD is not superseded: it is the only mode that works with BD switched
off and without a size cap, which is exactly what a third party needs while
developing, and what a public reader needs at 3 a.m.

See `external_collage_viewer.md` for the ancillary-tab direction, which is the
same-origin case and needs none of this.
