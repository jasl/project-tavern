// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { createDebugUiContextSchemaV1, digestCanonical } from "@sillymaker/base";
import type { DebugUiContextV1 } from "@sillymaker/base";
import {
  createGameSessionV1,
  decodeDebugBundleV1,
  encodeDebugBundleV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type { GameSessionDebugInputV1 } from "@sillymaker/base/runtime";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { describe, expect, expectTypeOf, it } from "vitest";

import { pocStoryEntryV1 } from "../story-definition.js";
import {
  pocGameCommandSchemaV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
} from "../gameplay/index.js";
import {
  createPocRuntimeTestFixtureV1,
  validSetMoodDebugCommandV1,
} from "../testing/poc-runtime-test-fixture.js";
import {
  createPocDebugBundleCodecV1,
  createPocReplayInputV1,
  createPocUnexpectedFaultAttemptV1,
  createPocUnexpectedFaultV1,
  type PocDebugAnchorResultV1,
  type PocDebugBundleV1,
  type PocDebugCommandResultV1,
} from "./poc-debug-bundle.js";

const appBuildIdV1 = digestCanonical("sillymaker:application:v1", ["poc-debug-bundle-test"]);
const otherAppBuildIdV1 = digestCanonical("sillymaker:application:v1", [
  "poc-debug-bundle-test-other",
]);
const debugUiContextSchemaV1 = createDebugUiContextSchemaV1();

function debugUiContextFixtureV1(
  variantId:
    | "stage_variant.poc.tavern.day"
    | "stage_variant.poc.tavern.evening" = "stage_variant.poc.tavern.day",
): DebugUiContextV1 {
  return debugUiContextSchemaV1.parse({
    revision: 1,
    presentation: Object.freeze({
      presentationRevision: 7,
      stageSceneId: "stage_scene.poc.tavern",
      variantId,
      stageRendererId: "renderer.poc.stage.tavern",
      renderers: Object.freeze([
        Object.freeze({
          rendererId: "renderer.poc.character.layered",
          characterId: "character.poc.heroine",
          rigId: "rig.poc.heroine.default",
          poseId: "pose.poc.heroine.idle",
          expressionId: "expression.poc.heroine.neutral",
          appearanceLayerIds: Object.freeze(["appearance_layer.poc.heroine.costume_body"]),
        }),
      ]),
      visibleInteractionSurfaceIds: Object.freeze(["surface.poc.tavern", "surface.poc.heroine"]),
      activeInteractionSurfaceId: "surface.poc.heroine",
      contentPolicyRevision: 1,
      allowedContentFlags: 0,
    }),
    session: Object.freeze({
      routeId: "play",
      primaryOverlayId: null,
      detailOverlayIds: Object.freeze([]),
      narrativeOpen: false,
      systemDialogOpen: false,
      devDock: Object.freeze({ leftOpen: false, rightOpen: false }),
    }),
  });
}

async function productionBundleFixtureV1(): Promise<PocDebugBundleV1> {
  const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
  await expect(
    fixture.application.debugTools.executeDebugCommand(validSetMoodDebugCommandV1()),
  ).resolves.toMatchObject({ kind: "committed" });
  const source = await fixture.exportDebugBundleForTest();

  return createPocDebugBundleCodecV1().bundleSchema.parse({
    ...source,
    appBuildId: appBuildIdV1,
    diagnostics: {
      invariantCodes: [],
      recentErrorCodes: [],
      hmrInvalidated: false,
    },
  });
}

describe("PoC production DebugBundle helpers", () => {
  it("keeps generic capability state outside Story-owned allowed results", () => {
    expectTypeOf<
      Extract<PocDebugCommandResultV1, { readonly kind: "capability_disabled" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<PocDebugAnchorResultV1, { readonly kind: "capability_disabled" }>
    >().toEqualTypeOf<never>();
  });

  it("round-trips the concrete bounded UI context while preserving legacy omission", async () => {
    const codec = createPocDebugBundleCodecV1();
    const legacyBundle = await productionBundleFixtureV1();
    expect(legacyBundle).not.toHaveProperty("uiContext");
    expect(codec.bundleSchema.parse(legacyBundle)).not.toHaveProperty("uiContext");

    const withUiContext = codec.bundleSchema.parse({
      ...legacyBundle,
      uiContext: debugUiContextFixtureV1(),
    });
    const decoded = decodeDebugBundleV1(encodeDebugBundleV1(withUiContext, codec), codec);

    expect(decoded).toEqual({ kind: "decoded", bundle: withUiContext });
    if (decoded.kind !== "decoded") throw new TypeError("missing decoded PoC UI context");
    expect(decoded.bundle.uiContext).toEqual(debugUiContextFixtureV1());
    expect(Object.isFrozen(decoded.bundle.uiContext)).toBe(true);
  });

  it("round-trips the strict envelope and rejects broken CommandLog continuity", async () => {
    const codec = createPocDebugBundleCodecV1();
    const bundle = await productionBundleFixtureV1();
    const bytes = encodeDebugBundleV1(bundle, codec);
    const decoded = decodeDebugBundleV1(bytes, codec);

    expect(decoded).toEqual({ kind: "decoded", bundle });
    if (decoded.kind !== "decoded") throw new TypeError("missing decoded PoC DebugBundle");
    expect(encodeDebugBundleV1(codec.bundleSchema.parse(decoded.bundle), codec)).toEqual(bytes);

    const firstEntry = bundle.commandLog[0];
    if (firstEntry === undefined) throw new TypeError("missing PoC DebugBundle command entry");
    const brokenContinuity = Object.freeze({
      ...bundle,
      commandLog: Object.freeze([
        Object.freeze({
          ...firstEntry,
          preStateDigest: digestCanonical("sillymaker:state:v1", ["broken-continuity"]),
        }),
        ...bundle.commandLog.slice(1),
      ]),
    }) as PocDebugBundleV1;

    expect(() => codec.validateEnvelope(brokenContinuity)).toThrow(/continuity/iu);
    expect(() => encodeDebugBundleV1(brokenContinuity, codec)).toThrow(
      /envelope\.schema_invalid/iu,
    );
  });

  it("uses the required runtime appBuildId for exact replay visual identity", async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const bundle = await productionBundleFixtureV1();

    const exactInput = createPocReplayInputV1(resolved, bundle, appBuildIdV1);
    expect(exactInput.recordedIdentity).toEqual({
      provenance: bundle.provenance,
      appBuildId: appBuildIdV1,
    });
    expect(exactInput.runtimeIdentity).toEqual({
      provenance: resolved.provenance,
      appBuildId: appBuildIdV1,
    });
    await expect(replayAuthoritativelyV1(exactInput)).resolves.toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 1,
      mismatches: [],
    });

    const differentBuildInput = createPocReplayInputV1(resolved, bundle, otherAppBuildIdV1);
    expect(differentBuildInput.runtimeIdentity.appBuildId).toBe(otherAppBuildIdV1);
    await expect(replayAuthoritativelyV1(differentBuildInput)).resolves.toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 1,
      mismatches: [],
    });

    const { appBuildId: _historicalAppBuildId, ...historicalBundleFields } = bundle;
    const historicalBundle = Object.freeze(historicalBundleFields) as PocDebugBundleV1;
    const historicalInput = createPocReplayInputV1(resolved, historicalBundle, appBuildIdV1);
    expect(historicalInput.recordedIdentity).toEqual({ provenance: bundle.provenance });
    expect(historicalInput.runtimeIdentity.appBuildId).toBe(appBuildIdV1);
    await expect(replayAuthoritativelyV1(historicalInput)).resolves.toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
    });
  });

  it("settles gameplay and Debug FIFO attempts when a hostile thrown value rejects inspection", async () => {
    const hostileThrownValue = new Proxy(Object.create(null) as object, {
      getPrototypeOf() {
        throw new TypeError("hostile prototype inspection");
      },
    });
    const initialSnapshot = (await productionBundleFixtureV1()).replayBase;
    const createFaultingSessionV1 = () =>
      createGameSessionV1<PocGameSimulationTypesV1>({
        initialSnapshot: initialSnapshot as PocGameSnapshotV1,
        commandSchema: pocGameCommandSchemaV1,
        executionContext: undefined,
        executeAttempt() {
          throw hostileThrownValue;
        },
        normalizeUnexpectedDispatchFault: createPocUnexpectedFaultAttemptV1,
        debug: Object.freeze({
          validate: () => Object.freeze({ kind: "allowed" as const }),
          executeAttempt() {
            throw hostileThrownValue;
          },
          normalizeUnexpectedFault: createPocUnexpectedFaultAttemptV1,
        } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>),
      });

    const gameplay = createFaultingSessionV1();
    await expect(
      gameplay.session.dispatch(pocGameCommandSchemaV1.parse({ kind: "run.start" })),
    ).resolves.toMatchObject({
      kind: "executed",
      execution: {
        kind: "faulted",
        fault: { code: "command.handler_threw", message: "unexpected PoC runtime failure" },
      },
    });

    const debug = createFaultingSessionV1();
    await expect(
      debug.debugControl.execute(validSetMoodDebugCommandV1(), () => true),
    ).resolves.toMatchObject({
      kind: "executed",
      attempt: {
        result: {
          kind: "faulted",
          fault: { code: "command.handler_threw", message: "unexpected PoC runtime failure" },
        },
      },
    });

    let getterCalls = 0;
    const accessorError = Object.create(Error.prototype) as Error;
    Object.defineProperties(accessorError, {
      message: {
        get() {
          getterCalls += 1;
          throw new TypeError("hostile message getter");
        },
      },
      stack: {
        get() {
          getterCalls += 1;
          throw new TypeError("hostile stack getter");
        },
      },
    });
    expect(createPocUnexpectedFaultV1(accessorError)).toMatchObject({
      code: "command.handler_threw",
      message: "unexpected PoC runtime failure",
    });
    expect(createPocUnexpectedFaultV1(accessorError)).not.toHaveProperty("stack");
    expect(getterCalls).toBe(0);
  });
});
