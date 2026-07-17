// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type {
  DebugFixtureListResultV1,
  DebugToolsOperationResultV1,
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

import type { E2eDebugCommandV1 } from "../gameplay/contracts/index.js";
import { e2eDebugCommandFormAdapterV1 } from "../tooling/debug-command-form-adapter.js";

type E2eToolingDebugCommandResultV1 =
  | { readonly kind: "validation_failed"; readonly error: { readonly code: string } }
  | { readonly kind: "committed"; readonly commandSequence: number }
  | { readonly kind: "faulted"; readonly fault: { readonly code: string } };

type E2eToolingDebugAnchorResultV1 =
  | { readonly kind: "validation_failed"; readonly error: { readonly code: string } }
  | { readonly kind: "anchor_established"; readonly commandSequence: number }
  | { readonly kind: "faulted"; readonly fault: { readonly code: string } };

type E2eToolingDiagnosticQueryResultV1 =
  | { readonly kind: "validation_failed"; readonly code: string }
  | {
      readonly kind: "summary";
      readonly diagnostics: {
        readonly invariantCodes: readonly string[];
        readonly recentErrorCodes: readonly string[];
        readonly hmrInvalidated: boolean;
      };
      readonly commandLogEntryCount: number;
    };

export interface E2eToolingUiDebugToolsPortV1<TFixtureId extends string> {
  listFixtures(): Promise<DebugFixtureListResultV1<TFixtureId>>;
  executeDebugCommand(
    command: DeepReadonly<E2eDebugCommandV1>,
  ): Promise<DebugToolsOperationResultV1<E2eToolingDebugCommandResultV1>>;
  anchorFixture(
    fixtureId: TFixtureId,
  ): Promise<DebugToolsOperationResultV1<E2eToolingDebugAnchorResultV1>>;
  queryDiagnostics(
    query: DeepReadonly<{ readonly kind: "summary" }>,
  ): Promise<DebugToolsOperationResultV1<E2eToolingDiagnosticQueryResultV1>>;
}

export interface E2eToolingUiContributionsInputV1<TFixtureId extends string> {
  readonly debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  readonly persistedCapabilities: RuntimeCapabilityPortV1;
  readonly sessionRequested: readonly RuntimeCapabilityIdV1[];
}

const currentDiagnosticContextV1 = Object.freeze({ kind: "restorable" as const });
const e2eControlledDebugCommandsV1 = Object.freeze([
  Object.freeze({
    kind: "debug.e2e.counter.add" as const,
    amount: parsePositiveSafeInteger(1),
  }),
  Object.freeze({ kind: "debug.e2e.flow.set_blocked" as const, blocked: true }),
  Object.freeze({ kind: "debug.e2e.test.validation_failed" as const }),
  Object.freeze({ kind: "debug.e2e.test.fault" as const }),
] satisfies readonly E2eDebugCommandV1[]);

function useRuntimeCapabilitiesV1(
  source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>,
): DeepReadonly<RuntimeCapabilitiesV1> {
  return useSyncExternalStore(source.subscribe, source.getCurrent, source.getCurrent);
}

function unsupportedToolingResultV1(_result: never): never {
  throw new TypeError("e2e.tooling_ui.unsupported_result");
}

async function executeDebugCommandV1<TFixtureId extends string>(
  debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>,
  command: DeepReadonly<E2eDebugCommandV1>,
): Promise<DebugToolsOperationResultV1<DebugCommandOperationResultV1>> {
  const result = await debugTools.executeDebugCommand(
    e2eDebugCommandFormAdapterV1.toCommand(command),
  );
  switch (result.kind) {
    case "capability_disabled":
      return result;
    case "committed":
      return Object.freeze({
        kind: "handled" as const,
        message: `调试命令已提交（序列 ${result.commandSequence}）`,
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
  return unsupportedToolingResultV1(result);
}

async function anchorFixtureV1<TFixtureId extends string>(
  debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>,
  fixtureId: TFixtureId,
): Promise<DebugToolsOperationResultV1<FixtureBrowserAnchorResultV1>> {
  const result = await debugTools.anchorFixture(fixtureId);
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
  return unsupportedToolingResultV1(result);
}

async function queryDiagnosticsV1<TFixtureId extends string>(
  debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>,
): Promise<DiagnosticInspectorQueryResultV1> {
  const result = await debugTools.queryDiagnostics(Object.freeze({ kind: "summary" as const }));
  if (result.kind === "capability_disabled") return result;
  if (result.kind === "validation_failed") {
    throw new TypeError(`e2e.tooling_ui.diagnostics_rejected:${result.code}`);
  }
  const recentErrorCodes = result.diagnostics.recentErrorCodes.slice(0, 16);
  return Object.freeze({
    kind: "diagnostics" as const,
    entries: Object.freeze([
      Object.freeze({
        id: "command-log-entry-count",
        label: "命令日志条目",
        value: String(result.commandLogEntryCount),
      }),
      Object.freeze({
        id: "hmr-invalidated",
        label: "HMR 已失效",
        value: result.diagnostics.hmrInvalidated ? "是" : "否",
      }),
      Object.freeze({
        id: "recent-error-codes",
        label: "最近错误",
        value: recentErrorCodes.length === 0 ? "无" : recentErrorCodes.join("、"),
      }),
    ]),
  });
}

function E2eDebugCommandFormV1<TFixtureId extends string>(props: {
  readonly command: DeepReadonly<E2eDebugCommandV1>;
  readonly debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
}): ReactElement {
  const capabilities = useRuntimeCapabilitiesV1(props.effectiveCapabilities);
  const [confirmed, setConfirmed] = useState(false);
  const executeDebugCommand = useCallback(
    async (command: DeepReadonly<E2eDebugCommandV1>) =>
      await executeDebugCommandV1(props.debugTools, command),
    [props.debugTools],
  );
  return (
    <section role="region" aria-label={props.command.kind}>
      <h4>{props.command.kind}</h4>
      <label>
        <input
          checked={confirmed}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          type="checkbox"
        />
        确认执行此调试命令
      </label>
      <DebugCommandPanelV1
        fields={<p>受控命令：{props.command.kind}</p>}
        command={props.command}
        executeDebugCommand={executeDebugCommand}
        canExecute={capabilities.cheats && confirmed}
        disabledReason={capabilities.cheats ? "请先确认本次调试命令" : "需要启用作弊功能"}
      />
    </section>
  );
}

function E2eDebugCommandsPanelV1<TFixtureId extends string>(props: {
  readonly debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
}): ReactElement {
  return (
    <section aria-label="E2E 调试命令">
      <h3>E2E 调试命令</h3>
      {e2eControlledDebugCommandsV1.map((command) => (
        <E2eDebugCommandFormV1
          key={command.kind}
          command={command}
          debugTools={props.debugTools}
          effectiveCapabilities={props.effectiveCapabilities}
        />
      ))}
    </section>
  );
}

function E2eFixturePanelV1<TFixtureId extends string>(props: {
  readonly debugTools: E2eToolingUiDebugToolsPortV1<TFixtureId>;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
}): ReactElement {
  const capabilities = useRuntimeCapabilitiesV1(props.effectiveCapabilities);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <section aria-label="E2E 夹具工具">
      <label>
        <input
          checked={confirmed}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          type="checkbox"
        />
        确认载入夹具
      </label>
      <FixtureBrowserV1
        listFixtures={props.debugTools.listFixtures}
        inspectFixture={async () => undefined}
        anchorFixture={(fixtureId) => anchorFixtureV1(props.debugTools, fixtureId)}
        canAnchor={capabilities.cheats && confirmed}
        disabledReason={capabilities.cheats ? "请先确认本次夹具载入" : "需要启用作弊功能"}
      />
    </section>
  );
}

/** Builds the browser-only, Story-local panels over narrow Application ports. */
export function e2eToolingUiContributionsV1<TFixtureId extends string>(
  input: E2eToolingUiContributionsInputV1<TFixtureId>,
): DevDockContributionSetV1 {
  const sessionRequested = Object.freeze([...input.sessionRequested]);
  return createDevDockContributionSetV1({
    panels: [
      {
        id: "e2e.capabilities",
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
        id: "e2e.diagnostics",
        side: "left",
        title: "诊断",
        authority: "read_only",
        render: () => (
          <DiagnosticInspectorV1
            classification={currentDiagnosticContextV1}
            queryDiagnostics={() => queryDiagnosticsV1(input.debugTools)}
          />
        ),
      },
      {
        id: "e2e.fixtures",
        side: "right",
        title: "夹具",
        authority: "read_only",
        render: () => (
          <E2eFixturePanelV1
            debugTools={input.debugTools}
            effectiveCapabilities={input.effectiveCapabilities}
          />
        ),
      },
      {
        id: "e2e.commands",
        side: "right",
        title: "调试命令",
        authority: "cheat",
        render: () => (
          <E2eDebugCommandsPanelV1
            debugTools={input.debugTools}
            effectiveCapabilities={input.effectiveCapabilities}
          />
        ),
      },
    ],
  });
}
