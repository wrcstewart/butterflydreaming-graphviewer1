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

const wss = new WebSocketServer({ server });

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

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let type;
    try {
      const msg = JSON.parse(raw);
      type = msg.type;
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
