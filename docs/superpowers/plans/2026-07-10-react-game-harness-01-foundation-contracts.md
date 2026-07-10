# React Game Harness Phase 1 Foundation and Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the pinned production toolchain, exhaustive v1 public contracts, deterministic serialization/RNG kernel, validated Story bootstrap, and reproducible Story/Engine/Application identities that every later phase consumes.

**Architecture:** Keep all deterministic types and logic under `src/engine/`; a neutral, build-time `GameProfile` statically composes named modules behind one `CommandCoordinator`; Story packages only depend on the public engine contract barrel; app/runtime/UI remain consumers. Runtime validation uses Zod, imported JSON uses a strict pre-scan before `JSON.parse`, canonical bytes are project-owned, and all randomness is an explicit transactional `xorshift32-v1` capability.

**Tech Stack:** Node.js 24.18.0, pnpm 11.11.0, TypeScript 7.0.2 authoritative CLI plus `@typescript/typescript6` 6.0.2 wrapping the TS 6.0.3 compatibility API, React 19.2.7, Vite 8.1.4, Zod 4.4.3, jsonc-parser 3.3.1, @noble/hashes 2.2.0, Vitest 4.1.10, fast-check 4.9.0, ESLint 9.39.4, dependency-cruiser 18.0.0, Prettier 3.9.5, Stylelint 17.14.0.

## Global Constraints

- Follow the roadmap global constraints and `docs/superpowers/specs/2026-07-10-react-game-harness-design.md`.
- Registry snapshot is 2026-07-10. TypeScript 7.0.2 is the authoritative `tsc`. Because TS7.0 has no stable Compiler API and `typescript-eslint@8.63.0` declares `<6.1.0`, install the official TS6 compatibility package under the `typescript` name only for third-party tooling; never run TS6 as the project typecheck or import its Compiler API from project code.
- Use CSS Modules plus a small global token layer; do not add a component-style framework.
- Use one root package, not a monorepo, until a second independently published package exists.
- Do not create domain behavior, browser persistence, full UI, or seven-day content in this phase beyond minimal fixtures required to prove contracts.
- No public `any`, mutable public arrays, stringly typed Story IDs, arbitrary callback registries, or generic JSON state bags.
- Every exported union has an explicit `...Kinds` or `...Codes` constant and an exhaustive compile-time/runtime test.
- `pnpm verify:foundation` is the phase gate and must not modify tracked files.

---

## File Map

```text
docs/superpowers/specs/2026-07-10-engine-contract-catalog.md # field-level ABI authority implemented verbatim
.node-version                         # exact Node runtime
.nvmrc                               # same exact Node runtime
package.json                         # exact dependencies and scripts
pnpm-workspace.yaml                  # install-script allowlist
pnpm-lock.yaml                       # frozen resolution
tsconfig.app.json                    # browser source
tsconfig.node.json                   # Vite and scripts
tsconfig.test.json                   # Vitest/test support
vite.config.ts                       # Story/flavor-aware build entry
vitest.config.ts                     # deterministic test config
eslint.config.js                     # code and restricted globals
.dependency-cruiser.cjs              # architectural dependency rules
.prettierrc.json                     # formatting contract
.prettierignore                      # generated, reference, report, and binary-source exclusions
stylelint.config.mjs                 # CSS contract
src/app/                             # bootstrap only
src/engine/contracts/                # catalog-backed public v1 TS/Zod ABI, including Save/Debug contracts
src/engine/core/                     # canonical JSON, digest, RNG, transaction
src/engine/profile/                  # GameProfile, module ownership/ports/dependencies, CommandCoordinator
src/stories/tavern-poc/              # minimal contract fixture only
src/stories/e2e/                     # independent contract fixture
src/test-support/                    # builders and contract matchers
scripts/                             # Story CLI and provenance generation
```

### Task 1: Pin the toolchain and prove the minimal app shell

**Files:**

- Create: `.node-version`
- Create: `.nvmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.test.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `stylelint.config.mjs`
- Create: `index.html`
- Create: `src/app/App.test.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/main.tsx`
- Create: `src/app/app.css`
- Create: `src/vite-env.d.ts`

**Interfaces:**

- Consumes: repository docs only.
- Produces: exact runtime/package contract, a Vite React entry, and initial format/lint/type/test/build commands.

- [ ] **Step 1: Write the exact runtime pins**

`.node-version` and `.nvmrc` both contain exactly:

```text
24.18.0
```

- [ ] **Step 2: Create the exact package manifest and lifecycle allowlist**

Use exact versions, never caret or tilde ranges:

```json
{
  "name": "game-harness",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.11.0",
  "engines": { "node": "24.18.0", "pnpm": "11.11.0" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "format:check": "prettier --check .",
    "format:write": "prettier --write .",
    "lint:code": "eslint .",
    "lint:styles": "stylelint \"src/**/*.css\"",
    "lint": "pnpm lint:code && pnpm lint:styles",
    "typecheck:app": "tsc -p tsconfig.app.json --noEmit",
    "typecheck:node": "tsc -p tsconfig.node.json --noEmit",
    "typecheck:test": "tsc -p tsconfig.test.json --noEmit",
    "typecheck": "pnpm typecheck:app && pnpm typecheck:node && pnpm typecheck:test",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify:foundation": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test"
  },
  "dependencies": {
    "@noble/hashes": "2.2.0",
    "@radix-ui/react-dialog": "1.1.19",
    "@radix-ui/react-popover": "1.1.19",
    "@radix-ui/react-scroll-area": "1.2.14",
    "@radix-ui/react-tabs": "1.1.17",
    "@radix-ui/react-tooltip": "1.2.12",
    "idb": "8.0.3",
    "jsonc-parser": "3.3.1",
    "lucide-react": "1.24.0",
    "motion": "12.42.2",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "react-router-dom": "7.18.1",
    "zustand": "5.0.14",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.12.1",
    "@eslint/js": "9.39.4",
    "@playwright/test": "1.61.1",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "@vitest/coverage-v8": "4.1.10",
    "@vitest/eslint-plugin": "1.6.22",
    "dependency-cruiser": "18.0.0",
    "eslint": "9.39.4",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-playwright": "2.10.5",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.3",
    "fake-indexeddb": "6.2.5",
    "fast-check": "4.9.0",
    "globals": "17.7.0",
    "jsdom": "29.1.1",
    "prettier": "3.9.5",
    "sharp": "0.35.3",
    "stylelint": "17.14.0",
    "stylelint-config-standard": "40.0.0",
    "tsx": "4.23.0",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-7": "npm:typescript@7.0.2",
    "typescript-eslint": "8.63.0",
    "vite": "8.1.4",
    "vitest": "4.1.10"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - .

onlyBuiltDependencies:
  - esbuild
  - sharp
```

`.prettierignore` contains exactly:

```text
references/
node_modules/
dist/
build/
coverage/
reports/
playwright-report/
blob-report/
test-results/
artifacts/
diagnostics/
save-data/
art-source/**/*.png
art-source/**/*.webp
art-source/**/*.jpg
art-source/**/*.jpeg
art-source/**/*.psd
art-source/**/*.kra
.generated/
generated/
.vite/
.vitest/
.tmp/
tmp/
```

ESLint is intentionally pinned to `9.39.4`: `eslint-plugin-jsx-a11y@6.10.2` does not declare ESLint 10 peer compatibility.

- [ ] **Step 3: Install exactly and verify the lockfile**

Run: `corepack enable && corepack prepare pnpm@11.11.0 --activate && pnpm install`

Then run:

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
```

Expected: install exits 0; `pnpm-lock.yaml` exists; only `esbuild` and `sharp` run lifecycle builds; authoritative `tsc` prints `Version 7.0.2`; compatibility-only `tsc6` prints `Version 6.0.3` from the pinned wrapper's locked dependency. Project scripts never invoke `tsc6`.

- [ ] **Step 4: Configure strict TypeScript and deterministic tests**

All TS configs enable:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "noImplicitReturns": true,
  "noPropertyAccessFromIndexSignature": true,
  "isolatedModules": true,
  "noUncheckedSideEffectImports": true,
  "verbatimModuleSyntax": true,
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "target": "ES2023"
}
```

Do not depend on TypeScript 7 defaults. `tsconfig.app.json` explicitly uses `rootDir: "./src"`, `types: ["vite/client"]`, DOM libs, and `jsx: "react-jsx"`; `tsconfig.node.json` uses `rootDir: "."` and `types: ["node"]`; `tsconfig.test.json` uses `rootDir: "."`, `types: ["node", "vite/client", "vitest/globals"]`, DOM libs, and `jsx: "react-jsx"`. Do not add `baseUrl`, old module resolution modes, or `ignoreDeprecations`.

`vitest.config.ts` uses `environment: "jsdom"`, clears/restores mocks, fixes timezone to UTC, and includes `src/**/*.test.{ts,tsx}` plus `scripts/**/*.test.ts`.

- [ ] **Step 5: Write the failing shell test**

```tsx
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "./App";

it("renders the harness bootstrap surface", () => {
  render(<App />);
  expect(screen.getByRole("main", { name: "酒馆游戏开发环境" })).toBeVisible();
});
```

- [ ] **Step 6: Run the focused test and confirm the intended failure**

Run: `pnpm vitest run src/app/App.test.tsx`

Expected: FAIL because `./App` does not exist.

- [ ] **Step 7: Implement the minimal semantic shell**

```tsx
export function App() {
  return <main aria-label="酒馆游戏开发环境">正在初始化 Story…</main>;
}
```

- [ ] **Step 8: Run narrow and static verification**

Run: `pnpm vitest run src/app/App.test.tsx && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build`

Expected: all commands exit 0; Vite emits only ignored `dist/` output.

- [ ] **Step 9: Commit the pinned scaffold**

```bash
git add .node-version .nvmrc package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.app.json tsconfig.node.json tsconfig.test.json vite.config.ts vitest.config.ts eslint.config.js .prettierrc.json .prettierignore stylelint.config.mjs index.html src/app/App.test.tsx src/app/App.tsx src/app/main.tsx src/app/app.css src/vite-env.d.ts
git commit -m "build: pin the React harness toolchain"
```

### Task 2: Freeze exhaustive v1 Engine and Story contracts

**Files:**

- Create: `src/engine/contracts/brand.ts`
- Create: `src/engine/contracts/numeric.ts`
- Create: `src/engine/contracts/ids.ts`
- Create: `src/engine/contracts/rng.ts`
- Create: `src/engine/contracts/ledger.ts`
- Create: `src/engine/contracts/state.ts`
- Create: `src/engine/contracts/workflows.ts`
- Create: `src/engine/contracts/commands.ts`
- Create: `src/engine/contracts/domain-facts.ts`
- Create: `src/engine/contracts/rejections.ts`
- Create: `src/engine/contracts/modifiers.ts`
- Create: `src/engine/contracts/effects.ts`
- Create: `src/engine/contracts/narrative.ts`
- Create: `src/engine/contracts/story-rules.ts`
- Create: `src/engine/contracts/story-package.ts`
- Create: `src/engine/contracts/queries.ts`
- Create: `src/engine/contracts/provenance.ts`
- Create: `src/engine/contracts/save-record.ts`
- Create: `src/engine/contracts/diagnostics.ts`
- Create: `src/engine/contracts/debug-commands.ts`
- Create: `src/engine/contracts/strict-json.ts`
- Create: `src/engine/contracts/index.ts`
- Create: `src/engine/contracts/contracts.test.ts`
- Create: `src/test-support/type-assertions.ts`

**Interfaces:**

- Consumes: Zod, strict TS config, and the complete field-level authority in `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md`.
- Produces: the only public Engine/Story/Save/Debug ABI imported by all later phases. Phase 3 implements persistence/diagnostic behavior against these contracts; it does not redefine runtime copies.

- [ ] **Step 1: Write the contract catalog conformance test first**

Create one table-driven test case for every catalog object and union. The command discriminants are exactly:

```ts
export const gameCommandKinds = [
  "run.start",
  "policy.choose",
  "inventory.buy",
  "actor.prepare_food",
  "actor.rest",
  "story.action.start",
  "facility.choose",
  "tavern.plan.set",
  "tavern.opening.start",
  "tavern.opening.continue",
  "tavern.opening.finalize",
  "world.action.begin",
  "world.action.complete",
  "narrative.advance",
  "narrative.choose",
  "calendar.advance_phase",
  "levy.pay",
] as const;
```

Also assert the exact catalog discriminants for `DomainFactV1`, `RejectionReasonV1`, `CommandExecutionResultV1`, `CommandExecutionDiagnosticsV1`, `ModifierV1`, `EffectIntentV1`, `ProgressionEffectIntentV1`, `NarrativeNodeV1`, `ConditionV1`, `StageCueV1`, `EventTriggerV1`, `SchedulerContextV1`, `StoryAssetEntryV1`, `StoryValueV1`, `ActiveWorkflowV1`, `PreviewChangeV1`, `DebugCommandV1`, `DebugCommandValidationErrorV1`, `DebugCommandValidationErrorForV1<C>`, `ReplayableDebugExecutionResultV1`, `DebugCommandOperationResultForV1<C>`, `RuntimeOperationFaultV1`, `StrictJsonErrorCodeV1`, `ImportValidationErrorCodeV1`, and `ImportCompatibilityOutcomeV1`. Test that each exported Zod object rejects one unknown key and each union rejects one unknown kind/code. Correlate Game-source log entries with committed/rejected/faulted and Debug-source entries with committed/faulted only; a rejected Debug log entry must fail TS and Schema. Prove a replayable Debug command cannot type/schema-return `anchor_established`, a fixture load cannot return `committed`, and each generic call can return only validation errors whose `commandKind` exactly equals that command's kind plus its correlated fault/success branches. `EndingResultV1.effects` accepts all three Progression kinds and rejects every other otherwise-valid EffectIntent. Compatibility tests cover an exact empty mismatch tuple, every single mismatch, all four simultaneous mismatches in frozen order, and a rejected non-identity error.

Add named field-level vectors for the contracts most likely to be accidentally weakened later: every `RejectionReasonV1` code with its exact `details` keys, including preparation-limit and levy-due blocking; all three ordered arrays of `ConfirmationMetadataV1`; Action visibility/availablePhases/occupation plus resolved `ActionViewV1.occupiedPhases` and `directCommand`; both generic `CommandPreviewV1<C>` branches and exact command-kind-driven non-null/null confirmation type; the initial-only RunStart command/allowed/null-confirmation projection and all null cases; every non-empty LifePolicy option/command/preview field plus Schema equality refinement and illegal mismatches; the three Tavern Opening control kinds, exact command-kind correlation, preview-command equality, and illegal cross-branch pairs; `TavernPreviewV1` current/baseline bases and prospective/committed opening-cost breakdowns; all three `ObligationForecastV1` variants; the four-progress two-step `WorldActionDefinitionV1`/`WorldActionSessionV1`; every `EventTriggerV1`/`SchedulerContextV1` variant in catalog order; `RunStateV1.initialSeed`/`completion`; `StoryRuntimeStateV1.resolvedChecks`; exact Save metadata and four-field `SaveCompatibilityKeyV1`; `CommandExecutionAttemptV1` with committed/rejected/faulted diagnostics; top-level `CommandLogEntryV1.source` narrowing that makes Debug+rejected fail; every correlated `DebugCommandValidationErrorV1`, including exact forbidden-Aura-target and duration-policy payloads, and negative TS/Zod tests for every illegal command/reference, command/field, and command/conflict pair; every correlated Runtime operation-fault category/code with cross-category negative tests and every Debug UI overlay ID (including `life_policy`); and all three correlated `EngineFaultV1` branches, proving only `story_rule` has a non-null `ruleSlot` and that each category rejects codes from the other two. These are conformance cases, not interface snapshots with optional catch-alls.

- [ ] **Step 2: Run the contract test and confirm the intended failure**

Run: `pnpm vitest run src/engine/contracts/contracts.test.ts`

Expected: FAIL because the catalog-backed contract modules do not exist.

- [ ] **Step 3: Implement catalog §§1–2 primitives verbatim**

Implement `Brand`, every numeric alias/range, Digest/UTC instant, every authored/runtime ID parser, and every fixed enum from catalog §§1–2. Authored IDs use the exact regex/UTF-8 limit; runtime IDs use their documented deterministic formats; all JSON numbers are safe integers. Refine every IntegerRange with `min <= max`, nonnegative quantity/demand/sales ranges, and in-range Story integer defaults. Export TS types, strict Zod schemas, parse helpers, and the literal constants used by conformance tests.

- [ ] **Step 4: Implement catalog §3 state and workflow contracts**

Implement `GameSnapshotV1`, `GameStateV1`, `EngineOwnedStateV1`, Actors, Calendar, Inventory, Aura, Facilities, Tavern, Story runtime, ledger, `OpeningSessionV1`, and `WorldActionSessionV1` exactly as catalog §3. `RunStateV1.initialSeed` and `completion`, plus `StoryRuntimeStateV1.resolvedChecks`, are required persisted Snapshot fields rather than derived Runtime metadata. Arrays that the catalog marks stable/sorted have a shared uniqueness/order refinement. Do not add diagnostics/provenance/UI data to Snapshot.

Opening checkpoint is the literal union `started | middle | before_finalize | ready_to_finalize`; `blockingEvent` is explicit nullable state. This is required before Phase 2 implements Scheduler behavior.

- [ ] **Step 5: Implement catalog §§4–5 commands, DomainFacts, and structured rejections**

Implement `GameCommandV1` with `story.action.start`, `facility.choose` (closed build/skip choice), and `tavern.opening.continue`. Copy every `DomainFactV1` payload and every rejection `details` object from the catalog; in particular `action.unavailable`, WorldAction, Narrative, Opening, and workflow rejections keep their exact typed details. No `message`, arbitrary primitive bag, optional catch-all, or caller-parsed text is allowed. Keep Snapshot `Story Fact` types distinct from non-authoritative dispatch `DomainFactV1`.

- [ ] **Step 6: Implement catalog §§6–7 modifiers, effects, Narrative IR, and Story data**

Implement every Modifier/EffectIntent payload, including `calendar.ap.adjust`, `reputation.adjust`, and `ledger.append`; `modifier.add` is restricted to the current OpeningSession. Assert the union contains no `cash.adjust` or generic Story cash shortcut: `ledger.append` is the sole arbitrary Story cash/valuation intent, while the closed `inventory.grant` composite automatically creates only its Catalog-defined story-reward valuation entries and Engine-owned transactions append their own typed entries. Implement the non-recursive Condition DSL including day bounds, helper-unlocked tier semantics and persistent facility-opportunity decisions; all twelve Narrative node variants (including `eventCheckpoint`); EventTrigger/SchedulerContext terminal-safe restrictions; stage cues; Story/Action visibility, submission-window and occupation definitions; ModifierSource definitions; WorldAction definitions; confirmation metadata; Story content/balance/initial state; fallback/runtime-image asset manifest; `StoryPackageV1`; and development fixtures exactly as catalog §§6–7.

- [ ] **Step 7: Implement the four catalog §8 StoryRules groups**

Implement exact strict input/output schemas for Demand, Tavern, Checks, and Endings, plus `RuleRngV1` and all seven `StoryRuleSlotV1` values. Also implement every catalog §8.1 query/projection contract, including unavailable-command rejection arrays, confirmation-bearing previews, the initial RunStart control, LifePolicy selection options, the correlated Start/Continue/Finalize Tavern workflow control, `previewTavernPlan` with exact AP/both-stamina/wage/fee/modifier/shortage costs and active-baseline semantics, UI-safe frozen demand, all three `ObligationForecastV1` variants (`current_gap | committed_plan_conservative | final`), resolved-check history, and run completion. Add cross-contract assertions that each Story action projects the exact `{ kind: "story.action.start", actionId }`, every parameterized WorldAction projects `directCommand=null`, system/workflow controls have no Action presentation but do have their dedicated typed query, and preview/visibility/availability/rejection types share the catalog discriminants. The function-bearing `StoryRulesV1` object is the only authored executable extension; every input/output remains plain data and has a strict Schema. Reject thenables at the rule-call boundary in Task 4.

- [ ] **Step 8: Establish catalog §§9–10 provenance, persistence, diagnostics, and JSON public contracts**

Create the public contracts now, even though Phase 3 supplies their browser services:

```text
src/engine/contracts/provenance.ts     BuildProvenanceV1 and separated Story/Engine identity
src/engine/contracts/save-record.ts    SaveSlotMetadataV1 and SaveRecordV1
src/engine/contracts/diagnostics.ts     CommandLog, fault, UI context, DebugBundleV1
src/engine/contracts/debug-commands.ts replayable vs anchoring DebugCommandV1 plus exact runtime kind arrays
src/engine/contracts/strict-json.ts     limits, errors, import-stage errors, function signatures
```

`debug-commands.ts` exports `replayableDebugCommandKinds`, `anchoringDebugCommandKinds`, and their ordered concatenation `debugCommandKinds`; their literals and order are exactly the catalog union order and compile-time `satisfies` checks keep the arrays exhaustive. The contract test serializes SaveRecords whose Snapshots respectively contain a non-default `initialSeed`, one ordered `resolvedChecks` entry, and terminal `completion`; it also serializes one active OpeningSession DebugBundle, one rejected Game-source CommandLog entry, one faulted Debug-source entry, every Debug validation/operation result, one anchoring Debug failure, one DebugBundle containing every Runtime operation-fault category plus every overlay ID, every DebugCommand kind, and both strict JSON limit profiles. Assert slot Story/sequence/digest equality, the exact four-field compatibility key, required `runtimeFailures`, and that Save metadata has no compatibility-taint/adoption escape hatch. No runtime contract may import IDB, DOM, React, or a concrete Story.

- [ ] **Step 9: Prove runtime and compile-time exhaustiveness**

Parse one valid value per discriminant; reject unknown keys/kinds; use `assertNever`; deep-freeze parsed outputs; prove cross-brand assignment fails under `tsc` with an expected error. Add type assertions that Story rules cannot return a GameState fragment and that DebugBundle/Save provenance keeps separate `story` and `engine` identities.

Run: `pnpm vitest run src/engine/contracts/contracts.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 10: Commit the v1 ABI**

```bash
git add src/engine/contracts/brand.ts src/engine/contracts/numeric.ts src/engine/contracts/ids.ts src/engine/contracts/rng.ts src/engine/contracts/ledger.ts src/engine/contracts/state.ts src/engine/contracts/workflows.ts src/engine/contracts/commands.ts src/engine/contracts/domain-facts.ts src/engine/contracts/rejections.ts src/engine/contracts/modifiers.ts src/engine/contracts/effects.ts src/engine/contracts/narrative.ts src/engine/contracts/story-rules.ts src/engine/contracts/story-package.ts src/engine/contracts/queries.ts src/engine/contracts/provenance.ts src/engine/contracts/save-record.ts src/engine/contracts/diagnostics.ts src/engine/contracts/debug-commands.ts src/engine/contracts/strict-json.ts src/engine/contracts/index.ts src/engine/contracts/contracts.test.ts src/test-support/type-assertions.ts
git commit -m "feat: freeze the v1 engine and story contracts"
```

### Task 3: Implement bounded strict JSON, canonical bytes, and domain-separated digests

**Files:**

- Create: `src/engine/core/strict-json.ts`
- Create: `src/engine/core/strict-json.test.ts`
- Create: `src/engine/core/canonical-json.ts`
- Create: `src/engine/core/canonical-json.test.ts`
- Create: `src/engine/core/digest.ts`
- Create: `src/engine/core/digest.test.ts`
- Create: `src/test-support/fixtures/canonical-json-vectors.ts`

**Interfaces:**

- Consumes: Task 2 `src/engine/contracts/strict-json.ts`, the exact catalog §10 signatures/codes, `jsonc-parser`, and `@noble/hashes/sha2.js`.
- Produces: `parseStrictJson`, `canonicalJsonBytes`, and domain-separated SHA-256 functions.

- [ ] **Step 1: Write strict-import failure cases first**

Cover invalid UTF-8, BOM, duplicate members, `__proto__`, `prototype`, `constructor`, comments, trailing commas, depth 65, collection length 10,001, 100,001 total nodes, a 256 KiB+1 string, lone surrogates, fractional/unsafe integers, `-0`, and bytes above the caller limit. Assert the exact `StrictJsonErrorCodeV1` from catalog §10, an optional offset/JSON Pointer only, and no partial value.

- [ ] **Step 2: Confirm the strict parser test fails**

Run: `pnpm vitest run src/engine/core/strict-json.test.ts`

Expected: FAIL because `parseStrictJson` is missing.

- [ ] **Step 3: Implement pre-scan then parse**

Use a fatal UTF-8 decoder plus `jsonc-parser` scanner/visitor to reject the catalog cases before materialization. Only then call `JSON.parse`.

```ts
type StrictJsonResultV1 =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: StrictJsonErrorV1 };

function parseStrictJson(
  bytes: Uint8Array,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): StrictJsonResultV1;
```

Keep syntax/limit errors separate from later Zod/domain errors.

- [ ] **Step 4: Write canonical byte and digest vectors before implementation**

Include RFC 8785 ordering/number/string vectors and every `CanonicalJsonErrorCodeV1` rejection vector from catalog §10: sparse arrays, `undefined`, functions, getters, custom prototypes, cycles, non-finite/fractional/unsafe numbers, `-0`, and lone surrogates. Assert exact error code and JSON Pointer. In `digest.test.ts`, freeze exact bytes for all four domain separators, same-value/different-domain inequality, canonical-order equality, one-byte input change, lowercase 64-hex formatting, and invalid canonical input propagation.

- [ ] **Step 5: Confirm canonical and digest tests fail**

Run: `pnpm vitest run src/engine/core/canonical-json.test.ts src/engine/core/digest.test.ts`

Expected: FAIL because canonicalization and domain-separated digest implementations are missing.

- [ ] **Step 6: Implement project-owned canonicalization**

`canonicalJsonBytes(value)` recursively validates primitives, sorts object names by UTF-16 code units, preserves array order, uses ECMAScript JSON number serialization, emits no whitespace, never normalizes strings, and returns UTF-8 `Uint8Array` without mutating input.

- [ ] **Step 7: Implement domain-separated SHA-256**

```ts
type DigestDomain =
  | "game-harness:story:v1"
  | "game-harness:engine:v1"
  | "game-harness:application:v1"
  | "game-harness:state:v1";

function digestCanonical(
  domain: DigestDomain,
  value: unknown,
): `sha256:${string}` {
  const prefix = new TextEncoder().encode(`${domain}\0`);
  return formatDigest(sha256(concatBytes(prefix, canonicalJsonBytes(value))));
}
```

`formatDigest` emits exactly 64 lowercase hexadecimal characters after `sha256:`.

- [ ] **Step 8: Run focused and property tests**

Run: `pnpm vitest run src/engine/core/strict-json.test.ts src/engine/core/canonical-json.test.ts src/engine/core/digest.test.ts`

Expected: PASS; arbitrary JSON-shaped objects canonicalize identically regardless of insertion order.

- [ ] **Step 9: Commit serialization and digest primitives**

```bash
git add src/engine/core/strict-json.ts src/engine/core/strict-json.test.ts src/engine/core/canonical-json.ts src/engine/core/canonical-json.test.ts src/engine/core/digest.ts src/engine/core/digest.test.ts src/test-support/fixtures/canonical-json-vectors.ts
git commit -m "feat: add strict canonical serialization"
```

### Task 4: Implement transactional xorshift32 and candidate semantics

**Files:**

- Create: `src/engine/core/rng/xorshift32.ts`
- Create: `src/engine/core/rng/rule-rng.ts`
- Create: `src/engine/core/rng/rng.test.ts`
- Create: `src/engine/core/transaction.ts`
- Create: `src/engine/core/transaction.test.ts`
- Create: `src/engine/core/invoke-story-rule.ts`
- Create: `src/engine/core/invoke-story-rule.test.ts`
- Create: `src/engine/profile/game-module.ts`
- Create: `src/engine/profile/game-profile.ts`
- Create: `src/engine/profile/game-profile.test.ts`
- Create: `src/engine/profile/module-read-ports.ts`
- Create: `src/engine/profile/owner-capabilities.ts`
- Create: `src/engine/profile/effect-intent-router.ts`
- Create: `src/engine/profile/effect-intent-router.test.ts`
- Create: `src/engine/profile/command-coordinator.ts`
- Create: `src/engine/profile/command-coordinator.test.ts`
- Create: `src/engine/core/execute-command.ts`
- Create: `src/engine/core/execute-command.test.ts`
- Create: `src/engine/core/invariants.ts`

**Interfaces:**

- Consumes: Snapshot, command, DomainFact, rejection, fault, and digest contracts.
- Produces: `nextU32`, `nextInt`, `RuleRng`, `runTransaction`, one strict synchronous Story-rule invocation boundary, the static `GameProfile`, exact empty Module dependency contracts, exhaustive EffectIntent owner routing, same-attempt execution diagnostics, and the sole `CommandCoordinator`.

- [ ] **Step 1: Write the frozen golden vector test**

Starting cursor `0x00023049`, call `nextInt(3) - 1` twelve times and `nextInt(6) + 1` twice. Expect twelve zeros, dice `[4, 3]`, cursor `0x4e7b7f2e`, and `rawDrawCount=14`.

- [ ] **Step 2: Run and confirm the RNG test fails**

Run: `pnpm vitest run src/engine/core/rng/rng.test.ts`

Expected: FAIL because the RNG modules do not exist.

- [ ] **Step 3: Implement the exact algorithm and bounded API**

`RngStateV1` is `{ algorithm: "xorshift32-v1", cursor: NonZeroUint32, rawDrawCount }`. `nextInt` accepts only safe integers in `1..2^32`, uses unbiased rejection sampling, and counts rejected raw draws. `RuleRng.nextInt({ exclusiveMax, purpose })` records ordinal, purpose, parameter, result, and cursor/count before/after.

- [ ] **Step 4: Write the remaining kernel and Story-rule-boundary tests**

Deep-freeze a full Snapshot and prove:

- success returns a new Snapshot, increments sequence once, and commits candidate RNG;
- rejection returns the exact original Snapshot reference, empty DomainFacts, and unchanged cursor/count/sequence/Narrative/Workflow/Story state;
- rule fault and invariant failure return `faulted`, discard candidate state/RNG/DomainFacts, and preserve the same committed Snapshot reference.

For all three outcomes, assert the same internal `CommandExecutionAttemptV1` carries the exact committed RNG before/after, attempted draws, and optional candidate RNG; public `executeCommand` returns only its `result` without re-executing the transaction.

In `invoke-story-rule.test.ts`, use one fake for each of the seven `StoryRuleSlotV1` values and the real strict output Schema selected by slot. Prove a synchronous throw, returned thenable/Promise, and strict output-Schema failure respectively produce the correlated `{category:"story_rule", code:"rule.threw"|"rule.returned_thenable"|"rule.output_invalid", ruleSlot}` without awaiting, committing candidate state/RNG, or leaking mutable input. A valid plain-data result passes through deep-frozen. Phase 2 Demand/Tavern/Check/Ending callers must all use this one helper; semantic Effect validation may subsequently map `effect.invalid` with the same ruleSlot.

- [ ] **Step 5: Write neutral static GameProfile, Router, and Coordinator contract tests**

Define the current named modules explicitly: `run`, `calendar`, `actors`, `status`, `inventory`, `facilities`, `tavern`, `workflow`, `world`, `progression`, `narrative`, and `scheduling`. `module-read-ports.ts` implements exactly the selector surfaces in Harness §5.1; `owner-capabilities.ts` defines the ten stateful owner proposal/apply capabilities and is imported only by Profile/Coordinator/router plus each owner's own public entry. Freeze exact owned state paths, stable order, stateful/stateless marker, and local Schema/invariant entry. Every Module-to-Module dependency list is exactly empty in v1; only Coordinator may combine read ports into narrow command/query DTOs. `GameStateV1` remains the catalog's closed shape; do not generate optional state from a runtime registry.

`game-profile.test.ts` proves module keys and owned paths are unique, every persisted path has exactly one owner, all twelve dependency arrays exactly equal `[]`, every read selector projects only its owner path, modules cannot import another module's read port or internals, and Story/URL/Save cannot choose a Profile. Do not expose lifecycle callbacks, arbitrary hooks, `registerCommand`, a whole-Snapshot read port, or a mutable module map. Task 6 provenance tests—not this pre-classifier test—prove Profile/Coordinator source membership in the Engine manifest.

`effect-intent-router.test.ts` table-drives every `EffectIntentV1["kind"]` against the catalog's exact owner map, proves each valid intent invokes one and only one owner-scoped proposal capability, and proves static validation happens before routing. Add an ordered two-intent vector where the second owner observes the first proposal, then force the second to reject and prove neither commits. The stateless Router has no candidate-state setter, dispatch recursion, or DomainFact listener path. Run/Facilities/Narrative remain Coordinator capabilities even though no current EffectIntent routes to them.

- [ ] **Step 6: Confirm the remaining kernel/profile tests fail before implementation**

Run: `pnpm vitest run src/engine/core/transaction.test.ts src/engine/core/invoke-story-rule.test.ts src/engine/profile/game-profile.test.ts src/engine/profile/effect-intent-router.test.ts src/engine/profile/command-coordinator.test.ts src/engine/core/execute-command.test.ts`

Expected: FAIL because transaction, rule-call, static Profile/Router, and Coordinator modules are missing.

- [ ] **Step 7: Implement candidate transaction and the strict Story-rule boundary**

Implement `runTransaction` as the only candidate clone/validate/commit primitive. It owns candidate State/RNG/DomainFacts, runs full Snapshot Schema plus global invariants before commit, allocates sequence exactly once on success, and returns the original committed Snapshot reference on rejection/fault. Implement `invokeStoryRule` as a synchronous slot-aware wrapper over the Task 2 contracts: fresh plain-data/deep-frozen input, synchronous call, thenable rejection before any await, strict slot-output parse, and exact `StoryRuleFaultV1` mapping. It cannot import a concrete Story or accept an untyped output validator.

- [ ] **Step 8: Implement the static Profile, Router, and candidate/validate/commit Coordinator**

Implement the exact Module list/read ports/owner capabilities and exhaustive EffectIntentRouter from Step 5. `CommandCoordinator` uses an exhaustive `switch (command.kind)`, opens one `runTransaction` candidate, alone reads public ports to build narrow inputs, gives handlers only owner-scoped proposal/apply capabilities, routes Story/Narrative/Scheduler effects through the exhaustive EffectIntentRouter, aggregates ordered DomainFacts/ledger outputs, validates the full candidate, and commits State + RNG + sequence once. Its internal `executeAttempt` returns `CommandExecutionAttemptV1`; `executeCommand` is a thin result-only projection over that same attempt, not a second dispatcher. Named handlers return the Catalog's temporary `{ category:"command_handler", code:"command.handler_not_implemented", ruleSlot:null }` fault only during Phase 1; Phase 2 verification rejects surviving stubs. No domain handler receives a mutable whole Snapshot or writes another owner's path.

- [ ] **Step 9: Run profile and command contract tests**

Run: `pnpm vitest run src/engine/core/rng/rng.test.ts src/engine/core/transaction.test.ts src/engine/core/invoke-story-rule.test.ts src/engine/profile/game-profile.test.ts src/engine/profile/effect-intent-router.test.ts src/engine/profile/command-coordinator.test.ts src/engine/core/execute-command.test.ts`

Expected: PASS with exact rollback/reference semantics.

- [ ] **Step 10: Commit the deterministic kernel and static profile**

```bash
git add src/engine/core/rng/xorshift32.ts src/engine/core/rng/rule-rng.ts src/engine/core/rng/rng.test.ts src/engine/core/transaction.ts src/engine/core/transaction.test.ts src/engine/core/invoke-story-rule.ts src/engine/core/invoke-story-rule.test.ts src/engine/profile/game-module.ts src/engine/profile/game-profile.ts src/engine/profile/game-profile.test.ts src/engine/profile/module-read-ports.ts src/engine/profile/owner-capabilities.ts src/engine/profile/effect-intent-router.ts src/engine/profile/effect-intent-router.test.ts src/engine/profile/command-coordinator.ts src/engine/profile/command-coordinator.test.ts src/engine/core/execute-command.ts src/engine/core/execute-command.test.ts src/engine/core/invariants.ts
git commit -m "feat: add the deterministic command kernel"
```

### Task 5: Build typed Story authorship and validated bootstrap fixtures

**Files:**

- Create: `src/engine/contracts/story-builder.ts`
- Create: `src/engine/core/bootstrap-story.ts`
- Create: `src/engine/core/bootstrap-story.test.ts`
- Create: `src/stories/tavern-poc/index.ts`
- Create: `src/stories/tavern-poc/development.ts`
- Create: `src/stories/e2e/index.ts`
- Create: `src/stories/e2e/development.ts`
- Create: `src/test-support/story-contract-suite.ts`
- Create: `src/stories/story-contracts.test.ts`
- Create: `src/app/composition-root.ts`
- Create: `src/app/composition-root.test.ts`
- Create: `scripts/story-cli.mts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: Story contracts, canonical/digest primitives.
- Produces: `defineStory`, `loadStory`, `createInitialSnapshot`, independent Story entries, and static Story selection.

- [ ] **Step 1: Write failing Story isolation/bootstrap tests**

Assert:

- `tavern-poc` and `e2e` have distinct IDs and no cross-imports;
- fixtures exist only in `development.ts`;
- duplicate IDs, missing references, invalid Aura lifecycle, unreachable jump, invalid rule output, missing asset block, empty LifePolicy definitions, invalid player/system Action-presentation cardinality, any `policy.choose` presentation other than morning/none/no-gates, malformed visibility/availablePhases/occupation, any missing Action/ServiceMode/Facility/WorldAction confirmation source, cross-source confirmation ID collision, any unresolved ModifierSource, or any unresolved Modifier/Aura/ActionCost/ServiceMode/LifePolicy/Facility-skip/closure/night-recovery ReasonId blocks bootstrap;
- `createInitialSnapshot` consumes zero RNG and sets sequence 0.

- [ ] **Step 2: Confirm Story tests fail**

Run: `pnpm vitest run src/engine/core/bootstrap-story.test.ts src/stories/story-contracts.test.ts`

Expected: FAIL because builder/bootstrap modules are missing.

- [ ] **Step 3: Implement typed builders and strict bootstrap**

`defineStory` brands declared IDs and returns frozen serializable IR plus typed rules. `loadStory` validates contract revision, source identity, manifest, state definitions/defaults, balance, references, rule slots, assets, and materialized initial state before returning deep-frozen `LoadedStory`.

- [ ] **Step 4: Add minimal independent rule fixtures**

Both stories implement all four `StoryRulesV1` groups and all seven named synchronous methods. Tavern fixture proves demand/check RNG mapping but has no gameplay content. E2E fixture declares one weighted opening candidate for Phase 2 Scheduler tests. Neither imports runtime/UI/persistence or the other Story.

- [ ] **Step 5: Implement static Story/flavor selection**

`scripts/story-cli.mts` accepts only:

```text
dev <tavern-poc|e2e> --flavor <player|developer>
build <tavern-poc|e2e> --flavor <player|developer>
```

Without an explicit output override, each closed Story/flavor pair builds under ignored `.tmp/story-build/<story>-<flavor>`; add `.tmp/story-build/` to `.gitignore`. Later release code may add a closed exact `--out-dir` allowlist, but cannot turn these phase-gate invocations into arbitrary path writes.

It invokes Vite with validated aliases/defines. `src/app/composition-root.ts` imports the one Engine-owned `GameProfile`, EngineKernel public entry, and the validated `@story` alias; it may wire them but cannot redefine the module list or Coordinator. URL, Save, IDB, and content cannot select Profile/Module/Story paths. `composition-root.test.ts` is a no-build composition contract: with injected validated alias metadata it proves the same static Profile identity is wired and exactly one selected Story entry is reachable, but it never invokes Vite or writes build output. Step 6's explicit Story CLI commands perform the two emitted builds; Task 6 performs digest-input/root assertions after the provenance classifier exists. Add `story:dev`, `story:build`, and `story:e2e` scripts.

```json
{
  "story:dev": "tsx scripts/story-cli.mts dev",
  "story:build": "tsx scripts/story-cli.mts build",
  "story:e2e": "tsx scripts/story-cli.mts build e2e --flavor developer"
}
```

- [ ] **Step 6: Run Story contract and build smoke tests**

Run: `pnpm vitest run src/engine/core/bootstrap-story.test.ts src/stories/story-contracts.test.ts src/app/composition-root.test.ts && pnpm story:build tavern-poc --flavor player && pnpm story:build e2e --flavor developer`

Expected: both builds exit 0 and contain only the selected Story entry.

- [ ] **Step 7: Commit Story authorship/bootstrap**

```bash
git add src/engine/contracts/story-builder.ts src/engine/core/bootstrap-story.ts src/engine/core/bootstrap-story.test.ts src/stories/tavern-poc/index.ts src/stories/tavern-poc/development.ts src/stories/e2e/index.ts src/stories/e2e/development.ts src/stories/story-contracts.test.ts src/test-support/story-contract-suite.ts src/app/composition-root.ts src/app/composition-root.test.ts scripts/story-cli.mts package.json vite.config.ts .gitignore
git commit -m "feat: add validated static story packages"
```

### Task 6: Generate reproducible Engine, Story, and Application provenance manifests

**Files:**

- Create: `scripts/provenance/classify-inputs.mts`
- Create: `scripts/provenance/create-manifest.mts`
- Create: `scripts/provenance/verify-manifest.mts`
- Create: `scripts/provenance/provenance.test.ts`
- Create: `scripts/vite/provenance-plugin.mts`
- Create: `src/app/engine-display-version.ts`
- Create: `src/app/build-provenance.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: canonical JSON/digest, lockfile, Story selection.
- Produces: virtual `BuildProvenanceV1`, optional Application `appBuildId`, sorted Engine/Story/Application input manifests, explicit non-runtime classification, stale-manifest failure, deterministic HMR invalidation.

- [ ] **Step 1: Write failing classification/reproducibility tests**

Prove every production runtime executable belongs to exactly one of `engine | story | application`, while tests/fixtures/development preview/non-build scripts are explicitly `non-runtime`. Engine covers deterministic contracts/core/profile/module ports/CommandCoordinator/domains/narrative/scheduling/replay/replayable-debug/config integrity; Story covers source identity except digest, manifest, state definitions, initial state, content, balance, rules/import closure, runtime asset manifest/bytes; Application covers app/runtime/ui/CSS/Vite composition, anchoring fixture resolution, the dedicated `src/app/engine-display-version.ts` display label, and other application-only dependencies. Assert the complete Profile/Coordinator sources are Engine inputs and that switching between tavern-poc and e2e changes only the selected Story root/inputs while the Engine input manifest/root remains byte-identical. Absolute paths, timestamps, source maps, and digest outputs cannot affect roots.

Add orthogonality vectors using the production classifier/root algorithm: changing only `engine-display-version.ts` changes the displayed `engine.version` and Application root but leaves Engine/Story roots byte-identical; changing one Engine source byte changes Engine root while leaving the label unchanged; changing one pure Application UI source byte changes only Application root. Assert SaveCompatibilityKey remains identical for the version-only and pure-Application cases.

- [ ] **Step 2: Confirm provenance tests fail**

Run: `pnpm vitest run scripts/provenance/provenance.test.ts`

Expected: FAIL because provenance scripts are missing.

- [ ] **Step 3: Implement normalized manifests**

Use UTF-8/LF/no-BOM bytes, POSIX relative paths sorted lexicographically, per-file SHA-256, then canonical roots with `game-harness:engine:v1`, `game-harness:story:v1`, and `game-harness:application:v1`. Engine classification includes the complete `src/engine/profile/` GameProfile composition, module ownership/ports/dependency graph and CommandCoordinator. The mechanics-neutral `src/app/composition-root.ts` that imports the already-defined Profile plus the selected Story remains Application input; it cannot redefine the module set. `src/app/engine-display-version.ts` exports the human-readable Engine label, is Application input, and is read/injected only after root generation; no version-label byte enters Engine/Story manifests. Reject unclassified/multiply classified files and Story imports outside Story-local code or Engine public contracts/helpers. Non-runtime classification is checked but produces no digest root.

- [ ] **Step 4: Implement the Vite virtual provenance module**

Regenerate with the production algorithm before serve/build. Story/Engine changes invalidate Session command/save continuation. Read `engine-display-version.ts` after the roots exist and inject the label into the virtual `BuildProvenanceV1`; the plugin must fail if the label is unavailable or non-canonical, but must not feed it back into Engine/Story roots. Inside the Application bucket, only a named allowlist of pure UI component/CSS modules may keep normal HMR; changes under runtime persistence/diagnostics/session/assets, app composition, Vite composition, version label, or other non-allowlisted Application modules pause commands and all Slot writes, update `appBuildId`, export the old Session only under its old provenance, and require full reload. Application changes never alter Save compatibility. Generation failure blocks startup/build.

- [ ] **Step 5: Add commands and verify clean-repeat roots**

```json
{
  "provenance:generate": "tsx scripts/provenance/create-manifest.mts",
  "provenance:verify": "tsx scripts/provenance/verify-manifest.mts"
}
```

Run: `pnpm provenance:generate && pnpm provenance:verify && pnpm provenance:generate && pnpm provenance:verify`

Expected: all three roots are identical across repeats; ignored `.generated/` contains no absolute path; non-runtime files are listed but absent from roots.

- [ ] **Step 6: Commit provenance generation**

```bash
git add scripts/provenance/classify-inputs.mts scripts/provenance/create-manifest.mts scripts/provenance/verify-manifest.mts scripts/provenance/provenance.test.ts scripts/vite/provenance-plugin.mts src/app/engine-display-version.ts src/app/build-provenance.ts vite.config.ts package.json .gitignore
git commit -m "feat: add reproducible build provenance"
```

### Task 7: Enforce dependency boundaries and the Phase 1 gate

**Files:**

- Create: `.dependency-cruiser.cjs`
- Create: `src/architecture-boundaries.test.ts`
- Create: `src/ui/__architecture-fixtures__/invalid-engine-internal-import.ts`
- Create: `scripts/verify-toolchain.mts`
- Create: `scripts/verify-toolchain.test.ts`
- Create: `scripts/verify-foundation.mts`
- Modify: `eslint.config.js`
- Modify: `package.json`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: complete Phase 1 tree.
- Produces: machine-enforced orthogonality and `pnpm verify:foundation`.

- [ ] **Step 1: Write boundary contract tests and the deliberate invalid fixture**

Reject:

```text
engine -> app | runtime | ui | stories | DOM | React | Zustand | IndexedDB
stories -> app | runtime | ui | persistence | another story
ui -> engine/internal | runtime/internal
domain module -> another module's internal implementation
production | tests | scripts -> references
cycles under src
non-entry imports across public module boundaries
```

The exact tracked negative fixture `src/ui/__architecture-fixtures__/invalid-engine-internal-import.ts` imports `src/engine/core/execute-command.ts`. The test requires normal scans to exclude only the named `__architecture-fixtures__` directory; its focused invocation includes that file with the production rule set and expects nonzero plus exact rule ID `not-to-engine-internal-from-ui`. It also requires the normal production graph to have zero violations.

- [ ] **Step 2: Confirm the boundary contract red test**

Run: `pnpm vitest run src/architecture-boundaries.test.ts`

Expected: FAIL because `.dependency-cruiser.cjs` and its exact rule IDs do not exist.

- [ ] **Step 3: Implement dependency rules and make the focused test green**

Implement all listed rules above in `.dependency-cruiser.cjs`, including the exact focused-fixture exclusion contract. Combine the graph check with `game-profile.test.ts` so module dependency declarations are acyclic and exactly match permitted public-port imports; verify every persisted state path has one owner. Run: `pnpm vitest run src/architecture-boundaries.test.ts src/engine/profile/game-profile.test.ts`

Expected: PASS only when the deliberate edge is reported with the exact rule ID and the production graph remains clean; no temporary file is created or deleted during the test.

- [ ] **Step 4: Add restricted globals/imports**

Engine and Story rule lint overrides forbid `window`, `document`, `localStorage`, `indexedDB`, `fetch`, wall-clock APIs, environment RNG, `Math.random`, console side effects, React, and browser/runtime packages. Story top-level modules forbid side-effect and dynamic imports. Project code and scripts may not import the TypeScript Compiler API; only the pinned third-party lint toolchain consumes the TS6 compatibility package.

- [ ] **Step 5: Test and implement the reusable toolchain leaf and exact Phase 1 verifier**

First write `verify-toolchain.test.ts` with injected command/file readers covering wrong TS7, wrong TS6 wrapper, project-owned `tsc6` use, and the exact green pins. Run `pnpm vitest run scripts/verify-toolchain.test.ts`; expected FAIL because the leaf is missing. Then create `scripts/verify-toolchain.mts` as the single reusable toolchain leaf. It asserts authoritative `pnpm exec tsc --version` is exactly 7.0.2, compatibility `pnpm exec tsc6 --version` is exactly 6.0.3, and every project-owned script/config invokes only `tsc` rather than `tsc6`; add the exact package mapping `"toolchain:verify": "tsx scripts/verify-toolchain.mts"`. The compatibility package may remain a third-party lint dependency only. Re-run the focused test; expected PASS.

`scripts/verify-foundation.mts` runs with `spawnSync`, inherited stdio, and immediate nonzero exit:

```text
format:check
lint
dependency-cruiser
toolchain:verify
typecheck
contract/canonical/RNG/Story/provenance tests
tavern-poc Player build smoke
e2e Developer build smoke
provenance:verify
```

It never publishes or updates tracked baselines.

Replace the temporary Task 1 package script with exactly:

```json
{
  "verify:foundation": "tsx scripts/verify-foundation.mts"
}
```

- [ ] **Step 6: Run fresh full Phase 1 verification**

Run: `pnpm verify:foundation`

Expected: exit 0 while the reviewed Task 7 implementation is still uncommitted; two Story builds succeed, verification creates only ignored output, and `git status --short` after the run is byte-for-byte identical to its pre-run output. Do not call this intermediate tree clean.

- [ ] **Step 7: Review the public ABI**

Compare all contract barrel exports to Task 2. Confirm no public type imports internals and record Phase 2's explicit removal gate for every temporary not-implemented handler.

- [ ] **Step 8: Commit the Phase 1 gate**

```bash
git add .dependency-cruiser.cjs eslint.config.js package.json src/architecture-boundaries.test.ts src/ui/__architecture-fixtures__/invalid-engine-internal-import.ts AGENTS.md scripts/verify-toolchain.mts scripts/verify-toolchain.test.ts scripts/verify-foundation.mts
git commit -m "build: enforce harness architecture boundaries"
```

- [ ] **Step 9: Re-run the gate from the actual clean checkpoint**

Run: `git status --porcelain=v1 --untracked-files=all && pnpm verify:foundation && git status --porcelain=v1 --untracked-files=all`

Expected: both status commands emit nothing and the gate passes without tracked writes. If the first status is non-empty, do not claim the clean Phase 1 checkpoint; review and commit only the intended fix, then restart this step.

## Phase 1 Completion Check

- [ ] `pnpm install --frozen-lockfile` succeeds on Node 24.18.0/pnpm 11.11.0.
- [ ] `pnpm verify:foundation` exits 0 twice.
- [ ] Story, Engine, and Application digests are identical across repeated clean generation.
- [ ] Reference RNG vector is exact.
- [ ] Full Snapshot inputs remain immutable; rejection returns the same Snapshot/RNG/sequence.
- [ ] Every catalog v1 TS/Zod object is strict and every union is exhaustive, including SaveRecord, DebugBundle, CommandLog, DebugCommand, and Strict JSON errors.
- [ ] `tavern-poc` and `e2e` build independently with no cross-import.
- [ ] No executable file is unclassified or cyclic.
- [ ] Worktree is clean after verification.
