// SPDX-License-Identifier: MIT
import type { RuntimeSessionStatusV1 } from "@sillymaker/base";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/Button.js";

export interface DiagnosticExportPortV1<TExportResult> {
  exportDebugBundle(): Promise<TExportResult>;
}

export interface DiagnosticExportButtonPropsV1<TExportResult> {
  readonly diagnostics: DiagnosticExportPortV1<TExportResult>;
  readonly sessionStatus: RuntimeSessionStatusV1;
  readonly label: string;
  readonly pendingText: string;
  readonly completedText: string;
  readonly failedText: string;
}

type DiagnosticExportStateV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "pending" }
  | { readonly kind: "completed" }
  | {
      readonly kind: "failed";
      readonly code: "ui.event_handler_failed";
    };

const idleStateV1 = Object.freeze({ kind: "idle" as const });
const pendingStateV1 = Object.freeze({ kind: "pending" as const });
const completedStateV1 = Object.freeze({ kind: "completed" as const });
const failedStateV1 = Object.freeze({
  kind: "failed" as const,
  code: "ui.event_handler_failed" as const,
}) satisfies DiagnosticExportStateV1;

function statusTextV1<TExportResult>(
  state: DiagnosticExportStateV1,
  props: DiagnosticExportButtonPropsV1<TExportResult>,
): string {
  switch (state.kind) {
    case "idle":
      return "";
    case "pending":
      return props.pendingText;
    case "completed":
      return props.completedText;
    case "failed":
      return props.failedText;
  }
  return state satisfies never;
}

export function DiagnosticExportButtonV1<TExportResult>(
  props: DiagnosticExportButtonPropsV1<TExportResult>,
): ReactElement {
  const statusId = useId();
  const [state, setState] = useState<DiagnosticExportStateV1>(idleStateV1);
  const exportPendingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const exportDiagnostics = async (): Promise<void> => {
    if (exportPendingRef.current) return;
    exportPendingRef.current = true;
    setState(pendingStateV1);
    try {
      await props.diagnostics.exportDebugBundle();
      if (mountedRef.current) setState(completedStateV1);
    } catch {
      if (mountedRef.current) setState(failedStateV1);
    } finally {
      exportPendingRef.current = false;
    }
  };

  const pending = state.kind === "pending";
  return (
    <div data-diagnostic-export-control="true">
      <Button
        aria-busy={pending}
        aria-describedby={statusId}
        data-runtime-session-status={props.sessionStatus}
        disabled={pending}
        onClick={() => void exportDiagnostics()}
      >
        {props.label}
      </Button>
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-diagnostic-export-state={state.kind}
        data-diagnostic-export-failure-code={state.kind === "failed" ? state.code : undefined}
      >
        {statusTextV1(state, props)}
      </span>
    </div>
  );
}
