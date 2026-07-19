# SillyMaker development guide

状态：日常开发入口。

## Requirements and installation

- Node.js >= 22.12.0
- pnpm >= 11.0.0

Only these compatibility floors are authoritative. An exact Node/pnpm patch version, Homebrew service, PostgreSQL server, machine attestation, or pre-materialized browser cache is not required.

```sh
pnpm install
pnpm dev
```

The workspace is ESM and uses one shared pnpm lockfile with exact dependency versions. Normal installation may use the network. If a browser test reports a missing Playwright browser, install the requested browser with the Playwright CLI for the current lockfile.

## Repository layout

```text
engine/packages/base   framework-neutral authoring, contracts, and runtime
engine/packages/ui     generic React presentation and input
engine/packages/web    browser Host and application adapters
game/stories           concrete game Stories and application roots
scripts                maintained build, asset, and product tooling
docs/engine            active engine documentation
docs/game              active gameplay design
docs/policies          durable repository policy
```

Package manifests define supported cross-package entries. Do not bypass them with imports into another package's `src/**` directory.

## Daily commands

| Command                  | Use                                                       |
| ------------------------ | --------------------------------------------------------- |
| `pnpm dev`               | Start the current Project Tavern development server.      |
| `pnpm check`             | Canonical local code-quality and product-behavior check.  |
| `pnpm test`              | Run engine and game behavior tests.                       |
| `pnpm test:e2e`          | Run browser user-flow tests.                              |
| `pnpm build:poc`         | Build the current static Player.                          |
| `pnpm release:poc`       | Build and prepare the local Artifact.                     |
| `pnpm test:e2e:prebuilt` | Exercise the prepared Artifact instead of the dev server. |

`pnpm verify` may remain as a compatibility alias for `pnpm check`; new documentation and automation should use `pnpm check`.

Use a focused package or test-file command while iterating when that is faster. Run `pnpm check` before handing off a change, and add `pnpm test:e2e` or prebuilt testing when the affected behavior crosses the browser/build boundary.

## Change workflow

1. Read the active document and implementation nearest the behavior being changed.
2. Decide which package owns the change and whether it affects a workspace public export or persisted data.
3. Add or adjust a focused behavior test when it meaningfully reduces regression risk.
4. Implement the smallest coherent change; keep Story-specific concepts outside generic engine packages.
5. Run focused tests, then the relevant broader commands.
6. Update active docs when the architecture, supported workflow, user-visible behavior, or compatibility promise changes.

Commits can be organized for reviewability, but there is no required Phase-to-commit mapping, checkpoint hash, exact staging contract, or clean-tree admission script.

## Testing policy

Tests and scripts are maintained when they protect product or reusable-engine value:

- command commit/rejection/fault behavior;
- deterministic rules and randomness;
- module ownership and public API behavior;
- Save/load/import compatibility and recovery;
- semantic preview/dispatch parity;
- presentation, accessibility, input, and browser flows;
- diagnostics and capability safety;
- build output that a Player actually needs.

Avoid tests or fixtures that exist only to prove development choreography, such as:

- Phase completion or a named task commit;
- exact repository file inventories or task-specific command sequences;
- one exact host toolchain, browser revision, cache, or machine attestation;
- Git cleanliness as application behavior;
- byte-for-byte snapshots of provisional balance, reference strategies, or disposable calibration reports;
- copied fixture trees when a small in-memory builder can express the business case.

A checked-in fixture is justified when its bytes are themselves a maintained external format or compatibility promise—for example, a Save migration sample. Document what compatibility it protects and provide an intentional update path.

The reusable `@sillymaker/base/testkit` package is appropriate for compact behavior-level setup shared by real engine/Story tests. A “harness” is not a problem by name; a harness with no maintained product contract is.

## Dependencies and toolchain

- Add dependencies at the narrowest package that uses them and keep versions exact.
- Update the shared lockfile with the manifest.
- Review browser compatibility, ESM support, license, bundle effect, and maintenance cost in proportion to the dependency's role.
- Do not add a repository-wide legal scanner or third-party notice inventory as a substitute for direct rights review.
- Keep direct Node TypeScript tools compatible with the way their package scripts execute them; ordinary project code is still typechecked by TypeScript.

The minimum engine compatibility versions belong in root `package.json#engines`. Do not duplicate a stricter toolchain pin in documentation unless a real upstream incompatibility temporarily requires it.

## Public API and documentation maintenance

When changing a package export:

1. update its `package.json#exports` and public barrel intentionally;
2. add an API/consumer behavior test if external Story code depends on the shape;
3. update [architecture](architecture.md), [features](features.md), or [Story authoring](story-authoring.md) where the responsibility changed;
4. identify any Save, Hotfix, tooling, or application consumers that require migration.

Version suffixes such as `V1` identify the current contract family. They do not prohibit replacement; a replacement should make coexistence and migration explicit, then retire obsolete paths rather than maintaining parallel authorities forever.

## Debugging failures

Start with the narrowest failing test or command. Classify the failure as product behavior, type/API drift, browser environment, generated output, or a stale test assumption. Repair the responsible layer rather than adding another wrapper whose only purpose is to satisfy command ordering.

Runtime failures visible to players should use structured outcomes and bounded diagnostics. Unexpected browser/runtime faults can be inspected through the existing diagnostic and DebugBundle features; do not put secrets or unrestricted local data into those exports.
