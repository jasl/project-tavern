// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  CharacterHostV1,
  GameShell,
  SettingsLauncherV1,
  StageSceneHostV1,
  SystemDialogHostV1,
  useRuntimePresentationV1,
  validateRuntimeInteractionSurfaceV1,
  type GameStageLayersV1,
  type UiContributionRegistryV1,
} from "@sillymaker/ui";
import type { ComponentType, ReactElement } from "react";

import type { E2ePresentationRuntimeV1 } from "./create-e2e-presentation-runtime.js";
import { E2eSettingsSectionV1 } from "../presentation/e2e-settings-section.js";
import type { E2eRuntimePresentationPublicationV1 } from "../presentation/runtime-presentation.js";
import {
  e2eUiRendererIdsV1,
  type E2eInteractionRendererContextV1,
  type E2eUiRendererContextsV1,
} from "../presentation/ui-contributions.js";

export interface E2eApplicationRootPropsV1 {
  readonly runtime: E2ePresentationRuntimeV1;
}

function requireRendererV1<TNamespace extends keyof E2eUiRendererContextsV1>(
  registry: UiContributionRegistryV1<E2eUiRendererContextsV1>,
  namespace: TNamespace,
  rendererId: string,
): ComponentType<E2eUiRendererContextsV1[TNamespace]> {
  const resolved = registry.resolve(namespace, rendererId);
  if (resolved.kind === "not_found") {
    throw new TypeError(`ui.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolved.component;
}

function createInteractionLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement | null {
  const surface = publication.view.interactionSurfaces[0];
  if (surface === undefined) return null;
  const hitMap = runtime.resolvedGame.sceneGraph.hitMaps.find(
    (candidate) => candidate.hitMapId === surface.hitMapId,
  );
  if (hitMap === undefined) return null;
  const validated = validateRuntimeInteractionSurfaceV1(surface, {
    revision: publication.revision,
    resolvedSurfaces: runtime.resolvedGame.sceneGraph.interactionSurfaces,
    runtimeSurfaces: publication.view.interactionSurfaces,
  });
  const InteractionRenderer = requireRendererV1(
    runtime.contributions,
    "scene_interaction",
    e2eUiRendererIdsV1.interaction,
  );
  const context = Object.freeze({
    viewSlice: Object.freeze({
      surface: validated.surface,
      hitMap,
      spatialState: validated.spatialState,
      activeCueId: publication.view.activeCueId,
    }),
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
    controller: runtime.interactionController,
    session: runtime.interactionSession,
    inputRouter: runtime.input,
  }) satisfies E2eInteractionRendererContextV1;
  return <InteractionRenderer {...context} />;
}

function createCharacterLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement | null {
  if (publication.view.characters.length === 0) return null;
  return (
    <>
      {publication.view.characters.map((character) => (
        <CharacterHostV1
          key={character.characterId}
          character={character}
          contributions={runtime.contributions}
          semantic={runtime.application.semantic}
          presentation={runtime.presentationRead}
        />
      ))}
    </>
  );
}

function createSystemLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement {
  const SystemRenderer = requireRendererV1(
    runtime.contributions,
    "system",
    e2eUiRendererIdsV1.system,
  );
  const context = Object.freeze({
    viewSlice: publication.view,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["system"];
  const settingsSection = (
    <E2eSettingsSectionV1
      contentPreference={runtime.contentPreference}
      presentation={runtime.presentationRead}
    />
  );
  return (
    <SystemDialogHostV1
      inputRouter={runtime.input}
      settings={Object.freeze({
        title: "设置",
        closeLabel: "关闭",
        sections: Object.freeze([settingsSection]),
        emptyText: "没有可用设置。",
      })}
    >
      <SystemRenderer {...context} />
      <SettingsLauncherV1 label="设置" />
    </SystemDialogHostV1>
  );
}

function createFixedLayersV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): GameStageLayersV1 {
  const HudRenderer = requireRendererV1(runtime.contributions, "hud", e2eUiRendererIdsV1.hud);
  const OverlayRenderer = requireRendererV1(
    runtime.contributions,
    "workspace_overlay",
    e2eUiRendererIdsV1.overlay,
  );
  const NarrativeRenderer = requireRendererV1(
    runtime.contributions,
    "narrative",
    e2eUiRendererIdsV1.narrative,
  );
  const flowView = Object.freeze({
    game: publication.view.game,
    actions: publication.semantic.actions,
  });
  const flowContext = Object.freeze({
    viewSlice: flowView,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["hud"];
  const overlayContext = Object.freeze({
    viewSlice: publication.view,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["workspace_overlay"];

  return Object.freeze({
    background: (
      <StageSceneHostV1
        stage={publication.view.stage}
        contributions={runtime.contributions}
        semantic={runtime.application.semantic}
        presentation={runtime.presentationRead}
      />
    ),
    character: createCharacterLayerV1(runtime, publication),
    sceneInteraction: createInteractionLayerV1(runtime, publication),
    hud: <HudRenderer {...flowContext} />,
    workspaceOverlay: <OverlayRenderer {...overlayContext} />,
    narrative: <NarrativeRenderer {...flowContext} />,
    system: createSystemLayerV1(runtime, publication),
  });
}

export function E2eApplicationRootV1(props: E2eApplicationRootPropsV1): ReactElement {
  const publication = useRuntimePresentationV1(props.runtime.presentation);
  const layers = createFixedLayersV1(props.runtime, publication);
  const accessibleName = props.runtime.presentationRead.text(
    publication.view.stage.background.accessibleNameTextId,
  ).text;
  const route = publication.view.route;

  return (
    <div
      role="application"
      aria-label="SillyMaker 引擎测试"
      data-application-id={props.runtime.applicationId}
    >
      {route === "main_menu" ? (
        <nav aria-label="引擎测试主菜单">
          <a href="#/play">进入测试</a>
        </nav>
      ) : null}
      <GameShell
        accessibleName={accessibleName}
        layers={layers}
        inputRouter={props.runtime.input}
      />
    </div>
  );
}
