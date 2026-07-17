// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { lstat, readFile, realpath } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const storyRootServerBindAddressV1 = "127.0.0.1" as const;

export const storyRootServerTargetsV1 = Object.freeze({
  e2e: Object.freeze({
    applicationId: "e2e-web",
    port: 41731,
    root: "dist/e2e",
  }),
  poc: Object.freeze({
    applicationId: "poc-web",
    port: 41732,
    root: "dist/poc",
  }),
});

export type StoryRootServerTargetNameV1 = keyof typeof storyRootServerTargetsV1;

export type StoryRootServerErrorCodeV1 =
  | "ui_server.invalid_cli"
  | "ui_server.non_loopback"
  | "ui_server.path_traversal"
  | "ui_server.port_unavailable"
  | "ui_server.root_missing"
  | "ui_server.root_not_allowed"
  | "ui_server.symlink";

export interface StoryRootServerErrorV1 extends TypeError {
  readonly code: StoryRootServerErrorCodeV1;
}

export interface StoryRootServerV1 {
  readonly applicationId: string;
  readonly bindAddress: typeof storyRootServerBindAddressV1;
  readonly close: () => Promise<void>;
  readonly port: number;
  readonly root: string;
  readonly url: string;
}

export interface StoryRootServerFixtureV1 {
  readonly bindAddress: typeof storyRootServerBindAddressV1;
  readonly close: () => Promise<void>;
  readonly ports: Readonly<Record<StoryRootServerTargetNameV1, number>>;
  readonly targets: Readonly<
    Record<StoryRootServerTargetNameV1, { readonly applicationId: string; readonly root: string }>
  >;
  readonly urls: Readonly<Record<StoryRootServerTargetNameV1, string>>;
}

interface ResolvedStoryRootV1 {
  readonly absoluteRoot: string;
  readonly target: (typeof storyRootServerTargetsV1)[StoryRootServerTargetNameV1];
}

const defaultRepositoryRootV1 = resolve(import.meta.dirname, "../..");

function storyRootServerErrorV1(
  code: StoryRootServerErrorCodeV1,
  message: string,
): StoryRootServerErrorV1 {
  const error = new TypeError(message) as StoryRootServerErrorV1;
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

function validateRootInputV1(root: string): void {
  if (/^[a-z][a-z\d+.-]*:/iu.test(root)) {
    let url: URL;
    try {
      url = new URL(root);
    } catch {
      throw storyRootServerErrorV1("ui_server.non_loopback", "Story root must be local");
    }
    if (url.hostname !== storyRootServerBindAddressV1) {
      throw storyRootServerErrorV1(
        "ui_server.non_loopback",
        `Story root URL is not loopback: ${url.hostname}`,
      );
    }
    throw storyRootServerErrorV1(
      "ui_server.root_not_allowed",
      "Story root must be a repository-relative output path",
    );
  }

  const segments = root.split("/");
  if (
    root.length === 0 ||
    isAbsolute(root) ||
    root.includes("\\") ||
    segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)
  ) {
    throw storyRootServerErrorV1(
      "ui_server.path_traversal",
      `Story root is not a safe relative path: ${root}`,
    );
  }
}

async function resolveStoryRootV1(
  root: string,
  repositoryRoot: string,
): Promise<ResolvedStoryRootV1> {
  validateRootInputV1(root);
  const logicalRepositoryRoot = resolve(repositoryRoot);
  const logicalRoot = resolve(logicalRepositoryRoot, root);
  if (!isContainedPathV1(logicalRepositoryRoot, logicalRoot)) {
    throw storyRootServerErrorV1(
      "ui_server.path_traversal",
      `Story root escapes the repository: ${root}`,
    );
  }

  let currentPath = logicalRepositoryRoot;
  try {
    for (const segment of root.split("/")) {
      currentPath = join(currentPath, segment);
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) {
        throw storyRootServerErrorV1("ui_server.symlink", `Story root contains a symlink: ${root}`);
      }
    }
  } catch (error) {
    if (error instanceof TypeError && "code" in error) throw error;
    if (isMissingPathErrorV1(error)) {
      throw storyRootServerErrorV1("ui_server.root_missing", `Story root does not exist: ${root}`);
    }
    throw error;
  }

  const target = Object.values(storyRootServerTargetsV1).find((entry) => entry.root === root);
  if (target === undefined) {
    throw storyRootServerErrorV1(
      "ui_server.root_not_allowed",
      `Story root is outside the fixed target set: ${root}`,
    );
  }

  const rootEntry = await lstat(logicalRoot);
  if (!rootEntry.isDirectory()) {
    throw storyRootServerErrorV1(
      "ui_server.root_missing",
      `Story root is not a directory: ${root}`,
    );
  }

  const indexPath = join(logicalRoot, "index.html");
  try {
    const indexEntry = await lstat(indexPath);
    if (indexEntry.isSymbolicLink()) {
      throw storyRootServerErrorV1("ui_server.symlink", `Story root index is a symlink: ${root}`);
    }
    if (!indexEntry.isFile()) {
      throw storyRootServerErrorV1(
        "ui_server.root_missing",
        `Story root index is not a file: ${root}`,
      );
    }
  } catch (error) {
    if (error instanceof TypeError && "code" in error) throw error;
    if (isMissingPathErrorV1(error)) {
      throw storyRootServerErrorV1(
        "ui_server.root_missing",
        `Story root index does not exist: ${root}`,
      );
    }
    throw error;
  }

  const [canonicalRepositoryRoot, canonicalRoot] = await Promise.all([
    realpath(logicalRepositoryRoot),
    realpath(logicalRoot),
  ]);
  if (!isContainedPathV1(canonicalRepositoryRoot, canonicalRoot)) {
    throw storyRootServerErrorV1(
      "ui_server.symlink",
      `Story root resolves outside the repository: ${root}`,
    );
  }
  return Object.freeze({ absoluteRoot: canonicalRoot, target });
}

function requestSegmentsV1(requestUrl: string): readonly string[] | undefined {
  const rawPath = requestUrl.split(/[?#]/u, 1)[0] ?? "/";
  if (!rawPath.startsWith("/") || rawPath.includes("\\")) return undefined;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return undefined;
  }
  if (decodedPath.includes("\0") || decodedPath.includes("\\")) return undefined;

  const segments = decodedPath.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === ".." || segment.startsWith("."))) {
    return undefined;
  }
  return Object.freeze(segments);
}

type RequestFileResultV1 =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "missing" };

async function resolveRequestFileV1(
  absoluteRoot: string,
  segments: readonly string[],
): Promise<RequestFileResultV1> {
  const fileSegments = segments.length === 0 ? ["index.html"] : segments;
  let currentPath = absoluteRoot;
  try {
    for (const segment of fileSegments) {
      currentPath = join(currentPath, segment);
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) return { kind: "invalid" };
    }
    const entry = await lstat(currentPath);
    if (!entry.isFile()) return { kind: "missing" };
    const canonicalPath = await realpath(currentPath);
    if (!isContainedPathV1(absoluteRoot, canonicalPath)) return { kind: "invalid" };
    return { kind: "file", path: canonicalPath };
  } catch (error) {
    if (isMissingPathErrorV1(error)) return { kind: "missing" };
    throw error;
  }
}

const contentTypesV1: Readonly<Record<string, string>> = Object.freeze({
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});

function emptyResponseV1(response: ServerResponse, status: number): void {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": "0",
    "x-content-type-options": "nosniff",
  });
  response.end();
}

async function handleRequestV1(
  absoluteRoot: string,
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

    const segments = requestSegmentsV1(request.url ?? "/");
    if (segments === undefined) {
      emptyResponseV1(response, 400);
      return;
    }
    const file = await resolveRequestFileV1(absoluteRoot, segments);
    if (file.kind === "invalid") {
      emptyResponseV1(response, 400);
      return;
    }
    if (file.kind === "missing") {
      emptyResponseV1(response, 404);
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

/** Starts one member of the fixed, prebuilt Story target set without building or writing bytes. */
export async function createStoryRootServerV1(
  root: string,
  repositoryRoot = defaultRepositoryRootV1,
): Promise<StoryRootServerV1> {
  const resolvedRoot = await resolveStoryRootV1(root, repositoryRoot);
  const server = createServer((request, response) => {
    void handleRequestV1(resolvedRoot.absoluteRoot, request, response);
  });

  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(
        {
          exclusive: true,
          host: storyRootServerBindAddressV1,
          port: resolvedRoot.target.port,
        },
        () => {
          server.removeListener("error", rejectListen);
          resolveListen();
        },
      );
    });
  } catch {
    throw storyRootServerErrorV1(
      "ui_server.port_unavailable",
      `Story root port is unavailable: ${resolvedRoot.target.port}`,
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
    applicationId: resolvedRoot.target.applicationId,
    bindAddress: storyRootServerBindAddressV1,
    close,
    port: resolvedRoot.target.port,
    root: resolvedRoot.target.root,
    url: `http://${storyRootServerBindAddressV1}:${resolvedRoot.target.port}`,
  });
}

/** Starts both fixed targets for unit and browser-harness fixtures. */
export async function createStoryRootServerFixtureV1(
  repositoryRoot = defaultRepositoryRootV1,
): Promise<StoryRootServerFixtureV1> {
  const e2e = await createStoryRootServerV1(storyRootServerTargetsV1.e2e.root, repositoryRoot);
  let poc: StoryRootServerV1;
  try {
    poc = await createStoryRootServerV1(storyRootServerTargetsV1.poc.root, repositoryRoot);
  } catch (error) {
    await e2e.close();
    throw error;
  }

  return Object.freeze({
    bindAddress: storyRootServerBindAddressV1,
    close: async () => {
      await Promise.all([e2e.close(), poc.close()]);
    },
    ports: Object.freeze({ e2e: e2e.port, poc: poc.port }),
    targets: Object.freeze({
      e2e: Object.freeze({ applicationId: e2e.applicationId, root: e2e.root }),
      poc: Object.freeze({ applicationId: poc.applicationId, root: poc.root }),
    }),
    urls: Object.freeze({ e2e: e2e.url, poc: poc.url }),
  });
}

export function parseStoryRootServerCliArgumentsV1(
  argumentsV1: readonly string[],
): StoryRootServerTargetNameV1 {
  if (
    argumentsV1.length !== 2 ||
    argumentsV1[0] !== "--target" ||
    (argumentsV1[1] !== "e2e" && argumentsV1[1] !== "poc")
  ) {
    throw storyRootServerErrorV1(
      "ui_server.invalid_cli",
      "usage: serve-story-roots.mts --target <e2e|poc>",
    );
  }
  return argumentsV1[1];
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const targetName = parseStoryRootServerCliArgumentsV1(process.argv.slice(2));
    const target = storyRootServerTargetsV1[targetName];
    const server = await createStoryRootServerV1(target.root);
    console.log(`${server.applicationId} available at ${server.url}`);

    let closing = false;
    const close = (): void => {
      if (closing) return;
      closing = true;
      void server.close().catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "Story root server close failed");
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "ui_server.failed";
    const message = error instanceof Error ? error.message : "Story root server failed";
    console.error(`${code}: ${message}`);
    process.exitCode = 1;
  }
}
