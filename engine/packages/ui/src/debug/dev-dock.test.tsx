// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseInputActionIdV1 } from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameShell } from "../shell/game-shell.js";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapabilityPanelV1 } from "./CapabilityPanel.js";
import { DebugCommandPanelV1 } from "./DebugCommandPanel.js";
import { DevDockV1, createDevDockContributionSetV1 } from "./DevDock.js";
import type { DevDockOpenStateV1, DevDockPanelV1 } from "./DevDock.js";
import { DiagnosticInspectorV1 } from "./DiagnosticInspector.js";
import { FixtureBrowserV1 } from "./FixtureBrowser.js";
import {
  useDevDockPortalTargetRegistrationV1,
  type DevDockPortalSurfaceV1,
} from "./DevDockPortalCoordinator.js";
import { OverlayHostV1 } from "../overlays/overlay-host.js";
import { createOverlaySessionStoreV1 } from "../overlays/overlay-session-store.js";
import { SettingsLauncherV1 } from "../system/settings-launcher.js";
import { SystemDialogHostV1 } from "../system/system-dialog-host.js";

afterEach(cleanup);

const closedDockStateV1 = Object.freeze({ leftOpen: false, rightOpen: false });

function createDeferredV1<T>() {
  let resolveDeferred!: (value: T | PromiseLike<T>) => void;
  let rejectDeferred!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolveDeferred = resolvePromise;
    rejectDeferred = rejectPromise;
  });
  return Object.freeze({ promise, reject: rejectDeferred, resolve: resolveDeferred });
}

function createCapabilityFixtureV1(input: {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge?: boolean;
}) {
  let current = Object.freeze({
    debugTools: input.debugTools,
    cheats: input.cheats,
    automationBridge: input.automationBridge ?? false,
  });
  const listeners = new Set<() => void>();
  const setEnabled = vi.fn(async (capability: string, enabled: boolean) => {
    const field =
      capability === "debug_tools"
        ? "debugTools"
        : capability === "cheats"
          ? "cheats"
          : "automationBridge";
    current = Object.freeze({ ...current, [field]: enabled });
    for (const listener of [...listeners]) listener();
    return Object.freeze({ kind: "updated" as const, state: current });
  });
  return {
    port: Object.freeze({
      state: Object.freeze({
        getCurrent: () => current,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      }),
      setEnabled,
    }),
    publish(next: {
      readonly debugTools: boolean;
      readonly cheats: boolean;
      readonly automationBridge: boolean;
    }) {
      current = Object.freeze({ ...next });
      for (const listener of [...listeners]) listener();
    },
    setEnabled,
  };
}

function emptyLayersV1(content: ReactNode = null) {
  return Object.freeze({
    background: null,
    character: null,
    sceneInteraction: null,
    hud: content,
    workspaceOverlay: null,
    narrative: null,
    system: null,
  });
}

function DevDockHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
  readonly contributions?: ReturnType<typeof createDevDockContributionSetV1>;
  readonly initialOpenState?: DevDockOpenStateV1;
  readonly stageActivation?: () => void;
  readonly semanticDispatch?: () => void;
}): ReactElement {
  const [openState, setOpenState] = useState<DevDockOpenStateV1>(
    props.initialOpenState ?? closedDockStateV1,
  );
  const inputRouterRef = useRef(createInputRouterV1());
  const contributions =
    props.contributions ?? createDevDockContributionSetV1(Object.freeze({ panels: [] }));
  return (
    <div onClick={props.stageActivation}>
      <GameShell
        accessibleName="测试舞台"
        layers={emptyLayersV1()}
        inputRouter={inputRouterRef.current}
        devDock={
          <DevDockV1
            capabilities={props.capabilities}
            contributions={contributions}
            inputRouter={inputRouterRef.current}
            openState={openState}
            onOpenStateChange={setOpenState}
          />
        }
      />
      <button type="button" onClick={props.semanticDispatch}>
        语义动作
      </button>
    </div>
  );
}

function SyntheticBlockingSurfaceV1(props: {
  readonly kind: DevDockPortalSurfaceV1;
  readonly onClose: () => void;
  readonly opener: HTMLButtonElement | null;
}): ReactElement {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useDevDockPortalTargetRegistrationV1(props.kind, target);
  useLayoutEffect(() => {
    target?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => props.opener?.focus();
  }, [props.opener, target]);
  return (
    <div
      ref={setTarget}
      data-blocking-focus-scope={props.kind}
      role="dialog"
      aria-label={props.kind}
    >
      <button type="button" onClick={props.onClose}>
        关闭阻塞界面
      </button>
    </div>
  );
}

function BlockingSurfaceHarnessV1(props: {
  readonly kind: DevDockPortalSurfaceV1;
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  const [dockState, setDockState] = useState<DevDockOpenStateV1>(closedDockStateV1);
  const inputRouterRef = useRef(createInputRouterV1());
  const surface = open ? (
    <SyntheticBlockingSurfaceV1 kind={props.kind} onClose={() => setOpen(false)} opener={opener} />
  ) : null;
  const layers = Object.freeze({
    ...emptyLayersV1(),
    workspaceOverlay: props.kind === "overlay" ? surface : null,
    narrative: props.kind === "narrative" ? surface : null,
    system: props.kind === "system" || props.kind === "fault_pause" ? surface : null,
  });
  return (
    <>
      <button ref={setOpener} type="button" onClick={() => setOpen(true)}>
        打开阻塞界面
      </button>
      <GameShell
        accessibleName="焦点测试舞台"
        layers={layers}
        inputRouter={inputRouterRef.current}
        devDock={
          <DevDockV1
            capabilities={props.capabilities}
            contributions={createDevDockContributionSetV1({ panels: [] })}
            inputRouter={inputRouterRef.current}
            openState={dockState}
            onOpenStateChange={setDockState}
          />
        }
      />
    </>
  );
}

function StaticPortalTargetV1(props: {
  readonly kind: DevDockPortalSurfaceV1;
  readonly children?: ReactNode;
}): ReactElement {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useDevDockPortalTargetRegistrationV1(props.kind, target);
  return (
    <div ref={setTarget} data-blocking-focus-scope={props.kind}>
      {props.children}
    </div>
  );
}

function PriorityHarnessV1(props: {
  readonly surfaces: readonly DevDockPortalSurfaceV1[];
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
  readonly initialOpenState?: DevDockOpenStateV1;
}): ReactElement {
  const [dockState, setDockState] = useState<DevDockOpenStateV1>(
    props.initialOpenState ?? closedDockStateV1,
  );
  const inputRouterRef = useRef(createInputRouterV1());
  const targets = props.surfaces.map((surface) => (
    <StaticPortalTargetV1 key={surface} kind={surface} />
  ));
  return (
    <>
      <button type="button">无关焦点</button>
      <GameShell
        accessibleName="优先级测试舞台"
        layers={Object.freeze({ ...emptyLayersV1(), system: <>{targets}</> })}
        inputRouter={inputRouterRef.current}
        devDock={
          <DevDockV1
            capabilities={props.capabilities}
            contributions={createDevDockContributionSetV1({ panels: [] })}
            inputRouter={inputRouterRef.current}
            openState={dockState}
            onOpenStateChange={setDockState}
          />
        }
      />
    </>
  );
}

function RealOverlayEscapeHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const storeRef = useRef(createOverlaySessionStoreV1<"inventory">());
  const inputRouterRef = useRef(createInputRouterV1());
  const [dockState, setDockState] = useState<DevDockOpenStateV1>(closedDockStateV1);
  const store = storeRef.current;
  return (
    <GameShell
      accessibleName="真实 Overlay Escape 测试舞台"
      inputRouter={inputRouterRef.current}
      layers={Object.freeze({
        ...emptyLayersV1(),
        hud: (
          <button type="button" onClick={() => store.openPrimary("inventory")}>
            打开真实背包
          </button>
        ),
        workspaceOverlay: (
          <OverlayHostV1
            store={store}
            rendererResolver={Object.freeze({
              resolve: () =>
                Object.freeze({ accessibleName: "真实背包", content: <p>背包内容</p> }),
            })}
            inputRouter={inputRouterRef.current}
            closeLabel="关闭真实背包"
          />
        ),
      })}
      devDock={
        <DevDockV1
          capabilities={props.capabilities}
          contributions={createDevDockContributionSetV1({ panels: [] })}
          inputRouter={inputRouterRef.current}
          openState={dockState}
          onOpenStateChange={setDockState}
        />
      }
    />
  );
}

function RealSystemEscapeHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const inputRouterRef = useRef(createInputRouterV1());
  const [dockState, setDockState] = useState<DevDockOpenStateV1>(closedDockStateV1);
  return (
    <GameShell
      accessibleName="真实 System Escape 测试舞台"
      inputRouter={inputRouterRef.current}
      layers={Object.freeze({
        ...emptyLayersV1(),
        system: (
          <SystemDialogHostV1
            inputRouter={inputRouterRef.current}
            settings={Object.freeze({
              title: "真实设置",
              closeLabel: "关闭真实设置",
              sections: Object.freeze([<section key="fixture">设置内容</section>]),
              emptyText: "没有设置",
            })}
          >
            <SettingsLauncherV1 label="打开真实设置" />
          </SystemDialogHostV1>
        ),
      })}
      devDock={
        <DevDockV1
          capabilities={props.capabilities}
          contributions={createDevDockContributionSetV1({ panels: [] })}
          inputRouter={inputRouterRef.current}
          openState={dockState}
          onOpenStateChange={setDockState}
        />
      }
    />
  );
}

describe("DevDockV1", () => {
  it("mounts no debug chrome while debug_tools is disabled", () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: false, cheats: false });
    render(<DevDockHarnessV1 capabilities={capabilities.port} />);

    expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开右侧开发工具" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /开发工具/u })).not.toBeInTheDocument();
  });

  it.each(["overlay", "narrative", "system", "fault_pause"] as const)(
    "keeps two launchers inside the %s focus scope and restores both focus layers",
    async (surface) => {
      const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
      const user = userEvent.setup();
      render(<BlockingSurfaceHarnessV1 kind={surface} capabilities={capabilities.port} />);

      const opener = screen.getByRole("button", { name: "打开阻塞界面" });
      await user.click(opener);
      const launcher = await screen.findByRole("button", { name: "打开左侧开发工具" });
      expect(launcher.closest("[data-blocking-focus-scope]")).toHaveAttribute(
        "data-blocking-focus-scope",
        surface,
      );
      expect(screen.getAllByRole("button", { name: /打开.+开发工具/u })).toHaveLength(2);

      await user.click(launcher);
      expect(screen.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
      await user.keyboard("{Escape}");
      expect(launcher).toHaveFocus();
      expect(screen.getByRole("dialog", { name: surface })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "关闭阻塞界面" }));
      expect(opener).toHaveFocus();
    },
  );

  it("lets DevDock own the first Escape inside a real Radix Overlay", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const user = userEvent.setup();
    render(<RealOverlayEscapeHarnessV1 capabilities={capabilities.port} />);

    const opener = screen.getByRole("button", { name: "打开真实背包" });
    await user.click(opener);
    const launcher = await screen.findByRole("button", { name: "打开左侧开发工具" });
    await user.click(launcher);
    expect(screen.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实背包" })).toBeVisible();
    expect(screen.queryByRole("complementary", { name: "左侧开发工具" })).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "真实背包" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("lets DevDock own the first Escape inside a real Radix System dialog", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const user = userEvent.setup();
    render(<RealSystemEscapeHarnessV1 capabilities={capabilities.port} />);

    const opener = screen.getByRole("button", { name: "打开真实设置" });
    await user.click(opener);
    const launcher = await screen.findByRole("button", { name: "打开右侧开发工具" });
    await user.click(launcher);
    expect(screen.getByRole("complementary", { name: "右侧开发工具" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实设置" })).toBeVisible();
    expect(screen.queryByRole("complementary", { name: "右侧开发工具" })).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "真实设置" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("uses semantic focus priority rather than registration order for concurrent blockers", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const rendered = render(
      <PriorityHarnessV1
        capabilities={capabilities.port}
        surfaces={["narrative", "system", "overlay"]}
      />,
    );
    const unrelatedFocus = screen.getByRole("button", { name: "无关焦点" });
    unrelatedFocus.focus();

    const launcherScope = () =>
      screen
        .getByRole("button", { name: "打开左侧开发工具" })
        .closest("[data-blocking-focus-scope]")
        ?.getAttribute("data-blocking-focus-scope") ?? "base";
    await waitFor(() => expect(launcherScope()).toBe("system"));

    rendered.rerender(
      <PriorityHarnessV1 capabilities={capabilities.port} surfaces={["narrative", "overlay"]} />,
    );
    await waitFor(() => expect(launcherScope()).toBe("overlay"));
    rendered.rerender(
      <PriorityHarnessV1 capabilities={capabilities.port} surfaces={["narrative"]} />,
    );
    await waitFor(() => expect(launcherScope()).toBe("narrative"));
    rendered.rerender(<PriorityHarnessV1 capabilities={capabilities.port} surfaces={[]} />);
    await waitFor(() => expect(launcherScope()).toBe("base"));

    expect(screen.getAllByRole("button", { name: /打开.+开发工具/u })).toHaveLength(2);
    expect(screen.queryByRole("complementary", { name: /开发工具/u })).not.toBeInTheDocument();
    expect(unrelatedFocus).toHaveFocus();
  });

  it("refocuses an open rail when a higher-priority portal target replaces its DOM", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const rendered = render(
      <PriorityHarnessV1
        capabilities={capabilities.port}
        surfaces={["narrative"]}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );
    const rail = await screen.findByRole("complementary", { name: "左侧开发工具" });
    const close = within(rail).getByRole("button", { name: "关闭左侧开发工具" });
    await waitFor(() =>
      expect(rail.closest("[data-blocking-focus-scope]")).toHaveAttribute(
        "data-blocking-focus-scope",
        "narrative",
      ),
    );
    await waitFor(() => expect(close).toHaveFocus());

    rendered.rerender(
      <PriorityHarnessV1
        capabilities={capabilities.port}
        surfaces={["narrative", "system"]}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );
    const movedRail = await screen.findByRole("complementary", { name: "左侧开发工具" });
    const movedClose = within(movedRail).getByRole("button", { name: "关闭左侧开发工具" });
    await waitFor(() =>
      expect(movedRail.closest("[data-blocking-focus-scope]")).toHaveAttribute(
        "data-blocking-focus-scope",
        "system",
      ),
    );
    await waitFor(() => expect(movedClose).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("complementary", { name: "左侧开发工具" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开左侧开发工具" })).toHaveFocus();
  });

  it("owns Escape before an injected Story field can stop propagation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "story.form",
          side: "left",
          title: "Story 表单",
          authority: "read_only",
          render: () => (
            <input
              aria-label="Story 字段"
              onKeyDown={(event) => event.stopPropagation()}
              type="text"
            />
          ),
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );
    const field = await screen.findByRole("textbox", { name: "Story 字段" });
    field.focus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("complementary", { name: "左侧开发工具" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开左侧开发工具" })).toHaveFocus();
  });

  it("shows read-only panels without cheats and never calls a mutating operation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const queryDiagnostics = vi.fn(async () =>
      Object.freeze({
        kind: "diagnostics" as const,
        entries: Object.freeze([Object.freeze({ id: "revision", label: "当前修订", value: "7" })]),
      }),
    );
    const executeDebugCommand = vi.fn(async () =>
      Object.freeze({ kind: "handled" as const, message: "调试命令已执行" }),
    );
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "diagnostics",
          side: "left",
          title: "诊断",
          authority: "read_only",
          render: () => (
            <DiagnosticInspectorV1
              queryDiagnostics={queryDiagnostics}
              classification={Object.freeze({ kind: "restorable" as const })}
              onRestore={() => undefined}
            />
          ),
        },
        {
          id: "command",
          side: "left",
          title: "执行调试命令",
          authority: "cheat",
          render: () => (
            <DebugCommandPanelV1
              fields={<span>命令字段</span>}
              command={Object.freeze({ kind: "synthetic" as const })}
              executeDebugCommand={executeDebugCommand}
              canExecute={false}
              disabledReason="需要启用作弊功能"
            />
          ),
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "诊断摘要" }));
    expect(queryDiagnostics).toHaveBeenCalledOnce();
    expect(await screen.findByText("当前修订：7")).toBeVisible();
    expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();
    expect(executeDebugCommand).not.toHaveBeenCalled();
  });

  it("omits the cheat authority reason when every panel is read-only", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "diagnostics",
          side: "left",
          title: "诊断",
          authority: "read_only",
          render: () => <p>只读诊断</p>,
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );

    expect(await screen.findByText("只读诊断")).toBeVisible();
    expect(screen.queryByText("需要启用作弊功能")).not.toBeInTheDocument();
  });

  it("consumes debug input without dispatching through the stage", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const stageActivation = vi.fn();
    const semanticDispatch = vi.fn();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "right",
          title: "夹具",
          authority: "read_only",
          render: () => <p>夹具面板</p>,
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        stageActivation={stageActivation}
        semanticDispatch={semanticDispatch}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "打开右侧开发工具" }));
    stageActivation.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "夹具" }));
    expect(stageActivation).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();

    const pointerShield = document.querySelector<HTMLElement>('[data-devdock-open="true"]');
    expect(pointerShield).not.toBeNull();
    if (pointerShield === null) throw new TypeError("missing open DevDock pointer shield");
    await userEvent.click(pointerShield);
    expect(stageActivation).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();

    const packageRelativePath = process.cwd().endsWith(`${sep}engine${sep}packages${sep}ui`);
    const css = await readFile(
      resolve(
        process.cwd(),
        packageRelativePath
          ? "src/debug/DevDock.module.css"
          : "engine/packages/ui/src/debug/DevDock.module.css",
      ),
      "utf8",
    );
    expect(css).toMatch(/\.dev-dock\[data-devdock-open="true"\]\s*\{[^}]*pointer-events:\s*auto/gu);
  });

  it("registers debug input above gameplay only while a rail is open", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const gameplay = vi.fn(() => Object.freeze({ kind: "handled" as const }));
    const inputRouter = createInputRouterV1();
    inputRouter.register({ context: "gameplay", handle: gameplay });
    function Harness(): ReactElement {
      const [openState, setOpenState] = useState<DevDockOpenStateV1>(closedDockStateV1);
      return (
        <GameShell
          accessibleName="输入测试舞台"
          layers={emptyLayersV1()}
          inputRouter={inputRouter}
          devDock={
            <DevDockV1
              capabilities={capabilities.port}
              contributions={createDevDockContributionSetV1({ panels: [] })}
              inputRouter={inputRouter}
              openState={openState}
              onOpenStateChange={setOpenState}
            />
          }
        />
      );
    }
    render(<Harness />);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.debug.synthetic"),
    });

    expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "gameplay" });
    await userEvent.click(screen.getByRole("button", { name: "打开左侧开发工具" }));
    gameplay.mockClear();
    expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "debug" });
    expect(gameplay).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "gameplay" });
  });

  it("distinguishes an empty authorized fixture list from capability revocation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const listFixtures = vi
      .fn()
      .mockResolvedValueOnce(Object.freeze({ kind: "listed" as const, fixtureIds: [] }))
      .mockResolvedValueOnce(Object.freeze({ kind: "capability_disabled" as const }));
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "left",
          title: "夹具",
          authority: "read_only",
          render: () => (
            <FixtureBrowserV1
              listFixtures={listFixtures}
              inspectFixture={() => undefined}
              anchorFixture={async () => Object.freeze({ kind: "capability_disabled" as const })}
              canAnchor={false}
              disabledReason="需要启用作弊功能"
            />
          ),
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "夹具" }));
    expect(await screen.findByText("没有可用夹具")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "刷新夹具" }));
    expect(await screen.findByText("调试工具已关闭")).toBeVisible();
  });

  it("projects validation and fault anchor results without reporting a false success", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const storyAnchorFixture = vi
      .fn()
      .mockResolvedValueOnce(Object.freeze({ kind: "validation_failed" as const }))
      .mockResolvedValueOnce(Object.freeze({ kind: "faulted" as const }));
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "left",
          title: "夹具",
          authority: "read_only",
          render: () => (
            <FixtureBrowserV1
              listFixtures={async () =>
                Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.one"] as const })
              }
              inspectFixture={() => undefined}
              anchorFixture={async (fixtureId) => {
                const result = await storyAnchorFixture(fixtureId);
                return Object.freeze({
                  kind: "rejected" as const,
                  message: result.kind === "faulted" ? "夹具执行故障" : "夹具验证失败",
                });
              }}
              canAnchor
              disabledReason=""
            />
          ),
        },
      ],
    });
    const user = userEvent.setup();
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        initialOpenState={Object.freeze({ leftOpen: true, rightOpen: false })}
      />,
    );

    const anchor = await screen.findByRole("button", { name: "载入夹具 fixture.one" });
    await user.click(anchor);
    expect(await screen.findByRole("alert")).toHaveTextContent("夹具验证失败");
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();

    await user.click(anchor);
    expect(await screen.findByRole("alert")).toHaveTextContent("夹具执行故障");
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();
  });

  it("closes an open rail before capability revocation removes launchers", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    render(<DevDockHarnessV1 capabilities={capabilities.port} />);
    await userEvent.click(screen.getByRole("button", { name: "打开左侧开发工具" }));
    expect(screen.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();

    act(() => capabilities.publish({ debugTools: false, cheats: false, automationBridge: false }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument(),
    );

    act(() => capabilities.publish({ debugTools: true, cheats: false, automationBridge: false }));
    expect(await screen.findByRole("button", { name: "打开左侧开发工具" })).toBeVisible();
    expect(screen.queryByRole("complementary", { name: /开发工具/u })).not.toBeInTheDocument();
  });
});

describe("DevDock contribution validation", () => {
  function panelV1(overrides: Partial<DevDockPanelV1> = {}): DevDockPanelV1 {
    return {
      id: "panel.synthetic",
      side: "left",
      title: "测试面板",
      authority: "read_only",
      render: () => null,
      ...overrides,
    };
  }

  it("rejects duplicate IDs, unknown policies, per-side overflow, and 129-byte titles", () => {
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1(), panelV1({ side: "right" })],
      }),
    ).toThrowError("ui.devdock_duplicate_panel_id");
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1({ side: "center" as "left" })],
      }),
    ).toThrowError("ui.devdock_invalid_side");
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1({ authority: "owner" as "read_only" })],
      }),
    ).toThrowError("ui.devdock_invalid_authority");
    expect(() =>
      createDevDockContributionSetV1({
        panels: Array.from({ length: 17 }, (_, index) =>
          panelV1({ id: `panel.synthetic.${index}` }),
        ),
      }),
    ).toThrowError("ui.devdock_panels_limit");
    expect(() =>
      createDevDockContributionSetV1({ panels: [panelV1({ title: "a".repeat(129) })] }),
    ).toThrowError("ui.devdock_title_limit");
  });

  it("accepts exact limits, preserves authored order, and freezes the copied registry", () => {
    const input = Array.from({ length: 16 }, (_, index) =>
      panelV1({
        id: `panel.synthetic.${index}`,
        title: index === 0 ? "界".repeat(42) + "aa" : `${index}`,
      }),
    );
    const contributions = createDevDockContributionSetV1({ panels: input });
    expect(contributions.panels.map(({ id }) => id)).toEqual(input.map(({ id }) => id));
    expect(Object.isFrozen(contributions)).toBe(true);
    expect(Object.isFrozen(contributions.panels)).toBe(true);
    expect(contributions.panels.every(Object.isFrozen)).toBe(true);
    expect(contributions.panels[0]).not.toBe(input[0]);
  });
});

describe("CapabilityPanelV1", () => {
  it("renders exactly three persisted switches and requires confirmation before enabling cheats", async () => {
    const persisted = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const effective = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    render(
      <CapabilityPanelV1
        persistedCapabilities={persisted.port}
        effectiveCapabilities={effective.port.state}
        sessionRequested={["cheats"]}
      />,
    );

    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByRole("switch", { name: "作弊功能" })).toBeDisabled();
    expect(screen.getByText("作弊功能由本次会话请求启用")).toBeVisible();
    expect(persisted.setEnabled).not.toHaveBeenCalled();

    cleanup();
    const persistedOnly = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    render(
      <CapabilityPanelV1
        persistedCapabilities={persistedOnly.port}
        effectiveCapabilities={persistedOnly.port.state}
        sessionRequested={[]}
      />,
    );
    const cheats = screen.getByRole("switch", { name: "作弊功能" });
    expect(cheats).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "我确认启用作弊功能" }));
    expect(cheats).toBeEnabled();
    await userEvent.click(cheats);
    expect(persistedOnly.setEnabled).toHaveBeenCalledWith("cheats", true);
  });
});

describe("neutral async debug panels", () => {
  it("serializes fixture operations and disables every conflicting control", async () => {
    const anchored = createDeferredV1<{ readonly kind: "anchored" }>();
    render(
      <FixtureBrowserV1
        listFixtures={async () =>
          Object.freeze({
            kind: "listed" as const,
            fixtureIds: Object.freeze(["fixture.one", "fixture.two"]),
          })
        }
        inspectFixture={() => undefined}
        anchorFixture={() => anchored.promise}
        canAnchor
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    const firstAnchor = await screen.findByRole("button", { name: "载入夹具 fixture.one" });
    await user.click(firstAnchor);

    expect(screen.getByRole("button", { name: "刷新夹具" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "检查夹具 fixture.one" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "检查夹具 fixture.two" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "载入夹具 fixture.two" })).toBeDisabled();

    act(() => anchored.resolve(Object.freeze({ kind: "anchored" as const })));
    expect(await screen.findByText("夹具已载入")).toBeVisible();
  });

  it("refreshes when the fixture provider changes and ignores the old operation completion", async () => {
    const oldAnchor = createDeferredV1<{ readonly kind: "anchored" }>();
    const commonProps = Object.freeze({
      inspectFixture: () => undefined,
      anchorFixture: () => oldAnchor.promise,
      canAnchor: true,
      disabledReason: "",
    });
    const rendered = render(
      <FixtureBrowserV1
        {...commonProps}
        listFixtures={async () =>
          Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.old"] as const })
        }
      />,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "载入夹具 fixture.old" }));

    rendered.rerender(
      <FixtureBrowserV1
        {...commonProps}
        listFixtures={async () =>
          Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.new"] as const })
        }
      />,
    );
    expect(await screen.findByText("fixture.new")).toBeVisible();

    act(() => oldAnchor.resolve(Object.freeze({ kind: "anchored" as const })));
    await waitFor(() => expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument());
  });

  it("preserves queried diagnostics while a single restore is pending and after it succeeds", async () => {
    const restore = createDeferredV1<void>();
    const onRestore = vi.fn(() => restore.promise);
    render(
      <DiagnosticInspectorV1
        queryDiagnostics={async () =>
          Object.freeze({
            kind: "diagnostics" as const,
            entries: Object.freeze([
              Object.freeze({ id: "revision", label: "当前修订", value: "7" }),
            ]),
          })
        }
        classification={Object.freeze({ kind: "restorable" as const })}
        onRestore={onRestore}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "诊断摘要" }));
    expect(await screen.findByText("当前修订：7")).toBeVisible();

    const restoreButton = screen.getByRole("button", { name: "恢复界面状态" });
    await user.click(restoreButton);
    expect(restoreButton).toBeDisabled();
    expect(screen.getByText("当前修订：7")).toBeVisible();
    expect(onRestore).toHaveBeenCalledOnce();

    act(() => restore.resolve());
    expect(await screen.findByText("界面状态已恢复")).toBeVisible();
    expect(screen.getByText("当前修订：7")).toBeVisible();
  });

  it("renders an adapted debug-command rejection instead of a false handled result", async () => {
    render(
      <DebugCommandPanelV1
        fields={<span>命令字段</span>}
        command={Object.freeze({ kind: "synthetic" as const })}
        executeDebugCommand={async () =>
          Object.freeze({ kind: "rejected" as const, message: "调试命令验证失败" })
        }
        canExecute
        disabledReason=""
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "执行调试命令" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("调试命令验证失败");
    expect(screen.queryByText("调试命令请求已处理")).not.toBeInTheDocument();
  });

  it("ignores an old debug-command completion after the typed provider is replaced", async () => {
    const oldExecution = createDeferredV1<{
      readonly kind: "rejected";
      readonly message: string;
    }>();
    const executeOld = vi.fn(() => oldExecution.promise);
    const executeNew = vi.fn(async () =>
      Object.freeze({ kind: "handled" as const, message: "新命令已执行" }),
    );
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>旧命令字段</span>}
        command={Object.freeze({ kind: "old" as const })}
        executeDebugCommand={executeOld}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>新命令字段</span>}
        command={Object.freeze({ kind: "new" as const })}
        executeDebugCommand={executeNew}
        canExecute
        disabledReason=""
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());

    act(() =>
      oldExecution.resolve(Object.freeze({ kind: "rejected" as const, message: "旧命令不应显示" })),
    );
    await waitFor(() => expect(screen.queryByText("旧命令不应显示")).not.toBeInTheDocument());
    expect(executeOld).toHaveBeenCalledOnce();
    expect(executeNew).not.toHaveBeenCalled();
  });

  it("keeps one in-flight command when only the typed command value changes", async () => {
    const execution = createDeferredV1<{
      readonly kind: "handled";
      readonly message: string;
    }>();
    const execute = vi.fn(() => execution.promise);
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>命令 A</span>}
        command={Object.freeze({ kind: "same", amount: 1 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    const submit = screen.getByRole("button", { name: "执行调试命令" });
    await user.click(submit);

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>命令 B</span>}
        command={Object.freeze({ kind: "same", amount: 2 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    await waitFor(() => expect(screen.getByText("命令 B")).toBeVisible());
    expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));
    expect(execute).toHaveBeenCalledOnce();

    act(() =>
      execution.resolve(Object.freeze({ kind: "handled" as const, message: "命令 A 已执行" })),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());
    expect(screen.queryByText("命令 A 已执行")).not.toBeInTheDocument();
  });

  it("ignores an old debug-command rejection after the typed command value changes", async () => {
    const execution = createDeferredV1<never>();
    const execute = vi.fn(() => execution.promise);
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>命令 A</span>}
        command={Object.freeze({ kind: "same", amount: 1 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>命令 B</span>}
        command={Object.freeze({ kind: "same", amount: 2 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();

    act(() => execution.reject(new Error("命令 A 失败")));
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());
    expect(screen.queryByText("调试命令执行失败")).not.toBeInTheDocument();
    expect(execute).toHaveBeenCalledOnce();
  });
});
