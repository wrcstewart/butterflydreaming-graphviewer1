# Continuation note — 2026-09-08, updated 2026-09-12

**Read this first if context has been lost.** It says where the work is, what
state it is in, and which document answers which question.

Written before a period away from the machine, so it assumes nothing is
remembered.

---

## 1. Where the work is

**Branch `remote-graph-view`.** `main` is untouched and 226 commits behind; it is
still the stable viewer.

    git branch --show-current      # expect: remote-graph-view
    git log -1 --oneline           # expect: 947e4a2 or later (17 commits past 1f58147)

Everything below is on that branch and pushed. Merging to `main` is a deliberate
act still to be taken — see §5.

**To bring the site back up after a restart:**

    cd ~/butterflydreaming_graphviewer1
    node server.js                 # or: nohup node server.js > /private/tmp/bd_server.log 2>&1 &

Local `http://localhost:8080/`, public `https://graph.virtualfictions.uk/` via a
long-running `cloudflared` tunnel. **Client console output is forwarded to
`/private/tmp/bd_server.log`** — that log is the primary diagnostic and has
settled arguments that days of reasoning did not.

Current served versions: `viewer.js?v=798`, `style.css?v=480`, canary **green**.

---

## 1a. What has happened since this note was written (2026-09-12)

One day's work, all on `remote-graph-view`, all pushed. **Nothing in the
sections below was invalidated** — this is additive.

**Deep-link sizing was investigated and documented.** New reference:
`DeepLinking.md`, which opens with a START HERE summary. The finding: links are
~686 chars and Apple's data detector (Notes, Messages, Stickies) silently
truncates plain-text URLs over **659**, dropping the payload so the module
opens `DEFAULT_SCRIPT`. **Email and the address bar are unaffected.** It broke
on 2026-07-17 when the `name` field joined the payload and took the URL from
654 to 686 — it had been sitting 5 chars under the ceiling.

**Two changes were built, shipped and then REVERTED at the user's request:**
moving the payload to `#data=`, and copying a rich `<a href>` clipboard
flavour. The system is back to `?data=` and plain-text copy. Receivers still
accept `#data=` and a `hashchange` reload remains — inert, kept so links copied
on 09-11 still resolve. **Do not re-investigate the fragment or a supposed
newline**; both were measured and excluded, and `DeepLinking.md` has a
dead-ends list.

**Still live from this work:** the ~8 KB request-line limit means a 3-node
collage (8,276 chars) would fail **on a button press**. That is the real
blocker for the collage module, not sharing. The **JSP** design (positional
parameter arrays — a 3-node collage of saved nodes is 87 chars) is recorded in
`DeepLinking.md` and `PLANNING_REGISTER.md`.

**Housekeeping done the same day:** `MEMORY.md` had reached 29 KB against a
~24 KB load limit and was being truncated, so entries past the cut were
invisible to new sessions — trimmed to 15 KB by moving detail into the topic
files, nothing deleted (pre-trim state at `398a508`). `DOCS_INDEX.md` was
rewritten as past/present/future with 19 missing documents added, and
`PLANNING_REGISTER.md` updated with eight designs and two corrected statuses.

---

## 2. Start here, in this order

0. **`BD_SYSTEM_OVERVIEW.md`** — the master description of the system as built.
   Data model with live counts, views, the ring ladder, pairing, every write
   path, speech, and the open design questions. Written to be readable without
   the repo. **If you read one document, read this one.**
1. **`DOCS_INDEX.md`** — what every other .md in the repo is for.
2. **`PLANNING_REGISTER.md`** — how far each design is actually built.
3. **`MEMORY_SNAPSHOT.md`** — mirror of the out-of-git memory directory, written
   by `sync_memory_snapshot.sh` via a Stop hook. Never hand-edit it.

---

## 3. What changed in the last three days

**2026-09-06 — the speech offer, and the first voice fine-tune.**

- The speech dialog is asked **every visit** and is **identical every time**.
  Nothing about the answer is remembered. A short form for returning readers was
  built and reverted the same day, on the author's call: the variation cost two
  flags, a branch, a CSS rule and a real question about which flag the download
  warning should key on. `bd_speak` and `bd_speak_explained` are retired and
  cleared at boot; only `bd_speak_dl` survives, and only for the checkbox path.
- **A voice was fine-tuned end to end** from 6.2 minutes of the author's own
  reading — 42 minutes of training, exported to ONNX, loaded, and judged
  intelligible. Everything about it, including seven toolchain breakages and a
  re-runnable command block, is in **`voice_training_pipeline.md`**.

**2026-09-07 — the overview, and a cascade bug.**

- `BD_SYSTEM_OVERVIEW.md` written and then corrected several times against the
  author's knowledge: colour did **not** go away with the achromatic model, the
  audience model is settled, and the SC problem got its own section.
- The radio strip was left-aligned to the panel edge. **It first moved the wrong
  way**, because a media override placed earlier in the stylesheet loses to the
  base rule at every width — a media query carries no extra specificity. Fixed by
  moving it below the rule it overrides.

**2026-09-08 — pairing closed to the public.**

- **Pairing now requires a code, on the client and on the server, for both the
  waiter and the arriver.** BD is publicly reachable with no content screening,
  so it is not fit for public pairing.
- **Pairing has its own code, separate from curation.** Both live in the
  gitignored `config.js`. The curation code is also accepted for pairing, since a
  curator holds strictly more authority; the reverse is not true.
- A **development notice** appears on the first click on Root, before the speech
  offer. It explains that pairing is closed, carries the code field, and invites
  a request by email. **Delete it outright when it stops being true.**

---

## 4. The state of the collaborative work

Everything downstream of composing is **behind the code** until content screening
exists. That is a decision, recorded in `BD_SYSTEM_OVERVIEW.md` §6.4a.

**The next design conversation** is what data is written when a user saves a node
they created, and how joint editing should work. The author is holding that
conversation elsewhere and will bring conclusions back. §12 of the overview is
the agenda; §10 and §11 are the harder ground beneath it.

Two positions already settled, so do not reopen them:

- **Self-pairing is not prevented.** A same-IP check would break the most likely
  genuine pairing — two people in one house — while a determined user switches to
  mobile data and walks through it. The both-agree rule is etiquette, not an
  authorisation boundary. Limit consequences, not access.
- **BD is not written for children, but children are first-class citizens**, as
  are other vulnerable readers. Two child-protection advisors will review once
  content, screening and saving are built.

---

## 5. What is unfinished

| item | note |
|---|---|
| **Content screening** | The largest single challenge. TF.js toxicity plus identity-disclosure checks, then a later AI pass. **Nothing is built.** |
| **User-created nodes** | No node type, no write path, no provenance. The subject of the next conversation. |
| **The unguarded query channel** | `server.js` runs any Cypher a client sends. Any authenticated write path is decoration until this is faced. |
| **Merge to `main`** | 226 commits. A deliberate act, kept separate from the visual default flip. |
| **`BD_GRACE_MS`** | Still 5000, a development value. 65000 before real use. |
| **Recording the author's wife** | Planned within ~2 weeks. See `voice_training_pipeline.md` §7 — the espeak trap on contemplative vocabulary is the thing to check first. |

---

## 6. What exists ONLY on this machine

Nothing here is in git, deliberately — the repository is public and a voice is
personal data.

| path | size | if lost |
|---|---|---|
| `voice_dataset/` | 34 MB | recordings. Covered by Time Machine, and the first set was a disposable rehearsal anyway |
| `voices/` | 121 MB | rebuildable from the recordings |
| `~/bd_voice_train/` | 5.7 GB | rebuildable; the venv and base checkpoint are downloads |
| `config.js` | — | holds `CURATION_CODE` and `PAIR_CODE` |
| `backups/` | 71 files | DB dumps from curator writes |

The machine is covered by Time Machine, so none of this is at real risk. The
ordering still holds if it ever matters: everything else can be regenerated from
`voice_dataset/`, and `voice_dataset/` can only be regenerated by recording it
again. **That becomes worth minding when the real hour-long set is recorded** —
a rehearsal can be redone in forty minutes; a session with someone else's time in
it cannot.

---

## 7. Traps that have cost real time

- **Never `git add -A`.** The repo root permanently holds ~127 MB of untracked
  mp3s and ingest files. Stage by name.
- **Verify the effect, not the exit code** — and for CSS, verify what *wins*, not
  what is served. A rule being present says nothing about whether it applies.
- **A relayed message needs three sites**: sender, server whitelist, receiving
  client whitelist. Two of three fails silently.
- **Anchor scripted edits on constant names**, never on a paragraph of prose.
  Long anchors drift, the script raises, and an `&&` chain commits anyway.
- **Sv saves text, Wr saves layout**, and both say "saved".
- **Never grant authorisation by IP address** — the tunnel makes every public
  visitor arrive from loopback. The real address is in `CF-Connecting-IP`.
