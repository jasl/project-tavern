# Third-Party Notices

This file records third-party material actually committed to Project Tavern source or included in a published artifact. All such material retains its original copyright, license, contract, and attribution requirements. Project-level MIT, PolyForm, and Creative Commons grants do not relicense it.

## Current production inventory

No third-party production or runtime material is currently committed or shipped. Planned libraries such as Lucide are not listed until an exact dependency version enters the lockfile or release artifact.

The ignored `references/` directory is not part of this inventory. It is local research input, is not tracked, and must not enter builds, tests, documentation screenshots, releases, or AIGC inputs. Its contents retain their original terms.

The four outputs under `art-source/imagegen/first-web-pack/` are AI-generated project source candidates made with OpenAI Image Gen through Codex's built-in `image_gen` surface. They were manually reviewed before repository sharing and are attributed to Jun Jiang (jasl). Their exact-output service-terms evidence and project-owner authority attestation are recorded in `openai-service-terms-review.v1.json`; every candidate remains `review.status="candidate"` with `runtime: null`. They therefore do not enter an Asset Pack, Player, screenshot baseline, or release inventory. The recorded assignment/authorization is qualified to rights that exist and makes no claim of exclusivity, copyrightability, or non-infringement.

## Admission record

Before a third-party item enters source or a release, its record must include:

- component or asset name;
- exact version and content SHA-256;
- authoritative source URL;
- known copyright holder without guessed attribution;
- SPDX identifier or exact original license/contract name;
- local legal text or authoritative permanent link;
- source paths and release artifacts containing it;
- modifications made by this project;
- whether repository publication, original-file redistribution, modification, commercial distribution, and AIGC input are permitted;
- all required notices, attributions, source offers, or other distribution obligations.

A license string in package metadata is evidence to investigate, not sufficient proof by itself. The authoritative source and the exact shipped version must agree.

## Missing or unclear terms

A missing per-file copyright line is not automatically a blocker when a verifiable upstream license clearly covers the file and version. If no such scope can be established, the item is `unverified/all-rights-reserved` and is rejected from source and release artifacts rather than recorded here as approved.

Public visibility, purchase, download access, or repository forking does not supply missing reuse rights. Clearance requires a verifiable applicable license, explicit written permission, an evidenced public-domain/CC0 declaration, or a documented legal review for the exact use.

The project does not use fair use or fair dealing as a routine production-asset admission path.

## Commercial and generated assets

Purchased material that permits compiled-game distribution but forbids public redistribution of source files stays in private asset storage. The public repository may contain only placeholders, stable IDs, acquisition instructions, and metadata that does not reproduce protected content.

AI-assisted material must record the service, surface, model, generation date, prompt, exact ordered inputs and source hashes, output hash, and terms in force at generation time. A tracked AI source additionally requires an approved strict service-terms record bound by review ID and semantic digest to its exact service/surface/output tuple, a rights-beneficiary authority attestation covering repository publication and project relicensing, and an exact-output limited content-admission screen. Terms-pending or terms-rejected output stays local-only and cannot be tracked, repository-previewed, bundled, deployed, or reused as AIGC input.

Repository admission, runtime selection, and AIGC input reuse are independent decisions. Service-terms approval does not authorize generation input; non-empty inputs require a separate prior `inputUseReview` bound to the ordered Asset IDs and current archived source hashes. Project CC licensing applies only to the extent copyright or other licensable project rights exist and supplies no exclusivity or non-infringement warranty.
