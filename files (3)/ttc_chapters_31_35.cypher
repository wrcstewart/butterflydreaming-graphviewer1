CREATE (ch31:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Weapons are the bearers of bad news; all people should detest them. The wise man values the left side, and in time of war he values the right. Weapons are meant for destruction, and thus are avoided by the wise. Only as a last resort will a wise person use a deadly weapon. If peace is her true objective how can she rejoice in the victory of war? Those who rejoice in victory delight in the slaughter of humanity. Those who resort to violence will never bring peace to the world. The left side is a place of honor on happy occasions. The right side is reserved for mourning at a funeral. When the lieutenants take the left side to prepare for war, the general should be on the right side, because he knows the outcome will be death. The death of many should be greeted with great sorrow, and the victory celebration should honor those who have died.',
    raw_text: 'Weapons are the bearers of bad news; all people should detest them. The wise man values the left side, and in time of war he values the right. Weapons are meant for destruction, and thus are avoided by the wise. Only as a last resort will a wise person use a deadly weapon. If peace is her true objective how can she rejoice in the victory of war? Those who rejoice in victory delight in the slaughter of humanity. Those who resort to violence will never bring peace to the world. The left side is a place of honor on happy occasions. The right side is reserved for mourning at a funeral. When the lieutenants take the left side to prepare for war, the general should be on the right side, because he knows the outcome will be death. The death of many should be greeted with great sorrow, and the victory celebration should honor those who have died.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 31,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch31

MATCH (c:Cluster {name: 'Grief/Mourning'})
MERGE (ch31)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch31)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Rage/Fury'})
MERGE (ch31)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch31)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch31)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch31)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch31)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch31

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch31)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch31

MATCH (prev:TextNode {chapter: 30, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch31)

RETURN ch31.url AS ch31_url;

CREATE (ch32:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao is nameless and unchanging. Although it appears insignificant, nothing in the world can contain it. If a ruler abides by its principles, then her people will willingly follow. Heaven would then reign on earth, like sweet rain falling on paradise. People would have no need for laws, because the law would be written on their hearts. Naming is a necessity for order, but naming can not order all things. Naming often makes things impersonal, so we should know when naming should end. Knowing when to stop naming, you can avoid the pitfall it brings. All things end in the Tao just as the small streams and the largest rivers flow through valleys to the sea.',
    raw_text: 'The Tao is nameless and unchanging. Although it appears insignificant, nothing in the world can contain it. If a ruler abides by its principles, then her people will willingly follow. Heaven would then reign on earth, like sweet rain falling on paradise. People would have no need for laws, because the law would be written on their hearts. Naming is a necessity for order, but naming can not order all things. Naming often makes things impersonal, so we should know when naming should end. Knowing when to stop naming, you can avoid the pitfall it brings. All things end in the Tao just as the small streams and the largest rivers flow through valleys to the sea.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 32,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch32

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch32)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch32)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch32)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch32)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch32)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch32)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch32)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch32

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch32)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch32

MATCH (prev:TextNode {chapter: 31, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch32)

RETURN ch32.url AS ch32_url;

CREATE (ch33:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who know others are intelligent; those who know themselves are truly wise. Those who master others are strong; those who master themselves have true power. Those who know they have enough are truly wealthy. Those who persist will reach their goal. Those who keep their course have a strong will. Those who embrace death will not perish, but have life everlasting.',
    raw_text: 'Those who know others are intelligent; those who know themselves are truly wise. Those who master others are strong; those who master themselves have true power. Those who know they have enough are truly wealthy. Those who persist will reach their goal. Those who keep their course have a strong will. Those who embrace death will not perish, but have life everlasting.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 33,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch33

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch33)-[:TAGGED_AS {weight: 0.75, family_colour: '#9B6B9B'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch33)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch33)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch33)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch33)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch33)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch33)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch33

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch33)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch33

MATCH (prev:TextNode {chapter: 32, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch33)

RETURN ch33.url AS ch33_url;

CREATE (ch34:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The great Tao flows unobstructed in every direction. All things rely on it to conceive and be born, and it does not deny even the smallest of creation. When it has accomplished great wonders, it does not claim them for itself. It nourishes infinite worlds, yet it does not seek to master the smallest creature. Since it is without wants and desires, it can be considered humble. All of creation seeks it for refuge yet it does not seek to master or control. Because it does not seek greatness; it is able to accomplish truly great things.',
    raw_text: 'The great Tao flows unobstructed in every direction. All things rely on it to conceive and be born, and it does not deny even the smallest of creation. When it has accomplished great wonders, it does not claim them for itself. It nourishes infinite worlds, yet it does not seek to master the smallest creature. Since it is without wants and desires, it can be considered humble. All of creation seeks it for refuge yet it does not seek to master or control. Because it does not seek greatness; it is able to accomplish truly great things.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 34,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch34

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch34)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch34)-[:TAGGED_AS {weight: 0.65, family_colour: '#4A7BC0'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch34)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C09A3A'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch34)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch34)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch34)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch34)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch34

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch34)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch34

MATCH (prev:TextNode {chapter: 33, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch34)

RETURN ch34.url AS ch34_url;

CREATE (ch35:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'She who follows the way of the Tao will draw the world to her steps. She can go without fear of being injured, because she has found peace and tranquility in her heart. Where there is music and good food, people will stop to enjoy it. But words spoken of the Tao seem to them boring and stale. When looked at, there is nothing for them to see. When listened for, there is nothing for them to hear. Yet if they put it to use, it would never be exhausted.',
    raw_text: 'She who follows the way of the Tao will draw the world to her steps. She can go without fear of being injured, because she has found peace and tranquility in her heart. Where there is music and good food, people will stop to enjoy it. But words spoken of the Tao seem to them boring and stale. When looked at, there is nothing for them to see. When listened for, there is nothing for them to hear. Yet if they put it to use, it would never be exhausted.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 35,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch35

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch35)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch35)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch35)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch35)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch35)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Joy/Delight'})
MERGE (ch35)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch35)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch35

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch35)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch35

MATCH (prev:TextNode {chapter: 34, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch35)

RETURN ch35.url AS ch35_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
