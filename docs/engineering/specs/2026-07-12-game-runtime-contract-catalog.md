# SillyMaker Runtime Contract Catalog 与 Project Tavern PoC ABI v1

日期：2026-07-12

状态：当前字段级 ABI 权威

适用范围：SillyMaker Base 共享 envelope，以及 Project Tavern PoC Gameplay、PoC Story、Save、DebugBundle、State Dump 与重放的具体 v1 字段语义

## 1. 权威、记法与封闭性

本文是 [`2026-07-12-game-runtime-design.md`](2026-07-12-game-runtime-design.md) 的字段级 ABI 附录。架构规格负责 package/Story/GameplayModule/Application/Artifact 所有权；本文负责共享 envelope 与 PoC 游戏的精确字段、判别值、边界和稳定错误码。实现不得发明第三种合同。

本文为了集中评审而同时列出通用 envelope 和 PoC 具体实例，但实现位置必须分开：

- `@sillymaker/base` 只实现泛型 Snapshot/Command result、RNG、序列化、identity、Save/Debug、GamePackage/Hotfix 和测试合同；
- `game/stories/poc` 实现 Run、Calendar、Actors、Inventory、Tavern 等具体 GameplayModule、命令、GameplayFact、拒绝、GameQueries、GameCommandExecutor、内容、规则、文本、Narrative、素材和 GameSimulation；
- `game/stories/e2e` 使用独立的最小 fixture GameplayModules，不复用 PoC Gameplay；
- 当前不建立公共 Gameplay package；只有至少两个真实 Story 出现稳定重复后才重新评估。

因此本文出现 `PocGameStateV1`、`PocGameCommandV1`、`PocRulesV1` 等具体名字，不代表它们属于 Base。Base 只能以泛型参数和公共端口承载它们。

以下 TypeScript 是规范，不是建议：

- 所有数据对象都用 `z.strictObject`（或等价的拒绝 unknown keys Schema）实现；
- 所有公开属性和数组都是 `readonly`，Map/Set/Class instance 不进入公共合同；
- 可选字段只在本文出现 `?` 的位置允许；不得以 `undefined` 代替缺失，`null` 只在本文明确写出时允许；
- 所有可保存运行态、规则输入输出、compiled Narrative IR、命令、GameplayFact、拒绝、存档和诊断数据都可由 Strict JSON 表示；data-only SceneGraph descriptor 也必须可序列化，但 Web-only React renderer registry、Schema 和源码合同不序列化；
- Narrative/content IR 不允许 callback、函数名、脚本字符串、任意属性路径、State fragment 或 `Record<string, unknown>`；
- PoC 的 `PocRulesV1` 方法与 `RuleRngV1.nextInt` 是确定性模拟路径中的具名函数合同；方法本身不序列化，其输入、输出和抽取记录必须序列化；
- 唯一额外可执行扩展点是 bootstrap 期间的受管 `PatchSurface`。Hotfix 是普通 JavaScript，但官方兼容承诺只覆盖 `rule | value | text | asset` 稳定符号。它不能改变 State Schema、Command/Fact 联合或已解析 Module 图；
- `GameSimulation`、`GameplayModule` ports 与 `GameCommandExecutor` 属于 Story 选择后的编译期/启动期源码合同，不进入 Save/Debug JSON。`ResolvedGame` 冻结后不提供运行中注册或替换 Module；
- `Brand` 的 phantom 字段不参与运行时对象或 JSON；
- 文中联合类型的判别值、顺序和字段必须同时存在于 `...Kinds`/`...Codes` 常量、TypeScript 类型和 Zod Schema。

PoC 在 `game/stories/poc` 使用以下十个 `PocGameplayModule`；Demand、Settlement、Check、Ending 和 Scheduling 是 Rule/Resolver，不是 Module。Module-to-Module read edge 故意为空；跨 owner 读取只允许 `PocGameCommandExecutor` 通过公开 read ports 组装窄 DTO。其他 Story 可以选择不同 Module DAG，但依赖必须显式、只读且无环；`dependencies` 不能被解释成“可以读取完整 Snapshot”：

```ts
const pocGameplayModuleKeysV1 = [
  "run",
  "calendar",
  "actors",
  "status",
  "inventory",
  "facilities",
  "tavern",
  "workflow",
  "progression",
  "narrative",
] as const;

type PocGameplayModuleKeyV1 = (typeof pocGameplayModuleKeysV1)[number];

const pocGameplayModuleDependenciesV1 = {
  run: [],
  calendar: [],
  actors: [],
  status: [],
  inventory: [],
  facilities: [],
  tavern: [],
  workflow: [],
  progression: [],
  narrative: [],
} as const satisfies Record<PocGameplayModuleKeyV1, readonly PocGameplayModuleKeyV1[]>;

type StatefulOwnerKeyV1 =
  | "run"
  | "calendar"
  | "actors"
  | "status"
  | "inventory"
  | "facilities"
  | "tavern"
  | "workflow"
  | "progression"
  | "narrative";

const effectIntentOwnerByKindV1 = {
  "calendar.ap.adjust": "calendar",
  "reputation.adjust": "tavern",
  "actor.stamina.adjust": "actors",
  "actor.mood.adjust": "actors",
  "relationship.affection.adjust": "actors",
  "relationship.teamwork.adjust": "actors",
  "relationship.stage.set": "actors",
  "tavern.helper.set": "tavern",
  "inventory.grant": "inventory",
  "inventory.consume": "inventory",
  "inventory.item.grant": "inventory",
  "inventory.item.consume": "inventory",
  "aura.apply": "status",
  "aura.clear": "status",
  "fact.set": "progression",
  "quest.set": "progression",
  "outcome.set": "progression",
  "modifier.add": "workflow",
  "ledger.append": "inventory",
} as const;
```

WorldAction 与 Scheduling 是 Rule/Resolver，不拥有 State Slice 或 owner capability；Run/Facilities/Narrative 没有 `EffectIntentV1` kind，但仍只能由 GameCommandExecutor 调用各自 owner-scoped proposal/apply capability。`effectIntentOwnerByKindV1` 必须与 `EffectIntentV1["kind"]` 双向穷举；Router 自身无状态，不能提交、递归 dispatch 或直接写候选对象。每次调用 Router 都必须显式传入该 authored batch 的 `PocEffectSourceV1`，同一外层 candidate 可以依次处理不同来源的 batch；source 不从 Effect 猜测、不在 candidate 创建时固定，也不作为 candidate-wide mutable state 保存。

Router 在第一个 owner proposal 之前，先以共享 strict Schema 解析整批 Effect/source，并逐项调用 `validatePocEffectIntentForSourceV1` 完成 stable-reference、embedded-source、provenance 与 generic-ledger 校验；随后对整批 `modifier.add` 完成依赖当前 candidate State 的 active-Opening/已触发 Event 校验。全部预检通过后才按 authored 顺序让 owner 对当前候选做语义验证与 proposal。后项可以观察前项 proposal，但任一失败仍由 GameCommandExecutor 回滚整批。

`game/stories/poc/src/gameplay/runtime-schemas.ts` 是 aggregate runtime-schema 层：它组合十个 owner State Schema 形成 `pocGameStateSchemaV1`，复用各 owner 已有 strict Fact parser 并补齐 executor-only cases 形成 `pocGameplayFactSchemaV1`。`contracts/schemas.ts` 只提供基础 `pocEffectIntentSchemaV1`、`pocEffectSourceSchemaV1` 与 provenance validator；不得反向导入 aggregate owner 层。Scheduling、Rule output、transaction 与 GameSimulation 必须复用这些共享 Schema，不能各自保留第二份同 ABI parser。

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
type DeepReadonly<T> = /* recursive readonly helper; no runtime field */ T;

interface BeforeAfterV1<T> {
  readonly before: T;
  readonly after: T;
}
```

## 2. 基础值与 ID

### 2.1 数值、摘要与时间

除本节后述的 Presentation-only 数值投影外，所有 `StrictJsonValueV1` 与全局 Canonical JSON 中的 number 必须是 `Number.isSafeInteger` 为真的整数。状态资源不能借由负数表达欠款；变化量单独使用有符号整数。

StageScene/Character/HitMap 等 Presentation descriptor 的归一化坐标、尺寸和 scale 使用 ECMAScript binary64 `number`，不引入十进制定点或 Decimal 运行时。归一化坐标范围为 `[0,1]`，归一化尺寸范围为 `(0,1]`，scale 必须为正有限数；所有 Presentation 数值均拒绝 `NaN`、正负 Infinity 和 `-0`。这些 typed Presentation 字段不是 `StrictJsonValueV1` 的整数逃逸口；例如 `layout`、`details` 等显式声明为 `StrictJsonObjectV1` 的字段仍只允许 safe integer。

resolved Presentation Program 与完整 SceneGraph 使用独立的 Presentation canonical projection：递归地以 value-kind tag 区分 null、boolean、string、number、array 与 object；每个有限 number 由 ECMAScript `Number::toString` 的 shortest-round-trip 十进制结果编码为 string，再把整个 tagged tree 交给既有整数-only Canonical JSON encoder。对象键按既有 UTF-8 规则排序，因此 source property order 不影响 bytes，number `1` 与 string `"1"` 不碰撞。该投影只用于 define-twice Presentation data 比较及 `presentationDigest`；不能用于 Snapshot、State、Command、GameplayFact、Save、DebugBundle 或任何 simulation/state-contract identity。

```ts
type SafeInteger = Brand<number, "SafeInteger">;
type NonNegativeSafeInteger = Brand<number, "NonNegativeSafeInteger">; // 0..MAX_SAFE_INTEGER
type PositiveSafeInteger = Brand<number, "PositiveSafeInteger">; // 1..MAX_SAFE_INTEGER
type Uint32 = Brand<number, "Uint32">; // 0..4294967295
type NonZeroUint32 = Brand<number, "NonZeroUint32">; // 1..4294967295
type DayIndex = Brand<number, "DayIndex">; // positive safe integer; <= ResolvedGame.manifest.playableDays while in run
type AbsoluteDayIndex = Brand<number, "AbsoluteDayIndex">; // positive safe integer; expiry may exceed playableDays
type MoodPoint = Brand<number, "MoodPoint">; // -2..2
type AttributeBonus = Brand<number, "AttributeBonus">; // 0..4
type DieFace = Brand<number, "DieFace">; // 1..6
type Money = Brand<number, "Money">; // non-negative safe integer
type Quantity = Brand<number, "Quantity">; // positive safe integer
type Digest = Brand<`sha256:${string}`, "Digest">; // sha256: + 64 lower hex
type IsoUtcInstant = Brand<string, "IsoUtcInstant">; // RFC 3339 UTC, ...Z
type EngineVersion = Brand<string, "EngineVersion">; // 1..64 printable ASCII chars

type StrictJsonPrimitiveV1 = null | boolean | string | number;
type StrictJsonValueV1 = StrictJsonPrimitiveV1 | StrictJsonObjectV1 | readonly StrictJsonValueV1[];
interface StrictJsonObjectV1 {
  readonly [key: string]: StrictJsonValueV1;
}

interface IntegerRangeV1 {
  readonly min: SafeInteger;
  readonly max: SafeInteger;
}

interface RatioV1 {
  readonly numerator: NonNegativeSafeInteger;
  readonly denominator: PositiveSafeInteger;
}
```

### 2.2 内容 ID、运行时 ID 与固定枚举

人工声明的 stable ID 必须匹配 `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$`，UTF-8 byte length 为 3..96。每个 brand 有独立 parser，禁止跨 brand 赋值。

命名空间也是合同：`StoryActionDefinitionV1.actionId` 必须匹配 `^action\.`，`StoryEventDefinitionV1.eventId` 必须匹配 `^event\.`。关系、道歉、修招牌等由玩家主动开始的内容只能使用 `action.*`；`event.*` 只表示 Scheduler/剧情触发事件，不得作为玩家行动 ID 或兼容别名进入 Story、命令、存档或 fixture。

```ts
type StoryId = Brand<string, "StoryId">;
type PolicyId = Brand<string, "PolicyId">;
type ActionId = Brand<string, "ActionId">;
type EventId = Brand<string, "EventId">;
type CheckpointId = Brand<string, "CheckpointId">;
type WeightedGroupId = Brand<string, "WeightedGroupId">;
type SceneId = Brand<string, "SceneId">;
type NodeId = Brand<string, "NodeId">;
type ChoiceId = Brand<string, "ChoiceId">;
type FactId = Brand<string, "FactId">;
type QuestId = Brand<string, "QuestId">;
type OutcomeId = Brand<string, "OutcomeId">;
type IngredientId = Brand<string, "IngredientId">;
type ItemId = Brand<string, "ItemId">;
type RecipeId = Brand<string, "RecipeId">;
type FacilityId = Brand<string, "FacilityId">;
type AuraId = Brand<string, "AuraId">;
type CustomerSegmentId = Brand<string, "CustomerSegmentId">;
type ModifierSourceId = Brand<string, "ModifierSourceId">;
type CheckId = Brand<string, "CheckId">;
type CheckBandId = Brand<string, "CheckBandId">;
type EndingId = Brand<string, "EndingId">;
type TextId = Brand<string, "TextId">;
type AssetId = Brand<string, "AssetId">;
type ReasonId = Brand<string, "ReasonId">;
type WorldStepId = Brand<string, "WorldStepId">;
type FixtureId = Brand<string, "FixtureId">;
type StoryToken = Brand<string, "StoryToken">;
type CharacterId = Brand<string, "CharacterId">;
type FallbackToken = Brand<string, "FallbackToken">;

type RunId = Brand<string, "RunId">; // canonical lower-case UUID v4
type BatchId = Brand<string, "BatchId">; // batch:initial:<index> | batch:<commandSequence>:<lineIndex>
type AuraInstanceId = Brand<string, "AuraInstanceId">; // aura:initial:<index> | aura:<commandSequence>:<index>
type OpeningSessionId = Brand<string, "OpeningSessionId">; // opening:<commandSequence>
type LedgerEntryId = Brand<string, "LedgerEntryId">; // ledger:<commandSequence>:<index>

type ActorId = "actor.player" | "actor.heroine";
type AttributeId = "body" | "social" | "intellect";
type AttributeRank = "C" | "B" | "A" | "S" | "S+";
type RelationshipStage =
  "stranger" | "dislike" | "cold" | "friendly" | "trust" | "admiration" | "lovers";
type CalendarPhase = "morning" | "afternoon" | "evening";
type ServiceMode = "manual" | "assisted" | "delegated" | "closed";
type OpenServiceMode = "manual" | "assisted" | "delegated";
type HelperTier = "apprentice" | "skilled" | "senior" | "master";
type RunStatus = "setup" | "active" | "completed_stable" | "completed_danger" | "failed_arrears";
```

`StoryToken` 也使用 stable ID 语法，但只能作为已由 `StoryStateDefinitionsV1` 声明的枚举值；它不是任意字符串逃生口。

## 3. 权威 Snapshot

```ts
interface RngStateV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: Uint32;
  readonly rawDrawCount: NonNegativeSafeInteger;
}

declare const rngStateV1Schema: RuntimeSchemaV1<RngStateV1>;

type RunIntegrityReasonV1 =
  | {
      readonly kind: "debug_command";
      readonly commandKind: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "fixture_anchor";
      readonly fixtureId: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "debug_bundle_anchor";
      readonly sequence: NonNegativeSafeInteger;
    };

interface RunIntegrityV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: NonNegativeSafeInteger;
  readonly firstMutationSequence: NonNegativeSafeInteger | null;
  readonly reasons: readonly RunIntegrityReasonV1[];
}

declare const runIntegrityV1Schema: RuntimeSchemaV1<RunIntegrityV1>;

interface GameSnapshotEnvelopeV1<TState, TRngState> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: RunIntegrityV1;
}

declare function createGameSnapshotEnvelopeSchemaV1<TState, TRngState>(
  stateSchema: RuntimeSchemaV1<TState>,
  rngStateSchema: RuntimeSchemaV1<TRngState>,
): RuntimeSchemaV1<GameSnapshotEnvelopeV1<TState, TRngState>>;

type PocGameSnapshotV1 = GameSnapshotEnvelopeV1<PocGameStateV1, RngStateV1>;

interface PocGameStateV1 {
  readonly simulation: PocSimulationStateV1;
  readonly story: StoryRuntimeStateV1;
}

interface PocSimulationStateV1 {
  readonly run: RunStateV1;
  readonly calendar: CalendarStateV1;
  readonly actors: ActorsStateV1;
  readonly inventory: InventoryStateV1;
  readonly status: StatusStateV1;
  readonly facilities: FacilitiesStateV1;
  readonly tavern: TavernStateV1;
  readonly activeWorkflow: ActiveWorkflowV1 | null;
}

interface RunStateV1 {
  readonly runId: RunId;
  readonly initialSeed: NonZeroUint32;
  readonly status: RunStatus;
  readonly completion: RunCompletionV1 | null;
}

interface CalendarStateV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly lifePolicyId: PolicyId | null;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly eveningResolved: boolean;
}
```

`GameSnapshotEnvelopeV1<TState, TRngState>`、`RunIntegrityV1` 及其 Schema 属于 Base；`PocGameStateV1`、`PocSimulationStateV1` 和其子类型属于 PoC GameplayModules/GameSimulation。`pocGameStateSchemaV1: RuntimeSchemaV1<PocGameStateV1>` 必须从十个 owner 的 exact State Schema 组合，且 Scheduling、candidate commit、GameSimulation、Save/Debug stable-reference/invariant 入口复用同一 export；不得在 Resolver 或 executor 内复制 aggregate State parser。pristine integrity 精确为 `normal/0/null/[]`；modified 必须至少一次 mutation、`firstMutationSequence` 非 null，`reasons` 按首次出现的 reason kind 保留且最多 16 项。Gameplay State、Rule、Resolver、Queries 和 renderer 不能修改或观察 integrity；完整 Snapshot digest、Save、replay base 与 DebugBundle 必须覆盖它。

`xorshift32-v1` 的 `cursor` 是非零 unsigned 32-bit 整数；`rawDrawCount` 对每次底层 `nextU32()`（包括拒绝采样丢弃值）增加 1。所有位运算按无符号 32 位执行：

```text
x = state
x = uint32(x XOR uint32(x << 13))
x = uint32(x XOR (x >>> 17))
x = uint32(x XOR uint32(x << 5))
state = x
return x
```

`nextInt(exclusiveMax)` 只接受 `1..2^32`，使用无偏拒绝采样：`limit = floor(2^32 / exclusiveMax) * exclusiveMax`，反复调用 `nextU32()` 直到 `value < limit`，再返回 `value % exclusiveMax`。不得使用浮点缩放或直接取模。新局以通过 `NonZeroUint32` 校验的 seed 原值作为首个 cursor，不 hash、warm-up 或 xor。

reference seed `0x00023049` 的前 12 个 `nextInt(3)-1` 均为 0，随后两次 `nextInt(6)+1` 为 4、3；14 次无拒绝的底层抽取后 cursor 为 `0x4e7b7f2e`、`rawDrawCount=14`。算法、拒绝采样、seed 初始化和该向量必须由 Base unit tests、Debug replay 与未来 C# 端口共同复用。

### 3.1 Actors

```ts
interface StaminaStateV1 {
  readonly current: NonNegativeSafeInteger;
  readonly maximum: PositiveSafeInteger;
}

interface AttributeRanksV1 {
  readonly body: AttributeRank;
  readonly social: AttributeRank;
  readonly intellect: AttributeRank;
}

interface PlayerActorStateV1 {
  readonly actorId: "actor.player";
  readonly stamina: StaminaStateV1;
  readonly mood: MoodPoint;
  readonly attributes: AttributeRanksV1;
}

interface HeroineActorStateV1 {
  readonly actorId: "actor.heroine";
  readonly stamina: StaminaStateV1;
  readonly mood: MoodPoint;
}

interface RelationshipStateV1 {
  readonly affection: SafeInteger;
  readonly teamwork: NonNegativeSafeInteger;
  readonly stage: RelationshipStage;
}

interface ActorsStateV1 {
  readonly player: PlayerActorStateV1;
  readonly heroine: HeroineActorStateV1;
  readonly relationship: RelationshipStateV1;
}
```

### 3.2 Inventory

```ts
type InventorySourceRefV1 =
  | { readonly kind: "initial"; readonly reasonId: ReasonId }
  | { readonly kind: "purchase"; readonly commandSequence: PositiveSafeInteger }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "story_event"; readonly eventId: EventId }
  | { readonly kind: "debug"; readonly reasonId: ReasonId };

interface InventoryBatchV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
  readonly acquiredDay: DayIndex;
  readonly lastUsableDay: AbsoluteDayIndex;
  readonly refrigerationExtended: boolean;
  readonly source: InventorySourceRefV1;
}

interface ItemStackV1 {
  readonly itemId: ItemId;
  readonly quantity: Quantity;
}

interface InventoryStateV1 {
  readonly startingCash: Money;
  readonly cash: Money;
  readonly ingredientBatches: readonly InventoryBatchV1[];
  readonly itemStacks: readonly ItemStackV1[];
  readonly ledger: readonly LedgerEntryV1[];
}

interface IngredientQuantityV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

interface ItemQuantityV1 {
  readonly itemId: ItemId;
  readonly quantity: Quantity;
}

interface BatchConsumptionV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}
```

### 3.3 Aura/Status

```ts
type AuraTargetV1 =
  | { readonly kind: "actor"; readonly actorId: ActorId }
  | { readonly kind: "tavern" }
  | { readonly kind: "run" };

type AuraDurationV1 =
  | {
      readonly kind: "countdown";
      readonly unit: "phase_end" | "day_end" | "opening" | "night_recovery";
      readonly remaining: PositiveSafeInteger;
    }
  | { readonly kind: "until_cleared" };

type AuraDurationPolicyV1 =
  | {
      readonly kind: "countdown";
      readonly unit: "phase_end" | "day_end" | "opening" | "night_recovery";
      readonly defaultRemaining: PositiveSafeInteger;
      readonly maximumRemaining: PositiveSafeInteger;
    }
  | { readonly kind: "until_cleared" };

type AuraSourceRefV1 =
  | { readonly kind: "initial"; readonly reasonId: ReasonId }
  | { readonly kind: "story_event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "debug"; readonly reasonId: ReasonId };

interface AuraInstanceV1 {
  readonly instanceId: AuraInstanceId;
  readonly auraId: AuraId;
  readonly target: AuraTargetV1;
  readonly source: AuraSourceRefV1;
  readonly duration: AuraDurationV1;
  readonly appliedAtSequence: NonNegativeSafeInteger;
}

interface StatusStateV1 {
  readonly auras: readonly AuraInstanceV1[];
}
```

### 3.4 Tavern 与营业工作流

```ts
interface PlannedRecipeV1 {
  readonly recipeId: RecipeId;
  readonly portions: Quantity;
}

interface TavernPlanV1 {
  readonly mode: ServiceMode;
  readonly menu: readonly PlannedRecipeV1[]; // structural 0..16; contextual recipe/portion limits come from StoryBalance
}

type DemandRandomOffset = -1 | 0 | 1;

interface DemandSeedSegmentStateV1 {
  readonly segmentId: CustomerSegmentId;
  readonly baseCustomers: NonNegativeSafeInteger;
  readonly randomOffset: DemandRandomOffset;
}

interface DemandDayStateV1 {
  readonly day: DayIndex;
  readonly segments: readonly DemandSeedSegmentStateV1[];
}

interface MaterializedDemandSegmentV1 {
  readonly segmentId: CustomerSegmentId;
  readonly preview: IntegerRangeV1;
  readonly actualCustomers: NonNegativeSafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
}

interface MaterializedDemandDayV1 {
  readonly day: DayIndex;
  readonly segments: readonly MaterializedDemandSegmentV1[];
}

interface FacilityStateV1 {
  readonly facilityId: FacilityId;
  readonly builtAtSequence: PositiveSafeInteger;
}

type FacilityDecisionV1 =
  { readonly kind: "built"; readonly facilityId: FacilityId } | { readonly kind: "skipped" };

interface FacilityDecisionRecordV1 {
  readonly opportunityId: ActionId;
  readonly decision: FacilityDecisionV1;
}

interface HelperStateV1 {
  readonly unlocked: boolean;
  readonly tier: HelperTier;
}

interface DailyPreparationStateV1 {
  readonly day: DayIndex;
  readonly actionCount: NonNegativeSafeInteger;
}

interface TavernStateV1 {
  readonly reputation: NonNegativeSafeInteger;
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly helper: HelperStateV1;
  readonly preparation: DailyPreparationStateV1;
  readonly servicePlan: TavernPlanV1 | null;
  readonly demandSeeds: readonly DemandDayStateV1[];
  readonly currentDemand: MaterializedDemandDayV1 | null;
  readonly serviceHistory: readonly ServiceHistoryEntryV1[];
}

interface FacilitiesStateV1 {
  readonly built: readonly FacilityStateV1[];
  readonly decisions: readonly FacilityDecisionRecordV1[];
}

type LedgerCategoryV1 =
  | "purchase"
  | "wage"
  | "opening_fee"
  | "revenue"
  | "discarded_food"
  | "spoiled_ingredient"
  | "facility"
  | "world_action"
  | "levy"
  | "story_reward"
  | "story_cost"
  | "debug_adjustment";

type LedgerSubjectV1 =
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "item"; readonly itemId: ItemId }
  | { readonly kind: "recipe"; readonly recipeId: RecipeId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "service_mode"; readonly mode: ServiceMode }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "action"; readonly actionId: ActionId }
  | { readonly kind: "levy" }
  | { readonly kind: "debug" };

interface LedgerEntryV1 {
  readonly entryId: LedgerEntryId;
  readonly category: LedgerCategoryV1;
  readonly reasonId: ReasonId;
  readonly cashDelta: SafeInteger;
  readonly valuationDelta: SafeInteger;
  readonly subject: LedgerSubjectV1;
  readonly quantity?: Quantity;
}

interface LedgerEntryDraftV1 {
  readonly category: LedgerCategoryV1;
  readonly reasonId: ReasonId;
  readonly cashDelta: SafeInteger;
  readonly valuationDelta: SafeInteger;
  readonly subject: LedgerSubjectV1;
  readonly quantity?: Quantity;
}

interface OpeningOrderLineV1 {
  readonly segmentId: CustomerSegmentId;
  readonly recipeId: RecipeId;
  readonly potentialCustomers: NonNegativeSafeInteger;
  readonly effectiveOrders: NonNegativeSafeInteger;
  readonly capacityAccepted: NonNegativeSafeInteger;
  readonly actualSales: NonNegativeSafeInteger;
}

interface OpeningLedgerV1 {
  readonly sessionId: OpeningSessionId;
  readonly day: DayIndex;
  readonly mode: OpenServiceMode;
  readonly preparationActionCount: NonNegativeSafeInteger;
  readonly menu: readonly PlannedRecipeV1[];
  readonly orders: readonly OpeningOrderLineV1[];
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly discardedPortions: readonly PlannedRecipeV1[];
  readonly entryIds: readonly LedgerEntryId[];
  readonly ap: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly playerStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly cash: BeforeAfterV1<Money>;
  readonly reputation: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly teamwork: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineMood: BeforeAfterV1<MoodPoint>;
  readonly triggeredEventIds: readonly EventId[];
  readonly appliedModifiers: readonly AppliedModifierV1[];
}

interface ClosureHistoryV1 {
  readonly day: DayIndex;
  readonly kind: "planned" | "emergency";
  readonly reasonId: ReasonId;
  readonly reputation: BeforeAfterV1<NonNegativeSafeInteger>;
}

type ServiceHistoryEntryV1 =
  | { readonly kind: "opening"; readonly opening: OpeningLedgerV1 }
  | { readonly kind: "closure"; readonly closure: ClosureHistoryV1 };

interface OpeningActorInputsV1 {
  readonly playerAttributes: AttributeRanksV1;
  readonly heroineMood: MoodPoint;
  readonly relationship: RelationshipStateV1;
  readonly helper: HelperStateV1;
}

interface OpeningBaselineV1 {
  readonly startedAtSequence: PositiveSafeInteger;
  readonly day: DayIndex;
  readonly mode: OpenServiceMode;
  readonly preparationActionCount: NonNegativeSafeInteger;
  readonly ap: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly playerStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly cashAtStart: BeforeAfterV1<Money>;
  readonly reputationBeforeStart: NonNegativeSafeInteger;
  readonly menu: readonly PlannedRecipeV1[];
  readonly preparedPortions: readonly PlannedRecipeV1[];
  readonly consumedIngredients: readonly BatchConsumptionV1[];
  readonly demand: readonly MaterializedDemandSegmentV1[];
  readonly actors: OpeningActorInputsV1;
  readonly facilityIds: readonly FacilityId[];
  readonly modifiers: readonly ModifierV1[];
  readonly startEntryIds: readonly LedgerEntryId[];
}

type OpeningCheckpointV1 = "started" | "middle" | "before_finalize" | "ready_to_finalize";

interface OpeningBlockingEventV1 {
  readonly eventId: EventId;
  readonly sceneId: SceneId;
}

interface OpeningSessionV1 {
  readonly kind: "opening";
  readonly sessionId: OpeningSessionId;
  readonly checkpoint: OpeningCheckpointV1;
  readonly baseline: OpeningBaselineV1;
  readonly triggeredEventIds: readonly EventId[];
  readonly sessionModifiers: readonly ModifierV1[];
  readonly blockingEvent: OpeningBlockingEventV1 | null;
}

interface WorldActionChoiceV1 {
  readonly choiceId: ChoiceId;
  readonly committedAtSequence: PositiveSafeInteger;
}

type WorldActionProgressV1 =
  "begin_scene" | "awaiting_completion_phase" | "completion_scene" | "ready_to_complete";

interface WorldActionSessionV1 {
  readonly kind: "world_action";
  readonly actionId: ActionId;
  readonly optionId: ChoiceId;
  readonly beginStepId: WorldStepId;
  readonly completionStepId: WorldStepId;
  readonly preparationBonus: SafeInteger;
  readonly startedAtSequence: PositiveSafeInteger;
  readonly startedDay: DayIndex;
  readonly startedPhase: CalendarPhase;
  readonly progress: WorldActionProgressV1;
  readonly paidCostEntryIds: readonly LedgerEntryId[];
  readonly choices: readonly WorldActionChoiceV1[];
}

type ActiveWorkflowV1 = OpeningSessionV1 | WorldActionSessionV1;
```

`tavern.opening.start` 在无候选的正式 Story 中可以连续执行三个空 checkpoint 并直接建立 `ready_to_finalize`；一旦某 checkpoint 触发交互事件，就停在该 checkpoint。事件叙事完成后必须显式提交 `tavern.opening.continue`，按 `started → middle → before_finalize → ready_to_finalize` 前进。`tavern.opening.finalize` 只接受 `ready_to_finalize`，因此不会兼具“调度事件”和“结算”两种语义。

`OpeningBaseline.modifiers` 不是所有当前 Modifier 的快照，而是 Start 时由 preview/execute 共用 collector 针对当晚 mode、参与者和目标筛出的适用 Modifier。来源为 Aura 的 Modifier 只有实际进入该集合才算该 Aura 对本次 Opening 适用；营业事件稍后产生的 `sessionModifiers` 不反向改变这一判定。

`WorldActionSession` 的两步演出也是权威工作流的一部分：

1. `world.action.begin` 完成全部守卫、成本和 begin effects 后建立 Session，设置 `progress="begin_scene"`，并请求以 begin step 的 `sceneId`、`NarrativeSourceV1.kind="world_action"` 建立 Narrative；任一候选状态、Scheduler 或 Narrative 冲突会回滚整条 Begin；
2. begin scene 的 `end` 在同一 `narrative.advance` 事务把 progress 改为 `awaiting_completion_phase`。在此之前 `calendar.advance_phase` 被 Narrative 拒绝；之后它只能推进到 completion step 声明的紧邻时段；
3. 该 `calendar.advance_phase` 完成时设置 `progress="completion_scene"` 并请求 completion step scene。scene 的 `end` 把 progress 改为 `ready_to_complete`；
4. `world.action.complete` 只接受 `ready_to_complete` 且当前时段等于 completion step。它调用 Check rule、原子追加 ResolvedCheck/effects、清空 workflow，不再启动第三段隐式 Narrative；结果演出读取已提交的 ResolvedCheck projection；
5. step scene 与本命令 Scheduler 选出的 scene 进入同一个 blocking-request 仲裁。零或一个请求才可提交；两个请求不排队、不覆盖，以 `narrative.blocking_conflict` 故障并回滚状态、RNG、事件和游标。

### 3.5 Story 运行态与 Narrative 游标

```ts
type StoryValueV1 =
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "integer"; readonly value: SafeInteger }
  | { readonly kind: "token"; readonly value: StoryToken };

interface FactEntryV1 {
  readonly factId: FactId;
  readonly value: StoryValueV1;
}

type QuestStatusV1 = "locked" | "active" | "completed" | "failed";

interface QuestEntryV1 {
  readonly questId: QuestId;
  readonly status: QuestStatusV1;
  readonly progress: NonNegativeSafeInteger;
  readonly target: PositiveSafeInteger;
}

interface OutcomeEntryV1 {
  readonly outcomeId: OutcomeId;
  readonly value: StoryValueV1;
}

interface NarrativeCursorV1 {
  readonly sceneId: SceneId;
  readonly nodeId: NodeId;
}

interface NarrativeCallFrameV1 {
  readonly sceneId: SceneId;
  readonly returnNodeId: NodeId;
}

type CharacterSlotV1 = "left" | "center" | "right";

interface NarrativeCharacterStateV1 {
  readonly slot: CharacterSlotV1;
  readonly characterId: CharacterId;
  readonly poseAssetId: AssetId;
}

interface NarrativeStageStateV1 {
  readonly backgroundAssetId: AssetId | null;
  readonly characters: readonly NarrativeCharacterStateV1[];
  readonly transition: "cut" | "fade";
}

type NarrativeSourceV1 =
  | { readonly kind: "manifest_start" }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "debug_fixture"; readonly fixtureId: FixtureId };

interface NarrativeRuntimeStateV1 {
  readonly status: "idle" | "active" | "completed";
  readonly source: NarrativeSourceV1 | null;
  readonly cursor: NarrativeCursorV1 | null;
  readonly callStack: readonly NarrativeCallFrameV1[];
  readonly stage: NarrativeStageStateV1;
}

interface StoryRuntimeStateV1 {
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
  readonly resolvedChecks: readonly ResolvedCheckV1[];
  readonly narrative: NarrativeRuntimeStateV1;
}
```

Bootstrap 生命周期固定为：`createInitialSnapshot` 产生 sequence 0、零 RNG 消费、`run.status="setup"`、`calendar={day:1,phase:"morning",lifePolicyId:null,apRemaining:0,eveningResolved:false}`、空 `demandSeeds`、`currentDemand=null`、无 workflow 的 replay base；Narrative 必须是 `idle`，`source/cursor=null`，callStack 为空，stage 使用 `{ backgroundAssetId:null, characters:[], transition:"cut" }`。第一条 `run.start` 原子生成本轮 12 个 demand random offsets、持久化 base+offset seeds，并用初始 reputation/Fact/Modifier 物化 D1 `currentDemand`，再以 `StoryManifestV1.initialSceneId` 的 entry node 建立 `NarrativeSourceV1.kind="manifest_start"`；它与同命令 Scheduler scene 仍受单 blocking-request 仲裁。玩家必须走完该开局场景后才能提交 `policy.choose`；该命令才按所选 policy 写入 D1 morning AP 并进入 active，场景结束不会自行选择生活方针。

## 4. PocGameCommandV1

```ts
interface PurchaseLineV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

type FacilityChoiceV1 =
  { readonly kind: "build"; readonly facilityId: FacilityId } | { readonly kind: "skip" };

type PocGameCommandV1 =
  | { readonly kind: "run.start" }
  | { readonly kind: "policy.choose"; readonly policyId: PolicyId }
  | {
      readonly kind: "inventory.buy";
      readonly lines: readonly PurchaseLineV1[];
    }
  | { readonly kind: "actor.prepare_food" }
  | { readonly kind: "actor.rest" }
  | { readonly kind: "story.action.start"; readonly actionId: ActionId }
  | {
      readonly kind: "facility.choose";
      readonly opportunityId: ActionId;
      readonly choice: FacilityChoiceV1;
    }
  | { readonly kind: "tavern.plan.set"; readonly plan: TavernPlanV1 }
  | { readonly kind: "tavern.opening.start" }
  | { readonly kind: "tavern.opening.continue" }
  | { readonly kind: "tavern.opening.finalize" }
  | {
      readonly kind: "world.action.begin";
      readonly actionId: ActionId;
      readonly optionId: ChoiceId;
    }
  | { readonly kind: "world.action.complete" }
  | { readonly kind: "narrative.advance" }
  | {
      readonly kind: "narrative.choose";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
      readonly choiceId: ChoiceId;
    }
  | { readonly kind: "calendar.advance_phase" }
  | { readonly kind: "levy.pay" };
```

`inventory.buy.lines` 结构上限为 1..64、ingredient ID 唯一，且上下文行数上限为 `StoryBalance.purchaseLineLimit`、
每行数量上限为 `StoryBalance.purchaseQuantityPerLineLimit`。`closed` plan 菜单必须为空；其他 mode 的菜单结构范围为
1..16、recipe ID 唯一，且上下文菜谱数上限为 `StoryBalance.menuRecipeLimit`、每道菜份数上限为
`StoryBalance.menuPortionsPerRecipeLimit`。这些静态上限先于现金、接待容量、备菜能力和原料等动态资源约束检查；
命令不带时间戳、provenance、随机结果或 UI 字段。

## 5. PocGameplayFactV1 与 PocRejectionReasonV1

### 5.1 领域事实

```ts
type ChangeReasonV1 =
  | {
      readonly kind: "command";
      readonly commandKind: PocGameCommandV1["kind"];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug";
      readonly commandKind: ReplayableDebugCommandV1["kind"];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "event";
      readonly eventId: EventId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "story_action";
      readonly actionId: ActionId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "world_action";
      readonly actionId: ActionId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura";
      readonly auraId: AuraId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "facility";
      readonly facilityId: FacilityId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "ending";
      readonly endingId: EndingId;
      readonly reasonId: ReasonId;
    };

interface StaminaChangeComponentV1 {
  readonly requestedDelta: SafeInteger;
  readonly reason: ChangeReasonV1;
}

type PocGameplayFactV1 =
  | {
      readonly kind: "run.started";
      readonly runId: RunId;
      readonly initialSeed: NonZeroUint32;
      readonly demandSeeds: readonly DemandDayStateV1[];
    }
  | {
      readonly kind: "policy.chosen";
      readonly policyId: PolicyId;
      readonly apRemaining: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "demand.materialized";
      readonly demand: MaterializedDemandDayV1;
    }
  | {
      readonly kind: "calendar.ap_changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "calendar.phase_advanced";
      readonly from: { readonly day: DayIndex; readonly phase: CalendarPhase };
      readonly to: { readonly day: DayIndex; readonly phase: CalendarPhase };
      readonly apRemaining: NonNegativeSafeInteger;
      readonly expiredAuraIds: readonly AuraInstanceId[];
    }
  | {
      readonly kind: "actor.stamina_changed";
      readonly actorId: ActorId;
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly components: readonly StaminaChangeComponentV1[];
    }
  | {
      readonly kind: "actor.mood_changed";
      readonly actorId: ActorId;
      readonly value: BeforeAfterV1<MoodPoint>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.affection_changed";
      readonly value: BeforeAfterV1<SafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.teamwork_changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.stage_changed";
      readonly value: BeforeAfterV1<RelationshipStage>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.purchased";
      readonly lines: readonly PurchaseLineV1[];
      readonly createdBatchIds: readonly BatchId[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "inventory.consumed";
      readonly lines: readonly BatchConsumptionV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.ingredient_granted";
      readonly lines: readonly IngredientQuantityV1[];
      readonly createdBatchIds: readonly BatchId[];
      readonly entries: readonly LedgerEntryV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item_granted";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item_consumed";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.spoiled";
      readonly lines: readonly BatchConsumptionV1[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "food.prepared";
      readonly day: DayIndex;
      readonly actionCount: NonNegativeSafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "food.discarded";
      readonly portions: readonly PlannedRecipeV1[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "cash.changed";
      readonly value: BeforeAfterV1<Money>;
      readonly delta: SafeInteger;
      readonly entryIds: readonly LedgerEntryId[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "reputation.changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.helper_changed";
      readonly value: BeforeAfterV1<HelperStateV1>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "story.action_started";
      readonly actionId: ActionId;
      readonly sceneId: SceneId | null;
    }
  | {
      readonly kind: "facility.choice_committed";
      readonly opportunityId: ActionId;
      readonly choice: FacilityDecisionV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.applied";
      readonly aura: AuraInstanceV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.cleared";
      readonly instanceId: AuraInstanceId;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.expired";
      readonly instanceId: AuraInstanceId;
      readonly auraId: AuraId;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.plan_set";
      readonly plan: TavernPlanV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.planned_closed";
      readonly closure: ClosureHistoryV1;
    }
  | {
      readonly kind: "tavern.emergency_closed";
      readonly closure: ClosureHistoryV1;
    }
  | {
      readonly kind: "opening.started";
      readonly sessionId: OpeningSessionId;
      readonly checkpoint: OpeningCheckpointV1;
    }
  | {
      readonly kind: "opening.checkpoint_advanced";
      readonly sessionId: OpeningSessionId;
      readonly from: OpeningCheckpointV1;
      readonly to: OpeningCheckpointV1;
    }
  | {
      readonly kind: "scheduler.event_triggered";
      readonly checkpointId: CheckpointId;
      readonly eventId: EventId;
    }
  | {
      readonly kind: "service.orders_created";
      readonly sessionId: OpeningSessionId;
      readonly orders: readonly OpeningOrderLineV1[];
    }
  | {
      readonly kind: "service.capacity_limited";
      readonly sessionId: OpeningSessionId;
      readonly receptionCapacity: NonNegativeSafeInteger;
      readonly preparationCapacity: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "service.sale";
      readonly sessionId: OpeningSessionId;
      readonly recipeId: RecipeId;
      readonly quantity: Quantity;
      readonly revenue: NonNegativeSafeInteger;
    }
  | { readonly kind: "opening.finalized"; readonly ledger: OpeningLedgerV1 }
  | {
      readonly kind: "world.action_started";
      readonly actionId: ActionId;
      readonly stepId: WorldStepId;
    }
  | {
      readonly kind: "world.action_completed";
      readonly actionId: ActionId;
      readonly bandId: CheckBandId | null;
    }
  | {
      readonly kind: "narrative.advanced";
      readonly from: NarrativeCursorV1;
      readonly to: NarrativeCursorV1 | null;
    }
  | {
      readonly kind: "narrative.choice_committed";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
    }
  | { readonly kind: "check.resolved"; readonly result: CheckResultV1 }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "quest.updated";
      readonly quest: QuestEntryV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "levy.paid";
      readonly amount: Money;
      readonly cash: BeforeAfterV1<Money>;
    }
  | { readonly kind: "run.completed"; readonly completion: RunCompletionV1 };
```

`pocGameplayFactSchemaV1: RuntimeSchemaV1<PocGameplayFactV1>` 是完整 Fact union 的共享 strict Schema。它按 kind 复用各 owner contract 已有的 strict Fact parser，只在 aggregate runtime-schema 层解析 executor-only Fact cases；owner parser 从 private 改为 exported 不得改变字段、错误边界或语义。`PocGameplayFactV1` 数组保持引擎应用顺序；不按 kind 或 ID 重排。它是成功 dispatch 的非权威输出，不能再次应用来恢复或修改 Snapshot；Snapshot 内的持久 `FactId`/`fact.set` 是 Story Fact，二者不得混用。

### 5.2 拒绝原因与精确 details

```ts
type CommandReferenceV1 =
  | { readonly kind: "policy"; readonly policyId: PolicyId }
  | { readonly kind: "action"; readonly actionId: ActionId }
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "recipe"; readonly recipeId: RecipeId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "facility_opportunity"; readonly opportunityId: ActionId }
  | {
      readonly kind: "world_option";
      readonly actionId: ActionId;
      readonly optionId: ChoiceId;
    }
  | { readonly kind: "scene"; readonly sceneId: SceneId }
  | {
      readonly kind: "node";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
    }
  | {
      readonly kind: "choice";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
      readonly choiceId: ChoiceId;
    };

type WorkflowBlockerV1 =
  | { readonly kind: "opening"; readonly checkpoint: OpeningCheckpointV1 }
  | { readonly kind: "world_action"; readonly progress: WorldActionProgressV1 };

type PocRejectionReasonV1 =
  | {
      readonly code: "run.invalid_status";
      readonly details: {
        readonly actual: RunStatus;
        readonly allowed: readonly RunStatus[];
      };
    }
  | {
      readonly code: "run.already_started";
      readonly details: { readonly [key: string]: never };
    }
  | {
      readonly code: "run.not_started";
      readonly details: {
        readonly commandKind: Exclude<PocGameCommandV1["kind"], "run.start">;
      };
    }
  | {
      readonly code: "run.policy_required";
      readonly details: { readonly commandKind: PocGameCommandV1["kind"] };
    }
  | {
      readonly code: "command.unknown_reference";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly reference: CommandReferenceV1;
      };
    }
  | {
      readonly code: "command.blocked_by_narrative";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly cursor: NarrativeCursorV1;
      };
    }
  | {
      readonly code: "command.blocked_by_workflow";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly blocker: WorkflowBlockerV1;
      };
    }
  | {
      readonly code: "policy.already_chosen";
      readonly details: { readonly policyId: PolicyId };
    }
  | {
      readonly code: "calendar.invalid_phase";
      readonly details: {
        readonly actual: CalendarPhase;
        readonly allowed: readonly CalendarPhase[];
      };
    }
  | {
      readonly code: "calendar.insufficient_ap";
      readonly details: {
        readonly required: NonNegativeSafeInteger;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "calendar.phase_blocked";
      readonly details: {
        readonly blocker:
          "narrative" | "opening" | "world_action" | "evening_unresolved" | "levy_due";
      };
    }
  | {
      readonly code: "action.unavailable";
      readonly details: {
        readonly actionId: ActionId;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "actor.insufficient_stamina";
      readonly details: {
        readonly actorId: ActorId;
        readonly required: NonNegativeSafeInteger;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "actor.stamina_at_maximum";
      readonly details: {
        readonly actorId: ActorId;
        readonly maximum: PositiveSafeInteger;
      };
    }
  | {
      readonly code: "tavern.preparation_limit_reached";
      readonly details: {
        readonly current: NonNegativeSafeInteger;
        readonly limit: PositiveSafeInteger;
      };
    }
  | {
      readonly code: "inventory.invalid_quantity";
      readonly details: {
        readonly ingredientId: IngredientId;
        readonly quantity: SafeInteger;
      };
    }
  | {
      readonly code: "inventory.duplicate_line";
      readonly details: { readonly ingredientId: IngredientId };
    }
  | {
      readonly code: "inventory.line_limit_exceeded";
      readonly details: {
        readonly actual: PositiveSafeInteger;
        readonly limit: PositiveSafeInteger;
      };
    }
  | {
      readonly code: "inventory.insufficient_cash";
      readonly details: { readonly required: Money; readonly available: Money };
    }
  | {
      readonly code: "inventory.insufficient_ingredient";
      readonly details: {
        readonly ingredientId: IngredientId;
        readonly required: Quantity;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "facility.unavailable";
      readonly details: {
        readonly opportunityId: ActionId;
        readonly facilityId: FacilityId | null;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "facility.target_not_offered";
      readonly details: {
        readonly opportunityId: ActionId;
        readonly facilityId: FacilityId;
      };
    }
  | {
      readonly code: "facility.already_built";
      readonly details: { readonly facilityId: FacilityId };
    }
  | {
      readonly code: "facility.choice_committed";
      readonly details: {
        readonly opportunityId: ActionId;
        readonly choice: FacilityDecisionV1;
      };
    }
  | {
      readonly code: "aura.already_present";
      readonly details: {
        readonly auraId: AuraId;
        readonly target: AuraTargetV1;
      };
    }
  | {
      readonly code: "aura.not_found";
      readonly details: {
        readonly auraId: AuraId;
        readonly target: AuraTargetV1;
      };
    }
  | {
      readonly code: "tavern.invalid_plan";
      readonly details: {
        readonly reason:
          | "menu_size"
          | "closed_has_menu"
          | "open_has_no_menu"
          | "duplicate_recipe"
          | "unknown_recipe"
          | "locked_recipe"
          | "portion_limit"
          | "capacity"
          | "preparation_capacity";
      };
    }
  | {
      readonly code: "tavern.plan_frozen";
      readonly details: {
        readonly day: DayIndex;
        readonly phase: CalendarPhase;
      };
    }
  | {
      readonly code: "tavern.service_unavailable";
      readonly details: {
        readonly mode: ServiceMode;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "tavern.opening_plan_missing";
      readonly details: { readonly day: DayIndex };
    }
  | {
      readonly code: "tavern.evening_resolved";
      readonly details: {
        readonly day: DayIndex;
        readonly planMode: ServiceMode | null;
      };
    }
  | {
      readonly code: "tavern.opening_active";
      readonly details: { readonly sessionId: OpeningSessionId };
    }
  | {
      readonly code: "tavern.opening_missing";
      readonly details: {
        readonly commandKind: "tavern.opening.continue" | "tavern.opening.finalize";
      };
    }
  | {
      readonly code: "tavern.opening_checkpoint_blocked";
      readonly details: {
        readonly checkpoint: OpeningCheckpointV1;
        readonly eventId: EventId | null;
      };
    }
  | {
      readonly code: "tavern.opening_continue_not_needed";
      readonly details: { readonly checkpoint: "ready_to_finalize" };
    }
  | {
      readonly code: "tavern.opening_not_ready";
      readonly details: { readonly checkpoint: OpeningCheckpointV1 };
    }
  | {
      readonly code: "workflow.conflict";
      readonly details: {
        readonly activeKind: ActiveWorkflowV1["kind"];
        readonly attemptedKind: ActiveWorkflowV1["kind"];
      };
    }
  | {
      readonly code: "workflow.missing";
      readonly details: {
        readonly expectedKind: ActiveWorkflowV1["kind"];
        readonly commandKind: "world.action.complete";
      };
    }
  | {
      readonly code: "world.action_unavailable";
      readonly details: {
        readonly actionId: ActionId;
        readonly optionId: ChoiceId | null;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "world.action_wrong_phase";
      readonly details: {
        readonly actionId: ActionId;
        readonly expected: CalendarPhase;
        readonly actual: CalendarPhase;
      };
    }
  | {
      readonly code: "narrative.inactive";
      readonly details: {
        readonly commandKind: "narrative.advance" | "narrative.choose";
      };
    }
  | {
      readonly code: "narrative.cursor_mismatch";
      readonly details: {
        readonly expected: NarrativeCursorV1;
        readonly actual: NarrativeCursorV1 | null;
      };
    }
  | {
      readonly code: "narrative.choice_required";
      readonly details: { readonly cursor: NarrativeCursorV1 };
    }
  | {
      readonly code: "narrative.choice_hidden";
      readonly details: { readonly choiceId: ChoiceId };
    }
  | {
      readonly code: "narrative.choice_disabled";
      readonly details: {
        readonly choiceId: ChoiceId;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "levy.not_due";
      readonly details: {
        readonly day: DayIndex;
        readonly phase: CalendarPhase;
      };
    }
  | {
      readonly code: "story.rule_rejected";
      readonly details: {
        readonly slot: StoryRuleSlotV1;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "engine.invariant_rejected";
      readonly details: { readonly invariantCode: EngineInvariantCodeV1 };
    };
```

拒绝不含玩家文案。UI 用 `code + details` 映射本地化文本，不解析 `message`。

所有通过 Schema 的 `PocGameCommandV1` 都必须只以 committed、上述 Rejection 或稳定 Fault 结束，handler 不得临时发明 code：sequence 0/空 demandSeeds 时除 `run.start` 外的命令使用 `run.not_started`，demandSeeds 已物化后重复 Start 使用 `run.already_started`，其 `details` 是 strict empty object，不泄漏 engine-owned sequence；未知 stable ID 使用 `command.unknown_reference`；非 Narrative 命令在 active Narrative 中使用 `command.blocked_by_narrative`；没有 WorldActionSession 的 Complete 使用 `workflow.missing`；Complete 不在第二 step 时段使用 `world.action_wrong_phase`；`narrative.advance` 停在 choice node 时使用 `narrative.choice_required`；无计划开店和已主动/紧急停业分别使用 `tavern.opening_plan_missing` 与 `tavern.evening_resolved`；Opening 已 ready 时多余 Continue 使用 `tavern.opening_continue_not_needed`。Story availability gate 失败仍使用对应领域的 `*.unavailable + reasonId`，不能拿 `engine.invariant_rejected` 代替普通玩家拒绝。

Start 后、policy 为空期间的 guard 顺序固定：active manifest Narrative 时允许 Narrative controls 正常推进，
所有非 Narrative 命令（包括 policy.choose）先返回 `command.blocked_by_narrative`；manifest completed 后只允许
`policy.choose`，其他 GameCommand 返回 `run.policy_required`。重复 `run.start` 始终优先返回
`run.already_started`。Save/export/query 不属于 GameCommand，仍可使用。

Active workflow 对 GameCommand 的 allowlist 也是共享守卫：Opening 有 active Narrative 时只允许 Narrative controls；
Scene 已结束而 checkpoint 尚未 ready 时只允许 `tavern.opening.continue`；ready 时只允许
`tavern.opening.finalize`。WorldAction 的 begin_scene/completion_scene 只允许 Narrative controls，
awaiting_completion_phase 只允许 `calendar.advance_phase`，ready_to_complete 只允许
`world.action.complete`。Narrative active 时仍优先返回 `command.blocked_by_narrative`；其余不在 allowlist 的
GameCommand 返回 `command.blocked_by_workflow`。Save/export/query 不是
GameCommand，不受此限制。

## 6. Modifier、EffectIntent 与规则账本

```ts
type ModifierSourceRefV1 =
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story"; readonly sourceId: ModifierSourceId };

type ModifierV1 =
  | {
      readonly kind: "capacity.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "prep_points.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "recovery.add";
      readonly source: ModifierSourceRefV1;
      readonly actorId: ActorId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "demand.add";
      readonly source: ModifierSourceRefV1;
      readonly segmentId: CustomerSegmentId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "check.add";
      readonly source: ModifierSourceRefV1;
      readonly checkId: CheckId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "shelf_life.add_days";
      readonly source: ModifierSourceRefV1;
      readonly ingredientIds: readonly IngredientId[];
      readonly amount: PositiveSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "teamwork_gain.block";
      readonly source: ModifierSourceRefV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "service_cost.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    };

type PocEffectSourceV1 =
  | {
      readonly kind: "command";
      readonly commandKind: PocGameCommandV1["kind"];
    }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "ending"; readonly endingId: EndingId };

type EffectIntentV1 =
  | {
      readonly kind: "calendar.ap.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "reputation.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "actor.stamina.adjust";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "actor.mood.adjust";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.affection.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.teamwork.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.grant";
      readonly lines: readonly IngredientQuantityV1[];
      readonly source: InventorySourceRefV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.consume";
      readonly lines: readonly IngredientQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.item.grant";
      readonly lines: readonly ItemQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.item.consume";
      readonly lines: readonly ItemQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly source: AuraSourceRefV1;
      readonly duration: AuraDurationV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "quest.set";
      readonly quest: QuestEntryV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "modifier.add";
      readonly lifetime: "opening_session";
      readonly modifier: ModifierV1;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "ledger.append"; readonly entry: LedgerEntryDraftV1 };

type ProgressionEffectIntentV1 = Extract<
  EffectIntentV1,
  { readonly kind: "fact.set" | "quest.set" | "outcome.set" }
>;

type PocEffectIntentV1 = EffectIntentV1;

const pocEffectIntentKindsV1 = [
  "calendar.ap.adjust",
  "reputation.adjust",
  "actor.stamina.adjust",
  "actor.mood.adjust",
  "relationship.affection.adjust",
  "relationship.teamwork.adjust",
  "relationship.stage.set",
  "tavern.helper.set",
  "inventory.grant",
  "inventory.consume",
  "inventory.item.grant",
  "inventory.item.consume",
  "aura.apply",
  "aura.clear",
  "fact.set",
  "quest.set",
  "outcome.set",
  "modifier.add",
  "ledger.append",
] as const satisfies readonly PocEffectIntentV1["kind"][];

declare const pocEffectIntentSchemaV1: RuntimeSchemaV1<PocEffectIntentV1>;
declare const pocEffectSourceSchemaV1: RuntimeSchemaV1<PocEffectSourceV1>;

declare function validatePocEffectIntentForSourceV1(
  effect: DeepReadonly<PocEffectIntentV1>,
  source: DeepReadonly<PocEffectSourceV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): PocEffectIntentV1;

interface PocEffectBatchResultV1 {
  readonly kind: "applied" | "rejected";
  readonly rejection?: PocRejectionReasonV1;
}

declare function routePocEffectBatchV1(
  candidate: PocTransactionCandidateV1,
  effects: readonly DeepReadonly<PocEffectIntentV1>[],
  source: DeepReadonly<PocEffectSourceV1>,
): PocEffectBatchResultV1;
```

`PocEffectSourceV1` 是 Router 调用参数，不是 `EffectIntentV1` 的新增字段，也不进入 Snapshot、GameplayFact、ledger 或任何持久 ABI。其七个 kind 精确表示当前 authored batch 的 command/Event/StoryAction/WorldAction/Aura/facility/ending 非-debug provenance；Debug 变化只使用专用 executor/owner operation。Aura/facility 是合法的通用 Effect `ChangeReasonV1` 来源，但这不扩大任一 Effect payload 的嵌入式 source union，也不允许跳过 Aura/Facility owner 的专用状态操作。

`validatePocEffectIntentForSourceV1` 先以 `pocEffectSourceSchemaV1` 和 `pocEffectIntentSchemaV1` strict parse，再验证 data 中的 stable references，并返回解析、冻结后的 Effect。`pocSimulationDataSchemaV1` 的静态 Effect 检查必须把 authored owner 映射成同一 `PocEffectSourceV1` 并复用同一底层 reference/provenance guard，不能保留第二套较弱规则。该 guard 要求 `inventory.grant.source`、`aura.apply.source`、`modifier.add.modifier.source` 与显式 batch source 按各 payload 已有 union 做精确的 kind/ID 对应；Event batch 映射到前两个 payload source 中现有的 `story_event` 判别值，不向 payload union 新增 `event` 别名。Aura source 不因此成为 Inventory/Aura payload source；facility source 只有在 payload 本身允许且 ID 相同时才匹配；`modifier.add` 仍只允许下面冻结的 Event source。ending source 只接受 `ProgressionEffectIntentV1`。该函数不接收 State，也不判断 active Opening。

Router 必须先对整批逐项调用该函数，再读取 candidate State 对全部 `modifier.add` 做 stateful preflight，全部通过后才能产生第一个 owner proposal。普通 Effect 的 `ChangeReasonV1` 由显式 batch source 与 Effect 的 `reasonId` 组合；`ledger.append` 使用 `entry.reasonId`。`modifier.add` 只写当前 active `OpeningSession.sessionModifiers`：batch source 必须是 `event`，同一 Event 必须已存在于 `OpeningSession.triggeredEventIds`，且 `modifier.source` 必须是该 Event；v1 不存在永久、无所有者的 Modifier bag。Effect 外层 `reasonId` 只做 stable-reference validation，不写入 State/Fact，也不替换 `modifier.reasonId`；后者才是持久 Modifier explanation，两者不要求相等。

Router 为 owner dependency DTO 读取 Calendar、Facilities 与 active Workflow 时，必须调用 candidate 从当前已选 module tuple 投影的 public read ports；不得直接从 aggregate Snapshot 读取这些 owner slices。该限制同样适用于 Inventory grant 的 day、已建设设施产生的 shelf-life extension，以及 `modifier.add` 的 active-Opening preflight。

Transaction candidate 唯一的直接 RNG replacement seam 是内部 `replaceRngForDebug(rng: DeepReadonly<RngStateV1>): void`。它必须 strict-parse 完整 RNG state、参与 candidate checkpoint rollback，并在 commit 时成为 Snapshot RNG；只有 Task 12 已完成结构 admission 与语义 validation 的 replayable `debug.rng.set` 可以调用。普通 Gameplay、Rule、Resolver、owner、Query 与 projector 只能取得受控 `RuleRngV1` draw capability，不能替换 RNG；该 primitive 不进入 Story 默认入口、GameSimulation、GameQueries、SemanticGamePort 或 UI。

通用 `ledger.append` 只接受以下封闭 provenance matrix：`story_cost | story_reward` 要求 `event` source 使用同 ID 的 event subject，或 `story_action | world_action` source 使用同 ID 的 action subject；`world_action` 要求同 ID 的 WorldAction source/action subject；`wage | opening_fee` 要求 `{ kind: "command", commandKind: "tavern.opening.start" }` 与 service-mode subject；`revenue | discarded_food` 要求 `{ kind: "command", commandKind: "tavern.opening.finalize" }` 与 recipe subject；`levy` 要求 `{ kind: "command", commandKind: "levy.pay" }` 与 levy subject。Aura/facility/ending source 不能路由任何 ledger Effect，其他 source/category/subject 组合全部失败。`purchase`、`facility`、`spoiled_ingredient` 与 `debug_adjustment` 只能由对应 owner-context 专用 operation 生成，不能借 `ledger.append` 绕过余额、数量、结算或 provenance 不变量。

## 7. Narrative IR、PoC Story 数据与启动期 PatchSurface

### 7.1 条件、节点与舞台提示

Condition 数组采用 AND 语义；v1 不提供递归 `and/or/not` 表达式树。

```ts
type ConditionV1 =
  | {
      readonly kind: "actor.rank_at_least";
      readonly attribute: AttributeId;
      readonly rank: AttributeRank;
    }
  | {
      readonly kind: "relationship.stage_is";
      readonly stage: RelationshipStage;
    }
  | {
      readonly kind: "relationship.affection_at_least";
      readonly value: SafeInteger;
    }
  | {
      readonly kind: "fact.equals";
      readonly factId: FactId;
      readonly value: StoryValueV1;
    }
  | {
      readonly kind: "quest.status_is";
      readonly questId: QuestId;
      readonly status: QuestStatusV1;
    }
  | {
      readonly kind: "outcome.equals";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
    }
  | {
      readonly kind: "aura.present";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
    }
  | {
      readonly kind: "inventory.ingredient_at_least";
      readonly ingredientId: IngredientId;
      readonly quantity: Quantity;
    }
  | { readonly kind: "tavern.helper_tier_at_least"; readonly tier: HelperTier }
  | {
      readonly kind: "tavern.facility_opportunity_undecided";
      readonly opportunityId: ActionId;
    }
  | {
      readonly kind: "tavern.reputation_at_least";
      readonly value: NonNegativeSafeInteger;
    }
  | { readonly kind: "calendar.day_at_least"; readonly day: DayIndex }
  | { readonly kind: "calendar.day_at_most"; readonly day: DayIndex }
  | {
      readonly kind: "calendar.matches";
      readonly day: DayIndex;
      readonly phases: readonly CalendarPhase[];
    }
  | { readonly kind: "narrative.not_active" }
  | { readonly kind: "run.started" }
  | { readonly kind: "run.status_is"; readonly status: RunStatus };

interface AvailabilityGateV1 {
  readonly conditions: readonly ConditionV1[];
  readonly reasonId: ReasonId;
}

// run.started 当且仅当 demandSeeds 已完整物化；narrative.not_active 当且仅当 status !== "active"。
// tavern.helper_tier_at_least 在 helper.unlocked=false 时恒为 false，不能只比较 tier 字符串；tier 顺序固定为
// apprentice < skilled < senior < master。tavern.facility_opportunity_undecided 只检查持久
// state.simulation.facilities.decisions 中尚无对应 opportunityId，不能由 Overlay 的开关状态代替。

interface ConfirmationMetadataV1 {
  readonly benefitTextIds: readonly TextId[];
  readonly mutuallyExcludedActionIds: readonly ActionId[];
  readonly majorRiskTextIds: readonly TextId[];
}

type StageCueV1 =
  | {
      readonly kind: "background.set";
      readonly assetId: AssetId;
      readonly transition: "cut" | "fade";
    }
  | {
      readonly kind: "character.show";
      readonly slot: CharacterSlotV1;
      readonly characterId: CharacterId;
      readonly poseAssetId: AssetId;
    }
  | { readonly kind: "character.hide"; readonly slot: CharacterSlotV1 }
  | { readonly kind: "stage.clear"; readonly transition: "cut" | "fade" };

interface CheckRequestV1 {
  readonly checkId: CheckId;
  readonly actorId: "actor.player";
  readonly preparationBonus: SafeInteger;
}

interface NarrativeChoiceV1 {
  readonly choiceId: ChoiceId;
  readonly textId: TextId;
  readonly showWhen: readonly ConditionV1[];
  readonly enableWhen: readonly ConditionV1[];
  readonly disabledReasonId?: ReasonId;
  readonly confirmation: ConfirmationMetadataV1;
  readonly check?: CheckRequestV1;
  readonly effects: readonly EffectIntentV1[];
  readonly nextNodeId: NodeId;
}

type NarrativeNodeV1 =
  | {
      readonly kind: "line";
      readonly nodeId: NodeId;
      readonly speakerId: CharacterId;
      readonly textId: TextId;
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "narration";
      readonly nodeId: NodeId;
      readonly textId: TextId;
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "choice";
      readonly nodeId: NodeId;
      readonly choices: readonly NarrativeChoiceV1[];
    }
  | {
      readonly kind: "condition";
      readonly nodeId: NodeId;
      readonly when: readonly ConditionV1[];
      readonly passNodeId: NodeId;
      readonly failNodeId: NodeId;
    }
  | {
      readonly kind: "check";
      readonly nodeId: NodeId;
      readonly request: CheckRequestV1;
      readonly branches: readonly CheckBranchV1[];
    }
  | {
      readonly kind: "command";
      readonly nodeId: NodeId;
      readonly effects: readonly EffectIntentV1[];
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "eventCheckpoint";
      readonly nodeId: NodeId;
      readonly checkpointId: CheckpointId;
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "jump";
      readonly nodeId: NodeId;
      readonly targetNodeId: NodeId;
    }
  | {
      readonly kind: "call";
      readonly nodeId: NodeId;
      readonly sceneId: SceneId;
      readonly entryNodeId: NodeId;
      readonly returnNodeId: NodeId;
    }
  | { readonly kind: "return"; readonly nodeId: NodeId }
  | {
      readonly kind: "stageCue";
      readonly nodeId: NodeId;
      readonly cue: StageCueV1;
      readonly nextNodeId: NodeId;
    }
  | { readonly kind: "end"; readonly nodeId: NodeId };

interface CheckBranchV1 {
  readonly bandId: CheckBandId;
  readonly nextNodeId: NodeId;
}

interface NarrativeSceneV1 {
  readonly sceneId: SceneId;
  readonly entryNodeId: NodeId;
  readonly nodes: readonly NarrativeNodeV1[];
}
```

PoC 选定的 Actors Module 只有 Player Actor 持有属性段位，因此 `CheckRequestV1` 只能引用
`"actor.player"`；Heroine 仍可作为表现角色、关系对象和 stamina/mood Effect 目标，但不能成为 v1 Check actor。

任何建立或推进 Narrative 的外层命令（包括 run.start、StoryAction/WorldAction、Scheduler 与 Narrative command）
都在同一个事务内调用同一 interpreter 解释自动节点，直到下一个可呈现 line/narration/choice、Scene end 或故障；
不允许把 cursor 提交在 jump/call/return/command/condition/check/eventCheckpoint/stageCue 等内部节点上。
若解释步数超过 `maxNarrativeStepsPerCommand`，或 call push 将超过 `maxNarrativeCallDepth`，分别产生稳定
command-handler fault `narrative.step_limit_exceeded` / `narrative.call_depth_exceeded`，整条外层命令连同
Effect、RNG、cursor、workflow 与 Scheduler 全部回滚；v1 不做隐式分帧续跑。

### 7.2 Story 定义

```ts
interface TextEntryV1 {
  readonly textId: TextId;
}
interface StoryCharacterDefinitionV1 {
  readonly characterId: CharacterId;
  readonly nameTextId: TextId;
  readonly actorId: ActorId | null;
}
interface ReasonDefinitionV1 {
  readonly reasonId: ReasonId;
  readonly textId: TextId;
}
interface CustomerSegmentDefinitionV1 {
  readonly segmentId: CustomerSegmentId;
  readonly nameTextId: TextId;
}
interface ModifierSourceDefinitionV1 {
  readonly sourceId: ModifierSourceId;
  readonly nameTextId: TextId;
}

type ActionOccupationDefinitionV1 =
  | { readonly kind: "none" }
  | { readonly kind: "current_phase" }
  | { readonly kind: "fixed"; readonly phases: readonly CalendarPhase[] };

interface ActionPresentationDefinitionV1 {
  readonly actionId: ActionId;
  readonly labelTextId: TextId;
  readonly commandKind: PocGameCommandV1["kind"];
  readonly availablePhases: readonly CalendarPhase[];
  readonly occupation: ActionOccupationDefinitionV1;
  readonly visibility: readonly AvailabilityGateV1[];
  readonly availability: readonly AvailabilityGateV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

interface StoryActionDefinitionV1 {
  readonly actionId: ActionId;
  readonly sceneId: SceneId | null;
  readonly startEffects: readonly EffectIntentV1[];
}

interface IngredientDefinitionV1 {
  readonly ingredientId: IngredientId;
  readonly nameTextId: TextId;
  readonly unitPrice: Money;
  readonly shelfLifeDays: PositiveSafeInteger;
  readonly refrigeratable: boolean;
}

interface ItemDefinitionV1 {
  readonly itemId: ItemId;
  readonly nameTextId: TextId;
}

interface RecipeIngredientV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}
interface SegmentPreferenceV1 {
  readonly segmentId: CustomerSegmentId;
  readonly value: 0 | 1 | 2 | 3;
}
interface RecipeDefinitionV1 {
  readonly recipeId: RecipeId;
  readonly nameTextId: TextId;
  readonly ingredients: readonly RecipeIngredientV1[];
  readonly salePrice: Money;
  readonly prepPoints: PositiveSafeInteger;
  readonly preferences: readonly SegmentPreferenceV1[];
}

interface ApByPhaseV1 {
  readonly morning: NonNegativeSafeInteger;
  readonly afternoon: NonNegativeSafeInteger;
  readonly evening: NonNegativeSafeInteger;
}

interface LifePolicyDefinitionV1 {
  readonly policyId: PolicyId;
  readonly nameTextId: TextId;
  readonly apByPhase: ApByPhaseV1;
  readonly playerNightRecovery: NonNegativeSafeInteger;
  readonly nightRecoveryReasonId: ReasonId;
}

interface FacilityDefinitionV1 {
  readonly facilityId: FacilityId;
  readonly nameTextId: TextId;
  readonly cashCost: Money;
  readonly modifiers: readonly ModifierV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

interface FacilityOpportunityDefinitionV1 {
  readonly opportunityId: ActionId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly facilityIds: readonly FacilityId[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly skipLabelTextId: TextId;
  readonly skipConfirmation: ConfirmationMetadataV1;
  readonly skipReasonId: ReasonId;
}

interface AuraDefinitionV1 {
  readonly auraId: AuraId;
  readonly nameTextId: TextId;
  readonly reasonId: ReasonId;
  readonly durationPolicy: AuraDurationPolicyV1;
  readonly visibility: "buff" | "debuff" | "hidden";
  readonly allowedTargets: readonly AuraTargetV1[];
  readonly modifiers: readonly ModifierV1[];
}

interface WorldActionStepDefinitionV1 {
  readonly stepId: WorldStepId;
  readonly phase: CalendarPhase;
  readonly apCost: NonNegativeSafeInteger;
  readonly sceneId: SceneId;
}

interface WorldActionOptionDefinitionV1 {
  readonly optionId: ChoiceId;
  readonly labelTextId: TextId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly additionalCashCost: Money;
  readonly preparationBonus: SafeInteger;
  readonly beginEffects: readonly EffectIntentV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

interface WorldActionDefinitionV1 {
  readonly actionId: ActionId;
  readonly nameTextId: TextId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly reasonId: ReasonId;
  readonly baseCashCost: Money;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly beginEffects: readonly EffectIntentV1[];
  readonly options: readonly WorldActionOptionDefinitionV1[];
  readonly steps: readonly [WorldActionStepDefinitionV1, WorldActionStepDefinitionV1];
  readonly checkId: CheckId | null;
}

type EventTriggerV1 =
  | {
      readonly kind: "phase.entered";
      readonly days: readonly DayIndex[];
      readonly phases: readonly CalendarPhase[];
    }
  | {
      readonly kind: "command.succeeded";
      readonly commandKinds: readonly PocGameCommandV1["kind"][];
    }
  | { readonly kind: "opening.started" }
  | { readonly kind: "opening.middle" }
  | { readonly kind: "opening.before_finalize" }
  | { readonly kind: "day.ended"; readonly days: readonly DayIndex[] }
  | { readonly kind: "week.ended" }
  | { readonly kind: "story.explicit"; readonly checkpointId: CheckpointId };

type SchedulerContextV1 =
  | {
      readonly kind: "phase.entered";
      readonly day: DayIndex;
      readonly phase: CalendarPhase;
    }
  | {
      readonly kind: "command.succeeded";
      readonly commandKind: PocGameCommandV1["kind"];
    }
  | { readonly kind: "opening.started"; readonly sessionId: OpeningSessionId }
  | { readonly kind: "opening.middle"; readonly sessionId: OpeningSessionId }
  | {
      readonly kind: "opening.before_finalize";
      readonly sessionId: OpeningSessionId;
    }
  | { readonly kind: "day.ended"; readonly day: DayIndex }
  | { readonly kind: "week.ended" }
  | { readonly kind: "story.explicit"; readonly checkpointId: CheckpointId };

interface StoryEventDefinitionV1 {
  readonly eventId: EventId;
  readonly checkpointId: CheckpointId;
  readonly trigger: EventTriggerV1;
  readonly priority: SafeInteger;
  readonly weightedGroupId: WeightedGroupId | null;
  readonly weight: NonNegativeSafeInteger;
  readonly when: readonly ConditionV1[];
  readonly sceneId: SceneId | null;
  readonly effects: readonly EffectIntentV1[];
}

// EventTrigger 的 day/phase/command arrays 必须非空、唯一并按 catalog enum 顺序规范化；story.explicit.checkpointId
// 必须与至少一个 eventCheckpoint 节点相互引用。story.explicit 与 week.ended Event 必须 sceneId=null；
// week.ended effects 只允许 fact.set/quest.set。command.succeeded 的 commandKinds 一旦包含 levy.pay，也必须
// sceneId=null 且 effects 只允许 fact.set/quest.set，不能在 completion 物化后改变资源、Outcome 或 Ending。
// 结局演出读取持久 completion/summary，不在 terminal transaction 建立 Narrative。weightedGroupId=null 表示必然事件且 weight=0；
// 非 null 表示互斥抽取且 weight 必须为正。同一 SchedulerContext 先按 priority 降序、eventId 升序匹配 trigger 与 conditions。

// 同一外层命令的上下文全序为：叙事节点内联遇到的 story.explicit，然后 command.succeeded，
// opening.started → opening.middle → opening.before_finalize，然后 day.ended → week.ended → phase.entered。
// 不适用的 context 直接略过；每个 context 内保持上述候选顺序，不得按效果 kind 重排。同一原子命令可以
// 选中多个纯效果事件，但 sceneId 非 null 的阻塞事件最多一个；超过一个时整条命令故障回滚，
// 不部分提交效果、RNG 或游标。
```

Scheduler 的观察与应用边界固定如下：

1. 除内联 `story.explicit` 外，GameCommandExecutor 先在隔离 candidate 上验证并应用本命令各 owner 的直接 proposals；`command.succeeded` 观察该 post-owner-proposals candidate。之后的 Opening/day/week/phase context 按上面的全序逐个处理；
2. 每个 context 开始时，从当时 candidate 取得一份 deep-readonly evaluation Snapshot。该 context 的全部 trigger、`when`、必然候选和 weighted-group 选择都只读这一份 Snapshot；同 context 较早事件的 effects 不能令较晚事件临时变得可选；
3. 完成该 context 的全部选择后，才按 event 顺序以 `{ kind: "event", eventId }` 作为每个 Event batch 的显式 `PocEffectSourceV1` 验证并应用纯 effects。下一个 context 的 evaluation Snapshot 可以看到前一 context 已应用的 effects，因此跨 context 的因果是顺序可见的；
4. `calendar.advance_phase` 是唯一时间推进命令，但 Calendar owner 只写 Calendar 路径。GameCommandExecutor 已按冻结顺序协调 Inventory/Status/Actors/Tavern/Calendar owner proposals、完成完整时段/日界候选并按 mutation 顺序追加其 GameplayFact 后，才进入上述非内联 contexts：旧时段的 spoilage/Aura/recovery 等事实在前，day/phase mutation 对应的 `calendar.phase_advanced` 在 `demand.materialized` 之前，随后才追加各 Scheduler context 的 `scheduler.event_triggered` 与 effects facts，任何层都不得事后按 kind 重排。因此 `day.ended.day` 表示刚结束的日期、`phase.entered` 表示新日期/时段，但二者的 `when` 都读取 post-transition candidate；作者需要匹配旧日期时使用 trigger 的 `days`，不能假定 `calendar.matches` 仍指向旧时段；
5. `story.explicit` 是例外：evaluation Snapshot 位于 `eventCheckpoint` 节点、游标跳到 `nextNodeId` 之前；该 context effects 应用后才推进游标。v1 的 `story.explicit` event 必须 `sceneId=null`，需要切换场景时使用 Narrative 的 `call/jump/stageCue`，不能覆盖正在运行的 Narrative；`week.ended` 以及 trigger commandKinds 包含 `levy.pay` 的 `command.succeeded` Event 同样不得带 Scene，且 effects 只允许 `fact.set | quest.set`。终局演出由 Runtime 从已物化的 RunCompletion、serviceHistory 与 ledger 投影，不新增第二份 summary state；
6. 所有 context 先收集 blocking scene request，直到命令的 contexts、effects、Schema 和 invariants 均通过才建立 Narrative。两个 Scheduler scene 使用 `scheduler.multiple_blocking_events`；一个 Scheduler scene 与既有 active Narrative 或 handler 自带的 step/story-action scene 冲突时使用 `narrative.blocking_conflict`。两类故障都回滚本命令的 effects、RNG、workflow、cursor 和 sequence。

```ts
interface CheckOutcomeBandV1 {
  readonly bandId: CheckBandId;
  readonly minInclusive: SafeInteger;
  readonly maxInclusive: SafeInteger | null;
  readonly effects: readonly EffectIntentV1[];
}

interface CheckDefinitionV1 {
  readonly checkId: CheckId;
  readonly attribute: AttributeId;
  readonly dice: "2d6";
  readonly bands: readonly CheckOutcomeBandV1[];
}

interface EndingDefinitionV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly nameTextId: TextId;
  readonly summaryOutcomeIds: {
    readonly relationship: OutcomeId;
    readonly investigation: OutcomeId;
  };
  readonly effects: readonly ProgressionEffectIntentV1[];
}

type StoryValueDefinitionV1 =
  | { readonly kind: "boolean"; readonly defaultValue: boolean }
  | {
      readonly kind: "integer";
      readonly defaultValue: SafeInteger;
      readonly range: IntegerRangeV1;
    }
  | {
      readonly kind: "token";
      readonly defaultValue: StoryToken;
      readonly allowedValues: readonly StoryToken[];
    };

interface FactDefinitionV1 {
  readonly factId: FactId;
  readonly value: StoryValueDefinitionV1;
}
interface QuestDefinitionV1 {
  readonly questId: QuestId;
  readonly initial: QuestEntryV1;
}
interface OutcomeDefinitionV1 {
  readonly outcomeId: OutcomeId;
  readonly value: StoryValueDefinitionV1;
}

interface StoryStateDefinitionsV1 {
  readonly facts: readonly FactDefinitionV1[];
  readonly quests: readonly QuestDefinitionV1[];
  readonly outcomes: readonly OutcomeDefinitionV1[];
}

interface StoryInitialStateV1 {
  readonly player: PlayerActorStateV1;
  readonly heroine: HeroineActorStateV1;
  readonly relationship: RelationshipStateV1;
  readonly cash: Money;
  readonly reputation: NonNegativeSafeInteger;
  readonly helper: HelperStateV1;
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly ingredientBatches: readonly InventoryBatchV1[];
  readonly itemStacks: readonly ItemStackV1[];
  readonly auras: readonly AuraInstanceV1[];
}

// Fact、Quest 与 Outcome 的新局值只来自 StoryStateDefinitionsV1：Fact/Outcome 使用各自 definition 的
// defaultValue，Quest 使用 QuestDefinitionV1.initial。StoryInitialStateV1 不得再声明或覆盖这三组值。

type FixedActionCostKeyV1 =
  "inventory.buy" | "actor.prepare_food" | "actor.rest" | "facility.choose.build";

interface ActionCostDefinitionV1 {
  readonly action: FixedActionCostKeyV1;
  readonly apCost: NonNegativeSafeInteger;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly heroineStaminaCost: NonNegativeSafeInteger;
  readonly reasonId: ReasonId;
}

interface ServiceModeDefinitionV1 {
  readonly mode: ServiceMode;
  readonly nameTextId: TextId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly reasonId: ReasonId;
  readonly apCost: NonNegativeSafeInteger;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly heroineStaminaCost: NonNegativeSafeInteger;
  readonly wage: Money;
  readonly baseReceptionCapacity: NonNegativeSafeInteger;
  readonly basePreparationPoints: NonNegativeSafeInteger;
  readonly teamworkGain: NonNegativeSafeInteger;
  readonly preparationPointsPerAction: NonNegativeSafeInteger;
}

interface BaseDemandLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly customers: NonNegativeSafeInteger;
}

interface LedgerReasonBindingsV1 {
  readonly purchase: ReasonId;
  readonly serviceWage: ReasonId;
  readonly openingFee: ReasonId;
  readonly revenue: ReasonId;
  readonly discardedFood: ReasonId;
  readonly spoiledIngredient: ReasonId;
  readonly facilityBuild: ReasonId;
  readonly worldActionCost: ReasonId;
  readonly levy: ReasonId;
}

interface EmergencyClosureDefinitionV1 {
  readonly reputationPenalty: NonNegativeSafeInteger;
  readonly reasonId: ReasonId;
}

type ObligationForecastKindV1 = "current_gap" | "committed_plan_conservative" | "final";

interface ObligationRecommendationDefinitionV1 {
  readonly textId: TextId;
  readonly actionId: ActionId | null;
  readonly appliesTo: readonly ObligationForecastKindV1[];
}

interface ObligationForecastPolicyV1 {
  readonly visibleFrom: {
    readonly day: DayIndex;
    readonly phase: CalendarPhase;
  };
  readonly conservativeFrom: {
    readonly day: DayIndex;
    readonly phase: CalendarPhase;
  };
  readonly reasonId: ReasonId;
  readonly recommendations: readonly ObligationRecommendationDefinitionV1[];
}

interface EndingPolicyV1 {
  readonly stableMinimumCashAfterLevy: Money;
  readonly stableMinimumReputation: NonNegativeSafeInteger;
  readonly stableMinimumBuiltFacilities: PositiveSafeInteger;
  readonly reputationCrisisBelow: NonNegativeSafeInteger;
  readonly stableReasonId: ReasonId;
  readonly dangerReasonId: ReasonId;
  readonly arrearsReasonId: ReasonId;
  readonly reputationCrisisReasonId: ReasonId;
}

interface StoryBalanceV1 {
  readonly lifePolicies: readonly [LifePolicyDefinitionV1, ...LifePolicyDefinitionV1[]];
  readonly actionCosts: readonly ActionCostDefinitionV1[];
  readonly serviceModes: readonly ServiceModeDefinitionV1[];
  readonly serviceDays: readonly DayIndex[];
  readonly baseDemand: readonly BaseDemandLineV1[];
  readonly ledgerReasons: LedgerReasonBindingsV1;
  readonly emergencyClosure: EmergencyClosureDefinitionV1;
  readonly plannedClosureReasonId: ReasonId;
  readonly heroineNightRecovery: NonNegativeSafeInteger;
  readonly heroineNightRecoveryReasonId: ReasonId;
  readonly restRecovery: NonNegativeSafeInteger;
  readonly purchaseLineLimit: PositiveSafeInteger; // <=64
  readonly purchaseQuantityPerLineLimit: PositiveSafeInteger; // <=999; PoC = 99
  readonly menuRecipeLimit: PositiveSafeInteger;
  readonly menuPortionsPerRecipeLimit: PositiveSafeInteger; // <=999; PoC = 99
  readonly dailyPreparationLimit: PositiveSafeInteger;
  readonly openingFee: Money;
  readonly levyAmount: Money;
  readonly levyDue: { readonly day: DayIndex; readonly phase: CalendarPhase };
  readonly obligationForecast: ObligationForecastPolicyV1;
  readonly endingPolicy: EndingPolicyV1;
  readonly maxNarrativeStepsPerCommand: PositiveSafeInteger;
  readonly maxNarrativeCallDepth: PositiveSafeInteger;
}

// actionCosts 必须恰好各含四个 FixedActionCostKeyV1 一次；serviceModes 必须恰好各含四个 ServiceMode 一次，
// 且 nameTextId 必须引用 StoryContent 已声明的唯一玩家可见模式名称。
// Engine preview 与 execute 读取同一表。baseDemand 对 serviceDays 与每个 CustomerSegment 的笛卡尔积恰好一行。
// facility.choose 的 skip 分支是结构性零成本（AP、双方体力和现金均为 0），不进入 actionCosts；只有
// build 分支读取 facility.choose.build，preview 与 execute 不得另行发明数值。
```

`ServiceModeDefinitionV1.nameTextId` 与 `FacilityOpportunityDefinitionV1.skipLabelTextId` 在首个完整 PoC
Story/fixture/golden 冻结前补全 revision 1 的 authoring ABI，不提升 State contract revision。它们随 resolved
Simulation Program 和 simulation digest 保存；UI 只通过 Query/Semantic 投影取得这些 TextId，再经
PresentationReadPort 解析 TextCatalog，不能按 enum/ID 字符串拼接 ID、复用语义不同的 Action label 或保留第二份映射。

七日 PoC 的 `endingPolicy` 不是 Rule provider 内的私有常量。其 concrete value 精确为：

```ts
const pocEndingPolicyV1: EndingPolicyV1 = {
  stableMinimumCashAfterLevy: 20,
  stableMinimumReputation: 50,
  stableMinimumBuiltFacilities: 1,
  reputationCrisisBelow: 45,
  stableReasonId: "reason.ending.stable",
  dangerReasonId: "reason.ending.danger",
  arrearsReasonId: "reason.ending.arrears",
  reputationCrisisReasonId: "reason.ending.reputation_crisis",
};
```

`EndingInputV1.cash` 是 levy proposal 已应用后的候选现金。`levy.kind="arrears"` 固定产生
`failed_arrears` 与 `[arrearsReasonId]`；已缴税且现金、人气、已建设施数同时达到三个 stable minimum
时产生 `completed_stable` 与 `[stableReasonId]`；其余已缴税结果产生 `completed_danger` 与
`[dangerReasonId]`。危险结果的人气严格小于 `reputationCrisisBelow` 时，按第二项追加
`reputationCrisisReasonId`。`stableMinimumBuiltFacilities` 统计唯一 `FacilityId`，不得把 opportunity
decision、重复状态或未建设施计入。上述阈值、Reason binding 与 `levyAmount` 一起属于强类型 Balance，
进入 Simulation Program 与 `simulationDigest`；Forecast 只读取同一 policy，不维护另一份 ending 阈值。

Action presentation 的映射是封闭的：`policy.choose`、`inventory.buy`、`actor.prepare_food`、`actor.rest`、
`tavern.plan.set`、`calendar.advance_phase`、`levy.pay` 各恰好有一个按 `commandKind` 解析的通用 presentation；
`story.action.start`、`facility.choose`、`world.action.begin` 分别按精确 actionId/opportunityId 解析。
`run.start`、三条 `tavern.opening.*`、`world.action.complete` 与两条 `narrative.*` 是 system/workflow controls，
必须有零个 Action presentation；Narrative choice 只使用节点自己的投影。前两类要求的匹配数不是 1 时、后一类
匹配数不是 0 时，均为 Story validation error。

`policy.choose` 的唯一 presentation 还是生命周期合同而非可设计的 Action gate：必须精确使用 `availablePhases:["morning"]`、`occupation:{kind:"none"}`、空 `visibility` 和空 `availability`。其 confirmation 仍可由 Story 编写。bootstrap 对空 `lifePolicies` 或任一上述字段偏差失败；因此 manifest Scene 完成后的强制选择 Overlay 至少有一个且所有 option preview 都为 allowed，不会被 Story gate 软锁。

`CommandPreviewV1.confirmation` 只能由以下 authored metadata 按顺序合并，不能由 UI 或 Engine 文案猜测：

1. 对上段要求有 Action presentation 的命令，先加入精确匹配 Action 的 `confirmation`；
2. `tavern.plan.set` 再加入所选 `ServiceModeDefinitionV1.confirmation`；
3. `facility.choose/build` 再依次加入 opportunity 的 `confirmation` 与目标 `FacilityDefinitionV1.confirmation`；`skip` 改为加入 opportunity 的 `confirmation` 与 `skipConfirmation`；
4. `world.action.begin` 再加入所选 `WorldActionOptionDefinitionV1.confirmation`；
5. `narrative.choose` 不解析 Action presentation，只使用该 `NarrativeChoiceV1.confirmation`。

合并对三个数组分别执行稳定串接，顺序就是上述 source 顺序和各 source 的声明顺序；任意两个 contributing source 出现重复 TextId/ActionId 时 Story validation 失败，不做静默去重。confirmation 精确只对 `run.start`、三条 `tavern.opening.*`、`world.action.complete` 与 `narrative.advance` 为 `null`；`narrative.choose` 使用节点 metadata，其余命令使用上述 Action/追加 metadata，因此即使三个数组全空也仍是非 null 对象。成本、时段和可推导变化不进入 metadata，仍只来自同一 preview/execute 计算器。

Action 的 `availablePhases` 非空、唯一并按 `CalendarPhase` 顺序规范化，表示命令可提交窗口；
`occupation` 表示承诺占用：none 不占时段，current_phase 解析为提交时当前时段，fixed.phases 非空、唯一并规范化。
`ActionViewV1.occupiedPhases` 是该定义针对当前 Snapshot 解出的精确数组。解析到 Action presentation 的玩家命令
先检查当前 phase 是否在 `availablePhases`；失败固定返回 `calendar.invalid_phase`，其 `allowed` 原样使用该数组，
然后才按 Story 声明顺序评估 authored availability gates。WorldAction 的 availablePhases 只含 Begin 窗口，
fixed occupation 必须等于两个 step 的时段；ServicePlan 的提交窗口可在白天，但 fixed occupation 为 evening。
后续 WorldAction Advance/Complete 由持久 workflow step 与 `world.action_wrong_phase`/`calendar.phase_blocked` 控制。

`visibility` 只控制当前决策焦点：空数组表示始终可见，否则所有 visibility gates 通过才进入
`getAvailableActions()`。它不是安全边界；preview/execute 仍重新评估 visibility 与 availability，并把失败 gate 的
reasonId 映射为对应领域的类型化 unavailable rejection。`explainAvailability()` 即使对不可见 Action 也可调用，
返回 `visible=false` 和同一组原因。这样未来窗口不会提前堆满舞台，但当前窗口中的 AP/现金/体力不足仍以禁用项显示。
全局 run lifecycle、active Narrative/workflow 与 command-specific committed-state guard 的优先级高于 Action gate，
所以 pre-Start policy 命令仍是 `run.not_started`、manifest active 时是 `command.blocked_by_narrative`、policy 已选是
`policy.already_chosen`；只有通过这些 guard 后，visibility failure 才映射为 Action/领域 unavailable。

```ts
interface StoryContentV1 {
  readonly texts: readonly TextEntryV1[];
  readonly characters: readonly StoryCharacterDefinitionV1[];
  readonly reasons: readonly ReasonDefinitionV1[];
  readonly actions: readonly ActionPresentationDefinitionV1[];
  readonly storyActions: readonly StoryActionDefinitionV1[];
  readonly customerSegments: readonly CustomerSegmentDefinitionV1[];
  readonly modifierSources: readonly ModifierSourceDefinitionV1[];
  readonly ingredients: readonly IngredientDefinitionV1[];
  readonly items: readonly ItemDefinitionV1[];
  readonly recipes: readonly RecipeDefinitionV1[];
  readonly facilities: readonly FacilityDefinitionV1[];
  readonly facilityOpportunities: readonly FacilityOpportunityDefinitionV1[];
  readonly auras: readonly AuraDefinitionV1[];
  readonly worldActions: readonly WorldActionDefinitionV1[];
  readonly events: readonly StoryEventDefinitionV1[];
  readonly checks: readonly CheckDefinitionV1[];
  readonly endings: readonly EndingDefinitionV1[];
  readonly scenes: readonly NarrativeSceneV1[];
}

interface StorySourceIdentityV1 {
  readonly id: StoryId;
  readonly revision: PositiveSafeInteger;
}
interface StoryManifestV1 {
  readonly titleTextId: TextId;
  readonly initialSceneId: SceneId;
  readonly playableDays: PositiveSafeInteger;
}

type AssetUsageV1 = "scene_background" | "character_pose" | "story_prop" | "ui_decoration";

interface AssetSafeAreaV1 {
  readonly x: NonNegativeSafeInteger;
  readonly y: NonNegativeSafeInteger;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
}

interface AssetPivotV1 {
  readonly x: RatioV1;
  readonly y: RatioV1;
}

type AssetPackId = Brand<string, "AssetPackId">;

interface AssetPackSourceIdentityV1 {
  readonly id: AssetPackId;
  readonly revision: PositiveSafeInteger;
}

interface AssetPackResolvedIdentityV1 extends AssetPackSourceIdentityV1 {
  readonly digest: Digest;
}

interface AssetSlotDefinitionV1 {
  readonly assetId: AssetId;
  readonly kind: "background" | "character" | "prop" | "ui";
  readonly usage: AssetUsageV1;
  readonly overridePolicy: "sealed" | "replaceable";
  readonly fallbackToken: FallbackToken;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly loadGroup: "bootstrap" | "scene" | "overlay";
  readonly safeArea: AssetSafeAreaV1 | null;
  readonly pivot: AssetPivotV1 | null;
}

interface AssetProviderEntryV1 {
  readonly assetId: AssetId;
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly byteLength: PositiveSafeInteger;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly sha256: Digest;
}

interface AssetPackV1 {
  readonly identity: AssetPackSourceIdentityV1;
  readonly providers: readonly AssetProviderEntryV1[];
}

interface AssetPackDigestProjectionV1 {
  readonly identity: AssetPackSourceIdentityV1;
  readonly providers: readonly AssetProviderEntryV1[];
}

type AssetProviderRefV1 =
  | {
      readonly kind: "asset_pack";
      readonly identity: AssetPackResolvedIdentityV1;
    }
  | {
      readonly kind: "hotfix";
      readonly identity: HotfixResolvedIdentityV1;
    };

type ResolvedAssetEntryV1 = AssetSlotDefinitionV1 &
  (
    | {
        readonly delivery: "code_fallback";
        readonly provider: null;
        readonly overrideChain: readonly AssetProviderRefV1[];
      }
    | (AssetProviderEntryV1 & {
        readonly delivery: "runtime_image";
        readonly provider: AssetProviderRefV1;
        readonly overrideChain: readonly AssetProviderRefV1[];
      })
  );

interface ResolvedAssetManifestV1 {
  readonly packs: readonly AssetPackResolvedIdentityV1[];
  readonly slots: readonly AssetSlotDefinitionV1[];
  readonly assets: readonly ResolvedAssetEntryV1[];
}

interface PocStoryDataV1 {
  readonly dataRevision: 1;
  readonly manifest: StoryManifestV1;
  readonly stateDefinitions: StoryStateDefinitionsV1;
  readonly initialState: StoryInitialStateV1;
  readonly balance: StoryBalanceV1;
  readonly content: StoryContentV1;
}

interface PocSimulationManifestV1 {
  readonly initialSceneId: SceneId;
  readonly playableDays: PositiveSafeInteger;
}

interface PocSimulationContentV1 {
  readonly characters: readonly StoryCharacterDefinitionV1[];
  readonly reasons: readonly ReasonDefinitionV1[];
  readonly actions: readonly ActionPresentationDefinitionV1[];
  readonly storyActions: readonly StoryActionDefinitionV1[];
  readonly customerSegments: readonly CustomerSegmentDefinitionV1[];
  readonly modifierSources: readonly ModifierSourceDefinitionV1[];
  readonly ingredients: readonly IngredientDefinitionV1[];
  readonly items: readonly ItemDefinitionV1[];
  readonly recipes: readonly RecipeDefinitionV1[];
  readonly facilities: readonly FacilityDefinitionV1[];
  readonly facilityOpportunities: readonly FacilityOpportunityDefinitionV1[];
  readonly auras: readonly AuraDefinitionV1[];
  readonly worldActions: readonly WorldActionDefinitionV1[];
  readonly events: readonly StoryEventDefinitionV1[];
  readonly checks: readonly CheckDefinitionV1[];
  readonly endings: readonly EndingDefinitionV1[];
}

interface PocNarrativeProgramV1 {
  readonly scenes: readonly NarrativeSceneV1[];
}

interface PocSimulationDataV1 {
  readonly dataRevision: 1;
  readonly manifest: PocSimulationManifestV1;
  readonly stateDefinitions: StoryStateDefinitionsV1;
  readonly initialState: StoryInitialStateV1;
  readonly balance: StoryBalanceV1;
  readonly content: PocSimulationContentV1;
  readonly narrative: PocNarrativeProgramV1;
}

interface PocSimulationProgramV1 {
  readonly data: PocSimulationDataV1;
  readonly rules: PocRulesV1;
}

interface StoryToolingSupportV1<TFixture, TNote> {
  readonly fixtures: readonly TFixture[];
  readonly notes: readonly TNote[];
}

interface PocStoryToolingFixtureV1 {
  readonly fixtureId: FixtureId;
  readonly seed: NonZeroUint32;
  readonly commands: readonly PocGameCommandV1[];
}

type PocStoryToolingSupportV1<TNote> = StoryToolingSupportV1<PocStoryToolingFixtureV1, TNote>;
```

`PocStoryDataV1` 是 `game/stories/poc` 的可序列化源数据，不是 Loader 接收的完整 GamePackage，也不能未经编译就整体算作 simulation facet。Builder 将其中的控制流/数值与文本/视觉引用投影到两个 resolved roots。完整 StoryEntry 还要选择 PoC GameplayModules，并声明 SimulationProgram materializer、GameSimulation factory、PocRules、data-only SceneGraph、Asset Slots/Packs 和两套 PatchSurface；这些启动期源码合同由当前架构与本节字段合同约束，不进入 Save JSON。通用 `StoryToolingSupportV1` 只冻结 fixtures/notes 容器；Story-specific form adapter 可以作为该 support 的额外强类型成员，但不能进入 Base 的 Gameplay 合同。开发 fixtures/notes/form adapters 由同 Artifact 的 `./tooling` entry 延迟提供。`ResolvedAssetManifestV1` 是 Asset resolver 的构建输出，也不由 Story source 手填。

`PocSimulationDataV1` 是上述 Builder 的唯一 simulation-data 输出，不与 `PocStoryDataV1` 同形，也不允许用
spread 或 `Omit` 在运行时临时形成一个开放对象。投影逐字段固定为：保留 `dataRevision`；从 `manifest` 只取
`initialSceneId/playableDays`；完整保留 State definitions、初始 State 与 Balance；从 `content` 排除 `texts/scenes`，
其余字段按 `PocSimulationContentV1` 的声明顺序显式复制；最后把 source `content.scenes` 显式复制为
`narrative.scenes`。materializer 对完整结果执行 strict Schema validation、canonical round-trip 与 deep freeze，
`PocSimulationProgramV1` 再将这份 data 与已解析的具名 Rule providers 闭合。GameplayModule tuple 仍只由 Story
静态选择，data 不得携带 module instance、owner capability 或可执行 callback。

`PocStoryDataV1.manifest.titleTextId`、`StoryContentV1.texts`、真实 TextCatalog 字符串、resolved SceneGraph、
Asset Slot/Pack/provider/bytes、content-maturity/Interaction/renderer catalog 与 tooling/fixture/note 不进入
`PocSimulationDataV1`。但 simulation data 中被命令预览、Queries 或 Narrative 发布的逻辑 `TextId`，以及
Narrative IR 中的 `CharacterId`、`SceneId` 与 `StageCueV1.AssetId` 必须保留：它们是确定控制流和只读语义
publication 的 stable references，不是文本或图片 bytes。每个保留的 TextId 必须在 resolved Presentation 的
default TextCatalog 闭包中，每个 Narrative AssetId 必须在 resolved asset slots 中，每个 CharacterId 与 ActionId
也必须分别与 Presentation character catalog、Semantic/Interaction mapping 闭包。改变这些逻辑引用会改变
simulation identity；只替换同一 TextId 的字符串或同一 AssetId 的 provider 只改变 presentation/asset identity。

`AssetProviderEntryV1` 只描述已经人工复制到运行时资产根目录的技术交付文件，不记录生成服务、模型、prompt、许可判断、选择状态或 AIGC 反向来源。`art-source/aigc/**` 是独立的人工作业档案，Resolver、Asset Pack、E2E/PoC Web Artifact 与未来分发适配器均不得读取它。

`AssetPackResolvedIdentityV1.digest` 的 ABI 固定为：

```ts
const projection: AssetPackDigestProjectionV1 = {
  identity: {
    id: assetPack.identity.id,
    revision: assetPack.identity.revision,
  },
  providers: assetPack.providers,
};

const resolvedIdentity: AssetPackResolvedIdentityV1 = {
  id: assetPack.identity.id,
  revision: assetPack.identity.revision,
  digest: digestCanonical("sillymaker:asset-pack:v1", projection),
};
```

projection 是完整 strict canonical `AssetPackV1` semantic value 的逐字段投影；必须显式构造 `{ identity: { id, revision }, providers }`，不得 spread 输入对象，也不得把 `AssetPackResolvedIdentityV1.digest` 递归带回自身。`providers` 的 authored array order 是语义，resolver 不排序、不按 ID 规范化，也不把集合转换为 map 后再摘要；任何数组重排都必须改变 digest。每个 provider `assetId` 在 pack 中唯一，重复项在摘要/身份建立前失败。

这个 digest 是 `ResolvedAssetManifestV1.packs`、provider 引用与 presentation roots 使用的 Asset Pack provider identity；它不是版权/provenance 记录，也不是单文件完整性 hash。图片、manifest 文件与 artifact 的精确 bytes 继续使用 `digestBytes`，不得用 raw-file hash 代替上述 semantic identity。

`runtimePath` 必须是相对 provider Asset Pack/Hotfix root 的 POSIX 路径，不能包含空段、`.`、`..`、反斜杠、query 或 fragment。`packs` 保持 Story 明确选择的顺序；slot definition 先冻结，provider 无权改 kind/usage/overridePolicy/几何/fallback。Resolver 按 pack 顺序应用：未知 slot 失败；每个 slot 的首个 provider 可取代 code fallback；后续 provider 只允许覆盖 `replaceable` slot。全部 packs 完成后，asset Hotfix 才可替换仍为 `replaceable` 的最终 provider；sealed slot 不暴露 asset Patch Slot。`overrideChain` 记录实际 provider 链，runtime image 的最后一项必须等于 `provider`；code fallback 的链为空。

逻辑 Asset ID 无论是否已有正式位图都必须存在于 `slots` 和 `assets`。因此 fallback-only Story 是“所有 resolved entries 均为 `code_fallback`”，不是空 Manifest；`runtime_image` 必须来自 Story 明确选择的 Asset Pack provider，并通过相对路径、媒体类型、尺寸、字节数与精确文件摘要验证。运行时加载失败使用 slot 已校验的 code-native fallback，而不是接受未知素材。`eventCheckpoint` 节点由 `narrative.advance` 在同一事务构造 `story.explicit` SchedulerContext；事件处理与游标推进共同提交或回滚。

AssetRegistry 的加载组全序固定为 `bootstrap → scene → overlay`，组内保持 `ResolvedAssetManifestV1.assets` 顺序；相同最终 URL+sha256 在一次 registry 生命周期内只 fetch/decode 一次。preload 接受 AbortSignal，并对每个 AssetId 返回 `loaded | fallback | aborted` 结构化结果；单项失败不以 aggregate throw 丢弃其他结果，同一 URL/故障码每个加载周期只追加一次 runtime diagnostic。

### 7.3 GamePackage 与 PatchSurface 源码合同

以下合同属于 `@sillymaker/base` 的启动期 API。它们是普通 TypeScript/JavaScript 对象，不进入 Strict JSON；其声明和实际代码 bytes 进入对应构建摘要。

```ts
type ModuleId = Brand<string, "ModuleId">;
type StateSlotId = Brand<string, "StateSlotId">;
type LocaleId = Brand<string, "LocaleId">; // canonical BCP 47, e.g. zh-CN
type PatchSymbolId = Brand<string, "PatchSymbolId">;
type HotfixId = Brand<string, "HotfixId">;

declare function parseModuleId(value: unknown): ModuleId;
declare function parseStateSlotId(value: unknown): StateSlotId;

interface RuntimeSchemaV1<T> {
  parse(value: unknown): T;
}

interface GameBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

interface PocGameBootstrapInputV1 extends GameBootstrapInputV1 {
  readonly runId: RunId;
}

interface BootstrapEntropyV1 {
  nextUuidV4(): string;
  nextNonZeroUint32(): NonZeroUint32;
}

interface GameplayModuleDescriptorV1 {
  readonly id: ModuleId;
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly dependencies: readonly ModuleId[];
}

interface GameSimulationTypeMapV1<
  TBootstrapInput extends GameBootstrapInputV1 = GameBootstrapInputV1,
  TState = unknown,
  TRngState = unknown,
> {
  readonly bootstrapInput: TBootstrapInput;
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: GameSnapshotEnvelopeV1<TState, TRngState>;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly fact: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly debugValidationError: unknown;
  readonly executionContext: unknown;
  readonly queries: unknown;
  readonly viewModel: unknown;
}

declare const gameSimulationTypeWitnessV1: unique symbol;

interface GameSimulationTypeWitnessV1<TTypes extends GameSimulationTypeMapV1> {
  /** Compile-time invariant witness; no runtime field is emitted. */
  readonly [gameSimulationTypeWitnessV1]?: (types: TTypes) => TTypes;
}

interface ModuleInvariantViolationV1 {
  readonly code: string;
  readonly details: StrictJsonObjectV1;
}

interface ModuleLocalInvariantV1<TStateSlice, TReadPort> {
  check(
    state: DeepReadonly<TStateSlice>,
    readPort: TReadPort,
  ): readonly ModuleInvariantViolationV1[];
}

type ModuleProposalResultV1<TProposal, TRejection> =
  | { readonly kind: "proposed"; readonly proposal: TProposal }
  | { readonly kind: "rejected"; readonly rejection: TRejection };

interface ModuleOwnerProposalEnvelopeV1<TPayload, TFact> {
  readonly payload: TPayload;
  readonly facts: readonly TFact[];
}

interface ModuleOwnerCapabilityV1<
  TStateSlice,
  TOwnerOperation,
  TOwnerProposal,
  TRejection,
  TDependencyPorts,
> {
  propose(
    state: DeepReadonly<TStateSlice>,
    operation: DeepReadonly<TOwnerOperation>,
    dependencies: TDependencyPorts,
  ): ModuleProposalResultV1<TOwnerProposal, TRejection>;
  apply(state: DeepReadonly<TStateSlice>, proposal: DeepReadonly<TOwnerProposal>): TStateSlice;
}

interface ModuleQueryCapabilityV1<TStateSlice, TModuleQuery, TModuleQueryResult, TDependencyPorts> {
  execute(
    state: DeepReadonly<TStateSlice>,
    query: DeepReadonly<TModuleQuery>,
    dependencies: TDependencyPorts,
  ): TModuleQueryResult;
}

interface GameplayModuleSurfaceV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly descriptor: GameplayModuleDescriptorV1;
  readonly commandSchema: RuntimeSchemaV1<TModuleCommand> | null;
  readonly querySchema: RuntimeSchemaV1<TModuleQuery> | null;
  readonly queryResultSchema: RuntimeSchemaV1<TModuleQueryResult> | null;
}

interface StatefulGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TOwnerOperation,
  TOwnerProposal extends ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]>,
  TReadPort,
  TDependencyPorts,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateful";
  readonly stateSchema: RuntimeSchemaV1<TStateSlice>;
  readonly ownerOperationSchema: RuntimeSchemaV1<TOwnerOperation>;
  readonly ownerProposalSchema: RuntimeSchemaV1<TOwnerProposal>;
  readonly localInvariants: readonly ModuleLocalInvariantV1<TStateSlice, TReadPort>[];
  readonly owner: ModuleOwnerCapabilityV1<
    TStateSlice,
    TOwnerOperation,
    TOwnerProposal,
    TTypes["rejection"],
    TDependencyPorts
  >;
  readonly queries: ModuleQueryCapabilityV1<
    TStateSlice,
    TModuleQuery,
    TModuleQueryResult,
    TDependencyPorts
  > | null;
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TStateSlice;
  createReadPort(state: DeepReadonly<TStateSlice>): TReadPort;
}

interface StatelessGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TServicePort,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateless";
  readonly ownerOperationSchema: null;
  readonly ownerProposalSchema: null;
  readonly owner: null;
  readonly capabilities: TServicePort;
}

type GameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1 = GameSimulationTypeMapV1,
  TStateSlice = unknown,
  TModuleCommand = unknown,
  TModuleQuery = unknown,
  TModuleQueryResult = unknown,
  TOwnerOperation = unknown,
  TOwnerProposal extends ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]> =
    ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]>,
  TReadPort = unknown,
  TDependencyPorts = unknown,
> =
  | StatefulGameplayModuleBindingV1<
      TTypes,
      TStateSlice,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TOwnerOperation,
      TOwnerProposal,
      TReadPort,
      TDependencyPorts
    >
  | StatelessGameplayModuleBindingV1<
      TTypes,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TReadPort
    >;

type GameplayModuleTupleForSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
> = {
  readonly [K in keyof TModules]: TModules[K] extends GameplayModuleBindingV1<
    TTypes,
    infer _TStateSlice,
    infer _TModuleCommand,
    infer _TModuleQuery,
    infer _TModuleQueryResult,
    infer _TOwnerOperation,
    infer _TOwnerProposal,
    infer _TReadPort,
    infer _TDependencyPorts
  >
    ? TModules[K]
    : never;
};

interface GameCommandExecutorV1<TSnapshot, TCommand, TContext, TAttempt> {
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TCommand>,
    context: TContext,
  ): TAttempt;
}

type GameDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "validation_failed";
      readonly errors: readonly TValidationError[];
    };

interface GameDebugCommandExecutorV1<
  TSnapshot,
  TDebugCommand,
  TContext,
  TValidationError,
  TAttempt,
> {
  validate(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): GameDebugCommandValidationResultV1<TValidationError>;
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): TAttempt;
}

interface GameSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
  TExecutor extends GameCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["command"],
    TTypes["executionContext"],
    unknown
  >,
  TDebugExecutor extends GameDebugCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["debugCommand"],
    TTypes["executionContext"],
    TTypes["debugValidationError"],
    unknown
  >,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly contractRevision: 1;
  readonly modules: GameplayModuleTupleForSimulationV1<TTypes, TModules>;
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly factSchema: RuntimeSchemaV1<TTypes["fact"]>;
  readonly rejectionSchema: RuntimeSchemaV1<TTypes["rejection"]>;
  readonly debugCommandSchema: RuntimeSchemaV1<TTypes["debugCommand"]>;
  readonly debugValidationErrorSchema: RuntimeSchemaV1<TTypes["debugValidationError"]>;
  readonly commandExecutor: TExecutor;
  readonly debugCommandExecutor: TDebugExecutor;
  createBootstrapInput(entropy: BootstrapEntropyV1): TTypes["bootstrapInput"];
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TTypes["state"];
  createQueries(state: DeepReadonly<TTypes["state"]>): TTypes["queries"];
  projectGameView(queries: TTypes["queries"]): TTypes["viewModel"];
}

// GameCommandExecutor and GameDebugCommandExecutor never own createQueries.
// Projectors consume the already-created read-only Queries, not Snapshot.

interface LocalizedTextCatalogV1 {
  readonly locale: LocaleId;
  readonly fallbackLocale: LocaleId | null;
  readonly entries: readonly {
    readonly textId: TextId;
    readonly text: string;
  }[];
}

interface TextCatalogSetV1 {
  readonly defaultLocale: LocaleId;
  readonly catalogs: readonly LocalizedTextCatalogV1[];
}

type PatchSurfaceKindV1 = "simulation" | "presentation";
type SimulationPatchSymbolKindV1 = "rule" | "value";
type PresentationPatchSymbolKindV1 = "value" | "text" | "asset";
type PatchSymbolKindV1 = SimulationPatchSymbolKindV1 | PresentationPatchSymbolKindV1;

interface PatchSlotDescriptorV1<TKind extends PatchSymbolKindV1> {
  readonly symbolId: PatchSymbolId;
  readonly kind: TKind;
  readonly replaceable: true;
  readonly contractRevision: PositiveSafeInteger;
  readonly defaultProviderSourceDigest: Digest;
}

interface PatchReplacementTraceV1 {
  readonly surface: PatchSurfaceKindV1;
  readonly symbolId: PatchSymbolId;
  readonly kind: PatchSymbolKindV1;
  readonly previousProviderDigest: Digest;
  readonly nextProviderDigest: Digest;
}

interface HotfixSourceIdentityV1 {
  readonly id: HotfixId;
  readonly revision: PositiveSafeInteger;
}

interface HotfixResolvedIdentityV1 extends HotfixSourceIdentityV1 {
  readonly digest: Digest;
}

interface HotfixManifestV1 {
  readonly identity: HotfixSourceIdentityV1;
  readonly targetStoryId: StoryId;
  readonly targetStoryRevision: PositiveSafeInteger;
  readonly targets: readonly {
    readonly surface: PatchSurfaceKindV1;
    readonly symbolId: PatchSymbolId;
    readonly expectedProviderDigest: Digest;
  }[];
  readonly requires: readonly HotfixId[];
  readonly conflicts: readonly HotfixId[];
  readonly supersedes: readonly HotfixId[];
}

interface AppliedHotfixV1 {
  readonly identity: HotfixResolvedIdentityV1;
  readonly ordinal: PositiveSafeInteger;
  readonly replacements: readonly PatchReplacementTraceV1[];
}

interface PatchSetIdentityV1 {
  readonly digest: Digest;
  readonly simulationDigest: Digest;
  readonly presentationDigest: Digest;
  readonly appliedHotfixes: readonly AppliedHotfixV1[];
}

interface PatchSetAdoptionDeclarationV1 {
  readonly storyId: StoryId;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly fromSimulationDigest: Digest;
  readonly toSimulationDigest: Digest;
  readonly simulationPatchSetDigest: Digest;
}

type GamePackageResolutionFailureCodeV1 =
  | "story.define_threw"
  | "story.define_thenable"
  | "story.nondeterministic"
  | "story.contract_invalid"
  | "story.materialization_threw"
  | "story.materialization_thenable"
  | "story.program_invalid"
  | "story.presentation_invalid"
  | "story.simulation_invalid"
  | "hotfix.duplicate_id"
  | "hotfix.target_mismatch"
  | "hotfix.requires_missing"
  | "hotfix.requires_order"
  | "hotfix.conflict"
  | "hotfix.collision"
  | "hotfix.unknown_symbol"
  | "hotfix.provider_mismatch"
  | "hotfix.install_threw"
  | "hotfix.install_thenable"
  | "hotfix.output_invalid"
  | "asset.governance_invalid"
  | "asset.slot_unknown"
  | "asset.slot_sealed"
  | "asset.path_invalid"
  | "build_identity.invalid";

interface GamePackageResolutionFailureV1 {
  readonly code: GamePackageResolutionFailureCodeV1;
  readonly rejectedHotfixIds: readonly HotfixId[];
  readonly details: StrictJsonObjectV1;
}

type GamePackageResolutionResultV1<TResolvedGame> =
  | { readonly kind: "resolved"; readonly resolved: TResolvedGame }
  | { readonly kind: "failed"; readonly failure: GamePackageResolutionFailureV1 };

type GameBootstrapResolutionResultV1<TResolvedGame, TResolvedIdentity> =
  | {
      readonly kind: "ready";
      readonly base: TResolvedGame;
      readonly resolved: TResolvedGame;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    }
  | {
      readonly kind: "safe_mode";
      readonly base: TResolvedGame;
      readonly resolved: TResolvedGame;
      readonly code: GamePackageResolutionFailureCodeV1;
      readonly rejectedHotfixIds: readonly HotfixId[];
      readonly details: StrictJsonObjectV1;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    }
  | {
      readonly kind: "fatal";
      readonly code: GamePackageResolutionFailureCodeV1;
      readonly rejectedHotfixIds: readonly HotfixId[];
      readonly details: StrictJsonObjectV1;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    };

declare const patchSurfaceValuesV1: unique symbol;

interface PatchSurfaceValueMapWitnessV1<TValues> {
  /** Compile-time inference witness emitted by define*PatchSurface; no runtime field. */
  readonly [patchSurfaceValuesV1]?: (values: TValues) => TValues;
}

type ResolvedPatchValuesV1<TSurface> =
  TSurface extends PatchSurfaceValueMapWitnessV1<infer TValues> ? TValues : never;

interface StateContractSchemaManifestV1 {
  readonly schemaId: string;
  readonly revision: PositiveSafeInteger;
}

interface StateContractModuleManifestV1 {
  readonly moduleId: ModuleId;
  readonly moduleContractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly stateSchema: StateContractSchemaManifestV1;
}

interface StateContractStableReferenceSetV1 {
  readonly setId: string;
  readonly ids: readonly string[];
}

interface StateContractManifestV1 {
  readonly contractRevision: 1;
  readonly aggregateStateSchema: StateContractSchemaManifestV1;
  readonly moduleStateSchemas: readonly StateContractModuleManifestV1[];
  readonly persistentIrSchemas: readonly StateContractSchemaManifestV1[];
  readonly stableReferenceSets: readonly StateContractStableReferenceSetV1[];
}

interface StorySimulationFacetV1<
  TGameSimulation,
  TData,
  TRules,
  TNarrativeProgram,
  TSimulationPatchSurface,
  TSimulationProgram,
> {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractManifest: StateContractManifestV1;
  readonly data: TData;
  readonly rules: TRules;
  readonly narrativeProgram: TNarrativeProgram;
  readonly patchSurface: TSimulationPatchSurface;
  materializeProgram(
    values: DeepReadonly<ResolvedPatchValuesV1<TSimulationPatchSurface>>,
  ): TSimulationProgram;
  createGameSimulation(program: DeepReadonly<TSimulationProgram>): TGameSimulation;
}

interface StoryPresentationFacetV1<
  TUiSceneGraph,
  TTextCatalogs,
  TAssetSlots,
  TAssetPacks,
  TPresentationPatchSurface,
  TPresentationProgram,
> {
  readonly uiSceneGraph: TUiSceneGraph;
  readonly textCatalogs: TTextCatalogs;
  readonly assetSlots: TAssetSlots;
  readonly assetPacks: TAssetPacks;
  readonly patchSurface: TPresentationPatchSurface;
  materializePresentation(
    values: DeepReadonly<ResolvedPatchValuesV1<TPresentationPatchSurface>>,
  ): TPresentationProgram;
}

interface StoryDefinitionV1<TSimulationFacet, TPresentationFacet> {
  readonly simulation: TSimulationFacet;
  readonly presentation: TPresentationFacet;
}

interface GamePackageV1<TSimulationFacet, TPresentationFacet> {
  readonly contractRevision: 1;
  readonly identity: StorySourceIdentityV1;
  define(): StoryDefinitionV1<TSimulationFacet, TPresentationFacet>;
}

interface StoryToolingEntryV1<TToolingSupport> {
  readonly contractRevision: 1;
  readonly storyIdentity: StorySourceIdentityV1;
  defineToolingSupport(): TToolingSupport;
}

interface HotfixInstallContextV1<TSimulationPatchSurface, TPresentationPatchSurface> {
  readonly simulation: TSimulationPatchSurface;
  readonly presentation: TPresentationPatchSurface;
}

interface HotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface> {
  readonly manifest: HotfixManifestV1;
  install(
    surfaces: HotfixInstallContextV1<TSimulationPatchSurface, TPresentationPatchSurface>,
  ): void;
}

interface ResolvedGameV1<
  TGameSimulation,
  TSimulationProgram,
  TPresentation,
  TSceneGraph,
  TResolvedAssets,
> {
  readonly provenance: BuildProvenanceV1;
  readonly gameSimulation: TGameSimulation;
  readonly simulationProgram: TSimulationProgram;
  readonly presentation: TPresentation;
  readonly sceneGraph: TSceneGraph;
  readonly assets: TResolvedAssets;
  readonly frozen: true;
}
```

`parseModuleId` 使用第 2.2 节的 stable-ID 字节长度与小写命名规则。`parseStateSlotId` 表示真实 State 对象路径：接受以 `simulation.` 或 `story.` 开头的点分 TypeScript 属性段，允许 `activeWorkflow`、`resolvedChecks` 等既有 camelCase 字段，但拒绝空段、索引、转义、`__proto__`、`prototype` 和 `constructor`。`defineGameSimulation` 仍必须确认每个解析后的路径确实存在于组合 State Schema、非空 slot 恰有一个 owner，不能把“语法可解析”当作“路径已注册”。两者都是 Base 根入口的无后缀公开构造函数；不得用 `as ModuleId`、`as StateSlotId` 或未定义的本地 `moduleId(...)` 绕过。

`StateContractManifestV1` 是 Story-owned State/持久 IR 合同的显式权威投影，不是通用 Schema DSL。所有对象必须是 exact plain data；`schemaId`、`setId` 与 reference `ids` 使用相同 stable-ID 字节合同，revision 为正整数，Schema ID 在 aggregate/module/persistent IR 三类中全局唯一。`moduleStateSchemas`、`persistentIrSchemas`、`stableReferenceSets` 分别按 moduleId/schemaId/setId 的 Unicode code-point order 严格递增，每个 reference set 的 `ids` 也唯一且严格递增；Resolver 拒绝 accessor、稀疏数组、重复项和非规范顺序，不自动排序。`moduleStateSchemas` 必须与实际 GameSimulation 的全部且仅有 stateful bindings 逐项匹配 `moduleId + moduleContractRevision + stateSlots`，stateless bindings 不得登记。manifest shape/data 错误归一化为 `story.contract_invalid`；一个自身合法但与已验证 GameSimulation 不一致的 manifest 归一化为 `story.simulation_invalid`。

`GameplayModuleBindingV1`、`GameSimulationV1` 与 `ResolvedGameV1` 是 Base 的泛型合同；PoC State/Command/Fact/Query 只是它们的一次具体化。`GameSimulationTypeMapV1<TBootstrapInput,TState,TRngState>` 使 Snapshot 必然是 `GameSnapshotEnvelopeV1<TState,TRngState>`，并用 invariant phantom witness 把 Module tuple、GameSimulation Schema、GameCommandExecutor、Query surface、RNG trace 与 ViewModel 绑定为同一组类型；`GameplayModuleTupleForSimulationV1` 使异构 tuple 中任何来自另一 GameSimulation 的 Binding 在编译期退化为 `never`。Stateful Binding 必须同时携带局部 State/Command/Query/Proposal Schema、局部 invariants、只读 port 和 owner-scoped proposal/apply capability，不能只注册一个 State Schema。Stateless Binding 只允许用于 World/Scheduling 这类由 GameCommandExecutor 调用的纯服务：`stateSlots=[]`，`ownerOperationSchema/ownerProposalSchema/owner=null`，只暴露强类型 `capabilities`；它在类型和运行时都没有 State Schema、初始 slice、read port、local invariant 或写能力。服务函数和输入输出 Schema 仍进入 simulation digest。

Stateful Binding 的 `createInitialState(bootstrap)` 必须与 aggregate GameSimulation 中该 owner 的初始 Slice 在 Canonical JSON bytes 上完全一致。`bootstrap` 只携带新 Session 的 entropy/identity；post-Hotfix Story 初始数据已先作为深冻结 Simulation Program 传给 `createGameSimulation(program)`。因此需要 Program 初态的 Story 在该 factory 内按固定 descriptor/order 构造 binding tuple，每个 data-bound binding 只闭合自己已严格解析、深冻结的 owner Slice；aggregate initializer 再从同一 tuple 组装 State。这种 bootstrap-time 实例化不改变 Module 集合、合同 revision、State Slots 或 state-contract identity，也不提供运行时注册；工厂代码由 simulation source digest 覆盖，初始数据由 Program digest 覆盖。不允许以事后 owner initialization proposal、隐藏全局或扩展 bootstrap DTO 来规避该一致性。

Owner `propose` 只读取自己的 State slice 和显式 dependency ports，返回经过 Schema 校验的 `ModuleOwnerProposalEnvelopeV1 { payload, facts }`；`apply` 只接收该 proposal 并返回该 owner 的 State slice。proposal 的 payload 只能描述本 owner 的变化，现金账本行等 owner-owned 记录也随 payload 一次物化；Facts 只解释该 proposal，不能被重新应用。GameCommandExecutor 按 authored order 把返回 slice 装回唯一候选 Snapshot、汇总 proposal Facts/账本并运行全量 invariants，最后才一次提交 sequence/RNG/state，因此 Module 不会取得可写的全局 State。上述函数以及 stateless capabilities/dependency-port composition 都进入 simulation manifest/digest。`defineGameSimulation` 还必须运行无法仅靠泛型表达的 invariants：Module ID/state slot 唯一、每个非空 slot 恰有一个 stateful owner、stateless Binding 必须 `stateSlots=[]` 且三个 owner 字段为 null、stateful Binding 必须至少一个 state slot 且拥有完整 owner 字段、依赖存在且无环、dependency ports 与声明一致、组合 Schema 封闭、GameCommandExecutor 和 ViewModel projection 与该 GameSimulation 同源。

Story npm 包的默认入口只暴露一个 `GamePackageV1`，即 StoryEntry；`define()` 必须同步、无参数且顶层无平台 I/O。source simulation facet 不携带预先闭合的 GameSimulation：它声明不可由 Hotfix 修改的 `stateContractRevision` 与 `stateContractManifest`、基础 data/rules/Narrative、PatchSurface、纯同步 `materializeProgram` 和 `createGameSimulation`；source presentation facet 对称地声明 `materializePresentation`。Resolver 在 fresh candidate registries 上完成全部 Hotfix 后，为两个 surface 分别生成按 symbol 精确键控且深冻结的 `ResolvedPatchValuesV1<TSurface>`，各调用 materializer 一次；两个返回值必须先通过 Story/contract validation 并 runtime deep-freeze，随后才以该不可变 SimulationProgram 调用 `createGameSimulation` 一次。返回的 GameSimulation 必须闭合这份 post-Hotfix SimulationProgram，Presentation 必须包含 post-Hotfix text/value 和 data-only SceneGraph，asset symbols 则由同一 candidate 直接进入独立的 `ResolvedGame.assets` provider resolution；Resolver 随后从 Story identity、revision 与已验证显式 state-contract manifest 计算 `stateContractDigest`，从 GameSimulation manifest、两个 Program 的规范投影、函数/import-closure provider digests 和 Patch traces 计算 simulation/presentation identities，校验后才冻结 `ResolvedGame`。摘要不包含摘要自身，GameSimulation/Program 也没有运行中重新物化入口。fixtures、notes 和 form adapters 由同一 Artifact 的固定 `./tooling`/`./tooling-ui` exports 按 runtime capability 延迟加载；不存在 `./development`、Player/Developer build split 或静态 alias 选择。

`stateContractDigest` 精确使用 `digestCanonical("sillymaker:state-contract:v1", { story: storyIdentity, revision: stateContractRevision, manifest: validatedStateContractManifest })`。它不包含整个 simulation source/import closure、Rule provider、公式、平衡、Patch provider 或 Presentation；实际 GameSimulation bindings 用于交叉验证该显式 manifest，完整 GameSimulation manifest 则继续进入 `simulationDigest`。`RuntimeSchemaV1.parse` 是 opaque executable，Resolver 不反射其结构：任何 State/持久 IR Schema 语义变化都必须由 Story 作者提升对应 schema descriptor revision，可持久稳定引用集合变化必须更新对应 reference set。

`presentationDigest` 必须覆盖 post-Hotfix resolved Presentation Program 与从同一 validated source presentation facet 取得的完整 SceneGraph 的上述 tagged canonical bytes；不能只依赖 Story/source import-closure digest。只改变同一逻辑 TextId 的真实字符串、同一逻辑 AssetId 的 provider/bytes，或 Presentation Program/SceneGraph 的 decimal geometry、renderer、布局时，必须改变 `presentationDigest`，同时保持 `stateContractDigest` 与 `simulationDigest` 不变。改变 Narrative/Query 会发布的逻辑 TextId、CharacterId、SceneId 或 AssetId 引用则是 Simulation Program 变化，不能伪装成纯 presentation edit。SceneGraph 不进入 Snapshot、Save、CommandLog、Replay anchor 或 authoritative replay 比较。

combined `story.digest` 只用于 source provenance 诊断，不作为两个 resolved root 的共同父摘要。`simulationDigest` 直接覆盖 Story identity、simulation source digest、define-twice executable/provider 投影、post-Hotfix SimulationProgram、validated GameSimulation manifest、state-contract digest 与 simulation PatchSet；`presentationDigest` 直接覆盖 Story identity、presentation source digest、post-Hotfix Presentation Program、完整 SceneGraph、resolved Asset Pack identities 与 presentation PatchSet。这样只改变任一 build source facet 时，另一个 resolved root 的 digest 必须保持不变。

`@sillymaker/base/testkit` 的 `resolveStoryForTestV1(entry)` 只为测试 driver 提供一个未打补丁的 `ResolvedGameV1`：它仍调用真实 `resolveGamePackageV1`、运行全部 Schema/reference/invariant 校验，并使用确定性的测试专用 build/governance 输入。其摘要只用于测试稳定性，不得写入生产 Save/Debug provenance。source `StoryDefinitionV1.simulation` 不含可运行 GameSimulation 或 `simulationDigest`；测试 Session 必须先取得 `resolved.gameSimulation`。Resolved identity 由 GameSession/Save/Replay 边界绑定，不作为 PoC 玩法 GameCommandExecutor 的输入。

ResolvedGame 的 simulation root 包含 post-Hotfix GameSimulation、SimulationProgram、规则、Balance、State definitions，以及 Narrative 的分支、condition、check、command、Effect 和完整控制流。可持久 cursor/IR 的 Schema descriptor 与 Gameplay State/持久 IR 可以引用的封闭 authored scene/node 等稳定 ID 集合同时进入 state-contract manifest；完整 Narrative 语义进入 simulation manifest。Presentation root 包含 React `UiSceneGraph`、真实文本、素材 provider/bytes 和布局；它不能作为 simulation root 的依赖。这样“Scene”不会被粗略归入 presentation：authoring `NarrativeSceneV1`/`StoryContentV1` 可以混合书写，但 validator 必须按 §7.2 的显式 shape 把完整 scenes 编译进 `PocSimulationDataV1.narrative.scenes`，其中只保留逻辑 TextId/CharacterId/AssetId 而不包含真实文本、图片 bytes、renderer 或布局；这些逻辑引用再与 resolved Presentation catalogs 做双边闭包验证。同一源文件可以贡献多个 canonical projections，但两边不得复制同一可变对象或让 Presentation 值回流 simulation。

`StoryContentV1.texts` 只声明稳定 TextId；真实字符串位于 `TextCatalogSetV1`。Locale ID 必须是规范化 BCP 47、深值唯一；default locale 的 catalog 必须覆盖全部 TextId。非默认 catalog 可以是部分翻译，但 fallback 链必须存在、无环并最终到达 default；走完整条链仍缺失是 Story validation error，不把 TextId 本身显示给 Player。v1 的 Presentation PatchSurface 暴露一个强类型 `text.catalogs` slot，替换值是完整 `TextCatalogSetV1`；不做隐式对象 merge。Hotfix 可以通过替换整套 catalog 添加语言或覆盖部分文本，但解析后仍重新验证完整 fallback 合同。

两个 PatchSurface 是彼此独立的强类型、可撤销 Registry/Proxy。Simulation Registry 只能注册 `rule | value`；Presentation Registry 只能注册 `value | text | asset`。surface 决定 digest 归属，不接受作者填写 `impact` 字符串。每个 slot 除 descriptor 外还携带对应 value 或 rule input/output Schema；presentation 值不会被 GameSimulation/GameCommandExecutor 导入。

Hotfix 脚本暴露 `HotfixEntryV1`；`install()` 可以执行普通同步 JavaScript，但受管合同要求安装过程确定、无平台 I/O、真实时间、环境随机和全局可变状态，替代 rule 也必须是只依赖输入/显式 RNG 的无状态函数。Loader 在新建的 candidate registries 上运行一次，返回 thenable或抛错即失败；解析完成后撤销所有写 proxy、deep-freeze 结果，再建立 `ResolvedGame`。这些是官方兼容合同而非安全隔离，第三方越界仍风险自负。

每个实际替换必须在 `manifest.targets` 中恰有一项且 surface 相同，赋值前当前 provider digest 必须等于 `expectedProviderDigest`；未实际替换的 target 同样是验证错误，防止补丁在新 Story 上“看似成功但什么也没做”。两个 Hotfix 触碰同一 Symbol 时，后者必须在 `supersedes` 中明确列出当前 provider；否则整组解析失败。

provider digest 的规范输入冻结如下：默认 provider 使用构建生成的 slot-local source/import-closure digest；Hotfix rule 使用 `hotfixResolvedDigest + surface + symbolId + replacementOrdinal`；serializable value/text/asset 再加入替换值的 Canonical JSON digest。provider digest 的 domain 是 `sillymaker:patch-provider:v1`，不序列化函数对象或使用 `Function#toString()`。PatchSet 使用 `sillymaker:patch-set:v1` 分别摘要完整 `AppliedHotfixV1[]`、只保留 simulation traces 且丢弃空 Hotfix 项的投影，以及只保留 presentation traces 且丢弃空项的投影；空数组也各有稳定 digest。额外的纯 presentation Hotfix 不改变 `PatchSetIdentityV1.simulationDigest`。同一 Hotfix contract suite 必须在两个全新 candidate registries 中安装两次，比较 replacement trace、serializable values 和所有 rule vectors，防止受管补丁依赖隐式环境。

Loader 输入列表就是唯一顺序：ID 深值唯一，`ordinal` 从 1 连续递增；`requires` 只能引用更早条目；任一条目的 `conflicts` 命中集合中其他 ID 即失败；Loader 不按文件名排序或自动拓扑重排。全部 Hotfix 作为一个 bootstrap candidate 原子解析、校验和冻结，任何失败都不产生部分 `ResolvedGame`。

`resolveGamePackageV1` 只返回 `GamePackageResolutionResultV1`，不以任意 thrown shape 作为公共协议；所有同步 throw/thenable/Schema/引用/素材/identity 失败先归一化为上述 closed code、按输入顺序去重的 `rejectedHotfixIds` 和受 Strict JSON 限制的 details。Web bootstrap controller 首先解析无补丁 base：base 失败固定为 `fatal`，没有 runnable Story，且 `rejectedHotfixIds=[]`；base 成功后 candidate 失败固定为 `safe_mode`，其 `base` 与 `resolved` 是同一已验证 base 引用，不偷偷重试子集；candidate 成功为 `ready`。无补丁启动时 `ready.base===ready.resolved`。三种结果都携带只用于诊断的 last-success identity，不能把该记录当成 resolved content。

`rule`/simulation `value` 只能替换既有合同，不能增加 State 字段、Command/Fact kind、Module 或生命周期 hook；presentation `value`/`text`/`asset` 不能参与模拟判定。第三方绕过 Registry 修改内部对象或浏览器全局属于非托管行为，不在兼容和复现承诺内。

Save adoption 不由任一 Hotfix 单独授权。全部替换解析后生成覆盖有序 Hotfix identities 和 traces 的 `PatchSetIdentityV1`；独立 compatibility metadata 才能声明精确的 `story + stateContractRevision/digest + fromSimulationDigest → toSimulationDigest + simulationPatchSetDigest`。该声明本身不进入 simulation digest，避免循环，但必须随目标 PatchSet 分发并在载入时逐字段精确匹配；额外组合任何 simulation Hotfix 都会得到不同 to digest/simulation PatchSet，原声明自动失效，纯 presentation Hotfix 不影响该判断。

### 7.4 Application Port 与 UI Contribution 源码合同

```ts
type ContentMaturityFlagId = Brand<string, "ContentMaturityFlagId">;
type ContentPreferencePresetId = Brand<string, "ContentPreferencePresetId">;
type ContentMaturityFlagsV1 = Brand<number, "ContentMaturityFlagsV1">;
declare const contentMaturityFlagBitBrand: unique symbol;
type ContentMaturityFlagBitV1 = ContentMaturityFlagsV1 & {
  readonly [contentMaturityFlagBitBrand]: "ContentMaturityFlagBitV1";
};

interface ContentMaturityFlagDescriptorV1 {
  readonly id: ContentMaturityFlagId;
  readonly flag: ContentMaturityFlagBitV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

interface ContentPreferencePresetDescriptorV1 {
  readonly presetId: ContentPreferencePresetId;
  readonly allowedFlags: ContentMaturityFlagsV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

interface ContentMaturityPolicyV1 {
  readonly policyRevision: PositiveSafeInteger;
  readonly flags: readonly ContentMaturityFlagDescriptorV1[];
  readonly presets: readonly ContentPreferencePresetDescriptorV1[];
  readonly defaultAllowedFlags: ContentMaturityFlagsV1;
}

interface ContentRequirementV1 {
  readonly requiredFlags: ContentMaturityFlagsV1;
}

interface ContentPreferenceV1 {
  readonly allowedFlags: ContentMaturityFlagsV1;
}

interface ContentPreferenceRecordV1 {
  readonly contractRevision: 1;
  readonly storyId: StoryId;
  readonly policyRevision: PositiveSafeInteger;
  readonly allowedFlags: ContentMaturityFlagsV1;
}

type ContentPreferenceSetResultV1 =
  | { readonly kind: "updated"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | { readonly kind: "rejected"; readonly code: "content_maturity.invalid_preference" }
  | { readonly kind: "rejected"; readonly code: "content_maturity.unknown_flags" }
  | { readonly kind: "failed"; readonly code: "content_preference.storage_failed" };

interface ContentPreferencePortV1 {
  observe(): DeepReadonly<ContentPreferenceV1>;
  subscribe(listener: () => void): () => void;
  set(preference: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1>;
}

declare function parseContentMaturityFlagBitV1(value: unknown): ContentMaturityFlagBitV1;
declare function parseContentMaturityFlagsV1(value: unknown): ContentMaturityFlagsV1;
declare const emptyContentMaturityFlagsV1: ContentMaturityFlagsV1;
declare function parseContentMaturityPolicyV1(value: unknown): ContentMaturityPolicyV1;
declare function parseContentPreferenceV1(value: unknown): ContentPreferenceV1;
declare function combineContentMaturityFlagsV1(
  ...values: readonly ContentMaturityFlagsV1[]
): ContentMaturityFlagsV1;
declare function setContentMaturityFlagV1(
  flags: ContentMaturityFlagsV1,
  flag: ContentMaturityFlagBitV1,
  enabled: boolean,
): ContentMaturityFlagsV1;
declare function findUnknownContentMaturityFlagsV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  flags: ContentMaturityFlagsV1,
): ContentMaturityFlagsV1;
declare function isContentRequirementAllowedV1(
  requiredFlags: ContentMaturityFlagsV1,
  allowedFlags: ContentMaturityFlagsV1,
): boolean;
declare function requireContentPreferencePresetV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  presetId: ContentPreferencePresetId,
): DeepReadonly<ContentPreferencePresetDescriptorV1>;

interface ReadonlyViewSourceV1<TViewModel> {
  getCurrent(): DeepReadonly<TViewModel>;
  subscribe(listener: () => void): () => void;
}

interface SessionLifecyclePortV1<TAnchorResult> {
  createNewSession(): Promise<TAnchorResult>;
  restartSession(): Promise<TAnchorResult>;
}

type PlayerWritableSaveSlotIdV1 = "quick" | "manual";
type SessionLeaseOwnerId = Brand<string, "SessionLeaseOwnerId">;
type LeaseHandoffRequestId = Brand<string, "LeaseHandoffRequestId">;

interface SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult> {
  getStatus(): Promise<TLeaseStatus>;
  requestHandoff(): Promise<TLeaseOperationResult>;
  approveHandoff(requestId: LeaseHandoffRequestId): Promise<TLeaseOperationResult>;
  takeOver(): Promise<TLeaseOperationResult>;
  release(): Promise<TLeaseOperationResult>;
}

interface PlayerPersistencePortV1<
  TSlotSummary,
  TPersistenceStatus,
  TPersistenceResult,
  TExportedSave,
  TSaveExportResult,
  TLeaseStatus,
  TLeaseOperationResult,
> {
  readonly lease: SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult>;
  listSlots(): Promise<readonly TSlotSummary[]>;
  getStatus(): Promise<TPersistenceStatus>;
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult>;
  load(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  clear(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  exportSave(slot: SaveSlotIdV1): Promise<TSaveExportResult>;
  exportCurrentSave(): Promise<TExportedSave>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult>;
}

interface PlayerDiagnosticsPortV1<TDebugBundle> {
  exportDebugBundle(): Promise<TDebugBundle>;
}

interface SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus> {
  readonly revision: NonNegativeSafeInteger;
  readonly status: DeepReadonly<TStatus>;
  readonly game: DeepReadonly<TGameView>;
  readonly narrative: DeepReadonly<TNarrativeView>;
  readonly actions: readonly DeepReadonly<TActionDescriptor>[];
}

interface SemanticGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  observe(): DeepReadonly<
    SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>
  >;
  subscribe(listener: () => void): () => void;
  availableActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<
    DeepReadonly<SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>>
  >;
}

interface SemanticGamePortSourceV1<TState, TStatus> {
  getCurrentState(): DeepReadonly<TState>;
  getAuthoritativeRevisionToken(): object;
  getStatus(): DeepReadonly<TStatus>;
  subscribe(listener: () => void): () => void;
  reportSubscriberFailure(error: unknown): void;
  readStateAtQueueFront<TResult>(
    reader: (state: DeepReadonly<TState>) => TResult,
  ): Promise<TResult>;
}

interface SemanticGamePortInputV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly source: SemanticGamePortSourceV1<TState, TStatus>;
  createQueries(state: DeepReadonly<TState>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  projectNarrativeView(queries: TQueries): TNarrativeView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}

type DebugToolsOperationResultV1<TAllowedResult> =
  TAllowedResult | { readonly kind: "capability_disabled" };

type DebugFixtureListResultV1<TFixtureId> = DebugToolsOperationResultV1<{
  readonly kind: "listed";
  readonly fixtureIds: readonly TFixtureId[];
}>;

interface DebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
> {
  listFixtures(): Promise<DebugFixtureListResultV1<TFixtureId>>;
  executeDebugCommand(
    command: DeepReadonly<TDebugCommand>,
  ): Promise<DebugToolsOperationResultV1<TDebugResult>>;
  anchorFixture(fixtureId: TFixtureId): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  inspectDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TDebugInspection>>;
  anchorDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  replayAuthoritatively(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TAuthoritativeReplayResult>>;
  inspectReplayBestEffort(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TBestEffortReplayInspection>>;
  queryDiagnostics(
    query: DeepReadonly<TDiagnosticQuery>,
  ): Promise<DebugToolsOperationResultV1<TDiagnosticQueryResult>>;
}

type RuntimeCapabilityIdV1 = "debug_tools" | "cheats" | "automation_bridge";

interface RuntimeCapabilitiesV1 {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge: boolean;
}

type RuntimeCapabilityOperationResultV1 =
  | {
      readonly kind: "updated" | "unchanged";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    }
  | {
      readonly kind: "rejected";
      readonly code: "conflict" | "unavailable";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    };

interface RuntimeCapabilityPortV1 {
  readonly state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  setEnabled(
    capability: RuntimeCapabilityIdV1,
    enabled: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1>;
}

interface GameApplicationPortV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools,
> {
  readonly semantic: TSemantic;
  readonly lifecycle: TLifecycle;
  readonly persistence: TPersistence;
  readonly diagnostics: TDiagnostics;
  readonly capabilities: TCapabilities;
  readonly debugTools: TDebugTools;
}
```

Base 的 Application ABI 到 `GameApplicationPortV1`、`SemanticGamePortV1` 与
`PresentationReadPortV1` 为止，不导出 renderer binding、React contribution 或 GameSymbol provider
合同。旧的四桶 `UiRendererBindingV1`/`UiContributionSetV1` 是 Phase 2 provisional public-ABI
残留，在 Phase 5A Task 2 前移除；它们从未进入 Story 定义、ResolvedGame、Simulation、Save 或
Artifact 行为。`@sillymaker/ui` 独占七 namespace runtime renderer contribution 合同，GameSymbol
使用正交 registry；二者都不能反向进入 Base、GameSimulation 或 Headless closure。

`ContentMaturityFlagsV1` 是 `0..0xffffffff` 的规范 uint32；Base 导出唯一零值 `emptyContentMaturityFlagsV1`，authoring/runtime 代码不得用裸 `0` 冒充 branded mask。`ContentMaturityFlagBitV1` 是它的 nominal refinement/subtype，还必须是 `2^0..2^31` 中的非零 one-hot 位。它不能用第二个 `Brand<..., Name>` 与 mask brand 相交，因为当前单 brand-symbol helper 会把不同名称交成 `never`；专用 private unique-symbol refinement 保证 bit 可安全传给任何 mask 参数，反向则不成立。Base helper 的每次按位结果都执行 `>>> 0`，不得把 JavaScript signed int32 表象泄漏到公共结果或 JSON。`combineContentMaturityFlagsV1` 使用规范化 OR；`setContentMaturityFlagV1` 是 checkbox/adapter 唯一通用置位/清位 helper，精确语义分别为 `((flags | flag) >>> 0)` 与 `((flags & ~flag) >>> 0)`。零掩码表示无受限特征的标准内容，不登记为 flag 且始终允许。`isContentRequirementAllowedV1` 的精确语义是 `((requiredFlags & allowedFlags) >>> 0) === requiredFlags`；v1 不提供 any-of DSL。

Policy parser 要求 positive `policyRevision`、flag ID/bit 唯一、preset ID/mask 唯一，并证明 preset/default mask 不含未登记位。`parseContentPreferenceV1` 只接受 exact object `{ allowedFlags }`，拒绝额外字段和非 canonical uint32 值。Resolved Presentation catalog validator 负责证明全部 flag/preset TextId 存在以及每个 requirement 不含未登记位；Host adapter 对 preference 做相同 unknown-mask 检查。Flags 没有隐式顺序或蕴含关系；Story 若希望某项露骨性内容同时受 sexual 与 explicit 控制，必须把两位都写进该内容的 `requiredFlags`。改变 flag ID↔bit 对应或位语义必须递增 `policyRevision`。

Preset 只是 Story-owned 的已命名 mask；应用 preset 等价于对同一 Port 调用 `set({ allowedFlags: preset.allowedFlags })`。`ContentPreferenceRecordV1` 是 `engine/packages/web` adapter 的 private DTO，不属于 Base public exports；Base 只拥有 policy/preference/port 与纯 helper。Host record 不保存 preset ID。读取时 contract/story/policy revision 不匹配、非 canonical/额外字段、非法 uint32 或未知位都回退 `defaultAllowedFlags` 并产生一次有界 warning；`set()` 先用 `parseContentPreferenceV1` 拒绝 malformed/extra-field 输入为 `content_maturity.invalid_preference`，再在打开 Host transaction 前把未登记位拒绝为 `content_maturity.unknown_flags`。静态 policy、preset 和 requirements 进入 presentation identity；当前 preference 只属于 Story-scoped Host/Application state，不进入 Snapshot、Save、Replay、Semantic revision、simulation digest 或 Artifact identity。

`SemanticPublicationV1` 的 `game`、`narrative` 与 `actions` 是同一 authoritative revision 的三个独立、
不可变语义通道；Narrative 不嵌入 GameView，也不能由 renderer 从 GameView 或 action availability 反推。
每次 authoritative revision token 改变时，factory 恰好创建一次 Queries，并把同一 Queries reference 分别交给
`projectGameView`、`projectNarrativeView` 与 `actions` 各一次；三者都必须同步返回且在 publication swap 前完成
deep freeze。status-only publication 复用上一次 `game/narrative/actions` 三个精确引用，只替换 `status`，不得
伪造 Gameplay revision。PoC 的 `TNarrativeView` 精确为 `NarrativeProjectionV1 | null`。

Base 实现 `ReadonlyViewSourceV1`、SemanticGamePort、闭合的 RuntimeCapability result 与统一 GameApplication 子端口协议；Story-specific operation/result DTO 由当前 GameSimulation specialization 提供。公开 lifecycle `createNewSession`/`restartSession` 不接收可由 UI 伪造的 seed/runId；Application 在该 FIFO operation 到达队首后调用 `gameSimulation.createBootstrapInput(host.bootstrapEntropy)`，随后把同一 immutable input 交给 GameSimulation/stateful Modules，只建立 commandSequence 0 的新 replay anchor，不冒充 PoC 的第一条 `run.start` GameCommand，也不复用上次 seed。PoC specialization 产生 `PocGameBootstrapInputV1 { rngSeed, runId }`：Web Host 的 entropy adapter 在模拟外使用 `crypto.getRandomValues()`/`crypto.randomUUID()`，测试 Host 返回显式固定序列。`RunState.runId/initialSeed` 与初始 `RngState.cursor` 均由该 input 确定；runId 不参与规则随机，重放从已保存 Snapshot 读取它。公开 lifecycle/Story renderer 拿不到 entropy adapter；固定现场使用 fixture anchor，而不是另开 seed setter。

Player 只能显式写 `quick | manual`；`auto.current/auto.previous` 由提交后 Auto Save policy 内部轮换，但四个 Slot 都可以 list、load、clear 和 export。`exportSave(slot)` 返回 `SaveExportOperationResultV1`，因此 empty、invalid、unavailable 与读取期间发生 CAS 冲突都以稳定结果表达，不以 Promise rejection 或“先 list 再假设不变”处理。`exportCurrentSave` 直接从调用被接受时的最后 committed Snapshot 构造 `slotId="manual"` 的 `ExportedSaveV1`，不依赖 IndexedDB 成功，因此持久化故障时仍可抢救现场。`listSlots/getStatus` 必须区分 empty、valid、invalid、recovery-candidate、busy 和 unavailable；Lease 子端口覆盖请求交接、原 owner 批准、显式接管和释放，并且每个结果都携带当前 fencing/ownership 状态。

Runtime-gated DebugTools 的 `inspectDebugBundle` 与 `inspectReplayBestEffort` 永远只读，允许在身份不匹配时返回分阶段诊断，不能替换 Session；`replayAuthoritatively` 只接受精确 replay identity 并逐项验证日志；`anchorFixture` 与 `anchorDebugBundle` 在 `debug_tools+cheats` 执行点复查后进入 GameSession FIFO，成功时替换 Snapshot/replay base 并清空旧日志。`queryDiagnostics` 只读取有界日志、Facts、Aura、不变量和 runtime failures。它们可以存在于同一 Artifact，但普通 Story renderer 与 Automation Bridge 均不可达这些端口。

`DebugToolsOperationResultV1` 是 Application capability 外层；Story-specific allowed result 不重复携带权限状态。`listFixtures` 的 `{ kind: "listed", fixtureIds: [] }` 表示已授权但没有 fixture，`{ kind: "capability_disabled" }` 表示调用时未授权。所有八个方法关闭时都 resolve 后者，不 reject、不 throw、不导入 tooling，也不进入 FIFO。

`@sillymaker/ui` 实现中性 renderer/contribution 注册，Story/GameSimulation 提供具体 ID 与只读 GameQueries 投影。七个 namespace 精确为 `background | character | scene_interaction | hud | workspace_overlay | narrative | system`；renderer ID 只要求在同一 namespace 内唯一，GameSymbol 不属于任何 renderer namespace。renderer 只能收到 view slice、Story-specialized SemanticGamePort 与 PresentationReadPort，不能收到 Snapshot、GameSession、DebugTools 或 Module owner capability。

Story runtime 默认入口只引用统一 `GameApplicationPort` 的低权限表面。Tooling UI、fixtures 和 notes 可以存在于同一 Artifact，但只能从固定 `./tooling`/`./tooling-ui` exports 按 `debug_tools`/`cheats` capability 延迟取得；bundle absence 不是权限边界，不存在 Developer-only graph 或第二 Artifact。

### 7.5 Host、运行时结果与 Presentation Read Port

下列合同属于 Base/Host 边界，不进入模拟，也不能由 Story 或 Module 取得。Atomic store 使用声明式 compare-and-swap batch，而不是把 IndexedDB transaction/callback 暴露给 Base；Web Host 用一个 IndexedDB transaction 实现 batch，未来 Electron Host 可以使用不同后端。

```ts
type HostRecordNamespaceV1 = "save" | "lease" | "settings";
type HostRecordKeyV1 = Brand<string, "HostRecordKeyV1">;
type HostRecordRevisionV1 = NonNegativeSafeInteger;

interface HostStoredRecordV1 {
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly revision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
}

type HostRecordMutationV1 =
  | {
      readonly kind: "put";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1 | null;
      readonly bytes: Uint8Array;
    }
  | {
      readonly kind: "delete";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1;
    };

type HostAtomicCommitResultV1 =
  | {
      readonly kind: "committed";
      readonly records: readonly HostStoredRecordV1[];
    }
  | {
      readonly kind: "conflict";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly actualRevision: HostRecordRevisionV1 | null;
    };

interface HostAtomicRecordStoreV1 {
  read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1): Promise<HostStoredRecordV1 | null>;
  list(namespace: HostRecordNamespaceV1): Promise<readonly HostStoredRecordV1[]>;
  commit(
    mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
  ): Promise<HostAtomicCommitResultV1>;
}

type HostFileSelectionResultV1 =
  | { readonly kind: "selected"; readonly name: string; readonly bytes: Uint8Array }
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: "too_large" | "unsupported_type" };

interface HostFilePortV1 {
  selectOne(request: {
    readonly acceptedMediaTypes: readonly string[];
    readonly maximumBytes: PositiveSafeInteger;
  }): Promise<HostFileSelectionResultV1>;
  download(request: {
    readonly filename: string;
    readonly mediaType: string;
    readonly bytes: Uint8Array;
  }): Promise<void>;
}

interface GameHostV1 {
  readonly platform: "web" | "electron";
  readonly bootstrapEntropy: BootstrapEntropyV1;
  readonly records: HostAtomicRecordStoreV1;
  readonly files: HostFilePortV1;
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly navigation: {
    reloadApplication(): void;
    requestExit(): void;
  };
  readonly log: {
    write(
      level: "debug" | "info" | "warn" | "error",
      code: string,
      details: StrictJsonObjectV1,
    ): void;
  };
}

type RuntimeSessionStatusV1 = "ready" | "busy" | "fault_paused" | "hmr_invalidated";

type SessionDispatchOperationResultV1<TExecutionResult> =
  | { readonly kind: "executed"; readonly execution: TExecutionResult }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

type SessionAnchorResultV1 =
  | {
      readonly kind: "anchored";
      readonly commandSequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "rejected";
      readonly code: "busy" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: string };

type SaveSlotHealthV1 = "empty" | "valid" | "invalid" | "recovery_candidate" | "unavailable";

interface SaveSlotSummaryV1 {
  readonly slotId: SaveSlotIdV1;
  readonly health: SaveSlotHealthV1;
  readonly recordRevision: PositiveSafeInteger | null;
  readonly capturedCommandSequence: NonNegativeSafeInteger | null;
  readonly savedAt: IsoUtcInstant | null;
  readonly warningCodes: readonly string[];
}

interface PersistenceStatusV1 {
  readonly available: boolean;
  readonly busy: boolean;
  readonly safelySavedCommandSequence: NonNegativeSafeInteger | null;
  readonly lastFailureCode: string | null;
}

type PersistenceOperationResultV1 =
  | {
      readonly kind: "saved" | "cleared";
      readonly slotId: SaveSlotIdV1;
    }
  | {
      readonly kind: "loaded" | "imported";
      readonly compatibility: "exact" | "adopted";
      readonly commandSequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "rejected";
      readonly code:
        | "busy"
        | "unavailable"
        | "empty_slot"
        | "conflict"
        | "invalid_record"
        | "lineage_limit"
        | "incompatible";
    }
  | { readonly kind: "faulted"; readonly code: string };

interface ExportedSaveV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

type SaveExportOperationResultV1 =
  | {
      readonly kind: "exported";
      readonly slotId: SaveSlotIdV1;
      readonly file: ExportedSaveV1;
    }
  | {
      readonly kind: "rejected";
      readonly code: "unavailable" | "empty_slot" | "conflict" | "invalid_record";
    }
  | { readonly kind: "faulted"; readonly code: string };

interface ExportedDebugBundleV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

type SessionLeaseStatusV1 =
  | {
      readonly kind: "owned";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "readonly";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "handoff_requested";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
      readonly requestId: LeaseHandoffRequestId;
      readonly requestedByOwnerId: SessionLeaseOwnerId;
    }
  | {
      readonly kind: "unowned";
      readonly ownerId: null;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "unavailable";
      readonly ownerId: null;
      readonly fencingToken: null;
      readonly code: string;
    };

type SessionLeaseOperationResultV1 =
  | { readonly kind: "updated"; readonly status: SessionLeaseStatusV1 }
  | { readonly kind: "rejected"; readonly code: "conflict" | "unavailable" | "unknown_request" };

interface ResolvedTextPresentationV1<TTextId, TLocaleId> {
  readonly textId: TTextId;
  readonly requestedLocale: TLocaleId;
  readonly resolvedLocale: TLocaleId;
  readonly text: string;
}

type ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken> =
  | {
      readonly delivery: "code_fallback";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly fallbackToken: TFallbackToken;
    }
  | {
      readonly delivery: "runtime_image";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly url: string;
      readonly width: PositiveSafeInteger;
      readonly height: PositiveSafeInteger;
      readonly fallbackToken: TFallbackToken;
    };

interface PresentationReadPortV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken> {
  readonly locale: TLocaleId;
  text(textId: TTextId): ResolvedTextPresentationV1<TTextId, TLocaleId>;
  asset(
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
}

interface RuntimeViewModelEnvelopeV1<
  TSceneId,
  TGameView,
  TNarrativeView,
  TPersistenceView,
  TNoticeTextId,
> {
  readonly revision: NonNegativeSafeInteger;
  readonly sessionStatus: RuntimeSessionStatusV1;
  readonly activeSceneId: TSceneId;
  readonly game: TGameView;
  readonly narrative: TNarrativeView;
  readonly persistence: TPersistenceView;
  readonly noticeTextIds: readonly TNoticeTextId[];
}
```

`HostAtomicRecordStoreV1.list` 按 key 升序返回；一个 commit 内的 mutations 必须具有唯一 `(namespace,key)` 并全部成功或全部不写。Host bootstrap entropy 只供 Application/GameSimulation 建立新锚点，不进入普通 `TExecutionContext`；metadata clock 只用于 Save/Debug/日志时间戳。两者都不可交给 Story Scene、rule 或 Module handler。`GameHostV1` 不提供网络、DOM、window、IndexedDB object、任意回调 transaction 或全局对象。

GameSession 的 concrete command dispatch result 必须是 `SessionDispatchOperationResultV1<CommandExecutionResultEnvelopeV1<...>>`。只有操作到达 FIFO 队首、针对当时 committed Snapshot 完成同一次 `executeAttempt` 后才返回 `executed`；其中领域结果才可能是 `committed | rejected | faulted`。若 admission Schema 失败，或排队期间 Session 被前项 fault/HMR 变成不可执行，则返回 `not_executed`，不打开候选事务、不消费 RNG/sequence、不写 CommandLog。SemanticGamePort 将该结果投影为 player-safe 结果而不暴露原始 Command、Snapshot、Facts 或 fault。FIFO 可以接受同 tick 多个普通 dispatch；`busy` 是 UI/Save capture 状态，不把已接收 dispatch 伪造为领域拒绝。

PoC specialization 的 `SemanticPublicationV1.game` 精确使用本 Catalog 的 `PocGameViewV1`：它包含 HUD、
Action、run-start/policy/opening controls、Demand/Obligation forecast、Inventory/Tavern/Facilities/Ledger
projection、resolved checks 与 completion，但不包含 Narrative。独立 `SemanticPublicationV1.narrative` 精确使用
`NarrativeProjectionV1 | null`。Application 可以把这两个同 revision 通道与 persistence/application UI state
组合成 `RuntimeViewModelEnvelopeV1<SceneId,...,TextId>`，但不得把 Narrative 复制回 GameView 或形成第二个
semantic revision。所有字符串与图片在 renderer 中只通过
`PresentationReadPortV1<TextId,AssetId,AssetUsageV1,LocaleId,FallbackToken>` 解析；RuntimeViewModel 不携带原始
TextCatalog、Asset Pack、runtimePath、规则或 Snapshot fragment。普通 UI contribution renderer context 精确为
`{ viewSlice, semantic, presentation }`；只有 DevDock 接收独立的 capability-gated DebugTools port。

`@sillymaker/base` 实现上述 Host/结果/envelope 泛型；Web Host 实现 records/files/navigation/log，`game/stories/poc` 冻结 PoC game-view specialization并提供 Text/Asset presentation 数据，`@sillymaker/ui` 只消费投影与 renderer context。任何具体 DTO 新增字段先更新本节和对应 contract test，不能让 React 组件临时读取 `ResolvedGame`、Snapshot 或 Gameplay State。

## 8. PocRulesV1：精确输入与输出

```ts
interface RuleDrawRequestV1 {
  readonly exclusiveMax: PositiveSafeInteger;
  readonly purpose: string;
}
interface RuleRngV1 {
  nextInt(request: DeepReadonly<RuleDrawRequestV1>): NonNegativeSafeInteger;
}

interface AppliedModifierV1 {
  readonly modifier: ModifierV1;
  readonly contribution: SafeInteger;
}

interface DemandSeedInputLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly baseCustomers: NonNegativeSafeInteger;
}
interface DemandSeedInputV1 {
  readonly runId: RunId;
  readonly segments: readonly DemandSeedInputLineV1[];
}
interface DemandSeedResultLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly randomOffset: DemandRandomOffset;
}
interface DemandSeedResultV1 {
  readonly lines: readonly DemandSeedResultLineV1[];
}

interface DemandProjectionInputV1 {
  readonly day: DayIndex;
  readonly seeds: readonly DemandSeedSegmentStateV1[];
  readonly reputation: NonNegativeSafeInteger;
  readonly facts: readonly FactEntryV1[];
  readonly modifiers: readonly ModifierV1[];
}
interface DemandPreviewLineV1 {
  readonly segmentId: CustomerSegmentId;
  readonly range: IntegerRangeV1;
  readonly actualCustomers: NonNegativeSafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
}
interface DemandPreviewV1 {
  readonly day: DayIndex;
  readonly lines: readonly DemandPreviewLineV1[];
}

type TavernPreviewInputV1 =
  | {
      readonly basis: "current_state";
      readonly day: DayIndex;
      readonly plan: TavernPlanV1;
      readonly preparationActionCount: NonNegativeSafeInteger;
      readonly availableIngredients: readonly IngredientQuantityV1[];
      readonly demand: readonly MaterializedDemandSegmentV1[];
      readonly actors: OpeningActorInputsV1;
      readonly facilityIds: readonly FacilityId[];
      readonly modifiers: readonly ModifierV1[];
      readonly resources: {
        readonly apRemaining: NonNegativeSafeInteger;
        readonly cash: Money;
        readonly playerStamina: NonNegativeSafeInteger;
        readonly heroineStamina: NonNegativeSafeInteger;
      };
    }
  | {
      readonly basis: "active_opening_baseline";
      readonly plan: TavernPlanV1;
      readonly session: OpeningSessionV1;
    };

interface TavernOpeningCashCostV1 {
  readonly wage: Money;
  readonly openingFee: Money;
  readonly modifierDelta: SafeInteger;
  readonly total: Money;
  readonly appliedModifiers: readonly AppliedModifierV1[];
}
interface TavernOpeningCostsV1 {
  readonly commitment: "prospective" | "committed";
  readonly modeReasonId: ReasonId;
  readonly ap: NonNegativeSafeInteger;
  readonly playerStamina: NonNegativeSafeInteger;
  readonly heroineStamina: NonNegativeSafeInteger;
  readonly cash: TavernOpeningCashCostV1;
  readonly ingredientShortages: readonly IngredientQuantityV1[];
}
interface TavernPreviewV1 {
  readonly basis: "current_state" | "active_opening_baseline";
  readonly allowed: boolean;
  readonly rejectionCodes: readonly PocRejectionReasonV1["code"][];
  readonly openingCosts: TavernOpeningCostsV1;
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly expectedSales: readonly {
    readonly recipeId: RecipeId;
    readonly range: IntegerRangeV1;
  }[];
  readonly cashDelta: IntegerRangeV1;
}
interface TavernSettlementInputV1 {
  readonly session: OpeningSessionV1;
}
interface SettlementDraftV1 {
  readonly orders: readonly OpeningOrderLineV1[];
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly discardedPortions: readonly PlannedRecipeV1[];
  readonly appliedModifiers: readonly AppliedModifierV1[];
  readonly effects: readonly EffectIntentV1[];
  readonly entries: readonly LedgerEntryDraftV1[];
}

interface CheckInputV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly attribute: AttributeId;
  readonly rank: AttributeRank;
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly ModifierV1[];
  readonly bands: readonly CheckOutcomeBandV1[];
}
interface CheckPreviewV1 {
  readonly formula: "2d6+bonuses";
  readonly totalBonus: SafeInteger;
  readonly possibleTotal: IntegerRangeV1;
  readonly bands: readonly {
    readonly bandId: CheckBandId;
    readonly total: IntegerRangeV1;
  }[];
}
interface CheckResultV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly dice: readonly [DieFace, DieFace];
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
  readonly totalBonus: SafeInteger;
  readonly total: SafeInteger;
  readonly bandId: CheckBandId;
  readonly effects: readonly EffectIntentV1[];
}

interface ResolvedCheckV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly dice: readonly [DieFace, DieFace];
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
  readonly totalBonus: SafeInteger;
  readonly total: SafeInteger;
  readonly bandId: CheckBandId;
  readonly resolvedAtSequence: PositiveSafeInteger;
}

type LevyResolutionV1 =
  | {
      readonly kind: "paid";
      readonly levyAmount: Money;
      readonly cash: BeforeAfterV1<Money>;
    }
  | {
      readonly kind: "arrears";
      readonly levyAmount: Money;
      readonly availableCash: Money;
      readonly shortfall: Money;
    };

interface EndingInputV1 {
  readonly cash: Money;
  readonly levy: LevyResolutionV1;
  readonly reputation: NonNegativeSafeInteger;
  readonly facilityIds: readonly FacilityId[];
  readonly relationship: RelationshipStateV1;
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
  readonly auras: readonly AuraInstanceV1[];
}
interface EndingSummaryV1 {
  readonly relationship: OutcomeEntryV1;
  readonly investigation: OutcomeEntryV1;
}
interface EndingResultV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly reasonIds: readonly ReasonId[];
  readonly effects: readonly ProgressionEffectIntentV1[];
  readonly summary: EndingSummaryV1;
}

interface RunCompletionV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly levy: LevyResolutionV1;
  readonly reasonIds: readonly ReasonId[];
  readonly summary: EndingSummaryV1;
  readonly completedAtSequence: PositiveSafeInteger;
}

interface PocRulesV1 {
  readonly demand: {
    preview(input: DeepReadonly<DemandProjectionInputV1>): DemandPreviewV1;
    resolve(input: DeepReadonly<DemandSeedInputV1>, rng: RuleRngV1): DemandSeedResultV1;
  };
  readonly tavern: {
    preview(input: DeepReadonly<TavernPreviewInputV1>): TavernPreviewV1;
    settle(input: DeepReadonly<TavernSettlementInputV1>, rng: RuleRngV1): SettlementDraftV1;
  };
  readonly checks: {
    describe(input: DeepReadonly<CheckInputV1>): CheckPreviewV1;
    resolve(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1;
  };
  readonly endings: {
    evaluate(input: DeepReadonly<EndingInputV1>): EndingResultV1;
  };
}

type StoryRuleSlotV1 =
  | "demand.preview"
  | "demand.resolve"
  | "tavern.preview"
  | "tavern.settle"
  | "checks.describe"
  | "checks.resolve"
  | "endings.evaluate";
```

`TavernPreviewInputV1` 的判别字段同时冻结调用时点。`basis="current_state"` 只能由最新 Gameplay
State 的窄投影建立；顶层 day/plan/preparation/ingredients/demand/actors/facilities/modifiers 保持各自领域
含义，`resources` 只补齐决定 `allowed` 所必需的当前 AP、现金和双方体力，不能换成完整 Snapshot。
`basis="active_opening_baseline"` 只接受当前 `OpeningSessionV1`，且 `plan` 必须与
`session.baseline.{mode,menu}` Canonical JSON 深值相等；该分支不得读取 post-Start 库存、AP、现金或角色
资源来重建已经冻结的承诺。Rule invocation 的 strict validation 拒绝 branch 字段混用和 active-plan 不等，
而不是静默降级到 current-state 计算。

Tavern preview 与 settlement 共用下面一条确定性计算管线：

1. 所选模式必须解析到唯一 `StoryBalanceV1.serviceModes` 行；`openingCosts.modeReasonId` 精确复制该行的
   `reasonId`，AP、双方体力、工资、base reception/preparation、teamwork 与 preparation-per-action 也只从
   同一行读取，不能从 `ServiceMode` 字符串推断或保留第二份 mode 常量。结算生成的 base reputation、
   teamwork 与 heroine-mood `EffectIntentV1.reasonId` 同样复制这条 mode definition 的 `reasonId`；Modifier
   explanation 则继续保存每个 Modifier 自己的 `reasonId`，两类 provenance 不得混用；
2. 对每个客群先取菜单最高偏好 `p`，计算
   `effectiveOrders = round(potentialCustomers * p / 3)`；再按该客群各菜谱的非负偏好权重做最大余数分配，
   floor 后剩余单位按余数降序、`RecipeId` 升序发放。最高偏好为 0 时该客群全部 order lines 为 0；
3. 若全部 order lines 的 `effectiveOrders` 之和超过非负 reception capacity，按各 line 的
   `effectiveOrders` 比例再次使用最大余数法分配 reception capacity；并列按
   `(CustomerSegmentId, RecipeId)` 升序，结果写入 `capacityAccepted`；
4. 随后逐菜谱应用 planned-portions cap。若该菜谱各客群的 `capacityAccepted` 之和大于计划份数，按这些
   accepted 数的比例做最大余数分配；并列仍按 `(CustomerSegmentId, RecipeId)` 升序，结果才是各 line 的
   `actualSales`。因此每道菜实际销量总和不超过该菜计划份数，且不会通过按数组位置截断而偏爱某一客群；
5. 最大余数的 quotient/remainder 使用 safe-integer 算术；不以浮点近似余数决定 tie，也不引入 Decimal、
   随机抽样或输入数组顺序。所有 `base + ordered modifier contributions` 在完整求和后以 `max(0, value)`
   对 service cost、reception capacity 与 preparation capacity 做一次非负下界收敛；负 Modifier 不得产生
   负成本/容量，`AppliedModifierV1.contribution` 仍保存其原始实际贡献，不因最终 clamp 被改写。

当前七日 PoC 的 Tavern preview 对每个 demand segment 的闭区间枚举全部整数值的笛卡尔积，并对每个向量
运行上述同一管线；每道菜 `expectedSales.min/max` 与 `cashDelta.min/max` 是全部结果的精确 extrema。
当前 concrete Story 只有两个客群，D1 为单点区间、D2 起每个区间宽度至多 2，因此该枚举有明确小上界。
若未来受验证的数据扩大这个上界，替代实现必须是可证明覆盖全部合法 demand 向量的保守区间算法；不得
采样、截断枚举或只试端点后声称精确。无论采用哪条受控路径，stored actual-demand 向量运行同一管线所得的
每道菜销量和 cash delta 必须落在 preview range 内。

Tavern rule 只接受已经由 caller 严格解析且所有 mode/recipe reference 都可解析、因而足以计算数值的 plan；
结构或引用无效的 calculator invocation 直接失败且绝不调用 Rule，因为 `TavernPreviewV1` 没有可诚实承载伪造
数值的 invalid-input branch。对 reference-valid 但受当前 State 的 menu limit、recipe unlock、mode availability
或计算后 capacity guard 阻止的 plan，共享 guard 仍产生有序 typed rejection；calculator 可以调用同一 Rule 得到
可展示数值，再由 wrapper 将这些 guard code 前置合并并强制 `allowed=false`。`tavern.plan_frozen` 只阻止再次提交
`tavern.plan.set`，不阻止 evening 已冻结 plan 的 Opening/Obligation calculator。Rule 不得复制 `ConditionV1`
switch 或另写一套 mode gate。current-state rule preview 的
`allowed` 只合并 `resources` 中 AP/现金/双方体力与 ingredient shortages，
`openingCosts.commitment="prospective"`，cash range 包含未来 Start 的 wage/opening fee 后再加 Finalize
revenue。Task 10 execute/preview 与 Task 12 Query 使用同一个 calculator wrapper，把共享 guard 的有序 rejection
codes 与 rule resource result 合成最终公开 preview。active-baseline preview 的 costs 只从 baseline 展示已承诺
值，`commitment="committed"`、shortages 为空，cash range 只含尚未提交的 Finalize revenue，绝不重复扣
Start 成本。

`SettlementDraftV1.appliedModifiers` 按统一 collector stable order 保存这次 opening 中实际参与 service cost、
reception/preparation capacity 或 teamwork 决策的 baseline/session Modifier；筛选不改变相对顺序，同一
source 的多条实际贡献可分别保留。Executor 原样复制该数组到 `OpeningLedgerV1.appliedModifiers`，并只据此
识别成功 Finalize 后应扣一次的 applicable `opening` countdown Aura；不得从最终数值反推 Modifier 或 Aura。

`RuleDrawRequestV1.purpose` 是唯一例外于 authored stable ID 格式的受控字符串，byte length 为 1..128，且必须匹配 `^(demand|check|scheduler):[a-z0-9._:-]+$`。

`levy.pay` 由 GameCommandExecutor 使用 `StoryBalance.levyAmount` 编排：Inventory owner 在现金足够时追加 levy ledger/扣款，不足时保持 cash 并构造 `shortfall = levyAmount - availableCash`；Progression 以该 `LevyResolutionV1` 和各 read-port projection 调用 Ending rule、应用其 Fact/Quest/Outcome effects 并返回 terminal proposal；最后只有 Run owner 能把同一 levy resolution 与 `EndingResultV1` 物化为 `RunCompletionV1` 并写 `simulation.run.status/completion`。任一步失败全部回滚。终局 UI 与重载后查询读取 completion，不重新调用 Ending rule。

`PocRulesV1.endings.evaluate` 必须只读取 `PocSimulationDataV1.balance.endingPolicy` 的阈值/Reason binding
与闭合 ending/outcome definitions，不得在 provider closure 内保留第二份 `20/50/1/45` 或 ReasonId literal。
三个 terminal status 在 `content.endings` 中必须各有且只有一个 `EndingDefinitionV1`。规则先只依
`endingPolicy` 决定 status/reasonIds，再按该 status 选择 definition，原样复制 definition 的
`endingId`/`effects`，并按 `summaryOutcomeIds.relationship/investigation` 从 effects 应用后的 Outcome
投影构造 summary；不得依赖 definition 数组位置、EndingId 拼写或硬编码 OutcomeId。两个 summary OutcomeId
必须不同、存在于 `stateDefinitions.outcomes`，且三条 definition 的 relationship/investigation 映射分别完全
相同；definition effects 只能是引用合法的
`ProgressionEffectIntentV1`。因此 Hotfix/Story data 可以在不更改 rule provider 的前提下替换合法结局身份与
terminal progression effects，而 RunCompletion 仍保存本次已解析的精确结果。
`PocRulesV1` 不提供 `ending.forecast`/`endings.forecast`：义务 Forecast 是对最新 Gameplay State、同一 Tavern
preview calculator 与 `balance.obligationForecast/endingPolicy` 的只读 Query projection，唯一公开入口是
`PocGameQueriesV1.getObligationForecast()`。

`EndingResultV1.effects` 只能使用 `ProgressionEffectIntentV1` 的 Fact/Quest/Outcome 三种 kind；终局规则不得借通用 `EffectIntentV1` 改 AP、Actors、Aura、Inventory、Ledger、Tavern 或 Workflow。需要的税负现金变化已经由前置 Inventory owner proposal 完成。

### 8.1 PocGameQueriesV1

查询只返回领域投影和 stable ID；不返回 React、CSS、Layout、Story rule 或 Engine 内部对象。

```ts
interface CommandCostViewV1 {
  readonly ap: NonNegativeSafeInteger;
  readonly playerStamina: NonNegativeSafeInteger;
  readonly heroineStamina: NonNegativeSafeInteger;
  readonly cash: Money;
}

interface ActionViewV1 {
  readonly actionId: ActionId;
  readonly labelTextId: TextId;
  readonly available: boolean;
  readonly costs: CommandCostViewV1;
  readonly availablePhases: readonly CalendarPhase[];
  readonly occupiedPhases: readonly CalendarPhase[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly directCommand: PocGameCommandV1 | null;
  readonly rejectionCodes: readonly PocRejectionReasonV1["code"][];
}

interface AvailabilityExplanationV1 {
  readonly actionId: ActionId;
  readonly visible: boolean;
  readonly available: boolean;
  readonly reasons: readonly PocRejectionReasonV1[];
}

type PreviewDeltaTargetV1 =
  | { readonly kind: "cash" }
  | { readonly kind: "reputation" }
  | { readonly kind: "calendar.ap" }
  | { readonly kind: "actor.stamina"; readonly actorId: ActorId }
  | { readonly kind: "actor.mood"; readonly actorId: ActorId }
  | { readonly kind: "relationship.affection" }
  | { readonly kind: "relationship.teamwork" }
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "item"; readonly itemId: ItemId };

type PreviewChangeV1 =
  | {
      readonly kind: "numeric";
      readonly target: PreviewDeltaTargetV1;
      readonly delta: IntegerRangeV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "quest.set";
      readonly quest: QuestEntryV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    };

type CommandConfirmationV1<C extends PocGameCommandV1> =
  C extends Extract<
    PocGameCommandV1,
    {
      readonly kind:
        | "run.start"
        | "tavern.opening.start"
        | "tavern.opening.continue"
        | "tavern.opening.finalize"
        | "world.action.complete"
        | "narrative.advance";
    }
  >
    ? null
    : ConfirmationMetadataV1;

type CommandPreviewV1<C extends PocGameCommandV1 = PocGameCommandV1> =
  | {
      readonly allowed: true;
      readonly command: C;
      readonly costs: CommandCostViewV1;
      readonly changes: readonly PreviewChangeV1[];
      readonly unknownReasonIds: readonly ReasonId[];
      readonly confirmation: CommandConfirmationV1<C>;
    }
  | {
      readonly allowed: false;
      readonly command: C;
      readonly reasons: readonly PocRejectionReasonV1[];
    };

interface NarrativeChoiceProjectionV1 {
  readonly choiceId: ChoiceId;
  readonly textId: TextId;
  readonly enabled: boolean;
  readonly disabledReasonId?: ReasonId;
  readonly checkPreview?: CheckPreviewV1;
  readonly confirmation: ConfirmationMetadataV1;
}

interface NarrativeProjectionV1 {
  readonly status: NarrativeRuntimeStateV1["status"];
  readonly cursor: NarrativeCursorV1 | null;
  readonly stage: NarrativeStageStateV1;
  readonly speakerId: CharacterId | null;
  readonly textId: TextId | null;
  readonly choices: readonly NarrativeChoiceProjectionV1[];
  readonly latestResolvedCheck: ResolvedCheckV1 | null;
}

interface DemandForecastV1 {
  readonly day: DayIndex;
  readonly lines: readonly {
    readonly segmentId: CustomerSegmentId;
    readonly range: IntegerRangeV1;
    readonly modifiers: readonly AppliedModifierV1[];
  }[];
}

interface ObligationForecastBaseV1 {
  readonly currentCash: Money;
  readonly levyAmount: Money;
  readonly currentGap: Money;
  readonly reasonId: ReasonId;
  readonly recommendations: readonly {
    readonly textId: TextId;
    readonly actionId: ActionId | null;
  }[];
}

type ObligationForecastV1 =
  | (ObligationForecastBaseV1 & {
      readonly kind: "current_gap";
    })
  | (ObligationForecastBaseV1 & {
      readonly kind: "committed_plan_conservative";
      readonly projectedCashAfterOpening: IntegerRangeV1;
      readonly projectedCashAfterLevy: IntegerRangeV1;
    })
  | (ObligationForecastBaseV1 & {
      readonly kind: "final";
      readonly projectedCashAfterLevy: SafeInteger;
    });

interface RunStartControlProjectionV1 {
  readonly command: Extract<PocGameCommandV1, { readonly kind: "run.start" }>;
  readonly preview: Extract<
    CommandPreviewV1<Extract<PocGameCommandV1, { readonly kind: "run.start" }>>,
    { readonly allowed: true }
  >;
}

interface LifePolicyOptionProjectionV1 {
  readonly policyId: PolicyId;
  readonly nameTextId: TextId;
  readonly apByPhase: ApByPhaseV1;
  readonly playerNightRecovery: NonNegativeSafeInteger;
  readonly nightRecoveryReasonId: ReasonId;
  readonly command: Extract<PocGameCommandV1, { readonly kind: "policy.choose" }>;
  readonly preview: Extract<
    CommandPreviewV1<Extract<PocGameCommandV1, { readonly kind: "policy.choose" }>>,
    { readonly allowed: true }
  >;
}

interface LifePolicySelectionProjectionV1 {
  readonly options: readonly [LifePolicyOptionProjectionV1, ...LifePolicyOptionProjectionV1[]];
}

type TavernOpeningControlProjectionV1 =
  | {
      readonly kind: "start";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.start" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.start" }>
      >;
    }
  | {
      readonly kind: "continue";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.continue" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.continue" }>
      >;
    }
  | {
      readonly kind: "finalize";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.finalize" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.finalize" }>
      >;
    };

interface PocHudProjectionV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly cash: Money;
  readonly reputation: NonNegativeSafeInteger;
  readonly playerStamina: StaminaStateV1;
  readonly heroineStamina: StaminaStateV1;
  readonly heroineMood: MoodPoint;
  readonly relationship: RelationshipStateV1;
  readonly levyAmount: Money;
}

interface PocInventoryBatchProjectionV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
  readonly acquiredDay: DayIndex;
  readonly lastUsableDay: AbsoluteDayIndex;
  readonly refrigerationExtended: boolean;
}

interface PocInventoryProjectionV1 {
  readonly ingredientBatches: readonly PocInventoryBatchProjectionV1[];
  readonly itemStacks: readonly ItemStackV1[];
}

interface PocTavernProjectionV1 {
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly helper: HelperStateV1;
  readonly preparation: DailyPreparationStateV1;
  readonly servicePlan: TavernPlanV1 | null;
  readonly currentPlanPreview: TavernPreviewV1 | null;
  readonly serviceHistory: readonly ServiceHistoryEntryV1[];
}

interface PocFacilitiesProjectionV1 {
  readonly built: readonly FacilityStateV1[];
  readonly decisions: readonly FacilityDecisionRecordV1[];
}

interface PocLedgerProjectionV1 {
  readonly startingCash: Money;
  readonly currentCash: Money;
  readonly entries: readonly LedgerEntryV1[];
}

interface PocActionInputCatalogV1 {
  readonly purchase: {
    readonly lineLimit: PositiveSafeInteger;
    readonly quantityPerLineLimit: PositiveSafeInteger;
    readonly ingredients: readonly {
      readonly ingredientId: IngredientId;
      readonly nameTextId: TextId;
      readonly unitPrice: Money;
      readonly shelfLifeDays: PositiveSafeInteger;
      readonly refrigeratable: boolean;
    }[];
  };
  readonly tavernPlan: {
    readonly recipeLimit: PositiveSafeInteger;
    readonly portionsPerRecipeLimit: PositiveSafeInteger;
    readonly serviceModes: readonly {
      readonly mode: ServiceMode;
      readonly nameTextId: TextId;
      readonly apCost: NonNegativeSafeInteger;
      readonly playerStaminaCost: NonNegativeSafeInteger;
      readonly heroineStaminaCost: NonNegativeSafeInteger;
      readonly wage: Money;
      readonly baseReceptionCapacity: NonNegativeSafeInteger;
      readonly basePreparationPoints: NonNegativeSafeInteger;
      readonly preparationPointsPerAction: NonNegativeSafeInteger;
      readonly confirmation: ConfirmationMetadataV1;
    }[];
    readonly recipes: readonly {
      readonly recipeId: RecipeId;
      readonly nameTextId: TextId;
      readonly ingredients: readonly RecipeIngredientV1[];
      readonly salePrice: Money;
      readonly prepPoints: PositiveSafeInteger;
    }[];
  };
  readonly facility: {
    readonly options: readonly (
      | {
          readonly opportunityId: ActionId;
          readonly choice: { readonly kind: "build"; readonly facilityId: FacilityId };
          readonly labelTextId: TextId;
          readonly cashCost: Money;
          readonly confirmation: ConfirmationMetadataV1;
        }
      | {
          readonly opportunityId: ActionId;
          readonly choice: { readonly kind: "skip" };
          readonly labelTextId: TextId;
          readonly cashCost: Money;
          readonly confirmation: ConfirmationMetadataV1;
        }
    )[];
  };
  readonly worldAction: {
    readonly options: readonly {
      readonly actionId: ActionId;
      readonly optionId: ChoiceId;
      readonly labelTextId: TextId;
      readonly baseCashCost: Money;
      readonly additionalCashCost: Money;
      readonly playerStaminaCost: NonNegativeSafeInteger;
      readonly confirmation: ConfirmationMetadataV1;
    }[];
  };
}

type PocGameViewStatusV1 = "setup" | "active" | "terminal";

interface PocGameViewV1 {
  readonly status: PocGameViewStatusV1;
  readonly hud: PocHudProjectionV1;
  readonly actions: readonly ActionViewV1[];
  readonly runStartControl: RunStartControlProjectionV1 | null;
  readonly lifePolicySelection: LifePolicySelectionProjectionV1 | null;
  readonly tavernOpeningControl: TavernOpeningControlProjectionV1 | null;
  readonly demandForecast: DemandForecastV1 | null;
  readonly obligationForecast: ObligationForecastV1 | null;
  readonly inventory: PocInventoryProjectionV1;
  readonly tavern: PocTavernProjectionV1;
  readonly facilities: PocFacilitiesProjectionV1;
  readonly ledger: PocLedgerProjectionV1;
  readonly resolvedChecks: readonly ResolvedCheckV1[];
  readonly completion: RunCompletionV1 | null;
}

interface PocGameQueriesV1 {
  getAvailableActions(): readonly ActionViewV1[];
  getActionInputCatalog(): PocActionInputCatalogV1;
  explainAvailability(actionId: ActionId): AvailabilityExplanationV1;
  previewCommand<C extends PocGameCommandV1>(command: C): CommandPreviewV1<C>;
  previewTavernPlan(plan: TavernPlanV1): TavernPreviewV1;
  getGameViewStatus(): PocGameViewStatusV1;
  getHudProjection(): PocHudProjectionV1;
  getInventoryProjection(): PocInventoryProjectionV1;
  getTavernProjection(): PocTavernProjectionV1;
  getFacilitiesProjection(): PocFacilitiesProjectionV1;
  getLedgerProjection(): PocLedgerProjectionV1;
  getNarrativeProjection(): NarrativeProjectionV1 | null;
  getRunStartControl(): RunStartControlProjectionV1 | null;
  getLifePolicySelection(): LifePolicySelectionProjectionV1 | null;
  getTavernOpeningControl(): TavernOpeningControlProjectionV1 | null;
  getDemandForecast(): DemandForecastV1 | null;
  getObligationForecast(): ObligationForecastV1 | null;
  getResolvedChecks(): readonly ResolvedCheckV1[];
  getRunCompletion(): RunCompletionV1 | null;
}
```

`getActionInputCatalog()` 是 parameterized Semantic forms 的只读、Strict JSON、deep-frozen 输入目录，不是
Snapshot slice，也不进入 `PocGameViewV1`。`purchase.lineLimit` 与 `purchase.quantityPerLineLimit` 分别精确投影
`StoryBalanceV1.purchaseLineLimit` 与 `purchaseQuantityPerLineLimit`；`tavernPlan.recipeLimit` 为
`min(16, StoryBalanceV1.menuRecipeLimit)`，`tavernPlan.portionsPerRecipeLimit` 精确投影
`StoryBalanceV1.menuPortionsPerRecipeLimit`。当前 PoC 的两个单条数量上限均为 99；现金、接待容量、备菜能力和原料
仍由同一 Semantic preview 动态判定，UI 不得据此目录重算第二套 gameplay limit。

`PocGameViewV1.status` 只折叠生命周期：`getGameViewStatus()` 将 `RunState.status="setup"` 映射为
`setup`，`active` 映射为 `active`，三个 terminal RunStatus 都映射为 `terminal`；精确 terminal 结果只从
同一 view 的 `completion` 读取。GameView 的每个字段必须从上面同名 Query/getter 的同一次 immutable Queries
投影建立：`status` 等于 `getGameViewStatus()`，`actions` 等于
`getAvailableActions()`，五个 control/forecast、resolved checks 与 completion 分别复用对应 getter，五个新 DTO
分别复用 `get*Projection()`。projector 不接收 Snapshot，不读取 State path，也不重新实现 availability、preview、
forecast 或 ending 规则。

五个 DTO 是 player-visible、Strict JSON、deep-frozen projection，不是 Snapshot slice。Inventory batch 刻意移除
`source`；Tavern 刻意移除 `demandSeeds`、`currentDemand` 与未结算的 `actualCustomers`；Ledger 只投影已提交
entries。`PocTavernProjectionV1.currentPlanPreview` 在 `servicePlan=null` 时必须为 `null`，否则等于针对该 exact
plan 调用 `previewTavernPlan(servicePlan)` 的结果。已经提交到 `serviceHistory` 的 opening orders/sales 是历史结果，
可以保留；它们不能用来泄漏当前或未来 materialized demand。HUD 的 `cash` 必须等于 Ledger 的
`currentCash`，`levyAmount` 精确来自同一 `StoryBalanceV1.levyAmount`。

`getNarrativeProjection()` 在没有当前可呈现 Narrative 时返回 `null`；非 null 值只投影同一权威 Narrative
runtime state 的 cursor/stage/speaker/text/choices/check evidence。它由 Semantic port 的独立 `narrative` 通道发布，
不进入 `PocGameViewV1`，也不允许 GameView projector 调用后再复制一份。

`getRunStartControl()` 是 replay base 进入游戏的唯一 Player UI 投影：只在 Story 可见的 Catalog Bootstrap
初始 State（setup、policy null、D1 morning、idle Narrative、空 demand seeds、`currentDemand=null`、无 workflow、
无 completion）返回非 null，携带精确 `{kind:"run.start"}` 与同值、`allowed=true`、`confirmation=null` 的
preview；Base aggregate invariant 另行保证该 State 只存在于 sequence 0 replay base。GameQueries 不读取 sequence；
成功 Start 或任一非初始 State 都返回 null。`run.start` 仍有零个 Action presentation，React 不得自行拼装该系统命令。

`getLifePolicySelection()` 只在已完成 manifest Scene、run 仍为 setup 且 policy 为空时返回非 null；options 与 `StoryBalance.lifePolicies` 顺序一致且非空，每项 `policyId` 必须等于 `command.policyId`，`preview.command` 必须与该 command Canonical JSON 深值相等且 `preview.allowed=true`。这些相等关系由 projection Schema refinement 与 query tests 同时保证；UI 不能从 Balance 自行构造选项。

`getTavernOpeningControl()` 是零 Action-presentation workflow controls 的唯一 UI 投影。active Narrative 或任一 WorldActionSession 时返回 null；否则只在 evening 已有 non-closed plan 且 `activeWorkflow===null` 时返回 `start`，OpeningSession 未 ready 时返回 `continue`，ready 时返回 `finalize`，已 resolved/closed/非 evening 时返回 null。`kind` 必须与 command.kind 一一对应，`preview.command` 必须与该 branch command Canonical JSON 深值相等，preview 提供 allowed 或精确 typed reasons；Runtime/React 不得根据 workflow 字段猜命令。

对任意 `previewCommand<C>(command)`，返回值的 `preview.command` 都必须与输入 command Canonical JSON 深值相等；泛型保持其 discriminant/字段类型，query implementation 的同值断言与 contract tests 防止运行时把另一条同 kind 参数命令塞入 preview。包含 command 与 preview 两份值的 LifePolicy/Opening 等组合投影还要由自身 Schema refinement 保证相等。preview 不得规范化、补写或替换玩家将提交的命令。

`previewTavernPlan()` 先严格解析 plan 并验证 mode/recipe reference；结构或引用无效时抛出确定性 validation
error，而 `previewCommand({kind:"tavern.plan.set",...})` 对已成功 admission 的命令仍返回精确 typed rejection。
随后它复用 execute 的其余 plan guard（calculator 中忽略仅属于再次提交的 `tavern.plan_frozen`），再使用当前 AP/现金/双方
体力、库存、角色、设施/Aura、持久 `currentDemand` 与 preparationActionCount 建立
`basis="current_state"` 的窄 `TavernPreviewInputV1`，由同一个 calculator wrapper 合并 guard rejection 与
Rule resource result；StartOpening 使用同一 wrapper。它不暴露 Story rule，也不暴露菜谱销量范围以外的实际顾客数。
`openingCosts` 精确给出当晚提交时的 AP、双方体力、工资、杂费、受控 service-cost modifier、总现金与原料
短缺；closed plan 的这些值全为零且短缺为空。`previewCommand({kind:"tavern.plan.set", ...})`
只报告“现在提交计划”这条零成本命令及 confirmation，不能把未来营业成本伪装成已应用 delta。
ServicePlan UI 必须组合这两个强类型投影。

若当前存在 active OpeningSession，`previewTavernPlan()` 只能把 baseline 中已冻结的 exact plan 与该 session 一起
建立 `basis="active_opening_baseline"` 输入：需求、prepared ingredients、开始前资源、成本与 Modifier 都从
baseline/ledger 读取，`openingCosts.commitment="committed"`，短缺为空，`cashDelta` 只表示从当前 Snapshot 到
Finalize 的剩余 settlement，不得再次扣工资/杂费或用 post-Start 库存制造假短缺。无 active Opening 时 basis
为 current_state、commitment 为 prospective，cashDelta 覆盖未来 Start+Finalize。Obligation projection 必须按
同一 basis 取下界，不能在 Start 后重复扣成本或退回无关的 current-gap 分支。

`getDemandForecast()` 在 `run.start` 前或当前日不是 Story service day 时返回 `null`；否则只从已冻结的 `currentDemand` 投影 segment/range/modifiers，绝不暴露 `actualCustomers` 或持久 randomOffset。D1 的 range 可以 min=max；D2 起使用早晨已物化且不泄露实际偏移的范围。StartOpening 原样复制同一 currentDemand；查询不调用 Story rule、不消费 RNG、不写 Snapshot。

`getObligationForecast()` 在 `obligationForecast.visibleFrom` 之前或 run 已 terminal 时返回 `null`。开放后，若全部 `serviceDays` 尚未在持久 `serviceHistory` resolved：在 `conservativeFrom` 之前、当前营业计划尚未冻结，或 `previewTavernPlan` 对该计划返回 `allowed=false` 时，只返回 `current_gap`，`currentGap = max(0, levyAmount - currentCash)`；到达 `conservativeFrom` 且当晚可执行的非 closed 计划已冻结但尚未 Finalize 时，才由同一 Tavern preview 下界返回 `committed_plan_conservative`；planned/emergency closed 当晚已 resolved 后回到基于当前 cash 的 `current_gap`，不伪造营业收入范围。全部 serviceDays resolved 后由已提交 cash/ledger 返回 `final`，其 `projectedCashAfterLevy = currentCash - levyAmount`。`visibleFrom <= conservativeFrom <= levyDue` 按 day/phase 全序成立；UI 只投影该判别联合，不自行补算缺口、工资、杂费或未来收入。

Forecast 的 reasonId 固定来自 policy。Recommendations 也只来自 policy：当 `currentGap > 0`，或 conservative/final 的
税后下界/精确值小于 0 时，按 Story 声明顺序筛选 `appliesTo` 包含当前 kind 的条目；否则返回空数组。
textId 必须存在；actionId 可为 null，用于“选择廉价菜单”“停止过量采购”等不能安全等价为一次命令的建议。
非 null authored ActionId 只有在当前 ActionView 同时 visible 且 available 时才原样投影；否则该条仍显示文本但
投影 actionId=null，绝不替换成另一个动作。链接只用于打开对应强类型界面，不自动执行。UI 不得根据数值临时编造恢复建议。

## 9. BuildProvenance、Save、Debug 与 State Dump

### 9.1 构建身份

```ts
interface BuildProvenanceV1 {
  readonly story: {
    readonly id: StoryId;
    readonly revision: PositiveSafeInteger;
    readonly digest: Digest;
  };
  readonly engine: {
    readonly version: EngineVersion;
    readonly digest: Digest;
  };
  readonly resolved: {
    readonly stateContractRevision: PositiveSafeInteger;
    readonly stateContractDigest: Digest;
    readonly simulationDigest: Digest;
    readonly presentationDigest: Digest;
    readonly patchSet: PatchSetIdentityV1;
  };
}

interface SaveCompatibilityKeyV1 {
  readonly storyId: StoryId;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly engineDigest: Digest;
  readonly simulationDigest: Digest;
}
```

Story、Engine 与 ResolvedGame provenance 永远分开；不得合并为一个 app version/digest。普通 Save load 的阻断键为 `story.id + story.revision + resolved.stateContractRevision + resolved.stateContractDigest + engine.digest + resolved.simulationDigest`。`story.digest` 用于定位未打补丁的 Story 制品；`resolved.presentationDigest` 用于表现复现；`engine.version` 是 display-only；`appBuildId` 是 diagnostics-only。这四项差异都可以提示，但不单独阻止恢复 Snapshot。

`story.revision` 表示存档/状态合同代际，不是每次内容发布的版本号。只修改 TextCatalog、Asset Pack、data-only SceneGraph、Web renderer registry 或纯布局时必须保持 revision；这些变化由 story/presentation/application digests 区分。只有状态/稳定引用合同发生有意的粗粒度断代时才递增 revision。

`stateContractRevision` 是该 Story 代际内具体 Snapshot 与可持久 IR Schema 的正整数 revision，用于在解析前选择精确 decoder；`stateContractDigest` 则对 Story-owned `StateContractManifestV1` 做机器校验。首版不实现 migrator，因此两者都必须与当前 ResolvedGame 精确相等。任何 State/持久 IR Schema 语义变化都必须同时提升对应 schema descriptor revision 与外层 `stateContractRevision`；任何可持久稳定引用集合变化都必须更新 reference set 并提升外层 revision；不再接受旧存档时还要递增 `story.revision`。即使作者错误遗漏外层 revision，正确更新的内层 descriptor/reference set 仍会令 digest 漂移并阻止普通读档；Rule provider、公式、平衡数值、文本、素材和纯表现变化不得改变 manifest 或 `stateContractDigest`。

authoritative simulation replay 要求 `engine.digest + resolved.stateContractRevision/digest + resolved.simulationDigest` 精确匹配，并且 Story ID/revision 相同。精确视觉复现另外要求两侧都存在且精确匹配的 `appBuildId`，并要求 `presentationDigest` 匹配；两侧都缺少 `appBuildId` 不是精确视觉匹配。

普通继续游戏默认要求阻断键完全相等。唯一例外是当前 Loader 取得一份 `PatchSetAdoptionDeclarationV1`，其 Story、stateContractRevision/digest、from/to simulation digests 和 `simulationPatchSetDigest` 与当前 ResolvedGame/旧 Save 逐字段精确匹配，同时 engineDigest 相等且 Snapshot 重新通过 Schema/references/invariants。adoption 建立新 replay anchor，不能用新规则 authoritative replay 旧 CommandLog。

`engine.version` 从 Application-owned build metadata 注入，不进入 Engine/Story/simulation manifest。仅改变该标签必须保持 `engine.digest`、`story.digest`、`simulationDigest` 和 `presentationDigest` 不变；它可以改变 `appBuildId`。玩法 Modules/GameSimulation/GameCommandExecutor 进入 `simulationDigest`，不能再进入 `engine.digest`。

### 9.2 SaveRecord

```ts
type SaveSlotIdV1 = "auto.current" | "auto.previous" | "quick" | "manual";
type SaveWriteReasonV1 = "auto" | "quick" | "manual";

interface SaveSlotMetadataV1 {
  readonly storyId: StoryId;
  readonly slotId: SaveSlotIdV1;
  readonly writeReason: SaveWriteReasonV1;
  readonly capturedCommandSequence: NonNegativeSafeInteger;
}

interface SimulationAdoptionV1 {
  readonly fromSimulationDigest: Digest;
  readonly toSimulationDigest: Digest;
  readonly viaSimulationPatchSetDigest: Digest;
  readonly adoptedAtCommandSequence: NonNegativeSafeInteger;
}

interface SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage> {
  readonly formatRevision: 1;
  readonly recordRevision: PositiveSafeInteger;
  readonly provenance: TProvenance;
  readonly slot: TSlotMetadata;
  readonly savedAt: IsoUtcInstant;
  readonly stateDigest: Digest;
  readonly snapshot: TSnapshot;
  readonly simulationLineage: TSimulationLineage;
}

declare function createSaveRecordEnvelopeSchemaV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage,
>(
  snapshotSchema: RuntimeSchemaV1<TSnapshot>,
  provenanceSchema: RuntimeSchemaV1<TProvenance>,
  slotMetadataSchema: RuntimeSchemaV1<TSlotMetadata>,
  simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>,
): RuntimeSchemaV1<SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage>>;

type SaveRecordV1 = SaveRecordEnvelopeV1<
  PocGameSnapshotV1,
  BuildProvenanceV1,
  SaveSlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;
```

`simulationLineage` 保持 adoption 发生顺序：普通新局为 `[]`；exact load 原样保留存档已有 lineage；每次 adoption 追加一项。每项 `toSimulationDigest` 必须等于下一项 `fromSimulationDigest`，最后一项的 `toSimulationDigest` 必须等于当前 provenance 的 `simulationDigest`。首版最多保存 16 项；已有 16 项时第 17 次 adoption 固定拒绝为 `compatibility.lineage_limit`，保留原 Save 为 inspect/export-only。v1 不静默截断历史，也不设计“导出后自动遗忘”的收据协议；玩家可以继续使用旧规则、导出现场或开始新局。

Application Port 对任何权威操作在入队同一 tick 同步设置 busy；busy/fault-pause/HMR-invalidated 时不接受新的 Save capture。Quick/Manual 的 candidate 是调用被接受时的最后 committed Snapshot，不在异步 IDB transaction 开始时重新读取 Session。每次写入提交后必须从 IDB 重新读取并复验 strict envelope、state digest、recordRevision 与 lease/fencing；只有复验通过才返回保存成功。

### 9.3 CommandLog、故障与 DebugCommand

```ts
interface RngDrawTraceV1 {
  readonly ordinal: PositiveSafeInteger;
  readonly purpose: string;
  readonly exclusiveMax: PositiveSafeInteger;
  readonly result: NonNegativeSafeInteger;
  readonly before: RngStateV1;
  readonly after: RngStateV1;
}

type StoryRuleFaultCodeV1 =
  "rule.threw" | "rule.returned_thenable" | "rule.output_invalid" | "effect.invalid";

type CommandHandlerFaultCodeV1 =
  | "command.handler_threw"
  | "command.handler_not_implemented"
  | "narrative.step_limit_exceeded"
  | "narrative.call_depth_exceeded";

type EngineInvariantCodeV1 =
  | "snapshot.schema"
  | "rng.invalid"
  | "resource.negative"
  | "stamina.above_maximum"
  | "calendar.invalid"
  | "workflow.conflict"
  | "scheduler.multiple_blocking_events"
  | "narrative.blocking_conflict"
  | "opening.invalid_checkpoint"
  | "narrative.invalid_cursor"
  | "story.reference_missing"
  | "story.value_invalid"
  | "collection.duplicate_id"
  | "collection.unstable_order"
  | "ledger.unbalanced"
  | "terminal_state.invalid";

interface EngineFaultBaseV1 {
  readonly message: string;
  readonly stack?: string;
}

type PocEngineFaultV1 =
  | (EngineFaultBaseV1 & {
      readonly category: "story_rule";
      readonly code: StoryRuleFaultCodeV1;
      readonly ruleSlot: StoryRuleSlotV1;
    })
  | (EngineFaultBaseV1 & {
      readonly category: "engine_invariant";
      readonly code: EngineInvariantCodeV1;
      readonly ruleSlot: null;
    })
  | (EngineFaultBaseV1 & {
      readonly category: "command_handler";
      readonly code: CommandHandlerFaultCodeV1;
      readonly ruleSlot: null;
    });

type CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault> =
  | {
      readonly kind: "committed";
      readonly snapshot: TSnapshot;
      readonly facts: readonly TFact[];
    }
  | {
      readonly kind: "rejected";
      readonly snapshot: TSnapshot;
      readonly reasons: readonly TRejection[];
    }
  | {
      readonly kind: "faulted";
      readonly snapshot: TSnapshot;
      readonly fault: TFault;
    };

type CommandExecutionResultV1 = CommandExecutionResultEnvelopeV1<
  PocGameSnapshotV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocEngineFaultV1
>;

interface CommandExecutionDiagnosticsEnvelopeV1<TRngState, TRngDrawTrace> {
  readonly committedRngBefore: TRngState;
  readonly attemptedDraws: readonly TRngDrawTrace[];
  readonly candidateRngAfter?: TRngState;
  readonly committedRngAfter: TRngState;
}

interface CommandExecutionAttemptEnvelopeV1<
  TSnapshot,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> {
  readonly result: CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault>;
  readonly diagnostics: CommandExecutionDiagnosticsEnvelopeV1<TRngState, TRngDrawTrace>;
}

type CommandExecutionDiagnosticsV1 = CommandExecutionDiagnosticsEnvelopeV1<
  RngStateV1,
  RngDrawTraceV1
>;

type CommandExecutionAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  PocGameSnapshotV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocEngineFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

// rejected/faulted.snapshot 必须是 dispatch 输入的同一已提交对象引用；两者不产生 GameplayFact，
// 不推进已提交 RNG、commandSequence 或任何 Snapshot 内 Narrative/Workflow/Story 状态。
// GameCommandExecutor 的唯一公开执行入口 executeAttempt 返回 result + diagnostics；GameSession 对 Semantic/application
// 只投影 result，并消费同一次 attempt 的 diagnostics 构造 CommandLog，不能为了补日志重新执行命令或 RNG。

type ReplayableDebugCommandV1 =
  | {
      readonly kind: "debug.calendar.set_ap";
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_stamina";
      readonly actorId: ActorId;
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_mood";
      readonly actorId: ActorId;
      readonly value: MoodPoint;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.relationship.set";
      readonly affection: SafeInteger;
      readonly teamwork: NonNegativeSafeInteger;
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.inventory.adjust_cash";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly duration: AuraDurationV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.clear";
      readonly instanceId: AuraInstanceId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.story.fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.narrative.jump";
      readonly cursor: NarrativeCursorV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.rng.set";
      readonly rng: RngStateV1;
      readonly reasonId: ReasonId;
    };

type AnchoringDebugCommandV1 = {
  readonly kind: "debug.fixture.load";
  readonly fixtureId: FixtureId;
  readonly seed: NonZeroUint32;
};

type DebugCommandV1 = ReplayableDebugCommandV1 | AnchoringDebugCommandV1;

type DebugReferenceV1 =
  | { readonly kind: "fixture"; readonly fixtureId: FixtureId }
  | { readonly kind: "reason"; readonly reasonId: ReasonId }
  | { readonly kind: "actor"; readonly actorId: ActorId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "aura_instance"; readonly instanceId: AuraInstanceId }
  | { readonly kind: "fact"; readonly factId: FactId }
  | {
      readonly kind: "narrative_node";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
    };

type DebugCommandValidationErrorV1 =
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: ReplayableDebugCommandV1["kind"];
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "reason" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.actor.set_stamina" | "debug.actor.set_mood";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "actor" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.aura.apply";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "aura" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.aura.clear";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "aura_instance" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.story.fact.set";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "fact" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.narrative.jump";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "narrative_node" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.fixture.load";
      readonly reference: Extract<DebugReferenceV1, { readonly kind: "fixture" }>;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.actor.set_stamina";
      readonly field: "stamina";
      readonly actual: SafeInteger;
      readonly minimum: 0;
      readonly maximum: NonNegativeSafeInteger;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.inventory.adjust_cash";
      readonly field: "cash_delta_result";
      readonly actual: string;
      readonly minimum: 0;
      readonly maximum: SafeInteger;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.aura.apply";
      readonly field: "aura_duration";
      readonly actual: SafeInteger;
      readonly minimum: 1;
      readonly maximum: PositiveSafeInteger;
    }
  | {
      readonly code: "debug.story_value_invalid";
      readonly commandKind: "debug.story.fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
    }
  | {
      readonly code: "debug.aura_target_not_allowed";
      readonly commandKind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
    }
  | {
      readonly code: "debug.aura_duration_policy_mismatch";
      readonly commandKind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly requested: AuraDurationV1;
      readonly expected: AuraDurationPolicyV1;
    }
  | {
      readonly code: "debug.state_conflict";
      readonly commandKind: "debug.aura.apply";
      readonly conflict: "aura_already_present";
    }
  | {
      readonly code: "debug.state_conflict";
      readonly commandKind: "debug.narrative.jump";
      readonly conflict: "narrative_inactive";
    };

type DebugCommandValidationErrorForV1<C extends DebugCommandV1> = C extends DebugCommandV1
  ? DebugCommandValidationErrorV1 extends infer E
    ? E extends {
        readonly commandKind: infer K extends DebugCommandV1["kind"];
      }
      ? C extends { readonly kind: K }
        ? Omit<E, "commandKind"> & { readonly commandKind: C["kind"] }
        : never
      : never
    : never
  : never;

type ReplayableDebugExecutionResultV1 =
  | {
      readonly kind: "committed";
      readonly snapshot: PocGameSnapshotV1;
      readonly facts: readonly PocGameplayFactV1[];
    }
  | {
      readonly kind: "faulted";
      readonly snapshot: PocGameSnapshotV1;
      readonly fault: PocEngineFaultV1;
    };

interface ReplayableDebugExecutionAttemptV1 {
  readonly result: ReplayableDebugExecutionResultV1;
  readonly diagnostics: CommandExecutionDiagnosticsV1;
}

type DebugCommandOperationResultForV1<C extends DebugCommandV1> =
  | {
      readonly kind: "validation_failed";
      readonly error: DebugCommandValidationErrorForV1<C>;
    }
  | (C extends ReplayableDebugCommandV1
      ? | {
            readonly kind: "committed";
            readonly commandSequence: PositiveSafeInteger;
          }
        | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 }
      : C extends AnchoringDebugCommandV1
        ? | {
              readonly kind: "anchor_established";
              readonly commandSequence: NonNegativeSafeInteger;
            }
          | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 }
        : never);

type DebugCommandOperationResultV1 = DebugCommandOperationResultForV1<DebugCommandV1>;

// 具体条件类型由 game/stories/poc 公开；中性 Base control 只透传调用方提供的 TCommand/TResult。

type LoggedCommandV1 =
  | { readonly source: "game"; readonly command: PocGameCommandV1 }
  | { readonly source: "debug"; readonly command: ReplayableDebugCommandV1 };

type GameCommandLogOutcomeV1 =
  | { readonly kind: "committed"; readonly facts: readonly PocGameplayFactV1[] }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly PocRejectionReasonV1[];
    }
  | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 };

type DebugCommandLogOutcomeV1 =
  | { readonly kind: "committed"; readonly facts: readonly PocGameplayFactV1[] }
  | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 };

interface CommandLogEntryBaseV1 {
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly committedRngBefore: RngStateV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly committedRngAfter: RngStateV1;
}

type CommandLogEntryEnvelopeV1<TLoggedCommand, TOutcome> = CommandLogEntryBaseV1 &
  TLoggedCommand & {
    readonly outcome: TOutcome;
  };

type CommandLogEntryV1 =
  | CommandLogEntryEnvelopeV1<
      Extract<LoggedCommandV1, { readonly source: "game" }>,
      GameCommandLogOutcomeV1
    >
  | CommandLogEntryEnvelopeV1<
      Extract<LoggedCommandV1, { readonly source: "debug" }>,
      DebugCommandLogOutcomeV1
    >;

type DebugFailureCommandV1 =
  | LoggedCommandV1
  | {
      readonly source: "debug_anchor";
      readonly command: AnchoringDebugCommandV1;
    };

interface DebugFailureV1 {
  readonly command: DebugFailureCommandV1;
  readonly fault: PocEngineFaultV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly candidateSnapshot?: PocGameSnapshotV1;
}

type PersistenceFaultCodeV1 =
  | "persistence.unavailable"
  | "persistence.quota_exceeded"
  | "persistence.transaction_failed"
  | "persistence.blocked_upgrade"
  | "persistence.connection_closed"
  | "persistence.stale_writer";

type AssetLoadFaultCodeV1 =
  "asset.fetch_failed" | "asset.decode_failed" | "asset.integrity_mismatch";

type UiFaultCodeV1 = "ui.render_failed" | "ui.event_handler_failed";

type RuntimeFaultCodeV1 =
  "runtime.async_operation_failed" | "runtime.dispatch_failed" | "runtime.hmr_invalidated";

interface RuntimeFaultBaseV1 {
  readonly occurredAt: IsoUtcInstant;
  readonly operation: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: { readonly name: string; readonly message: string };
}

type RuntimeOperationFaultV1 =
  | (RuntimeFaultBaseV1 & {
      readonly category: "persistence";
      readonly code: PersistenceFaultCodeV1;
    })
  | (RuntimeFaultBaseV1 & {
      readonly category: "asset_load";
      readonly code: AssetLoadFaultCodeV1;
    })
  | (RuntimeFaultBaseV1 & {
      readonly category: "ui";
      readonly code: UiFaultCodeV1;
    })
  | (RuntimeFaultBaseV1 & {
      readonly category: "runtime";
      readonly code: RuntimeFaultCodeV1;
    });

interface SystemDialogSessionStateV1 {
  readonly settingsOpen: boolean;
}

interface SystemDialogSessionStoreV1 {
  getSnapshot(): DeepReadonly<SystemDialogSessionStateV1>;
  subscribe(listener: () => void): () => void;
  openSettings(): void;
  closeSettings(): void;
}

declare function createSystemDialogSessionStoreV1(): SystemDialogSessionStoreV1;

const debugPresentationLimitsV1 = Object.freeze({
  stableIdUtf8Bytes: 256,
  renderers: 16,
  appearanceLayersPerRenderer: 16,
  visibleInteractionSurfaces: 32,
  detailOverlayStack: 8,
} as const);

interface DebugPresentationRendererSummaryV1 {
  readonly rendererId: string;
  readonly characterId: CharacterId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly appearanceLayerIds: readonly AppearanceLayerId[];
}

interface DebugPresentationSummaryV1 {
  readonly presentationRevision: NonNegativeSafeInteger;
  readonly stageSceneId: StageSceneId | null;
  readonly variantId: StageSceneVariantId | null;
  readonly stageRendererId: string | null;
  readonly renderers: readonly DebugPresentationRendererSummaryV1[];
  readonly visibleInteractionSurfaceIds: readonly InteractionSurfaceId[];
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
  readonly contentPolicyRevision: PositiveSafeInteger;
  readonly allowedContentFlags: ContentMaturityFlagsV1;
}

interface DebugUiSessionSummaryV1 {
  readonly routeId: string | null;
  readonly primaryOverlayId: string | null;
  readonly detailOverlayIds: readonly string[];
  readonly narrativeOpen: boolean;
  readonly systemDialogOpen: boolean;
  readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
}

/** Application-local projector input; the extra field is copied only into presentation. */
interface DebugUiSessionProjectionInputV1 extends DebugUiSessionSummaryV1 {
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
}

interface DebugUiContextV1 {
  readonly revision: 1;
  readonly presentation: DebugPresentationSummaryV1 | null;
  readonly session: DebugUiSessionSummaryV1;
}

interface DebugUiContextRecordedIdentityV1 {
  readonly provenance: BuildProvenanceV1;
  readonly appBuildId?: Digest;
}

interface DebugUiContextCurrentIdentityV1 {
  readonly provenance: BuildProvenanceV1;
  readonly appBuildId: Digest;
}

type DebugUiContextUseMismatchReasonV1 =
  "story_identity_mismatch" | "presentation_identity_mismatch" | "application_identity_mismatch";

type DebugUiContextUseClassificationV1 =
  | { readonly kind: "restorable" }
  | {
      readonly kind: "diagnostic_only";
      readonly reasons: readonly DebugUiContextUseMismatchReasonV1[];
    };

declare function createDebugUiContextSchemaV1(): RuntimeSchemaV1<DebugUiContextV1>;
declare function classifyDebugUiContextUseV1(
  recorded: DeepReadonly<DebugUiContextRecordedIdentityV1>,
  current: DeepReadonly<DebugUiContextCurrentIdentityV1>,
): DebugUiContextUseClassificationV1;

interface DiagnosticSummaryV1 {
  readonly invariantCodes: readonly EngineInvariantCodeV1[];
  readonly recentErrorCodes: readonly (
    | StoryRuleFaultCodeV1
    | EngineInvariantCodeV1
    | CommandHandlerFaultCodeV1
    | PersistenceFaultCodeV1
    | AssetLoadFaultCodeV1
    | UiFaultCodeV1
    | RuntimeFaultCodeV1
  )[];
  readonly hmrInvalidated: boolean;
}

interface DebugBundleEnvelopeV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
> {
  readonly formatRevision: 1;
  readonly provenance: TProvenance;
  readonly appBuildId?: Digest;
  readonly capabilities: TCapabilities;
  readonly simulationLineage: TSimulationLineage;
  readonly generatedAt: IsoUtcInstant;
  readonly replayBase: TSnapshot;
  readonly replayBaseStateDigest: Digest;
  readonly commandLog: readonly TCommandLogEntry[];
  readonly currentSnapshot: TSnapshot;
  readonly currentStateDigest: Digest;
  readonly diagnostics: TDiagnostics;
  readonly runtimeFailures: readonly TRuntimeFailure[];
  readonly failure?: TFailure;
  readonly uiContext?: TUiContext;
}

type DebugBundleV1 = DebugBundleEnvelopeV1<
  BuildProvenanceV1,
  RuntimeCapabilitiesV1,
  readonly SimulationAdoptionV1[],
  PocGameSnapshotV1,
  CommandLogEntryV1,
  DiagnosticSummaryV1,
  RuntimeOperationFaultV1,
  DebugFailureV1,
  DebugUiContextV1
>;
```

`debug.inventory.adjust_cash` 的 validator 必须先把当前 `Money` 与命令 delta 转为 `bigint` 再精确相加；
若结果不在 `0..Number.MAX_SAFE_INTEGER`，`cash_delta_result.actual` 是该 bigint 的 canonical signed base-10
字符串：`0` 恰为 `"0"`，非零值无前导零或 `+`，负值只含一个前导 `-`。该字符串只属于 validation error，
不进入 Gameplay State、Money、Ledger 或 Save ABI；`minimum`/`maximum` 仍是当前 number 边界。

State Dump 使用完整 `DebugBundleV1`，不另建弱类型 envelope。`simulationLineage` 遵守 SaveRecord 的同一链式不变量；adoption 之前的旧 CommandLog 只能作为另行导出的历史证据，当前 bundle 的 `replayBase → commandLog → currentSnapshot` 必须全部属于 provenance 中同一个 resolved simulation digest。

`SystemDialogSessionStoreV1` 是每个 Story Application 独享的瞬态 UI session source；冻结初态为 `{ settingsOpen:false }`，`openSettings`/`closeSettings` 幂等且只在真实转换时通知。`SystemDialogHostV1` 接受 optional store，并在缺省时创建稳定的 component-local fallback，以保持 additive public compatibility；两个 production Story root 必须显式传入各自 runtime-owned store，让 Host 和 diagnostics 读取同一 source。Host 仍在组件内持有 opener/focus 引用并在 unmount 时关闭 active store；该状态不持久化、不进入 RuntimePresentationPublication，也不允许用 DOM 查询或第二份 callback mirror 替代。

`DebugUiContextV1` 是 Phase 5 的中立、版本化替代合同；旧的 PoC-specific route/overlay 草案从未被生产 Story codec 接受，因此本次替换没有已接纳 bytes 或迁移器。Schema 对字段、数组、diagnostic ID byte ceiling、重复 character/surface/appearance 和 uint32 flags 做严格结构校验，但不会用当前 Story policy 拒绝旧 bundle 中仍然有界的 policy revision/mask。256-byte diagnostics ceiling 必须先于字段 parser 检查，以便超限 bytes 得到稳定 diagnostics code；使用 Base brand 的字段仍必须满足 §2 的 canonical 3..96-byte stable-ID parser，只有 route/overlay/renderer 等 neutral diagnostic string 可以使用更宽 ceiling，禁止把 97..256-byte string 强制断言成 branded ID。`DebugUiSessionProjectionInputV1.activeInteractionSurfaceId` 来自现有 Interaction session，不从可见 surface 列表推断，也不重复写入导出的 session。`systemDialogOpen` 精确复制同一 Application-owned `SystemDialogSessionStoreV1.settingsOpen`；PoC `narrativeOpen` 仅在当前 publication 的 narrative 非空且 status 为 `active` 时为 true，E2E 则仅在 flow status 为 `choosing | blocked` 时为 true。每个 Story 的 renderer 与 diagnostics 必须调用同一个 Node-type-strip-safe pure predicate，不能分别重写判断或读取 E2E 永远为 null 的 neutral narrative slot。缺少 recorded `appBuildId` 必须得到 `application_identity_mismatch`；只有 Story ID/revision、`presentationDigest` 和 present `appBuildId` 全部精确匹配时才允许静态表现恢复。

所有会改变 Session 权威 Snapshot 的 GameCommand、Save load/import、lifecycle create/restart、replayable DebugCommand 与 `debug.fixture.load` 共用 GameSession 的一条 FIFO mutation tail；入队即同步标记 busy，公开 Port 不暴露绕过队列的 setter。DebugCommand 可在入口做 strict Schema 校验，但引用、Aura policy 与当前状态冲突等语义预校验必须等操作到达队首后针对最新 committed Snapshot 执行；`validation_failed` 不打开候选事务、不消费 RNG/sequence、不进入 CommandLog。被接受的 replayable DebugCommand 由 Story/GameSimulation-owned debug executor 通过同一 owner capabilities 执行，只可能 committed 或 faulted；两种结果都在同一队列项内把同一次 finalized attempt 追加为对应 Debug-source CommandLog entry，committed 更新 Snapshot，faulted 保持旧 Snapshot并另外暂停 Session、生成 failure bundle，不存在 Debug 版 `PocRejectionReasonV1`。`debug.fixture.load` 只从 capability-gated active-Story tooling resolver 解析；未知/外部 fixtureId 是 `debug.unknown_reference`，不引入不存在的跨 Story fixture-mismatch 状态。合法 fixture 经完整验证后在同一队列项内原子替换 current Snapshot 与 replay base并清空旧 CommandLog；普通 load/import、adoption 与 lifecycle create/restart 也必须在各自队列项内完成相同 anchor replacement。失败返回 validation/fault result并完整保留旧会话，绝不作为普通 log entry。tail 的内部异常被归一化后必须 settled，不能永久 rejected 而阻断允许的恢复操作。泛型 `DebugCommandOperationResultForV1<C>` 保证 replayable command 只能返回 committed/faulted，anchoring command 只能返回 anchor_established/faulted；两者都可在 admission 前返回 validation_failed，且 `error.commandKind` 必须精确等于该调用 command 的 kind。

`failure` 记录一条 Game/replayable-Debug/anchoring-Debug 尝试的 `PocEngineFaultV1` 与候选证据；Persistence/Asset/UI/async/HMR 故障写入最多 50 条、按发生顺序保存的 `runtimeFailures`，不伪装成 GameCommand。`operation`/`cause`/`message`/`stack` 都是有上限的诊断文本，导出前移除绝对路径；`message`/`stack` 各最多 64 KiB，不参加 authoritative replay 比较。

## 10. Strict JSON 与 Canonical JSON 公共合同

```ts
interface StrictJsonLimitsV1 {
  readonly maxBytes: PositiveSafeInteger;
  readonly maxDepth: PositiveSafeInteger;
  readonly maxArrayItems: PositiveSafeInteger;
  readonly maxObjectMembers: PositiveSafeInteger;
  readonly maxNodes: PositiveSafeInteger;
  readonly maxStringBytes: PositiveSafeInteger;
}

interface StrictJsonLimitsInputV1 {
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly maxArrayItems: number;
  readonly maxObjectMembers: number;
  readonly maxNodes: number;
  readonly maxStringBytes: number;
}

declare function parseStrictJsonLimitsV1(input: StrictJsonLimitsInputV1): StrictJsonLimitsV1;

const saveJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 10_000,
  maxObjectMembers: 10_000,
  maxNodes: 100_000,
  maxStringBytes: 262_144,
});

const debugBundleJsonLimitsV1 = parseStrictJsonLimitsV1({
  ...saveJsonLimitsV1,
  maxBytes: 20_971_520,
});

type StrictJsonErrorCodeV1 =
  | "encoding.invalid_utf8"
  | "encoding.bom_forbidden"
  | "syntax.invalid"
  | "syntax.comment_forbidden"
  | "syntax.trailing_comma_forbidden"
  | "object.duplicate_key"
  | "object.dangerous_key"
  | "limit.bytes"
  | "limit.depth"
  | "limit.array_items"
  | "limit.object_members"
  | "limit.nodes"
  | "limit.string_bytes"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero"
  | "string.lone_surrogate";

interface StrictJsonErrorV1 {
  readonly code: StrictJsonErrorCodeV1;
  readonly offset?: NonNegativeSafeInteger;
  readonly path?: string; // RFC 6901 JSON Pointer, max 4 KiB
}

type StrictJsonResultV1 =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: StrictJsonErrorV1 };

declare function parseStrictJson(
  bytes: Uint8Array,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): StrictJsonResultV1;

type CanonicalJsonErrorCodeV1 =
  | "value.undefined"
  | "value.sparse_array"
  | "value.cycle"
  | "value.custom_prototype"
  | "value.function"
  | "value.getter"
  | "number.non_finite"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero"
  | "string.lone_surrogate";

interface CanonicalJsonErrorV1 extends Error {
  readonly name: "CanonicalJsonError";
  readonly code: CanonicalJsonErrorCodeV1;
  readonly path: string;
}

declare function canonicalJsonBytes(value: unknown): Uint8Array; // throws only CanonicalJsonErrorV1
type DigestDomainV1 =
  | "sillymaker:story:v1"
  | "sillymaker:engine:v1"
  | "sillymaker:state-contract:v1"
  | "sillymaker:simulation:v1"
  | "sillymaker:presentation:v1"
  | "sillymaker:asset-pack:v1"
  | "sillymaker:hotfix:v1"
  | "sillymaker:patch-provider:v1"
  | "sillymaker:patch-set:v1"
  | "sillymaker:application:v1"
  | "sillymaker:state:v1";
declare function digestCanonical(domain: DigestDomainV1, value: unknown): Digest;
declare function digestBytes(bytes: Uint8Array): Digest;
```

`parseStrictJson` 只完成字节、语法、结构和项目整数限制；成功后的 `unknown` 必须继续走 SaveRecord/DebugBundle 的 strict Schema。Strict parser 不接受 JavaScript 对象，因此 prototype/getter/cycle 检查属于 `canonicalJsonBytes`。

`digestCanonical(domain, value)` 的跨端字节 framing 固定为 `UTF-8(domain) + 0x00 + canonicalJsonBytes(value)`，对该完整字节序列计算 SHA-256，并编码为 `sha256:` 加 64 个小写十六进制字符。Domain 必须是上述 ASCII closed union，分隔字节恰为单个 NUL；不得加入长度前缀、BOM、换行、平台字符串编码或隐式 JSON 文本转换。Base 的 reference vectors 与未来 C# 端口必须复用同一 framing。

`digestBytes(bytes)` 是文件/传输完整性摘要：直接对参数的精确 bytes 计算 SHA-256，并使用相同 `sha256:` 小写十六进制编码，不添加 domain、NUL 或 Canonical JSON framing。它只用于已经有独立 versioned envelope/manifest 语义的原始文件字节，不能替代 `digestCanonical` 计算 Engine/Story/State 等语义身份。`ExportedSaveV1.digest` 与 `ExportedDebugBundleV1.digest` 必须分别等于其 `bytes` 的 `digestBytes`；artifact file hash 同理。

导入管线的稳定阶段错误码为：

```ts
type ImportValidationErrorCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "identity.story_id_mismatch"
  | "identity.story_revision_mismatch"
  | "identity.state_contract_revision_mismatch"
  | "identity.state_contract_digest_mismatch"
  | "identity.engine_digest_mismatch"
  | "identity.simulation_digest_mismatch"
  | "reference.unknown_id"
  | "invariant.failed";

type SaveCompatibilityMismatchV1 =
  | {
      readonly field: "story_id";
      readonly code: "identity.story_id_mismatch";
      readonly stored: StoryId;
      readonly current: StoryId;
    }
  | {
      readonly field: "story_revision";
      readonly code: "identity.story_revision_mismatch";
      readonly stored: PositiveSafeInteger;
      readonly current: PositiveSafeInteger;
    }
  | {
      readonly field: "state_contract_revision";
      readonly code: "identity.state_contract_revision_mismatch";
      readonly stored: PositiveSafeInteger;
      readonly current: PositiveSafeInteger;
    }
  | {
      readonly field: "state_contract_digest";
      readonly code: "identity.state_contract_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "engine_digest";
      readonly code: "identity.engine_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "simulation_digest";
      readonly code: "identity.simulation_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    };

type ImportCompatibilityWarningV1 =
  | {
      readonly field: "story_digest";
      readonly code: "identity.story_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "presentation_digest";
      readonly code: "identity.presentation_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "hotfix_set";
      readonly code: "identity.hotfix_set_mismatch";
      readonly stored: PatchSetIdentityV1;
      readonly current: PatchSetIdentityV1;
    };

type ImportRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "compatibility.lineage_limit"
  | "reference.unknown_id"
  | "invariant.failed";

type ImportCompatibilityOutcomeV1 =
  | {
      readonly kind: "exact";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
    }
  | {
      readonly kind: "adopted";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
      readonly adoption: SimulationAdoptionV1;
    }
  | {
      readonly kind: "inspect_only";
      readonly mismatches: readonly [SaveCompatibilityMismatchV1, ...SaveCompatibilityMismatchV1[]];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
    }
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 };
```

Task 3 的公开 codec/compatibility ABI 冻结为：

```ts
type SaveRecordDecodeRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch";

type SaveRecordDecodeResultV1<TSaveRecord> =
  | { readonly kind: "decoded"; readonly record: DeepReadonly<TSaveRecord> }
  | { readonly kind: "rejected"; readonly code: SaveRecordDecodeRejectionCodeV1 };

interface SaveCodecContextV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly recordSchema: RuntimeSchemaV1<TSaveRecord>;
  validateEnvelope(record: DeepReadonly<TSaveRecord>): void;
}

interface SaveCompatibilityClassificationInputV1 {
  readonly stored: DeepReadonly<BuildProvenanceV1>;
  readonly current: DeepReadonly<BuildProvenanceV1>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly adoptionDeclaration: DeepReadonly<PatchSetAdoptionDeclarationV1> | null;
  readonly candidateCommandSequence: NonNegativeSafeInteger;
}

type SaveCompatibilityClassificationV1 =
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" }>
  | {
      readonly kind: "adoption_candidate";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
      readonly adoption: SimulationAdoptionV1;
    }
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>;

type SaveImportValidationResultV1<TSaveRecord> =
  | (Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" | "adopted" }> & {
      readonly candidate: DeepReadonly<TSaveRecord>;
    })
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>;

interface SaveImportInvariantViewV1<TState> {
  readonly state: TState;
  readonly commandSequence: NonNegativeSafeInteger;
}

interface SaveImportValidationContextV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): SaveCompatibilityClassificationV1;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(view: DeepReadonly<SaveImportInvariantViewV1<TState>>): readonly string[];
}

declare function encodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  record: DeepReadonly<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): Uint8Array;

declare function decodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): SaveRecordDecodeResultV1<TSaveRecord>;

declare function classifySaveCompatibilityV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): SaveCompatibilityClassificationV1;

declare function validateSaveImportCandidateV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
): SaveImportValidationResultV1<TSaveRecord>;
```

`SaveCodecContextV1.recordSchema` 是完整 Save envelope Schema；`validateEnvelope` 只校验 Base-owned 跨字段关系：`slot.storyId === provenance.story.id`、`slot.capturedCommandSequence === snapshot.commandSequence`、lineage 最多 16 项、相邻 `to → from` 连续且非空 lineage 的尾项等于存档 provenance simulation digest。它不能执行 Story stable-reference 或 gameplay invariant 校验。两者任一失败在 decode 中都是 `envelope.schema_invalid`；encode 对非法 typed candidate 抛出 programmer error，不产生 bytes。

`createSaveRecordEnvelopeSchemaV1` 必须以内部机器可判别的 failure 区分两个外层字段错误，codec 不读取异常文本：存在且为正 safe integer、但不等于 `1` 的 `formatRevision` 返回 `envelope.unsupported_revision`；缺失、类型错误、非正或非 safe integer 仍为 `envelope.schema_invalid`。只有顶层 `stateDigest` 的格式错误返回 `digest.invalid_format`；provenance、PatchSet、lineage 或 Snapshot 内其他 Digest 非法仍属于 `envelope.schema_invalid`。完整 Schema 和跨字段验证成功后，codec 固定比较 `digestCanonical("sillymaker:state:v1", record.snapshot)`。

`inspect_only.mismatches` 非空、field 唯一，并严格按 `story_id → story_revision → state_contract_revision → state_contract_digest → engine_digest → simulation_digest` 排序；一次导入可同时报告多项。`warnings` 按 `story_digest → presentation_digest → hotfix_set` 排序，field 唯一。

`hotfix_set` 对完整 `PatchSetIdentityV1` 的 Canonical JSON 做精确比较，不只信任其中一个字段。`engine.version` 与 `appBuildId` 不进入 mismatch 或 warning；前者仅 display-only，后者不在 Save provenance 中。compatibility callback 抛出的异常、reference/invariant callback 抛出的异常和 malformed callback result 都继续抛给上层 runtime-fault 归一化，不能伪装为普通 rejection。

只有 `simulation_digest` 不同、其他阻断字段全部相同，且一份 `PatchSetAdoptionDeclarationV1` 与旧/新摘要、state contract revision/digest 和当前 simulation PatchSet 精确匹配时，classifier 才返回 `adoption_candidate`；其 `candidateCommandSequence` 必须来自候选 Snapshot。validator 随后只把 references/invariants 均通过的该候选提升为公开 `adopted`。Base 只把 Gameplay State 交给 reference validator，并为 invariant validator 新建、深只读的 exact `{ state, commandSequence }` view；它不传入 RNG、RunIntegrity、provenance 或完整 Snapshot。该 sequence 只用于验证 `completedAtSequence`、`resolvedAtSequence` 等 State 内引用，不能扩大 ordinary Story Query。adoption 在 GameSession 队首原子建立新 replay anchor、追加 lineage 并清空旧 CommandLog；它不是 authoritative replay。若旧 lineage 已有 16 项则返回 `rejected/compatibility.lineage_limit`。只有最终 `exact/adopted` 结果携带 runnable `candidate`；inspect-only 原文件保持可导出但不能建立 runnable GameSession。

## 11. 必须由 Schema + invariants 同时保证的条件

1. `PocGameSnapshotV1` 是唯一权威容器；Narrative 只在 `state.story.narrative`，workflow 只在 `state.simulation.activeWorkflow`，设施建设/机会决策只在 `state.simulation.facilities`，Tavern 不复制这些状态。
2. RNG cursor 是合法 `Uint32`，新局 `initialSeed` 非零；`rawDrawCount` 和 `commandSequence` 单调不减。每次 `RuleRng.nextInt` 满足 `1 <= exclusiveMax <= 2^32` 且 `0 <= result < exclusiveMax`。成功命令 sequence 恰加 1；拒绝/故障保持原 Snapshot 引用、RNG 和 sequence。
3. cash、AP、stamina、reputation、teamwork、quantity 不为负；stamina 不超过 maximum；mood 只在 -2..2。Relationship 数值沿用字段已声明的完整整数域：affection 是 `Number.MIN_SAFE_INTEGER..Number.MAX_SAFE_INTEGER`，teamwork 是 `0..Number.MAX_SAFE_INTEGER`；v1 没有隐含的 `-100..100` 或 `0..100` 关系刻度。正常 delta 在各自已声明域上饱和，`debug.relationship.set` 仍接受同一 ABI 的绝对值。
4. `run.initialSeed` 在整轮内不变；sequence 0 replay base 必须满足 Bootstrap 生命周期段的 idle Narrative/空 `demandSeeds`/null currentDemand 约束，第一条成功命令只能是 `run.start`，且该命令必须启动唯一的 `manifest_start` Narrative。成功 Start 后，demandSeeds 对 Story `serviceDays × customerSegments` 恰好各一行、baseCustomers 等于 StoryBalance、randomOffset 只为 -1/0/1 并保持稳定顺序；后续命令不得改写这些随机 seeds。当前日是 service day 时 currentDemand 必须非 null、day/segment 完整且 actual 落在 preview range；非 service day 必须为 null。`calendar.lifePolicyId === null` 当且仅当 `run.status="setup"`；active 与任一 terminal status 必须引用 `StoryBalance.lifePolicies` 中恰好一个存在的 PolicyId。setup/active 的 completion 必须为 null；`calendar.day <= PocSimulationDataV1.manifest.playableDays`。terminal status 的 day/phase 必须精确等于 `StoryBalance.levyDue`，且没有 workflow/active Narrative，completion 必须非 null 且 status 与 run 相同、`completedAtSequence === snapshot.commandSequence`。三个 terminal status 在 Ending definitions 中各有且只有一个映射；completion 的 ending/status/reason/outcome 必须与该 definition、其 `summaryOutcomeIds`/effects 和 `StoryBalance.endingPolicy` 的 stable/danger/arrears 分类及有序 Reason binding 精确一致；`failed_arrears` 当且仅当 levy.kind 为 arrears，其余 terminal status 当且仅当为 paid；paid 的 cash 差恰为 levyAmount，arrears 的 cash 不变且 `shortfall = levyAmount - availableCash > 0`；Base ABI 不硬编码七日，以上均为 PoC Story/GameSimulation invariant。
5. 只有 `calendar.advance_phase` 改变 day/phase；AP 不跨时段结转。不可行动时段与营业日由当前 Story 的 serviceDays、levyDue 和 Event/Condition 数据决定。当前 day/phase 已等于 `levyDue` 时，该命令固定拒绝为 `calendar.phase_blocked { blocker:"levy_due" }`，不能越过终局等待点；D7 普通动作则由 Action visibility/availability 的日界 gate 关闭。
6. 只有明确作为集合的定义/状态数组按其 stable ID 升序规范化；同类 ID、BatchId、AuraInstanceId、LedgerEntryId、Facility opportunityId、Narrative slot 不重复。authored-order 数组（Confirmation、gates、recommendations、Scene nodes/options/steps，以及 AssetPack 的 `sources`/`licenses`/`providers`）保持 Story/pack 声明顺序；causal/reference 数组（GameplayFact、ledger、CommandLog、triggeredEventIds、start/entry/paid-cost ledger IDs、expiredAuraIds、AppliedModifier/components）保持应用/collector 顺序。不得为了“统一排序”把后两类改成字典序；每个具体 Schema 必须声明自己属于哪一类。
7. Ingredient batch quantity 为正，`acquiredDay <= lastUsableDay`；每条采购 line 的 quantity 必须先于金额乘法校验为不超过 `StoryBalance.purchaseQuantityPerLineLimit`，现金仍是随后独立的动态约束。expiry 可以超过七日 PoC 的 day 7；initial batch 必须使用 `batch:initial:<index>` 与 `source.kind=initial`，事务创建批次必须使用 `batch:<commandSequence>:<lineIndex>` 且不能冒充 initial；FIFO 消耗顺序为 `lastUsableDay, acquiredDay, batchId`。`inventory.grant` 必须创建确定性 batch IDs、按 Story ingredient unitPrice 追加 `story_reward`、cashDelta 0、正 valuationDelta 的 entries，并在 `inventory.ingredient_granted` 中携带 lines/createdBatchIds/entries/reason；不能要求 UI 从 Snapshot diff 猜奖励。
8. `closed` plan 菜单为空；其他模式为 1..`StoryBalance.menuRecipeLimit` 道、结构上限 16，且 recipe 唯一、portions 为正且每道菜不超过 `StoryBalance.menuPortionsPerRecipeLimit`。menu/mode/day gate、静态份数、容量与 preparation 结构失败必须拒绝 `tavern.plan.set`；只有结构合法且 mode 可用、但因当前 cash/stamina/ingredients 等可恢复开店资源不足而 `previewTavernPlan.allowed=false` 的草案可在白天保存，UI 必须显示其短缺/风险。service plan 进入晚上后被冻结。营业日进入晚上时，已主动提交的 closed plan 直接把该晚标记为已解决、不受惩罚，并使用 `plannedClosureReasonId` 追加 planned closure history/fact；若 plan 仍为 null，同一次 `calendar.advance_phase` 设置 closed plan、应用 `emergencyClosure.reputationPenalty`、追加 emergency closure history/fact 并标记已解决。若进入 evening 后仍持有 non-closed plan，却尚未成功 StartOpening 且没有 active workflow，玩家再次 `calendar.advance_phase` 表示接受紧急收店：该命令在同一事务把 plan 改为 closed、应用同一 emergency penalty/history/fact，然后继续正常日终；不能留下不可推进的存档。若 OpeningSession 已 active，仍以 `calendar.phase_blocked { blocker:"opening" }` 拒绝，必须先 Finalize。`serviceHistory` 按 day 严格递增；每个已经解决的营业日恰有一项，opening 项引用已完成的 OpeningLedger，closure kind 与对应 GameplayFact 一致。OpeningLedger 的 AP/双方 stamina before-after 必须精确等于 StartOpening 已提交的服务成本，closure reputation 则精确记录 planned 零变化或 emergency penalty。每个 facility opportunityId 只允许一个 decision；build 目标必须在该 opportunity 的 facilityIds 内。
9. 同时最多一个 workflow。`tavern.opening.start` 只在 evening 可提交，其他时段返回 `calendar.invalid_phase { allowed:["evening"] }`；eveningResolved 已为 true 时（包括 Finalize、planned closed、emergency closed）优先返回 `tavern.evening_resolved`，active Opening 则返回 `tavern.opening_active`。Opening 的 `blockingEvent` 非空时 Narrative 必须 active 且不能 continue/finalize。该 Event Scene 的 end 由 `narrative.advance` 提交时，必须在同一事务把 Narrative 置为 completed、把 `blockingEvent` 清为 null，同时保留 checkpoint 与 triggeredEventIds；这个可保存间隙尚未推进 Opening。随后只有 `tavern.opening.continue` 可以消费 completed Narrative、推进 checkpoint，并按 Scheduler 结果建立下一 blockingEvent 或进入 `ready_to_finalize`。Finalize 只接受 `ready_to_finalize`。
10. OpeningBaseline 不包含 GameSnapshot、GamePackage/Story data、函数或未受控 JSON；开始成本只在 Start 提交一次。`preparationActionCount` 必须等于当日 Start 时的 Tavern preparation、位于 0..dailyPreparationLimit，并原样复制到 OpeningLedger。AP/双方 stamina before-after、cash Start 前后与 reputation Start 前值同时冻结；OpeningActorInputs 已冻结 relationship/teamwork 与 heroine mood。Finalize 的 OpeningLedger 必须以这些值为整个营业事务的 before，并原样复制 AP/stamina，不从可能经历 Narrative/Save 的当前状态重建；`SettlementDraftV1.appliedModifiers` 必须按 collector stable order 精确保存实际参与本次 opening 的 baseline/session Modifier 及 contribution/reason，OpeningLedger 原样复制同一数组，即使来源 Aura 同次过期也可解释。Opening/WorldAction/历史记录只引用 `InventoryState.ledger` 中存在的 entryId，不复制第二份 LedgerEntry。
11. v1 每个 WorldAction 恰好两个按声明顺序且位于紧邻时段的 step，optionId 在该 action 内唯一。Session progress 只能按 `begin_scene → awaiting_completion_phase → completion_scene → ready_to_complete` 前进；两个 scene 阶段都必须有 active `NarrativeSource.kind="world_action"` 且 actionId 相同，两个 awaiting/ready 阶段 Narrative 不 active。Begin 原子校验 availability、互斥 Effect、基础+选项费用和体力，扣除第一 step AP，应用 beginEffects，再写 Session 并启动 begin scene；AdvancePhase 只在 awaiting 阶段进入 completion phase 并启动 completion scene；Complete 只在 ready 阶段扣第二 step AP、使用冻结 preparationBonus 结算并清空 workflow，不再扣现金或体力、也不启动第三段 Narrative。任一冲突全部回滚。
12. Fact/Quest/Outcome ID 和值必须匹配当前 StoryStateDefinitions；resolvedChecks 按 `resolvedAtSequence` 升序、CheckId 唯一且 sequence 不超过 Snapshot sequence。每条 actor/band/modifier 引用合法，`totalBonus = attributeBonus + preparationBonus + sum(modifier.contribution)`，`total = dice[0] + dice[1] + totalBonus`；对应 band 必须覆盖 total。Narrative cursor/call frame/choice/jump/cue 引用必须存在且可达。Narrative `idle` 时 source/cursor 均为 null；`active` 时均非 null；`completed` 时 source 非 null、cursor 为 null、callStack 为空。Opening blockingEvent 的 eventId 必须等于 active Narrative event source。`enableWhen` 非空的 NarrativeChoice 必须存在 `disabledReasonId`，为空时必须省略该字段。
13. Aura target、duration 与 definition 相容；同一 `(auraId,target)` 最多一个实例，重复 apply 拒绝为 `aura.already_present`，不自动叠层或刷新；`story_event`、`story_action`、`facility` 与 `world_action` source 必须引用当前 Story 对应 kind 中存在的稳定 ID。initial Aura 使用 `aura:initial:<index>`、`source.kind=initial` 和 `appliedAtSequence=0`，事务创建 Aura 使用 sequence 形式且 sequence 为正；`until_cleared` 表示仍在持续且可由显式命令/Story Event 解除，不表示永久不可撤销事实。倒计时只在成功提交的对应边界恰减一次：`phase_end` 在离开当前 phase 的直接边界效果完成后、进入新 phase Event 前扣；`day_end` 在旧日领域结算完成后、夜间恢复 collector 前扣；`night_recovery` 必须先以仍 active 的 Aura 参与本次 recovery collector/结算，再扣次数，因此 strain 会削减这一次恢复而不会提前消失。`opening` definition 必须至少含一个可由 Opening collector 选择的 Modifier；只有成功 `tavern.opening.finalize` 且 `SettlementDraftV1.appliedModifiers` 中实际包含该 auraId 来源时 remaining 才恰减 1，同一 Aura 的多个适用 Modifier 也只减一次；原样复制到 OpeningLedger 的同一数组保留结算后证据。Start、Continue、主动/紧急 closed、模式不匹配、拒绝或故障均不扣 opening 次数。任一 unit 减到 0 都在同一事务发出 `aura.expired` GameplayFact 并移除；整个外层命令回滚时不扣次数、不产生该 Fact。
14. Modifier/EffectIntent 的 ID、目标、整数范围和生命周期合法；每个 Modifier、Aura definition、ActionCost、LifePolicy night recovery、ServiceMode、WorldAction、Facility skip、planned/emergency closure 与 heroine night recovery 的 ReasonId 都必须存在于 StoryContent，并由产生对应变化的 handler 原样写入 ChangeReason。每个 Effect batch 必须携带显式 `PocEffectSourceV1`；整批完成 strict Schema、stable-reference、source/payload provenance、generic-ledger 和 active-Opening Modifier 预检后，才按拥有者原子应用。`modifier.add.reasonId` 仅验证，持久 explanation 始终是 `modifier.reasonId`。Stamina 变化的 components 非空、按 base 后 Modifier stable order 保存 requestedDelta/reason，但应用策略由 handler 类型冻结：成本/支付及负向 Effect 必须先验证 `before + sum >= 0`，不足就以 `actor.insufficient_stamina` 拒绝，绝不能下界 clamp 后继续成功；恢复 resolution 允许 recovery modifier 为负，先计算 `effectiveRecovery = max(0, sum(requestedDelta))`，再只做一次 `min(before + effectiveRecovery, maximum)`，因此 strain 只能削减恢复而不会反向造成伤害，同时保留 base/bed/Aura 原因且不受应用顺序影响；`debug.actor.set_stamina` 是绝对值写入，只接受 `0..maximum`。所有成功路径都不得超过 maximum。`obligationForecast.visibleFrom <= conservativeFrom <= levyDue` 按 day/phase 全序成立且均不超过 playableDays。
15. StoryRule 输入是与 Snapshot 不共享可变引用的 plain-data projection；输出不得是 thenable，必须通过对应 strict Schema，且不能包含未声明 Effect。Tavern preview 输入必须精确属于 current-state/resources 或 active-opening/plan/session 分支，不能把 current resources 与 baseline 拼成第三种 basis；active branch 的 plan 与 baseline 不等时 invocation validation 失败。Demand resolve 只在 `run.start` 消费 RNG 并返回 base-line 对应的 offsets；Demand preview 没有 RNG capability，只用目标日 seeds、该日开始时的 reputation、Fact projection 与受控 modifiers，返回包含 actual 的确定 projection，且 preview range 必须包含 actual。`run.start` 物化 D1；之后 `calendar.advance_phase` 进入每个 service-day morning 时，在任何新日 Scheduler context 前物化并冻结当日 currentDemand，直到次日不再随当天 reputation/Fact 变化；每次物化恰追加一个包含同值的 `demand.materialized` GameplayFact，非 service day 清为 null 时不追加。因此 D1 营业人气影响 D2，D5 调查 Fact/人气影响 D6而不反改 D5。Query 隐藏 currentDemand.actual，StartOpening 原样复制完整 materialized demand 到 baseline，不重新调用规则。属性段位映射固定为 `C=0, B=1, A=2, S=3, S+=4`；2D6 每枚必须在 1..6。每个 CheckDefinition 的 CheckBandId 唯一、整数区间连续无重叠，CheckBranch 与 CheckResult 只引用这些 band；成功解析在同一命令把不含 effects 的 ResolvedCheckV1 追加到 Snapshot，再原子应用 band effects，因此读档不重掷也不重放 effects。band effects 才负责把对应 `OutcomeEntryV1` 设为封闭 StoryToken，CheckBandId 不冒充 OutcomeId。EndingResult 的 status 构成酒馆维度，endingId/effects/summary IDs 必须来自匹配该 status 的唯一 EndingDefinition；summary.relationship/investigation 必须引用并等于 effects 应用后的两个 Snapshot Outcome entry；成功税负结算由 Run owner 把同一 LevyResolution 与 EndingResult 物化为 RunCompletionV1 后再结束命令，重载后不得重新 evaluate；不要第三个伪造的 tavern OutcomeId。
16. 每个 `ChangeReasonV1.reasonId` 必须存在于 StoryContent，并等于产生该变化的命令/Effect/结算 reason；`story_action`、`world_action`、event、Aura、facility 与 ending provenance 还必须引用当前 Story 对应 kind 中存在的稳定 ID，不能把 Story 变化退化成无来源的 `narrative.choose`。`InventoryState.ledger` 是所有现金与估值原因的唯一权威历史，`cash = startingCash + sum(ledger.cashDelta)`。任何命令、Effect 或 settlement 改变 cash 时，同一事务必须追加恰好对应的 ledger entries，新增 `cashDelta` 之和等于 cash before→after。`ledger.append` 是 Story Effect 唯一的直接现金/估值变化意图，通用 Router 只接受 §6 冻结的 category/source/subject matrix；`purchase`、`facility`、`spoiled_ingredient` 与 `debug_adjustment` 必须来自对应 owner-context 专用 operation。Inventory Module 校验每项 category/reason/subject/delta 后同时追加账本并改变 cash，不存在需要二次配对的 `cash.adjust`；`inventory.grant` 的受控批次创建按第 7 条由 Inventory Module 物化唯一 story-reward valuation entries。Opening Start 的原料 consume 是库存到 `OpeningBaseline.preparedPortions` 的内部数量转移，只发 `inventory.consumed` 并保留 batch slices，不改变总估值；Finalize 的 revenue entries 对售出成品扣除相应原料估值，discarded-food entries 对未售成品扣除估值，二者之和必须精确覆盖 baseline 已消费原料成本。Modules/GameSimulation 产生的采购、工资、开店杂费、收入、报废、腐败、设施、WorldAction 与税负账本必须使用 `StoryBalance.ledgerReasons` 对应字段，且这些 ReasonId 必须存在于 StoryContent。腐败/报废使用 `cashDelta=0` 和非零 `valuationDelta`，不会伪造现金支出。`debug.inventory.adjust_cash` 必须追加 `category="debug_adjustment"`、`subject.kind="debug"` 的账本行；调试 UI 若要设定目标现金，先用当前 cash 计算 delta，仍不可重置 startingCash 或绕过账本。
17. `BuildProvenanceV1.story`、`.engine` 与 `.resolved` 分开保存。普通兼容键包含 `story.id/revision + stateContractRevision/digest + engine.digest + simulationDigest`；`story.digest`、`presentationDigest`、`engine.version` 与 `appBuildId` 不单独阻断恢复。state digest 只覆盖完整 GameSnapshot，不覆盖 provenance、slot、时间、lineage、CommandLog、runtimeFailures 或 UI。GameplayModule/GameSimulation/GameCommandExecutor 属于 simulation root，不能污染 engine root。
18. Save/Debug 导入顺序固定为 bytes → Strict JSON → envelope Schema → state digest → identity/compatibility → stable references → invariants；失败不得写 IDB 或替换 Session。Save 必须满足 `slot.storyId === provenance.story.id`、`slot.capturedCommandSequence === snapshot.commandSequence`、`stateDigest === digest(snapshot)` 和 lineage 链式不变量。阻断键精确相等时返回 exact；只有 simulation digest 一项不同且满足精确 PatchSet adoption declaration 时返回 adopted，并建立新 anchor/清空旧日志；其余阻断差异只能 inspect-only。DebugBundle 必须满足两个显式 digest 分别等于 replayBase/currentSnapshot 的 state digest；空 CommandLog 仍执行这两次检查。authoritative simulation replay 要求 engine/state-contract revision/state-contract digest/simulation 四项精确匹配；presentation 差异只取消“精确视觉复现”资格。inspect-only 数据不能写 Save Slot。
19. CommandLog 上限 200；裁剪时 replayBase 前移到保留首条命令之前。authoritative replay 比较 outcome 判别、稳定 code/slot、GameplayFact/账本顺序、state digest 和 attempted draws，并最终要求 replay 结果等于 `currentStateDigest`。
20. DebugCommand 预校验失败不进入候选事务或 CommandLog；进入事务的 replayable command 只可能 committed/faulted，且两种 attempt 都进入对应 Debug-source CommandLog entry，faulted 另外暂停 Session并写 failure。Debug-source entry 不允许 rejected outcome。Anchoring DebugCommand 不伪装为普通 CommandLog 命令；统一 Artifact 默认关闭 `debug_tools`/`cheats`，每次操作在执行点复查 capability，未授权时不暴露或接受 DebugCommand。
21. 所有 strict Schema 拒绝 unknown keys；所有 JSON 字符串还受 256 KiB 限制，诊断 message/stack 受更小的 64 KiB 限制。`runtimeFailures` 最多 50 条并保持发生顺序，operation/name/cause message 各最多 4 KiB；`uiContext.overlayIds` 最多 16 项且只能使用封闭 ID。导出前移除 message/stack/cause 中的本机绝对路径。
22. 所有 Narrative/Stage CharacterId 必须存在于 `StoryContent.characters`；可选 actorId 只用于把角色投影连接到领域 Actor，老人、战友和镇民不需要 Actor state。
23. 每个 Narrative/Stage/Story 引用的 AssetId 必须在 `ResolvedAssetManifestV1.assets`；safeArea 在像素边界内，pivot 两个 Ratio 的 numerator 不超过 denominator；fallback 与 runtime image 都满足相同尺寸/锚点合同，runtime image 还必须携带可用 fallbackToken。
24. 每个 visibility/availability gate 的 conditions 非空，reasonId 必须存在 StoryContent；所有 visibility gates 通过才出现在 `getAvailableActions`，随后所有 availability gates 通过才可用；每个失败 gate 按声明顺序产生带该 reasonId 的类型化 Rejection。`tavern.helper_tier_at_least` 在 helper 未解锁时恒为 false。解析到 Action presentation 的命令先共用同一 availablePhases guard，再评估 authored gates；occupiedPhases 只用于展示承诺，绝不充当提交窗口。`actor.prepare_food` 还必须共用 Tavern Module-owned daily limit guard，达到上限时 query/preview/execute 都返回 `tavern.preparation_limit_reached { current, limit }`。Action/Facility/ServiceMode/WorldAction 的 `getAvailableActions`、`explainAvailability`、`previewCommand` 与 execute 不得各写一套判断。
25. ConfirmationMetadata 的三个数组按 stable ID 唯一且保持 Story 声明顺序，TextId/ActionId 必须存在，互斥不得引用自身；跨 contributing sources 也不得重复。Action presentation 的 player/system 映射数必须严格满足 §7.2 后的封闭分类；CommandPreview 按规定的 source/merge 顺序覆盖 Action、ServiceMode、Facility opportunity + build/skip、WorldAction option 与 Narrative choice。对应玩家决策的 confirmation 非 null，system/workflow controls 为 null。成本、时段和可推导变化来自同一 preview/execute 计算器。ActionView `directCommand` 非 null 时 UI 可直接预览/提交该精确命令；为 null 时必须先通过强类型 Overlay 收集参数，不得按 commandKind 猜 payload。
26. Scheduler 严格使用 §7.2 的外层 context 全序、单-context evaluation Snapshot、先选全再应用、跨-context 顺序可见语义；`story.explicit` 只允许 effects，`week.ended` 以及 trigger commandKinds 含 `levy.pay` 的 `command.succeeded` Event 还进一步要求 sceneId=null 且只允许 `fact.set | quest.set`。两个 Scheduler scene 以 `scheduler.multiple_blocking_events` 故障；Scheduler scene 与 active/base-command Narrative request 冲突以 `narrative.blocking_conflict` 故障。两者都必须回滚 effects、RNG、workflow、cursor、GameplayFacts 和 sequence；唯一请求只能在全部 Schema/invariants 通过后建立 Narrative 与可选 Opening blockingEvent。
27. `StoryContent.storyActions` 的 actionId 必须是 `action.*`、在本表内唯一，且恰好对应一个 `ActionPresentationDefinitionV1.commandKind="story.action.start"`；`StoryEventDefinition.eventId` 必须是 `event.*`，玩家行动不得保留 `event.*` 兼容别名。该 ActionView 的 `directCommand` 必须精确为 `{ kind: "story.action.start", actionId }`。命令只能在 availability gates 全部通过且 Narrative 不 active 时执行：先原子验证/应用 startEffects，再在 sceneId 非 null 时建立 `NarrativeSource.kind="story_action"`，最后发出 `story.action_started`；任一步失败不提交。玩家不发出该命令时 Story 不得自动修改关系 Outcome，因此“完全不参与女主支线”是合法路径。
28. `ModifierSourceRefV1.kind="story"` 的 sourceId 必须存在于 `StoryContent.modifierSources`，且只用于规则/Story 级派生贡献；其他 source variant 不仅要引用现有 ID，还必须与拥有该 Modifier/Effect 的实际 owner 相等：FacilityDefinition modifier=同 facility，AuraDefinition modifier=同 aura，Event/session modifier=触发它的 event。`aura.apply.source`、`inventory.grant.source` 及 story-cost/reward ledger subject 也必须与当前 Event/StoryAction/WorldAction/Facility 或 active Narrative source 精确一致；GameSimulation 中对应事务 owner 派生 ChangeReason 并验证 authored source，不能接受“存在但冒充另一个 owner”的 ID。Demand、Opening、Check 与恢复等 rule/collector 不得临时创造无法解析的 modifier source。`facility.choice_committed` 的 build reason 来自 `facility.choose.build` ActionCost，skip reason 来自 opportunity.skipReasonId；`food.prepared` 使用 prepare ActionCost reason，`tavern.plan_set` 使用所选 ServiceMode reason。
29. 每个 `IntegerRangeV1` 都满足 `min <= max`；数量/客流/销量范围还必须满足 `min >= 0`。Story integer definition 的 defaultValue 必须落在其 range 内；Demand actual 必须落在 preview range。Tavern preview 对当前 PoC 枚举全部 demand-range 整数向量（扩大后只能换成可证明保守的覆盖算法），因此 stored actual demand 经同一 settlement 管线得到的每道菜 actual sales 与实际 cash delta 必须分别落在对应 expectedSales/cashDelta range；Obligation 的 lower/upper 也不得倒置。Obligation policy 的 reason/text/action 引用必须存在，recommendation appliesTo 非空、唯一且按 Forecast kind 顺序规范化。
30. Aura countdown policy 满足 `defaultRemaining <= maximumRemaining`。initial 与普通 authored `aura.apply` 必须使用 definition 的 kind/unit/defaultRemaining；`debug.aura.apply` 可以在同一 countdown unit 内选择 `1..maximumRemaining`，但不能换 unit，until-cleared definition 也只能创建 until-cleared instance。持久实例的 kind/unit 必须匹配 definition，remaining 不超过 maximum；因此 PoC 的 angry/sign/strain 生命周期不会被合法但错误的 Effect payload 改写。
31. Aura allowedTargets 按 `kind`、actorId 规范化且深值唯一，instance target 必须精确命中一项，不能只因同为 actor 就把 heroine Aura 加给 player。所有 collector 的适用 Modifier 使用同一全序：base component（若有）最先；随后 source-kind 为 `story < facility < aura < event`。story 以 sourceId、rule-output index 排序；facility 以 facilityId、definition index 排序；aura 以 appliedAtSequence、instanceId、definition index 排序；event/session 以 triggeredEventIds 的既有因果次序、append index 排序。筛选不改变相对顺序；AppliedModifier、OpeningBaseline、OpeningLedger、Demand explanation 与 stamina components 都保留该序，不能按 target/kind/数值重新排序。
32. 每个 ResolvedGame 的 Module ID/state slot 唯一，依赖只引用已选 Module 且 DAG 无环；GameSimulation 的 State/Command/Fact/Rejection/DebugCommand schemas、normal/debug executors、queries 和 ViewModel projection 必须来自同一 type witness。PoC ViewModel 精确为 `PocGameViewV1`；独立 `NarrativeProjectionV1 | null` 从同一 Queries 进入 `SemanticPublicationV1.narrative`，不得嵌入 GameView。显式 State-contract manifest 必须与全部且仅有 stateful binding 的 module ID/revision/state slots 精确匹配，stateless binding 不得登记。Base generic contract tests 使用 synthetic GamePackage，不能以 PoC 联合类型代替泛型边界。
33. Resolved simulation root 只能依赖 Base、Module core 和自身 simulation sources；source presentation facet 及 resolved presentation root 可以消费只读 GameView/SemanticGamePort，但 GameSimulation/GameCommandExecutor 不得导入它们。Narrative 可持久 cursor/IR Schema descriptor 与持久状态可引用的稳定 scene/node 等 ID 集进入 state-contract manifest；conditions/checks/commands/effects、完整控制流和 Narrative `StageCueV1` 中会写入持久 stage/projection 的逻辑 CharacterId/AssetId 进入 simulation manifest。真实 TextCatalog 字符串、UiSceneGraph renderer、CSS、Asset providers/bytes 与仅由 resolved Presentation 拥有的视觉布局/cue descriptors 进入 presentation manifest。
34. Simulation Patch Registry 只接受 `rule | value`，Presentation Registry 只接受 `value | text | asset`；slot surface 不能由 Hotfix 改写。Provider/Hotfix/PatchSet digest 必须使用 §7.3 和 §10 的冻结算法；安装完成立即撤销写权限。TextCatalog default 完整、Locale/fallback 无环且最终到达 default。Asset slot definition 不可被 provider 覆盖；packs 后才应用 asset Hotfix，sealed slot 不暴露 patch slot；Resolved assets 与 slots 一一对应。
35. PatchSet adoption declaration 必须精确匹配 Story ID/revision、stateContractRevision/digest、from/to simulation digests 和当前 simulationPatchSetDigest；不得由其中任一 Hotfix 泛化授权，纯 presentation PatchSet 差异不阻断。新局 lineage 为空，exact load 保留，adoption 只追加；当前 DebugBundle 的 replay base/log/current Snapshot 始终属于同一 simulation digest。

任何新字段、kind/code、Rule slot、StoryValue variant、workflow variant 或 relaxed JSON escape hatch 都是 ABI 变更：先更新本文、contractRevision 策略与契约测试，再修改实现。
