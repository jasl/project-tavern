// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1 } from "../ui-targets.js";

const pocWebUrlV1 = uiTargetUrlV1(uiTargetsV1.poc);

function semanticPublicationV1(page: Page): Locator {
  return page.locator("[data-semantic-publication]");
}

async function visibleSemanticRevisionV1(page: Page): Promise<number> {
  const publication = semanticPublicationV1(page);
  await expect(publication).toHaveCount(1);
  await expect(publication).toBeVisible();
  const value = await publication.getAttribute("data-semantic-revision");
  expect(value).toMatch(/^(?:0|[1-9]\d*)$/u);
  return Number(value);
}

async function expectVisibleSemanticRevisionV1(page: Page, revision: number): Promise<void> {
  await expect(semanticPublicationV1(page)).toHaveAttribute(
    "data-semantic-revision",
    String(revision),
  );
}

async function activateV1(locator: Locator, touch: boolean): Promise<void> {
  if (touch) await locator.tap();
  else await locator.click();
}

async function enterPocWeekV1(page: Page, touch: boolean): Promise<void> {
  let revision = await visibleSemanticRevisionV1(page);
  await activateV1(
    page.getByTestId("stage-system").getByRole("button", { name: "开始这一周", exact: true }),
    touch,
  );
  await expectVisibleSemanticRevisionV1(page, (revision += 1));

  const narrative = page.getByRole("dialog", { name: "旅店的一周" });
  await activateV1(narrative.getByRole("button", { name: "继续" }), touch);
  await expectVisibleSemanticRevisionV1(page, (revision += 1));
  await expect(narrative).toHaveCount(0);

  await activateV1(
    page.getByTestId("stage-system").getByRole("button", { name: "选择生活策略", exact: true }),
    touch,
  );
  const policy = page.getByRole("dialog", { name: "生活策略" });
  await activateV1(policy.getByRole("radio", { name: "夜猫子作息" }), touch);
  await activateV1(policy.getByRole("button", { name: "确认" }), touch);
  await expectVisibleSemanticRevisionV1(page, revision + 1);
  await activateV1(policy.getByRole("button", { name: "关闭" }), touch);
  await expect(policy).toHaveCount(0);
}

test("PoC Stage replacement closes heroine Interaction without a Gameplay revision", async ({
  page,
}, testInfo) => {
  await page.goto(`${pocWebUrlV1}/#/play`);
  const touch = testInfo.project.name === "chromium-touch";
  await enterPocWeekV1(page, touch);
  const before = await visibleSemanticRevisionV1(page);
  const heroineEntry = page.locator(
    'button[data-interaction-surface-id="surface.poc.tavern"]' +
      '[data-interaction-target-id="target.poc.heroine.figure"]',
  );
  await expect(heroineEntry).toHaveAccessibleName("与女主互动");
  await activateV1(heroineEntry, touch);
  await expect(page.getByRole("region", { name: "女主角互动区" })).toBeVisible();

  await activateV1(
    page.getByTestId("stage-system").getByRole("button", { name: "采购原料" }),
    touch,
  );
  await expect(page.locator('[data-stage-scene-id="stage_scene.poc.market"]')).toBeVisible();
  await expect(page.getByRole("dialog", { name: "采购食材" })).toBeVisible();
  await expect(page.getByRole("region", { name: "女主角互动区" })).toHaveCount(0);
  await expectVisibleSemanticRevisionV1(page, before);
});
