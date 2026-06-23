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
const inChat      = new Map();  // userId → boolean (true ⇒ chat panel open)
const howToSent   = new Set();  // userIds that have already received the how-to card this session

function sendToBuddy(userId, msg) {
  const buddyId = pairedWith.get(userId);
  if (!buddyId) return;
  const buddyWs = sessions.get(buddyId);
  if (buddyWs && buddyWs.readyState === 1 /* OPEN */) buddyWs.send(JSON.stringify(msg));
}

// --- A43 chat-channel helpers ---

const HOW_TO_TEXT =
  'Click a node to start the conversation or type your own message. '
  + 'If you select text and copy, it will appear on your next card up. '
  + 'Start a new card if you wish. Send your top card to partner.';

// Channel "open" requires both users paired AND both currently in chat mode.
function channelOpen(userId) {
  const buddyId = pairedWith.get(userId);
  if (!buddyId) return false;
  return inChat.get(userId) === true && inChat.get(buddyId) === true;
}

function sendSystemCard(userId, text) {
  const ws = sessions.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'buddy_card', channel: 'system', text }));
  }
}

function sendHowToOnce(userId) {
  if (howToSent.has(userId)) return;
  howToSent.add(userId);
  sendSystemCard(userId, HOW_TO_TEXT);
}

// Current connection-status text for `userId`.
function statusTextFor(userId) {
  if (channelOpen(userId)) return "You're chatting — try sending a message.";
  return 'Partner not available — please wait.';
}

function broadcastUserCount() {
  const msg = JSON.stringify({ type: 'user_count', count: sessions.size });
  for (const s of sessions.values()) {
    if (s.readyState === 1) s.send(msg);
  }
}

function broadcastCorpusUpdate(msg) {
  const json = JSON.stringify(msg);
  for (const s of sessions.values()) {
    if (s.readyState === 1) s.send(json);
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
        // If both were in chat, drop a "partner disconnected" system card into
        // the buddy's running log before tearing the pair down.
        if (inChat.get(ws.userId) && inChat.get(buddyId)) {
          sendSystemCard(buddyId, 'Partner disconnected.');
        }
        pairedWith.delete(ws.userId);
        pairedWith.delete(buddyId);
        const buddyWs = sessions.get(buddyId);
        if (buddyWs && buddyWs.readyState === 1)
          buddyWs.send(JSON.stringify({ type: 'buddy_disconnected' }));
      }
      inChat.delete(ws.userId);
      howToSent.delete(ws.userId);
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
      if (msg.type === 'enter_chat') {
        if (!ws.userId) return;
        inChat.set(ws.userId, true);
        sendHowToOnce(ws.userId);
        sendSystemCard(ws.userId, statusTextFor(ws.userId));
        // Initial batch done — client uses this to drop in N=1 above the
        // how-to + status it just received. Sent every enter_chat; client
        // handles idempotently (only creates N=1 if no visible local exists).
        ws.send(JSON.stringify({ type: 'chat_ready' }));
        const buddyId = pairedWith.get(ws.userId);
        if (buddyId && inChat.get(buddyId)) {
          // Partner is also in chat — one combined card instead of two
          // ("Partner joined" + status), since the status at this moment
          // is unambiguously "You're chatting".
          sendSystemCard(buddyId, 'Partner joined chat — try sending a message.');
        }
        return;
      }
      if (msg.type === 'leave_chat') {
        if (!ws.userId) return;
        inChat.set(ws.userId, false);
        const buddyId = pairedWith.get(ws.userId);
        if (buddyId && inChat.get(buddyId)) {
          sendSystemCard(buddyId, 'Partner left chat.');
        }
        return;
      }
      if (msg.type === 'buddy_card') {
        // Outbound from client (Send button). communications.md §6.2/§6.4.
        // No persistence — pure pass-through with a delivery ack on success.
        if (!ws.userId) return;
        const text = typeof msg.text === 'string' ? msg.text : '';
        const sendId = msg.sendId;
        if (!channelOpen(ws.userId)) {
          sendSystemCard(ws.userId, 'Partner not available — please wait.');
          return;
        }
        const buddyId = pairedWith.get(ws.userId);
        const buddyWs = sessions.get(buddyId);
        if (buddyWs && buddyWs.readyState === 1) {
          buddyWs.send(JSON.stringify({ type: 'buddy_card', channel: 'partner', text }));
          ws.send(JSON.stringify({
            type: 'buddy_card_ack',
            sendId,
            deliveredAt: new Date().toISOString(),
          }));
        } else {
          sendSystemCard(ws.userId, 'Partner not available — please wait.');
        }
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
      if (msg.type === 'edit_save' || msg.type === 'edit_delete') {
        if (!CURATION_CODE) {
          ws.send(JSON.stringify({ type: msg.type, error: 'curation_disabled' }));
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
            ws.send(JSON.stringify({ type: msg.type, ok: true }));
            broadcastCorpusUpdate({ type: eventType, textNodeUrl, clusterName, work, props: props || {}, n_r, cc_count });
            console.log(`[BD] ${eventType}: ${textNodeUrl} → ${clusterName} (n_r=${n_r}, cc_count=${cc_count})`);
          } catch (err) {
            await tx.rollback();
            throw err;
          }
        } catch (err) {
          console.error(`[BD] ${msg.type} error:`, err.message);
          ws.send(JSON.stringify({ type: msg.type, error: err.message }));
        } finally {
          await s.close();
        }
        return;
      }
      if (msg.type === 'edit_clone_cluster') {
        if (!CURATION_CODE) {
          ws.send(JSON.stringify({ type: 'edit_clone_cluster', error: 'curation_disabled' }));
          return;
        }
        const { sourceName, newName } = msg;
        if (!sourceName || !newName) {
          ws.send(JSON.stringify({ type: 'edit_clone_cluster', error: 'missing_params' }));
          return;
        }
        const s = driver.session({ database: 'memgraph' });
        try {
          const checkResult = await s.run(
            'MATCH (c:Cluster {name: $newName}) RETURN c LIMIT 1',
            { newName }
          );
          if (checkResult.records.length > 0) {
            ws.send(JSON.stringify({ type: 'edit_clone_cluster', error: 'name_exists' }));
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
          ws.send(JSON.stringify({ type: 'edit_clone_cluster', ok: true }));
          broadcastCorpusUpdate({ type: 'cluster_cloned', newCluster, sourceName, parents });
          console.log(`[BD] cluster_cloned: ${newName} from ${sourceName} (${parents.length} parent(s): ${parents.map(p => p.fname).join(', ') || 'none'})`);
        } catch (err) {
          console.error('[BD] edit_clone_cluster error:', err.message);
          ws.send(JSON.stringify({ type: 'edit_clone_cluster', error: err.message }));
        } finally {
          await s.close();
        }
        return;
      }
      if (msg.type === 'edit_node_text') {
        if (!CURATION_CODE) {
          ws.send(JSON.stringify({ type: 'edit_node_text', error: 'curation_disabled' }));
          return;
        }
        const codeOk = msg.code && msg.code.length === CURATION_CODE.length &&
          crypto.timingSafeEqual(Buffer.from(msg.code), Buffer.from(CURATION_CODE));
        if (!codeOk) {
          ws.send(JSON.stringify({ type: 'edit_node_text', error: 'bad_code' }));
          return;
        }
        const allowed = ['Root', 'Entry', 'Family', 'Cluster'];
        if (!allowed.includes(msg.label)) {
          ws.send(JSON.stringify({ type: 'edit_node_text', error: 'invalid_label' }));
          return;
        }
        if (typeof msg.name !== 'string' || !msg.name.length) {
          ws.send(JSON.stringify({ type: 'edit_node_text', error: 'missing_name' }));
          return;
        }
        if (typeof msg.text !== 'string') {
          ws.send(JSON.stringify({ type: 'edit_node_text', error: 'missing_text' }));
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
            ws.send(JSON.stringify({ type: 'edit_node_text', error: 'node_not_found' }));
          } else {
            ws.send(JSON.stringify({ type: 'edit_node_text', ok: true, count }));
            console.log(`[BD] edit_node_text: ${msg.label} "${msg.name}" updated by ${ws.userId}`);
          }
        } catch (err) {
          console.error('[BD] edit_node_text error:', err.message);
          ws.send(JSON.stringify({ type: 'edit_node_text', error: err.message }));
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
