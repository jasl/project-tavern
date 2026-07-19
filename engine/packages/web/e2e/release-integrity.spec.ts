// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Buffer } from "node:buffer";

import { expect, test, type Locator, type Page } from "@playwright/test";

type PocCapabilityV1 = "automation_bridge" | "cheats" | "debug_tools";

interface RunIntegrityWitnessV1 {
  readonly mode: "modified" | "normal";
  readonly mutationCount: number;
  readonly firstMutationSequence: number | null;
  readonly reasons: readonly {
    readonly commandKind?: string;
    readonly kind: string;
    readonly sequence: number;
  }[];
}

interface DebugBundleWitnessV1 {
  readonly commandLog: readonly {
    readonly command: { readonly kind: string; readonly reasonId?: string };
    readonly source: string;
  }[];
  readonly currentSnapshot: { readonly integrity: RunIntegrityWitnessV1 };
}

interface AutomationPublicationWitnessV1 {
  readonly revision: number;
  readonly actions: readonly {
    readonly directInvocation?: unknown;
    readonly enabled: boolean;
  }[];
}

const releaseBaseUrlV1 = "http://127.0.0.1:41731/nested/tavern/";

function releaseUrlV1(capabilities: readonly PocCapabilityV1[]): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${releaseBaseUrlV1}${query.length === 0 ? "" : `?${query}`}#/play`;
}

async function expectApplicationV1(page: Page): Promise<void> {
  await expect(page.getByRole("application", { name: "Project Tavern 七日原型" })).toHaveAttribute(
    "data-application-id",
    "poc-web",
  );
}

async function exportDebugBundleV1(page: Page): Promise<DebugBundleWitnessV1> {
  const exportButton = page.getByRole("button", { name: "导出调试包" });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  await expect(page.getByText("调试包已导出")).toBeVisible();
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as DebugBundleWitnessV1;
}

async function cashAmountV1(page: Page): Promise<number> {
  const cash = page.getByTestId("top-card-end").getByText(/^现金 -?\d+$/u);
  await expect(cash).toBeVisible();
  const match = /^现金 (-?\d+)$/u.exec((await cash.textContent()) ?? "");
  if (match?.[1] === undefined) throw new TypeError("invalid cash witness");
  return Number(match[1]);
}

async function openSaveOverlayV1(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "保存" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("本地存档可用")).toBeVisible();
  return dialog;
}

async function saveQuickV1(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "快速保存", exact: true }).click();
  await expect(dialog.getByTestId("save-operation-result")).toHaveText("已保存到快速存档");
}

async function loadQuickV1(page: Page, dialog: Locator): Promise<void> {
  const load = dialog.getByRole("button", { name: "载入快速存档", exact: true });
  await expect(load).toBeEnabled();
  await load.click();
  const confirmation = page.getByRole("dialog", { name: "载入快速存档" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "确认", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.getByTestId("save-operation-result")).toHaveText("已载入存档");
}

test.describe("@phase6 prebuilt PoC RunIntegrity", () => {
  test("keeps legal semantic Automation player-only and integrity-normal", async ({ page }) => {
    await page.goto(releaseUrlV1(["debug_tools", "automation_bridge"]));
    await expectApplicationV1(page);
    await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);

    const outcome = await page.evaluate(async () => {
      const facade = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
      if (facade === undefined) throw new Error("Automation bridge is unavailable");
      const observed = facade.observe();
      if (observed.kind !== "ok") throw new Error("Automation bridge was revoked");
      const publication = observed.value as AutomationPublicationWitnessV1;
      const action = publication.actions.find(
        (candidate) => candidate.enabled && candidate.directInvocation !== undefined,
      );
      if (action?.directInvocation === undefined) throw new Error("missing direct invocation");
      const idle = facade.waitForIdle(
        publication.revision as Parameters<typeof facade.waitForIdle>[0],
      );
      const dispatched = await facade.dispatch(action.directInvocation);
      const settled = await idle;
      return {
        dispatched,
        facadeKeys: Object.keys(facade).toSorted(),
        settled,
      };
    });
    expect(outcome.dispatched).toMatchObject({ kind: "ok", value: { kind: "committed" } });
    expect(outcome.settled).toMatchObject({ kind: "ok" });
    expect(outcome.facadeKeys).toEqual([
      "availableActions",
      "contractRevision",
      "dispatch",
      "observe",
      "preview",
      "waitForIdle",
    ]);
    expect(outcome.facadeKeys).not.toEqual(
      expect.arrayContaining(["anchorFixture", "executeDebugCommand", "queryDiagnostics"]),
    );

    const bundle = await exportDebugBundleV1(page);
    expect(bundle.currentSnapshot.integrity).toEqual({
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    });
  });

  test("persists a successful Cheat integrity mark through Quick Save, refresh, and Load", async ({
    page,
  }) => {
    await page.goto(releaseUrlV1(["debug_tools", "cheats"]));
    await expectApplicationV1(page);
    const cashBefore = await cashAmountV1(page);

    await page.getByRole("button", { name: "打开右侧开发工具" }).click();
    const commandsTab = page.getByRole("button", { name: "调试命令" });
    await expect(commandsTab).toBeEnabled();
    await commandsTab.click();
    const command = page.getByRole("region", { name: "PoC 调试命令：调整现金" });
    await command.getByRole("checkbox", { name: "我确认执行调整现金" }).check();
    await command.getByRole("button", { name: "执行调试命令" }).click();
    await expect(
      page.getByTestId("top-card-end").getByText(`现金 ${cashBefore + 5}`),
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭右侧开发工具" }).click();

    const firstBundle = await exportDebugBundleV1(page);
    expect(firstBundle.currentSnapshot.integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.inventory.adjust_cash",
          sequence: 1,
        },
      ],
    });
    expect(firstBundle.commandLog).toEqual([
      expect.objectContaining({
        source: "debug",
        command: expect.objectContaining({
          kind: "debug.inventory.adjust_cash",
          reasonId: "reason.debug.cash_adjustment",
        }),
      }),
    ]);

    let saveDialog = await openSaveOverlayV1(page);
    await saveQuickV1(saveDialog);
    await page.reload();
    await expectApplicationV1(page);
    saveDialog = await openSaveOverlayV1(page);
    await loadQuickV1(page, saveDialog);
    await saveDialog.getByRole("button", { name: "关闭", exact: true }).click();

    const reloadedBundle = await exportDebugBundleV1(page);
    expect(reloadedBundle.currentSnapshot.integrity).toEqual(firstBundle.currentSnapshot.integrity);
  });
});
