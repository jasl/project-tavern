// SPDX-License-Identifier: MIT
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  canonicalJsonBytes,
  combineContentMaturityFlagsV1,
  emptyContentMaturityFlagsV1,
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagsV1,
  parseContentMaturityPolicyV1,
  parseNonNegativeSafeInteger,
  parseStrictJson,
  parseStrictJsonLimitsV1,
  parseStoryId,
} from "@sillymaker/base";
import type {
  ContentMaturityFlagsV1,
  ContentMaturityPolicyV1,
  HostAtomicRecordStoreV1,
  HostStoredRecordV1,
  StoryId,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { describe, expect, it, vi } from "vitest";

import { createWebContentPreferencePortV1 } from "./content-preference-store.js";

type HostRecordKeyV1 = Parameters<HostAtomicRecordStoreV1["read"]>[1];
type HostRecordRevisionV1 = HostStoredRecordV1["revision"];

const preferenceJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 512,
  maxDepth: 2,
  maxArrayItems: 1,
  maxObjectMembers: 5,
  maxNodes: 6,
  maxStringBytes: 96,
});

function createNeutralPolicyV1(policyRevision: number): ContentMaturityPolicyV1 {
  return parseContentMaturityPolicyV1({
    policyRevision,
    flags: [
      {
        id: "content.alpha",
        flag: 1,
        nameTextId: "text.content.alpha.name",
        descriptionTextId: "text.content.alpha.description",
      },
      {
        id: "content.beta",
        flag: 2,
        nameTextId: "text.content.beta.name",
        descriptionTextId: "text.content.beta.description",
      },
    ],
    presets: [],
    defaultAllowedFlags: 0,
  });
}

const neutralTwoFlagPolicyV1 = createNeutralPolicyV1(1);
const neutralTwoFlagPolicyRevision2V1 = createNeutralPolicyV1(2);
const emptyFlagPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [],
  presets: [],
  defaultAllowedFlags: 0,
});
const highestBitPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [
    {
      id: "content.low",
      flag: 1,
      nameTextId: "text.content.low.name",
      descriptionTextId: "text.content.low.description",
    },
    {
      id: "content.high",
      flag: 0x8000_0000,
      nameTextId: "text.content.high.name",
      descriptionTextId: "text.content.high.description",
    },
  ],
  presets: [],
  defaultAllowedFlags: 0,
});

const e2eAlphaFlagV1 = neutralTwoFlagPolicyV1.flags[0]!.flag;
const e2eBetaFlagV1 = neutralTwoFlagPolicyV1.flags[1]!.flag;
const e2eBothFlagsV1 = combineContentMaturityFlagsV1(e2eAlphaFlagV1, e2eBetaFlagV1);
const e2eStoryIdV1 = parseStoryId("story.e2e");
const pocStoryIdV1 = parseStoryId("week.poc_001");

function contentPreferenceKeyV1(storyId: StoryId): HostRecordKeyV1 {
  return `content-maturity.v1:${storyId}` as HostRecordKeyV1;
}

function preferenceRecordValueV1(
  input: {
    readonly storyId?: string;
    readonly policyRevision?: number;
    readonly allowedFlags?: number;
  } = {},
) {
  return Object.freeze({
    contractRevision: 1,
    storyId: input.storyId ?? e2eStoryIdV1,
    policyRevision: input.policyRevision ?? 1,
    allowedFlags: input.allowedFlags ?? e2eBetaFlagV1,
  });
}

function cloneRecordV1(record: HostStoredRecordV1): HostStoredRecordV1 {
  return Object.freeze({ ...record, bytes: Uint8Array.from(record.bytes) });
}

type PreferenceRecordFixtureInputV1 =
  | { readonly key?: string; readonly value: unknown; readonly bytes?: never }
  | { readonly key?: string; readonly bytes: Uint8Array; readonly value?: never };

function createPreferenceRecordFixtureV1(
  input: PreferenceRecordFixtureInputV1,
): HostAtomicRecordStoreV1 {
  const key = (input.key ?? `content-maturity.v1:${e2eStoryIdV1}`) as HostRecordKeyV1;
  const bytes =
    input.bytes !== undefined ? Uint8Array.from(input.bytes) : canonicalJsonBytes(input.value);
  const record: HostStoredRecordV1 = Object.freeze({
    namespace: "settings",
    key,
    revision: parseNonNegativeSafeInteger(1),
    bytes,
  });
  return Object.freeze({
    async read(
      namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
      requestedKey: HostRecordKeyV1,
    ) {
      return namespace === record.namespace && requestedKey === record.key
        ? cloneRecordV1(record)
        : null;
    },
    async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      return namespace === record.namespace
        ? Object.freeze([cloneRecordV1(record)])
        : Object.freeze([]);
    },
    async commit() {
      throw new Error("unexpected bootstrap write");
    },
  });
}

function createInstrumentedRecordStoreV1(delegate = createMemoryHostRecordStoreV1()) {
  let commitCount = 0;
  let readCount = 0;
  const expectedRevisions: Array<HostRecordRevisionV1 | null> = [];
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    async read(namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0], key: HostRecordKeyV1) {
      readCount += 1;
      return await delegate.read(namespace, key);
    },
    list: delegate.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      commitCount += 1;
      expectedRevisions.push(mutations[0].expectedRevision);
      return await delegate.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    commits: () => commitCount,
    reads: () => readCount,
    expectedRevisions: () => Object.freeze([...expectedRevisions]),
  });
}

async function createE2ePreferencePortV1(
  records: HostAtomicRecordStoreV1,
  reportWarning: Parameters<typeof createWebContentPreferencePortV1>[0]["reportWarning"] = vi.fn(),
) {
  return await createWebContentPreferencePortV1({
    records,
    storyId: e2eStoryIdV1,
    policy: neutralTwoFlagPolicyV1,
    reportWarning,
  });
}

async function createPocPreferencePortV1(records: HostAtomicRecordStoreV1) {
  return await createWebContentPreferencePortV1({
    records,
    storyId: pocStoryIdV1,
    policy: emptyFlagPolicyV1,
    reportWarning: vi.fn(),
  });
}

async function createHighestBitPreferencePortV1(records: HostAtomicRecordStoreV1) {
  return await createWebContentPreferencePortV1({
    records,
    storyId: e2eStoryIdV1,
    policy: highestBitPolicyV1,
    reportWarning: vi.fn(),
  });
}

async function createE2ePreferenceFixtureV1() {
  const instrumented = createInstrumentedRecordStoreV1();
  const port = await createE2ePreferencePortV1(instrumented.records);
  return Object.freeze({ ...instrumented, port });
}

async function createNoFlagPreferenceFixtureV1() {
  const instrumented = createInstrumentedRecordStoreV1();
  const port = await createWebContentPreferencePortV1({
    records: instrumented.records,
    storyId: e2eStoryIdV1,
    policy: emptyFlagPolicyV1,
    reportWarning: vi.fn(),
  });
  return Object.freeze({ ...instrumented, port });
}

async function decodeStoredPreferenceRecordV1(
  records: HostAtomicRecordStoreV1,
  storyId: StoryId,
): Promise<unknown> {
  const record = await records.read("settings", contentPreferenceKeyV1(storyId));
  if (record === null) throw new TypeError("missing stored preference record");
  const decoded = parseStrictJson(record.bytes, preferenceJsonLimitsV1);
  if (!decoded.ok) throw new TypeError(`invalid stored preference record: ${decoded.error.code}`);
  expect(record.bytes).toEqual(canonicalJsonBytes(decoded.value));
  return decoded.value;
}

async function createRetryingPreferenceStorageFixtureV1() {
  const delegate = createMemoryHostRecordStoreV1();
  const key = contentPreferenceKeyV1(e2eStoryIdV1);
  const expectedRevisions: Array<HostRecordRevisionV1 | null> = [];
  let commitCount = 0;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: delegate.read,
    list: delegate.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      commitCount += 1;
      expectedRevisions.push(mutations[0].expectedRevision);
      if (commitCount === 1) {
        const seeded = await delegate.commit([
          Object.freeze({
            kind: "put" as const,
            namespace: "settings" as const,
            key,
            expectedRevision: null,
            bytes: canonicalJsonBytes(
              preferenceRecordValueV1({ allowedFlags: emptyContentMaturityFlagsV1 }),
            ),
          }),
        ]);
        if (seeded.kind !== "committed") throw new TypeError("failed to seed CAS conflict");
        return Object.freeze({
          kind: "conflict" as const,
          namespace: "settings" as const,
          key,
          actualRevision: parseNonNegativeSafeInteger(1),
        });
      }
      return await delegate.commit(mutations);
    },
  });
  const port = await createE2ePreferencePortV1(records);
  return Object.freeze({
    records,
    port,
    commits: () => commitCount,
    expectedRevisions: () => Object.freeze([...expectedRevisions]),
  });
}

async function createFailingPreferenceStorageFixtureV1(input: {
  readonly allowedFlags: ContentMaturityFlagsV1;
}) {
  let commitCount = 0;
  const listener = vi.fn();
  const key = contentPreferenceKeyV1(e2eStoryIdV1);
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    async read() {
      return null;
    },
    async list() {
      return Object.freeze([]);
    },
    async commit() {
      commitCount += 1;
      return Object.freeze({
        kind: "conflict" as const,
        namespace: "settings" as const,
        key,
        actualRevision: null,
      });
    },
  });
  const port = await createE2ePreferencePortV1(records);
  expect(port.observe()).toEqual({ allowedFlags: input.allowedFlags });
  port.subscribe(listener);
  return Object.freeze({ port, listener, commits: () => commitCount });
}

async function createThrowingStorageFixtureV1() {
  let commitCount = 0;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    async read() {
      return null;
    },
    async list() {
      return Object.freeze([]);
    },
    async commit() {
      commitCount += 1;
      throw new Error("storage offline");
    },
  });
  const port = await createE2ePreferencePortV1(records);
  return Object.freeze({ port, commits: () => commitCount });
}

async function createThrowingPreferenceSubscriberFixtureV1() {
  const records = createMemoryHostRecordStoreV1();
  const secondListener = vi.fn();
  const port = await createWebContentPreferencePortV1({
    records,
    storyId: e2eStoryIdV1,
    policy: neutralTwoFlagPolicyV1,
    reportWarning() {
      throw new Error("warning reporter");
    },
  });
  return Object.freeze({ records, port, secondListener });
}

const invalidStoredPreferenceCasesV1 = Object.freeze([
  Object.freeze({
    name: "non-canonical bytes",
    record: Object.freeze({
      bytes: new TextEncoder().encode(
        '{"contractRevision":1,"storyId":"story.e2e","policyRevision":1,"allowedFlags":2}',
      ),
    }),
    policy: neutralTwoFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.record_invalid",
      storyId: e2eStoryIdV1,
      reason: "non_canonical",
    }),
  }),
  Object.freeze({
    name: "extra field",
    record: Object.freeze({ value: { ...preferenceRecordValueV1(), extra: true } }),
    policy: neutralTwoFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.record_invalid",
      storyId: e2eStoryIdV1,
      reason: "shape",
    }),
  }),
  Object.freeze({
    name: "unsupported contract revision",
    record: Object.freeze({
      value: { ...preferenceRecordValueV1(), contractRevision: 2 },
    }),
    policy: neutralTwoFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.record_invalid",
      storyId: e2eStoryIdV1,
      reason: "contract_revision",
    }),
  }),
  Object.freeze({
    name: "foreign Story",
    record: Object.freeze({ value: preferenceRecordValueV1({ storyId: "story.other" }) }),
    policy: neutralTwoFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.story_mismatch",
      storyId: e2eStoryIdV1,
      storedStoryId: "story.other",
    }),
  }),
  Object.freeze({
    name: "non-uint32 mask",
    record: Object.freeze({ value: preferenceRecordValueV1({ allowedFlags: -1 }) }),
    policy: neutralTwoFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.record_invalid",
      storyId: e2eStoryIdV1,
      reason: "mask",
    }),
  }),
  Object.freeze({
    name: "unknown high bit",
    record: Object.freeze({ value: preferenceRecordValueV1({ allowedFlags: 0x8000_0000 }) }),
    policy: emptyFlagPolicyV1,
    warning: Object.freeze({
      code: "content_preference.unknown_flags",
      storyId: e2eStoryIdV1,
      storedAllowedFlags: 2_147_483_648,
      unknownFlags: 2_147_483_648,
    }),
  }),
] as const);

async function collectProductionImportsV1(directory: string): Promise<string> {
  const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
  const absoluteDirectory = resolve(repositoryRoot, directory);
  const collectFiles = async (currentDirectory: string): Promise<readonly string[]> => {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    const paths = await Promise.all(
      entries.map(async (entry): Promise<readonly string[]> => {
        const path = resolve(currentDirectory, entry.name);
        if (entry.isDirectory()) return await collectFiles(path);
        if (
          !entry.isFile() ||
          !entry.name.endsWith(".ts") ||
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".spec.ts") ||
          entry.name.endsWith(".test-d.ts")
        ) {
          return [];
        }
        return [path];
      }),
    );
    return paths.flat().toSorted();
  };
  const importPattern =
    /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["'][^"']+["']|import\s*\(\s*["'][^"']+["']\s*\)/gu;
  const imports = (
    await Promise.all(
      (await collectFiles(absoluteDirectory)).map(async (filename) => {
        const source = await readFile(filename, "utf8");
        return [...source.matchAll(importPattern)].map((match) => match[0]);
      }),
    )
  )
    .flat()
    .toSorted();
  return imports.join("\n");
}

describe("Web ContentPreferencePort", () => {
  it("uses the Story default without writing an absent record", async () => {
    const instrumented = createInstrumentedRecordStoreV1();
    const port = await createWebContentPreferencePortV1({
      records: instrumented.records,
      storyId: e2eStoryIdV1,
      policy: neutralTwoFlagPolicyV1,
      reportWarning: vi.fn(),
    });

    expect(port.observe()).toEqual({ allowedFlags: 0 });
    expect(Object.isFrozen(port.observe())).toBe(true);
    expect(await instrumented.records.list("settings")).toEqual([]);
    expect(instrumented.commits()).toBe(0);
  });

  it("persists and republishes an independent beta-only mask", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = await createE2ePreferencePortV1(records);
    const listener = vi.fn();
    first.subscribe(listener);

    await expect(first.set({ allowedFlags: e2eBetaFlagV1 })).resolves.toEqual({
      kind: "updated",
      preference: { allowedFlags: e2eBetaFlagV1 },
    });
    expect(first.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
    expect(listener).toHaveBeenCalledOnce();
    expect(await decodeStoredPreferenceRecordV1(records, e2eStoryIdV1)).toEqual({
      allowedFlags: 2,
      contractRevision: 1,
      policyRevision: 1,
      storyId: "story.e2e",
    });

    const second = await createE2ePreferencePortV1(records);
    expect(second.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
  });

  it("falls back after a policy revision change and reports one bounded warning", async () => {
    const records = createPreferenceRecordFixtureV1({
      value: preferenceRecordValueV1({ policyRevision: 1 }),
    });
    const reportWarning = vi.fn();
    const port = await createWebContentPreferencePortV1({
      records,
      storyId: e2eStoryIdV1,
      policy: neutralTwoFlagPolicyRevision2V1,
      reportWarning,
    });

    expect(port.observe()).toEqual({ allowedFlags: 0 });
    expect(reportWarning).toHaveBeenCalledTimes(1);
    expect(reportWarning).toHaveBeenCalledWith({
      code: "content_preference.policy_mismatch",
      storyId: e2eStoryIdV1,
      storedPolicyRevision: 1,
      activePolicyRevision: 2,
      storedAllowedFlags: e2eBetaFlagV1,
    });
  });

  it("rejects undeclared flags without opening Host storage", async () => {
    const fixture = await createNoFlagPreferenceFixtureV1();
    const undeclared = parseContentMaturityFlagsV1(0x8000_0000);

    await expect(fixture.port.set({ allowedFlags: undeclared })).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.unknown_flags",
    });
    expect(fixture.commits()).toBe(0);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
  });

  it.each([
    { allowedFlags: -1 },
    { allowedFlags: 1.5 },
    { allowedFlags: Number.NaN },
    { allowedFlags: 0x1_0000_0000 },
    { allowedFlags: 0, extra: true },
  ] as const)("rejects malformed runtime preference input before storage", async (runtimeInput) => {
    const fixture = await createE2ePreferenceFixtureV1();

    await expect(fixture.port.set(runtimeInput as never)).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.invalid_preference",
    });
    expect(fixture.commits()).toBe(0);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
  });

  it.each(invalidStoredPreferenceCasesV1)(
    "recovers $name to the Story default with one bounded warning",
    async ({ record, policy, warning }) => {
      const reportWarning = vi.fn();
      const port = await createWebContentPreferencePortV1({
        records: createPreferenceRecordFixtureV1(record),
        storyId: e2eStoryIdV1,
        policy,
        reportWarning,
      });

      expect(port.observe()).toEqual({ allowedFlags: policy.defaultAllowedFlags });
      expect(reportWarning).toHaveBeenCalledTimes(1);
      expect(reportWarning).toHaveBeenCalledWith(warning);
    },
  );

  it("round-trips bit 31 and a mixed mask as positive canonical uint32", async () => {
    const records = createMemoryHostRecordStoreV1();
    const high = parseContentMaturityFlagBitV1(0x8000_0000);
    const mixed = combineContentMaturityFlagsV1(high, parseContentMaturityFlagBitV1(1));
    const first = await createHighestBitPreferencePortV1(records);

    expect(high).toBe(2_147_483_648);
    expect(mixed).toBe(2_147_483_649);
    await expect(first.set({ allowedFlags: mixed })).resolves.toEqual({
      kind: "updated",
      preference: { allowedFlags: 2_147_483_649 },
    });
    const record = await records.read("settings", contentPreferenceKeyV1(e2eStoryIdV1));
    expect(new TextDecoder().decode(record?.bytes)).toBe(
      '{"allowedFlags":2147483649,"contractRevision":1,"policyRevision":1,"storyId":"story.e2e"}',
    );
    const second = await createHighestBitPreferencePortV1(records);
    expect(second.observe()).toEqual({ allowedFlags: 2_147_483_649 });
  });

  it("serializes concurrent writes against exact successive revisions", async () => {
    const fixture = await createE2ePreferenceFixtureV1();

    await expect(
      Promise.all([
        fixture.port.set({ allowedFlags: e2eAlphaFlagV1 }),
        fixture.port.set({ allowedFlags: e2eBetaFlagV1 }),
      ]),
    ).resolves.toMatchObject([{ kind: "updated" }, { kind: "updated" }]);
    expect(fixture.commits()).toBe(2);
    expect(fixture.expectedRevisions()).toEqual([null, 1]);
    expect(fixture.port.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
  });

  it("re-reads and retries once after an external CAS conflict", async () => {
    const fixture = await createRetryingPreferenceStorageFixtureV1();

    await expect(fixture.port.set({ allowedFlags: e2eAlphaFlagV1 })).resolves.toEqual({
      kind: "updated",
      preference: { allowedFlags: e2eAlphaFlagV1 },
    });
    expect(fixture.commits()).toBe(2);
    expect(fixture.expectedRevisions()).toEqual([null, 1]);
    expect(fixture.port.observe()).toEqual({ allowedFlags: e2eAlphaFlagV1 });
    expect(
      (await fixture.records.read("settings", contentPreferenceKeyV1(e2eStoryIdV1)))?.revision,
    ).toBe(2);
  });

  it("keeps the old snapshot after a repeated CAS failure", async () => {
    const fixture = await createFailingPreferenceStorageFixtureV1({
      allowedFlags: emptyContentMaturityFlagsV1,
    });

    await expect(fixture.port.set({ allowedFlags: e2eBothFlagsV1 })).resolves.toEqual({
      kind: "failed",
      code: "content_preference.storage_failed",
    });
    expect(fixture.commits()).toBe(2);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
    expect(fixture.listener).not.toHaveBeenCalled();
  });

  it("maps a Host exception to storage failure without publication", async () => {
    const fixture = await createThrowingStorageFixtureV1();

    await expect(fixture.port.set({ allowedFlags: e2eAlphaFlagV1 })).resolves.toEqual({
      kind: "failed",
      code: "content_preference.storage_failed",
    });
    expect(fixture.commits()).toBe(1);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
  });

  it("isolates records by Story and never exposes a runtime capability", async () => {
    const records = createMemoryHostRecordStoreV1();
    const e2e = await createE2ePreferencePortV1(records);
    const poc = await createPocPreferencePortV1(records);

    await e2e.set({ allowedFlags: e2eBetaFlagV1 });
    await poc.set({ allowedFlags: emptyContentMaturityFlagsV1 });
    expect(poc.observe()).toEqual({ allowedFlags: 0 });
    expect((await records.list("settings")).map((record) => record.key)).toEqual([
      "content-maturity.v1:story.e2e",
      "content-maturity.v1:week.poc_001",
    ]);
    expect(poc).not.toHaveProperty("setEnabled");
    expect(poc).not.toHaveProperty("capabilities");
  });

  it("keeps a committed preference when a subscriber and warning reporter throw", async () => {
    const fixture = await createThrowingPreferenceSubscriberFixtureV1();
    fixture.port.subscribe(() => {
      throw new Error("subscriber");
    });
    fixture.port.subscribe(fixture.secondListener);

    await expect(fixture.port.set({ allowedFlags: e2eAlphaFlagV1 })).resolves.toEqual({
      kind: "updated",
      preference: { allowedFlags: e2eAlphaFlagV1 },
    });
    expect(fixture.port.observe()).toEqual({ allowedFlags: e2eAlphaFlagV1 });
    expect(fixture.secondListener).toHaveBeenCalledOnce();
  });

  it("keeps the production preference closure outside Story, React, Snapshot, and capability APIs", async () => {
    const imports = await collectProductionImportsV1("engine/packages/web/src/preferences");
    expect(imports).toContain("@sillymaker/base");
    expect(imports).not.toMatch(/stories\/|react|GameSnapshot|RuntimeCapabilityPort/u);
  });
});
