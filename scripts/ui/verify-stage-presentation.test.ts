// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

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
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["build:poc"]],
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
  const browserIndex = childNames.indexOf("test:e2e:interaction");
  expect(childNames.indexOf("build:e2e")).toBeLessThan(browserIndex);
  expect(childNames.indexOf("build:poc")).toBeLessThan(browserIndex);
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
    "pnpm verify:phase5a && pnpm verify:story-presentation",
  );
});

test("replaces the Phase 5A root child with one Phase 5B child", async () => {
  const verifyModuleUrl = new URL("../verify.mjs", import.meta.url).href;
  const { coreVerificationCommandsV1 } = (await import(verifyModuleUrl)) as {
    readonly coreVerificationCommandsV1: readonly (readonly [string, readonly string[]])[];
  };
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  expect(names.filter((name) => name === "verify:phase5b")).toHaveLength(1);
  expect(names).not.toContain("verify:phase5a");
  expect(names).not.toContain("verify:phase4");
  expect(names).not.toContain("verify:ui");
  expect(names.filter((name) => name === "verify:semantic")).toHaveLength(1);
});

describe("Stage/Story presentation runner", () => {
  test("runs sequentially without a shell and stops on the first nonzero exit", async () => {
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    let callCount = 0;
    const spawn = vi.fn<StagePresentationSpawnV1>((_command, _args, _options) => ({
      signal: null,
      status: ++callCount === 8 ? 1 : 0,
    }));

    expect(() => runStagePresentationVerificationV1("/repo/project-tavern", spawn)).toThrow(
      /pnpm verify:stories failed/u,
    );
    expect(spawn).toHaveBeenCalledTimes(8);
    expect(spawn.mock.calls.map(([command, args]) => [command, args])).toEqual(
      expectedStagePresentationVerificationCommandsV1.slice(0, 8),
    );
    for (const [, , options] of spawn.mock.calls) {
      expect(options).toEqual({
        cwd: "/repo/project-tavern",
        shell: false,
        stdio: "inherit",
      });
    }
  });

  test("treats a terminated child as a failure", async () => {
    const { runStagePresentationVerificationV1 } = await import("./verify-stage-presentation.mjs");
    expect(() =>
      runStagePresentationVerificationV1("/repo/project-tavern", (() => ({
        signal: "SIGTERM",
        status: null,
      })) satisfies StagePresentationSpawnV1),
    ).toThrow(/pnpm --filter @sillymaker\/ui exec vitest run/u);
  });
});
