// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
declare module "virtual:project-tavern/poc-build-identity" {
  type PocBuildIdentityInputV1 = Parameters<
    (typeof import("@sillymaker/base"))["resolveGamePackageV1"]
  >[2];

  export const pocBuildIdentityV1: PocBuildIdentityInputV1;
}
