// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsDialogV1 } from "./settings-dialog.js";

afterEach(cleanup);

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
});
