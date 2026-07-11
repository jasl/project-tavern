// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "./strict-json.js";
import type { Digest, PositiveSafeInteger } from "./values.js";

export type PatchSurfaceKindV1 = "simulation" | "presentation";
export type PatchSymbolKindV1 = "rule" | "value" | "text" | "asset";

export interface PatchSlotDescriptorV1<TKind extends PatchSymbolKindV1, TValue> {
  readonly symbolId: string;
  readonly kind: TKind;
  readonly replaceable: true;
  readonly contractRevision: PositiveSafeInteger;
  readonly defaultProviderSourceDigest: Digest;
  readonly defaultValue: TValue;
}

export interface PatchReplacementTraceV1 {
  readonly surface: PatchSurfaceKindV1;
  readonly symbolId: string;
  readonly kind: PatchSymbolKindV1;
  readonly previousProviderDigest: Digest;
  readonly nextProviderDigest: Digest;
}

export interface HotfixManifestV1 {
  readonly identity: { readonly id: string; readonly revision: PositiveSafeInteger };
  readonly targetStoryId: string;
  readonly targetStoryRevision: PositiveSafeInteger;
  readonly targets: readonly {
    readonly surface: PatchSurfaceKindV1;
    readonly symbolId: string;
    readonly expectedProviderDigest: Digest;
  }[];
  readonly requires: readonly string[];
  readonly conflicts: readonly string[];
  readonly supersedes: readonly string[];
}

export interface HotfixEntryV1 {
  readonly manifest: HotfixManifestV1;
  readonly sourceDigest: Digest;
  install(context: {
    readonly simulation: PatchReplacementPortV1;
    readonly presentation: PatchReplacementPortV1;
  }): void;
}

export interface PatchReplacementPortV1 {
  replace(symbolId: string, value: unknown): void;
}

export interface AppliedHotfixV1 {
  readonly identity: {
    readonly id: string;
    readonly revision: PositiveSafeInteger;
    readonly digest: Digest;
  };
  readonly ordinal: PositiveSafeInteger;
  readonly replacements: readonly PatchReplacementTraceV1[];
}

export interface PatchSetIdentityV1 {
  readonly digest: Digest;
  readonly simulationDigest: Digest;
  readonly presentationDigest: Digest;
  readonly appliedHotfixes: readonly AppliedHotfixV1[];
}

export interface PatchSetAdoptionDeclarationV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly fromSimulationDigest: Digest;
  readonly toSimulationDigest: Digest;
  readonly simulationPatchSetDigest: Digest;
}

export type GameBootstrapResolutionResultV1<TResolvedStory, TResolvedIdentity> =
  | {
      readonly kind: "ready";
      readonly base: TResolvedStory;
      readonly resolved: TResolvedStory;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    }
  | {
      readonly kind: "safe_mode";
      readonly base: TResolvedStory;
      readonly resolved: TResolvedStory;
      readonly code: GamePackageResolutionFailureCodeV1;
      readonly rejectedHotfixIds: readonly string[];
      readonly details: StrictJsonObjectV1;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    }
  | {
      readonly kind: "fatal";
      readonly code: GamePackageResolutionFailureCodeV1;
      readonly rejectedHotfixIds: readonly string[];
      readonly details: StrictJsonObjectV1;
      readonly lastSuccessfulResolvedIdentity: TResolvedIdentity | null;
    };

export type GamePackageResolutionFailureCodeV1 =
  | "story.define_threw"
  | "story.define_thenable"
  | "story.nondeterministic"
  | "story.contract_invalid"
  | "story.materialization_threw"
  | "story.materialization_thenable"
  | "story.program_invalid"
  | "story.presentation_invalid"
  | "story.profile_invalid"
  | "hotfix.duplicate_id"
  | "hotfix.target_mismatch"
  | "hotfix.requires_missing"
  | "hotfix.requires_order"
  | "hotfix.conflict"
  | "hotfix.collision"
  | "hotfix.unknown_symbol"
  | "hotfix.provider_mismatch"
  | "hotfix.install_threw"
  | "hotfix.install_thenable"
  | "hotfix.output_invalid"
  | "asset.governance_invalid"
  | "asset.slot_unknown"
  | "asset.slot_sealed"
  | "asset.path_invalid"
  | "build_identity.invalid";

export interface GamePackageResolutionFailureV1 {
  readonly code: GamePackageResolutionFailureCodeV1;
  readonly rejectedHotfixIds: readonly string[];
  readonly details: StrictJsonObjectV1;
}

export type GamePackageResolutionResultV1<TResolvedStory> =
  | { readonly kind: "resolved"; readonly resolved: TResolvedStory }
  | { readonly kind: "failed"; readonly failure: GamePackageResolutionFailureV1 };
