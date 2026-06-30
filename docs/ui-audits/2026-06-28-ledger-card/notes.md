# Ledger Card UI Audit

Date: 2026-06-28

## Evidence

- `00-user-observation.png`: user-provided screenshot showing the cramped month-card ledger.
- `01-current-live-card.png`: live Chrome screenshot captured from the local Abacus app.
- DOM measurement: active card is 410px wide, ledger content rail is 380px wide, columns resolve to 74px / 132px / 90px / 66px.

## Findings

1. Party and description columns are too narrow for normal household-budget text. Party gets about 74px and description about 132px, so realistic values truncate quickly.
2. Text cells have no inner breathing room. This makes rows look like they touch the card edge even when the grid is technically aligned.
3. The action column reads like an attached tail. It is visually aligned, but the header label and button cluster do not feel integrated with the grid.
4. The carry-over row is too wordy for a fixed ledger row. The lock plus "Vast" consumes action-column space without adding much value.
5. Header labels are too literal and too prominent for the available width. "Partij / Omschrijving / Bedrag / Bewerk" competes with the row content while not improving input confidence much.
6. The font difference is not perceptible. The app uses Aptos/Segoe for most UI and the ledger, while only titles use Georgia.
7. Card width can increase modestly. A wider card improves text usability more than further compression does, but it reduces the visible preview of neighboring months.

## Recommended Direction

Use a modestly wider month card and a calmer grid:

- desktop card: 430-440px instead of 410px
- ledger columns: party 88-96px, description flexible 150-170px, amount 86-90px, action 36-44px
- normal saved row action: one edit button only; note indicator should not reserve a second permanent button unless a note exists
- carry-over row: show only the lock icon, no "Vast" text
- header row: soften or reduce labels; align `Bedrag` right and replace `Bewerk` with an icon-only/blank action header
- add 6-8px horizontal cell padding inside text cells while preserving amount alignment
- introduce a clearly different ledger font, likely Segoe UI / Aptos for UI and `IBM Plex Sans Condensed`-style system fallback is not available locally; safest immediate choice is better weight/spacing rather than a remote font

## Testing Additions

- screenshot and geometry check for 360px width
- narrow edit-row screenshot
- narrow delete-confirm screenshot
- header-to-row action-column alignment check
- saved-row long-text truncation check
- carry-over action cell should contain only the lock icon
