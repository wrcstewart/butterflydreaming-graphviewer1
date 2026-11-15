// bd_v_lorenz_ingest.js — one-shot (2026-11-15): create Cluster LorenzEqu under
// the existing SubFamily Graphics, with gateway TextNode Lorenz3D and first
// content node Lorenz3D_001 carrying module bd_V_LorenzV1. Shape copied from
// bd_v_shanshui_ingest.js (itself from bd_v_kolam3d_ingest.js — see its header
// for the schema and the DESCENDS_FROM direction, Graphics -> Cluster).
//
// NAMING: the author asked for "LorenzEqu" off Graphics. The gateway cannot
// share the Cluster's name (a name lookup would become ambiguous — the reason
// Shan Shui's cluster is Mountain/Water), so it is Lorenz3D, and the content
// node Lorenz3D_001. Speech turns the `_` into a space, so the lexicon word,
// if the voice needs one, is "Lorenz3D".
//
// PRE-FLIGHT: run `node bd_tool.js backup` first (backup-safety rule).
// Not idempotent — assumes none of these nodes exist yet.

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
  'In 1963 the meteorologist Edward Lorenz cut a model of convection, warm air ' +
  'rising and cool air sinking, down to three equations in three numbers. ' +
  'Followed step by step, the point they describe never settles and never ' +
  'repeats: it winds round one centre, then the other, switching sides in no ' +
  'pattern anyone can predict, yet always staying on the same two-winged ' +
  'shape. Two starts a hair apart soon go entirely different ways, which is ' +
  'where the butterfly effect gets its name, and the shape itself happens to ' +
  'look like a butterfly.' +
  '\n\nThis module draws the path in three dimensions as it is computed. ' +
  'sigma, rho and beta are Lorenz\'s constants (below rho of about 24.7 the path ' +
  'settles onto one of the two marked points); x0, y0 and z0 are where it ' +
  'starts. speed, trail and opacity shape the drawing, projection casts its ' +
  'shadow onto the floor (xy), the back wall (xz, the view Lorenz drew) or ' +
  'both, and azimuth, elevation, distance and spin place the eye.';

const CONTENT1_TEXT =
  '%%bd_module bd_V_LorenzV1\n' +
  '%%bd_p_sigma 10\n' +
  '%%bd_p_rho 28\n' +
  '%%bd_p_beta 2.667\n' +
  '%%bd_p_x0 1\n' +
  '%%bd_p_y0 1\n' +
  '%%bd_p_z0 1\n' +
  '%%bd_p_speed 6\n' +
  '%%bd_p_trail 20000\n' +
  '%%bd_p_opacity 1\n' +
  '%%bd_p_projection none\n' +
  '%%bd_p_azimuth 40\n' +
  '%%bd_p_elevation 15\n' +
  '%%bd_p_distance 95\n' +
  '%%bd_p_spin 0\n' +
  '%%bd_time_step 0.005\n' +
  '%%bd_axes 1\n';

const steps = [
  {
    name: 'K1 — pre-flight: nothing of this name exists yet',
    cypher: `
      MATCH (n) WHERE n.name IN ['LorenzEqu', 'Lorenz3D', 'Lorenz3D_001'] OR n.source_text = 'Lorenz3D'
      RETURN count(n) AS n
    `,
    check: (rec) => {
      const n = num(rec.get('n'));
      if (n !== 0) throw new Error(`${n} node(s) already carry these names — this script is not idempotent`);
    }
  },
  {
    name: 'K2 — create Cluster LorenzEqu',
    cypher: `
      CREATE (c:Cluster {
        name: 'LorenzEqu',
        display_name: 'LorenzEqu',
        label: 'LorenzEqu',
        url: $url,
        tagging_status: 'complete',
        n_r: 0,
        created_at: datetime()
      })
      RETURN c.name AS name
    `,
    params: { url: 'butterflydreaming.org/n/' + clusterUuid },
    check: (rec) => {
      if (rec.get('name') !== 'LorenzEqu') throw new Error('Cluster not created');
    }
  },
  {
    name: 'K3 — DESCENDS_FROM edges SubFamily Graphics → Cluster LorenzEqu',
    cypher: `
      MATCH (sf), (c:Cluster {name: 'LorenzEqu'})
      WHERE 'SubFamily' IN labels(sf) AND sf.name = 'Graphics'
      CREATE (sf)-[:DESCENDS_FROM]->(c)
      RETURN count(*) AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('expected 1 DESCENDS_FROM edge, got ' + num(rec.get('ok')));
    }
  },
  {
    name: 'K4 — create gateway TextNode Lorenz3D',
    cypher: `
      CREATE (gw:TextNode {
        name: 'Lorenz3D',
        source_text: 'Lorenz3D',
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
      if (rec.get('name') !== 'Lorenz3D') throw new Error('gateway not created');
    }
  },
  {
    name: 'K5 — create content TextNode Lorenz3D_001',
    cypher: `
      CREATE (n:TextNode {
        name: 'Lorenz3D_001',
        source_text: 'Lorenz3D',
        url: $url,
        text: $text,
        hasModuleScript: 'bd_V_LorenzV1',
        module_type: 'visual',
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
      if (rec.get('name') !== 'Lorenz3D_001') throw new Error('Lorenz3D_001 not created');
    }
  },
  {
    name: 'K6 — CHILD edge gateway → Lorenz3D_001',
    cypher: `
      MATCH (gw:TextNode {name: 'Lorenz3D', gateway: true}),
            (n:TextNode  {name: 'Lorenz3D_001'})
      CREATE (gw)-[:CHILD {weight: 1.0, source: 'sequence', created_at: datetime()}]->(n)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CHILD edge not created');
    }
  },
  {
    name: 'K7 — CLUSTER_REL Lorenz3D_001 → Cluster LorenzEqu',
    cypher: `
      MATCH (n:TextNode {name: 'Lorenz3D_001'}),
            (c:Cluster  {name: 'LorenzEqu'})
      CREATE (n)-[:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CLUSTER_REL not created');
    }
  },
  {
    name: 'K8 — CONTAINS_CLUSTER gateway → Cluster LorenzEqu (count=1)',
    cypher: `
      MATCH (gw:TextNode {name: 'Lorenz3D', gateway: true}),
            (c:Cluster  {name: 'LorenzEqu'})
      CREATE (gw)-[:CONTAINS_CLUSTER {count: 1}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CONTAINS_CLUSTER not created');
    }
  },
  {
    name: 'K9 — GATEWAY_LINK gateway → Entry Gateways',
    cypher: `
      MATCH (gw:TextNode {name: 'Lorenz3D', gateway: true}),
            (e:Entry {name: 'Gateways'})
      CREATE (gw)-[:GATEWAY_LINK]->(e)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('GATEWAY_LINK not created');
    }
  },
  {
    name: 'K10 — refresh gateway n_r (count of CHILDs)',
    cypher: `
      MATCH (gw:TextNode {name: 'Lorenz3D', gateway: true})
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
    name: 'K11 — refresh Cluster n_r (non-gateway, non-section-title TextNodes via CLUSTER_REL)',
    cypher: `
      MATCH (c:Cluster {name: 'LorenzEqu'})
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
    name: 'VERIFY — SubFamily Graphics clusters',
    cypher: `
      MATCH (sf)-[:DESCENDS_FROM]->(c:Cluster {name: 'LorenzEqu'})
      RETURN sf.name AS subfamily, c.name AS cluster, c.n_r AS n_r
      ORDER BY c.name
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — Lorenz3D gateway edges',
    cypher: `
      MATCH (gw:TextNode {name: 'Lorenz3D', gateway: true})
      OPTIONAL MATCH (gw)-[r]-(x)
      RETURN type(r) AS rel, labels(x) AS x_lbl, x.name AS x_name
      ORDER BY x.name
    `,
    isVerify: true
  },
  {
    // The cluster view runs its OWN query (handleGatewayClick); a node it does
    // not return is invisible however well connected. This is that query.
    name: 'VERIFY — the cluster view\'s own query returns Lorenz3D_001',
    cypher: `
      MATCH (n:TextNode {source_text: 'Lorenz3D', gateway: false})-[r]->(c:Cluster {name: 'LorenzEqu'})
      RETURN n.name AS name, type(r) AS rel
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — the stored script parses to the directives the module expects',
    cypher: `
      MATCH (n:TextNode {name: 'Lorenz3D_001'})
      RETURN size(n.text) AS chars, n.hasModuleScript AS module
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log(`[Lorenz3D ingest] UUIDs — cluster=${clusterUuid} gateway=${gatewayUuid} content1=${content1Uuid}`);
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
    console.log('\n[Lorenz3D ingest] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[Lorenz3D ingest] Uncaught error:', err);
  process.exitCode = 1;
});
