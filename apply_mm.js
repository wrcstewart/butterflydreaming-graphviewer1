// One-shot migration script for graphviewer.md §Amendment "MediaModule and
// Node Names V1.0" (2026-07-05). Runs MM1.2 → MM1.5 sequentially against
// the local Memgraph, then MM1.7 verification.
//
// Usage:  node apply_mm.js
//
// Idempotency: NOT idempotent. Running twice will create a second
// bd_V_Kolam_2. Run once, verify, then don't run again.

const neo4j  = require('neo4j-driver');
const crypto = require('crypto');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph')
);

// Directive text bodies — pulled out for readability. Note: the amendment's
// text omits %%bd_angle_drift; we're matching the amendment verbatim (drift
// off). Add "%%bd_angle_drift 3" back into either string if you want drift.
const KOLAM_1_TEXT =
  '%%bd_module bd_V_Kolam\n' +
  '%%bd_symmetry 8\n%%bd_depth 3\n%%bd_step 40\n' +
  '%%bd_angle 68\n%%bd_angle_minutes 0\n' +
  '%%bd_colour_speed 4\n%%bd_stroke angle\n' +
  '%%bd_saturation 100\n%%bd_lightness 65\n' +
  '%%bd_background #0a0a0f\n%%bd_weight 1.5\n' +
  '%%bd_score [\naxiom: F+F+F+F+F+F+F+F\nF: F+F-F-F+F+F+F-F\n%%bd_]\n';

const KOLAM_2_TEXT =
  '%%bd_module bd_V_Kolam\n' +
  '%%bd_symmetry 8\n%%bd_depth 3\n%%bd_step 40\n' +
  '%%bd_angle 68\n%%bd_angle_minutes 0\n' +
  '%%bd_colour_speed 4\n%%bd_stroke angle\n' +
  '%%bd_saturation 100\n%%bd_lightness 100\n' +
  '%%bd_background #0a0a0f\n%%bd_weight 1.5\n' +
  '%%bd_score [\naxiom: F+F+F+F+F+F+F+F\nF: F+F-F-F+F+F+F-F\n%%bd_]\n';

// Pre-generated in JS so we don't rely on Memgraph's randomUUID() being
// available (the amendment uses it; some Memgraph builds don't ship with it).
const KOLAM_2_URL = 'butterflydreaming.org/n/' + crypto.randomUUID();

const steps = [
  ['MM1.2a rename Visual Tests gateway',
    `MATCH (n:TextNode {gateway: true, source_text: 'Visual Tests'})
     SET n.name = 'bd_V_Kolam',
         n.source_text = 'bd_V_Kolam'
     RETURN count(n) AS matched`, {}],

  ['MM1.2b rename Kolam_1',
    `MATCH (n:TextNode {name: 'Kolam_1'})
     SET n.name = 'bd_V_Kolam_1',
         n.source_text = 'bd_V_Kolam'
     RETURN count(n) AS matched`, {}],

  ['MM1.2c set bd_V_Kolam_1.text',
    `MATCH (n:TextNode {name: 'bd_V_Kolam_1'})
     SET n.text = $text
     RETURN count(n) AS matched`,
    { text: KOLAM_1_TEXT }],

  ['MM1.2d rename Cluster Visual Test → bd_V_Kolam',
    `MATCH (c:Cluster {name: 'Visual Test'})
     SET c.name = 'bd_V_Kolam',
         c.display_name = 'bd_V_Kolam',
         c.label = 'bd_V_Kolam'
     RETURN count(c) AS matched`, {}],

  ['MM1.3a create bd_V_Kolam_2 TextNode',
    `CREATE (n:TextNode {
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
     RETURN count(n) AS created`,
    { url: KOLAM_2_URL, text: KOLAM_2_TEXT }],

  ['MM1.3b create CHILD gateway → bd_V_Kolam_2',
    `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'}),
           (n:TextNode  {name: 'bd_V_Kolam_2'})
     CREATE (gw)-[r:CHILD {weight: 1.0, source: 'sequence',
                            created_at: datetime('2026-07-05T10:00:00.000000Z')}]->(n)
     RETURN count(r) AS created`, {}],

  ['MM1.3c create CLUSTER_REL bd_V_Kolam_2 → Cluster',
    `MATCH (n:TextNode {name: 'bd_V_Kolam_2'}),
           (c:Cluster  {name: 'bd_V_Kolam'})
     CREATE (n)-[r:CLUSTER_REL {tagged_as: 1.0}]->(c)
     RETURN count(r) AS created`, {}],

  ['MM1.4a recalc gateway.n_r',
    `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})
     OPTIONAL MATCH (gw)-[:CHILD]->(child)
     WITH gw, count(child) AS child_count
     SET gw.n_r = child_count
     RETURN gw.n_r AS n_r`, {}],

  ['MM1.4b recalc cluster.n_r',
    `MATCH (c:Cluster {name: 'bd_V_Kolam'})
     OPTIONAL MATCH (c)--(m)
     WHERE NOT m:Family AND NOT m:Root
     AND NOT (m:TextNode AND m.gateway = true)
     WITH c, count(m) AS rel_count
     SET c.n_r = rel_count
     RETURN c.n_r AS n_r`, {}],

  ['MM1.5a delete old CONTAINS_CLUSTER from gateway',
    `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})
           -[r:CONTAINS_CLUSTER]->()
     DELETE r
     RETURN count(r) AS deleted`, {}],

  ['MM1.5b create CONTAINS_CLUSTER gateway → Cluster (count)',
    `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})
     MATCH (n:TextNode {source_text: 'bd_V_Kolam'})-[r]->(c:Cluster)
     WHERE n.gateway = false AND n.section_title IS NULL
     WITH gw, c, count(n) AS textCount
     CREATE (gw)-[cc:CONTAINS_CLUSTER {count: textCount}]->(c)
     RETURN count(cc) AS created`, {}],
];

function scalar(rec, key) {
  const v = rec.get(key);
  return v && typeof v.toNumber === 'function' ? v.toNumber() : v;
}

async function main() {
  const s = driver.session({ database: 'memgraph' });
  try {
    console.log(`bd_V_Kolam_2 url will be: ${KOLAM_2_URL}`);
    for (const [name, query, params] of steps) {
      process.stdout.write(`\n▸ ${name}\n`);
      try {
        const r = await s.run(query, params);
        const rec = r.records[0];
        const summary = rec
          ? Object.fromEntries(rec.keys.map(k => [k, scalar(rec, k)]))
          : { records: 0 };
        console.log('  ✓', summary);
      } catch (err) {
        console.error('  ✗', err.message);
        console.error('  Halting — fix the DB state and re-run only the remaining steps.');
        return;
      }
    }

    // MM1.7 verification
    console.log('\n▸ MM1.7 verification — children of bd_V_Kolam gateway');
    const v1 = await s.run(
      `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})-[:CHILD]->(n:TextNode)
       RETURN n.name AS name, n.seq AS seq, n.source_text AS source_text, n.n_r AS n_r
       ORDER BY n.seq`
    );
    if (!v1.records.length) console.log('  (no children — something went wrong)');
    v1.records.forEach(r => console.log('  ',
      r.get('name'),
      'seq=' + scalar(r, 'seq'),
      'source_text=' + r.get('source_text'),
      'n_r=' + scalar(r, 'n_r')));

    console.log('\n▸ MM1.7 verification — cluster');
    const v2 = await s.run(
      `MATCH (gw:TextNode {gateway: true, source_text: 'bd_V_Kolam'})-[:CONTAINS_CLUSTER]->(c:Cluster)
       RETURN c.name AS name, c.n_r AS n_r`
    );
    if (!v2.records.length) console.log('  (no cluster link — CONTAINS_CLUSTER may have failed)');
    v2.records.forEach(r => console.log('  ',
      r.get('name'), 'n_r=' + scalar(r, 'n_r')));

    console.log('\nDone.');
  } finally {
    await s.close();
    await driver.close();
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
