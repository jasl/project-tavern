// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { uiTargetUrlV1, uiTargetsV1 } from "./ui-targets.js";

interface RejectionReasonV1 {
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

interface SemanticActionDescriptorV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly RejectionReasonV1[];
  readonly options?: readonly unknown[];
  readonly delivery?: "choices" | "direct" | "form";
  readonly directInvocation?: unknown;
}

interface SemanticPublicationV1 {
  readonly revision: number;
  readonly narrative: unknown;
  readonly actions: readonly SemanticActionDescriptorV1[];
}

type AutomationOperationV1<T> =
  { readonly kind: "ok"; readonly value: T } | { readonly kind: "capability_disabled" };

interface AutomationFacadeV1 {
  readonly contractRevision: 1;
  observe(): AutomationOperationV1<SemanticPublicationV1>;
  preview(invocation: unknown): Promise<AutomationOperationV1<unknown>>;
  dispatch(invocation: unknown): Promise<AutomationOperationV1<unknown>>;
  waitForIdle(afterRevision?: number): Promise<AutomationOperationV1<SemanticPublicationV1>>;
}

interface AutomationPageV1 {
  readonly context: BrowserContext;
  readonly page: Page;
}

const automationFacadeKeysV1 = Object.freeze([
  "availableActions",
  "contractRevision",
  "dispatch",
  "observe",
  "preview",
  "waitForIdle",
]);

const forbiddenPlayerResultKeysV1 = Object.freeze([
  "attempt",
  "commandLog",
  "facts",
  "fault",
  "rng",
  "snapshot",
  "state",
]);

async function createAutomationPageV1(
  browser: Browser,
  capabilities: readonly ("automation_bridge" | "debug_tools")[] = ["automation_bridge"],
): Promise<AutomationPageV1> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  await page.goto(`${uiTargetUrlV1(uiTargetsV1.poc)}/?${query}#/play`);
  await expect(page.getByRole("application")).toHaveAttribute(
    "data-application-id",
    uiTargetsV1.poc.applicationId,
  );
  await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);
  return Object.freeze({ context, page });
}

function requireOkV1<T>(operation: AutomationOperationV1<T>, label: string): T {
  expect(operation.kind, label).toBe("ok");
  if (operation.kind !== "ok") throw new TypeError(`${label}: automation bridge disabled`);
  return operation.value;
}

async function observeV1(page: Page): Promise<SemanticPublicationV1> {
  const operation = await page.evaluate(() => {
    const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
      AutomationFacadeV1 | undefined;
    return facade?.observe() ?? ({ kind: "capability_disabled" } as const);
  });
  return requireOkV1(operation, "observe");
}

async function previewV1(page: Page, invocation: unknown): Promise<AutomationOperationV1<unknown>> {
  return await page.evaluate(async (value) => {
    const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
      AutomationFacadeV1 | undefined;
    return (await facade?.preview(value)) ?? ({ kind: "capability_disabled" } as const);
  }, invocation);
}

async function dispatchV1(
  page: Page,
  invocation: unknown,
): Promise<AutomationOperationV1<unknown>> {
  return await page.evaluate(async (value) => {
    const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
      AutomationFacadeV1 | undefined;
    return (await facade?.dispatch(value)) ?? ({ kind: "capability_disabled" } as const);
  }, invocation);
}

async function dispatchAndWaitV1(
  page: Page,
  publication: SemanticPublicationV1,
  invocation: unknown,
): Promise<{
  readonly dispatched: AutomationOperationV1<unknown>;
  readonly publication: SemanticPublicationV1;
}> {
  const outcome = await page.evaluate(
    async ({ afterRevision, value }) => {
      const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
        AutomationFacadeV1 | undefined;
      if (facade === undefined) return { kind: "capability_disabled" } as const;
      const idle = facade.waitForIdle(afterRevision);
      const dispatched = await facade.dispatch(value);
      return { kind: "ok" as const, dispatched, settled: await idle };
    },
    { afterRevision: publication.revision, value: invocation },
  );
  expect(outcome.kind).toBe("ok");
  if (outcome.kind !== "ok") throw new TypeError("dispatch: automation bridge disabled");
  return Object.freeze({
    dispatched: outcome.dispatched,
    publication: requireOkV1(outcome.settled, "waitForIdle"),
  });
}

function requireDescriptorV1(
  publication: SemanticPublicationV1,
  actionId: string,
): SemanticActionDescriptorV1 {
  const matches = publication.actions.filter((descriptor) => descriptor.actionId === actionId);
  expect(matches, `descriptor ${actionId}`).toHaveLength(1);
  const descriptor = matches[0];
  if (descriptor === undefined) throw new TypeError(`missing descriptor ${actionId}`);
  return descriptor;
}

function requireFirstPlayerInvocationV1(publication: SemanticPublicationV1): unknown {
  for (const descriptor of publication.actions) {
    if (!descriptor.enabled) continue;
    if (descriptor.delivery === "direct" && descriptor.directInvocation !== undefined) {
      return descriptor.directInvocation;
    }
    const invocation = descriptor.options?.[0];
    if (invocation !== undefined) return invocation;
  }
  throw new TypeError("missing enabled player invocation");
}

async function exportDiagnosticBundleV1(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole("button", { name: "导出调试包" }).click();
  const review = page.getByRole("region", { name: "检查调试包内容" });
  await expect(review).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await review.getByRole("button", { name: "保存调试包" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (path === null) throw new TypeError("diagnostic download has no local path");
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

function collectObjectKeysRecursivelyV1(value: unknown): readonly string[] {
  const keys = new Set<string>();
  const seen = new Set<object>();
  const visit = (current: unknown): void => {
    if (current === null || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    for (const [key, child] of Object.entries(current)) {
      keys.add(key);
      visit(child);
    }
  };
  visit(value);
  return [...keys].toSorted();
}

test.describe("PoC Automation bridge", () => {
  test("DOM and Automation dispatch both advance the public semantic state", async ({
    browser,
  }) => {
    const dom = await createAutomationPageV1(browser);
    const automation = await createAutomationPageV1(browser);
    try {
      const domBefore = await observeV1(dom.page);
      const automationBefore = await observeV1(automation.page);
      expect(domBefore.actions).toEqual(automationBefore.actions);

      const domIdle = dom.page.evaluate(async (afterRevision) => {
        const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
          AutomationFacadeV1 | undefined;
        return (
          (await facade?.waitForIdle(afterRevision)) ?? ({ kind: "capability_disabled" } as const)
        );
      }, domBefore.revision);
      await dom.page
        .getByTestId("stage-system")
        .getByRole("button", { name: "开始这一周", exact: true })
        .click();
      const domAfter = requireOkV1(await domIdle, "DOM waitForIdle");

      const invocation = requireDescriptorV1(automationBefore, "action.run_start").directInvocation;
      if (invocation === undefined) throw new TypeError("action.run_start has no invocation");
      const automated = await dispatchAndWaitV1(automation.page, automationBefore, invocation);
      expect(automated.dispatched).toEqual({ kind: "ok", value: { kind: "committed" } });
      expect(domAfter.revision).toBeGreaterThan(domBefore.revision);
      expect(automated.publication.revision).toBeGreaterThan(automationBefore.revision);
      expect(domAfter.actions).toEqual(automated.publication.actions);
      expect(domAfter.narrative).toEqual(automated.publication.narrative);
    } finally {
      await dom.context.close();
      await automation.context.close();
    }
  });

  test("a retained invocation is rejected after its action disappears", async ({ browser }) => {
    const fixture = await createAutomationPageV1(browser);
    try {
      const initial = await observeV1(fixture.page);
      const runStart = requireDescriptorV1(initial, "action.run_start");
      const retainedInvocation = runStart.directInvocation;
      if (retainedInvocation === undefined)
        throw new TypeError("action.run_start has no invocation");

      const committed = await dispatchAndWaitV1(fixture.page, initial, retainedInvocation);
      expect(committed.dispatched).toEqual({ kind: "ok", value: { kind: "committed" } });
      const expectedReasons = [{ code: "run.already_started", details: {} }];
      expect(await previewV1(fixture.page, retainedInvocation)).toEqual({
        kind: "ok",
        value: { allowed: false, command: { kind: "run.start" }, reasons: expectedReasons },
      });
      expect(await dispatchV1(fixture.page, retainedInvocation)).toEqual({
        kind: "ok",
        value: { kind: "rejected", reasons: expectedReasons },
      });
    } finally {
      await fixture.context.close();
    }
  });

  test("ordinary Automation keeps integrity normal and exposes no DebugTools", async ({
    browser,
  }) => {
    const fixture = await createAutomationPageV1(browser, ["debug_tools", "automation_bridge"]);
    try {
      const before = await observeV1(fixture.page);
      const outcome = await dispatchAndWaitV1(
        fixture.page,
        before,
        requireFirstPlayerInvocationV1(before),
      );
      expect(outcome.dispatched).toMatchObject({ kind: "ok", value: { kind: "committed" } });

      const facadeKeys = await fixture.page.evaluate(() =>
        Object.keys(globalThis["__SILLYMAKER_AUTOMATION_V1__"] ?? {}).toSorted(),
      );
      expect(facadeKeys).toEqual(automationFacadeKeysV1);
      expect(facadeKeys).not.toEqual(
        expect.arrayContaining(["anchorFixture", "executeDebugCommand", "queryDiagnostics"]),
      );

      const bundle = await exportDiagnosticBundleV1(fixture.page);
      expect(bundle).toMatchObject({ currentSnapshot: { integrity: { mode: "normal" } } });
    } finally {
      await fixture.context.close();
    }
  });

  test("dispatch results do not leak authoritative runtime state", async ({ browser }) => {
    const fixture = await createAutomationPageV1(browser);
    try {
      const before = await observeV1(fixture.page);
      const outcome = await dispatchAndWaitV1(
        fixture.page,
        before,
        requireFirstPlayerInvocationV1(before),
      );
      expect(outcome.dispatched.kind).toBe("ok");
      expect(
        collectObjectKeysRecursivelyV1(outcome.dispatched).filter((key) =>
          forbiddenPlayerResultKeysV1.includes(key),
        ),
      ).toEqual([]);
    } finally {
      await fixture.context.close();
    }
  });
});
