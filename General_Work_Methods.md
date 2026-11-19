# General work methods

**Written 2026-11-19.** These are the routines used on ButterflyDreaming (BD).
It is written for any new project carried on alongside BD, starting with Welsh
learning. Put a copy at the root of the new project's repository. In the
project's `CLAUDE.md` (the file Claude Code reads at the start of every session),
add the line *"Follow General_Work_Methods.md"*. These routines then apply from
the first session, without having to be restated.

The routines exist for three reasons:
- the author works across long stretches of time;
- a Claude session can lose its memory of the conversation part way through,
  when the context is compacted or when a new session starts;
- the browser, especially iOS Safari, often shows an old copy of a page.

Every routine below protects against one of these.

---

## 1. Git: commit often, push every time

- **Push straight after every commit**, in the same step, without asking. The
  author takes it that what is committed is on GitHub. Once, 45 unpushed commits
  were found.
- **Stage files by name.** Never use `git add -A` or `git add .`. A repository
  usually holds large untracked working files. One `add -A` in BD pushed 127 MB
  of audio. Run `git status --short` and read it before any broad commit.
- **Commit one coherent change at a time.** The message says:
  - what changed;
  - why;
  - how it was verified;
  - the current canary (see §2).

  A future session reads `git log` to reconstruct what happened, so the message
  is part of the notes.
- **Commit only when asked**, or when a task the author set has reached a
  natural stopping point and the routine is already agreed.
- **Don't commit other people's files.** Leave alone untracked files the author
  made, such as personal notes and editor folders, and say that they were left
  alone.
- **Read the push output.** A size warning or a rejected push can be printed
  just above a line that looks like success. Check that the change actually
  happened, not just the exit code.

## 2. The canary: knowing which version is on screen

**The problem.** Safari and the Cloudflare tunnel (the link between the public
internet and the home server) both cache pages. They often show the author an
old copy of a page after a change. Without a marker, "it's not working" could
mean a real bug or just a stale copy, and neither of us can tell which.

**The routine:**
- **Paint the canary.** Pick one always-visible element (a button border, a
  thin bar) and paint it in a colour that rotates **red → green → blue → red…**
  on every change that needs a reload.
  - The colours are `#c0392b` (red), `#27ae60` (green) and `#2980b9` (blue).
    They differ in brightness as well as hue, which matters for reduced colour
    vision.
  - A repeated colour means the same version, so a cache problem.
- **Give each build a stamp**, such as `2026-11-19a`. The letter advances
  within a day.
  - Put the stamp in the cache-busting query strings (`style.css?v=2026-11-19a`)
    and in a constant in the script.
  - At startup the page logs the build it expected and the build it actually
    loaded. If the stylesheet and the script disagree, the log says so.
- **Rotate every site together.** When one change touches several parts that a
  browser loads separately (the main page, embedded modules), all the canaries
  move together. Keep a list of the canary sites in the notes. Do the rotation
  with a small script that checks how many times each string is replaced, so a
  missed site fails loudly.
- **End every reply that changed code with the canary line**, and put nothing
  after it. For example:
  > Current canary: **green**, build 2026-11-19a (main page · modules, all in step)

  The author reads it before switching to the browser, so they know what to
  look for.
- **A notes-only change does not move the canary.** Say so in that line
  ("unchanged, notes only").
- **Say "reload"** whenever a change only shows after a reload, including data
  that is loaded once at startup.

## 3. Notes for continuity

A session can lose the conversation at any moment. Everything needed to carry
on must be written into the repository, not left in the chat.

**The files:**
- **`CONTINUATION.md`, the entry point.** This is the first thing a new session
  reads. It holds a short dated section for each working period:
  - what was built;
  - the author's verdict, in their own words;
  - what is still open;
  - which detailed notes file to read next.

  Don't copy changing values into it, like the current build or version. Say
  where to look them up instead, or the copy will go out of date.
- **Topic notes**, one per piece of work (in BD, `Lorenz_Notes.md` and
  `UserJourney_Notes.md`). Each holds:
  - **The author's request, quoted.** Their words settle later arguments about
    what was asked for.
  - **What was built**, and the reasons for the choices made.
  - **What was measured or tested**, with the actual figures, and how to repeat
    the test.
  - **What was not done**, or not measured.
  - **A table of commits.**
- **`DOCS_INDEX.md`**: one line per document saying what it *is*.
- **`PLANNING_REGISTER.md`**: for each design, how far it is *built*, checked
  against the code rather than the document's own status line. It ends with
  every unbuilt item in one table. Read it when choosing what to do next.
- **Claude's memory files** are kept outside the repository, under `~/.claude/`.
  They hold short lessons and rules that apply across sessions.
  - Copy them into the repository with a script, as BD does with
    `sync_memory_snapshot.sh` → `MEMORY_SNAPSHOT.md`, so a lost machine doesn't
    lose them.
  - In the memory index, record the date and **what turned out to be wrong**,
    as well as what is right.

**When to write:**
- at the end of each piece of work;
- when the author gives a verdict ("Its good");
- whenever the author says *"bring everything up to date"*, which means all of
  the files above, then commit and push.

**Node or page text is content, not a changelog.** Development notes go in the
notes files and in code comments, never in text that a learner reads.

## 4. Safety around stored data

- **Back up before any write to a database or stored content.** In BD every tool
  that writes takes a full dump into `backups/` first.
  - Note that `backups/` is not tracked by git. Never leave a document there.
- **Don't restart the server, or anything the author is using, while they are
  working**, unless they have given permission for that day. One failed save
  that still reported "saved" came from a restart during authoring.
- **A save that saved nothing must never report success.** Check what was
  written, not just that the write returned without an error.

## 5. How we work together

- **Measure, don't guess.** When something is wrong, read the real value: a log
  line, a measurement in the browser, a probe page.
  - BD forwards the browser's console to a server log file, so a test run can be
    read afterwards.
  - After two theories have failed, take a measurement before offering a third.
- **Test in the real app before calling a change done**, and report what was
  measured. If a test could not be run, say so.
- **Define every term the first time it's used**, in chat as well as in
  documents. That includes jargon from graphics, audio, programming or
  linguistics. The author has asked for this repeatedly.
- **The author has reduced colour vision.** Never rely on hue alone. Use
  differences in brightness, line thickness, shape or labels.
- **The author's memory of a feature working is evidence.** If they say
  something used to work, search the git history (`git log -S`) before
  doubting it.
- **Give a recommendation, not a survey of options.** Ask only when the choice
  is genuinely the author's.

---

## Starting the new project: a checklist for the first session

1. `git init`, create the GitHub repository, and push the first commit.
2. Add this file and a `CLAUDE.md` that points to it.
3. Create `CONTINUATION.md` with a first dated section saying what the project
   is for.
4. If the project has a web page: choose the canary element, add the build
   stamp and the startup check, and write down where the canary sites are.
5. If it stores data, such as vocabulary or progress: add a backup step before
   the first tool that writes.
6. Set up the memory snapshot script for the new project's memory folder.
