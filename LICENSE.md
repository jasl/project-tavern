# Project Tavern Repository Licensing

Copyright © 2026 Jun Jiang (jasl).

All rights reserved except as expressly granted by the licenses identified for each part of this repository.

This is a multi-license repository. The engine components are open source under the MIT License. Game-specific software and original content are source-available for noncommercial use. No single license applies to every file.

## License scope

| Material | Default scope | License |
| --- | --- | --- |
| `packages/base/**` | Generic runtime, contracts, persistence, replay, diagnostics, and testkit code | [MIT](LICENSES/MIT.txt) |
| `packages/ui/**` | Generic React game shell, HUD/overlay/VN primitives, and developer UI framework | [MIT](LICENSES/MIT.txt) |
| `apps/web/**` | Game-neutral Loader and Web Host code | [MIT](LICENSES/MIT.txt) |
| Generic engine tooling explicitly marked `MIT` | Generic build, digest, packaging, and test utilities | [MIT](LICENSES/MIT.txt) |
| `packages/modules/**` | Game-specific modules, rules, state, commands, and tests | [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt) |
| `stories/**` software | Story logic, rules, values, Scene glue, Hotfixes, fixtures, and integration tests | [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt) |
| Other project-owned software not expressly marked MIT | Project-specific scripts, configuration, and software | [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt) |
| Project-owned narrative, localization, art, audio, and design content | Original expressive game content, including approved material in `art-source/**`, `packages/assets/**`, and Story content/asset directories | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt) |
| Project documentation | Original documentation, except substantial code copied from a software package and third-party material identified separately | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt) |

Package-local metadata, SPDX headers, asset sidecars, and provenance manifests may make a more specific designation. A specific designation controls only when the relevant copyright holder has authority to grant it. Mixed packages use `SEE LICENSE IN LICENSE.md` rather than pretending that one SPDX identifier covers both code and content.

The standard legal texts under `LICENSES/` are reproduced for compliance and are not modified or relicensed by this scope notice. The MIT template contains only the project copyright holder substitution expected by that template.

## Composite builds

A Player bundle may contain MIT engine code, PolyForm game software, CC-licensed original content, and separately licensed third-party components.

- MIT components remain independently reusable, including commercially, under MIT.
- Combining MIT code with PolyForm or CC material does not relicense the restricted material as MIT.
- A bundle containing game-specific software or original game content may be used only in ways allowed by every applicable license; the standard project grant does not permit commercial use of that combined bundle.
- Source maps, downloadable Story packages, and separately distributed assets follow the same component-level scope.

Commercial use of the game-specific software or original content requires separate written permission from Jun Jiang. The copyright holder may offer the same project-owned material under separate commercial terms.

## Third-party material

Third-party code, fonts, icons, images, models, audio, data, translations, purchased assets, plugins, and service outputs retain their original licenses, contracts, and terms. This repository's MIT, PolyForm, and CC grants do not apply to third-party rights.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for material actually included in source or release artifacts. A third-party item may be used only after its exact version and scope have been reviewed for the intended source, modification, build, and distribution use.

The ignored `references/` directory is local research input. It is not part of this repository, build, release, generation pipeline, or license grant.

Public availability, downloadability, purchase, or the absence of a per-file copyright line does not itself grant permission. When an authoritative upstream license clearly covers the exact file and version, that upstream license controls. Otherwise, material without a verifiable license, written permission, or public-domain declaration is treated as `unverified/all-rights-reserved` and is excluded from source, builds, releases, fixtures, screenshots, and AIGC inputs.

## Required notices and attribution

PolyForm-covered distributions must preserve [NOTICE](NOTICE), including every line beginning with `Required Notice:`. CC-covered distributions must provide attribution, identify modifications, and preserve the applicable CC BY-NC-SA terms. Third-party notices must be carried as required by their original terms.

## Trademarks and contributions

Project names, logos, character marks, and other brand identifiers are not licensed by the repository copyright licenses. See [TRADEMARKS.md](TRADEMARKS.md).

Contribution terms and the restricted-area CLA gate are documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Legal texts

- [MIT License](LICENSES/MIT.txt)
- [PolyForm Noncommercial License 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt)
- [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](LICENSES/CC-BY-NC-SA-4.0.txt)

This scope summary is informational and does not replace the applicable legal text. Obtain qualified legal review before charging for the game, signing a publisher or investment agreement, relying on a statutory copyright exception, or enforcing intellectual-property claims.
