// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, RuntimeCapabilitiesV1 } from "@sillymaker/base";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { e2eToolingUiContributionsV1 } from "./ui-contributions.js";
import type { E2eToolingUiDebugToolsPortV1 } from "./ui-contributions.js";
import type { E2eDebugCommandV1 } from "../gameplay/contracts/index.js";
import { e2eDebugCommandKindsV1 } from "../tooling/debug-command-form-adapter.js";

afterEach(cleanup);

function createCapabilityFixtureV1() {
  let effective: DeepReadonly<RuntimeCapabilitiesV1> = Object.freeze({
    debugTools: true,
    cheats: true,
    automationBridge: false,
  });
  let persisted: DeepReadonly<RuntimeCapabilitiesV1> = Object.freeze({
    debugTools: false,
    cheats: false,
    automationBridge: false,
  });
  const effectiveListeners = new Set<() => void>();
  const persistedListeners = new Set<() => void>();
  return {
    effective: Object.freeze({
      getCurrent: () => effective,
      subscribe(listener: () => void) {
        effectiveListeners.add(listener);
        return () => effectiveListeners.delete(listener);
      },
    }),
    persisted: Object.freeze({
      state: Object.freeze({
        getCurrent: () => persisted,
        subscribe(listener: () => void) {
          persistedListeners.add(listener);
          return () => persistedListeners.delete(listener);
        },
      }),
      async setEnabled(
        capability: "debug_tools" | "cheats" | "automation_bridge",
        enabled: boolean,
      ) {
        const field =
          capability === "debug_tools"
            ? "debugTools"
            : capability === "cheats"
              ? "cheats"
              : "automationBridge";
        persisted = Object.freeze({ ...persisted, [field]: enabled });
        for (const listener of [...persistedListeners]) listener();
        return Object.freeze({ kind: "updated" as const, state: persisted });
      },
    }),
    publishEffective(next: { readonly debugTools: boolean; readonly cheats: boolean }) {
      effective = Object.freeze({ ...effective, ...next });
      for (const listener of [...effectiveListeners]) listener();
    },
  };
}

function createDebugToolsFixtureV1() {
  type DebugToolsV1 = E2eToolingUiDebugToolsPortV1<"fixture.e2e.initial">;
  type ListResultV1 = Awaited<ReturnType<DebugToolsV1["listFixtures"]>>;
  type CommandResultV1 = Awaited<ReturnType<DebugToolsV1["executeDebugCommand"]>>;
  type AnchorResultV1 = Awaited<ReturnType<DebugToolsV1["anchorFixture"]>>;
  type DiagnosticResultV1 = Awaited<ReturnType<DebugToolsV1["queryDiagnostics"]>>;
  return Object.freeze({
    listFixtures: vi.fn(async (): Promise<ListResultV1> =>
      Object.freeze({
        kind: "listed" as const,
        fixtureIds: Object.freeze(["fixture.e2e.initial"] as const),
      }),
    ),
    executeDebugCommand: vi.fn(
      async (_command: DeepReadonly<E2eDebugCommandV1>): Promise<CommandResultV1> =>
        Object.freeze({
          kind: "committed" as const,
          commandSequence: parsePositiveSafeInteger(1),
        }),
    ),
    anchorFixture: vi.fn(async (_fixtureId: "fixture.e2e.initial"): Promise<AnchorResultV1> =>
      Object.freeze({
        kind: "anchor_established" as const,
        commandSequence: parseNonNegativeSafeInteger(0),
      }),
    ),
    queryDiagnostics: vi.fn(
      async (_query: DeepReadonly<{ readonly kind: "summary" }>): Promise<DiagnosticResultV1> =>
        Object.freeze({
          kind: "summary" as const,
          diagnostics: Object.freeze({
            invariantCodes: Object.freeze([]),
            recentErrorCodes: Object.freeze(["e2e.runtime.unexpected"]),
            hmrInvalidated: false,
          }),
          commandLogEntryCount: parseNonNegativeSafeInteger(3),
        }),
    ),
  }) satisfies DebugToolsV1;
}

function createContributionsFixtureV1() {
  const capabilities = createCapabilityFixtureV1();
  const debugTools = createDebugToolsFixtureV1();
  const contributions = e2eToolingUiContributionsV1({
    debugTools,
    effectiveCapabilities: capabilities.effective,
    persistedCapabilities: capabilities.persisted,
    sessionRequested: Object.freeze(["debug_tools", "cheats"]),
  });
  return Object.freeze({ capabilities, contributions, debugTools });
}

function renderPanelV1(
  contributions: ReturnType<typeof e2eToolingUiContributionsV1>,
  panelId: string,
) {
  const panel = contributions.panels.find(({ id }) => id === panelId);
  if (panel === undefined) throw new TypeError(`missing panel ${panelId}`);
  render(panel.render());
  return panel;
}

describe("e2eToolingUiContributionsV1", () => {
  it("freezes a bounded Story-local registry without importing PoC", () => {
    const { contributions } = createContributionsFixtureV1();

    expect(Object.isFrozen(contributions)).toBe(true);
    expect(Object.isFrozen(contributions.panels)).toBe(true);
    expect(contributions.panels.map(({ id, authority }) => [id, authority])).toEqual([
      ["e2e.capabilities", "read_only"],
      ["e2e.diagnostics", "read_only"],
      ["e2e.fixtures", "read_only"],
      ["e2e.commands", "cheat"],
    ]);
    expect(JSON.stringify(contributions)).not.toMatch(
      /project-tavern\/story-poc|GameSnapshot|Session/u,
    );
  });

  it("exposes exactly the existing four controlled command variants", () => {
    const { contributions } = createContributionsFixtureV1();
    renderPanelV1(contributions, "e2e.commands");

    expect(
      screen
        .getAllByRole("region", { name: /^debug\.e2e\./u })
        .map((region) => region.getAttribute("aria-label")),
    ).toEqual(e2eDebugCommandKindsV1);
    expect(screen.getAllByRole("button", { name: "执行调试命令" })).toHaveLength(4);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("requires an operation-local confirmation and normalizes committed results", async () => {
    const { contributions, debugTools } = createContributionsFixtureV1();
    renderPanelV1(contributions, "e2e.commands");
    const counter = screen.getByRole("region", { name: "debug.e2e.counter.add" });
    const execute = within(counter).getByRole("button", { name: "执行调试命令" });

    expect(execute).toBeDisabled();
    await userEvent.setup().click(within(counter).getByRole("checkbox"));
    await userEvent.setup().click(execute);

    await waitFor(() => expect(debugTools.executeDebugCommand).toHaveBeenCalledTimes(1));
    expect(debugTools.executeDebugCommand).toHaveBeenCalledWith({
      kind: "debug.e2e.counter.add",
      amount: 1,
    });
    expect(within(counter).getByText("调试命令已提交（序列 1）")).toBeVisible();
  });

  it.each([
    [
      "validation_failed",
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "e2e.debug.unsupported" }),
      }),
      "调试命令被拒绝：e2e.debug.unsupported",
    ],
    [
      "faulted",
      Object.freeze({
        kind: "faulted" as const,
        fault: Object.freeze({ code: "e2e.runtime.unexpected" }),
      }),
      "调试命令故障：e2e.runtime.unexpected",
    ],
    [
      "capability_disabled",
      Object.freeze({ kind: "capability_disabled" as const }),
      "调试工具已关闭",
    ],
  ])("does not present %s as command success", async (_kind, result, expectedText) => {
    const fixture = createContributionsFixtureV1();
    fixture.debugTools.executeDebugCommand.mockResolvedValueOnce(result);
    renderPanelV1(fixture.contributions, "e2e.commands");
    const command = screen.getByRole("region", { name: "debug.e2e.test.validation_failed" });
    await userEvent.setup().click(within(command).getByRole("checkbox"));
    await userEvent.setup().click(within(command).getByRole("button", { name: "执行调试命令" }));

    expect(await within(command).findByText(expectedText)).toBeVisible();
    expect(within(command).queryByText(/已提交/u)).not.toBeInTheDocument();
  });

  it("lists fixtures read-only and requires separate confirmation before anchoring", async () => {
    const { contributions, debugTools } = createContributionsFixtureV1();
    renderPanelV1(contributions, "e2e.fixtures");

    expect(await screen.findByText("fixture.e2e.initial")).toBeVisible();
    const anchor = screen.getByRole("button", { name: "载入夹具 fixture.e2e.initial" });
    expect(anchor).toBeDisabled();
    expect(debugTools.anchorFixture).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("checkbox"));
    await userEvent.setup().click(anchor);

    expect(await screen.findByText("夹具已载入")).toBeVisible();
    expect(debugTools.anchorFixture).toHaveBeenCalledWith("fixture.e2e.initial");
  });

  it.each([
    [
      "validation_failed",
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "e2e.debug.fixture_invalid" }),
      }),
      "夹具载入被拒绝：e2e.debug.fixture_invalid",
    ],
    [
      "faulted",
      Object.freeze({
        kind: "faulted" as const,
        fault: Object.freeze({ code: "e2e.runtime.unexpected" }),
      }),
      "夹具载入故障：e2e.runtime.unexpected",
    ],
    [
      "capability_disabled",
      Object.freeze({ kind: "capability_disabled" as const }),
      "调试工具已关闭",
    ],
  ])("does not present %s as fixture success", async (_kind, result, expectedText) => {
    const fixture = createContributionsFixtureV1();
    fixture.debugTools.anchorFixture.mockResolvedValueOnce(result);
    renderPanelV1(fixture.contributions, "e2e.fixtures");
    await screen.findByText("fixture.e2e.initial");
    await userEvent.setup().click(screen.getByRole("checkbox"));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "载入夹具 fixture.e2e.initial" }));

    expect(await screen.findByText(expectedText)).toBeVisible();
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();
  });

  it("keeps effective Cheats plus local confirmation as independent execution gates", async () => {
    const fixture = createContributionsFixtureV1();
    fixture.capabilities.publishEffective({ debugTools: true, cheats: false });
    renderPanelV1(fixture.contributions, "e2e.commands");
    const command = screen.getByRole("region", { name: "debug.e2e.test.fault" });
    await userEvent.setup().click(within(command).getByRole("checkbox"));
    expect(within(command).getByRole("button", { name: "执行调试命令" })).toBeDisabled();
    expect(fixture.debugTools.executeDebugCommand).not.toHaveBeenCalled();
  });

  it("maps a diagnostic summary to bounded text entries and fails closed on validation", async () => {
    const fixture = createContributionsFixtureV1();
    renderPanelV1(fixture.contributions, "e2e.diagnostics");
    await userEvent.setup().click(screen.getByRole("button", { name: "诊断摘要" }));

    const summary = await screen.findByRole("list", { name: "诊断摘要" });
    expect(within(summary).getAllByRole("listitem")).toHaveLength(3);
    expect(summary).toHaveTextContent("命令日志条目：3");
    expect(summary).toHaveTextContent("最近错误：e2e.runtime.unexpected");

    cleanup();
    const rejected = createContributionsFixtureV1();
    rejected.debugTools.queryDiagnostics.mockResolvedValueOnce(
      Object.freeze({
        kind: "validation_failed" as const,
        code: "debug.diagnostics_query_invalid" as const,
      }),
    );
    renderPanelV1(rejected.contributions, "e2e.diagnostics");
    await userEvent.setup().click(screen.getByRole("button", { name: "诊断摘要" }));
    expect(await screen.findByText("无法读取诊断摘要")).toBeVisible();
    expect(screen.queryByRole("list", { name: "诊断摘要" })).not.toBeInTheDocument();
  });
});
