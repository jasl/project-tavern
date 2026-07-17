// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  emptyContentMaturityFlagsV1,
  findUnknownContentMaturityFlagsV1,
  parseContentMaturityFlagsV1,
  parseContentPreferenceV1,
  parseNonNegativeSafeInteger,
  parseTextId,
  requireContentPreferencePresetV1,
} from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type {
  ContentMaturityFlagsV1,
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
} from "@sillymaker/base";
import {
  createRuntimePresentationStoreV1,
  createSemanticPublicationBridgeV1,
  initialInteractionSessionStateV1,
  type RuntimePresentationProjectionInputV1,
} from "@sillymaker/ui";
import { describe, expect, it, vi } from "vitest";

import type { E2eGameViewV1 } from "../gameplay/contracts/index.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import {
  e2eAlphaFlagV1,
  e2eBetaFlagV1,
  e2eBothFlagsV1,
  e2eContentMaturityPolicyV1,
  e2eStreamSafeContentPresetIdV1,
} from "./content-maturity-policy.js";
import { e2eInteractionFixtureV1 } from "./interaction-fixture.js";
import { e2eSceneGraphV1, type E2eSceneGraphV1 } from "./scene-graph.js";
import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticInvocationV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import {
  projectE2eRuntimePresentationV1,
  type E2ePresentationRouteV1,
  type E2ePresentationUiStateV1,
  type E2eRuntimePresentationViewV1,
} from "./runtime-presentation.js";

type E2eIncrementInvocationV1 = Extract<
  E2eSemanticInvocationV1,
  { readonly actionId: "action.e2e.increment" }
>;
type E2eIncrementDescriptorV1 = Extract<
  E2eSemanticActionDescriptorV1,
  { readonly actionId: "action.e2e.increment" }
>;

const incrementInvocationV1 = Object.freeze({
  actionId: "action.e2e.increment",
  parameters: Object.freeze({}),
}) satisfies DeepReadonly<E2eIncrementInvocationV1>;

const incrementDescriptorV1 = Object.freeze({
  actionId: incrementInvocationV1.actionId,
  textId: parseTextId("text.e2e.increment"),
  enabled: true,
  reasons: Object.freeze([]),
  options: Object.freeze([incrementInvocationV1]),
}) satisfies DeepReadonly<E2eIncrementDescriptorV1>;

const defaultE2ePresentationRouteV1: E2ePresentationRouteV1 = "play";

const defaultE2ePresentationUiStateV1 = Object.freeze({
  route: defaultE2ePresentationRouteV1,
  primaryOverlayId: null,
  interaction: initialInteractionSessionStateV1,
  activeCueId: null,
}) satisfies DeepReadonly<E2ePresentationUiStateV1>;

function e2eGameViewV1(
  flowStatus: E2eGameViewV1["flow"]["status"] = "idle",
): DeepReadonly<E2eGameViewV1> {
  return Object.freeze({
    counterLabel: "计数 0",
    flow: Object.freeze({
      status: flowStatus,
      nodeId: flowStatus === "choosing" ? "choice" : "intro",
    }),
    terminal: false,
  });
}

function e2eSemanticPublicationV1(
  input: {
    readonly flowStatus?: E2eGameViewV1["flow"]["status"];
    readonly actions?: readonly DeepReadonly<E2eSemanticActionDescriptorV1>[];
  } = {},
): DeepReadonly<E2eSemanticPublicationV1> {
  return Object.freeze({
    revision: parseNonNegativeSafeInteger(0),
    status: "ready",
    game: e2eGameViewV1(input.flowStatus),
    narrative: null,
    actions: input.actions ?? Object.freeze([incrementDescriptorV1]),
  });
}

function e2eProjectionInputV1(input: {
  readonly semantic: DeepReadonly<E2eSemanticPublicationV1>;
  readonly allowedFlags: ContentMaturityFlagsV1;
}): RuntimePresentationProjectionInputV1<
  E2eSemanticPublicationV1,
  E2eSceneGraphV1,
  E2ePresentationUiStateV1
> {
  const allowedFlags = parseContentMaturityFlagsV1(input.allowedFlags);
  return Object.freeze({
    semantic: input.semantic,
    resolvedCatalog: e2eSceneGraphV1,
    contentPreference: Object.freeze({ allowedFlags }),
    uiState: defaultE2ePresentationUiStateV1,
  });
}

function createE2eContentPreferencePortFixtureV1(): ContentPreferencePortV1 {
  let current: DeepReadonly<ContentPreferenceV1> = Object.freeze({
    allowedFlags: e2eContentMaturityPolicyV1.defaultAllowedFlags,
  });
  const listeners = new Set<() => void>();

  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    async set(value: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1> {
      let parsed: ContentPreferenceV1;
      try {
        parsed = parseContentPreferenceV1(value);
      } catch {
        return Object.freeze({
          kind: "rejected",
          code: "content_maturity.invalid_preference",
        });
      }
      if (
        findUnknownContentMaturityFlagsV1(e2eContentMaturityPolicyV1, parsed.allowedFlags) !==
        emptyContentMaturityFlagsV1
      ) {
        return Object.freeze({
          kind: "rejected",
          code: "content_maturity.unknown_flags",
        });
      }
      current = Object.freeze({ allowedFlags: parsed.allowedFlags });
      for (const listener of [...listeners]) listener();
      return Object.freeze({ kind: "updated", preference: current });
    },
  });
}

function findE2eBehaviorV1(view: DeepReadonly<E2eRuntimePresentationViewV1>, behaviorId: string) {
  return view.interactionSurfaces
    .flatMap((surface) => surface.targets)
    .flatMap((target) => target.behaviors)
    .find((behavior) => behavior.behaviorId === behaviorId);
}

function collectE2eTargetIdsV1(
  view: DeepReadonly<E2eRuntimePresentationViewV1>,
): readonly string[] {
  return view.interactionSurfaces.flatMap((surface) =>
    surface.targets.map((target) => target.targetId),
  );
}

function projectE2ePresentationFixtureV1(flowStatus: E2eGameViewV1["flow"]["status"]) {
  return projectE2eRuntimePresentationV1(
    e2eProjectionInputV1({
      semantic: e2eSemanticPublicationV1({ flowStatus }),
      allowedFlags: emptyContentMaturityFlagsV1,
    }),
  );
}

describe("projectE2eRuntimePresentationV1", () => {
  it("uses the neutral Phase 2 fixture without introducing PoC semantics", () => {
    expect(e2eInteractionFixtureV1.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
      "stage_scene.e2e.main",
      "stage_scene.e2e.summary",
    ]);
    expect(JSON.stringify(e2eInteractionFixtureV1)).not.toMatch(
      /poc|tavern|heroine|relationship|suggestive|sexual|explicit/iu,
    );
  });

  it("selects a Stage variant from the non-Calendar Flow projection", () => {
    const calm = projectE2ePresentationFixtureV1("idle");
    const active = projectE2ePresentationFixtureV1("choosing");

    expect(calm.view.stage.variantId).toBe("stage_variant.e2e.main.default");
    expect(active.view.stage.variantId).toBe("stage_variant.e2e.main.active");
    expect(projectE2eRuntimePresentationV1.toString()).not.toMatch(/calendar|morning|evening/iu);
  });

  it("reuses the exact increment descriptor and its published invocation", () => {
    const actions = Object.freeze([incrementDescriptorV1]);
    const semantic = e2eSemanticPublicationV1({ actions });
    const projected = projectE2eRuntimePresentationV1(
      e2eProjectionInputV1({
        semantic,
        allowedFlags: emptyContentMaturityFlagsV1,
      }),
    );
    const behavior = findE2eBehaviorV1(projected.view, "behavior.e2e.counter.increment");

    expect(behavior?.route.kind).toBe("semantic_invocation");
    if (behavior?.route.kind === "semantic_invocation") {
      expect(behavior.route.descriptor).toBe(incrementDescriptorV1);
      expect(behavior.route.invocation).toBe(incrementInvocationV1);
    }
    expect(projected.view.game).toBe(semantic.game);
    expect(semantic.actions).toBe(actions);
  });

  it.each([
    [emptyContentMaturityFlagsV1, false, false],
    [e2eAlphaFlagV1, true, false],
    [e2eBetaFlagV1, false, true],
    [e2eBothFlagsV1, true, true],
  ] as const)(
    "filters alpha and beta independently for allowedFlags=%i",
    (allowedFlags, alphaVisible, betaVisible) => {
      const actions = Object.freeze([incrementDescriptorV1]);
      const semantic = e2eSemanticPublicationV1({ actions });
      const projected = projectE2eRuntimePresentationV1(
        e2eProjectionInputV1({ semantic, allowedFlags }),
      );
      const expectedAssetIds = [
        "asset.e2e.background.base",
        ...(alphaVisible ? ["asset.e2e.background.alpha"] : []),
        ...(betaVisible ? ["asset.e2e.background.beta"] : []),
        "asset.e2e.character.base",
      ];

      expect(
        findE2eBehaviorV1(projected.view, "behavior.e2e.counter.alpha_cue") !== undefined,
      ).toBe(alphaVisible);
      expect(findE2eBehaviorV1(projected.view, "behavior.e2e.counter.beta_cue") !== undefined).toBe(
        betaVisible,
      );
      expect(collectE2eTargetIdsV1(projected.view)).toContain("target.e2e.counter.figure");
      const increment = findE2eBehaviorV1(projected.view, "behavior.e2e.counter.increment");
      expect(increment?.route).toMatchObject({
        kind: "semantic_invocation",
        descriptor: incrementDescriptorV1,
      });
      expect(projected.requiredAssetIds).toHaveLength(expectedAssetIds.length);
      expect(new Set(projected.requiredAssetIds)).toEqual(new Set(expectedAssetIds));
      expect(Object.isFrozen(projected.requiredAssetIds)).toBe(true);
      expect(semantic.actions).toBe(actions);
    },
  );

  it("uses the exact frozen default Presentation UI state", () => {
    const semantic = e2eSemanticPublicationV1();
    const input = e2eProjectionInputV1({
      semantic,
      allowedFlags: emptyContentMaturityFlagsV1,
    });
    const projected = projectE2eRuntimePresentationV1(input);

    expect(input.uiState).toBe(defaultE2ePresentationUiStateV1);
    expect(input.uiState).toEqual({
      route: "play",
      primaryOverlayId: null,
      interaction: initialInteractionSessionStateV1,
      activeCueId: null,
    });
    expect(Object.isFrozen(input.uiState)).toBe(true);
    expect(projected.view.activeOverlayId).toBeNull();
    expect(projected.view.activeCueId).toBeNull();
  });

  it("applies the Story streamer preset through one strict observable preference port", async () => {
    const contentPreference = createE2eContentPreferencePortFixtureV1();
    const listener = vi.fn();
    const unsubscribe = contentPreference.subscribe(listener);
    const initial = contentPreference.observe();
    const preset = requireContentPreferencePresetV1(
      e2eContentMaturityPolicyV1,
      e2eStreamSafeContentPresetIdV1,
    );

    const updated = await contentPreference.set({ allowedFlags: preset.allowedFlags });
    expect(updated).toEqual({
      kind: "updated",
      preference: { allowedFlags: e2eBetaFlagV1 },
    });
    expect(initial).toEqual({ allowedFlags: emptyContentMaturityFlagsV1 });
    expect(contentPreference.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
    if (updated.kind === "updated") {
      expect(updated.preference).toBe(contentPreference.observe());
    }
    expect(Object.isFrozen(contentPreference)).toBe(true);
    expect(Object.isFrozen(updated)).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    await expect(
      contentPreference.set({ allowedFlags: parseContentMaturityFlagsV1(4) }),
    ).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.unknown_flags",
    });
    expect(contentPreference.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
    expect(listener).toHaveBeenCalledOnce();

    await expect(
      contentPreference.set({ allowedFlags: -1 } as unknown as ContentPreferenceV1),
    ).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.invalid_preference",
    });
    expect(contentPreference.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    unsubscribe();
    await contentPreference.set({ allowedFlags: emptyContentMaturityFlagsV1 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("increments only Presentation revision for a player preference change", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const resolvedIdentity = resolved.provenance.resolved;
    const semantic = e2eSemanticPublicationV1();
    const semanticBridge = createSemanticPublicationBridgeV1(
      Object.freeze({
        observe: () => semantic,
        subscribe: (_listener: () => void) => () => undefined,
      }),
    );
    const contentPreference = createE2eContentPreferencePortFixtureV1();
    const uiState = Object.freeze({
      getCurrent: () => defaultE2ePresentationUiStateV1,
      subscribe: (_listener: () => void) => () => undefined,
    });
    const failures = vi.fn();
    const presentation = createRuntimePresentationStoreV1({
      semantic: semanticBridge,
      resolvedCatalog: e2eSceneGraphV1,
      contentPreference,
      uiState,
      project: projectE2eRuntimePresentationV1,
      reportFailure: failures,
    });
    const before = presentation.getSnapshot();

    await expect(contentPreference.set({ allowedFlags: e2eAlphaFlagV1 })).resolves.toMatchObject({
      kind: "updated",
    });

    expect(resolved.provenance.resolved).toBe(resolvedIdentity);
    expect(semanticBridge.getSnapshot()).toBe(semantic);
    expect(presentation.getSnapshot()).toMatchObject({
      revision: before.revision + 1,
      semantic,
    });
    expect(presentation.getSnapshot().view.game).toBe(semantic.game);
    expect(failures).not.toHaveBeenCalled();
    presentation.dispose();
    semanticBridge.dispose();
  });
});
