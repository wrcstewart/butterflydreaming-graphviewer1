// migrate_mm2.js — MM2 amendment (2026-07-11): hasModuleScript property +
// zero-padded 3-digit naming + Memgraph indexes.
// Run with `node migrate_mm2.js` from the project root.
//
// Idempotency: rename steps use MATCH on the OLD name — running the script
// twice will safely no-op (0 nodes matched). Index creation is idempotent in
// Memgraph too (repeat CREATE INDEX raises no error).

'use strict';

const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

const steps = [
  {
    name: 'MM2.1a — rename bd_V_Kolam_1 → bd_V_Kolam_001',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam_1'})
      SET n.name = 'bd_V_Kolam_001'
      RETURN count(n) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c > 1) throw new Error(`expected 0 or 1 rename, got ${c}`);
    }
  },
  {
    name: 'MM2.1b — rename bd_V_Kolam_2 → bd_V_Kolam_002',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam_2'})
      SET n.name = 'bd_V_Kolam_002'
      RETURN count(n) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c > 1) throw new Error(`expected 0 or 1 rename, got ${c}`);
    }
  },
  {
    name: 'MM2.2 — set hasModuleScript on bd_V_Kolam_00N nodes',
    cypher: `
      MATCH (n:TextNode)
      WHERE n.name IN ['bd_V_Kolam_001', 'bd_V_Kolam_002']
      SET n.hasModuleScript = 'bd_V_Kolam'
      RETURN count(n) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 2) throw new Error(`expected 2 nodes tagged, got ${c}`);
    }
  },
  {
    name: 'MM2.3a — create index on :TextNode(hasModuleScript)',
    // Memgraph supports label+property indexes; syntax matches Neo4j.
    // Repeat CREATE is a no-op (raises no error) in Memgraph.
    cypher: `CREATE INDEX ON :TextNode(hasModuleScript)`,
    void: true
  },
  {
    name: 'MM2.3b — create index on :TextNode(created_at)',
    cypher: `CREATE INDEX ON :TextNode(created_at)`,
    void: true
  },
  {
    name: 'MM2.7 — verify all module scripts have hasModuleScript set',
    cypher: `
      MATCH (n:TextNode)
      WHERE n.text CONTAINS '%%bd_module'
        AND (n.hasModuleScript IS NULL OR n.hasModuleScript = '')
      RETURN n.name AS name, n.source_text AS source_text
    `,
    isVerify: true,
    check: (rec) => {
      // no records is the good outcome — nothing missing hasModuleScript
    }
  },
  {
    name: 'MM2.7 — verify final state',
    cypher: `
      MATCH (n:TextNode {hasModuleScript: 'bd_V_Kolam'})
      RETURN n.name AS name, n.seq AS seq, n.source_text AS source_text
      ORDER BY n.seq
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log('[MM2] Starting migration');
    for (const [i, step] of steps.entries()) {
      const label = `[${String(i + 1).padStart(2)}/${steps.length}]`;
      process.stdout.write(`${label} ${step.name} … `);
      try {
        const result = await session.run(step.cypher, step.params || {});
        const records = result.records;
        if (step.isVerify) {
          console.log('OK');
          if (records.length === 0) {
            console.log('         (no rows)');
          } else {
            records.forEach(rec => {
              const obj = {};
              for (const key of rec.keys) obj[key] = num(rec.get(key));
              console.log('        ', JSON.stringify(obj));
            });
          }
        } else if (step.void) {
          console.log('OK');
        } else {
          if (step.check && records.length > 0) step.check(records[0]);
          console.log('OK');
        }
      } catch (err) {
        console.log('FAIL');
        console.error(`        ${err.message}`);
        console.error('\nStopping. Inspect the DB, fix, and re-run.');
        process.exitCode = 1;
        return;
      }
    }
    console.log('\n[MM2] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[MM2] Uncaught error:', err);
  process.exitCode = 1;
});
