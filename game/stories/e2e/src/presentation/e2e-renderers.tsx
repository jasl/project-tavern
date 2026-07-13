// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type { DeepReadonly, TextId } from "@sillymaker/base";
import { createUiContributionRegistryV1 } from "@sillymaker/ui";
import type { UiContributionRegistryV1, UiContributionRenderContextV1 } from "@sillymaker/ui";

import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticGamePortV1,
  E2eSemanticInvocationV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import type { E2ePresentationV1 } from "./presentation-program.js";
import { e2eCharacterRendererIdV1, e2eRendererIdsV1, e2eStageRendererIdV1 } from "./scene-graph.js";
import type { E2eRendererIdV1, E2eSceneGraphV1 } from "./scene-graph.js";

type E2eRendererContextV1 = UiContributionRenderContextV1<
  E2eSemanticPublicationV1,
  E2eSemanticGamePortV1,
  E2ePresentationV1
>;

export type E2eRendererRegistryV1 = UiContributionRegistryV1<
  E2eSemanticPublicationV1,
  E2eSemanticGamePortV1,
  E2ePresentationV1
>;

function compositionFailureV1(message: string): never {
  throw new TypeError(`E2E renderer composition failed: ${message}`);
}

export function readE2ePresentationTextV1(
  presentation: DeepReadonly<E2ePresentationV1>,
  textId: TextId,
): string {
  const visited = new Set<string>();
  let locale: string | null = presentation.textCatalogs.defaultLocale;
  while (locale !== null && !visited.has(locale)) {
    visited.add(locale);
    const catalog = presentation.textCatalogs.catalogs.find(
      (candidate) => candidate.locale === locale,
    );
    if (catalog === undefined) break;
    const entry = catalog.entries.find((candidate) => candidate.textId === textId);
    if (entry !== undefined) return entry.text;
    locale = catalog.fallbackLocale;
  }
  return compositionFailureV1(`missing text ID "${textId}"`);
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

function reasonTextV1(
  context: E2eRendererContextV1,
  descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>,
): string | null {
  if (descriptor.enabled || descriptor.reasons.length === 0) return null;
  return readE2ePresentationTextV1(
    context.presentation,
    parseTextId("text.e2e.reason.flow_unavailable"),
  );
}

function E2eSemanticActionsV1({ context }: { readonly context: E2eRendererContextV1 }) {
  return (
    <div aria-label="可用操作">
      {context.viewSlice.actions.flatMap((descriptor, descriptorIndex) => {
        const reasonText = reasonTextV1(context, descriptor);
        return descriptor.options.map((invocation, optionIndex) => {
          const reasonId = `e2e-action-reason-${descriptorIndex}-${optionIndex}`;
          const label = readE2ePresentationTextV1(
            context.presentation,
            optionTextIdV1(descriptor, invocation),
          );
          return (
            <div key={`${descriptor.actionId}:${optionIndex}`}>
              <button
                type="button"
                disabled={!descriptor.enabled}
                aria-describedby={reasonText === null ? undefined : reasonId}
                onClick={() => void context.semantic.dispatch(invocation)}
              >
                {label}
              </button>
              {reasonText === null ? null : <small id={reasonId}>{reasonText}</small>}
            </div>
          );
        });
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

function E2eStageRendererV1(context: E2eRendererContextV1, sceneGraph: E2eSceneGraphV1) {
  const variant = selectE2eStageVariantV1(sceneGraph, context.viewSlice);
  if (variant.layout.kind !== "e2e_stage") {
    return compositionFailureV1(`unsupported stage layout "${String(variant.layout.kind)}"`);
  }
  const nodeText = readE2ePresentationTextV1(
    context.presentation,
    parseTextId(`text.e2e.flow.node.${context.viewSlice.game.flow.nodeId}`),
  );
  if (variant.layout.mode === "summary") {
    const summaryName = readE2ePresentationTextV1(
      context.presentation,
      variant.accessibleNameTextId,
    );
    return (
      <div data-renderer-id={e2eStageRendererIdV1}>
        <h1>{summaryName}</h1>
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
      <E2eSemanticActionsV1 context={context} />
    </div>
  );
}

function E2eCharacterRendererV1(_context: E2eRendererContextV1) {
  return <span aria-hidden="true" data-renderer-id={e2eCharacterRendererIdV1} />;
}

const e2eRendererBindingsV1 = Object.freeze({
  [e2eStageRendererIdV1]: Object.freeze({
    namespace: "scenes" as const,
    createRender: (sceneGraph: E2eSceneGraphV1) => (context: E2eRendererContextV1) =>
      E2eStageRendererV1(context, sceneGraph),
  }),
  [e2eCharacterRendererIdV1]: Object.freeze({
    namespace: "gameSymbols" as const,
    createRender: (_sceneGraph: E2eSceneGraphV1) => E2eCharacterRendererV1,
  }),
}) satisfies Readonly<
  Record<
    E2eRendererIdV1,
    {
      readonly namespace: "scenes" | "gameSymbols";
      createRender(sceneGraph: E2eSceneGraphV1): (context: E2eRendererContextV1) => React.ReactNode;
    }
  >
>;

function rendererIdsInGraphV1(sceneGraph: E2eSceneGraphV1): ReadonlySet<string> {
  return new Set([
    ...sceneGraph.variants.map(({ rendererId }) => rendererId),
    ...sceneGraph.characterRigs.map(({ rendererId }) => rendererId),
  ]);
}

function requireClosedRendererSetV1(sceneGraph: E2eSceneGraphV1): void {
  const graphRendererIds = rendererIdsInGraphV1(sceneGraph);
  for (const rendererId of graphRendererIds) {
    if (!Object.hasOwn(e2eRendererBindingsV1, rendererId)) {
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
  return createUiContributionRegistryV1({
    scenes: [
      Object.freeze({
        id: e2eStageRendererIdV1,
        render: e2eRendererBindingsV1[e2eStageRendererIdV1].createRender(sceneGraph),
      }),
    ],
    overlays: Object.freeze([]),
    hud: Object.freeze([]),
    gameSymbols: [
      Object.freeze({
        id: e2eCharacterRendererIdV1,
        render: e2eRendererBindingsV1[e2eCharacterRendererIdV1].createRender(sceneGraph),
      }),
    ],
  });
}
