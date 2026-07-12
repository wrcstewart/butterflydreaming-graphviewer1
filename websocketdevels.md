# WebSocket → Socket.IO migration + surrounding work

Development log for the transport / connectivity work done 2026-07-11 → 2026-07-12. Kept as a topic doc (not a chronological changelog) so future work in this area starts from a shared understanding.

Previous transport docs are inline in server.js / viewer.js comments; this file consolidates the reasoning that isn't in the code.

---

## 1. Motivation — the pain that drove the migration

**Problem.** BD's pair chat used raw `ws://` (the `ws` npm package). On iOS Safari, the moment a paired user's phone locked (or the tab went into background), the WebSocket dropped inside ~30 seconds. When the user re-woke the phone, the client had no working session — chat froze silently until a full page reload. During dyad testing this made the pair mode essentially unusable on phones.

**Why raw ws behaves this way.** iOS suspends background tabs aggressively. When the tab is suspended:
- Outgoing pings can't fire → server hits its idle timeout and closes.
- Incoming server messages can't be delivered → they queue in the OS socket buffer, which the OS eventually GCs.
- On unsuspend, the ws object is stale but no `close` event has fired to the JS side yet.

`ws` gives you raw frames and no reconnection logic — everything above the byte layer is your problem.

**Alternatives considered.**
- **HTTP polling.** Discussed. Would work for the low-throughput chat we have, but re-implements what Socket.IO's polling transport already does.
- **Y.js / CRDT.** Discussed. Right shape for collaborative editing but too big a psychological pivot for the current card-swap model — deferred.
- **Server-Sent Events + POST.** Rejected as more custom code than Socket.IO for the same benefit.
- **Socket.IO.** Chosen. Battle-tested reconnection, session recovery, transport fallback (polling ↔ websocket), same programming model.

## 2. What Socket.IO actually buys us

Two things matter for our case:

**Auto-reconnect** is what most people know Socket.IO for — client keeps retrying with backoff after a drop.

**`connectionStateRecovery`** (Socket.IO 4.6+) is the interesting piece. When enabled server-side, on a fresh reconnect the client presents a signed session token issued at initial connect (in a `io` cookie). If the token matches a still-live server-side session record, the server:
- Sets `socket.recovered === true` on the reconnected socket.
- Restores `socket.data.*` (our `userId`, `deviceId`).
- Flushes any messages the server tried to emit *to that socket* while it was disconnected.

The recovery is authenticated — another browser can't forge the token and take over your userId.

**Config we use** (server.js):
```js
const io = new SocketIOServer(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 60 * 1000,   // 60 s
    skipMiddlewares: true,
  }
});
```

`skipMiddlewares: true` means the cookie-parsing middleware isn't re-run on recovery — we keep `socket.data.deviceId` from the original connect rather than re-reading the cookie. Cheap and correct because our deviceId is stable across the recovery window.

## 3. Grace-period purge — server-side pair persistence

`connectionStateRecovery` handles the socket-layer. Pair state (`sessions`, `pairedWith`) is *our* code, so we mirror the recovery idea:

On `disconnect`:
- Remove userId from `sessions` map → user_count immediately drops for the buddy.
- Schedule a 65 s **purge** timer (`schedulePurge(userId)`).
- **Do NOT clear `pairedWith`.**

On `connect` with `socket.recovered === true`:
- Look up the preserved userId from `socket.data.userId`.
- Restore into `sessions`, cancel the pending purge, rebroadcast user_count.
- Pair is intact because pairedWith was never cleared.

If purge fires (65 s elapsed with no recovery):
- Clear pairedWith on both sides, notify the buddy (unpair message).
- Delete the ephemeral Memgraph User node.

Why 65 s (vs. the 60 s Socket.IO window)? Buffer so the socket-layer recovery has fully rejected before our layer gives up. Otherwise a recovery arriving on the 60 s boundary races the purge.

## 4. Same-device pair refusal (MM3 — preserved through migration)

Server-issued cookie `bd_device_id` (UUID, 7-day Max-Age, HttpOnly false, SameSite Lax) identifies a browser instance. On `ready_to_pair`, if the arriver's `deviceId` equals `waitingUser.socket.data.deviceId`, refuse with `pair_denied: same_device`.

Why pair-time refusal instead of connect-time kick: connect-time kick killed dyad continuity when a user Jump-in'd from EV back to BD — the returning tab kicked the original BD tab, tearing down the pair. Pair-time refusal preserves the original session and only blocks *self*-pairing.

`pair_denied: same_device` deliberately does NOT close chat / player on the client. The refused arriver stays in "solo" state — Chat + Player active, just no dyad. Only `pair_denied: code_required` closes Chat.

7-day cookie: "if the user is prepared to hang about for a week to game the system they deserve to succeed" (user).

## 5. Migration mechanics — file-by-file

### server.js

- `require('ws')` → `const { Server: SocketIOServer } = require('socket.io');`
- `new WebSocketServer({ server })` → `new SocketIOServer(server, { connectionStateRecovery: … })`
- `wss.on('connection', (ws, req) => …)` → `io.on('connection', async (socket) => …)`
- `ws.userId` → `socket.data.userId`; `ws.deviceId` → `socket.data.deviceId`
- `ws.send(JSON.stringify(x))` → `socket.emit('msg', x)` (single 'msg' event with `type:` field — minimal-diff approach, no per-type Socket.IO events)
- `ws.on('message', h)` → `socket.on('msg', h)` (h receives the object directly, no JSON.parse)
- `ws.readyState === WebSocket.OPEN` → `socket.connected`
- `ws.close()` → `socket.disconnect()`
- New: `pendingPurges` Map + `schedulePurge` / `cancelPurge` / `executePurge` helpers
- New: cookie parser in the connect handler, sets `socket.data.deviceId`
- New: `if (socket.recovered) { … } else { create user }` branch on connect
- Preserved verbatim: pair guards (self-pair, same-device, curation code), Memgraph queries, media file logic

### viewer.js

- `new WebSocket(url)` → `io()` (same-origin, transport auto-select)
- `ws.addEventListener('message', h)` → `ws.on('msg', h)` (h receives object directly)
- `ws.removeEventListener('message', h)` → `ws.off('msg', h)`
- `ws.send(JSON.stringify(x))` → `ws.emit('msg', x)`
- `ws.readyState === WebSocket.OPEN` → `ws.connected`
- Kept the variable name `ws` throughout despite it being a Socket.IO Socket — minimal diff, fewer places to grep-and-check later.

### index.html

- Added `<script src="/socket.io/socket.io.js"></script>` before viewer.js. Auto-served by the socket.io server module.

### package.json

- Added `socket.io` dependency (removed `ws`? — check before next release; may still be transitively present via other deps).

## 6. Bugs found during and after the migration

### 6.1 Initial-emit race (commit 4e5451c)

Client did:
```js
ws.emit('msg', { type: 'get_user_count' });
ws.emit('msg', { type: 'get_media_files' });
ws.on('msg', msg => { … });   // handler attached AFTER
```
Worked under raw ws (browser buffered messages during script parsing) but broken under Socket.IO — events received by a socket with no listeners for that event are dropped by the client. Server's on-connect broadcast of user_count and its direct replies to the two get_* calls all landed before the handler existed. Symptom: laptop showed no "connected" indicator after page load.

**Fix:** Reorder — attach `ws.on('msg', …)` first, then fire the initial emits.

### 6.2 Over-eager Python bulk-replace (commit 87461b0)

The migration used a Python one-liner to convert `.addEventListener('message', h)` → `.on('msg', h)` and `.removeEventListener('message', h)` → `.off('msg', h)`. That was right for socket variables but caught two `window.addEventListener('message', …)` calls too — those are DOM postMessage listeners for iframe communication with V_Kolam, a completely unrelated transport that happens to share the "message" event name.

**Symptom:** `TypeError: window.on is not a function` — unhandled promise rejection.

**Fix:** Restore `window.addEventListener('message', h)` / `removeEventListener('message', h)` at those two call sites (bd_script_response inbound handler, MM1.6 BD_READY listener in loadModuleForNode). Grep after: no other `window.on('msg'` / `document.on('msg'` / `element.on('msg'` — clean.

**Lesson.** When bulk-rewriting a DOM-style event API to a socket-style one, restrict the pattern to `\bws\b|\bwsNow\b|\bsendWs\b\.on\('msg'` etc, or diff each hit manually. Anchoring on the receiver identifier avoids catching lookalike calls on unrelated objects.

### 6.3 Cytoscape wheelSensitivity warning (noise, not fixed)

`[WARN] You have set a custom wheel sensitivity. …` shows up in the terminal now that client warnings surface via the log-forwarding channel. Deferred — either drop the option (default sensitivity) or wrap the one warning to suppress it. Not urgent.

## 7. Client → server log forwarding (commit 8e61991)

Motivation: iOS Safari's Web Inspector requires cabling the phone to a Mac, which is inconvenient mid-dyad-test. During the `window.on` promise rejection above, the error was invisible in the terminal — only DevTools showed it.

**Mechanism.** viewer.js wraps `console.log/info/warn/error` at module load. Wrapper calls the original method first (so DevTools still receives everything normally) then emits `{ type: 'client_log', level, line }` to the socket. Also installs `window.addEventListener('error', …)` and `window.addEventListener('unhandledrejection', …)` so uncaught errors and rejected promises get forwarded even when app code didn't console.log them.

**Boot buffering.** Records emitted before the socket connects are queued in `__clientLogBuffer` (bounded to 500 entries, oldest dropped). `attachClientLogSocket(ws)` is called at both connect sites (initial connect in `init()`, transparent reconnect in `safeQuery()`) and flushes the buffer.

**Server side.** A new case at the top of the `msg` dispatch prints `[client:<userId>][LEVEL] <line>`, interleaving readably with existing `[BD] …` lines.

**Verified.** Test run 2026-07-12 showed both client and server logs interleaving cleanly during a full pair session, including through multiple `transport close` + `ping timeout` disconnect/recover cycles from an iOS device.

## 8. Verified behaviour (as of commit 8e61991)

- Fresh connect → user created, sessions++.
- Disconnect (transport close from iOS screen lock) → user_count drops immediately for buddy, purge scheduled at 65 s.
- Recovery within 60 s → `socket.recovered === true`, userId restored, purge cancelled, user_count restored. Pair intact. Conversation continues without user intervention.
- Multiple recovery cycles in one session — the sequence `disconnect (transport close) → Recovered → disconnect (ping timeout) → Recovered → disconnect (transport close)` all fired inside 60 s of each other and the pair survived every one.
- Same-device refusal at pair time still fires correctly (was verified pre-migration).
- Curation code gate on arriver still fires correctly (test with "ginger" code).
- Client `console.*` output visible in server terminal without cable to phone.

## 9. Known gaps

**In-flight buddy messages during grace period.** If buddy B emits to A (`sendToBuddy(B → A)`) during the window between A's disconnect and A's recovery, the server-side `sessions.get(A)` returns undefined and the message is silently dropped. Socket.IO's `connectionStateRecovery` only buffers messages the server actually *emitted to* the socket while disconnected — but our `sendToBuddy` skips the emit call when the session lookup misses, so those never enter the buffer.

Not a security issue. Not currently causing user-visible problems in testing (dyad conversations are turn-based and slow enough that this rarely happens). Fixable by:
- Option A: emit anyway and rely on Socket.IO to buffer (need to test that `sessions.get(A)?.emit('msg', …)` still buffers when the socket is technically disconnected but still within the recovery window).
- Option B: our own per-user pending-message queue, flushed on recovery.

Deferred until it actually bites.

**Wheel-sensitivity warning noise.** See §6.3.

## 10. Handoff — where to resume

Next work (per user, 2026-07-12): return to tab1 / tab2 dyad flow + EV integration. The transport foundation from this work is settled; the app-layer flows on top of it are the next surface.

Pointers into the code:
- Transport bootstrapping: [viewer.js:3192](viewer.js#L3192) `connectWS`, [viewer.js:3231](viewer.js#L3231) init retry loop
- Server connect handler: [server.js:493](server.js#L493) `socket.on('msg')`
- Grace-period purge: [server.js](server.js) `pendingPurges` + `schedulePurge` / `cancelPurge` / `executePurge`
- Client log forwarding: top of [viewer.js](viewer.js) (search `__forwardClientLog`), server dispatch `client_log` case

Related memory: `project_socketio_migration` in `~/.claude/projects/.../memory/`.
