# Project Instructions

## Mission

This repository contains **SillyMaker**, a reusable React and TypeScript game engine, and **Project Tavern**, the game used to develop it. The first seven-day Tavern implementation is an engineering reference, not a frozen product design. The active work may redesign gameplay, engine APIs, state management, presentation, and authoring workflows.

Prefer a coherent maintainable system over compatibility with the completed first-PoC implementation. When a durable public contract changes, update its documentation and tests with the code.

## Active sources of truth

Read only the documents relevant to the change:

- `docs/engine/architecture.md` — current package and runtime architecture.
- `docs/engine/features.md` — implemented engine capabilities and boundaries.
- `docs/engine/development.md` — setup, tests, and maintenance workflow.
- `docs/engine/story-authoring.md` — current Story composition model.
- `docs/engine/build-and-release.md` — local Player build and Artifact workflow.
- `docs/game/README.md` — current Project Tavern design status.
- `docs/policies/licensing.md` and `docs/policies/assets-and-references.md` — durable legal and source-material policy.
- Root legal files (`LICENSE.md`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `TRADEMARKS.md`) — controlling legal scope.

`docs/archive/2026-07-first-poc-goal/**` is a historical snapshot. It is not an implementation plan, acceptance contract, required reading set, or source of current constraints. Do not restore its Phase order, checkpoint, materialization, exact-host, balance-freeze, or commit choreography unless a new active design explicitly needs a particular idea.

## Architecture baseline

- `@sillymaker/base` owns generic contracts, Story authoring primitives, deterministic runtime state, sessions, persistence orchestration, replay, and diagnostics. It has no React, DOM, browser-storage, or Project Tavern dependency.
- `@sillymaker/ui` owns reusable React presentation, input, interaction, overlays, diagnostics UI, assets, characters, stages, and semantic-publication bridges.
- `@sillymaker/web` owns browser hosting, IndexedDB persistence adapters, mounting, routing, capabilities, automation, pointer input, and development rebootstrap.
- `game/stories/**` owns game-specific state, rules, content, projections, application composition, and Story tooling.
- Workspace packages consume one another through declared package exports and `workspace:*` dependencies, not another package's `src/**` path.

The current authoritative flow is:

```text
Story definition -> resolved GameSimulation -> GameSession/GameSnapshot
  -> GameQueries -> SemanticPublication -> RuntimePresentationPublication -> renderer
```

One session owns authoritative state and serializes authoritative operations. UI and automation use semantic/application ports rather than direct State setters. Browser storage persists versioned plain data; it is not the live simulation database.

This baseline describes the implementation, not an immutable constitution. Architectural changes are welcome when they preserve clear ownership, deterministic behavior where required, atomic failure semantics, and a documented migration path.

## Development workflow

- The supported environment is the minimum declared by the root `package.json`: Node.js >= 22.12.0 and pnpm >= 11.0.0. Do not require one exact host version, package-manager patch version, browser revision, machine attestation, or shell layout.
- Install with `pnpm install`. Use `pnpm dev` for local development and `pnpm check` as the canonical local code-quality and product-behavior check. `pnpm verify` may exist as a compatibility alias only.
- Use `pnpm test` for automated product/engine tests, `pnpm test:e2e` when browser behavior is affected, and the commands documented in `docs/engine/build-and-release.md` for Player builds.
- Keep ESM, TypeScript project references, exact dependency versions, and the shared lockfile unless an intentional tooling change updates them.
- Tests should protect observable engine behavior, game rules, public data formats, compatibility promises, or real user flows. Do not add fixtures or scripts whose only purpose is to enforce a plan phase, task commit, exact file inventory, command order, clean Git tree, host attestation, or frozen provisional balance output.
- Prefer focused tests near the changed behavior, then run the relevant broader command. Regenerate a fixture only when it represents a maintained product format or user-visible compatibility contract.
- Keep implementation files focused and public interfaces explicit. Use serializable project randomness in deterministic gameplay paths; avoid `Math.random()` there.
- Update the active technical documentation when package roles, public exports, state ownership, persistence, Story authoring, build output, or supported workflows change.

## Product and Story work

- Treat the current Tavern PoC modules, formulas, thresholds, reference strategies, and golden outputs as replaceable examples.
- New gameplay design belongs in active documents under `docs/game/`; do not reactivate archived PoC specifications by editing them in place.
- Story state should remain plain, versioned, validated data. Commands must either commit a complete valid result or leave authoritative state unchanged.
- Presentation code renders immutable projections and sends semantic intents. It does not become a second gameplay-state authority.
- A future typed in-memory state store is an open design option described in `docs/engine/proposals/typed-state-store.md`, not a required migration or accepted API.

## Licensing and source-material boundaries

- Copyright holder: `Jun Jiang (jasl)`.
- Generic SillyMaker code in `engine/packages/base`, `engine/packages/ui`, and `engine/packages/web` is MIT. Project Tavern software is generally PolyForm Noncommercial 1.0.0. Original narrative, localization, art, audio, design, and repository documentation are generally CC BY-NC-SA 4.0. `LICENSE.md` and file/package-specific notices control.
- Never describe the whole repository or Project Tavern game as MIT or open source. Composite builds do not relicense restricted game software or content.
- Intentionally copied third-party material belongs under `vendor/**` and retains its own terms. npm dependencies retain their own terms.
- `references/` is ignored, untracked research input. Register it in `docs/research/reference-register.md`; production code, tests, generators, and artifacts must not depend on it or copy distinctive third-party material from it.
- AIGC source archives and promoted runtime assets follow `docs/policies/assets-and-references.md`. Runtime digests establish technical identity, not copyright provenance or approval.
- Restricted game/content areas do not accept external contributions without an owner-approved written CLA or copyright assignment. MIT engine contributions are inbound=outbound MIT.

## Generated and local files

Do not commit dependency directories, build output, coverage, local saves, diagnostics, generated exports, secrets, ignored references, editor-local state, or disposable calibration data. Extend `.gitignore` when new tools create persistent local output.
