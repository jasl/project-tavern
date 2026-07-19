# SillyMaker features

状态：当前实现能力清单；随公开导出和实际用户流程维护。

本页回答“引擎现在能做什么”。Project Tavern 七日 PoC 的数值、内容和模块划分不属于引擎特性。

## Story authoring and resolution

- Typed `GamePackage`, `GameSimulation`, and `GameplayModule` definitions.
- Separate simulation (`rule | value`) and presentation (`value | text | asset`) patch surfaces.
- Validated, frozen resolution with Story, engine, state-contract, simulation, presentation, asset, and patch-set identity.
- Story-local schemas, deterministic rule providers, command executors, queries, ViewModel projectors, scene graphs, catalogs, and renderer contributions.
- Optional lazily loaded Story tooling and tooling UI.

## Runtime

- One authoritative `GameSession` queue for gameplay dispatch and State replacement.
- Immutable, schema-validated `GameSnapshot` values.
- Serializable purpose-labelled PRNG with rollback-safe command attempts.
- Structured commit, rejection, validation, and fault outcomes.
- Static module composition with explicit State ownership and dependency validation.
- Semantic preview/dispatch and immutable subscription publications for UI and automation.
- Lifecycle restart/rebootstrap and replay-base replacement.

## Persistence and compatibility

- Quick Save, automatic Save, and manual Save slots through a Host persistence facade.
- Canonical Save envelope encoding/decoding and strict import validation.
- Story, state-contract, engine, simulation, and patch-lineage compatibility information.
- Validated managed adoption for compatible simulation changes.
- Atomic record revisions, session lease/fencing, and HMR persistence handoff.
- Browser persistence through IndexedDB; injectable record stores for tests and other Hosts.
- File import/export through Host ports.

## Diagnostics and developer capabilities

- Bounded command log and runtime-failure buffer.
- Privacy-aware DebugBundle export with current identity, replay evidence, and Story diagnostics.
- Best-effort inspection and authoritative replay support.
- Capability-gated debug tools and cheats.
- Story-specific fixture/tooling hooks where a maintained product workflow needs them.
- Browser automation bridge over semantic actions, with revocation when capability or ownership changes.
- HMR invalidation and full runtime rebootstrap based on resolved identity.

## UI and presentation

- React game shell with a central layered stage and runtime error recovery.
- HUD, narrative, workspace overlays, system dialogs, Save UI, and diagnostic export UI.
- Static and paper-doll character renderers with Story-contributed renderer IDs.
- Scene backgrounds, interaction surfaces, normalized hit maps, pointer adaptation, and semantic controls.
- Input routing, focusable code-native controls, settings, symbols, reduced-motion support, and content preferences.
- Asset registry with requested-asset loading, fault diagnostics, and code-native fallback.
- Immutable presentation projection that combines semantic output with local presentation state without becoming gameplay authority.

## Web Host and application delivery

- Explicit Story-to-application composition and React mounting.
- Browser entropy, clock, logging, navigation, files, image loading, and IndexedDB adapters.
- Hash routing and query-driven development capabilities.
- Loader recovery when a Hotfix cannot be admitted.
- Vite development and static Player builds.
- Local Artifact preparation with legal notices and a technical manifest.

## Current non-goals and open design areas

The engine does not currently provide a backend/account service, networked multiplayer authority, runtime LLM, arbitrary script sandbox, ECS, SQL query layer, or a general-purpose database client for UI. These are descriptions of the present implementation, not permanent bans.

State access and persistence may be redesigned. The current exploratory direction is recorded in [the typed StateStore proposal](proposals/typed-state-store.md). Any adopted design should replace or simplify existing machinery rather than create two competing authoritative states.

The current Project Tavern Story is a worked integration example. It should not be used to infer that every future Story needs its exact calendar, actor, inventory, facility, Tavern, workflow, progression, or narrative module split.
