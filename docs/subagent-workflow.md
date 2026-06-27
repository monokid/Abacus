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

## Verification Rule

Every coding milestone should end with fast verification.

Heavy checks should run when they match the risk:

- Native-input smoke test after input behavior changes.
- Scoped-update test after render/state changes.
- Backup/recovery tests after persistence changes.
- Security scan before public release hardening.

