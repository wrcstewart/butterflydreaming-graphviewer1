CREATE (ch16:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If you can empty your mind of all thoughts your heart will embrace the tranquility of peace. Watch the workings of all of creation, but contemplate their return to the source. All creatures in the universe return to the point where they began. Returning to the source is tranquility because we submit to Heavens mandate. Returning to Heavens mandate is called being constant. Knowing the constant is called enlightenment. Not knowing the constant is the source of evil deeds because we have no roots. By knowing the constant we can accept things as they are. By accepting things as they are, we become impartial. By being impartial, we become one with Heaven. By being one with Heaven, we become one with Tao. Being one with Tao, we are no longer concerned about losing our life because we know the Tao is constant and we are one with Tao.',
    raw_text: 'If you can empty your mind of all thoughts your heart will embrace the tranquility of peace. Watch the workings of all of creation, but contemplate their return to the source. All creatures in the universe return to the point where they began. Returning to the source is tranquility because we submit to Heavens mandate. Returning to Heavens mandate is called being constant. Knowing the constant is called enlightenment. Not knowing the constant is the source of evil deeds because we have no roots. By knowing the constant we can accept things as they are. By accepting things as they are, we become impartial. By being impartial, we become one with Heaven. By being one with Heaven, we become one with Tao. Being one with Tao, we are no longer concerned about losing our life because we know the Tao is constant and we are one with Tao.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 16,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch16

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch16)-[:TAGGED_AS {weight: 0.75, family_colour: '#9B6B9B'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch16)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch16)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch16)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch16)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch16)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch16)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch16

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch16)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch16

MATCH (prev:TextNode {chapter: 15, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch16)

RETURN ch16.url AS ch16_url;

CREATE (ch17:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The best leaders are those the people hardly know exist. The next best is a leader who is loved and praised. Next comes the one who is feared. The worst one is the leader that is despised. If you do not trust the people, they will become untrustworthy. The best leaders value their words, and use them sparingly. When she has accomplished her task, the people say, Amazing: we did it, all by ourselves!',
    raw_text: 'The best leaders are those the people hardly know exist. The next best is a leader who is loved and praised. Next comes the one who is feared. The worst one is the leader that is despised. If you do not trust the people, they will become untrustworthy. The best leaders value their words, and use them sparingly. When she has accomplished her task, the people say, Amazing: we did it, all by ourselves!',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 17,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch17

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch17)-[:TAGGED_AS {weight: 0.7, family_colour: '#C0504D'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch17)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch17)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch17)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C47A5A'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch17)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch17)-[:ECHOES {weight: 0.25, family_colour: '#4A7BC0'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch17)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch17

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch17)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch17

MATCH (prev:TextNode {chapter: 16, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch17)

RETURN ch17.url AS ch17_url;

CREATE (ch18:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When the great Tao is abandoned, charity and righteousness appear. When intellectualism arises, hypocrisy is close behind. When there is strife in the family unit, people talk about brotherly love. When the country falls into chaos, politicians talk about patriotism.',
    raw_text: 'When the great Tao is abandoned, charity and righteousness appear. When intellectualism arises, hypocrisy is close behind. When there is strife in the family unit, people talk about brotherly love. When the country falls into chaos, politicians talk about patriotism.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 18,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch18

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch18)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch18)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch18)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch18)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch18)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Loss/Longing'})
MERGE (ch18)-[:ECHOES {weight: 0.25, family_colour: '#C0504D'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch18)-[:GIVES {weight: 0.55, family_colour: '#4A7BC0'}]->(c)

WITH ch18

MATCH (c:Cluster {name: 'Anxiety/Unease'})
MERGE (ch18)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch18

MATCH (prev:TextNode {chapter: 17, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch18)

RETURN ch18.url AS ch18_url;

CREATE (ch19:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Forget about knowledge and wisdom, and people will be a hundred times better off. Throw away charity and righteousness, and people will return to brotherly love. Throw away profit and greed, and there will not be any thieves. These three are superficial and are not enough to keep us at the center of the circle, so we must also: Embrace simplicity. Put others first. Desire little.',
    raw_text: 'Forget about knowledge and wisdom, and people will be a hundred times better off. Throw away charity and righteousness, and people will return to brotherly love. Throw away profit and greed, and there will not be any thieves. These three are superficial and are not enough to keep us at the center of the circle, so we must also: Embrace simplicity. Put others first. Desire little.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 19,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch19

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch19)-[:TAGGED_AS {weight: 0.75, family_colour: '#C0504D'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch19)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch19)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch19)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch19)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch19)-[:ECHOES {weight: 0.25, family_colour: '#4A7BC0'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch19)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch19

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch19)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch19

MATCH (prev:TextNode {chapter: 18, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch19)

RETURN ch19.url AS ch19_url;

CREATE (ch20:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Renounce knowledge and your problems will end. What is the difference between yes and no? What is the difference between good and evil? Must you fear what others fear? Nonsense, look how far you have missed the mark! Other people are joyous, as though they were at a spring festival. I alone am unconcerned and expressionless, like an infant before it has learned to smile. Other people have more than they need; I alone seem to possess nothing. I am lost and drift about with no place to go. I am like a fool, my mind is in chaos. Ordinary people are bright; I alone am dark. Ordinary people are clever; I alone am dull. Ordinary people seem discriminating; I alone am muddled and confused. I drift on the waves on the ocean, blown at the mercy of the wind. Other people have their goals, I alone am dull and uncouth. I am different from ordinary people. I nurse from the Great Mothers breasts.',
    raw_text: 'Renounce knowledge and your problems will end. What is the difference between yes and no? What is the difference between good and evil? Must you fear what others fear? Nonsense, look how far you have missed the mark! Other people are joyous, as though they were at a spring festival. I alone am unconcerned and expressionless, like an infant before it has learned to smile. Other people have more than they need; I alone seem to possess nothing. I am lost and drift about with no place to go. I am like a fool, my mind is in chaos. Ordinary people are bright; I alone am dark. Ordinary people are clever; I alone am dull. Ordinary people seem discriminating; I alone am muddled and confused. I drift on the waves on the ocean, blown at the mercy of the wind. Other people have their goals, I alone am dull and uncouth. I am different from ordinary people. I nurse from the Great Mothers breasts.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 20,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch20

MATCH (c:Cluster {name: 'Solitude/Aloneness'})
MERGE (ch20)-[:TAGGED_AS {weight: 0.75, family_colour: '#C0504D'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch20)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Self/Double'})
MERGE (ch20)-[:BRIDGES_TO {weight: 0.45, family_colour: '#9B6B9B'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Melancholy'})
MERGE (ch20)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch20)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'The Unknown Other'})
MERGE (ch20)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch20)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch20

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch20)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch20

MATCH (prev:TextNode {chapter: 19, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch20)

RETURN ch20.url AS ch20_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
