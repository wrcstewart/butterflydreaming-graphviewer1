// =====================================================================
// TEMPLATE — Ingest a text work into Memgraph (poem, short story, etc.)
// =====================================================================
// This script created "Dreaming of Li Bai" (Du Fu, 759 CE) on 2026-08-01.
// Kept as a copy-and-adapt template for the next work.
//
// PATTERN (see also du_fu_plan.md and MEMORY.md → landing-page-adjacent
// [[ingest-workflow]] note):
//
//   Nodes (all :TextNode):
//     Gateway         gateway: true,  section_title: false, seq: -1
//                     text = about the work (author + translator + gloss)
//     Section-title   gateway: false, section_title: true,  seq: 0
//                     text = about this piece (date + brief context)
//     Content chunks  gateway: false, seq: 1..N (no section_title property)
//                     text = 4-line chunks (or natural stanza units)
//                     Each ends with a bare `%%bd_hint` line so no auto-
//                     hint renders under it (chunks are read directly
//                     via the snake / layout-reading grid, not tapped
//                     through sequentially — auto-hints would mislead).
//
//   Edges within the work (structural):
//     Gateway  -[CHILD]->   Section-title    (drilling past gateway lands here)
//     Chunk    -[PART_OF]-> Section-title    (snake view enumerates via this)
//     NO CHILD chain between content chunks — they're leaves.
//     NO CHILD from Section-title to any chunk — PART_OF is enough.
//
//   Edges to Clusters:
//     Gateway -[CONTAINS_CLUSTER {count}]-> Cluster
//         count = number of chunks under this gateway that touch this cluster.
//         Auto-derived from chunk memberships below.
//     Chunk   -[CLUSTER_REL {tagged_as|resonates_with|bridges_to|echoes|gives}]-> Cluster
//         Each edge carries ANY subset of the 5 weight props, each 0.0–1.0.
//         See Note on Cluster-Textnode edges.md for full weight semantics.
//         Do NOT store zero weights — omit the property instead.
//
// WORKFLOW (repeat for each new work):
//   1. Draft a review .md in the repo root (like du_fu_plan.md) covering:
//      chunks, chosen Clusters, weights per chunk, gateway/section-title copy.
//   2. User approves / edits the .md.
//   3. `node bd_tool.js backup`   (always, before any DB mutation)
//   4. Copy this file, adapt the WORK constant + `chunks` array + drafts + weights.
//   5. `node <adapted-file>.js`
//   6. VERIFY WITH BOTH: (a) the script's own summary, (b) the affected
//      Cluster n_r badges. The script does NOT update n_r automatically.
//   7. Post-ingest, refresh n_r on affected clusters (server does this on
//      per-node edits via edit_save; bulk inserts bypass it). Query:
//        UNWIND [<cluster names>] AS name
//        MATCH (c:Cluster {name: name})
//        OPTIONAL MATCH (n:TextNode)-[:CLUSTER_REL]->(c)
//        WITH c, n WHERE n IS NULL OR (n.gateway = false AND n.section_title IS NULL)
//        WITH c, count(n) AS total SET c.n_r = total RETURN c.name, total
//   8. Delete this .js after ingesting (or keep as a per-work record) —
//      the plan .md is the durable design doc.
//
// EDGE-CASE GUARDS:
//   - Script refuses if a gateway with the same source_text already exists.
//   - source_text is the "work key" — MUST be identical on every node in
//     the work (gateway + section-title + all chunks). Typos here silently
//     break snake view (chunks won't find their section-title).
//   - Content chunks store `section_title` as `null` (property omitted), not
//     as `false` — this matches the existing corpus convention (see
//     Tao Te Ching for the reference pattern).
//
// One-shot; run from repo root: `node <path-to-this-file>`.
// (Must be under a directory whose node_modules resolves neo4j-driver —
// scratchpad/ does NOT satisfy that, hence the copy-to-project-root step.)
// =====================================================================
'use strict';
const crypto = require('crypto');
const neo4j  = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('memgraph', 'memgraph'),
  { disableLosslessIntegers: true }
);

const WORK = 'Poems of Du Fu';

const gwText = 'Poems of Du Fu (712–770 CE). China\'s great Tang-dynasty poet — witness to war, exile, illness and friendship. Translations by Claude Sonnet 5. His voice is spare, humane, haunted; every image carries dust and weather.';

const stText = 'Dreaming of Li Bai (759 CE). Written when Du Fu heard that his friend Li Bai — the other great poet of the age — had been banished to the far south under charge of treason and might be dead. Two dream-poems followed; this is the first. Its images cross between worlds: the friend\'s spirit visits by night, and the poet does not know if it is a living man\'s soul or a ghost\'s.';

const chunks = [
  {
    seq: 1,
    text:
`At death, the sob is swallowed whole;
but parting in life aches on and on.
South of the river, the land breeds fever and mist —
of the banished man, no word has come.
%%bd_hint`,
    clusters: [
      { name: 'Loss/Longing',    props: { tagged_as: 0.85 } },
      { name: 'Grief/Mourning',  props: { tagged_as: 0.6  } },
      { name: 'Fear/Dread',      props: { echoes: 0.5     } },
      { name: 'Impermanence',    props: { echoes: 0.4     } },
    ],
  },
  {
    seq: 2,
    text:
`Old friend, you have entered my dream,
showing how long I have held you in mind.
I fear this is not the soul of the living —
the road is so far, it cannot be gauged.
%%bd_hint`,
    clusters: [
      { name: 'Dream/Vision',     props: { tagged_as: 0.9  } },
      { name: 'Friendship',       props: { tagged_as: 0.7  } },
      { name: 'Longing/Yearning', props: { resonates_with: 0.55 } },
      { name: 'Fear/Dread',       props: { echoes: 0.5 } },
    ],
  },
  {
    seq: 3,
    text:
`Your spirit arrived through green maple leaves;
your spirit returns through the black frontier pass.
You are caught now in the net of the law —
how did you find wings to come to me?
%%bd_hint`,
    clusters: [
      { name: 'Captivity',           props: { tagged_as: 0.7  } },
      { name: 'Journey/Path',        props: { tagged_as: 0.65 } },
      { name: 'The Liminal',         props: { tagged_as: 0.6  } },
      { name: 'Threshold/Crossing',  props: { resonates_with: 0.55 } },
    ],
  },
  {
    seq: 4,
    text:
`The sinking moon floods the roof-beam,
and still I seem to see your face in its light.
The water runs deep, the waves are wide —
don't let the river-dragons take you.
%%bd_hint`,
    clusters: [
      { name: 'Moon',              props: { tagged_as: 0.85 } },
      { name: 'Haunting',          props: { tagged_as: 0.7  } },
      { name: 'Tenderness',        props: { tagged_as: 0.6  } },
      { name: 'Water/Reflection',  props: { echoes: 0.5 } },
    ],
  },
];

function mkUrl() { return 'butterflydreaming.org/n/' + crypto.randomUUID(); }

// Auto-derive CONTAINS_CLUSTER counts from chunk memberships.
function deriveGatewayClusters() {
  const map = new Map();
  for (const c of chunks) {
    for (const cl of c.clusters) {
      map.set(cl.name, (map.get(cl.name) || 0) + 1);
    }
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

async function run() {
  const session = driver.session({ database: 'memgraph' });
  try {
    // Guard: refuse if a gateway with this source_text already exists.
    const existing = await session.run(
      'MATCH (g:TextNode {gateway: true, source_text: $work}) RETURN count(g) AS n',
      { work: WORK }
    );
    if (existing.records[0].get('n') > 0) {
      throw new Error(`Gateway with source_text "${WORK}" already exists — aborting.`);
    }

    const gwUrl = mkUrl();
    const stUrl = mkUrl();
    const chunkUrls = chunks.map(() => mkUrl());
    const gwClusters = deriveGatewayClusters();

    // ─── Step 1: create the 6 nodes + structural edges (CHILD, PART_OF) ───
    process.stderr.write('[du-fu-ingest] creating nodes + structural edges...\n');
    await session.run(
      `
      CREATE (gw:TextNode {
        url: $gwUrl, gateway: true, section_title: false, seq: -1,
        source_text: $work, text: $gwText,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (st:TextNode {
        url: $stUrl, gateway: false, section_title: true, seq: 0,
        source_text: $work, title: 'Dreaming of Li Bai', text: $stText,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (c1:TextNode {
        url: $c1Url, gateway: false, seq: 1, source_text: $work, text: $c1Text,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (c2:TextNode {
        url: $c2Url, gateway: false, seq: 2, source_text: $work, text: $c2Text,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (c3:TextNode {
        url: $c3Url, gateway: false, seq: 3, source_text: $work, text: $c3Text,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (c4:TextNode {
        url: $c4Url, gateway: false, seq: 4, source_text: $work, text: $c4Text,
        n_r: 0, selects: 0, views: 0, fusions: 0
      })
      CREATE (gw)-[:CHILD]->(st)
      CREATE (c1)-[:PART_OF]->(st)
      CREATE (c2)-[:PART_OF]->(st)
      CREATE (c3)-[:PART_OF]->(st)
      CREATE (c4)-[:PART_OF]->(st)
      `,
      {
        work: WORK,
        gwUrl, gwText, stUrl, stText,
        c1Url: chunkUrls[0], c1Text: chunks[0].text,
        c2Url: chunkUrls[1], c2Text: chunks[1].text,
        c3Url: chunkUrls[2], c3Text: chunks[2].text,
        c4Url: chunkUrls[3], c4Text: chunks[3].text,
      }
    );

    // ─── Step 2: CONTAINS_CLUSTER edges from gateway ───
    process.stderr.write('[du-fu-ingest] creating CONTAINS_CLUSTER edges...\n');
    let containsCreated = 0;
    for (const gc of gwClusters) {
      const r = await session.run(
        `
        MATCH (gw:TextNode {url: $gwUrl})
        MATCH (cl:Cluster {name: $name})
        CREATE (gw)-[e:CONTAINS_CLUSTER {count: $count}]->(cl)
        RETURN count(e) AS n
        `,
        { gwUrl, name: gc.name, count: gc.count }
      );
      containsCreated += r.records[0].get('n');
    }

    // ─── Step 3: CLUSTER_REL edges per chunk ───
    process.stderr.write('[du-fu-ingest] creating CLUSTER_REL edges...\n');
    let relsCreated = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkUrl = chunkUrls[i];
      for (const cl of chunks[i].clusters) {
        const r = await session.run(
          `
          MATCH (t:TextNode {url: $chunkUrl})
          MATCH (cl:Cluster {name: $name})
          CREATE (t)-[e:CLUSTER_REL]->(cl)
          SET e += $props
          RETURN count(e) AS n
          `,
          { chunkUrl, name: cl.name, props: cl.props }
        );
        relsCreated += r.records[0].get('n');
      }
    }

    // ─── Verify ───
    const summary = await session.run(
      `
      MATCH (g:TextNode {gateway: true, source_text: $work})
      OPTIONAL MATCH (g)-[cc:CONTAINS_CLUSTER]->()
      WITH g, count(cc) AS gwClusterCount
      OPTIONAL MATCH (c:TextNode {source_text: $work, gateway: false})
      WITH g, gwClusterCount, count(c) AS nonGwCount
      OPTIONAL MATCH (chunk:TextNode {source_text: $work, gateway: false, section_title: false})-[cr:CLUSTER_REL]->()
      WITH gwClusterCount, nonGwCount, count(cr) AS clusterRelCount
      RETURN gwClusterCount, nonGwCount, clusterRelCount
      `,
      { work: WORK }
    );
    const s = summary.records[0];

    console.log(JSON.stringify({
      ok: true,
      gateway_url: gwUrl,
      section_title_url: stUrl,
      chunk_urls: chunkUrls,
      created: {
        nodes: 6,
        child_edges: 1,
        part_of_edges: 4,
        contains_cluster_edges: containsCreated,
        cluster_rel_edges: relsCreated,
      },
      verify: {
        gwClusterCount:  s.get('gwClusterCount'),
        nonGwCount:      s.get('nonGwCount'),
        clusterRelCount: s.get('clusterRelCount'),
      },
    }, null, 2));
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('[du-fu-ingest] FAILED:', err.message);
  process.exit(1);
});
