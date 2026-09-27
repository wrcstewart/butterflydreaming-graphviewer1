// bd_v_kolam3d_ingest.js — one-shot: create Cluster Kolam3D under the existing
// SubFamily Graphics, with gateway TextNode bd_V_Kolam3D and first content node
// bd_V_Kolam3D_001.
//
// WHY A CLUSTER OFF GRAPHICS AND NOT UNDER KOLAM (2026-09-27)
//   The 3D module is a SIBLING of Kolam, not a variant of it. It reads and
//   writes the same %%bd_ script, but it is a different renderer with two
//   angles instead of one and a camera to place. Hanging it under Kolam would
//   say it is a kind of Kolam node; hanging it beside Kolam says what is true.
//
// NAMING follows Kolam's, not Fractal's: the Cluster carries the short reading
// name (Kolam3D, beside Kolam / Order-Chaos / Pattern-Recognition under
// Graphics) while the gateway TextNode carries the MODULE ID (bd_V_Kolam3D),
// because that is the string %%bd_module has to match. The music clusters use
// the module id for both, which reads oddly under Graphics where every other
// cluster is a plain word.
//
// Schema shape, copied from bd_m_fractal_ingest.js and verified against the
// live bd_V_Kolam nodes:
//   • Gateway TextNode: gateway=true, seq=-1, source_text='bd_V_Kolam3D',
//     tagging_status='complete', n_r=<child-count>, url=butterflydreaming.org/n/<uuid>
//   • Content TextNode: gateway=false, seq=1, hasModuleScript='bd_V_Kolam3D',
//     module_type='visual', source_text='bd_V_Kolam3D'
//   • Edges: (gw)-[:CHILD]->(content), (content)-[:CLUSTER_REL]->(Cluster),
//            (gw)-[:CONTAINS_CLUSTER]->(Cluster),
//            (Graphics)-[:DESCENDS_FROM]->(Cluster)   ← parent → child, which is
//            the direction Graphics already uses for Kolam. NOTE this is the
//            OPPOSITE way round from bd_m_fractal_ingest.js's F2, which wrote
//            (Cluster)-[:DESCENDS_FROM]->(SubFamily). Both exist in the live
//            graph. VERIFIED before writing this: Graphics-[:DESCENDS_FROM]->Kolam.
//            Getting it backwards would hide the cluster from the Graphics view.
//   • (gw)-[:GATEWAY_LINK]->(Entry Gateways), bare — the hint_* properties on
//     that edge are layout, written later by a drag.
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
  'Kolam in three dimensions. The same L-system turtle as the Kolam module, ' +
  'given a second plane: + turns it by angle about its up axis and by pitch ' +
  'about its left, so a pitch of zero draws the flat kolam exactly and a pitch ' +
  'of one degree lifts the whole figure into a shell — the turn compounds at ' +
  'every one of five hundred steps. step_pitch is how far that lift carries: ' +
  "it scales the figure's extent out of the plane, so a small value against " +
  'step makes pitch a dial rather than a switch. It has nothing to work on ' +
  'until pitch is non-zero — at pitch 0 the turtle never leaves the plane, so ' +
  'there is no depth to scale and the stepper is correctly inert. Raise pitch ' +
  'first. Three further steppers place the eye: ' +
  'cam_azimuth, cam_elevation and cam_distance. At elevation 90 you are looking ' +
  'straight down, and what you see is the two-dimensional kolam.\n\n' +
  'Drawn with three.js on the graphics card, which is what makes the symmetry ' +
  'affordable: the figure is built once as a single shape and stamped eight ' +
  'times by the card, where the flat module strokes every segment by hand.';

// The default script. bd_V_Kolam_001's values, kept deliberately, plus the 3D
// directives — so the first thing this node draws is the FAMILIAR figure, lying
// flat and seen from above the horizon, and raising pitch is what shows the
// module is doing anything new.
//
// cam_distance 260: MEASURED. This figure's radius about the origin is 97.2
// world units, and framing a sphere of that radius at a 50-degree field of view
// with 12% of air round it needs 258.
//
// %%bd_weight is UNMARKED (no p_) because this module has no weight stepper —
// core WebGL ignores line width. The line is kept so the value survives a trip
// to the flat module and back.
const CONTENT1_TEXT =
  '%%bd_module bd_V_Kolam3D\n' +
  '%%bd_p_symmetry 8\n' +
  '%%bd_p_depth 2\n' +
  '%%bd_p_step 50\n' +
  // Deliberately NOT equal to step. step_pitch is the turtle's step length
  // in the NEW dimension, and pitch compounds over 512 turns — at parity,
  // one degree of pitch throws the figure 343 world units out of a plane
  // whose own radius is 97. A fifth of step makes pitch a dial rather than
  // a switch. (The MODULE's fallback when a script omits step_pitch is the
  // opposite, and also right: it falls back to `step`, i.e. isotropic, which
  // is the only default that cannot change a figure written before today.)
  '%%bd_p_step_pitch 5\n' +
  '%%bd_p_angle 90\n' +
  '%%bd_p_angle_minutes 0\n' +
  '%%bd_p_angle_drift 10\n' +
  '%%bd_p_pitch 0\n' +
  '%%bd_p_pitch_minutes 0\n' +
  '%%bd_p_pitch_drift 0\n' +
  '%%bd_p_cam_azimuth 0\n' +
  '%%bd_p_cam_elevation 60\n' +
  '%%bd_p_cam_distance 260\n' +
  '%%bd_p_colour_speed 4\n' +
  '%%bd_stroke angle\n' +
  '%%bd_p_saturation 100\n' +
  '%%bd_p_lightness 65\n' +
  '%%bd_background #0a0a0f\n' +
  '%%bd_weight 1.5\n' +
  '%%bd_score [\n' +
  'axiom: F+F+F+F+F+F+F+F\n' +
  'F: F+F-F-F+F+F+F-F\n' +
  '%%bd_]\n';

const steps = [
  {
    name: 'K1 — pre-flight: nothing of this name exists yet',
    cypher: `
      MATCH (n) WHERE n.name IN ['Kolam3D', 'bd_V_Kolam3D', 'bd_V_Kolam3D_001']
      RETURN count(n) AS n
    `,
    check: (rec) => {
      const n = num(rec.get('n'));
      if (n !== 0) throw new Error(`${n} node(s) already carry these names — this script is not idempotent`);
    }
  },
  {
    name: 'K2 — create Cluster Kolam3D',
    cypher: `
      CREATE (c:Cluster {
        name: 'Kolam3D',
        display_name: 'Kolam3D',
        label: 'Kolam3D',
        url: $url,
        tagging_status: 'complete',
        n_r: 0,
        created_at: datetime()
      })
      RETURN c.name AS name
    `,
    params: { url: 'butterflydreaming.org/n/' + clusterUuid },
    check: (rec) => {
      if (rec.get('name') !== 'Kolam3D') throw new Error('Cluster not created');
    }
  },
  {
    name: 'K3 — DESCENDS_FROM edge SubFamily Graphics → Cluster Kolam3D',
    cypher: `
      MATCH (sf {name: 'Graphics'}), (c:Cluster {name: 'Kolam3D'})
      WHERE 'SubFamily' IN labels(sf)
      CREATE (sf)-[:DESCENDS_FROM]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('edge not created');
    }
  },
  {
    name: 'K4 — create gateway TextNode bd_V_Kolam3D',
    cypher: `
      CREATE (gw:TextNode {
        name: 'bd_V_Kolam3D',
        source_text: 'bd_V_Kolam3D',
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
      if (rec.get('name') !== 'bd_V_Kolam3D') throw new Error('gateway not created');
    }
  },
  {
    name: 'K5 — create content TextNode bd_V_Kolam3D_001',
    cypher: `
      CREATE (n:TextNode {
        name: 'bd_V_Kolam3D_001',
        source_text: 'bd_V_Kolam3D',
        url: $url,
        text: $text,
        hasModuleScript: 'bd_V_Kolam3D',
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
      if (rec.get('name') !== 'bd_V_Kolam3D_001') throw new Error('bd_V_Kolam3D_001 not created');
    }
  },
  {
    name: 'K6 — CHILD edge gateway → bd_V_Kolam3D_001',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_V_Kolam3D', gateway: true}),
            (n:TextNode  {name: 'bd_V_Kolam3D_001'})
      CREATE (gw)-[:CHILD {weight: 1.0, source: 'sequence', created_at: datetime()}]->(n)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CHILD edge not created');
    }
  },
  {
    name: 'K7 — CLUSTER_REL bd_V_Kolam3D_001 → Cluster Kolam3D',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam3D_001'}),
            (c:Cluster  {name: 'Kolam3D'})
      CREATE (n)-[:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CLUSTER_REL not created');
    }
  },
  {
    name: 'K8 — CONTAINS_CLUSTER gateway → Cluster Kolam3D (count=1)',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_V_Kolam3D', gateway: true}),
            (c:Cluster  {name: 'Kolam3D'})
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
      MATCH (gw:TextNode {name: 'bd_V_Kolam3D', gateway: true}),
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
      MATCH (gw:TextNode {name: 'bd_V_Kolam3D', gateway: true})
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
      MATCH (c:Cluster {name: 'Kolam3D'})
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
      MATCH (sf {name: 'Graphics'})-[:DESCENDS_FROM]->(c:Cluster)
      RETURN c.name AS cluster, c.n_r AS n_r
      ORDER BY c.name
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — bd_V_Kolam3D gateway edges',
    cypher: `
      MATCH (gw:TextNode {name: 'bd_V_Kolam3D', gateway: true})
      OPTIONAL MATCH (gw)-[r]-(x)
      RETURN type(r) AS rel, labels(x) AS x_lbl, x.name AS x_name
      ORDER BY x.name
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — the stored script parses to the directives the module expects',
    cypher: `
      MATCH (n:TextNode {name: 'bd_V_Kolam3D_001'})
      RETURN size(n.text) AS chars, n.hasModuleScript AS module
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log(`[bd_V_Kolam3D ingest] UUIDs — cluster=${clusterUuid} gateway=${gatewayUuid} content1=${content1Uuid}`);
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
    console.log('\n[bd_V_Kolam3D ingest] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[bd_V_Kolam3D ingest] Uncaught error:', err);
  process.exitCode = 1;
});
