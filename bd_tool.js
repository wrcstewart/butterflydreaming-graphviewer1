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
//   node bd_tool.js write <patch.md> [--dry-run]
//       Apply a patch defined in a markdown doc. Format is documented
//       inline with parsePatch() below — briefly: @match <key>: <value>
//       lines pick the target node (url preferred, then name); @set
//       <prop>: <value> writes a property, single-line inline OR
//       multi-line up to the next @ directive. Prose / headers around
//       these lines is ignored so the .md reads as a normal doc.
//       Refuses ambiguous @match (>1 hit) and no-match. --dry-run
//       previews without writing.
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

// Parse a .md patch file into { match, set } dicts.
//
// Recognised directives (line-anchored, `@` in column 0):
//   @match <key>: <value>     identity criterion (repeatable)
//   @set   <prop>: <value>    single-line property write
//   @set   <prop>:            multi-line property write; content is
//                             every following line up to the next
//                             `@match` / `@set` / `@end` / EOF
//   @end                      optionally terminates a multi-line block
//
// All other lines (markdown prose, headers, blank lines) are ignored
// so the file reads as a normal .md doc explaining WHAT + WHY.
function parsePatch(md) {
  const match = {};
  const set = {};
  const lines = md.split('\n');
  const dirRe = /^@(match|set|end)(?:\s+(\S+)\s*:\s*(.*))?$/;
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(dirRe);
    if (!m) { i++; continue; }
    const [, kind, key, inline] = m;
    if (kind === 'end') { i++; continue; }
    if (!key) throw new Error(`@${kind} at line ${i + 1} missing key`);
    if (kind === 'match') {
      match[key] = (inline || '').trim();
      i++;
    } else {   // set
      if (inline && inline.trim()) {
        set[key] = inline.trim();
        i++;
      } else {
        i++;
        const buf = [];
        while (i < lines.length && !dirRe.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        while (buf.length && !buf[0].trim())            buf.shift();
        while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
        set[key] = buf.join('\n');
      }
    }
  }
  return { match, set };
}

async function cmdWrite(patchPath, opts) {
  if (!fs.existsSync(patchPath)) throw new Error(`patch file not found: ${patchPath}`);
  const md = fs.readFileSync(patchPath, 'utf8');
  const { match, set } = parsePatch(md);
  if (Object.keys(match).length === 0) throw new Error('patch has no @match directives');
  if (Object.keys(set).length   === 0) throw new Error('patch has no @set directives');
  return runSession(async (s) => {
    // Resolve identity — prefer url, fall back to name. Any single-hit
    // wins. Multi-hit is refused as ambiguous. Add more criteria later
    // if a use case arises; for now url + name cover it.
    let target = null;
    let matchedBy = null;
    for (const key of ['url', 'name']) {
      if (!match[key]) continue;
      const r = await s.run(
        `MATCH (n {${key}: $val}) RETURN n LIMIT 2`,
        { val: match[key] }
      );
      if (r.records.length === 0) continue;
      if (r.records.length > 1) throw new Error(`match.${key} = "${match[key]}" is ambiguous (>1 node)`);
      target = nodeToObject(r.records[0].get('n'));
      matchedBy = key;
      break;
    }
    if (!target) throw new Error(
      `no node matched — tried: ${Object.entries(match).map(([k, v]) => `${k}="${v}"`).join(', ')}`
    );
    process.stderr.write(`[bd_tool] write: matched by ${matchedBy}; ` +
      `${target.labels.join(':')} elementId=${target.elementId}\n`);
    process.stderr.write(`[bd_tool] write: setting ${Object.keys(set).join(', ')}\n`);
    if (opts && opts.dryRun) {
      process.stderr.write('[bd_tool] --dry-run: no changes applied\n');
      return { target, set, applied: false };
    }
    // Bind by the same key we matched with, inside a fresh MATCH — so
    // the write survives even if the SET changes n.url or n.name.
    const upd = await s.run(
      `MATCH (n {${matchedBy}: $val}) SET n += $set RETURN n`,
      { val: match[matchedBy], set }
    );
    return { applied: true, matchedBy, before: target, after: nodeToObject(upd.records[0].get('n')) };
  });
}

function printHelp() {
  process.stderr.write(`bd_tool.js — Direct Memgraph read/write for BD dev workflows.

Usage:
  node bd_tool.js read <name>
  node bd_tool.js read-id <elementId>
  node bd_tool.js labels
  node bd_tool.js cypher <query> [<paramsJSON>]
  node bd_tool.js write <patch.md> [--dry-run]

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
    const patchPath = args.find(a => !a.startsWith('--'));
    if (!patchPath) { process.stderr.write('write: patch path required\n'); process.exit(1); }
    const dryRun = args.includes('--dry-run');
    out = await cmdWrite(patchPath, { dryRun });
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
