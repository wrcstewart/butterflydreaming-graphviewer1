// bd_tool.js — Direct Memgraph read/write for BD dev workflows (2026-07-16).
// Lightweight CLI Claude uses to inspect and modify the graph without
// going through the BD viewer. Talks Bolt to the same Memgraph the
// server does (localhost:7687, memgraph/memgraph).
//
// Usage:
//   node bd_tool.js read <name>
//       Find node(s) whose `name` property matches (exact). Prints an
//       array of { elementId, labels, properties } as JSON.
//
//   node bd_tool.js read-id <elementId>
//       Find node by Neo4j elementId (or numeric identity as string).
//
//   node bd_tool.js labels
//       List every label present in the graph, with counts.
//
//   node bd_tool.js cypher <query> [<paramsJSON>]
//       Run arbitrary Cypher and print the records. Params optional.
//       Read-only queries are safe; writes/deletes go through — no
//       guardrails, so double-check the query before pasting.
//
//   node bd_tool.js write <patch.md>
//       (stub) Apply a patch defined in a markdown doc — format TBD in
//       a later iteration. Errors out for now.
//
// The tool always writes results as JSON to stdout so the caller
// (human or agent) can pipe / parse. Errors + progress to stderr.

'use strict';

const fs    = require('fs');
const path  = require('path');
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph'),
  { disableLosslessIntegers: true }   // let Integer values arrive as regular JS numbers
);

// Convert a Neo4j value into a JSON-serializable plain value. Handles
// nodes (via their .properties), datetimes (via .toString()), arrays,
// nested maps. Integers already come through as JS numbers thanks to
// disableLosslessIntegers above.
function toPlain(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(toPlain);
  if (typeof v !== 'object') return v;
  // Neo4j temporal types (Date, DateTime, Duration, Time, LocalTime,
  // LocalDateTime) all expose toString().
  if (v.year !== undefined && v.month !== undefined) return v.toString();
  if (v.months !== undefined && v.days !== undefined && v.seconds !== undefined) return v.toString();
  // Node / Relationship shapes have .labels or .type — caller wraps
  // those; only recurse into plain maps here.
  const out = {};
  for (const k of Object.keys(v)) out[k] = toPlain(v[k]);
  return out;
}

function nodeToObject(n) {
  const props = {};
  for (const k of Object.keys(n.properties || {})) props[k] = toPlain(n.properties[k]);
  return {
    elementId: n.elementId !== undefined ? n.elementId : String(n.identity),
    labels:    n.labels || [],
    properties: props,
  };
}

function recordToObject(rec) {
  const out = {};
  for (const key of rec.keys) {
    const v = rec.get(key);
    if (v && v.labels !== undefined && v.properties !== undefined) {
      out[key] = nodeToObject(v);           // Node
    } else if (v && v.type !== undefined && v.start !== undefined && v.end !== undefined) {
      out[key] = {                          // Relationship
        elementId: v.elementId !== undefined ? v.elementId : String(v.identity),
        type: v.type,
        properties: toPlain(v.properties || {}),
      };
    } else {
      out[key] = toPlain(v);
    }
  }
  return out;
}

async function runSession(fn) {
  const session = driver.session({ database: 'memgraph' });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

async function cmdRead(name) {
  return runSession(async (s) => {
    const result = await s.run('MATCH (n {name: $name}) RETURN n', { name });
    return result.records.map(r => nodeToObject(r.get('n')));
  });
}

async function cmdReadId(id) {
  return runSession(async (s) => {
    // Match on elementId OR numeric identity — supports both string
    // ("42") and elementId ("4:abc…") inputs.
    const result = await s.run(
      'MATCH (n) WHERE elementId(n) = $id OR toString(id(n)) = $id RETURN n',
      { id }
    );
    return result.records.map(r => nodeToObject(r.get('n')));
  });
}

async function cmdLabels() {
  return runSession(async (s) => {
    const result = await s.run(
      'MATCH (n) UNWIND labels(n) AS l RETURN l AS label, count(*) AS count ORDER BY count DESC'
    );
    return result.records.map(r => ({
      label: r.get('label'),
      count: typeof r.get('count') === 'number' ? r.get('count') : Number(r.get('count')),
    }));
  });
}

async function cmdCypher(query, params) {
  return runSession(async (s) => {
    const result = await s.run(query, params || {});
    return result.records.map(recordToObject);
  });
}

async function cmdWrite(patchPath) {
  // Stub. Left in place so the CLI surface stays stable while we
  // design the .md patch format in a later iteration.
  process.stderr.write(
    `write: not yet implemented (would apply patch from ${patchPath}). ` +
    `Design deferred — will define the .md patch schema next.\n`
  );
  process.exit(2);
}

function printHelp() {
  process.stderr.write(`bd_tool.js — Direct Memgraph read/write for BD dev workflows.

Usage:
  node bd_tool.js read <name>
  node bd_tool.js read-id <elementId>
  node bd_tool.js labels
  node bd_tool.js cypher <query> [<paramsJSON>]
  node bd_tool.js write <patch.md>            (not yet implemented)

Results are JSON on stdout. Progress + errors on stderr.
`);
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    printHelp();
    return;
  }

  let out;
  if (cmd === 'read') {
    const name = args.join(' ').trim();
    if (!name) { process.stderr.write('read: name required\n'); process.exit(1); }
    out = await cmdRead(name);
    if (out.length === 0) process.stderr.write(`(no nodes with name = "${name}")\n`);
  } else if (cmd === 'read-id') {
    const id = args[0];
    if (!id) { process.stderr.write('read-id: id required\n'); process.exit(1); }
    out = await cmdReadId(id);
    if (out.length === 0) process.stderr.write(`(no node with id = "${id}")\n`);
  } else if (cmd === 'labels') {
    out = await cmdLabels();
  } else if (cmd === 'cypher') {
    const query = args[0];
    if (!query) { process.stderr.write('cypher: query required\n'); process.exit(1); }
    let params = {};
    if (args[1]) {
      try { params = JSON.parse(args[1]); }
      catch (e) { process.stderr.write(`cypher: invalid params JSON: ${e.message}\n`); process.exit(1); }
    }
    out = await cmdCypher(query, params);
  } else if (cmd === 'write') {
    await cmdWrite(args[0] || '(unspecified)');
    return;   // exits inside
  } else {
    process.stderr.write(`unknown subcommand: ${cmd}\n`);
    printHelp();
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main()
  .catch(err => { process.stderr.write(`[bd_tool] error: ${err.message}\n`); process.exit(1); })
  .finally(() => driver.close());
