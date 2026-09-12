CREATE (ch51:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao gives birth to all of creation. The virtue of Tao in nature nurtures them, and their family gives them their form. Their environment then shapes them into completion. That is why every creature honors the Tao and its virtue. No one tells them to honor the Tao and its virtue, it happens all by itself. So the Tao gives them birth, and its virtue cultivates them, cares for them, nurtures them, gives them a place of refuge and peace, helps them to grow and shelters them. It gives them life without wanting to posses them, and cares for them expecting nothing in return. It is their master, but it does not seek to dominate them. This is called the dark and mysterious virtue.',
    raw_text: 'The Tao gives birth to all of creation. The virtue of Tao in nature nurtures them, and their family gives them their form. Their environment then shapes them into completion. That is why every creature honors the Tao and its virtue. No one tells them to honor the Tao and its virtue, it happens all by itself. So the Tao gives them birth, and its virtue cultivates them, cares for them, nurtures them, gives them a place of refuge and peace, helps them to grow and shelters them. It gives them life without wanting to posses them, and cares for them expecting nothing in return. It is their master, but it does not seek to dominate them. This is called the dark and mysterious virtue.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 51,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch51

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch51)-[:TAGGED_AS {weight: 0.7, family_colour: '#C09A3A'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch51)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch51)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C09A3A'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch51)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch51)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Love/Bond'})
MERGE (ch51)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch51)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch51

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch51)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch51

MATCH (prev:TextNode {chapter: 50, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch51)

RETURN ch51.url AS ch51_url;

CREATE (ch52:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The world had a beginning which we call the Great Mother. Once we have found the Mother, we begin to know what Her children should be. When we know we are the Mothers child, we begin to guard the qualities of the Mother in us. She will protect us from all danger even if we lose our life. Keep your mouth closed and embrace a simple life, and you will live care-free until the end of your days. If you try to talk your way into a better life there will be no end to your trouble. To understand the small is called clarity. Knowing how to yield is called strength. To use your inner light for understanding regardless of the danger is called depending on the Constant.',
    raw_text: 'The world had a beginning which we call the Great Mother. Once we have found the Mother, we begin to know what Her children should be. When we know we are the Mothers child, we begin to guard the qualities of the Mother in us. She will protect us from all danger even if we lose our life. Keep your mouth closed and embrace a simple life, and you will live care-free until the end of your days. If you try to talk your way into a better life there will be no end to your trouble. To understand the small is called clarity. Knowing how to yield is called strength. To use your inner light for understanding regardless of the danger is called depending on the Constant.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 52,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch52

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch52)-[:TAGGED_AS {weight: 0.75, family_colour: '#C09A3A'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch52)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch52)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch52)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch52)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C47A5A'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch52)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch52)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch52

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch52)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch52

MATCH (prev:TextNode {chapter: 51, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch52)

RETURN ch52.url AS ch52_url;

CREATE (ch53:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If I understood only one thing, I would want to use it to follow the Tao. My only fear would be one of pride. The Tao goes in the level places, but people prefer to take the short cuts. If too much time is spent cleaning the house the land will become neglected and full of weeds, and the granaries will soon become empty because there is no one out working the fields. To wear fancy clothes and ornaments, to have your fill of food and drink and to waste all of your money buying possessions is called the crime of excess. Oh, how these things go against the way of the Tao!',
    raw_text: 'If I understood only one thing, I would want to use it to follow the Tao. My only fear would be one of pride. The Tao goes in the level places, but people prefer to take the short cuts. If too much time is spent cleaning the house the land will become neglected and full of weeds, and the granaries will soon become empty because there is no one out working the fields. To wear fancy clothes and ornaments, to have your fill of food and drink and to waste all of your money buying possessions is called the crime of excess. Oh, how these things go against the way of the Tao!',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 53,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch53

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch53)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch53)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch53)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch53)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch53)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch53)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch53)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch53

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch53)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch53

MATCH (prev:TextNode {chapter: 52, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch53)

RETURN ch53.url AS ch53_url;

CREATE (ch54:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'That which is well built will never be torn down. That which is well latched can not slip away. Those who do things well will be honored from generation to generation. If this idea is cultivated in the individual, then his virtue will become genuine. If this idea is cultivated in your family, then virtue in your family will be great. If this idea is cultivated in your community, then virtue will go a long way. If this idea is cultivated in your country, then virtue will be in many places. If this idea is cultivated in the world, then virtue will be with everyone. Then observe the person for what the person does, and observe the family for what it does, and observe the community for what it does, and observe the country for what it does, and observe the world for what it does. How do I know this saying is true? I observe these things and see.',
    raw_text: 'That which is well built will never be torn down. That which is well latched can not slip away. Those who do things well will be honored from generation to generation. If this idea is cultivated in the individual, then his virtue will become genuine. If this idea is cultivated in your family, then virtue in your family will be great. If this idea is cultivated in your community, then virtue will go a long way. If this idea is cultivated in your country, then virtue will be in many places. If this idea is cultivated in the world, then virtue will be with everyone. Then observe the person for what the person does, and observe the family for what it does, and observe the community for what it does, and observe the country for what it does, and observe the world for what it does. How do I know this saying is true? I observe these things and see.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 54,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch54

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch54)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch54)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Narrative/Story'})
MERGE (ch54)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch54)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch54)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C09A3A'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Memory/Time'})
MERGE (ch54)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch54)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch54

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch54)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch54

MATCH (prev:TextNode {chapter: 53, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch54)

RETURN ch54.url AS ch54_url;

CREATE (ch55:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'One who is filled with the Tao is like a newborn child. The infant is protected from the stinging insects, wild beasts, and birds of prey. Its bones are soft, its muscles are weak, but its grip is firm and strong. It does not know about the union of male and female, yet his penis can stand erect, because of the power of life within him. It can cry all day and never become hoarse. This is perfect harmony. To understand harmony is to understand the Constant. To know the Constant is to be called enlightened. To unnaturally try to extend life is not appropriate. To try and alter the life-breath is unnatural. The master understands that when something reaches its prime it will soon begin to decline. Changing the natural is against the way of the Tao. Those who do it will come to an early end.',
    raw_text: 'One who is filled with the Tao is like a newborn child. The infant is protected from the stinging insects, wild beasts, and birds of prey. Its bones are soft, its muscles are weak, but its grip is firm and strong. It does not know about the union of male and female, yet his penis can stand erect, because of the power of life within him. It can cry all day and never become hoarse. This is perfect harmony. To understand harmony is to understand the Constant. To know the Constant is to be called enlightened. To unnaturally try to extend life is not appropriate. To try and alter the life-breath is unnatural. The master understands that when something reaches its prime it will soon begin to decline. Changing the natural is against the way of the Tao. Those who do it will come to an early end.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 55,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch55

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch55)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch55)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch55)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch55)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch55)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch55)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch55)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch55

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch55)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch55

MATCH (prev:TextNode {chapter: 54, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch55)

RETURN ch55.url AS ch55_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
