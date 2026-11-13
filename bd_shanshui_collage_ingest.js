// bd_shanshui_collage_ingest.js — one-shot (2026-11-13): the collage node
// "ShanShui C 001" under the ShanShui gateway, seq 2. Three blocks: the
// landscape at night, Tao Te Ching chapter 1 as text over it, and the
// fractal drone in the music strip. Shape copied from bd_Collage_002 (Kolam3D):
// module_type 'collage', NO hasModuleScript (a collage is not a module node),
// CHILD from the gateway, CLUSTER_REL to the cluster.
//
// NAME: the author's — "C" for collage, spaces not underscores.
// SCRIPT: ShanShui_001's defaults except time_of_day 22.0 — with the moon at
// 22.75 days it rises after midnight, so the sky is dark and moonless.
// Block order: visual, text, music — a later block sits ON TOP, and the
// landscape is opaque, so the text must come after it.
//
// PRE-FLIGHT: `node bd_tool.js backup`. Not idempotent.
'use strict';
const crypto = require('crypto');
const neo4j  = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('memgraph', 'memgraph'));
const NAME = 'ShanShui C 001';
const uuid = crypto.randomUUID();
const num = (v) => v && typeof v.toNumber === 'function' ? v.toNumber() : v;

async function run() {
  const s = driver.session({ database: 'memgraph' });
  try {
    const q = (c, p) => s.run(c, p || {});
    const one = async (c, p) => (await q(c, p)).records[0];
    const src = await one(`MATCH (a:TextNode {name:'ShanShui_001'}), (d:TextNode {name:'bd_M_DroneFrac_001'}),
                                 (k:TextNode {name:'bd_Collage_001'})
                           RETURN a.text AS ss, d.text AS drone, k.text AS kol`);
    let ss = src.get('ss'); const drone = src.get('drone'); const kol = src.get('kol');
    if (ss.split('%%bd_p_time_of_day 6.5\n').length !== 2) throw new Error('time_of_day 6.5 not found once');
    ss = ss.replace('%%bd_p_time_of_day 6.5\n', '%%bd_p_time_of_day 22\n');
    const t = kol.indexOf('%%bd_module text\n');
    if (t < 0) throw new Error('no text block in bd_Collage_001');
    const textBlock = kol.slice(t).trimEnd() + '\n';
    if (!textBlock.startsWith('%%bd_module text\n%%bd_text [\nChapter 1.')) throw new Error('text block not Tao ch.1');
    const script = '%%bd_collage 1\n\n' + ss.trimEnd() + '\n\n' + textBlock + '\n' + drone.trimEnd() + '\n';

    const pre = await one(`MATCH (n:TextNode {name:$n}) RETURN count(n) AS c`, { n: NAME });
    if (num(pre.get('c')) !== 0) throw new Error(NAME + ' already exists');
    await q(`MATCH (gw:TextNode {name:'ShanShui', gateway:true}), (c:Cluster {name:'Mountain/Water'})
             CREATE (n:TextNode {name:$n, source_text:'ShanShui', url:$url, text:$text, module_type:'collage',
                                 gateway:false, tagging_status:'complete', seq:2, n_r:0, created_at:datetime()})
             CREATE (gw)-[:CHILD {weight:1.0, source:'sequence', created_at:datetime()}]->(n)
             CREATE (n)-[:CLUSTER_REL {tagged_as:1.0}]->(c)`,
            { n: NAME, url: 'butterflydreaming.org/n/' + uuid, text: script });
    await q(`MATCH (gw:TextNode {name:'ShanShui', gateway:true}) OPTIONAL MATCH (gw)-[:CHILD]->(ch)
             WITH gw, count(ch) AS c SET gw.n_r = c`);
    await q(`MATCH (c:Cluster {name:'Mountain/Water'}) OPTIONAL MATCH (n:TextNode)-[:CLUSTER_REL]->(c)
             WITH c, n WHERE n IS NULL OR (n.gateway = false AND n.section_title IS NULL)
             WITH c, count(n) AS t SET c.n_r = t`);
    const v = await q(`MATCH (n:TextNode {source_text:'ShanShui', gateway:false})-[r]->(c:Cluster {name:'Mountain/Water'})
                       RETURN n.name AS name, n.seq AS seq ORDER BY n.seq`);
    console.log('cluster view returns:', v.records.map(r => r.get('name') + ' (seq ' + num(r.get('seq')) + ')').join(', '));
    console.log('uuid', uuid, '| script', script.length, 'chars');
    console.log(script);
  } finally { await s.close(); await driver.close(); }
}
run().catch(e => { console.error('FAIL', e.message); process.exitCode = 1; });
