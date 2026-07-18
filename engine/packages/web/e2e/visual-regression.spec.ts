// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

type VisualFixtureV1 = "poc-stage-standard" | "poc-devdock-overlay" | "e2e-narrative";

const pocStandardVisualUrlV1 = `${uiTargetUrlV1(uiTargetsV1.poc)}/#/play`;
const pocDebugVisualUrlV1 = `${uiTargetUrlV1(uiTargetsV1.poc)}/?capability=debug_tools#/play`;
const e2eVisualUrlV1 = `${uiTargetUrlV1(uiTargetsV1.e2e)}/#/play`;

test.use({
  deviceScaleFactor: 1,
  viewport: { width: 1600, height: 1000 },
});

async function expectBundledVisualFontsV1(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const regular = await document.fonts.load('400 16px "Noto Sans SC"');
    const bold = await document.fonts.load('700 16px "Noto Sans SC"');
    return {
      boldCount: bold.length,
      boldReady: document.fonts.check('700 16px "Noto Sans SC"'),
      regularCount: regular.length,
      regularReady: document.fonts.check('400 16px "Noto Sans SC"'),
    };
  });
  expect(result).toEqual({
    boldCount: expect.any(Number),
    boldReady: true,
    regularCount: expect.any(Number),
    regularReady: true,
  });
  expect(result.regularCount).toBeGreaterThan(0);
  expect(result.boldCount).toBeGreaterThan(0);
}

async function expectSettledPublicationV1(page: Page): Promise<void> {
  const publication = page.locator("[data-semantic-publication]");
  await expect(publication).toHaveCount(1);
  await expect(publication).toHaveAttribute("data-semantic-status", "ready");
  await expect
    .poll(async () =>
      publication.evaluate(
        (element) =>
          new Promise<boolean>((resolve) => {
            const initial = element.getAttribute("data-semantic-revision");
            requestAnimationFrame(() => {
              const next = element.getAttribute("data-semantic-revision");
              requestAnimationFrame(() => {
                resolve(
                  initial !== null &&
                    /^(?:0|[1-9]\d*)$/u.test(initial) &&
                    initial === next &&
                    next === element.getAttribute("data-semantic-revision"),
                );
              });
            });
          }),
      ),
    )
    .toBe(true);
}

async function expectVisibleFocusWitnessV1(control: Locator): Promise<void> {
  await expect(control).toBeFocused();
  expect(
    await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none"
      );
    }),
  ).toBe(true);
}

async function expectNoVisualOverlapV1(
  first: Locator,
  second: Locator,
  label: string,
): Promise<void> {
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const [firstBounds, secondBounds] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  expect(firstBounds, `${label} first bounds`).not.toBeNull();
  expect(secondBounds, `${label} second bounds`).not.toBeNull();
  if (firstBounds === null || secondBounds === null) return;
  const overlapWidth =
    Math.min(firstBounds.x + firstBounds.width, secondBounds.x + secondBounds.width) -
    Math.max(firstBounds.x, secondBounds.x);
  const overlapHeight =
    Math.min(firstBounds.y + firstBounds.height, secondBounds.y + secondBounds.height) -
    Math.max(firstBounds.y, secondBounds.y);
  expect(
    overlapWidth <= 0.5 || overlapHeight <= 0.5,
    `${label} must not overlap (${overlapWidth}x${overlapHeight})`,
  ).toBe(true);
}

async function expectPackedNonOccludingHudV1(page: Page): Promise<void> {
  const stage = page.getByRole("main");
  const topCard = page.getByTestId("stage-hud").getByRole("region").first();
  const [stageBounds, topCardBounds] = await Promise.all([
    stage.boundingBox(),
    topCard.boundingBox(),
  ]);
  expect(stageBounds, "Stage bounds for HUD placement").not.toBeNull();
  expect(topCardBounds, "top-card bounds").not.toBeNull();
  if (stageBounds !== null && topCardBounds !== null) {
    expect(
      topCardBounds.y - stageBounds.y,
      "top-card must remain in the top Stage quarter",
    ).toBeLessThan(stageBounds.height / 4);
  }
  await expectNoVisualOverlapV1(
    page.locator('[data-semantic-action-catalog="true"]'),
    page.locator('[data-system-dialog-host-content="true"]'),
    "Semantic catalog and System chrome",
  );
  await expectNoVisualOverlapV1(
    topCard,
    page.getByTestId("stage-scene-interaction").locator("nav").last(),
    "top-card and Scene Interaction controls",
  );
}

async function openSettledVisualFixtureV1(page: Page, fixture: VisualFixtureV1): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  switch (fixture) {
    case "poc-stage-standard": {
      await page.goto(pocStandardVisualUrlV1);
      await expect(
        page.getByRole("application", { name: "Project Tavern 七日原型" }),
      ).toHaveAttribute("data-application-id", uiTargetsV1.poc.applicationId);
      await expect(page.getByRole("main", { name: "酒馆主厅" })).toBeVisible();
      await expect(page.getByRole("button", { name: "打开左侧开发工具" })).toHaveCount(0);
      await expectPackedNonOccludingHudV1(page);
      const focusWitness = page
        .getByTestId("stage-system")
        .getByRole("button", { name: "保存", exact: true });
      await focusWitness.focus();
      await expectVisibleFocusWitnessV1(focusWitness);
      break;
    }
    case "poc-devdock-overlay": {
      await page.goto(pocDebugVisualUrlV1);
      await expect(page.getByRole("main", { name: "酒馆主厅" })).toBeVisible();
      await page
        .getByTestId("stage-system")
        .getByRole("button", { name: "保存", exact: true })
        .click();
      const overlay = page.getByRole("dialog", { name: "保存" });
      await expect(overlay).toBeVisible();
      await expect(overlay.getByText("本地存档可用")).toBeVisible();
      await overlay.getByRole("button", { name: "打开左侧开发工具" }).click();
      const devDock = overlay.getByRole("complementary", { name: "左侧开发工具" });
      await expect(devDock).toBeVisible();
      await expect(devDock.getByRole("button", { name: "运行时能力", exact: true })).toBeVisible();
      await expect(page.locator('[data-devdock-surface="overlay"]')).toHaveAttribute(
        "data-devdock-open",
        "true",
      );
      const devDockSurface = page.locator('[data-devdock-surface="overlay"]');
      await expect(devDockSurface.locator('[data-devdock-launcher="left"]')).toBeHidden();
      const oppositeLauncher = devDockSurface.locator('[data-devdock-launcher="right"]');
      await expectNoVisualOverlapV1(
        devDock,
        oppositeLauncher,
        "DevDock rail and opposite launcher",
      );
      await devDock.getByRole("button", { name: "关闭左侧开发工具" }).click({ trial: true });
      await page.keyboard.press("Tab");
      const focusWitness = devDock.getByRole("button", { name: "运行时能力", exact: true });
      await expectVisibleFocusWitnessV1(focusWitness);
      break;
    }
    case "e2e-narrative": {
      await page.goto(e2eVisualUrlV1);
      await expect(page.getByRole("application", { name: "SillyMaker 引擎测试" })).toHaveAttribute(
        "data-application-id",
        uiTargetsV1.e2e.applicationId,
      );
      await page
        .getByRole("group", { name: "测试操作" })
        .getByRole("button", { name: "开始流程", exact: true })
        .click();
      const narrative = page.getByRole("dialog", { name: "流程操作" });
      await expect(narrative).toBeVisible();
      await expect(narrative).toHaveAttribute("data-blocking-focus-scope", "narrative");
      await expectPackedNonOccludingHudV1(page);
      await page.keyboard.press("Tab");
      const focusWitness = narrative.getByRole("button", { name: "选择右侧", exact: true });
      await expectVisibleFocusWitnessV1(focusWitness);
      break;
    }
  }
  await expectSettledPublicationV1(page);
  await expectBundledVisualFontsV1(page);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
}

test.describe("@phase5c @visual host-local Chromium baselines", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  test("@visual PoC standard stage", async ({ page }) => {
    await openSettledVisualFixtureV1(page, "poc-stage-standard");
    await expect(page).toHaveScreenshot("poc-stage-standard.png", { animations: "disabled" });
  });

  test("@visual PoC DevDock over workspace overlay", async ({ page }) => {
    await openSettledVisualFixtureV1(page, "poc-devdock-overlay");
    await expect(page).toHaveScreenshot("poc-devdock-overlay.png", { animations: "disabled" });
  });

  test("@visual E2E blocking narrative", async ({ page }) => {
    await openSettledVisualFixtureV1(page, "e2e-narrative");
    await expect(page).toHaveScreenshot("e2e-narrative.png", { animations: "disabled" });
  });
});
