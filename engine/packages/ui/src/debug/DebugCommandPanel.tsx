// SPDX-License-Identifier: MIT
import type { DebugToolsOperationResultV1, DeepReadonly } from "@sillymaker/base";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { Button } from "../primitives/Button.js";

export type DebugCommandOperationResultV1 =
  | { readonly kind: "handled"; readonly message: string }
  | { readonly kind: "rejected"; readonly message: string };

export interface DebugCommandPanelPropsV1<TCommand> {
  readonly fields: ReactNode;
  readonly command: DeepReadonly<TCommand>;
  readonly executeDebugCommand: (
    command: DeepReadonly<TCommand>,
  ) => Promise<DebugToolsOperationResultV1<DebugCommandOperationResultV1>>;
  readonly canExecute: boolean;
  readonly disabledReason: string;
}

type DebugCommandPanelStateV1 =
  | { readonly kind: "idle" | "pending" }
  | { readonly kind: "handled" | "rejected"; readonly message: string }
  | { readonly kind: "capability_disabled" | "failed" };

export function DebugCommandPanelV1<TCommand>(
  props: DebugCommandPanelPropsV1<TCommand>,
): ReactElement {
  const [state, setState] = useState<DebugCommandPanelStateV1>({ kind: "idle" });
  const pendingRef = useRef(false);
  const operationGenerationRef = useRef(0);
  const latestCommandRef = useRef(props.command);
  latestCommandRef.current = props.command;
  const disabledReasonId = useId();

  useEffect(() => {
    operationGenerationRef.current += 1;
    pendingRef.current = false;
    setState({ kind: "idle" });
    return () => {
      operationGenerationRef.current += 1;
      pendingRef.current = false;
    };
  }, [props.executeDebugCommand]);

  useEffect(() => {
    if (!pendingRef.current) setState({ kind: "idle" });
  }, [props.canExecute, props.command]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!props.canExecute || pendingRef.current) return;
    pendingRef.current = true;
    const generation = ++operationGenerationRef.current;
    const submittedCommand = props.command;
    setState({ kind: "pending" });
    try {
      const result = await props.executeDebugCommand(props.command);
      if (generation !== operationGenerationRef.current) return;
      pendingRef.current = false;
      if (!Object.is(submittedCommand, latestCommandRef.current)) {
        setState({ kind: "idle" });
        return;
      }
      if (result.kind === "capability_disabled") {
        setState({ kind: "capability_disabled" });
        return;
      }
      setState({ kind: result.kind, message: result.message });
    } catch {
      if (generation === operationGenerationRef.current) {
        pendingRef.current = false;
        if (!Object.is(submittedCommand, latestCommandRef.current)) {
          setState({ kind: "idle" });
          return;
        }
        setState({ kind: "failed" });
      }
    }
  }

  return (
    <form aria-label="调试命令" onSubmit={(event) => void submit(event)}>
      <div>{props.fields}</div>
      <Button
        aria-describedby={!props.canExecute ? disabledReasonId : undefined}
        disabled={!props.canExecute || state.kind === "pending"}
        type="submit"
      >
        执行调试命令
      </Button>
      {!props.canExecute ? <p id={disabledReasonId}>{props.disabledReason}</p> : null}
      <div aria-live="polite">
        {state.kind === "pending" ? <p>正在执行调试命令</p> : null}
        {state.kind === "handled" ? <p>{state.message}</p> : null}
        {state.kind === "rejected" ? <p role="alert">{state.message}</p> : null}
        {state.kind === "capability_disabled" ? <p>调试工具已关闭</p> : null}
        {state.kind === "failed" ? <p>调试命令执行失败</p> : null}
      </div>
    </form>
  );
}
