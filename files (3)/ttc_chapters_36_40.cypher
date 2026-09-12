CREATE (ch36:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If you want something to return to the source, you must first allow it to spread out. If you want something to weaken, you must first allow it to become strong. If you want something to be removed, you must first allow it to flourish. If you want to possess something, you must first give it away. This is called the subtle understanding of how things are meant to be. The soft and pliable overcomes the hard and inflexible. Just as fish remain hidden in deep waters, it is best to keep weapons out of sight.',
    raw_text: 'If you want something to return to the source, you must first allow it to spread out. If you want something to weaken, you must first allow it to become strong. If you want something to be removed, you must first allow it to flourish. If you want to possess something, you must first give it away. This is called the subtle understanding of how things are meant to be. The soft and pliable overcomes the hard and inflexible. Just as fish remain hidden in deep waters, it is best to keep weapons out of sight.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 36,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch36

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch36)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch36)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch36)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch36)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch36)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch36)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch36)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch36)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch36

MATCH (prev:TextNode {chapter: 35, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch36)

RETURN ch36.url AS ch36_url;

CREATE (ch37:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao never acts with force, yet there is nothing that it can not do. If rulers could follow the way of the Tao, then all of creation would willingly follow their example. If selfish desires were to arise after their transformation, I would erase them with the power of the Uncarved Block. By the power of the Uncarved Block, future generations would lose their selfish desires. By losing their selfish desires, the world would naturally settle into peace.',
    raw_text: 'The Tao never acts with force, yet there is nothing that it can not do. If rulers could follow the way of the Tao, then all of creation would willingly follow their example. If selfish desires were to arise after their transformation, I would erase them with the power of the Uncarved Block. By the power of the Uncarved Block, future generations would lose their selfish desires. By losing their selfish desires, the world would naturally settle into peace.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 37,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch37

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch37)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch37)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch37)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch37)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch37)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch37)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch37)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch37)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (prev:TextNode {chapter: 36, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch37)

RETURN ch37.url AS ch37_url;

CREATE (ch38:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The highest good is not to seek to do good, but to allow yourself to become it. The ordinary person seeks to do good things, and finds that they can not do them continually. The Master does not force virtue on others, thus she is able to accomplish her task. The ordinary person who uses force, will find that they accomplish nothing. The kind person acts from the heart, and accomplishes a multitude of things. The righteous person acts out of pity, yet leaves many things undone. The moral person will act out of duty, and when no one will respond will roll up his sleeves and uses force. When the Tao is forgotten, there is righteousness. When righteousness is forgotten, there is morality. When morality is forgotten, there is the law. The law is the husk of faith, and trust is the beginning of chaos. Our basic understandings are not from the Tao because they come from the depths of our misunderstanding. The master abides in the fruit and not in the husk. She dwells in the Tao, and not with the things that hide it. This is how she increases in wisdom.',
    raw_text: 'The highest good is not to seek to do good, but to allow yourself to become it. The ordinary person seeks to do good things, and finds that they can not do them continually. The Master does not force virtue on others, thus she is able to accomplish her task. The ordinary person who uses force, will find that they accomplish nothing. The kind person acts from the heart, and accomplishes a multitude of things. The righteous person acts out of pity, yet leaves many things undone. The moral person will act out of duty, and when no one will respond will roll up his sleeves and uses force. When the Tao is forgotten, there is righteousness. When righteousness is forgotten, there is morality. When morality is forgotten, there is the law. The law is the husk of faith, and trust is the beginning of chaos. Our basic understandings are not from the Tao because they come from the depths of our misunderstanding. The master abides in the fruit and not in the husk. She dwells in the Tao, and not with the things that hide it. This is how she increases in wisdom.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 38,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch38

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch38)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch38)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch38)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch38)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch38)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch38)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch38)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch38)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (prev:TextNode {chapter: 37, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch38)

RETURN ch38.url AS ch38_url;

CREATE (ch39:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The masters of old attained unity with the Tao. Heaven attained unity and became pure. The earth attained unity and found peace. The spirits attained unity so they could minister. The valleys attained unity that they might be full. Humanity attained unity that they might flourish. Their leaders attained unity that they might set the example. This is the power of unity. Without unity, the sky becomes filthy. Without unity, the earth becomes unstable. Without unity, the spirits become unresponsive and disappear. Without unity, the valleys become dry as a desert. Without unity, human kind can not reproduce and becomes extinct. Without unity, our leaders become corrupt and fall. The great view the small as their source, and the high takes the low as their foundation. Their greatest asset becomes their humility. They speak of themselves as orphans and widows, thus they truly seek humility. Do not shine like the precious gem, but be as dull as a common stone.',
    raw_text: 'The masters of old attained unity with the Tao. Heaven attained unity and became pure. The earth attained unity and found peace. The spirits attained unity so they could minister. The valleys attained unity that they might be full. Humanity attained unity that they might flourish. Their leaders attained unity that they might set the example. This is the power of unity. Without unity, the sky becomes filthy. Without unity, the earth becomes unstable. Without unity, the spirits become unresponsive and disappear. Without unity, the valleys become dry as a desert. Without unity, human kind can not reproduce and becomes extinct. Without unity, our leaders become corrupt and fall. The great view the small as their source, and the high takes the low as their foundation. Their greatest asset becomes their humility. They speak of themselves as orphans and widows, thus they truly seek humility. Do not shine like the precious gem, but be as dull as a common stone.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 39,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch39

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch39)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch39)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch39)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch39)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch39)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch39)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch39)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch39)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (prev:TextNode {chapter: 38, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch39)

RETURN ch39.url AS ch39_url;

CREATE (ch40:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'All movement returns to the Tao. Weakness is how the Tao works. All of creation is born from substance. Substance is born of nothing-ness.',
    raw_text: 'All movement returns to the Tao. Weakness is how the Tao works. All of creation is born from substance. Substance is born of nothing-ness.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 40,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch40

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch40)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch40)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch40)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch40)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch40)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch40)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch40)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch40)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch40

MATCH (prev:TextNode {chapter: 39, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch40)

RETURN ch40.url AS ch40_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
