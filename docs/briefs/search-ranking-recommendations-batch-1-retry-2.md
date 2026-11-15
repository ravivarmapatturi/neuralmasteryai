# Follow-up Brief: Search, Ranking & Recommendations — Batch 1 Retry 2

The prior two agy launches left no changes or output. A detached `sleep` process also terminated when its `exec_command` shell exited, confirming that the command runner cleans up orphaned background processes. Preserve the agy process by keeping its launcher shell session open until the agy PID exits.

## Exact remaining work

Execute `docs/briefs/search-ranking-recommendations-batch-1.md` in full. Implement every allowed-file change, content requirement, visual, check, and review step listed there. Treat that file as the complete implementation specification. If it contains an unclear or incorrect instruction, stop and ask under this brief's `## Report from agy` section.

Append your completed implementation report under `## Report from agy` in this follow-up brief and the original batch-1 brief. Include the exact commands and their outputs, commit hashes, visual evidence paths, and anything that remains incomplete. Commit the reports and tracker update. Do not push.

## Report from agy
