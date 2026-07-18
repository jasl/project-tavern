// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { request as requestHttp } from "node:http";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { uiTargetsV1 } from "../../engine/packages/web/e2e/ui-targets.js";

import {
  createStoryRootServerFixtureV1,
  createStoryRootServerV1,
  parseStoryRootServerCliArgumentsV1,
  storyRootServerTargetsV1,
  type StoryRootServerV1,
} from "./serve-story-roots.mjs";

interface RawResponseV1 {
  readonly body: string;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly status: number;
}

const cleanupTasksV1: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanupTasksV1.splice(0).toReversed()) await cleanup();
});

async function createRepositoryFixtureV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tavern-story-roots-"));
  cleanupTasksV1.push(async () => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, "dist/e2e/assets"), { recursive: true });
  await mkdir(join(root, "dist/poc/assets"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "dist/e2e/index.html"), "<!doctype html><title>E2E</title>"),
    writeFile(join(root, "dist/e2e/assets/app.js"), "globalThis.__e2e = true;"),
    writeFile(join(root, "dist/poc/index.html"), "<!doctype html><title>PoC</title>"),
    writeFile(join(root, "dist/poc/assets/app.css"), ":root { color: #fff; }"),
  ]);
  return root;
}

function trackServerV1(server: StoryRootServerV1): StoryRootServerV1 {
  cleanupTasksV1.push(() => server.close());
  return server;
}

async function requestRawV1(
  server: StoryRootServerV1,
  path: string,
  method = "GET",
): Promise<RawResponseV1> {
  return new Promise((resolveResponse, rejectResponse) => {
    const request = requestHttp(
      {
        host: server.bindAddress,
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
            body: Buffer.concat(chunks).toString("utf8"),
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

async function startInvalidStoryRootServerV1(input: string, repositoryRoot: string): Promise<void> {
  const server = await createStoryRootServerV1(input, repositoryRoot);
  await server.close();
}

describe.sequential("prebuilt Story root server", () => {
  it("serves exactly two distinct loopback targets without building", () => {
    expect(uiTargetsV1).toEqual({
      e2e: {
        applicationId: "e2e-web",
        root: "dist/e2e",
        host: "127.0.0.1",
        port: 41731,
      },
      poc: {
        applicationId: "poc-web",
        root: "dist/poc",
        host: "127.0.0.1",
        port: 41732,
      },
    });
    expect(storyRootServerTargetsV1).toEqual(uiTargetsV1);
    expect(Object.isFrozen(uiTargetsV1)).toBe(true);
    expect(Object.values(uiTargetsV1).every((target) => Object.isFrozen(target))).toBe(true);
    expect(uiTargetsV1.e2e.port).not.toBe(uiTargetsV1.poc.port);
  });

  it("serves exactly the two prebuilt Story roots on loopback", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    const fixture = await createStoryRootServerFixtureV1(repositoryRoot);
    cleanupTasksV1.push(() => fixture.close());

    expect(fixture.targets).toEqual({
      e2e: { applicationId: "e2e-web", root: "dist/e2e" },
      poc: { applicationId: "poc-web", root: "dist/poc" },
    });
    expect(fixture.bindAddress).toBe("127.0.0.1");
    expect(fixture.ports).toEqual({ e2e: 41731, poc: 41732 });
    expect(fixture.ports.e2e).not.toBe(fixture.ports.poc);

    await expect(fetch(`${fixture.urls.e2e}/`)).resolves.toMatchObject({ status: 200 });
    await expect(fetch(`${fixture.urls.poc}/`)).resolves.toMatchObject({ status: 200 });
  });

  it.each([
    ["../dist/poc", "ui_server.path_traversal"],
    ["dist/missing", "ui_server.root_missing"],
    ["https://example.test", "ui_server.non_loopback"],
  ] as const)("rejects %s with %s", async (input, code) => {
    const repositoryRoot = await createRepositoryFixtureV1();
    await expect(startInvalidStoryRootServerV1(input, repositoryRoot)).rejects.toMatchObject({
      code,
    });
  });

  it("serves existing bytes and never falls back to a build or a write", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    const indexPath = join(repositoryRoot, "dist/e2e/index.html");
    const assetPath = join(repositoryRoot, "dist/e2e/assets/app.js");
    const before = await Promise.all([readFile(indexPath), readFile(assetPath)]);
    const server = trackServerV1(
      await createStoryRootServerV1(storyRootServerTargetsV1.e2e.root, repositoryRoot),
    );

    const index = await requestRawV1(server, "/#/play");
    const asset = await requestRawV1(server, "/assets/app.js");
    const missing = await requestRawV1(server, "/assets/missing.js");

    expect(index).toMatchObject({ body: "<!doctype html><title>E2E</title>", status: 200 });
    expect(asset).toMatchObject({ body: "globalThis.__e2e = true;", status: 200 });
    expect(asset.headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(missing.status).toBe(404);
    await expect(Promise.all([readFile(indexPath), readFile(assetPath)])).resolves.toEqual(before);

    const source = await readFile(new URL("./serve-story-roots.mts", import.meta.url), "utf8");
    expect(source).not.toMatch(/node:child_process|\b(?:vite|spawn|writeFile|mkdir|rm)\b/u);
  });

  it.each(["/../package.json", "/%2e%2e/package.json", "/\\..\\package.json"])(
    "rejects request traversal %s before reading",
    async (path) => {
      const repositoryRoot = await createRepositoryFixtureV1();
      const server = trackServerV1(
        await createStoryRootServerV1(storyRootServerTargetsV1.e2e.root, repositoryRoot),
      );
      await expect(requestRawV1(server, path)).resolves.toMatchObject({ status: 400 });
    },
  );

  it("rejects symlinked roots and requested symlink entries", async () => {
    const rootFixture = await mkdtemp(join(tmpdir(), "tavern-story-root-symlink-"));
    cleanupTasksV1.push(async () => rm(rootFixture, { force: true, recursive: true }));
    await mkdir(join(rootFixture, "dist/actual"), { recursive: true });
    await writeFile(join(rootFixture, "dist/actual/index.html"), "actual");
    await symlink(join(rootFixture, "dist/actual"), join(rootFixture, "dist/e2e"));

    await expect(createStoryRootServerV1("dist/e2e", rootFixture)).rejects.toMatchObject({
      code: "ui_server.symlink",
    });

    const repositoryRoot = await createRepositoryFixtureV1();
    await symlink(
      join(repositoryRoot, "dist/poc/index.html"),
      join(repositoryRoot, "dist/e2e/assets/symlink.html"),
    );
    const server = trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));
    await expect(requestRawV1(server, "/assets/symlink.html")).resolves.toMatchObject({
      status: 400,
    });
  });

  it("requires a regular index and does not serve directories or unknown methods", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    await rm(join(repositoryRoot, "dist/e2e/index.html"));
    await expect(createStoryRootServerV1("dist/e2e", repositoryRoot)).rejects.toMatchObject({
      code: "ui_server.root_missing",
    });

    await writeFile(join(repositoryRoot, "dist/e2e/index.html"), "restored");
    const server = trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));
    await expect(requestRawV1(server, "/assets/")).resolves.toMatchObject({ status: 404 });
    await expect(requestRawV1(server, "/", "POST")).resolves.toMatchObject({ status: 405 });
  });

  it("serves index only for the legal hash-router entry path", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    const server = trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));

    await expect(requestRawV1(server, "/#/play")).resolves.toMatchObject({ status: 200 });
    await expect(requestRawV1(server, "/missing#/play")).resolves.toMatchObject({ status: 404 });
  });

  it("refuses a second server on an occupied fixed target port", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));

    await expect(createStoryRootServerV1("dist/e2e", repositoryRoot)).rejects.toMatchObject({
      code: "ui_server.port_unavailable",
    });
  });

  it("allows the CLI to select a fixed target but not override root, host, or port", () => {
    expect(parseStoryRootServerCliArgumentsV1(["--target", "e2e"])).toBe("e2e");
    expect(parseStoryRootServerCliArgumentsV1(["--target", "poc"])).toBe("poc");

    for (const argumentsV1 of [
      ["--target", "e2e", "--root", "dist/poc"],
      ["--target", "e2e", "--host", "0.0.0.0"],
      ["--target", "e2e", "--port", "9999"],
      ["--target", "unknown"],
    ]) {
      expect(() => parseStoryRootServerCliArgumentsV1(argumentsV1)).toThrowError(
        expect.objectContaining({ code: "ui_server.invalid_cli" }),
      );
    }
  });

  it("closes an incomplete local connection so failed browser runs release the fixed port", async () => {
    const repositoryRoot = await createRepositoryFixtureV1();
    const server = trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));
    const socket = createConnection({ host: server.bindAddress, port: server.port });
    await once(socket, "connect");
    socket.write("GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n");

    let socketErrorCode: string | undefined;
    const socketClosed = new Promise<void>((resolveClose) => {
      socket.once("error", (error: Error & { readonly code?: string }) => {
        socketErrorCode = error.code;
      });
      socket.once("close", resolveClose);
    });
    try {
      await Promise.all([server.close(), socketClosed]);
      expect([undefined, "ECONNRESET"]).toContain(socketErrorCode);

      const replacement = trackServerV1(await createStoryRootServerV1("dist/e2e", repositoryRoot));
      await expect(fetch(`${replacement.url}/`)).resolves.toMatchObject({ status: 200 });
    } finally {
      socket.destroy();
    }
  });
});
