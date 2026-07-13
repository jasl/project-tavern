// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
declare module "virtual:project-tavern/e2e-build-identity" {
  type E2eBuildIdentityInputV1 = Parameters<
    (typeof import("@sillymaker/base"))["resolveGamePackageV1"]
  >[2];

  export const e2eBuildIdentityV1: E2eBuildIdentityInputV1;
}
