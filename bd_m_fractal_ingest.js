// bd_m_fractal_ingest.js — one-shot: create Cluster bd_M_Fractal under existing
// SubFamily M_Music, gateway TextNode + first content node bd_M_Fractal_001
// (default L-system Peano grammar from bd_M_Fractal/preview.html DEFAULT_SCRIPT).
//
// Sibling to bd_m_abc_ingest.js — same schema shape:
//   • Gateway TextNode: gateway=true, seq=-1, source_text='bd_M_Fractal',
//     tagging_status='complete', n_r=<child-count>, url=butterflydreaming.org/n/<uuid>
//   • Content TextNode: gateway=false, seq=1, hasModuleScript='bd_M_Fractal',
//     module_type='music', source_text='bd_M_Fractal'
//   • Edges: (gw)-[:CHILD]->(content), (content)-[:CLUSTER_REL]->(Cluster),
//            (gw)-[:CONTAINS_CLUSTER]->(Cluster), (Cluster)-[:DESCENDS_FROM]->(SubFamily M_Music)
//
// PRE-FLIGHT: run `node bd_tool.js backup` first (backup-safety memory rule).
// Not idempotent — assumes bd_M_Fractal Cluster / TextNodes don't yet exist.

'use strict';

const crypto = require('crypto');
const neo4j  = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

const clusterUuid  = crypto.randomUUID();
const gatewayUuid  = crypto.randomUUID();
const content1Uuid = crypto.randomUUID();

const GATEWAY_TEXT =
  'Fractal music nodes — L-system grammars sonified as ABC melodies via ' +
  'a turtle walk, pitch-reflection wall bounce, tonic scan and chord voicing. ' +
  'Edit the axiom / rules / iterations in the script pane; steppers on the right ' +
  'adjust tempo, scale, and effects. Renders through Tone.js with bass-recorder ' +
  'samples. Copy for ABC Player exports the derived ABC to a bd_M_ABC-ready block.';

// Verbatim DEFAULT_SCRIPT from bd_M_Fractal/preview.html (2026-08-08).
const CONTENT1_TEXT =
  '%%bd_module bd_M_Fractal\n' +
  '%%bd_axiom X\n' +
  '%%bd_rule X: XFYFX+F+YFXFY-F-XFYFX\n' +
  '%%bd_rule Y: YFXFY-F-XFYFX+F+YFXFY\n' +
  '%%bd_iterations 5\n' +
  '%%bd_angle 90\n' +
  '%%bd_scale minor_pentatonic\n' +
  '%%bd_root C,\n' +
  '%%bd_step_seconds 0.2\n' +
  '%%bd_vertical_time 0.2\n' +
  '%%bd_reverb_wet 0.35\n' +
  '%%bd_reverb_decay 2.5\n' +
  '%%bd_vibrato_frequency 5.0\n' +
  '%%bd_vibrato_depth 0.15\n' +
  '%%bd_chorus_wet 0.2\n' +
  '%%bd_chorus_depth 0.3\n' +
  '%%bd_loop false\n' +
  '%%bd_loop_gap 6\n' +
  '%%bd_offset2 30\n' +
  '%%bd_offset3 60\n';

const steps = [
  {
    name: 'F1 — create Cluster bd_M_Fractal',
    cypher: `
      CREATE (c:Cluster {
        name: 'bd_M_Fractal',
        display_name: 'bd_M_Fractal',
        label: 'bd_M_Fractal',
        url: $url,
        tagging_status: 'complete',
        n_r: 0,
        created_at: datetime()
      })
      RETURN c.name AS name
    `,
    params: { url: 'butterflydreaming.org/n/' + clusterUuid },
    check: (rec) => {
      if (rec.get('name') !== 'bd_M_Fractal') throw new Error('Cluster not created');
    }
  },
  {
    name: 'F2 — DESCENDS_FROM edge Cluster bd_M_Fractal → SubFamily M_Music',
    cypher: `
      MATCH (c:Cluster {name: 'bd_M_Fractal'}),
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
    name: 'F3 — create gateway TextNode bd_M_Fractal',
    cypher: `
      CREATE (gw:TextNode {
        name: 'bd_M_Fractal',
        source_text: 'bd_M_Fractal',
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
      if (rec.get('name') !== 'bd_M_Fractal') throw new Error('gateway not created');
    }
  },
  {
    name: 'F4 — create content TextNode bd_M_Fractal_001',
    cypher: `
      CREATE (n:TextNode {
        name: 'bd_M_Fractal_001',
        source_text: 'bd_M_Fractal',
        url: $url,
        text: $text,
        hasModuleScript: 'bd_M_Fractal',
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
      if (rec.get('name') !== 'bd_M_Fractal_001') throw new Error('bd_M_Fractal_001 not created');
    }
  },
  {
    name: 'F5 — CHILD edge gateway → bd_M_Fractal_001',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_Fractal', gateway: true}),
            (n:TextNode  {name: 'bd_M_Fractal_001'})
      CREATE (gw)-[:CHILD {weight: 1.0, source: 'sequence', created_at: datetime()}]->(n)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CHILD edge not created');
    }
  },
  {
    name: 'F6 — CLUSTER_REL bd_M_Fractal_001 → Cluster bd_M_Fractal',
    cypher: `
      MATCH (n:TextNode {name: 'bd_M_Fractal_001'}),
            (c:Cluster  {name: 'bd_M_Fractal'})
      CREATE (n)-[:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CLUSTER_REL not created');
    }
  },
  {
    name: 'F7 — CONTAINS_CLUSTER gateway → Cluster bd_M_Fractal (count=1)',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_Fractal', gateway: true}),
            (c:Cluster  {name: 'bd_M_Fractal'})
      CREATE (gw)-[:CONTAINS_CLUSTER {count: 1}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CONTAINS_CLUSTER not created');
    }
  },
  {
    name: 'F8 — refresh gateway n_r (count of CHILDs)',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_Fractal', gateway: true})
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
    name: 'F9 — refresh Cluster n_r (count of non-gateway non-section-title TextNodes via CLUSTER_REL)',
    cypher: `
      MATCH (c:Cluster {name: 'bd_M_Fractal'})
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
    name: 'VERIFY — bd_M_Fractal gateway edges',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_M_Fractal', gateway: true})
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
    console.log(`[bd_M_Fractal ingest] UUIDs — cluster=${clusterUuid} gateway=${gatewayUuid} content1=${content1Uuid}`);
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
    console.log('\n[bd_M_Fractal ingest] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[bd_M_Fractal ingest] Uncaught error:', err);
  process.exitCode = 1;
});
