CREATE (ch56:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who know do not talk. Those who talk do not know. Stop talking, meditate in silence, blunt your sharpness, release your worries, harmonize your inner light, and become one with the dust. Doing this is called the dark and mysterious identity. Those who have achieved the mysterious identity can not be approached, and they can not be alienated. They can not be benefited nor harmed. They can not be made noble nor to suffer disgrace. This makes them the most noble of all under the heavens.',
    raw_text: 'Those who know do not talk. Those who talk do not know. Stop talking, meditate in silence, blunt your sharpness, release your worries, harmonize your inner light, and become one with the dust. Doing this is called the dark and mysterious identity. Those who have achieved the mysterious identity can not be approached, and they can not be alienated. They can not be benefited nor harmed. They can not be made noble nor to suffer disgrace. This makes them the most noble of all under the heavens.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 56,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch56

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch56)-[:TAGGED_AS {weight: 0.8, family_colour: '#C47A5A'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch56)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch56)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'The Liminal'})
MERGE (ch56)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch56)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch56)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch56)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch56

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch56)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch56

MATCH (prev:TextNode {chapter: 55, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch56)

RETURN ch56.url AS ch56_url;

CREATE (ch57:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Govern your country with integrity, Weapons of war can be used with great cunning, but loyalty is only won by not-doing. How do I know the way things are? By these: The more prohibitions you make, the poorer people will be. The more weapons you possess, the greater the chaos in your country. The more knowledge that is acquired, the stranger the world will become. The more laws that you make, the greater the number of criminals. Therefore the Master says: I do nothing, and people become good by themselves. I seek peace, and people take care of their own problems. I do not meddle in their personal lives, and the people become prosperous. I let go of all my desires, and the people return to the Uncarved Block.',
    raw_text: 'Govern your country with integrity, Weapons of war can be used with great cunning, but loyalty is only won by not-doing. How do I know the way things are? By these: The more prohibitions you make, the poorer people will be. The more weapons you possess, the greater the chaos in your country. The more knowledge that is acquired, the stranger the world will become. The more laws that you make, the greater the number of criminals. Therefore the Master says: I do nothing, and people become good by themselves. I seek peace, and people take care of their own problems. I do not meddle in their personal lives, and the people become prosperous. I let go of all my desires, and the people return to the Uncarved Block.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 57,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch57

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch57)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch57)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch57)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch57)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch57)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch57)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch57)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch57

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch57)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch57

MATCH (prev:TextNode {chapter: 56, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch57)

RETURN ch57.url AS ch57_url;

CREATE (ch58:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If a government is unobtrusive, the people become whole. If a government is repressive, the people become treacherous. Good fortune has its roots in disaster, and disaster lurks with good fortune. Who knows why these things happen, or when this cycle will end? Good things seem to change into bad, and bad things often turn out for good. These things have always been hard to comprehend. Thus the Master makes things change without interfering. She is probing yet causes no harm. Straightforward, yet does not impose her will. Radiant, and easy on the eye.',
    raw_text: 'If a government is unobtrusive, the people become whole. If a government is repressive, the people become treacherous. Good fortune has its roots in disaster, and disaster lurks with good fortune. Who knows why these things happen, or when this cycle will end? Good things seem to change into bad, and bad things often turn out for good. These things have always been hard to comprehend. Thus the Master makes things change without interfering. She is probing yet causes no harm. Straightforward, yet does not impose her will. Radiant, and easy on the eye.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 58,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch58

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch58)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch58)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch58)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch58)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch58)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch58)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch58)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch58

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch58)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch58

MATCH (prev:TextNode {chapter: 57, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch58)

RETURN ch58.url AS ch58_url;

CREATE (ch59:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'There is nothing better than moderation for teaching people or serving Heaven. Those who use moderation are already on the path to the Tao. Those who follow the Tao early will have an abundance of virtue. When there is an abundance of virtue, there is nothing that can not be done. Where there is limitless ability, then the kingdom is within your grasp. When you know the Mother of the kingdom, then you will be long enduring. This is spoken of as the deep root and the firm trunk, the Way to a long life and great spiritual vision.',
    raw_text: 'There is nothing better than moderation for teaching people or serving Heaven. Those who use moderation are already on the path to the Tao. Those who follow the Tao early will have an abundance of virtue. When there is an abundance of virtue, there is nothing that can not be done. Where there is limitless ability, then the kingdom is within your grasp. When you know the Mother of the kingdom, then you will be long enduring. This is spoken of as the deep root and the firm trunk, the Way to a long life and great spiritual vision.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 59,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch59

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch59)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch59)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch59)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch59)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch59)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch59)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch59)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch59

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch59)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch59

MATCH (prev:TextNode {chapter: 58, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch59)

RETURN ch59.url AS ch59_url;

CREATE (ch60:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Governing a large country is like frying small fish. Too much poking spoils the meat. When the Tao is used to govern the world then evil will lose its power to harm the people. Not that evil will no longer exist, but only because it has lost its power. Just as evil can lose its ability to harm, the Master shuns the use of violence. If you give evil nothing to oppose, then virtue will return by itself.',
    raw_text: 'Governing a large country is like frying small fish. Too much poking spoils the meat. When the Tao is used to govern the world then evil will lose its power to harm the people. Not that evil will no longer exist, but only because it has lost its power. Just as evil can lose its ability to harm, the Master shuns the use of violence. If you give evil nothing to oppose, then virtue will return by itself.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 60,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch60

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch60)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch60)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch60)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch60)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch60)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Light/Dark'})
MERGE (ch60)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch60)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch60

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch60)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch60

MATCH (prev:TextNode {chapter: 59, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch60)

RETURN ch60.url AS ch60_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
