// SPDX-License-Identifier: MIT
import { CanonicalJsonError, canonicalJsonBytes } from "./canonical-json.js";
import type { StrictJsonObjectV1, StrictJsonValueV1 } from "./strict-json.js";
import type {
  Brand,
  DeepReadonly,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.js";
import { parseModuleId, parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "./values.js";

export type TextId = Brand<string, "TextId">;
export type AssetId = Brand<string, "AssetId">;
export type StageSceneId = Brand<string, "StageSceneId">;
export type StageSceneVariantId = Brand<string, "StageSceneVariantId">;
export type CharacterId = Brand<string, "CharacterId">;
export type CharacterRigId = Brand<string, "CharacterRigId">;
export type CharacterPoseId = Brand<string, "CharacterPoseId">;
export type CharacterExpressionId = Brand<string, "CharacterExpressionId">;
export type CharacterActivityId = Brand<string, "CharacterActivityId">;
export type AppearanceLayerId = Brand<string, "AppearanceLayerId">;
export type HitMapId = Brand<string, "HitMapId">;
export type HitAreaId = Brand<string, "HitAreaId">;
export type InteractionSurfaceId = Brand<string, "InteractionSurfaceId">;
export type InteractionTargetId = Brand<string, "InteractionTargetId">;
export type InteractionBehaviorId = Brand<string, "InteractionBehaviorId">;
export type PresentationProviderId = Brand<string, "PresentationProviderId">;
export type ContentMaturityFlagId = Brand<string, "ContentMaturityFlagId">;
export type ContentPreferencePresetId = Brand<string, "ContentPreferencePresetId">;
export type ContentMaturityFlagsV1 = Brand<number, "ContentMaturityFlagsV1">;
declare const contentMaturityFlagBitBrand: unique symbol;
export type ContentMaturityFlagBitV1 = ContentMaturityFlagsV1 & {
  readonly [contentMaturityFlagBitBrand]: "ContentMaturityFlagBitV1";
};
export type NormalizedCoordinateV1 = Brand<number, "NormalizedCoordinateV1">;
export type NormalizedExtentV1 = Brand<number, "NormalizedExtentV1">;
export type PositiveFiniteNumber = Brand<number, "PositiveFiniteNumber">;

export type InteractionEntryModeV1 = "surface_activation" | "always_active" | "explicit_control";
export type InteractionResolutionModeV1 = "direct" | "choose" | "open_surface";

export type PresentationCatalogValidationCodeV1 =
  | "presentation.catalog.duplicate_id"
  | "presentation.catalog.invalid_shape"
  | "presentation.catalog.missing_reference"
  | "presentation.catalog.surface_cycle"
  | "content_maturity.unknown_flags";

export interface PresentationCatalogValidationErrorV1 extends Error {
  readonly code: PresentationCatalogValidationCodeV1;
  readonly details: StrictJsonObjectV1;
}

class PresentationCatalogValidationError
  extends Error
  implements PresentationCatalogValidationErrorV1
{
  readonly name = "PresentationCatalogValidationError";
  readonly code: PresentationCatalogValidationCodeV1;
  readonly details: StrictJsonObjectV1;

  constructor(code: PresentationCatalogValidationCodeV1, details: StrictJsonObjectV1) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

export interface InteractionActivationV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly targetId: InteractionTargetId;
  readonly activationKind: "pointer" | "semantic_control";
}

export interface NormalizedPointV1 {
  readonly x: NormalizedCoordinateV1;
  readonly y: NormalizedCoordinateV1;
}

export type NormalizedShapeV1 =
  | {
      readonly kind: "rect";
      readonly x: NormalizedCoordinateV1;
      readonly y: NormalizedCoordinateV1;
      readonly width: NormalizedExtentV1;
      readonly height: NormalizedExtentV1;
    }
  | {
      readonly kind: "circle";
      readonly centerX: NormalizedCoordinateV1;
      readonly centerY: NormalizedCoordinateV1;
      readonly radius: NormalizedExtentV1;
    }
  | { readonly kind: "polygon"; readonly points: readonly NormalizedPointV1[] };

export interface HitAreaDescriptorV1 {
  readonly areaId: HitAreaId;
  readonly targetId: InteractionTargetId;
  readonly shape: NormalizedShapeV1;
  readonly priority: NonNegativeSafeInteger;
}

export interface HitMapDescriptorV1 {
  readonly hitMapId: HitMapId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly targets: readonly HitAreaDescriptorV1[];
}

export interface CharacterDescriptorV1 {
  readonly characterId: CharacterId;
  readonly accessibleNameTextId: TextId;
  readonly defaultRigId: CharacterRigId;
}

export interface CharacterRigDescriptorV1 {
  readonly rigId: CharacterRigId;
  readonly rendererId: string;
  readonly poseIds: readonly CharacterPoseId[];
  readonly expressionIds: readonly CharacterExpressionId[];
  readonly activityIds: readonly CharacterActivityId[];
  readonly appearanceLayerOrder: readonly AppearanceLayerId[];
  readonly defaultHitMapId: HitMapId | null;
  readonly poseHitMapOverrides: readonly {
    readonly poseId: CharacterPoseId;
    readonly hitMapId: HitMapId;
  }[];
  readonly staticFallbackAssetId: AssetId | null;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}

export interface CharacterPlacementV1 {
  readonly characterId: CharacterId;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
}

export interface InteractionSurfacePlacementV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly anchor: NormalizedPointV1;
}

export interface StageSceneDescriptorV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantIds: readonly StageSceneVariantId[];
  readonly defaultVariantId: StageSceneVariantId;
}

export interface StageScenePresentationV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly accessibleNameTextId: TextId;
  readonly backgroundAssetId: AssetId;
  readonly layout: StrictJsonObjectV1;
  readonly actors: readonly CharacterPlacementV1[];
  readonly interactionSurfaces: readonly InteractionSurfacePlacementV1[];
  readonly content: ContentRequirementV1;
}

export interface InteractionSurfaceDescriptorV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly accessibleNameTextId: TextId;
  readonly allowedEntryModes: readonly InteractionEntryModeV1[];
  readonly targetBindings: readonly InteractionSurfaceTargetBindingV1[];
}

export interface InteractionSurfaceTargetBindingV1 {
  readonly targetId: InteractionTargetId;
  readonly allowedResolutionModes: readonly InteractionResolutionModeV1[];
  readonly openSurfaceId: InteractionSurfaceId | null;
}

export interface InteractionTargetDescriptorV1 {
  readonly targetId: InteractionTargetId;
  readonly accessibleNameTextId: TextId;
  readonly behaviorIds: readonly InteractionBehaviorId[];
}

export interface InteractionBehaviorDescriptorV1 {
  readonly behaviorId: InteractionBehaviorId;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId | null;
  readonly providerId: PresentationProviderId;
  readonly content: ContentRequirementV1;
}

export interface StageSceneGraphV1 {
  readonly stageScenes: readonly StageSceneDescriptorV1[];
  readonly variants: readonly StageScenePresentationV1[];
  readonly characters: readonly CharacterDescriptorV1[];
  readonly characterRigs: readonly CharacterRigDescriptorV1[];
  readonly hitMaps: readonly HitMapDescriptorV1[];
  readonly interactionSurfaces: readonly InteractionSurfaceDescriptorV1[];
  readonly interactionTargets: readonly InteractionTargetDescriptorV1[];
  readonly interactionBehaviors: readonly InteractionBehaviorDescriptorV1[];
  readonly contentMaturityPolicy: ContentMaturityPolicyV1;
}

export interface ContentMaturityFlagDescriptorV1 {
  readonly id: ContentMaturityFlagId;
  readonly flag: ContentMaturityFlagBitV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

export interface ContentPreferencePresetDescriptorV1 {
  readonly presetId: ContentPreferencePresetId;
  readonly allowedFlags: ContentMaturityFlagsV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

export interface ContentMaturityPolicyV1 {
  readonly policyRevision: PositiveSafeInteger;
  readonly flags: readonly ContentMaturityFlagDescriptorV1[];
  readonly presets: readonly ContentPreferencePresetDescriptorV1[];
  readonly defaultAllowedFlags: ContentMaturityFlagsV1;
}

export interface ContentRequirementV1 {
  readonly requiredFlags: ContentMaturityFlagsV1;
}

export interface ContentPreferenceV1 {
  readonly allowedFlags: ContentMaturityFlagsV1;
}

export type ContentPreferenceSetResultV1 =
  | { readonly kind: "updated"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | { readonly kind: "rejected"; readonly code: "content_maturity.invalid_preference" }
  | { readonly kind: "rejected"; readonly code: "content_maturity.unknown_flags" }
  | { readonly kind: "failed"; readonly code: "content_preference.storage_failed" };

export interface ContentPreferencePortV1 {
  observe(): DeepReadonly<ContentPreferenceV1>;
  subscribe(listener: () => void): () => void;
  set(preference: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1>;
}

export type RuntimeSessionStatusV1 = "ready" | "busy" | "fault_paused" | "hmr_invalidated";

export type SessionDispatchOperationResultV1<TExecutionResult> =
  | { readonly kind: "executed"; readonly execution: TExecutionResult }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

export type SessionAnchorResultV1 =
  | { readonly kind: "anchored"; readonly commandSequence: NonNegativeSafeInteger }
  | {
      readonly kind: "rejected";
      readonly code: "busy" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: string };

export interface ResolvedTextPresentationV1<TTextId, TLocaleId> {
  readonly textId: TTextId;
  readonly requestedLocale: TLocaleId;
  readonly resolvedLocale: TLocaleId;
  readonly text: string;
}

export type ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken> =
  | {
      readonly delivery: "code_fallback";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly fallbackToken: TFallbackToken;
    }
  | {
      readonly delivery: "runtime_image";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly url: string;
      readonly width: PositiveSafeInteger;
      readonly height: PositiveSafeInteger;
      readonly fallbackToken: TFallbackToken;
    };

export interface PresentationReadPortV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken> {
  readonly locale: TLocaleId;
  text(textId: TTextId): ResolvedTextPresentationV1<TTextId, TLocaleId>;
  asset(
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
}

export interface RuntimeViewModelEnvelopeV1<
  TSceneId,
  TGameView,
  TNarrativeView,
  TPersistenceView,
  TNoticeTextId,
> {
  readonly revision: NonNegativeSafeInteger;
  readonly sessionStatus: RuntimeSessionStatusV1;
  readonly activeSceneId: TSceneId;
  readonly game: DeepReadonly<TGameView>;
  readonly narrative: DeepReadonly<TNarrativeView>;
  readonly persistence: DeepReadonly<TPersistenceView>;
  readonly noticeTextIds: readonly TNoticeTextId[];
}

type PresentationCanonicalNodeV1 =
  | readonly ["null"]
  | readonly ["boolean", boolean]
  | readonly ["string", string]
  | readonly ["number", string]
  | readonly ["array", readonly PresentationCanonicalNodeV1[]]
  | readonly ["object", readonly (readonly [string, PresentationCanonicalNodeV1])[]];

class PresentationDataError extends Error {
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string) {
    super(`${reason} at ${path || "/"}`);
    this.path = path;
    this.reason = reason;
  }
}

class ContentMaturityDuplicateIdError extends TypeError {
  readonly path: string;
  readonly reference: string;

  constructor(path: string, reference: string) {
    super("content_maturity.duplicate");
    this.path = path;
    this.reference = reference;
  }
}

const dangerousJsonKeys = new Set(["__proto__", "prototype", "constructor"]);
const interactionEntryModesV1 = [
  "surface_activation",
  "always_active",
  "explicit_control",
] as const;
const interactionResolutionModesV1 = ["direct", "choose", "open_surface"] as const;

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function validateCanonicalString(value: string, path: string): void {
  try {
    canonicalJsonBytes(value);
  } catch (error) {
    if (error instanceof CanonicalJsonError) {
      throw new CanonicalJsonError(error.code, path);
    }
    throw error;
  }
}

/**
 * Projects Presentation-only binary64 values to a typed string AST before using
 * the repository's integer-only Canonical JSON encoder. This keeps `1` distinct
 * from `"1"` without widening the Save or Simulation number contract.
 */
export function canonicalPresentationJsonBytesV1(value: unknown): Uint8Array {
  const active = new Set<object>();

  function project(current: unknown, path: string): PresentationCanonicalNodeV1 {
    if (current === null) return ["null"];
    if (typeof current === "boolean") return ["boolean", current];
    if (typeof current === "string") {
      validateCanonicalString(current, path);
      return ["string", current];
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new CanonicalJsonError("number.non_finite", path);
      }
      if (Object.is(current, -0)) {
        throw new CanonicalJsonError("number.negative_zero", path);
      }
      return ["number", String(current)];
    }
    if (typeof current === "undefined" || typeof current === "symbol") {
      throw new CanonicalJsonError("value.undefined", path);
    }
    if (typeof current === "function") {
      throw new CanonicalJsonError("value.function", path);
    }
    if (typeof current === "bigint") {
      throw new CanonicalJsonError("value.custom_prototype", path);
    }

    const object = current as object;
    if (active.has(object)) throw new CanonicalJsonError("value.cycle", path);
    active.add(object);
    try {
      if (Array.isArray(object)) {
        if (Object.getPrototypeOf(object) !== Array.prototype) {
          throw new CanonicalJsonError("value.custom_prototype", path);
        }
        const ownKeys = Reflect.ownKeys(object);
        for (const key of ownKeys) {
          if (typeof key === "symbol") {
            throw new CanonicalJsonError("value.undefined", path);
          }
          if (key === "length") continue;
          if (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= object.length) {
            throw new CanonicalJsonError(
              "value.custom_prototype",
              `${path}/${pointerSegment(key)}`,
            );
          }
        }

        const items: PresentationCanonicalNodeV1[] = [];
        for (let index = 0; index < object.length; index += 1) {
          if (!Object.hasOwn(object, index)) {
            throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
          }
          const descriptor = Object.getOwnPropertyDescriptor(object, String(index));
          if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
            throw new CanonicalJsonError("value.getter", `${path}/${index}`);
          }
          items.push(project(descriptor?.value, `${path}/${index}`));
        }
        return ["array", items];
      }

      if (Object.getPrototypeOf(object) !== Object.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const symbolKeys = Object.getOwnPropertySymbols(object);
      if (symbolKeys.length > 0) {
        throw new CanonicalJsonError("value.undefined", path);
      }
      const keys = Object.keys(descriptors).sort(compareCodePoints);
      const entries: (readonly [string, PresentationCanonicalNodeV1])[] = [];
      for (const key of keys) {
        const memberPath = `${path}/${pointerSegment(key)}`;
        const descriptor = descriptors[key];
        if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
          throw new CanonicalJsonError("value.getter", memberPath);
        }
        validateCanonicalString(key, memberPath);
        entries.push([key, project(descriptor?.value, memberPath)]);
      }
      return ["object", entries];
    } finally {
      active.delete(object);
    }
  }

  return canonicalJsonBytes(project(value, ""));
}

function parseStablePresentationId<TValue extends string>(value: unknown, label: string): TValue {
  try {
    return parseModuleId(value) as unknown as TValue;
  } catch {
    throw new TypeError(`invalid ${label}`);
  }
}

export function parseTextId(value: unknown): TextId {
  return parseStablePresentationId<TextId>(value, "TextId");
}

export function parseAssetId(value: unknown): AssetId {
  return parseStablePresentationId<AssetId>(value, "AssetId");
}

export function parseStageSceneId(value: unknown): StageSceneId {
  return parseStablePresentationId<StageSceneId>(value, "StageSceneId");
}

export function parseStageSceneVariantId(value: unknown): StageSceneVariantId {
  return parseStablePresentationId<StageSceneVariantId>(value, "StageSceneVariantId");
}

export function parseCharacterId(value: unknown): CharacterId {
  return parseStablePresentationId<CharacterId>(value, "CharacterId");
}

export function parseCharacterRigId(value: unknown): CharacterRigId {
  return parseStablePresentationId<CharacterRigId>(value, "CharacterRigId");
}

export function parseCharacterPoseId(value: unknown): CharacterPoseId {
  return parseStablePresentationId<CharacterPoseId>(value, "CharacterPoseId");
}

export function parseCharacterExpressionId(value: unknown): CharacterExpressionId {
  return parseStablePresentationId<CharacterExpressionId>(value, "CharacterExpressionId");
}

export function parseCharacterActivityId(value: unknown): CharacterActivityId {
  return parseStablePresentationId<CharacterActivityId>(value, "CharacterActivityId");
}

export function parseAppearanceLayerId(value: unknown): AppearanceLayerId {
  return parseStablePresentationId<AppearanceLayerId>(value, "AppearanceLayerId");
}

export function parseHitMapId(value: unknown): HitMapId {
  return parseStablePresentationId<HitMapId>(value, "HitMapId");
}

export function parseHitAreaId(value: unknown): HitAreaId {
  return parseStablePresentationId<HitAreaId>(value, "HitAreaId");
}

export function parseInteractionSurfaceId(value: unknown): InteractionSurfaceId {
  return parseStablePresentationId<InteractionSurfaceId>(value, "InteractionSurfaceId");
}

export function parseInteractionTargetId(value: unknown): InteractionTargetId {
  return parseStablePresentationId<InteractionTargetId>(value, "InteractionTargetId");
}

export function parseInteractionBehaviorId(value: unknown): InteractionBehaviorId {
  return parseStablePresentationId<InteractionBehaviorId>(value, "InteractionBehaviorId");
}

export function parsePresentationProviderId(value: unknown): PresentationProviderId {
  return parseStablePresentationId<PresentationProviderId>(value, "PresentationProviderId");
}

export function parseContentMaturityFlagId(value: unknown): ContentMaturityFlagId {
  return parseStablePresentationId<ContentMaturityFlagId>(value, "ContentMaturityFlagId");
}

export function parseContentPreferencePresetId(value: unknown): ContentPreferencePresetId {
  return parseStablePresentationId<ContentPreferencePresetId>(value, "ContentPreferencePresetId");
}

function parseFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseNormalizedCoordinateV1(value: unknown): NormalizedCoordinateV1 {
  const parsed = parseFiniteNumber(value, "NormalizedCoordinateV1");
  if (parsed < 0 || parsed > 1) throw new TypeError("invalid NormalizedCoordinateV1");
  return parsed as NormalizedCoordinateV1;
}

export function parseNormalizedExtentV1(value: unknown): NormalizedExtentV1 {
  const parsed = parseFiniteNumber(value, "NormalizedExtentV1");
  if (parsed <= 0 || parsed > 1) throw new TypeError("invalid NormalizedExtentV1");
  return parsed as NormalizedExtentV1;
}

export function parsePositiveFiniteNumber(value: unknown): PositiveFiniteNumber {
  const parsed = parseFiniteNumber(value, "PositiveFiniteNumber");
  if (parsed <= 0) throw new TypeError("invalid PositiveFiniteNumber");
  return parsed as PositiveFiniteNumber;
}

export function parseContentMaturityFlagsV1(value: unknown): ContentMaturityFlagsV1 {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < 0 ||
    value > 0xffff_ffff
  ) {
    throw new TypeError("content_maturity.mask");
  }
  return value as ContentMaturityFlagsV1;
}

export function parseContentMaturityFlagBitV1(value: unknown): ContentMaturityFlagBitV1 {
  let parsed: ContentMaturityFlagsV1;
  try {
    parsed = parseContentMaturityFlagsV1(value);
  } catch {
    throw new TypeError("content_maturity.flag");
  }
  if (parsed === 0 || (((parsed & (parsed - 1)) >>> 0) as number) !== 0) {
    throw new TypeError("content_maturity.flag");
  }
  return parsed as ContentMaturityFlagBitV1;
}

export const emptyContentMaturityFlagsV1 = 0 as ContentMaturityFlagsV1;

function dataFailure(path: string, reason: string): never {
  throw new PresentationDataError(path, reason);
}

function readExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "object_expected");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    return dataFailure(path, "symbol_key");
  }
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.length !== expectedKeys.length ||
    [...stringKeys].sort(compareCodePoints).join("\0") !==
      [...expectedKeys].sort(compareCodePoints).join("\0")
  ) {
    return dataFailure(path, "object_keys");
  }
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${pointerSegment(key)}`, "data_property_expected");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return dataFailure(path, "array_expected");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return dataFailure(path, "symbol_key");
    if (key === "length") continue;
    if (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length) {
      return dataFailure(`${path}/${pointerSegment(key)}`, "array_property");
    }
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined) return dataFailure(`${path}/${index}`, "sparse_array");
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${index}`, "data_property_expected");
    }
    result.push(descriptor.value);
  }
  return result;
}

function parseAt<TValue>(
  parser: (value: unknown) => TValue,
  value: unknown,
  path: string,
  reason: string,
): TValue {
  try {
    return parser(value);
  } catch {
    return dataFailure(path, reason);
  }
}

function parseNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    return dataFailure(path, "non_empty_string_expected");
  }
  try {
    canonicalJsonBytes(value);
  } catch {
    return dataFailure(path, "invalid_string");
  }
  return value;
}

function parseEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
): TValue {
  if (typeof value !== "string" || !allowed.some((candidate) => candidate === value)) {
    return dataFailure(path, "invalid_enum");
  }
  return value as TValue;
}

function parseNullableAt<TValue>(
  parser: (value: unknown) => TValue,
  value: unknown,
  path: string,
  reason: string,
): TValue | null {
  return value === null ? null : parseAt(parser, value, path, reason);
}

function deepFreezeData<TValue>(value: TValue): TValue {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get === undefined && descriptor.set === undefined) {
        deepFreezeData(descriptor.value);
      }
    }
    Object.freeze(value);
  }
  return value;
}

function cloneStrictJsonValue(
  value: unknown,
  path: string,
  active: Set<object>,
): StrictJsonValueV1 {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string" || typeof value === "number") {
    try {
      canonicalJsonBytes(value);
    } catch {
      return dataFailure(path, "invalid_strict_json");
    }
    return value;
  }
  if (typeof value !== "object") return dataFailure(path, "invalid_strict_json");
  if (active.has(value)) return dataFailure(path, "cyclic_strict_json");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      return readArray(value, path).map((entry, index) =>
        cloneStrictJsonValue(entry, `${path}/${index}`, active),
      );
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return dataFailure(path, "invalid_strict_json");
    }
    const result: Record<string, StrictJsonValueV1> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol" || dangerousJsonKeys.has(key)) {
        return dataFailure(path, "invalid_strict_json_key");
      }
      const memberPath = `${path}/${pointerSegment(key)}`;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      ) {
        return dataFailure(memberPath, "data_property_expected");
      }
      try {
        canonicalJsonBytes(key);
      } catch {
        return dataFailure(memberPath, "invalid_string");
      }
      result[key] = cloneStrictJsonValue(descriptor.value, memberPath, active);
    }
    return result;
  } finally {
    active.delete(value);
  }
}

function parseStrictJsonObject(value: unknown, path: string): StrictJsonObjectV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "strict_json_object_expected");
  }
  return cloneStrictJsonValue(value, path, new Set()) as StrictJsonObjectV1;
}

function parseContentMaturityPolicyData(value: unknown): ContentMaturityPolicyV1 {
  const record = readExactRecord(
    value,
    ["policyRevision", "flags", "presets", "defaultAllowedFlags"],
    "/",
  );
  const policyRevision = parseAt(
    parsePositiveSafeInteger,
    record.policyRevision,
    "/policyRevision",
    "positive_safe_integer_expected",
  );
  const flagIds = new Set<string>();
  const flagBits = new Set<number>();
  const flags = readArray(record.flags, "/flags").map((entry, index) => {
    const path = `/flags/${index}`;
    const flag = readExactRecord(entry, ["id", "flag", "nameTextId", "descriptionTextId"], path);
    const parsed = {
      id: parseAt(parseContentMaturityFlagId, flag.id, `${path}/id`, "invalid_id"),
      flag: parseContentMaturityFlagBitV1(flag.flag),
      nameTextId: parseAt(parseTextId, flag.nameTextId, `${path}/nameTextId`, "invalid_id"),
      descriptionTextId: parseAt(
        parseTextId,
        flag.descriptionTextId,
        `${path}/descriptionTextId`,
        "invalid_id",
      ),
    } satisfies ContentMaturityFlagDescriptorV1;
    if (flagIds.has(parsed.id)) {
      throw new ContentMaturityDuplicateIdError(`${path}/id`, parsed.id);
    }
    if (flagBits.has(parsed.flag)) {
      throw new TypeError("content_maturity.duplicate");
    }
    flagIds.add(parsed.id);
    flagBits.add(parsed.flag);
    return parsed;
  });
  const knownFlags = flags.reduce((mask, entry) => (mask | entry.flag) >>> 0, 0);
  const presetIds = new Set<string>();
  const presetMasks = new Set<number>();
  const presets = readArray(record.presets, "/presets").map((entry, index) => {
    const path = `/presets/${index}`;
    const preset = readExactRecord(
      entry,
      ["presetId", "allowedFlags", "nameTextId", "descriptionTextId"],
      path,
    );
    const parsed = {
      presetId: parseAt(
        parseContentPreferencePresetId,
        preset.presetId,
        `${path}/presetId`,
        "invalid_id",
      ),
      allowedFlags: parseContentMaturityFlagsV1(preset.allowedFlags),
      nameTextId: parseAt(parseTextId, preset.nameTextId, `${path}/nameTextId`, "invalid_id"),
      descriptionTextId: parseAt(
        parseTextId,
        preset.descriptionTextId,
        `${path}/descriptionTextId`,
        "invalid_id",
      ),
    } satisfies ContentPreferencePresetDescriptorV1;
    if (presetIds.has(parsed.presetId)) {
      throw new ContentMaturityDuplicateIdError(`${path}/presetId`, parsed.presetId);
    }
    if (presetMasks.has(parsed.allowedFlags)) {
      throw new TypeError("content_maturity.duplicate");
    }
    if ((parsed.allowedFlags & ~knownFlags) >>> 0 !== 0) {
      throw new TypeError("content_maturity.preset");
    }
    presetIds.add(parsed.presetId);
    presetMasks.add(parsed.allowedFlags);
    return parsed;
  });
  const defaultAllowedFlags = parseContentMaturityFlagsV1(record.defaultAllowedFlags);
  if ((defaultAllowedFlags & ~knownFlags) >>> 0 !== 0) {
    throw new TypeError("content_maturity.unknown_flags");
  }
  return {
    policyRevision,
    flags,
    presets,
    defaultAllowedFlags,
  };
}

export function parseContentMaturityPolicyV1(value: unknown): ContentMaturityPolicyV1 {
  try {
    return deepFreezeData(parseContentMaturityPolicyData(value));
  } catch (error) {
    if (error instanceof PresentationDataError) {
      throw new TypeError(`content_maturity.policy at ${error.path}`, { cause: error });
    }
    throw error;
  }
}

export function parseContentPreferenceV1(value: unknown): ContentPreferenceV1 {
  try {
    const record = readExactRecord(value, ["allowedFlags"], "/");
    return Object.freeze({
      allowedFlags: parseContentMaturityFlagsV1(record.allowedFlags),
    });
  } catch (error) {
    if (error instanceof PresentationDataError) {
      throw new TypeError(`content_maturity.preference at ${error.path}`, { cause: error });
    }
    throw error;
  }
}

export function combineContentMaturityFlagsV1(
  ...values: readonly ContentMaturityFlagsV1[]
): ContentMaturityFlagsV1 {
  return values.reduce(
    (combined, value) => (combined | parseContentMaturityFlagsV1(value)) >>> 0,
    0,
  ) as ContentMaturityFlagsV1;
}

export function setContentMaturityFlagV1(
  flags: ContentMaturityFlagsV1,
  flag: ContentMaturityFlagBitV1,
  enabled: boolean,
): ContentMaturityFlagsV1 {
  const parsedFlags = parseContentMaturityFlagsV1(flags);
  const parsedFlag = parseContentMaturityFlagBitV1(flag);
  return ((enabled ? parsedFlags | parsedFlag : parsedFlags & ~parsedFlag) >>>
    0) as ContentMaturityFlagsV1;
}

export function findUnknownContentMaturityFlagsV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  flags: ContentMaturityFlagsV1,
): ContentMaturityFlagsV1 {
  const knownFlags = policy.flags.reduce(
    (combined, entry) => (combined | parseContentMaturityFlagBitV1(entry.flag)) >>> 0,
    0,
  );
  return ((parseContentMaturityFlagsV1(flags) & ~knownFlags) >>> 0) as ContentMaturityFlagsV1;
}

export function isContentRequirementAllowedV1(
  requiredFlags: ContentMaturityFlagsV1,
  allowedFlags: ContentMaturityFlagsV1,
): boolean {
  const required = parseContentMaturityFlagsV1(requiredFlags);
  const allowed = parseContentMaturityFlagsV1(allowedFlags);
  return (required & allowed) >>> 0 === required;
}

export function requireContentPreferencePresetV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  presetId: ContentPreferencePresetId,
): DeepReadonly<ContentPreferencePresetDescriptorV1> {
  const parsedPresetId = parseContentPreferencePresetId(presetId);
  const preset = policy.presets.find((entry) => entry.presetId === parsedPresetId);
  if (preset === undefined) throw new TypeError("content_maturity.preset_not_found");
  return preset;
}

function parsePoint(value: unknown, path: string): NormalizedPointV1 {
  const point = readExactRecord(value, ["x", "y"], path);
  return {
    x: parseAt(parseNormalizedCoordinateV1, point.x, `${path}/x`, "invalid_coordinate"),
    y: parseAt(parseNormalizedCoordinateV1, point.y, `${path}/y`, "invalid_coordinate"),
  };
}

function orientation(
  first: NormalizedPointV1,
  second: NormalizedPointV1,
  third: NormalizedPointV1,
): number {
  return (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);
}

function pointOnSegment(
  point: NormalizedPointV1,
  first: NormalizedPointV1,
  second: NormalizedPointV1,
): boolean {
  return (
    orientation(first, second, point) === 0 &&
    point.x >= Math.min(first.x, second.x) &&
    point.x <= Math.max(first.x, second.x) &&
    point.y >= Math.min(first.y, second.y) &&
    point.y <= Math.max(first.y, second.y)
  );
}

function segmentsIntersect(
  firstStart: NormalizedPointV1,
  firstEnd: NormalizedPointV1,
  secondStart: NormalizedPointV1,
  secondEnd: NormalizedPointV1,
): boolean {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);
  if (
    ((firstOrientation > 0 && secondOrientation < 0) ||
      (firstOrientation < 0 && secondOrientation > 0)) &&
    ((thirdOrientation > 0 && fourthOrientation < 0) ||
      (thirdOrientation < 0 && fourthOrientation > 0))
  ) {
    return true;
  }
  return (
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function assertValidPolygon(points: readonly NormalizedPointV1[], path: string): void {
  if (points.length < 3) return dataFailure(path, "polygon_too_short");
  const distinct = new Set(points.map((point) => `${String(point.x)}\0${String(point.y)}`));
  if (distinct.size !== points.length) return dataFailure(path, "polygon_repeated_point");

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]!;
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    if (orientation(previous, current, next) === 0) {
      return dataFailure(path, "polygon_collinear_vertex");
    }
  }

  let doubleArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    doubleArea += current.x * next.y - next.x * current.y;
  }
  if (doubleArea === 0) return dataFailure(path, "polygon_degenerate");

  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (
        segmentsIntersect(points[first]!, points[firstNext]!, points[second]!, points[secondNext]!)
      ) {
        return dataFailure(path, "polygon_self_intersection");
      }
    }
  }
}

function parseShape(value: unknown, path: string): NormalizedShapeV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "shape_object_expected");
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    kindDescriptor === undefined ||
    kindDescriptor.get !== undefined ||
    kindDescriptor.set !== undefined
  ) {
    return dataFailure(`${path}/kind`, "shape_kind");
  }
  if (kindDescriptor.value === "rect") {
    const shape = readExactRecord(value, ["kind", "x", "y", "width", "height"], path);
    const parsed = {
      kind: "rect",
      x: parseAt(parseNormalizedCoordinateV1, shape.x, `${path}/x`, "invalid_shape"),
      y: parseAt(parseNormalizedCoordinateV1, shape.y, `${path}/y`, "invalid_shape"),
      width: parseAt(parseNormalizedExtentV1, shape.width, `${path}/width`, "invalid_shape"),
      height: parseAt(parseNormalizedExtentV1, shape.height, `${path}/height`, "invalid_shape"),
    } satisfies NormalizedShapeV1;
    if (parsed.x + parsed.width > 1 || parsed.y + parsed.height > 1) {
      return dataFailure(path, "rect_out_of_bounds");
    }
    return parsed;
  }
  if (kindDescriptor.value === "circle") {
    const shape = readExactRecord(value, ["kind", "centerX", "centerY", "radius"], path);
    const parsed = {
      kind: "circle",
      centerX: parseAt(
        parseNormalizedCoordinateV1,
        shape.centerX,
        `${path}/centerX`,
        "invalid_shape",
      ),
      centerY: parseAt(
        parseNormalizedCoordinateV1,
        shape.centerY,
        `${path}/centerY`,
        "invalid_shape",
      ),
      radius: parseAt(parseNormalizedExtentV1, shape.radius, `${path}/radius`, "invalid_shape"),
    } satisfies NormalizedShapeV1;
    if (
      parsed.centerX - parsed.radius < 0 ||
      parsed.centerX + parsed.radius > 1 ||
      parsed.centerY - parsed.radius < 0 ||
      parsed.centerY + parsed.radius > 1
    ) {
      return dataFailure(path, "circle_out_of_bounds");
    }
    return parsed;
  }
  if (kindDescriptor.value === "polygon") {
    const shape = readExactRecord(value, ["kind", "points"], path);
    const points = readArray(shape.points, `${path}/points`).map((point, index) =>
      parsePoint(point, `${path}/points/${index}`),
    );
    assertValidPolygon(points, `${path}/points`);
    return { kind: "polygon", points };
  }
  return dataFailure(`${path}/kind`, "shape_kind");
}

function parseContentRequirement(value: unknown, path: string): ContentRequirementV1 {
  const requirement = readExactRecord(value, ["requiredFlags"], path);
  return {
    requiredFlags: parseAt(
      parseContentMaturityFlagsV1,
      requirement.requiredFlags,
      `${path}/requiredFlags`,
      "invalid_content_mask",
    ),
  };
}

function parseStageSceneDescriptor(value: unknown, path: string): StageSceneDescriptorV1 {
  const scene = readExactRecord(value, ["stageSceneId", "variantIds", "defaultVariantId"], path);
  return {
    stageSceneId: parseAt(
      parseStageSceneId,
      scene.stageSceneId,
      `${path}/stageSceneId`,
      "invalid_id",
    ),
    variantIds: readArray(scene.variantIds, `${path}/variantIds`).map((entry, index) =>
      parseAt(parseStageSceneVariantId, entry, `${path}/variantIds/${index}`, "invalid_id"),
    ),
    defaultVariantId: parseAt(
      parseStageSceneVariantId,
      scene.defaultVariantId,
      `${path}/defaultVariantId`,
      "invalid_id",
    ),
  };
}

function parseCharacterPlacement(value: unknown, path: string): CharacterPlacementV1 {
  const placement = readExactRecord(value, ["characterId", "anchor", "scale"], path);
  return {
    characterId: parseAt(
      parseCharacterId,
      placement.characterId,
      `${path}/characterId`,
      "invalid_id",
    ),
    anchor: parsePoint(placement.anchor, `${path}/anchor`),
    scale: parseAt(parsePositiveFiniteNumber, placement.scale, `${path}/scale`, "invalid_scale"),
  };
}

function parseInteractionSurfacePlacement(
  value: unknown,
  path: string,
): InteractionSurfacePlacementV1 {
  const placement = readExactRecord(value, ["surfaceId", "anchor"], path);
  return {
    surfaceId: parseAt(
      parseInteractionSurfaceId,
      placement.surfaceId,
      `${path}/surfaceId`,
      "invalid_id",
    ),
    anchor: parsePoint(placement.anchor, `${path}/anchor`),
  };
}

function parseStageScenePresentation(value: unknown, path: string): StageScenePresentationV1 {
  const variant = readExactRecord(
    value,
    [
      "stageSceneId",
      "variantId",
      "rendererId",
      "accessibleNameTextId",
      "backgroundAssetId",
      "layout",
      "actors",
      "interactionSurfaces",
      "content",
    ],
    path,
  );
  return {
    stageSceneId: parseAt(
      parseStageSceneId,
      variant.stageSceneId,
      `${path}/stageSceneId`,
      "invalid_id",
    ),
    variantId: parseAt(
      parseStageSceneVariantId,
      variant.variantId,
      `${path}/variantId`,
      "invalid_id",
    ),
    rendererId: parseNonEmptyString(variant.rendererId, `${path}/rendererId`),
    accessibleNameTextId: parseAt(
      parseTextId,
      variant.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    backgroundAssetId: parseAt(
      parseAssetId,
      variant.backgroundAssetId,
      `${path}/backgroundAssetId`,
      "invalid_id",
    ),
    layout: parseStrictJsonObject(variant.layout, `${path}/layout`),
    actors: readArray(variant.actors, `${path}/actors`).map((entry, index) =>
      parseCharacterPlacement(entry, `${path}/actors/${index}`),
    ),
    interactionSurfaces: readArray(variant.interactionSurfaces, `${path}/interactionSurfaces`).map(
      (entry, index) =>
        parseInteractionSurfacePlacement(entry, `${path}/interactionSurfaces/${index}`),
    ),
    content: parseContentRequirement(variant.content, `${path}/content`),
  };
}

function parseCharacterDescriptor(value: unknown, path: string): CharacterDescriptorV1 {
  const character = readExactRecord(
    value,
    ["characterId", "accessibleNameTextId", "defaultRigId"],
    path,
  );
  return {
    characterId: parseAt(
      parseCharacterId,
      character.characterId,
      `${path}/characterId`,
      "invalid_id",
    ),
    accessibleNameTextId: parseAt(
      parseTextId,
      character.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    defaultRigId: parseAt(
      parseCharacterRigId,
      character.defaultRigId,
      `${path}/defaultRigId`,
      "invalid_id",
    ),
  };
}

function parseCharacterRigDescriptor(value: unknown, path: string): CharacterRigDescriptorV1 {
  const rig = readExactRecord(
    value,
    [
      "rigId",
      "rendererId",
      "poseIds",
      "expressionIds",
      "activityIds",
      "appearanceLayerOrder",
      "defaultHitMapId",
      "poseHitMapOverrides",
      "staticFallbackAssetId",
      "fallbackHitMapCompatibility",
    ],
    path,
  );
  return {
    rigId: parseAt(parseCharacterRigId, rig.rigId, `${path}/rigId`, "invalid_id"),
    rendererId: parseNonEmptyString(rig.rendererId, `${path}/rendererId`),
    poseIds: readArray(rig.poseIds, `${path}/poseIds`).map((entry, index) =>
      parseAt(parseCharacterPoseId, entry, `${path}/poseIds/${index}`, "invalid_id"),
    ),
    expressionIds: readArray(rig.expressionIds, `${path}/expressionIds`).map((entry, index) =>
      parseAt(parseCharacterExpressionId, entry, `${path}/expressionIds/${index}`, "invalid_id"),
    ),
    activityIds: readArray(rig.activityIds, `${path}/activityIds`).map((entry, index) =>
      parseAt(parseCharacterActivityId, entry, `${path}/activityIds/${index}`, "invalid_id"),
    ),
    appearanceLayerOrder: readArray(rig.appearanceLayerOrder, `${path}/appearanceLayerOrder`).map(
      (entry, index) =>
        parseAt(
          parseAppearanceLayerId,
          entry,
          `${path}/appearanceLayerOrder/${index}`,
          "invalid_id",
        ),
    ),
    defaultHitMapId: parseNullableAt(
      parseHitMapId,
      rig.defaultHitMapId,
      `${path}/defaultHitMapId`,
      "invalid_id",
    ),
    poseHitMapOverrides: readArray(rig.poseHitMapOverrides, `${path}/poseHitMapOverrides`).map(
      (entry, index) => {
        const overridePath = `${path}/poseHitMapOverrides/${index}`;
        const override = readExactRecord(entry, ["poseId", "hitMapId"], overridePath);
        return {
          poseId: parseAt(
            parseCharacterPoseId,
            override.poseId,
            `${overridePath}/poseId`,
            "invalid_id",
          ),
          hitMapId: parseAt(
            parseHitMapId,
            override.hitMapId,
            `${overridePath}/hitMapId`,
            "invalid_id",
          ),
        };
      },
    ),
    staticFallbackAssetId: parseNullableAt(
      parseAssetId,
      rig.staticFallbackAssetId,
      `${path}/staticFallbackAssetId`,
      "invalid_id",
    ),
    fallbackHitMapCompatibility: parseEnum(
      rig.fallbackHitMapCompatibility,
      ["compatible", "incompatible"],
      `${path}/fallbackHitMapCompatibility`,
    ),
  };
}

function parseHitAreaDescriptor(value: unknown, path: string): HitAreaDescriptorV1 {
  const area = readExactRecord(value, ["areaId", "targetId", "shape", "priority"], path);
  return {
    areaId: parseAt(parseHitAreaId, area.areaId, `${path}/areaId`, "invalid_id"),
    targetId: parseAt(parseInteractionTargetId, area.targetId, `${path}/targetId`, "invalid_id"),
    shape: parseShape(area.shape, `${path}/shape`),
    priority: parseAt(
      parseNonNegativeSafeInteger,
      area.priority,
      `${path}/priority`,
      "invalid_priority",
    ),
  };
}

function parseHitMapDescriptor(value: unknown, path: string): HitMapDescriptorV1 {
  const hitMap = readExactRecord(value, ["hitMapId", "rigId", "poseId", "targets"], path);
  return {
    hitMapId: parseAt(parseHitMapId, hitMap.hitMapId, `${path}/hitMapId`, "invalid_id"),
    rigId: parseAt(parseCharacterRigId, hitMap.rigId, `${path}/rigId`, "invalid_id"),
    poseId: parseAt(parseCharacterPoseId, hitMap.poseId, `${path}/poseId`, "invalid_id"),
    targets: readArray(hitMap.targets, `${path}/targets`).map((entry, index) =>
      parseHitAreaDescriptor(entry, `${path}/targets/${index}`),
    ),
  };
}

function parseSurfaceTargetBinding(
  value: unknown,
  path: string,
): InteractionSurfaceTargetBindingV1 {
  const binding = readExactRecord(
    value,
    ["targetId", "allowedResolutionModes", "openSurfaceId"],
    path,
  );
  const allowedResolutionModes = readArray(
    binding.allowedResolutionModes,
    `${path}/allowedResolutionModes`,
  ).map((entry, index) =>
    parseEnum(entry, interactionResolutionModesV1, `${path}/allowedResolutionModes/${index}`),
  );
  if (allowedResolutionModes.length === 0) {
    return dataFailure(`${path}/allowedResolutionModes`, "empty_modes");
  }
  const openSurfaceId = parseNullableAt(
    parseInteractionSurfaceId,
    binding.openSurfaceId,
    `${path}/openSurfaceId`,
    "invalid_id",
  );
  if (allowedResolutionModes.includes("open_surface") !== (openSurfaceId !== null)) {
    return dataFailure(path, "open_surface_mismatch");
  }
  return {
    targetId: parseAt(parseInteractionTargetId, binding.targetId, `${path}/targetId`, "invalid_id"),
    allowedResolutionModes,
    openSurfaceId,
  };
}

function parseInteractionSurfaceDescriptor(
  value: unknown,
  path: string,
): InteractionSurfaceDescriptorV1 {
  const surface = readExactRecord(
    value,
    ["surfaceId", "accessibleNameTextId", "allowedEntryModes", "targetBindings"],
    path,
  );
  const allowedEntryModes = readArray(surface.allowedEntryModes, `${path}/allowedEntryModes`).map(
    (entry, index) =>
      parseEnum(entry, interactionEntryModesV1, `${path}/allowedEntryModes/${index}`),
  );
  if (allowedEntryModes.length === 0) {
    return dataFailure(`${path}/allowedEntryModes`, "empty_modes");
  }
  return {
    surfaceId: parseAt(
      parseInteractionSurfaceId,
      surface.surfaceId,
      `${path}/surfaceId`,
      "invalid_id",
    ),
    accessibleNameTextId: parseAt(
      parseTextId,
      surface.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    allowedEntryModes,
    targetBindings: readArray(surface.targetBindings, `${path}/targetBindings`).map(
      (entry, index) => parseSurfaceTargetBinding(entry, `${path}/targetBindings/${index}`),
    ),
  };
}

function parseInteractionTargetDescriptor(
  value: unknown,
  path: string,
): InteractionTargetDescriptorV1 {
  const target = readExactRecord(value, ["targetId", "accessibleNameTextId", "behaviorIds"], path);
  return {
    targetId: parseAt(parseInteractionTargetId, target.targetId, `${path}/targetId`, "invalid_id"),
    accessibleNameTextId: parseAt(
      parseTextId,
      target.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    behaviorIds: readArray(target.behaviorIds, `${path}/behaviorIds`).map((entry, index) =>
      parseAt(parseInteractionBehaviorId, entry, `${path}/behaviorIds/${index}`, "invalid_id"),
    ),
  };
}

function parseInteractionBehaviorDescriptor(
  value: unknown,
  path: string,
): InteractionBehaviorDescriptorV1 {
  const behavior = readExactRecord(
    value,
    ["behaviorId", "nameTextId", "descriptionTextId", "providerId", "content"],
    path,
  );
  return {
    behaviorId: parseAt(
      parseInteractionBehaviorId,
      behavior.behaviorId,
      `${path}/behaviorId`,
      "invalid_id",
    ),
    nameTextId: parseAt(parseTextId, behavior.nameTextId, `${path}/nameTextId`, "invalid_id"),
    descriptionTextId: parseNullableAt(
      parseTextId,
      behavior.descriptionTextId,
      `${path}/descriptionTextId`,
      "invalid_id",
    ),
    providerId: parseAt(
      parsePresentationProviderId,
      behavior.providerId,
      `${path}/providerId`,
      "invalid_id",
    ),
    content: parseContentRequirement(behavior.content, `${path}/content`),
  };
}

function catalogFailure(
  code: PresentationCatalogValidationCodeV1,
  path: string,
  reason: string,
  reference?: string | number,
): never {
  const details: Record<string, StrictJsonValueV1> = { path, reason };
  if (reference !== undefined) details.reference = reference;
  throw new PresentationCatalogValidationError(code, Object.freeze(details));
}

function assertUniqueValues(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      catalogFailure("presentation.catalog.duplicate_id", path, "duplicate_reference", value);
    }
    seen.add(value);
  }
}

function validateStageSceneGraph(graph: StageSceneGraphV1): void {
  const globallyRegistered = new Map<string, string>();
  const register = (id: string, path: string): void => {
    if (globallyRegistered.has(id)) {
      catalogFailure("presentation.catalog.duplicate_id", path, "duplicate_id", id);
    }
    globallyRegistered.set(id, path);
  };

  graph.stageScenes.forEach((entry, index) =>
    register(entry.stageSceneId, `/stageScenes/${index}`),
  );
  graph.variants.forEach((entry, index) => register(entry.variantId, `/variants/${index}`));
  graph.characters.forEach((entry, index) => register(entry.characterId, `/characters/${index}`));
  graph.characterRigs.forEach((entry, index) => register(entry.rigId, `/characterRigs/${index}`));
  graph.hitMaps.forEach((entry, index) => {
    register(entry.hitMapId, `/hitMaps/${index}`);
    entry.targets.forEach((area, areaIndex) =>
      register(area.areaId, `/hitMaps/${index}/targets/${areaIndex}`),
    );
  });
  graph.interactionSurfaces.forEach((entry, index) =>
    register(entry.surfaceId, `/interactionSurfaces/${index}`),
  );
  graph.interactionTargets.forEach((entry, index) =>
    register(entry.targetId, `/interactionTargets/${index}`),
  );
  graph.interactionBehaviors.forEach((entry, index) =>
    register(entry.behaviorId, `/interactionBehaviors/${index}`),
  );
  graph.contentMaturityPolicy.flags.forEach((entry, index) =>
    register(entry.id, `/contentMaturityPolicy/flags/${index}`),
  );
  graph.contentMaturityPolicy.presets.forEach((entry, index) =>
    register(entry.presetId, `/contentMaturityPolicy/presets/${index}`),
  );

  const stageScenes = new Map(graph.stageScenes.map((entry) => [entry.stageSceneId, entry]));
  const variants = new Map(graph.variants.map((entry) => [entry.variantId, entry]));
  const characters = new Map(graph.characters.map((entry) => [entry.characterId, entry]));
  const rigs = new Map(graph.characterRigs.map((entry) => [entry.rigId, entry]));
  const hitMaps = new Map(graph.hitMaps.map((entry) => [entry.hitMapId, entry]));
  const surfaces = new Map(graph.interactionSurfaces.map((entry) => [entry.surfaceId, entry]));
  const targets = new Map(graph.interactionTargets.map((entry) => [entry.targetId, entry]));
  const behaviors = new Map(graph.interactionBehaviors.map((entry) => [entry.behaviorId, entry]));

  graph.stageScenes.forEach((scene, sceneIndex) => {
    const path = `/stageScenes/${sceneIndex}`;
    assertUniqueValues(scene.variantIds, `${path}/variantIds`);
    if (!scene.variantIds.includes(scene.defaultVariantId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `${path}/defaultVariantId`,
        "default_variant_not_registered",
        scene.defaultVariantId,
      );
    }
    for (const variantId of scene.variantIds) {
      const variant = variants.get(variantId);
      if (variant === undefined || variant.stageSceneId !== scene.stageSceneId) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/variantIds`,
          "variant_reference",
          variantId,
        );
      }
    }
  });

  graph.variants.forEach((variant, variantIndex) => {
    const path = `/variants/${variantIndex}`;
    const scene = stageScenes.get(variant.stageSceneId);
    if (scene === undefined || !scene.variantIds.includes(variant.variantId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `${path}/stageSceneId`,
        "stage_scene_reference",
        variant.stageSceneId,
      );
    }
    for (const actor of variant.actors) {
      if (!characters.has(actor.characterId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/actors`,
          "character_reference",
          actor.characterId,
        );
      }
    }
    for (const placement of variant.interactionSurfaces) {
      if (!surfaces.has(placement.surfaceId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/interactionSurfaces`,
          "surface_reference",
          placement.surfaceId,
        );
      }
    }
  });

  graph.characters.forEach((character, index) => {
    if (!rigs.has(character.defaultRigId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `/characters/${index}/defaultRigId`,
        "rig_reference",
        character.defaultRigId,
      );
    }
  });

  graph.characterRigs.forEach((rig, rigIndex) => {
    const path = `/characterRigs/${rigIndex}`;
    assertUniqueValues(rig.poseIds, `${path}/poseIds`);
    assertUniqueValues(rig.expressionIds, `${path}/expressionIds`);
    assertUniqueValues(rig.activityIds, `${path}/activityIds`);
    assertUniqueValues(rig.appearanceLayerOrder, `${path}/appearanceLayerOrder`);
    if (rig.defaultHitMapId !== null) {
      const hitMap = hitMaps.get(rig.defaultHitMapId);
      if (hitMap === undefined || hitMap.rigId !== rig.rigId) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/defaultHitMapId`,
          "hit_map_reference",
          rig.defaultHitMapId,
        );
      }
    }
    const overridePoses = new Set<string>();
    for (const override of rig.poseHitMapOverrides) {
      if (overridePoses.has(override.poseId)) {
        catalogFailure(
          "presentation.catalog.duplicate_id",
          `${path}/poseHitMapOverrides`,
          "duplicate_pose_override",
          override.poseId,
        );
      }
      overridePoses.add(override.poseId);
      const hitMap = hitMaps.get(override.hitMapId);
      if (
        !rig.poseIds.includes(override.poseId) ||
        hitMap === undefined ||
        hitMap.rigId !== rig.rigId ||
        hitMap.poseId !== override.poseId
      ) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/poseHitMapOverrides`,
          "pose_hit_map_reference",
          override.hitMapId,
        );
      }
    }
  });

  graph.hitMaps.forEach((hitMap, hitMapIndex) => {
    const rig = rigs.get(hitMap.rigId);
    if (rig === undefined || !rig.poseIds.includes(hitMap.poseId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `/hitMaps/${hitMapIndex}`,
        "rig_pose_reference",
        hitMap.rigId,
      );
    }
    for (const area of hitMap.targets) {
      if (!targets.has(area.targetId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/hitMaps/${hitMapIndex}/targets`,
          "target_reference",
          area.targetId,
        );
      }
    }
  });

  graph.interactionTargets.forEach((target, targetIndex) => {
    assertUniqueValues(target.behaviorIds, `/interactionTargets/${targetIndex}/behaviorIds`);
    for (const behaviorId of target.behaviorIds) {
      if (!behaviors.has(behaviorId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/interactionTargets/${targetIndex}/behaviorIds`,
          "behavior_reference",
          behaviorId,
        );
      }
    }
  });

  const surfaceEdges = new Map<InteractionSurfaceId, InteractionSurfaceId[]>();
  graph.interactionSurfaces.forEach((surface, surfaceIndex) => {
    const targetsInSurface = new Set<string>();
    assertUniqueValues(
      surface.allowedEntryModes,
      `/interactionSurfaces/${surfaceIndex}/allowedEntryModes`,
    );
    const edges: InteractionSurfaceId[] = [];
    for (const binding of surface.targetBindings) {
      if (targetsInSurface.has(binding.targetId)) {
        catalogFailure(
          "presentation.catalog.duplicate_id",
          `/interactionSurfaces/${surfaceIndex}/targetBindings`,
          "duplicate_surface_target_binding",
          binding.targetId,
        );
      }
      targetsInSurface.add(binding.targetId);
      assertUniqueValues(
        binding.allowedResolutionModes,
        `/interactionSurfaces/${surfaceIndex}/targetBindings`,
      );
      if (!targets.has(binding.targetId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/interactionSurfaces/${surfaceIndex}/targetBindings`,
          "target_reference",
          binding.targetId,
        );
      }
      if (binding.openSurfaceId !== null) {
        if (!surfaces.has(binding.openSurfaceId)) {
          catalogFailure(
            "presentation.catalog.missing_reference",
            `/interactionSurfaces/${surfaceIndex}/targetBindings`,
            "open_surface_reference",
            binding.openSurfaceId,
          );
        }
        edges.push(binding.openSurfaceId);
      }
    }
    surfaceEdges.set(surface.surfaceId, edges);
  });

  const visiting = new Set<InteractionSurfaceId>();
  const visited = new Set<InteractionSurfaceId>();
  const visitSurface = (surfaceId: InteractionSurfaceId): void => {
    if (visiting.has(surfaceId)) {
      catalogFailure(
        "presentation.catalog.surface_cycle",
        "/interactionSurfaces",
        "surface_cycle",
        surfaceId,
      );
    }
    if (visited.has(surfaceId)) return;
    visiting.add(surfaceId);
    for (const targetSurfaceId of surfaceEdges.get(surfaceId) ?? []) {
      visitSurface(targetSurfaceId);
    }
    visiting.delete(surfaceId);
    visited.add(surfaceId);
  };
  for (const surfaceId of surfaces.keys()) visitSurface(surfaceId);

  const assertKnownRequirement = (requirement: ContentRequirementV1, path: string): void => {
    const unknown = findUnknownContentMaturityFlagsV1(
      graph.contentMaturityPolicy,
      requirement.requiredFlags,
    );
    if (unknown !== 0) {
      catalogFailure("content_maturity.unknown_flags", path, "unknown_required_flags", unknown);
    }
  };
  graph.variants.forEach((variant, index) =>
    assertKnownRequirement(variant.content, `/variants/${index}/content`),
  );
  graph.interactionBehaviors.forEach((behavior, index) =>
    assertKnownRequirement(behavior.content, `/interactionBehaviors/${index}/content`),
  );
}

function parseStageSceneGraphData(value: unknown): StageSceneGraphV1 {
  const graph = readExactRecord(
    value,
    [
      "stageScenes",
      "variants",
      "characters",
      "characterRigs",
      "hitMaps",
      "interactionSurfaces",
      "interactionTargets",
      "interactionBehaviors",
      "contentMaturityPolicy",
    ],
    "/",
  );
  const parsed: StageSceneGraphV1 = {
    stageScenes: readArray(graph.stageScenes, "/stageScenes").map((entry, index) =>
      parseStageSceneDescriptor(entry, `/stageScenes/${index}`),
    ),
    variants: readArray(graph.variants, "/variants").map((entry, index) =>
      parseStageScenePresentation(entry, `/variants/${index}`),
    ),
    characters: readArray(graph.characters, "/characters").map((entry, index) =>
      parseCharacterDescriptor(entry, `/characters/${index}`),
    ),
    characterRigs: readArray(graph.characterRigs, "/characterRigs").map((entry, index) =>
      parseCharacterRigDescriptor(entry, `/characterRigs/${index}`),
    ),
    hitMaps: readArray(graph.hitMaps, "/hitMaps").map((entry, index) =>
      parseHitMapDescriptor(entry, `/hitMaps/${index}`),
    ),
    interactionSurfaces: readArray(graph.interactionSurfaces, "/interactionSurfaces").map(
      (entry, index) => parseInteractionSurfaceDescriptor(entry, `/interactionSurfaces/${index}`),
    ),
    interactionTargets: readArray(graph.interactionTargets, "/interactionTargets").map(
      (entry, index) => parseInteractionTargetDescriptor(entry, `/interactionTargets/${index}`),
    ),
    interactionBehaviors: readArray(graph.interactionBehaviors, "/interactionBehaviors").map(
      (entry, index) => parseInteractionBehaviorDescriptor(entry, `/interactionBehaviors/${index}`),
    ),
    contentMaturityPolicy: parseContentMaturityPolicyV1(graph.contentMaturityPolicy),
  };
  validateStageSceneGraph(parsed);
  return deepFreezeData(parsed);
}

export function parseStageSceneGraphV1(value: unknown): StageSceneGraphV1 {
  try {
    return parseStageSceneGraphData(value);
  } catch (error) {
    if (error instanceof PresentationCatalogValidationError) throw error;
    if (error instanceof ContentMaturityDuplicateIdError) {
      return catalogFailure(
        "presentation.catalog.duplicate_id",
        error.path,
        "duplicate_id",
        error.reference,
      );
    }
    if (error instanceof PresentationDataError) {
      return catalogFailure("presentation.catalog.invalid_shape", error.path, error.reason);
    }
    return catalogFailure("presentation.catalog.invalid_shape", "/", "invalid_catalog_data");
  }
}

export const stageSceneGraphSchemaV1: RuntimeSchemaV1<StageSceneGraphV1> = Object.freeze({
  parse: parseStageSceneGraphV1,
});
