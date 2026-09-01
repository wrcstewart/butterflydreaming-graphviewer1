# Conversations — restore the retrace line Sv stripped

2026-09-01. Pressing Sv on this node round-tripped the RENDERED card back into
the DB. Two lossy steps: querySelector('.chunk-text') took only the first of the
two divs %%bd_center produces, and .textContent dropped the <<yellow>> markup.
Net effect: everything from %%bd_center onward vanished. Restored verbatim; the
Sv reader is fixed in the same commit.

---

@match url: butterflydreaming.org/n/7a3400f0-2e0a-4984-a8de-15bd4e476fc7
@flag update_this: false
@set text:
Some areas for conversation - your exploration is private up until a possible pairing with another user - from that point you would see each other's browsing. Regard the areas as words leading you on to conversation - not precise terms or philosophical ideas.

%%bd_center
<<yellow>>To retrace your steps<</>> click the Local button above the graph.

---
