// SPDX-License-Identifier: MIT
import { digestCanonical } from "../contracts/digest.js";
import type {
  AppliedHotfixV1,
  GamePackageResolutionFailureCodeV1,
  HotfixEntryV1,
  HotfixManifestV1,
  PatchReplacementPortV1,
  PatchReplacementValuesV1,
  PatchReplacementTraceV1,
  PatchSetIdentityV1,
  PatchSlotDescriptorV1,
  PatchSurfaceKindV1,
  PatchSymbolKindV1,
} from "../contracts/hotfix.js";
import type { StorySourceIdentityV1 } from "../contracts/game-package.js";
import { parseDigest, parseModuleId, parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

type Slot = PatchSlotDescriptorV1<PatchSymbolKindV1, unknown>;
interface NormalizedSurface {
  readonly slots: Readonly<Record<string, Slot>>;
}

interface ValidatedHotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface> {
  readonly source: HotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface>;
  readonly manifest: HotfixManifestV1;
  readonly sourceDigest: ReturnType<typeof parseDigest>;
}

export interface AssetHotfixReplacementV1 {
  readonly assetId: string;
  readonly provider: unknown;
  readonly hotfixIdentity: AppliedHotfixV1["identity"];
}

type HotfixResolutionFailureCodeV1 = Extract<
  GamePackageResolutionFailureCodeV1,
  `hotfix.${string}`
>;

class HotfixResolutionErrorV1 extends TypeError {
  readonly code: HotfixResolutionFailureCodeV1;

  constructor(code: HotfixResolutionFailureCodeV1, message: string) {
    super(message);
    this.code = code;
    hotfixResolutionErrorsV1.add(this);
  }
}

const hotfixResolutionErrorsV1 = new WeakSet<object>();

function hotfixFailure(code: HotfixResolutionFailureCodeV1, message: string): never {
  throw new HotfixResolutionErrorV1(code, message);
}

function isHotfixResolutionErrorV1(value: unknown): value is HotfixResolutionErrorV1 {
  return value !== null && typeof value === "object" && hotfixResolutionErrorsV1.has(value);
}

function isThenableWithoutInvokingV1(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) return true;
    if (descriptor !== undefined) return typeof descriptor.value === "function";
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function requirePlainRecordV1(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).some((key) => typeof key !== "string")
  ) {
    hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

function ownDataValueV1(record: Record<string, unknown>, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor)
  ) {
    hotfixFailure("hotfix.output_invalid", `invalid ${label}.${key}`);
  }
  return descriptor.value;
}

function requireExactKeysV1(
  record: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(Object.getOwnPropertyDescriptors(record)).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    hotfixFailure("hotfix.output_invalid", `invalid ${label} fields`);
  }
}

function requireDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
  const ownKeys = Reflect.ownKeys(value);
  const expectedKeys = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  if (
    ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key)) ||
    ownKeys.length !== expectedKeys.size
  ) {
    hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function parseStableIdV1(value: unknown, label: string): string {
  try {
    return parseModuleId(value);
  } catch {
    return hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
}

function parsePositiveV1(value: unknown, label: string) {
  try {
    return parsePositiveSafeInteger(value);
  } catch {
    return hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
}

function parseDigestV1(value: unknown, label: string) {
  try {
    return parseDigest(value);
  } catch {
    return hotfixFailure("hotfix.output_invalid", `invalid ${label}`);
  }
}

function normalizeSurface(value: unknown, expectedSurface: PatchSurfaceKindV1): NormalizedSurface {
  const surface = requirePlainRecordV1(value, `${expectedSurface} PatchSurface`);
  requireExactKeysV1(surface, ["surface", "slots"], `${expectedSurface} PatchSurface`);
  if (ownDataValueV1(surface, "surface", `${expectedSurface} PatchSurface`) !== expectedSurface) {
    hotfixFailure("hotfix.output_invalid", `invalid ${expectedSurface} PatchSurface kind`);
  }
  const slotsRecord = requirePlainRecordV1(
    ownDataValueV1(surface, "slots", `${expectedSurface} PatchSurface`),
    `${expectedSurface} PatchSurface slots`,
  );
  const slots: Record<string, Slot> = {};
  const symbolIds = new Set<string>();
  for (const key of Object.keys(Object.getOwnPropertyDescriptors(slotsRecord))) {
    const slotRecord = requirePlainRecordV1(
      ownDataValueV1(slotsRecord, key, `${expectedSurface} PatchSurface slots`),
      `${expectedSurface} Patch slot`,
    );
    requireExactKeysV1(
      slotRecord,
      [
        "symbolId",
        "kind",
        "replaceable",
        "contractRevision",
        "defaultProviderSourceDigest",
        "defaultValue",
      ],
      `${expectedSurface} Patch slot`,
    );
    const symbolId = parseStableIdV1(
      ownDataValueV1(slotRecord, "symbolId", `${expectedSurface} Patch slot`),
      `${expectedSurface} Patch symbol ID`,
    );
    const kind = ownDataValueV1(slotRecord, "kind", `${expectedSurface} Patch slot`);
    if (
      (expectedSurface === "simulation" && kind !== "rule" && kind !== "value") ||
      (expectedSurface === "presentation" &&
        kind !== "value" &&
        kind !== "text" &&
        kind !== "asset")
    ) {
      hotfixFailure("hotfix.output_invalid", `invalid ${expectedSurface} Patch symbol kind`);
    }
    if (
      ownDataValueV1(slotRecord, "replaceable", `${expectedSurface} Patch slot`) !== true ||
      symbolIds.has(symbolId)
    ) {
      hotfixFailure("hotfix.output_invalid", `invalid ${expectedSurface} Patch slot`);
    }
    symbolIds.add(symbolId);
    slots[key] = {
      symbolId,
      kind: kind as PatchSymbolKindV1,
      replaceable: true,
      contractRevision: parsePositiveV1(
        ownDataValueV1(slotRecord, "contractRevision", `${expectedSurface} Patch slot`),
        `${expectedSurface} Patch contract revision`,
      ),
      defaultProviderSourceDigest: parseDigestV1(
        ownDataValueV1(slotRecord, "defaultProviderSourceDigest", `${expectedSurface} Patch slot`),
        `${expectedSurface} Patch provider digest`,
      ),
      defaultValue: ownDataValueV1(slotRecord, "defaultValue", `${expectedSurface} Patch slot`),
    };
  }
  return { slots };
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

function parseUniqueIdListV1(value: unknown, label: string): readonly string[] {
  const ids = requireDataArrayV1(value, label).map((entry) => parseStableIdV1(entry, label));
  if (new Set(ids).size !== ids.length) {
    hotfixFailure("hotfix.output_invalid", `duplicate ${label}`);
  }
  return Object.freeze(ids);
}

function validateHotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface>(
  value: HotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface>,
): ValidatedHotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface> {
  const entry = requirePlainRecordV1(value, "Hotfix entry");
  requireExactKeysV1(entry, ["manifest", "sourceDigest", "install"], "Hotfix entry");
  const install = ownDataValueV1(entry, "install", "Hotfix entry");
  if (typeof install !== "function") {
    hotfixFailure("hotfix.output_invalid", "invalid Hotfix install");
  }
  const manifestValue = requirePlainRecordV1(
    ownDataValueV1(entry, "manifest", "Hotfix entry"),
    "Hotfix manifest",
  );
  requireExactKeysV1(
    manifestValue,
    [
      "identity",
      "targetStoryId",
      "targetStoryRevision",
      "targets",
      "requires",
      "conflicts",
      "supersedes",
    ],
    "Hotfix manifest",
  );
  const identityValue = requirePlainRecordV1(
    ownDataValueV1(manifestValue, "identity", "Hotfix manifest"),
    "Hotfix identity",
  );
  requireExactKeysV1(identityValue, ["id", "revision"], "Hotfix identity");
  const identity = Object.freeze({
    id: parseStableIdV1(ownDataValueV1(identityValue, "id", "Hotfix identity"), "Hotfix ID"),
    revision: parsePositiveV1(
      ownDataValueV1(identityValue, "revision", "Hotfix identity"),
      "Hotfix revision",
    ),
  });
  const targets = requireDataArrayV1(
    ownDataValueV1(manifestValue, "targets", "Hotfix manifest"),
    "Hotfix targets",
  ).map((targetValue) => {
    const target = requirePlainRecordV1(targetValue, "Hotfix target");
    requireExactKeysV1(target, ["surface", "symbolId", "expectedProviderDigest"], "Hotfix target");
    const surface = ownDataValueV1(target, "surface", "Hotfix target");
    if (surface !== "simulation" && surface !== "presentation") {
      hotfixFailure("hotfix.output_invalid", "invalid Hotfix target surface");
    }
    return Object.freeze({
      surface,
      symbolId: parseStableIdV1(
        ownDataValueV1(target, "symbolId", "Hotfix target"),
        "Hotfix target symbol ID",
      ),
      expectedProviderDigest: parseDigestV1(
        ownDataValueV1(target, "expectedProviderDigest", "Hotfix target"),
        "Hotfix target provider digest",
      ),
    });
  });
  const targetKeys = targets.map((target) => `${target.surface}:${target.symbolId}`);
  if (new Set(targetKeys).size !== targetKeys.length) {
    hotfixFailure("hotfix.output_invalid", `duplicate Hotfix target: ${identity.id}`);
  }
  const manifest = deepFreezeAuthoringValueV1({
    identity,
    targetStoryId: parseStableIdV1(
      ownDataValueV1(manifestValue, "targetStoryId", "Hotfix manifest"),
      "Hotfix target Story ID",
    ),
    targetStoryRevision: parsePositiveV1(
      ownDataValueV1(manifestValue, "targetStoryRevision", "Hotfix manifest"),
      "Hotfix target Story revision",
    ),
    targets,
    requires: parseUniqueIdListV1(
      ownDataValueV1(manifestValue, "requires", "Hotfix manifest"),
      "Hotfix requires",
    ),
    conflicts: parseUniqueIdListV1(
      ownDataValueV1(manifestValue, "conflicts", "Hotfix manifest"),
      "Hotfix conflicts",
    ),
    supersedes: parseUniqueIdListV1(
      ownDataValueV1(manifestValue, "supersedes", "Hotfix manifest"),
      "Hotfix supersedes",
    ),
  }) satisfies HotfixManifestV1;
  return {
    source: value,
    manifest,
    sourceDigest: parseDigestV1(
      ownDataValueV1(entry, "sourceDigest", "Hotfix entry"),
      "Hotfix source digest",
    ),
  };
}

export function resolveHotfixesV1<TSimulationPatchSurface, TPresentationPatchSurface>(
  simulationSurfaceValue: TSimulationPatchSurface,
  presentationSurfaceValue: TPresentationPatchSurface,
  hotfixes: readonly HotfixEntryV1<TSimulationPatchSurface, TPresentationPatchSurface>[],
  story: StorySourceIdentityV1,
): {
  readonly simulationValues: Readonly<Record<string, unknown>>;
  readonly presentationValues: Readonly<Record<string, unknown>>;
  readonly assetPatchSymbols: readonly string[];
  readonly assetReplacements: readonly AssetHotfixReplacementV1[];
  readonly patchSet: PatchSetIdentityV1;
} {
  const simulation = valuesAndProviders(normalizeSurface(simulationSurfaceValue, "simulation"));
  const presentation = valuesAndProviders(
    normalizeSurface(presentationSurfaceValue, "presentation"),
  );
  const validatedHotfixes = hotfixes.map(validateHotfixEntryV1);
  const allIds = validatedHotfixes.map((hotfix) => hotfix.manifest.identity.id);
  if (new Set(allIds).size !== allIds.length) {
    hotfixFailure("hotfix.duplicate_id", "hotfix duplicate ID");
  }
  const hotfixIds = new Set(allIds);
  const seen = new Set<string>();
  const applied: AppliedHotfixV1[] = [];

  for (let hotfixIndex = 0; hotfixIndex < validatedHotfixes.length; hotfixIndex += 1) {
    const hotfix = validatedHotfixes[hotfixIndex];
    if (!hotfix) continue;
    const id = hotfix.manifest.identity.id;
    if (
      hotfix.manifest.targetStoryId !== story.id ||
      hotfix.manifest.targetStoryRevision !== story.revision
    ) {
      hotfixFailure("hotfix.target_mismatch", `hotfix target mismatch: ${id}`);
    }
    for (const requirement of hotfix.manifest.requires) {
      if (!seen.has(requirement)) {
        const appearsLater = hotfixIds.has(requirement);
        hotfixFailure(
          appearsLater ? "hotfix.requires_order" : "hotfix.requires_missing",
          appearsLater
            ? `hotfix requires order violation: ${requirement}`
            : `hotfix requires missing: ${requirement}`,
        );
      }
    }
    for (const conflict of hotfix.manifest.conflicts) {
      if (hotfixIds.has(conflict)) {
        hotfixFailure("hotfix.conflict", `hotfix conflict: ${conflict}`);
      }
    }
    const traces: PatchReplacementTraceV1[] = [];
    const replacedTargets = new Set<string>();
    let replacementPortsActive = true;
    const replacePort = <TPatchSurface>(
      surface: PatchSurfaceKindV1,
    ): PatchReplacementPortV1<PatchReplacementValuesV1<TPatchSurface>> =>
      Object.freeze({
        replace(symbolId: string, value: unknown): void {
          if (!replacementPortsActive) {
            throw new TypeError("Hotfix replacement port is revoked");
          }
          const state =
            surface === "simulation"
              ? simulation.providers.get(symbolId)
              : presentation.providers.get(symbolId);
          if (!state) hotfixFailure("hotfix.unknown_symbol", `hotfix unknown symbol: ${symbolId}`);
          const target = hotfix.manifest.targets.find(
            (candidate) => candidate.surface === surface && candidate.symbolId === symbolId,
          );
          if (!target) {
            hotfixFailure("hotfix.target_mismatch", `hotfix undeclared target: ${symbolId}`);
          }
          const targetKey = `${surface}:${symbolId}`;
          if (replacedTargets.has(targetKey)) {
            hotfixFailure("hotfix.output_invalid", `hotfix target replaced twice: ${symbolId}`);
          }
          if (target.expectedProviderDigest !== state.digest) {
            hotfixFailure("hotfix.provider_mismatch", `hotfix provider mismatch: ${symbolId}`);
          }
          if (state.hotfixId !== null && !hotfix.manifest.supersedes.includes(state.hotfixId)) {
            hotfixFailure("hotfix.collision", `hotfix collision: ${symbolId}`);
          }
          if (
            (state.slot.kind === "rule" && typeof value !== "function") ||
            (state.slot.kind !== "rule" && typeof value === "function") ||
            (state.slot.kind === "text" && typeof value !== "string")
          ) {
            hotfixFailure(
              "hotfix.output_invalid",
              `hotfix replacement has invalid kind: ${symbolId}`,
            );
          }
          const replacementOrdinal = traces.length + 1;
          const providerProjection = {
            hotfixDigest: hotfix.sourceDigest,
            surface,
            symbolId,
            replacementOrdinal,
            ...(typeof value === "function" ? {} : { value }),
          };
          let nextDigest: ReturnType<typeof digestCanonical>;
          try {
            nextDigest = digestCanonical("sillymaker:patch-provider:v1", providerProjection);
          } catch {
            return hotfixFailure(
              "hotfix.output_invalid",
              `hotfix replacement is not canonical: ${symbolId}`,
            );
          }
          const trace = Object.freeze({
            surface,
            symbolId,
            kind: state.slot.kind,
            previousProviderDigest: state.digest,
            nextProviderDigest: nextDigest,
          });
          traces.push(trace);
          replacedTargets.add(targetKey);
          state.digest = nextDigest;
          state.hotfixId = id;
          if (surface === "simulation") simulation.values[state.key] = value;
          else presentation.values[state.key] = value;
        },
      }) as PatchReplacementPortV1<PatchReplacementValuesV1<TPatchSurface>>;
    try {
      let result: unknown;
      try {
        result = Reflect.apply(hotfix.source.install, hotfix.source, [
          {
            simulation: replacePort<TSimulationPatchSurface>("simulation"),
            presentation: replacePort<TPresentationPatchSurface>("presentation"),
          },
        ]);
      } catch (error) {
        if (isHotfixResolutionErrorV1(error)) throw error;
        hotfixFailure("hotfix.install_threw", `hotfix install threw: ${id}`);
      }
      try {
        if (isThenableWithoutInvokingV1(result)) {
          hotfixFailure("hotfix.install_thenable", `hotfix install returned thenable: ${id}`);
        }
      } catch (error) {
        if (isHotfixResolutionErrorV1(error)) throw error;
        hotfixFailure("hotfix.install_threw", `hotfix install result was not inspectable: ${id}`);
      }
    } finally {
      replacementPortsActive = false;
    }
    for (const target of hotfix.manifest.targets) {
      if (!replacedTargets.has(`${target.surface}:${target.symbolId}`)) {
        hotfixFailure(
          "hotfix.output_invalid",
          `hotfix target was not replaced: ${target.symbolId}`,
        );
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
  const appliedById = new Map(applied.map((hotfix) => [hotfix.identity.id, hotfix]));
  const assetReplacements = [...presentation.providers.values()]
    .filter((state) => state.slot.kind === "asset" && state.hotfixId !== null)
    .map((state) => {
      const hotfix = state.hotfixId === null ? undefined : appliedById.get(state.hotfixId);
      if (!hotfix) {
        return hotfixFailure("hotfix.output_invalid", "asset Hotfix identity is missing");
      }
      return Object.freeze({
        assetId: state.slot.symbolId,
        provider: presentation.values[state.key],
        hotfixIdentity: hotfix.identity,
      });
    });
  const assetPatchSymbols = [...presentation.providers.values()]
    .filter((state) => state.slot.kind === "asset")
    .map((state) => state.slot.symbolId);
  return deepFreezeAuthoringValueV1({
    simulationValues: simulation.values,
    presentationValues: presentation.values,
    assetPatchSymbols,
    assetReplacements,
    patchSet,
  });
}
