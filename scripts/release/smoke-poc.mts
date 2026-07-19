// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const pocStaticServerContractV1 = Object.freeze({
  artifactRoot: "dist/poc",
  basePath: "/nested/tavern/",
  host: "127.0.0.1",
  port: 41731,
  url: "http://127.0.0.1:41731/nested/tavern/",
} as const);

export type StaticPocArtifactErrorCodeV1 =
  | "artifact.invalid_base_path"
  | "artifact.invalid_smoke_cli"
  | "artifact.invalid_static_asset"
  | "artifact.path_traversal"
  | "artifact.port_unavailable"
  | "artifact.root_missing"
  | "artifact.root_relative_url"
  | "artifact.symlink";

export interface StaticPocArtifactErrorV1 extends TypeError {
  readonly code: StaticPocArtifactErrorCodeV1;
}

export interface StaticPocArtifactServerV1 {
  readonly basePath: typeof pocStaticServerContractV1.basePath;
  readonly close: () => Promise<void>;
  readonly host: typeof pocStaticServerContractV1.host;
  readonly port: typeof pocStaticServerContractV1.port;
  readonly root: string;
  readonly url: typeof pocStaticServerContractV1.url;
}

type RequestFileResultV1 =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "missing" }
  | { readonly kind: "outside" };

const defaultRepositoryRootV1 = resolve(import.meta.dirname, "../..");
const utf8DecoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const contentTypesV1: Readonly<Record<string, string>> = Object.freeze({
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});

function staticPocArtifactErrorV1(
  code: StaticPocArtifactErrorCodeV1,
  detail: string,
): StaticPocArtifactErrorV1 {
  const error = new TypeError(`${code}: ${detail}`) as StaticPocArtifactErrorV1;
  Object.defineProperty(error, "code", { enumerable: true, value: code });
  return error;
}

function isMissingPathErrorV1(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { readonly code?: unknown }).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

function isContainedPathV1(parent: string, child: string): boolean {
  const relativePath = relative(parent, child);
  return (
    relativePath === "" ||
    (relativePath !== ".." && !isAbsolute(relativePath) && !relativePath.startsWith(`..${sep}`))
  );
}

function assertFixedBasePathV1(basePath: string): void {
  if (basePath !== pocStaticServerContractV1.basePath) {
    throw staticPocArtifactErrorV1(
      "artifact.invalid_base_path",
      `Static PoC smoke requires ${pocStaticServerContractV1.basePath}`,
    );
  }
}

async function resolveArtifactRootV1(root: string): Promise<string> {
  const logicalRoot = resolve(root);
  let entry;
  try {
    entry = await lstat(logicalRoot);
  } catch (error) {
    if (isMissingPathErrorV1(error)) {
      throw staticPocArtifactErrorV1(
        "artifact.root_missing",
        `Static PoC Artifact root does not exist: ${root}`,
      );
    }
    throw error;
  }
  if (entry.isSymbolicLink()) {
    throw staticPocArtifactErrorV1(
      "artifact.symlink",
      `Static PoC Artifact root must not be a symlink: ${root}`,
    );
  }
  if (!entry.isDirectory()) {
    throw staticPocArtifactErrorV1(
      "artifact.root_missing",
      `Static PoC Artifact root is not a directory: ${root}`,
    );
  }
  return realpath(logicalRoot);
}

function hasRootRelativeHtmlUrlV1(text: string): boolean {
  return /\b(?:action|formaction|href|manifest|poster|src|srcset)\s*=\s*(?:["']\s*)?\//iu.test(
    text,
  );
}

function hasRootRelativeCssUrlV1(text: string): boolean {
  return /(?:\burl\(\s*|@import\s+)(?:["']\s*)?\//iu.test(text);
}

async function collectBrowserReferenceFilesV1(
  root: string,
  directory = root,
): Promise<readonly string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      files.push(...(await collectBrowserReferenceFilesV1(root, path)));
      continue;
    }
    if (entry.isFile() && /\.(?:css|html)$/iu.test(entry.name)) files.push(path);
  }
  return Object.freeze(files);
}

async function assertRelativeBrowserUrlsV1(root: string): Promise<void> {
  const indexPath = join(root, "index.html");
  let indexEntry;
  try {
    indexEntry = await lstat(indexPath);
  } catch (error) {
    if (isMissingPathErrorV1(error)) {
      throw staticPocArtifactErrorV1(
        "artifact.root_missing",
        "Static PoC Artifact index.html is missing",
      );
    }
    throw error;
  }
  if (indexEntry.isSymbolicLink()) {
    throw staticPocArtifactErrorV1(
      "artifact.symlink",
      "Static PoC Artifact index.html must not be a symlink",
    );
  }
  if (!indexEntry.isFile()) {
    throw staticPocArtifactErrorV1(
      "artifact.root_missing",
      "Static PoC Artifact index.html is not a file",
    );
  }

  const files = await collectBrowserReferenceFilesV1(root);
  for (const file of files) {
    let text: string;
    try {
      text = utf8DecoderV1.decode(await readFile(file));
    } catch {
      throw staticPocArtifactErrorV1(
        "artifact.invalid_static_asset",
        `${relative(root, file)} is not UTF-8 browser text`,
      );
    }
    const extension = extname(file).toLowerCase();
    const hasRootRelativeUrl =
      extension === ".html" ? hasRootRelativeHtmlUrlV1(text) : hasRootRelativeCssUrlV1(text);
    if (hasRootRelativeUrl) {
      throw staticPocArtifactErrorV1(
        "artifact.root_relative_url",
        `${relative(root, file)} contains a root-relative browser URL`,
      );
    }
  }
}

/** Checks the prebuilt browser entry and styles without starting a process or changing bytes. */
export async function smokeStaticPocArtifactV1(root: string, basePath: string): Promise<void> {
  assertFixedBasePathV1(basePath);
  const canonicalRoot = await resolveArtifactRootV1(root);
  await assertRelativeBrowserUrlsV1(canonicalRoot);
}

function requestSegmentsV1(requestUrl: string): RequestFileResultV1 | readonly string[] {
  const rawPath = requestUrl.split(/[?#]/u, 1)[0] ?? "/";
  if (!rawPath.startsWith(pocStaticServerContractV1.basePath)) return { kind: "outside" };
  if (/%(?:2f|5c)/iu.test(rawPath) || rawPath.includes("\\")) return { kind: "invalid" };

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { kind: "invalid" };
  }
  if (decodedPath.includes("\0") || decodedPath.includes("\\")) return { kind: "invalid" };
  if (!decodedPath.startsWith(pocStaticServerContractV1.basePath)) return { kind: "invalid" };

  const relativePath = decodedPath.slice(pocStaticServerContractV1.basePath.length);
  if (relativePath.length === 0) return Object.freeze([]);
  const segments = relativePath.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === ".." || segment.startsWith("."),
    )
  ) {
    return { kind: "invalid" };
  }
  return Object.freeze(segments);
}

async function resolveRequestFileV1(
  root: string,
  requestUrl: string,
): Promise<RequestFileResultV1> {
  const requested = requestSegmentsV1(requestUrl);
  if (!Array.isArray(requested)) return requested as RequestFileResultV1;
  const segments = requested.length === 0 ? ["index.html"] : requested;
  let currentPath = root;
  try {
    for (const segment of segments) {
      currentPath = join(currentPath, segment);
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) return { kind: "invalid" };
    }
    const entry = await lstat(currentPath);
    if (!entry.isFile()) return { kind: "missing" };
    const canonicalPath = await realpath(currentPath);
    if (!isContainedPathV1(root, canonicalPath)) return { kind: "invalid" };
    return { kind: "file", path: canonicalPath };
  } catch (error) {
    if (isMissingPathErrorV1(error)) return { kind: "missing" };
    throw error;
  }
}

function emptyResponseV1(response: ServerResponse, status: number): void {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": "0",
    "x-content-type-options": "nosniff",
  });
  response.end();
}

async function handleStaticRequestV1(
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      emptyResponseV1(response, 405);
      return;
    }

    const file = await resolveRequestFileV1(root, request.url ?? "/");
    if (file.kind === "outside" || file.kind === "missing") {
      emptyResponseV1(response, 404);
      return;
    }
    if (file.kind === "invalid") {
      emptyResponseV1(response, 400);
      return;
    }

    const bytes = await readFile(file.path);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(bytes.byteLength),
      "content-type":
        contentTypesV1[extname(file.path).toLowerCase()] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    response.end(method === "HEAD" ? undefined : bytes);
  } catch {
    if (!response.headersSent) emptyResponseV1(response, 500);
    else response.destroy();
  }
}

/** Serves one existing PoC directory at the fixed release-smoke endpoint. */
export async function startStaticPocArtifactServerV1(
  root: string,
): Promise<StaticPocArtifactServerV1> {
  await smokeStaticPocArtifactV1(root, pocStaticServerContractV1.basePath);
  const canonicalRoot = await resolveArtifactRootV1(root);
  const server = createServer((request, response) => {
    void handleStaticRequestV1(canonicalRoot, request, response);
  });

  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(
        {
          exclusive: true,
          host: pocStaticServerContractV1.host,
          port: pocStaticServerContractV1.port,
        },
        () => {
          server.removeListener("error", rejectListen);
          resolveListen();
        },
      );
    });
  } catch {
    server.close();
    throw staticPocArtifactErrorV1(
      "artifact.port_unavailable",
      `Static PoC smoke port is unavailable: ${pocStaticServerContractV1.port}`,
    );
  }

  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => (error === undefined ? resolveClose() : rejectClose(error)));
      server.closeAllConnections();
    });
    return closePromise;
  };

  return Object.freeze({
    basePath: pocStaticServerContractV1.basePath,
    close,
    host: pocStaticServerContractV1.host,
    port: pocStaticServerContractV1.port,
    root: canonicalRoot,
    url: pocStaticServerContractV1.url,
  });
}

export function parseStaticPocServerCliArgumentsV1(argumentsV1: readonly string[]): "serve" {
  if (argumentsV1.length !== 1 || argumentsV1[0] !== "serve") {
    throw staticPocArtifactErrorV1("artifact.invalid_smoke_cli", "usage: smoke-poc.mts serve");
  }
  return "serve";
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    parseStaticPocServerCliArgumentsV1(process.argv.slice(2));
    const root = resolve(defaultRepositoryRootV1, pocStaticServerContractV1.artifactRoot);
    const server = await startStaticPocArtifactServerV1(root);
    console.log(`PoC Artifact available at ${server.url}`);

    let closing = false;
    const close = (): void => {
      if (closing) return;
      closing = true;
      void server.close().catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "Static PoC server close failed");
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "artifact.static_smoke_failed";
    const message = error instanceof Error ? error.message : "Static PoC smoke failed";
    console.error(`${code}: ${message}`);
    process.exitCode = 1;
  }
}
