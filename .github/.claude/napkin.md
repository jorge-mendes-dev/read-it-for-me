# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-03-18] Make focused edits and preserve repo conventions**
   Do instead: keep changes minimal, follow existing patterns, and validate only the parts affected by the task.

## Shell & Command Reliability
1. **[2026-03-18] Local app startup lives in `scripts/local.sh`**
   Do instead: keep environment exports centralized there and branch behavior with explicit script arguments instead of duplicating startup scripts.

## Domain Behavior Guardrails
1. **[2026-03-18] Use the Festo UI platform conventions for app changes**
   Do instead: prefer the UI library, existing Zustand selector pattern, and Vite-based workflows already defined in the repo.

## User Directives
1. **[2026-03-18] Keep explanations concise and action-oriented**
   Do instead: state the change, the impact, and any exact invocation needed without extra narration.
