# BackupNotes.md — everything you need if you ever have to restore

This file documents **all** backup mechanisms in ButterflyDreaming, plus the exact commands to reverse anything that went wrong.

## TL;DR — safe by default

Every DB-mutating `bd_tool.js` subcommand now snapshots both the DB and the source `.md` **before** it writes. Snapshots land in `./backups/` at the repo root, timestamped and tagged with the subcommand name.

**You don't have to do anything.** If you break something, the backup is already there.

To opt out (rare — e.g. inside a tight scripted loop), pass `--no-backup`.
To do a dry-run instead (no writes at all), pass `--dry-run`.

---

## What triggers a pre-flight backup

| Subcommand | Backs up DB? | Backs up source .md? | Skipped when… |
|---|---|---|---|
| `bd_tool.js write <patch.md>` | ✅ | ✅ (`<patch.md>`) | `--dry-run`, `--no-backup`, or no block has `@flag update_this: true` |
| `bd_tool.js sync-helpers <helpers.md>` | ✅ | ✅ (`<helpers.md>`) | `--dry-run`, `--no-backup`, or nothing in the file is flagged for update |
| `bd_tool.js apply-subfamily-labels <candidates.md>` | ✅ | ✅ (`<candidates.md>`) | `--dry-run`, `--no-backup`, or no block has `@flag is_subfamily: true` |
| `bd_tool.js backfill-urls` | ✅ | — (no source .md) | `--dry-run`, `--no-backup`, or nothing needs a URL |
| `bd_tool.js cypher <query>` | ❌ | — | (intentional low-level tool — you own the safety) |
| `bd_tool.js dump-nav-nodes` etc. | ❌ | — | read-only |
| Curator page (`curator.html`) writes via `/api/save-cluster-parents`, `/api/save-subfamily-parents`, `/api/create-subfamily`, `/api/create-cluster` | ❌ | ❌ | (no auto-backup — snapshot manually before big sessions with `bd_tool.js backup`) |

## Where backups live

```
./backups/
  memgraph_2026-07-16_143536.cypher     ← manual `backup` command (older, un-tagged)
  memgraph_write_2026-07-23_101701.cypher     ← auto: pre-flight for `write`
  nav_scratch.md.write_2026-07-23_101701.bak  ← auto: .md snapshot for same call
  memgraph_apply-subfamily-labels_2026-07-23_112010.cypher
  subfamily_candidates.md.apply-subfamily-labels_2026-07-23_112010.bak
  ...
```

Naming: `<original>.<tag>_<YYYY-MM-DD_HHMMSS>.<ext>`

- **Tag** = subcommand name that fired the backup (`write`, `sync-helpers`, `backfill-urls`, `apply-subfamily-labels`) — a directory listing tells you what caused each snapshot.
- **Stamp** = local-time seconds resolution, sortable, filesystem-safe (no colons).

DB dumps are typically **~800 KB** each — plaintext Cypher, one statement per line, gzip-friendly if the directory ever gets big.

## Manual backup — always available

```bash
node bd_tool.js backup                          # writes to backups/memgraph_<stamp>.cypher
node bd_tool.js backup /path/to/custom.cypher   # or explicit path
```

Do this **before any big session** — curator re-parenting binge, mass edits via the .md, structural label migrations. Cheap insurance.

## Pruning old backups

Not automatic. Prune manually when the directory gets unwieldy:

```bash
ls -lt backups/ | tail -N        # see the N oldest
rm backups/memgraph_write_2026-07-16_*.cypher   # or by pattern / date
```

Rough rule: keep at least the 10 most recent auto-backups, and any manual `backup` you took before a milestone.

---

## RESTORE PROCEDURES

### 1. Undo a bad `bd_tool.js write` (text was overwritten)

The `.md` snapshot preserved the flag-and-content state at the moment of the write. **Restore in two steps**:

```bash
# a) Restore the source .md to its pre-write state
cp backups/nav_nodes_text.md.write_2026-07-23_101701.bak nav_nodes_text.md

# b) Restore the DB to its pre-write state — see section 3 for the full DB restore
#    (the .md alone is often enough IF you just want to re-edit and try again;
#     the DB rollback is needed only if the write applied wrong content).
```

If the write applied genuinely wrong text and you want the OLD text back in the DB, either:
- Roll back the whole DB (section 3), or
- Re-run `write` with the OLD text: edit `nav_nodes_text.md` to contain the desired text under `@set text:`, flip `@flag update_this: true`, run `node bd_tool.js write nav_nodes_text.md`. Idempotent — DB will be updated to whatever the .md says.

### 2. Undo a bad `apply-subfamily-labels` run

The labels get set with `SET n:SubFamily`. To reverse a specific batch:

```bash
# The `.bak` .md file shows which blocks were flagged true when the pass ran
# — those are the nodes that got :SubFamily.
grep -B4 "^@flag is_subfamily: true$" backups/subfamily_candidates.md.apply-subfamily-labels_2026-07-23_112010.bak \
  | grep "^@match url:" \
  | sed 's/^@match url: //'
# → list of URLs that got the label. Remove the label:
```

Then in `mgconsole`:
```cypher
MATCH (n:SubFamily) WHERE n.url IN ['url1', 'url2', ...] REMOVE n:SubFamily;
```

Or fully roll back the DB (section 3).

### 3. Full DB restore from a `memgraph_<...>.cypher` dump

This is the nuclear option — drops the entire database and replays the snapshot. **Do this only when you've decided you want the DB exactly as it was at snapshot time.**

**Stop the BD server first** so nothing writes during the restore:

```bash
pkill -f "node server.js"
```

Then in `mgconsole` (or the Memgraph Lab query editor):

```cypher
-- Wipe current data. STORAGE MODE matters if the DB is in analytical mode.
MATCH (n) DETACH DELETE n;
-- Then replay the dump:
```

Feed the `.cypher` file to mgconsole:

```bash
mgconsole --host 127.0.0.1 --port 7687 --username memgraph --password memgraph < backups/memgraph_write_2026-07-23_101701.cypher
```

Or if `mgconsole` isn't in your `PATH`, use the Memgraph Lab UI's "Import" or paste the file's contents into the query editor. The dump is plain Cypher `CREATE (...);` and `CREATE (a)-[:REL]->(b);` statements, replayable in any order.

Restart the server after restore:

```bash
node server.js > /tmp/bd_server_log.txt 2>&1 &
```

Verify via `bd_tool.js labels` that node counts look right.

### 4. Reverse a curator page save (Cluster or SubFamily edit)

The curator page doesn't auto-backup. Two options:

- **If you snapshotted the DB manually before the session** (`bd_tool.js backup`), restore per section 3.
- **If not, and the change is small enough to reproduce**, open the curator, re-select the node, edit weights back to their previous values, Save. The `parents:` line in `nav_nodes_text.md` (if you dumped it recently) is a fair reconstruction hint.

**Habit worth forming:** run `node bd_tool.js backup` before opening the curator for a heavy re-parenting session.

### 5. Reverse a Cluster or SubFamily delete

Curator deletes (zero-weight save) fire `DETACH DELETE` — the node and all its edges are gone. Only a full DB restore (section 3) brings it back. Since the auto-backup only runs from `bd_tool.js` subcommands, a curator-triggered delete has NO safety net **unless you ran `bd_tool.js backup` beforehand**.

---

## Backup coverage matrix

| Failure mode | Auto-backed-up? | How to recover |
|---|---|---|
| `bd_tool.js write` set wrong text | ✅ | `.bak` .md + optional DB restore |
| `bd_tool.js sync-helpers` broke a helper card | ✅ | `.bak` helpers.md + optional DB restore |
| `bd_tool.js apply-subfamily-labels` labelled wrong nodes | ✅ | List URLs from `.bak`, run `REMOVE n:SubFamily` |
| `bd_tool.js backfill-urls` assigned URL to wrong node | ✅ | DB restore (URLs don't have a source .md to undo from) |
| `bd_tool.js cypher` ran destructive query | ❌ | Manual DB backup only — you own this one |
| Curator: bad weight save | ❌ | Manual DB backup, or re-edit in curator |
| Curator: accidental Cluster/SubFamily delete | ❌ | Manual DB backup only |

---

## Related

- The `feedback_backup_safety` memory (in `.claude/…/memory/`) records the user preference behind this whole system.
- The `bd-tool-and-helper-messages` memory covers the wider `bd_tool.js` CLI.
- Historical: Memgraph backups exist from 2026-07-16 onward (before auto-backup landed, manual `bd_tool.js backup` was already the pattern for milestones).
