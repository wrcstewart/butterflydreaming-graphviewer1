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
//   node bd_tool.js sync-helpers <helpers.md> [--dry-run]
//       Sync a Helper-Messages .md file into Memgraph. See
//       parseHelpersFile() for the format — briefly: `---` between
//       blocks; each block uses @hub or @helper directives + a body
//       (message text). Creates :HelperHub + :HelperMessage nodes
//       with :CONTAINS_HELPER edges from hub to each message.
//       URLs are auto-generated on create and WRITTEN BACK into the
//       .md so the same file can drive future updates by url.
//       Idempotent: rerun with the same file to no-op-update.
//
// The tool always writes results as JSON to stdout so the caller
// (human or agent) can pipe / parse. Errors + progress to stderr.

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const neo4j  = require('neo4j-driver');

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

// ─────────────────────────────────────────────────────────────────────
// Helpers file parser + syncer (2026-07-16)
//
// A helpers.md file is one hub declaration plus many message
// declarations, split by `---` on lines by themselves. Any block
// without @hub / @helper directives is treated as prose and ignored,
// so the file reads naturally as a .md doc.
//
// Hub block:
//   @hub name: Helper Messages
//   @hub url:  butterflydreaming.org/n/<uuid>    (optional; auto-generated on create)
//
// Helper block:
//   @helper name:    kebab-case-unique-id       (required)
//   @helper title:   Short human heading         (required)
//   @helper trigger: loose English description   (required; server maps later)
//   @helper url:     butterflydreaming.org/n/<uuid>  (optional; auto-generated on create)
//   <blank line>
//   Message body text (any non-@ lines are body; multiple lines allowed).
//
// Identity resolution: url wins if present; else name. Auto-generated
// urls are written back into the .md via insertUrlLine() so the file
// becomes the durable-identity source of truth after the first sync.
// ─────────────────────────────────────────────────────────────────────

const DIVIDER_RE  = /^---\s*$/;
const HUB_RE      = /^@hub\s+(\S+)\s*:\s*(.*)$/;
const HELPER_RE   = /^@helper\s+(\S+)\s*:\s*(.*)$/;
const URL_PREFIX  = 'butterflydreaming.org/n/';

function parseHelpersFile(md) {
  const lines = md.split('\n');
  const blocks = [];
  let cur = { kind: null, directives: {}, bodyLines: [], firstLine: 0, lastLine: -1, lastDirectiveLine: -1 };
  const flush = () => {
    if (cur.kind) blocks.push(cur);
    cur = { kind: null, directives: {}, bodyLines: [], firstLine: 0, lastLine: -1, lastDirectiveLine: -1 };
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DIVIDER_RE.test(line)) { flush(); cur.firstLine = i + 1; continue; }
    const hub = line.match(HUB_RE);
    const helper = line.match(HELPER_RE);
    if (hub) {
      if (cur.kind === 'helper') throw new Error(`line ${i + 1}: @hub inside a @helper block`);
      cur.kind = 'hub';
      cur.directives[hub[1]] = hub[2].trim();
      cur.lastDirectiveLine = i;
      cur.lastLine = i;
    } else if (helper) {
      if (cur.kind === 'hub') throw new Error(`line ${i + 1}: @helper inside a @hub block`);
      cur.kind = 'helper';
      cur.directives[helper[1]] = helper[2].trim();
      cur.lastDirectiveLine = i;
      cur.lastLine = i;
    } else if (cur.kind) {
      cur.bodyLines.push(line);
      cur.lastLine = i;
    }
    // Non-directive lines outside a block (leading prose) are ignored
  }
  flush();
  const hub     = blocks.find(b => b.kind === 'hub')     || null;
  const helpers = blocks.filter(b => b.kind === 'helper');
  return { blocks, hub, helpers, lines };
}

function blockBody(block) {
  // Trim leading + trailing blank lines from the body, join with \n.
  const b = block.bodyLines.slice();
  while (b.length && !b[0].trim())              b.shift();
  while (b.length && !b[b.length - 1].trim())   b.pop();
  return b.join('\n');
}

async function syncHelpers(session, hub, helpers) {
  // ── Hub upsert ────────────────────────────────────────────────────
  if (!hub) throw new Error('helpers file has no @hub block');
  const hubName = hub.directives.name;
  if (!hubName) throw new Error('@hub is missing `name:`');
  let hubUrl  = hub.directives.url || null;
  let hubCreated = false;

  // Try url first, then name
  let hubNode = null;
  if (hubUrl) {
    const r = await session.run('MATCH (h:HelperHub {url: $url}) RETURN h LIMIT 2', { url: hubUrl });
    if (r.records.length > 1) throw new Error(`@hub url is ambiguous`);
    if (r.records.length === 1) hubNode = r.records[0].get('h');
  }
  if (!hubNode) {
    const r = await session.run('MATCH (h:HelperHub {name: $name}) RETURN h LIMIT 2', { name: hubName });
    if (r.records.length > 1) throw new Error(`@hub name is ambiguous`);
    if (r.records.length === 1) hubNode = r.records[0].get('h');
  }
  if (!hubNode) {
    if (!hubUrl) hubUrl = URL_PREFIX + crypto.randomUUID();
    const r = await session.run(
      'CREATE (h:HelperHub {name: $name, url: $url}) RETURN h',
      { name: hubName, url: hubUrl }
    );
    hubNode = r.records[0].get('h');
    hubCreated = true;
  } else {
    hubUrl = hubNode.properties.url;
    // Refresh name/url on the node (in case .md renamed the hub)
    await session.run(
      'MATCH (h:HelperHub {url: $url}) SET h.name = $name',
      { url: hubUrl, name: hubName }
    );
  }

  // ── Helper upserts + edges ────────────────────────────────────────
  const helperResults = [];
  for (const block of helpers) {
    const name    = block.directives.name;
    const title   = block.directives.title;
    const trigger = block.directives.trigger;
    const url     = block.directives.url || null;
    const text    = blockBody(block);
    if (!name)  throw new Error(`@helper block at line ${block.firstLine + 1}: missing name`);
    if (!title) throw new Error(`@helper "${name}": missing title`);
    if (!trigger) throw new Error(`@helper "${name}": missing trigger`);
    if (!text.length) throw new Error(`@helper "${name}": body text is empty`);

    let hNode = null;
    if (url) {
      const r = await session.run('MATCH (h:HelperMessage {url: $url}) RETURN h LIMIT 2', { url });
      if (r.records.length > 1) throw new Error(`@helper "${name}" url ambiguous`);
      if (r.records.length === 1) hNode = r.records[0].get('h');
    }
    if (!hNode) {
      const r = await session.run('MATCH (h:HelperMessage {name: $name}) RETURN h LIMIT 2', { name });
      if (r.records.length > 1) throw new Error(`@helper "${name}" is ambiguous by name`);
      if (r.records.length === 1) hNode = r.records[0].get('h');
    }

    let created = false;
    let finalUrl = url;
    if (!hNode) {
      finalUrl = finalUrl || (URL_PREFIX + crypto.randomUUID());
      const r = await session.run(
        `CREATE (h:HelperMessage {url: $url, name: $name, title: $title, trigger: $trigger, text: $text}) RETURN h`,
        { url: finalUrl, name, title, trigger, text }
      );
      hNode = r.records[0].get('h');
      created = true;
    } else {
      finalUrl = hNode.properties.url;
      await session.run(
        `MATCH (h:HelperMessage {url: $url})
         SET h.name = $name, h.title = $title, h.trigger = $trigger, h.text = $text`,
        { url: finalUrl, name, title, trigger, text }
      );
    }

    // Ensure the hub → helper edge (MERGE is idempotent)
    await session.run(
      `MATCH (hub:HelperHub {url: $hubUrl}), (h:HelperMessage {url: $hUrl})
       MERGE (hub)-[:CONTAINS_HELPER]->(h)`,
      { hubUrl, hUrl: finalUrl }
    );

    helperResults.push({ block, name, title, trigger, url: finalUrl, created, textLen: text.length });
  }

  return {
    hub: { name: hubName, url: hubUrl, created: hubCreated },
    helpers: helperResults,
  };
}

// Insert `@<kind> url: <url>` right after the last directive line in
// the given block, in the file's line array. Called after a create when
// the block didn't already have a url directive.
function insertUrlLine(lines, block, kind, url) {
  const newLine = `@${kind} url: ${url}`;
  const insertAt = block.lastDirectiveLine + 1;
  lines.splice(insertAt, 0, newLine);
  // Shift subsequent block line indices — cheap since we do it in one
  // pass after all inserts are collected.
  return newLine;
}

async function cmdSyncHelpers(mdPath, opts) {
  if (!fs.existsSync(mdPath)) throw new Error(`helpers file not found: ${mdPath}`);
  const md = fs.readFileSync(mdPath, 'utf8');
  const parsed = parseHelpersFile(md);
  if (!parsed.hub) throw new Error('helpers file has no @hub block');
  if (parsed.helpers.length === 0) throw new Error('helpers file has no @helper blocks');

  process.stderr.write(`[bd_tool] sync-helpers: found 1 hub + ${parsed.helpers.length} messages\n`);

  if (opts && opts.dryRun) {
    process.stderr.write('[bd_tool] --dry-run: no DB changes; no file write-back\n');
    return {
      hub: { name: parsed.hub.directives.name, url: parsed.hub.directives.url || '(will generate)' },
      helpers: parsed.helpers.map(b => ({
        name: b.directives.name, title: b.directives.title, trigger: b.directives.trigger,
        url: b.directives.url || '(will generate)', textLen: blockBody(b).length,
      })),
      applied: false,
    };
  }

  const result = await runSession(s => syncHelpers(s, parsed.hub, parsed.helpers));

  // Write-back generated URLs into the .md file, in reverse block order
  // so earlier insertions don't shift later block line numbers.
  const lines = parsed.lines.slice();
  const pending = [];
  if (result.hub.created && !parsed.hub.directives.url) {
    pending.push({ block: parsed.hub, kind: 'hub', url: result.hub.url });
  }
  for (let i = 0; i < parsed.helpers.length; i++) {
    const r = result.helpers[i];
    const block = parsed.helpers[i];
    if (r.created && !block.directives.url) {
      pending.push({ block, kind: 'helper', url: r.url });
    }
  }
  // Sort by insertion point descending so earlier inserts don't
  // invalidate later ones
  pending.sort((a, b) => b.block.lastDirectiveLine - a.block.lastDirectiveLine);
  for (const p of pending) insertUrlLine(lines, p.block, p.kind, p.url);

  if (pending.length > 0) {
    fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
    process.stderr.write(`[bd_tool] sync-helpers: wrote ${pending.length} generated url(s) back to ${mdPath}\n`);
  }

  // Summary
  const createdCount = result.helpers.filter(h => h.created).length + (result.hub.created ? 1 : 0);
  const updatedCount = result.helpers.filter(h => !h.created).length + (result.hub.created ? 0 : 1);
  process.stderr.write(`[bd_tool] sync-helpers: created ${createdCount}, updated ${updatedCount}\n`);

  return {
    applied: true,
    hub: result.hub,
    helpers: result.helpers.map(h => ({
      name: h.name, title: h.title, trigger: h.trigger, url: h.url,
      created: h.created, textLen: h.textLen,
    })),
  };
}

function printHelp() {
  process.stderr.write(`bd_tool.js — Direct Memgraph read/write for BD dev workflows.

Usage:
  node bd_tool.js read <name>
  node bd_tool.js read-id <elementId>
  node bd_tool.js labels
  node bd_tool.js cypher <query> [<paramsJSON>]
  node bd_tool.js write <patch.md> [--dry-run]
  node bd_tool.js sync-helpers <helpers.md> [--dry-run]

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
  } else if (cmd === 'sync-helpers') {
    const mdPath = args.find(a => !a.startsWith('--'));
    if (!mdPath) { process.stderr.write('sync-helpers: helpers.md path required\n'); process.exit(1); }
    const dryRun = args.includes('--dry-run');
    out = await cmdSyncHelpers(mdPath, { dryRun });
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
