// SPDX-License-Identifier: MIT
import type { Digest, NonNegativeSafeInteger, RuntimeSessionStatusV1 } from "@sillymaker/base";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/Button.js";

export const diagnosticExportContentCategoryIdsV1 = Object.freeze([
  "provenance",
  "capabilities_and_integrity",
  "replay_evidence",
  "diagnostics_and_runtime_failures",
  "failure_context",
  "ui_context",
] as const);

export type DiagnosticExportContentCategoryIdV1 =
  (typeof diagnosticExportContentCategoryIdsV1)[number];

export interface DiagnosticExportPreviewV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly encodedByteLength: NonNegativeSafeInteger;
  readonly categories: readonly DiagnosticExportContentCategoryIdV1[];
}

export interface DiagnosticExportPortV1 {
  prepareDebugBundle(): Promise<DiagnosticExportPreviewV1>;
  savePreparedDebugBundle(): Promise<void>;
  discardPreparedDebugBundle(): void;
}

export interface DiagnosticExportButtonPropsV1 {
  readonly diagnostics: DiagnosticExportPortV1;
  readonly sessionStatus: RuntimeSessionStatusV1;
  readonly label: string;
  readonly preparingText: string;
  readonly reviewTitle: string;
  readonly filenameLabel: string;
  readonly digestLabel: string;
  readonly encodedByteLengthLabel: string;
  readonly categoriesLabel: string;
  readonly categoryLabels: Readonly<Record<DiagnosticExportContentCategoryIdV1, string>>;
  readonly saveLabel: string;
  readonly cancelLabel: string;
  readonly savingText: string;
  readonly completedText: string;
  readonly failedText: string;
}

type DiagnosticExportStateV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "preparing" }
  | { readonly kind: "review"; readonly preview: DiagnosticExportPreviewV1 }
  | { readonly kind: "saving"; readonly preview: DiagnosticExportPreviewV1 }
  | { readonly kind: "completed" }
  | {
      readonly kind: "prepare_failed";
      readonly code: "ui.event_handler_failed";
    }
  | {
      readonly kind: "save_failed";
      readonly code: "ui.event_handler_failed";
      readonly preview: DiagnosticExportPreviewV1;
    };

const idleStateV1 = Object.freeze({ kind: "idle" as const });
const preparingStateV1 = Object.freeze({ kind: "preparing" as const });
const completedStateV1 = Object.freeze({ kind: "completed" as const });
const prepareFailedStateV1 = Object.freeze({
  kind: "prepare_failed" as const,
  code: "ui.event_handler_failed" as const,
}) satisfies DiagnosticExportStateV1;

function discardPreparedDebugBundleSafelyV1(diagnostics: DiagnosticExportPortV1): void {
  try {
    diagnostics.discardPreparedDebugBundle();
  } catch {
    // Discard is best-effort at this generic UI boundary; Web's concrete port is no-throw.
  }
}

function statusTextV1(
  state: DiagnosticExportStateV1,
  props: DiagnosticExportButtonPropsV1,
): string {
  switch (state.kind) {
    case "idle":
      return "";
    case "preparing":
      return props.preparingText;
    case "review":
      return props.reviewTitle;
    case "saving":
      return props.savingText;
    case "completed":
      return props.completedText;
    case "prepare_failed":
    case "save_failed":
      return props.failedText;
  }
  return state satisfies never;
}

function previewFromStateV1(state: DiagnosticExportStateV1): DiagnosticExportPreviewV1 | null {
  switch (state.kind) {
    case "review":
    case "saving":
    case "save_failed":
      return state.preview;
    case "idle":
    case "preparing":
    case "completed":
    case "prepare_failed":
      return null;
  }
  return state satisfies never;
}

export function DiagnosticExportButtonV1(props: DiagnosticExportButtonPropsV1): ReactElement {
  const statusId = useId();
  const [state, setState] = useState<DiagnosticExportStateV1>(idleStateV1);
  const operationPendingRef = useRef(false);
  const operationEpochRef = useRef(0);
  const mountedRef = useRef(true);
  const currentDiagnosticsRef = useRef(props.diagnostics);
  currentDiagnosticsRef.current = props.diagnostics;

  useEffect(() => {
    mountedRef.current = true;
    operationPendingRef.current = false;
    setState(idleStateV1);
    const diagnostics = props.diagnostics;
    return () => {
      mountedRef.current = false;
      operationPendingRef.current = false;
      operationEpochRef.current += 1;
      discardPreparedDebugBundleSafelyV1(diagnostics);
    };
  }, [props.diagnostics]);

  const prepareDiagnostics = async (): Promise<void> => {
    if (operationPendingRef.current) return;
    operationPendingRef.current = true;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const diagnostics = props.diagnostics;
    setState(preparingStateV1);
    try {
      const preview = await diagnostics.prepareDebugBundle();
      if (
        mountedRef.current &&
        currentDiagnosticsRef.current === diagnostics &&
        operationEpochRef.current === operationEpoch
      ) {
        setState(Object.freeze({ kind: "review" as const, preview }));
      } else {
        discardPreparedDebugBundleSafelyV1(diagnostics);
      }
    } catch {
      discardPreparedDebugBundleSafelyV1(diagnostics);
      if (
        mountedRef.current &&
        currentDiagnosticsRef.current === diagnostics &&
        operationEpochRef.current === operationEpoch
      ) {
        setState(prepareFailedStateV1);
      }
    } finally {
      if (operationEpochRef.current === operationEpoch) operationPendingRef.current = false;
    }
  };

  const saveDiagnostics = async (preview: DiagnosticExportPreviewV1): Promise<void> => {
    if (operationPendingRef.current) return;
    operationPendingRef.current = true;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const diagnostics = props.diagnostics;
    setState(Object.freeze({ kind: "saving" as const, preview }));
    try {
      await diagnostics.savePreparedDebugBundle();
      if (
        mountedRef.current &&
        currentDiagnosticsRef.current === diagnostics &&
        operationEpochRef.current === operationEpoch
      ) {
        setState(completedStateV1);
      }
    } catch {
      if (
        mountedRef.current &&
        currentDiagnosticsRef.current === diagnostics &&
        operationEpochRef.current === operationEpoch
      ) {
        setState(
          Object.freeze({
            kind: "save_failed" as const,
            code: "ui.event_handler_failed" as const,
            preview,
          }),
        );
      }
    } finally {
      if (operationEpochRef.current === operationEpoch) operationPendingRef.current = false;
    }
  };

  const cancelDiagnostics = (): void => {
    if (operationPendingRef.current) return;
    operationEpochRef.current += 1;
    discardPreparedDebugBundleSafelyV1(props.diagnostics);
    setState(idleStateV1);
  };

  const preview = previewFromStateV1(state);
  const preparing = state.kind === "preparing";
  const saving = state.kind === "saving";
  const prepareDisabled = preparing || preview !== null;
  const failed = state.kind === "prepare_failed" || state.kind === "save_failed";

  return (
    <div data-diagnostic-export-control="true">
      <Button
        aria-busy={preparing}
        aria-describedby={statusId}
        data-runtime-session-status={props.sessionStatus}
        disabled={prepareDisabled}
        onClick={() => void prepareDiagnostics()}
      >
        {props.label}
      </Button>
      {preview === null ? null : (
        <section aria-label={props.reviewTitle} data-diagnostic-export-review="true">
          <dl>
            <div>
              <dt>{props.filenameLabel}</dt>
              <dd>{preview.filename}</dd>
            </div>
            <div>
              <dt>{props.digestLabel}</dt>
              <dd>
                <code>{preview.digest}</code>
              </dd>
            </div>
            <div>
              <dt>{props.encodedByteLengthLabel}</dt>
              <dd>{preview.encodedByteLength} B</dd>
            </div>
          </dl>
          <p>{props.categoriesLabel}</p>
          <ul aria-label={props.categoriesLabel}>
            {preview.categories.map((categoryId) => (
              <li key={categoryId}>{props.categoryLabels[categoryId]}</li>
            ))}
          </ul>
          <Button
            aria-busy={saving}
            disabled={saving}
            onClick={() => void saveDiagnostics(preview)}
          >
            {props.saveLabel}
          </Button>
          <Button disabled={saving} onClick={cancelDiagnostics}>
            {props.cancelLabel}
          </Button>
        </section>
      )}
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-diagnostic-export-state={state.kind}
        data-diagnostic-export-failure-code={failed ? state.code : undefined}
      >
        {statusTextV1(state, props)}
      </span>
    </div>
  );
}
