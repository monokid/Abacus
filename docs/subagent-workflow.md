# Subagent Workflow

Subagents should make Abacus cleaner, not more fragmented.

## Principle

The main thread owns product direction, architecture, and integration. Subagents take
narrow assignments with clear outputs.

## Good Subagent Uses

Explorer agents:

- Compare one old feature against the new implementation.
- Extract acceptance criteria from the Electron reference.
- Inspect one legacy attempt and summarize salvageable pieces.
- Review a narrow risk, such as input stability or backup path handling.

Worker agents:

- Port one isolated core module plus tests.
- Build one UI component with an explicit file ownership boundary.
- Write one test suite.
- Create one documentation page.

Verifier agents:

- Run fast checks and summarize evidence.
- Run smoke tests.
- Review a finished milestone against acceptance criteria.
- Look for regressions without editing files.

## Avoid

- "Build the app" as a subagent task.
- Multiple workers editing the same files.
- Letting agents make product decisions independently.
- Treating subagent output as automatically correct.
- Skipping integration review.

## Default Pattern Per Milestone

1. Main thread defines the acceptance criteria.
2. Explorer agent checks old references for hidden requirements.
3. Main thread implements or delegates isolated pieces.
4. Verifier agent checks the result without editing.
5. Main thread integrates, fixes, and summarizes.

## Fixed Roles

Use fewer, clearer agents. The default standing roles are:

- Product owner: main thread. Keeps the app calm, Dutch, father-friendly, and aligned with the milestone.
- Builder: main thread or one worker. Owns the code change and does not mix unrelated refactors into the pass.
- Dad tester: verifier. Checks whether navigation, typing, tabbing, and recovery feel obvious for a non-technical user.
- Visual tester: verifier. Checks screenshots in light and dark mode for alignment, clipped text, spacing, contrast, and theme leaks.
- Data tester: explorer or verifier. Checks Excel-like rules, recurring labels, demo data, and out-of-bounds sample habits.

Do not add more agents unless there is a separate, named question. More agents are only useful when their roles do not overlap.

## Required Visual Coverage

Every visual or menu pass must include:

- Light and dark mode.
- Jaarblad, Overzicht, Inzichten, Beheer, Instellingen, Veiligheid.
- At least one wide desktop viewport and one small-laptop viewport.
- A screenshot review before handoff.
- A check that menu tables do not keep light backgrounds in dark mode.

## Verification Rule

Every coding milestone should end with fast verification.

Heavy checks should run when they match the risk:

- Native-input smoke test after input behavior changes.
- Scoped-update test after render/state changes.
- Backup/recovery tests after persistence changes.
- Security scan before public release hardening.
