CREATE (ch26:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Heaviness is the basis of lightness. Stillness is the standard of activity. Thus the Master travels all day without ever leaving her wagon. Even though she has much to see, she is at peace in her indifference. Why should the lord of a thousand chariots be amused at the foolishness of the world? If you abandon yourself to foolishness, you lose touch with your beginnings. If you let yourself become distracted, you will lose the basis of your power.',
    raw_text: 'Heaviness is the basis of lightness. Stillness is the standard of activity. Thus the Master travels all day without ever leaving her wagon. Even though she has much to see, she is at peace in her indifference. Why should the lord of a thousand chariots be amused at the foolishness of the world? If you abandon yourself to foolishness, you lose touch with your beginnings. If you let yourself become distracted, you will lose the basis of your power.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 26,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch26

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch26)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch26)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch26)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch26)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch26)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch26)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch26)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch26

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch26)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch26

MATCH (prev:TextNode {chapter: 25, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch26)

RETURN ch26.url AS ch26_url;

CREATE (ch27:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'A good traveler leaves no tracks, and a skillful speaker is well rehearsed. A good bookkeeper has an excellent memory, and a well made door is easy to open and needs no locks. A good knot needs no rope and it can not come undone. Thus the Master is willing to help everyone, and does not know the meaning of rejection. She is there to help all of creation, and does not abandon even the smallest creature. This is called embracing the light. What is a good person but a bad persons teacher? What is a bad person but raw material for his teacher? If you fail to honor your teacher or fail to enjoy your student, you will become deluded no matter how smart you are. It is the secret of prime importance.',
    raw_text: 'A good traveler leaves no tracks, and a skillful speaker is well rehearsed. A good bookkeeper has an excellent memory, and a well made door is easy to open and needs no locks. A good knot needs no rope and it can not come undone. Thus the Master is willing to help everyone, and does not know the meaning of rejection. She is there to help all of creation, and does not abandon even the smallest creature. This is called embracing the light. What is a good person but a bad persons teacher? What is a bad person but raw material for his teacher? If you fail to honor your teacher or fail to enjoy your student, you will become deluded no matter how smart you are. It is the secret of prime importance.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 27,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch27

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch27)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch27)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Narrative/Story'})
MERGE (ch27)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch27)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch27)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch27)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch27)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch27

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch27)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch27

MATCH (prev:TextNode {chapter: 26, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch27)

RETURN ch27.url AS ch27_url;

CREATE (ch28:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Know the masculine, but keep to the feminine: and become a watershed to the world. If you embrace the world, the Tao will never leave you and you become as a little child. Know the white, yet keep to the black: be a model for the world. If you are a model for the world, the Tao inside you will strengthen and you will return whole to your eternal beginning. Know the honorable, but do not shun the disgraced: embracing the world as it is. If you embrace the world with compassion, then your virtue will return you to the Uncarved Block. The block of wood is carved into utensils by carving void into the wood. The Master uses the utensils, yet prefers to keep to the block because of its limitless possibilities. Great works do not involve discarding substance.',
    raw_text: 'Know the masculine, but keep to the feminine: and become a watershed to the world. If you embrace the world, the Tao will never leave you and you become as a little child. Know the white, yet keep to the black: be a model for the world. If you are a model for the world, the Tao inside you will strengthen and you will return whole to your eternal beginning. Know the honorable, but do not shun the disgraced: embracing the world as it is. If you embrace the world with compassion, then your virtue will return you to the Uncarved Block. The block of wood is carved into utensils by carving void into the wood. The Master uses the utensils, yet prefers to keep to the block because of its limitless possibilities. Great works do not involve discarding substance.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 28,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch28

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch28)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch28)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch28)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch28)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Light/Dark'})
MERGE (ch28)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch28)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch28)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch28

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch28)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch28

MATCH (prev:TextNode {chapter: 27, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch28)

RETURN ch28.url AS ch28_url;

CREATE (ch29:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Do you want to rule the world and control it? I do not think it can ever be done. The world is sacred vessel and it can not be controlled. You will only make it worse if you try. It may slip through your fingers and disappear. Some are meant to lead, and others are meant to follow; Some must always strain, and others have an easy time; Some are naturally big and strong, and others will always be small; Some will be protected and nurtured, and others will meet with destruction. The Master accepts things as they are, and out of compassion avoids extravagance, excess and the extremes.',
    raw_text: 'Do you want to rule the world and control it? I do not think it can ever be done. The world is sacred vessel and it can not be controlled. You will only make it worse if you try. It may slip through your fingers and disappear. Some are meant to lead, and others are meant to follow; Some must always strain, and others have an easy time; Some are naturally big and strong, and others will always be small; Some will be protected and nurtured, and others will meet with destruction. The Master accepts things as they are, and out of compassion avoids extravagance, excess and the extremes.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 29,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch29

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch29)-[:TAGGED_AS {weight: 0.75, family_colour: '#C0504D'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch29)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch29)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch29)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch29)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch29)-[:ECHOES {weight: 0.3, family_colour: '#C09A3A'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch29)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch29

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch29)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch29

MATCH (prev:TextNode {chapter: 28, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch29)

RETURN ch29.url AS ch29_url;

CREATE (ch30:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who lead people by following the Tao do not use weapons to enforce their will. Using force always leads to unseen troubles. In the places where armies march, thorns and briars bloom and grow. After armies take to war, bad years must always follow. The skillful commander strikes a decisive blow then stops. When victory is won over the enemy through war it is not a thing of great pride. When the battle is over, arrogance is the new enemy. War can result when no other alternative is given, so the one who overcomes an enemy should not dominate them. The strong always weakened with time. This is not the way of the Tao. That which is not of the Tao will soon end.',
    raw_text: 'Those who lead people by following the Tao do not use weapons to enforce their will. Using force always leads to unseen troubles. In the places where armies march, thorns and briars bloom and grow. After armies take to war, bad years must always follow. The skillful commander strikes a decisive blow then stops. When victory is won over the enemy through war it is not a thing of great pride. When the battle is over, arrogance is the new enemy. War can result when no other alternative is given, so the one who overcomes an enemy should not dominate them. The strong always weakened with time. This is not the way of the Tao. That which is not of the Tao will soon end.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 30,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch30

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch30)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch30)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch30)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Rage/Fury'})
MERGE (ch30)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch30)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Wound/Healing'})
MERGE (ch30)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch30)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch30

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch30)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch30

MATCH (prev:TextNode {chapter: 29, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch30)

RETURN ch30.url AS ch30_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
