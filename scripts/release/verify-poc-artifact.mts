// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ArtifactManifestEntryV1, ArtifactManifestV1 } from "./create-artifact-manifest.mjs";

const artifactManifestModuleV1 = (await import(
  new URL("./create-artifact-manifest.mts", import.meta.url).href
)) as typeof import("./create-artifact-manifest.mjs");
const {
  artifactManifestBytesV1,
  artifactManifestFileV1,
  canonicalArtifactJsonBytesV1,
  createArtifactManifestV1,
  legacyArtifactManifestFileV1,
  listArtifactFilesV1,
  readArtifactPayloadBytesV1,
} = artifactManifestModuleV1;

type DigestV1 = `sha256:${string}`;

export interface VerifyPocArtifactOptionsV1 {
  readonly allowDevelopment?: boolean;
}

interface GraphNodeV1 {
  readonly id: string;
  readonly owningPackage: string;
}

interface GraphEdgeV1 {
  readonly from: string;
  readonly kind: "dynamic" | "static";
  readonly to: string;
}

interface GraphChunkV1 {
  readonly dynamicImports: readonly string[];
  readonly entry: string | null;
  readonly fileName: string;
  readonly imports: readonly string[];
}

interface PocGraphV1 {
  readonly applicationId: "poc-web";
  readonly chunks: readonly GraphChunkV1[];
  readonly contractRevision: 1;
  readonly dynamicSpecifiers: readonly string[];
  readonly edges: readonly GraphEdgeV1[];
  readonly entry: string;
  readonly nodes: readonly GraphNodeV1[];
}

interface GitSourceAuthorityV1 {
  readonly clean: boolean;
  readonly sourceCommit: string;
  readonly sourceTree: string;
  readonly statusDigest: DigestV1;
}

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const objectIdPatternV1 = /^[0-9a-f]{40}$/u;
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const decoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const byteScannerV1 = new TextDecoder("latin1");
const exactNodeVersionV1 = "v26.5.0";
const exactPnpmVersionV1 = "11.11.0";
const pocHtmlEntryV1 = "game/stories/poc/index.html";
const pocApplicationEntryV1 = "game/stories/poc/src/application/entry.tsx";
const pocGameRuntimeV1 = "game/stories/poc/src/application/create-poc-game-runtime.ts";
const pocPresentationRuntimeV1 =
  "game/stories/poc/src/application/create-poc-presentation-runtime.ts";
const pocToolingEntryV1 = "game/stories/poc/src/tooling/index.ts";
const pocToolingUiEntryV1 = "game/stories/poc/src/tooling-ui/index.ts";
const pocToolingSpecifiersV1 = Object.freeze([
  "@project-tavern/story-poc/tooling",
  "@project-tavern/story-poc/tooling-ui",
]);

export const projectLegalFilesV1 = Object.freeze([
  "LICENSE.md",
  "LICENSES/CC-BY-NC-SA-4.0.txt",
  "LICENSES/MIT.txt",
  "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "TRADEMARKS.md",
]);

const exactArtifactPayloadFilesV1 = new Set([
  ...projectLegalFilesV1,
  "build-input.json",
  "index.html",
  "source-graph.v1.json",
]);

function failV1(code: string, detail: string): never {
  throw new TypeError(`${code}: ${detail}`);
}

function compareTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function digestBytesV1(bytes: Uint8Array): DigestV1 {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function expectRecordV1(
  value: unknown,
  keys: readonly string[],
  path: string,
): Record<string, unknown> {
  if (!isPlainObjectV1(value)) failV1("release.invalid_artifact", `${path} must be an object`);
  const actual = Object.keys(value).sort(compareTextV1);
  const expected = [...keys].sort(compareTextV1);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    failV1("release.invalid_artifact", `${path} has unexpected or missing fields`);
  }
  return value;
}

function expectArrayV1(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) failV1("release.invalid_artifact", `${path} must be an array`);
  return value;
}

function expectStringV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    failV1("release.invalid_artifact", `${path} must be a non-empty string`);
  }
  return value;
}

function expectDigestV1(value: unknown, path: string): DigestV1 {
  if (typeof value !== "string" || !digestPatternV1.test(value)) {
    failV1("release.invalid_artifact", `${path} must be a SHA-256 digest`);
  }
  return value as DigestV1;
}

function expectObjectIdV1(value: unknown, path: string): string {
  if (typeof value !== "string" || !objectIdPatternV1.test(value)) {
    failV1("release.invalid_artifact", `${path} must be a full lowercase Git object ID`);
  }
  return value;
}

function expectPositiveIntegerV1(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    failV1("release.invalid_artifact", `${path} must be a positive safe integer`);
  }
  return value as number;
}

async function readCanonicalJsonV1(
  artifactRoot: string,
  path: string,
  label: string,
): Promise<{ readonly bytes: Uint8Array; readonly value: unknown }> {
  let bytes: Uint8Array;
  try {
    bytes = await readArtifactPayloadBytesV1(artifactRoot, path);
  } catch {
    return failV1("release.artifact_missing", `${label} is unavailable`);
  }
  if (bytes.byteLength === 0 || bytes.byteLength > 8 * 1024 * 1024) {
    failV1("release.invalid_artifact", `${label} has an invalid byte length`);
  }
  let value: unknown;
  try {
    value = JSON.parse(decoderV1.decode(bytes));
  } catch {
    return failV1("release.invalid_artifact", `${label} is not strict UTF-8 JSON`);
  }
  let canonical: Uint8Array;
  try {
    canonical = canonicalArtifactJsonBytesV1(value);
  } catch {
    return failV1("release.invalid_artifact", `${label} is not canonical JSON data`);
  }
  if (!bytesEqualV1(bytes, canonical)) {
    failV1("release.artifact_noncanonical", `${label} bytes are not canonical`);
  }
  return Object.freeze({ bytes, value });
}

function assertSortedUniqueStringsV1(values: readonly string[], path: string): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined || compareTextV1(previous, current) >= 0) {
      failV1("release.invalid_artifact", `${path} must be sorted and unique`);
    }
  }
}

function collectReachableV1(
  start: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    for (const target of adjacency.get(current) ?? []) {
      if (!visited.has(target)) queue.push(target);
    }
  }
  return visited;
}

function decodeStringArrayV1(value: unknown, path: string): readonly string[] {
  const result = expectArrayV1(value, path).map((entry, index) =>
    expectStringV1(entry, `${path}/${String(index)}`),
  );
  assertSortedUniqueStringsV1(result, path);
  return Object.freeze(result);
}

function assertSafeRelativePathV1(path: string, label: string, allowVirtual = false): void {
  const allowedVirtual = new Set([
    "virtual:project-tavern/poc-build-identity",
    "virtual:rolldown/runtime",
    "virtual:vite/modulepreload-polyfill.js",
    "virtual:vite/preload-helper.js",
  ]);
  if (allowVirtual && allowedVirtual.has(path)) return;
  if (
    path.startsWith("virtual:") ||
    path.length > 16 * 1024 ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.startsWith("/") ||
    isAbsolute(path) ||
    /^[A-Za-z]:/u.test(path) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(path) ||
    path.includes("?") ||
    path.includes("#") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    failV1("release.forbidden_artifact_content", `${label} is not a normalized relative path`);
  }
}

function expectedWorkspaceOwnerV1(id: string): string | null {
  const owners: readonly (readonly [string, string])[] = [
    ["engine/packages/base/", "@sillymaker/base"],
    ["engine/packages/ui/", "@sillymaker/ui"],
    ["engine/packages/web/", "@sillymaker/web"],
    ["game/packages/assets/", "@project-tavern/assets"],
    ["game/stories/poc/", "@project-tavern/story-poc"],
  ];
  return owners.find(([prefix]) => id.startsWith(prefix))?.[1] ?? null;
}

function expectedDependencyOwnerV1(id: string): string | null {
  const marker = "/node_modules/";
  const markedIndex = id.lastIndexOf(marker);
  const start =
    markedIndex >= 0 ? markedIndex + marker.length : id.startsWith("node_modules/") ? 13 : -1;
  if (start < 0) return null;
  const segments = id.slice(start).split("/");
  const first = segments[0];
  if (first === undefined || first.length === 0) return null;
  return first.startsWith("@") && segments[1] !== undefined ? `${first}/${segments[1]}` : first;
}

function expectedVirtualOwnerV1(id: string): string | null {
  return (
    new Map<string, string>([
      ["virtual:project-tavern/poc-build-identity", "@project-tavern/story-poc"],
      ["virtual:rolldown/runtime", "rolldown"],
      ["virtual:vite/modulepreload-polyfill.js", "vite"],
      ["virtual:vite/preload-helper.js", "vite"],
    ]).get(id) ?? null
  );
}

function assertGraphNodeV1(node: GraphNodeV1): void {
  assertSafeRelativePathV1(node.id, "graph node", true);
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(node.owningPackage)) {
    failV1("release.forbidden_artifact_content", `${node.id} has an invalid package owner`);
  }
  if (
    node.id.startsWith("game/stories/e2e/") ||
    node.owningPackage === "@project-tavern/story-e2e" ||
    node.id === "references" ||
    node.id.startsWith("references/") ||
    node.id === "art-source/aigc" ||
    node.id.startsWith("art-source/aigc/") ||
    node.id.endsWith(".map")
  ) {
    failV1("release.forbidden_artifact_content", `forbidden graph node ${node.id}`);
  }
  const dependencyOwner = expectedDependencyOwnerV1(node.id);
  if (
    dependencyOwner !== null &&
    (dependencyOwner.startsWith("@project-tavern/") ||
      dependencyOwner.startsWith("@sillymaker/") ||
      node.owningPackage.startsWith("@project-tavern/") ||
      node.owningPackage.startsWith("@sillymaker/"))
  ) {
    failV1(
      "release.forbidden_artifact_content",
      `${node.id} disguises a workspace package as a dependency`,
    );
  }
  const expected =
    expectedVirtualOwnerV1(node.id) ?? dependencyOwner ?? expectedWorkspaceOwnerV1(node.id);
  if (expected === null || expected !== node.owningPackage) {
    failV1("release.forbidden_artifact_content", `${node.id} has unknown package ownership`);
  }
}

function decodeGraphV1(value: unknown): PocGraphV1 {
  const graph = expectRecordV1(
    value,
    ["applicationId", "chunks", "contractRevision", "dynamicSpecifiers", "edges", "entry", "nodes"],
    "sourceGraph",
  );
  if (
    graph.applicationId !== "poc-web" ||
    graph.contractRevision !== 1 ||
    graph.entry !== pocApplicationEntryV1
  ) {
    failV1("release.invalid_artifact", "source graph does not identify poc-web");
  }
  const dynamicSpecifiers = decodeStringArrayV1(
    graph.dynamicSpecifiers,
    "sourceGraph/dynamicSpecifiers",
  );
  if (
    dynamicSpecifiers.length !== pocToolingSpecifiersV1.length ||
    dynamicSpecifiers.some((specifier, index) => specifier !== pocToolingSpecifiersV1[index])
  ) {
    failV1("release.forbidden_artifact_content", "source graph has unknown dynamic specifiers");
  }
  const nodes = expectArrayV1(graph.nodes, "sourceGraph/nodes").map((entry, index) => {
    const node = expectRecordV1(
      entry,
      ["id", "owningPackage"],
      `sourceGraph/nodes/${String(index)}`,
    );
    const result = Object.freeze({
      id: expectStringV1(node.id, `sourceGraph/nodes/${String(index)}/id`),
      owningPackage: expectStringV1(
        node.owningPackage,
        `sourceGraph/nodes/${String(index)}/owningPackage`,
      ),
    });
    assertGraphNodeV1(result);
    return result;
  });
  assertSortedUniqueStringsV1(
    nodes.map((node) => node.id),
    "sourceGraph/nodes",
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const requiredNodes = [
    pocHtmlEntryV1,
    pocApplicationEntryV1,
    pocGameRuntimeV1,
    pocPresentationRuntimeV1,
    pocToolingEntryV1,
    pocToolingUiEntryV1,
  ];
  if (requiredNodes.some((id) => !nodeIds.has(id))) {
    failV1("release.forbidden_artifact_content", "source graph is missing a required PoC root");
  }
  if (
    !nodeIds.has("game/stories/poc/src/index.ts") &&
    !nodeIds.has("game/stories/poc/src/story-definition.ts")
  ) {
    failV1("release.forbidden_artifact_content", "source graph is missing the default Story root");
  }
  if (nodes.filter((node) => node.id.endsWith(".html")).length !== 1) {
    failV1("release.forbidden_artifact_content", "source graph must have one PoC HTML root");
  }

  const edges = expectArrayV1(graph.edges, "sourceGraph/edges").map((entry, index) => {
    const edge = expectRecordV1(
      entry,
      ["from", "kind", "to"],
      `sourceGraph/edges/${String(index)}`,
    );
    const kind = expectStringV1(edge.kind, `sourceGraph/edges/${String(index)}/kind`);
    if (kind !== "dynamic" && kind !== "static") {
      failV1("release.invalid_artifact", "source graph edge kind is invalid");
    }
    const result: GraphEdgeV1 = Object.freeze({
      from: expectStringV1(edge.from, `sourceGraph/edges/${String(index)}/from`),
      kind,
      to: expectStringV1(edge.to, `sourceGraph/edges/${String(index)}/to`),
    });
    assertSafeRelativePathV1(result.from, "graph edge source", true);
    assertSafeRelativePathV1(result.to, "graph edge target", true);
    if (!nodeIds.has(result.from) || !nodeIds.has(result.to)) {
      failV1("release.forbidden_artifact_content", "source graph edge has an unknown endpoint");
    }
    return result;
  });
  const edgeKeys = edges.map((edge) => `${edge.from}\0${edge.kind}\0${edge.to}`);
  assertSortedUniqueStringsV1(edgeKeys, "sourceGraph/edges");
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const mutableAdjacency = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of edges) {
    const sourceOwner = nodesById.get(edge.from)?.owningPackage;
    const targetOwner = nodesById.get(edge.to)?.owningPackage;
    if (sourceOwner === "@sillymaker/web" && targetOwner?.startsWith("@project-tavern/story-")) {
      failV1("release.forbidden_artifact_content", "SillyMaker Web imports a Story");
    }
    mutableAdjacency.get(edge.from)?.push(edge.to);
  }
  const adjacency = new Map<string, readonly string[]>(
    [...mutableAdjacency].map(([id, targets]) => [id, Object.freeze(targets)]),
  );
  if (collectReachableV1(pocHtmlEntryV1, adjacency).size !== nodes.length) {
    failV1("release.forbidden_artifact_content", "source graph contains an orphan module");
  }
  for (const [from, to] of [
    [pocGameRuntimeV1, pocToolingEntryV1],
    [pocPresentationRuntimeV1, pocToolingUiEntryV1],
  ] as const) {
    const incoming = edges.filter((edge) => edge.to === to);
    if (incoming.length !== 1 || incoming[0]?.from !== from || incoming[0].kind !== "dynamic") {
      failV1("release.forbidden_artifact_content", "tooling bypasses its fixed dynamic ingress");
    }
  }
  const bypassAdjacency = new Map<string, readonly string[]>(
    [...mutableAdjacency].map(([id, targets]) => [
      id,
      Object.freeze(
        targets.filter(
          (target) =>
            !(
              (id === pocGameRuntimeV1 && target === pocToolingEntryV1) ||
              (id === pocPresentationRuntimeV1 && target === pocToolingUiEntryV1)
            ),
        ),
      ),
    ]),
  );
  const bypassReachable = collectReachableV1(pocHtmlEntryV1, bypassAdjacency);
  if (
    nodes.some(
      (node) =>
        bypassReachable.has(node.id) &&
        (node.id === pocToolingEntryV1 ||
          node.id === pocToolingUiEntryV1 ||
          node.id.startsWith("game/stories/poc/src/tooling/") ||
          node.id.startsWith("game/stories/poc/src/tooling-ui/")),
    )
  ) {
    failV1("release.forbidden_artifact_content", "tooling bypasses its dynamic boundary");
  }
  for (const id of collectReachableV1(pocToolingEntryV1, adjacency)) {
    const node = nodesById.get(id);
    if (
      node === undefined ||
      id.endsWith(".tsx") ||
      id.startsWith("engine/packages/ui/") ||
      id.startsWith("engine/packages/web/") ||
      ["@sillymaker/ui", "@sillymaker/web", "jsdom", "react", "react-dom"].includes(
        node.owningPackage,
      )
    ) {
      failV1("release.forbidden_artifact_content", "Node-safe tooling reaches browser code");
    }
  }

  const chunks = expectArrayV1(graph.chunks, "sourceGraph/chunks").map((entry, index) => {
    const chunk = expectRecordV1(
      entry,
      ["dynamicImports", "entry", "fileName", "imports"],
      `sourceGraph/chunks/${String(index)}`,
    );
    if (chunk.entry !== null && (typeof chunk.entry !== "string" || chunk.entry.length === 0)) {
      failV1("release.invalid_artifact", "source graph chunk entry is invalid");
    }
    const result: GraphChunkV1 = Object.freeze({
      dynamicImports: decodeStringArrayV1(
        chunk.dynamicImports,
        `sourceGraph/chunks/${String(index)}/dynamicImports`,
      ),
      entry: chunk.entry as string | null,
      fileName: expectStringV1(chunk.fileName, `sourceGraph/chunks/${String(index)}/fileName`),
      imports: decodeStringArrayV1(chunk.imports, `sourceGraph/chunks/${String(index)}/imports`),
    });
    assertSafeRelativePathV1(result.fileName, "graph chunk");
    if (result.fileName.endsWith(".map")) {
      failV1("release.forbidden_artifact_content", "source graph declares a source map");
    }
    for (const imported of [...result.imports, ...result.dynamicImports]) {
      assertSafeRelativePathV1(imported, "graph chunk import");
      if (imported.endsWith(".map")) {
        failV1("release.forbidden_artifact_content", "source graph imports a source map");
      }
    }
    if (
      result.entry !== null &&
      ![pocHtmlEntryV1, pocToolingEntryV1, pocToolingUiEntryV1].includes(result.entry)
    ) {
      failV1("release.forbidden_artifact_content", "source graph has an unknown entry chunk");
    }
    return result;
  });
  assertSortedUniqueStringsV1(
    chunks.map((chunk) => chunk.fileName),
    "sourceGraph/chunks",
  );
  const chunkNames = new Set(chunks.map((chunk) => chunk.fileName));
  for (const chunk of chunks) {
    if ([...chunk.imports, ...chunk.dynamicImports].some((path) => !chunkNames.has(path))) {
      failV1("release.forbidden_artifact_content", "source graph imports an unknown chunk");
    }
  }
  for (const entry of [pocHtmlEntryV1, pocToolingEntryV1, pocToolingUiEntryV1]) {
    if (chunks.filter((chunk) => chunk.entry === entry).length !== 1) {
      failV1("release.forbidden_artifact_content", `source graph has the wrong ${entry} chunk`);
    }
  }
  const chunksByEntry = new Map(
    chunks.filter((chunk) => chunk.entry !== null).map((chunk) => [chunk.entry, chunk]),
  );
  const entryChunk = chunksByEntry.get(pocHtmlEntryV1);
  if (entryChunk === undefined) {
    failV1("release.forbidden_artifact_content", "source graph has no application chunk");
  }
  const chunkAdjacency = new Map<string, readonly string[]>(
    chunks.map((chunk) => [
      chunk.fileName,
      Object.freeze([...chunk.imports, ...chunk.dynamicImports]),
    ]),
  );
  if (collectReachableV1(entryChunk.fileName, chunkAdjacency).size !== chunks.length) {
    failV1("release.forbidden_artifact_content", "source graph contains an orphan chunk");
  }
  const staticChunkAdjacency = new Map<string, readonly string[]>(
    chunks.map((chunk) => [chunk.fileName, chunk.imports]),
  );
  const staticChunks = collectReachableV1(entryChunk.fileName, staticChunkAdjacency);
  for (const toolingEntry of [pocToolingEntryV1, pocToolingUiEntryV1]) {
    const toolingChunk = chunksByEntry.get(toolingEntry);
    if (
      toolingChunk === undefined ||
      staticChunks.has(toolingChunk.fileName) ||
      !chunks.some((chunk) => chunk.dynamicImports.includes(toolingChunk.fileName))
    ) {
      failV1("release.forbidden_artifact_content", "tooling chunk is not dynamically isolated");
    }
  }
  return Object.freeze({
    applicationId: "poc-web",
    chunks: Object.freeze(chunks),
    contractRevision: 1,
    dynamicSpecifiers,
    edges: Object.freeze(edges),
    entry: pocApplicationEntryV1,
    nodes: Object.freeze(nodes),
  });
}

function decodeManifestV1(value: unknown): ArtifactManifestV1 {
  const manifest = expectRecordV1(value, ["base", "files", "schemaRevision"], "manifest");
  if (manifest.base !== "./" || manifest.schemaRevision !== 1) {
    failV1("release.invalid_artifact", "manifest authority is invalid");
  }
  const files = expectArrayV1(manifest.files, "manifest/files").map((entry, index) => {
    const record = expectRecordV1(
      entry,
      ["byteLength", "digest", "path"],
      `manifest/files/${String(index)}`,
    );
    const path = expectStringV1(record.path, `manifest/files/${String(index)}/path`);
    assertSafeRelativePathV1(path, "manifest path");
    if (path === artifactManifestFileV1 || path === legacyArtifactManifestFileV1) {
      failV1("release.invalid_artifact", "manifest must exclude manifest authorities");
    }
    if (!Number.isSafeInteger(record.byteLength) || (record.byteLength as number) < 0) {
      failV1("release.invalid_artifact", "manifest byteLength is invalid");
    }
    return Object.freeze({
      byteLength: record.byteLength as number,
      digest: expectDigestV1(record.digest, `manifest/files/${String(index)}/digest`),
      path,
    }) satisfies ArtifactManifestEntryV1;
  });
  assertSortedUniqueStringsV1(
    files.map((entry) => entry.path),
    "manifest/files",
  );
  return Object.freeze({
    base: "./",
    files: Object.freeze(files),
    schemaRevision: 1,
  });
}

function decodeBuildInputV1(value: unknown): Record<string, unknown> {
  const input = expectRecordV1(
    value,
    [
      "applicationHtml",
      "applicationId",
      "host",
      "identities",
      "materializationDigest",
      "provenanceMode",
      "schemaRevision",
      "sourceCommit",
      "sourceGraphDigest",
      "sourceTree",
      "story",
      "tools",
    ],
    "buildInput",
  );
  if (
    input.applicationHtml !== pocHtmlEntryV1 ||
    input.applicationId !== "poc-web" ||
    input.host !== "web" ||
    input.schemaRevision !== 1 ||
    input.story !== "poc"
  ) {
    failV1("release.invalid_artifact", "build-input does not identify poc/web");
  }
  expectDigestV1(input.materializationDigest, "buildInput/materializationDigest");
  expectDigestV1(input.sourceGraphDigest, "buildInput/sourceGraphDigest");
  expectObjectIdV1(input.sourceCommit, "buildInput/sourceCommit");

  const identities = expectRecordV1(
    input.identities,
    ["application", "engine", "resolvedGame", "story"],
    "buildInput/identities",
  );
  const application = expectRecordV1(
    identities.application,
    ["digest"],
    "buildInput/identities/application",
  );
  const engine = expectRecordV1(
    identities.engine,
    ["digest", "version"],
    "buildInput/identities/engine",
  );
  const resolvedGame = expectRecordV1(
    identities.resolvedGame,
    [
      "patchSet",
      "presentationDigest",
      "simulationDigest",
      "stateContractDigest",
      "stateContractRevision",
    ],
    "buildInput/identities/resolvedGame",
  );
  const story = expectRecordV1(
    identities.story,
    ["digest", "id", "revision"],
    "buildInput/identities/story",
  );
  expectDigestV1(application.digest, "buildInput/identities/application/digest");
  expectDigestV1(engine.digest, "buildInput/identities/engine/digest");
  if (engine.version !== "0.0.0") failV1("release.invalid_artifact", "engine version is invalid");
  expectDigestV1(resolvedGame.presentationDigest, "resolvedGame/presentationDigest");
  expectDigestV1(resolvedGame.simulationDigest, "resolvedGame/simulationDigest");
  expectDigestV1(resolvedGame.stateContractDigest, "resolvedGame/stateContractDigest");
  expectPositiveIntegerV1(resolvedGame.stateContractRevision, "resolvedGame/stateContractRevision");
  canonicalArtifactJsonBytesV1(resolvedGame.patchSet);
  expectDigestV1(story.digest, "buildInput/identities/story/digest");
  if (story.id !== "week.poc_001") failV1("release.invalid_artifact", "Story ID is invalid");
  expectPositiveIntegerV1(story.revision, "buildInput/identities/story/revision");
  return input;
}

let materializationDigestPromiseV1: Promise<DigestV1> | undefined;

async function readExpectedMaterializationDigestV1(): Promise<DigestV1> {
  materializationDigestPromiseV1 ??= (async () => {
    const module = (await import(
      new URL("../preflight/materialization-contract.mts", import.meta.url).href
    )) as typeof import("../preflight/materialization-contract.mjs");
    const result = await module.readMaterializationContractV1(repositoryRootV1);
    return expectDigestV1(result.materializationDigest, "materialization contract digest");
  })();
  return await materializationDigestPromiseV1;
}

let toolVersionsPromiseV1: Promise<Readonly<Record<string, string>>> | undefined;

async function readExpectedToolVersionsV1(): Promise<Readonly<Record<string, string>>> {
  toolVersionsPromiseV1 ??= (async () => {
    const manifest = JSON.parse(
      decoderV1.decode(await readFile(resolve(repositoryRootV1, "package.json"))),
    ) as unknown;
    const root = expectRecordV1(
      manifest,
      [
        "devDependencies",
        "engines",
        "license",
        "name",
        "packageManager",
        "private",
        "scripts",
        "type",
        "version",
      ],
      "packageJson",
    );
    const dependencies = expectRecordV1(
      root.devDependencies,
      Object.keys(root.devDependencies as Record<string, unknown>),
      "packageJson/devDependencies",
    );
    if (root.packageManager !== `pnpm@${exactPnpmVersionV1}`) {
      failV1("release.toolchain_mismatch", "package manager is not materialized");
    }
    const typescript = expectStringV1(dependencies.typescript, "devDependencies/typescript");
    const vite = expectStringV1(dependencies.vite, "devDependencies/vite");
    return Object.freeze({
      node: exactNodeVersionV1,
      pnpm: exactPnpmVersionV1,
      typescript,
      vite,
    });
  })();
  return await toolVersionsPromiseV1;
}

function readGitAuthorityV1(): GitSourceAuthorityV1 {
  try {
    const status = execFileSync(
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      { cwd: repositoryRootV1 },
    );
    return Object.freeze({
      clean: status.byteLength === 0,
      sourceCommit: expectObjectIdV1(
        execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repositoryRootV1,
          encoding: "utf8",
        }).trim(),
        "Git/sourceCommit",
      ),
      sourceTree: expectObjectIdV1(
        execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
          cwd: repositoryRootV1,
          encoding: "utf8",
        }).trim(),
        "Git/sourceTree",
      ),
      statusDigest: digestBytesV1(status),
    });
  } catch {
    return failV1(
      "release.source_authority_missing",
      "the Task 2 verifier requires live Git authority",
    );
  }
}

function assertBuildInputStructureV1(
  input: Record<string, unknown>,
  materializationDigest: DigestV1,
  tools: Readonly<Record<string, string>>,
): void {
  if (input.materializationDigest !== materializationDigest) {
    failV1("release.materialization_mismatch", "build-input materialization digest is stale");
  }
  const declaredTools = expectRecordV1(
    input.tools,
    ["node", "pnpm", "typescript", "vite"],
    "buildInput/tools",
  );
  if (
    process.version !== exactNodeVersionV1 ||
    Object.entries(tools).some(([name, value]) => declaredTools[name] !== value)
  ) {
    failV1("release.toolchain_mismatch", "build-input tool versions are stale");
  }
  expectObjectIdV1(input.sourceCommit, "buildInput/sourceCommit");
  if (input.provenanceMode === "clean_commit") {
    expectObjectIdV1(input.sourceTree, "buildInput/sourceTree");
  } else if (input.provenanceMode === "development") {
    if (input.sourceTree !== null) {
      failV1("release.invalid_artifact", "development sourceTree must be null");
    }
  } else {
    failV1("release.invalid_artifact", "build-input provenance mode is unsupported");
  }
}

function assertBuildInputGitAuthorityV1(
  input: Record<string, unknown>,
  options: VerifyPocArtifactOptionsV1,
  before: GitSourceAuthorityV1,
  after: GitSourceAuthorityV1,
): void {
  if (
    before.sourceCommit !== after.sourceCommit ||
    before.sourceTree !== after.sourceTree ||
    before.statusDigest !== after.statusDigest
  ) {
    failV1("release.source_changed", "Git authority changed during Artifact verification");
  }
  const authority = after;
  const sourceCommit = expectObjectIdV1(input.sourceCommit, "buildInput/sourceCommit");
  if (sourceCommit !== authority.sourceCommit) {
    failV1("release.source_mismatch", "build-input source commit is not the verified source");
  }
  if (input.provenanceMode === "clean_commit") {
    if (!before.clean || !after.clean) {
      failV1(
        "release.clean_source_required",
        "clean Artifact verification requires a clean source",
      );
    }
    const sourceTree = expectObjectIdV1(input.sourceTree, "buildInput/sourceTree");
    if (sourceTree !== authority.sourceTree) {
      failV1("release.source_mismatch", "build-input source tree is not the verified source");
    }
  } else if (!options.allowDevelopment) {
    failV1("release.clean_source_required", "development Artifact is not release eligible");
  }
}

async function pathExistsV1(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && Reflect.get(error, "code") === "ENOENT") {
      return false;
    }
    throw error;
  }
}

interface ArtifactRootAuthorityV1 {
  readonly dev: number;
  readonly handle: Awaited<ReturnType<typeof open>>;
  readonly ino: number;
  readonly path: string;
  readonly realPath: string;
}

async function captureArtifactRootAuthorityV1(directory: string): Promise<ArtifactRootAuthorityV1> {
  const path = resolve(directory);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(path),
      realpath(path),
    ]);
    if (
      !handleMetadata.isDirectory() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isDirectory() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino
    ) {
      failV1("release.artifact_target_changed", "Artifact root is not a pinned directory");
    }
    const authority = Object.freeze({
      dev: handleMetadata.dev,
      handle,
      ino: handleMetadata.ino,
      path,
      realPath: actualRealPath,
    });
    handle = undefined;
    return authority;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function assertArtifactRootAuthorityV1(authority: ArtifactRootAuthorityV1): Promise<void> {
  const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
    authority.handle.stat(),
    lstat(authority.path),
    realpath(authority.path),
  ]);
  if (
    !handleMetadata.isDirectory() ||
    pathMetadata.isSymbolicLink() ||
    !pathMetadata.isDirectory() ||
    handleMetadata.dev !== authority.dev ||
    handleMetadata.ino !== authority.ino ||
    pathMetadata.dev !== authority.dev ||
    pathMetadata.ino !== authority.ino ||
    actualRealPath !== authority.realPath
  ) {
    failV1("release.artifact_target_changed", "Artifact root changed during verification");
  }
}

function readGitBlobV1(sourceCommit: string, path: string): Uint8Array {
  try {
    return execFileSync("git", ["show", `${sourceCommit}:${path}`], {
      cwd: repositoryRootV1,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return failV1("release.artifact_legal_mismatch", `${path} is unavailable from source commit`);
  }
}

function assertSafePayloadPathV1(path: string): void {
  assertSafeRelativePathV1(path, "Artifact payload path");
  if (!exactArtifactPayloadFilesV1.has(path) && !path.startsWith("assets/")) {
    failV1("release.forbidden_artifact_content", `undeclared Artifact payload root ${path}`);
  }
  const framed = `/${path}/`;
  const basename = path.split("/").at(-1) ?? "";
  if (
    framed.includes("/references/") ||
    framed.includes("/art-source/aigc/") ||
    path.endsWith(".map") ||
    basename === ".env" ||
    basename.startsWith(".env.") ||
    basename.startsWith(".") ||
    /^(?:credentials?|secrets?)(?:\.|$)/iu.test(basename) ||
    /^id_(?:dsa|ecdsa|ed25519|rsa)(?:\.|$)/iu.test(basename) ||
    /\.(?:cjs|mjs)$/iu.test(basename) ||
    /\.(?:key|pem|p12|pfx)$/iu.test(basename)
  ) {
    failV1("release.forbidden_artifact_content", `forbidden Artifact path ${path}`);
  }
}

function assertRuntimeTextV1(path: string, text: string): void {
  if (/(?:^|[^A-Za-z0-9_.-])references\//u.test(text)) {
    failV1("release.forbidden_artifact_content", `${path} contains references/`);
  }
  for (const marker of ["art-source/aigc/", "sourceMappingURL=", "/Users/"]) {
    if (text.includes(marker))
      failV1("release.forbidden_artifact_content", `${path} contains ${marker}`);
  }
  if (text.includes("\\\\Users\\\\") || text.includes("\\Users\\")) {
    failV1("release.forbidden_artifact_content", `${path} contains a Windows home path`);
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'`<>\\]+/gu)) {
    const candidate = match[0];
    const sensitive = candidate.toLowerCase();
    if (
      /^https?:\/\/[^/@\s]+:[^/@\s]+@/iu.test(candidate) ||
      /(?:secret|credential|api[-_]?key|access[-_]?token|\/token(?:\/|$|[?]))/u.test(sensitive)
    ) {
      failV1("release.forbidden_artifact_content", `${path} contains a credential-bearing URL`);
    }
    if (/\.(?:js|css|png|jpe?g|webp|avif|svg|woff2?|mp3|ogg|wav)(?:$|[?#])/iu.test(candidate)) {
      failV1("release.forbidden_artifact_content", `${path} contains a remote runtime asset`);
    }
  }
  if (/\.(?:html|svg|xml)$/iu.test(path)) {
    for (const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/giu)) {
      const reference = match[1] ?? "";
      if (/^(?:https?:)?\/\//iu.test(reference) || reference.startsWith("/")) {
        failV1("release.forbidden_artifact_content", `${path} contains a remote or root asset`);
      }
    }
  }
  if (path.endsWith(".css")) {
    const inspectedCss = normalizeCssInspectionTextV1(text);
    if (containsCssImportV1(inspectedCss)) {
      failV1("release.forbidden_artifact_content", `${path} contains a CSS import`);
    }
    if (containsNonlocalCssStringV1(inspectedCss)) {
      failV1("release.forbidden_artifact_content", `${path} contains a nonlocal CSS string`);
    }
    for (const match of inspectedCss.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/giu)) {
      const reference = (match[1] ?? "").trim();
      if (
        !/^(?:data:|#)/iu.test(reference) &&
        normalizeLocalArtifactReferenceV1(path, reference) === null
      ) {
        failV1("release.forbidden_artifact_content", `${path} contains a nonlocal CSS asset`);
      }
    }
  }
  if (containsSecretAssignmentV1(text)) {
    failV1("release.forbidden_artifact_content", `${path} contains a secret assignment`);
  }
}

function normalizeCssInspectionTextV1(text: string): string {
  const source = text.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
  let normalized = "";
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (character !== "\\") {
      normalized += character;
      cursor += 1;
      continue;
    }
    const escaped = source.slice(cursor + 1);
    const hex = /^[0-9A-Fa-f]{1,6}/u.exec(escaped)?.[0];
    if (hex !== undefined) {
      const parsed = Number.parseInt(hex, 16);
      const codePoint =
        parsed === 0 || parsed > 0x10ffff || (parsed >= 0xd800 && parsed <= 0xdfff)
          ? 0xfffd
          : parsed;
      normalized += String.fromCodePoint(codePoint);
      cursor += 1 + hex.length;
      if (source[cursor] === "\r" && source[cursor + 1] === "\n") cursor += 2;
      else if (/^[\t\n\f\r ]$/u.test(source[cursor] ?? "")) cursor += 1;
      continue;
    }
    const escapedCharacter = source[cursor + 1];
    if (escapedCharacter === undefined) break;
    if (escapedCharacter === "\r" && source[cursor + 2] === "\n") {
      cursor += 3;
      continue;
    }
    if (/^[\n\r\f]$/u.test(escapedCharacter)) {
      cursor += 2;
      continue;
    }
    normalized += escapedCharacter;
    cursor += 2;
  }
  return normalized;
}

function containsCssImportV1(text: string): boolean {
  return /@import(?![A-Za-z0-9_-])/iu.test(text);
}

function containsNonlocalCssStringV1(text: string): boolean {
  return /["']\s*(?!data:)(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|\/)/iu.test(text);
}

function containsSecretAssignmentV1(text: string): boolean {
  const secretKey = String.raw`(?:(?:[A-Za-z0-9]+[_-])*(?:auth[_-]?token|api[_-]?key|access[_-]?(?:key|token)|private[_-]?key|password|secret|token)|clientSecret|apiKey|accessToken|privateKey)`;
  const quotedAssignment = new RegExp(
    String.raw`(?:^|[^A-Za-z0-9])["']?${secretKey}["']?\s*[:=]\s*(?:"[^"\r\n]{4,}"|'[^'\r\n]{4,}')`,
    "iu",
  );
  const environmentAssignment = new RegExp(
    String.raw`(?:^|[\r\n])\s*(?:export\s+)?${secretKey}\s*=\s*[^\s#;,}]{4,}`,
    "iu",
  );
  return quotedAssignment.test(text) || environmentAssignment.test(text);
}

function normalizeLocalArtifactReferenceV1(sourcePath: string, reference: string): string | null {
  if (reference.length === 0 || reference.startsWith("#") || reference.startsWith("data:")) {
    return null;
  }
  if (
    reference.startsWith("/") ||
    /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/)/u.test(reference) ||
    reference.includes("\\")
  ) {
    failV1("release.forbidden_artifact_content", `${sourcePath} has a nonlocal runtime reference`);
  }
  const withoutSuffix = reference.split(/[?#]/u, 1)[0] ?? "";
  const normalized = posix.normalize(posix.join(posix.dirname(sourcePath), withoutSuffix));
  assertSafeRelativePathV1(normalized, `${sourcePath} runtime reference`);
  return normalized;
}

function parseHtmlTagAttributesV1(source: string): ReadonlyMap<string, string | true> | null {
  const attributes = new Map<string, string | true>();
  let index = 0;
  while (index < source.length) {
    while (/\s/u.test(source[index] ?? "")) index += 1;
    if (index >= source.length) break;
    if (source[index] === "/") {
      return source.slice(index + 1).trim().length === 0 ? attributes : null;
    }
    const nameStart = index;
    while (index < source.length && !/[\s=/>]/u.test(source[index] ?? "")) index += 1;
    const name = source.slice(nameStart, index).toLowerCase();
    if (!/^[a-z_:][a-z0-9:._-]*$/u.test(name) || attributes.has(name)) return null;
    while (/\s/u.test(source[index] ?? "")) index += 1;
    if (source[index] !== "=") {
      attributes.set(name, true);
      continue;
    }
    index += 1;
    while (/\s/u.test(source[index] ?? "")) index += 1;
    const quote = source[index];
    if (quote !== '"' && quote !== "'") return null;
    index += 1;
    const valueStart = index;
    while (index < source.length && source[index] !== quote) index += 1;
    if (index >= source.length) return null;
    attributes.set(name, source.slice(valueStart, index));
    index += 1;
  }
  return attributes;
}

function findHtmlStartTagEndV1(html: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote !== null) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

const allowedArtifactHtmlAttributesV1: Readonly<Record<string, readonly string[]>> = Object.freeze({
  body: Object.freeze([]),
  div: Object.freeze(["id"]),
  head: Object.freeze([]),
  html: Object.freeze(["lang"]),
  link: Object.freeze(["crossorigin", "href", "rel"]),
  meta: Object.freeze(["charset", "content", "name"]),
  script: Object.freeze(["crossorigin", "src", "type"]),
  title: Object.freeze([]),
});

function isUnsafeHtmlAttributeValueV1(value: string): boolean {
  return (
    value.includes("&") ||
    value.includes("<") ||
    value.includes(">") ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    }) ||
    /^\s*javascript\s*:/iu.test(value)
  );
}

function inspectExternalModuleScriptsV1(html: string): readonly string[] {
  const sources: string[] = [];
  let cursor = 0;
  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart < 0) break;
    const remaining = html.slice(tagStart);
    if (remaining.startsWith("<!--")) {
      failV1("release.artifact_graph_mismatch", "index.html contains an HTML comment");
    }
    const closingTag = /^<\/([a-z][a-z0-9:._-]*)\s*>/iu.exec(remaining);
    if (closingTag !== null) {
      const closingName = (closingTag[1] ?? "").toLowerCase();
      if (!Object.hasOwn(allowedArtifactHtmlAttributesV1, closingName)) {
        failV1("release.artifact_graph_mismatch", "index.html contains an unsupported closing tag");
      }
      cursor = tagStart + closingTag[0].length;
      continue;
    }
    const canonicalDoctype = "<!doctype html>";
    if (remaining.slice(0, canonicalDoctype.length).toLowerCase() === canonicalDoctype) {
      cursor = tagStart + canonicalDoctype.length;
      continue;
    }
    if (remaining.startsWith("<!") || remaining.startsWith("<?")) {
      failV1("release.artifact_graph_mismatch", "index.html contains unsupported markup");
    }
    const openingTag = /^<([a-z][a-z0-9:._-]*)\b/iu.exec(remaining);
    if (openingTag === null) {
      cursor = tagStart + 1;
      continue;
    }
    const tagName = (openingTag[1] ?? "").toLowerCase();
    const attributesStart = tagStart + openingTag[0].length;
    const tagEnd = findHtmlStartTagEndV1(html, attributesStart);
    if (tagEnd < 0) {
      failV1("release.artifact_graph_mismatch", `index.html contains an invalid ${tagName} tag`);
    }
    const attributes = parseHtmlTagAttributesV1(html.slice(attributesStart, tagEnd));
    if (attributes === null) {
      failV1(
        "release.artifact_graph_mismatch",
        `index.html contains invalid ${tagName} attributes`,
      );
    }
    if (
      [...attributes].some(
        ([name, value]) =>
          /^on[a-z][a-z0-9:._-]*$/u.test(name) ||
          name === "srcdoc" ||
          name === "style" ||
          (typeof value === "string" && isUnsafeHtmlAttributeValueV1(value)),
      )
    ) {
      failV1("release.artifact_graph_mismatch", "index.html contains inline executable HTML");
    }
    const allowedAttributes = allowedArtifactHtmlAttributesV1[tagName];
    if (
      allowedAttributes === undefined ||
      [...attributes.keys()].some((name) => !allowedAttributes.includes(name))
    ) {
      failV1(
        "release.artifact_graph_mismatch",
        `index.html contains an unsupported ${tagName} tag`,
      );
    }
    if (tagName === "link") {
      const relationship = attributes.get("rel");
      const reference = attributes.get("href");
      if (
        (relationship !== "modulepreload" && relationship !== "stylesheet") ||
        typeof reference !== "string" ||
        normalizeLocalArtifactReferenceV1("index.html", reference) === null
      ) {
        failV1("release.artifact_graph_mismatch", "index.html contains an unsupported link");
      }
    }
    if (tagName === "title") {
      const titleClosing = /<\/title\s*>/giu;
      titleClosing.lastIndex = tagEnd + 1;
      if (titleClosing.exec(html) === null) {
        failV1("release.artifact_graph_mismatch", "index.html contains an invalid title container");
      }
      cursor = titleClosing.lastIndex;
      continue;
    }
    if (tagName !== "script") {
      cursor = tagEnd + 1;
      continue;
    }
    const closing = /^\s*<\/script\s*>/iu.exec(html.slice(tagEnd + 1));
    if (closing === null) {
      failV1("release.artifact_graph_mismatch", "index.html contains an inline script");
    }
    const keys = [...attributes.keys()];
    const source = attributes.get("src");
    if (
      keys.some((key) => !["crossorigin", "src", "type"].includes(key)) ||
      attributes.get("type") !== "module" ||
      typeof source !== "string"
    ) {
      failV1(
        "release.artifact_graph_mismatch",
        "index.html scripts must be closed external modules",
      );
    }
    sources.push(source);
    cursor = tagEnd + 1 + closing[0].length;
  }
  return Object.freeze(sources);
}

function assertHtmlScriptsMatchGraphV1(
  html: string,
  declaredChunks: ReadonlySet<string>,
  applicationChunk: string,
): void {
  const scriptSources = inspectExternalModuleScriptsV1(html);
  if (scriptSources.length === 0) {
    failV1("release.artifact_graph_mismatch", "index.html has no application script");
  }
  for (const reference of scriptSources) {
    const path = normalizeLocalArtifactReferenceV1("index.html", reference);
    if (path === null || !declaredChunks.has(path)) {
      failV1(
        "release.artifact_graph_mismatch",
        `index.html references undeclared script ${reference}`,
      );
    }
  }
  const normalizedSources = scriptSources.map((reference) =>
    normalizeLocalArtifactReferenceV1("index.html", reference),
  );
  if (!normalizedSources.includes(applicationChunk)) {
    failV1("release.artifact_graph_mismatch", "index.html does not load the application chunk");
  }
}

function isArtifactTextPayloadV1(path: string): boolean {
  return (
    path === "index.html" ||
    path === "build-input.json" ||
    path === "source-graph.v1.json" ||
    /\.(?:css|html|js|json|mjs|svg|txt|webmanifest|xml)$/iu.test(path)
  );
}

function assertPayloadBytesV1(path: string, bytes: Uint8Array): void {
  if (projectLegalFilesV1.includes(path)) return;
  assertRuntimeTextV1(path, byteScannerV1.decode(bytes));
  if (isArtifactTextPayloadV1(path)) {
    try {
      decoderV1.decode(bytes);
    } catch {
      failV1("release.invalid_artifact", `${path} is not UTF-8 runtime text`);
    }
  }
}

async function assertPayloadV1(
  artifactRoot: string,
  buildInput: Record<string, unknown>,
  manifest: ArtifactManifestV1,
  graph: PocGraphV1,
  preloadedBytes: ReadonlyMap<string, Uint8Array>,
  legalSourceCommit?: string,
): Promise<void> {
  if (await pathExistsV1(resolve(artifactRoot, legacyArtifactManifestFileV1))) {
    failV1("release.forbidden_artifact_content", "legacy manifest is a second authority");
  }
  const actualPaths = await listArtifactFilesV1(artifactRoot);
  const declaredPaths = manifest.files.map((entry) => entry.path);
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  ) {
    failV1("release.artifact_manifest_mismatch", "manifest does not name the exact payload set");
  }
  const payloadBytes = new Map<string, Uint8Array>();
  for (const entry of manifest.files) {
    assertSafePayloadPathV1(entry.path);
    const bytes =
      preloadedBytes.get(entry.path) ??
      (await readArtifactPayloadBytesV1(artifactRoot, entry.path));
    if (bytes.byteLength !== entry.byteLength || digestBytesV1(bytes) !== entry.digest) {
      failV1("release.artifact_manifest_mismatch", `payload bytes do not match ${entry.path}`);
    }
    payloadBytes.set(entry.path, bytes);
  }
  for (const path of [
    "build-input.json",
    "index.html",
    "source-graph.v1.json",
    ...projectLegalFilesV1,
  ]) {
    const artifactBytes = payloadBytes.get(path);
    if (artifactBytes === undefined) {
      failV1("release.artifact_missing", `required Artifact file ${path} is missing`);
    }
    if (!projectLegalFilesV1.includes(path)) continue;
    const authorityBytes =
      legalSourceCommit !== undefined && buildInput.provenanceMode === "clean_commit"
        ? readGitBlobV1(legalSourceCommit, path)
        : await readFile(resolve(repositoryRootV1, path));
    if (!bytesEqualV1(artifactBytes, authorityBytes)) {
      failV1("release.artifact_legal_mismatch", `${path} differs from repository authority`);
    }
  }
  const declaredChunks = new Set(graph.chunks.map((chunk) => chunk.fileName));
  const emittedJavaScript = actualPaths.filter(
    (path) => path.startsWith("assets/") && path.endsWith(".js"),
  );
  if (
    emittedJavaScript.length !== declaredChunks.size ||
    emittedJavaScript.some((path) => !declaredChunks.has(path)) ||
    [...declaredChunks].some((path) => !emittedJavaScript.includes(path))
  ) {
    failV1("release.artifact_graph_mismatch", "emitted JavaScript is not the declared chunk set");
  }
  const indexBytes = payloadBytes.get("index.html");
  if (indexBytes === undefined) failV1("release.artifact_missing", "index.html is missing");
  const applicationChunk = graph.chunks.find((chunk) => chunk.entry === pocHtmlEntryV1)?.fileName;
  if (applicationChunk === undefined) {
    failV1("release.artifact_graph_mismatch", "application chunk is missing");
  }
  assertHtmlScriptsMatchGraphV1(decoderV1.decode(indexBytes), declaredChunks, applicationChunk);
  for (const [path, bytes] of payloadBytes) {
    assertPayloadBytesV1(path, bytes);
  }
}

function validateVerifyOptionsV1(options: VerifyPocArtifactOptionsV1): void {
  if (
    !isPlainObjectV1(options) ||
    Object.keys(options).some((key) => key !== "allowDevelopment") ||
    (options.allowDevelopment !== undefined && typeof options.allowDevelopment !== "boolean")
  ) {
    failV1("release.invalid_artifact_options", "verifier options are invalid");
  }
}

async function inspectPocArtifactStructureInternalV1(
  directory: string,
  rootAuthority?: ArtifactRootAuthorityV1,
  legalSourceCommit?: string,
): Promise<Record<string, unknown>> {
  const authority = rootAuthority ?? (await captureArtifactRootAuthorityV1(directory));
  const ownsAuthority = rootAuthority === undefined;
  try {
    await assertArtifactRootAuthorityV1(authority);
    const artifactRoot = authority.path;
    const [manifestDocument, buildInputDocument, graphDocument, materializationDigest, tools] =
      await Promise.all([
        readCanonicalJsonV1(artifactRoot, artifactManifestFileV1, "artifact manifest"),
        readCanonicalJsonV1(artifactRoot, "build-input.json", "build-input"),
        readCanonicalJsonV1(artifactRoot, "source-graph.v1.json", "source graph"),
        readExpectedMaterializationDigestV1(),
        readExpectedToolVersionsV1(),
      ]);
    const manifest = decodeManifestV1(manifestDocument.value);
    if (!bytesEqualV1(manifestDocument.bytes, artifactManifestBytesV1(manifest))) {
      failV1("release.artifact_noncanonical", "artifact manifest bytes are not canonical");
    }
    const buildInput = decodeBuildInputV1(buildInputDocument.value);
    const graph = decodeGraphV1(graphDocument.value);
    if (buildInput.sourceGraphDigest !== digestBytesV1(graphDocument.bytes)) {
      failV1("release.artifact_graph_mismatch", "build-input source graph digest is stale");
    }
    assertBuildInputStructureV1(buildInput, materializationDigest, tools);
    await assertPayloadV1(
      artifactRoot,
      buildInput,
      manifest,
      graph,
      new Map([
        ["build-input.json", buildInputDocument.bytes],
        ["source-graph.v1.json", graphDocument.bytes],
      ]),
      legalSourceCommit,
    );
    await assertArtifactRootAuthorityV1(authority);
    const [finalManifest, finalManifestBytes] = await Promise.all([
      createArtifactManifestV1(artifactRoot),
      readArtifactPayloadBytesV1(artifactRoot, artifactManifestFileV1),
    ]);
    if (
      !bytesEqualV1(artifactManifestBytesV1(finalManifest), manifestDocument.bytes) ||
      !bytesEqualV1(finalManifestBytes, manifestDocument.bytes)
    ) {
      failV1(
        "release.artifact_manifest_mismatch",
        "Artifact bytes changed during final snapshot verification",
      );
    }
    await assertArtifactRootAuthorityV1(authority);
    return buildInput;
  } finally {
    if (ownsAuthority) await authority.handle.close().catch(() => undefined);
  }
}

/**
 * Inspects deterministic Artifact structure without establishing source authority or release
 * eligibility. The dedicated Task 3 archive builder owns those authority checks.
 */
export async function inspectPocArtifactStructureV1(directory: string): Promise<void> {
  await inspectPocArtifactStructureInternalV1(directory);
}

export async function verifyPocArtifactV1(
  directory: string,
  options: VerifyPocArtifactOptionsV1 = {},
): Promise<void> {
  validateVerifyOptionsV1(options);
  const rootAuthority = await captureArtifactRootAuthorityV1(directory);
  try {
    const authorityBefore = readGitAuthorityV1();
    const buildInput = await inspectPocArtifactStructureInternalV1(
      directory,
      rootAuthority,
      authorityBefore.sourceCommit,
    );
    const authorityAfter = readGitAuthorityV1();
    await assertArtifactRootAuthorityV1(rootAuthority);
    assertBuildInputGitAuthorityV1(buildInput, options, authorityBefore, authorityAfter);
  } finally {
    await rootAuthority.handle.close().catch(() => undefined);
  }
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const args = process.argv.slice(2);
    const allowDevelopment = args.length === 2 && args[1] === "--allow-development";
    if ((args.length !== 1 && !allowDevelopment) || args[0] === undefined) {
      failV1(
        "release.invalid_artifact_arguments",
        "expected one Artifact directory and optional --allow-development",
      );
    }
    await verifyPocArtifactV1(args[0], { allowDevelopment });
    console.log(`verified PoC Artifact: ${args[0]}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
