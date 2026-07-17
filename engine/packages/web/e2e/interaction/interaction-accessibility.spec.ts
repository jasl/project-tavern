import { expect, test, type Locator, type Page } from "@playwright/test";

const e2eWebUrlV1 = "http://127.0.0.1:41731";

function semanticPublicationV1(page: Page) {
  return page.locator("[data-semantic-publication]");
}

async function visibleSemanticRevisionV1(page: Page): Promise<number> {
  const publication = semanticPublicationV1(page);
  await expect(publication).toHaveCount(1);
  await expect(publication).toBeVisible();
  await expect(publication).toHaveAttribute("data-semantic-status", /\S+/u);
  const value = await publication.getAttribute("data-semantic-revision");
  expect(value).toMatch(/^(?:0|[1-9]\d*)$/u);
  return Number(value);
}

async function expectVisibleSemanticRevisionV1(page: Page, revision: number): Promise<void> {
  const publication = semanticPublicationV1(page);
  await expect(publication).toBeVisible();
  await expect(publication).toHaveAttribute("data-semantic-revision", String(revision));
  await expect(publication).toHaveAttribute("data-semantic-status", /\S+/u);
}

async function expectFullyInViewportV1(page: Page, locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

async function expectSceneLayerUnscrolledV1(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.getByTestId("stage-scene-interaction").evaluate((element) => ({
        overflows: element.scrollHeight > element.clientHeight,
        scrollTop: element.scrollTop,
      })),
    )
    .toEqual({ overflows: false, scrollTop: 0 });
}

async function activateV1(locator: Locator, touch: boolean): Promise<void> {
  if (touch) await locator.tap();
  else await locator.click();
}

async function selectCheckboxV1(locator: Locator, touch: boolean): Promise<void> {
  if (touch) await locator.tap();
  else await locator.click();
  await expect(locator).toBeChecked();
}

async function closeSettingsV1(page: Page, touch: boolean): Promise<void> {
  const settings = page.getByRole("dialog", { name: "设置" });
  await activateV1(settings.getByRole("button", { name: "关闭" }), touch);
  await expect(settings).toHaveCount(0);
}

test("exposes named 44px controls, disabled reasons, and parity markers without hover", async ({
  page,
}, testInfo) => {
  await page.goto(`${e2eWebUrlV1}/#/play`);

  await expectFullyInViewportV1(page, page.getByRole("button", { name: "增加计数" }));
  await expectFullyInViewportV1(page, page.getByTestId("spatial-increment-target"));
  await expectSceneLayerUnscrolledV1(page);

  const unavailable = page.getByRole("button", { name: "完成流程" });
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toHaveAttribute("aria-describedby", /\S+/u);
  await expect(page.getByText("当前流程不可用").first()).toBeVisible();

  await activateV1(
    page.getByRole("button", { name: "与测试计数器互动" }),
    testInfo.project.name === "chromium-touch",
  );
  const region = page.getByRole("region", { name: "测试计数器互动" });
  await expectFullyInViewportV1(page, region);
  await expectSceneLayerUnscrolledV1(page);

  const controls = region.getByRole("button");
  expect(await controls.count()).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    await expectFullyInViewportV1(page, control);
    await expect(control).toBeEnabled();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  const increment = region.getByRole("button", { name: "增加计数" });
  await expect(increment).toHaveAttribute("data-interaction-surface-id", "surface.e2e.counter");
  await expect(increment).toHaveAttribute(
    "data-interaction-target-id",
    "target.e2e.counter.figure",
  );
  await expect(increment).toHaveAttribute("data-semantic-action-id", "action.e2e.increment");
  await expect(increment).toHaveAttribute("aria-describedby", /\S+/u);
});

test("switches the independent Alpha presentation flag without changing Gameplay", async ({
  page,
}, testInfo) => {
  const touch = testInfo.project.name === "chromium-touch";
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const increment = page.getByRole("button", { name: "增加计数" });
  const incrementWasEnabled = await increment.isEnabled();
  const stage = page.getByTestId("stage-scene-background");
  await expect(stage).toHaveAttribute("data-stage-scene-id", "stage_scene.e2e.main");
  await expect(stage).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.default");

  await activateV1(page.getByRole("button", { name: "设置" }), touch);
  const alpha = page.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
  const beta = page.locator('[data-content-flag-id="content_flag.e2e.beta"]');
  await expect(alpha).toHaveRole("checkbox");
  await expect(beta).toHaveRole("checkbox");
  await selectCheckboxV1(alpha, touch);
  await expect(alpha).toBeChecked();
  await expect(beta).not.toBeChecked();
  await closeSettingsV1(page, touch);

  await expect(page.getByRole("button", { name: "显示 Alpha 提示" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "显示 Beta 提示" })).toHaveCount(0);
  await activateV1(page.getByRole("button", { name: "显示 Alpha 提示" }), touch);
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.alpha"]')).toBeVisible();
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.beta"]')).toHaveCount(0);
  expect(await increment.isEnabled()).toBe(incrementWasEnabled);
  await expect(stage).toHaveAttribute("data-stage-scene-id", "stage_scene.e2e.main");
  await expect(stage).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.default");
  await expectVisibleSemanticRevisionV1(page, before);
});

test("applies the stream-safe preset through the stable DOM contract", async ({
  page,
}, testInfo) => {
  const touch = testInfo.project.name === "chromium-touch";
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const increment = page.getByRole("button", { name: "增加计数" });
  const incrementWasEnabled = await increment.isEnabled();
  const stage = page.getByTestId("stage-scene-background");
  await expect(stage).toHaveAttribute("data-stage-scene-id", "stage_scene.e2e.main");
  await expect(stage).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.default");

  await activateV1(page.getByRole("button", { name: "设置" }), touch);
  const alpha = page.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
  const beta = page.locator('[data-content-flag-id="content_flag.e2e.beta"]');
  await selectCheckboxV1(alpha, touch);
  await selectCheckboxV1(beta, touch);
  const preset = page.locator('[data-content-preset-id="content_preset.e2e.stream_safe"]');
  await activateV1(preset, touch);
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(alpha).not.toBeChecked();
  await expect(beta).toBeChecked();
  await closeSettingsV1(page, touch);

  await expect(page.getByRole("button", { name: "显示 Alpha 提示" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "显示 Beta 提示" })).toBeEnabled();
  await activateV1(page.getByRole("button", { name: "显示 Beta 提示" }), touch);
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.alpha"]')).toHaveCount(0);
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.beta"]')).toBeVisible();
  expect(await increment.isEnabled()).toBe(incrementWasEnabled);
  await expect(stage).toHaveAttribute("data-stage-scene-id", "stage_scene.e2e.main");
  await expect(stage).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.default");
  await expectVisibleSemanticRevisionV1(page, before);
});
