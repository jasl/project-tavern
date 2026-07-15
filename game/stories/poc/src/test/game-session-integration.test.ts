// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createGameSessionV1, type GameSessionDebugInputV1 } from "@sillymaker/base/runtime";
import { describe, expect, it } from "vitest";

import type {
  PocCommandExecutionAttemptV1,
  PocGameCommandV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
  PocReplayableDebugExecutionAttemptV1,
} from "../gameplay/contracts/types.js";
import { createPocGameSimulationV1 } from "../gameplay/game-simulation.js";
import { parseNonNegativeSafeInteger } from "../gameplay/contracts/values.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function requireCommittedV1(attempt: PocCommandExecutionAttemptV1): PocGameSnapshotV1 {
  if (attempt.result.kind !== "committed") {
    throw new TypeError(`expected committed attempt, received ${attempt.result.kind}`);
  }
  return attempt.result.snapshot;
}

describe("PoC GameSession integration", () => {
  it("runs normal gameplay through one real Session attempt without changing integrity", async () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const simulation = createPocGameSimulationV1(fixture.program);
    const started = requireCommittedV1(
      simulation.commandExecutor.executeAttempt(fixture.snapshot, { kind: "run.start" }, undefined),
    );
    const active = requireCommittedV1(
      simulation.commandExecutor.executeAttempt(
        started,
        {
          kind: "policy.choose",
          policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
        },
        undefined,
      ),
    );
    let executeAttemptCalls = 0;
    const composition = createGameSessionV1<PocGameSimulationTypesV1>({
      initialSnapshot: active,
      commandSchema: simulation.commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        executeAttemptCalls += 1;
        return simulation.commandExecutor.executeAttempt(snapshot, command, undefined);
      },
      normalizeUnexpectedDispatchFault(error): never {
        throw error;
      },
    });

    const command: PocGameCommandV1 = { kind: "actor.prepare_food" };
    const result = await composition.session.dispatch(command);

    expect(result).toMatchObject({ kind: "executed", execution: { kind: "committed" } });
    expect(executeAttemptCalls).toBe(1);
    expect(composition.session.getCurrentSnapshot().integrity).toBe(fixture.snapshot.integrity);
  });

  it("lets the Session apply the outer modified-run mark after a committed PoC debug attempt", async () => {
    const fixture = createPocGameplayFixtureV1();
    const simulation = createPocGameSimulationV1(fixture.program);
    const started = requireCommittedV1(
      simulation.commandExecutor.executeAttempt(fixture.snapshot, { kind: "run.start" }, undefined),
    );
    const active = requireCommittedV1(
      simulation.commandExecutor.executeAttempt(
        started,
        {
          kind: "policy.choose",
          policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
        },
        undefined,
      ),
    );
    let innerAttempt: PocReplayableDebugExecutionAttemptV1 | undefined;
    const composition = createGameSessionV1<PocGameSimulationTypesV1>({
      initialSnapshot: active,
      commandSchema: simulation.commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return simulation.commandExecutor.executeAttempt(snapshot, command, undefined);
      },
      normalizeUnexpectedDispatchFault(error): never {
        throw error;
      },
      debug: Object.freeze({
        validate(snapshot, command) {
          return simulation.debugCommandExecutor.validate(snapshot, command, undefined);
        },
        executeAttempt(snapshot, command) {
          innerAttempt = simulation.debugCommandExecutor.executeAttempt(
            snapshot,
            command,
            undefined,
          );
          return innerAttempt;
        },
        normalizeUnexpectedFault(error): never {
          throw error;
        },
      } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>),
    });

    const result = await composition.debugControl.execute(
      {
        kind: "debug.calendar.set_ap",
        value: parseNonNegativeSafeInteger(1),
        reasonId: fixture.program.data.content.reasons[0]!.reasonId,
      },
      () => true,
    );

    expect(result.kind).toBe("executed");
    expect(innerAttempt?.result.kind).toBe("committed");
    if (innerAttempt?.result.kind !== "committed") {
      throw new TypeError("expected committed inner DebugCommand attempt");
    }
    expect(innerAttempt.result.snapshot.integrity).toBe(active.integrity);
    const current = composition.session.getCurrentSnapshot();
    expect(current.integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: current.commandSequence,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.calendar.set_ap",
          sequence: current.commandSequence,
        },
      ],
    });
    expect(composition.commandLog.entries()).toHaveLength(1);
    expect(composition.commandLog.entries()[0]).toMatchObject({
      source: "debug",
      command: { kind: "debug.calendar.set_ap" },
      outcome: { kind: "committed" },
    });
  });
});
