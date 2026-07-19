// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1, type UiTargetV1 } from "./ui-targets.js";

interface AutomationActionV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly { readonly code: string }[];
  readonly directInvocation?: unknown;
  readonly options: readonly unknown[];
}

interface AutomationPublicationV1 {
  readonly revision: number;
  readonly status: unknown;
  readonly game: unknown;
  readonly narrative: unknown;
  readonly actions: readonly AutomationActionV1[];
}

interface StoryCaseV1 {
  readonly applicationName: "Project Tavern 七日原型";
  readonly target: UiTargetV1;
}

interface OpenStoryV1 {
  readonly context: BrowserContext;
  readonly page: Page;
}

interface DomActionV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly string[];
}

const storyCasesV1 = Object.freeze([
  Object.freeze({
    applicationName: "Project Tavern 七日原型",
    target: uiTargetsV1.poc,
  }),
] as const satisfies readonly StoryCaseV1[]);

function storyUrlV1(target: UiTargetV1, capabilities: readonly string[]): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${uiTargetUrlV1(target)}/${query.length === 0 ? "" : `?${query}`}#/play`;
}

async function openStoryV1(
  browser: Browser,
  story: StoryCaseV1,
  capabilities: readonly string[],
): Promise<OpenStoryV1> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(storyUrlV1(story.target, capabilities));
  await expect(page.getByRole("application", { name: story.applicationName })).toHaveAttribute(
    "data-application-id",
    story.target.applicationId,
  );
  return Object.freeze({ context, page });
}

async function observeV1(page: Page): Promise<AutomationPublicationV1> {
  await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);
  return await page.evaluate(() => {
    const result = globalThis["__SILLYMAKER_AUTOMATION_V1__"]?.observe();
    if (result?.kind !== "ok") throw new Error("automation bridge is unavailable");
    return result.value as AutomationPublicationV1;
  });
}

async function captureDomActionsV1(
  page: Page,
  story: StoryCaseV1,
): Promise<{
  readonly revision: number;
  readonly actions: readonly DomActionV1[];
  readonly allActionIds: readonly string[];
}> {
  const root = page.getByRole("application", { name: story.applicationName });
  await expect(root).toHaveAttribute("data-semantic-revision", /^(?:0|[1-9]\d*)$/u);
  return await root.evaluate((application) => {
    const revisionValue = application.getAttribute("data-semantic-revision");
    if (revisionValue === null) throw new Error("missing semantic revision witness");
    const catalog = application.querySelector('[data-semantic-action-catalog="true"]');
    if (catalog === null) throw new Error("missing canonical semantic action catalog");
    const canonicalByActionId = new Map<string, Element>();
    for (const node of catalog.querySelectorAll("[data-semantic-action-id]")) {
      const actionId = node.getAttribute("data-semantic-action-id");
      if (actionId !== null && !canonicalByActionId.has(actionId)) {
        canonicalByActionId.set(actionId, node);
      }
    }
    return {
      revision: Number(revisionValue),
      allActionIds: [
        ...new Set(
          [...application.querySelectorAll("[data-semantic-action-id]")].flatMap((node) => {
            const actionId = node.getAttribute("data-semantic-action-id");
            return actionId === null ? [] : [actionId];
          }),
        ),
      ].sort(),
      actions: [...canonicalByActionId.entries()]
        .map(([actionId, node]) => {
          const reasonCodes = node.getAttribute("data-semantic-disabled-reasons") ?? "";
          return {
            actionId,
            enabled: !node.matches(":disabled"),
            reasons: reasonCodes.length === 0 ? [] : reasonCodes.split(","),
          };
        })
        .sort((left, right) => left.actionId.localeCompare(right.actionId)),
    };
  });
}

function publicationActionsForDomV1(publication: AutomationPublicationV1): readonly DomActionV1[] {
  return publication.actions
    .map((action) => ({
      actionId: action.actionId,
      enabled: action.enabled,
      reasons: action.reasons.map((reason) => reason.code),
    }))
    .toSorted((left, right) => left.actionId.localeCompare(right.actionId));
}

async function previewEnabledInvocationsV1(page: Page): Promise<readonly unknown[]> {
  return await page.evaluate(async () => {
    const automation = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    const observed = automation?.observe();
    if (automation === undefined || observed?.kind !== "ok") {
      throw new Error("automation bridge is unavailable");
    }
    const previews: unknown[] = [];
    for (const action of observed.value.actions as AutomationActionV1[]) {
      if (!action.enabled) continue;
      const invocations: unknown[] = [];
      if (action.directInvocation !== undefined && action.directInvocation !== null) {
        invocations.push(action.directInvocation);
      }
      for (const option of action.options) {
        const candidate = option as { readonly invocation?: unknown; readonly actionId?: unknown };
        const invocation = candidate.invocation ?? option;
        if (
          invocation !== null &&
          typeof invocation === "object" &&
          typeof (invocation as { readonly actionId?: unknown }).actionId === "string"
        ) {
          invocations.push(invocation);
        }
      }
      for (const [optionIndex, invocation] of invocations.entries()) {
        previews.push({
          actionId: action.actionId,
          optionIndex,
          result: await automation.preview(invocation),
        });
      }
    }
    if (previews.length === 0) throw new Error("no enabled invocable action is published");
    return previews;
  });
}

test.describe("PoC semantic publication", () => {
  test("one publication stamps the Story root and every Gameplay action witness", async ({
    page,
  }) => {
    for (const story of storyCasesV1) {
      await test.step(story.target.applicationId, async () => {
        await page.goto(storyUrlV1(story.target, ["automation_bridge"]));
        const publication = await observeV1(page);
        const root = page.getByRole("application", { name: story.applicationName });

        await expect(root).toHaveAttribute("data-application-id", story.target.applicationId);
        await expect(root).toHaveAttribute("data-semantic-revision", String(publication.revision));
        expect(await captureDomActionsV1(page, story)).toEqual({
          revision: publication.revision,
          allActionIds: publication.actions.map(({ actionId }) => actionId).toSorted(),
          actions: publicationActionsForDomV1(publication),
        });
      });
    }
  });

  test("runtime capabilities preserve DOM, publication, and preview semantics", async ({
    browser,
  }) => {
    for (const story of storyCasesV1) {
      await test.step(story.target.applicationId, async () => {
        const automationOnly = await openStoryV1(browser, story, ["automation_bridge"]);
        let baselinePublication: AutomationPublicationV1;
        let baselinePreviews: readonly unknown[];
        try {
          baselinePublication = await observeV1(automationOnly.page);
          baselinePreviews = await previewEnabledInvocationsV1(automationOnly.page);
        } finally {
          await automationOnly.context.close();
        }

        for (const capabilities of [
          Object.freeze([]),
          Object.freeze(["debug_tools"]),
          Object.freeze(["debug_tools", "cheats"]),
        ] as const) {
          const fixture = await openStoryV1(browser, story, capabilities);
          try {
            expect(await captureDomActionsV1(fixture.page, story)).toEqual({
              revision: baselinePublication.revision,
              allActionIds: baselinePublication.actions.map(({ actionId }) => actionId).toSorted(),
              actions: publicationActionsForDomV1(baselinePublication),
            });
            expect(
              await fixture.page.evaluate(
                () => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined,
              ),
            ).toBe(false);
          } finally {
            await fixture.context.close();
          }
        }

        for (const capabilities of [
          Object.freeze(["debug_tools", "automation_bridge"]),
          Object.freeze(["debug_tools", "cheats", "automation_bridge"]),
        ] as const) {
          const fixture = await openStoryV1(browser, story, capabilities);
          try {
            expect(await observeV1(fixture.page)).toEqual(baselinePublication);
            expect(await previewEnabledInvocationsV1(fixture.page)).toEqual(baselinePreviews);
          } finally {
            await fixture.context.close();
          }
        }

        const fixture = await openStoryV1(browser, story, ["automation_bridge"]);
        try {
          await fixture.page.getByRole("button", { name: "设置" }).click();
          await expect(fixture.page.locator("[data-content-flag-id]")).toHaveCount(0);
          await expect(fixture.page.locator("[data-content-preset-id]")).toHaveCount(0);
        } finally {
          await fixture.context.close();
        }
      });
    }
  });
});
