// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, test, vi } from "vitest";

import type { runPhase5cVerificationV1 } from "./verify-phase5c.mjs";

type Phase5cSpawnV1 = NonNullable<Parameters<typeof runPhase5cVerificationV1>[1]>;

const expectedVerifyPhase5cCommandsV1 = [
  [
    "pnpm",
    [
      "--filter",
      "@sillymaker/base",
      "exec",
      "vitest",
      "run",
      "src/contracts/diagnostics.test.ts",
      "src/runtime/diagnostics/debug-bundle.test.ts",
    ],
  ],
  ["pnpm", ["--filter", "@sillymaker/ui", "exec", "vitest", "run", "src/debug", "src/diagnostics"]],
  [
    "pnpm",
    [
      "--filter",
      "@sillymaker/web",
      "exec",
      "vitest",
      "run",
      "src/capabilities",
      "src/automation",
      "src/application/create-game-runtime.test.ts",
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
      "src/tooling",
      "src/tooling-ui",
      "src/application/create-poc-presentation-runtime.test.ts",
      "src/application/install-poc-hmr.integration.test.ts",
    ],
  ],
  [
    "pnpm",
    [
      "--filter",
      "@project-tavern/story-e2e",
      "exec",
      "vitest",
      "run",
      "src/tooling",
      "src/tooling-ui",
      "src/application",
    ],
  ],
  ["pnpm", ["verify:application-graphs"]],
  ["pnpm", ["test:e2e:ui", "--project=chromium", "--grep", "@phase5c", "--grep-invert", "@visual"]],
  [
    "pnpm",
    ["test:e2e:ui", "--project=chromium-touch", "--grep", "@phase5c", "--grep-invert", "@visual"],
  ],
  ["pnpm", ["test:e2e:ui", "--project=webkit", "--grep", "@phase5c", "--grep-invert", "@visual"]],
  ["pnpm", ["verify:ui-visual"]],
] as const;

test("keeps Phase 5C inspect-only", async () => {
  const { verifyPhase5cCommandsV1 } = await import("./verify-phase5c.mjs");
  expect(verifyPhase5cCommandsV1).toEqual(expectedVerifyPhase5cCommandsV1);
  expect(Object.isFrozen(verifyPhase5cCommandsV1)).toBe(true);
  for (const command of verifyPhase5cCommandsV1) {
    expect(Object.isFrozen(command)).toBe(true);
    expect(Object.isFrozen(command[1])).toBe(true);
  }
  expect(verifyPhase5cCommandsV1).not.toContainEqual(["pnpm", ["verify:ui"]]);
  expect(JSON.stringify(verifyPhase5cCommandsV1)).not.toMatch(
    /build:|update:|regenerate|--update-snapshots|vite build|verify:phase|release|prepare/u,
  );
});

describe("Phase 5C verifier", () => {
  test("runs sequentially without a shell and stops on the first nonzero exit", async () => {
    const { runPhase5cVerificationV1 } = await import("./verify-phase5c.mjs");
    let callCount = 0;
    const spawn = vi.fn<Phase5cSpawnV1>((_command, _args, _options) => ({
      signal: null,
      status: ++callCount === 6 ? 1 : 0,
    }));

    expect(() => runPhase5cVerificationV1("/repo/project-tavern", spawn)).toThrow(
      /pnpm verify:application-graphs failed/u,
    );
    expect(spawn).toHaveBeenCalledTimes(6);
    expect(spawn.mock.calls.map(([command, args]) => [command, args])).toEqual(
      expectedVerifyPhase5cCommandsV1.slice(0, 6),
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
    const { runPhase5cVerificationV1 } = await import("./verify-phase5c.mjs");
    expect(() =>
      runPhase5cVerificationV1("/repo/project-tavern", (() => ({
        signal: "SIGTERM",
        status: null,
      })) satisfies Phase5cSpawnV1),
    ).toThrow(/pnpm --filter @sillymaker\/base exec vitest run/u);
  });
});
