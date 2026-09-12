CREATE (ch11:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Thirty spokes are joined together in a wheel, but it is the center hole that allows the wheel to function. We mold clay into a pot, but it is the emptiness inside that makes the vessel useful. We fashion wood for a house, but it is the emptiness inside that makes it livable. We work with the substantial, but the emptiness is what we use.',
    raw_text: 'Thirty spokes are joined together in a wheel, but it is the center hole that allows the wheel to function. We mold clay into a pot, but it is the emptiness inside that makes the vessel useful. We fashion wood for a house, but it is the emptiness inside that makes it livable. We work with the substantial, but the emptiness is what we use.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 11,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch11

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch11)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch11)-[:TAGGED_AS {weight: 0.55, family_colour: '#C47A5A'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch11)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch11)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Earth'})
MERGE (ch11)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch11)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch11

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch11)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch11

MATCH (prev:TextNode {chapter: 10, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch11)

RETURN ch11.url AS ch11_url;

CREATE (ch12:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Five colors blind the eye. Five notes deafen the ear. Five flavors make the palate go stale. Too much activity deranges the mind. Too much wealth causes crime. The Master acts on what she feels and not what she sees. She shuns the latter, and prefers to seek the former.',
    raw_text: 'Five colors blind the eye. Five notes deafen the ear. Five flavors make the palate go stale. Too much activity deranges the mind. Too much wealth causes crime. The Master acts on what she feels and not what she sees. She shuns the latter, and prefers to seek the former.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 12,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch12

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch12)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch12)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch12)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch12)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch12)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch12)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch12)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch12

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch12)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch12

MATCH (prev:TextNode {chapter: 11, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch12)

RETURN ch12.url AS ch12_url;

CREATE (ch13:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Success is as dangerous as failure, and we are often our own worst enemy. What does it mean that success is as dangerous as failure? He who is superior is also someone\'s subordinate. Receiving favor and losing it both cause alarm. That is what is meant by success is as dangerous as failure. What does it mean that we are often our own worst enemy? The reason I have an enemy is because I have self. If I no longer had a self, I would no longer have an enemy. Love the whole world as if it were your self; then you will truly care for all things.',
    raw_text: 'Success is as dangerous as failure, and we are often our own worst enemy. What does it mean that success is as dangerous as failure? He who is superior is also someone\'s subordinate. Receiving favor and losing it both cause alarm. That is what is meant by success is as dangerous as failure. What does it mean that we are often our own worst enemy? The reason I have an enemy is because I have self. If I no longer had a self, I would no longer have an enemy. Love the whole world as if it were your self; then you will truly care for all things.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 13,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch13

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch13)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch13)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch13)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch13)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch13)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch13)-[:ECHOES {weight: 0.25, family_colour: '#C0504D'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch13)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch13

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch13)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch13

MATCH (prev:TextNode {chapter: 12, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch13)

RETURN ch13.url AS ch13_url;

CREATE (ch14:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Look for it, and it can not be seen. Listen for it, and it can not be heard. Grasp for it, and it can not be caught. These three cannot be further described, so we treat them as The One. Its highest is not bright. Its depths are not dark. Unending, unnamable, it returns to nothingness. Formless forms, and imageless images, subtle, beyond all understanding. Approach it and you will not see a beginning; follow it and there will be no end. When we grasp the Tao of the ancient ones, we can use it to direct our life today. To know the ancient origin of Tao: this is the beginning of wisdom.',
    raw_text: 'Look for it, and it can not be seen. Listen for it, and it can not be heard. Grasp for it, and it can not be caught. These three cannot be further described, so we treat them as The One. Its highest is not bright. Its depths are not dark. Unending, unnamable, it returns to nothingness. Formless forms, and imageless images, subtle, beyond all understanding. Approach it and you will not see a beginning; follow it and there will be no end. When we grasp the Tao of the ancient ones, we can use it to direct our life today. To know the ancient origin of Tao: this is the beginning of wisdom.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 14,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch14

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch14)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch14)-[:TAGGED_AS {weight: 0.6, family_colour: '#C47A5A'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch14)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Dream/Vision'})
MERGE (ch14)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch14)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C09A3A'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch14)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch14)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch14

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch14)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch14

MATCH (prev:TextNode {chapter: 13, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch14)

RETURN ch14.url AS ch14_url;

CREATE (ch15:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Sages of old were profound and knew the ways of subtlety and discernment. Their wisdom is beyond our comprehension. Because their knowledge was so far superior I can only give a poor description. They were careful as someone crossing a frozen stream in winter. Alert as if surrounded on all sides by the enemy. Courteous as a guest. Fluid as melting ice. Whole as an uncarved block of wood. Receptive as a valley. Turbid as muddied water. Who can be still until their mud settles and the water is cleared by itself? Can you remain tranquil until right action occurs by itself? The Master does not seek fulfillment. For only those who are not full are able to be used which brings the feeling of completeness.',
    raw_text: 'The Sages of old were profound and knew the ways of subtlety and discernment. Their wisdom is beyond our comprehension. Because their knowledge was so far superior I can only give a poor description. They were careful as someone crossing a frozen stream in winter. Alert as if surrounded on all sides by the enemy. Courteous as a guest. Fluid as melting ice. Whole as an uncarved block of wood. Receptive as a valley. Turbid as muddied water. Who can be still until their mud settles and the water is cleared by itself? Can you remain tranquil until right action occurs by itself? The Master does not seek fulfillment. For only those who are not full are able to be used which brings the feeling of completeness.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 15,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch15

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch15)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch15)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch15)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch15)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch15)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch15)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch15)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch15

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch15)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch15

MATCH (prev:TextNode {chapter: 14, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch15)

RETURN ch15.url AS ch15_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
