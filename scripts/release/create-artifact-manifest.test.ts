// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { canonicalJsonBytes } from "../../engine/packages/base/src/index.js";
import { afterEach, describe, expect, it } from "vitest";

import {
  artifactManifestBytesV1,
  canonicalArtifactJsonBytesV1,
  createArtifactManifestV1,
  writeArtifactManifestV1,
} from "./create-artifact-manifest.mjs";

const temporaryRootsV1: string[] = [];

async function createTemporaryRootV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-artifact-manifest-"));
  temporaryRootsV1.push(root);
  return root;
}

async function createArtifactFixtureV1(
  files: readonly (readonly [path: string, bytes: string | Uint8Array])[],
): Promise<string> {
  const root = await createTemporaryRootV1();
  for (const [path, bytes] of files) {
    const target = join(root, ...path.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return root;
}

afterEach(async () => {
  const roots = temporaryRootsV1.splice(0);
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

describe("createArtifactManifestV1", () => {
  it("sorts POSIX payload paths, hashes exact bytes, and excludes only its own manifest", async () => {
    const payloads = [
      ["index.html", "<main>酒馆</main>\n"],
      ["assets/app.js", Uint8Array.from([0, 255, 128, 10])],
      ["NOTICE", "notice\n"],
      ["build-input.json", '{"name":"桃🍺"}'],
      ["LICENSE.md", "license\n"],
    ] as const;
    const root = await createArtifactFixtureV1([
      ...payloads,
      ["artifact-manifest.json", "stale final manifest"],
    ]);

    const manifest = await createArtifactManifestV1(root);

    expect(manifest).toEqual({
      schemaRevision: 1,
      base: "./",
      files: [
        {
          path: "LICENSE.md",
          byteLength: 8,
          digest: "sha256:c0c56958ef8be5c1979366896b7e0c7206949a5aa2b23f51429c7f56b10990d3",
        },
        {
          path: "NOTICE",
          byteLength: 7,
          digest: "sha256:5de37b4c620461f2b695f1cf6b8ee36e7d025da8334a3693c4ed9aa48a5c7d6a",
        },
        {
          path: "assets/app.js",
          byteLength: 4,
          digest: "sha256:6d6f7836f1e146dc0204afb5133dae52fdc05603d8ac2dc793b481b0e0829fd1",
        },
        {
          path: "build-input.json",
          byteLength: 18,
          digest: "sha256:86e57e41a75427ddd52e5f53c858f87e1fbc384ea0d64e6e082874afc1caa8ad",
        },
        {
          path: "index.html",
          byteLength: 20,
          digest: "sha256:2c20a9566f1e7af67e33ea377cd08404ca737a2db329ab705d05ca69b871c015",
        },
      ],
    });
    expect(manifest.files.map(({ path }) => path)).not.toContain("artifact-manifest.json");
    expect(manifest.files.every(({ digest }) => /^sha256:[0-9a-f]{64}$/u.test(digest))).toBe(true);
  });

  it("rejects a legacy manifest instead of silently leaving an unsigned authority", async () => {
    const root = await createArtifactFixtureV1([
      ["index.html", "payload"],
      ["artifact-manifest.v1.json", "stale legacy manifest"],
    ]);

    await expect(createArtifactManifestV1(root)).rejects.toThrow(/legacy|authority/iu);
  });

  it("uses only the Node 22.12-compatible standard library surface", async () => {
    const source = await readFile(
      new URL("./create-artifact-manifest.mts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("registerHooks");
  });

  it("has deterministic canonical bytes independent of directory creation order", async () => {
    const firstRoot = await createArtifactFixtureV1([
      ["z-last.txt", "last"],
      ["nested/binary.bin", Uint8Array.from([3, 2, 1, 0])],
      ["a-first.txt", "first"],
      ["artifact-manifest.json", "first stale manifest"],
    ]);
    const secondRoot = await createArtifactFixtureV1([
      ["artifact-manifest.json", "different stale manifest"],
      ["a-first.txt", "first"],
      ["nested/binary.bin", Uint8Array.from([3, 2, 1, 0])],
      ["z-last.txt", "last"],
    ]);

    const firstManifest = await createArtifactManifestV1(firstRoot);
    const secondManifest = await createArtifactManifestV1(secondRoot);
    const first = artifactManifestBytesV1(firstManifest);
    const second = artifactManifestBytesV1(secondManifest);

    expect(second).toEqual(first);
    expect(first).toEqual(canonicalJsonBytes(firstManifest));
    expect(new TextDecoder().decode(first)).toBe(
      '{"base":"./","files":[{"byteLength":5,"digest":"sha256:a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e","path":"a-first.txt"},{"byteLength":4,"digest":"sha256:0714146c8fe6ae04f23d44476c0658ed157c4f65d8920a8c11a009b4daace2c6","path":"nested/binary.bin"},{"byteLength":4,"digest":"sha256:3547cb112ac4489af2310c0626cdba6f3097a2ad5a3b42ddd3b59c76c7a079a3","path":"z-last.txt"}],"schemaRevision":1}',
    );
  });

  it("atomically replaces a stale manifest without candidate or claimed-root residue", async () => {
    const root = await createArtifactFixtureV1([
      ["artifact-manifest.json", "stale manifest"],
      ["assets/app.js", "export {};\n"],
      ["index.html", "<main></main>\n"],
    ]);

    const manifest = await writeArtifactManifestV1(root);
    const finalBytes = await readFile(join(root, "artifact-manifest.json"));
    const rootEntries = await readdir(root);
    const siblingEntries = await readdir(dirname(root));

    expect(Uint8Array.from(finalBytes)).toEqual(artifactManifestBytesV1(manifest));
    expect(rootEntries.some((entry) => entry.includes(".candidate-"))).toBe(false);
    expect(siblingEntries.some((entry) => entry.startsWith(`${basename(root)}.claimed-`))).toBe(
      false,
    );
  });

  it("matches Base canonical JSON and rejects lone-surrogate data", () => {
    const value = { "\u{10000}": "astral", "\ue000": "bmp" };

    expect(canonicalArtifactJsonBytesV1(value)).toEqual(canonicalJsonBytes(value));
    expect(() => canonicalArtifactJsonBytesV1({ invalid: "\ud800" })).toThrow(/surrogate/iu);
  });

  it("rejects a symbolic-link payload instead of hashing its target", async () => {
    const root = await createArtifactFixtureV1([["assets/app.js", "payload"]]);
    await symlink(join(root, "assets/app.js"), join(root, "assets/linked.js"), "file");

    await expect(createArtifactManifestV1(root)).rejects.toThrow(/symlink|symbolic/iu);
  });

  it("rejects a symlinked directory that escapes the Artifact root", async () => {
    const root = await createArtifactFixtureV1([["index.html", "payload"]]);
    const outside = await createArtifactFixtureV1([["secret.txt", "must not be hashed"]]);
    await symlink(outside, join(root, "escape"), "dir");

    await expect(createArtifactManifestV1(root)).rejects.toThrow(/symlink|escape/iu);
  });

  it("rejects non-file filesystem entries", async () => {
    const root = await createArtifactFixtureV1([["index.html", "payload"]]);
    const socketPath = join(root, "runtime.sock");
    const server = createServer();
    server.listen(socketPath);
    await once(server, "listening");

    try {
      await expect(createArtifactManifestV1(root)).rejects.toThrow(
        /non[-_ ]?file|unsupported|socket|artifact.*(?:entry|path|forbidden)/iu,
      );
    } finally {
      await server[Symbol.asyncDispose]();
    }
  });
});
