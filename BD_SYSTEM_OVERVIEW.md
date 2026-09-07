# ButterflyDreaming — system overview

**2026-09-07.** A self-contained description of the system as it actually stands,
written to be read without access to the repository. Its purpose is to support a
design conversation about **what data should be written when a user saves a node
they have created**, and about how joint browsing and editing should work.

Counts and property lists below were queried from the live database, not
recalled. Where something is designed but not built, it says so.

---

## 1. What BD is

A graph of texts you walk through rather than scroll. Every node holds a passage;
the edges are the relations between passages. You tap a node, its text appears in
a card, and its neighbourhood opens around it.

Two people can pair. Each then sees where the other is, can merge the other's
view into their own, and — this is the part not yet built — should eventually be
able to compose something together and place it back into the graph.

Three constraints shape everything:

- **Everything expensive runs on the client.** The only server-supplied media are
  one-off `.mp3` files for the music player. Speech is synthesised in the browser;
  so is speech recognition. The reason is scale: a growing corpus served as audio
  to many readers is a permanent centralised bandwidth cost. *If it cannot run in
  the browser it is not viable.*
- **The whole corpus is resident.** All nodes and all edges are loaded at boot.
  Navigation is pure hide/show — there is no fetch-on-demand and no simulated
  edge system. 3,183 elements at present.
- **Colour cannot be the only carrier.** The author has reduced colour vision.
  State is signalled by luminance, width and shape; hue is at most a redundant
  second channel.

---

## 2. The data model

### 2.1 Node types

| label | count | what it is |
|---|---|---|
| `TextNode` | 211 | a passage of text — the content layer |
| `Cluster` | 126 | a theme; the tagging vocabulary |
| `Family` | 46 | a grouping of clusters |
| `SubFamily` | 40 | a grouping within a family |
| `Entry` | 3 | an entry point to a work or module |
| `HelperMessage` | 5 | UI guidance stored as data, not code |
| `HelperHub` | 1 | parent of the helper messages |
| `Root` | 1 | the single origin node |
| *(unlabelled)* | **84** | **debris — see §2.5** |

There is **no node type for user-created content.** That absence is the subject
of the forthcoming discussion.

### 2.2 Relationship types

| type | count | endpoints | properties |
|---|---|---|---|
| `CLUSTER_REL` | 1640 | TextNode → Cluster | `tagged_as`, `gives`, `bridges_to`, `echoes`, `resonates_with`, layout hints |
| `DESCENDS_FROM` | 390 | Family→Cluster, Family→Family, Entry→Family | `weight`, layout hints |
| `CHILD` | 244 | TextNode → TextNode | `weight`, `created_at`, `source` |
| `CONTAINS_CLUSTER` | 227 | TextNode → Cluster | `count` |
| `PART_OF` | 188 | TextNode → TextNode | none |
| `CONTAINS_SECTION` | 10 | TextNode → TextNode | none |
| `GATEWAY_LINK` | 9 | TextNode → Entry | layout hints |
| `CONTAINS_HELPER` | 5 | HelperHub → HelperMessage | none |
| `CONTAINS` | 2 | — | none |

Two distinctions matter:

- **`CHILD` is strictly the reading spine** — the order in which a work is meant
  to be read. It is not general containment.
- **`CONTAINS_SECTION`** was introduced separately so that structural containment
  could stop overloading `CHILD`.

`CLUSTER_REL` carries a *kind* of relation in its property names rather than in
the relationship type: a TextNode is `tagged_as` a Cluster, or `gives` to it, or
`bridges_to` it. One edge can carry several of these at once with different
weights.

### 2.3 Node properties

```
Root         name url text lang source n_r created_at updated_at
Family       name url [text] [colour hex description n_r]
SubFamily    name url [text]
Cluster      name url label display_name n_r [family_primary]
             [emotion_x/y  reason_x/y  spirit_x/y  nature_x/y
              symbolic_x/y arts_x/y]      ← per-dimension coordinates
TextNode     text source_text [raw_text] title url seq gateway n_r
             selects views fusions [chapter section_title]
             [source lang translator] [tagging_status tagged_by tagged_at]
             [module_type hasModuleScript]
Entry        name url text colour
HelperMessage name url title text trigger
```

Every node also carries `created_at`, `updated_at`, `created_at_estimated`.

Three things worth noting for a save-path design:

- **`url` is the durable identity.** It is a UUID and it is what the viewer uses
  as its node id. It is *not* the database's internal element id, which is not
  stable across restarts. Anything that refers to a node across time or across
  two browsers must use `url`.
- **The viewer renders `display_name || name`** for clusters, so renaming a
  cluster means updating `display_name` and `label` too — three fields, not one.
- **`raw_text` is a byte-identical duplicate of `text`** on 198 TextNodes. Dead
  weight, and a trap: a writer that updates one and not the other creates a
  silent divergence.

### 2.4 Layout hints — view-scoped, and they live on *edges*

Node positions are not stored on nodes. They are stored as `hint_x`, `hint_y`,
`hint_scale` **on the edge that brings a node into view**, and they are scoped
per viewing parent:

```
hint_x_<parentUuid>   hint_y_<parentUuid>   hint_scale_<parentUuid>
```

The reason is that the graph is a DAG: one edge can be traversed from several
different parents, and a position that suits one view is wrong in another.
Pre-2026-07-23 edges still carry bare `hint_x` keys and the reader falls back to
them.

Two consequences that will matter:

- **Deleting an edge deletes its layout hints**, and one unhinted child is enough
  to drop a whole view from a stored `preset` layout to a recomputed one.
- Hints are written by a separate control from text (§6), and both report
  "saved".

### 2.5 Data hygiene — 84 orphan nodes

There are **84 nodes with no label at all**, each with exactly one relationship,
all created in a single bulk write at 2026-08-21T13:01:27. They form 42
`CHILD` edges between each other and connect to nothing else in the corpus. They
have no `url`.

They are debris from the stable-id migration. They are harmless in that nothing
reaches them by navigation, but they are the reason a fallback path in the
viewer's id resolution is load-bearing, and **they are a live example of the
failure mode the save-path design has to prevent: nodes created without
identity, type or attachment.**

---

## 3. Navigation and views

### 3.1 One tap does everything

A node tap shows its text **and** opens its neighbourhood in the same gesture.
An earlier model split the text across several taps; that was retired — one tap
per node now yields all the text, and the chunking directive appears in zero
nodes.

### 3.2 The views

| view | what it shows |
|---|---|
| **Root splash** | the Root node alone. Deliberately alone: the first tap is the moment the speech offer can reach everybody |
| **Conversations** | the octagonal hub — six Family circles, a white Gateways circle, and Settling |
| **Family** | the clusters descending from a family |
| **Cluster** | the text nodes tagged into a theme. The most elaborate layout path |
| **Gateway / reading** | a work: its section titles and the reading spine, laid out as a sequence grid |
| **Route** | the path from where you are to where your partner is (§5.4) |

Cluster views are laid out from stored hints where they exist and simulated where
they do not. Gateways carry `seq = -1`, which is why the sequence-grid branch
fires for every cluster view.

### 3.3 History and the breadcrumb trail

The **History panel** holds every card you have opened except the newest, which
sits above it in its own Current panel. In Nodes mode the two collapse into a
single scrollable pane.

**Breadcrumbs** are a strip of chips, one per node visited, at the foot of the
screen. When paired, there are two strips: yours and your partner's. Their strip
is browsable — tapping a chip in it navigates you to that node without marking
anything.

---

## 4. The visual language

### 4.1 Achromatic by default

As of 2026-09-06 the plain URL gives the **achromatic model**: node bodies are
transparent, and identity lives in the *label* rather than in a fill. `?ink=0`
returns the older coloured model, which is kept working deliberately so the two
can be compared.

**Colour has not been removed. It has moved from the fill to the label.** Every
node's *name* is drawn in its own colour, and the whole colour-inheritance scheme
still operates unchanged:

- A top-level family has a pure colour of its own.
- A child blends its parents' colours, and carries an **ink purity** of
  `1 / √(number of parents)`, averaged down the chain.
- So **the further a node sits from a single lineage, the less saturated its name
  becomes.** Desaturation is not a fading-out; it is the information. A greyish
  label says *descended from many things*, and a vivid one says *descended from
  one*.
- Text nodes are deliberately exempt, drawn in plain light grey. They are the
  great majority, so this is what decides whether the scheme reads calm or noisy.

What was freed is the **node body**, whose opacity is now zero, and the
**border**. Type borders were removed on principle: *border and outline carry
state — local, remote, shared, selected — and nothing else.* Type is carried by
shape and by label colour.

So there are two live channels, and they do not compete:

| channel | carries |
|---|---|
| **hue and saturation of the label** | what the node *is* — its lineage |
| **achromatic rings, by width and opacity** | who is *looking at* it |

A corollary the author put sharply: **equal legibility means equal
indistinguishability** — if every node reads as strongly as every other, nothing
stands out. Low saturation is a signal, not a defect.

### 4.2 The ring ladder

This is the core signalling system, and it exists because two people are looking
at one graph.

Each node can carry **two concentric white rings**. The inner one is the node's
border; the outer is its outline. Position separates them, so a node can say two
things at once without either needing a hue.

| ring | opacity | width | meaning |
|---|---|---|---|
| inner | 0.5 | 1px | it is in **your** view |
| outer | 0.8 | 1px | **they** can see it too |
| outer | 0.8 | 2px | they are **on** it |
| inner 0.5 + outer 1.0 | | 2px | **you are both on it** — the target state |

Two design decisions carried in that table:

- **Yours is the quiet ring.** You already know where you are; the ring with
  something to tell you should be the louder. This was inverted deliberately on
  2026-08-31.
- **Their centre differs from their ordinary presence in exactly one property:
  width.** Two states differing in one property read as a scale. Differing in two
  read as two unrelated marks.

The inner ring's selected width is multiplied by four rather than two, because
the two rings sit at different opacities and equal multipliers do not buy equal
visibility. The "both on it" state gets fifty per cent more again, so a rare
state is not merely one step above a common one.

**This system has had the least scrutiny of anything in the viewer**, because it
only means anything when two people are paired, and until 2026-09-06 it was only
ever seen by deliberately opting in.

### 4.3 Shape

Shapes carry real load now that state is achromatic: Conversations is an octagon
(eight things hang off it), Gateways is a circle so it reads as equal in status
to the families, Settling is a rounded triangle. The rule applied throughout:
**show only what varies** — a property true of every node distinguishes none.

### 4.4 The corner controls

Four buttons in a fixed panel directly above the canvas. Each is 44px tall — the
platform minimum touch target — and carries two lines: a role prefix over the
node's name, so the button says *where it goes*, not merely that going is
possible.

| button | prefix | what it does |
|---|---|---|
| Back | `Local:` | returns you to your previous position |
| BN | `Remote:` | **draws the route to your partner** (§5.4) |
| GN | `Common:` | cycles through the nodes you reached *by following* your partner |
| ✕ | — | clears your partner's merged view |

The GN is a record of your own choices, not of their wanderings — their trail is
already browsable in their breadcrumb strip. It **cycles rather than pops**,
because visiting a record must not destroy it.

These are DOM controls, not graph nodes. That was a redesign: a graph node has
one position and so could never be both in the graph and in a corner, and moving
them out deleted edge-stretching, a fit-feedback loop, parking geometry and
layout races at a stroke.

---

## 5. Pairing and joint browsing

### 5.1 Lifecycle

Chat is always on. A dedicated **Join / Leave** button controls pairing state and
nothing else. There is no auto-requeue when a partner leaves. One BD socket per
browser instance is enforced server-side via a device cookie, so a second tab
does not present as a second person.

Leaving is **unilateral**, and the partner's marks dim rather than vanish. A
propose-to-end model was considered and rejected as a trap.

### 5.2 What crosses the wire

When you move, your browser sends a **breadcrumb**: the node's type, name,
display name, colour, its `url`, its sequence number, whether it is a gateway or
a section title, the cluster you are filtering by, and — added later, riding on
the same message — a description of your structural view.

Your partner's server relays it to yours. Nothing is stored.

A rule learned the hard way: **a relayed message needs three sites** — the
sender, the server's forwarding whitelist, and the receiving client's whitelist.
Getting two of the three fails *silently*: the relay logs delivery, the handler
looks correct, and the mark appears on one side only.

### 5.3 Merge on demand, not live

Your partner's view is merged into yours **when you ask for it**, not
continuously. Live tracking was tried and fails, because layout churn on their
side produces constant motion on yours. Only the *structural* view is sent, or
the union grows without bound.

### 5.4 The route

Tapping the Remote button computes the shortest path to your partner's node,
reveals it, and puts an arrowhead on every hop pointing their way. The path's
rings **ramp**: faintest at the node you are leaving, brightening by an even step
at each hop until it reaches ordinary remote strength at their end. Distance
becomes something you see rather than count.

### 5.5 Consent — the part that matters for the save discussion

The current, settled position:

> **Personal saving and export are unrestricted by design. Only writing to the
> shared graph database requires the partner's agreement.**

Gating export buttons was tried and reverted: a standalone escape hatch exists,
so gating them is theatre.

A second distinction was drawn and should not be lost: **exploratory consent is
not save consent.** Agreeing to look at something together is not agreeing to
publish it. The vocabularies must stay separate, or people will press Save from
muscle memory.

---

## 6. The write paths — the state of play

This is the section the forthcoming discussion depends on.

### 6.1 Three curator controls, and they do different things

Hidden until a four-character curation code is entered:

| button | writes | to |
|---|---|---|
| **Sv** | the node's **text** | `n.text`, `n.updated_at` |
| **Wr** | the current view's **layout hints** | `hint_*_<parent>` on edges |
| **Re** | nothing — recomputes the layout | — |

**Both Sv and Wr say "saved".** They are not alternatives; they save different
things, and a curator who arranges a view and presses Sv has saved nothing they
intended. This has already caused one incident.

Sv is additionally restricted to labels `Root`, `Entry`, `Family`, `Cluster`, and
matches its target **by name**, not by `url`.

A second incident is worth carrying forward: Sv once round-tripped the *rendered*
card back into the database and silently destroyed the authoring markup —
centring directives and highlight spans — because the renderer had no inverse.
**A renderer needs its inverse written beside it.**

### 6.2 Authentication

The curation code is checked **server-side** with a constant-time comparison, at
three separate call sites. A non-empty code field *is* the whole grant, remembered
per browser.

**Authorisation must never be granted by IP.** A tunnel runs on the same host, so
every public visitor arrives from the loopback address.

### 6.3 Node creation today

Three endpoints create structure — `create-cluster`, `create-subfamily`, and a
clone operation for clusters. All are curator tools. **There is no path by which
an ordinary user creates a node.** That is the gap.

### 6.4a DECIDED — editing, agreeing and saving ship behind the curation code

**Until screening exists, the whole compose → agree → save path stays behind the
developer code**, alongside Sv / Wr / Re. Screening is the largest single
challenge in BD and it gates everything downstream of it.

Three notes on doing this well:

- **The code gates the buttons, not the database** (§6.4). For a development
  gate that is sufficient — the goal is that no visitor can stumble into an
  unscreened write, and it achieves that. It is not a security boundary, and
  should not start being described as one.
- **Build the gate as one condition, not as a mode.** A temporary restriction
  that threads itself through the UI becomes a refactor to remove. Everything
  should be built as though ungated, with a single check deciding whether the
  controls appear.
- **Testing a pair needs two browsers, each with the code entered** — the device
  cookie means two tabs are one user, and the code is remembered per browser.

### 6.4 The unguarded channel — must be faced before any of this

The socket handler ends with a fall-through: any message carrying a `query` field
is executed against the database verbatim, with no authentication and no
distinction between reads and writes.

```js
if (!msg.query) return;
const result = await session.run(msg.query, msg.params || {});
```

This is how the viewer reads the graph, so it is not gratuitous — but it means
**the curation code protects the curator's buttons, not the database.** Anything
reachable by a browser can issue arbitrary Cypher, and the site is now publicly
reachable.

Any design for user-created content has to decide whether it is layered on top of
this channel or replaces it. Adding a fourth authenticated write path while this
remains open would be decoration.

---

## 7. Speech synthesis — built and shipped

Node text is read aloud by a voice **synthesised in the browser**.

- **Engine: Piper** (a VITS model) running under onnxruntime-web. Measured at
  0.17 real-time on an iPhone — six seconds of speech per second of compute.
  Kokoro is better on a desktop and not viable on a phone.
- **Own synthesis path.** Rather than using the packaged wrapper, BD phonemises
  and builds token ids itself. This is what allows a **pronunciation lexicon in
  IPA** and control of the speaking rate, neither of which the wrapper exposes.
- **Ids are `[^, _, p₁, _, p₂, _, …, $]`** — begin marker, then each phoneme
  separated by pad, then end. Verified byte-exact against the reference
  implementation. **A symbol missing from the map is silently dropped.**
- **The offer is made on the first tap of Root**, in a dialog that takes
  responsibility for the whole thing: it ticks the box, starts the download and
  begins speaking. It is asked **every visit**, because whether you want sound
  depends on where you are — a property of the occasion, not of the person.

Four hard-won platform facts, all of which cost a diagnosis:

- **Inference is synchronous WebAssembly.** Run on the main thread it starves the
  audio element and speech drops out mid-sentence. It must run in a worker.
- **`volume` is read-only on iOS.** Ducking the music under the voice requires a
  Web Audio gain node.
- **WebKit restricts concurrent media.** One audio element, reused.
- Cross-origin isolation is *not* needed (0.21 vs 0.17 real-time) and must not be
  enabled, because it would block the module iframes.

### 7.1 Voice training

A voice can be fine-tuned from recordings. This has been done once, end to end,
on **6.2 minutes** of the author's own reading: 42 minutes of training, exported
to ONNX, loaded into BD. Judged intelligible and appropriately unhurried.

The key fact that makes it practical: **the model never sees words, only phoneme
ids derived from spelling.** So minutes of audio can read a corpus of any size,
and the corpus can grow without retraining. The corollary is a trap — where the
phonemiser *mispronounces* a word, training pairs the reader's audio with the
wrong phonemes, and those phonemes recur throughout ordinary English. This is why
literary source texts are the worst training material, not the best.

A recording rig is built into the site: hold-to-record, direct PCM capture with
all conference-call processing disabled, per-clip warnings for clipping and low
level, and resumable across sittings.

---

## 8. Speech recognition — built, used in Edit mode

Whisper (`whisper-base.en`) runs **in the browser** via transformers.js, fed by
an audio worklet. It is biased with the surrounding source text, so dictation
into an existing passage is corrected toward the vocabulary actually present.
There is an alignment layer that maps recognised words onto the existing text and
extends boundaries, so speech can *edit* rather than only append.

The interaction rules are specified separately and the module is loaded by the
viewer at start-up.

---

## 9. Media modules

Nodes can carry an embedded module — a visual one (Kolam) and two music players
(an ABC notation player and a fractal/L-system composer). Each exists twice: once
embedded in BD and once as a standalone site, with a round-trip so a script can
be taken out, edited, and brought back. Modules render into an iframe occupying
the canvas footprint, with BD supplying a shared control layout.

The music player is why speech ducks rather than stops: text may be read over
music, and the balance between them is set by lowering the music's **baseline**,
not by deepening the duck.

---

## 10. Questions the save-path design has to answer

Offered as an agenda rather than a position.

**Identity and type**
1. What *is* a user-created node — a new label, or a `TextNode` with provenance
   properties? The 84 orphans (§2.5) argue for something that cannot exist
   without a type and a `url`.
2. **There is no user provenance in the system at all**, and none is assumed.
   Viewer identity is an in-memory UUID that dies with the tab; there is no
   account, no login and no user record. As things stand the only durable trace a
   saved node could carry is its **timestamp**.
   One candidate under consideration — not a decision — is a **temporary
   per-session pen name**: something a pair chooses for the sitting, recorded on
   what they make, and meaningless afterwards. Enough to say *these two nodes came
   from the same conversation* without creating identity infrastructure. The
   question to settle is whether a node needs to be attributable at all, or only
   dated.

**Attachment**
3. What does it hang off? A user node with no edge is unreachable. If it attaches
   by `CHILD` it joins a reading spine that was authored deliberately; if by
   `CLUSTER_REL` it makes a thematic claim.
4. Does it get layout hints at creation, or does it float until someone arranges
   the view? Recall that one unhinted child degrades a whole view's layout.

**Consent and provenance**
5. Both partners must agree — but agree to *what*, exactly, and how is that
   agreement recorded on the node itself so it can be audited later?
6. Is the conversation that produced it preserved, or only the result? The
   History panel holds the cards; nothing currently persists them.

**Visibility**
7. Does a user node appear to everyone immediately, or is there a state between
   private and published? The graph has no notion of draft.
8. How is it distinguished visually? Note that **colour is not available**: hue
   and saturation already mean lineage (§4.1), and rings already mean presence.
   What *is* unclaimed is the **node body**, currently transparent at zero
   opacity, and the label's **weight or style** — italic is taken by title pages.
   A user node has no lineage to inherit a colour from, which is itself a fact
   worth expressing rather than a problem to paper over.

**Who may save — a settled position, not an open question**

9. **Saving requires both users to agree.** Establishing that the two are
   genuinely two is **deliberately not enforced**, and the reasoning is worth
   keeping because it is easy to relitigate.

   *Where things stand.* The device cookie enforces one socket per **browser
   instance**, not per person, so Safari and Chrome on one machine already present
   as two users. There is no barrier today.

   *Why a same-IP check was rejected.* It would work, and it would catch the wrong
   people. Two users in one house or one office share an address — and given what
   BD is for, **a couple on a sofa with a laptop and a phone is plausibly the most
   likely genuine pairing there is.** Meanwhile the person you are aiming at
   switches one device to mobile data and walks through it. The control breaks the
   primary use case to inconvenience a determined user for a few seconds.

   *The reframing that settles it.* The both-agree rule is an **etiquette
   mechanism, not an authorisation boundary.** Someone who defeats it alone has
   published under a pretence; they have not breached anything. And it could not
   be load-bearing security in any case while §6.4 stands, since the whole gate
   can be bypassed without pairing at all.

   *Effort as a filter.* Sustaining two devices on two networks through a
   plausible conversation is far past the point where trolling stops being
   enjoyable. **Anyone willing to do it has probably spent more care on the
   contribution than most genuine pairs will** — which makes the residual risk
   less alarming than it first appears. Screening after the fact (below) lowers
   the reward further, and being *known* to screen lowers the attempt rate more
   cheaply than any gate.

   *So: limit consequences rather than access.* Rate-limit saves per address per
   day; give user-saved nodes a pending state rather than immediate publication —
   the corpus is curated anyway, so a review step is in the grain of the system;
   and make them revertible per node, which is needed regardless for the case of a
   **genuine** pair saving something poor.

   *What the IP is still for.* Recorded at page load against the session, so a
   specific troublemaker can be **barred afterwards**. Reactive, tolerant of being
   coarse, and it does not punish the sofa. It must come from the
   `CF-Connecting-IP` header on the handshake, **never from the socket address** —
   a tunnel sits in front, so every public visitor arrives from loopback and an
   allowlist written against the socket would admit the entire internet. The
   header is absent on localhost, so any check must handle that or it locks the
   author out of his own machine. Combine with the device cookie: either alone is
   weak, together they separate "same person returned" from "same coffee shop"
   tolerably well. An address held against a session is personal data, so decide a
   retention period at design time rather than accumulating a log forever.

**Content screening — designed, promised publicly, not yet built**

10. **The plan.** Two stages: a **real-time check as text is composed**, expected
    to use the TensorFlow.js toxicity classifier, plus **checks against identity
    disclosure**; and a **later AI pass** over what was saved.

    **What exists today: nothing.** No filter, no screening, no review queue. The
    only thing in the code that touches this is a *structural* trust boundary on
    deep links — a shared payload's script is honoured for module targets and
    ignored for ordinary ones, so free text cannot be pushed into another person's
    cards through a link. That closes one injection route and inspects nothing.

    **Beware one document.** `BD_SR_Editor_Design_Notes_v0.1.md` §1.1 refers to
    "the existing toxicity and anonymity screening" as though it were built. It is
    not. That sentence describes the intended pipeline, not the system.

11. **Two design points the plan should carry.**

    *Client-side screening is advisory, not enforcement.* BD's rule that
    everything expensive runs on the client is about **presentation** — deriving
    what the reader sees. It does not extend to authorisation. A check running in
    the composer improves the writing experience and catches the careless case,
    but anything a browser decides, a browser can decline to decide; and while
    §6.4 stands, the database can be written without going near the composer at
    all. **The authoritative check has to be the server-side or review-time one.**
    Worth being explicit, or the client-only principle will be read as covering
    something it was never meant to.

    *Identity disclosure is two problems, not one.* **Deliberate or formatted**
    disclosure — an email address, a phone number, a postcode, a handle, a URL —
    is pattern-matchable, cheap and reliable, and belongs in the real-time check.
    **Accidental contextual** disclosure — naming a daughter's school beside a
    town, an employer beside a street — carries no pattern at all and needs
    semantic understanding. A small classifier will not catch it in real time.
    That case belongs to the later pass, which is an argument for the pending
    state doing real work rather than being a formality.

    Also worth costing: the toxicity model is a second download on top of the
    60 MB voice. On a phone, when each arrives matters.

    *The risk specific to BD, and probably the hard part.* Toxicity classifiers
    are trained on social-media abuse, where darkness of subject correlates with
    intent to harm. **In a contemplative corpus it does not.** BD's texts are
    about death, grief, loss, impermanence, suffering — a pair writing well, in
    exactly the register the corpus invites, will produce sentences that a
    general-purpose classifier has every reason to score highly. The failure mode
    is therefore not missed abuse; it is **a filter that rejects the best
    contributions and admits bland ones**, teaching people to write flatly to get
    past it.

    That argues for the real-time check being **advisory in tone as well as in
    authority** — flagging for the later pass rather than refusing — and for
    keeping a record of what it flagged and what a human then decided. Without
    that record there is no way to discover the filter is mis-calibrated, because
    the contributions it discourages never arrive.

12. **The landing page already promises this**, in these words:

    > *Anonymous, free, moderated. No sign-in, no tracking, no charge.
    > Contributions are moderated.*

    Two consequences. **"Contributions are moderated" becomes load-bearing the
    moment saving ships** — it is not false today only because contributions are
    impossible. And **"no tracking" sits against recording an IP at page load**
    (question 9). A short-retention abuse log is arguably not "tracking" in the
    sense a reader takes from that sentence, but that is a judgement to make
    deliberately and, if necessary, to reword — not to drift past.

**Safety**
13. The unguarded query channel (§6.4). Any authenticated write path is
    decoration until that is closed — and it is the reason the both-agree rule
    cannot be treated as security.
14. What can be undone? There is a backup on every curator write, but no
    per-node history and no delete path for user content.

**Editing together**
15. Whose text is authoritative while two people are editing? There is no
    conflict model — the current design anchors both users to one node and lets
    them wander, but does not merge simultaneous edits.
16. Does saving end the joint session, or can a pair produce several nodes? If
    several, that is an argument for the session pen name in question 2.
