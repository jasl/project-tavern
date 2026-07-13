// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildE2eSessionZeroFixtureBytesV1,
  resolveE2eVectorGameV1,
} from "./verify-determinism.mts";

const {
  canonicalJsonBytes,
  createGameSnapshotEnvelopeSchemaV1,
  parseNonZeroUint32,
  rngStateV1Schema,
} = await import("@sillymaker/base");
const { e2eGameStateSchemaV1 } = await import("../src/gameplay/contracts/index.ts");

const resolvedGame = await resolveE2eVectorGameV1();
const expectedBytes = buildE2eSessionZeroFixtureBytesV1(resolvedGame);
const path = fileURLToPath(new URL("../fixtures/session-zero.json", import.meta.url));
const bytes = await readFile(path);
if (!bytes.equals(Buffer.from(expectedBytes))) {
  throw new TypeError("E2E fixture bytes differ from the reviewed canonical fixture");
}

const decoded = JSON.parse(bytes.toString("utf8")) as {
  provenance?: unknown;
  rngSeed?: unknown;
  snapshot?: unknown;
};
parseNonZeroUint32(decoded.rngSeed);
createGameSnapshotEnvelopeSchemaV1(e2eGameStateSchemaV1, rngStateV1Schema).parse(decoded.snapshot);
if (
  !Buffer.from(canonicalJsonBytes(decoded.provenance)).equals(
    Buffer.from(canonicalJsonBytes(resolvedGame.provenance)),
  )
) {
  throw new TypeError("E2E fixture provenance differs from its resolved Story");
}
console.log("e2e fixture verification passed");
