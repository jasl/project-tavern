// SPDX-License-Identifier: MIT
import type { DeepReadonly, ReadonlyViewSourceV1 } from "@sillymaker/base";
import type { UiContributionRegistryV1 } from "../contributions/registry.js";
import { useReadonlyViewV1 } from "../runtime/create-view-bridge.js";
import styles from "./game-shell.module.css";

export interface GameShellPropsV1<TViewSlice, TSemantic, TPresentation> {
  readonly view: ReadonlyViewSourceV1<TViewSlice>;
  readonly semantic: TSemantic;
  readonly presentation: TPresentation;
  readonly contributions: UiContributionRegistryV1<TViewSlice, TSemantic, TPresentation>;
  readonly sceneId: string | ((viewSlice: DeepReadonly<TViewSlice>) => string);
  readonly hudId: string | null;
  readonly accessibleName?: string | ((viewSlice: DeepReadonly<TViewSlice>) => string);
}

function resolveViewTextV1<TViewSlice>(
  value: string | ((viewSlice: DeepReadonly<TViewSlice>) => string),
  viewSlice: DeepReadonly<TViewSlice>,
): string {
  return typeof value === "function" ? value(viewSlice) : value;
}

export function GameShell<TViewSlice, TSemantic, TPresentation>(
  props: GameShellPropsV1<TViewSlice, TSemantic, TPresentation>,
) {
  const current = useReadonlyViewV1(props.view);
  const context = Object.freeze({
    viewSlice: current,
    semantic: props.semantic,
    presentation: props.presentation,
  });
  const sceneId = resolveViewTextV1(props.sceneId, current);
  const accessibleName =
    props.accessibleName === undefined
      ? undefined
      : resolveViewTextV1(props.accessibleName, current);
  const scene = props.contributions.scenes.get(sceneId);
  const hud = props.hudId === null ? null : props.contributions.hud.get(props.hudId);
  if (scene === undefined || hud === undefined) throw new TypeError("missing UI contribution");
  return (
    <main className={styles["game-shell"]} aria-label={accessibleName}>
      <section className={styles["game-shell__stage"]} aria-label="游戏场景">
        {scene.render(context)}
        {hud === null ? null : (
          <div className={styles["game-shell__hud"]}>{hud.render(context)}</div>
        )}
      </section>
      <section className={styles["game-shell__narrative"]} aria-label="叙事区" />
    </main>
  );
}
