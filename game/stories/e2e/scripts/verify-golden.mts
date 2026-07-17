// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildE2eSemanticGoldenBytesV1,
  e2eVectorSeedV1,
  resolveE2eReviewedVectorProvenanceV1,
  resolveE2eVectorGameV1,
} from "./verify-determinism.mts";

const resolvedGame = await resolveE2eVectorGameV1();
const reviewedProvenance = resolveE2eReviewedVectorProvenanceV1(resolvedGame);
const expectedBytes = await buildE2eSemanticGoldenBytesV1(
  resolvedGame,
  e2eVectorSeedV1,
  reviewedProvenance,
);
const path = fileURLToPath(new URL("../golden/semantic-flow.json", import.meta.url));
let bytes: Buffer;
try {
  bytes = await readFile(path);
} catch (error) {
  throw new TypeError("E2E semantic-flow golden file is missing", { cause: error });
}
if (!bytes.equals(Buffer.from(expectedBytes))) {
  throw new TypeError("E2E semantic-flow golden bytes differ from deterministic execution");
}
console.log("e2e semantic-flow golden verification passed");
