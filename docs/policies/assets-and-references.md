# Assets, AIGC, third-party material, and references

状态：持续维护的素材输入与运行时提升政策。

This policy separates source archives, selected product assets, third-party material, and local research. It is a human review boundary, not a metadata-scanning harness.

## 1. Project-owned runtime assets

A product asset becomes part of the game only when a maintainer intentionally copies or creates it in a Story-owned `game/stories/<story>/assets/**` directory, then references it from the Story's validated asset catalog. A future shared runtime asset package must document its ownership and admission boundary before use.

Before promotion, review:

- whether the file is actually needed by the current Story;
- rights and applicable license scope;
- dimensions, format, size, browser behavior, and accessibility/fallback needs;
- stable asset ID and intended renderer/scene use.

The promoted runtime manifest and exact file bytes establish technical identity for loading, caching, diagnostics, and compatibility. They do not prove authorship, legal approval, aesthetic approval, or final-game status.

Code-native text, controls, focus states, HUD structure, and small accessible symbols should remain code-native unless an intentional design change requires an asset.

## 2. AIGC source archives

Tracked AIGC source material belongs under:

```text
art-source/aigc/<source>/**
```

Only the first-level source directory is conventional. Organization beneath it is free and may change as the archive evolves. Prompt/model naming, pair files, provenance JSON, terms snapshots, review-state sidecars, and source hashes are optional; repository automation does not require or adjudicate them.

Archive files may be reorganized or replaced. They are not automatically product assets and must not be bundled into a Player. Promotion is a deliberate manual copy into a runtime asset location followed by technical catalog/manifest validation.

Commercial material and local `references/` content are not generation inputs unless a future owner decision explicitly authorizes a specific use after rights review.

Local candidates and working output may remain in ignored `art-source/**/candidates/` or `art-source/**/work/` paths.

## 3. Third-party material

Material intentionally copied from a third party into Git belongs under:

```text
vendor/**
```

That includes code, fonts, icons, images, models, audio, data, translations, purchased assets, plugins, and other copied files. Each item keeps its original license, contract, notice, or public-domain status and is outside the repository's MIT, PolyForm, and CC grants.

Preserve notices and enough source/terms context for a human to understand the permitted use. The repository does not mandate an exhaustive license scanner or one universal sidecar schema. Absence of an automated rejection does not establish permission.

Package-manager dependencies are not copied third-party assets for this directory rule; their versions belong in package manifests and the shared lockfile.

## 4. Local references

`references/` is ignored, untracked, local-only research input. Every reference set used for project research must be recorded in [`docs/research/reference-register.md`](../research/reference-register.md) with, where available:

1. source URL and acquisition date;
2. Git revision, release version, or useful digest;
3. root license plus relevant README/CREDITS/contract terms;
4. material type;
5. allowed research purpose;
6. explicit no-copy and no-build boundary.

References may inform broad ideas such as time ownership, persistence metadata, debugging workflow, and content organization. Do not copy or adapt their code, prose, assets, schemas, constants, data, or distinctive structures into Project Tavern.

Production code, tests, fixtures, generators, Image Gen inputs, screenshots, builds, and Artifacts must not import, scan, read, or depend on `references/`. This is independent-reimplementation and contamination control, not a claim that every reference has the same license.

## 5. Artifact boundary

A Player Artifact may contain only the runtime assets and notices intentionally selected for that Player. It excludes:

- AIGC source archives and unselected candidates;
- `references/`;
- research notes used only during investigation;
- generation prompts and local working files;
- calibration reports and provisional golden data;
- local Saves, DebugBundles, diagnostics, screenshots, and test output.

Artifact preparation should validate actual runtime file references and package the required legal notices. It should not attempt to infer asset rights from technical hashes or turn archive metadata into a legal gate.

## 6. External contributions

The lightweight maintainer archive layout above does not replace contribution disclosure. External AI-assisted contributions follow [`CONTRIBUTING.md`](../../CONTRIBUTING.md), including the requested service/model, date, prompt/input, output hash, and terms disclosure. Restricted game/content contributions still require the owner-approved written agreement described there.
