// bd_m_abc_ingest.js — one-shot: rename SubFamily "Sounds" → "M_Music",
// create Cluster bd_M_ABC + gateway TextNode + first content node
// bd_M_ABC_001 (default ABC from music_1's index.html demo).
//
// Follows the du_fu_ingest.js template + migrate_mm1/mm2 schema:
//   • Gateway TextNode props: gateway=true, seq=-1, source_text='bd_M_ABC',
//     tagging_status='complete', n_r=<child-count>, url=butterflydreaming.org/n/<uuid>
//   • Content TextNode props: gateway=false, seq=1..N, hasModuleScript='bd_M_ABC',
//     module_type='music', source_text='bd_M_ABC'
//   • Edges: (gw)-[:CHILD {weight, source, created_at}]->(content)
//            (content)-[:CLUSTER_REL {tagged_as: 1.0}]->(bd_M_ABC Cluster)
//            (gw)-[:CONTAINS_CLUSTER {count}]->(bd_M_ABC Cluster)
//            (bd_M_ABC:Cluster)-[:DESCENDS_FROM]->(M_Music:SubFamily)
//
// PRE-FLIGHT: run `node bd_tool.js backup` first (backup-safety memory rule).
//
// Idempotency: rename is match-on-old-name (safe on re-run). Cluster / gateway
// / content creates use MERGE where safe, CREATE where uniqueness is enforced
// by name. Re-running after success is not needed and NOT verified safe.

'use strict';

const crypto = require('crypto');
const neo4j  = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

// UUIDs pre-generated in JS (Memgraph doesn't have randomUUID()).
const clusterUuid  = crypto.randomUUID();
const gatewayUuid  = crypto.randomUUID();
const content1Uuid = crypto.randomUUID();

const CREATED_AT = 'datetime()';   // use current time via Cypher

// Gateway prose — descriptive intro shown when a user taps the bd_M_ABC
// gateway node. Kept as a single chunk (no %%bd_chunk splits).
const GATEWAY_TEXT =
  'Music media nodes — ABC-notation compositions played via Tone.js with ' +
  'bass-recorder samples. The bd_M_ABC player renders each %%bd_score block ' +
  'as sound; the stepper column on the right adjusts reverb, vibrato, chorus ' +
  'and looping. Buttons on the left copy the script, share via deep link, or ' +
  'bake the current audio to an mp3 that plays in the bottom bar.';

// bd_M_ABC_001 script — the demo from music_1's index.html, with the module
// identifier switched from the legacy filename ('music_module.html') to the
// registry key ('bd_M_ABC') so BD's MM1.6 loader picks it up.
const CONTENT1_TEXT =
  '%%bd_module bd_M_ABC\n' +
  '%%bd_reverb_wet 0.35\n' +
  '%%bd_reverb_decay 2.5\n' +
  '%%bd_vibrato_frequency 5.0\n' +
  '%%bd_vibrato_depth 0.2\n' +
  '%%bd_chorus_wet 0.3\n' +
  '%%bd_chorus_depth 0.4\n' +
  '%%bd_loop true\n' +
  '%%bd_loop_gap 6\n' +
  '%%bd_score [\n' +
  'X:1\n' +
  'T:Dream Fragment\n' +
  'M:4/4\n' +
  'L:1/8\n' +
  'Q:1/4=60\n' +
  'K:Amin\n' +
  '|A2 B2 [CEA]4 d2|e4 [EAc]4|\n' +
  '|A2 c2 e2 c2|A4 E4|\n' +
  '%%bd_]\n';

const steps = [
  {
    name: 'M1 — rename SubFamily Sounds → M_Music',
    cypher: `
      MATCH (sf {name: 'Sounds'})
      WHERE 'SubFamily' IN labels(sf)
      SET sf.name = 'M_Music'
      RETURN count(sf) AS c
    `,
    check: (rec) => {
      const c = num(rec.get('c'));
      if (c !== 1) throw new Error(`expected 1 SubFamily renamed, got ${c}`);
    }
  },
  {
    name: 'M2 — create Cluster bd_M_ABC',
    cypher: `
      CREATE (c:Cluster {
        name: 'bd_M_ABC',
        display_name: 'bd_M_ABC',
        label: 'bd_M_ABC',
        url: $url,
        tagging_status: 'complete',
        n_r: 0,
        created_at: datetime()
      })
      RETURN c.name AS name
    `,
    params: { url: 'butterflydreaming.org/n/' + clusterUuid },
    check: (rec) => {
      if (rec.get('name') !== 'bd_M_ABC') throw new Error('Cluster not created');
    }
  },
  {
    name: 'M3 — DESCENDS_FROM edge Cluster bd_M_ABC → SubFamily M_Music',
    cypher: `
      MATCH (c:Cluster {name: 'bd_M_ABC'}),
            (sf {name: 'M_Music'})
      WHERE 'SubFamily' IN labels(sf)
      CREATE (c)-[:DESCENDS_FROM]->(sf)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('edge not created');
    }
  },
  {
    name: 'M4 — create gateway TextNode bd_M_ABC',
    cypher: `
      CREATE (gw:TextNode {
        name: 'bd_M_ABC',
        source_text: 'bd_M_ABC',
        url: $url,
        text: $text,
        gateway: true,
        tagging_status: 'complete',
        seq: -1,
        n_r: 0,
        created_at: datetime()
      })
      RETURN gw.name AS name
    `,
    params: {
      url:  'butterflydreaming.org/n/' + gatewayUuid,
      text: GATEWAY_TEXT
    },
    check: (rec) => {
      if (rec.get('name') !== 'bd_M_ABC') throw new Error('gateway not created');
    }
  },
  {
    name: 'M5 — create content TextNode bd_M_ABC_001',
    cypher: `
      CREATE (n:TextNode {
        name: 'bd_M_ABC_001',
        source_text: 'bd_M_ABC',
        url: $url,
        text: $text,
        hasModuleScript: 'bd_M_ABC',
        module_type: 'music',
        gateway: false,
        tagging_status: 'complete',
        seq: 1,
        n_r: 0,
        created_at: datetime()
      })
      RETURN n.name AS name
    `,
    params: {
      url:  'butterflydreaming.org/n/' + content1Uuid,
      text: CONTENT1_TEXT
    },
    check: (rec) => {
      if (rec.get('name') !== 'bd_M_ABC_001') throw new Error('bd_M_ABC_001 not created');
    }
  },
  {
    name: 'M6 — CHILD edge gateway → bd_M_ABC_001',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_ABC', gateway: true}),
            (n:TextNode  {name: 'bd_M_ABC_001'})
      CREATE (gw)-[:CHILD {weight: 1.0, source: 'sequence', created_at: datetime()}]->(n)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CHILD edge not created');
    }
  },
  {
    name: 'M7 — CLUSTER_REL bd_M_ABC_001 → Cluster bd_M_ABC',
    cypher: `
      MATCH (n:TextNode {name: 'bd_M_ABC_001'}),
            (c:Cluster  {name: 'bd_M_ABC'})
      CREATE (n)-[:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CLUSTER_REL not created');
    }
  },
  {
    name: 'M8 — CONTAINS_CLUSTER gateway → Cluster bd_M_ABC (count=1)',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_ABC', gateway: true}),
            (c:Cluster  {name: 'bd_M_ABC'})
      CREATE (gw)-[:CONTAINS_CLUSTER {count: 1}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CONTAINS_CLUSTER not created');
    }
  },
  {
    name: 'M9 — refresh gateway n_r (count of CHILDs)',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_ABC', gateway: true})
      OPTIONAL MATCH (gw)-[:CHILD]->(ch)
      WITH gw, count(ch) AS c
      SET gw.n_r = c
      RETURN gw.n_r AS n_r
    `,
    check: (rec) => {
      const nr = num(rec.get('n_r'));
      if (nr !== 1) throw new Error(`expected gateway.n_r = 1, got ${nr}`);
    }
  },
  {
    name: 'M10 — refresh Cluster n_r (count of TextNode members via CLUSTER_REL, non-gateway)',
    // Matches server.js edit_save refresh semantics: count non-gateway TextNodes
    // touching this cluster via CLUSTER_REL. Section-title excluded (there are
    // none for a module-linked corpus, but the pattern is safe).
    cypher: `
      MATCH (c:Cluster {name: 'bd_M_ABC'})
      OPTIONAL MATCH (n:TextNode)-[:CLUSTER_REL]->(c)
      WITH c, n WHERE n IS NULL OR (n.gateway = false AND n.section_title IS NULL)
      WITH c, count(n) AS total
      SET c.n_r = total
      RETURN c.n_r AS n_r
    `,
    check: (rec) => {
      const nr = num(rec.get('n_r'));
      if (nr !== 1) throw new Error(`expected cluster.n_r = 1, got ${nr}`);
    }
  },
  {
    name: 'VERIFY — SubFamily M_Music neighbourhood',
    cypher: `
      MATCH (sf {name: 'M_Music'})
      WHERE 'SubFamily' IN labels(sf)
      OPTIONAL MATCH (sf)-[r]-(x)
      RETURN type(r) AS rel, labels(x) AS x_lbl, x.name AS x_name
      ORDER BY x.name
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — bd_M_ABC gateway edges',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_ABC', gateway: true})
      OPTIONAL MATCH (gw)-[r]-(x)
      RETURN type(r) AS rel, labels(x) AS x_lbl, x.name AS x_name
      ORDER BY x.name
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log(`[bd_M_ABC ingest] UUIDs — cluster=${clusterUuid} gateway=${gatewayUuid} content1=${content1Uuid}`);
    for (const [i, step] of steps.entries()) {
      const label = `[${String(i + 1).padStart(2)}/${steps.length}]`;
      process.stdout.write(`${label} ${step.name} … `);
      try {
        const result = await session.run(step.cypher, step.params || {});
        const records = result.records;
        if (step.isVerify) {
          console.log('OK');
          if (records.length === 0) console.log('         (no rows)');
          else records.forEach(rec => {
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
        console.error('\nStopping. Inspect the DB, fix, and re-run (edit this script to skip completed steps if needed).');
        process.exitCode = 1;
        return;
      }
    }
    console.log('\n[bd_M_ABC ingest] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[bd_M_ABC ingest] Uncaught error:', err);
  process.exitCode = 1;
});
