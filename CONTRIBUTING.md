# Contributing to Project Tavern

Project Tavern is a multi-license repository. Contribution terms depend on the target path and cannot be inferred from repository visibility alone.

## MIT SillyMaker engine areas

Contributions to `engine/packages/base`, `engine/packages/ui`, and game-neutral `engine/packages/web` code may be accepted under inbound=outbound MIT terms.

By submitting such a contribution, you represent that you have the right to license it and agree that the accepted contribution is available under the repository's MIT License. Preserve existing copyright, license, and attribution notices.

## Restricted game and content areas

The project does not currently accept external contributions to PolyForm-covered game software or CC BY-NC-SA-covered original content. This includes `game/stories/**`, project narrative, localization, art, audio, game-design documents, Story Hotfixes, and game-specific tests.

Restricted-area contributions may be accepted only after Jun Jiang has approved a written Contributor License Agreement or copyright assignment that permits copying, modification, distribution, sublicensing, and commercial use while preserving reasonable contributor attribution. No general CLA is currently offered.

Opening a pull request, issue, or discussion does not create that agreement. Do not attach substantial restricted-area code or content to an issue as a workaround.

## Third-party and AI-assisted material

Place intentionally copied third-party code, text, data, images, fonts, models, audio, translations, purchased assets, and similar material under `vendor/**`. It retains its own license, contract, notice, or public-domain status and is not covered by the repository's MIT, PolyForm, or CC grants. You must have the right to submit it and preserve required notices; the absence of an automated scanner is not approval.

For an external AI-assisted contribution, disclose the service and model, generation date, prompt and inputs, output hash, and the terms relied on. Commercial material and local `references/` content may not be used as generation inputs. This contribution disclosure is separate from the maintainer's internal AIGC source-archive layout, which is described in `docs/policies/assets-and-references.md`.

## Preparing a change

Use Node.js >= 22.12.0 and pnpm >= 11.0.0. No exact patch version or host attestation is required.

```sh
pnpm install
pnpm check
```

Run `pnpm test:e2e` when changing browser behavior. For changes to the built Player or Artifact, also use the relevant commands in `docs/engine/build-and-release.md`.

Tests should cover real engine contracts, game behavior, maintained data formats, or user flows. Avoid adding plan/checkpoint enforcement, exact-host checks, Git-state checks, or frozen provisional-balance fixtures. Update active documentation when a public API, package role, workflow, or compatibility promise changes.

Review [LICENSE.md](LICENSE.md), [NOTICE](NOTICE), package metadata, and [the active licensing policy](docs/policies/licensing.md) whenever a change affects legal scope. New npm dependencies do not require a `THIRD_PARTY_NOTICES.md` inventory entry; deliberately copied third-party files still belong under `vendor/**`.
