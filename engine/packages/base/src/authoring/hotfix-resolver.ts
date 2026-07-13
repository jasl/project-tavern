// SPDX-License-Identifier: MIT
import { digestCanonical } from "../contracts/digest.js";
import type {
  AppliedHotfixV1,
  HotfixEntryV1,
  PatchReplacementPortV1,
  PatchReplacementTraceV1,
  PatchSetIdentityV1,
  PatchSlotDescriptorV1,
  PatchSurfaceKindV1,
  PatchSymbolKindV1,
} from "../contracts/hotfix.js";
import type { StorySourceIdentityV1 } from "../contracts/game-package.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

type Slot = PatchSlotDescriptorV1<PatchSymbolKindV1, unknown>;
interface NormalizedSurface {
  readonly slots: Readonly<Record<string, Slot>>;
}

function normalizeSurface(value: unknown): NormalizedSurface {
  if (
    value !== null &&
    typeof value === "object" &&
    "slots" in value &&
    (value as { readonly slots?: unknown }).slots !== null &&
    typeof (value as { readonly slots?: unknown }).slots === "object"
  ) {
    return { slots: (value as { readonly slots: Readonly<Record<string, Slot>> }).slots };
  }
  return { slots: {} };
}

function valuesAndProviders(surface: NormalizedSurface) {
  const values: Record<string, unknown> = {};
  const providers = new Map<
    string,
    { digest: ReturnType<typeof digestCanonical>; hotfixId: string | null; key: string; slot: Slot }
  >();
  for (const [key, slot] of Object.entries(surface.slots)) {
    values[key] = slot.defaultValue;
    providers.set(slot.symbolId, {
      digest: slot.defaultProviderSourceDigest,
      hotfixId: null,
      key,
      slot,
    });
  }
  return { values, providers };
}

export function resolveHotfixesV1(
  simulationSurfaceValue: unknown,
  presentationSurfaceValue: unknown,
  hotfixes: readonly HotfixEntryV1[],
  story: StorySourceIdentityV1,
): {
  readonly simulationValues: Readonly<Record<string, unknown>>;
  readonly presentationValues: Readonly<Record<string, unknown>>;
  readonly patchSet: PatchSetIdentityV1;
} {
  const simulation = valuesAndProviders(normalizeSurface(simulationSurfaceValue));
  const presentation = valuesAndProviders(normalizeSurface(presentationSurfaceValue));
  const seen = new Set<string>();
  const applied: AppliedHotfixV1[] = [];

  for (let hotfixIndex = 0; hotfixIndex < hotfixes.length; hotfixIndex += 1) {
    const hotfix = hotfixes[hotfixIndex];
    if (!hotfix) continue;
    const id = hotfix.manifest.identity.id;
    if (seen.has(id)) throw new TypeError(`hotfix duplicate ID: ${id}`);
    if (
      hotfix.manifest.targetStoryId !== story.id ||
      hotfix.manifest.targetStoryRevision !== story.revision
    ) {
      throw new TypeError(`hotfix target mismatch: ${id}`);
    }
    for (const requirement of hotfix.manifest.requires) {
      if (!seen.has(requirement)) {
        throw new TypeError(`hotfix requires missing or out of order: ${requirement}`);
      }
    }
    for (const conflict of hotfix.manifest.conflicts) {
      if (seen.has(conflict)) throw new TypeError(`hotfix conflict: ${conflict}`);
    }
    const traces: PatchReplacementTraceV1[] = [];
    const replacedTargets = new Set<string>();
    const replacePort = (surface: PatchSurfaceKindV1): PatchReplacementPortV1 =>
      Object.freeze({
        replace(symbolId: string, value: unknown): void {
          const state =
            surface === "simulation"
              ? simulation.providers.get(symbolId)
              : presentation.providers.get(symbolId);
          if (!state) throw new TypeError(`hotfix unknown symbol: ${symbolId}`);
          const target = hotfix.manifest.targets.find(
            (candidate) => candidate.surface === surface && candidate.symbolId === symbolId,
          );
          if (!target) throw new TypeError(`hotfix undeclared target: ${symbolId}`);
          if (target.expectedProviderDigest !== state.digest) {
            throw new TypeError(`hotfix provider mismatch: ${symbolId}`);
          }
          if (state.hotfixId !== null && !hotfix.manifest.supersedes.includes(state.hotfixId)) {
            throw new TypeError(`hotfix collision: ${symbolId}`);
          }
          const replacementOrdinal = traces.length + 1;
          const providerProjection = {
            hotfixDigest: hotfix.sourceDigest,
            surface,
            symbolId,
            replacementOrdinal,
            ...(typeof value === "function" ? {} : { value }),
          };
          const nextDigest = digestCanonical("sillymaker:patch-provider:v1", providerProjection);
          const trace = Object.freeze({
            surface,
            symbolId,
            kind: state.slot.kind,
            previousProviderDigest: state.digest,
            nextProviderDigest: nextDigest,
          });
          traces.push(trace);
          replacedTargets.add(`${surface}:${symbolId}`);
          state.digest = nextDigest;
          state.hotfixId = id;
          if (surface === "simulation") simulation.values[state.key] = value;
          else presentation.values[state.key] = value;
        },
      });
    const result = hotfix.install({
      simulation: replacePort("simulation"),
      presentation: replacePort("presentation"),
    });
    if (
      result !== undefined &&
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { readonly then?: unknown }).then === "function"
    ) {
      throw new TypeError(`hotfix install returned thenable: ${id}`);
    }
    for (const target of hotfix.manifest.targets) {
      if (!replacedTargets.has(`${target.surface}:${target.symbolId}`)) {
        throw new TypeError(`hotfix target was not replaced: ${target.symbolId}`);
      }
    }
    seen.add(id);
    applied.push(
      Object.freeze({
        identity: Object.freeze({
          ...hotfix.manifest.identity,
          digest: digestCanonical("sillymaker:hotfix:v1", {
            manifest: hotfix.manifest,
            sourceDigest: hotfix.sourceDigest,
          }),
        }),
        ordinal: parsePositiveSafeInteger(hotfixIndex + 1),
        replacements: Object.freeze([...traces]),
      }),
    );
  }

  const facetProjection = (surface: PatchSurfaceKindV1) =>
    applied
      .map((hotfix) => ({
        identity: hotfix.identity,
        ordinal: hotfix.ordinal,
        replacements: hotfix.replacements.filter((replacement) => replacement.surface === surface),
      }))
      .filter((hotfix) => hotfix.replacements.length > 0);
  const frozenApplied = Object.freeze([...applied]);
  const patchSet = Object.freeze({
    digest: digestCanonical("sillymaker:patch-set:v1", frozenApplied),
    simulationDigest: digestCanonical("sillymaker:patch-set:v1", facetProjection("simulation")),
    presentationDigest: digestCanonical("sillymaker:patch-set:v1", facetProjection("presentation")),
    appliedHotfixes: frozenApplied,
  });
  return deepFreezeAuthoringValueV1({
    simulationValues: simulation.values,
    presentationValues: presentation.values,
    patchSet,
  });
}
