// server.js — ButterflyDreaming Graph Viewer server

const crypto  = require('crypto');
const fs      = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');
const neo4j = require('neo4j-driver');

// Scan project directory for eligible media files (D_ = default, A_ = alternate).
// Restart server to pick up new files.
const mediaFiles = fs.readdirSync('.')
  .filter(f => /^[DA]_.*\.mp3$/i.test(f))
  .sort((a, b) => (a.startsWith('D_') ? 0 : 1) - (b.startsWith('D_') ? 0 : 1) || a.localeCompare(b));
console.log('[BD] Media files:', mediaFiles);

// Load curation code from gitignored config — absent = curation disabled, app still works.
let CURATION_CODE = null;
try {
  const cfg = require('./config');
  CURATION_CODE = cfg.CURATION_CODE || null;
} catch { /* no config or no CURATION_CODE — curation disabled */ }

const app = express();
app.use(express.json());
app.use(express.static('.'));

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

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

const wss = new WebSocketServer({ server });

// --- Pairing state ---

const sessions    = new Map();  // userId → ws
let   waitingUser = null;        // { userId, ws } | null
const pairedWith  = new Map();  // userId → buddyUserId

function sendToBuddy(userId, msg) {
  const buddyId = pairedWith.get(userId);
  if (!buddyId) return;
  const buddyWs = sessions.get(buddyId);
  if (buddyWs && buddyWs.readyState === 1 /* OPEN */) buddyWs.send(JSON.stringify(msg));
}

function broadcastUserCount() {
  const msg = JSON.stringify({ type: 'user_count', count: sessions.size });
  for (const s of sessions.values()) {
    if (s.readyState === 1) s.send(msg);
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

// --- WebSocket handler ---

wss.on('connection', async (ws) => {
  // Create ephemeral User node — viewer_id = 'N_<memgraph integer id>'
  // Prevents any ID collision with corpus nodes (same N_ prefix rule as cf_ for edges).
  ws.userId = null;
  try {
    const s = driver.session({ database: 'memgraph' });
    try {
      const result = await s.run(
        'CREATE (u:User {created_at: datetime()}) ' +
        "WITH u, 'N_' + toString(id(u)) AS vid " +
        'SET u.viewer_id = vid ' +
        'RETURN u.viewer_id AS viewer_id'
      );
      ws.userId = result.records[0]?.get('viewer_id') ?? null;
      if (ws.userId) { sessions.set(ws.userId, ws); broadcastUserCount(); }
      console.log(`[BD] User created: ${ws.userId}`);
    } finally {
      await s.close();
    }
  } catch (err) {
    console.error('[BD] User create error:', err.message);
  }

  // Server-side WebSocket protocol ping every 25 s — browser replies with pong automatically
  // at the protocol layer, keeping the connection alive without any client JS timer.
  const keepAlive = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
    else clearInterval(keepAlive);
  }, 25000);

  ws.on('close', async () => {
    clearInterval(keepAlive);
    if (ws.userId) {
      sessions.delete(ws.userId);
      broadcastUserCount();
      if (waitingUser?.userId === ws.userId) waitingUser = null;
      const buddyId = pairedWith.get(ws.userId);
      if (buddyId) {
        pairedWith.delete(ws.userId);
        pairedWith.delete(buddyId);
        const buddyWs = sessions.get(buddyId);
        if (buddyWs && buddyWs.readyState === 1)
          buddyWs.send(JSON.stringify({ type: 'buddy_disconnected' }));
      }
    }
    if (!ws.userId) return;
    try {
      const s = driver.session({ database: 'memgraph' });
      try {
        await s.run(
          'MATCH (u:User {viewer_id: $uid}) DETACH DELETE u',
          { uid: ws.userId }
        );
        console.log(`[BD] User deleted: ${ws.userId}`);
      } finally {
        await s.close();
      }
    } catch (err) {
      console.error('[BD] User delete error:', err.message);
    }
  });

  ws.on('message', async (raw) => {
    let type;
    try {
      const msg = JSON.parse(raw);
      type = msg.type;
      if (msg.type === 'ready_to_pair') {
        if (!ws.userId) return;
        if (waitingUser === null) {
          waitingUser = { userId: ws.userId, ws };
          ws.send(JSON.stringify({ type: 'wait_state' }));
          console.log(`[BD] Waiting: ${ws.userId}`);
        } else {
          const buddy = waitingUser;
          waitingUser = null;
          pairedWith.set(ws.userId, buddy.userId);
          pairedWith.set(buddy.userId, ws.userId);
          ws.send(JSON.stringify({ type: 'paired', buddyId: buddy.userId }));
          buddy.ws.send(JSON.stringify({ type: 'paired', buddyId: ws.userId }));
          console.log(`[BD] Paired: ${ws.userId} ↔ ${buddy.userId}`);
        }
        return;
      }
      if (msg.type === 'get_user_count') {
        ws.send(JSON.stringify({ type: 'user_count', count: sessions.size }));
        return;
      }
      if (msg.type === 'get_media_files') {
        ws.send(JSON.stringify({ type: 'media_files', files: mediaFiles }));
        return;
      }
      if (msg.type === 'breadcrumb') {
        if (ws.userId) sendToBuddy(ws.userId, { type: 'buddy_breadcrumb', data: msg.data });
        return;
      }
      if (msg.type === 'write_hints') {
        if (!CURATION_CODE) {
          ws.send(JSON.stringify({ type: 'write_hints', error: 'curation_disabled' }));
          return;
        }
        const now = Date.now();
        if (ws._lastHintWrite && now - ws._lastHintWrite < 8000) {
          ws.send(JSON.stringify({ type: 'write_hints', error: 'rate_limited' }));
          return;
        }
        const codeOk = msg.code && msg.code.length === CURATION_CODE.length &&
          crypto.timingSafeEqual(Buffer.from(msg.code), Buffer.from(CURATION_CODE));
        if (!codeOk) {
          ws.send(JSON.stringify({ type: 'write_hints', error: 'bad_code' }));
          return;
        }
        ws._lastHintWrite = now;
        const s = driver.session({ database: 'memgraph' });
        try {
          await s.run(
            'UNWIND $hints AS h ' +
            'MATCH ()-[r]-() WHERE id(r) = toInteger(h.relId) ' +
            'SET r.hint_x = h.hint_x, r.hint_y = h.hint_y, r.hint_scale = h.hint_scale',
            { hints: msg.hints }
          );
          ws.send(JSON.stringify({ type: 'write_hints', ok: true, count: msg.hints.length }));
          console.log(`[BD] Hints written: ${msg.hints.length} edges by ${ws.userId}`);
        } catch (err) {
          console.error('[BD] write_hints error:', err.message);
          ws.send(JSON.stringify({ type: 'write_hints', error: err.message }));
        } finally {
          await s.close();
        }
        return;
      }
      if (!msg.query) return;  // ignore keepalive pings and other non-query messages
      const session = driver.session({ database: 'memgraph' });
      try {
        const result = await session.run(msg.query, msg.params || {});
        ws.send(JSON.stringify({ type, records: result.records.map(serializeRecord) }));
      } finally {
        await session.close();
      }
    } catch (err) {
      console.error('Query error:', err.message);
      ws.send(JSON.stringify({ type, error: err.message }));
    }
  });
});
