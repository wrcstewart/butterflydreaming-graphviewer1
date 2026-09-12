// migrate_mm1.js — Amendment MediaModule and Node Names V1.0 (2026-07-05).
// One-shot migration: run with `node migrate_mm1.js` from the project root.
// Runs each Cypher block as its own transaction, prints progress, stops on
// the first error (nothing is atomic across steps — if something breaks
// mid-migration you'll be able to see exactly where and inspect the DB state).
//
// Idempotency: MM1.3 (create bd_V_Kolam_2) will fail on a second run because
// the second create would produce a duplicate. If you need to re-run, delete
// the newly created node first, or edit this file to skip the create step.

'use strict';

const crypto = require('crypto');
const neo4j  = require('neo4j-driver');

// Same connection config as server.js.
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

// Pre-generate the UUID in JS so we don't rely on Memgraph having randomUUID().
const kolam2Uuid = crypto.randomUUID();

const KOLAM_TEXT =
  '%%bd_module bd_V_Kolam\n' +
  '%%bd_symmetry 8\n' +
  '%%bd_depth 3\n' +
  '%%bd_step 40\n' +
  '%%bd_angle 68\n' +
  '%%bd_angle_minutes 0\n' +
  '%%bd_angle_drift 3\n' +
  '%%bd_colour_speed 4\n' +
  '%%bd_stroke angle\n' +
  '%%bd_saturation 100\n' +
  '%%bd_lightness 65\n' +
  '%%bd_background #0a0a0f\n' +
  '%%bd_weight 1.5\n' +
  '%%bd_score [\n' +
  'axiom: F+F+F+F+F+F+F+F\n' +
  'F: F+F-F-F+F+F+F-F\n' +
  '%%bd_]\n';

const KOLAM2_TEXT = KOLAM_TEXT.replace('%%bd_lightness 65', '%%bd_lightness 100');

// Ordered list of steps. Each has a `name` for logging, a `cypher` string,
// and optional `params`. `check` (optional) is an assertion on the result
// (throws Error on mismatch).
const steps = [
  {
    name: 'MM1.2a — rename Visual Tests gateway → bd_V_Kolam',
    cypher: `
      MATCH (n:TextNode {gateway: true, source_text: 'Visual Tests'})
      SET n.name = 'bd_V_Kolam', n.source_text = 'bd_V_Kolam'
      RETURN count(n) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 gateway to update, got ${c}`);
    }
  },
  {
    name: 'MM1.2b — rename Kolam_1 → bd_V_Kolam_1',
    cypher: `
      MATCH (n:TextNode {name: 'Kolam_1'})
      SET n.name = 'bd_V_Kolam_1', n.source_text = 'bd_V_Kolam'
      RETURN count(n) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 TextNode (Kolam_1) to update, got ${c}`);
    }
  },
  {
    name: 'MM1.2c — update text of bd_V_Kolam_1 (uses bd_V_Kolam module id)',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam_1'})
      SET n.text = $text
      RETURN count(n) AS c
    `,
    params: { text: KOLAM_TEXT },
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 TextNode (bd_V_Kolam_1) to update text, got ${c}`);
    }
  },
  {
    name: 'MM1.2d — rename Cluster Visual Test → bd_V_Kolam',
    cypher: `
      MATCH (c:Cluster {name: 'Visual Test'})
      SET c.name = 'bd_V_Kolam', c.display_name = 'bd_V_Kolam', c.label = 'bd_V_Kolam'
      RETURN count(c) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 Cluster (Visual Test) to update, got ${c}`);
    }
  },
  {
    name: 'MM1.3a — create bd_V_Kolam_2 (UUID pre-generated in JS)',
    cypher: `
      CREATE (n:TextNode {
        name: 'bd_V_Kolam_2',
        source_text: 'bd_V_Kolam',
        url: $url,
        text: $text,
        module_type: 'visual',
        gateway: false,
        tagging_status: 'complete',
        seq: 2,
        n_r: 0,
        created_at: datetime('2026-07-05T10:00:00.000000Z')
      })
      RETURN n.name AS name
    `,
    params: {
      url:  'butterflydreaming.org/n/' + kolam2Uuid,
      text: KOLAM2_TEXT
    },
    check: (rec) => {
      if (rec.get('name') !== 'bd_V_Kolam_2') throw new Error('bd_V_Kolam_2 not created');
    }
  },
  {
    name: 'MM1.3b — CHILD edge gateway → bd_V_Kolam_2',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'}),
            (n:TextNode {name: 'bd_V_Kolam_2'})
      CREATE (gw)-[r:CHILD {weight: 1.0, source: 'sequence',
             created_at: datetime('2026-07-05T10:00:00.000000Z')}]->(n)
      RETURN count(r) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 CHILD edge created, got ${c}`);
    }
  },
  {
    name: 'MM1.3c — CLUSTER_REL bd_V_Kolam_2 → Cluster bd_V_Kolam',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam_2'}),
            (c:Cluster {name: 'bd_V_Kolam'})
      CREATE (n)-[r:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN count(r) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 CLUSTER_REL edge created, got ${c}`);
    }
  },
  {
    name: 'MM1.4a — refresh gateway n_r (count of CHILDs)',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})
      OPTIONAL MATCH (gw)-[:CHILD]->(child)
      WITH gw, count(child) AS child_count
      SET gw.n_r = child_count
      RETURN gw.n_r AS n_r
    `,
    check: (rec) => {
      const nr = num(rec.get('n_r'));
      if (nr !== 2) throw new Error(`expected gateway.n_r = 2, got ${nr}`);
    }
  },
  {
    name: 'MM1.4b — refresh cluster n_r (count of TextNode members)',
    cypher: `
      MATCH (c:Cluster {name: 'bd_V_Kolam'})
      OPTIONAL MATCH (c)--(m)
      WHERE NOT m:Family AND NOT m:Root AND NOT (m:TextNode AND m.gateway = true)
      WITH c, count(m) AS rel_count
      SET c.n_r = rel_count
      RETURN c.n_r AS n_r
    `,
    check: (rec) => {
      const nr = num(rec.get('n_r'));
      if (nr !== 2) throw new Error(`expected cluster.n_r = 2, got ${nr}`);
    }
  },
  {
    name: 'MM1.5a — delete existing CONTAINS_CLUSTER edges from gateway',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})-[r:CONTAINS_CLUSTER]->()
      DELETE r
      RETURN count(*) AS c
    `
  },
  {
    name: 'MM1.5b — rebuild CONTAINS_CLUSTER edges',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})
      MATCH (n:TextNode {source_text: 'bd_V_Kolam'})-[r]->(c:Cluster)
      WHERE n.gateway = false AND n.section_title IS NULL
      WITH gw, c, count(n) AS textCount
      CREATE (gw)-[:CONTAINS_CLUSTER {count: textCount}]->(c)
      RETURN c.name AS cluster, textCount
    `
  },
  {
    name: 'MM1.7 — verify children',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})-[:CHILD]->(n:TextNode)
      RETURN n.name AS name, n.seq AS seq, n.source_text AS source_text
      ORDER BY n.seq
    `,
    isVerify: true
  },
  {
    name: 'MM1.7 — verify cluster n_r',
    cypher: `
      MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})-[:CONTAINS_CLUSTER]->(c:Cluster)
      RETURN c.name AS cluster, c.n_r AS n_r
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log(`[MM1] Starting migration — bd_V_Kolam_2 will get url=butterflydreaming.org/n/${kolam2Uuid}`);
    for (const [i, step] of steps.entries()) {
      const label = `[${String(i + 1).padStart(2)}/${steps.length}]`;
      process.stdout.write(`${label} ${step.name} … `);
      try {
        const result = await session.run(step.cypher, step.params || {});
        const records = result.records;
        if (step.isVerify) {
          console.log('OK');
          records.forEach(rec => {
            const obj = {};
            for (const key of rec.keys) obj[key] = num(rec.get(key));
            console.log('        ', JSON.stringify(obj));
          });
        } else {
          if (step.check && records.length > 0) step.check(records[0]);
          console.log('OK');
        }
      } catch (err) {
        console.log('FAIL');
        console.error(`        ${err.message}`);
        console.error('\nStopping. Nothing done in later steps. Inspect the DB, fix, and re-run from where this one left off (edit this script to skip completed steps if needed).');
        process.exitCode = 1;
        return;
      }
    }
    console.log('\n[MM1] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[MM1] Uncaught error:', err);
  process.exitCode = 1;
});
