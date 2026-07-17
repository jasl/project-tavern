// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  emptyContentMaturityFlagsV1,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseLocaleId,
  parseNonNegativeSafeInteger,
  parseTextCatalogSetV1,
  parseTextId,
  type DeepReadonly,
  type InteractionActivationV1,
  type InteractionBehaviorId,
  type InteractionSurfaceId,
  type InteractionTargetId,
  type TextId,
} from "@sillymaker/base";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPresentationReadPortV1 } from "../assets/presentation-read-port.js";
import {
  inputHandledV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
} from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameStageV1 } from "../shell/game-stage.js";
import type { RuntimeInteractionSurfaceV1 } from "./contracts.js";
import { InteractionBehaviorListV1 } from "./InteractionBehaviorList.js";

afterEach(cleanup);

interface TestReasonV1 {
  readonly code: string;
  readonly textId: TextId;
}

interface TestDescriptorV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<TestReasonV1>[];
}

interface TestInvocationV1 {
  readonly actionId: string;
  readonly parameters: Readonly<Record<string, never>>;
}

interface TestInteractionSessionStateV1 {
  readonly activeSurfaceId: InteractionSurfaceId | null;
  readonly choosingTargetId: InteractionTargetId | null;
  readonly returnFocusId: string | null;
}

const stageSurfaceIdV1 = parseInteractionSurfaceId("surface.synthetic.stage");
const heroineSurfaceIdV1 = parseInteractionSurfaceId("surface.synthetic.heroine");
const directSurfaceIdV1 = parseInteractionSurfaceId("surface.synthetic.heroine.direct");
const stageTargetIdV1 = parseInteractionTargetId("target.synthetic.heroine.entry");
const heroineTargetIdV1 = parseInteractionTargetId("target.synthetic.heroine.details");
const profileBehaviorIdV1 = parseInteractionBehaviorId("behavior.synthetic.heroine.profile");
const repairBehaviorIdV1 = parseInteractionBehaviorId("behavior.synthetic.heroine.repair_sign");
const cueBehaviorIdV1 = parseInteractionBehaviorId("behavior.synthetic.heroine.play_cue");

const textIdsV1 = Object.freeze({
  stageSurface: parseTextId("text.synthetic.surface.stage.name"),
  heroineSurface: parseTextId("text.synthetic.surface.heroine.name"),
  entryTarget: parseTextId("text.synthetic.target.heroine.entry.name"),
  heroineTarget: parseTextId("text.synthetic.target.heroine.details.name"),
  profileBehavior: parseTextId("text.synthetic.behavior.heroine.profile.name"),
  profileDescription: parseTextId("text.synthetic.behavior.heroine.profile.description"),
  repairBehavior: parseTextId("text.synthetic.behavior.heroine.repair_sign.name"),
  repairDescription: parseTextId("text.synthetic.behavior.heroine.repair_sign.description"),
  cueBehavior: parseTextId("text.synthetic.behavior.heroine.play_cue.name"),
  unavailableReason: parseTextId("text.synthetic.reason.heroine.unavailable_time"),
  leave: parseTextId("text.synthetic.interaction.leave"),
});

const textCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: textIdsV1.stageSurface, text: "当前场景" },
        { textId: textIdsV1.heroineSurface, text: "女主互动" },
        { textId: textIdsV1.entryTarget, text: "与女主互动" },
        { textId: textIdsV1.heroineTarget, text: "女主" },
        { textId: textIdsV1.profileBehavior, text: "查看人物资料" },
        { textId: textIdsV1.profileDescription, text: "打开女主的人物资料" },
        { textId: textIdsV1.repairBehavior, text: "一起修理招牌" },
        { textId: textIdsV1.repairDescription, text: "和女主一起修理酒馆招牌" },
        { textId: textIdsV1.cueBehavior, text: "打个招呼" },
        { textId: textIdsV1.unavailableReason, text: "当前不在可用时段" },
        { textId: textIdsV1.leave, text: "返回" },
      ],
    },
  ],
});

const assetPublicationV1 = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });
const presentationV1 = createPresentationReadPortV1({
  catalogs: textCatalogsV1,
  locale: parseLocaleId("zh-CN"),
  assets: Object.freeze({
    observe: () => assetPublicationV1,
    subscribe: (_listener: () => void) => () => undefined,
    preload: async () => Object.freeze([]),
    resolve: () => {
      throw new TypeError("test fixture has no assets");
    },
    dispose: () => undefined,
  }),
});

const disabledReasonsV1 = Object.freeze([
  Object.freeze({
    code: "flow.not_available_now",
    textId: textIdsV1.unavailableReason,
  }),
]);

const stageSurfaceV1 = Object.freeze({
  surfaceId: stageSurfaceIdV1,
  accessibleNameTextId: textIdsV1.stageSurface,
  entryMode: "explicit_control" as const,
  hitMapId: null,
  targets: Object.freeze([
    Object.freeze({
      targetId: stageTargetIdV1,
      accessibleNameTextId: textIdsV1.entryTarget,
      resolutionMode: "open_surface" as const,
      openSurfaceId: heroineSurfaceIdV1,
      behaviors: Object.freeze([]),
    }),
  ]),
}) satisfies DeepReadonly<RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>>;

const heroineSurfaceV1 = Object.freeze({
  surfaceId: heroineSurfaceIdV1,
  accessibleNameTextId: textIdsV1.heroineSurface,
  entryMode: "surface_activation" as const,
  hitMapId: null,
  targets: Object.freeze([
    Object.freeze({
      targetId: heroineTargetIdV1,
      accessibleNameTextId: textIdsV1.heroineTarget,
      resolutionMode: "choose" as const,
      openSurfaceId: null,
      behaviors: Object.freeze([
        Object.freeze({
          behaviorId: profileBehaviorIdV1,
          nameTextId: textIdsV1.profileBehavior,
          descriptionTextId: textIdsV1.profileDescription,
          requiredFlags: emptyContentMaturityFlagsV1,
          isDefault: true,
          route: Object.freeze({
            kind: "semantic_invocation" as const,
            descriptor: Object.freeze({
              actionId: "action.synthetic.heroine.profile",
              enabled: true,
              reasons: Object.freeze([]),
            }),
            invocation: Object.freeze({
              actionId: "action.synthetic.heroine.profile",
              parameters: Object.freeze({}),
            }),
          }),
        }),
        Object.freeze({
          behaviorId: repairBehaviorIdV1,
          nameTextId: textIdsV1.repairBehavior,
          descriptionTextId: textIdsV1.repairDescription,
          requiredFlags: emptyContentMaturityFlagsV1,
          isDefault: false,
          route: Object.freeze({
            kind: "semantic_invocation" as const,
            descriptor: Object.freeze({
              actionId: "action.synthetic.heroine.repair_sign",
              enabled: false,
              reasons: disabledReasonsV1,
            }),
            invocation: Object.freeze({
              actionId: "action.synthetic.heroine.repair_sign",
              parameters: Object.freeze({}),
            }),
          }),
        }),
        Object.freeze({
          behaviorId: cueBehaviorIdV1,
          nameTextId: textIdsV1.cueBehavior,
          descriptionTextId: null,
          requiredFlags: emptyContentMaturityFlagsV1,
          isDefault: false,
          route: Object.freeze({
            kind: "presentation_intent" as const,
            intent: Object.freeze({
              kind: "presentation.play_cue" as const,
              cueId: "cue.synthetic.heroine.greeting",
            }),
          }),
        }),
      ]),
    }),
  ]),
}) satisfies DeepReadonly<RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>>;

const directSurfaceV1 = Object.freeze({
  surfaceId: directSurfaceIdV1,
  accessibleNameTextId: textIdsV1.heroineSurface,
  entryMode: "always_active" as const,
  hitMapId: null,
  targets: Object.freeze([
    Object.freeze({
      targetId: heroineTargetIdV1,
      accessibleNameTextId: textIdsV1.heroineTarget,
      resolutionMode: "direct" as const,
      openSurfaceId: null,
      behaviors: Object.freeze([
        Object.freeze({
          ...heroineSurfaceV1.targets[0]!.behaviors[1]!,
          isDefault: true,
        }),
      ]),
    }),
  ]),
}) satisfies DeepReadonly<RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>>;

const descriptorPresentationV1 = Object.freeze({
  actionId: (descriptor: DeepReadonly<TestDescriptorV1>) => descriptor.actionId,
  enabled: (descriptor: DeepReadonly<TestDescriptorV1>) => descriptor.enabled,
  reasons: (descriptor: DeepReadonly<TestDescriptorV1>) => descriptor.reasons,
  reasonTextId: (reason: DeepReadonly<TestReasonV1>) => reason.textId,
});

function createInteractionSessionFixtureV1() {
  const listeners = new Set<() => void>();
  const initialState = Object.freeze({
    activeSurfaceId: null,
    choosingTargetId: null,
    returnFocusId: null,
  }) satisfies TestInteractionSessionStateV1;
  let state: DeepReadonly<TestInteractionSessionStateV1> = initialState;
  const publish = (next: DeepReadonly<TestInteractionSessionStateV1>) => {
    state = next;
    for (const listener of listeners) listener();
  };

  const sessionCleanup = vi.fn(
    (_reason: "pointer_cancel" | "focus_loss" | "stage_scene_replaced") => {
      publish(initialState);
    },
  );

  return Object.freeze({
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(surfaceId: InteractionSurfaceId, returnFocusId: string | null) {
      publish(Object.freeze({ activeSurfaceId: surfaceId, choosingTargetId: null, returnFocusId }));
    },
    openChoice(
      surfaceId: InteractionSurfaceId,
      targetId: InteractionTargetId,
      returnFocusId: string | null,
    ) {
      publish(
        Object.freeze({
          activeSurfaceId: surfaceId,
          choosingTargetId: targetId,
          returnFocusId,
        }),
      );
    },
    leave() {
      const returnFocusId = state.returnFocusId;
      publish(initialState);
      return returnFocusId;
    },
    cleanup: sessionCleanup,
  });
}

function createObservedInputRouterV1() {
  const delegate = createInputRouterV1();
  const route = vi.fn(delegate.route);
  return Object.freeze({
    register: delegate.register,
    route,
    clearTransientInput: delegate.clearTransientInput,
  });
}

function createBehaviorListFixtureV1(input: { readonly choosing?: boolean } = {}) {
  const inputRouter = createInputRouterV1();
  const session = createInteractionSessionFixtureV1();
  if (input.choosing === true) {
    session.openChoice(heroineSurfaceIdV1, heroineTargetIdV1, null);
  } else {
    session.open(heroineSurfaceIdV1, null);
  }
  const activate = vi.fn(async (_activation: DeepReadonly<InteractionActivationV1>) =>
    Object.freeze({ kind: "choice_opened" as const }),
  );
  const activateBehavior = vi.fn(
    async (
      _activation: DeepReadonly<InteractionActivationV1>,
      _behaviorId: InteractionBehaviorId,
    ) => Object.freeze({ kind: "dispatched" as const }),
  );
  const controller = Object.freeze({ activate, activateBehavior });
  render(
    <InteractionBehaviorListV1
      surface={heroineSurfaceV1}
      session={session}
      controller={controller}
      presentation={presentationV1}
      descriptorPresentation={descriptorPresentationV1}
      leaveTextId={textIdsV1.leave}
      inputRouter={inputRouter}
    />,
  );
  return Object.freeze({ inputRouter, session, activate, activateBehavior });
}

function InteractionFocusHarnessV1(props: {
  readonly session: ReturnType<typeof createInteractionSessionFixtureV1>;
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly controller: Readonly<{
    activate(activation: DeepReadonly<InteractionActivationV1>): Promise<unknown>;
    activateBehavior(
      activation: DeepReadonly<InteractionActivationV1>,
      behaviorId: InteractionBehaviorId,
    ): Promise<unknown>;
  }>;
}) {
  const sessionState = useSyncExternalStore(
    props.session.subscribe,
    props.session.getSnapshot,
    props.session.getSnapshot,
  );
  const surface =
    sessionState.activeSurfaceId === heroineSurfaceIdV1 ? heroineSurfaceV1 : stageSurfaceV1;
  return (
    <InteractionBehaviorListV1
      surface={surface}
      session={props.session}
      controller={props.controller}
      presentation={presentationV1}
      descriptorPresentation={descriptorPresentationV1}
      leaveTextId={textIdsV1.leave}
      inputRouter={props.inputRouter}
    />
  );
}

describe("InteractionBehaviorListV1", () => {
  it("exposes a direct behavior with its disabled reason before an interaction session opens", () => {
    const inputRouter = createInputRouterV1();
    const session = createInteractionSessionFixtureV1();
    const controller = Object.freeze({
      activate: vi.fn(async () => Object.freeze({ kind: "disabled" as const })),
      activateBehavior: vi.fn(async () => Object.freeze({ kind: "disabled" as const })),
    });

    render(
      <InteractionBehaviorListV1
        surface={directSurfaceV1}
        session={session}
        controller={controller}
        presentation={presentationV1}
        descriptorPresentation={descriptorPresentationV1}
        leaveTextId={textIdsV1.leave}
        inputRouter={inputRouter}
      />,
    );

    const behavior = screen.getByRole("button", { name: "一起修理招牌" });
    const target = screen.getByRole("button", { name: "女主" });
    expect(target).toBeDisabled();
    expect(target).toHaveAccessibleDescription("当前不在可用时段");
    expect(target).toHaveAttribute(
      "data-semantic-action-id",
      "action.synthetic.heroine.repair_sign",
    );
    expect(behavior).toBeDisabled();
    expect(behavior).toHaveAttribute("data-interaction-surface-id", directSurfaceIdV1);
    expect(behavior).toHaveAttribute("data-interaction-target-id", heroineTargetIdV1);
    expect(behavior).toHaveAttribute("data-interaction-behavior-id", repairBehaviorIdV1);
    expect(behavior).toHaveAttribute(
      "data-semantic-action-id",
      "action.synthetic.heroine.repair_sign",
    );
    expect(screen.getByText("当前不在可用时段")).toBeVisible();
  });

  it("exposes every target and behavior through named native buttons with exact reasons", () => {
    createBehaviorListFixtureV1({ choosing: true });

    expect(screen.getByRole("region", { name: "女主互动" })).toBeVisible();
    expect(screen.getByRole("button", { name: "女主" })).toBeVisible();
    expect(screen.getByRole("button", { name: "查看人物资料" })).toHaveAccessibleDescription(
      "打开女主的人物资料",
    );
    expect(screen.getByRole("button", { name: "一起修理招牌" })).toBeDisabled();
    expect(screen.getByText("当前不在可用时段")).toBeVisible();
  });

  it("registers active Interaction isolation while preserving its native region controls", () => {
    const inputRouter = createInputRouterV1();
    const session = createInteractionSessionFixtureV1();
    session.openChoice(heroineSurfaceIdV1, heroineTargetIdV1, null);
    const controller = Object.freeze({
      activate: vi.fn(async () => Object.freeze({ kind: "choice_opened" as const })),
      activateBehavior: vi.fn(async () => Object.freeze({ kind: "dispatched" as const })),
    });

    render(
      <GameStageV1
        accessibleName="互动隔离舞台"
        layers={Object.freeze({
          background: <button type="button">背景操作</button>,
          character: <button type="button">角色操作</button>,
          sceneInteraction: (
            <InteractionBehaviorListV1
              surface={heroineSurfaceV1}
              session={session}
              controller={controller}
              presentation={presentationV1}
              descriptorPresentation={descriptorPresentationV1}
              leaveTextId={textIdsV1.leave}
              inputRouter={inputRouter}
            />
          ),
          hud: <button type="button">经营操作</button>,
          workspaceOverlay: null,
          narrative: null,
          system: <button type="button">系统操作</button>,
        })}
      />,
    );

    expect(screen.getByTestId("stage-background")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-character")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-scene-interaction")).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "返回" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "查看人物资料" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "系统操作" })).toBeEnabled();
  });

  it("consumes ordinary action and viewport input while Interaction is active", () => {
    const fixture = createBehaviorListFixtureV1({ choosing: true });
    const gameplay = vi.fn(() => inputHandledV1);
    fixture.inputRouter.register({ context: "gameplay", handle: gameplay });
    const ordinaryAction = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.synthetic_gameplay_action"),
    });
    const viewportPoint = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 12, y: 24 }),
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "touch" as const,
    });

    expect(fixture.inputRouter.route(ordinaryAction)).toEqual({
      kind: "handled",
      context: "interaction",
    });
    expect(fixture.inputRouter.route(viewportPoint)).toEqual({
      kind: "handled",
      context: "interaction",
    });
    expect(gameplay).not.toHaveBeenCalled();
  });

  it.each(["pointer_cancel", "focus_loss"] as const)("cleans the active session on %s", (kind) => {
    const fixture = createBehaviorListFixtureV1({ choosing: true });

    if (kind === "pointer_cancel") {
      fixture.inputRouter.route(Object.freeze({ kind, pointerId: parseNonNegativeSafeInteger(3) }));
    } else {
      fixture.inputRouter.route(Object.freeze({ kind }));
    }

    expect(fixture.session.cleanup).toHaveBeenCalledExactlyOnceWith(kind);
    expect(fixture.session.getSnapshot().activeSurfaceId).toBeNull();
  });

  it("uses native Enter activation and restores focus after routed Escape", async () => {
    const user = userEvent.setup();
    const inputRouter = createObservedInputRouterV1();
    const session = createInteractionSessionFixtureV1();
    const activate = vi.fn(async (activation: DeepReadonly<InteractionActivationV1>) => {
      if (activation.surfaceId === stageSurfaceIdV1 && activation.targetId === stageTargetIdV1) {
        const returnFocusId =
          document.activeElement instanceof HTMLElement && document.activeElement.id.length > 0
            ? document.activeElement.id
            : null;
        session.open(heroineSurfaceIdV1, returnFocusId);
        return Object.freeze({ kind: "entered" as const });
      }
      return Object.freeze({ kind: "choice_opened" as const });
    });
    const controller = Object.freeze({
      activate,
      activateBehavior: vi.fn(async () => Object.freeze({ kind: "dispatched" as const })),
    });
    render(
      <InteractionFocusHarnessV1
        session={session}
        inputRouter={inputRouter}
        controller={controller}
      />,
    );
    const entryButton = screen.getByRole("button", { name: "与女主互动" });
    entryButton.focus();

    await user.keyboard("{Enter}");
    expect(activate).toHaveBeenCalledExactlyOnceWith(
      Object.freeze({
        surfaceId: stageSurfaceIdV1,
        targetId: stageTargetIdV1,
        activationKind: "semantic_control",
      }),
    );
    expect(screen.getByRole("region", { name: "女主互动" })).toBeVisible();
    expect(screen.getByRole("button", { name: "返回" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(inputRouter.route).toHaveBeenCalledExactlyOnceWith({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "与女主互动" })).toHaveFocus());
  });

  it("routes Escape through Overlay precedence without closing Interaction", async () => {
    const user = userEvent.setup();
    const inputRouter = createObservedInputRouterV1();
    const session = createInteractionSessionFixtureV1();
    session.open(heroineSurfaceIdV1, null);
    const overlayHandler = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "overlay", handle: overlayHandler });
    const controller = Object.freeze({
      activate: vi.fn(async () => Object.freeze({ kind: "choice_opened" as const })),
      activateBehavior: vi.fn(async () => Object.freeze({ kind: "dispatched" as const })),
    });
    render(
      <InteractionBehaviorListV1
        surface={heroineSurfaceV1}
        session={session}
        controller={controller}
        presentation={presentationV1}
        descriptorPresentation={descriptorPresentationV1}
        leaveTextId={textIdsV1.leave}
        inputRouter={inputRouter}
      />,
    );
    screen.getByRole("button", { name: "返回" }).focus();

    await user.keyboard("{Escape}");

    expect(inputRouter.route).toHaveBeenCalledExactlyOnceWith({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    });
    expect(overlayHandler).toHaveBeenCalledExactlyOnceWith({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    });
    expect(session.getSnapshot().activeSurfaceId).toBe(heroineSurfaceIdV1);
    expect(screen.getByRole("region", { name: "女主互动" })).toBeVisible();
  });

  it("keeps parity markers while one native click performs no spatial activation", async () => {
    const user = userEvent.setup();
    const fixture = createBehaviorListFixtureV1({ choosing: true });
    const targetButton = screen.getByRole("button", { name: "女主" });
    const profileButton = screen.getByRole("button", { name: "查看人物资料" });
    const cueButton = screen.getByRole("button", { name: "打个招呼" });

    expect(targetButton).toHaveAttribute("data-interaction-surface-id", heroineSurfaceIdV1);
    expect(targetButton).toHaveAttribute("data-interaction-target-id", heroineTargetIdV1);
    expect(profileButton).toHaveAttribute("data-interaction-surface-id", heroineSurfaceIdV1);
    expect(profileButton).toHaveAttribute("data-interaction-target-id", heroineTargetIdV1);
    expect(profileButton).toHaveAttribute("data-interaction-behavior-id", profileBehaviorIdV1);
    expect(profileButton).toHaveAttribute(
      "data-semantic-action-id",
      "action.synthetic.heroine.profile",
    );
    expect(cueButton).not.toHaveAttribute("data-semantic-action-id");

    await user.click(profileButton);

    expect(fixture.activate).not.toHaveBeenCalled();
    expect(fixture.activateBehavior).toHaveBeenCalledExactlyOnceWith(
      Object.freeze({
        surfaceId: heroineSurfaceIdV1,
        targetId: heroineTargetIdV1,
        activationKind: "semantic_control",
      }),
      profileBehaviorIdV1,
    );
  });
});
