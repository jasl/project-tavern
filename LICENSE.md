# Project Tavern Repository Licensing

Copyright © 2026 Jun Jiang (jasl).

All rights reserved except as expressly granted by the licenses identified for each part of this repository.

This is a multi-license repository. The SillyMaker engine components are open source under the MIT License. Project Tavern game-specific software and original content are source-available for noncommercial use. No single license applies to every file.

## License scope

| Material                                                              | Default scope                                                                                                                 | License                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `engine/packages/base/**`                                             | Generic runtime, contracts, persistence, replay, diagnostics, and testkit code                                                | [MIT](LICENSES/MIT.txt)                                                   |
| `engine/packages/ui/**`                                               | Generic React game shell, HUD/overlay/VN primitives, and developer UI framework                                               | [MIT](LICENSES/MIT.txt)                                                   |
| `engine/packages/web/**`                                              | Game-neutral Loader and Web Host code                                                                                         | [MIT](LICENSES/MIT.txt)                                                   |
| Generic engine tooling explicitly marked `MIT`                        | Generic build, digest, packaging, and test utilities                                                                          | [MIT](LICENSES/MIT.txt)                                                   |
| `game/stories/**` software                                            | Story logic, rules, values, Scene glue, Hotfixes, fixtures, and integration tests                                             | [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt) |
| Other project-owned software not expressly marked MIT                 | Project-specific scripts, configuration, and software                                                                         | [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt) |
| Project-owned narrative, localization, art, audio, and design content | Original expressive game content in `art-source/**` and Story content or `game/stories/**/assets/**` directories              | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt)                           |
| Project documentation                                                 | Original documentation, except substantial code copied from a software package and third-party material identified separately | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt)                           |

Package-local metadata and SPDX headers may make a more specific designation. A specific designation controls only when the relevant copyright holder has authority to grant it. Mixed packages use `SEE LICENSE IN LICENSE.md` rather than pretending that one SPDX identifier covers both code and content; runtime asset manifests carry technical identity only.

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

Third-party material intentionally copied into this repository belongs under `vendor/**`. That directory is outside the project MIT, PolyForm, and CC grants; each item keeps whatever original license, contract, notice, or public-domain status actually applies to it. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for this boundary statement.

npm and other ecosystem dependencies likewise retain their own terms. This repository does not maintain an exhaustive dependency copyright inventory and does not make dependency or `vendor/**` license scanning a test, build, Player, Pages, or release gate.

The ignored `references/` directory is local research input. It is not part of this repository, build, release, generation pipeline, or license grant.

The project does not automatically classify third-party material from the presence or absence of a copyright line or LICENSE file. Public-domain and no-copyright material remains possible; any applicable original terms or status control without being converted into a project license.

## Required notices and attribution

PolyForm-covered distributions must preserve [NOTICE](NOTICE), including every line beginning with `Required Notice:`. CC-covered distributions must provide attribution, identify modifications, and preserve the applicable CC BY-NC-SA terms. Third-party material remains subject to whatever original notice obligations actually apply to it; this repository does not automatically enumerate or adjudicate them.

## Trademarks and contributions

Project names, logos, character marks, and other brand identifiers are not licensed by the repository copyright licenses. See [TRADEMARKS.md](TRADEMARKS.md).

Contribution terms and the restricted-area CLA gate are documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Legal texts

- [MIT License](LICENSES/MIT.txt)
- [PolyForm Noncommercial License 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt)
- [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](LICENSES/CC-BY-NC-SA-4.0.txt)

This scope summary is informational and does not replace the applicable legal text. Obtain qualified legal review before charging for the game, signing a publisher or investment agreement, relying on a statutory copyright exception, or enforcing intellectual-property claims.
