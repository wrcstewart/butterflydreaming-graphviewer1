CREATE (ch41:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When a superior person hears of the Tao, She diligently puts it into practice. When an average person hears of the Tao, he believes half of it, and doubts the other half. When a foolish person hears of the Tao, he laughs out loud at the very idea. If he did not laugh, it would not be the Tao. Thus it is said: The brightness of the Tao seems like darkness, the advancement of the Tao seems like retreat, the level path seems rough, the superior path seems empty, the pure seems to be tarnished, and true virtue does not seem to be enough. The virtue of caution seems like cowardice, the pure seems to be polluted, the true square seems to have no corners, the best vessels take the most time to finish, the greatest sounds cannot be heard, and the greatest image has no form. The Tao hides in the unnamed, Yet it alone nourishes and completes all things.',
    raw_text: 'When a superior person hears of the Tao, She diligently puts it into practice. When an average person hears of the Tao, he believes half of it, and doubts the other half. When a foolish person hears of the Tao, he laughs out loud at the very idea. If he did not laugh, it would not be the Tao. Thus it is said: The brightness of the Tao seems like darkness, the advancement of the Tao seems like retreat, the level path seems rough, the superior path seems empty, the pure seems to be tarnished, and true virtue does not seem to be enough. The virtue of caution seems like cowardice, the pure seems to be polluted, the true square seems to have no corners, the best vessels take the most time to finish, the greatest sounds cannot be heard, and the greatest image has no form. The Tao hides in the unnamed, Yet it alone nourishes and completes all things.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 41,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch41

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch41)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Light/Dark'})
MERGE (ch41)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch41)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch41)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch41)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C47A5A'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch41)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch41)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch41)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (prev:TextNode {chapter: 40, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch41)

RETURN ch41.url AS ch41_url;

CREATE (ch42:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao gave birth to One. The One gave birth to Two. The Two gave birth to Three. The Three gave birth to all of creation. All things carry Yin yet embrace Yang. They blend their life breaths in order to produce harmony. People despise being orphaned, widowed and poor. But the noble ones take these as their titles. In losing, much is gained, and in gaining, much is lost. What others teach I too will teach: The strong and violent will not die a natural death.',
    raw_text: 'The Tao gave birth to One. The One gave birth to Two. The Two gave birth to Three. The Three gave birth to all of creation. All things carry Yin yet embrace Yang. They blend their life breaths in order to produce harmony. People despise being orphaned, widowed and poor. But the noble ones take these as their titles. In losing, much is gained, and in gaining, much is lost. What others teach I too will teach: The strong and violent will not die a natural death.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 42,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch42

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch42)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch42)-[:TAGGED_AS {weight: 0.65, family_colour: '#C09A3A'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch42)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch42)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch42)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch42)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch42)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch42)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (prev:TextNode {chapter: 41, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch42)

RETURN ch42.url AS ch42_url;

CREATE (ch43:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'That which offers no resistance, overcomes the hardest substances. That which offers no resistance can enter where there is no space. Few in the world can comprehend the teaching without words, or understand the value of non-action.',
    raw_text: 'That which offers no resistance, overcomes the hardest substances. That which offers no resistance can enter where there is no space. Few in the world can comprehend the teaching without words, or understand the value of non-action.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 43,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch43

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch43)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch43)-[:TAGGED_AS {weight: 0.65, family_colour: '#C47A5A'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch43)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch43)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch43)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch43)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch43)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch43)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (prev:TextNode {chapter: 42, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch43)

RETURN ch43.url AS ch43_url;

CREATE (ch44:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Which is more important, your honor or your life? Which is more valuable, your possessions or your person? Which is more destructive, success or failure? Because of this, great love extracts a great cost and true wealth requires greater loss. Knowing when you have enough avoids dishonor, and knowing when to stop will keep you from danger and bring you a long, happy life.',
    raw_text: 'Which is more important, your honor or your life? Which is more valuable, your possessions or your person? Which is more destructive, success or failure? Because of this, great love extracts a great cost and true wealth requires greater loss. Knowing when you have enough avoids dishonor, and knowing when to stop will keep you from danger and bring you a long, happy life.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 44,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch44

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch44)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch44)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch44)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch44)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Loss/Longing'})
MERGE (ch44)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch44)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch44)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch44)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (prev:TextNode {chapter: 43, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch44)

RETURN ch44.url AS ch44_url;

CREATE (ch45:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The greatest accomplishments seem imperfect, yet their usefulness is not diminished. The greatest fullness seems empty, yet it will be inexhaustible. The greatest straightness seems crooked. The most valued skill seems like clumsiness. The greatest speech seems full of stammers. Movement overcomes the cold, and stillness overcomes the heat. That which is pure and still is the universal ideal.',
    raw_text: 'The greatest accomplishments seem imperfect, yet their usefulness is not diminished. The greatest fullness seems empty, yet it will be inexhaustible. The greatest straightness seems crooked. The most valued skill seems like clumsiness. The greatest speech seems full of stammers. Movement overcomes the cold, and stillness overcomes the heat. That which is pure and still is the universal ideal.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 45,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch45

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch45)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch45)-[:TAGGED_AS {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch45)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch45)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch45)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch45)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch45)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch45)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (prev:TextNode {chapter: 44, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch45)

RETURN ch45.url AS ch45_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
