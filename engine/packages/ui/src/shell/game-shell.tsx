// SPDX-License-Identifier: MIT
import type { DeepReadonly, ReadonlyViewSourceV1 } from "@sillymaker/base";
import type { UiContributionRegistryV1 } from "../contributions/registry.js";
import { useReadonlyViewV1 } from "../runtime/create-view-bridge.js";
interface CommandPort<TCommand> {
  readonly commands: { dispatch(command: DeepReadonly<TCommand>): Promise<unknown> };
}

export interface GameShellPropsV1<
  TView,
  TCommand,
  TPlayerPort extends CommandPort<TCommand>,
  TPresentation,
> {
  readonly view: ReadonlyViewSourceV1<TView>;
  readonly playerPort: TPlayerPort;
  readonly presentation: TPresentation;
  readonly contributions: UiContributionRegistryV1<TView, TPlayerPort, TPresentation>;
  readonly sceneId: string;
  readonly hudId: string;
  readonly incrementCommand: DeepReadonly<TCommand>;
  readonly incrementLabel: string;
}

export function GameShell<
  TView,
  TCommand,
  TPlayerPort extends CommandPort<TCommand>,
  TPresentation,
>(props: GameShellPropsV1<TView, TCommand, TPlayerPort, TPresentation>) {
  const current = useReadonlyViewV1(props.view);
  const context = Object.freeze({
    view: current,
    playerPort: props.playerPort,
    presentation: props.presentation,
  });
  const scene = props.contributions.scenes.get(props.sceneId);
  const hud = props.contributions.hud.get(props.hudId);
  if (scene === undefined || hud === undefined) throw new TypeError("missing UI contribution");
  return (
    <main className="game-shell">
      <section className="game-shell__stage" aria-label="游戏场景">
        {scene.render(context)}
        <div className="game-shell__hud">{hud.render(context)}</div>
      </section>
      <section className="game-shell__workspace" aria-label="操作区">
        <button
          className="game-shell__action"
          type="button"
          aria-label={props.incrementLabel}
          onClick={() => void props.playerPort.commands.dispatch(props.incrementCommand)}
        >
          +
        </button>
      </section>
      <section className="game-shell__narrative" aria-label="叙事区" />
      <output className="game-shell__status" aria-label="系统状态">
        {String(Reflect.get(current as object, "status") ?? "ready")}
      </output>
    </main>
  );
}
