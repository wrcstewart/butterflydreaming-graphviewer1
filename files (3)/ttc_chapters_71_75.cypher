CREATE (ch71:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Knowing you do not know is wholeness. Thinking you know is a disease. Only by recognizing that you have an illness can you move to seek a cure. The Master is whole because she sees her illnesses and treats them, and thus is able to remain whole.',
    raw_text: 'Knowing you do not know is wholeness. Thinking you know is a disease. Only by recognizing that you have an illness can you move to seek a cure. The Master is whole because she sees her illnesses and treats them, and thus is able to remain whole.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 71,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch71

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch71)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch71)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch71)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch71)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch71)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Wound/Healing'})
MERGE (ch71)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch71)-[:GIVES {weight: 0.55, family_colour: '#4A7BC0'}]->(c)

WITH ch71

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch71)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch71

MATCH (prev:TextNode {chapter: 70, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch71)

RETURN ch71.url AS ch71_url;

CREATE (ch72:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When people become overly bold, then disaster will soon arrive. Do not meddle with people\'s livelihood; by respecting them they will in turn respect you. Therefore, the Master knows herself but is not arrogant. She loves herself but also loves others. This is how she is able to make appropriate choices.',
    raw_text: 'When people become overly bold, then disaster will soon arrive. Do not meddle with people\'s livelihood; by respecting them they will in turn respect you. Therefore, the Master knows herself but is not arrogant. She loves herself but also loves others. This is how she is able to make appropriate choices.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 72,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch72

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch72)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch72)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch72)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch72)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch72)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch72)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch72)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch72

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch72)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch72

MATCH (prev:TextNode {chapter: 71, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch72)

RETURN ch72.url AS ch72_url;

CREATE (ch73:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Being overbold and confidant is deadly. The wise use of caution will keep you alive. One is the way to death, and the other is the way to preserve your life. Who can understand the workings of Heaven? The Tao of the universe does not compete, yet wins; does not speak, yet responds; does not command, yet is obeyed; and does not act, but is good at directing. The nets of Heaven are wide, but nothing escapes its grasp.',
    raw_text: 'Being overbold and confidant is deadly. The wise use of caution will keep you alive. One is the way to death, and the other is the way to preserve your life. Who can understand the workings of Heaven? The Tao of the universe does not compete, yet wins; does not speak, yet responds; does not command, yet is obeyed; and does not act, but is good at directing. The nets of Heaven are wide, but nothing escapes its grasp.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 73,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch73

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch73)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch73)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch73)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Fear/Dread'})
MERGE (ch73)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch73)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch73)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch73)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch73

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch73)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch73

MATCH (prev:TextNode {chapter: 72, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch73)

RETURN ch73.url AS ch73_url;

CREATE (ch74:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If you do not fear death, then how can it intimidate you? If you are not afraid of dying, there is nothing you can not do. Those who harm others are like inexperienced boys trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt.',
    raw_text: 'If you do not fear death, then how can it intimidate you? If you are not afraid of dying, there is nothing you can not do. Those who harm others are like inexperienced boys trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 74,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch74

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch74)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Fear/Dread'})
MERGE (ch74)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch74)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch74)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch74)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch74)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch74)-[:GIVES {weight: 0.55, family_colour: '#4A7BC0'}]->(c)

WITH ch74

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch74)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch74

MATCH (prev:TextNode {chapter: 73, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch74)

RETURN ch74.url AS ch74_url;

CREATE (ch75:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When people go hungry, the government\'s taxes are too high. When people become rebellious, the government has become too intrusive. When people begin to view death lightly, wealthy people have too much which causes others to starve. Only those who do not cling to their life can save it.',
    raw_text: 'When people go hungry, the government\'s taxes are too high. When people become rebellious, the government has become too intrusive. When people begin to view death lightly, wealthy people have too much which causes others to starve. Only those who do not cling to their life can save it.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 75,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch75

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch75)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch75)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch75)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch75)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch75)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Loss/Longing'})
MERGE (ch75)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch75)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch75

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch75)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch75

MATCH (prev:TextNode {chapter: 74, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch75)

RETURN ch75.url AS ch75_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
