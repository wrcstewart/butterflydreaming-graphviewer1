CREATE (ch21:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The greatest virtue you can have comes from following only the Tao; which takes a form that is intangible and evasive. Even though the Tao is intangible and evasive, we are able to know it exists. Intangible and evasive, yet it has a manifestation. Secluded and dark, yet there is a vitality within it. Its vitality is very genuine. Within it we can find order. Since the beginning of time, the Tao has always existed. It is beyond existing and not existing. How do I know where creation comes from? I look inside myself and see it.',
    raw_text: 'The greatest virtue you can have comes from following only the Tao; which takes a form that is intangible and evasive. Even though the Tao is intangible and evasive, we are able to know it exists. Intangible and evasive, yet it has a manifestation. Secluded and dark, yet there is a vitality within it. Its vitality is very genuine. Within it we can find order. Since the beginning of time, the Tao has always existed. It is beyond existing and not existing. How do I know where creation comes from? I look inside myself and see it.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 21,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch21

MATCH (c:Cluster {name: 'Dream/Vision'})
MERGE (ch21)-[:TAGGED_AS {weight: 0.7, family_colour: '#9B6B9B'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch21)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch21)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch21)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch21)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch21)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch21)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch21

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch21)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch21

MATCH (prev:TextNode {chapter: 20, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch21)

RETURN ch21.url AS ch21_url;

CREATE (ch22:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If you want to become whole, first let yourself become broken. If you want to become straight, first let yourself become twisted. If you want to become full, first let yourself become empty. If you want to become new, first let yourself become old. Those whose desires are few get them, those whose desires are great go astray. For this reason the Master embraces the Tao, as an example for the world to follow. Because she is not self centered, people can see the light in her. Because she does not boast of herself, she becomes a shining example. Because she does not glorify herself, she becomes a person of merit. Because she wants nothing from the world, the world can not overcome her. When the ancient Masters said, If you want to become whole, then first let yourself be broken, they were not using empty words. All who do this will be made complete.',
    raw_text: 'If you want to become whole, first let yourself become broken. If you want to become straight, first let yourself become twisted. If you want to become full, first let yourself become empty. If you want to become new, first let yourself become old. Those whose desires are few get them, those whose desires are great go astray. For this reason the Master embraces the Tao, as an example for the world to follow. Because she is not self centered, people can see the light in her. Because she does not boast of herself, she becomes a shining example. Because she does not glorify herself, she becomes a person of merit. Because she wants nothing from the world, the world can not overcome her. When the ancient Masters said, If you want to become whole, then first let yourself be broken, they were not using empty words. All who do this will be made complete.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 22,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch22

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch22)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch22)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch22)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch22)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch22)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Wound/Healing'})
MERGE (ch22)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch22)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch22

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch22)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch22

MATCH (prev:TextNode {chapter: 21, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch22)

RETURN ch22.url AS ch22_url;

CREATE (ch23:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Nature uses few words: when the gale blows, it will not last long; when it rains hard, it lasts but a little while; What causes these to happen? Heaven and Earth. Why do we humans go on endlessly about little when nature does much in a little time? If you open yourself to the Tao, you and Tao become one. If you open yourself to Virtue, then you can become virtuous. If you open yourself to loss, then you will become lost. If you open yourself to the Tao, the Tao will eagerly welcome you. If you open yourself to virtue, virtue will become a part of you. If you open yourself to loss, the lost are glad to see you. When you do not trust people, people will become untrustworthy.',
    raw_text: 'Nature uses few words: when the gale blows, it will not last long; when it rains hard, it lasts but a little while; What causes these to happen? Heaven and Earth. Why do we humans go on endlessly about little when nature does much in a little time? If you open yourself to the Tao, you and Tao become one. If you open yourself to Virtue, then you can become virtuous. If you open yourself to loss, then you will become lost. If you open yourself to the Tao, the Tao will eagerly welcome you. If you open yourself to virtue, virtue will become a part of you. If you open yourself to loss, the lost are glad to see you. When you do not trust people, people will become untrustworthy.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 23,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch23

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch23)-[:TAGGED_AS {weight: 0.7, family_colour: '#C47A5A'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch23)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch23)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Landscape/Weather'})
MERGE (ch23)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch23)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch23)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch23)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch23

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch23)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch23

MATCH (prev:TextNode {chapter: 22, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch23)

RETURN ch23.url AS ch23_url;

CREATE (ch24:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who stand on tiptoes do not stand firmly. Those who rush ahead do not get very far. Those who try to outshine others dim their own light. Those who call themselves righteous can not know how wrong they are. Those who boast of their accomplishments diminish the things they have done. Compared to the Tao, these actions are unworthy. If we are to follow the Tao, we must not do these things.',
    raw_text: 'Those who stand on tiptoes do not stand firmly. Those who rush ahead do not get very far. Those who try to outshine others dim their own light. Those who call themselves righteous can not know how wrong they are. Those who boast of their accomplishments diminish the things they have done. Compared to the Tao, these actions are unworthy. If we are to follow the Tao, we must not do these things.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 24,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch24

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch24)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch24)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch24)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch24)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch24)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch24)-[:ECHOES {weight: 0.25, family_colour: '#4A7BC0'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch24)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch24

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch24)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch24

MATCH (prev:TextNode {chapter: 23, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch24)

RETURN ch24.url AS ch24_url;

CREATE (ch25:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Before the universe was born there was something in the chaos of the heavens. It stands alone and empty, solitary and unchanging. It is ever present and secure. It may be regarded as the Mother of the universe. Because I do not know its name, I call it the Tao. If forced to give it a name, I would call it Great. Because it is Great means it is everywhere. Being everywhere means it is eternal. Being eternal means everything returns to it. Tao is great. Heaven is great. Earth is great. Humanity is great. Within the universe, these are the four great things. Humanity follows the earth. Earth follows Heaven. Heaven follows the Tao. The Tao follows only itself.',
    raw_text: 'Before the universe was born there was something in the chaos of the heavens. It stands alone and empty, solitary and unchanging. It is ever present and secure. It may be regarded as the Mother of the universe. Because I do not know its name, I call it the Tao. If forced to give it a name, I would call it Great. Because it is Great means it is everywhere. Being everywhere means it is eternal. Being eternal means everything returns to it. Tao is great. Heaven is great. Earth is great. Humanity is great. Within the universe, these are the four great things. Humanity follows the earth. Earth follows Heaven. Heaven follows the Tao. The Tao follows only itself.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 25,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch25

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch25)-[:TAGGED_AS {weight: 0.75, family_colour: '#C09A3A'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch25)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch25)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch25)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch25)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch25)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch25)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch25

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch25)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch25

MATCH (prev:TextNode {chapter: 24, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch25)

RETURN ch25.url AS ch25_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
