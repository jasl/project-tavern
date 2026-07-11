# Third-Party Material

Project Tavern's MIT, PolyForm Noncommercial, and Creative Commons grants apply only to the project-owned scopes identified in `LICENSE.md`. They do not relicense npm packages, browser or operating-system components, build tools, services, or other third-party material.

## Package-manager dependencies

npm and other package-manager dependencies retain their own licenses, contracts, notices, and public-domain status. Exact manifests and the frozen lockfile are maintained for reproducible engineering, not as an exhaustive copyright inventory.

This repository does not enumerate every direct, transitive, development, optional, or production dependency here. Dependency copyright extraction, LICENSE-file scanning, and legal classification are not test, build, Player, Pages, or release gates.

## Vendored material

Third-party source, binaries, fonts, icons, images, models, audio, data, translations, and other material intentionally copied into Git belong under `vendor/**`.

Everything under `vendor/**` retains whatever original license, contract, notice, attribution, or public-domain status actually applies to it. The repository's project licenses do not apply to that directory. Repository automation does not scan, classify, approve, reject, or promise an exhaustive inventory of `vendor/**`.

## Excluded research material

The ignored `references/` directory is local research input, is not tracked, and must not enter production code, tests, generated artifacts, screenshots, releases, or AIGC inputs. It is not part of `vendor/**` and is outside every project license.

## Project-generated material

Project-owned and AI-assisted source is not third-party vendored material. AIGC source is organized for human maintenance under `art-source/aigc/<source>/**` and is outside automated license scanning. Images selected for the game are manually copied into a runtime asset package or Story and then follow the ordinary technical manifest and Asset Pack digest rules.
