// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../contracts/canonical-json.js";
import { digestCanonical } from "../contracts/digest.js";
import type { GamePackageV1 } from "../contracts/game-package.js";
import type {
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionResultV1,
  HotfixEntryV1,
} from "../contracts/hotfix.js";
import type { BuildProvenanceV1 } from "../contracts/provenance.js";
import type { ResolvedAssetManifestV1 } from "../contracts/assets.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";
import type { BuildIdentityInputV1 } from "./build-identity.js";
import { resolveBuildIdentityV1 } from "./build-identity.js";
import { resolveAssetManifestV1 } from "./asset-resolver.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";
import { resolveHotfixesV1 } from "./hotfix-resolver.js";

export interface ResolvedStoryV1 {
  readonly provenance: BuildProvenanceV1;
  readonly gameSimulation: unknown;
  readonly simulationProgram: unknown;
  readonly presentationProgram: unknown;
  readonly assets: ResolvedAssetManifestV1;
  readonly frozen: true;
}

interface SourceDefinitionLike {
  readonly simulation: {
    readonly stateContractRevision: number;
    readonly data: unknown;
    readonly rules: unknown;
    readonly narrativeProgram: unknown;
    readonly patchSurface: unknown;
    materializeProgram(values: unknown): unknown;
    createGameSimulation(program: unknown): unknown;
  };
  readonly presentation: {
    readonly uiSceneGraph: unknown;
    readonly textCatalogs: unknown;
    readonly assetSlots: unknown;
    readonly assetPacks: unknown;
    readonly patchSurface: unknown;
    materializePresentation(values: unknown): unknown;
  };
}

function isThenable(value: unknown): boolean {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { readonly then?: unknown }).then === "function"
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function projection(definition: SourceDefinitionLike): unknown {
  return {
    simulation: {
      stateContractRevision: definition.simulation.stateContractRevision,
      data: definition.simulation.data,
      rules: definition.simulation.rules,
      narrativeProgram: definition.simulation.narrativeProgram,
    },
    presentation: {
      uiSceneGraph: definition.presentation.uiSceneGraph,
      textCatalogs: definition.presentation.textCatalogs,
      assetSlots: definition.presentation.assetSlots,
      assetPacks: definition.presentation.assetPacks,
    },
  };
}

function failure(
  code: GamePackageResolutionFailureCodeV1,
  hotfixes: readonly HotfixEntryV1[],
  message: string,
): GamePackageResolutionResultV1<ResolvedStoryV1> {
  return Object.freeze({
    kind: "failed",
    failure: Object.freeze({
      code,
      rejectedHotfixIds: Object.freeze([
        ...new Set(hotfixes.map((hotfix) => hotfix.manifest.identity.id)),
      ]),
      details: Object.freeze({ message }),
    }),
  });
}

function classify(error: unknown): GamePackageResolutionFailureCodeV1 {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("hotfix duplicate")) return "hotfix.duplicate_id";
  if (message.includes("target mismatch")) return "hotfix.target_mismatch";
  if (message.includes("requires")) return "hotfix.requires_missing";
  if (message.includes("conflict")) return "hotfix.conflict";
  if (message.includes("collision")) return "hotfix.collision";
  if (message.includes("unknown symbol")) return "hotfix.unknown_symbol";
  if (message.includes("provider mismatch")) return "hotfix.provider_mismatch";
  if (message.includes("asset path")) return "asset.path_invalid";
  if (message.includes("asset slot unknown")) return "asset.slot_unknown";
  if (message.includes("asset slot sealed")) return "asset.slot_sealed";
  if (message.includes("build identity")) return "build_identity.invalid";
  return "story.contract_invalid";
}

export function resolveGamePackageV1(
  entry: GamePackageV1<unknown, unknown>,
  hotfixes: readonly HotfixEntryV1[],
  buildIdentityInput: BuildIdentityInputV1,
): GamePackageResolutionResultV1<ResolvedStoryV1> {
  let first: SourceDefinitionLike;
  let second: SourceDefinitionLike;
  try {
    first = entry.define() as SourceDefinitionLike;
    if (isThenable(first))
      return failure("story.define_thenable", [], "Story define returned thenable");
    second = entry.define() as SourceDefinitionLike;
    if (isThenable(second))
      return failure("story.define_thenable", [], "Story define returned thenable");
  } catch (error) {
    return failure(
      "story.define_threw",
      [],
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    if (
      !equalBytes(canonicalJsonBytes(projection(first)), canonicalJsonBytes(projection(second)))
    ) {
      return failure("story.nondeterministic", [], "Story projections differ");
    }
    const build = resolveBuildIdentityV1(buildIdentityInput);
    const patches = resolveHotfixesV1(
      first.simulation.patchSurface,
      first.presentation.patchSurface,
      hotfixes,
      entry.identity,
    );
    const simulationProgram = first.simulation.materializeProgram(patches.simulationValues);
    if (isThenable(simulationProgram)) {
      return failure(
        "story.materialization_thenable",
        hotfixes,
        "Simulation materializer returned thenable",
      );
    }
    const presentationProgram = first.presentation.materializePresentation(
      patches.presentationValues,
    );
    if (isThenable(presentationProgram)) {
      return failure(
        "story.materialization_thenable",
        hotfixes,
        "Presentation materializer returned thenable",
      );
    }
    const gameSimulation = first.simulation.createGameSimulation(simulationProgram);
    if (isThenable(gameSimulation)) {
      return failure(
        "story.simulation_invalid",
        hotfixes,
        "GameSimulation factory returned thenable",
      );
    }
    const slots = Array.isArray(first.presentation.assetSlots) ? first.presentation.assetSlots : [];
    const packs = Array.isArray(first.presentation.assetPacks) ? first.presentation.assetPacks : [];
    const assets = resolveAssetManifestV1(slots, packs);
    const storyDigest = digestCanonical("sillymaker:story:v1", {
      identity: entry.identity,
      simulationSourceDigest: build.storySimulation.digest,
      presentationSourceDigest: build.storyPresentation.digest,
    });
    const stateContractDigest = digestCanonical("sillymaker:state-contract:v1", {
      story: entry.identity,
      revision: first.simulation.stateContractRevision,
    });
    const simulationDigest = digestCanonical("sillymaker:simulation:v1", {
      storyDigest,
      stateContractDigest,
      sourceDigest: build.storySimulation.digest,
      patchSetDigest: patches.patchSet.simulationDigest,
    });
    const presentationDigest = digestCanonical("sillymaker:presentation:v1", {
      storyDigest,
      sourceDigest: build.storyPresentation.digest,
      patchSetDigest: patches.patchSet.presentationDigest,
      assetPacks: assets.packs,
    });
    const provenance: BuildProvenanceV1 = deepFreezeAuthoringValueV1({
      story: {
        id: entry.identity.id,
        revision: entry.identity.revision,
        digest: storyDigest,
      },
      engine: { version: "0.0.0", digest: build.engine.digest },
      resolved: {
        stateContractRevision: parsePositiveSafeInteger(first.simulation.stateContractRevision),
        stateContractDigest,
        simulationDigest,
        presentationDigest,
        patchSet: patches.patchSet,
      },
    });
    return Object.freeze({
      kind: "resolved",
      resolved: deepFreezeAuthoringValueV1({
        provenance,
        gameSimulation,
        simulationProgram,
        presentationProgram,
        assets,
        frozen: true as const,
      }),
    });
  } catch (error) {
    return failure(
      classify(error),
      hotfixes,
      error instanceof Error ? error.message : String(error),
    );
  }
}
