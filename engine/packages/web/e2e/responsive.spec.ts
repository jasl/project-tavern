// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

interface ViewportV1 {
  readonly width: number;
  readonly height: number;
}

const responsiveViewportsV1 = Object.freeze([
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1600, height: 1000 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 2560, height: 1080 }),
  Object.freeze({ width: 800, height: 500 }),
] as const satisfies readonly ViewportV1[]);

const pocDebugUrlV1 = `${uiTargetUrlV1(uiTargetsV1.poc)}/?capability=debug_tools#/play`;

async function expectStageBoundsV1(
  stage: Locator,
  viewport: ViewportV1,
  constraints: { readonly maximumWidth: number; readonly maximumRatio: number },
): Promise<void> {
  await expect(stage).toBeInViewport();
  const bounds = await stage.boundingBox();
  expect(bounds, "the Stage must have a rendered bounding box").not.toBeNull();
  if (bounds === null) return;

  expect(bounds.width).toBeLessThanOrEqual(constraints.maximumWidth + 0.5);
  expect(bounds.width / bounds.height).toBeLessThanOrEqual(constraints.maximumRatio + 0.001);
  expect(bounds.x).toBeGreaterThanOrEqual(-0.5);
  expect(bounds.y).toBeGreaterThanOrEqual(-0.5);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 0.5);

  if (viewport.width > constraints.maximumWidth) {
    const leadingGutter = bounds.x;
    const trailingGutter = viewport.width - bounds.x - bounds.width;
    expect(Math.abs(leadingGutter - trailingGutter)).toBeLessThanOrEqual(1);
  }
}

async function expectMinimumSizeV1(
  control: Locator,
  minimum: { readonly width: number; readonly height: number },
): Promise<void> {
  await expect(control).toBeVisible();
  const bounds = await control.boundingBox();
  expect(bounds, "the control must have a rendered bounding box").not.toBeNull();
  if (bounds === null) return;
  expect(bounds.width).toBeGreaterThanOrEqual(minimum.width);
  expect(bounds.height).toBeGreaterThanOrEqual(minimum.height);
}

async function expectNoHorizontalPageScrollV1(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectNoUnreachableInteractiveContentV1(
  page: Page,
  activeScope: Locator,
): Promise<void> {
  await expectNoHorizontalPageScrollV1(page);
  const controls = activeScope.locator(
    "button:not(:disabled):visible, a[href]:visible, input:not(:disabled):visible, " +
      "select:not(:disabled):visible, textarea:not(:disabled):visible, " +
      "[tabindex]:not([tabindex='-1']):visible",
  );
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    await control.scrollIntoViewIfNeeded();
    await expect(control, `interactive control ${index} must remain visible`).toBeVisible();
    const reachable = await control.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return false;
      const x = Math.min(window.innerWidth - 1, Math.max(0, bounds.left + bounds.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, bounds.top + bounds.height / 2));
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (element === hit || element.contains(hit) || hit.contains(element));
    });
    expect(reachable, `interactive control ${index} must be reachable by hit testing`).toBe(true);
  }
}

async function expectPortraitDevDockSheetV1(page: Page, rail: Locator): Promise<void> {
  const sheet = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(sheet, "portrait DevDock must expose one modal sheet").toHaveCount(1);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("complementary", { name: "左侧开发工具" })).toHaveCount(1);
  await expect(rail).toBeVisible();

  const bounds = await sheet.boundingBox();
  expect(bounds, "portrait DevDock sheet must have bounds").not.toBeNull();
  if (bounds !== null) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(768);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(1024);
  }

  for (const side of ["左侧", "右侧"] as const) {
    const launcher = page.getByRole("button", { name: `打开${side}开发工具`, includeHidden: true });
    await expect(launcher).toHaveCount(1);
    await expect(launcher).toBeHidden();
    expect(
      await launcher.evaluate(
        (element) =>
          element.tabIndex < 0 || (element instanceof HTMLButtonElement && element.disabled),
      ),
      `${side} launcher must leave the Tab order while the modal sheet is open`,
    ).toBe(true);
  }

  const focusable = sheet.locator(
    "button:not(:disabled):visible, a[href]:visible, input:not(:disabled):visible, " +
      "select:not(:disabled):visible, textarea:not(:disabled):visible, " +
      "[tabindex]:not([tabindex='-1']):visible",
  );
  const count = await focusable.count();
  expect(count).toBeGreaterThan(0);
  const first = focusable.first();
  const last = focusable.last();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last, "Shift+Tab must wrap to the last sheet control").toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first, "Tab must wrap to the first sheet control").toBeFocused();
}

test.describe("@phase5c @responsive global shell", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  for (const viewport of responsiveViewportsV1) {
    test(`@responsive complete shell at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(pocDebugUrlV1);
      const stage = page.getByRole("main");
      await expect(stage).toHaveCount(1);
      await expectStageBoundsV1(stage, viewport, { maximumWidth: 1600, maximumRatio: 1.6 });

      const leftLauncher = page.getByRole("button", { name: "打开左侧开发工具" });
      await expectMinimumSizeV1(leftLauncher, { width: 44, height: 44 });
      if (testInfo.project.name === "chromium-touch") await leftLauncher.tap();
      else await leftLauncher.click();
      const rail = page.getByRole("complementary", { name: "左侧开发工具" });
      await expect(rail).toBeVisible();
      if (viewport.width === 768 && viewport.height === 1024) {
        await expectPortraitDevDockSheetV1(page, rail);
      }
      await expectNoUnreachableInteractiveContentV1(
        page,
        page.locator('[data-devdock-open="true"]'),
      );
    });
  }

  test("@responsive remains operable at equivalent 200 percent zoom", async ({
    browser,
  }, testInfo) => {
    const touch = testInfo.project.name === "chromium-touch";
    const context = await browser.newContext({
      viewport: { width: 800, height: 500 },
      deviceScaleFactor: 2,
      hasTouch: touch,
    });
    try {
      const page = await context.newPage();
      await page.goto(pocDebugUrlV1);
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
      expect(
        await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      ).toEqual({ width: 800, height: 500 });
      await expect(page.getByRole("main")).toBeVisible();
      const launcher = page.getByRole("button", { name: "打开左侧开发工具" });
      if (touch) await launcher.tap();
      else await launcher.click();
      await expect(page.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
      await expectNoUnreachableInteractiveContentV1(
        page,
        page.locator('[data-devdock-open="true"]'),
      );
    } finally {
      await context.close();
    }
  });
});
