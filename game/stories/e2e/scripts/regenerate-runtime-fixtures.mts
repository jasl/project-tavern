// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawn } from "node:child_process";
import { once } from "node:events";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import * as nodeModule from "node:module";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type RuntimeFixtureGenerationCodeV1 =
  | "runtime_fixture_generation.generated"
  | "runtime_fixture_generation.recovered_commit"
  | "runtime_fixture_generation.recovered_rollback";

export type RuntimeFixtureGenerationCheckpointV1 =
  "prepared" | "old-renamed" | "new-renamed" | "swapped-journal";

type RuntimeFixtureTransactionPhaseV1 = "prepared" | "swapped";

interface RuntimeFixtureTransactionJournalV1 {
  readonly formatRevision: 1;
  readonly phase: RuntimeFixtureTransactionPhaseV1;
  readonly hadPrevious: boolean;
  readonly expectedManifestSha256: string;
}

interface RuntimeFixtureSetV1 {
  readonly files: ReadonlyMap<string, Uint8Array>;
  readonly manifestBytes: Uint8Array;
  readonly verificationContext: unknown;
}

interface RuntimeFixtureBuilderModuleV1 {
  readonly runtimeFixturePayloadNamesV1: readonly string[];
  readonly buildRuntimeFixtureSetV1: () => Promise<RuntimeFixtureSetV1>;
}

interface RuntimeFixtureVerifierModuleV1 {
  readonly verifyRuntimeFixtureDirectoryStructureV1: (options: {
    readonly directory: string | URL;
    readonly allowedExtraFileNames?: readonly string[];
  }) => Promise<{
    readonly fileCount: 11;
    readonly payloadCount: 10;
    readonly manifestSha256: string;
  }>;
  readonly verifyRuntimeFixtureDirectoryV1: (options: {
    readonly directory: string | URL;
    readonly verificationContext?: unknown;
    readonly compareWithFixtureSet?: RuntimeFixtureSetV1;
  }) => Promise<{
    readonly fileCount: 11;
    readonly payloadCount: 10;
    readonly manifestSha256: string;
  }>;
}

interface BaseModuleV1 {
  readonly saveJsonLimitsV1: unknown;
  readonly canonicalJsonBytes: (value: unknown) => Uint8Array;
  readonly parseStrictJson: (
    bytes: Uint8Array,
    limits: unknown,
  ) =>
    | { readonly ok: true; readonly value: unknown }
    | { readonly ok: false; readonly error: { readonly code: string } };
}

interface WriterModulesV1 {
  readonly base: BaseModuleV1;
  readonly builder: RuntimeFixtureBuilderModuleV1;
  readonly verifier: RuntimeFixtureVerifierModuleV1;
}

export interface RegenerateRuntimeFixturesOptionsV1 {
  readonly targetDirectory?: string | URL;
  readonly fixtureSet?: RuntimeFixtureSetV1;
  readonly onCheckpoint?: (
    checkpoint: RuntimeFixtureGenerationCheckpointV1,
  ) => void | Promise<void>;
}

export interface RuntimeFixtureGenerationResultV1 {
  readonly code: RuntimeFixtureGenerationCodeV1;
  readonly targetPresent: boolean;
}

interface TransactionPathsV1 {
  readonly parentDirectory: string;
  readonly targetDirectory: string;
  readonly previousDirectory: string;
  readonly journalPath: string;
  readonly nextDirectories: readonly string[];
  readonly malformedNextNames: readonly string[];
  readonly unknownResidueNames: readonly string[];
}

interface PathStateV1 {
  readonly exists: boolean;
  readonly kind: "directory" | "file" | "other" | "absent";
}

type RuntimeFixtureTargetClassificationV1 =
  { readonly kind: "tracked" } | { readonly kind: "custom" };

class RuntimeFixtureGenerationErrorV1 extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "RuntimeFixtureGenerationErrorV1";
    this.code = code;
  }
}

export class RuntimeFixtureGenerationInterruptionV1 extends Error {
  readonly signal: "SIGINT";

  constructor(signal: "SIGINT") {
    super(signal);
    this.name = "RuntimeFixtureGenerationInterruptionV1";
    this.signal = signal;
  }
}

const repositoryRootV1 = resolve(import.meta.dirname, "../../../..");
const trackedRuntimeFixtureDirectoryV1 = resolve(
  import.meta.dirname,
  "../src/test/fixtures/runtime",
);
const previousDirectoryNameV1 = ".runtime-fixtures.previous";
const journalNameV1 = ".runtime-fixtures.transaction.v1.json";
const nextDirectoryPatternV1 = /^\.runtime-fixtures\.next-[1-9][0-9]*$/u;
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const preparedJournalTempNameV1 = ".runtime-fixtures.transaction.prepared.tmp";
const swappedJournalTempNameV1 = ".runtime-fixtures.transaction.swapped.tmp";

let writerModulesPromiseV1: Promise<WriterModulesV1> | undefined;

function installTypeScriptResolverV1(): void {
  type ResolveContextV1 = Readonly<Record<string, unknown>>;
  type SyncNextResolveV1 = (specifier: string, context: ResolveContextV1) => unknown;
  type ModuleApiV1 = {
    readonly registerHooks?: (hooks: {
      readonly resolve: (
        specifier: string,
        context: ResolveContextV1,
        nextResolve: SyncNextResolveV1,
      ) => unknown;
    }) => unknown;
    readonly register?: (specifier: string, parentURL: string) => unknown;
  };
  const moduleApi = nodeModule as unknown as ModuleApiV1;
  if (typeof moduleApi.registerHooks === "function") {
    moduleApi.registerHooks({
      resolve(specifier, context, nextResolve) {
        try {
          return nextResolve(specifier, context);
        } catch (error) {
          if (specifier.endsWith(".js")) {
            return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
          }
          if (specifier.endsWith(".mjs")) {
            return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
          }
          throw error;
        }
      },
    });
    return;
  }
  if (typeof moduleApi.register === "function") {
    const hookSource = [
      "export async function resolve(specifier, context, nextResolve) {",
      "  try {",
      "    return await nextResolve(specifier, context);",
      "  } catch (error) {",
      '    if (specifier.endsWith(".js")) return await nextResolve(`${specifier.slice(0, -3)}.ts`, context);',
      '    if (specifier.endsWith(".mjs")) return await nextResolve(`${specifier.slice(0, -4)}.mts`, context);',
      "    throw error;",
      "  }",
      "}",
    ].join("\n");
    moduleApi.register(`data:text/javascript,${encodeURIComponent(hookSource)}`, import.meta.url);
    return;
  }
  throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.loader_hooks_unavailable");
}

installTypeScriptResolverV1();

async function loadWriterModulesV1(): Promise<WriterModulesV1> {
  writerModulesPromiseV1 ??= Promise.all([
    import("@sillymaker/base") as Promise<unknown>,
    import("./runtime-fixture-builder.mjs") as Promise<unknown>,
    import("./verify-runtime-fixtures.mjs") as Promise<unknown>,
  ]).then(([base, builder, verifier]) =>
    Object.freeze({
      base: base as BaseModuleV1,
      builder: builder as RuntimeFixtureBuilderModuleV1,
      verifier: verifier as RuntimeFixtureVerifierModuleV1,
    }),
  );
  return await writerModulesPromiseV1;
}

function pathFromInputV1(path: string | URL): string {
  return resolve(path instanceof URL ? fileURLToPath(path) : path);
}

async function realpathIfPresentV1(path: string): Promise<string | undefined> {
  try {
    return await realpath(path);
  } catch (error) {
    if (isMissingPathErrorV1(error)) return undefined;
    throw error;
  }
}

async function classifyTargetV1(
  targetDirectory: string,
): Promise<RuntimeFixtureTargetClassificationV1> {
  if (targetDirectory === trackedRuntimeFixtureDirectoryV1) {
    return Object.freeze({ kind: "tracked" as const });
  }
  const requestedParent = dirname(targetDirectory);
  const trackedParent = dirname(trackedRuntimeFixtureDirectoryV1);
  const [requestedParentReal, trackedParentReal] = await Promise.all([
    realpath(requestedParent),
    realpathIfPresentV1(trackedParent),
  ]);
  if (trackedParentReal !== undefined && requestedParentReal === trackedParentReal) {
    const requestedBasename = basename(targetDirectory);
    const trackedBasename = basename(trackedRuntimeFixtureDirectoryV1);
    if (requestedBasename.toLowerCase() === trackedBasename.toLowerCase()) {
      throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.tracked_target_alias");
    }
  }

  const [requestedTargetReal, trackedTargetReal] = await Promise.all([
    realpathIfPresentV1(targetDirectory),
    realpathIfPresentV1(trackedRuntimeFixtureDirectoryV1),
  ]);
  if (
    requestedTargetReal !== undefined &&
    trackedTargetReal !== undefined &&
    requestedTargetReal === trackedTargetReal
  ) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.tracked_target_alias");
  }
  return Object.freeze({ kind: "custom" as const });
}

function isMissingPathErrorV1(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function inspectPathV1(path: string): Promise<PathStateV1> {
  try {
    const stats = await lstat(path);
    if (stats.isDirectory()) return Object.freeze({ exists: true, kind: "directory" });
    if (stats.isFile()) return Object.freeze({ exists: true, kind: "file" });
    return Object.freeze({ exists: true, kind: "other" });
  } catch (error) {
    if (isMissingPathErrorV1(error)) {
      return Object.freeze({ exists: false, kind: "absent" });
    }
    throw error;
  }
}

async function fsyncDirectoryV1(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeDurableFileV1(path: string, bytes: Uint8Array): Promise<void> {
  const handle = await open(path, "wx", 0o666);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function removeAndSyncParentV1(path: string, parentDirectory: string): Promise<void> {
  await rm(path, { recursive: true, force: false });
  await fsyncDirectoryV1(parentDirectory);
}

async function renameAndSyncParentV1(
  from: string,
  to: string,
  parentDirectory: string,
): Promise<void> {
  await rename(from, to);
  await fsyncDirectoryV1(parentDirectory);
}

async function inspectTransactionPathsV1(targetDirectory: string): Promise<TransactionPathsV1> {
  const parentDirectory = dirname(targetDirectory);
  const entries = await readdir(parentDirectory, { withFileTypes: true });
  const nextDirectories: string[] = [];
  const malformedNextNames: string[] = [];
  const unknownResidueNames: string[] = [];
  for (const entry of entries) {
    if (!entry.name.startsWith(".runtime-fixtures.")) continue;
    if (entry.name === previousDirectoryNameV1 || entry.name === journalNameV1) continue;
    if (entry.name.startsWith(".runtime-fixtures.next-")) {
      if (!nextDirectoryPatternV1.test(entry.name) || !entry.isDirectory()) {
        malformedNextNames.push(entry.name);
        continue;
      }
      nextDirectories.push(resolve(parentDirectory, entry.name));
      continue;
    }
    unknownResidueNames.push(entry.name);
  }
  return Object.freeze({
    parentDirectory,
    targetDirectory,
    previousDirectory: resolve(parentDirectory, previousDirectoryNameV1),
    journalPath: resolve(parentDirectory, journalNameV1),
    nextDirectories: Object.freeze(nextDirectories.toSorted()),
    malformedNextNames: Object.freeze(malformedNextNames.toSorted()),
    unknownResidueNames: Object.freeze(unknownResidueNames.toSorted()),
  });
}

function exactObjectFieldsV1(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | undefined {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return undefined;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).toSorted();
  if (keys.length !== expectedKeys.length) return undefined;
  const sortedExpected = [...expectedKeys].toSorted();
  if (keys.some((key, index) => key !== sortedExpected[index])) return undefined;
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return undefined;
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

async function readTransactionJournalV1(
  journalPath: string,
  base: BaseModuleV1,
): Promise<RuntimeFixtureTransactionJournalV1 | undefined> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(journalPath));
  } catch {
    return undefined;
  }
  const parsed = base.parseStrictJson(bytes, base.saveJsonLimitsV1);
  if (!parsed.ok) return undefined;
  const fields = exactObjectFieldsV1(parsed.value, [
    "formatRevision",
    "phase",
    "hadPrevious",
    "expectedManifestSha256",
  ]);
  if (
    fields === undefined ||
    fields.formatRevision !== 1 ||
    (fields.phase !== "prepared" && fields.phase !== "swapped") ||
    typeof fields.hadPrevious !== "boolean" ||
    typeof fields.expectedManifestSha256 !== "string" ||
    !digestPatternV1.test(fields.expectedManifestSha256)
  ) {
    return undefined;
  }
  const journal = Object.freeze({
    formatRevision: 1,
    phase: fields.phase,
    hadPrevious: fields.hadPrevious,
    expectedManifestSha256: fields.expectedManifestSha256,
  });
  if (!Buffer.from(bytes).equals(Buffer.from(base.canonicalJsonBytes(journal)))) {
    return undefined;
  }
  return journal;
}

function ambiguousRecoveryV1(): never {
  throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.recovery_ambiguous");
}

async function verifyDirectoryStructureV1(
  directory: string,
  verifier: RuntimeFixtureVerifierModuleV1,
  allowedExtraFileNames: readonly string[] = Object.freeze([]),
): Promise<{ readonly valid: boolean; readonly manifestSha256?: string }> {
  try {
    const result = await verifier.verifyRuntimeFixtureDirectoryStructureV1({
      directory,
      ...(allowedExtraFileNames.length === 0 ? {} : { allowedExtraFileNames }),
    });
    return Object.freeze({ valid: true, manifestSha256: result.manifestSha256 });
  } catch {
    return Object.freeze({ valid: false });
  }
}

async function verifyPreparedCandidateV1(
  directory: string,
  journal: RuntimeFixtureTransactionJournalV1,
  modules: WriterModulesV1,
): Promise<boolean> {
  const [structure, swappedJournal] = await Promise.all([
    verifyDirectoryStructureV1(
      directory,
      modules.verifier,
      Object.freeze([swappedJournalTempNameV1]),
    ),
    readTransactionJournalV1(resolve(directory, swappedJournalTempNameV1), modules.base),
  ]);
  return (
    structure.valid &&
    structure.manifestSha256 === journal.expectedManifestSha256 &&
    swappedJournal?.phase === "swapped" &&
    swappedJournal.hadPrevious === journal.hadPrevious &&
    swappedJournal.expectedManifestSha256 === journal.expectedManifestSha256
  );
}

async function finishRecoveryV1(
  code: Exclude<RuntimeFixtureGenerationCodeV1, "runtime_fixture_generation.generated">,
  targetDirectory: string,
): Promise<RuntimeFixtureGenerationResultV1> {
  const state = await inspectPathV1(targetDirectory);
  return Object.freeze({ code, targetPresent: state.kind === "directory" });
}

async function recoverPreparedTransactionV1(
  paths: TransactionPathsV1,
  journal: RuntimeFixtureTransactionJournalV1,
  modules: WriterModulesV1,
): Promise<RuntimeFixtureGenerationResultV1> {
  const [target, previous] = await Promise.all([
    inspectPathV1(paths.targetDirectory),
    inspectPathV1(paths.previousDirectory),
  ]);
  const nextDirectory = paths.nextDirectories[0];

  if (!journal.hadPrevious) {
    if (previous.exists) return ambiguousRecoveryV1();
    const preparedTopology = target.kind === "absent" && nextDirectory !== undefined;
    const renamedTopology = target.kind === "directory" && nextDirectory === undefined;
    if (!preparedTopology && !renamedTopology) return ambiguousRecoveryV1();
    const candidateDirectory = preparedTopology ? nextDirectory : paths.targetDirectory;
    if (
      candidateDirectory === undefined ||
      !(await verifyPreparedCandidateV1(candidateDirectory, journal, modules))
    ) {
      return ambiguousRecoveryV1();
    }
    if (target.exists) {
      await removeAndSyncParentV1(paths.targetDirectory, paths.parentDirectory);
    }
    if (nextDirectory !== undefined) {
      await removeAndSyncParentV1(nextDirectory, paths.parentDirectory);
    }
    await removeAndSyncParentV1(paths.journalPath, paths.parentDirectory);
    return await finishRecoveryV1(
      "runtime_fixture_generation.recovered_rollback",
      paths.targetDirectory,
    );
  }

  const beforeOldRename =
    target.kind === "directory" && previous.kind === "absent" && nextDirectory !== undefined;
  const afterOldRename =
    target.kind === "absent" && previous.kind === "directory" && nextDirectory !== undefined;
  const afterNewRename =
    target.kind === "directory" && previous.kind === "directory" && nextDirectory === undefined;
  if (!beforeOldRename && !afterOldRename && !afterNewRename) return ambiguousRecoveryV1();

  const candidateDirectory = afterNewRename ? paths.targetDirectory : nextDirectory;
  if (
    candidateDirectory === undefined ||
    !(await verifyPreparedCandidateV1(candidateDirectory, journal, modules))
  ) {
    return ambiguousRecoveryV1();
  }

  if (beforeOldRename) {
    const targetVerification = await verifyDirectoryStructureV1(
      paths.targetDirectory,
      modules.verifier,
    );
    if (!targetVerification.valid || nextDirectory === undefined) return ambiguousRecoveryV1();
    await removeAndSyncParentV1(nextDirectory, paths.parentDirectory);
    await removeAndSyncParentV1(paths.journalPath, paths.parentDirectory);
    return await finishRecoveryV1(
      "runtime_fixture_generation.recovered_rollback",
      paths.targetDirectory,
    );
  }

  const previousVerification = await verifyDirectoryStructureV1(
    paths.previousDirectory,
    modules.verifier,
  );
  if (!previousVerification.valid) return ambiguousRecoveryV1();

  if (afterOldRename) {
    if (nextDirectory === undefined) return ambiguousRecoveryV1();
    await removeAndSyncParentV1(nextDirectory, paths.parentDirectory);
  } else {
    await removeAndSyncParentV1(paths.targetDirectory, paths.parentDirectory);
  }
  await renameAndSyncParentV1(
    paths.previousDirectory,
    paths.targetDirectory,
    paths.parentDirectory,
  );
  await removeAndSyncParentV1(paths.journalPath, paths.parentDirectory);
  return await finishRecoveryV1(
    "runtime_fixture_generation.recovered_rollback",
    paths.targetDirectory,
  );
}

async function recoverSwappedTransactionV1(
  paths: TransactionPathsV1,
  journal: RuntimeFixtureTransactionJournalV1,
  modules: WriterModulesV1,
): Promise<RuntimeFixtureGenerationResultV1> {
  if (paths.nextDirectories.length !== 0) return ambiguousRecoveryV1();
  const [target, previous] = await Promise.all([
    inspectPathV1(paths.targetDirectory),
    inspectPathV1(paths.previousDirectory),
  ]);
  if (
    (target.exists && target.kind !== "directory") ||
    (previous.exists && previous.kind !== "directory") ||
    (!journal.hadPrevious && previous.exists)
  ) {
    return ambiguousRecoveryV1();
  }
  let previousVerified = false;
  if (previous.kind === "directory") {
    previousVerified = (await verifyDirectoryStructureV1(paths.previousDirectory, modules.verifier))
      .valid;
    if (!previousVerified) return ambiguousRecoveryV1();
  }
  const targetVerification =
    target.kind === "directory"
      ? await verifyDirectoryStructureV1(paths.targetDirectory, modules.verifier)
      : Object.freeze({ valid: false });
  const targetIsExpected =
    targetVerification.valid &&
    targetVerification.manifestSha256 === journal.expectedManifestSha256;

  if (targetIsExpected) {
    if (previous.kind === "directory") {
      await removeAndSyncParentV1(paths.previousDirectory, paths.parentDirectory);
    }
    await removeAndSyncParentV1(paths.journalPath, paths.parentDirectory);
    return await finishRecoveryV1(
      "runtime_fixture_generation.recovered_commit",
      paths.targetDirectory,
    );
  }

  if (journal.hadPrevious) {
    if (!previousVerified) return ambiguousRecoveryV1();
    if (target.exists) {
      await removeAndSyncParentV1(paths.targetDirectory, paths.parentDirectory);
    }
    await renameAndSyncParentV1(
      paths.previousDirectory,
      paths.targetDirectory,
      paths.parentDirectory,
    );
  } else if (target.exists) {
    await removeAndSyncParentV1(paths.targetDirectory, paths.parentDirectory);
  }
  await removeAndSyncParentV1(paths.journalPath, paths.parentDirectory);
  return await finishRecoveryV1(
    "runtime_fixture_generation.recovered_rollback",
    paths.targetDirectory,
  );
}

async function recoverTransactionV1(
  targetDirectory: string,
  modules: WriterModulesV1,
): Promise<RuntimeFixtureGenerationResultV1 | undefined> {
  const paths = await inspectTransactionPathsV1(targetDirectory);
  const [journalState, previousState] = await Promise.all([
    inspectPathV1(paths.journalPath),
    inspectPathV1(paths.previousDirectory),
  ]);
  if (
    paths.malformedNextNames.length !== 0 ||
    paths.unknownResidueNames.length !== 0 ||
    paths.nextDirectories.length > 1
  ) {
    return ambiguousRecoveryV1();
  }
  if (!journalState.exists) {
    if (previousState.exists) return ambiguousRecoveryV1();
    const orphanNext = paths.nextDirectories[0];
    if (orphanNext === undefined) return undefined;
    const targetState = await inspectPathV1(paths.targetDirectory);
    if (targetState.exists) {
      if (targetState.kind !== "directory") return ambiguousRecoveryV1();
      const targetVerification = await verifyDirectoryStructureV1(
        paths.targetDirectory,
        modules.verifier,
      );
      if (!targetVerification.valid) return ambiguousRecoveryV1();
    }
    await removeAndSyncParentV1(orphanNext, paths.parentDirectory);
    return await finishRecoveryV1("runtime_fixture_generation.recovered_rollback", targetDirectory);
  }
  if (journalState.kind !== "file") return ambiguousRecoveryV1();
  if (previousState.exists && previousState.kind !== "directory") return ambiguousRecoveryV1();
  const journal = await readTransactionJournalV1(paths.journalPath, modules.base);
  if (journal === undefined) return ambiguousRecoveryV1();
  if (journal.phase === "prepared") {
    return await recoverPreparedTransactionV1(paths, journal, modules);
  }
  return await recoverSwappedTransactionV1(paths, journal, modules);
}

async function readStreamV1(stream: NodeJS.ReadableStream): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function assertTrackedTargetCleanV1(
  classification: RuntimeFixtureTargetClassificationV1,
): Promise<void> {
  if (classification.kind !== "tracked") return;
  const relativeTarget = relative(repositoryRootV1, trackedRuntimeFixtureDirectoryV1);
  if (relativeTarget.startsWith("..")) {
    throw new RuntimeFixtureGenerationErrorV1(
      "runtime_fixture_generation.target_outside_repository",
    );
  }
  const child = spawn(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", relativeTarget],
    {
      cwd: repositoryRootV1,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (child.stdout === null || child.stderr === null) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.git_status_failed");
  }
  const [close, stdout, stderr] = await Promise.all([
    once(child, "close"),
    readStreamV1(child.stdout),
    readStreamV1(child.stderr),
  ]);
  const [exitCode, signal] = close;
  if (exitCode !== 0 || signal !== null) {
    throw new RuntimeFixtureGenerationErrorV1(
      "runtime_fixture_generation.git_status_failed",
      `runtime_fixture_generation.git_status_failed: ${Buffer.from(stderr).toString("utf8")}`,
    );
  }
  if (stdout.byteLength !== 0) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.target_not_clean");
  }
}

function normalizeFixtureSetV1(
  fixtureSet: RuntimeFixtureSetV1,
  payloadNames: readonly string[],
): RuntimeFixtureSetV1 {
  if (!(fixtureSet.files instanceof Map) || !(fixtureSet.manifestBytes instanceof Uint8Array)) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.invalid_fixture_set");
  }
  const expectedNames = [...payloadNames, "manifest.v1.json"].toSorted();
  const names = [...fixtureSet.files.keys()].toSorted();
  if (
    names.length !== expectedNames.length ||
    names.some((name, index) => name !== expectedNames[index])
  ) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.invalid_fixture_set");
  }
  const files = new Map<string, Uint8Array>();
  for (const name of expectedNames) {
    const bytes = fixtureSet.files.get(name);
    if (!(bytes instanceof Uint8Array)) {
      throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.invalid_fixture_set");
    }
    files.set(name, new Uint8Array(bytes));
  }
  const manifestBytes = files.get("manifest.v1.json");
  if (
    manifestBytes === undefined ||
    !Buffer.from(manifestBytes).equals(Buffer.from(fixtureSet.manifestBytes))
  ) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.invalid_fixture_set");
  }
  return Object.freeze({
    ...fixtureSet,
    files,
    manifestBytes: new Uint8Array(manifestBytes),
  });
}

async function assertExistingTargetValidV1(
  targetDirectory: string,
  verifier: RuntimeFixtureVerifierModuleV1,
): Promise<boolean> {
  const target = await inspectPathV1(targetDirectory);
  if (!target.exists) return false;
  if (target.kind !== "directory") {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.target_invalid");
  }
  const verified = await verifyDirectoryStructureV1(targetDirectory, verifier);
  if (!verified.valid) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.target_invalid");
  }
  return true;
}

async function publishJournalV1(
  sourcePath: string,
  sourceDirectory: string,
  journalPath: string,
  parentDirectory: string,
): Promise<void> {
  await rename(sourcePath, journalPath);
  await fsyncDirectoryV1(sourceDirectory);
  await fsyncDirectoryV1(parentDirectory);
}

async function invokeCheckpointV1(
  checkpoint: RuntimeFixtureGenerationCheckpointV1,
  onCheckpoint: RegenerateRuntimeFixturesOptionsV1["onCheckpoint"],
): Promise<void> {
  await onCheckpoint?.(checkpoint);
}

export async function regenerateRuntimeFixturesV1(
  options: RegenerateRuntimeFixturesOptionsV1 = {},
): Promise<RuntimeFixtureGenerationResultV1> {
  const targetDirectory = pathFromInputV1(
    options.targetDirectory ?? trackedRuntimeFixtureDirectoryV1,
  );
  const hasTestSeam = options.fixtureSet !== undefined || options.onCheckpoint !== undefined;
  if (targetDirectory === trackedRuntimeFixtureDirectoryV1 && hasTestSeam) {
    throw new RuntimeFixtureGenerationErrorV1(
      "runtime_fixture_generation.tracked_target_test_seam_forbidden",
    );
  }
  if (
    targetDirectory !== trackedRuntimeFixtureDirectoryV1 &&
    dirname(targetDirectory) === dirname(trackedRuntimeFixtureDirectoryV1) &&
    basename(targetDirectory).toLowerCase() ===
      basename(trackedRuntimeFixtureDirectoryV1).toLowerCase()
  ) {
    throw new RuntimeFixtureGenerationErrorV1("runtime_fixture_generation.tracked_target_alias");
  }
  const parentDirectory = dirname(targetDirectory);
  await mkdir(parentDirectory, { recursive: true });
  const targetClassification = await classifyTargetV1(targetDirectory);
  if (targetClassification.kind === "tracked" && hasTestSeam) {
    throw new RuntimeFixtureGenerationErrorV1(
      "runtime_fixture_generation.tracked_target_test_seam_forbidden",
    );
  }
  const modules = await loadWriterModulesV1();

  const recovered = await recoverTransactionV1(targetDirectory, modules);
  if (recovered !== undefined) return recovered;

  await assertTrackedTargetCleanV1(targetClassification);
  const builtFixtureSet = options.fixtureSet ?? (await modules.builder.buildRuntimeFixtureSetV1());
  const fixtureSet = normalizeFixtureSetV1(
    builtFixtureSet,
    modules.builder.runtimeFixturePayloadNamesV1,
  );
  const hadPrevious = await assertExistingTargetValidV1(targetDirectory, modules.verifier);

  const nextDirectory = resolve(parentDirectory, `.runtime-fixtures.next-${process.pid}`);
  const previousDirectory = resolve(parentDirectory, previousDirectoryNameV1);
  const journalPath = resolve(parentDirectory, journalNameV1);
  const preparedJournalTemp = resolve(nextDirectory, preparedJournalTempNameV1);
  const swappedJournalTemp = resolve(nextDirectory, swappedJournalTempNameV1);
  let journalPublished = false;

  try {
    await mkdir(nextDirectory, { recursive: false });
    for (const [name, bytes] of fixtureSet.files) {
      await writeDurableFileV1(resolve(nextDirectory, name), bytes);
    }
    await fsyncDirectoryV1(nextDirectory);
    const verifiedNext = await modules.verifier.verifyRuntimeFixtureDirectoryV1({
      directory: nextDirectory,
      verificationContext: fixtureSet.verificationContext,
      compareWithFixtureSet: fixtureSet,
    });
    const preparedJournal: RuntimeFixtureTransactionJournalV1 = Object.freeze({
      formatRevision: 1,
      phase: "prepared",
      hadPrevious,
      expectedManifestSha256: verifiedNext.manifestSha256,
    });
    const swappedJournal: RuntimeFixtureTransactionJournalV1 = Object.freeze({
      ...preparedJournal,
      phase: "swapped",
    });
    await writeDurableFileV1(preparedJournalTemp, modules.base.canonicalJsonBytes(preparedJournal));
    await writeDurableFileV1(swappedJournalTemp, modules.base.canonicalJsonBytes(swappedJournal));
    await fsyncDirectoryV1(nextDirectory);
    await rename(preparedJournalTemp, journalPath);
    journalPublished = true;
    await fsyncDirectoryV1(nextDirectory);
    await fsyncDirectoryV1(parentDirectory);
    await invokeCheckpointV1("prepared", options.onCheckpoint);

    if (hadPrevious) {
      await renameAndSyncParentV1(targetDirectory, previousDirectory, parentDirectory);
      await invokeCheckpointV1("old-renamed", options.onCheckpoint);
    }
    await renameAndSyncParentV1(nextDirectory, targetDirectory, parentDirectory);
    await invokeCheckpointV1("new-renamed", options.onCheckpoint);

    await publishJournalV1(
      resolve(targetDirectory, swappedJournalTempNameV1),
      targetDirectory,
      journalPath,
      parentDirectory,
    );
    await invokeCheckpointV1("swapped-journal", options.onCheckpoint);

    const verifiedTarget = await modules.verifier.verifyRuntimeFixtureDirectoryV1({
      directory: targetDirectory,
      verificationContext: fixtureSet.verificationContext,
      compareWithFixtureSet: fixtureSet,
    });
    if (verifiedTarget.manifestSha256 !== verifiedNext.manifestSha256) {
      throw new RuntimeFixtureGenerationErrorV1(
        "runtime_fixture_generation.target_manifest_mismatch",
      );
    }
    if (hadPrevious) {
      await removeAndSyncParentV1(previousDirectory, parentDirectory);
    }
    await removeAndSyncParentV1(journalPath, parentDirectory);
    return Object.freeze({
      code: "runtime_fixture_generation.generated",
      targetPresent: true,
    });
  } catch (error) {
    if (!journalPublished && (await inspectPathV1(nextDirectory)).exists) {
      await removeAndSyncParentV1(nextDirectory, parentDirectory);
    }
    throw error;
  }
}

function parseCheckpointV1(
  value: string | undefined,
): RuntimeFixtureGenerationCheckpointV1 | undefined {
  if (value === undefined) return undefined;
  if (
    value === "prepared" ||
    value === "old-renamed" ||
    value === "new-renamed" ||
    value === "swapped-journal"
  ) {
    return value;
  }
  throw new TypeError(`invalid runtime fixture checkpoint: ${value}`);
}

function parseCliOptionsV1(args: readonly string[]): {
  readonly targetDirectory?: string;
  readonly testCheckpoint?: RuntimeFixtureGenerationCheckpointV1;
} {
  let targetDirectory: string | undefined;
  let testCheckpoint = parseCheckpointV1(
    process.env.PROJECT_TAVERN_RUNTIME_FIXTURE_TEST_CHECKPOINT,
  );
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--target-directory") {
      const value = args[index + 1];
      if (value === undefined) throw new TypeError("missing --target-directory value");
      targetDirectory = value;
      index += 1;
      continue;
    }
    if (argument === "--test-checkpoint") {
      const value = args[index + 1];
      if (value === undefined) throw new TypeError("missing --test-checkpoint value");
      testCheckpoint = parseCheckpointV1(value);
      index += 1;
      continue;
    }
    throw new TypeError(`unknown argument: ${argument}`);
  }
  return Object.freeze({
    ...(targetDirectory === undefined ? {} : { targetDirectory }),
    ...(testCheckpoint === undefined ? {} : { testCheckpoint }),
  });
}

async function waitForInjectedSigintV1(
  checkpoint: RuntimeFixtureGenerationCheckpointV1,
): Promise<never> {
  if (process.send !== undefined) {
    await new Promise<void>((resolveReady, rejectReady) => {
      process.send?.(
        Object.freeze({
          kind: "runtime_fixture_generation.checkpoint",
          checkpoint,
        }),
        (error) => {
          if (error === null) resolveReady();
          else rejectReady(error);
        },
      );
    });
  }
  process.stdout.write(`runtime_fixture_generation.checkpoint:${checkpoint}\n`);
  return await new Promise<never>(() => {
    setInterval(() => undefined, 60_000);
  });
}

async function runCliV1(): Promise<void> {
  const cli = parseCliOptionsV1(process.argv.slice(2));
  const result = await regenerateRuntimeFixturesV1({
    ...(cli.targetDirectory === undefined ? {} : { targetDirectory: cli.targetDirectory }),
    ...(cli.testCheckpoint === undefined
      ? {}
      : {
          async onCheckpoint(checkpoint: RuntimeFixtureGenerationCheckpointV1): Promise<void> {
            if (checkpoint === cli.testCheckpoint) await waitForInjectedSigintV1(checkpoint);
          },
        }),
  });
  console.log(`${result.code} (${result.targetPresent ? "target-present" : "target-absent"})`);
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainV1) {
  try {
    await runCliV1();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
