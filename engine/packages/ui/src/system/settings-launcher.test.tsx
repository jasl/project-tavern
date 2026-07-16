// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createInputRouterV1 } from "../input/input-router.js";
import { SystemDialogHostV1 } from "./system-dialog-host.js";
import { SettingsLauncherV1 } from "./settings-launcher.js";

afterEach(cleanup);

const settingsV1 = Object.freeze({
  title: "设置",
  closeLabel: "关闭设置",
  sections: Object.freeze([]),
  emptyText: "没有可调整设置",
});

describe("SettingsLauncherV1", () => {
  it("uses a native button, forwards its ref, and opens only the reserved settings surface", async () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <SystemDialogHostV1 inputRouter={createInputRouterV1()} settings={settingsV1}>
        <SettingsLauncherV1 ref={ref} label="设置" className="fixture-launcher" />
      </SystemDialogHostV1>,
    );

    const launcher = screen.getByRole("button", { name: "设置" });
    expect(launcher.tagName).toBe("BUTTON");
    expect(launcher).toHaveAttribute("type", "button");
    expect(launcher).toHaveClass("silly-button", "fixture-launcher");
    expect(ref.current).toBe(launcher);

    await userEvent.setup().click(launcher);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
  });

  it("fails with a stable code when no SystemDialogHost owns the launcher", () => {
    expect(() => render(<SettingsLauncherV1 label="设置" />)).toThrowError(
      "ui.system_dialog_host_missing",
    );
  });
});
