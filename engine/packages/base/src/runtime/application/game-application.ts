// SPDX-License-Identifier: MIT
import type { DebugToolsPortV1, GameApplicationPortV1 } from "../../contracts/application.js";

export function createGameApplicationV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools,
>(
  input: GameApplicationPortV1<
    TSemantic,
    TLifecycle,
    TPersistence,
    TDiagnostics,
    TCapabilities,
    TDebugTools
  >,
): GameApplicationPortV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools
> {
  return Object.freeze({
    semantic: input.semantic,
    lifecycle: input.lifecycle,
    persistence: input.persistence,
    diagnostics: input.diagnostics,
    capabilities: input.capabilities,
    debugTools: input.debugTools,
  });
}

export function createCapabilityDisabledDebugToolsPortV1<
  TDebugCommand = never,
  TDebugResult = never,
  TFixtureId = never,
  TAnchorResult = never,
  TDebugInspection = never,
  TAuthoritativeReplayResult = never,
  TBestEffortReplayInspection = never,
  TDiagnosticQuery = never,
  TDiagnosticQueryResult = never,
>(): DebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult
> {
  const disabled = Object.freeze({ kind: "capability_disabled" as const });
  return Object.freeze({
    listFixtures: async () => disabled,
    executeDebugCommand: async () => disabled,
    anchorFixture: async () => disabled,
    inspectDebugBundle: async () => disabled,
    anchorDebugBundle: async () => disabled,
    replayAuthoritatively: async () => disabled,
    inspectReplayBestEffort: async () => disabled,
    queryDiagnostics: async () => disabled,
  });
}
