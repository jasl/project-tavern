// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import {
  uiHarnessMetadataKeyV1,
  uiTargetUrlV1,
  uiTargetsV1,
  type UiTargetV1,
} from "./ui-targets.js";

interface RejectionReasonV1 {
  readonly code: string;
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
  readonly status: unknown;
  readonly game: unknown;
  readonly narrative: unknown;
  readonly actions: readonly SemanticActionDescriptorV1[];
}

type AutomationOperationV1<T> =
  { readonly kind: "ok"; readonly value: T } | { readonly kind: "capability_disabled" };

interface AutomationFacadeV1 {
  readonly contractRevision: 1;
  observe(): AutomationOperationV1<SemanticPublicationV1>;
  availableActions(): AutomationOperationV1<SemanticPublicationV1["actions"]>;
  preview(invocation: unknown): Promise<AutomationOperationV1<unknown>>;
  dispatch(invocation: unknown): Promise<AutomationOperationV1<unknown>>;
  waitForIdle(afterRevision?: number): Promise<AutomationOperationV1<SemanticPublicationV1>>;
}

interface AutomationPageV1 {
  readonly context: BrowserContext;
  readonly page: Page;
}

interface DomActionStateV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly RejectionReasonV1[];
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

function automationUrlV1(
  target: UiTargetV1,
  capabilities: readonly ("automation_bridge" | "debug_tools")[] = ["automation_bridge"],
): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${uiTargetUrlV1(target)}/?${query}#/play`;
}

async function createAutomationPageV1(
  browser: Browser,
  target: UiTargetV1,
  capabilities?: readonly ("automation_bridge" | "debug_tools")[],
): Promise<AutomationPageV1> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(automationUrlV1(target, capabilities));
  await expect(page.getByRole("application")).toHaveAttribute(
    "data-application-id",
    target.applicationId,
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
    if (facade === undefined) return { kind: "capability_disabled" } as const;
    return facade.observe();
  });
  return requireOkV1(operation, "observe");
}

async function previewV1(page: Page, invocation: unknown): Promise<AutomationOperationV1<unknown>> {
  return await page.evaluate(async (value) => {
    const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
      AutomationFacadeV1 | undefined;
    if (facade === undefined) return { kind: "capability_disabled" } as const;
    return await facade.preview(value);
  }, invocation);
}

async function dispatchV1(
  page: Page,
  invocation: unknown,
): Promise<AutomationOperationV1<unknown>> {
  return await page.evaluate(async (value) => {
    const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
      AutomationFacadeV1 | undefined;
    if (facade === undefined) return { kind: "capability_disabled" } as const;
    return await facade.dispatch(value);
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
      const settled = await idle;
      return { kind: "ok" as const, dispatched, settled };
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

function requireE2eInvocationV1(
  descriptor: SemanticActionDescriptorV1,
  choice?: "left" | "right",
): unknown {
  const options = descriptor.options ?? [];
  const invocation =
    choice === undefined
      ? options[0]
      : options.find(
          (candidate) =>
            typeof candidate === "object" &&
            candidate !== null &&
            "parameters" in candidate &&
            typeof candidate.parameters === "object" &&
            candidate.parameters !== null &&
            "choice" in candidate.parameters &&
            candidate.parameters.choice === choice,
        );
  if (invocation === undefined) throw new TypeError(`missing invocation ${descriptor.actionId}`);
  return invocation;
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

async function domActionStatesV1(page: Page): Promise<readonly DomActionStateV1[]> {
  const states = await page.locator("[data-semantic-action-id]").evaluateAll((nodes) => {
    const byActionId = new Map<
      string,
      { readonly actionId: string; readonly enabled: boolean; readonly reasons: readonly string[] }
    >();
    for (const node of nodes) {
      const actionId = node.getAttribute("data-semantic-action-id");
      if (actionId === null) continue;
      const reasons = (node.getAttribute("data-semantic-disabled-reasons") ?? "")
        .split(",")
        .filter((code) => code.length > 0);
      const enabled = !(node instanceof HTMLButtonElement) || !node.disabled;
      const next = { actionId, enabled, reasons };
      const previous = byActionId.get(actionId);
      if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(next)) {
        throw new TypeError(`inconsistent DOM action witnesses for ${actionId}`);
      }
      byActionId.set(actionId, next);
    }
    return [...byActionId.values()].sort((left, right) =>
      left.actionId.localeCompare(right.actionId),
    );
  });
  return states.map((state) =>
    Object.freeze({
      actionId: state.actionId,
      enabled: state.enabled,
      reasons: Object.freeze(state.reasons.map((code) => Object.freeze({ code }))),
    }),
  );
}

function projectedActionStatesV1(publication: SemanticPublicationV1): readonly DomActionStateV1[] {
  return publication.actions
    .map((descriptor) =>
      Object.freeze({
        actionId: descriptor.actionId,
        enabled: descriptor.enabled,
        reasons: descriptor.reasons.map(({ code }) => Object.freeze({ code })),
      }),
    )
    .toSorted((left, right) => left.actionId.localeCompare(right.actionId));
}

async function exportDiagnosticBundleV1(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole("button", { name: "导出调试包" }).click();
  const review = page.getByRole("region", { name: "检查调试包内容" });
  await expect(review).toBeVisible();
  await expect(review.getByText("完整游戏状态与命令历史")).toBeVisible();
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

test.describe("@phase5c @semantic-parity Automation bridge", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  test("DOM and Automation produce the same E2E semantic result", async ({ browser }) => {
    const dom = await createAutomationPageV1(browser, uiTargetsV1.e2e);
    const automation = await createAutomationPageV1(browser, uiTargetsV1.e2e);
    try {
      const domBefore = await observeV1(dom.page);
      const automationBefore = await observeV1(automation.page);
      expect(domBefore).toEqual(automationBefore);

      const domIdle = dom.page.evaluate(async (afterRevision) => {
        const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
          AutomationFacadeV1 | undefined;
        if (facade === undefined) return { kind: "capability_disabled" } as const;
        return await facade.waitForIdle(afterRevision);
      }, domBefore.revision);
      await dom.page
        .getByTestId("stage-scene-interaction")
        .getByRole("button", { name: "增加计数" })
        .click();
      const domAfter = requireOkV1(await domIdle, "DOM waitForIdle");

      const increment = requireDescriptorV1(automationBefore, "action.e2e.increment");
      const automationOutcome = await dispatchAndWaitV1(
        automation.page,
        automationBefore,
        requireE2eInvocationV1(increment),
      );
      expect(automationOutcome.dispatched).toMatchObject({
        kind: "ok",
        value: { kind: "committed" },
      });
      expect(domAfter.game).toEqual(automationOutcome.publication.game);
      expect(domAfter.actions).toEqual(automationOutcome.publication.actions);
      expect(await domActionStatesV1(dom.page)).toEqual(
        projectedActionStatesV1(automationOutcome.publication),
      );
    } finally {
      await dom.context.close();
      await automation.context.close();
    }
  });

  test("preview, disabled DOM, and stale E2E rejection share ordered reasons", async ({
    browser,
  }) => {
    const fixture = await createAutomationPageV1(browser, uiTargetsV1.e2e);
    try {
      const initial = await observeV1(fixture.page);
      const initiallyDisabled = requireDescriptorV1(initial, "action.e2e.choose");
      expect(initiallyDisabled.enabled).toBe(false);
      const disabledInvocation = requireE2eInvocationV1(initiallyDisabled, "left");
      const disabledPreview = requireOkV1(
        await previewV1(fixture.page, disabledInvocation),
        "disabled preview",
      );
      expect(disabledPreview).toEqual({ kind: "rejected", reasons: initiallyDisabled.reasons });
      expect(requireDescriptorV1(initial, "action.e2e.choose").reasons).toEqual([
        { code: "flow.not_choosing" },
      ]);
      expect(
        (await domActionStatesV1(fixture.page)).find(
          ({ actionId }) => actionId === "action.e2e.choose",
        )?.reasons,
      ).toEqual(initiallyDisabled.reasons);

      const start = requireDescriptorV1(initial, "action.e2e.start");
      const choosing = await dispatchAndWaitV1(
        fixture.page,
        initial,
        requireE2eInvocationV1(start),
      );
      const choose = requireDescriptorV1(choosing.publication, "action.e2e.choose");
      expect(choose.enabled).toBe(true);
      const invocation = requireE2eInvocationV1(choose, "left");
      expect(requireOkV1(await previewV1(fixture.page, invocation), "allowed preview")).toEqual({
        kind: "allowed",
      });

      const committed = await dispatchAndWaitV1(fixture.page, choosing.publication, invocation);
      expect(committed.dispatched).toMatchObject({
        kind: "ok",
        value: { kind: "committed" },
      });
      const stalePreview = requireOkV1(await previewV1(fixture.page, invocation), "stale preview");
      const staleDispatch = requireOkV1(
        await dispatchV1(fixture.page, invocation),
        "stale dispatch",
      );
      expect(stalePreview).toEqual({
        kind: "rejected",
        reasons: [{ code: "flow.not_choosing" }],
      });
      expect(staleDispatch).toEqual(stalePreview);
    } finally {
      await fixture.context.close();
    }
  });

  test("a retained PoC invocation is rejected after its published action disappears", async ({
    browser,
  }) => {
    const fixture = await createAutomationPageV1(browser, uiTargetsV1.poc);
    try {
      const initial = await observeV1(fixture.page);
      const runStart = requireDescriptorV1(initial, "action.run_start");
      expect(runStart).toMatchObject({
        enabled: true,
        delivery: "direct",
        reasons: [],
      });
      expect(runStart.directInvocation).toEqual({
        kind: "invoke",
        actionId: "action.run_start",
        options: {},
      });
      const retainedInvocation = runStart.directInvocation;
      if (retainedInvocation === undefined) {
        throw new TypeError("action.run_start has no retained direct invocation");
      }

      expect(await previewV1(fixture.page, retainedInvocation)).toEqual({
        kind: "ok",
        value: {
          allowed: true,
          command: { kind: "run.start" },
          costs: { ap: 0, playerStamina: 0, heroineStamina: 0, cash: 0 },
          changes: [],
          unknownReasonIds: [],
          confirmation: null,
        },
      });

      const committed = await dispatchAndWaitV1(fixture.page, initial, retainedInvocation);
      expect(committed.dispatched).toEqual({ kind: "ok", value: { kind: "committed" } });
      expect(committed.publication.actions).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ actionId: "action.run_start" })]),
      );

      const expectedReasons = [{ code: "run.already_started", details: {} }];
      expect(await previewV1(fixture.page, retainedInvocation)).toEqual({
        kind: "ok",
        value: {
          allowed: false,
          command: { kind: "run.start" },
          reasons: expectedReasons,
        },
      });
      expect(await dispatchV1(fixture.page, retainedInvocation)).toEqual({
        kind: "ok",
        value: { kind: "rejected", reasons: expectedReasons },
      });
    } finally {
      await fixture.context.close();
    }
  });

  test("normal PoC Automation leaves exported integrity normal and exposes no DebugTools", async ({
    browser,
  }) => {
    const fixture = await createAutomationPageV1(browser, uiTargetsV1.poc, [
      "debug_tools",
      "automation_bridge",
    ]);
    try {
      const before = await observeV1(fixture.page);
      const outcome = await dispatchAndWaitV1(
        fixture.page,
        before,
        requireFirstPlayerInvocationV1(before),
      );
      expect(outcome.dispatched).toMatchObject({ kind: "ok", value: { kind: "committed" } });

      const facadeKeys = await fixture.page.evaluate(() => {
        const facade = Reflect.get(globalThis, "__SILLYMAKER_AUTOMATION_V1__") as
          AutomationFacadeV1 | undefined;
        return facade === undefined ? [] : Object.keys(facade).toSorted();
      });
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

  test("Automation dispatch results are recursively player-safe in both Stories", async ({
    browser,
  }) => {
    for (const target of [uiTargetsV1.e2e, uiTargetsV1.poc]) {
      const fixture = await createAutomationPageV1(browser, target);
      try {
        const before = await observeV1(fixture.page);
        const outcome = await dispatchAndWaitV1(
          fixture.page,
          before,
          requireFirstPlayerInvocationV1(before),
        );
        expect(outcome.dispatched.kind).toBe("ok");
        const forbiddenKeys = collectObjectKeysRecursivelyV1(outcome.dispatched).filter((key) =>
          forbiddenPlayerResultKeysV1.includes(key),
        );
        expect(forbiddenKeys).toEqual([]);
      } finally {
        await fixture.context.close();
      }
    }
  });
});
