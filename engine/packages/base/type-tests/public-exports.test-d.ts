// SPDX-License-Identifier: MIT
import type { GameSnapshotEnvelopeV1, ModuleId, StateSlotId } from "@sillymaker/base";
import { parseModuleId, parseStateSlotId } from "@sillymaker/base";

export declare const publicSnapshot: GameSnapshotEnvelopeV1<unknown, unknown>;
export const publicModuleId: ModuleId = parseModuleId("synthetic.parity");
export const publicStateSlotId: StateSlotId = parseStateSlotId("simulation.counter");

// @ts-expect-error package internals are intentionally not exported
export type ForbiddenDeepImport = typeof import("@sillymaker/base/src/contracts/snapshot.js");
