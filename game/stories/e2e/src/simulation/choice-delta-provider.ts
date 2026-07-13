// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { PositiveSafeInteger } from "@sillymaker/base";

const leftChoiceDeltaV1 = parsePositiveSafeInteger(1);
const rightChoiceDeltaV1 = parsePositiveSafeInteger(2);

export function defaultChoiceDeltaProviderV1(choice: "left" | "right"): PositiveSafeInteger {
  if (choice === "left") return leftChoiceDeltaV1;
  if (choice === "right") return rightChoiceDeltaV1;
  throw new TypeError("invalid E2E choice");
}
