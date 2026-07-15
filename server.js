// server.js — ButterflyDreaming Graph Viewer server

const crypto  = require('crypto');
const fs      = require('fs');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const neo4j = require('neo4j-driver');

// Scan project directory for eligible media files (D_ = default, A_ = alternate).
// Restart server to pick up new files.
const mediaFiles = fs.readdirSync('.')
  .filter(f => /^[DA]_.*\.mp3$/i.test(f))
  .sort((a, b) => (a.startsWith('D_') ? 0 : 1) - (b.startsWith('D_') ? 0 : 1) || a.localeCompare(b))
  .map(f => ({ name: f, size: fs.statSync(f).size }));
console.log('[BD] Media files:', mediaFiles);

// Load curation code from gitignored config — absent = curation disabled, app still works.
let CURATION_CODE = null;
try {
  const cfg = require('./config');
  CURATION_CODE = cfg.CURATION_CODE || null;
} catch { /* no config or no CURATION_CODE — curation disabled */ }

const app = express();
app.use(express.json());

// MM3 (2026-07-12) — per-browser cookie for the cross-tab kick.
// Only issued on top-level HTML entry requests ( / and /index.html ) to
// avoid race-condition duplicate Set-Cookies from parallel asset requests.
// Value is a random UUID; lifetime 7 days (long enough to survive a
// weekend browser restart, short enough not to feel like tracking).
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const cookie = req.headers.cookie || '';
    if (!/(?:^|;\s*)bd_device_id=/.test(cookie)) {
      const id = crypto.randomUUID();
      res.setHeader(
        'Set-Cookie',
        `bd_device_id=${id}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
      );
    }
  }
  next();
});

// HTML must never be cached — otherwise the browser keeps requesting old
// ?v= numbers and never picks up new CSS/JS. CSS/JS themselves are cache-
// busted via the ?v= query so they CAN be cached aggressively.
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// A42 §42.2 — expose the V_Kolam visual module bundle. Path was /visual1/
// originally; renamed to /bd_V_Kolam/ 2026-07-05 (MM1 amendment full URL
// rename). On-disk directory stays as V_Kolam/ — only the served path
// changes. Same no-cache treatment for HTML as the root static, otherwise
// iframe edits get browser-cached and never surface.
app.use('/bd_V_Kolam', express.static('./V_Kolam', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

// MM2 (2026-07-11) — HTTP endpoints for the External Viewer's default-node
// and prev/next sibling navigation. Uses the `hasModuleScript` property
// (set by migrate_mm2.js) plus a min/max-seq boundary check. All numeric
// values returned as plain JS numbers.

const toNum = (v) => (v && typeof v.toNumber === 'function' ? v.toNumber() : v);

function serializeNode(props) {
  return {
    script:      props.text        || '',
    node_url:    props.url         || null,
    source_text: props.source_text || null,
    title:       props.title       || null,
    name:        props.name        || null,
    seq:         toNum(props.seq   ?? null)
  };
}

// GET /api/module-default?module=<id>
// Returns the first content node (min seq) tagged hasModuleScript=<id>,
// plus isFirst (always true) + isLast (true iff module has exactly one node).
app.get('/api/module-default', async (req, res) => {
  const module = req.query.module;
  if (!module || typeof module !== 'string') {
    return res.status(400).json({ error: 'missing module param' });
  }
  const session = driver.session({ database: 'memgraph' });
  try {
    const firstResult = await session.run(
      `MATCH (n:TextNode)
       WHERE n.hasModuleScript = $module
         AND (n.gateway IS NULL OR n.gateway = false)
       RETURN n ORDER BY n.seq ASC LIMIT 1`,
      { module }
    );
    if (firstResult.records.length === 0) {
      return res.status(404).json({ error: 'no default node found' });
    }
    const countResult = await session.run(
      `MATCH (n:TextNode)
       WHERE n.hasModuleScript = $module
         AND (n.gateway IS NULL OR n.gateway = false)
       RETURN count(n) AS c`,
      { module }
    );
    const count = toNum(countResult.records[0].get('c'));
    const props = firstResult.records[0].get('n').properties || {};
    res.set('Cache-Control', 'no-store');
    res.json({
      ...serializeNode(props),
      isFirst: true,
      isLast: count === 1
    });
  } catch (err) {
    console.error('[BD] /api/module-default error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/module-sibling?node_url=<url>&direction=next|prev
// Returns the adjacent sibling under the same hasModuleScript module.
// LIMIT 2 trick: 0 rows → { node_url: null } (edge). 1 row → sibling +
// boundary flag. 2 rows → sibling + more beyond.
app.get('/api/module-sibling', async (req, res) => {
  const nodeUrl   = req.query.node_url;
  const direction = req.query.direction;
  if (!nodeUrl || typeof nodeUrl !== 'string') {
    return res.status(400).json({ error: 'missing node_url param' });
  }
  if (direction !== 'next' && direction !== 'prev') {
    return res.status(400).json({ error: 'direction must be next or prev' });
  }
  const dirOp    = direction === 'next' ? '>'   : '<';
  const dirOrder = direction === 'next' ? 'ASC' : 'DESC';

  const session = driver.session({ database: 'memgraph' });
  try {
    const currResult = await session.run(
      `MATCH (n:TextNode {url: $url})
       RETURN n.seq AS seq, n.hasModuleScript AS mod`,
      { url: nodeUrl }
    );
    if (currResult.records.length === 0) {
      return res.status(404).json({ error: 'current node not found' });
    }
    const currSeq = toNum(currResult.records[0].get('seq'));
    const module  = currResult.records[0].get('mod');
    if (!module) {
      return res.status(400).json({ error: 'current node has no hasModuleScript' });
    }
    // Fetch up to 2 in the requested direction; presence of the 2nd tells us
    // whether the sibling is on the boundary of the module in that direction.
    const sibResult = await session.run(
      `MATCH (n:TextNode)
       WHERE n.hasModuleScript = $module
         AND n.seq ${dirOp} $currSeq
         AND (n.gateway IS NULL OR n.gateway = false)
       RETURN n ORDER BY n.seq ${dirOrder} LIMIT 2`,
      { module, currSeq }
    );
    res.set('Cache-Control', 'no-store');
    if (sibResult.records.length === 0) {
      return res.json({ node_url: null });
    }
    const hasMoreInDir = sibResult.records.length === 2;
    const props = sibResult.records[0].get('n').properties || {};
    return res.json({
      ...serializeNode(props),
      // If we arrived via NEXT, we came from something with a smaller seq,
      // so there IS a prev — isFirst false. Symmetric for PREV.
      isFirst: direction === 'prev' ? !hasMoreInDir : false,
      isLast:  direction === 'next' ? !hasMoreInDir : false
    });
  } catch (err) {
    console.error('[BD] /api/module-sibling error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

const server = app.listen(8080, () =>
  console.log('ButterflyDreaming viewer running at http://localhost:8080')
);

// Warm up Memgraph on startup and then keep it warm every 5 minutes,
// independent of any client sessions, so navigations never hit a cold start.
async function pingMemgraph() {
  try {
    const s = driver.session({ database: 'memgraph' });
    await s.run('RETURN 1');
    await s.close();
  } catch (err) {
    console.error('[BD] Memgraph keepalive error:', err.message);
  }
}
pingMemgraph().then(() => console.log('[BD] Memgraph connection warmed up'));
setInterval(pingMemgraph, 5 * 60 * 1000);

// Socket.IO server (2026-07-13) — replaces raw `ws` WebSocketServer.
// connectionStateRecovery gives us the mobile-friendly resilience that the
// bare ws was missing: on a client reconnect within the disconnection
// window (60 s), Socket.IO restores the session (rooms, ID, buffered
// events) transparently. iOS Safari tab-suspension → screen-off →
// screen-on → reconnect within 60 s: session and pair survive.
// skipMiddlewares means the auth/etc. path (we don't have one yet) isn't
// re-run on recovery.
const io = new SocketIOServer(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 60 * 1000,
    skipMiddlewares: true,
  }
});

// --- Pairing state ---

const sessions    = new Map();  // userId → socket (Socket.IO Socket)
let   waitingUser = null;        // { userId, socket } | null
const pairedWith  = new Map();  // userId → buddyUserId
const inChat      = new Map();  // userId → boolean (true ⇒ chat panel open)
const howToSent   = new Set();  // userIds that have already received the how-to card this session

// Post-Socket.IO migration (2026-07-13). Grace-period purge timers:
// on disconnect we remove the user from `sessions` immediately (so
// user_count is accurate) BUT we defer pair/state teardown by 65 s.
// If the client reconnects within that window (Socket.IO's
// connectionStateRecovery), the new connection handler cancels the
// pending purge and refreshes the sessions entry — buddy never sees a
// buddy_disconnected. If no reconnect, the timer fires and we tear
// down the pair, notify the buddy, and clean up.
const pendingPurges = new Map();  // userId → timer handle

// MM3 (2026-07-12, revised) — anti-self-pair. Cookie parse in the
// connection handler stamps socket.data.deviceId, and ready_to_pair
// refuses to pair two sockets with the same deviceId. Rationale: an
// earlier connect-time kick attempt broke dyad continuity when a user
// returned from EV via Jump-in — their original paired BD tab got
// kicked, tearing down their pair with the remote partner. The
// pair-time check preserves the paired session and only refuses at the
// specific gaming moment (same-device self-pair).

function sendToBuddy(userId, msg) {
  const buddyId = pairedWith.get(userId);
  if (!buddyId) return;
  const buddy = sessions.get(buddyId);
  if (buddy && buddy.connected) buddy.emit('msg', msg);
}

// --- A43 chat-channel helpers ---

const HOW_TO_TEXT =
  'Click a node to start the conversation or type your own message. '
  + 'If you select text and copy, it will appear on your next card up. '
  + 'Try it out now — select and copy this line! '
  + 'Start a new card if you wish. Send your top card to partner.';

// Channel "open" requires both users paired AND both currently in chat mode.
function channelOpen(userId) {
  const buddyId = pairedWith.get(userId);
  if (!buddyId) return false;
  return inChat.get(userId) === true && inChat.get(buddyId) === true;
}

function sendSystemCard(userId, text) {
  const socket = sessions.get(userId);
  if (socket && socket.connected) {
    socket.emit('msg', { type: 'buddy_card', channel: 'system', text });
  }
}

function sendHowToOnce(userId) {
  if (howToSent.has(userId)) return;
  howToSent.add(userId);
  sendSystemCard(userId, HOW_TO_TEXT);
}

// Current connection-status text for `userId`.
function statusTextFor(userId) {
  if (channelOpen(userId)) return "You're chatting — try putting a message above.";
  return 'Partner not available — please wait.';
}

function broadcastUserCount() {
  const payload = { type: 'user_count', count: sessions.size };
  for (const s of sessions.values()) {
    if (s.connected) s.emit('msg', payload);
  }
}

function broadcastCorpusUpdate(msg) {
  for (const s of sessions.values()) {
    if (s.connected) s.emit('msg', msg);
  }
}

// Grace-period purge helpers (Socket.IO migration 2026-07-13).
function schedulePurge(userId) {
  if (!userId) return;
  cancelPurge(userId);
  const timer = setTimeout(() => {
    pendingPurges.delete(userId);
    executePurge(userId);
  }, 65 * 1000);
  pendingPurges.set(userId, timer);
}

function cancelPurge(userId) {
  const timer = pendingPurges.get(userId);
  if (timer) {
    clearTimeout(timer);
    pendingPurges.delete(userId);
  }
}

async function executePurge(userId) {
  if (!userId) return;
  // Recovery race: if a socket is now live under this userId, skip purge.
  const currentSocket = sessions.get(userId);
  if (currentSocket && currentSocket.connected) {
    console.log(`[BD] Purge skipped: ${userId} has a live socket`);
    return;
  }
  console.log(`[BD] Purging user (no recovery): ${userId}`);
  if (waitingUser?.userId === userId) waitingUser = null;
  const buddyId = pairedWith.get(userId);
  if (buddyId) {
    if (inChat.get(userId) && inChat.get(buddyId)) {
      sendSystemCard(buddyId, 'Partner disconnected.');
    }
    pairedWith.delete(userId);
    pairedWith.delete(buddyId);
    const buddySocket = sessions.get(buddyId);
    if (buddySocket && buddySocket.connected) {
      buddySocket.emit('msg', { type: 'buddy_disconnected' });
    }
  }
  inChat.delete(userId);
  howToSent.delete(userId);
  try {
    const s = driver.session({ database: 'memgraph' });
    try {
      await s.run(
        'MATCH (u:User {viewer_id: $uid}) DETACH DELETE u',
        { uid: userId }
      );
      console.log(`[BD] User deleted: ${userId}`);
    } finally {
      await s.close();
    }
  } catch (err) {
    console.error('[BD] User delete error:', err.message);
  }
}

// --- Serialisation ---
// neo4j-driver returns typed objects (Integer, DateTime, Node, Relationship).
// These must be converted to plain JS before JSON.stringify.

function serializeValue(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
  if (typeof val === 'object' && val.constructor &&
      ['DateTime','LocalDateTime','Date','Time','LocalTime','Duration']
        .includes(val.constructor.name)) return val.toString();
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = serializeValue(val[k]);
    return out;
  }
  return val;
}

function serializeProps(props) {
  if (!props) return {};
  const out = {};
  for (const k of Object.keys(props)) out[k] = serializeValue(props[k]);
  return out;
}

function serializeEntity(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  if (Array.isArray(entity.labels)) {
    return {
      labels: entity.labels,
      properties: serializeProps(entity.properties),
      elementId: entity.elementId ?? entity.identity.toString(),
    };
  }
  if (typeof entity.type === 'string' && entity.properties !== undefined) {
    return {
      type: entity.type,
      properties: serializeProps(entity.properties),
      elementId: entity.elementId ?? entity.identity.toString(),
    };
  }
  return serializeValue(entity);
}

function serializeRecord(rec) {
  const obj = {};
  for (const key of rec.keys) obj[key] = serializeEntity(rec.get(key));
  return obj;
}

// --- Socket.IO connection handler (2026-07-13 migration from raw ws) ---

io.on('connection', async (socket) => {
  // Parse the bd_device_id cookie into socket.data.deviceId. Used by the
  // ready_to_pair handler to refuse same-device self-pair (MM3). Cookie
  // survives across recovery on socket.data — no need to re-parse.
  {
    const cookieHeader = (socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) || '';
    const m = cookieHeader.match(/(?:^|;\s*)bd_device_id=([\w-]+)/);
    if (m) socket.data.deviceId = m[1];
  }

  if (socket.recovered) {
    // Reconnection within the 60 s recovery window. socket.data.userId is
    // preserved across recovery, so we can re-register the socket without
    // creating a new Memgraph User node. Any pending purge is cancelled —
    // the buddy never sees a buddy_disconnected.
    const userId = socket.data.userId;
    if (userId) {
      sessions.set(userId, socket);
      if (waitingUser?.userId === userId) waitingUser.socket = socket;
      cancelPurge(userId);
      broadcastUserCount();
      console.log(`[BD] Recovered: ${userId}`);
    }
  } else {
    // Fresh connection — create ephemeral User node in Memgraph.
    // viewer_id = 'N_<memgraph integer id>' prevents any ID collision with
    // corpus nodes (same N_ prefix rule as cf_ for edges).
    socket.data.userId = null;
    try {
      const s = driver.session({ database: 'memgraph' });
      try {
        const result = await s.run(
          'CREATE (u:User {created_at: datetime()}) ' +
          "WITH u, 'N_' + toString(id(u)) AS vid " +
          'SET u.viewer_id = vid ' +
          'RETURN u.viewer_id AS viewer_id'
        );
        const viewer_id = result.records[0]?.get('viewer_id') ?? null;
        socket.data.userId = viewer_id;
        if (viewer_id) { sessions.set(viewer_id, socket); broadcastUserCount(); }
        console.log(`[BD] User created: ${viewer_id}`);
      } finally {
        await s.close();
      }
    } catch (err) {
      console.error('[BD] User create error:', err.message);
    }
  }

  // Socket.IO handles heartbeat/keepalive at the protocol layer — no need
  // for the old setInterval ws.ping() loop.

  socket.on('disconnect', (reason) => {
    const userId = socket.data.userId;
    if (!userId) return;
    // Remove from sessions immediately so user_count broadcasts reflect the
    // true active-connection state right away. Pair teardown is deferred by
    // schedulePurge — if the client reconnects within 65 s (Socket.IO's
    // connectionStateRecovery window + safety margin), we cancel the purge
    // and the pair survives.
    if (sessions.get(userId) === socket) sessions.delete(userId);
    broadcastUserCount();
    schedulePurge(userId);
    console.log(`[BD] Disconnected: ${userId} (reason: ${reason}) — grace period 65 s`);
  });

  socket.on('msg', async (msg) => {
    let type;
    try {
      type = msg && msg.type;
      // Client → server log forwarding. Every client's console.log /
      // .info / .warn / .error, plus its uncaught errors and unhandled
      // promise rejections, arrive as these records. Print them here so
      // the operator can watch a mobile client's runtime from the same
      // terminal that shows the server logs, no cable to DevTools
      // required.
      if (msg.type === 'client_log') {
        const uid = socket.data.userId || '???';
        const lvl = (msg.level || 'log').toUpperCase();
        console.log(`[client:${uid}][${lvl}] ${msg.line}`);
        return;
      }
      if (msg.type === 'ready_to_pair') {
        if (!socket.data.userId) return;
        console.log(`[BD] ready_to_pair from ${socket.data.userId}  waitingUser=${waitingUser?.userId ?? 'null'}  sessions=${sessions.size}`);
        // Self-pair guard: if this same user is already sitting in the wait
        // slot, treat the second ready_to_pair as re-affirming their wait,
        // not as a pair-up. Prevents "paired with self" when a client
        // re-sends ready_to_pair after a Chat toggle-off+on cycle that the
        // server didn't tear down (e.g., because it predates the unpair
        // handler, or because two ready_to_pair calls raced past a single
        // unpair).
        if (waitingUser && waitingUser.userId === socket.data.userId) {
          socket.emit('msg', { type: 'wait_state' });
          console.log(`[BD]   → self-pair guard: re-affirm Waiting`);
          return;
        }
        if (waitingUser === null) {
          // First one in — no code gate. Sitting alone in the queue is
          // harmless (no one to talk to yet).
          waitingUser = { userId: socket.data.userId, socket };
          socket.emit('msg', { type: 'wait_state' });
          console.log(`[BD] Waiting: ${socket.data.userId}`);
        } else {
          // MM3 revised (2026-07-12) — same-device pair refusal. Two ws
          // from the same browser instance (identical bd_device_id cookie)
          // must never pair with each other — that would let one user
          // self-pair by opening two tabs. Refuse this arriver; the
          // waitingUser slot keeps its current occupant.
          if (
            socket.data.deviceId &&
            waitingUser.socket && waitingUser.socket.data.deviceId &&
            waitingUser.socket.data.deviceId === socket.data.deviceId
          ) {
            socket.emit('msg', { type: 'pair_denied', reason: 'same_device' });
            console.log(`[BD] Pair denied (same_device): ${socket.data.userId} ↔ ${waitingUser.userId}`);
            return;
          }
          // Would pair up. If a curation code is configured on this
          // server, gate the ARRIVER (the one who completes the pair).
          // Rationale: the developer can sit as waitingUser during dev
          // testing without needing to enter their own code; but a random
          // arriving to complete the pair must present a valid code, so
          // the system can't be used for unmonitored anonymous chatting.
          if (CURATION_CODE) {
            const codeOk = msg.code && msg.code.length === CURATION_CODE.length &&
              crypto.timingSafeEqual(Buffer.from(msg.code), Buffer.from(CURATION_CODE));
            if (!codeOk) {
              socket.emit('msg', { type: 'pair_denied', reason: 'code_required' });
              console.log(`[BD] Pair denied (no/bad code): ${socket.data.userId}`);
              return;
            }
          }
          const buddy = waitingUser;
          waitingUser = null;
          pairedWith.set(socket.data.userId, buddy.userId);
          pairedWith.set(buddy.userId, socket.data.userId);
          socket.emit('msg', { type: 'paired', buddyId: buddy.userId });
          buddy.socket.emit('msg', { type: 'paired', buddyId: socket.data.userId });
          console.log(`[BD] Paired: ${socket.data.userId} ↔ ${buddy.userId}`);
        }
        return;
      }
      if (msg.type === 'get_user_count') {
        socket.emit('msg', { type: 'user_count', count: sessions.size });
        return;
      }
      if (msg.type === 'get_media_files') {
        socket.emit('msg', { type: 'media_files', files: mediaFiles });
        return;
      }
      if (msg.type === 'breadcrumb') {
        if (socket.data.userId) sendToBuddy(socket.data.userId, { type: 'buddy_breadcrumb', data: msg.data });
        return;
      }
      if (msg.type === 'enter_chat') {
        if (!socket.data.userId) return;
        inChat.set(socket.data.userId, true);
        sendHowToOnce(socket.data.userId);
        sendSystemCard(socket.data.userId, statusTextFor(socket.data.userId));
        // Client uses this to drop in N=1 above the initial how-to + status.
        // Sent every enter_chat; client handles idempotently. A/B layout
        // consistency is enforced on the client by the system-card pinning
        // rule in prependSystemCard (see [[system-card-placement]]), not by
        // the order of these emits.
        socket.emit('msg', { type: 'chat_ready' });
        const buddyId = pairedWith.get(socket.data.userId);
        if (buddyId && inChat.get(buddyId)) {
          // Partner is also in chat — one combined card instead of two
          // ("Partner joined" + status), since the status at this moment
          // is unambiguously "You're chatting".
          sendSystemCard(buddyId, 'Partner joined chat — try putting a message above.');
        }
        return;
      }
      if (msg.type === 'leave_chat') {
        if (!socket.data.userId) return;
        inChat.set(socket.data.userId, false);
        const buddyId = pairedWith.get(socket.data.userId);
        if (buddyId && inChat.get(buddyId)) {
          sendSystemCard(buddyId, 'Partner left chat.');
        }
        return;
      }
      // Voluntary unpair (Chat toggle-off) — the local user is walking away
      // from this pairing but their WS stays open. Mirrors the on('close')
      // teardown: clear pairedWith, notify buddy so they re-queue via
      // buddy_disconnected. Also drop the "Partner disconnected" system card
      // in the buddy's chat log if both were in chat (same courtesy as
      // ws.on('close')). Does NOT re-queue the initiator — they must press
      // Chat again to look for a new partner.
      if (msg.type === 'unpair') {
        if (!socket.data.userId) return;
        const wasWaiting = waitingUser?.userId === socket.data.userId;
        if (wasWaiting) waitingUser = null;
        const buddyId = pairedWith.get(socket.data.userId);
        if (buddyId) {
          if (inChat.get(socket.data.userId) && inChat.get(buddyId)) {
            sendSystemCard(buddyId, 'Partner disconnected.');
          }
          pairedWith.delete(socket.data.userId);
          pairedWith.delete(buddyId);
          const buddy = sessions.get(buddyId);
          if (buddy && buddy.connected) {
            buddy.emit('msg', { type: 'buddy_disconnected' });
          }
          console.log(`[BD] Unpair: ${socket.data.userId} left ${buddyId}`);
        } else if (wasWaiting) {
          console.log(`[BD] Unpair: ${socket.data.userId} left the wait queue`);
        } else {
          console.log(`[BD] Unpair: ${socket.data.userId} was neither waiting nor paired`);
        }
        return;
      }
      if (msg.type === 'buddy_card') {
        // Outbound from client (Send button). communications.md §6.2/§6.4.
        // No persistence — pure pass-through with a delivery ack on success.
        if (!socket.data.userId) return;
        const text = typeof msg.text === 'string' ? msg.text : '';
        const sendId = msg.sendId;
        if (!channelOpen(socket.data.userId)) {
          sendSystemCard(socket.data.userId, 'Partner not available — please wait.');
          return;
        }
        const buddyId = pairedWith.get(socket.data.userId);
        const buddy = sessions.get(buddyId);
        if (buddy && buddy.connected) {
          buddy.emit('msg', { type: 'buddy_card', channel: 'partner', text });
          socket.emit('msg', {
            type: 'buddy_card_ack',
            sendId,
            deliveredAt: new Date().toISOString(),
          });
        } else {
          sendSystemCard(socket.data.userId, 'Partner not available — please wait.');
        }
        return;
      }
      if (msg.type === 'write_hints') {
        if (!CURATION_CODE) {
          socket.emit('msg', { type: 'write_hints', error: 'curation_disabled' });
          return;
        }
        const now = Date.now();
        if (socket.data._lastHintWrite && now - socket.data._lastHintWrite < 8000) {
          socket.emit('msg', { type: 'write_hints', error: 'rate_limited' });
          return;
        }
        const codeOk = msg.code && msg.code.length === CURATION_CODE.length &&
          crypto.timingSafeEqual(Buffer.from(msg.code), Buffer.from(CURATION_CODE));
        if (!codeOk) {
          socket.emit('msg', { type: 'write_hints', error: 'bad_code' });
          return;
        }
        socket.data._lastHintWrite = now;
        const s = driver.session({ database: 'memgraph' });
        try {
          await s.run(
            'UNWIND $hints AS h ' +
            'MATCH ()-[r]-() WHERE id(r) = toInteger(h.relId) ' +
            'SET r.hint_x = h.hint_x, r.hint_y = h.hint_y, r.hint_scale = h.hint_scale',
            { hints: msg.hints }
          );
          socket.emit('msg', { type: 'write_hints', ok: true, count: msg.hints.length });
          console.log(`[BD] Hints written: ${msg.hints.length} edges by ${socket.data.userId}`);
        } catch (err) {
          console.error('[BD] write_hints error:', err.message);
          socket.emit('msg', { type: 'write_hints', error: err.message });
        } finally {
          await s.close();
        }
        return;
      }
      if (msg.type === 'edit_save' || msg.type === 'edit_delete') {
        if (!CURATION_CODE) {
          socket.emit('msg', { type: msg.type, error: 'curation_disabled' });
          return;
        }
        const { textNodeUrl, clusterName, work, props } = msg;
        const s = driver.session({ database: 'memgraph' });
        try {
          const tx = s.beginTransaction();
          try {
            // Delete existing CLUSTER_REL (idempotent — fine if it doesn't exist)
            await tx.run(
              'MATCH (n:TextNode {url: $url})-[r:CLUSTER_REL]->(c:Cluster {name: $clusterName}) DELETE r',
              { url: textNodeUrl, clusterName }
            );
            if (msg.type === 'edit_save') {
              await tx.run(
                'MATCH (n:TextNode {url: $url}), (c:Cluster {name: $clusterName}) ' +
                'CREATE (n)-[r:CLUSTER_REL]->(c) SET r += $props',
                { url: textNodeUrl, clusterName, props: props || {} }
              );
            }
            // Refresh n_r — OPTIONAL MATCH + WHERE with null-guard handles the zero-count case
            // (a plain MATCH would return no rows when all edges are gone, leaving n_r stale)
            const nrResult = await tx.run(
              'MATCH (c:Cluster {name: $name}) ' +
              'OPTIONAL MATCH (n:TextNode)-[:CLUSTER_REL]->(c) ' +
              'WITH c, n WHERE n IS NULL OR (n.gateway = false AND n.section_title IS NULL) ' +
              'WITH c, count(n) AS total SET c.n_r = total RETURN total',
              { name: clusterName }
            );
            const n_r = nrResult.records[0]?.get('total').toNumber() ?? 0;
            // Refresh CONTAINS_CLUSTER count — MERGE creates the edge on first association
            const ccResult = await tx.run(
              'MATCH (gw:TextNode {gateway: true, source_text: $work}), (c:Cluster {name: $name}) ' +
              'MERGE (gw)-[r:CONTAINS_CLUSTER]->(c) ' +
              'WITH r ' +
              'OPTIONAL MATCH (n:TextNode {source_text: $work})-[:CLUSTER_REL]->(c) ' +
              'WITH r, n WHERE n IS NULL OR (n.gateway = false AND n.section_title IS NULL) ' +
              'WITH r, count(n) AS total SET r.count = total RETURN total AS cc_count',
              { name: clusterName, work }
            );
            const cc_count = ccResult.records[0]?.get('cc_count').toNumber() ?? 0;
            await tx.commit();
            const eventType = msg.type === 'edit_save' ? 'cluster_rel_saved' : 'cluster_rel_deleted';
            socket.emit('msg', { type: msg.type, ok: true });
            broadcastCorpusUpdate({ type: eventType, textNodeUrl, clusterName, work, props: props || {}, n_r, cc_count });
            console.log(`[BD] ${eventType}: ${textNodeUrl} → ${clusterName} (n_r=${n_r}, cc_count=${cc_count})`);
          } catch (err) {
            await tx.rollback();
            throw err;
          }
        } catch (err) {
          console.error(`[BD] ${msg.type} error:`, err.message);
          socket.emit('msg', { type: msg.type, error: err.message });
        } finally {
          await s.close();
        }
        return;
      }
      if (msg.type === 'edit_clone_cluster') {
        if (!CURATION_CODE) {
          socket.emit('msg', { type: 'edit_clone_cluster', error: 'curation_disabled' });
          return;
        }
        const { sourceName, newName } = msg;
        if (!sourceName || !newName) {
          socket.emit('msg', { type: 'edit_clone_cluster', error: 'missing_params' });
          return;
        }
        const s = driver.session({ database: 'memgraph' });
        try {
          const checkResult = await s.run(
            'MATCH (c:Cluster {name: $newName}) RETURN c LIMIT 1',
            { newName }
          );
          if (checkResult.records.length > 0) {
            socket.emit('msg', { type: 'edit_clone_cluster', error: 'name_exists' });
            return;
          }
          await s.run(
            'MATCH (src:Cluster {name: $sourceName}) ' +
            'CREATE (c:Cluster { name: $newName, display_name: $newName, label: $newName, n_r: 0 })',
            { sourceName, newName }
          );
          // Copy all DESCENDS_FROM edges from the source cluster. No label constraint
          // on the parent so sub-families (also :Family in Memgraph) are included.
          await s.run(
            'MATCH (parent)-[r:DESCENDS_FROM]-(src:Cluster {name: $sourceName}) ' +
            'WHERE NOT parent:Cluster ' +
            'MATCH (c:Cluster {name: $newName}) ' +
            'CREATE (parent)-[:DESCENDS_FROM {weight: r.weight}]->(c)',
            { sourceName, newName }
          );
          const result = await s.run(
            'MATCH (c:Cluster {name: $newName}) RETURN c',
            { newName }
          );
          const node = result.records[0].get('c');
          const newCluster = {
            id: node.elementId ?? node.identity.toString(),
            ...serializeProps(node.properties),
          };
          // Return parent family names+weights so client can add edges to Cytoscape
          const parentsResult = await s.run(
            'MATCH (parent)-[r:DESCENDS_FROM]-(c:Cluster {name: $newName}) ' +
            'WHERE NOT parent:Cluster ' +
            'RETURN parent.name AS fname, r.weight AS weight',
            { newName }
          );
          const parents = parentsResult.records.map(rec => ({
            fname:  rec.get('fname'),
            weight: serializeValue(rec.get('weight')),
          }));
          socket.emit('msg', { type: 'edit_clone_cluster', ok: true });
          broadcastCorpusUpdate({ type: 'cluster_cloned', newCluster, sourceName, parents });
          console.log(`[BD] cluster_cloned: ${newName} from ${sourceName} (${parents.length} parent(s): ${parents.map(p => p.fname).join(', ') || 'none'})`);
        } catch (err) {
          console.error('[BD] edit_clone_cluster error:', err.message);
          socket.emit('msg', { type: 'edit_clone_cluster', error: err.message });
        } finally {
          await s.close();
        }
        return;
      }
      if (msg.type === 'edit_node_text') {
        if (!CURATION_CODE) {
          socket.emit('msg', { type: 'edit_node_text', error: 'curation_disabled' });
          return;
        }
        const codeOk = msg.code && msg.code.length === CURATION_CODE.length &&
          crypto.timingSafeEqual(Buffer.from(msg.code), Buffer.from(CURATION_CODE));
        if (!codeOk) {
          socket.emit('msg', { type: 'edit_node_text', error: 'bad_code' });
          return;
        }
        const allowed = ['Root', 'Entry', 'Family', 'Cluster'];
        if (!allowed.includes(msg.label)) {
          socket.emit('msg', { type: 'edit_node_text', error: 'invalid_label' });
          return;
        }
        if (typeof msg.name !== 'string' || !msg.name.length) {
          socket.emit('msg', { type: 'edit_node_text', error: 'missing_name' });
          return;
        }
        if (typeof msg.text !== 'string') {
          socket.emit('msg', { type: 'edit_node_text', error: 'missing_text' });
          return;
        }
        const s = driver.session({ database: 'memgraph' });
        try {
          const result = await s.run(
            'MATCH (n) WHERE $label IN labels(n) AND n.name = $name ' +
            'SET n.text = $text RETURN count(n) AS c',
            { label: msg.label, name: msg.name, text: msg.text }
          );
          const rec   = result.records[0];
          const count = rec ? (rec.get('c').toNumber ? rec.get('c').toNumber() : rec.get('c')) : 0;
          if (!count) {
            socket.emit('msg', { type: 'edit_node_text', error: 'node_not_found' });
          } else {
            socket.emit('msg', { type: 'edit_node_text', ok: true, count });
            console.log(`[BD] edit_node_text: ${msg.label} "${msg.name}" updated by ${socket.data.userId}`);
          }
        } catch (err) {
          console.error('[BD] edit_node_text error:', err.message);
          socket.emit('msg', { type: 'edit_node_text', error: err.message });
        } finally {
          await s.close();
        }
        return;
      }
      if (!msg.query) return;  // ignore keepalive pings and other non-query messages
      const session = driver.session({ database: 'memgraph' });
      try {
        const result = await session.run(msg.query, msg.params || {});
        socket.emit('msg', { type, records: result.records.map(serializeRecord) });
      } finally {
        await session.close();
      }
    } catch (err) {
      console.error('Query error:', err.message);
      socket.emit('msg', { type, error: err.message });
    }
  });
});
