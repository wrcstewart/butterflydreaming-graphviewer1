# Root — collapse the two chunks into one paragraph

2026-09-01. Chunked presentation retired: one tap per node now gives all of the
text. Root was the last multi-chunk node in the corpus, so this empties the
mechanism entirely.

The two chunks are joined into a SINGLE paragraph rather than two — a paragraph
break risked the second half sitting below the card's scroll limit, which is the
same disappearance the chunking caused, just quieter.

The first chunk's hint ("Tap the ButterflyDreaming node below for its next
message to you") is removed: there is no next message. The closing hint is kept
and is still true — Settling is now revealed on the FIRST tap (viewer.js, the
paired isRoot/isLast rule).

---

@match url: butterflydreaming.org/n/8ff97087-9ba5-489f-b57d-1e096e41236e
@flag update_this: false
@set text:
Welcome to ButterflyDreaming, a free anonymous experimental social media graph that keeps no user data. Intrinsically private and safe, it aims to be a conversational tool that integrates well with other media: read, chat, write, create art and music. First just browse the system to discover some inspiration for conversation and discover how it works. Then press the "Pair" button. You will pair automatically if another User is ready. Users can see each other's browsing and help find common ground.
%%bd_hint Tap the Settling node to advance

---
