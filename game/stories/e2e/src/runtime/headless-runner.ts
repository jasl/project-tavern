// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly } from "@sillymaker/base";

import type { E2eGameViewV1 } from "../gameplay/contracts/index.js";
import type {
  E2eSemanticActionResultV1,
  E2eSemanticGamePortV1,
  E2eSemanticInvocationV1,
} from "./e2e-semantic-game-port.js";

export interface E2eHeadlessRunResultV1 {
  readonly views: readonly DeepReadonly<E2eGameViewV1>[];
  readonly results: readonly DeepReadonly<E2eSemanticActionResultV1>[];
}

export async function runE2eHeadlessSequenceV1(
  port: E2eSemanticGamePortV1,
  invocations: readonly DeepReadonly<E2eSemanticInvocationV1>[],
): Promise<E2eHeadlessRunResultV1> {
  const views: DeepReadonly<E2eGameViewV1>[] = [port.observe().game];
  const results: DeepReadonly<E2eSemanticActionResultV1>[] = [];

  for (const invocation of invocations) {
    results.push(await port.dispatch(invocation));
    views.push((await port.waitForIdle()).game);
  }

  return Object.freeze({
    views: Object.freeze(views),
    results: Object.freeze(results),
  });
}
