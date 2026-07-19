// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectManagedPaths } from "./collect-import-closure.mjs";
import {
  canonicalBundleJsonTextV1,
  verifyBuiltArtifactGraphsV1 as verifyBuiltArtifactGraphsImplementationV1,
  verifyGameArtifactClosureV1,
} from "./verify-bundle.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function assertMissing(path) {
  await assert.rejects(
    stat(path),
    (error) => error instanceof Error && "code" in error && error.code === "ENOENT",
  );
}

async function writeBuiltOutputFixtureV1(root, application, html) {
  const applicationId = `${application}-web`;
  const graphBytes = Buffer.from(JSON.stringify({ applicationId }));
  await mkdir(join(root, "dist", application, "assets"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "dist", application, "index.html"), html),
    writeFile(join(root, "dist", application, "assets", "app.js"), "export {};\n"),
    writeFile(join(root, "dist", application, "source-graph.v1.json"), graphBytes),
    writeFile(
      join(root, "dist", application, "build-input.json"),
      JSON.stringify({
        applicationId,
        host: "web",
        sourceGraphDigest: `sha256:${createHash("sha256").update(graphBytes).digest("hex")}`,
        story: application,
      }),
    ),
  ]);
}

async function readFixtureGraphDigestsV1(root) {
  const [e2e, poc] = await Promise.all([
    readFile(join(root, "dist", "e2e", "source-graph.v1.json")),
    readFile(join(root, "dist", "poc", "source-graph.v1.json")),
  ]);
  return Object.freeze({
    e2e: `sha256:${createHash("sha256").update(e2e).digest("hex")}`,
    poc: `sha256:${createHash("sha256").update(poc).digest("hex")}`,
  });
}

async function verifyBuiltArtifactGraphsV1(root, verifyGraphs, options) {
  return await verifyBuiltArtifactGraphsImplementationV1(
    root,
    async (input) => {
      const result = await verifyGraphs(input);
      return Object.freeze({
        ...result,
        digests: await readFixtureGraphDigestsV1(root),
      });
    },
    options,
  );
}

function validApplicationGraphsV1() {
  return Object.freeze({
    applications: Object.freeze([
      Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
      Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
    ]),
    chunks: Object.freeze({
      e2e: Object.freeze(["assets/app.js"]),
      poc: Object.freeze(["assets/app.js"]),
    }),
    entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
  });
}

test("collects one E2E application closure", async () => {
  const paths = await collectManagedPaths(repositoryRoot, [
    "game/stories/e2e/src/application/entry.tsx",
  ]);
  assert(paths.includes("game/stories/e2e/src/application/entry.tsx"));
  assert(!paths.some((path) => path.includes("developer-entry")));
  assert(!paths.some((path) => path.includes("player-entry")));
});

test("forbids testkit and source archives but permits future tooling chunks", () => {
  assert.deepEqual(
    verifyGameArtifactClosureV1({
      paths: [
        "game/stories/e2e/src/tooling/index.ts",
        "engine/packages/base/src/testkit/private.ts",
      ],
    }),
    ["Artifact closure reached Base testkit: engine/packages/base/src/testkit/private.ts"],
  );
});

test("rejects references, AIGC source, source maps, and absolute paths", () => {
  const errors = verifyGameArtifactClosureV1({
    paths: ["references/a.ts", "art-source/aigc/openai/a.png", "assets/app.js.map", "/tmp/app.js"],
  });
  assert.equal(errors.length, 4);
});

test("uses Base-compatible Unicode canonical ordering and rejects lone surrogates", () => {
  assert.equal(
    canonicalBundleJsonTextV1({ "\u{10000}": "astral", "\ue000": "bmp" }),
    '{"":"bmp","𐀀":"astral"}',
  );
  assert.throws(() => canonicalBundleJsonTextV1({ invalid: "\ud800" }), /surrogate/u);
});

test("removes the legacy dual-root files and Developer export", async () => {
  for (const path of [
    "engine/packages/web/src/developer/development-panel.tsx",
    "engine/packages/web/src/developer/index.ts",
    "game/stories/e2e/developer.html",
    "game/stories/e2e/player.html",
    "game/stories/e2e/src/application/developer-entry.tsx",
    "game/stories/e2e/src/application/player-entry.tsx",
  ]) {
    await assertMissing(join(repositoryRoot, path));
  }
  const webManifest = JSON.parse(
    await readFile(join(repositoryRoot, "engine/packages/web/package.json"), "utf8"),
  );
  assert.deepEqual(webManifest.exports, { ".": "./src/index.ts" });
});

test("pins the closed Story × Host wrapper and rejects caller build overrides", async (t) => {
  const rootManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(
    rootManifest.scripts["build:e2e"],
    "node --experimental-strip-types scripts/release/build-artifact.mts --story e2e --host web --out-dir dist/e2e",
  );
  assert.equal(
    rootManifest.scripts["build:poc"],
    "node --experimental-strip-types scripts/release/build-artifact.mts --story poc --host web --out-dir dist/poc",
  );
  assert.equal(rootManifest.scripts["build:player"], undefined);
  assert.equal(rootManifest.scripts["build:developer"], undefined);
  assert.equal(rootManifest.scripts["build:e2e-player"], undefined);
  assert.doesNotMatch(rootManifest.scripts["build:e2e"], /vite build|--mode/u);
  assert.doesNotMatch(rootManifest.scripts["build:poc"], /vite build|--mode/u);

  const directViteOutDir = join(tmpdir(), `tavern-direct-vite-${process.pid}`);
  t.after(() => rm(directViteOutDir, { recursive: true, force: true }));
  await rm(directViteOutDir, { recursive: true, force: true });
  const directVite = spawnSync(
    "pnpm",
    [
      "exec",
      "vite",
      "build",
      "--config",
      "./vite.config.ts",
      "--mode",
      "e2e-web",
      "--outDir",
      directViteOutDir,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(directVite.status, 0);
  assert.match(`${directVite.stdout}${directVite.stderr}`, /release\.invalid_build_request/u);
  await assertMissing(directViteOutDir);

  const unknownStory = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "demo",
      "--host",
      "web",
      "--out-dir",
      "dist/poc",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(unknownStory.status, 0);
  assert.match(`${unknownStory.stdout}${unknownStory.stderr}`, /release\.invalid_build_request/u);

  const callerRoot = spawnSync("pnpm", ["build:e2e", "game/stories/e2e"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.notEqual(callerRoot.status, 0);
  assert.match(`${callerRoot.stdout}${callerRoot.stderr}`, /release\.invalid_build_request/u);

  const forbiddenOutDir = join(tmpdir(), `tavern-forbidden-artifact-${process.pid}`);
  t.after(() => rm(forbiddenOutDir, { recursive: true, force: true }));
  await rm(forbiddenOutDir, { recursive: true, force: true });
  const callerOutDir = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "e2e",
      "--host",
      "web",
      "--outDir",
      forbiddenOutDir,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(callerOutDir.status, 0);
  assert.match(`${callerOutDir.stdout}${callerOutDir.stderr}`, /release\.invalid_build_request/u);
  await assertMissing(forbiddenOutDir);

  const retainedOutput = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "e2e",
      "--host",
      "web",
      "--out-dir",
      "dist/e2e",
      "--emptyOutDir=false",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(retainedOutput.status, 0);
  assert.match(
    `${retainedOutput.stdout}${retainedOutput.stderr}`,
    /release\.invalid_build_request/u,
  );
});

test("inspects the two caller-built application graphs without rebuilding", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-graphs-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }

  const calls = [];
  const errors = await verifyBuiltArtifactGraphsV1(root, async (input) => {
    calls.push(input);
    return Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    });
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(calls, [{ root }]);
});

test("rejects source maps and unregistered remote output assets in either application", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-forbidden-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      application === "poc"
        ? '<script src="https://cdn.example/poc.js"></script>'
        : '<script src="./assets/app.js"></script>',
    );
  }
  await writeFile(join(root, "dist", "e2e", "assets", "app.js.map"), "{}\n");
  await writeFile(join(root, "dist", "e2e", "assets", "unregistered.js"), "export {};\n");

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("source map")));
  assert(errors.some((error) => error.includes("remote runtime asset")));
  assert(errors.some((error) => error.includes("graph chunks")));
});

test("rejects a graph-declared JavaScript chunk missing from either output", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-missing-chunk-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js", "assets/missing.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("e2e-web emitted JavaScript")));
});

test("scans non-JavaScript E2E payloads and rejects unknown output roots", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-full-scan-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  await writeFile(
    join(root, "dist", "e2e", "assets", "remote.svg"),
    '<svg><image href="https://cdn.example.invalid/runtime.png"/></svg>',
  );
  await writeFile(
    join(root, "dist", "e2e", "assets", "remote-import.css"),
    '@import "//evil.example/x";',
  );
  await writeFile(
    join(root, "dist", "e2e", "assets", "nonlocal-url.css"),
    "body{background:url(file:///tmp/evil.png)}",
  );
  await writeFile(
    join(root, "dist", "e2e", "assets", "escaped-url.css"),
    "body{background:u\\72l(//evil.example/x.png)}",
  );
  await writeFile(
    join(root, "dist", "e2e", "assets", "nonlocal-image-set.css"),
    'body{background-image:image-set("//evil.example/x.png" 1x)}',
  );
  await writeFile(join(root, "dist", "e2e", "credentials.json"), '{"TOKEN":"leak"}');
  await writeFile(
    join(root, "dist", "e2e", "assets", ".npmrc"),
    "//registry.example.invalid/:_authToken=abcd1234",
  );
  await rm(join(root, "dist", "e2e", "index.html"));

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("remote runtime asset")));
  assert(errors.some((error) => error.includes("CSS import")));
  assert(errors.some((error) => error.includes("nonlocal CSS asset")));
  assert(errors.some((error) => error.includes("nonlocal CSS string")));
  assert(errors.some((error) => error.includes("forbidden Artifact root")));
  assert(errors.some((error) => error.includes("required Artifact file")));
  assert(errors.some((error) => error.includes("credential")));
});

test("rejects E2E script sources outside the declared graph chunks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-script-closure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      application === "e2e"
        ? '<script type="module" src="./assets/unregistered-runtime.mjs"></script>'
        : '<script type="module" src="./assets/app.js"></script>',
    );
  }
  await writeFile(join(root, "dist", "e2e", "assets", "unregistered-runtime.mjs"), "export {};\n");

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("outside graph chunk form")));
  assert(errors.some((error) => error.includes("undeclared script")));
});

test("requires index.html to load the graph application entry chunk", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-entry-chunk-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      application === "e2e"
        ? '<script type="module" data-src="./assets/app.js"></script>'
        : '<script type="module" src="./assets/app.js"></script>',
    );
  }

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("has no application script")));
});

test("rejects secret assignments with camel-case, prefixed, and punctuation forms", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-secrets-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  await writeFile(
    join(root, "dist", "e2e", "assets", "config.json"),
    '{"clientSecret":"p@ss.word","apiKey":"abcd"}',
  );
  await writeFile(
    join(root, "dist", "e2e", "assets", "runtime.txt"),
    "AWS_SECRET_ACCESS_KEY=p@ss.word",
  );

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.filter((error) => error.includes("secret assignment")).length >= 2);
});

test("rejects inline, non-module, and quote-hidden HTML execution", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-html-execution-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  const verifyGraphs = async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    });
  for (const html of [
    '<script type="module" src="./assets/app.js">globalThis.pwned=1</script>',
    '<script type="application/json" src="./assets/app.js"></script>',
    "<script title=\" src='./assets/app.js'\"></script>",
    '<!-- <script type="module" src="./assets/app.js"></script> -->',
    '<template><script type="module" src="./assets/app.js"></script></template>',
    '<![CDATA[<script type="module" src="./assets/app.js"></script>]]>',
    '<!doctype html "><img src=x onerror=globalThis.pwned=1>"><script type="module" src="./assets/app.js"></script>',
    '<link rel="stylesheet" href="data:text/css,body{background:url(//evil.example/x)}"><script type="module" src="./assets/app.js"></script>',
    '<link rel="stylesheet" href="file:///tmp/evil.css"><script type="module" src="./assets/app.js"></script>',
    '<script type="module" src="./assets/app.js" crossorigin="<!--" onload="globalThis.pwned=1" data-x="-->"></script>',
    '<script type="module" src="./assets/app.js" crossorigin="<style>" onload="globalThis.pwned=1" data-x="</style>"></script>',
    '<div data-x=\'<script type="module" src="./assets/app.js"></script>\'></div>',
    '<script type="module" src="./assets/app.js"></script><img onerror="globalThis.pwned=1">',
    '<script type="module" src="./assets/app.js"></script><a href="javascript:globalThis.pwned=1">x</a>',
    '<script type="module" src="./assets/app.js"></script><a href="java&#x73;cript:globalThis.pwned=1">x</a>',
    '<script type="module" src="./assets/app.js"></script><a href="java\nscript:globalThis.pwned=1">x</a>',
  ]) {
    await writeFile(join(root, "dist", "e2e", "index.html"), html);
    const errors = await verifyBuiltArtifactGraphsV1(root, verifyGraphs);
    assert(
      errors.some((error) =>
        /comment|inert|inline|markup|non-module|script|unsupported/u.test(error),
      ),
      html,
    );
  }
});

test("rejects Artifact outputs redirected through a symlink ancestor", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "tavern-bundle-output-boundary-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = join(fixture, "repository");
  const redirected = join(fixture, "redirected");
  await mkdir(root);
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      redirected,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  await symlink(join(redirected, "dist"), join(root, "dist"), "dir");

  const errors = await verifyBuiltArtifactGraphsV1(root, async () =>
    Object.freeze({
      applications: Object.freeze([
        Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
        Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
      ]),
      chunks: Object.freeze({
        e2e: Object.freeze(["assets/app.js"]),
        poc: Object.freeze(["assets/app.js"]),
      }),
      entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
    }),
  );

  assert(errors.some((error) => error.includes("escapes the repository output boundary")));
});

test("rejects a payload file replaced by a symlink after enumeration", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-payload-race-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  const outside = join(root, "outside.js");
  await writeFile(outside, "globalThis.pwned = true;\n");
  let replaced = false;

  const errors = await verifyBuiltArtifactGraphsV1(
    root,
    async () =>
      Object.freeze({
        applications: Object.freeze([
          Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
          Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
        ]),
        chunks: Object.freeze({
          e2e: Object.freeze(["assets/app.js"]),
          poc: Object.freeze(["assets/app.js"]),
        }),
        entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
      }),
    {
      beforePayloadRead: async ({ application, outputRoot }) => {
        if (application.story !== "e2e") return;
        const target = join(outputRoot, "assets", "app.js");
        await rename(target, join(outputRoot, "assets", "original.js"));
        await symlink(outside, target);
        replaced = true;
      },
    },
  );

  assert.equal(replaced, true);
  assert(errors.some((error) => /ELOOP|symlink|escaped|changed/u.test(error)));
});

test("rejects a payload added after the initial file-set snapshot", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-payload-addition-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  let injected = false;

  const errors = await verifyBuiltArtifactGraphsV1(
    root,
    async () =>
      Object.freeze({
        applications: Object.freeze([
          Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
          Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
        ]),
        chunks: Object.freeze({
          e2e: Object.freeze(["assets/app.js"]),
          poc: Object.freeze(["assets/app.js"]),
        }),
        entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
      }),
    {
      beforePayloadRead: async ({ application, outputRoot }) => {
        if (application.story !== "e2e") return;
        await writeFile(join(outputRoot, "assets", "injected.js"), "globalThis.pwned = true;\n");
        injected = true;
      },
    },
  );

  assert.equal(injected, true);
  assert(errors.some((error) => error.includes("Artifact file set changed during inspection")));
});

for (const payloadPath of [
  "assets/app.js",
  "build-input.json",
  "source-graph.v1.json",
  "artifact-manifest.json",
  "LICENSE.md",
]) {
  test(`rejects an equal-length ${payloadPath} replacement after payload inspection`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "tavern-bundle-payload-snapshot-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const application of ["poc", "e2e"]) {
      await writeBuiltOutputFixtureV1(
        root,
        application,
        '<script type="module" src="./assets/app.js"></script>',
      );
    }
    if (payloadPath === "artifact-manifest.json" || payloadPath === "LICENSE.md") {
      await writeFile(join(root, "dist", "poc", payloadPath), "reviewed\n");
    }
    let replaced = false;

    const errors = await verifyBuiltArtifactGraphsV1(root, async () => validApplicationGraphsV1(), {
      afterPayloadInspection: async ({ application, outputRoot }) => {
        if (application.story !== "poc") return;
        const target = join(outputRoot, ...payloadPath.split("/"));
        const bytes = Buffer.from(await readFile(target));
        bytes[0] = (bytes[0] ?? 0) ^ 1;
        await writeFile(target, bytes);
        replaced = true;
      },
    });

    assert.equal(replaced, true);
    assert(
      errors.some(
        (error) =>
          error.includes("Artifact payload changed during inspection") &&
          error.includes(payloadPath),
      ),
      errors.join("\n"),
    );
  });
}

test("rejects a same-content Artifact root replacement after payload inspection", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-root-snapshot-"));
  const replacementRoot = await mkdtemp(join(tmpdir(), "tavern-bundle-root-replacement-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(replacementRoot, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  await writeBuiltOutputFixtureV1(
    replacementRoot,
    "e2e",
    '<script type="module" src="./assets/app.js"></script>',
  );
  let replaced = false;

  const errors = await verifyBuiltArtifactGraphsV1(root, async () => validApplicationGraphsV1(), {
    afterPayloadInspection: async ({ application, outputRoot }) => {
      if (application.story !== "e2e") return;
      await rename(outputRoot, `${outputRoot}.original`);
      await rename(join(replacementRoot, "dist", "e2e"), outputRoot);
      replaced = true;
    },
  });

  assert.equal(replaced, true);
  assert(
    errors.some((error) => error.includes("output boundary changed during inspection")),
    errors.join("\n"),
  );
});

test("binds inspected graph bytes to the graph verifier digest", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-bundle-graph-race-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const application of ["poc", "e2e"]) {
    await writeBuiltOutputFixtureV1(
      root,
      application,
      '<script type="module" src="./assets/app.js"></script>',
    );
  }
  let replaced = false;

  const errors = await verifyBuiltArtifactGraphsV1(
    root,
    async () =>
      Object.freeze({
        applications: Object.freeze([
          Object.freeze({ id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" }),
          Object.freeze({ id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" }),
        ]),
        chunks: Object.freeze({
          e2e: Object.freeze(["assets/app.js"]),
          poc: Object.freeze(["assets/app.js"]),
        }),
        entryChunks: Object.freeze({ e2e: "assets/app.js", poc: "assets/app.js" }),
      }),
    {
      beforePayloadRead: async ({ application, outputRoot }) => {
        if (application.story !== "e2e") return;
        const graphBytes = Buffer.from(JSON.stringify({ applicationId: "e2e-web", rebound: true }));
        await Promise.all([
          writeFile(join(outputRoot, "source-graph.v1.json"), graphBytes),
          writeFile(
            join(outputRoot, "build-input.json"),
            JSON.stringify({
              applicationId: "e2e-web",
              host: "web",
              sourceGraphDigest: `sha256:${createHash("sha256").update(graphBytes).digest("hex")}`,
              story: "e2e",
            }),
          ),
        ]);
        replaced = true;
      },
    },
  );

  assert.equal(replaced, true);
  assert(errors.some((error) => error.includes("source graph changed after graph verification")));
});
