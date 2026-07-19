// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

type BlockingSurfaceV1 = "play" | "overlay" | "narrative" | "system" | "devdock" | "fault_pause";
type RestorableBlockingSurfaceV1 = "overlay" | "narrative" | "system";
type DiagnosticSurfaceV1 = "normal" | "narrative" | "fault_pause";

const e2eApplicationNameV1 = "SillyMaker 引擎测试";

function e2eUrlV1(capabilities: readonly ("cheats" | "debug_tools")[] = ["debug_tools"]): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${uiTargetUrlV1(uiTargetsV1.e2e)}/?${query}#/play`;
}

async function expectE2eApplicationV1(page: Page): Promise<Locator> {
  const application = page.getByRole("application", { name: e2eApplicationNameV1 });
  await expect(application).toHaveAttribute("data-application-id", uiTargetsV1.e2e.applicationId);
  return application;
}

async function activateWithKeyboardV1(page: Page, control: Locator): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

async function expectVisibleFocusV1(control: Locator, label: string): Promise<void> {
  await expect(control, `${label} must own focus`).toBeFocused();
  const visible = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    const outlineVisible =
      style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
    return outlineVisible || style.boxShadow !== "none";
  });
  expect(visible, `${label} must have a visible focus indicator`).toBe(true);
}

async function openOverlayWithKeyboardV1(page: Page): Promise<{
  readonly opener: Locator;
  readonly scope: Locator;
}> {
  const opener = page.getByRole("button", { name: "打开测试面板", exact: true });
  await activateWithKeyboardV1(page, opener);
  const scope = page.locator('[data-blocking-focus-scope="overlay"]');
  await expect(scope).toBeVisible();
  return Object.freeze({ opener, scope });
}

async function openNarrativeWithKeyboardV1(page: Page): Promise<{
  readonly opener: Locator;
  readonly scope: Locator;
}> {
  const opener = page
    .getByRole("group", { name: "测试操作" })
    .getByRole("button", { name: "开始流程", exact: true });
  await activateWithKeyboardV1(page, opener);
  const scope = page.locator('[data-blocking-focus-scope="narrative"]');
  await expect(scope).toBeVisible();
  return Object.freeze({ opener, scope });
}

async function openSystemWithKeyboardV1(page: Page): Promise<{
  readonly opener: Locator;
  readonly scope: Locator;
}> {
  const opener = page.getByTestId("stage-system").getByRole("button", {
    name: "设置",
    exact: true,
  });
  await activateWithKeyboardV1(page, opener);
  const scope = page.locator('[data-blocking-focus-scope="system"]');
  await expect(scope).toBeVisible();
  return Object.freeze({ opener, scope });
}

async function openRestorableBlockingSurfaceV1(
  page: Page,
  surface: RestorableBlockingSurfaceV1,
): Promise<{ readonly opener: Locator; readonly scope: Locator }> {
  switch (surface) {
    case "overlay":
      return await openOverlayWithKeyboardV1(page);
    case "narrative":
      return await openNarrativeWithKeyboardV1(page);
    case "system":
      return await openSystemWithKeyboardV1(page);
  }
  const unsupported: never = surface;
  throw new TypeError(`unsupported restorable blocking surface ${String(unsupported)}`);
}

async function closeRestorableBlockingSurfaceV1(
  page: Page,
  surface: RestorableBlockingSurfaceV1,
  scope: Locator,
): Promise<void> {
  switch (surface) {
    case "overlay":
    case "system": {
      const close = scope.getByRole("button", { name: "关闭", exact: true });
      await activateWithKeyboardV1(page, close);
      await expect(scope).toHaveCount(0);
      return;
    }
    case "narrative": {
      const left = scope.getByRole("button", { name: "选择左侧", exact: true });
      await activateWithKeyboardV1(page, left);
      const continueControl = scope.getByRole("button", { name: "继续", exact: true });
      await activateWithKeyboardV1(page, continueControl);
      await expect(scope).toHaveCount(0);
      return;
    }
  }
}

async function openDevDockInsideScopeV1(
  page: Page,
  scope: Locator,
  expectedSurface: "fault_pause" | RestorableBlockingSurfaceV1,
): Promise<Locator> {
  const launcher = scope.getByRole("button", { name: "打开左侧开发工具" });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveCount(1);
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  expect(
    await launcher.evaluate((element) =>
      element.closest("[data-blocking-focus-scope]")?.getAttribute("data-blocking-focus-scope"),
    ),
  ).toBe(expectedSurface);

  await activateWithKeyboardV1(page, launcher);
  const rail = scope.getByRole("complementary", { name: "左侧开发工具" });
  await expect(rail).toBeVisible();
  const closeRail = rail.getByRole("button", { name: "关闭左侧开发工具" });
  await expectVisibleFocusV1(closeRail, `${expectedSurface} DevDock close control`);
  await page.keyboard.press("Tab");
  expect(
    await rail.evaluate((element) => element.contains(document.activeElement)),
    `${expectedSurface} DevDock must keep logical Tab order inside the rail`,
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect(rail).toHaveCount(0);
  await expectVisibleFocusV1(launcher, `${expectedSurface} DevDock launcher restoration`);
  await expect(scope).toBeVisible();
  return launcher;
}

async function triggerPublicFaultPauseV1(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "打开右侧开发工具" }).click();
  const rail = page.getByRole("complementary", { name: "右侧开发工具" });
  await expect(rail).toBeVisible();
  const commandsTab = rail.getByRole("button", { name: "调试命令", exact: true });
  await expect(commandsTab).toBeEnabled();
  await commandsTab.click();
  const command = rail.getByRole("region", { name: "debug.e2e.test.fault" });
  await expect(command).toBeVisible();
  await command.getByRole("checkbox", { name: "确认执行此调试命令" }).check();
  await command.getByRole("button", { name: "执行调试命令" }).click();
  const faultScope = page.locator('[data-blocking-focus-scope="fault_pause"]');
  await expect(faultScope).toBeVisible();
  await expect(faultScope).toHaveAccessibleName("界面暂时无法继续");
  return faultScope;
}

async function openSurfaceFixtureV1(page: Page, surface: BlockingSurfaceV1): Promise<Locator> {
  const capabilities = surface === "fault_pause" ? (["debug_tools", "cheats"] as const) : undefined;
  await page.goto("about:blank");
  await page.goto(e2eUrlV1(capabilities));
  const application = await expectE2eApplicationV1(page);

  switch (surface) {
    case "play":
      return application;
    case "overlay":
      await page.getByRole("button", { name: "打开测试面板", exact: true }).click();
      return page.locator('[data-blocking-focus-scope="overlay"]');
    case "narrative":
      await page
        .getByRole("group", { name: "测试操作" })
        .getByRole("button", { name: "开始流程", exact: true })
        .click();
      return page.locator('[data-blocking-focus-scope="narrative"]');
    case "system":
      await page
        .getByTestId("stage-system")
        .getByRole("button", { name: "设置", exact: true })
        .click();
      return page.locator('[data-blocking-focus-scope="system"]');
    case "devdock":
      await page.getByRole("button", { name: "打开左侧开发工具" }).click();
      return page.getByRole("complementary", { name: "左侧开发工具" });
    case "fault_pause":
      return await triggerPublicFaultPauseV1(page);
  }
  const unsupported: never = surface;
  throw new TypeError(`unsupported blocking surface ${String(unsupported)}`);
}

async function expectLogicalSuccessorFocusV1(
  page: Page,
  opener: Locator,
  label: string,
): Promise<void> {
  const focused = page.locator(":focus");
  await expect(focused).toHaveCount(1);
  const matchesFirstAvailableSuccessor = await opener.evaluate((openerElement) => {
    if (!(openerElement instanceof HTMLElement)) return false;
    const selector = [
      "a[href]",
      "area[href]",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "summary",
      "[contenteditable='true']",
      "[tabindex]",
    ].join(", ");
    const isAvailable = (candidate: HTMLElement): boolean => {
      if (
        !candidate.isConnected ||
        candidate.tabIndex < 0 ||
        candidate.matches(":disabled") ||
        candidate.closest("[inert], [aria-disabled='true']") !== null
      ) {
        return false;
      }
      for (
        let current: HTMLElement | null = candidate;
        current !== null;
        current = current.parentElement
      ) {
        const style = getComputedStyle(current);
        if (
          current.hidden ||
          current.getAttribute("aria-hidden") === "true" ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse"
        ) {
          return false;
        }
      }
      return true;
    };
    const firstAvailableSuccessor = [
      ...openerElement.ownerDocument.querySelectorAll<HTMLElement>(selector),
    ].find(
      (candidate) =>
        (openerElement.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING) !==
          0 && isAvailable(candidate),
    );
    return (
      firstAvailableSuccessor !== undefined &&
      openerElement.ownerDocument.activeElement === firstAvailableSuccessor
    );
  });
  expect(matchesFirstAvailableSuccessor, `${label} must focus the first available successor`).toBe(
    true,
  );
  await expectVisibleFocusV1(focused, label);
}

async function openDiagnosticSurfaceFixtureV1(
  page: Page,
  surface: DiagnosticSurfaceV1,
): Promise<void> {
  if (surface === "fault_pause") {
    await page.goto(e2eUrlV1(["debug_tools", "cheats"]));
    await expectE2eApplicationV1(page);
    const faultScope = await triggerPublicFaultPauseV1(page);
    const rail = faultScope.getByRole("complementary", { name: "右侧开发工具" });
    if (await rail.isVisible()) {
      await rail.getByRole("button", { name: "关闭右侧开发工具" }).click();
      await expect(rail).toHaveCount(0);
    }
    return;
  }

  await page.goto(e2eUrlV1());
  await expectE2eApplicationV1(page);
  if (surface === "narrative") {
    await page
      .getByRole("group", { name: "测试操作" })
      .getByRole("button", { name: "开始流程", exact: true })
      .click();
    await expect(page.locator('[data-blocking-focus-scope="narrative"]')).toBeVisible();
  }
}

async function exportDiagnosticBundleV1(
  page: Page,
  activation: "keyboard" | "touch",
): Promise<{ readonly bundle: Record<string, unknown>; readonly text: string }> {
  const exportControl = page.getByRole("button", { name: "导出调试包" });
  await expect(exportControl).toBeEnabled();
  const prematureDownloads: unknown[] = [];
  const recordPrematureDownload = (download: unknown): void => {
    prematureDownloads.push(download);
  };
  page.on("download", recordPrematureDownload);
  if (activation === "touch") {
    await exportControl.tap();
  } else {
    await exportControl.focus();
    await page.keyboard.press("Space");
  }
  const review = page.getByRole("region", { name: "检查调试包内容" });
  await expect(review).toBeVisible();
  await expect(review.getByText("完整游戏状态与命令历史")).toBeVisible();
  await expect(review.getByText(/ B$/u)).toBeVisible();
  expect(prematureDownloads).toHaveLength(0);
  page.off("download", recordPrematureDownload);

  const downloadPromise = page.waitForEvent("download");
  const saveControl = review.getByRole("button", { name: "保存调试包" });
  if (activation === "touch") {
    await saveControl.tap();
  } else {
    await saveControl.focus();
    await page.keyboard.press("Space");
  }
  const download = await downloadPromise;
  const path = await download.path();
  if (path === null) throw new TypeError("diagnostic download has no local path");
  const text = await readFile(path, "utf8");
  return Object.freeze({ bundle: JSON.parse(text) as Record<string, unknown>, text });
}

function expectPlayerSafeDiagnosticExportV1(
  exported: { readonly bundle: Record<string, unknown>; readonly text: string },
  surface: DiagnosticSurfaceV1,
): void {
  expect(exported.bundle).toMatchObject({
    provenance: expect.any(Object),
    capabilities: expect.any(Object),
    replayBase: expect.any(Object),
    currentSnapshot: expect.any(Object),
    uiContext: expect.any(Object),
  });
  expect(exported.text).not.toMatch(/(?:\/Users\/|C:\\Users\\|file:\/\/|__SILLYMAKER_)/u);

  const uiContext = exported.bundle["uiContext"] as
    { readonly session?: { readonly narrativeOpen?: unknown } } | undefined;
  expect(uiContext?.session?.narrativeOpen).toBe(surface === "narrative");
  if (surface === "fault_pause") expect(exported.bundle["failure"]).toEqual(expect.any(Object));
  else expect(exported.bundle["failure"]).toBeUndefined();
}

async function expectNoHorizontalPageScrollV1(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("@phase5c global accessibility", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  test("@a11y has no WCAG A or AA violations across every blocking surface", async ({ page }) => {
    for (const surface of [
      "play",
      "overlay",
      "narrative",
      "system",
      "devdock",
      "fault_pause",
    ] as const) {
      await test.step(surface, async () => {
        const activeSurface = await openSurfaceFixtureV1(page, surface);
        await expect(activeSurface).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
          .analyze();
        expect(results.violations, `axe violations on ${surface}`).toEqual([]);
      });
    }
  });

  test("@a11y primary HUD exposes visible keyboard focus", async ({ page }) => {
    await page.goto(e2eUrlV1());
    await expectE2eApplicationV1(page);
    const start = page
      .getByRole("group", { name: "测试操作" })
      .getByRole("button", { name: "开始流程", exact: true });
    await start.focus();
    await expectVisibleFocusV1(start, "primary HUD action");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "流程操作" })).toBeVisible();
  });

  test("@a11y DevDock capability and global controls preserve pointer activation", async ({
    page,
  }, testInfo) => {
    const activate = async (control: Locator): Promise<void> => {
      if (testInfo.project.name === "chromium-touch") await control.tap();
      else await control.click();
    };
    await page.goto(e2eUrlV1());
    await expectE2eApplicationV1(page);

    await activate(page.getByRole("button", { name: "打开左侧开发工具" }));
    const rail = page.getByRole("complementary", { name: "左侧开发工具" });
    await expect(rail).toBeVisible();
    await activate(rail.getByRole("button", { name: "运行时能力", exact: true }));
    const capabilityPanel = rail.getByRole("region", { name: "运行时能力" });
    await expect(capabilityPanel).toBeVisible();

    const cheatsConfirmation = capabilityPanel.getByRole("checkbox", {
      name: "我确认启用作弊功能",
    });
    await activate(cheatsConfirmation);
    await expect(cheatsConfirmation).toBeChecked();
    const cheats = capabilityPanel.getByRole("switch", { name: "作弊功能" });
    await expect(cheats).toBeEnabled();
    await activate(cheats);
    await expect(cheats).toBeChecked();
    await expect(capabilityPanel.getByText("作弊功能已启用")).toBeVisible();

    await activate(rail.getByRole("button", { name: "关闭左侧开发工具" }));
    await expect(rail).toHaveCount(0);
    await activate(page.getByRole("button", { name: "打开测试面板", exact: true }));
    await expect(page.getByRole("dialog", { name: "测试面板" })).toBeVisible();
  });

  for (const surface of ["overlay", "narrative", "system"] as const) {
    test(`@a11y ${surface} preserves nested DevDock and blocker focus restoration`, async ({
      page,
    }) => {
      await page.goto(e2eUrlV1());
      await expectE2eApplicationV1(page);
      const fixture = await openRestorableBlockingSurfaceV1(page, surface);
      await openDevDockInsideScopeV1(page, fixture.scope, surface);
      await closeRestorableBlockingSurfaceV1(page, surface, fixture.scope);
      if (surface === "narrative") {
        await expect(fixture.opener).toBeDisabled();
        await expectLogicalSuccessorFocusV1(
          page,
          fixture.opener,
          "narrative successor restoration",
        );
      } else {
        await expectVisibleFocusV1(fixture.opener, `${surface} opener restoration`);
      }
    });
  }

  test("@a11y fault pause keeps DevDock nested until explicit recovery", async ({ page }) => {
    await page.goto(e2eUrlV1(["debug_tools", "cheats"]));
    await expectE2eApplicationV1(page);
    const faultScope = await triggerPublicFaultPauseV1(page);
    const rightRail = faultScope.getByRole("complementary", { name: "右侧开发工具" });
    await rightRail.getByRole("button", { name: "关闭右侧开发工具" }).click();
    await expect(rightRail).toHaveCount(0);
    await openDevDockInsideScopeV1(page, faultScope, "fault_pause");
    const recover = faultScope.getByRole("button", { name: "重新加载应用" });
    await expect(recover).toBeVisible();
    await Promise.all([page.waitForEvent("load"), activateWithKeyboardV1(page, recover)]);
    await expectE2eApplicationV1(page);
    await expect(faultScope).toHaveCount(0);
    await expect(page.getByTestId("semantic-publication")).toHaveAttribute(
      "data-semantic-status",
      "ready",
    );
  });

  for (const surface of ["normal", "narrative", "fault_pause"] as const) {
    test(`@a11y exports diagnostics from ${surface} with keyboard or touch`, async ({
      page,
    }, testInfo) => {
      await openDiagnosticSurfaceFixtureV1(page, surface);
      const exported = await exportDiagnosticBundleV1(
        page,
        testInfo.project.name === "chromium-touch" ? "touch" : "keyboard",
      );
      expectPlayerSafeDiagnosticExportV1(exported, surface);
    });
  }

  test("@a11y WCAG text spacing keeps labels and disabled reasons readable", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(e2eUrlV1());
    await expectE2eApplicationV1(page);
    await page.addStyleTag({
      content: `
        :where(*) {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        :where(p) { margin-block-end: 2em !important; }
      `,
    });

    await page.getByRole("button", { name: "打开右侧开发工具" }).click();
    const rail = page.getByRole("complementary", { name: "右侧开发工具" });
    await expect(rail.getByText("需要启用作弊功能").first()).toBeVisible();
    await expectNoHorizontalPageScrollV1(page);

    const labels = page.locator("button:visible");
    for (let index = 0; index < (await labels.count()); index += 1) {
      const label = labels.nth(index);
      const clipped = await label.evaluate(
        (element) =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      );
      expect(clipped, `button label ${index} must not be clipped`).toBe(false);
    }

    const describedDisabledControls = page.locator("button:disabled[aria-describedby]");
    expect(await describedDisabledControls.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await describedDisabledControls.count()); index += 1) {
      const descriptionIds = (
        (await describedDisabledControls.nth(index).getAttribute("aria-describedby")) ?? ""
      )
        .split(/\s+/u)
        .filter((id) => id.length > 0);
      expect(descriptionIds.length).toBeGreaterThan(0);
      for (const descriptionId of descriptionIds) {
        const reason = page.locator(`[id=${JSON.stringify(descriptionId)}]`);
        await expect(reason).toBeVisible();
        const bounds = await reason.boundingBox();
        expect(bounds?.width ?? 0).toBeGreaterThan(0);
        expect(bounds?.height ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
