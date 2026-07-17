// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  pocDebugCommandKindsV1,
  pocDebugCommandSchemaV1,
  type PocDebugCommandV1,
} from "../gameplay/index.js";
import { pocDebugCommandFormAdapterV1 } from "./debug-command-form-adapter.js";

const commandFormsV1 = Object.freeze(
  [
    {
      kind: "debug.calendar.set_ap",
      value: 3,
      reasonId: "reason.debug.state_override",
    },
    {
      kind: "debug.actor.set_stamina",
      actorId: "actor.player",
      value: 8,
      reasonId: "reason.debug.state_override",
    },
    {
      kind: "debug.actor.set_mood",
      actorId: "actor.heroine",
      value: 1,
      reasonId: "reason.debug.state_override",
    },
    {
      kind: "debug.relationship.set",
      affection: 2,
      teamwork: 1,
      stage: "cold",
      reasonId: "reason.debug.state_override",
    },
    {
      kind: "debug.inventory.adjust_cash",
      delta: 5,
      reasonId: "reason.debug.cash_adjustment",
    },
    {
      kind: "debug.aura.apply",
      auraId: "tavern.sign_repaired",
      target: { kind: "tavern" },
      duration: { kind: "countdown", unit: "opening", remaining: 1 },
      reasonId: "reason.debug.aura_adjustment",
    },
    {
      kind: "debug.aura.clear",
      instanceId: "aura:initial:0",
      reasonId: "reason.debug.aura_adjustment",
    },
    {
      kind: "debug.story.fact.set",
      factId: "fact.war_clue",
      value: { kind: "boolean", value: true },
      reasonId: "reason.debug.state_override",
    },
    {
      kind: "debug.narrative.jump",
      cursor: {
        sceneId: "scene.supplier_invoice",
        nodeId: "node.supplier_invoice.choice",
      },
      reasonId: "reason.debug.narrative_jump",
    },
    {
      kind: "debug.rng.set",
      rng: { algorithm: "xorshift32-v1", cursor: 17, rawDrawCount: 4 },
      reasonId: "reason.debug.rng_override",
    },
  ].map((command) => pocDebugCommandSchemaV1.parse(command)),
) satisfies readonly PocDebugCommandV1[];

describe("PoC DebugCommand form adapter", () => {
  it("exposes exactly the ten already-declared command kinds", () => {
    expect(pocDebugCommandFormAdapterV1.kinds).toEqual(pocDebugCommandKindsV1);
    expect(Object.isFrozen(pocDebugCommandFormAdapterV1.kinds)).toBe(true);
    expect(Object.isFrozen(pocDebugCommandFormAdapterV1)).toBe(true);
  });

  it.each(commandFormsV1)("copies and freezes the controlled $kind fields", (form) => {
    const command = pocDebugCommandFormAdapterV1.toCommand(form);

    expect(command).toEqual(form);
    expect(command).not.toBe(form);
    expect(Object.isFrozen(command)).toBe(true);
    for (const value of Object.values(command)) {
      if (value !== null && typeof value === "object") expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it("does not forward arbitrary top-level or nested State paths", () => {
    const auraApply = commandFormsV1.find(
      (command): command is Extract<PocDebugCommandV1, { readonly kind: "debug.aura.apply" }> =>
        command.kind === "debug.aura.apply",
    );
    if (auraApply === undefined) throw new TypeError("missing controlled aura form");
    const withPaths = {
      kind: "debug.aura.apply" as const,
      auraId: auraApply.auraId,
      target: { ...auraApply.target, path: "simulation.status.auras" },
      duration: { ...auraApply.duration, path: "simulation.calendar.phase" },
      reasonId: auraApply.reasonId,
      path: "simulation.status",
    };

    expect(pocDebugCommandFormAdapterV1.toCommand(withPaths)).toEqual(auraApply);
  });

  it("rejects an unknown form kind instead of widening the union", () => {
    expect(() =>
      pocDebugCommandFormAdapterV1.toCommand({
        kind: "debug.state.set",
        path: "simulation.inventory.cash",
        value: 999,
      } as never),
    ).toThrow("unsupported PoC DebugCommand form kind");
  });
});
