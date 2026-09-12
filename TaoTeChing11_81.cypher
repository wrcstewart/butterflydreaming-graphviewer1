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
CREATE (ch36:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'If you want something to return to the source, you must first allow it to spread out. If you want something to weaken, you must first allow it to become strong. If you want something to be removed, you must first allow it to flourish. If you want to possess something, you must first give it away. This is called the subtle understanding of how things are meant to be. The soft and pliable overcomes the hard and inflexible. Just as fish remain hidden in deep waters, it is best to keep weapons out of sight.',
    raw_text: 'If you want something to return to the source, you must first allow it to spread out. If you want something to weaken, you must first allow it to become strong. If you want something to be removed, you must first allow it to flourish. If you want to possess something, you must first give it away. This is called the subtle understanding of how things are meant to be. The soft and pliable overcomes the hard and inflexible. Just as fish remain hidden in deep waters, it is best to keep weapons out of sight.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 36,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch36

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch36)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch36)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch36)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch36)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch36)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch36)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch36)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch36

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch36)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch36

MATCH (prev:TextNode {chapter: 35, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch36)

RETURN ch36.url AS ch36_url;

CREATE (ch37:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao never acts with force, yet there is nothing that it can not do. If rulers could follow the way of the Tao, then all of creation would willingly follow their example. If selfish desires were to arise after their transformation, I would erase them with the power of the Uncarved Block. By the power of the Uncarved Block, future generations would lose their selfish desires. By losing their selfish desires, the world would naturally settle into peace.',
    raw_text: 'The Tao never acts with force, yet there is nothing that it can not do. If rulers could follow the way of the Tao, then all of creation would willingly follow their example. If selfish desires were to arise after their transformation, I would erase them with the power of the Uncarved Block. By the power of the Uncarved Block, future generations would lose their selfish desires. By losing their selfish desires, the world would naturally settle into peace.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 37,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch37

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch37)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch37)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch37)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch37)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch37)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch37)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch37)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch37

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch37)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch37

MATCH (prev:TextNode {chapter: 36, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch37)

RETURN ch37.url AS ch37_url;

CREATE (ch38:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The highest good is not to seek to do good, but to allow yourself to become it. The ordinary person seeks to do good things, and finds that they can not do them continually. The Master does not force virtue on others, thus she is able to accomplish her task. The ordinary person who uses force, will find that they accomplish nothing. The kind person acts from the heart, and accomplishes a multitude of things. The righteous person acts out of pity, yet leaves many things undone. The moral person will act out of duty, and when no one will respond will roll up his sleeves and uses force. When the Tao is forgotten, there is righteousness. When righteousness is forgotten, there is morality. When morality is forgotten, there is the law. The law is the husk of faith, and trust is the beginning of chaos. Our basic understandings are not from the Tao because they come from the depths of our misunderstanding. The master abides in the fruit and not in the husk. She dwells in the Tao, and not with the things that hide it. This is how she increases in wisdom.',
    raw_text: 'The highest good is not to seek to do good, but to allow yourself to become it. The ordinary person seeks to do good things, and finds that they can not do them continually. The Master does not force virtue on others, thus she is able to accomplish her task. The ordinary person who uses force, will find that they accomplish nothing. The kind person acts from the heart, and accomplishes a multitude of things. The righteous person acts out of pity, yet leaves many things undone. The moral person will act out of duty, and when no one will respond will roll up his sleeves and uses force. When the Tao is forgotten, there is righteousness. When righteousness is forgotten, there is morality. When morality is forgotten, there is the law. The law is the husk of faith, and trust is the beginning of chaos. Our basic understandings are not from the Tao because they come from the depths of our misunderstanding. The master abides in the fruit and not in the husk. She dwells in the Tao, and not with the things that hide it. This is how she increases in wisdom.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 38,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch38

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch38)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch38)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch38)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch38)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch38)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch38)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch38)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch38

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch38)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch38

MATCH (prev:TextNode {chapter: 37, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch38)

RETURN ch38.url AS ch38_url;

CREATE (ch39:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The masters of old attained unity with the Tao. Heaven attained unity and became pure. The earth attained unity and found peace. The spirits attained unity so they could minister. The valleys attained unity that they might be full. Humanity attained unity that they might flourish. Their leaders attained unity that they might set the example. This is the power of unity. Without unity, the sky becomes filthy. Without unity, the earth becomes unstable. Without unity, the spirits become unresponsive and disappear. Without unity, the valleys become dry as a desert. Without unity, human kind can not reproduce and becomes extinct. Without unity, our leaders become corrupt and fall. The great view the small as their source, and the high takes the low as their foundation. Their greatest asset becomes their humility. They speak of themselves as orphans and widows, thus they truly seek humility. Do not shine like the precious gem, but be as dull as a common stone.',
    raw_text: 'The masters of old attained unity with the Tao. Heaven attained unity and became pure. The earth attained unity and found peace. The spirits attained unity so they could minister. The valleys attained unity that they might be full. Humanity attained unity that they might flourish. Their leaders attained unity that they might set the example. This is the power of unity. Without unity, the sky becomes filthy. Without unity, the earth becomes unstable. Without unity, the spirits become unresponsive and disappear. Without unity, the valleys become dry as a desert. Without unity, human kind can not reproduce and becomes extinct. Without unity, our leaders become corrupt and fall. The great view the small as their source, and the high takes the low as their foundation. Their greatest asset becomes their humility. They speak of themselves as orphans and widows, thus they truly seek humility. Do not shine like the precious gem, but be as dull as a common stone.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 39,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch39

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch39)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch39)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch39)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch39)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch39)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch39)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch39)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch39

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch39)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch39

MATCH (prev:TextNode {chapter: 38, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch39)

RETURN ch39.url AS ch39_url;

CREATE (ch40:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'All movement returns to the Tao. Weakness is how the Tao works. All of creation is born from substance. Substance is born of nothing-ness.',
    raw_text: 'All movement returns to the Tao. Weakness is how the Tao works. All of creation is born from substance. Substance is born of nothing-ness.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 40,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch40

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch40)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch40)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch40)-[:BRIDGES_TO {weight: 0.5, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch40)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C09A3A'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch40)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch40)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch40)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch40

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch40)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch40

MATCH (prev:TextNode {chapter: 39, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch40)

RETURN ch40.url AS ch40_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
CREATE (ch41:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When a superior person hears of the Tao, She diligently puts it into practice. When an average person hears of the Tao, he believes half of it, and doubts the other half. When a foolish person hears of the Tao, he laughs out loud at the very idea. If he did not laugh, it would not be the Tao. Thus it is said: The brightness of the Tao seems like darkness, the advancement of the Tao seems like retreat, the level path seems rough, the superior path seems empty, the pure seems to be tarnished, and true virtue does not seem to be enough. The virtue of caution seems like cowardice, the pure seems to be polluted, the true square seems to have no corners, the best vessels take the most time to finish, the greatest sounds cannot be heard, and the greatest image has no form. The Tao hides in the unnamed, Yet it alone nourishes and completes all things.',
    raw_text: 'When a superior person hears of the Tao, She diligently puts it into practice. When an average person hears of the Tao, he believes half of it, and doubts the other half. When a foolish person hears of the Tao, he laughs out loud at the very idea. If he did not laugh, it would not be the Tao. Thus it is said: The brightness of the Tao seems like darkness, the advancement of the Tao seems like retreat, the level path seems rough, the superior path seems empty, the pure seems to be tarnished, and true virtue does not seem to be enough. The virtue of caution seems like cowardice, the pure seems to be polluted, the true square seems to have no corners, the best vessels take the most time to finish, the greatest sounds cannot be heard, and the greatest image has no form. The Tao hides in the unnamed, Yet it alone nourishes and completes all things.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 41,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch41

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch41)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Light/Dark'})
MERGE (ch41)-[:TAGGED_AS {weight: 0.6, family_colour: '#9B6B9B'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch41)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch41)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch41)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C47A5A'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch41)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch41)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch41

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch41)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch41

MATCH (prev:TextNode {chapter: 40, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch41)

RETURN ch41.url AS ch41_url;

CREATE (ch42:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao gave birth to One. The One gave birth to Two. The Two gave birth to Three. The Three gave birth to all of creation. All things carry Yin yet embrace Yang. They blend their life breaths in order to produce harmony. People despise being orphaned, widowed and poor. But the noble ones take these as their titles. In losing, much is gained, and in gaining, much is lost. What others teach I too will teach: The strong and violent will not die a natural death.',
    raw_text: 'The Tao gave birth to One. The One gave birth to Two. The Two gave birth to Three. The Three gave birth to all of creation. All things carry Yin yet embrace Yang. They blend their life breaths in order to produce harmony. People despise being orphaned, widowed and poor. But the noble ones take these as their titles. In losing, much is gained, and in gaining, much is lost. What others teach I too will teach: The strong and violent will not die a natural death.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 42,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch42

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch42)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch42)-[:TAGGED_AS {weight: 0.65, family_colour: '#C09A3A'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch42)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch42)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch42)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Seasons/Cycles'})
MERGE (ch42)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch42)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch42

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch42)-[:GIVES {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch42

MATCH (prev:TextNode {chapter: 41, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch42)

RETURN ch42.url AS ch42_url;

CREATE (ch43:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'That which offers no resistance, overcomes the hardest substances. That which offers no resistance can enter where there is no space. Few in the world can comprehend the teaching without words, or understand the value of non-action.',
    raw_text: 'That which offers no resistance, overcomes the hardest substances. That which offers no resistance can enter where there is no space. Few in the world can comprehend the teaching without words, or understand the value of non-action.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 43,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch43

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch43)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch43)-[:TAGGED_AS {weight: 0.65, family_colour: '#C47A5A'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch43)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch43)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A8C4F'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch43)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch43)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch43)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch43

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch43)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch43

MATCH (prev:TextNode {chapter: 42, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch43)

RETURN ch43.url AS ch43_url;

CREATE (ch44:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Which is more important, your honor or your life? Which is more valuable, your possessions or your person? Which is more destructive, success or failure? Because of this, great love extracts a great cost and true wealth requires greater loss. Knowing when you have enough avoids dishonor, and knowing when to stop will keep you from danger and bring you a long, happy life.',
    raw_text: 'Which is more important, your honor or your life? Which is more valuable, your possessions or your person? Which is more destructive, success or failure? Because of this, great love extracts a great cost and true wealth requires greater loss. Knowing when you have enough avoids dishonor, and knowing when to stop will keep you from danger and bring you a long, happy life.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 44,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch44

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch44)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch44)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch44)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Shame/Guilt'})
MERGE (ch44)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Loss/Longing'})
MERGE (ch44)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch44)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch44)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch44

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch44)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch44

MATCH (prev:TextNode {chapter: 43, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch44)

RETURN ch44.url AS ch44_url;

CREATE (ch45:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The greatest accomplishments seem imperfect, yet their usefulness is not diminished. The greatest fullness seems empty, yet it will be inexhaustible. The greatest straightness seems crooked. The most valued skill seems like clumsiness. The greatest speech seems full of stammers. Movement overcomes the cold, and stillness overcomes the heat. That which is pure and still is the universal ideal.',
    raw_text: 'The greatest accomplishments seem imperfect, yet their usefulness is not diminished. The greatest fullness seems empty, yet it will be inexhaustible. The greatest straightness seems crooked. The most valued skill seems like clumsiness. The greatest speech seems full of stammers. Movement overcomes the cold, and stillness overcomes the heat. That which is pure and still is the universal ideal.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 45,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch45

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch45)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch45)-[:TAGGED_AS {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch45)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch45)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch45)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch45)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch45)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch45

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch45)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch45

MATCH (prev:TextNode {chapter: 44, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch45)

RETURN ch45.url AS ch45_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
CREATE (ch46:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'When the world follows the Tao, horses run free to fertilize the fields. When the world does not follow the Tao, war horses are bred outside the cities. There is no greater transgression than condoning peoples selfish desires, no greater disaster than being discontent, and no greater retribution than for greed. Whoever knows contentment will be at peace forever.',
    raw_text: 'When the world follows the Tao, horses run free to fertilize the fields. When the world does not follow the Tao, war horses are bred outside the cities. There is no greater transgression than condoning peoples selfish desires, no greater disaster than being discontent, and no greater retribution than for greed. Whoever knows contentment will be at peace forever.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 46,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch46

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch46)-[:TAGGED_AS {weight: 0.7, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Envy/Desire'})
MERGE (ch46)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch46)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch46)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch46)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Landscape/Weather'})
MERGE (ch46)-[:ECHOES {weight: 0.3, family_colour: '#4A8C4F'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch46)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch46

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch46)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch46

MATCH (prev:TextNode {chapter: 45, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch46)

RETURN ch46.url AS ch46_url;

CREATE (ch47:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Without opening your door, you can know the whole world. Without looking out your window, you can understand the way of the Tao. The more knowledge you seek, the less you will understand. The Master understands without leaving, sees clearly without looking, accomplishes much without doing anything.',
    raw_text: 'Without opening your door, you can know the whole world. Without looking out your window, you can understand the way of the Tao. The more knowledge you seek, the less you will understand. The Master understands without leaving, sees clearly without looking, accomplishes much without doing anything.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 47,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch47

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch47)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch47)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Word/Silence'})
MERGE (ch47)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C47A5A'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch47)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch47)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Dream/Vision'})
MERGE (ch47)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch47)-[:GIVES {weight: 0.55, family_colour: '#C0504D'}]->(c)

WITH ch47

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch47)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch47

MATCH (prev:TextNode {chapter: 46, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch47)

RETURN ch47.url AS ch47_url;

CREATE (ch48:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'One who seeks knowledge learns something new every day. One who seeks the Tao unlearns something new every day. Less and less remains until you arrive at non-action. When you arrive at non-action, nothing will be left undone. Mastery of the world is achieved by letting things take their natural course. You can not master the world by changing the natural way.',
    raw_text: 'One who seeks knowledge learns something new every day. One who seeks the Tao unlearns something new every day. Less and less remains until you arrive at non-action. When you arrive at non-action, nothing will be left undone. Mastery of the world is achieved by letting things take their natural course. You can not master the world by changing the natural way.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 48,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch48

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch48)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch48)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch48)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch48)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Meditation'})
MERGE (ch48)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Return/Resolution'})
MERGE (ch48)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch48)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch48

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch48)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch48

MATCH (prev:TextNode {chapter: 47, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch48)

RETURN ch48.url AS ch48_url;

CREATE (ch49:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Master has no mind of her own. She understands the mind of the people. To those who are good she treats as good. To those who are not good she also treats as good. This is how she attains true goodness. She trusts people who are trustworthy. She also trusts people who are not trustworthy. This is how she gains true trust. The Masters mind is shut off from the world. Only for the sake of the people does she muddle her mind. They look to her in anticipation. Yet she treats them all as her children.',
    raw_text: 'The Master has no mind of her own. She understands the mind of the people. To those who are good she treats as good. To those who are not good she also treats as good. This is how she attains true goodness. She trusts people who are trustworthy. She also trusts people who are not trustworthy. This is how she gains true trust. The Masters mind is shut off from the world. Only for the sake of the people does she muddle her mind. They look to her in anticipation. Yet she treats them all as her children.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 49,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch49

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch49)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch49)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch49)-[:BRIDGES_TO {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch49)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'The Unknown Other'})
MERGE (ch49)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch49)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch49)-[:GIVES {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch49)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch49

MATCH (prev:TextNode {chapter: 48, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch49)

RETURN ch49.url AS ch49_url;

CREATE (ch50:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Those who leave the womb at birth and those who enter their source at death, of these; three out of ten celebrate life, three out of ten celebrate death, and three out of ten simply go from life to death. What is the reason for this? Because they are afraid of dying, therefore they can not live. I have heard that those who celebrate life walk safely among the wild animals. When they go into battle, they remain unharmed. The animals find no place to attack them and the weapons are unable to harm them. Why? Because they can find no place for death in them.',
    raw_text: 'Those who leave the womb at birth and those who enter their source at death, of these; three out of ten celebrate life, three out of ten celebrate death, and three out of ten simply go from life to death. What is the reason for this? Because they are afraid of dying, therefore they can not live. I have heard that those who celebrate life walk safely among the wild animals. When they go into battle, they remain unharmed. The animals find no place to attack them and the weapons are unable to harm them. Why? Because they can find no place for death in them.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 50,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch50

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch50)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Impermanence'})
MERGE (ch50)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Fear/Dread'})
MERGE (ch50)-[:BRIDGES_TO {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch50)-[:BRIDGES_TO {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Transcendence'})
MERGE (ch50)-[:RESONATES_WITH {weight: 0.35, family_colour: '#9B6B9B'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch50)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch50)-[:GIVES {weight: 0.55, family_colour: '#4A7BC0'}]->(c)

WITH ch50

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch50)-[:GIVES {weight: 0.4, family_colour: '#C0504D'}]->(c)

WITH ch50

MATCH (prev:TextNode {chapter: 49, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.6, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch50)

RETURN ch50.url AS ch50_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
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
CREATE (ch61:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'A large country should take the low place like a great watershed, which from its low position assumes the female role. The female overcomes the male by the power of her position. Her tranquility gives rise to her humility. If a large country takes the low position, it will be able to influence smaller countries. If smaller countries take the lower position, then they can allow themselves to be influenced. So both seek to take the lower position in order to influence the other, or be influenced. Large countries should desire to protect and help the people, and small countries should desire to serve others. Both large and small countries benefit greatly from humility.',
    raw_text: 'A large country should take the low place like a great watershed, which from its low position assumes the female role. The female overcomes the male by the power of her position. Her tranquility gives rise to her humility. If a large country takes the low position, it will be able to influence smaller countries. If smaller countries take the lower position, then they can allow themselves to be influenced. So both seek to take the lower position in order to influence the other, or be influenced. Large countries should desire to protect and help the people, and small countries should desire to serve others. Both large and small countries benefit greatly from humility.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 61,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch61

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch61)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch61)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch61)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch61)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Water/Reflection'})
MERGE (ch61)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A8C4F'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Compassion/Empathy'})
MERGE (ch61)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch61)-[:GIVES {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch61

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch61)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch61

MATCH (prev:TextNode {chapter: 60, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch61)

RETURN ch61.url AS ch61_url;

CREATE (ch62:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The Tao is the tabernacle of creation, it is a treasure for those who are good, and a place of refuge for those who are not. How can those who are not good be abandoned? Words that are beautiful are worth much, but good behavior can only be learned by example. When a new leader takes office, do not give him gifts and offerings. These things are not as valuable as teaching him about the Tao. Why was the Tao esteemed by the ancient Masters? Is it not said: With it we find without looking. With it we find forgiveness for our transgressions. That is why the world can not understand it.',
    raw_text: 'The Tao is the tabernacle of creation, it is a treasure for those who are good, and a place of refuge for those who are not. How can those who are not good be abandoned? Words that are beautiful are worth much, but good behavior can only be learned by example. When a new leader takes office, do not give him gifts and offerings. These things are not as valuable as teaching him about the Tao. Why was the Tao esteemed by the ancient Masters? Is it not said: With it we find without looking. With it we find forgiveness for our transgressions. That is why the world can not understand it.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 62,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch62

MATCH (c:Cluster {name: 'Myth/Archetype'})
MERGE (ch62)-[:TAGGED_AS {weight: 0.75, family_colour: '#C09A3A'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Community/Encounter'})
MERGE (ch62)-[:TAGGED_AS {weight: 0.6, family_colour: '#C0504D'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Sacrifice/Gift'})
MERGE (ch62)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C09A3A'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Threshold/Crossing'})
MERGE (ch62)-[:BRIDGES_TO {weight: 0.4, family_colour: '#9B6B9B'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch62)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch62)-[:ECHOES {weight: 0.3, family_colour: '#C0504D'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Gratitude'})
MERGE (ch62)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch62

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch62)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch62

MATCH (prev:TextNode {chapter: 61, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch62)

RETURN ch62.url AS ch62_url;

CREATE (ch63:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Act by not acting; do by not doing. Enjoy the plain and simple. Find that greatness in the small. Take care of difficult problems while they are still easy; Do easy things before they become too hard. Difficult problems are best solved while they are easy. Great projects are best started while they are small. The Master never takes on more than she can handle, which means that she leaves nothing undone. When an affirmation is given too lightly, keep your eyes open for trouble ahead. When something seems too easy, difficulty is hiding in the details. The master expects great difficulty, so the task is always easier than planned.',
    raw_text: 'Act by not acting; do by not doing. Enjoy the plain and simple. Find that greatness in the small. Take care of difficult problems while they are still easy; Do easy things before they become too hard. Difficult problems are best solved while they are easy. Great projects are best started while they are small. The Master never takes on more than she can handle, which means that she leaves nothing undone. When an affirmation is given too lightly, keep your eyes open for trouble ahead. When something seems too easy, difficulty is hiding in the details. The master expects great difficulty, so the task is always easier than planned.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 63,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch63

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch63)-[:TAGGED_AS {weight: 0.8, family_colour: '#4A7BC0'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch63)-[:TAGGED_AS {weight: 0.65, family_colour: '#C0504D'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch63)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch63)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch63)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch63)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch63)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch63

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch63)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch63

MATCH (prev:TextNode {chapter: 62, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.65, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch63)

RETURN ch63.url AS ch63_url;

CREATE (ch64:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'Things are easier to control while things are quiet. Things are easier to plan far in advance. Things break easier while they are still brittle. Things are easier hid while they are still small. Prevent problems before they arise. Take action before things get out of hand. The tallest tree begins as a tiny sprout. The tallest building starts with one shovel of dirt. A journey of a thousand miles starts with a single footstep. If you rush into action, you will fail. If you hold on too tight, you will lose your grip. Therefore the Master lets things take their course and thus never fails. She does not hold on to things and never loses them. By pursuing your goals too relentlessly, you let them slip away. If you are as concerned about the outcome as you are about the beginning, then it is hard to do things wrong. The master seeks no possessions. She learns by unlearning, thus she is able to understand all things. This gives her the ability to help all of creation.',
    raw_text: 'Things are easier to control while things are quiet. Things are easier to plan far in advance. Things break easier while they are still brittle. Things are easier hid while they are still small. Prevent problems before they arise. Take action before things get out of hand. The tallest tree begins as a tiny sprout. The tallest building starts with one shovel of dirt. A journey of a thousand miles starts with a single footstep. If you rush into action, you will fail. If you hold on too tight, you will lose your grip. Therefore the Master lets things take their course and thus never fails. She does not hold on to things and never loses them. By pursuing your goals too relentlessly, you let them slip away. If you are as concerned about the outcome as you are about the beginning, then it is hard to do things wrong. The master seeks no possessions. She learns by unlearning, thus she is able to understand all things. This gives her the ability to help all of creation.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 64,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch64

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch64)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Journey/Path'})
MERGE (ch64)-[:TAGGED_AS {weight: 0.65, family_colour: '#9B6B9B'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch64)-[:BRIDGES_TO {weight: 0.45, family_colour: '#C0504D'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Causation/Consequence'})
MERGE (ch64)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch64)-[:RESONATES_WITH {weight: 0.35, family_colour: '#4A7BC0'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Transformation'})
MERGE (ch64)-[:ECHOES {weight: 0.3, family_colour: '#9B6B9B'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch64)-[:GIVES {weight: 0.5, family_colour: '#C0504D'}]->(c)

WITH ch64

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch64)-[:GIVES {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch64

MATCH (prev:TextNode {chapter: 63, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.75, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch64)

RETURN ch64.url AS ch64_url;

CREATE (ch65:TextNode {
    url: 'butterflydreaming.org/n/' + randomUUID(),
    text: 'The ancient Masters who understood the way of the Tao, did not educate people, but made them forget. Smart people are difficult to guide, because they think they are too clever. To use cleverness to rule a country, is to lead the country to ruin. To avoid cleverness in ruling a country, is to lead the country to prosperity. Knowing the two alternatives is a pattern. Remaining aware of the pattern is a virtue. This dark and mysterious virtue is profound. It is opposite our natural inclination, but leads to harmony with the heavens.',
    raw_text: 'The ancient Masters who understood the way of the Tao, did not educate people, but made them forget. Smart people are difficult to guide, because they think they are too clever. To use cleverness to rule a country, is to lead the country to ruin. To avoid cleverness in ruling a country, is to lead the country to prosperity. Knowing the two alternatives is a pattern. Remaining aware of the pattern is a virtue. This dark and mysterious virtue is profound. It is opposite our natural inclination, but leads to harmony with the heavens.',
    source: 'seed',
    source_text: 'Tao Te Ching',
    translator: 'John H. McDonald',
    lang: 'en',
    chapter: 65,
    created_at: datetime('2026-05-20T10:00:00.000000Z'),
    tagging_status: 'complete',
    gateway: false,
    views: 0,
    selects: 0,
    fusions: 0,
    n_r: 0
})

WITH ch65

MATCH (c:Cluster {name: 'Paradox'})
MERGE (ch65)-[:TAGGED_AS {weight: 0.75, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Mindfulness'})
MERGE (ch65)-[:TAGGED_AS {weight: 0.6, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Judgement/Discernment'})
MERGE (ch65)-[:BRIDGES_TO {weight: 0.45, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Order/Chaos'})
MERGE (ch65)-[:BRIDGES_TO {weight: 0.4, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Surrender/Letting Go'})
MERGE (ch65)-[:RESONATES_WITH {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Naming/Becoming'})
MERGE (ch65)-[:ECHOES {weight: 0.3, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Questioning/Doubt'})
MERGE (ch65)-[:GIVES {weight: 0.5, family_colour: '#4A7BC0'}]->(c)

WITH ch65

MATCH (c:Cluster {name: 'Wonder/Awe'})
MERGE (ch65)-[:GIVES {weight: 0.35, family_colour: '#C0504D'}]->(c)

WITH ch65

MATCH (prev:TextNode {chapter: 64, translator: 'John H. McDonald', source_text: 'Tao Te Ching'})
MERGE (prev)-[:CHILD {weight: 0.7, source: 'sequence', created_at: datetime('2026-05-20T10:00:00.000000Z')}]->(ch65)

RETURN ch65.url AS ch65_url;

MATCH (n:TextNode)
OPTIONAL MATCH (n)-[:CHILD]->(child)
WITH n, count(child) AS child_count
SET n.n_r = child_count;

MATCH (n:Cluster)
OPTIONAL MATCH (n)--(m)
WHERE NOT m:Family AND NOT m:Root
WITH n, count(m) AS rel_count
SET n.n_r = rel_count;
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
