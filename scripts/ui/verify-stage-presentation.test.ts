// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test, vi } from "vitest";

import type { runStagePresentationVerificationV1 } from "./verify-stage-presentation.mjs";

type StagePresentationSpawnV1 = NonNullable<
  Parameters<typeof runStagePresentationVerificationV1>[1]
>;

const expectedStagePresentationVerificationCommandsV1 = [
  [
    "pnpm",
    [
      "--filter",
      "@sillymaker/ui",
      "exec",
      "vitest",
      "run",
      "src/runtime/runtime-presentation-store.test.ts",
      "src/stage",
      "src/characters",
      "src/interaction",
    ],
  ],
  [
    "pnpm",
    ["--filter", "@sillymaker/web", "exec", "vitest", "run", "src/preferences", "src/routing"],
  ],
  [
    "pnpm",
    [
      "--filter",
      "@project-tavern/story-e2e",
      "exec",
      "vitest",
      "run",
      "src/presentation",
      "src/application",
    ],
  ],
  [
    "pnpm",
    [
      "--filter",
      "@project-tavern/story-poc",
      "exec",
      "vitest",
      "run",
      "src/presentation",
      "src/application",
    ],
  ],
  ["pnpm", ["test:e2e:interaction"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["verify:assets"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["typecheck"]],
] as const;

test("owns the read-only Stage/Story presentation leaf", async () => {
  const { stagePresentationVerificationCommandsV1 } =
    await import("./verify-stage-presentation.mjs");
  expect(stagePresentationVerificationCommandsV1).toEqual(
    expectedStagePresentationVerificationCommandsV1,
  );
  expect(Object.isFrozen(stagePresentationVerificationCommandsV1)).toBe(true);
  for (const command of stagePresentationVerificationCommandsV1) {
    expect(Object.isFrozen(command)).toBe(true);
    expect(Object.isFrozen(command[1])).toBe(true);
  }
  const childNames = stagePresentationVerificationCommandsV1.map(([, args]) => args[0]);
  expect(childNames).not.toContain("verify");
  expect(childNames).not.toContain("verify:ui");
  expect(childNames).not.toContain("verify:semantic");
  expect(childNames).not.toContain("build:e2e");
  expect(childNames).not.toContain("build:poc");
  expect(JSON.stringify(stagePresentationVerificationCommandsV1)).not.toMatch(
    /update|regenerate|release|screenshot/u,
  );
});

test("maps the cumulative phase exactly once", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );
  expect(packageJson.scripts["verify:story-presentation"]).toBe(
    "node --experimental-strip-types scripts/ui/verify-stage-presentation.mts",
  );
  expect(packageJson.scripts["verify:phase5b"]).toBe(
    "pnpm verify:phase5a && pnpm build:e2e && pnpm build:poc && pnpm verify:story-presentation",
  );
});

test("keeps the final root on direct presentation leaves", async () => {
  const verifyModuleUrl = new URL("../verify.mjs", import.meta.url).href;
  const { coreVerificationCommandsV1, verificationStepsV1 } = (await import(verifyModuleUrl)) as {
    readonly coreVerificationCommandsV1: readonly (readonly [string, readonly string[]])[];
    readonly verificationStepsV1: readonly {
      readonly id: string;
      readonly command: string;
      readonly args: readonly string[];
    }[];
  };
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  expect(verificationStepsV1.map(({ id }) => id)).toContain("ui");
  expect(names).not.toContain("verify:phase5b");
  expect(names).not.toContain("verify:phase5c");
  expect(names).not.toContain("verify:phase5a");
  expect(names).not.toContain("verify:phase4");
  expect(names.filter((name) => name === "verify:ui")).toHaveLength(1);
  expect(names.filter((name) => name === "verify:semantic")).toHaveLength(1);
  expect(names.indexOf("build:e2e")).toBeLessThan(names.indexOf("verify:semantic"));
  expect(names.indexOf("verify:semantic")).toBeLessThan(names.indexOf("verify:ui"));
});

async function createPrebuiltStoryRootsV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tavern-stage-presentation-"));
  for (const target of ["e2e", "poc"]) {
    const directory = join(root, "dist", target);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), `<!doctype html><title>${target}</title>`);
  }
  return root;
}

test("fails stably before spawning when a prebuilt Story root is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "tavern-stage-presentation-missing-"));
  const spawn = vi.fn<StagePresentationSpawnV1>();
  try {
    await mkdir(join(root, "dist/e2e"), { recursive: true });
    await writeFile(join(root, "dist/e2e/index.html"), "<!doctype html><title>E2E</title>");
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    let thrown: unknown;
    try {
      runStagePresentationVerificationV1(root, spawn);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      code: "ui.story_presentation_root_missing",
      path: "dist/poc/index.html",
    });
    expect(spawn).not.toHaveBeenCalled();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("normalizes an invalid prebuilt Story root without spawning", async () => {
  const root = await mkdtemp(join(tmpdir(), "tavern-stage-presentation-invalid-"));
  const spawn = vi.fn<StagePresentationSpawnV1>();
  try {
    await mkdir(join(root, "dist/e2e"), { recursive: true });
    await writeFile(join(root, "dist/e2e/index.html"), "<!doctype html><title>E2E</title>");
    await writeFile(join(root, "dist/poc"), "not a directory");
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    let thrown: unknown;
    try {
      runStagePresentationVerificationV1(root, spawn);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      code: "ui.story_presentation_root_missing",
      path: "dist/poc/index.html",
    });
    expect(spawn).not.toHaveBeenCalled();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

describe("Stage/Story presentation runner", () => {
  test("runs sequentially without a shell and stops on the first nonzero exit", async () => {
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    const root = await createPrebuiltStoryRootsV1();
    let callCount = 0;
    const spawn = vi.fn<StagePresentationSpawnV1>((_command, _args, _options) => ({
      signal: null,
      status: ++callCount === 6 ? 1 : 0,
    }));
    try {
      expect(() => runStagePresentationVerificationV1(root, spawn)).toThrow(
        /pnpm verify:stories failed/u,
      );
      expect(spawn).toHaveBeenCalledTimes(6);
      expect(spawn.mock.calls.map(([command, args]) => [command, args])).toEqual(
        expectedStagePresentationVerificationCommandsV1.slice(0, 6),
      );
      for (const [, , options] of spawn.mock.calls) {
        expect(options).toEqual({
          cwd: root,
          shell: false,
          stdio: "inherit",
        });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("treats a terminated child as a failure", async () => {
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    const root = await createPrebuiltStoryRootsV1();
    try {
      expect(() =>
        runStagePresentationVerificationV1(root, (() => ({
          signal: "SIGTERM",
          status: null,
        })) satisfies StagePresentationSpawnV1),
      ).toThrow(/pnpm --filter @sillymaker\/ui exec vitest run/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
