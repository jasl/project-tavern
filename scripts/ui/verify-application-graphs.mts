// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile as readFileBytesV1 } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CanonicalJsonBytesV1 = (value: unknown) => Uint8Array;
type DigestBytesV1 = (bytes: Uint8Array) => string;
type ParseStrictJsonLimitsV1 = (input: {
  readonly maxArrayItems: number;
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxObjectMembers: number;
  readonly maxStringBytes: number;
}) => unknown;
type ParseStrictJsonV1 = (
  bytes: Uint8Array,
  limits: unknown,
) =>
  | { readonly ok: true; readonly value: unknown }
  | { readonly error: { readonly code: string }; readonly ok: false };

interface BaseJsonFunctionsV1 {
  readonly canonicalJsonBytes: CanonicalJsonBytesV1;
  readonly digestBytes: DigestBytesV1;
  readonly parseStrictJson: ParseStrictJsonV1;
  readonly parseStrictJsonLimitsV1: ParseStrictJsonLimitsV1;
}

function loadBaseJsonFunctionsV1(): BaseJsonFunctionsV1 {
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".mjs")) {
          return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
        }
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });
  const requireFromVerifierV1 = createRequire(import.meta.url);
  try {
    const canonicalModule: unknown = requireFromVerifierV1(
      resolve(import.meta.dirname, "../../engine/packages/base/src/contracts/canonical-json.ts"),
    );
    const digestModule: unknown = requireFromVerifierV1(
      resolve(import.meta.dirname, "../../engine/packages/base/src/contracts/digest.ts"),
    );
    const strictJsonModule: unknown = requireFromVerifierV1(
      resolve(import.meta.dirname, "../../engine/packages/base/src/contracts/strict-json.ts"),
    );
    const canonicalJsonBytes = Reflect.get(Object(canonicalModule), "canonicalJsonBytes");
    const digestBytes = Reflect.get(Object(digestModule), "digestBytes");
    const parseStrictJson = Reflect.get(Object(strictJsonModule), "parseStrictJson");
    const parseStrictJsonLimitsV1 = Reflect.get(
      Object(strictJsonModule),
      "parseStrictJsonLimitsV1",
    );
    if (
      typeof canonicalJsonBytes !== "function" ||
      typeof digestBytes !== "function" ||
      typeof parseStrictJson !== "function" ||
      typeof parseStrictJsonLimitsV1 !== "function"
    ) {
      throw new TypeError("SillyMaker Base JSON functions are unavailable");
    }
    return Object.freeze({
      canonicalJsonBytes: canonicalJsonBytes as CanonicalJsonBytesV1,
      digestBytes: digestBytes as DigestBytesV1,
      parseStrictJson: parseStrictJson as ParseStrictJsonV1,
      parseStrictJsonLimitsV1: parseStrictJsonLimitsV1 as ParseStrictJsonLimitsV1,
    });
  } finally {
    hooks.deregister();
  }
}

const { canonicalJsonBytes, digestBytes, parseStrictJson, parseStrictJsonLimitsV1 } =
  loadBaseJsonFunctionsV1();

const applicationGraphJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxArrayItems: 32_768,
  maxBytes: 4 * 1024 * 1024,
  maxDepth: 8,
  maxNodes: 131_072,
  maxObjectMembers: 8,
  maxStringBytes: 16 * 1024,
});

type ApplicationGraphErrorCodeV1 =
  | "ui.application_graph_forbidden"
  | "ui.application_graph_invalid"
  | "ui.application_graph_missing"
  | "ui.application_graph_noncanonical";

class ApplicationGraphErrorV1 extends TypeError {
  readonly code: ApplicationGraphErrorCodeV1;

  constructor(code: ApplicationGraphErrorCodeV1, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ApplicationGraphErrorV1";
    this.code = code;
  }
}

interface ApplicationGraphNodeV1 {
  readonly id: string;
  readonly owningPackage: string;
}

interface ApplicationGraphEdgeV1 {
  readonly from: string;
  readonly kind: "dynamic" | "static";
  readonly to: string;
}

interface ApplicationGraphChunkV1 {
  readonly dynamicImports: readonly string[];
  readonly entry: string | null;
  readonly fileName: string;
  readonly imports: readonly string[];
}

export interface ApplicationGraphManifestV1 {
  readonly applicationId: string;
  readonly chunks: readonly ApplicationGraphChunkV1[];
  readonly contractRevision: 1;
  readonly dynamicSpecifiers: readonly string[];
  readonly edges: readonly ApplicationGraphEdgeV1[];
  readonly entry: string;
  readonly nodes: readonly ApplicationGraphNodeV1[];
}

interface ApplicationContractV1 {
  readonly applicationId: "e2e-web" | "poc-web";
  readonly entry: string;
  readonly htmlEntry: string;
  readonly manifestPath: string;
  readonly packageName: string;
  readonly presentationRuntime: string;
  readonly story: "e2e" | "poc";
  readonly storyEntries: readonly string[];
  readonly storyRoot: string;
  readonly gameRuntime: string;
  readonly toolingEntry: string;
  readonly toolingSpecifiers: readonly string[];
  readonly toolingUiEntry: string;
}

const applicationContractsV1: readonly ApplicationContractV1[] = Object.freeze([
  Object.freeze({
    applicationId: "e2e-web",
    entry: "game/stories/e2e/src/application/entry.tsx",
    htmlEntry: "game/stories/e2e/index.html",
    manifestPath: "dist/e2e/source-graph.v1.json",
    packageName: "@project-tavern/story-e2e",
    presentationRuntime: "game/stories/e2e/src/application/create-e2e-presentation-runtime.ts",
    story: "e2e",
    storyEntries: Object.freeze(["game/stories/e2e/src/index.ts"]),
    storyRoot: "game/stories/e2e",
    gameRuntime: "game/stories/e2e/src/application/create-e2e-game-runtime.ts",
    toolingEntry: "game/stories/e2e/src/tooling.ts",
    toolingSpecifiers: Object.freeze([
      "@project-tavern/story-e2e/tooling",
      "@project-tavern/story-e2e/tooling-ui",
    ]),
    toolingUiEntry: "game/stories/e2e/src/tooling-ui/index.ts",
  }),
  Object.freeze({
    applicationId: "poc-web",
    entry: "game/stories/poc/src/application/entry.tsx",
    htmlEntry: "game/stories/poc/index.html",
    manifestPath: "dist/poc/source-graph.v1.json",
    packageName: "@project-tavern/story-poc",
    presentationRuntime: "game/stories/poc/src/application/create-poc-presentation-runtime.ts",
    story: "poc",
    storyEntries: Object.freeze([
      "game/stories/poc/src/index.ts",
      "game/stories/poc/src/story-definition.ts",
    ]),
    storyRoot: "game/stories/poc",
    gameRuntime: "game/stories/poc/src/application/create-poc-game-runtime.ts",
    toolingEntry: "game/stories/poc/src/tooling/index.ts",
    toolingSpecifiers: Object.freeze([
      "@project-tavern/story-poc/tooling",
      "@project-tavern/story-poc/tooling-ui",
    ]),
    toolingUiEntry: "game/stories/poc/src/tooling-ui/index.ts",
  }),
]);

const compareTextV1 = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function invalidV1(detail: string): never {
  throw new ApplicationGraphErrorV1("ui.application_graph_invalid", detail);
}

function forbiddenV1(detail: string): never {
  throw new ApplicationGraphErrorV1("ui.application_graph_forbidden", detail);
}

function expectRecordV1(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    invalidV1(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function expectExactKeysV1(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort(compareTextV1);
  const expected = [...keys].sort(compareTextV1);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalidV1(`${label} has invalid keys`);
  }
}

function expectArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) invalidV1(`${label} must be an array`);
  return value;
}

function expectStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    invalidV1(`${label} must be a non-empty string`);
  }
  return value;
}

function decodeStringArrayV1(value: unknown, label: string): readonly string[] {
  return Object.freeze(
    expectArrayV1(value, label).map((item, index) =>
      expectStringV1(item, `${label}[${String(index)}]`),
    ),
  );
}

function decodeNodeV1(value: unknown, index: number): ApplicationGraphNodeV1 {
  const label = `nodes[${String(index)}]`;
  const record = expectRecordV1(value, label);
  expectExactKeysV1(record, ["id", "owningPackage"], label);
  return Object.freeze({
    id: expectStringV1(record.id, `${label}.id`),
    owningPackage: expectStringV1(record.owningPackage, `${label}.owningPackage`),
  });
}

function decodeEdgeV1(value: unknown, index: number): ApplicationGraphEdgeV1 {
  const label = `edges[${String(index)}]`;
  const record = expectRecordV1(value, label);
  expectExactKeysV1(record, ["from", "kind", "to"], label);
  const kind = expectStringV1(record.kind, `${label}.kind`);
  if (kind !== "dynamic" && kind !== "static") {
    invalidV1(`${label}.kind is invalid`);
  }
  return Object.freeze({
    from: expectStringV1(record.from, `${label}.from`),
    kind,
    to: expectStringV1(record.to, `${label}.to`),
  });
}

function decodeChunkV1(value: unknown, index: number): ApplicationGraphChunkV1 {
  const label = `chunks[${String(index)}]`;
  const record = expectRecordV1(value, label);
  expectExactKeysV1(record, ["dynamicImports", "entry", "fileName", "imports"], label);
  if (record.entry !== null && typeof record.entry !== "string") {
    invalidV1(`${label}.entry must be a string or null`);
  }
  if (record.entry === "") invalidV1(`${label}.entry must not be empty`);
  return Object.freeze({
    dynamicImports: decodeStringArrayV1(record.dynamicImports, `${label}.dynamicImports`),
    entry: record.entry as string | null,
    fileName: expectStringV1(record.fileName, `${label}.fileName`),
    imports: decodeStringArrayV1(record.imports, `${label}.imports`),
  });
}

function decodeManifestV1(value: unknown): ApplicationGraphManifestV1 {
  const record = expectRecordV1(value, "manifest");
  expectExactKeysV1(
    record,
    ["applicationId", "chunks", "contractRevision", "dynamicSpecifiers", "edges", "entry", "nodes"],
    "manifest",
  );
  if (record.contractRevision !== 1) invalidV1("manifest.contractRevision must be 1");
  return Object.freeze({
    applicationId: expectStringV1(record.applicationId, "manifest.applicationId"),
    chunks: Object.freeze(
      expectArrayV1(record.chunks, "manifest.chunks").map((chunk, index) =>
        decodeChunkV1(chunk, index),
      ),
    ),
    contractRevision: 1,
    dynamicSpecifiers: decodeStringArrayV1(record.dynamicSpecifiers, "manifest.dynamicSpecifiers"),
    edges: Object.freeze(
      expectArrayV1(record.edges, "manifest.edges").map((edge, index) => decodeEdgeV1(edge, index)),
    ),
    entry: expectStringV1(record.entry, "manifest.entry"),
    nodes: Object.freeze(
      expectArrayV1(record.nodes, "manifest.nodes").map((node, index) => decodeNodeV1(node, index)),
    ),
  });
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function assertSortedUniqueV1<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
  label: string,
): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined || compare(previous, current) >= 0) {
      forbiddenV1(`${label} must be sorted and unique`);
    }
  }
}

function assertSafePackageNameV1(value: string, label: string): void {
  if (value.length > 256 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(value)) {
    forbiddenV1(`${label} is not a normalized package name`);
  }
}

function knownVirtualOwnerV1(id: string, contract: ApplicationContractV1): string | null {
  const owners = new Map<string, string>([
    [`virtual:project-tavern/${contract.story}-build-identity`, contract.packageName],
    ["virtual:rolldown/runtime", "rolldown"],
    ["virtual:vite/modulepreload-polyfill.js", "vite"],
    ["virtual:vite/preload-helper.js", "vite"],
  ]);
  return owners.get(id) ?? null;
}

function assertSafePathV1(
  value: string,
  label: string,
  contract: ApplicationContractV1,
  allowVirtual: boolean,
): void {
  const virtualOwner = allowVirtual ? knownVirtualOwnerV1(value, contract) : null;
  if (virtualOwner !== null) return;
  if (value.startsWith("virtual:")) forbiddenV1(`${label} is an unknown virtual module`);
  if (
    value.length > 16 * 1024 ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    /^[a-zA-Z]:/u.test(value) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(value) ||
    value.includes("?") ||
    value.includes("#")
  ) {
    forbiddenV1(`${label} is not a normalized relative path`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    forbiddenV1(`${label} is not a normalized relative path`);
  }
}

function expectedWorkspaceOwnerV1(id: string): string | null {
  const prefixes: readonly (readonly [string, string])[] = [
    ["engine/packages/base/", "@sillymaker/base"],
    ["engine/packages/ui/", "@sillymaker/ui"],
    ["engine/packages/web/", "@sillymaker/web"],
    ["game/packages/assets/", "@project-tavern/assets"],
    ["game/stories/e2e/", "@project-tavern/story-e2e"],
    ["game/stories/poc/", "@project-tavern/story-poc"],
  ];
  return prefixes.find(([prefix]) => id.startsWith(prefix))?.[1] ?? null;
}

function expectedNodeModulesOwnerV1(id: string): string | null {
  const marker = "/node_modules/";
  const markedIndex = id.lastIndexOf(marker);
  const packageStart =
    markedIndex >= 0 ? markedIndex + marker.length : id.startsWith("node_modules/") ? 13 : -1;
  if (packageStart < 0) return null;
  const remainder = id.slice(packageStart);
  const segments = remainder.split("/");
  const first = segments[0];
  if (first === undefined || first === "") return null;
  if (first.startsWith("@")) {
    const second = segments[1];
    return second === undefined || second === "" ? null : `${first}/${second}`;
  }
  return first;
}

function assertNodeOwnerV1(node: ApplicationGraphNodeV1, contract: ApplicationContractV1): void {
  assertSafePackageNameV1(node.owningPackage, `${node.id}.owningPackage`);
  const dependencyOwner = expectedNodeModulesOwnerV1(node.id);
  if (
    dependencyOwner !== null &&
    (dependencyOwner.startsWith("@project-tavern/") ||
      dependencyOwner.startsWith("@sillymaker/") ||
      node.owningPackage.startsWith("@project-tavern/") ||
      node.owningPackage.startsWith("@sillymaker/"))
  ) {
    forbiddenV1(`${node.id} disguises a workspace package as a dependency`);
  }
  if (
    node.owningPackage.startsWith("@project-tavern/story-") &&
    node.owningPackage !== contract.packageName
  ) {
    forbiddenV1(`${node.id} belongs to another Story`);
  }
  const expected =
    knownVirtualOwnerV1(node.id, contract) ?? dependencyOwner ?? expectedWorkspaceOwnerV1(node.id);
  if (expected === null) {
    forbiddenV1(`${node.id} is outside declared package ownership`);
  }
  if (expected !== null && node.owningPackage !== expected) {
    forbiddenV1(`${node.id} has the wrong owning package`);
  }
}

function hasForbiddenProductionPathV1(path: string): boolean {
  const framed = `/${path}/`;
  return framed.includes("/references/") || framed.includes("/art-source/aigc/");
}

function assertNoSourceMapV1(path: string, label: string): void {
  if (path.endsWith(".map") || path.includes(".map/")) {
    forbiddenV1(`${label} contains a source map`);
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

function assertNodeSafeClosureV1(
  root: string,
  label: string,
  nodesById: ReadonlyMap<string, ApplicationGraphNodeV1>,
  adjacency: ReadonlyMap<string, readonly string[]>,
): void {
  if (!nodesById.has(root)) forbiddenV1(`${label} root is missing`);
  for (const id of collectReachableV1(root, adjacency)) {
    const node = nodesById.get(id);
    if (node === undefined) forbiddenV1(`${label} has a dangling node`);
    if (
      id.endsWith(".tsx") ||
      id.startsWith("engine/packages/ui/") ||
      id.startsWith("engine/packages/web/") ||
      node.owningPackage === "@sillymaker/ui" ||
      node.owningPackage === "@sillymaker/web" ||
      node.owningPackage === "jsdom" ||
      node.owningPackage === "react" ||
      node.owningPackage === "react-dom"
    ) {
      forbiddenV1(`${label} reaches browser-only module ${id}`);
    }
  }
}

function assertApplicationGraphPolicyV1(
  manifest: ApplicationGraphManifestV1,
  contract: ApplicationContractV1,
): void {
  if (manifest.applicationId !== contract.applicationId) {
    forbiddenV1(`${contract.manifestPath} has the wrong applicationId`);
  }
  if (manifest.entry !== contract.entry) {
    forbiddenV1(`${contract.applicationId} has the wrong application entry`);
  }
  if (
    manifest.dynamicSpecifiers.length !== contract.toolingSpecifiers.length ||
    manifest.dynamicSpecifiers.some(
      (specifier, index) => specifier !== contract.toolingSpecifiers[index],
    )
  ) {
    forbiddenV1(`${contract.applicationId} has unexpected tooling specifiers`);
  }

  assertSortedUniqueV1(manifest.nodes, (left, right) => compareTextV1(left.id, right.id), "nodes");
  assertSortedUniqueV1(
    manifest.edges,
    (left, right) =>
      compareTextV1(left.from, right.from) ||
      compareTextV1(left.kind, right.kind) ||
      compareTextV1(left.to, right.to),
    "edges",
  );
  assertSortedUniqueV1(manifest.dynamicSpecifiers, compareTextV1, "dynamicSpecifiers");
  assertSortedUniqueV1(
    manifest.chunks,
    (left, right) => compareTextV1(left.fileName, right.fileName),
    "chunks",
  );

  const nodesById = new Map<string, ApplicationGraphNodeV1>();
  for (const node of manifest.nodes) {
    assertSafePathV1(node.id, "node.id", contract, true);
    assertNoSourceMapV1(node.id, "node.id");
    if (hasForbiddenProductionPathV1(node.id)) {
      forbiddenV1(`production graph contains ${node.id}`);
    }
    assertNodeOwnerV1(node, contract);
    nodesById.set(node.id, node);
  }
  if (!nodesById.has(contract.entry)) forbiddenV1(`${contract.applicationId} entry is missing`);
  if (!nodesById.has(contract.htmlEntry)) {
    forbiddenV1(`${contract.applicationId} HTML root is missing`);
  }

  const htmlNodes = manifest.nodes.filter((node) => node.id.endsWith(".html"));
  if (htmlNodes.length !== 1 || htmlNodes[0]?.id !== contract.htmlEntry) {
    forbiddenV1(`${contract.applicationId} must have exactly one matching HTML root`);
  }
  const otherStory = contract.story === "e2e" ? "poc" : "e2e";
  if (manifest.nodes.some((node) => node.id.startsWith(`game/stories/${otherStory}/`))) {
    forbiddenV1(`${contract.applicationId} imports another Story`);
  }

  const mutableAdjacency = new Map<string, string[]>();
  for (const node of manifest.nodes) mutableAdjacency.set(node.id, []);
  for (const edge of manifest.edges) {
    assertSafePathV1(edge.from, "edge.from", contract, true);
    assertSafePathV1(edge.to, "edge.to", contract, true);
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) {
      forbiddenV1("edge endpoint is not declared in nodes");
    }
    const sourceOwner = nodesById.get(edge.from)?.owningPackage;
    const targetOwner = nodesById.get(edge.to)?.owningPackage;
    const targetIsStory = targetOwner?.startsWith("@project-tavern/story-") === true;
    if (
      (edge.from.startsWith("engine/packages/web/") || sourceOwner === "@sillymaker/web") &&
      (edge.to.startsWith("game/stories/") || targetIsStory)
    ) {
      forbiddenV1("@sillymaker/web imports a Story");
    }
    if (
      sourceOwner?.startsWith("@project-tavern/story-") === true &&
      targetIsStory &&
      sourceOwner !== targetOwner
    ) {
      forbiddenV1("one Story imports another Story");
    }
    mutableAdjacency.get(edge.from)?.push(edge.to);
  }
  const adjacency = new Map<string, readonly string[]>(
    [...mutableAdjacency].map(([id, targets]) => [id, Object.freeze(targets)]),
  );
  const applicationReachable = collectReachableV1(contract.htmlEntry, adjacency);
  if (!applicationReachable.has(contract.entry)) {
    forbiddenV1(`${contract.applicationId} HTML root does not reach its application entry`);
  }
  if (applicationReachable.size !== manifest.nodes.length) {
    forbiddenV1(`${contract.applicationId} contains an orphan node`);
  }

  const presentStoryEntries = contract.storyEntries.filter((candidate) => nodesById.has(candidate));
  if (presentStoryEntries.length === 0) {
    forbiddenV1(`${contract.story} default Story root is missing`);
  }
  for (const storyEntry of presentStoryEntries) {
    assertNodeSafeClosureV1(
      storyEntry,
      `${contract.story} default Story closure`,
      nodesById,
      adjacency,
    );
  }
  assertNodeSafeClosureV1(
    contract.toolingEntry,
    `${contract.story} tooling closure`,
    nodesById,
    adjacency,
  );
  if (!nodesById.has(contract.toolingUiEntry)) {
    forbiddenV1(`${contract.story} tooling-ui root is missing`);
  }
  const fixedToolingEdges = Object.freeze([
    Object.freeze({ from: contract.gameRuntime, to: contract.toolingEntry }),
    Object.freeze({ from: contract.presentationRuntime, to: contract.toolingUiEntry }),
  ]);
  for (const expectedEdge of fixedToolingEdges) {
    const incomingEdges = manifest.edges.filter((edge) => edge.to === expectedEdge.to);
    if (
      incomingEdges.length !== 1 ||
      incomingEdges[0]?.kind !== "dynamic" ||
      incomingEdges[0].from !== expectedEdge.from
    ) {
      forbiddenV1(`${contract.story} tooling export is not imported from its fixed runtime`);
    }
  }
  const bypassAdjacencyMutable = new Map<string, string[]>();
  for (const node of manifest.nodes) bypassAdjacencyMutable.set(node.id, []);
  for (const edge of manifest.edges) {
    const isFixedToolingEdge = fixedToolingEdges.some(
      (expectedEdge) =>
        edge.kind === "dynamic" && edge.from === expectedEdge.from && edge.to === expectedEdge.to,
    );
    if (!isFixedToolingEdge) bypassAdjacencyMutable.get(edge.from)?.push(edge.to);
  }
  const bypassReachable = collectReachableV1(
    contract.htmlEntry,
    new Map<string, readonly string[]>(bypassAdjacencyMutable),
  );
  const toolingPrefix = `${contract.storyRoot}/src/tooling/`;
  const toolingReachable = collectReachableV1(contract.toolingEntry, adjacency);
  const toolingUiPrefix = `${contract.storyRoot}/src/tooling-ui/`;
  const toolingUiReachable = collectReachableV1(contract.toolingUiEntry, adjacency);
  const protectedToolingReachable = new Set([...toolingReachable, ...toolingUiReachable]);
  for (const node of manifest.nodes) {
    if (
      bypassReachable.has(node.id) &&
      (node.id === contract.toolingEntry ||
        node.id === contract.toolingUiEntry ||
        node.id.startsWith(toolingPrefix) ||
        node.id.startsWith(toolingUiPrefix))
    ) {
      forbiddenV1(`${contract.story} tooling closure bypasses its fixed dynamic ingress`);
    }
    if (node.id.startsWith(toolingUiPrefix) && !toolingUiReachable.has(node.id)) {
      forbiddenV1(`${contract.story} tooling-ui module bypasses its public root`);
    }
    if (
      node.id.endsWith(".tsx") &&
      node.id.startsWith(`${contract.storyRoot}/src/tooling`) &&
      !node.id.startsWith(toolingUiPrefix)
    ) {
      forbiddenV1(`${contract.story} Node-safe tooling contains TSX`);
    }
  }
  for (const edge of manifest.edges) {
    const isInternalToolingTarget =
      (edge.to.startsWith(toolingPrefix) && edge.to !== contract.toolingEntry) ||
      (edge.to.startsWith(toolingUiPrefix) && edge.to !== contract.toolingUiEntry);
    if (isInternalToolingTarget && !protectedToolingReachable.has(edge.from)) {
      forbiddenV1(`${contract.story} tooling module bypasses its public root`);
    }
  }

  const chunksByFileName = new Map<string, ApplicationGraphChunkV1>();
  const allowedChunkEntries = new Set([
    contract.htmlEntry,
    contract.toolingEntry,
    contract.toolingUiEntry,
  ]);
  for (const chunk of manifest.chunks) {
    assertSafePathV1(chunk.fileName, "chunk.fileName", contract, false);
    assertNoSourceMapV1(chunk.fileName, "chunk.fileName");
    if (hasForbiddenProductionPathV1(chunk.fileName)) {
      forbiddenV1(`output chunk contains forbidden path ${chunk.fileName}`);
    }
    if (chunk.fileName.endsWith(".html")) {
      forbiddenV1("HTML must not be described as an output chunk");
    }
    assertSortedUniqueV1(chunk.imports, compareTextV1, `${chunk.fileName}.imports`);
    assertSortedUniqueV1(chunk.dynamicImports, compareTextV1, `${chunk.fileName}.dynamicImports`);
    for (const imported of [...chunk.imports, ...chunk.dynamicImports]) {
      assertSafePathV1(imported, `${chunk.fileName} import`, contract, false);
      assertNoSourceMapV1(imported, `${chunk.fileName} import`);
      if (hasForbiddenProductionPathV1(imported)) {
        forbiddenV1(`${chunk.fileName} imports a forbidden output path`);
      }
    }
    if (chunk.entry !== null) {
      assertSafePathV1(chunk.entry, `${chunk.fileName}.entry`, contract, true);
      if (!nodesById.has(chunk.entry)) {
        forbiddenV1(`${chunk.fileName} entry is not declared in nodes`);
      }
      if (!allowedChunkEntries.has(chunk.entry)) {
        forbiddenV1(`${chunk.fileName} is an unexpected developer entry`);
      }
    }
    chunksByFileName.set(chunk.fileName, chunk);
  }
  for (const chunk of manifest.chunks) {
    for (const imported of [...chunk.imports, ...chunk.dynamicImports]) {
      if (!chunksByFileName.has(imported)) {
        forbiddenV1(`${chunk.fileName} imports an undeclared chunk`);
      }
    }
  }
  const chunksByEntry = new Map<string, ApplicationGraphChunkV1>();
  for (const requiredEntry of allowedChunkEntries) {
    const matchingChunks = manifest.chunks.filter((chunk) => chunk.entry === requiredEntry);
    if (matchingChunks.length !== 1 || matchingChunks[0] === undefined) {
      forbiddenV1(`${contract.applicationId} must have exactly one chunk for ${requiredEntry}`);
    }
    chunksByEntry.set(requiredEntry, matchingChunks[0]);
  }
  const chunkAdjacency = new Map<string, readonly string[]>(
    manifest.chunks.map((chunk) => [
      chunk.fileName,
      Object.freeze([...chunk.imports, ...chunk.dynamicImports]),
    ]),
  );
  const entryChunk = manifest.chunks.find((chunk) => chunk.entry === contract.htmlEntry);
  if (entryChunk === undefined) forbiddenV1(`${contract.applicationId} entry chunk is missing`);
  if (collectReachableV1(entryChunk.fileName, chunkAdjacency).size !== manifest.chunks.length) {
    forbiddenV1(`${contract.applicationId} contains an orphan chunk`);
  }
  const staticChunkAdjacency = new Map<string, readonly string[]>(
    manifest.chunks.map((chunk) => [chunk.fileName, chunk.imports]),
  );
  const staticallyReachableChunks = collectReachableV1(entryChunk.fileName, staticChunkAdjacency);
  for (const toolingEntry of [contract.toolingEntry, contract.toolingUiEntry]) {
    const toolingChunk = chunksByEntry.get(toolingEntry);
    if (toolingChunk === undefined) forbiddenV1(`${toolingEntry} chunk is missing`);
    if (
      !manifest.chunks.some((chunk) => chunk.dynamicImports.includes(toolingChunk.fileName)) ||
      staticallyReachableChunks.has(toolingChunk.fileName)
    ) {
      forbiddenV1(`${toolingEntry} chunk is not dynamically isolated`);
    }
  }
}

interface VerifyApplicationGraphsInputV1 {
  readonly readFile?: (absolutePath: string) => Promise<Uint8Array>;
  readonly root?: string;
}

export interface VerifyApplicationGraphsResultV1 {
  readonly applications: readonly { readonly id: string; readonly root: string }[];
  readonly developerRoots: readonly string[];
  readonly dynamicSpecifiers: readonly string[];
  readonly manifestBytes: Readonly<{ e2e: Uint8Array; poc: Uint8Array }>;
  readonly manifests: readonly {
    readonly applicationId: string;
    readonly digest: string;
    readonly path: string;
  }[];
  readonly manifestValues: Readonly<{
    e2e: ApplicationGraphManifestV1;
    poc: ApplicationGraphManifestV1;
  }>;
}

async function readManifestV1(
  contract: ApplicationContractV1,
  root: string,
  readFile: (absolutePath: string) => Promise<Uint8Array>,
): Promise<{ readonly bytes: Uint8Array; readonly value: ApplicationGraphManifestV1 }> {
  let bytes: Uint8Array;
  try {
    bytes = await readFile(resolve(root, contract.manifestPath));
  } catch (error) {
    const code =
      typeof error === "object" && error !== null ? Reflect.get(error, "code") : undefined;
    if (code === "ENOENT" || code === "ENOTDIR") {
      throw new ApplicationGraphErrorV1(
        "ui.application_graph_missing",
        `${contract.manifestPath} is unavailable`,
      );
    }
    invalidV1(`${contract.manifestPath} could not be read`);
  }
  if (!(bytes instanceof Uint8Array)) invalidV1(`${contract.manifestPath} is not bytes`);
  const parsed = parseStrictJson(bytes, applicationGraphJsonLimitsV1);
  if (!parsed.ok) {
    invalidV1(`${contract.manifestPath} strict JSON failed: ${parsed.error.code}`);
  }
  const value = decodeManifestV1(parsed.value);
  let canonical: Uint8Array;
  try {
    canonical = canonicalJsonBytes(value);
  } catch {
    invalidV1(`${contract.manifestPath} cannot be canonically encoded`);
  }
  if (!bytesEqualV1(bytes, canonical)) {
    throw new ApplicationGraphErrorV1(
      "ui.application_graph_noncanonical",
      `${contract.manifestPath} bytes are not canonical`,
    );
  }
  assertApplicationGraphPolicyV1(value, contract);
  return Object.freeze({ bytes, value });
}

export async function verifyApplicationGraphsV1(
  input: VerifyApplicationGraphsInputV1 = {},
): Promise<VerifyApplicationGraphsResultV1> {
  const root = resolve(input.root ?? resolve(import.meta.dirname, "../.."));
  const readFile = input.readFile ?? readFileBytesV1;
  const e2eContract = applicationContractsV1[0];
  const pocContract = applicationContractsV1[1];
  if (e2eContract === undefined || pocContract === undefined) {
    invalidV1("application graph contracts are unavailable");
  }
  const e2e = await readManifestV1(e2eContract, root, readFile);
  const poc = await readManifestV1(pocContract, root, readFile);
  return Object.freeze({
    applications: Object.freeze(
      applicationContractsV1.map((contract) =>
        Object.freeze({ id: contract.applicationId, root: contract.entry }),
      ),
    ),
    developerRoots: Object.freeze([]),
    dynamicSpecifiers: Object.freeze(
      applicationContractsV1.flatMap((contract) => contract.toolingSpecifiers),
    ),
    manifestBytes: Object.freeze({ e2e: e2e.bytes, poc: poc.bytes }),
    manifests: Object.freeze([
      Object.freeze({
        applicationId: e2eContract.applicationId,
        digest: digestBytes(e2e.bytes),
        path: e2eContract.manifestPath,
      }),
      Object.freeze({
        applicationId: pocContract.applicationId,
        digest: digestBytes(poc.bytes),
        path: pocContract.manifestPath,
      }),
    ]),
    manifestValues: Object.freeze({ e2e: e2e.value, poc: poc.value }),
  });
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = await verifyApplicationGraphsV1();
    for (const manifest of result.manifests) {
      console.log(`${manifest.applicationId} ${manifest.path} ${manifest.digest}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
