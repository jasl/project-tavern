// SPDX-License-Identifier: MIT
import type { ComponentType, ReactElement } from "react";
import type { DeepReadonly } from "@sillymaker/base";
import type {
  GameRendererContextV1,
  UiContributionRegistryV1,
  UiRendererNamespaceV1,
} from "../contributions/types.js";
import type { SemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.js";
import { useSemanticPublicationV1 } from "../runtime/use-semantic-publication.js";
import styles from "./game-shell.module.css";

type RendererSelectorV1<TViewSlice> =
  string | null | ((viewSlice: DeepReadonly<TViewSlice>) => string | null);

export type GameShellRendererIdsV1<TViewSlice> = Readonly<{
  [TNamespace in UiRendererNamespaceV1]: RendererSelectorV1<TViewSlice>;
}>;

type GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation> = GameRendererContextV1<
  TViewSlice,
  TSemantic,
  TPresentation
>;

type GameShellRendererContextsV1<TViewSlice, TSemantic, TPresentation> = Readonly<{
  [TNamespace in UiRendererNamespaceV1]: GameShellRendererContextV1<
    TViewSlice,
    TSemantic,
    TPresentation
  >;
}>;

export interface GameShellPropsV1<TViewSlice, TSemantic, TPresentation> {
  readonly publication: SemanticPublicationBridgeV1<TViewSlice>;
  readonly semantic: TSemantic;
  readonly presentation: TPresentation;
  readonly contributions: UiContributionRegistryV1<
    GameShellRendererContextsV1<TViewSlice, TSemantic, TPresentation>
  >;
  readonly rendererIds: GameShellRendererIdsV1<TViewSlice>;
  readonly accessibleName?: string | ((viewSlice: DeepReadonly<TViewSlice>) => string);
}

function resolveViewTextV1<TViewSlice>(
  value: string | ((viewSlice: DeepReadonly<TViewSlice>) => string),
  viewSlice: DeepReadonly<TViewSlice>,
): string {
  return typeof value === "function" ? value(viewSlice) : value;
}

function resolveRendererIdV1<TViewSlice>(
  selector: RendererSelectorV1<TViewSlice>,
  viewSlice: DeepReadonly<TViewSlice>,
): string | null {
  return typeof selector === "function" ? selector(viewSlice) : selector;
}

function requireRendererV1<TViewSlice, TSemantic, TPresentation>(
  registry: UiContributionRegistryV1<
    GameShellRendererContextsV1<TViewSlice, TSemantic, TPresentation>
  >,
  namespace: UiRendererNamespaceV1,
  rendererId: string | null,
): ComponentType<GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation>> | null {
  if (rendererId === null) return null;
  const resolved = registry.resolve(namespace, rendererId);
  if (resolved.kind === "not_found") {
    throw new TypeError(`ui.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolved.component as ComponentType<
    GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation>
  >;
}

function renderContributionV1<TViewSlice, TSemantic, TPresentation>(
  Component: ComponentType<GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation>> | null,
  context: GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation>,
): ReactElement | null {
  return Component === null ? null : <Component {...context} />;
}

export function GameShell<TViewSlice, TSemantic, TPresentation>(
  props: GameShellPropsV1<TViewSlice, TSemantic, TPresentation>,
) {
  const current = useSemanticPublicationV1(props.publication);
  const context = Object.freeze({
    viewSlice: current,
    semantic: props.semantic,
    presentation: props.presentation,
  }) satisfies GameShellRendererContextV1<TViewSlice, TSemantic, TPresentation>;
  const accessibleName =
    props.accessibleName === undefined
      ? undefined
      : resolveViewTextV1(props.accessibleName, current);
  const rendererId = (namespace: UiRendererNamespaceV1) =>
    resolveRendererIdV1(props.rendererIds[namespace], current);
  const background = requireRendererV1(props.contributions, "background", rendererId("background"));
  const character = requireRendererV1(props.contributions, "character", rendererId("character"));
  const sceneInteraction = requireRendererV1(
    props.contributions,
    "scene_interaction",
    rendererId("scene_interaction"),
  );
  const hud = requireRendererV1(props.contributions, "hud", rendererId("hud"));
  const workspaceOverlay = requireRendererV1(
    props.contributions,
    "workspace_overlay",
    rendererId("workspace_overlay"),
  );
  const narrative = requireRendererV1(props.contributions, "narrative", rendererId("narrative"));
  const system = requireRendererV1(props.contributions, "system", rendererId("system"));

  return (
    <main className={styles["game-shell"]} aria-label={accessibleName}>
      <section className={styles["game-shell__stage"]} aria-label="游戏场景">
        {renderContributionV1(background, context)}
        {renderContributionV1(character, context)}
        {renderContributionV1(sceneInteraction, context)}
        {hud === null ? null : (
          <div className={styles["game-shell__hud"]}>{renderContributionV1(hud, context)}</div>
        )}
      </section>
      {workspaceOverlay === null ? null : (
        <section className={styles["game-shell__workspace"]} aria-label="工作区浮层">
          {renderContributionV1(workspaceOverlay, context)}
        </section>
      )}
      <section className={styles["game-shell__narrative"]} aria-label="叙事区">
        {renderContributionV1(narrative, context)}
      </section>
      {renderContributionV1(system, context)}
    </main>
  );
}
