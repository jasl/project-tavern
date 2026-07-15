// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { emptyContentMaturityFlagsV1, parseContentMaturityPolicyV1 } from "@sillymaker/base";
import type { ContentRequirementV1 } from "@sillymaker/base";

export const pocStandardContentRequirementV1 = Object.freeze({
  requiredFlags: emptyContentMaturityFlagsV1,
}) satisfies ContentRequirementV1;

export const pocContentMaturityPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [],
  presets: [],
  defaultAllowedFlags: emptyContentMaturityFlagsV1,
});
