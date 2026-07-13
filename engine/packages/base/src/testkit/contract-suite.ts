// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../contracts/canonical-json.js";
import type { StoryToolingEntryV1 } from "../contracts/game-package.js";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "../contracts/strict-json.js";
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

export function strictJsonRoundTripV1<T>(value: DeepReadonly<T>, schema: RuntimeSchemaV1<T>): T {
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

export function validateToolingFixturesV1<TFixtureId, TCommand>(
  entry: StoryToolingEntryV1<unknown>,
  schemas: {
    readonly fixtureIdSchema: RuntimeSchemaV1<TFixtureId>;
    readonly commandSchema: RuntimeSchemaV1<TCommand>;
  },
): void {
  const first = entry.defineToolingSupport();
  if (isThenable(first)) {
    throw new TypeError("defineToolingSupport returned thenable");
  }
  const second = entry.defineToolingSupport();
  if (isThenable(second)) {
    throw new TypeError("defineToolingSupport returned thenable");
  }
  if (
    first === null ||
    typeof first !== "object" ||
    Array.isArray(first) ||
    Object.getPrototypeOf(first) !== Object.prototype ||
    second === null ||
    typeof second !== "object" ||
    Array.isArray(second) ||
    Object.getPrototypeOf(second) !== Object.prototype
  ) {
    throw new TypeError("invalid tooling support");
  }
  const firstSupport = first as {
    readonly fixtures?: unknown;
    readonly notes?: unknown;
  };
  const secondSupport = second as {
    readonly fixtures?: unknown;
    readonly notes?: unknown;
  };
  if (!Array.isArray(firstSupport.fixtures) || !Array.isArray(firstSupport.notes)) {
    throw new TypeError("invalid tooling support");
  }
  if (!Array.isArray(secondSupport.fixtures) || !Array.isArray(secondSupport.notes)) {
    throw new TypeError("invalid tooling support");
  }
  const firstBytes = canonicalJsonBytes({
    fixtures: firstSupport.fixtures,
    notes: firstSupport.notes,
  });
  const secondBytes = canonicalJsonBytes({
    fixtures: secondSupport.fixtures,
    notes: secondSupport.notes,
  });
  if (
    firstBytes.length !== secondBytes.length ||
    firstBytes.some((byte, index) => byte !== secondBytes[index])
  ) {
    throw new TypeError("nondeterministic tooling support");
  }
  const fixtureIds = new Set<unknown>();
  for (const fixture of firstSupport.fixtures) {
    if (fixture === null || typeof fixture !== "object" || Array.isArray(fixture)) {
      throw new TypeError("invalid tooling fixture");
    }
    const candidate = fixture as {
      readonly fixtureId?: unknown;
      readonly seed?: unknown;
      readonly commands?: unknown;
    };
    const fixtureId = schemas.fixtureIdSchema.parse(candidate.fixtureId);
    if (fixtureIds.has(fixtureId)) throw new TypeError("duplicate fixture ID");
    fixtureIds.add(fixtureId);
    parseNonZeroUint32(candidate.seed);
    if (!Array.isArray(candidate.commands)) {
      throw new TypeError("fixture commands must be an array");
    }
    for (const command of candidate.commands) schemas.commandSchema.parse(command);
  }
}
