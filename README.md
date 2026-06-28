# Abacus

Abacus is a calm, Dutch-language yearly household-budget desktop app.

It is being rebuilt from an older Jaarbegroting prototype with one primary goal:
make a familiar Excel-like budgeting workflow safer, clearer, and harder to break for
an elderly Belgian user.

## Project Status

Clean-room rebuild in progress.

The repo now has a tested budget core, fictional sample data, and a visible Svelte year
view for feedback. Electron packaging is still a later milestone.

## Product Direction

- Windows desktop app.
- 100% Dutch UI.
- Father-first design, public/open-source ready structure.
- Fictional data first; real Excel import later.
- Calm, elegant, royal/lordly Celtic visual direction.
- Portable Windows executable as the first release target.

## Architecture Direction

The proposed v1 stack is:

- TypeScript + Svelte for the UI.
- Electron for the first desktop shell.
- A replaceable host boundary so a later WebView2/.NET shell remains possible.

See [ADR 0001](docs/adr/0001-stack-direction.md).

## Documentation

- [Product Spec](docs/product-spec.md)
- [Milestones](docs/milestones.md)
- [Communication Rules](docs/communication-rules.md)
- [Subagent Workflow](docs/subagent-workflow.md)
- [Source Inventory](docs/source-inventory.md)
- [GitHub Plan](docs/github-plan.md)
- [Excel Import And Tester Plan](docs/excel-import-and-testing-plan.md)

## License

Abacus is licensed under the GNU General Public License v3.0.
