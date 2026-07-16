// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile, readdir } from "node:fs/promises";
import * as nodeModule from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  RuntimeFixtureClassificationV1,
  RuntimeFixtureIntegrityModeV1,
  RuntimeFixtureManifestEntryV1,
  RuntimeFixtureManifestV1,
  RuntimeFixtureSetV1,
  RuntimeFixtureVerificationContextV1,
} from "./runtime-fixture-builder.mjs";

function installTypeStripResolveHookV1(): void {
  const resolveHook = (
    specifier: string,
    context: unknown,
    nextResolve: (specifier: string, context: unknown) => unknown,
  ): unknown => {
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
  };
  const registerHooks = Reflect.get(nodeModule, "registerHooks") as
    ((hooks: { readonly resolve: typeof resolveHook }) => unknown) | undefined;
  if (typeof registerHooks === "function") {
    registerHooks({ resolve: resolveHook });
    return;
  }
  const hookSource = [
    "export async function resolve(specifier, context, nextResolve) {",
    "  try { return await nextResolve(specifier, context); }",
    "  catch (error) {",
    '    if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);',
    '    if (specifier.endsWith(".mjs")) return nextResolve(`${specifier.slice(0, -4)}.mts`, context);',
    "    throw error;",
    "  }",
    "}",
  ].join("\n");
  nodeModule.register(`data:text/javascript,${encodeURIComponent(hookSource)}`, import.meta.url);
}

installTypeStripResolveHookV1();

let builderModulePromiseV1: Promise<typeof import("./runtime-fixture-builder.mjs")> | undefined;

function loadBuilderV1(): Promise<typeof import("./runtime-fixture-builder.mjs")> {
  builderModulePromiseV1 ??= import("./runtime-fixture-builder.mjs");
  return builderModulePromiseV1;
}

const trackedRuntimeFixtureDirectoryV1 = fileURLToPath(
  new URL("../src/test/fixtures/runtime/", import.meta.url),
);
const runtimeFixtureGeneratorSourceDigestAtGenerationV1 =
  "sha256:c3924bf92b539cd0ca2452946e8b6cd50eec8bccd4bd3ae9bd7837683a273ab1";

type ExactFieldsV1 = Readonly<Record<string, unknown>>;

function exactFieldsV1(value: unknown, keys: readonly string[], label: string): ExactFieldsV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function denseArrayV1<T>(
  value: unknown,
  parse: (entry: unknown, index: number) => T,
  label: string,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > 10_000
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    throw new TypeError(`invalid ${label} entries`);
  }
  return Object.freeze(
    keys.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry`);
      }
      return parse(descriptor.value, index);
    }),
  );
}

function compareBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right));
}

async function loadVerifierModulesV1() {
  const [base, provenance, builder] = await Promise.all([
    import("@sillymaker/base"),
    import("../src/runtime/runtime-fixture-provenance.js"),
    loadBuilderV1(),
  ]);
  return Object.freeze({ base, provenance, builder });
}

async function parseManifestV1(bytes: Uint8Array): Promise<RuntimeFixtureManifestV1> {
  const { base, provenance, builder } = await loadVerifierModulesV1();
  const { runtimeFixturePayloadNamesV1 } = builder;
  const decoded = base.parseStrictJson(bytes, base.saveJsonLimitsV1);
  if (!decoded.ok) {
    throw new TypeError(`runtime fixture manifest Strict JSON failed: ${decoded.error.code}`);
  }
  const fields = exactFieldsV1(
    decoded.value,
    [
      "formatRevision",
      "files",
      "blockingProvenance",
      "diagnosticAtGeneration",
      "generatorSourceDigest",
    ],
    "runtime fixture manifest",
  );
  if (fields.formatRevision !== 1) throw new TypeError("unsupported runtime fixture manifest");
  const allowedClassifications = new Set<RuntimeFixtureClassificationV1>([
    "exact",
    "adopted",
    "compatibility.lineage_limit",
    "digest.state_mismatch",
    "envelope.unsupported_revision",
    "authoritative_replay",
  ]);
  const allowedIntegrityModes = new Set<RuntimeFixtureIntegrityModeV1>(["normal", "modified"]);
  const files = denseArrayV1(
    fields.files,
    (entry) => {
      const file = exactFieldsV1(
        entry,
        ["path", "byteLength", "sha256", "classification", "integrityMode"],
        "runtime fixture manifest entry",
      );
      if (
        typeof file.path !== "string" ||
        !runtimeFixturePayloadNamesV1.includes(
          file.path as (typeof runtimeFixturePayloadNamesV1)[number],
        )
      ) {
        throw new TypeError("invalid runtime fixture manifest path");
      }
      const byteLength = base.parsePositiveSafeInteger(file.byteLength);
      if (
        typeof file.classification !== "string" ||
        !allowedClassifications.has(file.classification as RuntimeFixtureClassificationV1) ||
        typeof file.integrityMode !== "string" ||
        !allowedIntegrityModes.has(file.integrityMode as RuntimeFixtureIntegrityModeV1)
      ) {
        throw new TypeError("invalid runtime fixture manifest classification");
      }
      return Object.freeze({
        path: file.path as (typeof runtimeFixturePayloadNamesV1)[number],
        byteLength,
        sha256: base.parseDigest(file.sha256),
        classification: file.classification as RuntimeFixtureClassificationV1,
        integrityMode: file.integrityMode as RuntimeFixtureIntegrityModeV1,
      }) satisfies RuntimeFixtureManifestEntryV1;
    },
    "runtime fixture manifest files",
  );
  if (
    files.length !== runtimeFixturePayloadNamesV1.length ||
    files.some(({ path }, index) => path !== runtimeFixturePayloadNamesV1[index]) ||
    new Set(files.map(({ path }) => path)).size !== files.length
  ) {
    throw new TypeError("runtime fixture manifest file set is not exact and sorted");
  }
  const frozenProvenance = provenance.parseRuntimeFixtureProvenanceV1({
    formatRevision: 1,
    blocking: fields.blockingProvenance,
    diagnosticAtGeneration: fields.diagnosticAtGeneration,
  });
  const manifest: RuntimeFixtureManifestV1 = Object.freeze({
    formatRevision: 1,
    files,
    blockingProvenance: frozenProvenance.blocking,
    diagnosticAtGeneration: frozenProvenance.diagnosticAtGeneration,
    generatorSourceDigest: base.parseDigest(fields.generatorSourceDigest),
  });
  if (!compareBytesV1(bytes, base.canonicalJsonBytes(manifest))) {
    throw new TypeError("runtime fixture manifest is not canonical JSON");
  }
  return manifest;
}

function directoryPathV1(directory: string | URL): string {
  return directory instanceof URL ? fileURLToPath(directory) : resolve(directory);
}

async function readExactFixtureFilesV1(
  directory: string,
  allowedExtraFileNames: readonly string[] = Object.freeze([]),
): Promise<ReadonlyMap<string, Uint8Array>> {
  const { runtimeFixturePayloadNamesV1 } = await loadBuilderV1();
  const entries = await readdir(directory, { withFileTypes: true });
  const names = entries.map(({ name }) => name).toSorted();
  const fixtureNames = [...runtimeFixturePayloadNamesV1, "manifest.v1.json"].toSorted();
  const extras = [...allowedExtraFileNames].toSorted();
  if (
    new Set(extras).size !== extras.length ||
    extras.some(
      (name) =>
        name.length === 0 ||
        name === "." ||
        name === ".." ||
        name.includes("/") ||
        name.includes("\\") ||
        fixtureNames.includes(name),
    )
  ) {
    throw new TypeError("invalid allowed runtime fixture extra file set");
  }
  const expected = [...fixtureNames, ...extras].toSorted();
  if (
    entries.some((entry) => !entry.isFile()) ||
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index])
  ) {
    throw new TypeError("runtime fixture directory file set is not exact");
  }
  return new Map(
    await Promise.all(
      fixtureNames.map(
        async (name) => [name, new Uint8Array(await readFile(resolve(directory, name)))] as const,
      ),
    ),
  );
}

function assertFixtureSetBytesV1(
  actual: ReadonlyMap<string, Uint8Array>,
  expected: RuntimeFixtureSetV1,
): void {
  if (actual.size !== expected.files.size) {
    throw new TypeError("runtime fixture directory differs from deterministic builder");
  }
  for (const [path, expectedBytes] of expected.files) {
    const actualBytes = actual.get(path);
    if (actualBytes === undefined || !compareBytesV1(actualBytes, expectedBytes)) {
      throw new TypeError(`runtime fixture bytes differ from deterministic builder: ${path}`);
    }
  }
}

export interface VerifyRuntimeFixtureDirectoryOptionsV1 {
  readonly directory: string | URL;
  readonly verificationContext?: RuntimeFixtureVerificationContextV1;
  readonly compareWithBuilder?: boolean;
  readonly compareWithFixtureSet?: RuntimeFixtureSetV1;
}

export interface VerifyRuntimeFixtureDirectoryStructureOptionsV1 {
  readonly directory: string | URL;
  readonly allowedExtraFileNames?: readonly string[];
}

export async function verifyRuntimeFixtureDirectoryStructureV1(
  options: VerifyRuntimeFixtureDirectoryStructureOptionsV1,
): Promise<{
  readonly fileCount: 11;
  readonly payloadCount: 10;
  readonly manifestSha256: string;
}> {
  const modules = await loadVerifierModulesV1();
  const directory = directoryPathV1(options.directory);
  const actual = await readExactFixtureFilesV1(
    directory,
    options.allowedExtraFileNames ?? Object.freeze([]),
  );
  const manifestBytes = actual.get("manifest.v1.json");
  if (manifestBytes === undefined) throw new TypeError("missing runtime fixture manifest");
  const manifest = await parseManifestV1(manifestBytes);
  for (const entry of manifest.files) {
    const bytes = actual.get(entry.path);
    if (bytes === undefined) throw new TypeError(`missing runtime fixture payload ${entry.path}`);
    if (bytes.byteLength !== entry.byteLength || modules.base.digestBytes(bytes) !== entry.sha256) {
      throw new TypeError(`runtime fixture payload integrity failed: ${entry.path}`);
    }
  }
  return Object.freeze({
    fileCount: 11 as const,
    payloadCount: 10 as const,
    manifestSha256: modules.base.digestBytes(manifestBytes),
  });
}

export async function verifyRuntimeFixtureDirectoryV1(
  options: VerifyRuntimeFixtureDirectoryOptionsV1,
): Promise<{
  readonly fileCount: 11;
  readonly payloadCount: 10;
  readonly manifestSha256: string;
}> {
  const modules = await loadVerifierModulesV1();
  const {
    buildRuntimeFixtureSetV1,
    classifyRuntimeFixtureV1,
    computeRuntimeFixtureGeneratorSourceDigestV1,
    createRuntimeFixtureVerificationContextV1,
    replayTrackedDebugBundleV1,
  } = modules.builder;
  const directory = directoryPathV1(options.directory);
  await verifyRuntimeFixtureDirectoryStructureV1({ directory });
  const context =
    options.verificationContext ?? (await createRuntimeFixtureVerificationContextV1());
  const actual = await readExactFixtureFilesV1(directory);
  const manifestBytes = actual.get("manifest.v1.json");
  if (manifestBytes === undefined) throw new TypeError("missing runtime fixture manifest");
  const manifest = await parseManifestV1(manifestBytes);
  const currentSourceDigest = await computeRuntimeFixtureGeneratorSourceDigestV1(context.root);
  const historicalSourceDigest = modules.base.parseDigest(
    runtimeFixtureGeneratorSourceDigestAtGenerationV1,
  );
  if (
    manifest.generatorSourceDigest !== currentSourceDigest &&
    (options.compareWithBuilder !== true ||
      manifest.generatorSourceDigest !== historicalSourceDigest)
  ) {
    throw new TypeError("runtime fixture generator source digest drifted");
  }
  const expectedProvenance = context.frozenProvenance;
  if (
    !compareBytesV1(
      modules.base.canonicalJsonBytes({
        blocking: manifest.blockingProvenance,
        diagnostic: manifest.diagnosticAtGeneration,
      }),
      modules.base.canonicalJsonBytes({
        blocking: expectedProvenance.blocking,
        diagnostic: expectedProvenance.diagnosticAtGeneration,
      }),
    )
  ) {
    throw new TypeError("runtime fixture manifest provenance drifted");
  }
  for (const entry of manifest.files) {
    const bytes = actual.get(entry.path);
    if (bytes === undefined) throw new TypeError(`missing runtime fixture payload ${entry.path}`);
    const classified = await classifyRuntimeFixtureV1(entry.path, bytes, context);
    if (
      classified.classification !== entry.classification ||
      classified.integrityMode !== entry.integrityMode
    ) {
      throw new TypeError(`runtime fixture payload classification drifted: ${entry.path}`);
    }
  }
  const debugBytes = actual.get("debug-flow-command-log.v1.json");
  if (debugBytes === undefined) throw new TypeError("missing runtime fixture Debug Bundle");
  const replay = await replayTrackedDebugBundleV1(debugBytes, context);
  if (!replay.authoritative || !replay.identityMatch || !replay.matches) {
    throw new TypeError("runtime fixture Debug Bundle replay drifted");
  }
  if (options.compareWithFixtureSet !== undefined) {
    assertFixtureSetBytesV1(actual, options.compareWithFixtureSet);
  }
  if (options.compareWithBuilder === true) {
    assertFixtureSetBytesV1(
      actual,
      await buildRuntimeFixtureSetV1({
        root: context.root,
        provenanceMode: "read_only_verification",
        historicalGeneratorSourceDigest: historicalSourceDigest,
      }),
    );
  }
  return Object.freeze({
    fileCount: 11 as const,
    payloadCount: 10 as const,
    manifestSha256: modules.base.digestBytes(manifestBytes),
  });
}

async function verifyTrackedRuntimeFixturesV1(): Promise<void> {
  const result = await verifyRuntimeFixtureDirectoryV1({
    directory: trackedRuntimeFixtureDirectoryV1,
    compareWithBuilder: true,
  });
  console.log(
    `runtime fixture verification passed (${result.payloadCount} payloads, ${result.manifestSha256})`,
  );
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await verifyTrackedRuntimeFixturesV1();
