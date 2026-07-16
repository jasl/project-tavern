// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createUiContributionRegistryV1 } from "../contributions/registry.js";
import type { GameRendererContextV1, UiRendererNamespaceV1 } from "../contributions/types.js";
import { createSemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.js";
import { GameShell } from "./game-shell.js";

const incrementInvocationV1 = Object.freeze({
  actionId: "action.test.increment" as const,
  parameters: Object.freeze({}),
});

type PublicationV1 = Readonly<{
  revision: number;
  status: "ready";
  game: Readonly<{ count: number }>;
  narrative: null;
  actions: readonly [
    Readonly<{
      actionId: "action.test.increment";
      enabled: true;
      reasons: readonly [];
      options: readonly [typeof incrementInvocationV1];
    }>,
  ];
}>;

function publicationV1(count: number): PublicationV1 {
  return Object.freeze({
    revision: count,
    status: "ready" as const,
    game: Object.freeze({ count }),
    narrative: null,
    actions: Object.freeze([
      Object.freeze({
        actionId: "action.test.increment" as const,
        enabled: true as const,
        reasons: Object.freeze([]),
        options: Object.freeze([incrementInvocationV1]),
      }),
    ]) as PublicationV1["actions"],
  });
}

function createPublicationSourceV1(initial: PublicationV1) {
  let current = initial;
  const listeners = new Set<() => void>();
  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    publish(next: PublicationV1) {
      current = next;
      for (const listener of [...listeners]) listener();
    },
  });
}

describe("GameShell", () => {
  it("renders the atomic publication through only seven-namespace narrow contexts", async () => {
    const source = createPublicationSourceV1(publicationV1(0));
    const bridge = createSemanticPublicationBridgeV1(source);
    const invocations: unknown[] = [];
    const semantic = Object.freeze({
      async dispatch(invocation: typeof incrementInvocationV1) {
        invocations.push(invocation);
        source.publish(publicationV1(1));
        return Object.freeze({ kind: "committed" as const });
      },
    });
    const presentation = Object.freeze({ label: "增加计数" });
    type ContextV1 = GameRendererContextV1<PublicationV1, typeof semantic, typeof presentation>;
    type ContextsV1 = Readonly<Record<UiRendererNamespaceV1, ContextV1>>;
    const seenContextKeys: string[][] = [];
    const Background = (context: ContextV1) => {
      seenContextKeys.push(Object.keys(context));
      return <p>计数：{context.viewSlice.game.count}</p>;
    };
    const Hud = (context: ContextV1) => (
      <button type="button" onClick={() => void context.semantic.dispatch(incrementInvocationV1)}>
        {context.presentation.label}
      </button>
    );
    const Narrative = (context: ContextV1) => <p>语义修订：{context.viewSlice.revision}</p>;
    const contributions = createUiContributionRegistryV1<ContextsV1>([
      Object.freeze({
        contributionId: "contribution.test.shell",
        renderers: Object.freeze({
          background: Object.freeze([
            Object.freeze({ rendererId: "renderer.test.background", component: Background }),
          ]),
          hud: Object.freeze([Object.freeze({ rendererId: "renderer.test.hud", component: Hud })]),
          narrative: Object.freeze([
            Object.freeze({ rendererId: "renderer.test.narrative", component: Narrative }),
          ]),
        }),
      }),
    ]);

    render(
      <GameShell
        publication={bridge}
        semantic={semantic}
        presentation={presentation}
        contributions={contributions}
        rendererIds={Object.freeze({
          background: "renderer.test.background",
          character: null,
          scene_interaction: null,
          hud: "renderer.test.hud",
          workspace_overlay: null,
          narrative: "renderer.test.narrative",
          system: null,
        })}
        accessibleName="测试游戏舞台"
      />,
    );

    expect(screen.getByRole("main", { name: "测试游戏舞台" })).toBeVisible();
    expect(seenContextKeys).toEqual([["viewSlice", "semantic", "presentation"]]);
    expect(screen.getByText("计数：0")).toBeVisible();
    expect(screen.getByText("语义修订：0")).toBeVisible();

    await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));

    expect(invocations).toEqual([incrementInvocationV1]);
    expect(await screen.findByText("计数：1")).toBeVisible();
    expect(screen.getByText("语义修订：1")).toBeVisible();
    bridge.dispose();
  });

  it("reports the exact missing namespace and renderer ID", () => {
    const source = createPublicationSourceV1(publicationV1(0));
    const bridge = createSemanticPublicationBridgeV1(source);
    const semantic = Object.freeze({ dispatch: async () => Object.freeze({ kind: "committed" }) });
    const presentation = Object.freeze({ label: "unused" });
    type ContextV1 = GameRendererContextV1<PublicationV1, typeof semantic, typeof presentation>;
    type ContextsV1 = Readonly<Record<UiRendererNamespaceV1, ContextV1>>;
    const contributions = createUiContributionRegistryV1<ContextsV1>([]);

    expect(() =>
      render(
        <GameShell
          publication={bridge}
          semantic={semantic}
          presentation={presentation}
          contributions={contributions}
          rendererIds={Object.freeze({
            background: "renderer.test.missing",
            character: null,
            scene_interaction: null,
            hud: null,
            workspace_overlay: null,
            narrative: null,
            system: null,
          })}
        />,
      ),
    ).toThrowError("ui.renderer_not_found:background:renderer.test.missing");
    bridge.dispose();
  });
});
