// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import { digestCanonical } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { pocDebugCommandSchemaV1, type PocGameSnapshotV1 } from "../gameplay/index.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { pocFixtureIdsV1, pocStoryToolingEntryV1 } from "../tooling/index.js";
import type { PocGameApplicationPortV1 } from "./create-poc-game-application.js";
import { createPocGameRuntimeV1 } from "./create-poc-game-runtime.js";

const initialSeedV1 = 0x0002_3049;
const persistenceOwnerIdV1 = "00000000-0000-4000-8000-000000000091";
const initialRunIdV1 = "00000000-0000-4000-8000-000000000092";
const appBuildIdV1 = digestCanonical("sillymaker:application:v1", ["poc-runtime-test"]);

interface PocRuntimeBundleWitnessV1 {
  readonly appBuildId?: string;
  readonly currentSnapshot: PocGameSnapshotV1;
  readonly commandLog: readonly { readonly source: string }[];
  readonly failure?: {
    readonly command: {
      readonly source: string;
      readonly command: {
        readonly kind: string;
        readonly fixtureId: string;
        readonly seed: number;
      };
    };
    readonly fault: { readonly code: string; readonly message: string };
    readonly attemptedDraws: readonly unknown[];
  };
  readonly diagnostics: {
    readonly invariantCodes: readonly string[];
    readonly recentErrorCodes: readonly string[];
    readonly hmrInvalidated: boolean;
  };
}

function decodeJsonV1<T>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function existingSourcePathV1(rawPath: string): Promise<string | null> {
  const extension = extname(rawPath);
  const candidates =
    extension === ".js"
      ? [`${rawPath.slice(0, -3)}.ts`, `${rawPath.slice(0, -3)}.tsx`]
      : extension === ""
        ? [rawPath, `${rawPath}.ts`, `${rawPath}.tsx`, resolve(rawPath, "index.ts")]
        : [rawPath];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next NodeNext source candidate.
    }
  }
  return null;
}

async function collectProductionImportClosureV1(entry: string): Promise<string> {
  const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
  const queue = [resolve(repositoryRoot, entry)];
  const visited = new Set<string>();
  const output = new Set<string>();
  const staticPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
  const dynamicPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/gu;

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);
    output.add(file.slice(repositoryRoot.length + 1));
    const source = await readFile(file, "utf8");
    const specifiers = [
      ...[...source.matchAll(staticPattern)].map((match) => match[1]),
      ...[...source.matchAll(dynamicPattern)].map((match) => match[1]),
    ];
    for (const specifier of specifiers) {
      if (specifier === undefined) continue;
      output.add(specifier);
      if (!specifier.startsWith(".")) continue;
      const target = await existingSourcePathV1(resolve(dirname(file), specifier));
      if (target === null) throw new TypeError(`missing closure import: ${specifier}`);
      queue.push(target);
    }
  }

  return [...output].toSorted().join("\n");
}

describe("createPocGameRuntimeV1", () => {
  it("uses Host entropy for one unified six-port runtime and exports the required appBuildId", async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const application = await createPocGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [initialSeedV1],
        uuids: [persistenceOwnerIdV1, initialRunIdV1],
        now: () => "2026-07-17T05:00:00.000Z",
      }),
      appBuildId: appBuildIdV1,
    });

    expectTypeOf(application).toEqualTypeOf<PocGameApplicationPortV1>();
    expect(Object.keys(application).toSorted()).toEqual([
      "capabilities",
      "debugTools",
      "diagnostics",
      "lifecycle",
      "persistence",
      "semantic",
    ]);

    expect(application.semantic.observe()).toMatchObject({ status: "ready" });
    const initialBundle = decodeJsonV1<PocRuntimeBundleWitnessV1>(
      (await application.diagnostics.exportDebugBundle()).bytes,
    );
    expect(initialBundle.appBuildId).toBe(appBuildIdV1);
    expect(initialBundle.currentSnapshot.state.simulation.run).toMatchObject({
      runId: initialRunIdV1,
      initialSeed: initialSeedV1,
    });
    expect(initialBundle.diagnostics).toMatchObject({
      invariantCodes: [],
      recentErrorCodes: [],
      hmrInvalidated: false,
    });
  });

  it("keeps the production application closure free of testing and Base testkit imports", async () => {
    const closure = await collectProductionImportClosureV1(
      "game/stories/poc/src/application/create-poc-game-runtime.ts",
    );
    expect(closure).not.toMatch(/game\/stories\/poc\/src\/testing\/|@sillymaker\/base\/testkit/u);
  });

  it("keeps tooling lazy and exercises DebugTools, replay, persistence, and lifecycle on one Session", async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const replacementRunId = "00000000-0000-4000-8000-000000000093";
    const loadTooling = vi.fn(async (specifier: unknown) => {
      expect(specifier).toBe("@project-tavern/story-poc/tooling");
      return Object.freeze({ pocStoryToolingEntryV1 });
    });
    const application = await createPocGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [initialSeedV1, initialSeedV1 + 1],
        uuids: [persistenceOwnerIdV1, initialRunIdV1, replacementRunId],
        now: () => "2026-07-17T05:00:00.000Z",
      }),
      appBuildId: appBuildIdV1,
      loadTooling,
    });

    await expect(application.debugTools.listFixtures()).resolves.toEqual({
      kind: "capability_disabled",
    });
    expect(loadTooling).not.toHaveBeenCalled();

    await expect(application.capabilities.setEnabled("debug_tools", true)).resolves.toMatchObject({
      kind: "updated",
    });
    await expect(application.debugTools.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: pocFixtureIdsV1,
    });
    await expect(application.debugTools.listFixtures()).resolves.toMatchObject({ kind: "listed" });
    expect(loadTooling).toHaveBeenCalledTimes(1);

    await expect(application.capabilities.setEnabled("cheats", true)).resolves.toMatchObject({
      kind: "updated",
    });
    const debugCommand = pocDebugCommandSchemaV1.parse({
      kind: "debug.actor.set_mood",
      actorId: "actor.heroine",
      value: 1,
      reasonId: "reason.debug.state_override",
    });
    await expect(application.debugTools.executeDebugCommand(debugCommand)).resolves.toMatchObject({
      kind: "committed",
      commandSequence: 1,
    });

    const debugBundle = await application.diagnostics.exportDebugBundle();
    const debugBundleValue = decodeJsonV1<PocRuntimeBundleWitnessV1>(debugBundle.bytes);
    expect(debugBundleValue.commandLog).toEqual([expect.objectContaining({ source: "debug" })]);
    expect(debugBundleValue.currentSnapshot.integrity.mode).toBe("modified");
    await expect(application.debugTools.replayAuthoritatively(debugBundle.bytes)).resolves.toEqual({
      kind: "replayed",
      comparison: expect.objectContaining({
        authoritative: true,
        identityMatch: true,
        visualMatch: true,
        matches: true,
      }),
    });

    const save = await application.persistence.exportCurrentSave();
    await expect(application.persistence.importSave(save.bytes)).resolves.toMatchObject({
      kind: "imported",
      compatibility: "exact",
    });
    await expect(application.lifecycle.createNewSession()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    const replacement = decodeJsonV1<PocRuntimeBundleWitnessV1>(
      (await application.diagnostics.exportDebugBundle()).bytes,
    );
    expect(replacement.currentSnapshot.state.simulation.run).toMatchObject({
      runId: replacementRunId,
      initialSeed: initialSeedV1 + 1,
    });
    expect(replacement.currentSnapshot.integrity.mode).toBe("normal");
    expect(replacement.commandLog).toEqual([]);
  });

  it("rejects an invalid required appBuildId before creating runtime state", async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    await expect(
      createPocGameRuntimeV1({
        resolved,
        host: createWebHostV1({ records: createMemoryHostRecordStoreV1() }),
        appBuildId: "invalid-app-build-id" as never,
      }),
    ).rejects.toThrow(TypeError);
  });

  it("exports fixture-aware anchoring failure evidence after replay faults", async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const support = pocStoryToolingEntryV1.defineToolingSupport();
    const sourceFixture = support.fixtures[0];
    if (sourceFixture === undefined) throw new TypeError("missing PoC tooling fixture");
    const invalidFixture = Object.freeze({
      ...sourceFixture,
      commands: Object.freeze([Object.freeze({ kind: "invalid.fixture.command" }) as never]),
    });
    const faultingToolingEntry = Object.freeze({
      ...pocStoryToolingEntryV1,
      defineToolingSupport() {
        return Object.freeze({
          ...support,
          fixtures: Object.freeze([invalidFixture]),
        });
      },
    }) as typeof pocStoryToolingEntryV1;
    const application = await createPocGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [initialSeedV1],
        uuids: [persistenceOwnerIdV1, initialRunIdV1],
        now: () => "2026-07-17T05:00:00.000Z",
      }),
      appBuildId: appBuildIdV1,
      loadTooling: async () => Object.freeze({ pocStoryToolingEntryV1: faultingToolingEntry }),
    });
    await application.capabilities.setEnabled("debug_tools", true);
    await application.capabilities.setEnabled("cheats", true);

    await expect(
      application.debugTools.anchorFixture(sourceFixture.fixtureId),
    ).resolves.toMatchObject({ kind: "faulted", fault: { code: "command.handler_threw" } });
    const bundle = decodeJsonV1<PocRuntimeBundleWitnessV1>(
      (await application.diagnostics.exportDebugBundle()).bytes,
    );
    expect(bundle.failure).toEqual({
      command: {
        source: "debug_anchor",
        command: {
          kind: "debug.fixture.load",
          fixtureId: sourceFixture.fixtureId,
          seed: sourceFixture.seed,
        },
      },
      fault: expect.objectContaining({
        code: "command.handler_threw",
        message: expect.stringContaining("invalid.fixture.command"),
      }),
      attemptedDraws: [],
    });
  });
});
