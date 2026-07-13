# Contributing to Project Tavern

Project Tavern is a multi-license repository. Contribution terms depend on the target path and cannot be inferred from repository visibility alone.

## MIT SillyMaker engine areas

Contributions to `engine/packages/base`, `engine/packages/ui`, and game-neutral `engine/packages/web` code may be accepted under inbound=outbound MIT terms.

By submitting such a contribution, you represent that you have the right to license it and agree that the accepted contribution is available under the repository's MIT License. Preserve existing copyright, license, and attribution notices.

## Restricted game and content areas

The project does not currently accept external contributions to PolyForm-covered game software or CC BY-NC-SA-covered original content. This includes shared or Story-local Gameplay software, `game/stories/**`, project narrative, localization, art, audio, game-design documents, Story Hotfixes, fixtures, and game-specific tests.

Restricted-area contributions may be accepted only after Jun Jiang has approved a written Contributor License Agreement or copyright assignment that permits copying, modification, distribution, sublicensing, and commercial use while preserving reasonable contributor attribution. No such general CLA is currently offered.

Opening a pull request, issue, or discussion does not create that agreement. Do not attach substantial restricted-area code or content to an issue as a workaround.

## Third-party and AI-assisted material

Place third-party code, text, data, images, fonts, models, audio, translations, purchased assets, and other intentionally copied third-party material under `vendor/**`. Such material retains its own license, contract, notice, or public-domain status and is not covered by the repository's MIT, PolyForm, or CC grants.

The project does not run automated license or copyright classification over `vendor/**`. Contributors remain responsible for material they submit and should preserve any notices already supplied with it.

AI-assisted contributions must disclose the service, model, generation date, prompt, all inputs, output hash, and terms in effect. Commercial material and local `references/` content may not be used as generation inputs. An output with uncertain redistribution or relicensing rights is not accepted.

## Before submitting

Review project legal files and package metadata directly when the contribution changes their scope. Run `pnpm verify` for software behavior and artifact checks.

New npm dependencies do not require a `THIRD_PARTY_NOTICES.md` entry. Third-party files copied into Git belong under `vendor/**`; project-owned assets continue to follow their project scope and provenance rules.
