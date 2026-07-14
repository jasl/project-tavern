// SPDX-License-Identifier: MIT
import type {
  DebugToolsOperationResultV1,
  DebugToolsPortV1,
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
} from "../../contracts/application.js";
import type { DeepReadonly, RuntimeSchemaV1 } from "../../contracts/values.js";

type AwaitableV1<T> = T | PromiseLike<T>;

export interface CreateDebugToolsPortInputV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
> {
  readonly capabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  readonly debugCommandSchema: RuntimeSchemaV1<TDebugCommand>;
  debugCommandSchemaFailure(): TDebugResult;
  listFixtures(): AwaitableV1<readonly TFixtureId[]>;
  executeDebugCommand(
    command: DeepReadonly<TDebugCommand>,
    isStillEnabled: () => boolean,
  ): AwaitableV1<DebugToolsOperationResultV1<TDebugResult>>;
  anchorFixture(
    fixtureId: TFixtureId,
    isStillEnabled: () => boolean,
  ): AwaitableV1<DebugToolsOperationResultV1<TAnchorResult>>;
  inspectDebugBundle(bytes: Uint8Array): AwaitableV1<TDebugInspection>;
  anchorDebugBundle(
    bytes: Uint8Array,
    isStillEnabled: () => boolean,
  ): AwaitableV1<DebugToolsOperationResultV1<TAnchorResult>>;
  replayAuthoritatively(bytes: Uint8Array): AwaitableV1<TAuthoritativeReplayResult>;
  inspectReplayBestEffort(bytes: Uint8Array): AwaitableV1<TBestEffortReplayInspection>;
  queryDiagnostics(query: DeepReadonly<TDiagnosticQuery>): AwaitableV1<TDiagnosticQueryResult>;
}

const capabilityDisabledV1 = Object.freeze({ kind: "capability_disabled" as const });

function readCapabilitiesV1(
  source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>,
): DeepReadonly<RuntimeCapabilitiesV1> | null {
  try {
    return source.getCurrent();
  } catch {
    return null;
  }
}

function hasDebugToolsV1(source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>): boolean {
  return readCapabilitiesV1(source)?.debugTools === true;
}

function hasCheatAuthorityV1(source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>): boolean {
  const current = readCapabilitiesV1(source);
  return current?.debugTools === true && current.cheats;
}

function copyUntrustedBytesV1(bytes: Uint8Array): Uint8Array {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("DebugTools bytes must be Uint8Array");
  return new Uint8Array(bytes);
}

export function createDebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
>(
  input: CreateDebugToolsPortInputV1<
    TDebugCommand,
    TDebugResult,
    TFixtureId,
    TAnchorResult,
    TDebugInspection,
    TAuthoritativeReplayResult,
    TBestEffortReplayInspection,
    TDiagnosticQuery,
    TDiagnosticQueryResult
  >,
): DebugToolsPortV1<
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
  const hasDebugTools = () => hasDebugToolsV1(input.capabilities);
  const hasCheatAuthority = () => hasCheatAuthorityV1(input.capabilities);

  return Object.freeze({
    async listFixtures() {
      if (!hasDebugTools()) return capabilityDisabledV1;
      const fixtureIds = await input.listFixtures();
      if (!hasDebugTools()) return capabilityDisabledV1;
      return Object.freeze({
        kind: "listed" as const,
        fixtureIds: Object.freeze([...fixtureIds]),
      });
    },
    async executeDebugCommand(command: DeepReadonly<TDebugCommand>) {
      if (!hasCheatAuthority()) return capabilityDisabledV1;
      let parsed: TDebugCommand;
      try {
        parsed = input.debugCommandSchema.parse(command);
      } catch {
        return input.debugCommandSchemaFailure();
      }
      return await input.executeDebugCommand(
        parsed as DeepReadonly<TDebugCommand>,
        hasCheatAuthority,
      );
    },
    async anchorFixture(fixtureId: TFixtureId) {
      if (!hasCheatAuthority()) return capabilityDisabledV1;
      return await input.anchorFixture(fixtureId, hasCheatAuthority);
    },
    async inspectDebugBundle(bytes: Uint8Array) {
      if (!hasDebugTools()) return capabilityDisabledV1;
      const result = await input.inspectDebugBundle(copyUntrustedBytesV1(bytes));
      return hasDebugTools() ? result : capabilityDisabledV1;
    },
    async anchorDebugBundle(bytes: Uint8Array) {
      if (!hasCheatAuthority()) return capabilityDisabledV1;
      return await input.anchorDebugBundle(copyUntrustedBytesV1(bytes), hasCheatAuthority);
    },
    async replayAuthoritatively(bytes: Uint8Array) {
      if (!hasDebugTools()) return capabilityDisabledV1;
      const result = await input.replayAuthoritatively(copyUntrustedBytesV1(bytes));
      return hasDebugTools() ? result : capabilityDisabledV1;
    },
    async inspectReplayBestEffort(bytes: Uint8Array) {
      if (!hasDebugTools()) return capabilityDisabledV1;
      const result = await input.inspectReplayBestEffort(copyUntrustedBytesV1(bytes));
      return hasDebugTools() ? result : capabilityDisabledV1;
    },
    async queryDiagnostics(query: DeepReadonly<TDiagnosticQuery>) {
      if (!hasDebugTools()) return capabilityDisabledV1;
      const result = await input.queryDiagnostics(query);
      return hasDebugTools() ? result : capabilityDisabledV1;
    },
  });
}
