# Excel Import And Tester Plan

This note summarizes patterns observed from an old private Jaarbegroting workbook without
committing the workbook, extracted transactions, exact parties, exact amounts, or screenshots.

## Workbook Shape

- Older data can live in combined multi-year sheets as well as one sheet per year.
- Modern yearly sheets use repeated month blocks with income at the top, fixed costs in
  the middle, variable costs below, and subtotals/remainder rows near the bottom.
- Month labels and transaction text are not always clean. Import should tolerate typos,
  including month-name mistakes, and should not assume every month word marks a month block.
- Formula cells are common for copied values, subtotals, totals, and carry-forward balances.

## Import Rules To Design Later

- Detect the sheet era/layout before extracting rows.
- Treat carry-forward/rest rows as balance mechanics, not ordinary income entries.
- Separate formulas from user-entered rows.
- Preserve invalid amount text, highlighted cells, and odd notes as import warnings or row
  comments instead of silently dropping them.
- Generate recurring-rule suggestions as candidates only. Do not auto-apply them.
- Keep all import diagnostics readable in Dutch.

## Fictional Sample Data Guidance

The public sample data should stay fictional but should exercise workbook-like behavior:

- monthly pension-style income
- secondary income
- household cash rows
- telecom, energy, rent/home, bank, insurance, and reserve rows
- medical, gifts, car/fuel, household extras
- blank planned amounts
- correction/comment examples

## Future Subagent Testers

- Dad-style input tester: types realistic messy rows, uses tab/enter/escape, mistypes amounts,
  and checks that focus does not jump.
- Visual tester: captures desktop, small-laptop, and narrow screenshots and flags overlap,
  cropped month art, clipped controls, or weak active-month indication.
- Excel-pattern tester: uses synthetic workbooks with formulas, typos, missing month labels,
  text amounts, highlighted cells, and extra notes outside expected blocks.
- Import-diagnostics tester: confirms invalid cells become warnings/comments rather than
  corrupted budget entries.
- Recovery tester, later: checks backups, restore, and corrupt-file handling.

## Public Repo Rule

Never commit private workbooks, exact extracted data, or real transaction lists. Only commit
fictional sample data and synthetic test workbooks.
