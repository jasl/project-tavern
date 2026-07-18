// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

interface Phase5cSpawnResultV1 {
  readonly signal: string | null;
  readonly status: number | null;
}

type Phase5cSpawnV1 = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly shell: false;
    readonly stdio: "inherit";
  },
) => Phase5cSpawnResultV1;

export const verifyPhase5cCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/base",
    "exec",
    "vitest",
    "run",
    "src/contracts/diagnostics.test.ts",
    "src/runtime/diagnostics/debug-bundle.test.ts",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/ui",
    "exec",
    "vitest",
    "run",
    "src/debug",
    "src/diagnostics",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/web",
    "exec",
    "vitest",
    "run",
    "src/capabilities",
    "src/automation",
    "src/application/create-game-runtime.test.ts",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@project-tavern/story-poc",
    "exec",
    "vitest",
    "run",
    "src/tooling",
    "src/tooling-ui",
    "src/application/create-poc-presentation-runtime.test.ts",
    "src/application/install-poc-hmr.integration.test.ts",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@project-tavern/story-e2e",
    "exec",
    "vitest",
    "run",
    "src/tooling",
    "src/tooling-ui",
    "src/application",
  ]),
  frozenCommandV1("pnpm", ["verify:application-graphs"]),
  frozenCommandV1("pnpm", [
    "test:e2e:ui",
    "--project=chromium",
    "--grep",
    "@phase5c",
    "--grep-invert",
    "@visual",
  ]),
  frozenCommandV1("pnpm", [
    "test:e2e:ui",
    "--project=chromium-touch",
    "--grep",
    "@phase5c",
    "--grep-invert",
    "@visual",
  ]),
  frozenCommandV1("pnpm", [
    "test:e2e:ui",
    "--project=webkit",
    "--grep",
    "@phase5c",
    "--grep-invert",
    "@visual",
  ]),
  frozenCommandV1("pnpm", ["verify:ui-visual"]),
]);

export function runPhase5cVerificationV1(root: string, spawn: Phase5cSpawnV1 = spawnSync): void {
  for (const [command, args] of verifyPhase5cCommandsV1) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0 || result.signal !== null) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runPhase5cVerificationV1(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
}
