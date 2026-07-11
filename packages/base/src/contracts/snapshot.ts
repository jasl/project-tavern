// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "./values.js";
import { parseNonNegativeSafeInteger } from "./values.js";

export interface GameSnapshotEnvelopeV1<TState, TRngState> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
}

export function createGameSnapshotEnvelopeSchemaV1<TState, TRngState>(
  stateSchema: RuntimeSchemaV1<TState>,
  rngStateSchema: RuntimeSchemaV1<TRngState>,
): RuntimeSchemaV1<GameSnapshotEnvelopeV1<TState, TRngState>> {
  return Object.freeze({
    parse(value: unknown): GameSnapshotEnvelopeV1<TState, TRngState> {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        throw new TypeError("invalid GameSnapshotEnvelopeV1");
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Object.keys(descriptors).sort();
      if (keys.join("\0") !== "commandSequence\0rng\0state") {
        throw new TypeError("invalid GameSnapshotEnvelopeV1 fields");
      }
      for (const descriptor of Object.values(descriptors)) {
        if (descriptor.get !== undefined || descriptor.set !== undefined) {
          throw new TypeError("GameSnapshotEnvelopeV1 accessors are forbidden");
        }
      }
      return Object.freeze({
        state: stateSchema.parse(descriptors.state?.value),
        rng: rngStateSchema.parse(descriptors.rng?.value),
        commandSequence: parseNonNegativeSafeInteger(
          descriptors.commandSequence?.value,
        ),
      });
    },
  });
}
