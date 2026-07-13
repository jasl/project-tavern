// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildE2eSemanticGoldenBytesV1, resolveE2eVectorGameV1 } from "./verify-determinism.mts";

const resolvedGame = await resolveE2eVectorGameV1();
const expectedBytes = await buildE2eSemanticGoldenBytesV1(resolvedGame);
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
