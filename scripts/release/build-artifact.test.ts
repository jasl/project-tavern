// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes, digestBytes } from "../../engine/packages/base/src/index.js";
import { describe, expect, it, vi } from "vitest";

import {
  buildArtifactV1,
  buildArtifactFromVerifiedArchiveV1,
  createArtifactBuildInputV1,
  parseArtifactBuildArgumentsV1,
  type ArtifactBuildPortsV1,
  type ArtifactSourceIdentityV1,
  type VerifiedArchiveAuthorityPortsV1,
  type VerifiedArchiveBuildInputV1,
} from "./build-artifact.mjs";
import { resolveArtifactBuildConfigV1 } from "./build-config.mjs";

const digest = (character: string) => `sha256:${character.repeat(64)}` as const;
const objectId = (character: string) => character.repeat(40);

const identitiesV1 = Object.freeze({
  application: Object.freeze({ digest: digest("a") }),
  engine: Object.freeze({ digest: digest("b"), version: "0.0.0" }),
  resolvedGame: Object.freeze({
    patchSet: Object.freeze({
      appliedHotfixes: Object.freeze([]),
      digest: digest("c"),
      presentationDigest: digest("c"),
      simulationDigest: digest("c"),
    }),
    presentationDigest: digest("d"),
    simulationDigest: digest("e"),
    stateContractDigest: digest("f"),
    stateContractRevision: 1,
  }),
  story: Object.freeze({ digest: digest("1"), id: "week.poc_001", revision: 1 }),
});

const toolVersionsV1 = Object.freeze({
  node: "v26.5.0",
  pnpm: "11.11.0",
  typescript: "7.0.2",
  vite: "8.1.4",
});

const verifiedArchiveInputV1 = Object.freeze({
  materializationDigest: digest("2"),
  schemaRevision: 1,
  sourceCommit: objectId("3"),
  sourceTree: objectId("5"),
  tools: toolVersionsV1,
}) satisfies VerifiedArchiveBuildInputV1;

const sourceGraphBytesV1 = canonicalJsonBytes({
  applicationId: "poc-web",
  chunks: [],
  contractRevision: 1,
  dynamicSpecifiers: [],
  edges: [],
  entry: "game/stories/poc/src/application/entry.tsx",
  nodes: [],
});

function createBuildPortsFixtureV1(input: {
  readonly sourceGraphBytes?: Uint8Array;
  readonly sources: readonly ArtifactSourceIdentityV1[];
}) {
  const events: string[] = [];
  let sourceIndex = 0;
  const inspectSource = vi.fn(async () => {
    events.push(`inspect:${sourceIndex + 1}`);
    const source = input.sources[Math.min(sourceIndex, input.sources.length - 1)];
    sourceIndex += 1;
    if (source === undefined) throw new TypeError("missing source fixture");
    return source;
  });
  const runViteBuild = vi.fn(async () => {
    events.push("build");
  });
  const writeBuildInput = vi.fn(
    async (_input: Parameters<ArtifactBuildPortsV1["writeBuildInput"]>[0]) => {
      events.push("write");
    },
  );
  const ports = {
    repositoryRoot: "/virtual/project-tavern",
    collectBuildIdentity: vi.fn(async () => Object.freeze({ application: Object.freeze([]) })),
    inspectSource,
    readMaterialization: vi.fn(async () => ({ materializationDigest: digest("2") })),
    readSourceGraphBytes: vi.fn(async () => {
      events.push("graph");
      return input.sourceGraphBytes ?? sourceGraphBytesV1;
    }),
    readToolVersions: vi.fn(async () => toolVersionsV1),
    resolveIdentities: vi.fn(async () => identitiesV1),
    runViteBuild,
    writeBuildInput,
  } satisfies ArtifactBuildPortsV1;
  return { events, inspectSource, ports, runViteBuild, writeBuildInput };
}

describe("createArtifactBuildInputV1", () => {
  it("creates the exact development identity without borrowing a source tree", () => {
    const config = resolveArtifactBuildConfigV1({
      story: "poc",
      host: "web",
      outDir: "dist/poc",
    });

    const input = createArtifactBuildInputV1({
      config,
      identities: identitiesV1,
      materializationDigest: digest("2"),
      source: {
        provenanceMode: "development",
        sourceCommit: objectId("3"),
        sourceTree: null,
      },
      sourceGraphDigest: digest("4"),
      tools: toolVersionsV1,
    });

    expect(input).toEqual({
      applicationHtml: "game/stories/poc/index.html",
      applicationId: "poc-web",
      host: "web",
      identities: identitiesV1,
      materializationDigest: digest("2"),
      provenanceMode: "development",
      schemaRevision: 1,
      sourceCommit: objectId("3"),
      sourceGraphDigest: digest("4"),
      sourceTree: null,
      story: "poc",
      tools: toolVersionsV1,
    });
    expect(new TextDecoder().decode(canonicalJsonBytes(input))).not.toMatch(
      /timestamp|capabilit|flavor|\/Users\//u,
    );
  });

  it("requires clean provenance to carry its exact tree", () => {
    const config = resolveArtifactBuildConfigV1({
      story: "e2e",
      host: "web",
      outDir: "dist/e2e",
    });
    const base = {
      config,
      identities: identitiesV1,
      materializationDigest: digest("2"),
      sourceGraphDigest: digest("4"),
      tools: toolVersionsV1,
    } as const;

    expect(() =>
      createArtifactBuildInputV1({
        ...base,
        source: {
          provenanceMode: "clean_commit",
          sourceCommit: objectId("3"),
          sourceTree: null,
        },
      }),
    ).toThrow(/release\.invalid_source_provenance/u);
    expect(() =>
      createArtifactBuildInputV1({
        ...base,
        source: {
          provenanceMode: "development",
          sourceCommit: objectId("3"),
          sourceTree: objectId("5"),
        },
      }),
    ).toThrow(/release\.invalid_source_provenance/u);
  });

  it("preserves the exact committed tree for clean provenance", () => {
    const config = resolveArtifactBuildConfigV1({
      story: "e2e",
      host: "web",
      outDir: "dist/e2e",
    });
    const input = createArtifactBuildInputV1({
      config,
      identities: identitiesV1,
      materializationDigest: digest("2"),
      source: {
        provenanceMode: "clean_commit",
        sourceCommit: objectId("3"),
        sourceTree: objectId("5"),
      },
      sourceGraphDigest: digest("4"),
      tools: toolVersionsV1,
    });

    expect(input.provenanceMode).toBe("clean_commit");
    expect(input.sourceTree).toBe(objectId("5"));
  });
});

describe("buildArtifactV1", () => {
  it.each([
    { story: "poc", host: "developer", outDir: "dist/poc" },
    { story: "demo", host: "web", outDir: "dist/poc" },
    { story: "poc", host: "web", outDir: "dist/developer" },
    { story: "poc", host: "web", outDir: "../poc" },
  ] as const)("rejects unsupported build request %#", async (request) => {
    await expect(buildArtifactV1(request as never)).rejects.toThrow(
      /release\.invalid_build_request/u,
    );
  });

  it("builds once and writes canonical input only after source identity stays stable", async () => {
    const source = Object.freeze({
      provenanceMode: "development" as const,
      sourceCommit: objectId("3"),
      sourceTree: null,
      worktreeDigest: digest("6"),
    });
    const { events, inspectSource, ports, runViteBuild, writeBuildInput } =
      createBuildPortsFixtureV1({ sources: [source, source] });

    const result = await buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, ports);

    expect(inspectSource).toHaveBeenCalledTimes(2);
    expect(runViteBuild).toHaveBeenCalledOnce();
    expect(writeBuildInput).toHaveBeenCalledOnce();
    expect(writeBuildInput.mock.calls[0]?.[0].bytes).toEqual(canonicalJsonBytes(result));
    expect(result.sourceGraphDigest).toBe(digestBytes(sourceGraphBytesV1));
    expect(events).toEqual(["inspect:1", "build", "graph", "inspect:2", "write"]);
  });

  it("refuses to sign or write when source identity changes during the build", async () => {
    const sourceBefore = Object.freeze({
      provenanceMode: "development" as const,
      sourceCommit: objectId("3"),
      sourceTree: null,
      worktreeDigest: digest("6"),
    });
    const sourceAfter = Object.freeze({
      ...sourceBefore,
      worktreeDigest: digest("7"),
    });
    const { ports, writeBuildInput } = createBuildPortsFixtureV1({
      sources: [sourceBefore, sourceAfter],
    });

    await expect(
      buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, ports),
    ).rejects.toThrow(/release\.source_changed/u);
    expect(writeBuildInput).not.toHaveBeenCalled();
  });

  it("rejects a noncanonical source graph before writing build identity", async () => {
    const source = Object.freeze({
      provenanceMode: "development" as const,
      sourceCommit: objectId("3"),
      sourceTree: null,
      worktreeDigest: digest("6"),
    });
    const noncanonical = new TextEncoder().encode(
      `${new TextDecoder().decode(sourceGraphBytesV1)}\n`,
    );
    const { ports, writeBuildInput } = createBuildPortsFixtureV1({
      sourceGraphBytes: noncanonical,
      sources: [source, source],
    });

    await expect(
      buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, ports),
    ).rejects.toThrow(/release\.source_graph_noncanonical/u);
    expect(writeBuildInput).not.toHaveBeenCalled();
  });

  it("rejects source-graph identity for a different application", async () => {
    const source = Object.freeze({
      provenanceMode: "development" as const,
      sourceCommit: objectId("3"),
      sourceTree: null,
      worktreeDigest: digest("6"),
    });
    const wrongGraph = canonicalJsonBytes({
      applicationId: "e2e-web",
      chunks: [],
      contractRevision: 1,
      dynamicSpecifiers: [],
      edges: [],
      entry: "game/stories/e2e/src/application/entry.tsx",
      nodes: [],
    });
    const { ports, writeBuildInput } = createBuildPortsFixtureV1({
      sourceGraphBytes: wrongGraph,
      sources: [source, source],
    });

    await expect(
      buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, ports),
    ).rejects.toThrow(/release\.source_graph_invalid/u);
    expect(writeBuildInput).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied archive provenance on the ordinary build path", async () => {
    await expect(
      buildArtifactV1({
        story: "poc",
        host: "web",
        outDir: "dist/poc",
        verifiedArchiveInput: verifiedArchiveInputV1,
      } as never),
    ).rejects.toThrow(/release\.invalid_build_request/u);
  });
});

describe("buildArtifactFromVerifiedArchiveV1", () => {
  function createArchiveAuthorityV1(
    overrides: Partial<VerifiedArchiveAuthorityPortsV1> = {},
  ): VerifiedArchiveAuthorityPortsV1 {
    return {
      assertArchiveBoundary: vi.fn(async () => undefined),
      readMaterialization: vi.fn(async () => ({ materializationDigest: digest("2") })),
      readToolVersions: vi.fn(async () => toolVersionsV1),
      ...overrides,
    };
  }

  it("is the only build path that projects frozen clean archive provenance", async () => {
    const { events, inspectSource, ports, writeBuildInput } = createBuildPortsFixtureV1({
      sources: [],
    });
    const authority = createArchiveAuthorityV1();

    const result = await buildArtifactFromVerifiedArchiveV1(
      verifiedArchiveInputV1,
      ports,
      authority,
    );

    expect(result).toMatchObject({
      materializationDigest: digest("2"),
      provenanceMode: "clean_commit",
      sourceCommit: objectId("3"),
      sourceTree: objectId("5"),
      tools: toolVersionsV1,
    });
    expect(inspectSource).not.toHaveBeenCalled();
    expect(authority.assertArchiveBoundary).toHaveBeenCalledTimes(4);
    expect(authority.readMaterialization).toHaveBeenCalledTimes(1);
    expect(authority.readToolVersions).toHaveBeenCalledTimes(1);
    expect(writeBuildInput).toHaveBeenCalledOnce();
    expect(events).toEqual(["build", "graph", "write"]);
  });

  it("rejects stale materialization and tool identities before running Vite", async () => {
    const materializationFixture = createBuildPortsFixtureV1({ sources: [] });
    await expect(
      buildArtifactFromVerifiedArchiveV1(
        verifiedArchiveInputV1,
        materializationFixture.ports,
        createArchiveAuthorityV1({
          readMaterialization: vi.fn(async () => ({ materializationDigest: digest("9") })),
        }),
      ),
    ).rejects.toThrow(/release\.verified_archive_materialization_mismatch/u);
    expect(materializationFixture.runViteBuild).not.toHaveBeenCalled();

    const toolFixture = createBuildPortsFixtureV1({ sources: [] });
    await expect(
      buildArtifactFromVerifiedArchiveV1(
        verifiedArchiveInputV1,
        toolFixture.ports,
        createArchiveAuthorityV1({
          readToolVersions: vi.fn(async () => ({ ...toolVersionsV1, vite: "8.1.5" })),
        }),
      ),
    ).rejects.toThrow(/release\.verified_archive_toolchain_mismatch/u);
    expect(toolFixture.runViteBuild).not.toHaveBeenCalled();
  });

  it.each([
    { ...verifiedArchiveInputV1, schemaRevision: 2 },
    { ...verifiedArchiveInputV1, sourceTree: null },
    { ...verifiedArchiveInputV1, provenanceMode: "clean_commit" },
    { ...verifiedArchiveInputV1, materializationDigest: "sha256:not-a-digest" },
  ])("rejects malformed or caller-expanded verified input %#", async (input) => {
    const fixture = createBuildPortsFixtureV1({ sources: [] });
    await expect(
      buildArtifactFromVerifiedArchiveV1(input as never, fixture.ports, createArchiveAuthorityV1()),
    ).rejects.toThrow(/release\.invalid_verified_archive_input/u);
    expect(fixture.runViteBuild).not.toHaveBeenCalled();
  });
});

describe("parseArtifactBuildArgumentsV1", () => {
  it("accepts only the one ordered closed CLI request", () => {
    expect(
      parseArtifactBuildArgumentsV1(["--story", "poc", "--host", "web", "--out-dir", "dist/poc"]),
    ).toEqual({ story: "poc", host: "web", outDir: "dist/poc" });
  });

  it.each([
    { args: ["--story", "poc", "--host", "web", "--out-dir", "dist/e2e"] },
    {
      args: ["--story", "poc", "--host", "web", "--out-dir", "dist/poc", "--root", "."],
    },
    { args: ["--story=poc", "--host=web", "--out-dir=dist/poc"] },
    { args: ["--mode", "poc-web"] },
  ])("rejects caller overrides %#", ({ args }) => {
    expect(() => parseArtifactBuildArgumentsV1(args)).toThrow(/release\.invalid_build_request/u);
  });
});
