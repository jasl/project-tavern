# Contributing to Project Tavern

Project Tavern is a multi-license repository. Contribution terms depend on the target path and cannot be inferred from repository visibility alone.

## MIT Engine areas

Contributions to `packages/base`, `packages/ui`, and game-neutral `apps/web` code may be accepted under inbound=outbound MIT terms.

By submitting such a contribution, you represent that you have the right to license it and agree that the accepted contribution is available under the repository's MIT License. Preserve existing copyright, license, and attribution notices.

## Restricted game and content areas

The project does not currently accept external contributions to PolyForm-covered game software or CC BY-NC-SA-covered original content. This includes `packages/modules`, `stories/**`, project narrative, localization, art, audio, game-design documents, Story Hotfixes, fixtures, and game-specific tests.

Restricted-area contributions may be accepted only after Jun Jiang has approved a written Contributor License Agreement or copyright assignment that permits copying, modification, distribution, sublicensing, and commercial use while preserving reasonable contributor attribution. No such general CLA is currently offered.

Opening a pull request, issue, or discussion does not create that agreement. Do not attach substantial restricted-area code or content to an issue as a workaround.

## Third-party and AI-assisted material

Do not submit third-party code, text, data, images, fonts, models, audio, translations, or purchased assets without complete provenance and an original license that permits the proposed repository and distribution use.

Materials with missing, unclear, or version-ambiguous terms are not accepted. Public availability, downloadability, purchase, or a missing copyright line is not permission.

AI-assisted contributions must disclose the service, model, generation date, prompt, all inputs, output hash, and terms in effect. Commercial material and local `references/` content may not be used as generation inputs. An output with uncertain redistribution or relicensing rights is not accepted.

## Before submitting

Run:

```bash
node --test scripts/verify-licensing.test.mjs
node scripts/verify-licensing.mjs
```

If a new dependency or asset is included, update `THIRD_PARTY_NOTICES.md` and preserve every notice required by its original terms.
