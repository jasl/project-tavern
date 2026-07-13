// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "../contracts/digest.js";
import { parseTextCatalogSetV1 } from "../contracts/presentation.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";
import {
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
} from "./patch-surface.js";
import { resolveHotfixesV1 } from "./hotfix-resolver.js";

const emptySimulationSurface = defineSimulationPatchSurface({});
const emptyPresentationSurface = definePresentationPatchSurface({});

describe("Hotfix resolution", () => {
  it("accepts a complete canonical TextCatalogSetV1 object in a text slot", () => {
    const sourceDigest = digestBytes(new TextEncoder().encode("default-catalogs"));
    const before = parseTextCatalogSetV1({
      defaultLocale: "zh-CN",
      catalogs: [
        {
          locale: "zh-CN",
          fallbackLocale: null,
          entries: [{ textId: "text.synthetic.title", text: "之前" }],
        },
      ],
    });
    const after = parseTextCatalogSetV1({
      defaultLocale: "zh-CN",
      catalogs: [
        {
          locale: "zh-CN",
          fallbackLocale: null,
          entries: [{ textId: "text.synthetic.title", text: "之后" }],
        },
      ],
    });
    const surface = definePresentationPatchSurface({
      catalogs: definePatchSlot({
        symbolId: "text.catalogs",
        kind: "text",
        contractRevision: parsePositiveSafeInteger(1),
        defaultProviderSourceDigest: sourceDigest,
        defaultValue: before,
      }),
    });

    const resolved = resolveHotfixesV1(
      emptySimulationSurface,
      surface,
      [
        {
          manifest: {
            identity: { id: "hotfix.catalogs", revision: parsePositiveSafeInteger(1) },
            targetStoryId: "story.synthetic-counter",
            targetStoryRevision: parsePositiveSafeInteger(1),
            targets: [
              {
                surface: "presentation" as const,
                symbolId: "text.catalogs",
                expectedProviderDigest: sourceDigest,
              },
            ],
            requires: [],
            conflicts: [],
            supersedes: [],
          },
          sourceDigest: digestBytes(new TextEncoder().encode("catalog-hotfix")),
          install(context) {
            context.presentation.replace("text.catalogs", after);
          },
        },
      ],
      { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
    );

    expect(resolved.presentationValues.catalogs).toBe(after);
  });

  it("keeps presentation replacement out of simulation PatchSet identity", () => {
    const sourceDigest = digestBytes(new TextEncoder().encode("default"));
    const surface = definePresentationPatchSurface({
      title: definePatchSlot({
        symbolId: "text.title",
        kind: "text",
        contractRevision: parsePositiveSafeInteger(1),
        defaultProviderSourceDigest: sourceDigest,
        defaultValue: "Before",
      }),
    });
    const base = resolveHotfixesV1(emptySimulationSurface, surface, [], {
      id: "story.synthetic-counter",
      revision: parsePositiveSafeInteger(1),
    });
    const patched = resolveHotfixesV1(
      emptySimulationSurface,
      surface,
      [
        {
          manifest: {
            identity: { id: "hotfix.title", revision: parsePositiveSafeInteger(1) },
            targetStoryId: "story.synthetic-counter",
            targetStoryRevision: parsePositiveSafeInteger(1),
            targets: [
              {
                surface: "presentation" as const,
                symbolId: "text.title",
                expectedProviderDigest: sourceDigest,
              },
            ],
            requires: [],
            conflicts: [],
            supersedes: [],
          },
          sourceDigest: digestBytes(new TextEncoder().encode("hotfix")),
          install(context: { presentation: { replace(symbolId: string, value: unknown): void } }) {
            context.presentation.replace("text.title", "After");
          },
        },
      ],
      { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
    );
    expect(patched.patchSet.simulationDigest).toBe(base.patchSet.simulationDigest);
    expect(patched.patchSet.presentationDigest).not.toBe(base.patchSet.presentationDigest);
    expect(patched.presentationValues.title).toBe("After");
  });

  it("revokes captured replacement ports when installation returns", () => {
    const sourceDigest = digestBytes(new TextEncoder().encode("default"));
    const surface = definePresentationPatchSurface({
      title: definePatchSlot({
        symbolId: "text.title",
        kind: "text",
        contractRevision: parsePositiveSafeInteger(1),
        defaultProviderSourceDigest: sourceDigest,
        defaultValue: "Before",
      }),
    });
    let captured: { replace(symbolId: string, value: unknown): void } | null = null;
    const resolved = resolveHotfixesV1(
      emptySimulationSurface,
      surface,
      [
        {
          manifest: {
            identity: { id: "hotfix.title", revision: parsePositiveSafeInteger(1) },
            targetStoryId: "story.synthetic-counter",
            targetStoryRevision: parsePositiveSafeInteger(1),
            targets: [
              {
                surface: "presentation" as const,
                symbolId: "text.title",
                expectedProviderDigest: sourceDigest,
              },
            ],
            requires: [],
            conflicts: [],
            supersedes: [],
          },
          sourceDigest: digestBytes(new TextEncoder().encode("hotfix")),
          install(context) {
            captured = context.presentation;
            context.presentation.replace("text.title", "After");
          },
        },
      ],
      { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
    );
    expect(resolved.presentationValues.title).toBe("After");
    expect(captured).not.toBeNull();
    expect(() => captured?.replace("text.title", "Too late")).toThrow(
      "Hotfix replacement port is revoked",
    );
    expect(resolved.presentationValues.title).toBe("After");
  });

  it("normalizes an install throw and revokes captured replacement ports", () => {
    let captured: { replace(symbolId: string, value: unknown): void } | null = null;
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        emptyPresentationSurface,
        [
          {
            manifest: {
              identity: { id: "hotfix.throwing", revision: parsePositiveSafeInteger(1) },
              targetStoryId: "story.synthetic-counter",
              targetStoryRevision: parsePositiveSafeInteger(1),
              targets: [],
              requires: [],
              conflicts: [],
              supersedes: [],
            },
            sourceDigest: digestBytes(new TextEncoder().encode("throwing")),
            install(context) {
              captured = context.presentation;
              throw new TypeError("untrusted install detail");
            },
          },
        ],
        { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.install_threw" }));
    expect(captured).not.toBeNull();
    expect(() => captured?.replace("text.title", "Too late")).toThrow(
      "Hotfix replacement port is revoked",
    );
  });

  it("distinguishes a missing requirement from one supplied out of order", () => {
    const createHotfix = (id: string, requires: readonly string[]) => ({
      manifest: {
        identity: { id, revision: parsePositiveSafeInteger(1) },
        targetStoryId: "story.synthetic-counter",
        targetStoryRevision: parsePositiveSafeInteger(1),
        targets: [],
        requires,
        conflicts: [],
        supersedes: [],
      },
      sourceDigest: digestBytes(new TextEncoder().encode(id)),
      install() {},
    });
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        emptyPresentationSurface,
        [createHotfix("hotfix.first", ["hotfix.second"]), createHotfix("hotfix.second", [])],
        { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.requires_order" }));
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        emptyPresentationSurface,
        [createHotfix("hotfix.first", ["hotfix.absent"])],
        {
          id: "story.synthetic-counter",
          revision: parsePositiveSafeInteger(1),
        },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.requires_missing" }));
  });

  it("rejects conflicts against later entries", () => {
    const createHotfix = (id: string, conflicts: readonly string[]) => ({
      manifest: {
        identity: { id, revision: parsePositiveSafeInteger(1) },
        targetStoryId: "story.synthetic-counter",
        targetStoryRevision: parsePositiveSafeInteger(1),
        targets: [],
        requires: [],
        conflicts,
        supersedes: [],
      },
      sourceDigest: digestBytes(new TextEncoder().encode(id)),
      install() {},
    });
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        emptyPresentationSurface,
        [createHotfix("hotfix.first", ["hotfix.second"]), createHotfix("hotfix.second", [])],
        { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.conflict" }));
  });

  it("rejects duplicate manifest targets", () => {
    const sourceDigest = digestBytes(new TextEncoder().encode("default"));
    const surface = definePresentationPatchSurface({
      title: definePatchSlot({
        symbolId: "text.title",
        kind: "text",
        contractRevision: parsePositiveSafeInteger(1),
        defaultProviderSourceDigest: sourceDigest,
        defaultValue: "Before",
      }),
    });
    const target = {
      surface: "presentation" as const,
      symbolId: "text.title",
      expectedProviderDigest: sourceDigest,
    };
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        surface,
        [
          {
            manifest: {
              identity: { id: "hotfix.duplicate-target", revision: parsePositiveSafeInteger(1) },
              targetStoryId: "story.synthetic-counter",
              targetStoryRevision: parsePositiveSafeInteger(1),
              targets: [target, target],
              requires: [],
              conflicts: [],
              supersedes: [],
            },
            sourceDigest: digestBytes(new TextEncoder().encode("duplicate-target")),
            install(context) {
              context.presentation.replace("text.title", "After");
            },
          },
        ],
        { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.output_invalid" }));
  });

  it("does not trust a user-thrown Hotfix error code", () => {
    expect(() =>
      resolveHotfixesV1(
        emptySimulationSurface,
        emptyPresentationSurface,
        [
          {
            manifest: {
              identity: { id: "hotfix.spoofed", revision: parsePositiveSafeInteger(1) },
              targetStoryId: "story.synthetic-counter",
              targetStoryRevision: parsePositiveSafeInteger(1),
              targets: [],
              requires: [],
              conflicts: [],
              supersedes: [],
            },
            sourceDigest: digestBytes(new TextEncoder().encode("spoofed")),
            install() {
              throw { code: "hotfix.conflict", message: "spoofed" };
            },
          },
        ],
        { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
      ),
    ).toThrowError(expect.objectContaining({ code: "hotfix.install_threw" }));
  });
});
