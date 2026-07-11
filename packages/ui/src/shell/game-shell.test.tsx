// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createReadonlyViewSourceV1 } from "@project-tavern/base";
import { createUiContributionRegistryV1 } from "../contributions/registry.js";
import { GameShell } from "./game-shell.js";

describe("GameShell", () => {
  it("changes its rendered slice only through typed dispatch", async () => {
    type View = { readonly count: number; readonly status: string };
    const view = createReadonlyViewSourceV1<View>(Object.freeze({ count: 0, status: "ready" }));
    const dispatched: unknown[] = [];
    const playerPort = {
      commands: {
        async dispatch(command: { readonly kind: "increment" }) {
          dispatched.push(command);
          view.publish(Object.freeze({ count: 1, status: "ready" }));
          return Object.freeze({ kind: "executed" });
        },
      },
    };
    type Player = typeof playerPort;
    const contributions = createUiContributionRegistryV1<View, Player, { readonly label: string }>({
      scenes: [{ id: "scene", render: ({ view: slice }) => <p>计数：{slice.count}</p> }],
      overlays: [],
      hud: [{ id: "hud", render: () => null }],
      gameSymbols: [],
    });
    render(
      <GameShell
        view={view}
        playerPort={playerPort}
        presentation={{ label: "计数" }}
        contributions={contributions}
        sceneId="scene"
        hudId="hud"
        incrementCommand={{ kind: "increment" }}
        incrementLabel="增加计数"
      />,
    );
    expect(screen.getByText("计数：0")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));
    expect(dispatched).toEqual([{ kind: "increment" }]);
    expect(await screen.findByText("计数：1")).toBeVisible();
  });
});
