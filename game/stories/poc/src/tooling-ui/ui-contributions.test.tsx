// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import type {
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PocToolingUiDebugToolsV1 } from "./ui-contributions.js";
import { pocToolingUiContributionsV1 } from "./ui-contributions.js";

function capabilityFixtureV1(state: RuntimeCapabilitiesV1): {
  readonly port: RuntimeCapabilityPortV1;
  readonly setEnabled: ReturnType<typeof vi.fn>;
} {
  let current = Object.freeze({ ...state });
  const listeners = new Set<() => void>();
  const source = Object.freeze({
    getCurrent: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  const setEnabled = vi.fn(async (capability: string, enabled: boolean) => {
    current = Object.freeze({
      ...current,
      ...(capability === "debug_tools" ? { debugTools: enabled } : {}),
      ...(capability === "cheats" ? { cheats: enabled } : {}),
      ...(capability === "automation_bridge" ? { automationBridge: enabled } : {}),
    });
    for (const listener of listeners) listener();
    return Object.freeze({ kind: "updated" as const, state: current });
  });
  return { port: Object.freeze({ state: source, setEnabled }), setEnabled };
}

function debugToolsFixtureV1(): PocToolingUiDebugToolsV1 & {
  readonly listFixtures: ReturnType<typeof vi.fn>;
  readonly executeDebugCommand: ReturnType<typeof vi.fn>;
  readonly anchorFixture: ReturnType<typeof vi.fn>;
  readonly queryDiagnostics: ReturnType<typeof vi.fn>;
} {
  return Object.freeze({
    listFixtures: vi.fn(async () =>
      Object.freeze({ kind: "listed" as const, fixtureIds: Object.freeze(["fixture.poc.week"]) }),
    ),
    executeDebugCommand: vi.fn(async () =>
      Object.freeze({ kind: "committed" as const, commandSequence: 1 }),
    ),
    anchorFixture: vi.fn(async () =>
      Object.freeze({ kind: "anchor_established" as const, commandSequence: 0 }),
    ),
    queryDiagnostics: vi.fn(async () =>
      Object.freeze({
        kind: "summary" as const,
        diagnostics: Object.freeze({
          invariantCodes: Object.freeze([]),
          recentErrorCodes: Object.freeze([]),
          hmrInvalidated: false,
        }),
        commandLogEntryCount: 0,
      }),
    ),
  }) as ReturnType<typeof debugToolsFixtureV1>;
}

function createContributionsV1(input?: {
  readonly cheats?: boolean;
  readonly persistedCheats?: boolean;
  readonly sessionRequested?: readonly ("debug_tools" | "cheats" | "automation_bridge")[];
  readonly debugTools?: PocToolingUiDebugToolsV1;
}) {
  const effective = capabilityFixtureV1({
    debugTools: true,
    cheats: input?.cheats ?? false,
    automationBridge: false,
  });
  const persisted = capabilityFixtureV1({
    debugTools: false,
    cheats: input?.persistedCheats ?? false,
    automationBridge: false,
  });
  const debugTools = input?.debugTools ?? debugToolsFixtureV1();
  return {
    contributions: pocToolingUiContributionsV1({
      debugTools,
      effectiveCapabilities: effective.port.state as ReadonlyViewSourceV1<RuntimeCapabilitiesV1>,
      persistedCapabilities: persisted.port,
      sessionRequested: input?.sessionRequested ?? Object.freeze(["debug_tools"]),
    }),
    debugTools,
    persisted,
  };
}

function renderPanelV1(
  contributions: ReturnType<typeof pocToolingUiContributionsV1>,
  panelId: string,
): void {
  const panel = contributions.panels.find(({ id }) => id === panelId);
  if (panel === undefined) throw new TypeError(`missing test panel ${panelId}`);
  render(<>{panel.render()}</>);
}

afterEach(cleanup);

describe("PoC tooling UI contributions", () => {
  it("builds one frozen bounded registry with read-only fixture inspection", () => {
    const { contributions } = createContributionsV1();

    expect(contributions.panels.map(({ id, authority }) => [id, authority])).toEqual([
      ["poc.capabilities", "read_only"],
      ["poc.notes", "read_only"],
      ["poc.diagnostics", "read_only"],
      ["poc.fixtures", "read_only"],
      ["poc.debug_commands", "cheat"],
    ]);
    expect(Object.isFrozen(contributions)).toBe(true);
    expect(Object.isFrozen(contributions.panels)).toBe(true);
  });

  it("shows session-requested capability state without writing persisted preferences", () => {
    const { contributions, persisted } = createContributionsV1({
      sessionRequested: Object.freeze(["debug_tools", "cheats"]),
      cheats: true,
    });

    renderPanelV1(contributions, "poc.capabilities");

    expect(screen.getByText("调试工具由本次会话请求启用")).toBeVisible();
    expect(screen.getByText("作弊功能由本次会话请求启用")).toBeVisible();
    expect(screen.getByRole("switch", { name: "调试工具" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "作弊功能" })).toBeDisabled();
    expect(persisted.setEnabled).not.toHaveBeenCalled();
  });

  it("keeps fixture list and inspection available without cheats but blocks anchoring", async () => {
    const fixture = createContributionsV1({ cheats: false });
    renderPanelV1(fixture.contributions, "poc.fixtures");

    expect(await screen.findByText("fixture.poc.week")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "检查夹具 fixture.poc.week" }));
    expect(screen.getByText("当前检查：fixture.poc.week")).toBeVisible();
    expect(screen.getByRole("button", { name: "载入夹具 fixture.poc.week" })).toBeDisabled();
    expect(fixture.debugTools.anchorFixture).not.toHaveBeenCalled();
  });

  it("requires an operation-local confirmation before fixture anchoring", async () => {
    const fixture = createContributionsV1({ cheats: true });
    const user = userEvent.setup();
    renderPanelV1(fixture.contributions, "poc.fixtures");
    const anchor = await screen.findByRole("button", { name: "载入夹具 fixture.poc.week" });
    const confirmation = screen.getByRole("checkbox", { name: "我确认载入所选夹具" });

    expect(anchor).toBeDisabled();
    await user.click(confirmation);
    expect(anchor).toBeEnabled();
    await user.click(anchor);

    expect(fixture.debugTools.anchorFixture).toHaveBeenCalledWith("fixture.poc.week");
    expect(await screen.findByText("夹具已载入")).toBeVisible();
    expect(confirmation).toBeChecked();
  });

  it.each([
    [
      "validation_failed",
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
      }),
      "夹具载入被拒绝：debug.bundle_replay_mismatch",
    ],
    [
      "faulted",
      Object.freeze({
        kind: "faulted" as const,
        fault: Object.freeze({ code: "runtime.unexpected_failure" as const }),
      }),
      "夹具载入故障：runtime.unexpected_failure",
    ],
    [
      "capability_disabled",
      Object.freeze({ kind: "capability_disabled" as const }),
      "调试工具已关闭",
    ],
  ])("does not present %s as fixture success", async (_kind, result, expectedText) => {
    const debugTools = debugToolsFixtureV1();
    debugTools.anchorFixture.mockResolvedValueOnce(result);
    const fixture = createContributionsV1({ cheats: true, debugTools });
    const user = userEvent.setup();
    renderPanelV1(fixture.contributions, "poc.fixtures");
    await screen.findByText("fixture.poc.week");
    await user.click(screen.getByRole("checkbox", { name: "我确认载入所选夹具" }));
    await user.click(screen.getByRole("button", { name: "载入夹具 fixture.poc.week" }));

    expect(await screen.findByText(expectedText)).toBeVisible();
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();
  });

  it("renders all ten controlled forms and normalizes success, rejection, and revocation", async () => {
    const debugTools = debugToolsFixtureV1();
    debugTools.executeDebugCommand
      .mockResolvedValueOnce({ kind: "committed", commandSequence: 1 })
      .mockResolvedValueOnce({
        kind: "validation_failed",
        error: { code: "debug.command_schema_invalid" },
      })
      .mockResolvedValueOnce({
        kind: "faulted",
        fault: { code: "runtime.unexpected_failure" },
      })
      .mockResolvedValueOnce({ kind: "capability_disabled" });
    const fixture = createContributionsV1({ cheats: true, debugTools });
    const user = userEvent.setup();
    renderPanelV1(fixture.contributions, "poc.debug_commands");

    expect(screen.getAllByRole("region", { name: /^PoC 调试命令：/ })).toHaveLength(10);
    const calendar = screen.getByRole("region", { name: "PoC 调试命令：设置行动点" });
    const confirmation = within(calendar).getByRole("checkbox", {
      name: "我确认执行设置行动点",
    });
    const execute = within(calendar).getByRole("button", { name: "执行调试命令" });
    expect(execute).toBeDisabled();

    await user.click(confirmation);
    await user.click(execute);
    expect(await within(calendar).findByText("调试命令已提交（序号 1）")).toBeVisible();
    expect(debugTools.executeDebugCommand).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "debug.calendar.set_ap" }),
    );

    await user.click(execute);
    expect(await within(calendar).findByRole("alert")).toHaveTextContent(
      "调试命令被拒绝：debug.command_schema_invalid",
    );

    await user.click(execute);
    expect(await within(calendar).findByRole("alert")).toHaveTextContent(
      "调试命令故障：runtime.unexpected_failure",
    );

    await user.click(execute);
    expect(await within(calendar).findByText("调试工具已关闭")).toBeVisible();
  });

  it("maps bounded PoC diagnostics into neutral text entries", async () => {
    const debugTools = debugToolsFixtureV1();
    debugTools.queryDiagnostics.mockResolvedValueOnce({
      kind: "summary",
      diagnostics: {
        invariantCodes: ["ledger.unbalanced"],
        recentErrorCodes: ["runtime.unexpected_failure"],
        hmrInvalidated: true,
      },
      commandLogEntryCount: 2,
    });
    const fixture = createContributionsV1({ debugTools });
    renderPanelV1(fixture.contributions, "poc.diagnostics");

    await userEvent.setup().click(screen.getByRole("button", { name: "诊断摘要" }));

    expect(await screen.findByText("不变量：ledger.unbalanced")).toBeVisible();
    expect(screen.getByText("最近错误：runtime.unexpected_failure")).toBeVisible();
    expect(screen.getByText("HMR 状态：已失效")).toBeVisible();
    expect(screen.getByText("命令日志条目：2")).toBeVisible();
  });

  it("renders only code-native notes and never exposes a raw JSON/path/specifier field", () => {
    const { contributions } = createContributionsV1();
    renderPanelV1(contributions, "poc.notes");

    expect(screen.getByRole("list", { name: "PoC 工具说明" })).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("@project-tavern/story-poc/tooling");
    expect(document.body.textContent).not.toContain("simulation.");
  });
});
