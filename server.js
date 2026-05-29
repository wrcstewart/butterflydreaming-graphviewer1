// server.js — ButterflyDreaming Graph Viewer server

const express = require('express');
const { WebSocketServer } = require('ws');
const neo4j = require('neo4j-driver');

const app = express();
app.use(express.static('.'));

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

const server = app.listen(8080, () =>
  console.log('ButterflyDreaming viewer running at http://localhost:8080')
);

// Warm up Memgraph connection pool immediately on startup so the first
// client query doesn't hit a cold bolt connection.
(async () => {
  try {
    const s = driver.session({ database: 'memgraph' });
    await s.run('RETURN 1');
    await s.close();
    console.log('[BD] Memgraph connection warmed up');
  } catch (err) {
    console.error('[BD] Memgraph warmup error:', err.message);
  }
})();

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
      if (ws.userId) sessions.set(ws.userId, ws);
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
      if (waitingUser?.userId === ws.userId) waitingUser = null;
      const buddyId = pairedWith.get(ws.userId);
      if (buddyId) { pairedWith.delete(ws.userId); pairedWith.delete(buddyId); }
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
      if (msg.type === 'breadcrumb') {
        if (ws.userId) sendToBuddy(ws.userId, { type: 'buddy_breadcrumb', data: msg.data });
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
