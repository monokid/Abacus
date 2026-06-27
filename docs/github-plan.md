# GitHub Plan

## Repository

- Name: `Abacus`
- Visibility: public
- Initial posture: open-source friendly, but not marketed as broadly production-ready until hardened.

## First Commit Should Contain

- README.
- License.
- Planning docs.
- Cleaned handoff docs.
- Fictional sample data only.
- No old dependency folders.
- No generated builds.
- No personal financial data.

## License

Decision: GPL-3.0.

Reason:

- Keeps Abacus and derivative distributions open-source.
- Matches the user's preference for a public, hardened open-source release.
- Allows public use while preserving copyleft obligations.

## Branch Strategy

- `main`: stable, always passing.
- Feature branches per milestone or feature group.
- Pull requests even if solo, when useful for review and CI history.

## Checks

Start small:

- Typecheck.
- Unit tests.
- Formatting/linting once chosen.

Add later:

- Native-input smoke test.
- Windows package build.
- Security scan.

## Releases

First release model:

- Manual GitHub Release.
- Portable Windows executable attached as artifact.

Later update option:

- Electron auto-updater can consume GitHub Releases.
- Keep this as last priority because update flow adds signing, trust, rollback, and packaging concerns.
