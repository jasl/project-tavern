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

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
};

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
          name: text(causeFields.name?.value, "cause name"),
          message: text(causeFields.message?.value, "cause message"),
        });
      }
      const common = {
        occurredAt: parseIsoUtcInstantV1(fields.occurredAt?.value),
        operation: text(fields.operation?.value, "runtime operation"),
        message: text(fields.message?.value, "runtime message"),
        ...(hasStack ? { stack: text(fields.stack?.value, "runtime stack") } : {}),
        ...(cause === undefined ? {} : { cause }),
      };
      return Object.freeze({ ...common, category, code }) as RuntimeOperationFaultV1;
    },
  });

export const debugBundleJsonLimitsV1 = parseStrictJsonLimitsV1({
  ...saveJsonLimitsV1,
  maxBytes: 20_971_520,
});
