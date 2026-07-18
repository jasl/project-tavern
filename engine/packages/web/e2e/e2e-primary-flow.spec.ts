// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

type E2eActionIdV1 =
  | "action.e2e.start"
  | "action.e2e.increment"
  | "action.e2e.choose"
  | "action.e2e.continue"
  | "action.e2e.complete";

interface E2eInvocationV1 {
  readonly actionId: E2eActionIdV1;
  readonly parameters: Readonly<Record<string, string>>;
}

interface E2eActionDescriptorV1 {
  readonly actionId: E2eActionIdV1;
  readonly enabled: boolean;
  readonly reasons: readonly { readonly code: string }[];
  readonly options: readonly E2eInvocationV1[];
}

interface E2eGameViewV1 {
  readonly counterLabel: string;
  readonly flow: {
    readonly status: "idle" | "choosing" | "blocked" | "resolved";
    readonly nodeId: "intro" | "choice" | "left" | "right" | "rejoin" | "done";
  };
  readonly terminal: boolean;
}

interface E2ePublicationV1 {
  readonly revision: number;
  readonly status: string;
  readonly game: E2eGameViewV1;
  readonly narrative: null;
  readonly actions: readonly E2eActionDescriptorV1[];
}

type AutomationResultV1<TValue> =
  { readonly kind: "ok"; readonly value: TValue } | { readonly kind: "capability_disabled" };

interface AutomationDispatchStepV1 {
  readonly before: E2ePublicationV1;
  readonly invocation: E2eInvocationV1;
  readonly dispatched: AutomationResultV1<
    | { readonly kind: "committed" }
    | { readonly kind: "rejected"; readonly reasons: readonly { readonly code: string }[] }
  >;
  readonly idle: AutomationResultV1<E2ePublicationV1>;
}

interface PreviewWitnessV1 {
  readonly actionId: E2eActionIdV1;
  readonly invocation: E2eInvocationV1;
  readonly result: AutomationResultV1<
    | { readonly kind: "allowed" }
    | { readonly kind: "rejected"; readonly reasons: readonly { readonly code: string }[] }
  >;
}

const e2eWebUrlV1 = `${uiTargetUrlV1(uiTargetsV1.e2e)}/?capability=automation_bridge#/play`;
const primaryActionIdsV1 = Object.freeze([
  "action.e2e.increment",
  "action.e2e.start",
] as const satisfies readonly E2eActionIdV1[]);

function applicationV1(page: Page): Locator {
  return page.getByRole("application", { name: "SillyMaker 引擎测试" });
}

async function openE2eApplicationV1(page: Page): Promise<void> {
  await page.goto(e2eWebUrlV1);
  await expect(applicationV1(page)).toHaveAttribute("data-application-id", "e2e-web");
  await expect(page.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();
  await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);
}

async function observeV1(page: Page): Promise<E2ePublicationV1> {
  return await page.evaluate(() => {
    const automation = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    if (automation === undefined) throw new Error("automation bridge is unavailable");
    const observed = automation.observe();
    if (observed.kind !== "ok") throw new Error("automation bridge is disabled");
    return observed.value as E2ePublicationV1;
  });
}

function requireDescriptorV1(
  publication: E2ePublicationV1,
  actionId: E2eActionIdV1,
): E2eActionDescriptorV1 {
  const matches = publication.actions.filter((descriptor) => descriptor.actionId === actionId);
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new Error(`expected one ${actionId} descriptor`);
  }
  return matches[0];
}

function requireInvocationV1(
  publication: E2ePublicationV1,
  actionId: E2eActionIdV1,
  choice?: "left" | "right",
): E2eInvocationV1 {
  const descriptor = requireDescriptorV1(publication, actionId);
  if (!descriptor.enabled) throw new Error(`expected ${actionId} to be enabled`);
  const matches = descriptor.options.filter(
    (invocation) =>
      invocation.actionId === actionId &&
      (choice === undefined || invocation.parameters["choice"] === choice),
  );
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new Error(`expected one controlled option for ${actionId}`);
  }
  return matches[0];
}

async function waitForIdleAfterV1(
  page: Page,
  revision: number,
): Promise<AutomationResultV1<E2ePublicationV1>> {
  return await page.evaluate(async (afterRevision) => {
    const automation = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    if (automation === undefined) throw new Error("automation bridge is unavailable");
    return (await automation.waitForIdle(
      afterRevision as Parameters<typeof automation.waitForIdle>[0],
    )) as AutomationResultV1<E2ePublicationV1>;
  }, revision);
}

async function dispatchThroughDomV1(input: {
  readonly page: Page;
  readonly actionId: E2eActionIdV1;
  readonly control: Locator;
  readonly choice?: "left" | "right";
}): Promise<E2ePublicationV1> {
  const before = await observeV1(input.page);
  requireInvocationV1(before, input.actionId, input.choice);
  const idle = waitForIdleAfterV1(input.page, before.revision);
  await input.control.click();
  const settled = await idle;
  expect(settled.kind).toBe("ok");
  if (settled.kind !== "ok") throw new Error("automation bridge disabled while waiting");
  expect(settled.value.revision).toBe(before.revision + 1);
  expect(settled.value.status).toBe("ready");
  await expect(applicationV1(input.page)).toHaveAttribute(
    "data-semantic-revision",
    String(settled.value.revision),
  );
  return settled.value;
}

async function dispatchThroughAutomationV1(
  page: Page,
  actionId: E2eActionIdV1,
  choice?: "left" | "right",
): Promise<AutomationDispatchStepV1> {
  return await page.evaluate(
    async ({ requestedActionId, requestedChoice }) => {
      const automation = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
      if (automation === undefined) throw new Error("automation bridge is unavailable");
      const observed = automation.observe();
      if (observed.kind !== "ok") throw new Error("automation bridge is disabled");
      const before = observed.value as E2ePublicationV1;
      const descriptor = before.actions.find(
        (candidate) => candidate.actionId === requestedActionId,
      );
      if (descriptor === undefined || !descriptor.enabled) {
        throw new Error(`enabled descriptor is unavailable: ${requestedActionId}`);
      }
      const options = descriptor.options.filter(
        (candidate) =>
          candidate.actionId === requestedActionId &&
          (requestedChoice === undefined || candidate.parameters["choice"] === requestedChoice),
      );
      const invocation = options.length === 1 ? options[0] : undefined;
      if (invocation === undefined) {
        throw new Error(`controlled option is unavailable: ${requestedActionId}`);
      }

      const idle = automation.waitForIdle(
        before.revision as Parameters<typeof automation.waitForIdle>[0],
      );
      const dispatched = await automation.dispatch(invocation);
      return {
        before,
        invocation,
        dispatched,
        idle: await idle,
      } as AutomationDispatchStepV1;
    },
    { requestedActionId: actionId, requestedChoice: choice },
  );
}

function expectCommittedStepV1(step: AutomationDispatchStepV1): E2ePublicationV1 {
  expect(step.dispatched).toEqual({ kind: "ok", value: { kind: "committed" } });
  expect(step.idle.kind).toBe("ok");
  if (step.idle.kind !== "ok") throw new Error("automation bridge disabled while waiting");
  expect(step.idle.value.revision).toBe(step.before.revision + 1);
  expect(step.idle.value.status).toBe("ready");
  return step.idle.value;
}

function expectGameV1(
  publication: E2ePublicationV1,
  expected: {
    readonly counter: number;
    readonly status: E2eGameViewV1["flow"]["status"];
    readonly nodeId: E2eGameViewV1["flow"]["nodeId"];
    readonly terminal?: boolean;
  },
): void {
  expect(publication.game).toEqual({
    counterLabel: `计数 ${expected.counter}`,
    flow: { status: expected.status, nodeId: expected.nodeId },
    terminal: expected.terminal ?? false,
  });
}

async function previewPrimaryActionsV1(page: Page): Promise<readonly PreviewWitnessV1[]> {
  return await page.evaluate(async (actionIds) => {
    const automation = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    if (automation === undefined) throw new Error("automation bridge is unavailable");
    const observed = automation.observe();
    if (observed.kind !== "ok") throw new Error("automation bridge is disabled");
    const publication = observed.value as E2ePublicationV1;
    const witnesses: PreviewWitnessV1[] = [];
    for (const actionId of actionIds) {
      const descriptor = publication.actions.find((candidate) => candidate.actionId === actionId);
      if (descriptor === undefined || !descriptor.enabled || descriptor.options.length !== 1) {
        throw new Error(`enabled single-option descriptor is unavailable: ${actionId}`);
      }
      const invocation = descriptor.options[0];
      if (invocation === undefined || invocation.actionId !== actionId) {
        throw new Error(`controlled option is unavailable: ${actionId}`);
      }
      witnesses.push({
        actionId,
        invocation,
        result: (await automation.preview(invocation)) as PreviewWitnessV1["result"],
      });
    }
    return witnesses;
  }, primaryActionIdsV1);
}

async function expectSemanticInvariantV1(
  page: Page,
  baseline: E2ePublicationV1,
  previewBaseline: readonly PreviewWitnessV1[],
): Promise<void> {
  const current = await observeV1(page);
  expect(current.revision).toBe(baseline.revision);
  expect(current.game).toEqual(baseline.game);
  expect(current.narrative).toBe(baseline.narrative);
  expect(current.actions).toEqual(baseline.actions);
  expect(await previewPrimaryActionsV1(page)).toEqual(previewBaseline);
  await expect(applicationV1(page)).toHaveAttribute(
    "data-semantic-revision",
    String(baseline.revision),
  );
}

async function openSettingsV1(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "设置" }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  return settings;
}

async function closeSettingsV1(settings: Locator): Promise<void> {
  await settings.getByRole("button", { name: "关闭" }).click();
  await expect(settings).toHaveCount(0);
}

async function expectCueWitnessesV1(
  page: Page,
  expected: { readonly alpha: boolean; readonly beta: boolean },
): Promise<void> {
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.alpha"]')).toHaveCount(
    expected.alpha ? 1 : 0,
  );
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.beta"]')).toHaveCount(
    expected.beta ? 1 : 0,
  );
}

test.describe("@phase5c @primary-flow", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  test("DOM completes the cross-owner branch, blocked workflow, rejoin, and terminal", async ({
    page,
  }) => {
    await openE2eApplicationV1(page);

    let publication = await dispatchThroughDomV1({
      page,
      actionId: "action.e2e.increment",
      control: page
        .getByTestId("stage-scene-interaction")
        .getByRole("button", { name: "增加计数" }),
    });
    expectGameV1(publication, { counter: 1, status: "idle", nodeId: "intro" });

    publication = await dispatchThroughDomV1({
      page,
      actionId: "action.e2e.start",
      control: page.getByRole("group", { name: "测试操作" }).getByRole("button", {
        name: "开始流程",
        exact: true,
      }),
    });
    expectGameV1(publication, { counter: 1, status: "choosing", nodeId: "choice" });
    const narrative = page.getByRole("dialog", { name: "流程操作" });
    await expect(narrative).toBeVisible();
    await expect(narrative).toContainText("选择");
    await expect(page.getByTestId("stage-hud")).toHaveAttribute("inert", "");

    publication = await dispatchThroughDomV1({
      page,
      actionId: "action.e2e.choose",
      choice: "left",
      control: narrative.getByRole("button", { name: "选择左侧" }),
    });
    expectGameV1(publication, { counter: 2, status: "blocked", nodeId: "rejoin" });
    await expect(narrative).toBeVisible();
    await expect(narrative).toContainText("汇合");
    await expect(narrative.getByRole("button", { name: "继续" })).toBeEnabled();

    publication = await dispatchThroughDomV1({
      page,
      actionId: "action.e2e.continue",
      control: narrative.getByRole("button", { name: "继续" }),
    });
    expectGameV1(publication, { counter: 2, status: "resolved", nodeId: "done" });
    await expect(narrative).toHaveCount(0);

    publication = await dispatchThroughDomV1({
      page,
      actionId: "action.e2e.complete",
      control: page.getByRole("group", { name: "测试操作" }).getByRole("button", {
        name: "完成流程",
        exact: true,
      }),
    });
    expectGameV1(publication, {
      counter: 2,
      status: "resolved",
      nodeId: "done",
      terminal: true,
    });
    await expect(page.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
  });

  test("Automation completes the same cross-owner branch and terminal publication", async ({
    page,
  }) => {
    await openE2eApplicationV1(page);

    let publication = expectCommittedStepV1(
      await dispatchThroughAutomationV1(page, "action.e2e.increment"),
    );
    expectGameV1(publication, { counter: 1, status: "idle", nodeId: "intro" });

    publication = expectCommittedStepV1(
      await dispatchThroughAutomationV1(page, "action.e2e.start"),
    );
    expectGameV1(publication, { counter: 1, status: "choosing", nodeId: "choice" });
    const narrative = page.getByRole("dialog", { name: "流程操作" });
    await expect(narrative).toBeVisible();
    await expect(narrative).toContainText("选择");

    publication = expectCommittedStepV1(
      await dispatchThroughAutomationV1(page, "action.e2e.choose", "left"),
    );
    expectGameV1(publication, { counter: 2, status: "blocked", nodeId: "rejoin" });
    await expect(narrative).toBeVisible();
    await expect(narrative).toContainText("汇合");

    publication = expectCommittedStepV1(
      await dispatchThroughAutomationV1(page, "action.e2e.continue"),
    );
    expectGameV1(publication, { counter: 2, status: "resolved", nodeId: "done" });
    await expect(narrative).toHaveCount(0);

    publication = expectCommittedStepV1(
      await dispatchThroughAutomationV1(page, "action.e2e.complete"),
    );
    expectGameV1(publication, {
      counter: 2,
      status: "resolved",
      nodeId: "done",
      terminal: true,
    });
    await expect(page.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
  });

  test("content preference sequence preserves Semantic actions and controlled previews", async ({
    page,
  }) => {
    await openE2eApplicationV1(page);
    await page.getByTestId("stage-hud").getByRole("button", { name: "与测试计数器互动" }).click();
    const interaction = page.getByRole("region", { name: "测试计数器互动" });
    await expect(interaction).toBeVisible();

    const baseline = await observeV1(page);
    const previewBaseline = await previewPrimaryActionsV1(page);
    expect(previewBaseline.map(({ result }) => result)).toEqual([
      { kind: "ok", value: { kind: "allowed" } },
      { kind: "ok", value: { kind: "allowed" } },
    ]);
    await expectCueWitnessesV1(page, { alpha: false, beta: false });

    let settings = await openSettingsV1(page);
    const alpha = settings.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
    const beta = settings.locator('[data-content-flag-id="content_flag.e2e.beta"]');
    const streamSafe = settings.locator(
      '[data-content-preset-id="content_preset.e2e.stream_safe"]',
    );
    await expect(alpha).toHaveRole("checkbox");
    await expect(beta).toHaveRole("checkbox");
    await expect(alpha).not.toBeChecked();
    await expect(beta).not.toBeChecked();
    await expect(streamSafe).toHaveAttribute("aria-pressed", "false");

    await alpha.click();
    await expect(alpha).toBeChecked();
    await expect(beta).not.toBeChecked();
    await expectCueWitnessesV1(page, { alpha: false, beta: false });
    await expectSemanticInvariantV1(page, baseline, previewBaseline);
    await closeSettingsV1(settings);
    await interaction.getByRole("button", { name: "显示 Alpha 提示" }).click();
    await expectCueWitnessesV1(page, { alpha: true, beta: false });

    settings = await openSettingsV1(page);
    const alphaAfterReopen = settings.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
    const betaAfterReopen = settings.locator('[data-content-flag-id="content_flag.e2e.beta"]');
    await alphaAfterReopen.click();
    await expect(alphaAfterReopen).not.toBeChecked();
    await expect(betaAfterReopen).not.toBeChecked();
    await expectCueWitnessesV1(page, { alpha: false, beta: false });
    await expectSemanticInvariantV1(page, baseline, previewBaseline);

    await betaAfterReopen.click();
    await expect(alphaAfterReopen).not.toBeChecked();
    await expect(betaAfterReopen).toBeChecked();
    await expectCueWitnessesV1(page, { alpha: false, beta: false });
    await expectSemanticInvariantV1(page, baseline, previewBaseline);
    await closeSettingsV1(settings);
    await interaction.getByRole("button", { name: "显示 Beta 提示" }).click();
    await expectCueWitnessesV1(page, { alpha: false, beta: true });

    settings = await openSettingsV1(page);
    const alphaWithBeta = settings.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
    const betaWithAlpha = settings.locator('[data-content-flag-id="content_flag.e2e.beta"]');
    const streamSafeWithBoth = settings.locator(
      '[data-content-preset-id="content_preset.e2e.stream_safe"]',
    );
    await alphaWithBeta.click();
    await expect(alphaWithBeta).toBeChecked();
    await expect(betaWithAlpha).toBeChecked();
    await expectCueWitnessesV1(page, { alpha: false, beta: true });
    await expectSemanticInvariantV1(page, baseline, previewBaseline);

    await streamSafeWithBoth.click();
    await expect(streamSafeWithBoth).toHaveAttribute("aria-pressed", "true");
    await expect(alphaWithBeta).not.toBeChecked();
    await expect(betaWithAlpha).toBeChecked();
    await expectCueWitnessesV1(page, { alpha: false, beta: true });
    await expectSemanticInvariantV1(page, baseline, previewBaseline);
    await closeSettingsV1(settings);

    await expect(interaction.getByRole("button", { name: "显示 Alpha 提示" })).toHaveCount(0);
    await expect(interaction.getByRole("button", { name: "显示 Beta 提示" })).toBeEnabled();
    await expectCueWitnessesV1(page, { alpha: false, beta: true });
  });
});
