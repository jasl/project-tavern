// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

const pocApplicationNameV1 = "Project Tavern 七日原型";
const pocDebugUrlV1 = `${uiTargetUrlV1(uiTargetsV1.poc)}/?capability=debug_tools#/play`;

async function expectPocApplicationV1(page: Page): Promise<Locator> {
  const application = page.getByRole("application", { name: pocApplicationNameV1 });
  await expect(application).toHaveAttribute("data-application-id", uiTargetsV1.poc.applicationId);
  return application;
}

async function expectNoWcagViolationsV1(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(results.violations, `axe violations on ${surface}`).toEqual([]);
}

async function expectVisibleFocusV1(control: Locator, label: string): Promise<void> {
  await expect(control, `${label} must own focus`).toBeFocused();
  const visible = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none"
    );
  });
  expect(visible, `${label} must have a visible focus indicator`).toBe(true);
}

async function expectNoHorizontalPageScrollV1(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("PoC accessibility", () => {
  test("has no WCAG A or AA violations on play, narrative, save, and DevDock surfaces", async ({
    page,
  }) => {
    await page.goto(pocDebugUrlV1);
    await expectPocApplicationV1(page);
    await expectNoWcagViolationsV1(page, "play");

    await page
      .getByTestId("stage-system")
      .getByRole("button", { name: "开始这一周", exact: true })
      .click();
    const narrative = page.getByRole("dialog", { name: "旅店的一周" });
    await expect(narrative).toBeVisible();
    await expectNoWcagViolationsV1(page, "narrative");
    await narrative.getByRole("button", { name: "继续" }).click();

    await page.getByRole("button", { name: "保存", exact: true }).click();
    const save = page.getByRole("dialog", { name: "保存" });
    await expect(save).toBeVisible();
    await expectNoWcagViolationsV1(page, "save");
    await save.getByRole("button", { name: "关闭", exact: true }).click();

    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    const devDock = page.getByRole("complementary", { name: "左侧开发工具" });
    await expect(devDock).toBeVisible();
    await expectNoWcagViolationsV1(page, "DevDock");
  });

  test("primary controls expose visible keyboard focus and native activation", async ({ page }) => {
    await page.goto(pocDebugUrlV1);
    await expectPocApplicationV1(page);

    const start = page
      .getByTestId("stage-system")
      .getByRole("button", { name: "开始这一周", exact: true });
    await start.focus();
    await expectVisibleFocusV1(start, "start action");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "旅店的一周" })).toBeVisible();
  });

  test("WCAG text spacing keeps controls and reasons readable", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(pocDebugUrlV1);
    await expectPocApplicationV1(page);
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
    await expect(page.getByRole("complementary", { name: "右侧开发工具" })).toBeVisible();
    await expectNoHorizontalPageScrollV1(page);

    const controls = page.locator("button:visible");
    for (let index = 0; index < (await controls.count()); index += 1) {
      const control = controls.nth(index);
      const clipped = await control.evaluate(
        (element) =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      );
      expect(clipped, `button label ${index} must not be clipped`).toBe(false);
    }
  });
});
