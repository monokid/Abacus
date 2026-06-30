# Abacus Product Spec

## Purpose

Abacus is a calm yearly household-budget desktop app. It replaces a long-running Excel
workflow with something familiar enough to trust, but safer and harder to corrupt.

The app tracks one calendar year at a time. Each year has 12 months. Each month tracks:

- Inkomsten
- Vaste kosten
- Variabele kosten
- Configurable subcategories under those three main sections
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
- Reuse the 12 legacy month illustrations as first-class month assets. They should appear
  integrated into the month cards or month navigation, sized and cropped so they support
  the seasonal/lordly tone without competing with the grid.

The dark/evening mode can exist later, but the first visual target should be the light,
readable, father-friendly experience.

## Budget Structure

Every budget row belongs to one of three top-level sections:

- Inkomsten
- Vaste kosten
- Variabele kosten

The user must be able to configure subcategories from settings. Subcategories appear under
one of those three top-level sections and help group rows without replacing the main
section model.

Examples:

- Inkomsten: Pensioen, Terugbetalingen, Familie
- Vaste kosten: Wonen, Energie, Telecom, Verzekeringen
- Variabele kosten: Gezondheid, Cadeaus, Auto, Huishouden

Subcategory requirements:

- Subcategories are optional.
- A row may have no subcategory.
- Subcategories are configured in Dutch from settings.
- Subcategories are scoped to exactly one top-level section.
- Reordering subcategories should change display order without changing row identity.
- Renaming a subcategory should update existing rows that use it.
- Deleting or hiding a subcategory should not delete rows.
- Future Excel import must be able to map old spreadsheet labels/blocks into this model.

Row field requirements:

- Inkomsten, Vaste kosten, and Variabele kosten all support a `partij` field.
- The income UI may use a softer label later if that reads better in Dutch, but the data
  model should not treat income rows as party-less.
- Recurring-rule setup must allow `partij` for income rules as well as expense rules.

## Parties And Labels

The app needs managed suggestions for repeated text. This should make typing feel like
Excel with memory, while keeping names consistent across the year.

Parties are recurring people, shops, services, banks, governments, or organizations such
as `Pensioendienst`, `Telenet`, `Luminus`, `Mutualiteit`, `Aldi`, `Spar`, and `Cash`.

Party requirements:

- A party can be used in normal grid entries and recurring rules.
- Party suggestions should autocomplete while typing.
- Creating a new party from typing should be possible without leaving the grid.
- Renaming a party should update entries and recurring rules that use it.
- Hiding a party should remove it from suggestions without changing historical entries.
- Future Excel import should map repeated spreadsheet names into managed parties.

Labels are managed descriptions or tags such as `Pensioen`, `HH`, `Aldi`, `Spar`,
`Nespresso`, `HOSPI+`, `belasting`, or `controle nodig`.

Label requirements:

- Labels should autocomplete in the grid and recurring-rule setup.
- Labels should support reporting and filtering later.
- Labels are separate from subcategories: a subcategory decides where a row lives, a label
  describes what kind of row it is.
- The first implementation may treat labels as one managed description per row; a later
  version can support multiple tags per row if that proves useful.
- Renaming or hiding a label should not delete historical entries.

The main management surface for this belongs under `Beheer`, not under general app
settings.

## Insights And Reports

Insights should be separated from settings and from the year-entry surface. They are for
reading and checking, not for editing.

First insights:

- Totals per top-level section.
- Totals and counts per subcategory.
- Totals and counts per party.
- Totals and counts per label.
- Month differences and negative months.
- Open/blank amounts.
- Locked versus open months.
- Projection status for the next year.

Later reporting:

- Printable year overview.
- PDF export.
- Excel export.
- Year comparison.
- Filters by party, label, category, and month range.

## Money Model

The core data model stores money as integer cents:

- Year opening balances use `startBalanceCents`.
- Entry amounts use `amountCents`.
- Recurring rule defaults use `amountCents`.
- Blank editable amounts are stored as `null`, never as `0`.

This keeps calculations robust and avoids floating-point rounding drift. Backups remain
plain JSON and readable: a value such as `123456` means `1234,56 EUR`. Display, Excel
export, PDF export, and import adapters convert between cents and user-facing euro
formats at the boundary.

## Functional Non-Negotiables

- UI is 100% Dutch.
- Empty amount stays empty. It is never displayed or stored as typed zero.
- Money is stored as integer cents in the core and persisted JSON.
- Input commits on blur.
- Tab, Enter, Escape, and click-away behavior must be predictable.
- While typing, the view must not jump, scroll unexpectedly, or move focus.
- Focus restoration is based on entry identity, not row index.
- Editing a month must not rerender the entire app.
- Carry-forward balances must update correctly from the edited month onward.
- Configurable subcategories must be supported under Inkomsten, Vaste kosten, and
  Variabele kosten.
- The 12 seasonal month images from the legacy app are reused and tested in the UI.
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
