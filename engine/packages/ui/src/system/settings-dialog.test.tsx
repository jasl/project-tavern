// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevDockV1, createDevDockContributionSetV1 } from "../debug/DevDock.js";
import type { DevDockOpenStateV1 } from "../debug/DevDock.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameShell } from "../shell/game-shell.js";
import { SettingsDialogV1 } from "./settings-dialog.js";

afterEach(cleanup);

const closedDevDockStateV1 = Object.freeze({ leftOpen: false, rightOpen: false });
const debugCapabilityStateV1 = Object.freeze({
  debugTools: true,
  cheats: false,
  automationBridge: false,
});
const debugCapabilitiesV1 = Object.freeze({
  state: Object.freeze({
    getCurrent: () => debugCapabilityStateV1,
    subscribe: () => () => undefined,
  }),
  setEnabled: async () =>
    Object.freeze({ kind: "unchanged" as const, state: debugCapabilityStateV1 }),
}) satisfies RuntimeCapabilityPortV1;

function SettingsDialogDevDockHarnessV1(props: { readonly onClose: () => void }): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devDockOpenState, setDevDockOpenState] =
    useState<DevDockOpenStateV1>(closedDevDockStateV1);
  const inputRouterRef = useRef(createInputRouterV1());
  const openerRef = useRef<HTMLButtonElement>(null);
  return (
    <GameShell
      accessibleName="真实设置 Escape 测试舞台"
      inputRouter={inputRouterRef.current}
      layers={Object.freeze({
        background: null,
        character: null,
        sceneInteraction: null,
        hud: null,
        workspaceOverlay: null,
        narrative: null,
        system: (
          <>
            <button ref={openerRef} type="button" onClick={() => setSettingsOpen(true)}>
              打开真实设置
            </button>
            {settingsOpen ? (
              <SettingsDialogV1
                title="真实设置"
                closeLabel="关闭真实设置"
                sections={Object.freeze([<section key="fixture">设置内容</section>])}
                emptyText="没有设置"
                onClose={() => {
                  setSettingsOpen(false);
                  props.onClose();
                  queueMicrotask(() => openerRef.current?.focus());
                }}
              />
            ) : null}
          </>
        ),
      })}
      devDock={
        <DevDockV1
          capabilities={debugCapabilitiesV1}
          contributions={createDevDockContributionSetV1({ panels: [] })}
          inputRouter={inputRouterRef.current}
          openState={devDockOpenState}
          onOpenStateChange={setDevDockOpenState}
        />
      }
    />
  );
}

describe("SettingsDialogV1", () => {
  it("renders an accessible title, native close, and readonly sections in authored order", async () => {
    const onClose = vi.fn();
    const sections = Object.freeze([
      <section key="display" aria-label="显示设置">
        显示
      </section>,
      <section key="audio" aria-label="声音设置">
        声音
      </section>,
      <section key="accessibility" aria-label="辅助设置">
        辅助
      </section>,
    ]);
    render(
      <SettingsDialogV1
        title="设置"
        closeLabel="关闭设置"
        sections={sections}
        emptyText="此应用没有可调整设置"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "设置" })).toHaveStyle({ position: "fixed" });
    expect(document.querySelector('[data-system-dialog-backdrop="settings"]')).toHaveStyle({
      position: "fixed",
    });
    expect(screen.getAllByTestId("settings-section").map((section) => section.textContent)).toEqual(
      ["显示", "声音", "辅助"],
    );
    expect(sections).toHaveLength(3);

    const close = screen.getByRole("button", { name: "关闭设置" });
    expect(close.tagName).toBe("BUTTON");
    expect(close).toHaveAttribute("type", "button");
    await userEvent.setup().click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders only the truthful application-supplied empty text for an empty section list", () => {
    render(
      <SettingsDialogV1
        title="设置"
        closeLabel="关闭设置"
        sections={Object.freeze([])}
        emptyText="当前故事没有可调整设置"
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("当前故事没有可调整设置")).toBeVisible();
    expect(screen.queryAllByTestId("settings-section")).toHaveLength(0);
  });

  it("lets an in-dialog DevDock own the first Escape, then closes and restores the opener", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialogDevDockHarnessV1 onClose={onClose} />);

    const opener = screen.getByRole("button", { name: "打开真实设置" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "真实设置" });
    const launcher = await screen.findByRole("button", { name: "打开右侧开发工具" });
    expect(launcher.closest('[data-blocking-focus-scope="system"]')).toBe(dialog);

    await user.click(launcher);
    expect(screen.getByRole("complementary", { name: "右侧开发工具" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(dialog).toBeVisible();
    expect(screen.queryByRole("complementary", { name: "右侧开发工具" })).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "真实设置" })).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
