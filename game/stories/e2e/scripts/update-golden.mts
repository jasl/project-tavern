// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildE2eSemanticGoldenBytesV1, resolveE2eVectorGameV1 } from "./verify-determinism.mts";

const resolvedGame = await resolveE2eVectorGameV1();
const bytes = await buildE2eSemanticGoldenBytesV1(resolvedGame);
const path = fileURLToPath(new URL("../golden/semantic-flow.json", import.meta.url));
await writeFile(path, bytes);
console.log(`updated ${path}`);
