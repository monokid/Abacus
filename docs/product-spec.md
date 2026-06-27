# Abacus Product Spec

## Purpose

Abacus is a calm yearly household-budget desktop app. It replaces a long-running Excel
workflow with something familiar enough to trust, but safer and harder to corrupt.

The app tracks one calendar year at a time. Each year has 12 months. Each month tracks:

- Inkomsten
- Vaste kosten
- Variabele kosten
- Notes/comments
- Labels and parties
- Monthly totals
- Month difference
- End balance carried into the next month

## Primary User

The first user is the maintainer's father. He understands rows, columns, months, amounts,
labels, and Excel-style typing. He should not need to understand software concepts, file
systems, schemas, or recovery procedures.

Design priority:

1. Predictable input.
2. Clear Dutch wording.
3. No accidental data loss.
4. Familiar spreadsheet rhythm.
5. Elegant but quiet visual design.

## Secondary Goal

The project should be public and open-source ready. That means:

- No personal data in the repository.
- Fictional sample data only.
- Clear build/run/test documentation.
- Clean module boundaries.
- A testable core.
- Future security review before release hardening.

## Visual Direction

Abacus should preserve the emotional direction of the best Electron preview:

- Calm Excel-like budgeting.
- Celtic, lordly, royal, elegant accents.
- Natural greens, muted gold, wine/burgundy, warm paper tones.
- Strong readability for an elderly user.
- Decoration must never reduce contrast, speed, or clarity.

The dark/evening mode can exist later, but the first visual target should be the light,
readable, father-friendly experience.

## Functional Non-Negotiables

- UI is 100% Dutch.
- Empty amount stays empty. It is never displayed or stored as typed zero.
- Input commits on blur.
- Tab, Enter, Escape, and click-away behavior must be predictable.
- While typing, the view must not jump, scroll unexpectedly, or move focus.
- Focus restoration is based on entry identity, not row index.
- Editing a month must not rerender the entire app.
- Carry-forward balances must update correctly from the edited month onward.
- Fictional sample data ships first.
- Real Excel import is postponed.

## First Usable Result

The first final result should feel like the existing Electron app in delivery shape:

- A Windows desktop app.
- A portable executable.
- Local/offline.
- Dutch UI.
- A visible yearly budgeting surface.
- Fictional data for testing.

It does not need full backup/export/import features in the first feedback build.

## Explicitly Later

- Full backup manager.
- USB backup.
- Excel export.
- Recovery export.
- Real Excel history import.
- Auto-update through GitHub Releases.
- Public release hardening.

