# Abacus Milestones

## Milestone 0: Planning Pack

Goal: make the rebuild legible before code exists.

Deliverables:

- Product spec.
- Stack decision record.
- Milestone plan.
- Subagent workflow.
- Source inventory.
- GitHub repo plan.

Exit criteria:

- User approves the brief.
- Stack default is accepted or changed.
- Repo creation details are clear.

## Milestone 1: Clean Public Repo

Goal: create the public `Abacus` GitHub repo without old clutter.

Deliverables:

- Public GitHub repo named `Abacus`.
- README.
- License.
- Contribution notes.
- Clean docs copied from this planning pack.
- Cleaned handoff docs from the Electron reference.
- Initial issue labels or milestone checklist.

Exit criteria:

- Repo exists.
- No personal data is committed.
- The old attempts remain outside the repo.

## Milestone 2: Core Engine

Goal: make budget logic testable before UI complexity begins.

Deliverables:

- Data model.
- Fictional sample year.
- Section-scoped subcategory model.
- Integer-cent money model.
- Money parsing/formatting for `nl-BE`.
- Month and year calculations.
- Carry-forward logic.
- Basic recurring-rule date generation.
- Core unit tests.

Exit criteria:

- Fast verification passes.
- Test data is fictional.
- Model leaves room for future Excel import.
- Subcategories can be represented without breaking top-level section calculations.
- Calculations use integer cents, with blank amounts preserved as `null`.

## Milestone 3: Barebones Month Prototype

Goal: see one month in the intended app shape.

Deliverables:

- One month card.
- Three sections: Inkomsten, Vaste kosten, Variabele kosten.
- Configured subcategories visible inside their parent sections.
- Existing fictional rows.
- New-row affordance.
- Legacy month image used in the month card/header in a readable way.
- Calm light visual direction.

Exit criteria:

- User can review the shape and visual direction.
- Month art supports the UI without reducing grid readability.
- No full feature parity expected yet.

## Milestone 4: Input Stability Gate

Goal: prove the dangerous editing behavior early.

Deliverables:

- Commit-on-blur.
- Tab/Enter/Escape behavior.
- Empty amount stays blank.
- New row becomes real row after entry.
- Autosave to a fictional/local test profile.
- Native-input smoke test.

Exit criteria:

- Native typed input persists.
- The view does not jump while typing.
- Fast verification and smoke test pass.

## Milestone 5: Twelve-Month Year View

Goal: turn one month into a usable year.

Deliverables:

- 12-month rail/cards.
- All 12 legacy month images wired to the correct months.
- Year summary.
- Carry-forward across months.
- Scoped month updates.

Exit criteria:

- Editing month N updates N and later balances.
- Earlier month DOM/state is not rebuilt unnecessarily.
- Month images feel consistent across the year view.

## Milestone 6: First Feedback Build

Goal: deliver a portable Windows build for hands-on testing.

Deliverables:

- Portable Windows executable.
- Copyable test package while the executable is still being stabilized.
- Fictional data mode.
- Basic local persistence.
- Clear known-gaps list.

Exit criteria:

- User can test it like the old Electron app.
- Feedback is captured before expanding scope.

## Milestone 7A: Navigation And Management Structure

Goal: make the app understandable before adding more power.

Deliverables:

- Separate top-level areas for Jaarblad, Overzicht, Inzichten, Beheer, Veiligheid, and
  Instellingen.
- Beheer tabs for Categorieen, Partijen, Labels, and Vaste regels.
- Instellingen limited to app behavior such as learning mode, production mode, theme, and
  storage information.
- Veiligheid limited to backups, restore, validation, undo, redo, and change history.
- Smoke tests that verify the menu areas stay compact and do not compress the month board.

Exit criteria:

- A new tester can predict where categories, parties, labels, rules, safety, and app mode
  live.
- The father-facing year board remains the primary surface.

## Milestone 7B: Parties, Labels, And Autocomplete

Goal: make repeated text consistent across the app.

Deliverables:

- Managed parties.
- Managed labels.
- Party autocomplete in the month grid.
- Label/description autocomplete in the month grid.
- Party and label suggestions in recurring-rule setup.
- Add-from-typing behavior.
- Rename/hide behavior that preserves historical entries.

Exit criteria:

- The same party/label can be reused in entries and rules without retyping.
- Renaming a managed value updates current editable data safely.
- Smoke tests cover autocomplete in grid and recurring rules.

## Milestone 7C: Insights And Reports First Pass

Goal: add read-only checking views before formal export.

Deliverables:

- Insights page.
- Totals per section, subcategory, party, and label.
- Month-difference checks.
- Open amount checks.
- Projection status.
- Print-friendly year overview improvements.

Exit criteria:

- User can answer basic questions such as "waar gaat het geld naartoe?" without editing
  the year board.
- Insights do not make the main interface busier.

## Milestone 7D: Feature Parity Pass

Goal: work through the remaining parity checklist.

Feature groups:

- Autocomplete.
- Comments.
- Validation panel.
- Labels and label manager.
- Settings-managed subcategories.
- History, undo, redo.
- Recurring editor.
- Month lock.
- Year management.
- Insights and year overview.

Exit criteria:

- Parity checklist is substantially green except deferred safety/export/import features.

## Milestone 8: Safety And Recovery

Goal: make the app resilient enough for real use.

Deliverables:

- Atomic save.
- Automatic backups.
- Daily backups.
- Manual restore points.
- Restore flow.
- Backup manager.
- USB backup.
- Excel overview export.
- Recovery export.

Exit criteria:

- Corrupt-file recovery test passes.
- Restore round-trip test passes.
- Destructive actions confirm and back up first.

## Milestone 9: Public Release Hardening

Goal: prepare for open-source release and broader use.

Deliverables:

- GitHub release workflow.
- Windows build artifacts.
- Documentation.
- Security review.
- Privacy review.
- Optional update mechanism investigation.

Exit criteria:

- Public README describes intended audience and limitations.
- Release process is reproducible.
- No private assumptions or personal data remain.
