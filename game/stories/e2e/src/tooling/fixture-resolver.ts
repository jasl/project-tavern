// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSnapshotEnvelopeSchemaV1,
  parseNonZeroUint32,
  rngStateV1Schema,
} from "@sillymaker/base";
import type { DeepReadonly, NonZeroUint32, StoryToolingEntryV1 } from "@sillymaker/base";

import type { E2eGameCommandV1, E2eGameSnapshotV1 } from "../gameplay/contracts/index.js";
import type { E2eGameSimulationV1 } from "../gameplay/game-simulation.js";
import { createE2eSessionV1 } from "../session.js";

export const e2eFixtureIdsV1 = Object.freeze([
  "fixture.e2e.initial",
  "fixture.e2e.choice-left-blocked",
  "fixture.e2e.choice-right-blocked",
  "fixture.e2e.terminal",
] as const);

export type E2eFixtureIdV1 = (typeof e2eFixtureIdsV1)[number];

export interface E2eToolingFixtureV1 {
  readonly fixtureId: E2eFixtureIdV1;
  readonly seed: NonZeroUint32;
  readonly commands: readonly E2eGameCommandV1[];
}

export type E2eFixtureResolutionV1 =
  | {
      readonly kind: "resolved";
      readonly fixtureId: E2eFixtureIdV1;
      readonly snapshot: DeepReadonly<E2eGameSnapshotV1>;
    }
  | {
      readonly kind: "unknown_reference";
      readonly fixtureId: string;
    };

export interface E2eFixtureResolverV1 {
  listFixtureIds(): readonly E2eFixtureIdV1[];
  resolveFixture(fixtureId: string): Promise<E2eFixtureResolutionV1>;
}

function dataObjectV1(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label}`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  const result = dataObjectV1(value, label);
  if (Object.keys(result).toSorted().join("\0") !== [...expectedKeys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label}`);
  }
  return result;
}

function denseArrayV1<T>(
  value: unknown,
  parseEntry: (entry: unknown, index: number) => T,
  label: string,
): readonly T[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (
    Object.getOwnPropertySymbols(value).length !== 0 ||
    keys.length !== value.length ||
    keys.some((key, index) => key !== String(index))
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return Object.freeze(
    keys.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label}`);
      }
      return parseEntry(descriptor.value, index);
    }),
  );
}

function parseFixedFixtureCatalogV1(
  gameSimulation: E2eGameSimulationV1,
  toolingEntry: StoryToolingEntryV1<unknown>,
): readonly E2eToolingFixtureV1[] {
  if (
    toolingEntry.contractRevision !== 1 ||
    toolingEntry.storyIdentity.id !== "story.e2e" ||
    toolingEntry.storyIdentity.revision !== 1
  ) {
    throw new TypeError("invalid E2E tooling Story identity");
  }

  const supportValue = toolingEntry.defineToolingSupport();
  const support = dataObjectV1(supportValue, "E2E tooling support");
  return denseArrayV1(
    support.fixtures,
    (fixtureValue, index) => {
      const expectedFixtureId = e2eFixtureIdsV1[index];
      if (expectedFixtureId === undefined) throw new TypeError("invalid E2E fixture catalog");
      const fixture = exactDataObjectV1(
        fixtureValue,
        ["fixtureId", "seed", "commands"],
        "E2E tooling fixture",
      );
      if (fixture.fixtureId !== expectedFixtureId) {
        throw new TypeError("invalid E2E fixture catalog");
      }
      return Object.freeze({
        fixtureId: expectedFixtureId,
        seed: parseNonZeroUint32(fixture.seed),
        commands: denseArrayV1(
          fixture.commands,
          (command) => gameSimulation.commandSchema.parse(command),
          "E2E fixture commands",
        ),
      });
    },
    "E2E tooling fixtures",
  );
}

export function createE2eFixtureResolverV1(
  gameSimulation: E2eGameSimulationV1,
  toolingEntry: StoryToolingEntryV1<unknown>,
): E2eFixtureResolverV1 {
  const fixtures = parseFixedFixtureCatalogV1(gameSimulation, toolingEntry);
  if (fixtures.length !== e2eFixtureIdsV1.length) {
    throw new TypeError("invalid E2E fixture catalog");
  }
  const byId = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture] as const));
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    gameSimulation.stateSchema,
    rngStateV1Schema,
  );

  return Object.freeze({
    listFixtureIds: () => e2eFixtureIdsV1,
    async resolveFixture(fixtureId: string): Promise<E2eFixtureResolutionV1> {
      const fixture = byId.get(fixtureId as E2eFixtureIdV1);
      if (fixture === undefined) {
        return Object.freeze({ kind: "unknown_reference" as const, fixtureId });
      }

      const session = createE2eSessionV1(gameSimulation, Object.freeze({ rngSeed: fixture.seed }));
      for (const command of fixture.commands) {
        const result = await session.dispatch(command);
        if (result.kind !== "executed" || result.execution.kind !== "committed") {
          throw new TypeError("invalid E2E fixture command sequence");
        }
      }
      return Object.freeze({
        kind: "resolved" as const,
        fixtureId: fixture.fixtureId,
        snapshot: snapshotSchema.parse(session.getCurrentSnapshot()),
      });
    },
  });
}
