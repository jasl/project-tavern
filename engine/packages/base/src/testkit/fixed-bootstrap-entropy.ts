// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1 } from "../contracts/gameplay-module.js";
import type { NonZeroUint32, RunId } from "../contracts/values.js";
import { parseNonZeroUint32, parseRunId } from "../contracts/values.js";

export interface FixedBootstrapEntropyInputV1 {
  readonly uuids: readonly string[];
  readonly seeds: readonly number[];
}

export function createFixedBootstrapEntropyV1(
  input: FixedBootstrapEntropyInputV1,
): BootstrapEntropyV1 {
  const uuids: RunId[] = input.uuids.map(parseRunId);
  const seeds: NonZeroUint32[] = input.seeds.map(parseNonZeroUint32);
  let uuidIndex = 0;
  let seedIndex = 0;
  return Object.freeze({
    nextUuidV4(): string {
      const value = uuids[uuidIndex];
      if (value === undefined) throw new RangeError("UUID entropy exhausted");
      uuidIndex += 1;
      return value;
    },
    nextNonZeroUint32(): NonZeroUint32 {
      const value = seeds[seedIndex];
      if (value === undefined) throw new RangeError("seed entropy exhausted");
      seedIndex += 1;
      return value;
    },
  });
}
