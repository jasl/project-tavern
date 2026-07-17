// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { rngStateV1Schema } from "@sillymaker/base";
import type {
  DeepReadonly,
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import {
  CapabilityPanelV1,
  DebugCommandPanelV1,
  DiagnosticInspectorV1,
  FixtureBrowserV1,
  createDevDockContributionSetV1,
} from "@sillymaker/ui/debug";
import type {
  DebugCommandOperationResultV1,
  DevDockContributionSetV1,
  DiagnosticInspectorQueryResultV1,
  FixtureBrowserAnchorResultV1,
} from "@sillymaker/ui/debug";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import {
  parseActorId,
  parseAuraId,
  parseAuraInstanceId,
  parseFactId,
  parseMoodPoint,
  parseNodeId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseReasonId,
  parseRelationshipStage,
  parseSafeInteger,
  parseSceneId,
  type PocDebugCommandV1,
} from "../gameplay/index.js";
import type {
  PocDebugToolsPortV1,
  PocDiagnosticQueryResultV1,
} from "../runtime/poc-debug-bundle.js";
import { pocDebugCommandFormAdapterV1 } from "../tooling/debug-command-form-adapter.js";
import { pocToolingNotesV1 } from "../tooling/notes.js";

export type PocToolingUiDebugToolsV1 = Pick<
  PocDebugToolsPortV1,
  "listFixtures" | "executeDebugCommand" | "anchorFixture" | "queryDiagnostics"
>;

export interface PocToolingUiContributionsInputV1 {
  readonly debugTools: PocToolingUiDebugToolsV1;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  readonly persistedCapabilities: RuntimeCapabilityPortV1;
  readonly sessionRequested: readonly RuntimeCapabilityIdV1[];
}

const commandLabelsV1 = Object.freeze({
  "debug.calendar.set_ap": "设置行动点",
  "debug.actor.set_stamina": "设置角色体力",
  "debug.actor.set_mood": "设置角色心情",
  "debug.relationship.set": "设置关系",
  "debug.inventory.adjust_cash": "调整现金",
  "debug.aura.apply": "应用光环",
  "debug.aura.clear": "清除光环",
  "debug.story.fact.set": "设置故事事实",
  "debug.narrative.jump": "跳转叙事",
  "debug.rng.set": "设置随机数状态",
} satisfies Readonly<Record<PocDebugCommandV1["kind"], string>>);

const controlledCommandsV1 = Object.freeze([
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.calendar.set_ap",
    value: parseNonNegativeSafeInteger(3),
    reasonId: parseReasonId("reason.debug.state_override"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.actor.set_stamina",
    actorId: parseActorId("actor.player"),
    value: parseNonNegativeSafeInteger(8),
    reasonId: parseReasonId("reason.debug.state_override"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.actor.set_mood",
    actorId: parseActorId("actor.heroine"),
    value: parseMoodPoint(1),
    reasonId: parseReasonId("reason.debug.state_override"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.relationship.set",
    affection: parseSafeInteger(2),
    teamwork: parseNonNegativeSafeInteger(1),
    stage: parseRelationshipStage("cold"),
    reasonId: parseReasonId("reason.debug.state_override"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.inventory.adjust_cash",
    delta: parseSafeInteger(5),
    reasonId: parseReasonId("reason.debug.cash_adjustment"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.aura.apply",
    auraId: parseAuraId("tavern.sign_repaired"),
    target: Object.freeze({ kind: "tavern" as const }),
    duration: Object.freeze({
      kind: "countdown" as const,
      unit: "opening" as const,
      remaining: parsePositiveSafeInteger(1),
    }),
    reasonId: parseReasonId("reason.debug.aura_adjustment"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.aura.clear",
    instanceId: parseAuraInstanceId("aura:initial:0"),
    reasonId: parseReasonId("reason.debug.aura_adjustment"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.story.fact.set",
    factId: parseFactId("fact.war_clue"),
    value: Object.freeze({ kind: "boolean" as const, value: true }),
    reasonId: parseReasonId("reason.debug.state_override"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.narrative.jump",
    cursor: Object.freeze({
      sceneId: parseSceneId("scene.supplier_invoice"),
      nodeId: parseNodeId("node.supplier_invoice.choice"),
    }),
    reasonId: parseReasonId("reason.debug.narrative_jump"),
  }),
  pocDebugCommandFormAdapterV1.toCommand({
    kind: "debug.rng.set",
    rng: rngStateV1Schema.parse({
      algorithm: "xorshift32-v1",
      cursor: 17,
      rawDrawCount: 4,
    }),
    reasonId: parseReasonId("reason.debug.rng_override"),
  }),
] as const satisfies readonly DeepReadonly<PocDebugCommandV1>[]);

if (
  controlledCommandsV1.length !== pocDebugCommandFormAdapterV1.kinds.length ||
  controlledCommandsV1.some(({ kind }, index) => kind !== pocDebugCommandFormAdapterV1.kinds[index])
) {
  throw new TypeError("PoC tooling UI command forms do not cover the frozen command-kind order");
}

function unreachableToolingValueV1(_value: never): never {
  throw new TypeError("unsupported PoC tooling value");
}

function useCapabilitiesV1(
  source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>,
): RuntimeCapabilitiesV1 {
  const subscribe = useCallback((listener: () => void) => source.subscribe(listener), [source]);
  const getSnapshot = useCallback(() => source.getCurrent(), [source]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function commandFieldsV1(command: DeepReadonly<PocDebugCommandV1>): ReactElement {
  const entries: readonly (readonly [string, string])[] = (() => {
    switch (command.kind) {
      case "debug.calendar.set_ap":
        return [["行动点", String(command.value)]];
      case "debug.actor.set_stamina":
        return [
          ["角色", command.actorId],
          ["体力", String(command.value)],
        ];
      case "debug.actor.set_mood":
        return [
          ["角色", command.actorId],
          ["心情", String(command.value)],
        ];
      case "debug.relationship.set":
        return [
          ["好感", String(command.affection)],
          ["默契", String(command.teamwork)],
          ["阶段", command.stage],
        ];
      case "debug.inventory.adjust_cash":
        return [["现金变化", String(command.delta)]];
      case "debug.aura.apply":
        return [
          ["光环", command.auraId],
          ["目标", command.target.kind],
          [
            "持续",
            command.duration.kind === "until_cleared"
              ? "直到清除"
              : `${command.duration.unit} × ${String(command.duration.remaining)}`,
          ],
        ];
      case "debug.aura.clear":
        return [["光环实例", command.instanceId]];
      case "debug.story.fact.set":
        return [
          ["故事事实", command.factId],
          ["值", String(command.value.value)],
        ];
      case "debug.narrative.jump":
        return [
          ["场景", command.cursor.sceneId],
          ["节点", command.cursor.nodeId],
        ];
      case "debug.rng.set":
        return [
          ["算法", command.rng.algorithm],
          ["游标", String(command.rng.cursor)],
          ["抽取次数", String(command.rng.rawDrawCount)],
        ];
    }
    return unreachableToolingValueV1(command);
  })();
  return (
    <dl>
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function normalizeDebugCommandResultV1(
  result: Awaited<ReturnType<PocToolingUiDebugToolsV1["executeDebugCommand"]>>,
): { readonly kind: "capability_disabled" } | DebugCommandOperationResultV1 {
  switch (result.kind) {
    case "capability_disabled":
      return result;
    case "committed":
      return Object.freeze({
        kind: "handled" as const,
        message: `调试命令已提交（序号 ${String(result.commandSequence)}）`,
      });
    case "validation_failed":
      return Object.freeze({
        kind: "rejected" as const,
        message: `调试命令被拒绝：${result.error.code}`,
      });
    case "faulted":
      return Object.freeze({
        kind: "rejected" as const,
        message: `调试命令故障：${result.fault.code}`,
      });
  }
  return unreachableToolingValueV1(result);
}

function normalizeAnchorResultV1(
  result: Awaited<ReturnType<PocToolingUiDebugToolsV1["anchorFixture"]>>,
): { readonly kind: "capability_disabled" } | FixtureBrowserAnchorResultV1 {
  switch (result.kind) {
    case "capability_disabled":
      return result;
    case "anchor_established":
      return Object.freeze({ kind: "anchored" as const });
    case "validation_failed":
      return Object.freeze({
        kind: "rejected" as const,
        message: `夹具载入被拒绝：${result.error.code}`,
      });
    case "faulted":
      return Object.freeze({
        kind: "rejected" as const,
        message: `夹具载入故障：${result.fault.code}`,
      });
  }
  return unreachableToolingValueV1(result);
}

function PocDebugCommandFormV1(props: {
  readonly command: DeepReadonly<PocDebugCommandV1>;
  readonly cheatsEnabled: boolean;
  readonly debugTools: PocToolingUiDebugToolsV1;
}): ReactElement {
  const [confirmed, setConfirmed] = useState(false);
  const command = props.command;
  const label = commandLabelsV1[command.kind];
  const execute = useCallback(
    async (submitted: DeepReadonly<PocDebugCommandV1>) =>
      normalizeDebugCommandResultV1(await props.debugTools.executeDebugCommand(submitted)),
    [props.debugTools],
  );
  const canExecute = props.cheatsEnabled && confirmed;

  return (
    <section aria-label={`PoC 调试命令：${label}`}>
      <h4>{label}</h4>
      <p>使用 Story 预先声明的受控字段；最终验证由游戏模拟执行。</p>
      <label>
        <input
          checked={confirmed}
          disabled={!props.cheatsEnabled}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          type="checkbox"
        />
        我确认执行{label}
      </label>
      <DebugCommandPanelV1
        fields={commandFieldsV1(command)}
        command={pocDebugCommandFormAdapterV1.toCommand(command)}
        executeDebugCommand={execute}
        canExecute={canExecute}
        disabledReason={props.cheatsEnabled ? "请先确认本次调试命令" : "需要启用作弊功能"}
      />
    </section>
  );
}

function PocDebugCommandsPanelV1(props: {
  readonly debugTools: PocToolingUiDebugToolsV1;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
}): ReactElement {
  const capabilities = useCapabilitiesV1(props.effectiveCapabilities);
  return (
    <section aria-label="PoC 调试命令面板">
      <h3>调试命令</h3>
      {controlledCommandsV1.map((command) => (
        <PocDebugCommandFormV1
          key={command.kind}
          command={command}
          cheatsEnabled={capabilities.cheats}
          debugTools={props.debugTools}
        />
      ))}
    </section>
  );
}

function PocFixturePanelV1(props: {
  readonly debugTools: PocToolingUiDebugToolsV1;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
}): ReactElement {
  const capabilities = useCapabilitiesV1(props.effectiveCapabilities);
  const [confirmed, setConfirmed] = useState(false);
  const [inspectedFixtureId, setInspectedFixtureId] = useState<string | null>(null);

  return (
    <section aria-label="PoC 夹具工具">
      <label>
        <input
          checked={confirmed}
          disabled={!capabilities.cheats}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          type="checkbox"
        />
        我确认载入所选夹具
      </label>
      <FixtureBrowserV1
        listFixtures={props.debugTools.listFixtures}
        inspectFixture={(fixtureId) => setInspectedFixtureId(fixtureId)}
        anchorFixture={async (fixtureId) =>
          normalizeAnchorResultV1(await props.debugTools.anchorFixture(fixtureId))
        }
        canAnchor={capabilities.cheats && confirmed}
        disabledReason={capabilities.cheats ? "请先确认载入所选夹具" : "需要启用作弊功能"}
      />
      {inspectedFixtureId === null ? null : <p>当前检查：{inspectedFixtureId}</p>}
    </section>
  );
}

function diagnosticEntriesV1(
  result: Exclude<PocDiagnosticQueryResultV1, { readonly kind: "validation_failed" }>,
): DiagnosticInspectorQueryResultV1 {
  return Object.freeze({
    kind: "diagnostics" as const,
    entries: Object.freeze([
      Object.freeze({
        id: "invariants",
        label: "不变量",
        value:
          result.diagnostics.invariantCodes.length === 0
            ? "无"
            : result.diagnostics.invariantCodes.join("、"),
      }),
      Object.freeze({
        id: "recent_errors",
        label: "最近错误",
        value:
          result.diagnostics.recentErrorCodes.length === 0
            ? "无"
            : result.diagnostics.recentErrorCodes.join("、"),
      }),
      Object.freeze({
        id: "hmr",
        label: "HMR 状态",
        value: result.diagnostics.hmrInvalidated ? "已失效" : "有效",
      }),
      Object.freeze({
        id: "command_log",
        label: "命令日志条目",
        value: String(result.commandLogEntryCount),
      }),
    ]),
  });
}

function PocDiagnosticsPanelV1(props: {
  readonly debugTools: PocToolingUiDebugToolsV1;
}): ReactElement {
  const queryDiagnostics = useCallback(async (): Promise<DiagnosticInspectorQueryResultV1> => {
    const result = await props.debugTools.queryDiagnostics(Object.freeze({ kind: "summary" }));
    if (result.kind === "capability_disabled") return result;
    if (result.kind === "validation_failed") {
      throw new TypeError("PoC diagnostics summary query was rejected");
    }
    return diagnosticEntriesV1(result);
  }, [props.debugTools]);

  return (
    <DiagnosticInspectorV1
      queryDiagnostics={queryDiagnostics}
      classification={Object.freeze({ kind: "restorable" as const })}
    />
  );
}

function PocNotesPanelV1(): ReactElement {
  return (
    <section aria-label="PoC 工具说明">
      <h3>工具说明</h3>
      <ul aria-label="PoC 工具说明">
        {pocToolingNotesV1.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}

/** Composes browser-only Story panels from narrow Application ports. */
export function pocToolingUiContributionsV1(
  input: PocToolingUiContributionsInputV1,
): DevDockContributionSetV1 {
  const sessionRequested = Object.freeze([...input.sessionRequested]);
  return createDevDockContributionSetV1({
    panels: [
      {
        id: "poc.capabilities",
        side: "left",
        title: "运行时能力",
        authority: "read_only",
        render: () => (
          <CapabilityPanelV1
            persistedCapabilities={input.persistedCapabilities}
            effectiveCapabilities={input.effectiveCapabilities}
            sessionRequested={sessionRequested}
          />
        ),
      },
      {
        id: "poc.notes",
        side: "left",
        title: "工具说明",
        authority: "read_only",
        render: () => <PocNotesPanelV1 />,
      },
      {
        id: "poc.diagnostics",
        side: "left",
        title: "诊断",
        authority: "read_only",
        render: () => <PocDiagnosticsPanelV1 debugTools={input.debugTools} />,
      },
      {
        id: "poc.fixtures",
        side: "right",
        title: "夹具",
        authority: "read_only",
        render: () => (
          <PocFixturePanelV1
            debugTools={input.debugTools}
            effectiveCapabilities={input.effectiveCapabilities}
          />
        ),
      },
      {
        id: "poc.debug_commands",
        side: "right",
        title: "调试命令",
        authority: "cheat",
        render: () => (
          <PocDebugCommandsPanelV1
            debugTools={input.debugTools}
            effectiveCapabilities={input.effectiveCapabilities}
          />
        ),
      },
    ],
  });
}
