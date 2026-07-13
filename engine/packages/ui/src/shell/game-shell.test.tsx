// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createViewSourceV1 } from "../runtime/create-view-bridge.js";
import { createUiContributionRegistryV1 } from "../contributions/registry.js";
import { GameShell } from "./game-shell.js";

describe("GameShell", () => {
  it("renders a narrow semantic publication without owning a raw command", async () => {
    const incrementInvocation = Object.freeze({
      actionId: "action.test.increment" as const,
      parameters: Object.freeze({}),
    });
    type Publication = {
      readonly status: "ready";
      readonly game: { readonly count: number };
      readonly actions: readonly [
        {
          readonly actionId: "action.test.increment";
          readonly textId: "text.test.increment";
          readonly enabled: boolean;
          readonly reasons: readonly [];
          readonly options: readonly [typeof incrementInvocation];
        },
      ];
    };
    const publication = (count: number): Publication => {
      const descriptor: Publication["actions"][0] = Object.freeze({
        actionId: "action.test.increment" as const,
        textId: "text.test.increment" as const,
        enabled: true,
        reasons: Object.freeze([]) as Publication["actions"][0]["reasons"],
        options: Object.freeze([incrementInvocation]) as Publication["actions"][0]["options"],
      });
      return Object.freeze({
        status: "ready" as const,
        game: Object.freeze({ count }),
        actions: Object.freeze([descriptor]) as Publication["actions"],
      });
    };
    const view = createViewSourceV1<Publication>(publication(0));
    const invocations: unknown[] = [];
    const semantic = Object.freeze({
      async dispatch(invocation: typeof incrementInvocation) {
        invocations.push(invocation);
        view.publish(publication(1));
        return Object.freeze({ kind: "committed" as const });
      },
    });
    const presentation = Object.freeze({
      text: Object.freeze({ "text.test.increment": "增加计数" }),
    });
    const rendererContextKeys: string[][] = [];
    const contributions = createUiContributionRegistryV1<
      Publication,
      typeof semantic,
      typeof presentation
    >({
      scenes: [
        {
          id: "renderer.test.scene",
          render: (context) => {
            rendererContextKeys.push(Object.keys(context));
            const { viewSlice, semantic: semanticPort, presentation: textPresentation } = context;
            const descriptor = viewSlice.actions[0];
            if (descriptor === undefined) throw new TypeError("missing test action descriptor");
            const invocation = descriptor.options[0];
            if (invocation === undefined) throw new TypeError("missing test action invocation");
            return (
              <section>
                <p>计数：{viewSlice.game.count}</p>
                <button
                  type="button"
                  disabled={!descriptor.enabled}
                  onClick={() => void semanticPort.dispatch(invocation)}
                >
                  {textPresentation.text[descriptor.textId]}
                </button>
              </section>
            );
          },
        },
      ],
      overlays: [],
      hud: [],
      gameSymbols: [],
    });
    render(
      <GameShell
        view={view}
        semantic={semantic}
        presentation={presentation}
        contributions={contributions}
        sceneId="renderer.test.scene"
        hudId={null}
        accessibleName="测试游戏舞台"
      />,
    );
    expect(screen.getByRole("main", { name: "测试游戏舞台" })).toBeVisible();
    expect(rendererContextKeys).toEqual([["viewSlice", "semantic", "presentation"]]);
    expect(screen.getByText("计数：0")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));
    expect(invocations).toEqual([incrementInvocation]);
    expect(await screen.findByText("计数：1")).toBeVisible();
  });
});
