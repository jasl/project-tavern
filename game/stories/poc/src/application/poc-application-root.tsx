// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createElement } from "react";
import type { ComponentType, ReactElement } from "react";

import type { AssetId, DeepReadonly, HitMapDescriptorV1, TextId } from "@sillymaker/base";
import {
  CharacterHostV1,
  GameShell,
  OverlayHostV1,
  SettingsLauncherV1,
  StageSceneHostV1,
  SystemDialogHostV1,
  usePresentationAssetV1,
  useRuntimePresentationV1,
} from "@sillymaker/ui";
import type { OverlayRendererResolverV1, UiRendererNamespaceV1 } from "@sillymaker/ui";

import { pocNoContentFilterOptionsTextIdV1, pocTextIdsV1 } from "../content/text-ids.js";
import { pocStageSceneIdsV1 } from "../presentation/presentation-ids.js";
import type {
  PocOverlayIdV1,
  PocRuntimePresentationPublicationV1,
} from "../presentation/runtime/contracts.js";
import {
  pocFixedRendererIdsV1,
  type PocInteractionRendererViewV1,
  type PocUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import type {
  PocInteractionSurfaceResolutionV1,
  PocPresentationRuntimeV1,
} from "./create-poc-presentation-runtime.js";

export interface PocApplicationRootPropsV1 {
  readonly runtime: PocPresentationRuntimeV1;
}

function requireRendererV1<TNamespace extends UiRendererNamespaceV1>(
  runtime: PocPresentationRuntimeV1,
  namespace: TNamespace,
  rendererId: string,
): ComponentType<PocUiRendererContextsV1[TNamespace]> {
  const resolution = runtime.contributions.resolve(namespace, rendererId);
  if (resolution.kind !== "found") {
    throw new TypeError(`ui.poc.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolution.component;
}

function overlayTitleTextIdV1(overlayId: PocOverlayIdV1): TextId {
  switch (overlayId) {
    case "overlay.poc.policy":
      return pocTextIdsV1.overlayPolicyTitle;
    case "overlay.poc.inventory":
      return pocTextIdsV1.overlayInventoryTitle;
    case "overlay.poc.purchase":
      return pocTextIdsV1.overlayPurchaseTitle;
    case "overlay.poc.tavern_plan":
      return pocTextIdsV1.overlayTavernPlanTitle;
    case "overlay.poc.facility":
      return pocTextIdsV1.overlayFacilityTitle;
    case "overlay.poc.world_action":
      return pocTextIdsV1.overlayWorldActionTitle;
    case "overlay.poc.ledger":
      return pocTextIdsV1.overlayLedgerTitle;
    case "overlay.poc.relationship":
      return pocTextIdsV1.overlayRelationshipTitle;
    case "overlay.poc.run_summary":
      return pocTextIdsV1.overlayRunSummaryTitle;
  }
  const unsupportedOverlayId: never = overlayId;
  throw new TypeError(`ui.poc.overlay_unknown:${unsupportedOverlayId}`);
}

function findHitMapV1(
  runtime: PocPresentationRuntimeV1,
  hitMapId: PocInteractionRendererViewV1["surface"]["hitMapId"],
): DeepReadonly<HitMapDescriptorV1> | null {
  if (hitMapId === null) return null;
  const matches = runtime.resolvedGame.sceneGraph.hitMaps.filter(
    (candidate) => candidate.hitMapId === hitMapId,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function PocResolvedInteractionRendererV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1> | null;
}): ReactElement {
  const InteractionRenderer = requireRendererV1(
    props.runtime,
    "scene_interaction",
    pocFixedRendererIdsV1.sceneInteraction,
  );
  return createElement(InteractionRenderer, {
    viewSlice: Object.freeze({
      surface: props.resolution.surface,
      hitMap: props.hitMap,
      spatialState: props.hitMap === null ? ("disabled" as const) : props.resolution.spatialState,
    }) satisfies DeepReadonly<PocInteractionRendererViewV1>,
    semantic: props.runtime.application.semantic,
    presentation: props.runtime.presentationRead,
    controller: props.runtime.rendering.interactionController,
    session: props.runtime.rendering.interactionSession,
    inputRouter: props.runtime.input,
  });
}

function PocAssetGatedInteractionRendererV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1>;
  readonly criticalLayerAssetId: AssetId;
  readonly staticFallbackAssetId: AssetId;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}): ReactElement {
  const criticalLayer = usePresentationAssetV1(
    props.runtime.presentationRead,
    props.criticalLayerAssetId,
    "character_pose",
  );
  const staticFallback = usePresentationAssetV1(
    props.runtime.presentationRead,
    props.staticFallbackAssetId,
    "character_pose",
  );
  const compatibleVisual =
    criticalLayer.delivery === "runtime_image" ||
    (props.fallbackHitMapCompatibility === "compatible" &&
      staticFallback.delivery === "runtime_image");
  return (
    <PocResolvedInteractionRendererV1
      runtime={props.runtime}
      resolution={props.resolution}
      hitMap={compatibleVisual ? props.hitMap : null}
    />
  );
}

function PocInteractionLayerV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly publication: DeepReadonly<PocRuntimePresentationPublicationV1>;
}): ReactElement | null {
  const nodes = props.publication.view.interactionSurfaces.map((surface) => {
    const resolution = props.runtime.rendering.resolveInteractionSurface(
      props.publication,
      surface.surfaceId,
    );
    if (resolution === null) return null;
    const hitMapId = resolution.surface.hitMapId;
    const hitMap = findHitMapV1(props.runtime, hitMapId);
    if (hitMapId === null || hitMap === null) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          runtime={props.runtime}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    const characters = props.publication.view.characters.filter(
      (character) => character.hitMapId === hitMapId,
    );
    const character = characters.length === 1 ? characters[0] : undefined;
    const criticalLayers = character?.appearance.filter(
      (layer) => layer.fallbackPolicy === "character_fallback",
    );
    const criticalLayer = criticalLayers?.length === 1 ? criticalLayers[0] : undefined;
    if (
      character === undefined ||
      criticalLayer === undefined ||
      character.staticFallbackAssetId === null
    ) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          runtime={props.runtime}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    return (
      <PocAssetGatedInteractionRendererV1
        key={surface.surfaceId}
        runtime={props.runtime}
        resolution={resolution}
        hitMap={hitMap}
        criticalLayerAssetId={criticalLayer.assetId}
        staticFallbackAssetId={character.staticFallbackAssetId}
        fallbackHitMapCompatibility={character.fallbackHitMapCompatibility}
      />
    );
  });
  return nodes.every((node) => node === null) ? null : <>{nodes}</>;
}

function createOverlayResolverV1(input: {
  readonly renderer: ComponentType<PocUiRendererContextsV1["workspace_overlay"]>;
  readonly publication: DeepReadonly<PocRuntimePresentationPublicationV1>;
  readonly runtime: PocPresentationRuntimeV1;
}): OverlayRendererResolverV1<PocOverlayIdV1> {
  const presentation = input.runtime.presentationRead;
  const semantic = input.runtime.application.semantic;
  return Object.freeze({
    resolve(overlayId: DeepReadonly<PocOverlayIdV1>) {
      return Object.freeze({
        accessibleName: presentation.text(overlayTitleTextIdV1(overlayId)).text,
        content: createElement(input.renderer, {
          viewSlice: Object.freeze({
            overlayId,
            game: input.publication.view.game,
            actions: input.publication.semantic.actions,
          }),
          semantic,
          presentation,
          gameSymbols: input.runtime.gameSymbols,
        }),
      });
    },
  });
}

export function PocApplicationRootV1({ runtime }: PocApplicationRootPropsV1): ReactElement {
  const publication = useRuntimePresentationV1(runtime.presentation);
  const semantic = runtime.application.semantic;
  const presentation = runtime.presentationRead;
  const HudRenderer = requireRendererV1(runtime, "hud", pocFixedRendererIdsV1.hud);
  const OverlayRenderer = requireRendererV1(
    runtime,
    "workspace_overlay",
    pocFixedRendererIdsV1.workspaceOverlay,
  );
  const NarrativeRenderer = requireRendererV1(
    runtime,
    "narrative",
    pocFixedRendererIdsV1.narrative,
  );
  const SystemRenderer = requireRendererV1(runtime, "system", pocFixedRendererIdsV1.system);

  const overlayResolver = createOverlayResolverV1({
    renderer: OverlayRenderer,
    publication,
    runtime,
  });

  const layers = Object.freeze({
    background: (
      <StageSceneHostV1
        stage={publication.view.stage}
        contributions={runtime.contributions}
        semantic={semantic}
        presentation={presentation}
      />
    ),
    character: publication.view.characters.map((character) => (
      <CharacterHostV1
        key={character.characterId}
        character={character}
        contributions={runtime.contributions}
        semantic={semantic}
        presentation={presentation}
      />
    )),
    sceneInteraction: <PocInteractionLayerV1 runtime={runtime} publication={publication} />,
    hud: createElement(HudRenderer, {
      viewSlice: publication.view.game.hud,
      semantic,
      presentation,
      gameSymbols: runtime.gameSymbols,
    }),
    workspaceOverlay: (
      <OverlayHostV1
        store={runtime.rendering.overlaySession}
        rendererResolver={overlayResolver}
        inputRouter={runtime.input}
      />
    ),
    narrative: createElement(NarrativeRenderer, {
      viewSlice: Object.freeze({
        narrative: publication.view.narrative,
        actions: publication.semantic.actions,
      }),
      semantic,
      presentation,
    }),
    system: (
      <SystemDialogHostV1
        inputRouter={runtime.input}
        settings={Object.freeze({
          title: "设置",
          closeLabel: presentation.text(pocTextIdsV1.controlCloseLabel).text,
          sections: Object.freeze([]),
          emptyText: presentation.text(pocNoContentFilterOptionsTextIdV1).text,
        })}
      >
        {createElement(SystemRenderer, {
          viewSlice: null,
          semantic,
          presentation,
        })}
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>
    ),
  });

  return (
    <div
      role="application"
      aria-label="Project Tavern 七日原型"
      data-application-id={runtime.applicationId}
    >
      {publication.view.stage.stageSceneId === pocStageSceneIdsV1[0] ? (
        <nav aria-label="Project Tavern 主菜单">
          <a href="#/play">开始七日原型</a>
        </nav>
      ) : null}
      <GameShell
        accessibleName={
          presentation.text(publication.view.stage.background.accessibleNameTextId).text
        }
        layers={layers}
        inputRouter={runtime.input}
      />
    </div>
  );
}
