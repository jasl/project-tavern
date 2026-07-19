// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  digestBytes,
  parseNonNegativeSafeInteger,
  type RuntimeSessionStatusV1,
} from "@sillymaker/base";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DiagnosticExportButtonV1,
  diagnosticExportContentCategoryIdsV1,
  type DiagnosticExportPreviewV1,
} from "./diagnostic-export-button.js";

afterEach(cleanup);

const previewV1 = Object.freeze({
  filename: "project-tavern.debug-bundle.json",
  mediaType: "application/json" as const,
  digest: digestBytes(Uint8Array.of(1, 2, 3)),
  encodedByteLength: parseNonNegativeSafeInteger(4096),
  categories: Object.freeze(diagnosticExportContentCategoryIdsV1.slice(0, 4)),
}) satisfies DiagnosticExportPreviewV1;

const categoryLabelsV1 = Object.freeze({
  provenance: "构建与来源信息",
  capabilities_and_integrity: "运行能力与完整性状态",
  replay_evidence: "完整游戏状态与命令历史",
  diagnostics_and_runtime_failures: "诊断与运行时故障",
  failure_context: "失败现场",
  ui_context: "界面上下文",
});

function deferredV1<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function diagnosticsV1(input?: {
  readonly prepare?: () => Promise<DiagnosticExportPreviewV1>;
  readonly save?: () => Promise<void>;
  readonly discard?: () => void;
}) {
  return Object.freeze({
    prepareDebugBundle: vi.fn(input?.prepare ?? (async () => previewV1)),
    savePreparedDebugBundle: vi.fn(input?.save ?? (async () => undefined)),
    discardPreparedDebugBundle: vi.fn(input?.discard ?? (() => undefined)),
  });
}

function diagnosticPropsV1(
  sessionStatus: RuntimeSessionStatusV1,
  diagnostics: ReturnType<typeof diagnosticsV1>,
) {
  return Object.freeze({
    diagnostics,
    sessionStatus,
    label: "导出调试包",
    preparingText: "正在准备调试包…",
    reviewTitle: "检查调试包内容",
    filenameLabel: "文件名",
    digestLabel: "SHA-256",
    encodedByteLengthLabel: "编码后大小",
    categoriesLabel: "包含内容",
    categoryLabels: categoryLabelsV1,
    saveLabel: "保存调试包",
    cancelLabel: "取消",
    savingText: "正在保存调试包…",
    completedText: "调试包已保存",
    failedText: "调试包操作失败",
  });
}

describe("DiagnosticExportButtonV1", () => {
  it.each(["ready", "busy", "fault_paused"] as const)(
    "prepares a review without saving while the session is %s",
    async (sessionStatus) => {
      const diagnostics = diagnosticsV1();
      render(<DiagnosticExportButtonV1 {...diagnosticPropsV1(sessionStatus, diagnostics)} />);

      const button = screen.getByRole("button", { name: "导出调试包" });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("data-runtime-session-status", sessionStatus);

      await userEvent.setup().click(button);

      expect(diagnostics.prepareDebugBundle).toHaveBeenCalledOnce();
      expect(diagnostics.savePreparedDebugBundle).not.toHaveBeenCalled();
      const review = await screen.findByRole("region", { name: "检查调试包内容" });
      expect(within(review).getByText(previewV1.filename)).toBeVisible();
      expect(within(review).getByText(previewV1.digest)).toBeVisible();
      expect(within(review).getByText("4096 B")).toBeVisible();
      for (const categoryId of previewV1.categories) {
        expect(within(review).getByText(categoryLabelsV1[categoryId])).toBeVisible();
      }
      expect(screen.getByRole("status")).toHaveAttribute("data-diagnostic-export-state", "review");
    },
  );

  it("admits at most one prepare while pending", async () => {
    const pending = deferredV1<DiagnosticExportPreviewV1>();
    const diagnostics = diagnosticsV1({ prepare: () => pending.promise });
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />);
    const button = screen.getByRole("button", { name: "导出调试包" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("正在准备调试包…");
    expect(diagnostics.prepareDebugBundle).toHaveBeenCalledOnce();
    pending.resolve(previewV1);
    expect(await screen.findByRole("region", { name: "检查调试包内容" })).toBeVisible();
  });

  it("saves only after a separate explicit activation", async () => {
    const diagnostics = diagnosticsV1();
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "导出调试包" }));
    expect(diagnostics.savePreparedDebugBundle).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "保存调试包" }));

    expect(diagnostics.savePreparedDebugBundle).toHaveBeenCalledOnce();
    expect(await screen.findByText("调试包已保存")).toBeVisible();
    expect(screen.queryByRole("region", { name: "检查调试包内容" })).not.toBeInTheDocument();
  });

  it("discards an inspected bundle when the player cancels", async () => {
    const diagnostics = diagnosticsV1();
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "导出调试包" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(diagnostics.discardPreparedDebugBundle).toHaveBeenCalledOnce();
    expect(diagnostics.savePreparedDebugBundle).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "检查调试包内容" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出调试包" })).toBeEnabled();
  });

  it("bounds a prepare failure and permits a fresh retry", async () => {
    const diagnostics = diagnosticsV1({
      prepare: vi
        .fn<() => Promise<DiagnosticExportPreviewV1>>()
        .mockRejectedValueOnce(new Error("private path /Users/example must not render"))
        .mockResolvedValueOnce(previewV1),
      discard: () => {
        throw new Error("private discard failure must remain bounded");
      },
    });
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("fault_paused", diagnostics)} />);
    const button = screen.getByRole("button", { name: "导出调试包" });
    const user = userEvent.setup();

    await user.click(button);
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("调试包操作失败");
    expect(status).not.toHaveTextContent("/Users/example");
    expect(status).toHaveAttribute("data-diagnostic-export-state", "prepare_failed");
    expect(status).toHaveAttribute(
      "data-diagnostic-export-failure-code",
      "ui.event_handler_failed",
    );

    await user.click(button);
    expect(await screen.findByRole("region", { name: "检查调试包内容" })).toBeVisible();
    expect(diagnostics.prepareDebugBundle).toHaveBeenCalledTimes(2);
  });

  it("bounds a throwing discard during cancellation and unmount", async () => {
    const diagnostics = diagnosticsV1({
      discard: () => {
        throw new Error("private discard failure must remain bounded");
      },
    });
    const rendered = render(
      <DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "导出调试包" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("region", { name: "检查调试包内容" })).not.toBeInTheDocument();
    expect(diagnostics.discardPreparedDebugBundle).toHaveBeenCalledOnce();

    expect(() => rendered.unmount()).not.toThrow();
    expect(diagnostics.discardPreparedDebugBundle).toHaveBeenCalledTimes(2);
  });

  it("retains the review for a save retry without preparing different bytes", async () => {
    const diagnostics = diagnosticsV1({
      save: vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("first download failed"))
        .mockResolvedValueOnce(undefined),
    });
    render(<DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "导出调试包" }));
    await user.click(screen.getByRole("button", { name: "保存调试包" }));

    expect(await screen.findByText("调试包操作失败")).toBeVisible();
    expect(screen.getByRole("region", { name: "检查调试包内容" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-diagnostic-export-state",
      "save_failed",
    );

    await user.click(screen.getByRole("button", { name: "保存调试包" }));
    expect(await screen.findByText("调试包已保存")).toBeVisible();
    expect(diagnostics.prepareDebugBundle).toHaveBeenCalledOnce();
    expect(diagnostics.savePreparedDebugBundle).toHaveBeenCalledTimes(2);
  });

  it("discards pending and prepared bytes when unmounted", async () => {
    const pending = deferredV1<DiagnosticExportPreviewV1>();
    const diagnostics = diagnosticsV1({ prepare: () => pending.promise });
    const rendered = render(
      <DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", diagnostics)} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "导出调试包" }));
    rendered.unmount();
    expect(diagnostics.discardPreparedDebugBundle).toHaveBeenCalledOnce();

    await act(async () => pending.resolve(previewV1));
    expect(diagnostics.discardPreparedDebugBundle).toHaveBeenCalledTimes(2);
    expect(diagnostics.savePreparedDebugBundle).not.toHaveBeenCalled();
  });

  it("does not publish a late preview after the diagnostics port is replaced", async () => {
    const pending = deferredV1<DiagnosticExportPreviewV1>();
    const firstDiagnostics = diagnosticsV1({ prepare: () => pending.promise });
    const nextDiagnostics = diagnosticsV1();
    const rendered = render(
      <DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", firstDiagnostics)} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "导出调试包" }));
    rendered.rerender(
      <DiagnosticExportButtonV1 {...diagnosticPropsV1("ready", nextDiagnostics)} />,
    );
    expect(firstDiagnostics.discardPreparedDebugBundle).toHaveBeenCalledOnce();

    await act(async () => pending.resolve(previewV1));
    expect(firstDiagnostics.discardPreparedDebugBundle).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("region", { name: "检查调试包内容" })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "导出调试包" }));
    expect(nextDiagnostics.prepareDebugBundle).toHaveBeenCalledOnce();
    expect(await screen.findByRole("region", { name: "检查调试包内容" })).toBeVisible();
  });

  it("never reaches forbidden DebugTools authorities", async () => {
    const diagnostics = Object.freeze({
      ...diagnosticsV1(),
      inspectDebugBundle: vi.fn(),
      anchorDebugBundle: vi.fn(),
      executeDebugCommand: vi.fn(),
    });
    render(
      <DiagnosticExportButtonV1
        {...diagnosticPropsV1("fault_paused", diagnostics)}
        diagnostics={diagnostics}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "导出调试包" }));

    expect(diagnostics.inspectDebugBundle).not.toHaveBeenCalled();
    expect(diagnostics.anchorDebugBundle).not.toHaveBeenCalled();
    expect(diagnostics.executeDebugCommand).not.toHaveBeenCalled();
  });
});
