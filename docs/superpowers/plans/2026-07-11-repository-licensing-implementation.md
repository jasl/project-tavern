# Repository Licensing Implementation Record

**Status:** Root legal documents and package scope declarations were implemented during the pre-Phase 1 baseline. The former repository licensing verifier is superseded by [`2026-07-12-simplify-toolchain-and-repository-checks.md`](2026-07-12-simplify-toolchain-and-repository-checks.md).

The durable delivered files are:

- `LICENSE.md`
- `NOTICE`
- `LICENSES/MIT.txt`
- `LICENSES/PolyForm-Noncommercial-1.0.0.txt`
- `LICENSES/CC-BY-NC-SA-4.0.txt`
- `THIRD_PARTY_NOTICES.md`
- `TRADEMARKS.md`
- `CONTRIBUTING.md`
- workspace package `license` metadata

Current policy:

- maintainers review project legal files and package metadata directly;
- no script freezes their existence, canonical hash, required text, package metadata, or screenshot sidecars;
- no dependency, `vendor/**`, AIGC, ordinary asset, public-domain, or third-party license classifier runs in repository verification;
- `references/` remains local-only and excluded through Git ignore, import boundaries, bundle checks, and artifact checks;
- Player preparation copies the seven project release statements, excluding `CONTRIBUTING.md`;
- artifact manifests hash shipped bytes for technical integrity and reproducibility, not legal adjudication.

The repository's license choices and contribution boundaries themselves remain governed by [`../specs/2026-07-11-repository-licensing-design.md`](../specs/2026-07-11-repository-licensing-design.md). Git history retains the original implementation steps; future work must not recreate the removed static verifier.
