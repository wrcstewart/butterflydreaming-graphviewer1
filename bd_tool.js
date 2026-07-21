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
//       Apply patches defined in a markdown doc. File is one or many
//       blocks separated by `---` on a line. Each block uses
//       @match <key>: <value> to pick the target node (url > name >
//       title priority), @set <prop>: <value> to write properties
//       (single-line inline OR multi-line up to next @ directive),
//       and OPTIONAL @flag update_this: true|false to gate the
//       apply (default false = skip; blocks without the flag are
//       skipped). Flags auto-reset to false after apply — the file
//       becomes an idempotent "no pending edits" state.
//       Refuses ambiguous @match. --dry-run previews.
//
//   node bd_tool.js sync-helpers <helpers.md> [--dry-run]
//       Sync a Helper-Messages .md file into Memgraph. See
//       parseHelpersFile() for the format — briefly: `---` between
//       blocks; each block uses @hub or @helper directives + a body
//       (message text). Optional `@flag update_this: true|false`
//       gates the UPDATE case: existing nodes are only updated when
//       the block is flagged true (CREATE for new blocks is always
//       applied regardless). Flags auto-reset to false after apply.
//       Creates :HelperHub + :HelperMessage nodes with
//       :CONTAINS_HELPER edges. URLs auto-generated on create and
//       written back to the .md. Idempotent.
//
//   node bd_tool.js backup [<outPath>]
//       Dump the entire Memgraph graph to a replayable .cypher file
//       via `DUMP DATABASE`. Default output path is
//       backups/memgraph_YYYY-MM-DD_HHMMSS.cypher (creates the
//       backups/ dir if missing). To restore, pipe the file into
//       mgconsole (or run its statements through a fresh Memgraph
//       session). Portable, human-readable, versionable.
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

// Parse a .md patch file — one or many blocks, separated by `---` on
// a line by itself.
//
// Recognised directives (line-anchored, `@` in column 0):
//   @match <key>: <value>        identity criterion (repeatable per block)
//   @set   <prop>: <value>       single-line property write
//   @set   <prop>:               multi-line property write; content is
//                                every following line up to the next
//                                `@match` / `@set` / `@flag` / `@end` / EOF
//   @flag  update_this: true|false  gate the UPDATE (default false = skip)
//   @end                         optionally terminates a multi-line block
//
// All other lines (markdown prose, headers, blank lines) are ignored,
// so the file reads as a normal .md doc explaining WHAT + WHY.
// Blocks lacking @match are treated as prose and dropped.
function parsePatchesFile(md) {
  const lines = md.split('\n');
  const patches = [];
  const DIRECTIVE = /^@(match|set|flag|end)(?:\s+(\S+)\s*:\s*(.*))?$/;

  const newPatch = () => ({
    match: {}, set: {}, flags: {}, flagLines: {},
    setBodyName: null, setBodyLines: null,  // for the currently-open multi-line @set
    lastDirectiveLine: -1, lastLine: -1, firstLine: 0,
  });
  let cur = newPatch();
  const closeSetBody = () => {
    if (cur.setBodyName !== null) {
      const b = cur.setBodyLines.slice();
      while (b.length && !b[0].trim())              b.shift();
      while (b.length && !b[b.length - 1].trim())   b.pop();
      cur.set[cur.setBodyName] = b.join('\n');
      cur.setBodyName = null;
      cur.setBodyLines = null;
    }
  };
  const flush = () => {
    closeSetBody();
    if (Object.keys(cur.match).length > 0 || Object.keys(cur.set).length > 0) {
      patches.push(cur);
    }
    cur = newPatch();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DIVIDER_RE.test(line)) { flush(); cur.firstLine = i + 1; continue; }
    const m = line.match(DIRECTIVE);
    if (!m) {
      if (cur.setBodyName !== null) { cur.setBodyLines.push(line); cur.lastLine = i; }
      continue;   // prose lines outside a multi-line body are ignored
    }
    // Any directive terminates a pending multi-line body
    closeSetBody();
    const [, kind, key, inline] = m;
    if (kind === 'end') continue;
    if (!key) throw new Error(`line ${i + 1}: @${kind} missing key`);
    if (kind === 'match') {
      cur.match[key] = (inline || '').trim();
      cur.lastDirectiveLine = i; cur.lastLine = i;
    } else if (kind === 'flag') {
      cur.flags[key] = (inline || '').trim();
      cur.flagLines[key] = i;
      cur.lastDirectiveLine = i; cur.lastLine = i;
    } else if (kind === 'set') {
      if (inline && inline.trim()) {
        cur.set[key] = inline.trim();
      } else {
        cur.setBodyName = key;
        cur.setBodyLines = [];
      }
      cur.lastDirectiveLine = i; cur.lastLine = i;
    }
  }
  flush();
  return { patches, lines };
}

async function cmdWrite(patchPath, opts) {
  if (!fs.existsSync(patchPath)) throw new Error(`patch file not found: ${patchPath}`);
  const md = fs.readFileSync(patchPath, 'utf8');
  const parsed = parsePatchesFile(md);
  if (parsed.patches.length === 0) throw new Error('patch file has no @match/@set blocks');

  process.stderr.write(`[bd_tool] write: found ${parsed.patches.length} patch block(s)\n`);

  if (opts && opts.dryRun) {
    process.stderr.write('[bd_tool] --dry-run: no DB changes; no file write-back\n');
    return {
      patches: parsed.patches.map(p => ({
        match: p.match, setKeys: Object.keys(p.set),
        flag: (p.flags && p.flags.update_this) || 'false',
      })),
      applied: false,
    };
  }

  const results = await runSession(async (s) => {
    const arr = [];
    for (const patch of parsed.patches) {
      if (Object.keys(patch.match).length === 0) {
        arr.push({ patch, skipped: true, reason: 'no @match' });
        continue;
      }
      if (Object.keys(patch.set).length === 0) {
        arr.push({ patch, skipped: true, reason: 'no @set' });
        continue;
      }
      const flag = patch.flags && patch.flags.update_this;
      if (flag !== 'true') {
        arr.push({ patch, skipped: true, reason: 'flag not true' });
        continue;
      }
      // Identity: url > name > title. Each attempted in order; single-hit wins.
      let matchedBy = null;
      let target = null;
      for (const key of ['url', 'name', 'title']) {
        if (!patch.match[key]) continue;
        const r = await s.run(`MATCH (n {${key}: $val}) RETURN n LIMIT 2`, { val: patch.match[key] });
        if (r.records.length === 0) continue;
        if (r.records.length > 1) throw new Error(`match.${key} = "${patch.match[key]}" is ambiguous`);
        target = r.records[0].get('n');
        matchedBy = key;
        break;
      }
      if (!target) {
        throw new Error(`no node matched — tried: ${Object.entries(patch.match).map(([k, v]) => `${k}="${v}"`).join(', ')}`);
      }
      const upd = await s.run(
        `MATCH (n {${matchedBy}: $val}) SET n += $set RETURN n`,
        { val: patch.match[matchedBy], set: patch.set }
      );
      arr.push({ patch, applied: true, matchedBy, after: nodeToObject(upd.records[0].get('n')) });
    }
    return arr;
  });

  // Write-back: reset @flag update_this to false for every applied block.
  // Existing flag lines get replaced in place (no shift); missing flag
  // lines get inserted after the last directive. Process applied blocks
  // in reverse lastDirectiveLine order so later-block inserts don't
  // shift earlier-block indices.
  const applied = results.filter(r => r.applied);
  if (applied.length > 0) {
    const lines = parsed.lines.slice();
    const sorted = applied.slice().sort((a, b) => b.patch.lastDirectiveLine - a.patch.lastDirectiveLine);
    for (const r of sorted) {
      const flagLineText = '@flag update_this: false';
      const flagIdx = r.patch.flagLines && r.patch.flagLines.update_this;
      if (flagIdx !== undefined && flagIdx >= 0) {
        if (lines[flagIdx] !== flagLineText) lines[flagIdx] = flagLineText;
      } else {
        lines.splice(r.patch.lastDirectiveLine + 1, 0, flagLineText);
      }
    }
    fs.writeFileSync(patchPath, lines.join('\n'), 'utf8');
    process.stderr.write(`[bd_tool] write: reset flag on ${applied.length} block(s) in ${patchPath}\n`);
  }

  const skippedCount = results.length - applied.length;
  process.stderr.write(`[bd_tool] write: applied ${applied.length}, skipped ${skippedCount}\n`);

  return {
    applied: true,
    patches: results.map(r => ({
      match: r.patch.match,
      setKeys: Object.keys(r.patch.set),
      applied: !!r.applied,
      skipped: !!r.skipped,
      reason: r.reason,
      matchedBy: r.matchedBy,
    })),
  };
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

// Directive regex covers @hub, @helper, @flag, @end. @hub/@helper set or
// assert the block kind; @flag modifies the current block regardless of
// kind (goes into block.flags with its line index in block.flagLines).
// @end is a soft terminator — recognised but no-op here.
const DIRECTIVE_RE = /^@(hub|helper|flag|end)(?:\s+(\S+)\s*:\s*(.*))?$/;

function parseHelpersFile(md) {
  const lines = md.split('\n');
  const blocks = [];
  const newBlock = () => ({
    kind: null, directives: {}, flags: {}, flagLines: {},
    bodyLines: [], firstLine: 0, lastLine: -1, lastDirectiveLine: -1,
  });
  let cur = newBlock();
  const flush = () => {
    if (cur.kind) blocks.push(cur);
    cur = newBlock();
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DIVIDER_RE.test(line)) { flush(); cur.firstLine = i + 1; continue; }
    const m = line.match(DIRECTIVE_RE);
    if (!m) {
      if (cur.kind) { cur.bodyLines.push(line); cur.lastLine = i; }
      continue;
    }
    const [, dKind, key, inline] = m;
    if (dKind === 'end') continue;
    if (dKind === 'hub' || dKind === 'helper') {
      if (cur.kind && cur.kind !== dKind) throw new Error(`line ${i + 1}: @${dKind} inside a @${cur.kind} block`);
      cur.kind = dKind;
      if (key) cur.directives[key] = (inline || '').trim();
      cur.lastDirectiveLine = i;
      cur.lastLine = i;
    } else if (dKind === 'flag') {
      if (!cur.kind) throw new Error(`line ${i + 1}: @flag outside a block`);
      if (!key) throw new Error(`line ${i + 1}: @flag missing key`);
      cur.flags[key] = (inline || '').trim();
      cur.flagLines[key] = i;
      cur.lastDirectiveLine = i;
      cur.lastLine = i;
    }
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
  // Flag rules (2026-07-16 late):
  //   CREATE (node doesn't yet exist in DB) → always applied, regardless
  //     of flag. Adding a new block to the .md just works.
  //   UPDATE (node already exists in DB)   → only if @flag update_this
  //     is 'true'. Otherwise skipped (record noted as skipped=true).
  // After a successful CREATE or UPDATE, cmdSyncHelpers writes the
  // flag back to false in the .md — prevents accidental re-apply and
  // keeps the "flag = pending" invariant.
  const flagVal = (block, key) => block.flags && block.flags[key];

  // ── Hub upsert ────────────────────────────────────────────────────
  if (!hub) throw new Error('helpers file has no @hub block');
  const hubName = hub.directives.name;
  if (!hubName) throw new Error('@hub is missing `name:`');
  let hubUrl  = hub.directives.url || null;
  let hubCreated = false;
  let hubSkipped = false;

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
    // CREATE — always applied
    if (!hubUrl) hubUrl = URL_PREFIX + crypto.randomUUID();
    const r = await session.run(
      'CREATE (h:HelperHub {name: $name, url: $url}) RETURN h',
      { name: hubName, url: hubUrl }
    );
    hubNode = r.records[0].get('h');
    hubCreated = true;
  } else if (flagVal(hub, 'update_this') === 'true') {
    // UPDATE — only if flagged
    hubUrl = hubNode.properties.url;
    await session.run(
      'MATCH (h:HelperHub {url: $url}) SET h.name = $name',
      { url: hubUrl, name: hubName }
    );
  } else {
    // SKIP — existing node, flag not true
    hubUrl = hubNode.properties.url;
    hubSkipped = true;
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
    let skipped = false;
    let finalUrl = url;
    if (!hNode) {
      // CREATE — always applied
      finalUrl = finalUrl || (URL_PREFIX + crypto.randomUUID());
      const r = await session.run(
        `CREATE (h:HelperMessage {url: $url, name: $name, title: $title, trigger: $trigger, text: $text}) RETURN h`,
        { url: finalUrl, name, title, trigger, text }
      );
      hNode = r.records[0].get('h');
      created = true;
    } else if (flagVal(block, 'update_this') === 'true') {
      // UPDATE — only if flagged
      finalUrl = hNode.properties.url;
      await session.run(
        `MATCH (h:HelperMessage {url: $url})
         SET h.name = $name, h.title = $title, h.trigger = $trigger, h.text = $text`,
        { url: finalUrl, name, title, trigger, text }
      );
    } else {
      // SKIP — existing node, flag not true
      finalUrl = hNode.properties.url;
      skipped = true;
    }

    // Ensure the hub → helper edge unconditionally (MERGE is idempotent;
    // even skipped blocks need the edge in case a prior sync failed
    // between node create and edge merge).
    await session.run(
      `MATCH (hub:HelperHub {url: $hubUrl}), (h:HelperMessage {url: $hUrl})
       MERGE (hub)-[:CONTAINS_HELPER]->(h)`,
      { hubUrl, hUrl: finalUrl }
    );

    helperResults.push({ block, name, title, trigger, url: finalUrl, created, skipped, textLen: text.length });
  }

  return {
    hub: { name: hubName, url: hubUrl, created: hubCreated, skipped: hubSkipped },
    helpers: helperResults,
  };
}

// After a block was successfully created or updated in the DB, ensure
// its `@flag update_this: false` line is present in the .md — either
// replace an existing flag line in place (no line-index shift) or
// insert alongside any new @<kind> url line. Called per-block during
// the reverse-order write-back pass in cmdSyncHelpers.
function writeBackBlock(lines, block, kind, result) {
  const flagLineIdx = block.flagLines && block.flagLines.update_this;
  const flagLineText = `@flag update_this: false`;

  // Case A: existing flag line → replace in place (no shift). Safe
  // regardless of the block's other write-back operations.
  if (flagLineIdx !== undefined && flagLineIdx >= 0) {
    if (lines[flagLineIdx] !== flagLineText) {
      lines[flagLineIdx] = flagLineText;
    }
  }

  // Case B (and only if URL is new): batch inserts to a single splice
  // after the block's last directive line, so relative ordering of the
  // new lines is preserved and we shift subsequent lines just once.
  const newLines = [];
  if (result.created && !block.directives.url) {
    newLines.push(`@${kind} url: ${result.url}`);
  }
  if (!(flagLineIdx !== undefined && flagLineIdx >= 0)) {
    // Flag didn't exist → insert one so future syncs know this block's flag state
    newLines.push(flagLineText);
  }
  if (newLines.length) {
    lines.splice(block.lastDirectiveLine + 1, 0, ...newLines);
  }
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
      hub: {
        name: parsed.hub.directives.name,
        url: parsed.hub.directives.url || '(will generate)',
        flag: (parsed.hub.flags && parsed.hub.flags.update_this) || 'false',
      },
      helpers: parsed.helpers.map(b => ({
        name: b.directives.name, title: b.directives.title, trigger: b.directives.trigger,
        url: b.directives.url || '(will generate)', textLen: blockBody(b).length,
        flag: (b.flags && b.flags.update_this) || 'false',
      })),
      applied: false,
    };
  }

  const result = await runSession(s => syncHelpers(s, parsed.hub, parsed.helpers));

  // Write-back pass: for every block that was created OR updated (not
  // skipped), reset flag → false in the .md, and insert @<kind> url:
  // if newly created. Skipped blocks are untouched — they stay flagged
  // whatever they were (typically already false).
  //
  // Process blocks in REVERSE lastDirectiveLine order so any new
  // inserts in later blocks don't shift the line indices used by
  // earlier blocks. writeBackBlock handles the flag-replace-vs-insert
  // decision internally.
  const lines = parsed.lines.slice();
  const applied = [
    ...(result.hub.skipped ? [] : [{ block: parsed.hub, kind: 'hub', result: result.hub }]),
    ...parsed.helpers.map((b, i) => ({ block: b, kind: 'helper', result: result.helpers[i] }))
      .filter(x => !x.result.skipped),
  ];
  applied.sort((a, b) => b.block.lastDirectiveLine - a.block.lastDirectiveLine);
  for (const { block, kind, result: r } of applied) writeBackBlock(lines, block, kind, r);

  const anyWriteBack = applied.length > 0;
  if (anyWriteBack) {
    fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
    process.stderr.write(`[bd_tool] sync-helpers: wrote flag/url updates for ${applied.length} block(s) back to ${mdPath}\n`);
  }

  // Summary
  const createdCount = result.helpers.filter(h => h.created).length + (result.hub.created ? 1 : 0);
  const updatedCount = result.helpers.filter(h => !h.created && !h.skipped).length + (!result.hub.created && !result.hub.skipped ? 1 : 0);
  const skippedCount = result.helpers.filter(h => h.skipped).length + (result.hub.skipped ? 1 : 0);
  process.stderr.write(`[bd_tool] sync-helpers: created ${createdCount}, updated ${updatedCount}, skipped ${skippedCount}\n`);

  return {
    applied: true,
    hub: result.hub,
    helpers: result.helpers.map(h => ({
      name: h.name, title: h.title, trigger: h.trigger, url: h.url,
      created: h.created, skipped: h.skipped, textLen: h.textLen,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────
// backup — dump the whole graph to a replayable .cypher file
// (2026-07-16). Uses Memgraph's `DUMP DATABASE` which returns a
// sequence of records each carrying one Cypher statement in the
// QUERY column. Joining those with ';\n' produces a script you can
// pipe into mgconsole against a fresh instance to restore.
// ─────────────────────────────────────────────────────────────────────

function defaultBackupPath() {
  // YYYY-MM-DD_HHMMSS without punctuation that trips shells
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
                `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return path.join('backups', `memgraph_${stamp}.cypher`);
}

// ─────────────────────────────────────────────────────────────────────
// backfill-urls — assign a `butterflydreaming.org/n/<uuid>` url property
// to every node of the given labels that doesn't already have one
// (2026-07-16). Corpus-wide UUID identity backfill; needed because
// most Clusters + some Families predate the url convention that
// migrate_mm1.js introduced for TextNodes.
//
// Strategy: query candidates, generate uuids in JS (one per node),
// SET them in a single UNWIND'd statement. Identity via Neo4j
// elementId — reliable string round-trip. The URL guard on the
// SET (`AND (n.url IS NULL OR n.url = '')`) is a small race-condition
// safeguard against parallel writes.
// ─────────────────────────────────────────────────────────────────────

async function cmdBackfillUrls(labels, opts) {
  return runSession(async (s) => {
    // Note on Memgraph identifiers (2026-07-16): Memgraph doesn't
    // implement Neo4j's elementId(); use id() instead. id() returns
    // a numeric id that CAN collide with a relationship's id (they
    // share a numeric space) — so ALWAYS scope MATCH to nodes via
    // the (n) pattern rather than trying to match any element with
    // WHERE id() = X. The (n) pattern's node-only constraint
    // prevents any relationship match slipping through.
    const findRes = await s.run(
      `MATCH (n)
       WHERE ANY(l IN labels(n) WHERE l IN $labels)
         AND (n.url IS NULL OR n.url = '')
       RETURN id(n) AS nid, labels(n) AS labels, n.name AS name
       ORDER BY labels(n)[0], n.name`,
      { labels }
    );
    const candidates = findRes.records.map(r => ({
      nid:    r.get('nid'),   // plain JS number (disableLosslessIntegers)
      labels: r.get('labels'),
      name:   r.get('name'),
    }));
    if (candidates.length === 0) {
      process.stderr.write(`[bd_tool] backfill-urls: no nodes without url in labels ${labels.join(',')} — nothing to do\n`);
      return { candidates: 0, updated: 0, applied: !opts?.dryRun };
    }
    process.stderr.write(`[bd_tool] backfill-urls: ${candidates.length} candidate node(s) in labels ${labels.join(',')}\n`);
    if (opts && opts.dryRun) {
      process.stderr.write('[bd_tool] --dry-run: no writes\n');
      return { candidates: candidates.length, updated: 0, applied: false, sample: candidates.slice(0, 10) };
    }
    const updates = candidates.map(c => ({ nid: c.nid, url: URL_PREFIX + crypto.randomUUID() }));
    const updRes = await s.run(
      `UNWIND $updates AS row
       MATCH (n) WHERE id(n) = row.nid AND (n.url IS NULL OR n.url = '')
       SET n.url = row.url
       RETURN count(n) AS updated`,
      { updates }
    );
    const raw = updRes.records[0].get('updated');
    const updated = typeof raw === 'number' ? raw : Number(raw);
    process.stderr.write(`[bd_tool] backfill-urls: SET url on ${updated} node(s)\n`);
    return {
      candidates: candidates.length,
      updated,
      applied: true,
      labels,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// dump-nav-nodes — emit a multi-block .md file containing every node
// in the "navigation hub" of the graph (Root + Entry + Family +
// Cluster + gateway TextNodes + section_title TextNodes). Excludes
// the ~186 content TextNodes (chapter/verse chunks) which are much
// bigger + not part of the user's periodic review workflow.
//
// Format matches the `write` subcommand's patch format:
//   ## <human title> — <label>
//   @match url: <url>
//   @match name: <name>           (if node has one)
//   @match title: <title>         (if node has title but no name — mainly
//                                  for section_title TextNodes)
//   @flag update_this: false
//
//   @set text:
//   <current text — empty body if node has no text yet>
//
// Blocks separated by `---`. Ordering: Root → Entry (alpha) → Family
// (alpha) → Cluster (alpha) → gateway TextNodes (alpha by source_text)
// → section_title TextNodes (alpha by source_text then seq).
// ─────────────────────────────────────────────────────────────────────

function labelHeader(row) {
  const label = row.label;
  const gateway = !!row.gateway;
  const section_title = !!row.section_title;
  if (label === 'TextNode') {
    if (gateway) return `${row.name} — TextNode (gateway)`;
    if (section_title) {
      const anchor = row.title || row.name || '(untitled section)';
      const src = row.source_text ? ` [${row.source_text}]` : '';
      return `${anchor}${src} — TextNode (section title)`;
    }
    return `${row.name || row.title || '(unnamed)'} — TextNode`;
  }
  return `${row.name || '(unnamed)'} — ${label}`;
}

function renderPatchBlock(row) {
  const lines = [];
  lines.push(`## ${labelHeader(row)}`);
  lines.push('');
  if (row.url)   lines.push(`@match url: ${row.url}`);
  if (row.name)  lines.push(`@match name: ${row.name}`);
  if (row.title && !row.name) lines.push(`@match title: ${row.title}`);
  lines.push(`@flag update_this: false`);
  lines.push('');
  lines.push(`@set text:`);
  if (row.text && row.text.length > 0) {
    lines.push(row.text);
  }
  return lines.join('\n');
}

async function cmdDumpNavNodes(outPath) {
  const target = outPath || 'nav_nodes_text.md';
  const rows = await runSession(async (s) => {
    const r = await s.run(
      `MATCH (n)
       WHERE 'Root' IN labels(n)
          OR 'Entry' IN labels(n)
          OR 'Family' IN labels(n)
          OR 'Cluster' IN labels(n)
          OR (n:TextNode AND (n.gateway = true OR n.section_title = true))
       RETURN labels(n)[0] AS label,
              n.name AS name,
              n.title AS title,
              n.text AS text,
              n.url  AS url,
              coalesce(n.gateway, false)       AS gateway,
              coalesce(n.section_title, false) AS section_title,
              n.source_text AS source_text,
              n.seq AS seq
       ORDER BY
         CASE labels(n)[0]
           WHEN 'Root'     THEN 0
           WHEN 'Entry'    THEN 1
           WHEN 'Family'   THEN 2
           WHEN 'Cluster'  THEN 3
           WHEN 'TextNode' THEN 4
           ELSE 5
         END,
         CASE WHEN n.gateway = true THEN 0 ELSE 1 END,
         n.source_text,
         n.name,
         n.seq`
    );
    return r.records.map(rec => ({
      label:         rec.get('label'),
      name:          rec.get('name'),
      title:         rec.get('title'),
      text:          rec.get('text'),
      url:           rec.get('url'),
      gateway:       rec.get('gateway'),
      section_title: rec.get('section_title'),
      source_text:   rec.get('source_text'),
      seq:           rec.get('seq'),
    }));
  });

  const header = [
    `# Navigation node text — review sheet`,
    '',
    `Generated by \`node bd_tool.js dump-nav-nodes\` on ${new Date().toISOString().slice(0, 10)}.`,
    `Total: ${rows.length} nodes (Root + Entry + Family + Cluster + gateway/section-title TextNodes).`,
    `Content-chunk TextNodes are deliberately excluded from this scope.`,
    '',
    `To edit: change the body text under \`@set text:\`, flip \`@flag update_this:\` to \`true\`,`,
    `save, then \`node bd_tool.js write nav_nodes_text.md\`. Only flagged blocks are applied;`,
    `flags are auto-reset to \`false\` after each successful sync so this file stays honest.`,
    '',
    `Identity: url is the durable UUID key (all present after 2026-07-16 backfill); name`,
    `is a friendly secondary anchor. Section-title TextNodes have no name — matched via`,
    `\`@match title:\` fallback.`,
    '',
  ];

  const blocks = rows.map(renderPatchBlock);
  const body = header.join('\n') + '---\n\n' + blocks.join('\n\n---\n\n') + '\n';
  fs.writeFileSync(target, body, 'utf8');

  const byLabel = {};
  rows.forEach(r => { byLabel[r.label] = (byLabel[r.label] || 0) + 1; });

  process.stderr.write(`[bd_tool] dump-nav-nodes: wrote ${rows.length} blocks → ${target}\n`);
  process.stderr.write(`[bd_tool] dump-nav-nodes: by label = ${JSON.stringify(byLabel)}\n`);
  return { path: target, total: rows.length, byLabel };
}

// ─────────────────────────────────────────────────────────────────────
// dump-subfamily-candidates — SubFamily is not yet an explicit label;
// today it's just "a Family that has a Family parent via DESCENDS_FROM".
// Edge direction in the DB is Parent → Child (see server.js `CREATE
// (parent)-[:DESCENDS_FROM]->(c)`), so a SubFamily candidate is any
// node reached by (topFamily)-[:DESCENDS_FROM]->(sfCandidate) where
// both endpoints are :Family. The 6 top-level Families (Arts, Emotion,
// Nature, Reason, Spirit, Symbolic — children of :Conversations) are
// therefore excluded — they are the *sources*, not the *targets*, of
// Family→Family edges.
//
// Placeholder SubFamilies with zero Cluster children are valid — they
// are an intentional hold-open slot, so the curator marks them true
// even though structure alone can't distinguish them.
//
// A SubFamily may have multiple top-Family parents (DAG, not tree) —
// e.g. "Elements" can descend from both Nature and Spirit. All are
// listed with their per-edge weight.
//
// Block form:
//   ## <name>
//   @match url: <uuid>
//   @match name: <name>
//   @flag is_subfamily: false
//
//   top_family_parents: <Top1> (weight 0.7), <Top2> (weight 0.5)
//   cluster_children: <n>          # informational — 0 means placeholder
//
// ─────────────────────────────────────────────────────────────────────
async function cmdDumpSubfamilyCandidates(outPath) {
  const target = outPath || 'subfamily_candidates.md';
  const rows = await runSession(async (s) => {
    const r = await s.run(
      `MATCH (top:Family)-[dr:DESCENDS_FROM]->(sf:Family)
       WITH sf, collect({parent_name: top.name, parent_url: top.url, weight: coalesce(dr.weight, 0)}) AS parents
       OPTIONAL MATCH (sf)-[:DESCENDS_FROM]->(c:Cluster)
       WITH sf, parents, count(DISTINCT c) AS cluster_children
       RETURN sf.name AS name,
              sf.url  AS url,
              parents,
              cluster_children
       ORDER BY sf.name`
    );
    return r.records.map(rec => ({
      name:             rec.get('name'),
      url:              rec.get('url'),
      parents:          rec.get('parents') || [],
      cluster_children: rec.get('cluster_children'),
    }));
  });

  const header = [
    `# SubFamily candidates — review sheet`,
    '',
    `Generated by \`node bd_tool.js dump-subfamily-candidates\` on ${new Date().toISOString().slice(0, 10)}.`,
    `Total: ${rows.length} candidate(s) — every Family that has a Family parent`,
    `(via DESCENDS_FROM, direction Parent → Child). The 6 top-level Families`,
    `(Arts, Emotion, Nature, Reason, Spirit, Symbolic) are excluded because they`,
    `have no Family parent.`,
    '',
    `Placeholder rule: cluster_children = 0 is fine — a SubFamily with no Clusters yet`,
    `is a valid hold-open slot, and structure alone cannot distinguish it from a`,
    `non-SubFamily Family-child. Curator judgement decides.`,
    '',
    `DAG note: a SubFamily may have multiple top-Family parents (e.g. one`,
    `SubFamily descending from both Nature and Spirit). All parents listed`,
    `with per-edge weight.`,
    '',
    `To curate: for each block, flip \`@flag is_subfamily:\` to \`true\` if this node`,
    `should carry the \`:SubFamily\` label. Save. Step 2 (apply-subfamily-labels,`,
    `coming next) will read this file and add the label to flagged nodes, then`,
    `auto-reset the flag to false so the file stays honest.`,
    '',
  ];

  const blocks = rows.map(row => {
    const lines = [];
    lines.push(`## ${row.name || '(unnamed)'}`);
    lines.push('');
    if (row.url)  lines.push(`@match url: ${row.url}`);
    if (row.name) lines.push(`@match name: ${row.name}`);
    lines.push(`@flag is_subfamily: false`);
    lines.push('');
    const parentList = (row.parents || [])
      .map(p => `${p.parent_name} (weight ${p.weight})`)
      .join(', ');
    lines.push(`top_family_parents: ${parentList || '(none)'}`);
    lines.push(`cluster_children: ${row.cluster_children}`);
    return lines.join('\n');
  });

  const body = header.join('\n') + '---\n\n' + blocks.join('\n\n---\n\n') + '\n';
  fs.writeFileSync(target, body, 'utf8');

  const placeholders = rows.filter(r => r.cluster_children === 0).length;
  process.stderr.write(
    `[bd_tool] dump-subfamily-candidates: wrote ${rows.length} candidate(s) `
    + `(${placeholders} with 0 clusters) → ${target}\n`
  );
  return { path: target, candidates: rows.length, placeholders };
}

async function cmdBackup(outPath) {
  const target = outPath || defaultBackupPath();
  const dir = path.dirname(target);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  process.stderr.write(`[bd_tool] backup: dumping graph → ${target}\n`);
  const rows = await runSession(async (s) => {
    const r = await s.run('DUMP DATABASE');
    return r.records.map(rec => {
      // Memgraph DUMP DATABASE returns records with a 'QUERY' column
      // holding one Cypher statement per row.
      const q = rec.get('QUERY') !== undefined ? rec.get('QUERY') :
                rec.get('query') !== undefined ? rec.get('query') :
                null;
      return q;
    }).filter(Boolean);
  });

  // Assemble as a script — one statement per line, terminated with ;.
  // Statements from DUMP DATABASE don't include trailing ; themselves.
  const script = rows.map(q => q.endsWith(';') ? q : q + ';').join('\n') + '\n';
  fs.writeFileSync(target, script, 'utf8');
  const stat = fs.statSync(target);

  process.stderr.write(`[bd_tool] backup: wrote ${rows.length} statements, ${stat.size} bytes\n`);
  return { path: target, statements: rows.length, bytes: stat.size };
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
  node bd_tool.js backup [<outPath>]
  node bd_tool.js backfill-urls [--dry-run] [--labels L1,L2]
  node bd_tool.js dump-nav-nodes [<outPath>]
  node bd_tool.js dump-subfamily-candidates [<outPath>]

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
  } else if (cmd === 'backup') {
    const outPath = args.find(a => !a.startsWith('--'));
    out = await cmdBackup(outPath);
  } else if (cmd === 'dump-nav-nodes') {
    const outPath = args.find(a => !a.startsWith('--'));
    out = await cmdDumpNavNodes(outPath);
  } else if (cmd === 'dump-subfamily-candidates') {
    const outPath = args.find(a => !a.startsWith('--'));
    out = await cmdDumpSubfamilyCandidates(outPath);
  } else if (cmd === 'backfill-urls') {
    const dryRun = args.includes('--dry-run');
    let labels = ['Cluster', 'Family'];
    // Accept --labels=X,Y or --labels X,Y
    const eqArg = args.find(a => a.startsWith('--labels='));
    if (eqArg) {
      labels = eqArg.slice('--labels='.length).split(',').map(s => s.trim()).filter(Boolean);
    } else {
      const li = args.indexOf('--labels');
      if (li !== -1 && args[li + 1]) {
        labels = args[li + 1].split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    out = await cmdBackfillUrls(labels, { dryRun });
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
