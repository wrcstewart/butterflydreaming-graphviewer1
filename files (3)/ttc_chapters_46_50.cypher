CREATE (ch46:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When the world follows the Tao, horses run free to fertilize the fields. When the world does not follow the Tao, war horses are bred outside the cities. There is no greater transgression than condoning peoples selfish desires, no greater disaster than being discontent, and no greater retribution than for greed. Whoever knows contentment will be at peace forever.',
    raw_text: 'When the world follows the Tao, horses run free to fertilize the fields. When the world does not follow the Tao, war horses are bred outside the cities. There is no greater transgression than condoning peoples selfish desires, no greater disaster than being discontent, and no greater retribution than for greed. Whoever knows contentment will be at peace forever.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 46,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch46

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch46)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch46)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch46)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch46)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch46)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Landscape/Weather'})
MERGE (ch46)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch46)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch46)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (prev:TextNode {chapter: 45, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch46)

RETURN ch46.url AS ch46_url;

CREATE (ch47:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Without opening your door, you can know the whole world. Without looking out your window, you can understand the way of the Tao. The more knowledge you seek, the less you will understand. The Master understands without leaving, sees clearly without looking, accomplishes much without doing anything.',
    raw_text: 'Without opening your door, you can know the whole world. Without looking out your window, you can understand the way of the Tao. The more knowledge you seek, the less you will understand. The Master understands without leaving, sees clearly without looking, accomplishes much without doing anything.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 47,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch47

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch47)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch47)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch47)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch47)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch47)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Dream/Vision'})
MERGE (ch47)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch47)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch47)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (prev:TextNode {chapter: 46, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch47)

RETURN ch47.url AS ch47_url;

CREATE (ch48:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'One who seeks knowledge learns something new every day. One who seeks the Tao unlearns something new every day. Less and less remains until you arrive at non-action. When you arrive at non-action, nothing will be left undone. Mastery of the world is achieved by letting things take their natural course. You can not master the world by changing the natural way.',
    raw_text: 'One who seeks knowledge learns something new every day. One who seeks the Tao unlearns something new every day. Less and less remains until you arrive at non-action. When you arrive at non-action, nothing will be left undone. Mastery of the world is achieved by letting things take their natural course. You can not master the world by changing the natural way.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 48,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch48

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch48)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch48)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch48)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch48)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch48)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch48)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch48)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch48)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (prev:TextNode {chapter: 47, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch48)

RETURN ch48.url AS ch48_url;

CREATE (ch49:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Master has no mind of her own. She understands the mind of the people. To those who are good she treats as good. To those who are not good she also treats as good. This is how she attains true goodness. She trusts people who are trustworthy. She also trusts people who are not trustworthy. This is how she gains true trust. The Masters mind is shut off from the world. Only for the sake of the people does she muddle her mind. They look to her in anticipation. Yet she treats them all as her children.',
    raw_text: 'The Master has no mind of her own. She understands the mind of the people. To those who are good she treats as good. To those who are not good she also treats as good. This is how she attains true goodness. She trusts people who are trustworthy. She also trusts people who are not trustworthy. This is how she gains true trust. The Masters mind is shut off from the world. Only for the sake of the people does she muddle her mind. They look to her in anticipation. Yet she treats them all as her children.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 49,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch49

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch49)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch49)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch49)-[:BRIDGES_TO {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch49)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'The Unknown Other'})
MERGE (ch49)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch49)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch49)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch49)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (prev:TextNode {chapter: 48, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch49)

RETURN ch49.url AS ch49_url;

CREATE (ch50:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who leave the womb at birth and those who enter their source at death, of these; three out of ten celebrate life, three out of ten celebrate death, and three out of ten simply go from life to death. What is the reason for this? Because they are afraid of dying, therefore they can not live. I have heard that those who celebrate life walk safely among the wild animals. When they go into battle, they remain unharmed. The animals find no place to attack them and the weapons are unable to harm them. Why? Because they can find no place for death in them.',
    raw_text: 'Those who leave the womb at birth and those who enter their source at death, of these; three out of ten celebrate life, three out of ten celebrate death, and three out of ten simply go from life to death. What is the reason for this? Because they are afraid of dying, therefore they can not live. I have heard that those who celebrate life walk safely among the wild animals. When they go into battle, they remain unharmed. The animals find no place to attack them and the weapons are unable to harm them. Why? Because they can find no place for death in them.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 50,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch50

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch50)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch50)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Fear/Dread'})
MERGE (ch50)-[:BRIDGES_TO {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch50)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch50)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch50)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch50)-[:GIVES {weight: 0.55, family_colour: '#4A7BC0'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch50)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (prev:TextNode {chapter: 49, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch50)

RETURN ch50.url AS ch50_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
