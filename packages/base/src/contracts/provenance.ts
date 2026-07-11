// SPDX-License-Identifier: MIT
import type { PatchSetIdentityV1 } from "./hotfix.js";
import type { Digest, PositiveSafeInteger } from "./values.js";

export interface BuildProvenanceV1 {
  readonly story: {
    readonly id: string;
    readonly revision: PositiveSafeInteger;
    readonly digest: Digest;
  };
  readonly engine: { readonly version: string; readonly digest: Digest };
  readonly resolved: {
    readonly stateContractRevision: PositiveSafeInteger;
    readonly stateContractDigest: Digest;
    readonly simulationDigest: Digest;
    readonly presentationDigest: Digest;
    readonly patchSet: PatchSetIdentityV1;
  };
}
