# Story authoring with SillyMaker

状态：当前 Story 组合模型。Project Tavern PoC 是实例，不是模板合同。

## 1. What a Story owns

A Story owns the game-specific parts of a playable application:

- stable identity and state-contract description;
- validated gameplay data and named deterministic rule providers;
- the State shape and GameplayModules that own it;
- commands, rejections, facts, debug commands, queries, and ViewModels;
- text, assets, scene graph, interactions, semantic actions, and renderer contributions;
- Story-specific application composition and optional tooling.

Generic session, persistence, diagnostics, UI primitives, and browser adapters stay in SillyMaker packages. The Story consumes those packages through workspace public exports.

## 2. Recommended composition sequence

### Define identity and data

Give the Story a stable ID/revision and validate content or balance data at the boundary. Stable IDs, not React components or object identity, connect State to Story content.

Treat a revision as a compatibility statement. Change it when the corresponding Story/state contract requires migration; do not increment every identity field simply because application code was rebuilt.

### Define GameplayModules

Each stateful module declares its owned State slot(s), schema, initial State, public read ports, owner-scoped proposals/apply behavior, and local invariants. Dependencies should name capabilities another module intentionally exposes.

The aggregate State should align with the modules the Story actually composes. Avoid a universal object containing optional fields for every possible module. Stateless gameplay services can remain named pure capabilities rather than fake State.

### Compose the simulation

Use `defineGameSimulation` to bind:

- the exact module tuple;
- aggregate State, command, fact, rejection, and debug schemas;
- bootstrap and initial-State creation;
- gameplay and debug command executors;
- `createQueries(State)`;
- immutable ViewModel projection.

Cross-module commands remain Story-owned orchestration. They gather validated owner proposals and commit a complete candidate or reject without changing the current Snapshot. Deterministic rule code uses the supplied serializable RNG capabilities rather than ambient time or `Math.random()`.

### Design queries and semantic actions

Queries are the read boundary for gameplay meaning. Return narrow, player-safe DTOs rather than raw State or content registries. Compute availability, explanations, forecasts, and execution from shared evaluators when they must agree.

Semantic actions adapt concrete UI/automation intent into typed Story commands:

```text
Semantic invocation -> preview -> confirmation/form/choice
                    -> Session dispatch -> projected result
```

Parameterized actions should expose bounded input catalogs and validation metadata without handing UI a generic State client. The command executor re-evaluates at the Session queue front before committing.

### Define presentation

The presentation facet contains validated Story-owned data:

- localized text catalogs;
- promoted asset packs and stable asset IDs;
- SceneGraph and renderer IDs;
- character rigs/appearances;
- interaction targets, hit maps, and presentation values.

Story React contributions resolve stable renderer IDs inside the application closure. They receive immutable semantic/presentation projections and send semantic or presentation intents. Scene data that participates in resolution should stay plain and serializable.

### Create the Story package

Combine simulation and presentation facets with `defineGamePackage`. Define separate simulation and presentation patch surfaces only for reviewed bootstrap-time replacement points. Resolve the package before creating the Session so provenance describes the actual program in use.

The current PoC demonstrates this in:

- `game/stories/poc/src/story-definition.ts`
- `game/stories/poc/src/gameplay/game-simulation.ts`
- `game/stories/poc/src/application/create-poc-game-runtime.ts`
- `game/stories/poc/src/application/create-poc-presentation-runtime.ts`
- `game/stories/poc/src/application/entry.tsx`

Reuse the engine pattern, not the Tavern-specific ten-module partition, names, numbers, or content structure.

### Compose a Host application

The Web application normally:

1. creates a `GameHostV1` (IndexedDB, files, clock, navigation, logging, entropy);
2. resolves the Story and optional authorized Hotfixes;
3. creates Session, semantic, persistence, diagnostics, capability, and debug ports;
4. creates presentation stores, input/interaction controllers, assets, and renderer contributions;
5. mounts one React application root;
6. owns disposal and HMR rebootstrap.

The application is the composition root. Base, UI, and Web must not import a concrete Story to make this happen.

## 3. Persistence considerations

Save only plain versioned data and stable IDs. A Save must not contain Store clients, derived indexes, functions, component instances, DOM values, or Host handles.

When changing State:

- decide whether old Saves remain valid;
- update schema and state-contract identity deliberately;
- provide an explicit migration/adoption path when compatibility is promised;
- test import failure as well as successful migration;
- make load establish one new authoritative replay base.

Presentation-only changes should not invalidate gameplay State. Internal data-structure or index changes should not change Save compatibility when canonical exported State is unchanged.

## 4. Story testing

Prefer small in-memory Story builders for most tests. Cover:

- initial State and module invariants;
- command success and zero-write rejection/fault behavior;
- deterministic RNG outcomes;
- query/preview/dispatch parity;
- State reference and Save validation;
- semantic publications and important narrative/gameplay routes;
- Story application composition and player-facing browser flows.

Do not freeze provisional balance or a large command corpus merely because it was once used for calibration. Keep golden/fixture bytes only when the current game design or an external compatibility format intentionally depends on them.

## 5. Tooling and Hotfixes

Story tooling is optional and should exist for a maintained authoring, debugging, migration, or content workflow. It may be lazy-loaded so ordinary play does not pay its cost. Debug and cheat operations remain capability-gated.

Hotfixes are deterministic bootstrap-time replacements on named patch slots. They are appropriate when a deployed Story needs a controlled correction, not as a substitute for ordinary source changes or a general mod scripting API. A simulation-changing Hotfix must participate in compatibility/provenance decisions; a presentation-only patch must not claim authority to migrate State.

## 6. Evolving the model

The current module/owner/query model can be redesigned. [Typed StateStore](proposals/typed-state-store.md) records one candidate direction. An adopted replacement should make Story authoring simpler while retaining a single authoritative State, explicit write authority, atomic commands, testable queries, and clean persistence boundaries.
