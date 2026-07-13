// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { stringify } from "yaml";

import {
  assertMaterializationWriterIsolationV1,
  computeMaterializationDigestV1,
  computePackageClosureDigestV1,
  createMaterializationContractV1,
  createNodeMaterializationContractIoV1,
  deriveExternalPackageClosureV1,
  materializationInputsV1,
  parseMaterializationContractV1,
  readMaterializationContractV1,
  serializeMaterializationContractV1,
  validateMaterializationContractV1,
  writeMaterializationContractV1,
} from "./materialization-contract.mjs";

const encoder = new TextEncoder();

function syntheticLock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lockfileVersion: "9.0",
    settings: { autoInstallPeers: true },
    importers: {
      ".": { dependencies: { alpha: { specifier: "1.0.0", version: "1.0.0" } } },
      "engine/packages/example": {
        dependencies: { alpha: { specifier: "1.0.0", version: "1.0.0" } },
      },
    },
    packages: {
      "alpha@1.0.0": {
        resolution: { integrity: "sha512-alpha" },
        engines: { node: ">=22" },
      },
      "beta@2.0.0": { resolution: { integrity: "sha512-beta" } },
    },
    snapshots: {
      "alpha@1.0.0": { dependencies: { beta: "2.0.0" } },
      "beta@2.0.0": {},
    },
    ...overrides,
  };
}

function source(lock: Record<string, unknown>): string {
  return stringify(lock, { sortMapEntries: false });
}

describe("goal materialization contract", () => {
  it("ignores importer identity and source ordering while freezing complete package records", () => {
    const first = syntheticLock();
    const reordered = {
      snapshots: {
        "beta@2.0.0": {},
        "alpha@1.0.0": { dependencies: { beta: "2.0.0" } },
      },
      packages: {
        "beta@2.0.0": { resolution: { integrity: "sha512-beta" } },
        "alpha@1.0.0": {
          engines: { node: ">=22" },
          resolution: { integrity: "sha512-alpha" },
        },
      },
      importers: { renamed: {}, ".": {} },
      settings: { autoInstallPeers: true },
      lockfileVersion: "9.0",
    };

    const firstClosure = deriveExternalPackageClosureV1(source(first));
    const secondClosure = deriveExternalPackageClosureV1(source(reordered));
    expect(secondClosure).toEqual(firstClosure);
    expect(computePackageClosureDigestV1(secondClosure)).toBe(
      computePackageClosureDigestV1(firstClosure),
    );
    expect(computeMaterializationDigestV1(createMaterializationContractV1(source(reordered)))).toBe(
      computeMaterializationDigestV1(createMaterializationContractV1(source(first))),
    );
    expect(firstClosure[0]).toEqual({
      packageKey: "alpha@1.0.0",
      packageRecord: {
        engines: { node: ">=22" },
        resolution: { integrity: "sha512-alpha" },
      },
      snapshotRecords: [
        {
          snapshotKey: "alpha@1.0.0",
          snapshotRecord: { dependencies: { beta: "2.0.0" } },
        },
      ],
    });
  });

  it("changes digests for package, resolution, snapshot, and tool or browser changes", () => {
    const baseline = createMaterializationContractV1(source(syntheticLock()));
    const mutations = [
      syntheticLock({
        packages: {
          "alpha@1.0.1": { resolution: { integrity: "sha512-alpha" } },
          "beta@2.0.0": { resolution: { integrity: "sha512-beta" } },
        },
        snapshots: { "alpha@1.0.1": {}, "beta@2.0.0": {} },
      }),
      syntheticLock({
        packages: {
          "alpha@1.0.0": { resolution: { integrity: "sha512-changed" } },
          "beta@2.0.0": { resolution: { integrity: "sha512-beta" } },
        },
      }),
      syntheticLock({
        snapshots: {
          "alpha@1.0.0": { optionalDependencies: { beta: "2.0.0" } },
          "beta@2.0.0": {},
        },
      }),
    ];
    for (const mutation of mutations) {
      expect(
        computeMaterializationDigestV1(createMaterializationContractV1(source(mutation))),
      ).not.toBe(computeMaterializationDigestV1(baseline));
    }

    const toolMutations = [
      { ...baseline, pnpm: { version: "11.11.1" } },
      { ...baseline, playwright: { ...baseline.playwright, version: "1.61.2" } },
      {
        ...baseline,
        playwright: {
          ...baseline.playwright,
          browsers: {
            ...baseline.playwright.browsers,
            chromium: { revision: "1229" },
          },
        },
      },
      {
        ...baseline,
        playwright: {
          ...baseline.playwright,
          browsers: {
            ...baseline.playwright.browsers,
            webkit: { revision: "2312" },
          },
        },
      },
    ];
    for (const mutation of toolMutations) {
      expect(computeMaterializationDigestV1(mutation)).not.toBe(
        computeMaterializationDigestV1(baseline),
      );
    }
  });

  it("groups and sorts every peer snapshot variant under its package", () => {
    const lock = syntheticLock({
      packages: {
        "alpha@1.0.0": { resolution: { integrity: "sha512-alpha" } },
        "peer@2.0.0": { resolution: { integrity: "sha512-peer" } },
      },
      snapshots: {
        "alpha@1.0.0(peer@2.0.0)": { dependencies: { peer: "2.0.0" } },
        "peer@2.0.0": {},
        "alpha@1.0.0(peer@1.0.0)": { dependencies: { peer: "1.0.0" } },
      },
    });
    expect(deriveExternalPackageClosureV1(source(lock))[0]?.snapshotRecords).toEqual([
      {
        snapshotKey: "alpha@1.0.0(peer@1.0.0)",
        snapshotRecord: { dependencies: { peer: "1.0.0" } },
      },
      {
        snapshotKey: "alpha@1.0.0(peer@2.0.0)",
        snapshotRecord: { dependencies: { peer: "2.0.0" } },
      },
    ]);
  });

  it("rejects duplicate, missing, orphaned, and local package records", () => {
    const failures = [
      "lockfileVersion: '9.0'\npackages:\n  alpha@1.0.0: {}\n  alpha@1.0.0: {}\nsnapshots:\n  alpha@1.0.0: {}\n",
      source(syntheticLock({ packages: undefined })),
      source(syntheticLock({ snapshots: undefined })),
      source(syntheticLock({ snapshots: { "orphan@1.0.0": {} } })),
      source(syntheticLock({ snapshots: { "beta@2.0.0": {} } })),
      source(
        syntheticLock({
          packages: {
            "alpha@1.0.0": { resolution: { tarball: "file:../alpha.tgz" } },
            "beta@2.0.0": { resolution: { integrity: "sha512-beta" } },
          },
        }),
      ),
    ];
    for (const failure of failures) {
      expect(() => deriveExternalPackageClosureV1(failure)).toThrow();
    }
  });

  it("strictly round-trips one canonical contract and rejects invalid tracked JSON", () => {
    const contract = createMaterializationContractV1(source(syntheticLock()));
    const bytes = serializeMaterializationContractV1(contract);
    const parsed = parseMaterializationContractV1(bytes);
    expect(parsed).toEqual(contract);
    expect(serializeMaterializationContractV1(parsed)).toEqual(bytes);
    expect(new TextDecoder().decode(bytes)).toMatch(/^\{\n  "externalPackages":/u);
    expect(new TextDecoder().decode(bytes).endsWith("\n")).toBe(true);

    const packageEntry = contract.externalPackages[0];
    expect(packageEntry).toBeDefined();
    expect(() =>
      validateMaterializationContractV1({
        ...contract,
        externalPackages: [packageEntry, packageEntry],
      }),
    ).toThrow();
    expect(() =>
      validateMaterializationContractV1({
        ...contract,
        externalPackages: [{ ...packageEntry, snapshotRecords: [] }],
      }),
    ).toThrow();
    expect(() =>
      validateMaterializationContractV1({
        ...contract,
        externalPackages: [
          {
            ...packageEntry,
            packageRecord: {
              ...packageEntry?.packageRecord,
              [String.fromCharCode(0xd800)]: "invalid key",
            },
          },
        ],
      }),
    ).toThrow();

    const invalidJson = [
      '{"schemaRevision":1,"schemaRevision":1}\n',
      "\uFEFF{}\n",
      "{/* comment */}\n",
      '{"schemaRevision":1,}\n',
      '{"__proto__":{}}\n',
      '{"schemaRevision":1.5}\n',
      '{"schemaRevision":9007199254740992}\n',
      '{"schemaRevision":-0}\n',
      '{"schemaRevision":"\\ud800"}\n',
    ];
    for (const invalid of invalidJson) {
      expect(() => parseMaterializationContractV1(encoder.encode(invalid))).toThrow();
    }
  });

  it("writes atomically, stays byte-identical, and never replaces an accepted file on failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "tavern-materialization-contract-"));
    try {
      await mkdir(resolve(root, "scripts/preflight"), { recursive: true });
      await writeFile(resolve(root, "pnpm-lock.yaml"), source(syntheticLock()));

      await writeMaterializationContractV1(root);
      const target = resolve(root, "scripts/preflight/materialization-lock.json");
      const first = await readFile(target);
      await writeMaterializationContractV1(root);
      expect(await readFile(target)).toEqual(first);

      const accepted = Buffer.from("accepted sentinel\n");
      await writeFile(target, accepted);
      const nodeIo = createNodeMaterializationContractIoV1();
      const corruptingIo = {
        ...nodeIo,
        readFile: async (path: string) =>
          path.includes(".candidate-") ? encoder.encode("{}\n") : nodeIo.readFile(path),
      };
      await expect(writeMaterializationContractV1(root, corruptingIo)).rejects.toThrow();
      expect(await readFile(target)).toEqual(accepted);

      const interruptedIo = {
        ...nodeIo,
        rename: async () => {
          throw new Error("simulated rename interruption");
        },
      };
      await expect(writeMaterializationContractV1(root, interruptedIo)).rejects.toThrow(
        "simulated rename interruption",
      );
      expect(await readFile(target)).toEqual(accepted);
      expect((await readdir(resolve(root, "scripts/preflight"))).sort()).toEqual([
        "materialization-lock.json",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the reader side-effect free and isolates the explicit writer mapping", async () => {
    const root = await mkdtemp(join(tmpdir(), "tavern-materialization-reader-"));
    try {
      await mkdir(resolve(root, "scripts/preflight"), { recursive: true });
      await writeFile(resolve(root, "pnpm-lock.yaml"), source(syntheticLock()));
      await writeMaterializationContractV1(root);

      const nodeIo = createNodeMaterializationContractIoV1();
      let mutationCalls = 0;
      const readOnlyIo = {
        ...nodeIo,
        openExclusive: async () => {
          mutationCalls += 1;
          throw new Error("reader opened a writer");
        },
        rename: async () => {
          mutationCalls += 1;
          throw new Error("reader renamed a file");
        },
        remove: async () => {
          mutationCalls += 1;
        },
        syncDirectory: async () => {
          mutationCalls += 1;
        },
      };
      const result = await readMaterializationContractV1(root, readOnlyIo);
      expect(result.contract).toEqual(createMaterializationContractV1(source(syntheticLock())));
      expect(result.packageClosureDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(result.materializationDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(mutationCalls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }

    const packageJson = JSON.parse(
      await readFile(resolve(import.meta.dirname, "../../package.json"), "utf8"),
    ) as { scripts?: unknown };
    expect(() => assertMaterializationWriterIsolationV1(packageJson.scripts)).not.toThrow();
    expect((packageJson.scripts as Record<string, string>)["update:materialization-lock"]).toBe(
      "node --experimental-strip-types scripts/preflight/materialization-contract.mts --write",
    );
    expect(() =>
      assertMaterializationWriterIsolationV1({
        "update:materialization-lock":
          "node --experimental-strip-types scripts/preflight/materialization-contract.mts --write",
        verify: "pnpm update:materialization-lock",
      }),
    ).toThrow();
  });

  it("freezes the exact approved tool identifiers", () => {
    expect(materializationInputsV1).toEqual({
      pnpmVersion: "11.11.0",
      playwrightVersion: "1.61.1",
      chromiumRevision: "1228",
      webkitRevision: "2311",
    });
  });
});
