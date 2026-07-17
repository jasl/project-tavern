// SPDX-License-Identifier: MIT
import type {
  DebugToolsOperationResultV1,
  DebugUiContextUseClassificationV1,
} from "@sillymaker/base";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/Button.js";

export interface DiagnosticTextEntryV1 {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface DiagnosticInspectorEntriesV1 {
  readonly kind: "diagnostics";
  readonly entries: readonly DiagnosticTextEntryV1[];
}

export type DiagnosticInspectorQueryResultV1 =
  DebugToolsOperationResultV1<DiagnosticInspectorEntriesV1>;

export interface DiagnosticInspectorPropsV1 {
  readonly queryDiagnostics: () => Promise<DiagnosticInspectorQueryResultV1>;
  readonly classification: DebugUiContextUseClassificationV1;
  readonly onRestore?: () => void | Promise<void>;
}

type DiagnosticQueryStateV1 =
  | { readonly kind: "idle" | "loading" }
  | { readonly kind: "ready"; readonly entries: readonly DiagnosticTextEntryV1[] }
  | { readonly kind: "capability_disabled" | "query_failed" };

type DiagnosticRestoreStateV1 = {
  readonly kind: "idle" | "restoring" | "restored" | "restore_failed";
};

const diagnosticOnlyReasonTextV1 = Object.freeze({
  story_identity_mismatch: "Story 身份不匹配",
  presentation_identity_mismatch: "呈现身份不匹配",
  application_identity_mismatch: "应用构建身份不匹配",
} satisfies Record<
  Extract<
    DebugUiContextUseClassificationV1,
    { readonly kind: "diagnostic_only" }
  >["reasons"][number],
  string
>);

export function DiagnosticInspectorV1(props: DiagnosticInspectorPropsV1): ReactElement {
  const [queryState, setQueryState] = useState<DiagnosticQueryStateV1>({ kind: "idle" });
  const [restoreState, setRestoreState] = useState<DiagnosticRestoreStateV1>({ kind: "idle" });
  const queryGenerationRef = useRef(0);
  const restoreGenerationRef = useRef(0);
  const queryPendingRef = useRef(false);
  const restorePendingRef = useRef(false);
  const operationPending = queryState.kind === "loading" || restoreState.kind === "restoring";

  useEffect(() => {
    queryGenerationRef.current += 1;
    queryPendingRef.current = false;
    setQueryState({ kind: "idle" });
    return () => {
      queryGenerationRef.current += 1;
      queryPendingRef.current = false;
    };
  }, [props.queryDiagnostics]);

  useEffect(() => {
    restoreGenerationRef.current += 1;
    restorePendingRef.current = false;
    setRestoreState({ kind: "idle" });
    return () => {
      restoreGenerationRef.current += 1;
      restorePendingRef.current = false;
    };
  }, [props.classification, props.onRestore]);

  async function queryDiagnostics(): Promise<void> {
    if (queryPendingRef.current || restorePendingRef.current) return;
    queryPendingRef.current = true;
    const generation = ++queryGenerationRef.current;
    setQueryState({ kind: "loading" });
    try {
      const result = await props.queryDiagnostics();
      if (generation !== queryGenerationRef.current) return;
      queryPendingRef.current = false;
      if (result.kind === "capability_disabled") {
        setQueryState({ kind: "capability_disabled" });
        return;
      }
      setQueryState({ kind: "ready", entries: Object.freeze([...result.entries]) });
    } catch {
      if (generation === queryGenerationRef.current) {
        queryPendingRef.current = false;
        setQueryState({ kind: "query_failed" });
      }
    }
  }

  async function restore(): Promise<void> {
    if (
      props.classification.kind !== "restorable" ||
      props.onRestore === undefined ||
      queryPendingRef.current ||
      restorePendingRef.current
    ) {
      return;
    }
    restorePendingRef.current = true;
    const generation = ++restoreGenerationRef.current;
    setRestoreState({ kind: "restoring" });
    try {
      await props.onRestore();
      if (generation !== restoreGenerationRef.current) return;
      restorePendingRef.current = false;
      setRestoreState({ kind: "restored" });
    } catch {
      if (generation === restoreGenerationRef.current) {
        restorePendingRef.current = false;
        setRestoreState({ kind: "restore_failed" });
      }
    }
  }

  return (
    <section aria-label="诊断检查器" onClick={(event) => event.stopPropagation()}>
      <header>
        <h3>诊断</h3>
        <Button disabled={operationPending} onClick={() => void queryDiagnostics()}>
          诊断摘要
        </Button>
      </header>

      {props.classification.kind === "diagnostic_only" ? (
        <div role="note">
          <p>此呈现上下文仅可用于诊断，不能恢复。</p>
          <ul aria-label="不能恢复的原因">
            {props.classification.reasons.map((reason) => (
              <li key={reason}>{diagnosticOnlyReasonTextV1[reason]}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {props.classification.kind === "restorable" && props.onRestore !== undefined ? (
        <Button disabled={operationPending} onClick={() => void restore()}>
          恢复界面状态
        </Button>
      ) : null}

      {queryState.kind === "loading" ? <p role="status">正在读取诊断摘要</p> : null}
      {queryState.kind === "ready" && queryState.entries.length === 0 ? (
        <p role="status">没有诊断信息</p>
      ) : null}
      {queryState.kind === "ready" && queryState.entries.length > 0 ? (
        <ul aria-label="诊断摘要">
          {queryState.entries.map((entry, index) => (
            <li key={`${entry.id}:${index}`}>{`${entry.label}：${entry.value}`}</li>
          ))}
        </ul>
      ) : null}
      <div aria-live="polite">
        {queryState.kind === "capability_disabled" ? <p>调试工具已关闭</p> : null}
        {queryState.kind === "query_failed" ? <p>无法读取诊断摘要</p> : null}
        {restoreState.kind === "restoring" ? <p>正在恢复界面状态</p> : null}
        {restoreState.kind === "restored" ? <p>界面状态已恢复</p> : null}
        {restoreState.kind === "restore_failed" ? <p>无法恢复界面状态</p> : null}
      </div>
    </section>
  );
}
