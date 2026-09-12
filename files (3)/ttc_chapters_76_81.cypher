CREATE (ch76:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The living are soft and yielding; the dead are rigid and stiff. Living plants are flexible and tender; the dead are brittle and dry. Those who are stiff and rigid are the disciples of death. Those who are soft and yielding are the disciples of life. The rigid and stiff will be broken. The soft and yielding will overcome.',
    raw_text: 'The living are soft and yielding; the dead are rigid and stiff. Living plants are flexible and tender; the dead are brittle and dry. Those who are stiff and rigid are the disciples of death. Those who are soft and yielding are the disciples of life. The rigid and stiff will be broken. The soft and yielding will overcome.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 76,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch76

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch76)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch76)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch76)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch76)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch76)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A8C4F'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch76)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch76)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch76

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch76)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch76

MATCH (prev:TextNode {chapter: 75, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch76)

RETURN ch76.url AS ch76_url;

CREATE (ch77:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao of Heaven works in the world like the drawing of a bow. The top is bent downward; the bottom is bent up. The excess is taken from, and the deficient is given to. The Tao works to use the excess, and gives to that which is depleted. The way of people is to take from the depleted, and give to those who already have an excess. Who is able to give to the needy from their excess? Only someone who is following the way of the Tao. This is why the Master gives expecting nothing in return. She does not dwell on her past accomplishments, and does not glory in any praise.',
    raw_text: 'The Tao of Heaven works in the world like the drawing of a bow. The top is bent downward; the bottom is bent up. The excess is taken from, and the deficient is given to. The Tao works to use the excess, and gives to that which is depleted. The way of people is to take from the depleted, and give to those who already have an excess. Who is able to give to the needy from their excess? Only someone who is following the way of the Tao. This is why the Master gives expecting nothing in return. She does not dwell on her past accomplishments, and does not glory in any praise.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 77,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch77

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch77)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch77)-[:TAGGED_AS {weight: 0.65, family_colour: '#C09A3A'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch77)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch77)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch77)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch77)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch77)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch77

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch77)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch77

MATCH (prev:TextNode {chapter: 76, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch77)

RETURN ch77.url AS ch77_url;

CREATE (ch78:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Water is the softest and most yielding substance. Yet nothing is better than water, for overcoming the hard and rigid, because nothing can compete with it. Everyone knows that the soft and yielding overcomes the rigid and hard, but few can put this knowledge into practice. Therefore the Master says: Only he who is the lowest servant of the kingdom, is worthy to become its ruler. He who is willing to tackle the most unpleasant tasks, is the best ruler in the world. True sayings seem contradictory.',
    raw_text: 'Water is the softest and most yielding substance. Yet nothing is better than water, for overcoming the hard and rigid, because nothing can compete with it. Everyone knows that the soft and yielding overcomes the rigid and hard, but few can put this knowledge into practice. Therefore the Master says: Only he who is the lowest servant of the kingdom, is worthy to become its ruler. He who is willing to tackle the most unpleasant tasks, is the best ruler in the world. True sayings seem contradictory.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 78,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch78

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch78)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch78)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A8C4F'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch78)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch78)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch78)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch78)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch78)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch78

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch78)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch78

MATCH (prev:TextNode {chapter: 77, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch78)

RETURN ch78.url AS ch78_url;

CREATE (ch79:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Difficulties remain, even after solving a problem. How then can we consider that as good? Therefore the Master does what she knows is right, and makes no demands of others. A virtuous person will do the right thing, and persons with no virtue will take advantage of others. The Tao does not choose sides, the good person receives from the Tao because she is on its side.',
    raw_text: 'Difficulties remain, even after solving a problem. How then can we consider that as good? Therefore the Master does what she knows is right, and makes no demands of others. A virtuous person will do the right thing, and persons with no virtue will take advantage of others. The Tao does not choose sides, the good person receives from the Tao because she is on its side.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 79,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch79

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch79)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch79)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch79)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch79)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch79)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Wound/Healing'})
MERGE (ch79)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch79)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch79

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch79)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch79

MATCH (prev:TextNode {chapter: 78, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch79)

RETURN ch79.url AS ch79_url;

CREATE (ch80:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Small countries with few people are best. Give them all of the things they want, and they will see that they do not need them. Teach them that death is a serious thing, and to be content to never leave their homes. Even though they have plenty of horses, wagons and boats, they will not feel that they need to use them. Even if they have weapons and shields, they will keep them out of sight. Let people enjoy the simple technologies, let them enjoy their food, let them make their own clothes, let them be content with their own homes, and delight in the customs that they cherish. Although the next country is close enough that they can hear their roosters crowing and dogs barking, they are content never to visit each other all of the days of their life.',
    raw_text: 'Small countries with few people are best. Give them all of the things they want, and they will see that they do not need them. Teach them that death is a serious thing, and to be content to never leave their homes. Even though they have plenty of horses, wagons and boats, they will not feel that they need to use them. Even if they have weapons and shields, they will keep them out of sight. Let people enjoy the simple technologies, let them enjoy their food, let them make their own clothes, let them be content with their own homes, and delight in the customs that they cherish. Although the next country is close enough that they can hear their roosters crowing and dogs barking, they are content never to visit each other all of the days of their life.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 80,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch80

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch80)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch80)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch80)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch80)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch80)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Solitude/Aloneness'})
MERGE (ch80)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch80)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch80

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch80)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch80

MATCH (prev:TextNode {chapter: 79, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch80)

RETURN ch80.url AS ch80_url;

CREATE (ch81:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'True words do not sound beautiful; beautiful sounding words are not true. Wise men do not need to debate; men who need to debate are not wise. Wise men are not scholars, and scholars are not wise. The Master desires no possessions. Since the things she does is for the people, she has more than she needs. The more she gives to others, the more she has for herself. The Tao of Heaven nourishes by not forcing. The Tao of the Wise person acts by not competing.',
    raw_text: 'True words do not sound beautiful; beautiful sounding words are not true. Wise men do not need to debate; men who need to debate are not wise. Wise men are not scholars, and scholars are not wise. The Master desires no possessions. Since the things she does is for the people, she has more than she needs. The more she gives to others, the more she has for herself. The Tao of Heaven nourishes by not forcing. The Tao of the Wise person acts by not competing.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 81,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch81

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch81)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch81)-[:TAGGED_AS {weight: 0.65, family_colour: '#C47A5A'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch81)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch81)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch81)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C09A3A'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch81)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch81)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch81

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch81)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch81

MATCH (prev:TextNode {chapter: 80, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch81)

RETURN ch81.url AS ch81_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
