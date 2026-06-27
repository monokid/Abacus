# ADR 0001: Stack Direction

## Status

Proposed.

## Context

Abacus must become a Windows desktop budgeting app with a calm, spreadsheet-like UI. The
old Electron app proves the desired delivery shape but is too monolithic to extend safely.

The user is unsure which stack to choose. The real decision is not "which language is best".
It is which maintenance and interaction model best reduces risk.

## Options

### Option A: TypeScript + Svelte + Electron

Benefits:

- Closest to the working Electron reference.
- Strong fit for component-scoped month cards.
- Fast visual iteration.
- Good for custom spreadsheet-like input.
- Easy to keep core logic pure and tested.
- Portable executable remains straightforward.

Risks:

- Maintainer must be comfortable enough with TypeScript/Svelte.
- Electron packaging and update flow need care.
- Native OS integration goes through the host boundary.

### Option B: .NET + Blazor Hybrid/WebView2

Benefits:

- C#/.NET may be more comfortable long-term.
- Good Windows desktop fit.
- Release workflow can produce a self-contained executable.
- Core domain logic in C# is pleasant and testable.

Risks:

- Spreadsheet-like input stability must be proven early.
- Blazor render behavior needs careful testing.
- Existing .NET attempt is incomplete and has encoding/UI issues.
- Matching the old Electron feel may take longer.

### Option C: Replaceable Shell Compromise

Build the UI/core in a small web stack first, but keep a strict host interface so Electron
can later be swapped for WebView2 or another shell.

Benefits:

- Best immediate path to the desired app shape.
- Keeps future .NET shell option open.
- Forces clean module boundaries.

Risks:

- Requires discipline to keep shell-specific code out of UI/core.
- A later shell swap still costs real work.

## Recommendation

Use **TypeScript + Svelte + Electron** for Abacus v1, with the replaceable-shell discipline
from Option C.

This gives the fastest path to a polished, testable, Electron-like result while avoiding
the old monolith. The architecture should make the shell thin:

- `core/`: pure budget logic.
- `ui/`: Svelte components and input behavior.
- `host/`: typed filesystem/native API.
- `shell/electron/`: Electron implementation of the host.

## Acceptance Conditions

This stack remains the right choice only if early tests prove:

- Commit-on-blur works with native input.
- Month edits do not rerender the full app.
- Portable Windows packaging works.
- The project remains understandable enough for the maintainer.

If these fail early, revisit .NET/Blazor Hybrid before the app grows.

