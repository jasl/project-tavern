// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Browser, type Page } from "@playwright/test";

import { uiTargetUrlV1, uiTargetsV1, type UiTargetV1 } from "./ui-targets.js";

interface StoryTargetV1 {
  readonly applicationName: "Project Tavern 七日原型" | "SillyMaker 引擎测试";
  readonly target: UiTargetV1;
}

const storyTargetsV1 = Object.freeze([
  Object.freeze({
    applicationName: "SillyMaker 引擎测试",
    target: uiTargetsV1.e2e,
  }),
  Object.freeze({
    applicationName: "Project Tavern 七日原型",
    target: uiTargetsV1.poc,
  }),
] as const satisfies readonly StoryTargetV1[]);

const automationFacadeV1 = Object.freeze({
  contractRevision: 1,
  frozen: true,
  keys: Object.freeze([
    "availableActions",
    "contractRevision",
    "dispatch",
    "observe",
    "preview",
    "waitForIdle",
  ]),
});

function storyUrlV1(
  target: UiTargetV1,
  capabilities: readonly ("automation_bridge" | "cheats" | "debug_tools")[] = [],
): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${uiTargetUrlV1(target)}/${query.length === 0 ? "" : `?${query}`}#/play`;
}

async function expectApplicationV1(page: Page, story: StoryTargetV1): Promise<void> {
  await expect(page.getByRole("application", { name: story.applicationName })).toHaveAttribute(
    "data-application-id",
    story.target.applicationId,
  );
}

async function automationFacadeProbeV1(page: Page): Promise<{
  readonly contractRevision: unknown;
  readonly frozen: boolean;
  readonly keys: readonly string[];
} | null> {
  return await page.evaluate(() => {
    const automationGlobal = globalThis as typeof globalThis & {
      readonly __SILLYMAKER_AUTOMATION_V1__?: {
        readonly contractRevision: unknown;
      };
    };
    const facade = automationGlobal["__SILLYMAKER_AUTOMATION_V1__"];
    if (facade === undefined) return null;
    return {
      contractRevision: facade.contractRevision,
      frozen: Object.isFrozen(facade),
      keys: Object.keys(facade).toSorted(),
    };
  });
}

async function expectNoDevDockV1(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "打开左侧开发工具" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开右侧开发工具" })).toHaveCount(0);
}

async function openCapabilityPanelV1(page: Page): Promise<void> {
  await page.getByRole("button", { name: "打开左侧开发工具" }).click();
  const capabilityPanel = page.getByRole("button", { name: "运行时能力" });
  await expect(capabilityPanel).toBeVisible();
  await capabilityPanel.click();
  await expect(page.getByRole("switch", { name: "调试工具" })).toBeVisible();
}

async function expectFreshContextDefaultsV1(browser: Browser, story: StoryTargetV1): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(storyUrlV1(story.target));
    await expectApplicationV1(page, story);
    await expectNoDevDockV1(page);
    expect(await automationFacadeProbeV1(page)).toBeNull();

    await page.goto(storyUrlV1(story.target, ["debug_tools"]));
    await expectApplicationV1(page, story);
    await openCapabilityPanelV1(page);
    await expect(page.getByRole("switch", { name: "调试工具" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "调试工具" })).toBeDisabled();
    await expect(page.getByText("调试工具由本次会话请求启用")).toBeVisible();
    await expect(page.getByRole("switch", { name: "作弊功能" })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: "自动化桥接" })).not.toBeChecked();
    expect(await automationFacadeProbeV1(page)).toBeNull();
  } finally {
    await context.close();
  }
}

test.describe("@phase5c @infrastructure", () => {
  test("@smoke normal PoC and E2E URLs keep runtime capabilities off", async ({ page }) => {
    for (const story of storyTargetsV1) {
      await test.step(story.target.applicationId, async () => {
        await page.goto(storyUrlV1(story.target));
        await expectApplicationV1(page, story);
        await expectNoDevDockV1(page);
        expect(await automationFacadeProbeV1(page)).toBeNull();
      });
    }
  });

  test("debug_tools exposes read-only DevDock controls and disables mutation", async ({
    browser,
    page,
  }) => {
    for (const story of storyTargetsV1) {
      await test.step(story.target.applicationId, async () => {
        await page.goto(storyUrlV1(story.target, ["debug_tools"]));
        await expectApplicationV1(page, story);
        expect(await automationFacadeProbeV1(page)).toBeNull();

        await expect(page.getByRole("button", { name: "打开左侧开发工具" })).toBeVisible();
        await page.getByRole("button", { name: "打开右侧开发工具" }).click();
        await expect(page.getByRole("complementary", { name: "右侧开发工具" })).toBeVisible();
        await expect(page.getByRole("button", { name: "调试命令" })).toBeDisabled();

        const fixtureAnchors = page.getByRole("button", { name: /^载入夹具 /u });
        await expect(fixtureAnchors.first()).toBeVisible();
        const fixtureAnchorCount = await fixtureAnchors.count();
        expect(fixtureAnchorCount).toBeGreaterThan(0);
        for (let index = 0; index < fixtureAnchorCount; index += 1) {
          await expect(fixtureAnchors.nth(index)).toBeDisabled();
        }
      });

      await expectFreshContextDefaultsV1(browser, story);
    }
  });

  test("debug_tools and cheats require UI confirmation before a Cheat submit", async ({
    browser,
    page,
  }) => {
    const story = storyTargetsV1[0];
    await page.goto(storyUrlV1(story.target, ["debug_tools", "cheats"]));
    await expectApplicationV1(page, story);
    expect(await automationFacadeProbeV1(page)).toBeNull();

    await page.getByRole("button", { name: "打开右侧开发工具" }).click();
    const commandsTab = page.getByRole("button", { name: "调试命令" });
    await expect(commandsTab).toBeEnabled();
    await commandsTab.click();

    const command = page.getByRole("region", { name: "debug.e2e.counter.add" });
    const confirmation = command.getByRole("checkbox", { name: "确认执行此调试命令" });
    const submit = command.getByRole("button", { name: "执行调试命令" });
    await expect(submit).toBeDisabled();
    await confirmation.check();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(command.getByText("调试命令已提交（序列 1）")).toBeVisible();

    await expectFreshContextDefaultsV1(browser, story);
  });

  test("@smoke automation_bridge exposes exactly the six public facade members", async ({
    browser,
    page,
  }) => {
    for (const story of storyTargetsV1) {
      await test.step(story.target.applicationId, async () => {
        await page.goto(storyUrlV1(story.target, ["automation_bridge"]));
        await expectApplicationV1(page, story);
        await expectNoDevDockV1(page);
        expect(await automationFacadeProbeV1(page)).toEqual(automationFacadeV1);
      });

      await expectFreshContextDefaultsV1(browser, story);
    }
  });

  test("a no-query reload removes the session overlay and preserves an explicitly persisted switch", async ({
    browser,
    page,
  }) => {
    const story = storyTargetsV1[0];
    await page.goto(storyUrlV1(story.target, ["debug_tools"]));
    await expectApplicationV1(page, story);
    await openCapabilityPanelV1(page);

    const automationSwitch = page.getByRole("switch", { name: "自动化桥接" });
    await expect(automationSwitch).toBeEnabled();
    await expect(automationSwitch).not.toBeChecked();
    await automationSwitch.click();
    await expect(automationSwitch).toBeChecked();
    expect(await automationFacadeProbeV1(page)).toEqual(automationFacadeV1);

    await page.goto(storyUrlV1(story.target));
    await page.reload();
    await expectApplicationV1(page, story);
    await expectNoDevDockV1(page);
    expect(await automationFacadeProbeV1(page)).toEqual(automationFacadeV1);

    await expectFreshContextDefaultsV1(browser, story);
  });
});
