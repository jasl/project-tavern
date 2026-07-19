// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { request as requestHttp } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import prebuiltPlaywrightConfigV1 from "../../engine/packages/web/playwright.prebuilt.config.js";

import {
  parseStaticPocServerCliArgumentsV1,
  pocStaticServerContractV1,
  smokeStaticPocArtifactV1,
  startStaticPocArtifactServerV1,
  type StaticPocArtifactServerV1,
} from "./smoke-poc.mjs";

interface RawResponseV1 {
  readonly body: Buffer;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly status: number;
}

const temporaryRootsV1: string[] = [];
const runningServersV1: StaticPocArtifactServerV1[] = [];

afterEach(async () => {
  await Promise.all(runningServersV1.splice(0).map((server) => server.close()));
  await Promise.all(
    temporaryRootsV1.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

async function createArtifactFixtureV1(input?: {
  readonly css?: string;
  readonly indexHtml?: string;
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-static-poc-"));
  temporaryRootsV1.push(root);
  const files = [
    [
      "index.html",
      input?.indexHtml ?? '<!doctype html><script type="module" src="./assets/app.js"></script>',
    ],
    ["assets/app.js", "globalThis.__projectTavernPrebuilt = true;\n"],
    ["assets/app.css", input?.css ?? ':root { background: url("./background.png"); }\n'],
    ["assets/data.json", '{"ready":true}\n'],
    ["assets/font.woff2", "font-bytes"],
  ] as const;
  for (const [path, bytes] of files) {
    const target = join(root, ...path.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return root;
}

function trackServerV1(server: StaticPocArtifactServerV1): StaticPocArtifactServerV1 {
  runningServersV1.push(server);
  return server;
}

async function requestRawV1(
  server: StaticPocArtifactServerV1,
  path: string,
  method = "GET",
): Promise<RawResponseV1> {
  return new Promise((resolveResponse, rejectResponse) => {
    const request = requestHttp(
      {
        host: server.host,
        method,
        path,
        port: server.port,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.once("error", rejectResponse);
        response.once("end", () => {
          resolveResponse({
            body: Buffer.concat(chunks),
            headers: response.headers,
            status: response.statusCode ?? 0,
          });
        });
      },
    );
    request.once("error", rejectResponse);
    request.end();
  });
}

describe.sequential("static PoC Artifact smoke", () => {
  it.each([
    {
      indexHtml: '<script type="module" src="/assets/app.js"></script>',
    },
    {
      indexHtml: '<link rel="stylesheet" href="/assets/app.css">',
    },
    {
      css: "body { background-image: url('/assets/background.png'); }",
    },
    {
      css: '@import "/assets/theme.css";',
    },
  ])("rejects root-relative browser assets %#", async (input) => {
    const root = await createArtifactFixtureV1(input);

    await expect(
      smokeStaticPocArtifactV1(root, pocStaticServerContractV1.basePath),
    ).rejects.toMatchObject({ code: "artifact.root_relative_url" });
  });

  it("accepts relative browser assets for the fixed nested base", async () => {
    const root = await createArtifactFixtureV1();

    await expect(
      smokeStaticPocArtifactV1(root, pocStaticServerContractV1.basePath),
    ).resolves.toBeUndefined();
  });

  it("freezes the only server CLI, loopback port, nested prefix, and Playwright ownership", async () => {
    expect(pocStaticServerContractV1).toEqual({
      artifactRoot: "dist/poc",
      basePath: "/nested/tavern/",
      host: "127.0.0.1",
      port: 41731,
      url: "http://127.0.0.1:41731/nested/tavern/",
    });
    expect(Object.isFrozen(pocStaticServerContractV1)).toBe(true);
    expect(parseStaticPocServerCliArgumentsV1(["serve"])).toBe("serve");
    for (const argumentsV1 of [
      [],
      ["serve", "dist/poc"],
      ["serve", "--port", "41732"],
      ["serve", "--host", "0.0.0.0"],
      ["serve", "--base", "/"],
      ["build"],
    ]) {
      expect(() => parseStaticPocServerCliArgumentsV1(argumentsV1)).toThrowError(
        expect.objectContaining({ code: "artifact.invalid_smoke_cli" }),
      );
    }

    const webServers = Array.isArray(prebuiltPlaywrightConfigV1.webServer)
      ? prebuiltPlaywrightConfigV1.webServer
      : [prebuiltPlaywrightConfigV1.webServer];
    expect(webServers).toHaveLength(1);
    expect(webServers[0]).toMatchObject({
      command: "node --experimental-strip-types scripts/release/smoke-poc.mts serve",
      cwd: "../../..",
      reuseExistingServer: false,
      url: pocStaticServerContractV1.url,
    });
    expect(prebuiltPlaywrightConfigV1.testDir).toBe("./e2e");
    expect(String(prebuiltPlaywrightConfigV1.testMatch)).toContain("release-");
    expect(prebuiltPlaywrightConfigV1.use?.baseURL).toBe(pocStaticServerContractV1.url);
    expect(prebuiltPlaywrightConfigV1.projects?.map((project) => project.name)).toEqual([
      "chromium",
    ]);

    const [serverSource, configSource] = await Promise.all([
      readFile(new URL("./smoke-poc.mts", import.meta.url), "utf8"),
      readFile(
        new URL("../../engine/packages/web/playwright.prebuilt.config.ts", import.meta.url),
        "utf8",
      ),
    ]);
    expect(serverSource).not.toMatch(
      /node:child_process|\b(?:execFile|execFileSync|spawn|spawnSync)\b|\bVite\b|\bvite\b/u,
    );
    expect(configSource).not.toMatch(/pnpm\s+(?:build|release:prepare)|\bvite\b/iu);
  });

  it("serves only existing bytes at the nested prefix with correct MIME and refresh semantics", async () => {
    const root = await createArtifactFixtureV1();
    const before = await Promise.all([
      readFile(join(root, "index.html")),
      readFile(join(root, "assets/app.js")),
    ]);
    const server = trackServerV1(await startStaticPocArtifactServerV1(root));

    const index = await requestRawV1(server, "/nested/tavern/#/continue");
    const refreshed = await requestRawV1(server, "/nested/tavern/?slot=quick");
    const script = await requestRawV1(server, "/nested/tavern/assets/app.js");
    const style = await requestRawV1(server, "/nested/tavern/assets/app.css");
    const json = await requestRawV1(server, "/nested/tavern/assets/data.json");
    const font = await requestRawV1(server, "/nested/tavern/assets/font.woff2");
    const head = await requestRawV1(server, "/nested/tavern/assets/app.js", "HEAD");

    expect(index).toMatchObject({ status: 200 });
    expect(index.body.toString("utf8")).toContain("./assets/app.js");
    expect(refreshed.body).toEqual(index.body);
    expect(script.headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(style.headers["content-type"]).toBe("text/css; charset=utf-8");
    expect(json.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(font.headers["content-type"]).toBe("font/woff2");
    expect(head).toMatchObject({ body: Buffer.alloc(0), status: 200 });
    expect(head.headers["content-length"]).toBe(String(script.body.byteLength));
    expect(
      await Promise.all([
        readFile(join(root, "index.html")),
        readFile(join(root, "assets/app.js")),
      ]),
    ).toEqual(before);
  });

  it("rejects traversal and symlink requests without escaping the Artifact root", async () => {
    const root = await createArtifactFixtureV1();
    const outside = await mkdtemp(join(tmpdir(), "project-tavern-static-outside-"));
    temporaryRootsV1.push(outside);
    await writeFile(join(outside, "secret.txt"), "must not be served");
    await symlink(join(outside, "secret.txt"), join(root, "assets/secret.txt"));
    const server = trackServerV1(await startStaticPocArtifactServerV1(root));

    for (const path of [
      "/nested/tavern/../package.json",
      "/nested/tavern/%2e%2e/package.json",
      "/nested/tavern/%2E%2E%2Fpackage.json",
      "/nested/tavern/..%5cpackage.json",
      "/nested/tavern/assets/secret.txt",
    ]) {
      await expect(requestRawV1(server, path)).resolves.toMatchObject({ status: 400 });
    }
    await expect(requestRawV1(server, "/package.json")).resolves.toMatchObject({ status: 404 });
  });

  it("returns bounded static failures instead of a build or SPA rewrite", async () => {
    const root = await createArtifactFixtureV1();
    const server = trackServerV1(await startStaticPocArtifactServerV1(root));

    await expect(requestRawV1(server, "/nested/tavern/assets/missing.js")).resolves.toMatchObject({
      status: 404,
    });
    await expect(requestRawV1(server, "/nested/tavern/play")).resolves.toMatchObject({
      status: 404,
    });
    const post = await requestRawV1(server, "/nested/tavern/", "POST");
    expect(post).toMatchObject({ status: 405 });
    expect(post.headers.allow).toBe("GET, HEAD");
  });

  it("refuses to reuse an occupied fixed release-smoke port", async () => {
    const root = await createArtifactFixtureV1();
    const server = trackServerV1(await startStaticPocArtifactServerV1(root));

    await expect(startStaticPocArtifactServerV1(root)).rejects.toMatchObject({
      code: "artifact.port_unavailable",
    });
    expect(server.port).toBe(41731);
  });
});
