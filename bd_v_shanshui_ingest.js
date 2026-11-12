// bd_v_shanshui_ingest.js — one-shot: create Cluster Mountain/Water (shan shui,
// literally) under BOTH existing SubFamilies, Graphics and Landscapes. A
// SubFamily named Landscapes already exists, so a Cluster of that name would
// make every name lookup ambiguous (author chose this, 2026-11-12). With it,
// gateway TextNode ShanShui and first content
// node ShanShui_001. Shape copied from bd_v_kolam3d_ingest.js (see its header
// for the schema and the DESCENDS_FROM direction, verified there).
//
// NAMING (2026-11-12, the author's): no "Endless" anywhere in the graph, and no
// bd_V_ prefix on the gateway or node, so the content label is ShanShui_001 —
// 12 characters, inside the ~14 a breadcrumb chip shows. The MODULE id is
// bd_V_ShanShuiV1: it lives in hasModuleScript and %%bd_module, which is what
// the module lookup (/api/module-default) keys on — not the gateway name.
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
  'Shan shui, "mountain water", is the Chinese tradition of landscape painting ' +
  'in ink: peaks rising out of mist, and a viewer who travels through the ' +
  'picture rather than standing before it. This module paints such a landscape ' +
  'without end. The mountains are grown from fractal noise as you glide over ' +
  'them, so the journey never meets the same ridge twice. The light comes from ' +
  'a real sky: the sun and moon stand where they would over the mountains of ' +
  'south-west China on the chosen date and hour, and at night the ' +
  'brightest stars are in their true places, with the Milky Way across them.' +
  '\n\nThe controls shape the land (smoothing, detail, relief, widest ' +
  'mountain), the air (mist, opacity, palette) and the hour (time of day, ' +
  'minutes per second). World seed chooses the landscape; it opens on 42.';

const CONTENT1_TEXT =
  '%%bd_module bd_V_ShanShuiV1\n' +
  '%%bd_p_travel_speed 0.2\n' +
  '%%bd_p_smoothing 0.9\n' +
  '%%bd_p_detail 9\n' +
  '%%bd_p_relief 0.4\n' +
  '%%bd_p_widest_mountain 10\n' +
  '%%bd_p_shadow_softness 2\n' +
  '%%bd_p_fov 80\n' +
  '%%bd_p_look_up 9\n' +
  '%%bd_p_opacity 1\n' +
  '%%bd_p_mist 1\n' +
  '%%bd_p_time_of_day 6.5\n' +
  '%%bd_p_minutes_per_second 0\n' +
  '%%bd_p_stars 2.5\n' +
  '%%bd_p_palette ink\n' +
  '%%bd_p_world_seed 42\n' +
  '%%bd_moon_phase 22.75\n' +
  '%%bd_direction_of_travel 0\n' +
  '%%bd_date 288\n' +
  '%%bd_latitude 26\n' +
  '%%bd_sun_size 1\n' +
  '%%bd_moon_size 1\n' +
  '%%bd_star_size 1\n';

const steps = [
  {
    name: 'K1 — pre-flight: nothing of this name exists yet',
    cypher: `
      MATCH (n) WHERE n.name IN ['Mountain/Water', 'ShanShui', 'ShanShui_001'] OR n.source_text = 'ShanShui'
      RETURN count(n) AS n
    `,
    check: (rec) => {
      const n = num(rec.get('n'));
      if (n !== 0) throw new Error(`${n} node(s) already carry these names — this script is not idempotent`);
    }
  },
  {
    name: 'K2 — create Cluster Mountain/Water',
    cypher: `
      CREATE (c:Cluster {
        name: 'Mountain/Water',
        display_name: 'Mountain/Water',
        label: 'Mountain/Water',
        url: $url,
        tagging_status: 'complete',
        n_r: 0,
        created_at: datetime()
      })
      RETURN c.name AS name
    `,
    params: { url: 'butterflydreaming.org/n/' + clusterUuid },
    check: (rec) => {
      if (rec.get('name') !== 'Mountain/Water') throw new Error('Cluster not created');
    }
  },
  {
    name: 'K3 — DESCENDS_FROM edges SubFamilies Graphics AND Landscapes → Cluster Mountain/Water',
    cypher: `
      MATCH (sf), (c:Cluster {name: 'Mountain/Water'})
      WHERE 'SubFamily' IN labels(sf) AND sf.name IN ['Graphics', 'Landscapes']
      CREATE (sf)-[:DESCENDS_FROM]->(c)
      RETURN count(*) AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 2) throw new Error('expected 2 DESCENDS_FROM edges, got ' + num(rec.get('ok')));
    }
  },
  {
    name: 'K4 — create gateway TextNode ShanShui',
    cypher: `
      CREATE (gw:TextNode {
        name: 'ShanShui',
        source_text: 'ShanShui',
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
      if (rec.get('name') !== 'ShanShui') throw new Error('gateway not created');
    }
  },
  {
    name: 'K5 — create content TextNode ShanShui_001',
    cypher: `
      CREATE (n:TextNode {
        name: 'ShanShui_001',
        source_text: 'ShanShui',
        url: $url,
        text: $text,
        hasModuleScript: 'bd_V_ShanShuiV1',
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
      if (rec.get('name') !== 'ShanShui_001') throw new Error('ShanShui_001 not created');
    }
  },
  {
    name: 'K6 — CHILD edge gateway → ShanShui_001',
    cypher: `
      MATCH (gw:TextNode {name: 'ShanShui', gateway: true}),
            (n:TextNode  {name: 'ShanShui_001'})
      CREATE (gw)-[:CHILD {weight: 1.0, source: 'sequence', created_at: datetime()}]->(n)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CHILD edge not created');
    }
  },
  {
    name: 'K7 — CLUSTER_REL ShanShui_001 → Cluster Mountain/Water',
    cypher: `
      MATCH (n:TextNode {name: 'ShanShui_001'}),
            (c:Cluster  {name: 'Mountain/Water'})
      CREATE (n)-[:CLUSTER_REL {tagged_as: 1.0}]->(c)
      RETURN 1 AS ok
    `,
    check: (rec) => {
      if (num(rec.get('ok')) !== 1) throw new Error('CLUSTER_REL not created');
    }
  },
  {
    name: 'K8 — CONTAINS_CLUSTER gateway → Cluster Mountain/Water (count=1)',
    cypher: `
      MATCH (gw:TextNode {name: 'ShanShui', gateway: true}),
            (c:Cluster  {name: 'Mountain/Water'})
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
      MATCH (gw:TextNode {name: 'ShanShui', gateway: true}),
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
      MATCH (gw:TextNode {name: 'ShanShui', gateway: true})
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
      MATCH (c:Cluster {name: 'Mountain/Water'})
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
      MATCH (sf)-[:DESCENDS_FROM]->(c:Cluster {name: 'Mountain/Water'})
      RETURN sf.name AS subfamily, c.name AS cluster, c.n_r AS n_r
      ORDER BY c.name
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — ShanShui gateway edges',
    cypher: `
      MATCH (gw:TextNode {name: 'ShanShui', gateway: true})
      OPTIONAL MATCH (gw)-[r]-(x)
      RETURN type(r) AS rel, labels(x) AS x_lbl, x.name AS x_name
      ORDER BY x.name
    `,
    isVerify: true
  },
  {
    // The cluster view runs its OWN query (handleGatewayClick); a node it does
    // not return is invisible however well connected. This is that query.
    name: 'VERIFY — the cluster view\'s own query returns ShanShui_001',
    cypher: `
      MATCH (n:TextNode {source_text: 'ShanShui', gateway: false})-[r]->(c:Cluster {name: 'Mountain/Water'})
      RETURN n.name AS name, type(r) AS rel
    `,
    isVerify: true
  },
  {
    name: 'VERIFY — the stored script parses to the directives the module expects',
    cypher: `
      MATCH (n:TextNode {name: 'ShanShui_001'})
      RETURN size(n.text) AS chars, n.hasModuleScript AS module
    `,
    isVerify: true
  }
];

function num(v) { return v && typeof v.toNumber === 'function' ? v.toNumber() : v; }

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    console.log(`[ShanShui ingest] UUIDs — cluster=${clusterUuid} gateway=${gatewayUuid} content1=${content1Uuid}`);
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
    console.log('\n[ShanShui ingest] Done. All steps succeeded.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[ShanShui ingest] Uncaught error:', err);
  process.exitCode = 1;
});
