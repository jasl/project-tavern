// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import { E2eApplicationRootV1 } from "./e2e-application-root.js";
import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import type { E2eSemanticInvocationV1 } from "../runtime/e2e-semantic-game-port.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

afterEach(cleanup);

function createHostV1() {
  return createWebHostV1({
    records: createMemoryHostRecordStoreV1(),
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
    now: () => "2026-07-12T00:00:00.000Z",
  });
}

async function createResolvedOnlyFixtureV1() {
  const sourceDefinition = e2eStoryEntryV1.define();
  let storyDefineCalls = 0;
  let sceneGraphFactoryCalls = 0;
  const createSceneGraph = () => {
    sceneGraphFactoryCalls += 1;
    return sourceDefinition.presentation.uiSceneGraph;
  };
  const definition = Object.freeze({
    simulation: sourceDefinition.simulation,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      uiSceneGraph: createSceneGraph(),
    }),
  });
  const entry = Object.freeze({
    ...e2eStoryEntryV1,
    define() {
      storyDefineCalls += 1;
      return definition;
    },
  });
  const resolvedGame = resolveStoryForTestV1(entry);
  const host = createHostV1();
  const application = await createE2eGameRuntimeV1({ resolved: resolvedGame, host });
  return Object.freeze({
    element: (
      <E2eApplicationRootV1 resolvedGame={resolvedGame} application={application} host={host} />
    ),
    storyDefineCalls: () => storyDefineCalls,
    sceneGraphFactoryCalls: () => sceneGraphFactoryCalls,
  });
}

function wrapSemanticDispatchV1(application: E2eGameApplicationPortV1) {
  const invocations: E2eSemanticInvocationV1[] = [];
  let subscriptions = 0;
  let unsubscriptions = 0;
  let availableActionCalls = 0;
  const semantic = Object.freeze({
    ...application.semantic,
    subscribe(listener: () => void) {
      subscriptions += 1;
      const unsubscribe = application.semantic.subscribe(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsubscriptions += 1;
        unsubscribe();
      };
    },
    availableActions() {
      availableActionCalls += 1;
      return application.semantic.availableActions();
    },
    async dispatch(invocation: E2eSemanticInvocationV1) {
      invocations.push(invocation);
      return application.semantic.dispatch(invocation);
    },
  });
  return Object.freeze({
    application: Object.freeze({ ...application, semantic }),
    invocations: () => Object.freeze([...invocations]),
    subscriptions: () => subscriptions,
    unsubscriptions: () => unsubscriptions,
    availableActionCalls: () => availableActionCalls,
  });
}

describe("E2eApplicationRootV1", () => {
  it("renders only the SceneGraph held by ResolvedGame", async () => {
    const fixture = await createResolvedOnlyFixtureV1();

    render(fixture.element);

    expect(screen.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();
    expect(screen.getByText("计数 0")).toBeVisible();
    expect(screen.getAllByTestId(/^stage-/u)).toHaveLength(7);
    expect(screen.getByTestId("stage-character")).toBeEmptyDOMElement();
    expect(screen.getByTestId("stage-scene-interaction")).toBeEmptyDOMElement();
    expect(screen.getByTestId("stage-workspace-overlay")).toBeEmptyDOMElement();
    expect(screen.getByTestId("stage-system")).toBeEmptyDOMElement();
    expect(
      screen
        .getAllByTestId(/^stage-/u)
        .filter((node) => node.hasAttribute("data-stage-pointer-surface")),
    ).toEqual([screen.getByTestId("stage-scene-interaction")]);
    expect(fixture.storyDefineCalls()).toBe(2);
    expect(fixture.sceneGraphFactoryCalls()).toBe(1);
  });

  it("uses semantic action availability and options for DOM controls", async () => {
    const resolvedGame = resolveStoryForTestV1(e2eStoryEntryV1);
    const host = createHostV1();
    const runtime = await createE2eGameRuntimeV1({ resolved: resolvedGame, host });
    await runtime.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} });
    const fixture = wrapSemanticDispatchV1(runtime);

    const rendered = render(
      <E2eApplicationRootV1
        resolvedGame={resolvedGame}
        application={fixture.application}
        host={host}
      />,
    );

    const chooseLeft = screen.getByRole("button", { name: "选择左侧" });
    expect(chooseLeft).toBeEnabled();
    expect(screen.getByRole("button", { name: "选择右侧" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "继续" })).toHaveAccessibleDescription(
      "当前流程不可用",
    );
    expect(screen.getByRole("group", { name: "经营操作" })).not.toContainElement(chooseLeft);
    expect(screen.getByRole("group", { name: "叙事操作" })).toContainElement(chooseLeft);
    expect(fixture.subscriptions()).toBe(1);
    expect(fixture.availableActionCalls()).toBe(0);

    await userEvent.setup().click(chooseLeft);

    expect(fixture.invocations()).toEqual([
      {
        actionId: "action.e2e.choose",
        parameters: { choice: "left" },
      },
    ]);
    rendered.unmount();
    expect(fixture.unsubscriptions()).toBe(1);
  });

  it("renders the resolved terminal summary layout without normal action controls", async () => {
    const resolvedGame = resolveStoryForTestV1(e2eStoryEntryV1);
    const host = createHostV1();
    const application = await createE2eGameRuntimeV1({ resolved: resolvedGame, host });
    await application.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} });
    await application.semantic.dispatch({
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    });
    await application.semantic.dispatch({ actionId: "action.e2e.continue", parameters: {} });
    await application.semantic.dispatch({ actionId: "action.e2e.complete", parameters: {} });

    render(
      <E2eApplicationRootV1 resolvedGame={resolvedGame} application={application} host={host} />,
    );

    expect(screen.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
    expect(screen.getByText("计数 2")).toBeVisible();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
