// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { arch as hostArch, platform as hostPlatform } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { MaterializationContractReadResultV1 } from "../preflight/materialization-contract.mjs";

const phaseZeroModuleV1 = (await import(
  new URL("../preflight/verify-materialization.mts", import.meta.url).href
)) as typeof import("../preflight/verify-materialization.mjs");

const { createNodeGoalMaterializationAdapterV1, parseGoalMaterializationAttestationV1 } =
  phaseZeroModuleV1;

export interface LocalVisualEnvironmentV1 {
  readonly revision: 1;
  readonly os: NodeJS.Platform;
  readonly arch: string;
  readonly playwrightVersion: "1.61.1";
  readonly chromiumRevision: string;
  readonly chromiumVersion: string;
  readonly fontPackage: "@fontsource/noto-sans-sc";
  readonly fontVersion: "5.2.9";
  readonly deviceScaleFactor: 1;
  readonly viewport: { readonly width: 1600; readonly height: 1000 };
  readonly reducedMotion: "reduce";
}

export type VisualRegressionModeV1 = "update" | "verify";

export type VisualRegressionErrorCodeV1 =
  | "external_precondition.browser_missing"
  | "external_precondition.browser_revision_mismatch"
  | "external_precondition.materialization_stale"
  | "external_precondition.visual_font_missing"
  | "visual_candidate_invalid"
  | "visual_environment_invalid"
  | "visual_environment_mismatch"
  | "visual_environment_noncanonical"
  | "visual_png_invalid"
  | "visual_runner_invalid";

export class VisualRegressionErrorV1 extends TypeError {
  readonly code: VisualRegressionErrorCodeV1;
  readonly diagnosticsPath: string | undefined;

  constructor(code: VisualRegressionErrorCodeV1, detail: string, diagnosticsPath?: string) {
    super(`${code}: ${detail}`);
    this.name = "VisualRegressionErrorV1";
    this.code = code;
    this.diagnosticsPath = diagnosticsPath;
  }
}

export interface VisualEnvironmentProbeAdapterV1 {
  readonly arch: string;
  readonly inspectChromium: () => Promise<{
    readonly executablePath: string | undefined;
    readonly revision: string;
  }>;
  readonly launchChromiumVersion: (executablePath: string) => Promise<string>;
  readonly pathIsRegularFile: (path: string) => Promise<boolean>;
  readonly platform: NodeJS.Platform;
  readonly probeFontCss: (path: string) => Promise<readonly string[]>;
  readonly readFile: (path: string) => Promise<Uint8Array>;
  readonly readMaterializationContract: (
    root: string,
  ) => Promise<MaterializationContractReadResultV1>;
}

export interface VisualEnvironmentProbeResultV1 {
  readonly environment: LocalVisualEnvironmentV1;
  readonly materializationDigest: `sha256:${string}`;
}

export interface VisualPlaywrightInvocationV1 {
  readonly args: readonly string[];
  readonly command: "pnpm";
}

export interface VisualPlaywrightRunInputV1 extends VisualPlaywrightInvocationV1 {
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
}

export interface VisualPlaywrightRunResultV1 {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface VisualRegressionRunnerAdapterV1 {
  readonly afterCandidateRead?: (path: string) => Promise<void>;
  readonly createRunId: () => string;
  readonly probeEnvironment: (root: string) => Promise<VisualEnvironmentProbeResultV1>;
  readonly runPlaywright: (
    input: VisualPlaywrightRunInputV1,
  ) => Promise<VisualPlaywrightRunResultV1>;
}

export interface VisualRegressionRunResultV1 extends VisualPlaywrightRunResultV1 {
  readonly diagnosticsPath?: string;
  readonly mode: VisualRegressionModeV1;
  readonly runRoot: string;
}

export const localVisualEnvironmentFieldPathsV1 = Object.freeze([
  "revision",
  "os",
  "arch",
  "playwrightVersion",
  "chromiumRevision",
  "chromiumVersion",
  "fontPackage",
  "fontVersion",
  "deviceScaleFactor",
  "viewport.width",
  "viewport.height",
  "reducedMotion",
] as const);

export const visualBaselineNamesV1 = Object.freeze([
  "poc-stage-standard.png",
  "poc-devdock-overlay.png",
  "e2e-narrative.png",
] as const);

const exactPlaywrightVersionV1 = "1.61.1";
const exactFontPackageV1 = "@fontsource/noto-sans-sc";
const exactFontVersionV1 = "5.2.9";
const visualSnapshotRootEnvironmentKeyV1 = "PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT";
const visualReportPathEnvironmentKeyV1 = "PROJECT_TAVERN_VISUAL_REPORT_PATH";
const textEncoderV1 = new TextEncoder();
const textDecoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const supportedPlatformsV1 = new Set<NodeJS.Platform>([
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "openbsd",
  "sunos",
  "win32",
  "cygwin",
  "netbsd",
]);

function failV1(
  code: VisualRegressionErrorCodeV1,
  detail: string,
  diagnosticsPath?: string,
): never {
  throw new VisualRegressionErrorV1(code, detail, diagnosticsPath);
}

function detailFromV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCodeV1(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && Reflect.get(error, "code") === code;
}

function compareTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeysV1(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).toSorted(compareTextV1);
  const wanted = [...expected].sort(compareTextV1);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failV1("visual_environment_invalid", `${path} has unexpected or missing fields`);
  }
}

function nonEmptyStringV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    failV1("visual_environment_invalid", `${path} must be a non-empty string`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        failV1("visual_environment_invalid", `${path} contains a lone surrogate`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      failV1("visual_environment_invalid", `${path} contains a lone surrogate`);
    }
  }
  return value;
}

function canonicalJsonTextV1(value: unknown, active = new Set<object>()): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") {
    nonEmptyStringV1(value, "canonical JSON string");
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      return failV1("visual_runner_invalid", "canonical JSON numbers must be safe integers");
    }
    return String(value);
  }
  if (typeof value !== "object" || value === null || active.has(value)) {
    return failV1("visual_runner_invalid", "canonical JSON value is invalid");
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => canonicalJsonTextV1(entry, active)).join(",")}]`;
    }
    if (!isPlainObjectV1(value)) {
      return failV1("visual_runner_invalid", "canonical JSON objects must be plain");
    }
    return `{${Object.keys(value)
      .sort(compareTextV1)
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonTextV1(value[key], active)}`)
      .join(",")}}`;
  } finally {
    active.delete(value);
  }
}

function canonicalJsonBytesV1(value: unknown): Uint8Array {
  return textEncoderV1.encode(canonicalJsonTextV1(value));
}

function sha256V1(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function validateLocalVisualEnvironmentV1(value: unknown): LocalVisualEnvironmentV1 {
  if (!isPlainObjectV1(value)) {
    return failV1("visual_environment_invalid", "environment must be an object");
  }
  assertExactKeysV1(
    value,
    [
      "arch",
      "chromiumRevision",
      "chromiumVersion",
      "deviceScaleFactor",
      "fontPackage",
      "fontVersion",
      "os",
      "playwrightVersion",
      "reducedMotion",
      "revision",
      "viewport",
    ],
    "environment",
  );
  if (value.revision !== 1) failV1("visual_environment_invalid", "revision must equal 1");
  const os = nonEmptyStringV1(value.os, "environment/os") as NodeJS.Platform;
  if (!supportedPlatformsV1.has(os)) {
    failV1("visual_environment_invalid", `environment/os is unsupported: ${os}`);
  }
  const arch = nonEmptyStringV1(value.arch, "environment/arch");
  if (value.playwrightVersion !== exactPlaywrightVersionV1) {
    failV1("visual_environment_invalid", "playwrightVersion is not pinned");
  }
  const chromiumRevision = nonEmptyStringV1(value.chromiumRevision, "environment/chromiumRevision");
  if (!/^\d+$/u.test(chromiumRevision)) {
    failV1("visual_environment_invalid", "chromiumRevision must be decimal");
  }
  const chromiumVersion = nonEmptyStringV1(value.chromiumVersion, "environment/chromiumVersion");
  if (value.fontPackage !== exactFontPackageV1 || value.fontVersion !== exactFontVersionV1) {
    failV1("visual_environment_invalid", "font identity is not pinned");
  }
  if (value.deviceScaleFactor !== 1) {
    failV1("visual_environment_invalid", "deviceScaleFactor must equal 1");
  }
  if (!isPlainObjectV1(value.viewport)) {
    failV1("visual_environment_invalid", "viewport must be an object");
  }
  assertExactKeysV1(value.viewport, ["height", "width"], "environment/viewport");
  if (value.viewport.width !== 1600 || value.viewport.height !== 1000) {
    failV1("visual_environment_invalid", "viewport must equal 1600x1000");
  }
  if (value.reducedMotion !== "reduce") {
    failV1("visual_environment_invalid", "reducedMotion must equal reduce");
  }
  return Object.freeze({
    revision: 1,
    os,
    arch,
    playwrightVersion: exactPlaywrightVersionV1,
    chromiumRevision,
    chromiumVersion,
    fontPackage: exactFontPackageV1,
    fontVersion: exactFontVersionV1,
    deviceScaleFactor: 1,
    viewport: Object.freeze({ width: 1600, height: 1000 }),
    reducedMotion: "reduce",
  });
}

export function encodeLocalVisualEnvironmentV1(environment: LocalVisualEnvironmentV1): Uint8Array {
  return canonicalJsonBytesV1(validateLocalVisualEnvironmentV1(environment));
}

export function decodeLocalVisualEnvironmentV1(bytes: Uint8Array): LocalVisualEnvironmentV1 {
  if (bytes.byteLength === 0 || bytes.byteLength > 64 * 1024) {
    return failV1("visual_environment_invalid", "environment JSON has an invalid size");
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return failV1("visual_environment_invalid", "environment JSON has a UTF-8 BOM");
  }
  let source: string;
  try {
    source = textDecoderV1.decode(bytes);
  } catch {
    return failV1("visual_environment_invalid", "environment JSON is not UTF-8");
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return failV1("visual_environment_invalid", "environment JSON is invalid");
  }
  const environment = validateLocalVisualEnvironmentV1(value);
  if (canonicalJsonTextV1(environment) !== source) {
    failV1("visual_environment_noncanonical", "environment JSON is not canonical");
  }
  return environment;
}

function fieldValueV1(
  environment: LocalVisualEnvironmentV1,
  field: (typeof localVisualEnvironmentFieldPathsV1)[number],
): string | number {
  if (field === "viewport.width") return environment.viewport.width;
  if (field === "viewport.height") return environment.viewport.height;
  return environment[field];
}

export function compareLocalVisualEnvironmentV1(
  baseline: LocalVisualEnvironmentV1,
  current: LocalVisualEnvironmentV1,
):
  | { readonly kind: "compatible" }
  | {
      readonly code: "visual_environment_mismatch";
      readonly fields: readonly (typeof localVisualEnvironmentFieldPathsV1)[number][];
      readonly kind: "incompatible";
    } {
  const fields = localVisualEnvironmentFieldPathsV1.filter(
    (field) => fieldValueV1(baseline, field) !== fieldValueV1(current, field),
  );
  return fields.length === 0
    ? Object.freeze({ kind: "compatible" as const })
    : Object.freeze({
        kind: "incompatible" as const,
        code: "visual_environment_mismatch" as const,
        fields: Object.freeze(fields),
      });
}

export function parseVisualRegressionModeV1(args: readonly string[]): VisualRegressionModeV1 {
  if (args.length !== 1 || (args[0] !== "update" && args[0] !== "verify")) {
    throw new TypeError("usage: run-visual-regression.mts <update|verify>");
  }
  return args[0];
}

export function createVisualPlaywrightInvocationV1(
  mode: VisualRegressionModeV1,
  outputPath: string,
): VisualPlaywrightInvocationV1 {
  if (
    outputPath.length === 0 ||
    isAbsolute(outputPath) ||
    outputPath.includes("\\") ||
    outputPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return failV1("visual_runner_invalid", `unsafe visual output path: ${outputPath}`);
  }
  const args = ["test:e2e:ui", "--project=chromium", "--grep", "@visual", `--output=${outputPath}`];
  if (mode === "update") args.push("--update-snapshots");
  return Object.freeze({ command: "pnpm" as const, args: Object.freeze(args) });
}

function packageVersionV1(
  bytes: Uint8Array,
  dependencySection: "dependencies" | "devDependencies",
  packageName: string,
  code: VisualRegressionErrorCodeV1,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoderV1.decode(bytes));
  } catch {
    return failV1(code, `${packageName} package manifest is invalid`);
  }
  if (!isPlainObjectV1(parsed) || !isPlainObjectV1(parsed[dependencySection])) {
    return failV1(code, `${packageName} is absent from ${dependencySection}`);
  }
  const version = parsed[dependencySection][packageName];
  if (typeof version !== "string" || version.length === 0) {
    return failV1(code, `${packageName} does not have an exact version`);
  }
  return version;
}

function installedPackageVersionV1(
  bytes: Uint8Array,
  packageName: string,
  code: VisualRegressionErrorCodeV1,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoderV1.decode(bytes));
  } catch {
    return failV1(code, `${packageName} installed package manifest is invalid`);
  }
  if (
    !isPlainObjectV1(parsed) ||
    typeof parsed.version !== "string" ||
    parsed.version.length === 0
  ) {
    return failV1(code, `${packageName} installed package version is missing`);
  }
  return parsed.version;
}

function closureHasPackageV1(
  contract: MaterializationContractReadResultV1,
  packageName: string,
  version: string,
): boolean {
  return contract.contract.externalPackages.some(
    (entry) => entry.packageKey === `${packageName}@${version}`,
  );
}

function createNodeVisualEnvironmentProbeAdapterV1(root: string): VisualEnvironmentProbeAdapterV1 {
  const phaseZeroAdapter = createNodeGoalMaterializationAdapterV1(root);
  return {
    arch: hostArch(),
    inspectChromium: async () => phaseZeroAdapter.inspectBrowser("chromium"),
    launchChromiumVersion: async (executablePath) => {
      const { chromium } = await import("@playwright/test");
      const browser = await chromium.launch({ executablePath });
      try {
        return browser.version();
      } finally {
        await browser.close();
      }
    },
    pathIsRegularFile: async (path) => {
      try {
        return (await stat(path)).isFile();
      } catch {
        return false;
      }
    },
    platform: hostPlatform(),
    probeFontCss: async (path) => phaseZeroAdapter.probeFont(path),
    readFile: async (path) => readFile(path),
    readMaterializationContract: async (path) => phaseZeroAdapter.readMaterializationContract(path),
  };
}

export async function probeLocalVisualEnvironmentV1(
  root: string,
  adapter: VisualEnvironmentProbeAdapterV1 = createNodeVisualEnvironmentProbeAdapterV1(root),
): Promise<VisualEnvironmentProbeResultV1> {
  let contract: MaterializationContractReadResultV1;
  try {
    contract = await adapter.readMaterializationContract(root);
  } catch (error) {
    return failV1(
      "external_precondition.materialization_stale",
      `tracked materialization contract is invalid: ${detailFromV1(error)}`,
    );
  }

  let attestation: ReturnType<typeof parseGoalMaterializationAttestationV1>;
  try {
    const bytes = await adapter.readFile(
      resolve(root, ".project-tavern/goal-materialization.json"),
    );
    attestation = parseGoalMaterializationAttestationV1(bytes);
  } catch (error) {
    return failV1(
      "external_precondition.materialization_stale",
      `local materialization attestation is invalid: ${detailFromV1(error)}`,
    );
  }
  if (
    attestation.materializationDigest !== contract.materializationDigest ||
    attestation.packageClosureDigest !== contract.packageClosureDigest ||
    attestation.platform !== adapter.platform ||
    attestation.arch !== adapter.arch
  ) {
    failV1("external_precondition.materialization_stale", "materialization attestation is stale");
  }

  const [rootPackageBytes, uiPackageBytes, installedPlaywrightBytes, installedFontBytes] =
    await Promise.all([
      adapter.readFile(resolve(root, "package.json")),
      adapter.readFile(resolve(root, "engine/packages/ui/package.json")),
      adapter.readFile(resolve(root, "node_modules/@playwright/test/package.json")),
      adapter.readFile(
        resolve(root, "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/package.json"),
      ),
    ]);
  const playwrightVersion = packageVersionV1(
    rootPackageBytes,
    "devDependencies",
    "@playwright/test",
    "external_precondition.materialization_stale",
  );
  const installedPlaywrightVersion = installedPackageVersionV1(
    installedPlaywrightBytes,
    "@playwright/test",
    "external_precondition.materialization_stale",
  );
  if (
    playwrightVersion !== exactPlaywrightVersionV1 ||
    installedPlaywrightVersion !== exactPlaywrightVersionV1 ||
    contract.contract.playwright.version !== exactPlaywrightVersionV1 ||
    !closureHasPackageV1(contract, "@playwright/test", exactPlaywrightVersionV1)
  ) {
    failV1(
      "external_precondition.materialization_stale",
      `@playwright/test ${exactPlaywrightVersionV1} is not materialized`,
    );
  }
  const fontVersion = packageVersionV1(
    uiPackageBytes,
    "dependencies",
    exactFontPackageV1,
    "external_precondition.visual_font_missing",
  );
  const installedFontVersion = installedPackageVersionV1(
    installedFontBytes,
    exactFontPackageV1,
    "external_precondition.visual_font_missing",
  );
  if (
    fontVersion !== exactFontVersionV1 ||
    installedFontVersion !== exactFontVersionV1 ||
    !closureHasPackageV1(contract, exactFontPackageV1, exactFontVersionV1)
  ) {
    failV1(
      "external_precondition.visual_font_missing",
      `${exactFontPackageV1} ${exactFontVersionV1} is not materialized`,
    );
  }

  let chromium: Awaited<ReturnType<VisualEnvironmentProbeAdapterV1["inspectChromium"]>>;
  try {
    chromium = await adapter.inspectChromium();
  } catch (error) {
    return failV1(
      "external_precondition.browser_missing",
      `Chromium cannot be inspected: ${detailFromV1(error)}`,
    );
  }
  if (chromium.executablePath === undefined || chromium.executablePath.length === 0) {
    failV1("external_precondition.browser_missing", "Chromium executable is missing");
  }
  const expectedRevision = contract.contract.playwright.browsers.chromium.revision;
  if (
    chromium.revision !== expectedRevision ||
    attestation.browsers.chromium.revision !== expectedRevision
  ) {
    failV1(
      "external_precondition.browser_revision_mismatch",
      `Chromium revision ${expectedRevision} is required; found ${chromium.revision}`,
    );
  }
  if (!(await adapter.pathIsRegularFile(chromium.executablePath))) {
    failV1("external_precondition.browser_missing", "Chromium executable is missing");
  }

  const fontCssPaths = [
    resolve(
      root,
      "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
    ),
    resolve(
      root,
      "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
    ),
  ];
  let fontPaths: readonly string[];
  try {
    fontPaths = (await Promise.all(fontCssPaths.map((path) => adapter.probeFontCss(path)))).flat();
  } catch (error) {
    return failV1(
      "external_precondition.visual_font_missing",
      `visual font probe failed: ${detailFromV1(error)}`,
    );
  }
  if (fontPaths.length < 4 || new Set(fontPaths).size !== fontPaths.length) {
    failV1("external_precondition.visual_font_missing", "visual font closure is incomplete");
  }
  let chromiumVersion: string;
  try {
    chromiumVersion = nonEmptyStringV1(
      await adapter.launchChromiumVersion(chromium.executablePath),
      "chromiumVersion",
    );
  } catch (error) {
    return failV1(
      "external_precondition.browser_missing",
      `Chromium cannot launch: ${detailFromV1(error)}`,
    );
  }

  return Object.freeze({
    environment: validateLocalVisualEnvironmentV1({
      revision: 1,
      os: adapter.platform,
      arch: adapter.arch,
      playwrightVersion,
      chromiumRevision: chromium.revision,
      chromiumVersion,
      fontPackage: exactFontPackageV1,
      fontVersion,
      deviceScaleFactor: 1,
      viewport: { width: 1600, height: 1000 },
      reducedMotion: "reduce",
    }),
    materializationDigest: contract.materializationDigest,
  });
}

function baselineRootV1(root: string): string {
  return resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
}

function safeRepositoryRelativePathV1(root: string, path: string): string {
  const result = relative(root, path).split(sep).join("/");
  if (result === "" || result === ".." || result.startsWith("../") || isAbsolute(result)) {
    return failV1("visual_runner_invalid", `path escapes repository: ${path}`);
  }
  return result;
}

type VisualOutputKindV1 = "visual-diagnostics" | "visual-runs";

async function assertOwnedDirectoryV1(
  repositoryRoot: string,
  path: string,
  label: string,
): Promise<void> {
  let metadata: Awaited<ReturnType<typeof lstat>>;
  try {
    metadata = await lstat(path);
  } catch (error) {
    return failV1("visual_runner_invalid", `${label} cannot be inspected: ${detailFromV1(error)}`);
  }
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    failV1("visual_runner_invalid", `${label} must be an owned directory, not a symlink`);
  }

  let canonicalRepositoryRoot: string;
  let canonicalPath: string;
  try {
    [canonicalRepositoryRoot, canonicalPath] = await Promise.all([
      realpath(repositoryRoot),
      realpath(path),
    ]);
  } catch (error) {
    return failV1("visual_runner_invalid", `${label} cannot be resolved: ${detailFromV1(error)}`);
  }
  const repositoryRelativePath = relative(canonicalRepositoryRoot, canonicalPath);
  if (
    repositoryRelativePath === ".." ||
    repositoryRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(repositoryRelativePath)
  ) {
    failV1("visual_runner_invalid", `${label} resolves outside the repository`);
  }
}

async function createOwnedParentDirectoryV1(
  repositoryRoot: string,
  path: string,
  label: string,
): Promise<void> {
  try {
    await mkdir(path, { mode: 0o700, recursive: false });
  } catch (error) {
    if (!hasErrorCodeV1(error, "EEXIST")) {
      return failV1("visual_runner_invalid", `${label} cannot be created: ${detailFromV1(error)}`);
    }
  }
  await assertOwnedDirectoryV1(repositoryRoot, path, label);
}

async function createVisualOutputDirectoryV1(
  repositoryRoot: string,
  kind: VisualOutputKindV1,
  runId: string,
): Promise<string> {
  await assertOwnedDirectoryV1(repositoryRoot, repositoryRoot, "repository root");
  const localRoot = resolve(repositoryRoot, ".project-tavern");
  await createOwnedParentDirectoryV1(repositoryRoot, localRoot, ".project-tavern");
  const kindRoot = join(localRoot, kind);
  await createOwnedParentDirectoryV1(repositoryRoot, kindRoot, `.project-tavern/${kind}`);

  const runRoot = join(kindRoot, runId);
  try {
    await mkdir(runRoot, { mode: 0o700, recursive: false });
  } catch (error) {
    return failV1(
      "visual_runner_invalid",
      `.project-tavern/${kind}/${runId} cannot be created exclusively: ${detailFromV1(error)}`,
    );
  }
  await assertOwnedDirectoryV1(repositoryRoot, localRoot, ".project-tavern");
  await assertOwnedDirectoryV1(repositoryRoot, kindRoot, `.project-tavern/${kind}`);
  await assertOwnedDirectoryV1(repositoryRoot, runRoot, `.project-tavern/${kind}/${runId}`);
  return runRoot;
}

async function writeCanonicalDiagnosticV1(path: string, value: unknown): Promise<void> {
  await writeFile(path, canonicalJsonBytesV1(value), { flag: "wx", mode: 0o600 });
}

interface StableFileV1 {
  readonly bytes: Uint8Array;
  readonly sha256: `sha256:${string}`;
}

interface TrackedVisualBaselineInventoryEntryV1 {
  readonly byteSize: number;
  readonly name: string;
  readonly sha256: `sha256:${string}`;
}

async function readStableFileV1(
  path: string,
  afterRead?: (path: string) => Promise<void>,
): Promise<StableFileV1> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path, "r");
  } catch (error) {
    return failV1("visual_candidate_invalid", `${path} cannot be opened: ${detailFromV1(error)}`);
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size <= 0n) {
      return failV1("visual_candidate_invalid", `${path} is not a non-empty regular file`);
    }
    const bytes = await handle.readFile();
    await afterRead?.(path);
    const after = await handle.stat({ bigint: true });
    const live = await stat(path, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      after.dev !== live.dev ||
      after.ino !== live.ino ||
      after.size !== live.size ||
      after.mtimeNs !== live.mtimeNs ||
      BigInt(bytes.byteLength) !== after.size
    ) {
      return failV1("visual_candidate_invalid", `${path} changed while hashing`);
    }
    return Object.freeze({ bytes, sha256: sha256V1(bytes) });
  } finally {
    await handle.close();
  }
}

function pngCrc32V1(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffff_ffff;
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index] ?? 0;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb8_8320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function assertPngDimensionsV1(path: string, bytes: Uint8Array): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    buffer.byteLength < 57 ||
    !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    failV1("visual_png_invalid", `${path} is not a complete 1600x1000 PNG`);
  }
  let offset = 8;
  let chunkIndex = 0;
  let idatBytes = 0;
  let sawIend = false;
  while (offset < buffer.byteLength) {
    if (offset + 12 > buffer.byteLength) {
      failV1("visual_png_invalid", `${path} has a truncated PNG chunk`);
    }
    const length = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    if (dataEnd < dataStart || nextOffset > buffer.byteLength) {
      failV1("visual_png_invalid", `${path} has an invalid PNG chunk length`);
    }
    const type = buffer.toString("ascii", typeStart, dataStart);
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      failV1("visual_png_invalid", `${path} has an invalid PNG chunk type`);
    }
    if (buffer.readUInt32BE(crcOffset) !== pngCrc32V1(buffer, typeStart, dataEnd)) {
      failV1("visual_png_invalid", `${path} has an invalid PNG chunk CRC`);
    }
    if (chunkIndex === 0) {
      const bitDepth = buffer[dataStart + 8];
      const colorType = buffer[dataStart + 9];
      const validBitDepths =
        colorType === 0
          ? [1, 2, 4, 8, 16]
          : colorType === 3
            ? [1, 2, 4, 8]
            : colorType === 2 || colorType === 4 || colorType === 6
              ? [8, 16]
              : [];
      if (
        type !== "IHDR" ||
        length !== 13 ||
        buffer.readUInt32BE(dataStart) !== 1600 ||
        buffer.readUInt32BE(dataStart + 4) !== 1000 ||
        bitDepth === undefined ||
        !validBitDepths.includes(bitDepth) ||
        buffer[dataStart + 10] !== 0 ||
        buffer[dataStart + 11] !== 0 ||
        (buffer[dataStart + 12] !== 0 && buffer[dataStart + 12] !== 1)
      ) {
        failV1("visual_png_invalid", `${path} has an invalid 1600x1000 PNG IHDR`);
      }
    } else if (type === "IHDR") {
      failV1("visual_png_invalid", `${path} has more than one PNG IHDR`);
    }
    if (type === "IDAT") idatBytes += length;
    if (type === "IEND") {
      if (length !== 0 || idatBytes === 0 || nextOffset !== buffer.byteLength) {
        failV1("visual_png_invalid", `${path} has an invalid PNG IEND`);
      }
      sawIend = true;
    }
    offset = nextOffset;
    chunkIndex += 1;
    if (sawIend) break;
  }
  if (!sawIend) {
    failV1("visual_png_invalid", `${path} has no complete PNG IEND`);
  }
}

async function inventoryTrackedVisualBaselinesV1(
  root: string,
): Promise<readonly TrackedVisualBaselineInventoryEntryV1[]> {
  const trackedRoot = baselineRootV1(root);
  const expectedNames = ["environment.v1.json", ...visualBaselineNamesV1].toSorted(compareTextV1);
  try {
    const entries = await readdir(trackedRoot, { withFileTypes: true });
    if (
      entries.some((entry) => !entry.isFile()) ||
      JSON.stringify(entries.map((entry) => entry.name).toSorted(compareTextV1)) !==
        JSON.stringify(expectedNames)
    ) {
      failV1("visual_runner_invalid", "tracked visual baseline set is not exact");
    }
    const inventory: TrackedVisualBaselineInventoryEntryV1[] = [];
    for (const name of expectedNames) {
      const path = join(trackedRoot, name);
      const file = await readStableFileV1(path);
      if (name.endsWith(".png")) assertPngDimensionsV1(path, file.bytes);
      inventory.push({ byteSize: file.bytes.byteLength, name, sha256: file.sha256 });
    }
    return Object.freeze(inventory);
  } catch (error) {
    if (error instanceof VisualRegressionErrorV1 && error.code === "visual_runner_invalid") {
      throw error;
    }
    return failV1(
      "visual_runner_invalid",
      `tracked visual baseline inventory failed: ${detailFromV1(error)}`,
    );
  }
}

async function validateCandidateSetV1(
  candidateRoot: string,
  afterCandidateRead?: (path: string) => Promise<void>,
): Promise<ReadonlyMap<string, Uint8Array>> {
  let projectEntries: { readonly name: string; readonly isDirectory: () => boolean }[];
  try {
    projectEntries = await readdir(candidateRoot, { withFileTypes: true });
  } catch (error) {
    return failV1(
      "visual_candidate_invalid",
      `candidate snapshot root is missing: ${detailFromV1(error)}`,
    );
  }
  if (
    projectEntries.length !== 1 ||
    projectEntries[0]?.name !== "chromium" ||
    !projectEntries[0].isDirectory()
  ) {
    failV1("visual_candidate_invalid", "candidate snapshot root must contain only chromium");
  }
  const chromiumRoot = join(candidateRoot, "chromium");
  let entries: { readonly name: string; readonly isFile: () => boolean }[];
  try {
    entries = await readdir(chromiumRoot, { withFileTypes: true });
  } catch (error) {
    return failV1(
      "visual_candidate_invalid",
      `candidate snapshot root is missing: ${detailFromV1(error)}`,
    );
  }
  const names = entries.map((entry) => entry.name).toSorted(compareTextV1);
  if (
    entries.some((entry) => !entry.isFile()) ||
    JSON.stringify(names) !== JSON.stringify([...visualBaselineNamesV1].sort(compareTextV1))
  ) {
    failV1("visual_candidate_invalid", "candidate snapshot set is missing, extra, or non-regular");
  }
  const candidates = new Map<string, Uint8Array>();
  for (const name of visualBaselineNamesV1) {
    const path = join(chromiumRoot, name);
    const file = await readStableFileV1(path, afterCandidateRead);
    assertPngDimensionsV1(path, file.bytes);
    candidates.set(name, file.bytes);
  }
  return candidates;
}

async function pathExistsV1(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function syncDirectoryV1(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function replaceBaselineSetV1(
  root: string,
  runId: string,
  candidates: ReadonlyMap<string, Uint8Array>,
  environment: LocalVisualEnvironmentV1,
): Promise<void> {
  const targetRoot = baselineRootV1(root);
  await mkdir(targetRoot, { recursive: true });
  const entries = [
    ...visualBaselineNamesV1.map((name) => ({ bytes: candidates.get(name), name })),
    { bytes: encodeLocalVisualEnvironmentV1(environment), name: "environment.v1.json" },
  ];
  if (entries.some((entry) => entry.bytes === undefined)) {
    failV1("visual_candidate_invalid", "candidate snapshot set is incomplete");
  }
  const staged = entries.map((entry) => ({
    ...entry,
    backup: join(targetRoot, `.${entry.name}.backup-${runId}`),
    staged: join(targetRoot, `.${entry.name}.candidate-${runId}`),
    target: join(targetRoot, entry.name),
  }));
  const backedUp: typeof staged = [];
  const published: typeof staged = [];
  let committed = false;
  try {
    for (const entry of staged) {
      const handle = await open(entry.staged, "wx", 0o644);
      try {
        await handle.writeFile(entry.bytes as Uint8Array);
        await handle.sync();
      } finally {
        await handle.close();
      }
      const persisted = await readStableFileV1(entry.staged);
      if (!Buffer.from(persisted.bytes).equals(Buffer.from(entry.bytes as Uint8Array))) {
        failV1("visual_candidate_invalid", `${entry.name} staging verification failed`);
      }
    }
    for (const entry of staged) {
      if (await pathExistsV1(entry.target)) {
        await rename(entry.target, entry.backup);
        backedUp.push(entry);
      }
    }
    for (const entry of staged) {
      await rename(entry.staged, entry.target);
      published.push(entry);
    }
    await syncDirectoryV1(targetRoot);
    committed = true;
  } catch (error) {
    for (const entry of published.toReversed()) await rm(entry.target, { force: true });
    for (const entry of backedUp.toReversed()) {
      if (await pathExistsV1(entry.backup)) await rename(entry.backup, entry.target);
    }
    await syncDirectoryV1(targetRoot).catch(() => undefined);
    throw error;
  } finally {
    for (const entry of staged) {
      await rm(entry.staged, { force: true });
      if (committed) await rm(entry.backup, { force: true });
    }
    if (committed) await syncDirectoryV1(targetRoot);
  }
}

function screenshotFailureCountV1(value: unknown): number | undefined {
  if (!isPlainObjectV1(value) || !Array.isArray(value.errors) || value.errors.length !== 0) {
    return undefined;
  }
  const failedMessages: string[] = [];
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) visit(entry);
      return;
    }
    if (!isPlainObjectV1(candidate)) return;
    if (candidate.status === "unexpected" && Array.isArray(candidate.results)) {
      const result = candidate.results.findLast(
        (entry) => isPlainObjectV1(entry) && entry.status === "failed",
      );
      if (isPlainObjectV1(result) && isPlainObjectV1(result.error)) {
        const message = result.error.message;
        if (typeof message === "string") failedMessages.push(message);
      }
    }
    for (const entry of Object.values(candidate)) visit(entry);
  };
  visit(value.suites);
  if (
    failedMessages.length === 0 ||
    failedMessages.some(
      (message) =>
        !message.includes("toHaveScreenshot") && !message.includes("Screenshot comparison failed"),
    )
  ) {
    return undefined;
  }
  return failedMessages.length;
}

async function collectFilesRecursivelyV1(root: string): Promise<readonly string[]> {
  const result: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  };
  await visit(root);
  return result.toSorted(compareTextV1);
}

interface MismatchEvidenceV1 {
  readonly actual: string;
  readonly diff: string;
  readonly expected?: string;
  readonly name: (typeof visualBaselineNamesV1)[number];
}

function screenshotEvidenceNameV1(
  path: string,
): { readonly kind: "actual" | "diff" | "expected"; readonly name: string } | undefined {
  const fileName = path.split(sep).at(-1) ?? "";
  const match = /^(.*)-(actual|diff|expected)\.png$/u.exec(fileName);
  if (match === null) return undefined;
  return { kind: match[2] as "actual" | "diff" | "expected", name: `${match[1]}.png` };
}

async function collectMismatchEvidenceV1(
  outputRoot: string,
): Promise<readonly MismatchEvidenceV1[]> {
  const files = await collectFilesRecursivelyV1(outputRoot);
  const evidence = new Map<string, Partial<Record<"actual" | "diff" | "expected", string>>>();
  for (const path of files) {
    if (!path.endsWith(".png")) continue;
    const parsed = screenshotEvidenceNameV1(path);
    if (parsed === undefined || !visualBaselineNamesV1.includes(parsed.name as never)) {
      failV1("visual_candidate_invalid", `extra screenshot mismatch evidence: ${path}`);
    }
    const record = evidence.get(parsed.name) ?? {};
    if (record[parsed.kind] !== undefined) {
      failV1("visual_candidate_invalid", `duplicate screenshot mismatch evidence: ${path}`);
    }
    record[parsed.kind] = path;
    evidence.set(parsed.name, record);
  }
  const result: MismatchEvidenceV1[] = [];
  for (const [name, record] of [...evidence].sort(([left], [right]) =>
    compareTextV1(left, right),
  )) {
    if (record.actual === undefined || record.diff === undefined) {
      failV1("visual_candidate_invalid", `partial screenshot mismatch evidence: ${name}`);
    }
    const completeEvidence = {
      actual: record.actual,
      diff: record.diff,
      name: name as (typeof visualBaselineNamesV1)[number],
    };
    result.push(
      record.expected === undefined
        ? completeEvidence
        : { ...completeEvidence, expected: record.expected },
    );
  }
  if (result.length === 0) {
    failV1("visual_candidate_invalid", "screenshot mismatch evidence is missing");
  }
  return result;
}

async function preserveScreenshotDiagnosticsV1(
  root: string,
  runId: string,
  outputRoot: string,
  reportPath: string,
  probe: VisualEnvironmentProbeResultV1,
): Promise<string | undefined> {
  let report: unknown;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch {
    return undefined;
  }
  const failureCount = screenshotFailureCountV1(report);
  if (failureCount === undefined) return undefined;
  const evidence = await collectMismatchEvidenceV1(outputRoot);
  if (evidence.length !== failureCount) {
    failV1(
      "visual_candidate_invalid",
      `screenshot mismatch report/evidence count differs: ${failureCount}/${evidence.length}`,
    );
  }
  const diagnosticsRoot = await createVisualOutputDirectoryV1(root, "visual-diagnostics", runId);
  const manifestEntries = [];
  for (const mismatch of evidence) {
    const expectedSource = mismatch.expected ?? resolve(baselineRootV1(root), mismatch.name);
    const sources = {
      expected: expectedSource,
      actual: mismatch.actual,
      diff: mismatch.diff,
    } as const;
    const manifestFiles: Record<string, unknown> = {};
    for (const kind of ["expected", "actual", "diff"] as const) {
      const source = sources[kind];
      const file = await readStableFileV1(source);
      const target = join(diagnosticsRoot, `${mismatch.name.slice(0, -4)}-${kind}.png`);
      await writeFile(target, file.bytes, { flag: "wx", mode: 0o600 });
      const retained = await readStableFileV1(target);
      if (retained.sha256 !== file.sha256) {
        failV1("visual_candidate_invalid", `${mismatch.name} ${kind} diagnostic copy differs`);
      }
      manifestFiles[kind] = {
        path: safeRepositoryRelativePathV1(root, target),
        byteSize: retained.bytes.byteLength,
        sha256: retained.sha256,
      };
    }
    manifestEntries.push({ name: mismatch.name, ...manifestFiles });
  }
  const manifestPath = join(diagnosticsRoot, "screenshot-mismatches.v1.json");
  await writeCanonicalDiagnosticV1(manifestPath, {
    revision: 1,
    environment: probe.environment,
    environmentSha256: sha256V1(encodeLocalVisualEnvironmentV1(probe.environment)),
    materializationDigest: probe.materializationDigest,
    mismatches: manifestEntries,
  });
  return diagnosticsRoot;
}

async function runNodePlaywrightV1(
  input: VisualPlaywrightRunInputV1,
): Promise<VisualPlaywrightRunResultV1> {
  return new Promise((resolveResult) => {
    const child = spawn(input.command, [...input.args], {
      cwd: input.cwd,
      env: { ...process.env, ...input.environment },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      resolveResult({ exitCode: 127, stderr: `${stderr}${error.message}`, stdout });
    });
    child.once("close", (code) => {
      resolveResult({ exitCode: code ?? 1, stderr, stdout });
    });
  });
}

function createNodeVisualRegressionRunnerAdapterV1(): VisualRegressionRunnerAdapterV1 {
  return {
    createRunId: () => `${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${randomUUID()}`,
    probeEnvironment: async (root) => probeLocalVisualEnvironmentV1(root),
    runPlaywright: runNodePlaywrightV1,
  };
}

function validateRunIdV1(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u.test(runId)) {
    failV1("visual_runner_invalid", `invalid visual run id: ${runId}`);
  }
}

export async function runVisualRegressionV1(
  root: string,
  mode: VisualRegressionModeV1,
  adapter: VisualRegressionRunnerAdapterV1 = createNodeVisualRegressionRunnerAdapterV1(),
): Promise<VisualRegressionRunResultV1> {
  const repositoryRoot = resolve(root);
  const probe = await adapter.probeEnvironment(repositoryRoot);
  const runId = adapter.createRunId();
  validateRunIdV1(runId);
  const runRoot = `.project-tavern/visual-runs/${runId}`;
  const absoluteRunRoot = await createVisualOutputDirectoryV1(repositoryRoot, "visual-runs", runId);
  const reportPath = join(absoluteRunRoot, "playwright-report.json");
  let initialTrackedInventory: readonly TrackedVisualBaselineInventoryEntryV1[] | undefined;

  if (mode === "verify") {
    let baseline: LocalVisualEnvironmentV1;
    try {
      baseline = decodeLocalVisualEnvironmentV1(
        await readFile(join(baselineRootV1(repositoryRoot), "environment.v1.json")),
      );
    } catch (error) {
      if (error instanceof VisualRegressionErrorV1) throw error;
      return failV1(
        "visual_environment_invalid",
        `tracked visual environment is missing: ${detailFromV1(error)}`,
      );
    }
    const comparison = compareLocalVisualEnvironmentV1(baseline, probe.environment);
    if (comparison.kind === "incompatible") {
      const diagnosticsRoot = await createVisualOutputDirectoryV1(
        repositoryRoot,
        "visual-diagnostics",
        runId,
      );
      const diagnosticsPath = join(diagnosticsRoot, "environment-mismatch.v1.json");
      await writeCanonicalDiagnosticV1(diagnosticsPath, {
        revision: 1,
        code: "visual_environment_mismatch",
        fields: comparison.fields,
        baseline: {
          environment: baseline,
          sha256: sha256V1(encodeLocalVisualEnvironmentV1(baseline)),
        },
        current: {
          environment: probe.environment,
          sha256: sha256V1(encodeLocalVisualEnvironmentV1(probe.environment)),
        },
      });
      return failV1(
        "visual_environment_mismatch",
        `visual environment differs at ${comparison.fields.join(", ")}`,
        diagnosticsPath,
      );
    }
    initialTrackedInventory = await inventoryTrackedVisualBaselinesV1(repositoryRoot);
  }

  const candidateRoot = join(absoluteRunRoot, "candidate-snapshots");
  const invocation = createVisualPlaywrightInvocationV1(mode, runRoot);
  const environment: Record<string, string | undefined> = {
    CI: "1",
    PNPM_CONFIG_OFFLINE: "true",
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    npm_config_offline: "true",
    [visualReportPathEnvironmentKeyV1]: reportPath,
    [visualSnapshotRootEnvironmentKeyV1]: undefined,
  };
  if (mode === "update") {
    environment[visualSnapshotRootEnvironmentKeyV1] = candidateRoot;
  }
  const result = await adapter.runPlaywright({
    ...invocation,
    cwd: repositoryRoot,
    environment: Object.freeze(environment),
  });

  if (mode === "verify") {
    const finalTrackedInventory = await inventoryTrackedVisualBaselinesV1(repositoryRoot);
    if (
      initialTrackedInventory === undefined ||
      canonicalJsonTextV1(initialTrackedInventory) !== canonicalJsonTextV1(finalTrackedInventory)
    ) {
      failV1("visual_runner_invalid", "verify changed the tracked visual baseline set");
    }
  }

  let diagnosticsPath: string | undefined;
  if (result.exitCode === 0 && mode === "update") {
    const candidates = await validateCandidateSetV1(candidateRoot, adapter.afterCandidateRead);
    await replaceBaselineSetV1(repositoryRoot, runId, candidates, probe.environment);
  } else if (result.exitCode !== 0 && mode === "verify") {
    diagnosticsPath = await preserveScreenshotDiagnosticsV1(
      repositoryRoot,
      runId,
      absoluteRunRoot,
      reportPath,
      probe,
    );
  }
  return Object.freeze(
    diagnosticsPath === undefined
      ? { ...result, mode, runRoot }
      : { ...result, diagnosticsPath, mode, runRoot },
  );
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const mode = parseVisualRegressionModeV1(process.argv.slice(2));
    const root = resolve(import.meta.dirname, "../..");
    const result = await runVisualRegressionV1(root, mode);
    if (result.stdout.length > 0) process.stdout.write(result.stdout);
    if (result.stderr.length > 0) process.stderr.write(result.stderr);
    if (result.diagnosticsPath !== undefined) {
      console.error(`visual diagnostics retained at ${result.diagnosticsPath}`);
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(detailFromV1(error));
    if (error instanceof VisualRegressionErrorV1 && error.diagnosticsPath !== undefined) {
      console.error(`visual diagnostics retained at ${error.diagnosticsPath}`);
    }
    process.exitCode = 1;
  }
}
