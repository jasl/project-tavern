// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import type { RuntimeSessionStatusV1 } from "@sillymaker/base";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagnosticExportButtonV1 } from "./diagnostic-export-button.js";

afterEach(cleanup);

const exportedBundleV1 = Object.freeze({ kind: "exported" as const });

function deferredV1<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function diagnosticPropsV1(
  sessionStatus: RuntimeSessionStatusV1,
  exportDebugBundle: () => Promise<typeof exportedBundleV1>,
) {
  return Object.freeze({
    diagnostics: Object.freeze({ exportDebugBundle }),
    sessionStatus,
    label: "导出诊断包",
    pendingText: "正在生成诊断包…",
    completedText: "诊断包已导出",
    failedText: "诊断包导出失败",
  });
}

describe("DiagnosticExportButtonV1", () => {
  it.each(["ready", "busy", "fault_paused"] as const)(
    "keeps DebugBundle export reachable while the session is %s",
    async (sessionStatus) => {
      const exportDebugBundle = vi.fn(async () => exportedBundleV1);

      render(<DiagnosticExportButtonV1 {...diagnosticPropsV1(sessionStatus, exportDebugBundle)} />);

      const button = screen.getByRole("button", { name: "导出诊断包" });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("data-runtime-session-status", sessionStatus);

      await userEvent.setup().click(button);

      expect(exportDebugBundle).toHaveBeenCalledOnce();
      expect(await screen.findByRole("status")).toHaveTextContent("诊断包已导出");
    },
  );

  it("reports pending before a resolved export is truthfully complete", async () => {
    const pending = deferredV1<typeof exportedBundleV1>();
    const exportDebugBundle = vi.fn(() => pending.promise);
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("busy", exportDebugBundle)} />);

    const button = screen.getByRole("button", { name: "导出诊断包" });
    await userEvent.setup().click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("正在生成诊断包…");
    expect(screen.getByRole("status")).not.toHaveTextContent("诊断包已导出");

    pending.resolve(exportedBundleV1);

    expect(await screen.findByText("诊断包已导出")).toBeVisible();
    expect(button).toBeEnabled();
    expect(screen.getByRole("status")).toHaveAttribute("data-diagnostic-export-state", "completed");
  });

  it("admits at most one export while pending", async () => {
    const pending = deferredV1<typeof exportedBundleV1>();
    const exportDebugBundle = vi.fn(() => pending.promise);
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", exportDebugBundle)} />);
    const button = screen.getByRole("button", { name: "导出诊断包" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(exportDebugBundle).toHaveBeenCalledOnce();
    pending.resolve(exportedBundleV1);
    expect(await screen.findByText("诊断包已导出")).toBeVisible();
  });

  it("bounds a throwing export as a typed UI failure without authority leakage", async () => {
    const thrown = new Error("private path /Users/example/project must not render");
    const exportDebugBundle = vi.fn(async () => {
      throw thrown;
    });
    const inspectDebugBundle = vi.fn();
    const anchorDebugBundle = vi.fn();
    const executeDebugCommand = vi.fn();
    const runIntegrity = Object.freeze({ mode: "normal" as const, mutationCount: 0 });
    const diagnosticsWithForbiddenAuthorities = Object.freeze({
      exportDebugBundle,
      inspectDebugBundle,
      anchorDebugBundle,
      executeDebugCommand,
      runIntegrity,
    });
    const unhandledRejection = vi.fn();
    window.addEventListener("unhandledrejection", unhandledRejection);

    try {
      render(
        <DiagnosticExportButtonV1
          {...diagnosticPropsV1("fault_paused", exportDebugBundle)}
          diagnostics={diagnosticsWithForbiddenAuthorities}
        />,
      );

      await userEvent.setup().click(screen.getByRole("button", { name: "导出诊断包" }));

      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("诊断包导出失败");
      expect(status).not.toHaveTextContent(thrown.message);
      expect(status).toHaveAttribute("data-diagnostic-export-state", "failed");
      expect(status).toHaveAttribute(
        "data-diagnostic-export-failure-code",
        "ui.event_handler_failed",
      );
      await Promise.resolve();
      expect(unhandledRejection).not.toHaveBeenCalled();
      expect(inspectDebugBundle).not.toHaveBeenCalled();
      expect(anchorDebugBundle).not.toHaveBeenCalled();
      expect(executeDebugCommand).not.toHaveBeenCalled();
      expect(diagnosticsWithForbiddenAuthorities.runIntegrity).toBe(runIntegrity);
      expect(runIntegrity).toEqual({ mode: "normal", mutationCount: 0 });
    } finally {
      window.removeEventListener("unhandledrejection", unhandledRejection);
    }
  });

  it("permits an explicit retry after a bounded failure", async () => {
    const exportDebugBundle = vi
      .fn<() => Promise<typeof exportedBundleV1>>()
      .mockRejectedValueOnce(new Error("first export failed"))
      .mockResolvedValueOnce(exportedBundleV1);
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", exportDebugBundle)} />);
    const button = screen.getByRole("button", { name: "导出诊断包" });
    const user = userEvent.setup();

    await user.click(button);
    expect(await screen.findByText("诊断包导出失败")).toBeVisible();
    expect(button).toBeEnabled();

    await user.click(button);
    expect(await screen.findByText("诊断包已导出")).toBeVisible();
    expect(exportDebugBundle).toHaveBeenCalledTimes(2);
  });
});
