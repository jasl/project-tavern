// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { PositiveSafeInteger } from "@sillymaker/base";

type ChoiceDeltaProviderV1 = (choice: "left" | "right") => PositiveSafeInteger;

interface ChoiceDeltaHotfixInstallContextV1 {
  readonly simulation: {
    replace(symbolId: "e2e.rule.choice-delta", value: ChoiceDeltaProviderV1): void;
  };
}

const leftChoiceDeltaV1 = parsePositiveSafeInteger(1);
const rightChoiceDeltaV1 = parsePositiveSafeInteger(3);

function hotfixedChoiceDeltaProviderV1(choice: "left" | "right"): PositiveSafeInteger {
  if (choice === "left") return leftChoiceDeltaV1;
  if (choice === "right") return rightChoiceDeltaV1;
  throw new TypeError("invalid E2E choice");
}

export function installChoiceDeltaHotfixV1(context: ChoiceDeltaHotfixInstallContextV1): void {
  context.simulation.replace("e2e.rule.choice-delta", hotfixedChoiceDeltaProviderV1);
}
