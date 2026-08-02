# Ingest plan: "Dreaming of Li Bai" under gateway "Poems of Du Fu"

Poem splits naturally into four quatrains — clean 4-line chunks, no
awkward stanza-break decisions needed.

**Design notes** (revised 2026-08-01 after clarifying the snake-view / layout-reading-mode flow):

- **Gateway and Section-title** are read sequentially (chunk-per-tap); their default auto-hints are correct and stay.
- **Content chunks** are picked directly in the layout-reading-mode grid. Sequential-tap hints under them would be misleading, so **every content chunk gets `%%bd_hint` with empty body** — the renderer now treats that as "render no hint below this chunk".
- **No CHILD edges between content chunks**, and no `section_title → chunk` CHILD either. Snake view enumerates parts via `PART_OF` back-refs, so `PART_OF` is enough. Content chunks become clean leaves; tapping past them in snake view is a silent no-op — reader picks another chunk or exits via Back / breadcrumbs.

---

## Gateway TextNode — "Poems of Du Fu"

**Properties:** `gateway: true, seq: -1, source_text: "Poems of Du Fu"`

**Draft text:**
> Poems of Du Fu (712–770 CE). China's great Tang-dynasty poet — witness
> to war, exile, illness and friendship. Translations by Claude Sonnet 5.
> His voice is spare, humane, haunted; every image carries dust and
> weather.

---

## Section-title TextNode — "Dreaming of Li Bai"

**Properties:** `section_title: true, seq: 0, source_text: "Poems of Du Fu", title: "Dreaming of Li Bai"`

**Draft text:**
> Dreaming of Li Bai (759 CE). Written when Du Fu heard that his friend
> Li Bai — the other great poet of the age — had been banished to the
> far south under charge of treason and might be dead. Two dream-poems
> followed; this is the first. Its images cross between worlds: the
> friend's spirit visits by night, and the poet does not know if it is
> a living man's soul or a ghost's.

---

## Content chunks (4 lines each — hints suppressed)

Each chunk's stored text ends with a bare `%%bd_hint` line so no tap-hint
renders beneath the poetry.

### Chunk 1  ·  seq=1
```
At death, the sob is swallowed whole;
but parting in life aches on and on.
South of the river, the land breeds fever and mist —
of the banished man, no word has come.
%%bd_hint
```

**Cluster edges (CLUSTER_REL):**
- **Loss/Longing** — `tagged_as: 0.85`
- **Grief/Mourning** — `tagged_as: 0.6`
- **Fear/Dread** — `echoes: 0.5`
- **Impermanence** — `echoes: 0.4`

### Chunk 2  ·  seq=2
```
Old friend, you have entered my dream,
showing how long I have held you in mind.
I fear this is not the soul of the living —
the road is so far, it cannot be gauged.
%%bd_hint
```

**Cluster edges:**
- **Dream/Vision** — `tagged_as: 0.9`
- **Friendship** — `tagged_as: 0.7`
- **Longing/Yearning** — `resonates_with: 0.55`
- **Fear/Dread** — `echoes: 0.5`

### Chunk 3  ·  seq=3
```
Your spirit arrived through green maple leaves;
your spirit returns through the black frontier pass.
You are caught now in the net of the law —
how did you find wings to come to me?
%%bd_hint
```

**Cluster edges:**
- **Captivity** — `tagged_as: 0.7`
- **Journey/Path** — `tagged_as: 0.65`
- **The Liminal** — `tagged_as: 0.6`
- **Threshold/Crossing** — `resonates_with: 0.55`

### Chunk 4  ·  seq=4
```
The sinking moon floods the roof-beam,
and still I seem to see your face in its light.
The water runs deep, the waves are wide —
don't let the river-dragons take you.
%%bd_hint
```

**Cluster edges:**
- **Moon** — `tagged_as: 0.85`
- **Haunting** — `tagged_as: 0.7`
- **Tenderness** — `tagged_as: 0.6`
- **Water/Reflection** — `echoes: 0.5`

---

## Gateway → Cluster edges (CONTAINS_CLUSTER, auto-derived)

Each `count` = number of chunks under this gateway that touch this cluster.

| Cluster | count |
|---|---:|
| Fear/Dread | 2 |
| Loss/Longing | 1 |
| Grief/Mourning | 1 |
| Impermanence | 1 |
| Dream/Vision | 1 |
| Friendship | 1 |
| Longing/Yearning | 1 |
| Captivity | 1 |
| Journey/Path | 1 |
| The Liminal | 1 |
| Threshold/Crossing | 1 |
| Moon | 1 |
| Haunting | 1 |
| Tenderness | 1 |
| Water/Reflection | 1 |

---

## Edges within the work (structural)

- Gateway `-[CHILD]->` Section-title  *(so drilling past the gateway's chunks lands on the title)*
- Each Chunk `-[PART_OF]->` Section-title  *(so snake view can find them)*

That's it — no CHILD between content chunks, no `section_title → chunk` CHILD.

---

## Write plan (on your OK)

1. Run `node bd_tool.js backup` (explicit pre-flight snapshot)
2. Run one Cypher script that CREATEs:
   - 1 Gateway TextNode + 1 Section-title TextNode + 4 Content chunk TextNodes (fresh URL UUIDs)
   - 1 CHILD edge (Gateway → Section-title)
   - 4 PART_OF edges (each chunk → Section-title)
   - 15 CONTAINS_CLUSTER edges (Gateway → each cluster, with count)
   - 16 CLUSTER_REL edges (each chunk → its clusters, with weight properties)
3. Verify: count nodes and edges; spot-check one chunk's text.

---

## Also affected by this design change

The renderer's chunk-hint handling now treats a bare `%%bd_hint` line as
"render no hint" (previously it was ignored and the auto-hint fired).
Small change in `extractChunkHint`. Existing nodes that use `%%bd_hint <text>`
are unaffected; nodes without the directive still get the auto-hint.
