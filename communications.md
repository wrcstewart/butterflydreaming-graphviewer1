# A42 — Buddy Communication Channel (`communications.md`)

**Status:** Design, largely built (A43–A47), amended 2026-07-15. Extends `cards_spec.md` §5 (Communication with partner).
**Depends on:** `cards_spec.md` (card model, panels, routing), the existing `breadcrumb` relay in `server.js`, and `pairingState` passed into `setupInteractions`.
**Companion memory:** `project_a42_card_stack_design.md`, `project_pairing.md`, `project_always_on_chat.md` (2026-07-15).

> **2026-07-15 amendment note.** "Entered chat mode" is now a **boot-time** signal, not a Chat-button press. The client sends `enter_chat` once, right after ws connects. There is no `leave_chat` any more — the equivalent user action is pressing **Leave** (formerly the Chat button, renamed), which sends `unpair` and lets the server drop "Partner disconnected." into the buddy's log via the existing unpair handler. §3 language referring to "the Chat toggle" and "enters chat mode by pressing Chat" should be read as "the client sends enter_chat once at boot"; the both-in-chat channel-open condition still holds, but is now always satisfied for both sides from the moment their sockets connect. Server-side `channelOpen` / `pairedWith` / `inChat` logic is unchanged. Fuller detail in `CHANGELOG.md` 2026-07-15 entry and memory `always-on-chat`.

> **How to read this document.** Sections marked **[SPEC]** describe agreed behaviour. Sections marked **[BUILD INSTRUCTION]** are directives to Claude Code where the relevant code location is not yet identified — Claude Code should locate the referenced code (the Chat toggle, the WebSocket setup, the `breadcrumb` handler, `pairingState`, the existing system/how-to card rendering) and wire the requirement in, matching existing conventions rather than introducing new ones.

---

## 1. Core principle — one inbound path, one rendering rule

**[SPEC]** Every inbound message arrives over the **single** WebSocket connection and renders the same way: a **tinted, read-only card prepended above the current top card**. There are **no dialog boxes or modal overlays** anywhere in this feature.

Inbound cards vary only by **tint** and **head label**, selected by a structured `channel` field on the message:

| Channel | Tint | Head | Numbered? | Used for |
|---|---|---|---|---|
| `system` | amber `#2c241a` | `System` | no | how-to card, connection-status messages, future notices |
| `partner` | teal `#16242c` | `N.M` | yes | messages from the paired buddy |

Local (composition) cards are unchanged: indigo, `N=k`, editable (`cards_spec.md` §2.1).

This collapses the previously-separate system-card and received-card paths into one handler. The how-to message, connection status, and partner messages are all just inbound cards differing by `channel`.

---

## 2. Anonymity

**[SPEC]** Everything is anonymous. No user id, viewer id, or display name appears in the protocol or UI. The earlier `from` field (`cards_spec.md` §5.2) is **dropped**. A card's origin is conveyed only by `channel` (`system` / `partner`), never by identity. The server's internal pairing handle (whatever `sendToBuddy(ws.userId, …)` keys on) stays server-side and never crosses the wire.

---

## 3. System cards (amber, unnumbered)

**[SPEC]** "System" means *unnumbered amber inbound card*. Any number may exist; each new one prepends above the previous. There is no longer a hardcoded client-side welcome/how-to prepend and no dialog.

System cards are used for:

- **The how-to card** — the existing tinted read-only instructional card that sits above `N=1`. It is now delivered as a `channel: 'system'` message rather than hardcoded client-side.
- **Connection status** — e.g. "You're chatting — try sending a message." / "Partner not available — please wait." Emitted by the server because connection/pairing state is a server-side fact (§5).

### 3.1 Server-emitted, single client path

**[BUILD INSTRUCTION]** All system cards are emitted by the **server** so the client has exactly one inbound rendering path and no hardcoded card text. On the relevant events the server sends:

```json
{ "type": "buddy_card", "channel": "system", "text": "<message text>" }
```

Events that produce a system card:
- **On Chat connect:** the how-to text, followed by the current connection-status message (partner present → "you're chatting"; partner absent → "please wait").
- **On partner connect / disconnect / enter-chat / leave-chat:** the updated connection-status message.

**[BUILD INSTRUCTION]** Locate the current how-to card's text and rendering. Move the text server-side (or have the server send it on connect) and make the client render it through the unified inbound handler instead of prepending it directly. Keep the card's existing amber tint and read-only behaviour.

### 3.2 Status-card accumulation

**[SPEC]** Connection-status cards **accumulate** — each connect/disconnect/enter-chat/leave-chat event prepends a new system card, leaving a running log of the session ("partner joined," "partner left"). This is a deliberate choice for the development phase: the pile-up is a visible record of channel events that aids debugging and verification. Status cards are **not** collapsed or self-replacing. If, in real use, the log proves too noisy, a later amendment can switch to replacing the most recent status card — but that is explicitly out of scope here.

---

## 4. Partner cards (teal, `N.M`)

### 4.1 Inbound message shape (server → client)

```json
{ "type": "buddy_card", "channel": "partner", "text": "<message text>" }
```

**[SPEC]** Rendered as a teal, non-editable, selectable card prepended above the current top, labelled `N.M`:

- `N` = the serial of the top local card at receipt time (`topLocalCard().serial`). Always ≥ 1, because `N=1` is guaranteed whenever Chat is operative (§5.1).
- `M` = a per-`N` counter incrementing per partner message, resetting naturally when a new local card creates a new `N`.

Example: on `N=1`, three partner messages arrive → `1.1`, `1.2`, `1.3`, newest on top, above `N=1`. User creates `N=2`; next arrival → `2.1`. Numbering is **frozen at receipt** — never re-rendered when later locals appear.

### 4.2 Required client additions

- `receivedCountByN`, a `Map<number, number>` keyed by local serial. A fresh `N` has no entry (defaults to 0 → first message `.1`).
- Extend `createCard` to accept `{ kind: 'received', parentN, label }` so the head renders `parentN.M`.
- Switch the received-card head from static `C` to computed `N.M`, and **drop the `· C` CSS `::after`** (`cards_spec.md` §2.2, §4.4).

### 4.3 Display

**[SPEC]** Teal `#16242c`, non-editable but selectable. The existing `copy` listener already routes a selection from a received card into the user's top local card (`cards_spec.md` §3.5) — unchanged.

---

## 5. Connection and pairing lifecycle

### 5.1 On Chat press

**[BUILD INSTRUCTION]** When the user presses **Chat**:

1. Guarantee `N=1` exists (already happens first-time-per-page-load, `cards_spec.md` §3.1). N is therefore always ≥ 1, so the partner-receive handler never faces a "no local card" case.
2. Establish the WebSocket connection if not already open. Reuse the existing socket that `breadcrumb` and the memgraph query path use — do **not** open a second socket. Chat press should trigger/assert that connection.
3. Signal to the server that this client has entered chat mode, so the server can pair it with a buddy who has also entered chat mode. Reuse `pairingState`'s presence tracking if it exists; otherwise add a lightweight in-chat presence signal.

On successful connect, the server emits the how-to system card and the initial connection-status system card (§3.1).

### 5.2 Pairing handshake

**[BUILD INSTRUCTION]** The server treats the channel as open only when **both** clients are in chat mode. Pairing itself already exists (`project_pairing.md`); this feature only adds the both-in-chat condition. Consult `pairingState`; do not reimplement pairing.

### 5.3 Unpaired behaviour

**[SPEC]** When unpaired or partner-absent, **Chat stays open**. `N=1` is present and the user composes locally as normal. A `channel: 'system'` "please wait" card is shown. The **Send** button is disabled (or fails visibly, §6.3) until a partner is present and in chat.

### 5.4 Future: AI bot fallback

**[SPEC, deferred]** When no human partner is available, a future AI bot will fill the conversational role; the "please wait" system card is the present placeholder. The unified inbound design makes this trivial: bot messages arrive on the same socket as `channel: 'partner'` (or a future `channel: 'bot'`) with no client changes beyond tint/label.

---

## 6. Send side

### 6.1 Send button

**[SPEC]** A **Send** button in `#chat-right-col` next to **New Card**, always visible in chat mode. On click it:

1. Reads the **whole** top local card text (`topLocalCard()` value, `cards_spec.md` §4.2).
2. Emits the outbound message (§6.2), carrying a client-generated `sendId` so the delivery ack can be correlated back to this card.

**[SPEC]** Send does **not** mutate the stack — the sent card **stays in place**, and no new card is created. (This revises `cards_spec.md` §5.1, which called for an auto-new-card after send.) New local cards come only from the **Copy** gesture (`cards_spec.md` §3.5) and the **New Card** button, so card creation stays explicit and the stack avoids accumulating empty cards after repeated sends.

**[SPEC]** Disabled when unpaired/partner-absent or when the top local card is empty. Re-evaluate on `pairingState` change and on input into the top local card — mirroring the **Save** button's enable/disable pattern against the dev-code box (`cards_spec.md` §3.6).

**[SPEC]** Re-sending the same card is harmless: it transmits again and, on the new ack, overwrites the existing delivered stamp (§6.5) with a fresh server timestamp. No protection against re-send is needed, which is why the auto-new-card is unnecessary.

### 6.2 Outbound message shape (client → server)

```json
{ "type": "buddy_card", "sendId": "<client-generated id>", "text": "<top local card text>" }
```

`sendId` is an opaque, client-local correlation id (e.g. a monotonic counter or random token) used only to match the delivery ack (§6.4) back to the originating card. It is **not** identity and is not forwarded to the partner. No `channel`, no `from` outbound — the server stamps `channel: "partner"` when relaying (§6.4). The client never sends identity or channel.

### 6.3 Disconnect / failure signalling

**[SPEC]** On disconnect, sends **fail visibly** (`cards_spec.md` §5.5):

- If `pairingState` shows disconnected/partner-absent at click time, block the send and surface it — either via the Save-button status-span pattern or by the server emitting a `channel: 'system'` "partner not available" card. Do **not** silently drop.
- A successful send is confirmed by a server delivery ack that stamps the sent card "delivered" (§6.4–§6.5); an absent partner yields a "partner not available" system card and no stamp, so success and failure are visually distinct on the sender's side.

### 6.4 Server relay

**[BUILD INSTRUCTION]** Add a `buddy_card` handler to `server.js`, modelled structurally on the existing **`breadcrumb`** handler (`cards_spec.md` §5.2). It must:

1. Look up the sender's partner via `sendToBuddy(ws.userId, …)`.
2. Forward to the recipient as:
   ```json
   { "type": "buddy_card", "channel": "partner", "text": "<text>" }
   ```
3. Use **no** memgraph session and **no** persistence — pure pass-through.
4. **On successful delivery to the partner,** send a delivery acknowledgement back to the **sender**, echoing the `sendId` and carrying a **server timestamp**:
   ```json
   { "type": "buddy_card_ack", "sendId": "<echoed id>", "deliveredAt": "<server ISO-8601 timestamp>" }
   ```
   "Successful delivery" means the partner's socket actually received the relayed message (the same condition under which the forward in step 2 succeeds), so the ack reflects genuine delivery, not merely server receipt of the send.
5. If the partner is absent/disconnected at relay time, do **not** send an ack; instead emit a `channel: 'system'` "partner not available" card back to the sender (consistent with §6.3). The sender's card therefore receives **no** delivered stamp, which correctly signals the message did not arrive.


### 6.5 Delivered stamp on the sent card

**[SPEC]** When the client receives a `buddy_card_ack`, it writes a **"delivered &lt;date&gt; &lt;time&gt;"** stamp into the header of the card whose `sendId` matches the ack. Details:

- The timestamp is the **server's** `deliveredAt` value (formatted for display), so both parties share one authoritative clock rather than the browser's.
- If the card already carries a delivered stamp (from a previous send of the same card), the new stamp **overwrites** it — never appended, so a card shows exactly one delivered time, always the most recent.
- The stamp lives in the card **header** (alongside the `N=k` label), not the body, so it never pollutes the composed text or any later send of that card.
- Until an ack arrives, the card carries **no** delivered stamp. A card that was sent to an absent partner (§6.4 step 5) therefore stays unstamped, visually distinguishing "delivered" from "attempted."

**[BUILD INSTRUCTION]** Match each ack to its card via the `sendId` recorded at send time (§6.2). Because Send no longer creates a new card and the user may have changed the top card by the time the ack returns, correlation must be by `sendId`, not by "current top card." Keep a small map of `sendId → card` for in-flight sends; clear the entry once stamped.

---

## 7. Minimal first vertical slice

Build in this order:

1. **Connection on Chat press** (§5.1) + **server-emitted system cards** for how-to and connection status (§3), including the unpaired "please wait" state (§5.3). This proves the unified inbound path end-to-end with no send/receive yet.
2. **Server `buddy_card` relay** (§6.4), cloned from `breadcrumb`.
3. **Send button** (§6.1) — whole-card send, pairing-gated, sent card stays in place (no new card), with the delivery ack + "delivered" header stamp (§6.4–§6.5).
4. **Partner receive handler** (§4) — teal `N.M` card via the unified inbound channel (§1).

Defer §5.4 (bot), `cards_spec.md` §5.6 extras, and `cards_spec.md` §6 persistence.

---

## 8. Open questions to resolve during build

- ~~**Status-card accumulation (§3.2):**~~ *resolved* — accumulate as a running log for the development phase (§3.2). Revisit only via a later amendment if real-world use proves noisy.
- **How-to delivery:** server-emitted on connect (recommended here, single client path) vs. kept as a client-side first card. This doc assumes server-emitted — confirm.
- **Server ack:** *resolved* — true delivery acknowledgement is in (§6.4–§6.5). The server emits `buddy_card_ack` with a server timestamp on genuine delivery; the sender's card is stamped "delivered &lt;server time&gt;" and re-sends overwrite the stamp. Absent-partner sends produce a "partner not available" system card and no stamp.
- **`M` reset visual:** confirmed reset-on-new-local and frozen-at-receipt. Sanity-check that a new local appearing among prior-`N` partner cards still reads sensibly in the stack.
