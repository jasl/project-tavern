# Project Tavern AIGC Asset Archive Simplification Record

**Status:** Completed and superseded for automation policy by [`2026-07-12-simplify-toolchain-and-repository-checks.md`](2026-07-12-simplify-toolchain-and-repository-checks.md).

The completed migration established these durable boundaries:

- AIGC source archives live under `art-source/aigc/<source>/**`.
- Current OpenAI concepts are flat under `art-source/aigc/openai/illustrations/`.
- Prompt files and model-name filename segments are optional; `unknown-model` placeholders are not required.
- The archive contains no provenance JSON, service-terms review, generation timestamp, review state, rights attestation, input graph, or source digest.
- Repository automation does not scan archive metadata, image/prompt pairing, dependencies, or `vendor/**` licensing.
- Selected runtime images are copied manually into `packages/assets/**` or a Story asset directory.
- Only the promoted runtime manifest and exact shipped bytes enter the technical Asset Pack digest.
- `art-source/aigc/**` and `references/**` remain excluded from Player and Pages artifacts.

The archive migration and authority synchronization were committed during Phase 1. Future changes follow [`../specs/2026-07-12-aigc-asset-archive-design.md`](../specs/2026-07-12-aigc-asset-archive-design.md) and do not recreate a repository licensing verifier.
