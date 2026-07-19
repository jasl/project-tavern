// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import { canonicalJsonBytes, digestBytes } from "../../engine/packages/base/src/index.js";
import { afterEach, describe, expect, it } from "vitest";

import { inspectPocArtifactStructureV1, verifyPocArtifactV1 } from "./verify-poc-artifact.mjs";

type DigestV1 = `sha256:${string}`;

interface GraphNodeFixtureV1 {
  id: string;
  owningPackage: string;
}

interface GraphEdgeFixtureV1 {
  from: string;
  kind: "dynamic" | "static";
  to: string;
}

interface GraphChunkFixtureV1 {
  dynamicImports: string[];
  entry: string | null;
  fileName: string;
  imports: string[];
}

interface GraphManifestFixtureV1 {
  applicationId: string;
  chunks: GraphChunkFixtureV1[];
  contractRevision: number;
  dynamicSpecifiers: string[];
  edges: GraphEdgeFixtureV1[];
  entry: string;
  nodes: GraphNodeFixtureV1[];
}

interface ArtifactManifestEntryFixtureV1 {
  byteLength: number;
  digest: DigestV1;
  path: string;
}

interface ArtifactManifestFixtureV1 {
  base: string;
  files: ArtifactManifestEntryFixtureV1[];
  schemaRevision: number;
}

interface PocArtifactFixtureV1 {
  buildInput: Record<string, unknown>;
  graph: GraphManifestFixtureV1;
  root: string;
}

interface LiveAuthorityFixtureV1 {
  materializationDigest: DigestV1;
  sourceCommit: string;
  sourceTree: string;
}

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const execFileAsyncV1 = promisify(execFile);
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const temporaryRootsV1: string[] = [];
const projectLegalFilesV1 = Object.freeze([
  "LICENSE.md",
  "LICENSES/CC-BY-NC-SA-4.0.txt",
  "LICENSES/MIT.txt",
  "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "TRADEMARKS.md",
]);

let liveAuthorityPromiseV1: Promise<LiveAuthorityFixtureV1> | undefined;

function compareTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digestFixtureV1(character: string): DigestV1 {
  return `sha256:${character.repeat(64)}`;
}

async function readLiveAuthorityV1(): Promise<LiveAuthorityFixtureV1> {
  liveAuthorityPromiseV1 ??= (async () => {
    const [sourceCommitResult, sourceTreeResult, attestationText] = await Promise.all([
      execFileAsyncV1("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRootV1,
        encoding: "utf8",
      }),
      execFileAsyncV1("git", ["rev-parse", "HEAD^{tree}"], {
        cwd: repositoryRootV1,
        encoding: "utf8",
      }),
      readFile(join(repositoryRootV1, ".project-tavern/goal-materialization.json"), "utf8"),
    ]);
    const attestation = JSON.parse(attestationText) as Record<string, unknown>;
    const materializationDigest = attestation.materializationDigest;
    if (typeof materializationDigest !== "string" || !digestPatternV1.test(materializationDigest)) {
      throw new TypeError("fixture materialization attestation has no valid digest");
    }
    return Object.freeze({
      materializationDigest: materializationDigest as DigestV1,
      sourceCommit: sourceCommitResult.stdout.trim(),
      sourceTree: sourceTreeResult.stdout.trim(),
    });
  })();
  return liveAuthorityPromiseV1;
}

function normalizedGraphV1(input: GraphManifestFixtureV1): GraphManifestFixtureV1 {
  const graph = structuredClone(input);
  graph.nodes.sort((left, right) => compareTextV1(left.id, right.id));
  graph.edges.sort(
    (left, right) =>
      compareTextV1(left.from, right.from) ||
      compareTextV1(left.kind, right.kind) ||
      compareTextV1(left.to, right.to),
  );
  graph.dynamicSpecifiers.sort(compareTextV1);
  graph.chunks.sort((left, right) => compareTextV1(left.fileName, right.fileName));
  for (const chunk of graph.chunks) {
    chunk.dynamicImports.sort(compareTextV1);
    chunk.imports.sort(compareTextV1);
  }
  return graph;
}

function createPocGraphV1(): GraphManifestFixtureV1 {
  const storyRoot = "game/stories/poc";
  const html = `${storyRoot}/index.html`;
  const applicationEntry = `${storyRoot}/src/application/entry.tsx`;
  const gameRuntime = `${storyRoot}/src/application/create-poc-game-runtime.ts`;
  const presentationRuntime = `${storyRoot}/src/application/create-poc-presentation-runtime.ts`;
  const storyEntry = `${storyRoot}/src/story-definition.ts`;
  const toolingEntry = `${storyRoot}/src/tooling/index.ts`;
  const toolingUiEntry = `${storyRoot}/src/tooling-ui/index.ts`;
  const toolingPanel = `${storyRoot}/src/tooling-ui/ui-contributions.tsx`;

  return normalizedGraphV1({
    applicationId: "poc-web",
    chunks: [
      {
        dynamicImports: ["assets/poc-tooling-ui.js", "assets/poc-tooling.js"],
        entry: html,
        fileName: "assets/poc-application.js",
        imports: [],
      },
      {
        dynamicImports: [],
        entry: toolingEntry,
        fileName: "assets/poc-tooling.js",
        imports: [],
      },
      {
        dynamicImports: [],
        entry: toolingUiEntry,
        fileName: "assets/poc-tooling-ui.js",
        imports: ["assets/poc-tooling.js"],
      },
    ],
    contractRevision: 1,
    dynamicSpecifiers: [
      "@project-tavern/story-poc/tooling",
      "@project-tavern/story-poc/tooling-ui",
    ],
    edges: [
      { from: html, kind: "static", to: applicationEntry },
      { from: html, kind: "static", to: "virtual:vite/modulepreload-polyfill.js" },
      { from: applicationEntry, kind: "static", to: gameRuntime },
      { from: applicationEntry, kind: "static", to: presentationRuntime },
      { from: applicationEntry, kind: "static", to: "engine/packages/web/src/index.ts" },
      { from: applicationEntry, kind: "static", to: storyEntry },
      {
        from: applicationEntry,
        kind: "static",
        to: "virtual:project-tavern/poc-build-identity",
      },
      { from: gameRuntime, kind: "dynamic", to: toolingEntry },
      { from: presentationRuntime, kind: "dynamic", to: toolingUiEntry },
      { from: toolingUiEntry, kind: "static", to: toolingPanel },
    ],
    entry: applicationEntry,
    nodes: [
      { id: "engine/packages/web/src/index.ts", owningPackage: "@sillymaker/web" },
      { id: html, owningPackage: "@project-tavern/story-poc" },
      { id: applicationEntry, owningPackage: "@project-tavern/story-poc" },
      { id: gameRuntime, owningPackage: "@project-tavern/story-poc" },
      { id: presentationRuntime, owningPackage: "@project-tavern/story-poc" },
      { id: storyEntry, owningPackage: "@project-tavern/story-poc" },
      { id: toolingEntry, owningPackage: "@project-tavern/story-poc" },
      { id: toolingUiEntry, owningPackage: "@project-tavern/story-poc" },
      { id: toolingPanel, owningPackage: "@project-tavern/story-poc" },
      {
        id: "virtual:project-tavern/poc-build-identity",
        owningPackage: "@project-tavern/story-poc",
      },
      { id: "virtual:vite/modulepreload-polyfill.js", owningPackage: "vite" },
    ],
  });
}

async function listPayloadFilesV1(root: string): Promise<string[]> {
  const paths: string[] = [];
  const visitV1 = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, entry.name);
      const metadata = await lstat(absolutePath);
      const artifactPath = relative(root, absolutePath).split(sep).join("/");
      if (metadata.isSymbolicLink()) throw new TypeError(`fixture symlink: ${artifactPath}`);
      if (metadata.isDirectory()) {
        await visitV1(absolutePath);
      } else if (
        metadata.isFile() &&
        artifactPath !== "artifact-manifest.json" &&
        artifactPath !== "artifact-manifest.v1.json"
      ) {
        paths.push(artifactPath);
      }
    }
  };
  await visitV1(root);
  return paths.toSorted(compareTextV1);
}

async function createManifestFixtureV1(root: string): Promise<ArtifactManifestFixtureV1> {
  const paths = await listPayloadFilesV1(root);
  return {
    base: "./",
    files: await Promise.all(
      paths.map(async (path): Promise<ArtifactManifestEntryFixtureV1> => {
        const bytes = new Uint8Array(await readFile(join(root, path)));
        return { byteLength: bytes.byteLength, digest: digestBytes(bytes), path };
      }),
    ),
    schemaRevision: 1,
  };
}

async function writeManifestFixtureV1(root: string): Promise<ArtifactManifestFixtureV1> {
  const manifest = await createManifestFixtureV1(root);
  await writeFile(join(root, "artifact-manifest.json"), canonicalJsonBytes(manifest));
  return manifest;
}

async function readManifestFixtureV1(root: string): Promise<ArtifactManifestFixtureV1> {
  return JSON.parse(
    await readFile(join(root, "artifact-manifest.json"), "utf8"),
  ) as ArtifactManifestFixtureV1;
}

async function writeLegalFilesV1(root: string): Promise<void> {
  await Promise.all(
    projectLegalFilesV1.map(async (path) => {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, await readFile(join(repositoryRootV1, path)));
    }),
  );
}

function createBuildInputV1(
  authority: LiveAuthorityFixtureV1,
  graphDigest: DigestV1,
  provenanceMode: "clean_commit" | "development",
): Record<string, unknown> {
  return {
    applicationHtml: "game/stories/poc/index.html",
    applicationId: "poc-web",
    host: "web",
    identities: {
      application: { digest: digestFixtureV1("1") },
      engine: { digest: digestFixtureV1("2"), version: "0.0.0" },
      resolvedGame: {
        patchSet: {
          appliedHotfixes: [],
          digest: digestFixtureV1("3"),
          presentationDigest: digestFixtureV1("3"),
          simulationDigest: digestFixtureV1("3"),
        },
        presentationDigest: digestFixtureV1("4"),
        simulationDigest: digestFixtureV1("5"),
        stateContractDigest: digestFixtureV1("6"),
        stateContractRevision: 1,
      },
      story: { digest: digestFixtureV1("7"), id: "week.poc_001", revision: 1 },
    },
    materializationDigest: authority.materializationDigest,
    provenanceMode,
    schemaRevision: 1,
    sourceCommit: authority.sourceCommit,
    sourceGraphDigest: graphDigest,
    sourceTree: provenanceMode === "clean_commit" ? authority.sourceTree : null,
    story: "poc",
    tools: {
      node: "v26.5.0",
      pnpm: "11.11.0",
      typescript: "7.0.2",
      vite: "8.1.4",
    },
  };
}

async function createPocArtifactFixtureV1(
  provenanceMode: "clean_commit" | "development" = "clean_commit",
): Promise<PocArtifactFixtureV1> {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-poc-artifact-"));
  temporaryRootsV1.push(root);
  await mkdir(join(root, "assets"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "index.html"),
      '<!doctype html><script type="module" src="./assets/poc-application.js"></script>',
    ),
    writeFile(join(root, "assets/poc-application.js"), "export const application = true;"),
    writeFile(join(root, "assets/poc-tooling.js"), "export const tooling = true;"),
    writeFile(join(root, "assets/poc-tooling-ui.js"), "export const toolingUi = true;"),
    writeLegalFilesV1(root),
  ]);

  const graph = createPocGraphV1();
  const graphBytes = canonicalJsonBytes(graph);
  await writeFile(join(root, "source-graph.v1.json"), graphBytes);
  const buildInput = createBuildInputV1(
    await readLiveAuthorityV1(),
    digestBytes(graphBytes),
    provenanceMode,
  );
  await writeFile(join(root, "build-input.json"), canonicalJsonBytes(buildInput));
  await writeManifestFixtureV1(root);
  return { buildInput, graph, root };
}

async function rewriteBuildInputV1(
  fixture: PocArtifactFixtureV1,
  mutate: (value: Record<string, unknown>) => void,
): Promise<void> {
  const buildInput = structuredClone(fixture.buildInput);
  mutate(buildInput);
  fixture.buildInput = buildInput;
  await writeFile(join(fixture.root, "build-input.json"), canonicalJsonBytes(buildInput));
  await writeManifestFixtureV1(fixture.root);
}

async function resignGraphV1(fixture: PocArtifactFixtureV1): Promise<void> {
  fixture.graph = normalizedGraphV1(fixture.graph);
  const graphBytes = canonicalJsonBytes(fixture.graph);
  await writeFile(join(fixture.root, "source-graph.v1.json"), graphBytes);
  fixture.buildInput.sourceGraphDigest = digestBytes(graphBytes);
  await writeFile(join(fixture.root, "build-input.json"), canonicalJsonBytes(fixture.buildInput));
  await writeManifestFixtureV1(fixture.root);
}

afterEach(async () => {
  const roots = temporaryRootsV1.splice(0);
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

describe("PoC Artifact release identity", () => {
  it("accepts clean-commit provenance only when the live authority is clean", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const status = await execFileAsyncV1("git", ["status", "--porcelain=v1"], {
      cwd: repositoryRootV1,
      encoding: "utf8",
    });

    if (status.stdout.length === 0) {
      await expect(verifyPocArtifactV1(fixture.root)).resolves.toBeUndefined();
    } else {
      await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(/clean_source_required/u);
    }
  });

  it("allows development provenance only through the explicit structural option", async () => {
    const fixture = await createPocArtifactFixtureV1("development");

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
    await expect(
      verifyPocArtifactV1(fixture.root, { allowDevelopment: true }),
    ).resolves.toBeUndefined();
  });

  it("does not let the development allowance relax another Artifact check", async () => {
    const fixture = await createPocArtifactFixtureV1("development");
    await writeFile(
      join(fixture.root, "index.html"),
      '<script type="module" src="https://cdn.example.invalid/runtime.js"></script>',
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root, { allowDevelopment: true })).rejects.toThrow();
  });

  it("rejects caller-asserted archive authority as an unknown option", async () => {
    const fixture = await createPocArtifactFixtureV1();

    await expect(
      verifyPocArtifactV1(fixture.root, {
        verifiedArchiveSource: {
          sourceCommit: "8".repeat(40),
          sourceTree: "9".repeat(40),
        },
      } as never),
    ).rejects.toThrow();
  });

  it("keeps non-authoritative structural inspection separate from strict Git verification", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await rewriteBuildInputV1(fixture, (value) => {
      value.sourceCommit = "8".repeat(40);
      value.sourceTree = "9".repeat(40);
    });

    await expect(inspectPocArtifactStructureV1(fixture.root)).resolves.toBeUndefined();
    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(/source_mismatch/u);
  });

  it.each([
    [
      "a clean commit without a tree",
      (value: Record<string, unknown>) => {
        value.sourceTree = null;
      },
    ],
    [
      "a development build that borrows a tree",
      (value: Record<string, unknown>) => {
        value.provenanceMode = "development";
        value.sourceTree = "8".repeat(40);
      },
    ],
    [
      "an abbreviated source commit",
      (value: Record<string, unknown>) => {
        value.sourceCommit = "deadbeef";
      },
    ],
    [
      "an unknown provenance mode",
      (value: Record<string, unknown>) => {
        value.provenanceMode = "archive";
      },
    ],
  ])("rejects %s", async (_label, mutate) => {
    const fixture = await createPocArtifactFixtureV1();
    await rewriteBuildInputV1(fixture, mutate);

    await expect(verifyPocArtifactV1(fixture.root, { allowDevelopment: true })).rejects.toThrow();
  });

  it("binds the Artifact to the live materialization digest", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await rewriteBuildInputV1(fixture, (value) => {
      value.materializationDigest = digestFixtureV1("9");
    });

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  const invalidBuildInputMutationsV1: readonly [
    string,
    (value: Record<string, unknown>) => void,
  ][] = [
    [
      "the E2E application ID",
      (value) => {
        value.applicationId = "e2e-web";
      },
    ],
    [
      "the E2E Story selector",
      (value) => {
        value.story = "e2e";
      },
    ],
    [
      "a non-Web Host",
      (value) => {
        value.host = "headless";
      },
    ],
    [
      "the E2E HTML root",
      (value) => {
        value.applicationHtml = "game/stories/e2e/index.html";
      },
    ],
    [
      "an unknown build-input schema",
      (value) => {
        value.schemaRevision = 2;
      },
    ],
    [
      "an E2E resolved Story identity",
      (value) => {
        const identities = value.identities as Record<string, unknown>;
        const story = identities.story as Record<string, unknown>;
        story.id = "story.e2e";
      },
    ],
    [
      "a caller flavor field",
      (value) => {
        value.flavor = "developer";
      },
    ],
    [
      "a non-materialized Node version",
      (value) => {
        const tools = value.tools as Record<string, unknown>;
        tools.node = "v26.5.1";
      },
    ],
  ];

  it.each(invalidBuildInputMutationsV1)("rejects build-input with %s", async (_label, mutate) => {
    const fixture = await createPocArtifactFixtureV1();
    await rewriteBuildInputV1(fixture, mutate);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects noncanonical build-input bytes even when their JSON meaning is unchanged", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(
      join(fixture.root, "build-input.json"),
      `${JSON.stringify(fixture.buildInput, null, 2)}\n`,
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });
});

describe("PoC Artifact manifest and legal payload", () => {
  it("rejects payload bytes changed after the manifest was signed", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, "assets/poc-application.js"), "tampered payload");

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects a wrong manifest digest even when every payload byte is present", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const manifest = await readManifestFixtureV1(fixture.root);
    const applicationEntry = manifest.files.find(
      (entry) => entry.path === "assets/poc-application.js",
    );
    if (applicationEntry === undefined) throw new TypeError("fixture application entry is missing");
    applicationEntry.digest = digestFixtureV1("0");
    await writeFile(join(fixture.root, "artifact-manifest.json"), canonicalJsonBytes(manifest));

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects an unsorted manifest and a manifest that signs itself", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const manifest = await readManifestFixtureV1(fixture.root);
    manifest.files.reverse();
    manifest.files.push({
      byteLength: 0,
      digest: digestFixtureV1("0"),
      path: "artifact-manifest.json",
    });
    await writeFile(join(fixture.root, "artifact-manifest.json"), canonicalJsonBytes(manifest));

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects noncanonical manifest bytes", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const manifest = await readManifestFixtureV1(fixture.root);
    await writeFile(
      join(fixture.root, "artifact-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it.each(["/Users/jasl/leak", "../escape", "assets\\windows.js"])(
    "rejects unsafe manifest path %s",
    async (path) => {
      const fixture = await createPocArtifactFixtureV1();
      const manifest = await readManifestFixtureV1(fixture.root);
      manifest.files.push({ byteLength: 0, digest: digestFixtureV1("0"), path });
      manifest.files.sort((left, right) => compareTextV1(left.path, right.path));
      await writeFile(join(fixture.root, "artifact-manifest.json"), canonicalJsonBytes(manifest));

      await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
    },
  );

  it("rejects an unlisted symlink even when it escapes to a project legal file", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await symlink(join(repositoryRootV1, "LICENSE.md"), join(fixture.root, "assets/legal-link"));

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects the legacy manifest name as an unsigned second authority", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, "artifact-manifest.v1.json"), "{}\n");

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("requires all seven project legal files", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await rm(join(fixture.root, "TRADEMARKS.md"));
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("requires the emitted HTML entry even after the remaining payload is re-signed", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await rm(join(fixture.root, "index.html"));
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(/artifact file.*index\.html/iu);
  });

  it("requires legal-file bytes to equal the reviewed repository authority", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, "LICENSE.md"), "replacement license\n");
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });
});

describe("PoC Artifact graph and forbidden content", () => {
  it("binds build-input to the exact normalized source-graph bytes", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await rewriteBuildInputV1(fixture, (value) => {
      value.sourceGraphDigest = digestFixtureV1("9");
    });

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects an E2E module in the PoC graph after every digest is resigned", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const e2eNode = "game/stories/e2e/src/index.ts";
    fixture.graph.nodes.push({ id: e2eNode, owningPackage: "@project-tavern/story-e2e" });
    fixture.graph.edges.push({
      from: "game/stories/poc/src/story-definition.ts",
      kind: "static",
      to: e2eNode,
    });
    await resignGraphV1(fixture);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects an unknown virtual module after every digest is resigned", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const unknownNode = "virtual:unknown/artifact-runtime";
    fixture.graph.nodes.push({
      id: unknownNode,
      owningPackage: "@project-tavern/story-poc",
    });
    fixture.graph.edges.push({
      from: "game/stories/poc/src/story-definition.ts",
      kind: "static",
      to: unknownNode,
    });
    await resignGraphV1(fixture);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects unknown graph fields after every digest is resigned", async () => {
    const fixture = await createPocArtifactFixtureV1();
    Object.assign(fixture.graph, { generatedAt: "forbidden" });
    await resignGraphV1(fixture);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects a source-map chunk declared by the graph", async () => {
    const fixture = await createPocArtifactFixtureV1();
    fixture.graph.chunks.push({
      dynamicImports: [],
      entry: null,
      fileName: "assets/poc-application.js.map",
      imports: [],
    });
    await resignGraphV1(fixture);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it.each([
    ["references/leak.txt", "reference bytes"],
    ["art-source/aigc/openai/leak.png", "source archive bytes"],
    ["assets/poc-application.js.map", "{}"],
    [".env", "PROJECT_TAVERN_TOKEN=forbidden"],
    [".npmrc", "registry=https://registry.example.invalid"],
    ["CONTRIBUTING.md", "must not ship"],
    ["game/stories/e2e/leak.txt", "other Story bytes"],
    ["scripts/leak.js", "export {}"],
    ["assets/.npmrc", "//registry.example.invalid/:_authToken=abcd1234"],
    ["assets/credentials.json", '{"password":"hunter2"}'],
  ])("rejects forbidden payload path %s", async (path, bytes) => {
    const fixture = await createPocArtifactFixtureV1();
    const target = join(fixture.root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it.each([
    "references/",
    "art-source/aigc/",
    "//# sourceMappingURL=app.js.map",
    "/Users/jasl/Workspaces/tavern_game",
    "C:\\Users\\jasl\\Workspaces\\tavern_game",
    "https://secret.example/token",
    "https://operator:credential@cdn.example.invalid/runtime.js",
  ])("rejects forbidden executable marker %s", async (marker) => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(
      join(fixture.root, "assets/poc-application.js"),
      `export const marker = ${JSON.stringify(marker)};`,
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects an unregistered remote runtime asset from HTML", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(
      join(fixture.root, "index.html"),
      '<img src="https://cdn.example.invalid/runtime.png" alt="">',
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it.each([
    ["assets/leak.svg", "<svg><text>/Users/operator/private</text></svg>"],
    ["assets/credentials.json", '{"value":"TOKEN=forbidden"}'],
    ["assets/client-config.json", '{"clientSecret":"p@ss.word"}'],
    ["assets/api-config.json", '{"apiKey":"abcd"}'],
    ["assets/runtime.env.txt", "AWS_SECRET_ACCESS_KEY=p@ss.word"],
    ["assets/remote.svg", '<svg><image href="https://cdn.example.invalid/runtime.png"/></svg>'],
    ["assets/remote-import.css", '@import "//evil.example/x";'],
    ["assets/nonlocal-url.css", "body{background:url(file:///tmp/evil.png)}"],
    ["assets/escaped-url.css", "body{background:u\\72l(//evil.example/x.png)}"],
    [
      "assets/nonlocal-image-set.css",
      'body{background-image:image-set("//evil.example/x.png" 1x)}',
    ],
  ])("scans forbidden content throughout admitted runtime payloads: %s", async (path, bytes) => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, path), bytes);
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it("rejects a workspace package disguised under node_modules", async () => {
    const fixture = await createPocArtifactFixtureV1();
    const disguised = "node_modules/@sillymaker/base/src/index.ts";
    fixture.graph.nodes.push({ id: disguised, owningPackage: "@sillymaker/base" });
    fixture.graph.edges.push({
      from: "game/stories/poc/src/story-definition.ts",
      kind: "static",
      to: disguised,
    });
    await resignGraphV1(fixture);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(/disguises/u);
  });

  it("does not require the post-22.12 node:module registerHooks API", async () => {
    const source = await readFile(new URL("./verify-poc-artifact.mts", import.meta.url), "utf8");

    expect(source).not.toContain("registerHooks");
  });

  it("rejects an output JavaScript file not declared by the source graph", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, "assets/unregistered-runtime.js"), "export {};");
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
  });

  it.each(["assets/unregistered-runtime.mjs", "assets/extensionless-runtime"])(
    "rejects an HTML script outside the graph chunk set: %s",
    async (path) => {
      const fixture = await createPocArtifactFixtureV1();
      await writeFile(join(fixture.root, path), "export {};");
      await writeFile(
        join(fixture.root, "index.html"),
        `<script type="module" src="./${path}"></script>`,
      );
      await writeManifestFixtureV1(fixture.root);

      await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow();
    },
  );

  it("rejects an HTML entry that loads only a declared lazy tooling chunk", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(
      join(fixture.root, "index.html"),
      '<script type="module" src="./assets/poc-tooling.js"></script>',
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(/application chunk/u);
  });

  it("does not mistake data-src for the executable script src attribute", async () => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(
      join(fixture.root, "index.html"),
      '<script type="module" data-src="./assets/poc-application.js"></script>',
    );
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(
      /external modules|unsupported/u,
    );
  });

  it.each([
    '<script type="module" src="./assets/poc-application.js">globalThis.pwned=1</script>',
    '<script type="application/json" src="./assets/poc-application.js"></script>',
    "<script title=\" src='./assets/poc-application.js'\"></script>",
    '<!-- <script type="module" src="./assets/poc-application.js"></script> -->',
    '<template><script type="module" src="./assets/poc-application.js"></script></template>',
    '<![CDATA[<script type="module" src="./assets/poc-application.js"></script>]]>',
    '<!doctype html "><img src=x onerror=globalThis.pwned=1>"><script type="module" src="./assets/poc-application.js"></script>',
    '<link rel="stylesheet" href="data:text/css,body{background:url(//evil.example/x)}"><script type="module" src="./assets/poc-application.js"></script>',
    '<link rel="stylesheet" href="file:///tmp/evil.css"><script type="module" src="./assets/poc-application.js"></script>',
    '<script type="module" src="./assets/poc-application.js" crossorigin="<!--" onload="globalThis.pwned=1" data-x="-->"></script>',
    '<script type="module" src="./assets/poc-application.js" crossorigin="<style>" onload="globalThis.pwned=1" data-x="</style>"></script>',
    '<div data-x=\'<script type="module" src="./assets/poc-application.js"></script>\'></div>',
    '<script type="module" src="./assets/poc-application.js"></script><img onerror="globalThis.pwned=1">',
    '<script type="module" src="./assets/poc-application.js"></script><a href="javascript:globalThis.pwned=1">x</a>',
    '<script type="module" src="./assets/poc-application.js"></script><a href="java&#x73;cript:globalThis.pwned=1">x</a>',
    '<script type="module" src="./assets/poc-application.js"></script><a href="java\nscript:globalThis.pwned=1">x</a>',
  ])("rejects executable HTML outside the external module graph: %s", async (html) => {
    const fixture = await createPocArtifactFixtureV1();
    await writeFile(join(fixture.root, "index.html"), html);
    await writeManifestFixtureV1(fixture.root);

    await expect(verifyPocArtifactV1(fixture.root)).rejects.toThrow(
      /comment|script|executable|inert|markup|nonlocal|unsupported/u,
    );
  });

  it.each(["DebugToolsPortV1", "StoryToolingEntryV1", "FixtureBrowser"])(
    "does not reject allowed runtime tooling marker %s",
    async (marker) => {
      const fixture = await createPocArtifactFixtureV1();
      await writeFile(
        join(fixture.root, "assets/poc-application.js"),
        `export const allowedMarker = ${JSON.stringify(marker)};`,
      );
      await writeManifestFixtureV1(fixture.root);

      await expect(inspectPocArtifactStructureV1(fixture.root)).resolves.toBeUndefined();
    },
  );
});
