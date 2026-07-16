// SPDX-License-Identifier: MIT
import { Component, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import type { InputRouterV1 } from "../input/contracts.js";
import { RuntimeFailureDialogV1 } from "./runtime-failure-dialog.js";
import type {
  RuntimeFailureDialogActionsV1,
  RuntimeFailureDialogPropsV1,
} from "./runtime-failure-dialog.js";

export type RootErrorBoundaryFailureDialogV1 = Omit<
  RuntimeFailureDialogPropsV1,
  "actions" | "inputRouter"
>;

export type RootErrorBoundaryRecoveryActionsV1 = Omit<RuntimeFailureDialogActionsV1, "retry">;

export interface RootErrorBoundaryPropsV1 {
  readonly children: ReactNode;
  readonly inputRouter: InputRouterV1;
  readonly reportFailure: (error: unknown) => void;
  readonly failureDialog: RootErrorBoundaryFailureDialogV1;
  readonly recoveryActions: RootErrorBoundaryRecoveryActionsV1;
  readonly renderFailure?: (dialog: ReactElement) => ReactNode;
}

interface RootErrorBoundaryStateV1 {
  readonly failed: boolean;
  readonly subtreeGeneration: number;
}

const initialRootErrorBoundaryStateV1 = Object.freeze({
  failed: false,
  subtreeGeneration: 0,
}) satisfies RootErrorBoundaryStateV1;

/** Converts React render/lifecycle faults into one bounded application recovery surface. */
export class RootErrorBoundaryV1 extends Component<
  RootErrorBoundaryPropsV1,
  RootErrorBoundaryStateV1
> {
  state: RootErrorBoundaryStateV1 = initialRootErrorBoundaryStateV1;

  private reportedCurrentFailure = false;

  static getDerivedStateFromError(_error: unknown): Partial<RootErrorBoundaryStateV1> {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    if (this.reportedCurrentFailure) return;
    this.reportedCurrentFailure = true;
    try {
      this.props.reportFailure(error);
    } catch {
      // Runtime-failure reporting is diagnostic-only and must not replace the recovery surface.
    }
  }

  private readonly retry = (): void => {
    this.reportedCurrentFailure = false;
    this.setState((current) => ({
      failed: false,
      subtreeGeneration: current.subtreeGeneration + 1,
    }));
  };

  render(): ReactNode {
    if (!this.state.failed) {
      return <Fragment key={this.state.subtreeGeneration}>{this.props.children}</Fragment>;
    }

    const dialog = (
      <RuntimeFailureDialogV1
        {...this.props.failureDialog}
        inputRouter={this.props.inputRouter}
        actions={Object.freeze({
          retry: this.retry,
          reloadApplication: this.props.recoveryActions.reloadApplication,
          requestExit: this.props.recoveryActions.requestExit,
        })}
      />
    );
    return this.props.renderFailure === undefined ? dialog : this.props.renderFailure(dialog);
  }
}
