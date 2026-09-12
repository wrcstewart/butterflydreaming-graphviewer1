CREATE (ch66:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Rivers and seas are rulers of the streams of hundreds of valleys because of the power of their low position. If you want to be the ruler of people, you must speak to them like you are their servant. If you want to lead other people, you must put their interest ahead of your own. The people will not feel burdened, if a wise person is in a position of power. The people will not feel like they are being manipulated, if a wise person is in front as their leader. The whole world will ask for her guidance, and will never get tired of her. Because she does not like to compete, no one can compete with the things she accomplishes.',
    raw_text: 'Rivers and seas are rulers of the streams of hundreds of valleys because of the power of their low position. If you want to be the ruler of people, you must speak to them like you are their servant. If you want to lead other people, you must put their interest ahead of your own. The people will not feel burdened, if a wise person is in a position of power. The people will not feel like they are being manipulated, if a wise person is in front as their leader. The whole world will ask for her guidance, and will never get tired of her. Because she does not like to compete, no one can compete with the things she accomplishes.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 66,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch66

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch66)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch66)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch66)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch66)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch66)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch66)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch66)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch66

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch66)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch66

MATCH (prev:TextNode {chapter: 65, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch66)

RETURN ch66.url AS ch66_url;

CREATE (ch67:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The world talks about honoring the Tao, but you can not tell it from their actions. Because it is thought of as great, the world makes light of it. It seems too easy for anyone to use. There are three jewels that I cherish: compassion, moderation, and humility. With compassion, you will be able to be brave, With moderation, you will be able to give to others, With humility, you will be able to become a great leader. To abandon compassion while seeking to be brave, or abandoning moderation while being benevolent, or abandoning humility while seeking to lead will only lead to greater trouble. The compassionate warrior will be the winner, and if compassion is your defense you will be secure. Compassion is the protector of Heavens salvation.',
    raw_text: 'The world talks about honoring the Tao, but you can not tell it from their actions. Because it is thought of as great, the world makes light of it. It seems too easy for anyone to use. There are three jewels that I cherish: compassion, moderation, and humility. With compassion, you will be able to be brave, With moderation, you will be able to give to others, With humility, you will be able to become a great leader. To abandon compassion while seeking to be brave, or abandoning moderation while being benevolent, or abandoning humility while seeking to lead will only lead to greater trouble. The compassionate warrior will be the winner, and if compassion is your defense you will be secure. Compassion is the protector of Heavens salvation.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 67,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch67

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch67)-[:TAGGED_AS {weight: 0.75, family_colour: '#C0504D'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch67)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch67)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch67)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch67)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch67)-[:ECHOES {weight: 0.3, family_colour: '#C09A3A'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch67)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch67

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch67)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch67

MATCH (prev:TextNode {chapter: 66, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch67)

RETURN ch67.url AS ch67_url;

CREATE (ch68:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The best warriors do not use violence. The best generals do not destroy indiscriminately. The best tacticians try to avoid confrontation. The best leaders becomes servants of their people. This is called the virtue of non-competition. This is called the power to manage others. This is called attaining harmony with the heavens.',
    raw_text: 'The best warriors do not use violence. The best generals do not destroy indiscriminately. The best tacticians try to avoid confrontation. The best leaders becomes servants of their people. This is called the virtue of non-competition. This is called the power to manage others. This is called attaining harmony with the heavens.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 68,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch68

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch68)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch68)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch68)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch68)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch68)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch68)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch68)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch68

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch68)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch68

MATCH (prev:TextNode {chapter: 67, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch68)

RETURN ch68.url AS ch68_url;

CREATE (ch69:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'There is an old saying: It is better to become the passive in order to see what will happen. It is better to retreat a foot than to advance only an inch. This is called being flexible while advancing, pushing back without using force, and destroying the enemy without engaging him. There is no greater disaster than underestimating your enemy. Underestimating your enemy means losing your greatest assets. When equal forces meet in battle, victory will go to the one that enters with the greatest sorrow.',
    raw_text: 'There is an old saying: It is better to become the passive in order to see what will happen. It is better to retreat a foot than to advance only an inch. This is called being flexible while advancing, pushing back without using force, and destroying the enemy without engaging him. There is no greater disaster than underestimating your enemy. Underestimating your enemy means losing your greatest assets. When equal forces meet in battle, victory will go to the one that enters with the greatest sorrow.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 69,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch69

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch69)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch69)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Fear/Dread'})
MERGE (ch69)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Grief/Mourning'})
MERGE (ch69)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch69)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch69)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch69)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch69

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch69)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch69

MATCH (prev:TextNode {chapter: 68, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch69)

RETURN ch69.url AS ch69_url;

CREATE (ch70:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'My words are easy to understand and easier to put into practice. Yet no one in the world seems to understand them, and are not able to apply what I teach. My teachings come from the ancients, the things I do are done for a reason. Because you do not know me, you are not able to understand my teachings. Because those who know me are few, my teachings become even more precious.',
    raw_text: 'My words are easy to understand and easier to put into practice. Yet no one in the world seems to understand them, and are not able to apply what I teach. My teachings come from the ancients, the things I do are done for a reason. Because you do not know me, you are not able to understand my teachings. Because those who know me are few, my teachings become even more precious.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 70,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch70

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch70)-[:TAGGED_AS {weight: 0.7, family_colour: '#C47A5A'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch70)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'The Unknown Other'})
MERGE (ch70)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch70)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Solitude/Aloneness'})
MERGE (ch70)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch70)-[:ECHOES {weight: 0.3, family_colour: '#C09A3A'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch70)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch70

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch70)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch70

MATCH (prev:TextNode {chapter: 69, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch70)

RETURN ch70.url AS ch70_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
