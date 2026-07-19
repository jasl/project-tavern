# Licensing policy

状态：持续维护的法律范围摘要。

Copyright © 2026 Jun Jiang (jasl). All rights reserved except as expressly granted by the applicable licenses.

This page is operational guidance. [Root `LICENSE.md`](../../LICENSE.md), package/file-specific designations, and the applicable text under [`LICENSES/`](../../LICENSES/) control if a summary differs.

## Multi-license model

The repository must be described accurately: **SillyMaker engine components are open source under MIT; Project Tavern game-specific software and original content are source-available for noncommercial use.** The whole repository and the Project Tavern game are not MIT-licensed or generally open source.

| Material                                                                         | Default license                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `engine/packages/base/**`, `engine/packages/ui/**`, and `engine/packages/web/**` | MIT                                                                                                                     |
| Generic engine tooling explicitly marked MIT                                     | MIT                                                                                                                     |
| `game/stories/**` software                                                       | PolyForm Noncommercial 1.0.0                                                                                            |
| Other project-specific software not expressly marked MIT                         | PolyForm Noncommercial 1.0.0                                                                                            |
| Project-owned narrative, localization, art, audio, and game-design content       | CC BY-NC-SA 4.0                                                                                                         |
| Repository-level `docs/**`                                                       | CC BY-NC-SA 4.0, except separately identified third-party material or substantial code governed by its software license |

API documentation or examples shipped inside an MIT engine package may use that package's more specific MIT designation. Do not infer that repository-level engine documentation under `docs/` is MIT merely because it describes MIT code.

Single-license package metadata uses the exact SPDX identifier. A mixed package uses `SEE LICENSE IN LICENSE.md`. Runtime asset metadata and digests describe technical identity only and do not select or prove a license.

## Composite Player builds

A Player may combine MIT engine code, PolyForm game software, CC-licensed original content, and independently licensed dependencies or third-party assets.

- MIT components remain independently reusable, including commercially, under MIT.
- Combining them with Project Tavern does not relicense the game software or content as MIT.
- A composite bundle is usable only in ways allowed by every applicable license; the normal Project Tavern grant does not permit commercial use.
- Commercial use of project-owned restricted material requires separate written permission from Jun Jiang.

A handed-off Project Tavern Artifact should include:

- [`LICENSE.md`](../../LICENSE.md);
- [`NOTICE`](../../NOTICE), including `Required Notice: Copyright 2026 Jun Jiang (jasl).`;
- the applicable texts in [`LICENSES/`](../../LICENSES/);
- [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md);
- [`TRADEMARKS.md`](../../TRADEMARKS.md).

CC-covered distribution also needs attribution, identification of modifications, and preservation of the applicable share-alike terms. Legal-file inclusion is a product packaging responsibility; it does not require the retired Goal materialization or checkpoint machinery.

## Third-party material and dependencies

Third-party code, fonts, icons, images, models, audio, data, translations, purchased assets, plugins, and service outputs retain their original licenses, contracts, notices, or public-domain status. Project licenses do not regrant those rights.

Material intentionally copied into Git belongs under `vendor/**` and keeps its original terms. The project does not require an exhaustive automated dependency or `vendor/**` copyright inventory and does not make a license scanner a build gate. This is not automatic approval: the person introducing material must have the required rights and preserve notices.

npm and other ecosystem dependencies retain their own terms. Exact manifests and the shared lockfile describe software composition; they are not a substitute for legal review when a dependency's use is sensitive.

See [assets and references policy](assets-and-references.md) for AIGC archives, runtime promotion, and local research inputs.

## Trademarks

Project names, logos, character marks, and other brand identifiers are not licensed by the repository's copyright licenses. Nominative identification and required attribution are allowed without implying endorsement. [`TRADEMARKS.md`](../../TRADEMARKS.md) controls.

## Contributions

MIT SillyMaker areas may accept contributions under inbound=outbound MIT terms. PolyForm-covered game software and CC-covered content do not accept external contributions until the owner approves a written CLA or copyright assignment covering copying, modification, distribution, sublicensing, and commercial use while retaining reasonable attribution.

See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) before submitting material. An issue, discussion, or pull request does not create a CLA.

## Maintenance triggers

Review this policy, root legal files, package metadata, and Artifact contents when:

- code moves between generic engine and game-specific areas;
- a new package mixes software and content licenses;
- third-party material is copied into Git;
- a new asset source or distribution channel is adopted;
- commercial licensing, publisher, investment, or enforcement questions arise.

Obtain qualified legal advice for commercial distribution or other high-stakes decisions; repository documentation is not legal advice.
