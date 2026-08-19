# HowToRestore.md

**If you are Claude and this is a fresh session: read this file first, then
`MEMORY_SNAPSHOT.md`.** It explains what is backed up, why, and how to get
your project memory back if it has been lost.

---

## 1. The problem this solves

Claude Code keeps per-project memory as one Markdown file per fact, in

```
~/.claude/projects/-Users-williamstewart2-butterflydreaming-graphviewer1/memory/
```

`MEMORY.md` in that directory is the **index**, and it is loaded into context
automatically at the start of every session whose working directory is this
repo. That is what makes a new session already know about the dock-slot layout,
the canary rotation, the TDZ traps, and so on.

**That directory is outside this repo.** It is not in git, `git push` never
touched it, and no amount of committing code backed it up. A new machine, a
wiped `~/.claude`, or a corrupted profile and roughly four months of accumulated
project knowledge would be gone — knowledge that is genuinely hard to
reconstruct, because most of it is *why* decisions were made, not *what* the
code does. The code is self-documenting; the reasoning is not.

Established 2026-08-19 after the user asked the right question: *"is there a .md
memory file from which you can reconstruct your memory in case I have to start a
new session again?"*

## 2. What now exists

| File | What it is |
|---|---|
| `MEMORY_SNAPSHOT.md` | Every memory file, verbatim, each in its own `## FILE:` section with frontmatter intact. This is the backup. |
| `sync_memory_snapshot.sh` | Regenerates the snapshot. `--check` exits 1 if it is stale. |
| `.claude/settings.json` | A `Stop` hook runs the sync script at the end of every session, so the snapshot keeps itself current. **Not in git — `.gitignore` line 4 ignores `.claude/`. Recreate it by hand after a restore; the exact JSON is in §4.** |
| `HowToRestore.md` | This file. |

The first two and this file are committed and pushed, so they survive anything
the local machine does. The hook is the exception — see §4.

## 3. Restoring, step by step

1. Clone the repo (`github.com/wrcstewart/butterflydreaming-graphviewer1`).
2. Create the memory directory. On a machine with a different username or
   checkout path, the directory name changes — it is the absolute working
   directory with `/` replaced by `-`. Start a session in the repo and check
   the system prompt, or look for the sibling directories under
   `~/.claude/projects/`.
3. For each `## FILE: <name>` section in `MEMORY_SNAPSHOT.md`, write the fenced
   contents to `<name>` in that directory — frontmatter included, starting at
   the `---` line. **`MEMORY.md` must be restored too**; it is the index, and
   without it the individual memories are never surfaced.
4. Start a session in this repo. The index loads automatically. Spot-check by
   asking about something only memory would know — the canary colour rotation,
   say, or why `min_pentatonic` is the canonical scale name.

If only *some* memory is lost, restore only the missing sections. The live files
are the source of truth; the snapshot is a mirror, so never edit the snapshot
and expect it to propagate — it is overwritten on the next sync.

## 4. Keeping it current

The `Stop` hook in `.claude/settings.json` runs `./sync_memory_snapshot.sh` when
a session ends. It is deliberately silent and non-blocking: it redirects output,
ends in `|| true`, and exits 0 if it cannot find the repo, so a broken snapshot
can never interrupt or fail a session.

**`.claude/` is gitignored (`.gitignore` line 4), so the hook is NOT restored by
cloning.** Recreate it after a restore by merging this into
`.claude/settings.json` — keep whatever `permissions` block is already there:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" 2>/dev/null || cd \"$(git rev-parse --show-toplevel 2>/dev/null)\" || exit 0; ./sync_memory_snapshot.sh >/dev/null 2>&1 || true",
            "timeout": 30,
            "statusMessage": "Syncing memory snapshot"
          }
        ]
      }
    ]
  }
}
```

Until it is recreated, run `./sync_memory_snapshot.sh` by hand — losing the hook
costs freshness, not the backup itself.

To check by hand: `./sync_memory_snapshot.sh --check` (exit 1 = stale).
To force: `./sync_memory_snapshot.sh`.

**The snapshot is only as good as its last commit.** The hook regenerates the
file; it does not commit it. Commit `MEMORY_SNAPSHOT.md` along with the rest of
the work — it will usually show up in `git status` after a session where
memories changed.

## 5. What else is worth reading, in order

For a new session that wants the project's reasoning rather than its code:

1. `MEMORY.md` (loaded automatically) — the index; every line is a pointer.
2. `session_notes_2026-08-19.md` and `session_notes_2026-08-16_17.md` — recent
   narrative, including the traps that cost real time.
3. `music_player_layout_spec.md` — the media-module layout, the two-copy
   divergence between BD-embedded and standalone, and §9a's list of things that
   bite when porting a module.
4. `BackupNotes.md` — the *database* backup story, which is a separate concern
   from this file (that one protects the graph; this one protects the memory).

## 6. One warning about the repo layout

This project spans **four** repositories:

- `butterflydreaming_graphviewer1` (this one — BD itself)
- `bd_M_ABC`, `bd_M_Fractal`, `bd_V_Kolam` (standalone modules)

Work regularly happens in one and not the others, so **"what did we do?" must be
answered by checking all four git logs plus the memory-file mtimes**, never by
reading this repo's log alone. On 2026-08-18 an entire evening's work looked lost
for exactly that reason: BD's log stopped at 13:51 while the real work continued
in `bd_M_ABC` until 20:56.
