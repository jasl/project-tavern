// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../contracts/canonical-json.js";
import type {
  StoryDevelopmentEntryV1,
  StoryDevelopmentSupportV1,
} from "../contracts/game-package.js";
import {
  parseStrictJson,
  parseStrictJsonLimitsV1,
} from "../contracts/strict-json.js";
import type { DeepReadonly, RuntimeSchemaV1 } from "../contracts/values.js";
import { parseNonZeroUint32 } from "../contracts/values.js";

const testkitJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 1_048_576,
  maxDepth: 32,
  maxArrayItems: 4096,
  maxObjectMembers: 4096,
  maxNodes: 20_000,
  maxStringBytes: 65_536,
});

export function strictJsonRoundTripV1<T>(
  value: DeepReadonly<T>,
  schema: RuntimeSchemaV1<T>,
): T {
  const parsed = parseStrictJson(canonicalJsonBytes(value), testkitJsonLimitsV1);
  if (!parsed.ok) throw new TypeError(`Strict JSON failed: ${parsed.error.code}`);
  return schema.parse(parsed.value);
}

function isThenable(value: unknown): boolean {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { readonly then?: unknown }).then === "function"
  );
}

export function validateDevelopmentFixturesV1<TFixtureId, TCommand>(
  entry: StoryDevelopmentEntryV1<
    StoryDevelopmentSupportV1<TFixtureId, TCommand>
  >,
  schemas: {
    readonly fixtureIdSchema: RuntimeSchemaV1<TFixtureId>;
    readonly commandSchema: RuntimeSchemaV1<TCommand>;
  },
): void {
  const first = entry.defineDevelopmentSupport();
  if (isThenable(first)) {
    throw new TypeError("defineDevelopmentSupport returned thenable");
  }
  const second = entry.defineDevelopmentSupport();
  if (isThenable(second)) {
    throw new TypeError("defineDevelopmentSupport returned thenable");
  }
  const firstBytes = canonicalJsonBytes(first);
  const secondBytes = canonicalJsonBytes(second);
  if (
    firstBytes.length !== secondBytes.length ||
    firstBytes.some((byte, index) => byte !== secondBytes[index])
  ) {
    throw new TypeError("nondeterministic development support");
  }
  if (
    first === null ||
    typeof first !== "object" ||
    !Array.isArray(first.fixtures)
  ) {
    throw new TypeError("invalid development support");
  }
  const fixtureIds = new Set<unknown>();
  for (const fixture of first.fixtures) {
    const fixtureId = schemas.fixtureIdSchema.parse(fixture.fixtureId);
    if (fixtureIds.has(fixtureId)) throw new TypeError("duplicate fixture ID");
    fixtureIds.add(fixtureId);
    parseNonZeroUint32(fixture.seed);
    if (!Array.isArray(fixture.commands)) {
      throw new TypeError("fixture commands must be an array");
    }
    for (const command of fixture.commands) schemas.commandSchema.parse(command);
  }
}
