// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type {
  AssetId,
  DeepReadonly,
  LocaleId,
  ResolvedAssetManifestV1,
  TextId,
} from "@sillymaker/base";
import { SemanticActionControlV1, createUiContributionRegistryV1 } from "@sillymaker/ui";
import type {
  GameRendererContextV1,
  PresentationReadPortV1,
  UiContributionRegistryV1,
  UiContributionSetV1,
  UiRendererNamespaceV1,
} from "@sillymaker/ui";

import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticGamePortV1,
  E2eSemanticInvocationV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import { e2eCharacterRendererIdV1, e2eRendererIdsV1, e2eStageRendererIdV1 } from "./scene-graph.js";
import type { E2eRendererIdV1, E2eSceneGraphV1 } from "./scene-graph.js";

type AssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type E2ePresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  AssetUsageV1,
  LocaleId,
  string
>;

export type E2eRendererContextV1 = GameRendererContextV1<
  E2eSemanticPublicationV1,
  E2eSemanticGamePortV1,
  E2ePresentationReadPortV1
>;

type E2eRendererContextsV1 = Readonly<{
  [TNamespace in UiRendererNamespaceV1]: E2eRendererContextV1;
}>;

export type E2eRendererRegistryV1 = UiContributionRegistryV1<E2eRendererContextsV1>;

const hudActionIdsV1 = Object.freeze([
  "action.e2e.start",
  "action.e2e.increment",
  "action.e2e.complete",
] as const satisfies readonly E2eSemanticInvocationV1["actionId"][]);
const narrativeActionIdsV1 = Object.freeze([
  "action.e2e.choose",
  "action.e2e.continue",
] as const satisfies readonly E2eSemanticInvocationV1["actionId"][]);
const unavailableReasonTextIdV1 = parseTextId("text.e2e.reason.flow_unavailable");

function compositionFailureV1(message: string): never {
  throw new TypeError(`E2E renderer composition failed: ${message}`);
}

export function readE2ePresentationTextV1(
  presentation: E2ePresentationReadPortV1,
  textId: TextId,
): string {
  return presentation.text(textId).text;
}

function optionTextIdV1(
  descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>,
  invocation: DeepReadonly<E2eSemanticInvocationV1>,
): TextId {
  if (descriptor.actionId === "action.e2e.choose") {
    if (invocation.actionId !== descriptor.actionId) {
      return compositionFailureV1(`invalid option for action "${descriptor.actionId}"`);
    }
    return parseTextId(`${descriptor.textId}.${invocation.parameters.choice}`);
  }
  if (descriptor.options.length !== 1 || invocation.actionId !== descriptor.actionId) {
    return compositionFailureV1(`invalid option for action "${descriptor.actionId}"`);
  }
  return descriptor.textId;
}

function disabledReasonLabelsV1(
  context: E2eRendererContextV1,
  descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>,
): readonly string[] {
  return Object.freeze(
    descriptor.reasons.map(() =>
      readE2ePresentationTextV1(context.presentation, unavailableReasonTextIdV1),
    ),
  );
}

function E2eSemanticActionGroupV1(props: {
  readonly context: E2eRendererContextV1;
  readonly actionIds: readonly E2eSemanticInvocationV1["actionId"][];
  readonly accessibleName: string;
}) {
  return (
    <div role="group" aria-label={props.accessibleName}>
      {props.context.viewSlice.actions.flatMap((descriptor) => {
        if (!props.actionIds.includes(descriptor.actionId)) return [];
        const disabledReasonLabels = disabledReasonLabelsV1(props.context, descriptor);
        return descriptor.options.map((invocation, optionIndex) => (
          <SemanticActionControlV1
            key={`${descriptor.actionId}:${optionIndex}`}
            descriptor={descriptor}
            invocation={invocation}
            semantic={props.context.semantic}
            label={readE2ePresentationTextV1(
              props.context.presentation,
              optionTextIdV1(descriptor, invocation),
            )}
            disabledReasonLabels={disabledReasonLabels}
          />
        ));
      })}
    </div>
  );
}

export function selectE2eStageVariantV1(
  sceneGraph: E2eSceneGraphV1,
  publication: DeepReadonly<E2eSemanticPublicationV1>,
) {
  const stageSceneId = publication.game.terminal
    ? "stage_scene.e2e.summary"
    : "stage_scene.e2e.main";
  const stageScene = sceneGraph.stageScenes.find(
    (candidate) => candidate.stageSceneId === stageSceneId,
  );
  if (stageScene === undefined) {
    return compositionFailureV1(`missing StageScene "${stageSceneId}"`);
  }
  const variant = sceneGraph.variants.find(
    (candidate) => candidate.variantId === stageScene.defaultVariantId,
  );
  if (variant === undefined) {
    return compositionFailureV1(`missing StageScene variant "${stageScene.defaultVariantId}"`);
  }
  return variant;
}

function renderE2eBackgroundV1(context: E2eRendererContextV1, sceneGraph: E2eSceneGraphV1) {
  const variant = selectE2eStageVariantV1(sceneGraph, context.viewSlice);
  if (variant.layout.kind !== "e2e_stage") {
    return compositionFailureV1(`unsupported stage layout "${String(variant.layout.kind)}"`);
  }
  const nodeText = readE2ePresentationTextV1(
    context.presentation,
    parseTextId(`text.e2e.flow.node.${context.viewSlice.game.flow.nodeId}`),
  );
  if (variant.layout.mode === "summary") {
    return (
      <div data-renderer-id={e2eStageRendererIdV1}>
        <h1>{readE2ePresentationTextV1(context.presentation, variant.accessibleNameTextId)}</h1>
        <p>{context.viewSlice.game.counterLabel}</p>
        <p>{nodeText}</p>
      </div>
    );
  }
  if (variant.layout.mode !== "main") {
    return compositionFailureV1(`unsupported stage mode "${String(variant.layout.mode)}"`);
  }
  return (
    <div data-renderer-id={e2eStageRendererIdV1}>
      <p>{context.viewSlice.game.counterLabel}</p>
      <p>{nodeText}</p>
    </div>
  );
}

function E2eCharacterRendererV1(_context: E2eRendererContextV1) {
  return <span aria-hidden="true" data-renderer-id={e2eCharacterRendererIdV1} />;
}

function E2eHudRendererV1(context: E2eRendererContextV1) {
  if (context.viewSlice.game.terminal) return null;
  return (
    <E2eSemanticActionGroupV1
      context={context}
      actionIds={hudActionIdsV1}
      accessibleName="经营操作"
    />
  );
}

function E2eNarrativeRendererV1(context: E2eRendererContextV1) {
  if (context.viewSlice.game.terminal) return null;
  return (
    <E2eSemanticActionGroupV1
      context={context}
      actionIds={narrativeActionIdsV1}
      accessibleName="叙事操作"
    />
  );
}

const expectedNamespacesByRendererIdV1 = Object.freeze({
  [e2eStageRendererIdV1]: Object.freeze(["background", "hud", "narrative"] as const),
  [e2eCharacterRendererIdV1]: Object.freeze(["character"] as const),
}) satisfies Readonly<Record<E2eRendererIdV1, readonly UiRendererNamespaceV1[]>>;

function rendererIdsInGraphV1(sceneGraph: E2eSceneGraphV1): ReadonlySet<string> {
  return new Set([
    ...sceneGraph.variants.map(({ rendererId }) => rendererId),
    ...sceneGraph.characterRigs.map(({ rendererId }) => rendererId),
  ]);
}

function requireClosedRendererSetV1(sceneGraph: E2eSceneGraphV1): void {
  const graphRendererIds = rendererIdsInGraphV1(sceneGraph);
  for (const rendererId of graphRendererIds) {
    if (!Object.hasOwn(expectedNamespacesByRendererIdV1, rendererId)) {
      compositionFailureV1(`unknown renderer ID "${rendererId}"`);
    }
  }
  for (const rendererId of e2eRendererIdsV1) {
    if (!graphRendererIds.has(rendererId)) {
      compositionFailureV1(`missing renderer ID "${rendererId}"`);
    }
  }
}

export function createE2eRendererRegistryV1(sceneGraph: E2eSceneGraphV1): E2eRendererRegistryV1 {
  requireClosedRendererSetV1(sceneGraph);
  const Background = (context: E2eRendererContextV1) => renderE2eBackgroundV1(context, sceneGraph);
  const contributionSet = Object.freeze({
    contributionId: "contribution.e2e.web",
    renderers: Object.freeze({
      background: Object.freeze([
        Object.freeze({ rendererId: e2eStageRendererIdV1, component: Background }),
      ]),
      character: Object.freeze([
        Object.freeze({
          rendererId: e2eCharacterRendererIdV1,
          component: E2eCharacterRendererV1,
        }),
      ]),
      hud: Object.freeze([
        Object.freeze({ rendererId: e2eStageRendererIdV1, component: E2eHudRendererV1 }),
      ]),
      narrative: Object.freeze([
        Object.freeze({ rendererId: e2eStageRendererIdV1, component: E2eNarrativeRendererV1 }),
      ]),
    }),
  }) satisfies UiContributionSetV1<E2eRendererContextsV1>;
  return createUiContributionRegistryV1<E2eRendererContextsV1>([contributionSet]);
}
