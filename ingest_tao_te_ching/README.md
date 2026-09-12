# Tao Te Ching ingest — tagging notes

Per-chapter tagging notes for the Tao Te Ching ingest: source translation
(McDonald 1996), preparation date, chapter text, `CHILD` weights and cluster
assignments with their colours. Prepared May 2026, tracked 2026-09-12.

**This is provenance, not a specification.** It records the decisions behind the
corpus — which cluster a chapter was assigned to and with what weight — which
cannot be reconstructed from the database alone.

The cypher that was generated from these notes is `../TaoTeChing11_81.cypher`
at the repo root.

**Note on the source files.** These arrived as a browser download directory
named `files (3)/`, alongside 14 `ttc_chapters_*.cypher` fragments. Those
fragments are a **verified exact duplicate** of `TaoTeChing11_81.cypher` —
4,750 lines each way, with every fragment's content present in the consolidated
file — so only the consolidated version is tracked. The fragments were left in
place, untracked, for deletion at the author's discretion.

See `du_fu_plan.md` for the repeatable ingest pattern this fed into.
