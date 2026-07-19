// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { copyProjectLegalFilesV1 } from "./prepare-artifact.mjs";
import { parseVerifyArtifactArgumentsV1, runVerifyArtifactCommandV1 } from "./verify-artifact.mjs";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const digestV1 = (character) => `sha256:${character.repeat(64)}`;
const objectIdV1 = (character) => character.repeat(40);
const sourceGraphBytesV1 = new TextEncoder().encode(
  '{"applicationId":"poc-web","chunks":[],"contractRevision":1,"dynamicSpecifiers":[],"edges":[],"entry":"game/stories/poc/src/application/entry.tsx","nodes":[]}',
);

function createArtifactLifecyclePortsV1({ failFinalizer }) {
  const candidate = Object.freeze({
    outputRoot: "/virtual/project-tavern/.project-tavern/artifact-builds/poc-web-test",
  });
  const events = [];
  let sourceReads = 0;
  let finalBytes = "old-final";
  const ports = {
    repositoryRoot: "/virtual/project-tavern",
    async collectBuildIdentity() {
      return Object.freeze({ application: Object.freeze([]) });
    },
    async createWorkspace() {
      events.push("create");
      return candidate;
    },
    async discardWorkspace({ workspace }) {
      assert.equal(workspace, candidate);
      events.push("discard");
    },
    async finalizePocArtifact({ outputRoot }) {
      assert.equal(outputRoot, candidate.outputRoot);
      events.push("finalize");
      if (failFinalizer) throw new TypeError("fixture finalizer failed");
    },
    async inspectSource() {
      sourceReads += 1;
      events.push(`inspect:${sourceReads}`);
      return Object.freeze({
        provenanceMode: "development",
        sourceCommit: objectIdV1("1"),
        sourceTree: null,
        worktreeDigest: digestV1("2"),
      });
    },
    async publishWorkspace({ workspace }) {
      assert.equal(workspace, candidate);
      events.push("publish");
      finalBytes = "candidate-final";
    },
    async readMaterialization() {
      return Object.freeze({ materializationDigest: digestV1("3") });
    },
    async readSourceGraphBytes({ outputRoot }) {
      assert.equal(outputRoot, candidate.outputRoot);
      events.push("graph");
      return sourceGraphBytesV1;
    },
    async readToolVersions() {
      return Object.freeze({
        node: "v26.5.0",
        pnpm: "11.11.0",
        typescript: "7.0.2",
        vite: "8.1.4",
      });
    },
    async resolveIdentities() {
      return Object.freeze({
        application: Object.freeze({ digest: digestV1("4") }),
        engine: Object.freeze({ digest: digestV1("5"), version: "0.0.0" }),
        resolvedGame: Object.freeze({
          patchSet: Object.freeze({
            appliedHotfixes: Object.freeze([]),
            digest: digestV1("6"),
            presentationDigest: digestV1("6"),
            simulationDigest: digestV1("6"),
          }),
          presentationDigest: digestV1("7"),
          simulationDigest: digestV1("8"),
          stateContractDigest: digestV1("9"),
          stateContractRevision: 1,
        }),
        story: Object.freeze({ digest: digestV1("a"), id: "week.poc_001", revision: 1 }),
      });
    },
    async runViteBuild({ outputRoot }) {
      assert.equal(outputRoot, candidate.outputRoot);
      events.push("build");
    },
    async writeBuildInput({ outputRoot }) {
      assert.equal(outputRoot, candidate.outputRoot);
      events.push("write");
    },
  };
  return Object.freeze({
    candidate,
    events,
    getFinalBytes: () => finalBytes,
    ports,
  });
}

test("pins the public PoC Artifact commands", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["artifact:manifest"],
    "node --experimental-strip-types scripts/release/create-artifact-manifest.mts dist/poc",
  );
  assert.equal(packageJson.scripts["verify:artifact"], "node scripts/verify-artifact.mjs dist/poc");
  assert.equal(
    packageJson.scripts["release:prepare"],
    "node --experimental-strip-types scripts/release/build-artifact.mts --story poc --host web --out-dir dist/poc --require-clean",
  );
});

test("accepts only one caller-built Artifact plus the explicit development allowance", () => {
  assert.deepEqual(parseVerifyArtifactArgumentsV1(["dist/poc"]), {
    allowDevelopment: false,
    artifactRoot: "dist/poc",
  });
  assert.deepEqual(parseVerifyArtifactArgumentsV1(["dist/poc", "--allow-development"]), {
    allowDevelopment: true,
    artifactRoot: "dist/poc",
  });
  assert.deepEqual(parseVerifyArtifactArgumentsV1(["dist/poc", "--", "--allow-development"]), {
    allowDevelopment: true,
    artifactRoot: "dist/poc",
  });
  for (const args of [
    [],
    ["--allow-development"],
    ["dist/poc", "--allow-development", "extra"],
    ["dist/poc", "--rebuild"],
  ]) {
    assert.throws(
      () => parseVerifyArtifactArgumentsV1(args),
      /release\.invalid_artifact_arguments/u,
    );
  }
});

test("inspects the selected bytes once without rebuilding", async () => {
  const calls = [];
  const result = await runVerifyArtifactCommandV1(
    ["dist/poc", "--allow-development"],
    async (artifactRoot, options) => {
      calls.push([artifactRoot, options]);
      return Object.freeze({ manifestDigest: `sha256:${"a".repeat(64)}` });
    },
  );

  assert.deepEqual(calls, [["dist/poc", { allowDevelopment: true }]]);
  assert.deepEqual(result, { manifestDigest: `sha256:${"a".repeat(64)}` });

  const source = await readFile(new URL("./verify-artifact.mjs", import.meta.url), "utf8");
  assert.match(source, /--experimental-strip-types/u);
  assert.doesNotMatch(source, /createServer|build:e2e|build:poc|release:prepare|["']pnpm["']/u);
});

test("never follows Artifact-root, parent, or legal-target symlinks", async (t) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "project-tavern-legal-copy-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  const outside = join(fixtureRoot, "outside");
  await mkdir(outside);

  const targetLinkRoot = join(fixtureRoot, "target-link");
  await mkdir(targetLinkRoot);
  const victim = join(outside, "victim.txt");
  await writeFile(victim, "owner bytes\n");
  await symlink(victim, join(targetLinkRoot, "LICENSE.md"));
  await assert.rejects(
    copyProjectLegalFilesV1(repositoryRootV1, targetLinkRoot),
    /release\.invalid_artifact_target/u,
  );
  assert.equal(await readFile(victim, "utf8"), "owner bytes\n");

  const parentLinkRoot = join(fixtureRoot, "parent-link");
  await mkdir(parentLinkRoot);
  await symlink(outside, join(parentLinkRoot, "LICENSES"), "dir");
  await assert.rejects(
    copyProjectLegalFilesV1(repositoryRootV1, parentLinkRoot),
    /release\.invalid_artifact_target/u,
  );
  await assert.rejects(readFile(join(parentLinkRoot, "LICENSE.md")), { code: "ENOENT" });
  await assert.rejects(readFile(join(outside, "MIT.txt")), { code: "ENOENT" });

  const rootLink = join(fixtureRoot, "root-link");
  await symlink(outside, rootLink, "dir");
  await assert.rejects(
    copyProjectLegalFilesV1(repositoryRootV1, rootLink),
    /release\.invalid_artifact_target/u,
  );
});

test("validates every legal source before changing an Artifact leaf", async (t) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "project-tavern-legal-transaction-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  const repository = join(fixtureRoot, "repository");
  const artifact = join(fixtureRoot, "artifact");
  const outside = join(fixtureRoot, "outside.txt");
  await Promise.all([
    mkdir(join(repository, "LICENSES"), { recursive: true }),
    mkdir(artifact),
    writeFile(outside, "outside\n"),
  ]);
  await writeFile(join(repository, "LICENSE.md"), "new license\n");
  await symlink(outside, join(repository, "LICENSES", "CC-BY-NC-SA-4.0.txt"));
  await writeFile(join(artifact, "LICENSE.md"), "old license\n");

  await assert.rejects(
    copyProjectLegalFilesV1(repository, artifact),
    /release\.invalid_legal_authority/u,
  );
  assert.equal(await readFile(join(artifact, "LICENSE.md"), "utf8"), "old license\n");
});

test("rejects an ignored build-output ancestor symlink before Vite can write", async (t) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "project-tavern-build-boundary-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  const repository = join(fixtureRoot, "repository");
  const outside = join(fixtureRoot, "outside");
  await Promise.all([mkdir(repository), mkdir(outside)]);
  await symlink(outside, join(repository, "dist"), "dir");
  const moduleUrl = new URL("./release/build-artifact.mts", import.meta.url).href;
  const program = `const module=await import(${JSON.stringify(moduleUrl)});await module.inspectArtifactOutputBoundaryV1(process.argv[1],{outDir:"dist/poc"},false);`;
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", program, repository],
    { encoding: "utf8", shell: false },
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /release\.invalid_artifact_target/u);
});

test("discards a private candidate and preserves the old final when finalization fails", async () => {
  const { buildArtifactV1 } = await import("./release/build-artifact.mts");
  const fixture = createArtifactLifecyclePortsV1({ failFinalizer: true });

  await assert.rejects(
    buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, fixture.ports),
    /fixture finalizer failed/u,
  );

  assert.equal(fixture.getFinalBytes(), "old-final");
  assert.equal(fixture.events.filter((event) => event === "publish").length, 0);
  assert.equal(fixture.events.filter((event) => event === "discard").length, 1);
  assert.equal(fixture.events.at(-1), "discard");
});

test("uses one private candidate and publishes only after final verification", async () => {
  const { buildArtifactV1 } = await import("./release/build-artifact.mts");
  const fixture = createArtifactLifecyclePortsV1({ failFinalizer: false });

  await buildArtifactV1({ story: "poc", host: "web", outDir: "dist/poc" }, fixture.ports);

  assert.equal(fixture.getFinalBytes(), "candidate-final");
  assert.equal(fixture.events.filter((event) => event === "discard").length, 0);
  assert.equal(fixture.events.filter((event) => event === "publish").length, 1);
  assert.equal(fixture.events.at(-1), "publish");
});
