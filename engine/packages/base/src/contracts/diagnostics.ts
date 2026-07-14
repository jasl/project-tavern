// SPDX-License-Identifier: MIT
import type { IsoUtcInstant } from "./host.js";
import type { RngDrawTraceV1, RngStateV1 } from "./rng.js";
import { parseStrictJsonLimitsV1 } from "./strict-json.js";
import type {
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.js";
import { parseDigest } from "./values.js";
import {
  exactEnvelopeDescriptorsV1,
  parseByteExportV1,
  parseIsoUtcInstantV1,
  saveJsonLimitsV1,
} from "./persistence.js";

export interface CommandLogEntryBaseV1 {
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: RngStateV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly committedRngAfter: RngStateV1;
}

export type CommandLogEntryEnvelopeV1<TLoggedCommand, TOutcome> = CommandLogEntryBaseV1 &
  TLoggedCommand & { readonly outcome: TOutcome };

export interface RuntimeFaultBaseV1 {
  readonly occurredAt: IsoUtcInstant;
  readonly operation: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: { readonly name: string; readonly message: string };
}

export type PersistenceFaultCodeV1 =
  | "persistence.unavailable"
  | "persistence.quota_exceeded"
  | "persistence.transaction_failed"
  | "persistence.blocked_upgrade"
  | "persistence.connection_closed"
  | "persistence.stale_writer";
export type AssetLoadFaultCodeV1 =
  "asset.fetch_failed" | "asset.decode_failed" | "asset.integrity_mismatch";
export type UiFaultCodeV1 = "ui.render_failed" | "ui.event_handler_failed";
export type RuntimeFaultCodeV1 =
  "runtime.async_operation_failed" | "runtime.dispatch_failed" | "runtime.hmr_invalidated";

export type RuntimeOperationFaultV1 =
  | (RuntimeFaultBaseV1 & {
      readonly category: "persistence";
      readonly code: PersistenceFaultCodeV1;
    })
  | (RuntimeFaultBaseV1 & {
      readonly category: "asset_load";
      readonly code: AssetLoadFaultCodeV1;
    })
  | (RuntimeFaultBaseV1 & { readonly category: "ui"; readonly code: UiFaultCodeV1 })
  | (RuntimeFaultBaseV1 & {
      readonly category: "runtime";
      readonly code: RuntimeFaultCodeV1;
    });

export interface DebugBundleEnvelopeV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
> {
  readonly formatRevision: 1;
  readonly provenance: TProvenance;
  readonly appBuildId?: Digest;
  readonly capabilities: TCapabilities;
  readonly simulationLineage: TSimulationLineage;
  readonly generatedAt: IsoUtcInstant;
  readonly replayBase: TSnapshot;
  readonly replayBaseStateDigest: Digest;
  readonly commandLog: readonly TCommandLogEntry[];
  readonly currentSnapshot: TSnapshot;
  readonly currentStateDigest: Digest;
  readonly diagnostics: TDiagnostics;
  readonly runtimeFailures: readonly TRuntimeFailure[];
  readonly failure?: TFailure;
  readonly uiContext?: TUiContext;
}

export type DebugBundleEnvelopeSchemaFailureCodeV1 =
  "envelope.unsupported_revision" | "digest.invalid_format";

export class DebugBundleEnvelopeSchemaFailureV1 extends TypeError {
  readonly code: DebugBundleEnvelopeSchemaFailureCodeV1;

  constructor(code: DebugBundleEnvelopeSchemaFailureCodeV1) {
    super(code);
    this.name = "DebugBundleEnvelopeSchemaFailureV1";
    this.code = code;
  }
}

export interface DebugBundleEnvelopeSchemaInputV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
> {
  readonly provenanceSchema: RuntimeSchemaV1<TProvenance>;
  readonly capabilitiesSchema: RuntimeSchemaV1<TCapabilities>;
  readonly simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>;
  readonly snapshotSchema: RuntimeSchemaV1<TSnapshot>;
  readonly commandLogEntrySchema: RuntimeSchemaV1<TCommandLogEntry>;
  readonly diagnosticsSchema: RuntimeSchemaV1<TDiagnostics>;
  readonly runtimeFailureSchema: RuntimeSchemaV1<TRuntimeFailure>;
  readonly failureSchema: RuntimeSchemaV1<TFailure>;
  readonly uiContextSchema: RuntimeSchemaV1<TUiContext>;
}

export interface ExportedDebugBundleV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

export const exportedDebugBundleSchemaV1: RuntimeSchemaV1<ExportedDebugBundleV1> = Object.freeze({
  parse(value: unknown) {
    return parseByteExportV1<ExportedDebugBundleV1>(value, "ExportedDebugBundleV1");
  },
});

const codes = {
  persistence: new Set<PersistenceFaultCodeV1>([
    "persistence.unavailable",
    "persistence.quota_exceeded",
    "persistence.transaction_failed",
    "persistence.blocked_upgrade",
    "persistence.connection_closed",
    "persistence.stale_writer",
  ]),
  asset_load: new Set<AssetLoadFaultCodeV1>([
    "asset.fetch_failed",
    "asset.decode_failed",
    "asset.integrity_mismatch",
  ]),
  ui: new Set<UiFaultCodeV1>(["ui.render_failed", "ui.event_handler_failed"]),
  runtime: new Set<RuntimeFaultCodeV1>([
    "runtime.async_operation_failed",
    "runtime.dispatch_failed",
    "runtime.hmr_invalidated",
  ]),
} as const;

function utf8ByteLengthV1(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

const text = (value: unknown, label: string, maximumBytes?: number): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    (maximumBytes !== undefined && utf8ByteLengthV1(value) > maximumBytes)
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
};

function parseDenseArrayV1<T>(
  value: unknown,
  maximumItems: number,
  schema: RuntimeSchemaV1<T>,
  label: string,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > maximumItems
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (
    keys.length !== value.length ||
    keys.some((key, index) => key !== String(index)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !descriptor.enumerable
      );
    })
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return Object.freeze(keys.map((key) => schema.parse(descriptors[key]?.value)));
}

export function createDebugBundleEnvelopeSchemaV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
>(
  input: DebugBundleEnvelopeSchemaInputV1<
    TProvenance,
    TCapabilities,
    TSimulationLineage,
    TSnapshot,
    TCommandLogEntry,
    TDiagnostics,
    TRuntimeFailure,
    TFailure,
    TUiContext
  >,
): RuntimeSchemaV1<
  DebugBundleEnvelopeV1<
    TProvenance,
    TCapabilities,
    TSimulationLineage,
    TSnapshot,
    TCommandLogEntry,
    TDiagnostics,
    TRuntimeFailure,
    TFailure,
    TUiContext
  >
> {
  return Object.freeze({
    parse(value: unknown) {
      const hasAppBuildId =
        value !== null && typeof value === "object" && Object.hasOwn(value, "appBuildId");
      const hasFailure =
        value !== null && typeof value === "object" && Object.hasOwn(value, "failure");
      const hasUiContext =
        value !== null && typeof value === "object" && Object.hasOwn(value, "uiContext");
      const fields = exactEnvelopeDescriptorsV1(
        value,
        [
          "formatRevision",
          "provenance",
          ...(hasAppBuildId ? ["appBuildId"] : []),
          "capabilities",
          "simulationLineage",
          "generatedAt",
          "replayBase",
          "replayBaseStateDigest",
          "commandLog",
          "currentSnapshot",
          "currentStateDigest",
          "diagnostics",
          "runtimeFailures",
          ...(hasFailure ? ["failure"] : []),
          ...(hasUiContext ? ["uiContext"] : []),
        ],
        "DebugBundleEnvelopeV1",
      );
      const formatRevision = fields.formatRevision?.value;
      if (formatRevision !== 1) {
        if (
          typeof formatRevision === "number" &&
          Number.isSafeInteger(formatRevision) &&
          !Object.is(formatRevision, -0) &&
          formatRevision > 0
        ) {
          throw new DebugBundleEnvelopeSchemaFailureV1("envelope.unsupported_revision");
        }
        throw new TypeError("invalid Debug Bundle formatRevision");
      }
      const parseStateDigestV1 = (valueToParse: unknown): Digest => {
        try {
          return parseDigest(valueToParse);
        } catch {
          throw new DebugBundleEnvelopeSchemaFailureV1("digest.invalid_format");
        }
      };
      const appBuildId = hasAppBuildId ? parseStateDigestV1(fields.appBuildId?.value) : undefined;
      const failure = hasFailure ? input.failureSchema.parse(fields.failure?.value) : undefined;
      const uiContext = hasUiContext
        ? input.uiContextSchema.parse(fields.uiContext?.value)
        : undefined;
      return Object.freeze({
        formatRevision: 1 as const,
        provenance: input.provenanceSchema.parse(fields.provenance?.value),
        ...(appBuildId === undefined ? {} : { appBuildId }),
        capabilities: input.capabilitiesSchema.parse(fields.capabilities?.value),
        simulationLineage: input.simulationLineageSchema.parse(fields.simulationLineage?.value),
        generatedAt: parseIsoUtcInstantV1(fields.generatedAt?.value),
        replayBase: input.snapshotSchema.parse(fields.replayBase?.value),
        replayBaseStateDigest: parseStateDigestV1(fields.replayBaseStateDigest?.value),
        commandLog: parseDenseArrayV1(
          fields.commandLog?.value,
          200,
          input.commandLogEntrySchema,
          "Debug Bundle CommandLog",
        ),
        currentSnapshot: input.snapshotSchema.parse(fields.currentSnapshot?.value),
        currentStateDigest: parseStateDigestV1(fields.currentStateDigest?.value),
        diagnostics: input.diagnosticsSchema.parse(fields.diagnostics?.value),
        runtimeFailures: parseDenseArrayV1(
          fields.runtimeFailures?.value,
          50,
          input.runtimeFailureSchema,
          "Debug Bundle runtime failures",
        ),
        ...(failure === undefined ? {} : { failure }),
        ...(uiContext === undefined ? {} : { uiContext }),
      }) as DebugBundleEnvelopeV1<
        TProvenance,
        TCapabilities,
        TSimulationLineage,
        TSnapshot,
        TCommandLogEntry,
        TDiagnostics,
        TRuntimeFailure,
        TFailure,
        TUiContext
      >;
    },
  });
}

export const runtimeOperationFaultSchemaV1: RuntimeSchemaV1<RuntimeOperationFaultV1> =
  Object.freeze({
    parse(value: unknown) {
      if (value === null || typeof value !== "object") throw new TypeError("invalid runtime fault");
      const hasStack = Object.hasOwn(value, "stack");
      const hasCause = Object.hasOwn(value, "cause");
      const fields = exactEnvelopeDescriptorsV1(
        value,
        [
          "occurredAt",
          "operation",
          "message",
          "category",
          "code",
          ...(hasStack ? ["stack"] : []),
          ...(hasCause ? ["cause"] : []),
        ],
        "RuntimeOperationFaultV1",
      );
      const category: unknown = fields.category?.value;
      if (
        category !== "persistence" &&
        category !== "asset_load" &&
        category !== "ui" &&
        category !== "runtime"
      ) {
        throw new TypeError("invalid runtime fault category");
      }
      const code: unknown = fields.code?.value;
      if (typeof code !== "string" || !(codes[category] as ReadonlySet<string>).has(code)) {
        throw new TypeError("invalid runtime fault code");
      }
      let cause: { readonly name: string; readonly message: string } | undefined;
      if (hasCause) {
        const causeFields = exactEnvelopeDescriptorsV1(
          fields.cause?.value,
          ["name", "message"],
          "RuntimeFault cause",
        );
        cause = Object.freeze({
          name: text(causeFields.name?.value, "cause name", 4_096),
          message: text(causeFields.message?.value, "cause message", 4_096),
        });
      }
      const common = {
        occurredAt: parseIsoUtcInstantV1(fields.occurredAt?.value),
        operation: text(fields.operation?.value, "runtime operation", 4_096),
        message: text(fields.message?.value, "runtime message", 65_536),
        ...(hasStack ? { stack: text(fields.stack?.value, "runtime stack", 65_536) } : {}),
        ...(cause === undefined ? {} : { cause }),
      };
      return Object.freeze({ ...common, category, code }) as RuntimeOperationFaultV1;
    },
  });

export const debugBundleJsonLimitsV1 = parseStrictJsonLimitsV1({
  ...saveJsonLimitsV1,
  maxBytes: 20_971_520,
});
