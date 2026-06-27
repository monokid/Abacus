# Source Inventory

## Best Behavioral Reference

Location:

Legacy Codex export outside this repository.

Use for:

- Functional behavior.
- Existing Electron delivery shape.
- Handoff docs.
- Visual references.
- Assets.
- Smoke test patterns.

Risks:

- Monolithic renderer.
- Large CSS file.
- Should not be extended directly.

Decision:

Use as the oracle/reference, not as the new codebase.

## Svelte/TypeScript Rebuild Attempt

Location:

Legacy rebuild attempt outside this repository.

Use for:

- Handoff docs.
- Git history salvage.
- Core logic examples.
- Host boundary examples.
- Test ideas.

Risks:

- Current working tree has deleted `src/` and `tests/`.
- UI was incomplete.
- Some state logic may violate scoped-update goals.
- Encoding damage in some docs.

Decision:

Salvage selectively from Git history. Do not use as the new base.

## .NET/Blazor Hybrid Attempt

Location:

Legacy .NET/Blazor Hybrid attempt outside this repository.

Use for:

- C# model ideas.
- Calculator tests.
- Persistence and backup ideas.
- Undo/redo concept.
- GitHub release workflow example.

Risks:

- Mid-attempt app layer.
- Dirty worktree.
- UI controls not fully wired.
- Encoding damage.
- Limited tests.
- No remote configured.

Decision:

Use as reference for domain and release ideas. Do not use as the clean base.

## Atom Workflow Experiment

Location:

Legacy workflow experiment outside this repository.

Use for:

- Verification workflow inspiration.
- Decision-interview pattern.
- Implementer/verifier agent pattern.

Risks:

- Claude-oriented.
- Not directly portable as-is.

Decision:

Use the philosophy, not the files.
