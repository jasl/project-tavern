// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listArtifactFilesV1,
  prepareArtifactDirectoryV1,
  projectLegalFilesV1,
} from "./prepare-artifact.mjs";

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function probeNestedServing(root) {
  const prefix = "/project-tavern/";
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith(prefix)) {
        response.writeHead(404).end();
        return;
      }
      const relativePath = decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
      if (relativePath.includes("..")) {
        response.writeHead(400).end();
        return;
      }
      const bytes = await readFile(join(root, relativePath));
      response.writeHead(200, {
        "content-type":
          extname(relativePath) === ".html" ? "text/html" : "application/octet-stream",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  try {
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new TypeError("local server has no port");
    const entryUrl = `http://127.0.0.1:${address.port}${prefix}index.html#/play`;
    const entryResponse = await fetch(entryUrl);
    if (!entryResponse.ok) return [`nested local serving failed: index ${entryResponse.status}`];
    const html = await entryResponse.text();
    const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gu)].map(
      (match) => match[1],
    );
    const errors = [];
    for (const asset of assetUrls) {
      if (!asset || /^(?:data:|https?:|#)/u.test(asset)) continue;
      const assetResponse = await fetch(new URL(asset, entryUrl));
      if (!assetResponse.ok) errors.push(`nested local serving failed: ${asset}`);
    }
    return errors;
  } finally {
    await new Promise((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose())),
    );
  }
}

export async function verifyArtifactDirectoryV1(root, options = {}) {
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(root, "artifact-manifest.v1.json"), "utf8"));
  } catch {
    return ["missing or invalid artifact manifest"];
  }
  if (manifest.schemaRevision !== 1) errors.push("artifact schemaRevision must be 1");
  if (manifest.base !== "./") errors.push("artifact base must be ./");
  if (!Array.isArray(manifest.files))
    return [...errors, "artifact manifest files must be an array"];

  const entries = manifest.files;
  const paths = entries.map((entry) => entry.path);
  if (JSON.stringify(paths) !== JSON.stringify(paths.toSorted())) {
    errors.push("artifact manifest paths are not sorted");
  }
  if (new Set(paths).size !== paths.length) errors.push("artifact manifest paths are not unique");
  if (paths.includes("artifact-manifest.v1.json"))
    errors.push("artifact manifest must exclude itself");

  let actualFiles = [];
  try {
    actualFiles = await listArtifactFilesV1(root);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  for (const path of actualFiles) {
    if (!paths.includes(path)) errors.push(`artifact manifest missing file: ${path}`);
    if (path.endsWith(".map")) errors.push(`source map is forbidden: ${path}`);
  }
  for (const path of paths) {
    if (!actualFiles.includes(path)) errors.push(`artifact manifest has missing file: ${path}`);
  }

  for (const entry of entries) {
    if (
      typeof entry?.path !== "string" ||
      entry.path.startsWith("/") ||
      entry.path.includes("..")
    ) {
      errors.push(`invalid artifact path: ${String(entry?.path)}`);
      continue;
    }
    try {
      const bytes = await readFile(join(root, entry.path));
      if (entry.byteLength !== bytes.byteLength) errors.push(`byteLength mismatch: ${entry.path}`);
      if (entry.digest !== digest(bytes)) errors.push(`digest mismatch: ${entry.path}`);
    } catch {
      // The missing path is reported by the manifest/file-set comparison.
    }
  }
  for (const path of projectLegalFilesV1) {
    if (!(await exists(join(root, path)))) errors.push(`missing project legal file: ${path}`);
  }
  try {
    const html = await readFile(join(root, "index.html"), "utf8");
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gu)) {
      const reference = match[1];
      if (reference?.startsWith("/"))
        errors.push(`artifact HTML contains absolute URL: ${reference}`);
    }
  } catch {
    errors.push("artifact is missing index.html");
  }
  if (options.probeNested !== false && errors.length === 0) {
    errors.push(...(await probeNestedServing(root)));
  }
  return errors;
}

export async function verifyTemporaryPlayerArtifactV1(repositoryRoot) {
  const artifactRoot = await mkdtemp(join(tmpdir(), "tavern-player-artifact-"));
  try {
    const result = spawnSync("pnpm", ["build:player"], {
      cwd: repositoryRoot,
      env: { ...process.env, TAVERN_OUT_DIR: artifactRoot },
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new TypeError(`temporary Player build failed\n${result.stdout}${result.stderr}`);
    }
    await prepareArtifactDirectoryV1(repositoryRoot, artifactRoot);
    return await verifyArtifactDirectoryV1(artifactRoot);
  } finally {
    await rm(artifactRoot, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyTemporaryPlayerArtifactV1(repositoryRoot);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("temporary Player artifact verified");
  }
}
