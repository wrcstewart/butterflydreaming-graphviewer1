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
