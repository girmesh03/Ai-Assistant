# Phase 4 — Case-Driven Fix Log

Planning working file for the case-driven stabilization of **Phase 4 (chat UI)** on
branch `phase-4-chat-ui`. Every case is analyzed, recorded here, and applied here;
nothing else is closed until Phase 4 is green.

## Working agreement (user, 2026-08-29)

The current Phase 4 has too many issues to fix in one pass. So: **commit, push, but
do NOT merge**, then fix case by case.

- **Step 1** — User brings one or more cases (symptom/observation).
- **Step 2** — Deep analysis to find the solution (plan mode).
- **Step 3** — Note the analysis down in the planning working files, then apply the
  solution (build mode).
- **Step 4** — Ask the user for review. Based on feedback: go back to Step 1, or
  prepare for a new case.

### Strict requirements

1. **Do not override the existing plan** (`task_plan.md` stays untouched).
2. **Only commit when the user asks to commit.**
3. **Everything happens on `phase-4-chat-ui` (the current branch).**
4. **Everything must be traceable/knowable in the planning working files** —
   this log, `findings.md`, and `progress.md`.
5. **Move to the next phase only when Phase 4 is green.**

## Known open items (carried in from the first commit)

- Browser confirmation of the store-backed reload fix (new chat, send from empty
  state, preset apply/remove, model/reasoning change, delete, edit→regenerate).
- STT: mic-red → stops with nothing — recorder hardening + empty-transcript toast
  applied; the exact remaining cause (empty blob vs. empty transcript vs. plumbing)
  to be confirmed in-browser via the `[stt]` log + Network tab.
- Any remaining console warnings / runtime errors the user reports.

## Cases

<!-- One entry per case, newest on top. Template:
### Case N — short title
- **Reported:** <date> — <user observation>
- **Root cause:** <analysis>
- **Fix:** <files changed + what>
- **Verification:** <how verified>
- **Review:** <user verdict/status>
-->